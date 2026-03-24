// ═══════════════════════════════════════════════════════════════
// DELETE /api/pm/logs/:id — Delete a specific daily log entry
// POST   /api/pm/logs/:id — Bulk delete all logs for a project
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

export async function onRequestDelete(context) {
    const { env, params, request } = context;

    // Origin check
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // LOW-2 fix: single-log DELETE was missing token auth — inconsistent with POST (create)
    // and POST (bulk delete) which both require ESTIMATES_TOKEN. Added to close the gap.
    const envToken = env.ESTIMATES_TOKEN;
    if (envToken) {
        const token = request.headers.get('X-App-Token') || '';
        if (token !== envToken) {
            return Response.json({ error: 'Unauthorized — invalid or missing X-App-Token' }, { status: 401 });
        }
    }

    try {
        const logId = params.id;
        if (!logId || String(logId).length > 64) {
            return Response.json({ error: 'Invalid log ID' }, { status: 400 });
        }

        await env.DB.prepare('DELETE FROM pm_daily_logs WHERE id = ?').bind(logId).run();
        return Response.json({ success: true, deleted: logId });
    } catch (err) {
        return Response.json({ error: 'Failed to delete log: ' + err.message }, { status: 500 });
    }
}

// LOW-2 fix: onRequestPost was dead code — bulk deletes route to /api/pm/logs/bulk.js,
// not to /api/pm/logs/:id. The client (smartpmApi.js) always calls /api/pm/logs/bulk.
// Removed to avoid confusion and unreachable handler warnings.
