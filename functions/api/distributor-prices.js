// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Distributor Price Cache API
// Cached pricing from distributors (Graybar, Anixter/WESCO, ADI, etc.)
// Populated manually, from quote imports, or future API integration.
//
// GET    ?distributor=&search=&category=   List / filter cached prices
// POST                                     Create or bulk-import prices
// PUT                                      Update a cached price (id in body)
// DELETE ?id=                              Delete a cached price
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, timingSafeCompare, validateSession } from '../_shared/cors.js';

function corsHeaders(origin) {
    return {
        'Access-Control-Allow-Origin': origin || 'https://smartplans-4g5.pages.dev',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-App-Token, X-Session-Token',
        'Access-Control-Max-Age': '86400',
    };
}

async function authorize(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403, headers: corsHeaders(origin) });
    }
    // Accept app token OR session token
    const envToken = env.ESTIMATES_TOKEN;
    const appToken = request.headers.get('X-App-Token') || '';
    const hasValidAppToken = envToken && timingSafeCompare(appToken, envToken);
    const sessionToken = request.headers.get('X-Session-Token') || '';
    const user = sessionToken ? await validateSession(env.DB, sessionToken) : null;
    if (!hasValidAppToken && !user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(origin) });
    }
    return null; // authorized
}

function jsonResp(data, status, origin) {
    return Response.json(data, { status, headers: corsHeaders(origin) });
}

// ─── OPTIONS — CORS Preflight ────────────────────────────────
export async function onRequestOptions({ request }) {
    const origin = request.headers.get('Origin') || '';
    if (!isAllowedOrigin(origin, false)) {
        return new Response(null, { status: 403 });
    }
    return new Response(null, { headers: corsHeaders(origin) });
}

// ─── Auto-create table if missing ────────────────────────────
async function ensureTable(db) {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS distributor_prices (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            item_name TEXT NOT NULL,
            manufacturer TEXT,
            part_number TEXT,
            distributor TEXT NOT NULL,
            unit_cost REAL NOT NULL,
            unit TEXT DEFAULT 'ea',
            list_price REAL,
            discount_pct REAL DEFAULT 0,
            category TEXT,
            quote_number TEXT,
            quote_date TEXT,
            expires_at TEXT,
            notes TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `).run();
}

// ─── GET — List cached distributor prices ────────────────────
export async function onRequestGet({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authErr = await authorize(request, env);
    if (authErr) return authErr;

    try {
        await ensureTable(env.DB);
        const url = new URL(request.url);
        const distributor = url.searchParams.get('distributor') || '';
        const category = url.searchParams.get('category') || '';
        let search = url.searchParams.get('search') || '';
        if (search.length > 100) search = search.substring(0, 100);
        search = search.replace(/[%_]/g, '');

        let sql = `SELECT * FROM distributor_prices`;
        const conditions = [];
        const bindings = [];

        if (distributor) {
            conditions.push(`distributor = ?`);
            bindings.push(distributor);
        }
        if (category) {
            conditions.push(`category = ?`);
            bindings.push(category);
        }
        if (search) {
            conditions.push(`(item_name LIKE ? OR part_number LIKE ? OR manufacturer LIKE ?)`);
            bindings.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (conditions.length > 0) {
            sql += ` WHERE ` + conditions.join(' AND ');
        }
        sql += ` ORDER BY updated_at DESC LIMIT 500`;

        const stmt = env.DB.prepare(sql);
        const res = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();

        return jsonResp({ prices: res.results || [] }, 200, origin);
    } catch (err) {
        console.error('Failed to load distributor prices:', err.message);
        return jsonResp({ error: 'Failed to load prices' }, 500, origin);
    }
}

// ─── POST — Create or bulk-import distributor prices ─────────
export async function onRequestPost({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authErr = await authorize(request, env);
    if (authErr) return authErr;

    try {
        await ensureTable(env.DB);
        const body = await request.json();

        // Support single item or bulk array
        const items = Array.isArray(body) ? body : (body.items || [body]);

        let saved = 0;
        let errors = 0;

        for (const item of items) {
            if (!item.item_name || !item.distributor || item.unit_cost == null) {
                errors++;
                continue;
            }

            const id = crypto.randomUUID().replace(/-/g, '');
            try {
                await env.DB.prepare(`
                    INSERT INTO distributor_prices (id, item_name, manufacturer, part_number, distributor,
                        unit_cost, unit, list_price, discount_pct, category, quote_number, quote_date, expires_at, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    id,
                    String(item.item_name).substring(0, 300),
                    item.manufacturer ? String(item.manufacturer).substring(0, 200) : null,
                    item.part_number ? String(item.part_number).substring(0, 100) : null,
                    String(item.distributor).substring(0, 200),
                    parseFloat(item.unit_cost) || 0,
                    item.unit ? String(item.unit).substring(0, 20) : 'ea',
                    item.list_price != null ? parseFloat(item.list_price) : null,
                    item.discount_pct != null ? parseFloat(item.discount_pct) : 0,
                    item.category ? String(item.category).substring(0, 100) : null,
                    item.quote_number ? String(item.quote_number).substring(0, 50) : null,
                    item.quote_date ? String(item.quote_date).substring(0, 20) : null,
                    item.expires_at ? String(item.expires_at).substring(0, 20) : null,
                    item.notes ? String(item.notes).substring(0, 500) : null,
                ).run();
                saved++;
            } catch (e) {
                console.error('Failed to insert distributor price:', e.message);
                errors++;
            }
        }

        return jsonResp({ saved, errors, success: saved > 0 }, 201, origin);
    } catch (err) {
        console.error('Failed to save distributor prices:', err.message);
        return jsonResp({ error: 'Failed to save prices' }, 500, origin);
    }
}

// ─── PUT — Update a cached price ─────────────────────────────
export async function onRequestPut({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authErr = await authorize(request, env);
    if (authErr) return authErr;

    try {
        const body = await request.json();
        if (!body.id || typeof body.id !== 'string' || body.id.length > 64) {
            return jsonResp({ error: 'Invalid or missing id' }, 400, origin);
        }

        const fields = [];
        const bindings = [];

        if (body.item_name != null) { fields.push('item_name = ?'); bindings.push(String(body.item_name).substring(0, 300)); }
        if (body.manufacturer !== undefined) { fields.push('manufacturer = ?'); bindings.push(body.manufacturer ? String(body.manufacturer).substring(0, 200) : null); }
        if (body.part_number !== undefined) { fields.push('part_number = ?'); bindings.push(body.part_number ? String(body.part_number).substring(0, 100) : null); }
        if (body.distributor != null) { fields.push('distributor = ?'); bindings.push(String(body.distributor).substring(0, 200)); }
        if (body.unit_cost != null) { fields.push('unit_cost = ?'); bindings.push(parseFloat(body.unit_cost) || 0); }
        if (body.unit != null) { fields.push('unit = ?'); bindings.push(String(body.unit).substring(0, 20)); }
        if (body.list_price !== undefined) { fields.push('list_price = ?'); bindings.push(body.list_price != null ? parseFloat(body.list_price) : null); }
        if (body.discount_pct !== undefined) { fields.push('discount_pct = ?'); bindings.push(body.discount_pct != null ? parseFloat(body.discount_pct) : 0); }
        if (body.category !== undefined) { fields.push('category = ?'); bindings.push(body.category ? String(body.category).substring(0, 100) : null); }
        if (body.notes !== undefined) { fields.push('notes = ?'); bindings.push(body.notes ? String(body.notes).substring(0, 500) : null); }

        if (fields.length === 0) {
            return jsonResp({ error: 'No fields to update' }, 400, origin);
        }

        fields.push("updated_at = datetime('now')");
        bindings.push(body.id);

        await env.DB.prepare(
            `UPDATE distributor_prices SET ${fields.join(', ')} WHERE id = ?`
        ).bind(...bindings).run();

        return jsonResp({ success: true }, 200, origin);
    } catch (err) {
        console.error('Failed to update distributor price:', err.message);
        return jsonResp({ error: 'Failed to update price' }, 500, origin);
    }
}

// ─── DELETE — Remove a cached price ──────────────────────────
export async function onRequestDelete({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authErr = await authorize(request, env);
    if (authErr) return authErr;

    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id || id.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
            return jsonResp({ error: 'Invalid or missing id' }, 400, origin);
        }

        await env.DB.prepare(`DELETE FROM distributor_prices WHERE id = ?`).bind(id).run();
        return jsonResp({ success: true }, 200, origin);
    } catch (err) {
        console.error('Failed to delete distributor price:', err.message);
        return jsonResp({ error: 'Failed to delete price' }, 500, origin);
    }
}
