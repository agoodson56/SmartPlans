// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Company Strengths API
// Competitive advantages, differentiators, and win factors.
//
// GET    ?category=                            List / filter strengths
// POST                                         Create a new strength
// PUT                                          Update a strength (id in body)
// DELETE ?id=                                  Delete a strength
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
        CREATE TABLE IF NOT EXISTS company_strengths (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            category TEXT NOT NULL,
            strength TEXT NOT NULL,
            detail TEXT,
            win_impact TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `).run();
}

// ─── GET — List company strengths ────────────────────────────
export async function onRequestGet({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authErr = await authorize(request, env);
    if (authErr) return authErr;

    try {
        await ensureTable(env.DB);
        const url = new URL(request.url);
        const category = url.searchParams.get('category') || '';

        let sql = `SELECT * FROM company_strengths`;
        const conditions = [];
        const bindings = [];

        if (category) {
            conditions.push(`category = ?`);
            bindings.push(category);
        }

        if (conditions.length > 0) {
            sql += ` WHERE ` + conditions.join(' AND ');
        }
        sql += ` ORDER BY category, created_at DESC LIMIT 200`;

        const stmt = env.DB.prepare(sql);
        const res = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();

        return jsonResp({ strengths: res.results || [] }, 200, origin);
    } catch (err) {
        console.error('Failed to load company strengths:', err.message);
        return jsonResp({ error: 'Failed to load strengths' }, 500, origin);
    }
}

// ─── POST — Create a new company strength ────────────────────
export async function onRequestPost({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authErr = await authorize(request, env);
    if (authErr) return authErr;

    try {
        await ensureTable(env.DB);
        const body = await request.json();

        if (!body.category || !body.strength) {
            return jsonResp({ error: 'category and strength are required' }, 400, origin);
        }

        const id = crypto.randomUUID().replace(/-/g, '');
        await env.DB.prepare(`
            INSERT INTO company_strengths (id, category, strength, detail, win_impact)
            VALUES (?, ?, ?, ?, ?)
        `).bind(
            id,
            String(body.category).substring(0, 100),
            String(body.strength).substring(0, 500),
            body.detail ? String(body.detail).substring(0, 1000) : null,
            body.win_impact ? String(body.win_impact).substring(0, 500) : null,
        ).run();

        return jsonResp({ success: true, id }, 201, origin);
    } catch (err) {
        console.error('Failed to save company strength:', err.message);
        return jsonResp({ error: 'Failed to save strength' }, 500, origin);
    }
}

// ─── PUT — Update a company strength ─────────────────────────
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

        if (body.category != null) { fields.push('category = ?'); bindings.push(String(body.category).substring(0, 100)); }
        if (body.strength != null) { fields.push('strength = ?'); bindings.push(String(body.strength).substring(0, 500)); }
        if (body.detail !== undefined) { fields.push('detail = ?'); bindings.push(body.detail ? String(body.detail).substring(0, 1000) : null); }
        if (body.win_impact !== undefined) { fields.push('win_impact = ?'); bindings.push(body.win_impact ? String(body.win_impact).substring(0, 500) : null); }

        if (fields.length === 0) {
            return jsonResp({ error: 'No fields to update' }, 400, origin);
        }

        bindings.push(body.id);

        await env.DB.prepare(
            `UPDATE company_strengths SET ${fields.join(', ')} WHERE id = ?`
        ).bind(...bindings).run();

        return jsonResp({ success: true }, 200, origin);
    } catch (err) {
        console.error('Failed to update company strength:', err.message);
        return jsonResp({ error: 'Failed to update strength' }, 500, origin);
    }
}

// ─── DELETE — Remove a company strength ──────────────────────
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

        await env.DB.prepare(`DELETE FROM company_strengths WHERE id = ?`).bind(id).run();
        return jsonResp({ success: true }, 200, origin);
    } catch (err) {
        console.error('Failed to delete company strength:', err.message);
        return jsonResp({ error: 'Failed to delete strength' }, 500, origin);
    }
}
