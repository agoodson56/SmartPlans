// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — USAGE STATS API
// GET: Return current stats (no auth)
// POST: Increment after a bid completes (no auth, with validation)
// DELETE: Reset counters (admin only via env secret)
// ═══════════════════════════════════════════════════════════════

export async function onRequestGet(context) {
    const { env } = context;
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

        return Response.json(row);
    } catch (err) {
        console.error('Stats GET error:', err);
        return Response.json({ error: 'Failed to load stats' }, { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
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
        const url = new URL(request.url);
        const adminKey = url.searchParams.get('key');

        // Admin key MUST come from Cloudflare secret — no fallback
        const serverKey = env.STATS_ADMIN_KEY;
        if (!serverKey) {
            return Response.json({ error: 'Admin key not configured on server' }, { status: 500 });
        }
        if (!adminKey || adminKey !== serverKey) {
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
