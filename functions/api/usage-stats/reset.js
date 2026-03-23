// ═══════════════════════════════════════════════════════════════
// POST /api/usage-stats/reset — Reset bid count and total cost
// Requires valid X-App-Token (ESTIMATES_TOKEN) — Estimator role only
// ═══════════════════════════════════════════════════════════════

function isAllowedOrigin(origin) {
    if (!origin) return true;
    // CRIT-3 fix: allow SmartPM so Reset Stats works from SmartPM domain
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

export async function onRequestPost(context) {
    const { request, env } = context;
    const origin = request.headers.get('Origin') || '';

    // Origin check
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Token check — ESTIMATES_TOKEN must be configured AND must match
    const envToken = env.ESTIMATES_TOKEN;
    if (!envToken) {
        return Response.json({ error: 'Reset not available — ESTIMATES_TOKEN not configured on server' }, { status: 500 });
    }
    const token = request.headers.get('X-App-Token') || '';
    if (token !== envToken) {
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

        const corsOrigin = origin || '*';
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
        return Response.json({ error: 'Failed to reset stats: ' + err.message }, { status: 500 });
    }
}

export async function onRequestOptions(context) {
    const origin = context.request.headers.get('Origin') || '';
    if (!isAllowedOrigin(origin)) {
        return new Response(null, { status: 403 });
    }
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': origin || '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
        },
    });
}
