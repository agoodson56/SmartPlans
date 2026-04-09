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
    // Token check — timing-safe comparison to prevent token prefix leakage
    const envToken = env.ESTIMATES_TOKEN;
    const token = request.headers.get('X-App-Token') || '';
    if (!envToken || !timingSafeCompare(token, envToken)) {
        return Response.json({ error: 'Unauthorized — invalid or missing X-App-Token' }, { status: 401 });
    }

    try {
        // SEC: If user session present, scope results to their own estimates (admins see all)
        const sessionToken = request.headers.get('X-Session-Token') || '';
        const user = sessionToken ? await validateSession(env.DB, sessionToken) : null;

        let query, binds;
        if (user && !user.is_admin) {
            query = `SELECT e.id, e.project_name, e.project_type, e.project_location, e.disciplines,
                    e.pricing_tier, e.status, e.created_at, e.updated_at,
                    e.created_by, COALESCE(e.created_by_name, u.name, 'Unknown') AS created_by_name
             FROM estimates e
             LEFT JOIN user_accounts u ON u.id = e.created_by
             WHERE e.created_by = ?
             ORDER BY e.updated_at DESC LIMIT 100`;
            binds = [user.id];
        } else {
            query = `SELECT e.id, e.project_name, e.project_type, e.project_location, e.disciplines,
                    e.pricing_tier, e.status, e.created_at, e.updated_at,
                    e.created_by, COALESCE(e.created_by_name, u.name, 'Unknown') AS created_by_name
             FROM estimates e
             LEFT JOIN user_accounts u ON u.id = e.created_by
             ORDER BY e.updated_at DESC LIMIT 100`;
            binds = [];
        }

        const stmt = env.DB.prepare(query);
        const res = binds.length > 0 ? await stmt.bind(...binds).all() : await stmt.all();
        return Response.json({ estimates: res.results || [] });
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
    // Token check — timing-safe comparison
    const envToken = env.ESTIMATES_TOKEN;
    const token = request.headers.get('X-App-Token') || '';
    if (!envToken || !timingSafeCompare(token, envToken)) {
        return Response.json({ error: 'Unauthorized — invalid or missing X-App-Token' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const id = crypto.randomUUID().replace(/-/g, '');

        // Resolve the creating user from session token
        const sessionToken = request.headers.get('X-Session-Token') || '';
        const user = await validateSession(env.DB, sessionToken);
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
                ? body.disciplines
                : JSON.stringify(body.disciplines);
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
