// ═══════════════════════════════════════════════════════════════
// POST /api/usage-stats/reset — Reset bid count and total cost
// Requires valid X-App-Token (ESTIMATES_TOKEN) — Estimator role only
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, timingSafeCompare } from '../../../_shared/cors.js';

export async function onRequestPost(context) {
    const { request, env } = context;
    const origin = request.headers.get('Origin') || '';

    // Origin check
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Token check — ESTIMATES_TOKEN must be configured AND must match (timing-safe)
    const envToken = env.ESTIMATES_TOKEN;
    if (!envToken) {
        return Response.json({ error: 'Reset not available — ESTIMATES_TOKEN not configured on server' }, { status: 500 });
    }
    const token = request.headers.get('X-App-Token') || '';
    if (!timingSafeCompare(token, envToken)) {
        return Response.json({ error: 'Unauthorized — invalid or missing X-App-Token' }, { status: 401 });
    }

    try {
        await env.DB.prepare(`
            UPDATE usage_stats SET
                total_cost = 0,
                bid_count = 0,
                last_reset_at = datetime('now')
            WHERE id = 'global'
        `).run();

        const corsOrigin = origin || 'https://smartplans-4g5.pages.dev';
        return new Response(
            JSON.stringify({ total_cost: 0, bid_count: 0, message: 'Stats reset successfully' }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': corsOrigin,
                },
            }
        );
    } catch (err) {
        console.error('Stats reset error:', err);
        return Response.json({ error: 'Failed to reset stats' }, { status: 500 });
    }
}

export async function onRequestOptions(context) {
    const origin = context.request.headers.get('Origin') || '';
    if (!isAllowedOrigin(origin)) {
        return new Response(null, { status: 403 });
    }
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': origin || 'https://smartplans-4g5.pages.dev',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
        },
    });
}
