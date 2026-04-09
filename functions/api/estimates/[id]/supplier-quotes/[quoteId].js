// ═══════════════════════════════════════════════════════════════
// GET    /api/estimates/:id/supplier-quotes/:quoteId — Get a single supplier quote
// PUT    /api/estimates/:id/supplier-quotes/:quoteId — Update a supplier quote
// DELETE /api/estimates/:id/supplier-quotes/:quoteId — Delete a supplier quote
// ═══════════════════════════════════════════════════════════════

function isValidId(id) {
    return id && String(id).length <= 64 && /^[a-zA-Z0-9_-]+$/.test(String(id));
}

// SEC: Verify the requesting user owns the estimate (or is admin)
async function checkOwnership(env, id, context) {
    const user = context.data?.user;
    if (!user) return true;
    const est = await env.DB.prepare('SELECT created_by FROM estimates WHERE id = ?').bind(id).first();
    if (!est) return false;
    if (user.is_admin) return true;
    if (est.created_by && user.id !== est.created_by) return false;
    return true;
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
    const { id, quoteId } = params;

    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    }

    const envToken = context.env.ESTIMATES_TOKEN;
    const token = context.request.headers.get('X-App-Token') || '';
    if (!envToken || !timingSafeCompare(token, envToken)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isValidId(id) || !isValidId(quoteId)) {
        return Response.json({ error: 'Invalid ID' }, { status: 400 });
    }
    if (!(await checkOwnership(env, id, context))) {
        return Response.json({ error: 'Access denied' }, { status: 403, headers: corsHeaders(origin) });
    }

    try {
        const quote = await env.DB.prepare(
            `SELECT * FROM supplier_quotes WHERE id = ? AND estimate_id = ?`
        ).bind(quoteId, id).first();

        if (!quote) return Response.json({ error: 'Quote not found' }, { status: 404, headers: corsHeaders(origin) });

        return Response.json({ quote }, { headers: corsHeaders(origin) });
    } catch (err) {
        return Response.json({ error: 'Failed to load supplier quote' }, { status: 500, headers: corsHeaders(origin) });
    }
}

export async function onRequestPut(context) {
    const { env, request, params } = context;
    const origin = request.headers.get('Origin') || '';
    const { id, quoteId } = params;

    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    }

    const envToken = context.env.ESTIMATES_TOKEN;
    const token = context.request.headers.get('X-App-Token') || '';
    if (!envToken || !timingSafeCompare(token, envToken)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isValidId(id) || !isValidId(quoteId)) {
        return Response.json({ error: 'Invalid ID' }, { status: 400 });
    }
    if (!(await checkOwnership(env, id, context))) {
        return Response.json({ error: 'Access denied' }, { status: 403, headers: corsHeaders(origin) });
    }

    try {
        const body = await request.json();
        const allowedFields = ['received_at', 'quoted_total', 'items_quoted', 'status'];
        const setClauses = [];
        const values = [];

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                setClauses.push(`${field} = ?`);
                values.push(body[field]);
            }
        }

        if (setClauses.length === 0) {
            return Response.json({ error: 'No valid fields to update' }, { status: 400, headers: corsHeaders(origin) });
        }

        values.push(quoteId, id);

        await env.DB.prepare(
            `UPDATE supplier_quotes SET ${setClauses.join(', ')} WHERE id = ? AND estimate_id = ?`
        ).bind(...values).run();

        return Response.json({ success: true }, { headers: corsHeaders(origin) });
    } catch (err) {
        return Response.json({ error: 'Failed to update supplier quote' }, { status: 500, headers: corsHeaders(origin) });
    }
}

export async function onRequestDelete(context) {
    const { env, request, params } = context;
    const origin = request.headers.get('Origin') || '';
    const { id, quoteId } = params;

    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    }

    const envToken = context.env.ESTIMATES_TOKEN;
    const token = context.request.headers.get('X-App-Token') || '';
    if (!envToken || !timingSafeCompare(token, envToken)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (!isValidId(id) || !isValidId(quoteId)) {
        return Response.json({ error: 'Invalid ID' }, { status: 400 });
    }
    if (!(await checkOwnership(env, id, context))) {
        return Response.json({ error: 'Access denied' }, { status: 403, headers: corsHeaders(origin) });
    }

    try {
        await env.DB.prepare(
            `DELETE FROM supplier_quotes WHERE id = ? AND estimate_id = ?`
        ).bind(quoteId, id).run();

        return Response.json({ success: true }, { headers: corsHeaders(origin) });
    } catch (err) {
        return Response.json({ error: 'Failed to delete supplier quote' }, { status: 500, headers: corsHeaders(origin) });
    }
}
