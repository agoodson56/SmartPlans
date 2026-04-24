// ═══════════════════════════════════════════════════════════════
// GET  /api/benchmarks — List benchmarks with optional search/category filters
// POST /api/benchmarks — Recalculate all benchmarks from actuals data
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, timingSafeCompare, validateSession } from '../_shared/cors.js';

function corsHeaders(origin) {
    const headers = {};
    if (origin) {
        headers['Access-Control-Allow-Origin'] = origin;
    }
    return headers;
}

// v5.128.10: Accept EITHER a valid session OR the legacy X-App-Token.
// Pre-fix, benchmarks required X-App-Token only, so a logged-in user with
// a session (but no app token) saw /api/benchmarks 401 on every bid and
// the Wave 8 feedback loop loaded 0 benchmark rows. Matches the pattern
// already used by rate-library.js, bid-corrections.js, etc.
async function authorize(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    }

    const sessionToken = request.headers.get('X-Session-Token') || '';
    if (sessionToken && env.DB) {
        const user = await validateSession(env.DB, sessionToken);
        if (user) return null; // authorized via session
    }

    const envToken = env.ESTIMATES_TOKEN;
    const appToken = request.headers.get('X-App-Token') || '';
    if (envToken && appToken && timingSafeCompare(appToken, envToken)) {
        return null; // authorized via legacy app token
    }

    return Response.json(
        { error: 'Unauthorized — please log in or provide valid X-App-Token' },
        { status: 401 }
    );
}

export async function onRequestOptions(context) {
    const origin = context.request.headers.get('Origin') || '';
    if (!isAllowedOrigin(origin, false)) {
        return new Response(null, { status: 403 });
    }
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': origin || 'https://smartplans-4g5.pages.dev',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
            'Access-Control-Max-Age': '86400',
        },
    });
}

export async function onRequestGet(context) {
    const { env, request } = context;
    const origin = request.headers.get('Origin') || '';

    const authFail = await authorize(request, env);
    if (authFail) return authFail;

    try {
        const url = new URL(request.url);
        const search = url.searchParams.get('search') || '';
        const category = url.searchParams.get('category') || '';

        let query = 'SELECT * FROM cost_benchmarks';
        const conditions = [];
        const binds = [];

        if (search) {
            conditions.push('item_name LIKE ?');
            binds.push('%' + search + '%');
        }
        if (category) {
            conditions.push('category = ?');
            binds.push(category);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }
        query += ' ORDER BY category, item_name';

        let stmt = env.DB.prepare(query);
        if (binds.length > 0) {
            stmt = stmt.bind(...binds);
        }

        const res = await stmt.all();
        return Response.json({ benchmarks: res.results || [] }, { headers: corsHeaders(origin) });
    } catch (err) {
        console.error('Failed to load benchmarks:', err.message);
        return Response.json({ error: 'Failed to load benchmarks' }, { status: 500, headers: corsHeaders(origin) });
    }
}

export async function onRequestPost(context) {
    const { env, request } = context;
    const origin = request.headers.get('Origin') || '';

    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    }

    const contentLength = parseInt(request.headers.get('content-length') || '0');
    if (contentLength > 10 * 1024 * 1024) {
        return Response.json({ error: 'Request too large' }, { status: 413, headers: corsHeaders(origin) });
    }

    const envToken = env.ESTIMATES_TOKEN;
    const token = request.headers.get('X-App-Token') || '';
    if (!envToken || !timingSafeCompare(token, envToken)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // Aggregate actuals data into benchmarks
        const aggregated = await env.DB.prepare(`
            SELECT
                item_name,
                category,
                AVG(actual_unit_cost) as avg_unit_cost,
                MIN(actual_unit_cost) as min_unit_cost,
                MAX(actual_unit_cost) as max_unit_cost,
                AVG(actual_labor_hours) as avg_labor_hours,
                COUNT(*) as sample_count
            FROM project_actuals
            WHERE actual_unit_cost > 0
            GROUP BY LOWER(item_name), category
            ORDER BY category, item_name
            LIMIT 5000
        `).all();

        const items = aggregated.results || [];

        if (items.length === 0) {
            return Response.json({ success: true, updated: 0, message: 'No actuals data to aggregate' }, { headers: corsHeaders(origin) });
        }

        // Atomic: DELETE + all INSERTs in a single batch to prevent data loss on failure
        const allStmts = [
            env.DB.prepare('DELETE FROM cost_benchmarks')
        ];

        for (const item of items) {
            allStmts.push(env.DB.prepare(`
                INSERT INTO cost_benchmarks
                    (id, item_name, category, avg_unit_cost, min_unit_cost, max_unit_cost, avg_labor_hours, sample_count)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                crypto.randomUUID().replace(/-/g, ''),
                item.item_name,
                item.category,
                Math.round((item.avg_unit_cost || 0) * 100) / 100,
                Math.round((item.min_unit_cost || 0) * 100) / 100,
                Math.round((item.max_unit_cost || 0) * 100) / 100,
                Math.round((item.avg_labor_hours || 0) * 100) / 100,
                item.sample_count || 0
            ));
        }

        await env.DB.batch(allStmts);
        const updated = items.length;

        return Response.json({ success: true, updated }, { status: 200, headers: corsHeaders(origin) });
    } catch (err) {
        console.error('Failed to recalculate benchmarks:', err.message);
        return Response.json({ error: 'Failed to recalculate benchmarks' }, { status: 500, headers: corsHeaders(origin) });
    }
}
