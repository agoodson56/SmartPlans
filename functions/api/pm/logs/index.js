// ═══════════════════════════════════════════════════════════════
// GET  /api/pm/logs?project_id=xxx — Fetch daily logs for a project
// POST /api/pm/logs                — Create a new daily log entry
// DELETE /api/pm/logs/:id handled in [id].js
// ═══════════════════════════════════════════════════════════════

function isAllowedOrigin(origin) {
    if (!origin) return true;
    // Allow any SmartPlans or SmartPM Cloudflare Pages deploy
    if (origin.endsWith('.pages.dev') && (origin.includes('smartplans-4g5') || origin.includes('smartpm'))) return true;
    const allowed = [
        'https://smartplans-4g5.pages.dev',
        'https://smartplans.pages.dev',
        'https://smartplans.3dtechnologyservices.com',
        'https://smartpm.3dtechnologyservices.com',
        'https://3dtechnologyservices.com',
    ];
    if (allowed.some(d => origin.startsWith(d))) return true;
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return true;
    return false;
}

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
        return Response.json({ error: 'Failed to load logs: ' + err.message }, { status: 500 });
    }
}


export async function onRequestPost(context) {
    const { env, request } = context;
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
            body.logged_at || new Date().toISOString(),
            notes,
        ).run();

        return Response.json({ id, success: true }, { status: 201 });
    } catch (err) {
        return Response.json({ error: 'Failed to save log: ' + err.message }, { status: 500 });
    }
}
