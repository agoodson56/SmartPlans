// ═══════════════════════════════════════════════════════════════
// GET  /api/pm/logs?project_id=xxx — Fetch daily logs for a project
// POST /api/pm/logs                — Create a new daily log entry
// DELETE /api/pm/logs/:id handled in [id].js
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, timingSafeCompare } from '../../../_shared/cors.js';

export async function onRequestGet(context) {
    const { env, request } = context;

    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const url = new URL(request.url);
        const projectId = url.searchParams.get('project_id') || 'default';

        const res = await env.DB.prepare(
            `SELECT id, project_id, module_id, item, unit, qty_installed, hours_used, logged_at, notes
             FROM pm_daily_logs
             WHERE project_id = ?
             ORDER BY logged_at DESC
             LIMIT 500`
        ).bind(projectId).all();

        return Response.json({ logs: res.results || [] });
    } catch (err) {
        console.error('[PM Logs] Load error:', err);
        return Response.json({ error: 'Failed to load logs' }, { status: 500 });
    }
}


export async function onRequestPost(context) {
    const { env, request } = context;

    // HIGH-2 fix: POST was completely unauthenticated — matched same security as GET
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const envToken = env.ESTIMATES_TOKEN;
    if (envToken) {
        const token = request.headers.get('X-App-Token') || '';
        if (!timingSafeCompare(token, envToken)) {
            return Response.json({ error: 'Unauthorized — invalid or missing X-App-Token' }, { status: 401 });
        }
    }

    try {
        const body = await request.json();

        // ── Input Validation ──
        const qty = parseFloat(body.qty_installed) || 0;
        const hrs = parseFloat(body.hours_used) || 0;
        const projectId = String(body.project_id || 'default').substring(0, 100);
        const moduleId = String(body.module_id || '').substring(0, 100);
        const item = String(body.item || '').substring(0, 300);
        const unit = String(body.unit || 'EA').substring(0, 20);
        const notes = body.notes ? String(body.notes).substring(0, 2000) : null;

        if (!isFinite(qty) || qty < 0) {
            return Response.json({ error: 'Invalid qty_installed — must be a non-negative number' }, { status: 400 });
        }
        if (!isFinite(hrs) || hrs < 0) {
            return Response.json({ error: 'Invalid hours_used — must be a non-negative number' }, { status: 400 });
        }

        const id = String(body.id || crypto.randomUUID().replace(/-/g, '')).substring(0, 64);
        // MED-1 fix: never trust client-supplied logged_at — always use server time
        // to prevent arbitrary date injection (back-dating or future-dating entries)
        const loggedAt = new Date().toISOString();

        await env.DB.prepare(`
            INSERT INTO pm_daily_logs (id, project_id, module_id, item, unit, qty_installed, hours_used, logged_at, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            projectId,
            moduleId,
            item,
            unit,
            qty,
            hrs,
            loggedAt,
            notes,
        ).run();

        return Response.json({ id, success: true }, { status: 201 });
    } catch (err) {
        console.error('[PM Logs] Save error:', err);
        return Response.json({ error: 'Failed to save log' }, { status: 500 });
    }
}
