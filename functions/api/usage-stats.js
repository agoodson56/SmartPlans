// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — USAGE STATS API
// GET: Return current stats (no auth)
// POST: Increment after a bid completes (no auth, with validation)
// DELETE: Reset counters (admin only via env secret)
// ═══════════════════════════════════════════════════════════════

// Canonical isAllowedOrigin — keep in sync across all middleware files
// Duplicated in: functions/api/ai/_middleware.js, functions/api/estimates/_middleware.js,
//                functions/api/pm/_middleware.js, functions/api/usage-stats.js
function isAllowedOrigin(origin) {
    if (!origin) return true; // Same-origin

    // SmartPlans origins (project suffix: -4g5)
    if (origin.endsWith('.pages.dev') && origin.includes('smartplans-4g5')) return true;

    // SmartPM origins
    if (origin.endsWith('.pages.dev') && origin.includes('smartpm')) return true;

    // Production domains
    const allowedDomains = [
        'https://smartplans-4g5.pages.dev',
        'https://smartplans.pages.dev',
        'https://smartpm.pages.dev',
        'https://smartplans.3dtechnologyservices.com',
        'https://smartpm.3dtechnologyservices.com',
        'https://3dtechnologyservices.com',
    ];
    if (allowedDomains.some(d => origin.startsWith(d))) return true;

    // Local dev
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return true;

    return false;
}

export async function onRequestGet(context) {
    const { env, request } = context;
    const origin = request.headers.get('Origin') || '';

    try {
        let row = await env.DB.prepare(
            `SELECT total_cost, bid_count, last_bid_project, last_bid_at, last_reset_at FROM usage_stats WHERE id = 'global'`
        ).first();

        if (!row) {
            await env.DB.prepare(
                `INSERT INTO usage_stats (id, total_cost, bid_count) VALUES ('global', 0, 0)`
            ).run();
            row = { total_cost: 0, bid_count: 0, last_bid_project: null, last_bid_at: null, last_reset_at: null };
        }

        const corsHeader = (origin && isAllowedOrigin(origin)) ? { 'Access-Control-Allow-Origin': origin } : {};
        return new Response(JSON.stringify(row), {
            headers: { 'Content-Type': 'application/json', ...corsHeader },
        });
    } catch (err) {
        console.error('Stats GET error:', err);
        return Response.json({ error: 'Failed to load stats' }, { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;

    // Origin validation — block external POST requests
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // If ESTIMATES_TOKEN is configured, require it here too
    const envToken = env.ESTIMATES_TOKEN;
    if (envToken) {
        const token = request.headers.get('X-App-Token') || '';
        if (token !== envToken) {
            return Response.json({ error: 'Unauthorized — invalid or missing X-App-Token' }, { status: 401 });
        }
    }

    try {
        const body = await request.json();
        const cost = parseFloat(body.cost) || 0;
        const project_name = body.project_name || 'Unknown';

        // Input validation — reject bad data
        if (cost < 0 || cost > 100) {
            return Response.json({ error: 'Cost must be between $0 and $100 per bid' }, { status: 400 });
        }
        if (typeof project_name !== 'string' || project_name.length > 200) {
            return Response.json({ error: 'Invalid project name' }, { status: 400 });
        }

        await env.DB.prepare(`
            INSERT INTO usage_stats (id, total_cost, bid_count, last_bid_project, last_bid_at)
            VALUES ('global', ?, 1, ?, datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
                total_cost = total_cost + ?,
                bid_count = bid_count + 1,
                last_bid_project = ?,
                last_bid_at = datetime('now')
        `).bind(cost, project_name, cost, project_name).run();

        const updated = await env.DB.prepare(
            `SELECT total_cost, bid_count, last_bid_project, last_bid_at FROM usage_stats WHERE id = 'global'`
        ).first();

        return Response.json(updated);
    } catch (err) {
        console.error('Stats POST error:', err);
        return Response.json({ error: 'Failed to update stats' }, { status: 500 });
    }
}

export async function onRequestDelete(context) {
    const { request, env } = context;
    try {
        // SEC fix: read admin key from header instead of URL query parameter
        // Query params leak in browser history, server logs, and Referer headers
        const adminKey = request.headers.get('X-Admin-Key');

        // Admin key MUST come from Cloudflare secret — no fallback
        const serverKey = (env.STATS_ADMIN_KEY || '').trim();
        if (!serverKey) {
            return Response.json({ error: 'Admin key not configured on server' }, { status: 500 });
        }
        if (!adminKey || adminKey.trim() !== serverKey) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await env.DB.prepare(`
            UPDATE usage_stats SET
                total_cost = 0,
                bid_count = 0,
                last_reset_at = datetime('now')
            WHERE id = 'global'
        `).run();

        return Response.json({ total_cost: 0, bid_count: 0, message: 'Stats reset' });
    } catch (err) {
        console.error('Stats DELETE error:', err);
        return Response.json({ error: 'Failed to reset stats' }, { status: 500 });
    }
}
