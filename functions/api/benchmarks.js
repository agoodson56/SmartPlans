// ═══════════════════════════════════════════════════════════════
// GET  /api/benchmarks — List benchmarks with optional search/category filters
// POST /api/benchmarks — Recalculate all benchmarks from actuals data
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, timingSafeCompare } from '../_shared/cors.js';

function corsHeaders(origin) {
    const headers = {};
    if (origin) {
        headers['Access-Control-Allow-Origin'] = origin;
    }
    return headers;
}

export async function onRequestOptions(context) {
    const origin = context.request.headers.get('Origin') || '';
    if (!isAllowedOrigin(origin)) {
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

    if (!isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    }

    const envToken = env.ESTIMATES_TOKEN;
    if (envToken) {
        const token = request.headers.get('X-App-Token') || '';
        if (!timingSafeCompare(token, envToken)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    if (!isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    }

    const contentLength = parseInt(request.headers.get('content-length') || '0');
    if (contentLength > 10 * 1024 * 1024) {
        return Response.json({ error: 'Request too large' }, { status: 413, headers: corsHeaders(origin) });
    }

    const envToken = env.ESTIMATES_TOKEN;
    if (envToken) {
        const token = request.headers.get('X-App-Token') || '';
        if (!timingSafeCompare(token, envToken)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
        `).all();

        const items = aggregated.results || [];

        if (items.length === 0) {
            return Response.json({ success: true, updated: 0, message: 'No actuals data to aggregate' }, { headers: corsHeaders(origin) });
        }

        // Clear existing benchmarks and insert fresh
        await env.DB.prepare('DELETE FROM cost_benchmarks').run();

        const batchSize = 25;
        let updated = 0;

        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const stmts = batch.map(item => {
                return env.DB.prepare(`
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
                );
            });

            await env.DB.batch(stmts);
            updated += batch.length;
        }

        return Response.json({ success: true, updated }, { status: 200, headers: corsHeaders(origin) });
    } catch (err) {
        console.error('Failed to recalculate benchmarks:', err.message);
        return Response.json({ error: 'Failed to recalculate benchmarks' }, { status: 500, headers: corsHeaders(origin) });
    }
}
