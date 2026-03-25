// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Rate Library API
// CRUD endpoints for estimator-maintained material & labor rates.
// GET    ?category=&search=   List / filter rates
// POST                        Create a new rate
// PUT                         Update an existing rate (id in body)
// DELETE ?id=                 Delete a rate
// ═══════════════════════════════════════════════════════════════

// Canonical isAllowedOrigin — keep in sync across all middleware files
function isAllowedOrigin(origin) {
    if (!origin) return true;
    if (origin.endsWith('.pages.dev') && (origin.includes('smartplans-4g5') || origin.includes('smartpm'))) return true;
    const allowed = [
        'https://smartplans-4g5.pages.dev',
        'https://smartplans.pages.dev',
        'https://smartpm.pages.dev',
        'https://smartplans.3dtechnologyservices.com',
        'https://smartpm.3dtechnologyservices.com',
        'https://3dtechnologyservices.com',
    ];
    if (allowed.some(d => origin.startsWith(d))) return true;
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return true;
    return false;
}

function corsHeaders(origin) {
    return {
        'Access-Control-Allow-Origin': origin || 'https://smartplans-4g5.pages.dev',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
        'Access-Control-Max-Age': '86400',
    };
}

function authorize(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403, headers: corsHeaders(origin) });
    }
    const envToken = env.ESTIMATES_TOKEN;
    if (envToken) {
        const token = request.headers.get('X-App-Token') || '';
        if (token !== envToken) {
            return Response.json(
                { error: 'Unauthorized — invalid or missing X-App-Token' },
                { status: 401, headers: corsHeaders(origin) }
            );
        }
    }
    return null; // authorized
}

function jsonResp(data, status, origin) {
    return Response.json(data, { status, headers: corsHeaders(origin) });
}

// ─── OPTIONS — CORS Preflight ────────────────────────────────
export async function onRequestOptions({ request }) {
    const origin = request.headers.get('Origin') || '';
    if (!isAllowedOrigin(origin)) {
        return new Response(null, { status: 403 });
    }
    return new Response(null, { headers: corsHeaders(origin) });
}

// ─── GET — List all rates, optional filters ──────────────────
export async function onRequestGet({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authErr = authorize(request, env);
    if (authErr) return authErr;

    try {
        const url = new URL(request.url);
        const category = url.searchParams.get('category') || '';
        let search = url.searchParams.get('search') || '';

        // Validate search input
        if (search.length > 100) {
            return jsonResp({ error: 'Search query too long (max 100 characters)' }, 400, origin);
        }
        search = search.replace(/[%_]/g, '');

        let sql = `SELECT * FROM rate_library`;
        const conditions = [];
        const bindings = [];

        if (category) {
            conditions.push(`category = ?`);
            bindings.push(category);
        }
        if (search) {
            conditions.push(`item_name LIKE ?`);
            bindings.push(`%${search}%`);
        }

        if (conditions.length > 0) {
            sql += ` WHERE ` + conditions.join(' AND ');
        }
        sql += ` ORDER BY use_count DESC, updated_at DESC LIMIT 500`;

        const stmt = env.DB.prepare(sql);
        const res = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();

        return jsonResp({ rates: res.results || [] }, 200, origin);
    } catch (err) {
        console.error('Failed to load rates:', err.message);
        return jsonResp({ error: 'Failed to load rates' }, 500, origin);
    }
}

// ─── POST — Create a new rate ────────────────────────────────
export async function onRequestPost({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authErr = authorize(request, env);
    if (authErr) return authErr;

    const contentLength = parseInt(request.headers.get('content-length') || '0');
    if (contentLength > 10 * 1024 * 1024) {
        return jsonResp({ error: 'Request too large' }, 413, origin);
    }

    try {
        const body = await request.json();

        if (!body.item_name || body.unit_cost == null) {
            return jsonResp({ error: 'item_name and unit_cost are required' }, 400, origin);
        }

        const id = crypto.randomUUID().replace(/-/g, '');
        const itemName = String(body.item_name).substring(0, 300);
        const category = body.category ? String(body.category).substring(0, 100) : null;
        const unit = body.unit ? String(body.unit).substring(0, 20) : 'ea';
        const unitCost = parseFloat(body.unit_cost) || 0;
        const laborHours = parseFloat(body.labor_hours) || 0;
        const supplier = body.supplier ? String(body.supplier).substring(0, 200) : null;
        const notes = body.notes ? String(body.notes).substring(0, 1000) : null;

        await env.DB.prepare(`
            INSERT INTO rate_library (id, item_name, category, unit, unit_cost, labor_hours, supplier, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, itemName, category, unit, unitCost, laborHours, supplier, notes).run();

        return jsonResp({ id, success: true }, 201, origin);
    } catch (err) {
        console.error('Failed to create rate:', err.message);
        return jsonResp({ error: 'Failed to create rate' }, 500, origin);
    }
}

// ─── PUT — Update an existing rate ───────────────────────────
export async function onRequestPut({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authErr = authorize(request, env);
    if (authErr) return authErr;

    try {
        const body = await request.json();
        if (!body.id) {
            return jsonResp({ error: 'id is required in body' }, 400, origin);
        }

        const fields = [];
        const bindings = [];

        if (body.item_name != null) { fields.push('item_name = ?'); bindings.push(String(body.item_name).substring(0, 300)); }
        if (body.category !== undefined) { fields.push('category = ?'); bindings.push(body.category ? String(body.category).substring(0, 100) : null); }
        if (body.unit != null) { fields.push('unit = ?'); bindings.push(String(body.unit).substring(0, 20)); }
        if (body.unit_cost != null) { fields.push('unit_cost = ?'); bindings.push(parseFloat(body.unit_cost) || 0); }
        if (body.labor_hours != null) { fields.push('labor_hours = ?'); bindings.push(parseFloat(body.labor_hours) || 0); }
        if (body.supplier !== undefined) { fields.push('supplier = ?'); bindings.push(body.supplier ? String(body.supplier).substring(0, 200) : null); }
        if (body.notes !== undefined) { fields.push('notes = ?'); bindings.push(body.notes ? String(body.notes).substring(0, 1000) : null); }
        if (body.last_used != null) { fields.push('last_used = ?'); bindings.push(String(body.last_used)); }
        if (body.use_count != null) { fields.push('use_count = ?'); bindings.push(parseInt(body.use_count) || 0); }

        if (fields.length === 0) {
            return jsonResp({ error: 'No fields to update' }, 400, origin);
        }

        fields.push("updated_at = datetime('now')");
        bindings.push(body.id);

        await env.DB.prepare(
            `UPDATE rate_library SET ${fields.join(', ')} WHERE id = ?`
        ).bind(...bindings).run();

        return jsonResp({ success: true }, 200, origin);
    } catch (err) {
        console.error('Failed to update rate:', err.message);
        return jsonResp({ error: 'Failed to update rate' }, 500, origin);
    }
}

// ─── DELETE — Remove a rate by id ────────────────────────────
export async function onRequestDelete({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authErr = authorize(request, env);
    if (authErr) return authErr;

    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) {
            return jsonResp({ error: 'id query parameter is required' }, 400, origin);
        }

        await env.DB.prepare(`DELETE FROM rate_library WHERE id = ?`).bind(id).run();
        return jsonResp({ success: true }, 200, origin);
    } catch (err) {
        console.error('Failed to delete rate:', err.message);
        return jsonResp({ error: 'Failed to delete rate' }, 500, origin);
    }
}
