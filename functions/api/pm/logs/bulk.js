// ═══════════════════════════════════════════════════════════════
// POST /api/pm/logs/bulk — Delete all logs for a project
// Dedicated endpoint (not the [id] catch-all) for clarity and safety
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, timingSafeCompare } from '../../../_shared/cors.js';

export async function onRequestPost(context) {
    const { env, request } = context;

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
        if (body.action !== 'delete_all' || !body.project_id) {
            return Response.json({ error: 'Invalid action or missing project_id' }, { status: 400 });
        }

        const projectId = String(body.project_id).substring(0, 100);
        const result = await env.DB.prepare('DELETE FROM pm_daily_logs WHERE project_id = ?')
            .bind(projectId).run();

        const corsOrigin = origin || 'https://smartplans-4g5.pages.dev';
        return Response.json(
            { success: true, deleted_count: result.meta?.changes || 0 },
            { headers: { 'Access-Control-Allow-Origin': corsOrigin } }
        );
    } catch (err) {
        console.error('[PM Logs] Bulk delete error:', err);
        return Response.json({ error: 'Bulk delete failed' }, { status: 500 });
    }
}

// Handle CORS preflight for cross-domain DELETE-all calls
export async function onRequestOptions(context) {
    const origin = context.request.headers.get('Origin') || '';
    if (!isAllowedOrigin(origin)) {
        return new Response(null, { status: 403 });
    }
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': origin || 'https://smartplans-4g5.pages.dev',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
        },
    });
}
