// ═══════════════════════════════════════════════════════════════
// GET  /api/estimates/:id/supplier-quotes — List all supplier quotes for an estimate
// POST /api/estimates/:id/supplier-quotes — Create a new supplier quote record
// ═══════════════════════════════════════════════════════════════

function isValidId(id) {
    return id && String(id).length <= 64 && /^[a-zA-Z0-9_-]+$/.test(String(id));
}

import { isAllowedOrigin, timingSafeCompare } from '../../../../_shared/cors.js';

function corsHeaders(origin) {
    const headers = {};
    if (origin) {
        headers['Access-Control-Allow-Origin'] = origin;
    }
    return headers;
}

export async function onRequestGet(context) {
    const { env, request, params } = context;
    const origin = request.headers.get('Origin') || '';
    const id = params.id;

    if (!isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    }

    const envToken = context.env.ESTIMATES_TOKEN;
    if (envToken) {
        const token = context.request.headers.get('X-App-Token') || '';
        if (!timingSafeCompare(token, envToken)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isValidId(id)) {
        return Response.json({ error: 'Invalid estimate ID' }, { status: 400 });
    }

    try {
        const res = await env.DB.prepare(
            `SELECT * FROM supplier_quotes WHERE estimate_id = ? ORDER BY created_at DESC`
        ).bind(id).all();

        return Response.json({ quotes: res.results }, { headers: corsHeaders(origin) });
    } catch (err) {
        return Response.json({ error: 'Failed to load supplier quotes' }, { status: 500, headers: corsHeaders(origin) });
    }
}

export async function onRequestPost(context) {
    const { env, request, params } = context;
    const origin = request.headers.get('Origin') || '';
    const id = params.id;

    if (!isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    }

    const envToken = context.env.ESTIMATES_TOKEN;
    if (envToken) {
        const token = context.request.headers.get('X-App-Token') || '';
        if (!timingSafeCompare(token, envToken)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isValidId(id)) {
        return Response.json({ error: 'Invalid estimate ID' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const quoteId = crypto.randomUUID().replace(/-/g, '');

        await env.DB.prepare(`
            INSERT INTO supplier_quotes (id, estimate_id, supplier_name, supplier_email, item_count, original_total, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            quoteId,
            id,
            body.supplier_name || null,
            body.supplier_email || null,
            body.item_count || 0,
            body.original_total || 0,
            'sent'
        ).run();

        return Response.json({ id: quoteId, success: true }, { status: 201, headers: corsHeaders(origin) });
    } catch (err) {
        return Response.json({ error: 'Failed to create supplier quote' }, { status: 500, headers: corsHeaders(origin) });
    }
}
