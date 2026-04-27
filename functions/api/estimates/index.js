// ═══════════════════════════════════════════════════════════════
// GET  /api/estimates — List all saved estimates
// POST /api/estimates — Save a new estimate
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, timingSafeCompare, validateSession } from '../../_shared/cors.js';

export async function onRequestGet(context) {
    const { env, request } = context;

    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    // Auth: accept EITHER valid app token OR valid session token
    const envToken = env.ESTIMATES_TOKEN;
    const token = request.headers.get('X-App-Token') || '';
    const hasValidAppToken = envToken && timingSafeCompare(token, envToken);
    const sessionToken = request.headers.get('X-Session-Token') || '';
    const user = sessionToken ? await validateSession(env.DB, sessionToken) : null;

    if (!hasValidAppToken && !user) {
        return Response.json({ error: 'Unauthorized — invalid or missing authentication' }, { status: 401 });
    }

    try {
        // L5 fix (audit 2026-04-27): support optional limit / offset query
        // params so the 101st estimate is reachable. Defaults preserve the
        // pre-fix behavior (LIMIT 100, OFFSET 0). Limit is clamped to a
        // sane range to defend against pathological clients.
        const url = new URL(request.url);
        const rawLimit = parseInt(url.searchParams.get('limit') || '100', 10);
        const rawOffset = parseInt(url.searchParams.get('offset') || '0', 10);
        const limit = Math.max(1, Math.min(Number.isFinite(rawLimit) ? rawLimit : 100, 500));
        const offset = Math.max(0, Number.isFinite(rawOffset) ? rawOffset : 0);

        let query, binds;
        if (user?.is_admin) {
            // Admins see all estimates
            query = `SELECT e.id, e.project_name, e.project_type, e.project_location, e.disciplines,
                    e.pricing_tier, e.status, e.created_at, e.updated_at,
                    e.created_by, COALESCE(e.created_by_name, u.name, 'Unknown') AS created_by_name,
                    e.modified_by, COALESCE(e.modified_by_name, m.name) AS modified_by_name
             FROM estimates e
             LEFT JOIN user_accounts u ON u.id = e.created_by
             LEFT JOIN user_accounts m ON m.id = e.modified_by
             ORDER BY e.updated_at DESC LIMIT ? OFFSET ?`;
            binds = [limit, offset];
        } else if (user) {
            // Non-admin users see only their own estimates
            query = `SELECT e.id, e.project_name, e.project_type, e.project_location, e.disciplines,
                    e.pricing_tier, e.status, e.created_at, e.updated_at,
                    e.created_by, COALESCE(e.created_by_name, u.name, 'Unknown') AS created_by_name,
                    e.modified_by, COALESCE(e.modified_by_name, m.name) AS modified_by_name
             FROM estimates e
             LEFT JOIN user_accounts u ON u.id = e.created_by
             LEFT JOIN user_accounts m ON m.id = e.modified_by
             WHERE e.created_by = ?
             ORDER BY e.updated_at DESC LIMIT ? OFFSET ?`;
            binds = [user.id, limit, offset];
        } else {
            // No valid session — return all (app-token-only legacy access)
            // The app token was already validated above, so this is authenticated
            query = `SELECT e.id, e.project_name, e.project_type, e.project_location, e.disciplines,
                    e.pricing_tier, e.status, e.created_at, e.updated_at,
                    e.created_by, COALESCE(e.created_by_name, u.name, 'Unknown') AS created_by_name,
                    e.modified_by, COALESCE(e.modified_by_name, m.name) AS modified_by_name
             FROM estimates e
             LEFT JOIN user_accounts u ON u.id = e.created_by
             LEFT JOIN user_accounts m ON m.id = e.modified_by
             ORDER BY e.updated_at DESC LIMIT ? OFFSET ?`;
            binds = [limit, offset];
        }

        const stmt = env.DB.prepare(query);
        const res = await stmt.bind(...binds).all();
        const rows = res.results || [];
        return Response.json({
            estimates: rows,
            // L5: pagination metadata so the client can know whether to fetch the next page.
            pagination: { limit, offset, returned: rows.length, hasMore: rows.length === limit },
        });
    } catch (err) {
        console.error('Failed to load estimates:', err.message);
        return Response.json({ error: 'Failed to load estimates' }, { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { env, request } = context;

    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    // Auth: accept EITHER valid app token OR valid session token
    const envToken = env.ESTIMATES_TOKEN;
    const token = request.headers.get('X-App-Token') || '';
    const hasValidAppToken = envToken && timingSafeCompare(token, envToken);
    const sessionToken = request.headers.get('X-Session-Token') || '';
    const user = sessionToken ? await validateSession(env.DB, sessionToken) : null;

    if (!hasValidAppToken && !user) {
        return Response.json({ error: 'Unauthorized — invalid or missing authentication' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const id = crypto.randomUUID().replace(/-/g, '');
        const createdBy = user?.id || null;
        const createdByName = user?.name || null;

        // Input validation
        const projectName = String(body.project_name || 'Untitled').substring(0, 200);
        const projectType = body.project_type ? String(body.project_type).substring(0, 100) : null;
        const projectLocation = body.project_location ? String(body.project_location).substring(0, 300) : null;
        const status = body.status ? String(body.status).substring(0, 20) : 'draft';
        const pricingTier = body.pricing_tier ? String(body.pricing_tier).substring(0, 20) : 'mid';

        const exportData = body.export_data ? JSON.stringify(body.export_data) : null;
        if (exportData && exportData.length > 5_000_000) {
            return Response.json({ error: 'Export data too large (max 5MB)' }, { status: 413 });
        }

        // disciplines may arrive as a pre-stringified string or an array.
        // Only JSON.stringify when it's an array/object to avoid double-encoding.
        let disciplines = null;
        if (body.disciplines != null) {
            disciplines = typeof body.disciplines === 'string'
                ? body.disciplines.substring(0, 2000)
                : JSON.stringify(body.disciplines).substring(0, 2000);
        }

        await env.DB.prepare(`
            INSERT INTO estimates (id, project_name, project_type, project_location,
                disciplines, pricing_tier, status, export_data, created_by, created_by_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            projectName,
            projectType,
            projectLocation,
            disciplines,
            pricingTier,
            status,
            exportData,
            createdBy,
            createdByName,
        ).run();

        return Response.json({ id, success: true }, { status: 201 });
    } catch (err) {
        console.error('Failed to save estimate:', err.message);
        return Response.json({ error: 'Failed to save estimate' }, { status: 500 });
    }
}
