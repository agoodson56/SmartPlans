// ═══════════════════════════════════════════════════════════════
// POST /api/pm/logs/bulk — Delete all logs for a project
// Dedicated endpoint (not the [id] catch-all) for clarity and safety
// ═══════════════════════════════════════════════════════════════

function isAllowedOrigin(origin) {
    if (!origin) return true;
    if (origin.endsWith('.pages.dev') && origin.includes('smartplans-4g5')) return true;
    const allowed = [
        'https://smartplans-4g5.pages.dev',
        'https://smartplans.pages.dev',
        'https://smartplans.3dtechnologyservices.com',
        'https://3dtechnologyservices.com',
    ];
    if (allowed.some(d => origin.startsWith(d))) return true;
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return true;
    return false;
}

export async function onRequestPost(context) {
    const { env, request } = context;

    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const envToken = env.ESTIMATES_TOKEN;
    if (envToken) {
        const token = request.headers.get('X-App-Token') || '';
        if (token !== envToken) {
            return Response.json({ error: 'Unauthorized — invalid or missing X-App-Token' }, { status: 401 });
        }
    }

    try {
        const body = await request.json();
        if (body.action !== 'delete_all' || !body.project_id) {
            return Response.json({ error: 'Invalid action or missing project_id' }, { status: 400 });
        }

        const projectId = String(body.project_id).substring(0, 100);
        const result = await env.DB.prepare('DELETE FROM pm_daily_logs WHERE project_id = ?')
            .bind(projectId).run();

        return Response.json({ success: true, deleted_count: result.meta?.changes || 0 });
    } catch (err) {
        return Response.json({ error: 'Bulk delete failed: ' + err.message }, { status: 500 });
    }
}
