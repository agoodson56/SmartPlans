// ═══════════════════════════════════════════════════════════════
// GET  /api/estimates/:id/exclusions — List all exclusions/assumptions for an estimate
// POST /api/estimates/:id/exclusions — Create a new exclusion/assumption/clarification
// PUT  /api/estimates/:id/exclusions — Update an existing entry (requires body.id)
// DELETE /api/estimates/:id/exclusions — Delete an entry (requires body.id)
// ═══════════════════════════════════════════════════════════════

function isValidId(id) {
    return id && String(id).length <= 64 && /^[a-zA-Z0-9_-]+$/.test(String(id));
}

import { isAllowedOrigin, timingSafeCompare } from '../../../_shared/cors.js';

function corsHeaders(origin) {
    const headers = {};
    if (origin) {
        headers['Access-Control-Allow-Origin'] = origin;
    }
    return headers;
}

// Auth handled by estimates/_middleware.js (session token OR app token)
function checkAuth(context) {
    // Middleware already authenticated the request — always return true
    // Kept as a function to avoid changing all call sites
    return true;
}

// SEC: Verify the requesting user owns the estimate (or is admin)
async function checkOwnership(env, id, context) {
    const user = context.data?.user;
    if (!user) return true; // No auth middleware = legacy setup, allow
    const est = await env.DB.prepare('SELECT created_by FROM estimates WHERE id = ?').bind(id).first();
    if (!est) return false;
    if (user.is_admin) return true;
    if (est.created_by && user.id !== est.created_by) return false;
    return true;
}

// GET — List all exclusions/assumptions/clarifications for an estimate
export async function onRequestGet(context) {
    const { env, request, params } = context;
    const origin = request.headers.get('Origin') || '';
    const id = params.id;

    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    }
    if (!checkAuth(context)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isValidId(id)) {
        return Response.json({ error: 'Invalid estimate ID' }, { status: 400 });
    }
    if (!(await checkOwnership(env, id, context))) {
        return Response.json({ error: 'Access denied' }, { status: 403, headers: corsHeaders(origin) });
    }

    try {
        const res = await env.DB.prepare(
            `SELECT * FROM estimate_exclusions WHERE estimate_id = ? ORDER BY type, sort_order, created_at`
        ).bind(id).all();

        return Response.json({ exclusions: res.results }, { headers: corsHeaders(origin) });
    } catch (err) {
        return Response.json({ error: 'Failed to load exclusions' }, { status: 500, headers: corsHeaders(origin) });
    }
}

// POST — Create a new exclusion/assumption/clarification
export async function onRequestPost(context) {
    const { env, request, params } = context;
    const origin = request.headers.get('Origin') || '';
    const id = params.id;

    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    }
    if (!checkAuth(context)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isValidId(id)) {
        return Response.json({ error: 'Invalid estimate ID' }, { status: 400 });
    }
    if (!(await checkOwnership(env, id, context))) {
        return Response.json({ error: 'Access denied' }, { status: 403, headers: corsHeaders(origin) });
    }

    const contentLength = parseInt(request.headers.get('content-length') || '0');
    if (contentLength > 10 * 1024 * 1024) {
        return Response.json({ error: 'Request too large' }, { status: 413, headers: corsHeaders(origin) });
    }

    try {
        const body = await request.json();

        // Support batch insert (array of items) — limit to 100 per request
        const items = Array.isArray(body) ? body : [body];
        if (items.length > 100) {
            return Response.json({ error: 'Too many items — max 100 per request' }, { status: 400, headers: corsHeaders(origin) });
        }
        const results = [];

        for (const item of items) {
            const validTypes = ['exclusion', 'assumption', 'clarification'];
            if (!item.type || !validTypes.includes(item.type)) {
                return Response.json({ error: 'Invalid type — must be exclusion, assumption, or clarification' }, { status: 400, headers: corsHeaders(origin) });
            }
            if (!item.text || !item.text.trim()) {
                return Response.json({ error: 'Text is required' }, { status: 400, headers: corsHeaders(origin) });
            }

            // SEC: Always generate ID server-side — never accept client-supplied IDs for inserts
            const entryId = crypto.randomUUID().replace(/-/g, '');

            await env.DB.prepare(`
                INSERT INTO estimate_exclusions (id, estimate_id, type, text, category, sort_order)
                VALUES (?, ?, ?, ?, ?, ?)
            `).bind(
                entryId,
                id,
                item.type,
                item.text.trim(),
                item.category || null,
                item.sort_order || 0
            ).run();

            results.push({ id: entryId, success: true });
        }

        return Response.json(
            results.length === 1 ? results[0] : { items: results, success: true },
            { status: 201, headers: corsHeaders(origin) }
        );
    } catch (err) {
        return Response.json({ error: 'Failed to create exclusion' }, { status: 500, headers: corsHeaders(origin) });
    }
}

// PUT — Update an existing entry
export async function onRequestPut(context) {
    const { env, request, params } = context;
    const origin = request.headers.get('Origin') || '';
    const id = params.id;

    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    }
    if (!checkAuth(context)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isValidId(id)) {
        return Response.json({ error: 'Invalid estimate ID' }, { status: 400 });
    }
    if (!(await checkOwnership(env, id, context))) {
        return Response.json({ error: 'Access denied' }, { status: 403, headers: corsHeaders(origin) });
    }

    try {
        const body = await request.json();

        if (!body.id || !isValidId(body.id)) {
            return Response.json({ error: 'Invalid or missing entry id' }, { status: 400, headers: corsHeaders(origin) });
        }

        // Support batch sort_order updates
        if (Array.isArray(body.items)) {
            for (const item of body.items) {
                if (item.id && item.sort_order !== undefined) {
                    await env.DB.prepare(
                        `UPDATE estimate_exclusions SET sort_order = ? WHERE id = ? AND estimate_id = ?`
                    ).bind(item.sort_order, item.id, id).run();
                }
            }
            return Response.json({ success: true }, { headers: corsHeaders(origin) });
        }

        const allowedFields = ['text', 'type', 'category', 'sort_order'];
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

        values.push(body.id, id);

        await env.DB.prepare(
            `UPDATE estimate_exclusions SET ${setClauses.join(', ')} WHERE id = ? AND estimate_id = ?`
        ).bind(...values).run();

        return Response.json({ success: true }, { headers: corsHeaders(origin) });
    } catch (err) {
        return Response.json({ error: 'Failed to update exclusion' }, { status: 500, headers: corsHeaders(origin) });
    }
}

// DELETE — Delete an entry
export async function onRequestDelete(context) {
    const { env, request, params } = context;
    const origin = request.headers.get('Origin') || '';
    const id = params.id;

    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    }
    if (!checkAuth(context)) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isValidId(id)) {
        return Response.json({ error: 'Invalid estimate ID' }, { status: 400 });
    }
    if (!(await checkOwnership(env, id, context))) {
        return Response.json({ error: 'Access denied' }, { status: 403, headers: corsHeaders(origin) });
    }

    try {
        const body = await request.json();

        if (!body.id || !isValidId(body.id)) {
            return Response.json({ error: 'Invalid or missing entry id' }, { status: 400, headers: corsHeaders(origin) });
        }

        await env.DB.prepare(
            `DELETE FROM estimate_exclusions WHERE id = ? AND estimate_id = ?`
        ).bind(body.id, id).run();

        return Response.json({ success: true }, { headers: corsHeaders(origin) });
    } catch (err) {
        return Response.json({ error: 'Failed to delete exclusion' }, { status: 500, headers: corsHeaders(origin) });
    }
}
