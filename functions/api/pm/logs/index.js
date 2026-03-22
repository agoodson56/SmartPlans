// ═══════════════════════════════════════════════════════════════
// GET  /api/pm/logs?project_id=xxx — Fetch daily logs for a project
// POST /api/pm/logs                — Create a new daily log entry
// DELETE /api/pm/logs/:id handled in [id].js
// ═══════════════════════════════════════════════════════════════

export async function onRequestGet(context) {
    const { env, request } = context;
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
        return Response.json({ error: 'Failed to load logs: ' + err.message }, { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { env, request } = context;
    try {
        const body = await request.json();
        const id = body.id || crypto.randomUUID().replace(/-/g, '');

        await env.DB.prepare(`
            INSERT INTO pm_daily_logs (id, project_id, module_id, item, unit, qty_installed, hours_used, logged_at, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            body.project_id || 'default',
            body.module_id || '',
            body.item || '',
            body.unit || 'EA',
            body.qty_installed || 0,
            body.hours_used || 0,
            body.logged_at || new Date().toISOString(),
            body.notes || null,
        ).run();

        return Response.json({ id, success: true }, { status: 201 });
    } catch (err) {
        return Response.json({ error: 'Failed to save log: ' + err.message }, { status: 500 });
    }
}
