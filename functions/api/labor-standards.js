// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Labor Standards API
// BICSI-style activity-level labor units (minutes per task) sourced
// from prior bids and reference standards. Used by Labor Calculator
// brain to ground hour calculations on real production rates.
//
// GET    ?discipline=&role=&search=        List / filter labor standards
// POST                                     Create or bulk-import standards
// PUT                                      Update a standard (id in body)
// DELETE ?id=                              Delete a standard
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
    const envToken = env.ESTIMATES_TOKEN;
    const appToken = request.headers.get('X-App-Token') || '';
    const hasValidAppToken = envToken && timingSafeCompare(appToken, envToken);
    const sessionToken = request.headers.get('X-Session-Token') || '';
    const user = sessionToken ? await validateSession(env.DB, sessionToken) : null;
    if (!hasValidAppToken && !user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(origin) });
    }
    return null;
}

function jsonResp(data, status, origin) {
    return Response.json(data, { status, headers: corsHeaders(origin) });
}

export async function onRequestOptions({ request }) {
    const origin = request.headers.get('Origin') || '';
    if (!isAllowedOrigin(origin, false)) {
        return new Response(null, { status: 403 });
    }
    return new Response(null, { headers: corsHeaders(origin) });
}

async function ensureTable(db) {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS labor_standards (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            activity TEXT NOT NULL,
            discipline TEXT,
            role TEXT,
            unit TEXT DEFAULT 'EA',
            unit_minutes REAL,
            unit_hours REAL,
            source_standard TEXT DEFAULT 'won-bid',
            source_bid TEXT,
            sample_count INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_labor_std_activity ON labor_standards(activity)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_labor_std_discipline ON labor_standards(discipline)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_labor_std_role ON labor_standards(role)`).run();
}

// ─── GET — List / filter labor standards ─────────────────────
export async function onRequestGet({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authErr = await authorize(request, env);
    if (authErr) return authErr;

    try {
        await ensureTable(env.DB);
        const url = new URL(request.url);
        const discipline = url.searchParams.get('discipline') || '';
        const role = url.searchParams.get('role') || '';
        let search = url.searchParams.get('search') || '';
        if (search.length > 100) search = search.substring(0, 100);
        search = search.replace(/[%_]/g, '');

        let sql = `SELECT * FROM labor_standards`;
        const conditions = [];
        const bindings = [];

        if (discipline) {
            conditions.push(`discipline = ?`);
            bindings.push(discipline);
        }
        if (role) {
            conditions.push(`role = ?`);
            bindings.push(role);
        }
        if (search) {
            conditions.push(`activity LIKE ?`);
            bindings.push(`%${search}%`);
        }

        if (conditions.length > 0) {
            sql += ` WHERE ` + conditions.join(' AND ');
        }
        sql += ` ORDER BY discipline, activity LIMIT 1000`;

        const stmt = env.DB.prepare(sql);
        const res = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();

        return jsonResp({ standards: res.results || [] }, 200, origin);
    } catch (err) {
        console.error('Failed to load labor standards:', err.message);
        return jsonResp({ error: 'Failed to load labor standards' }, 500, origin);
    }
}

// ─── POST — Create or bulk-import labor standards ────────────
export async function onRequestPost({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authErr = await authorize(request, env);
    if (authErr) return authErr;

    try {
        await ensureTable(env.DB);
        const body = await request.json();
        const items = Array.isArray(body) ? body : (body.items || [body]);

        let saved = 0;
        let errors = 0;

        for (const item of items) {
            if (!item.activity) {
                errors++;
                continue;
            }

            const minutes = item.unit_minutes != null ? parseFloat(item.unit_minutes) : null;
            const hours = item.unit_hours != null
                ? parseFloat(item.unit_hours)
                : (minutes != null ? minutes / 60 : null);

            const id = crypto.randomUUID().replace(/-/g, '');
            try {
                await env.DB.prepare(`
                    INSERT INTO labor_standards (id, activity, discipline, role, unit,
                        unit_minutes, unit_hours, source_standard, source_bid, sample_count)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    id,
                    String(item.activity).substring(0, 200),
                    item.discipline ? String(item.discipline).substring(0, 80) : null,
                    item.role ? String(item.role).substring(0, 80) : null,
                    item.unit ? String(item.unit).substring(0, 20) : 'EA',
                    minutes,
                    hours,
                    item.source_standard ? String(item.source_standard).substring(0, 80) : 'won-bid',
                    item.source_bid ? String(item.source_bid).substring(0, 200) : null,
                    item.sample_count != null ? parseInt(item.sample_count) : 1,
                ).run();
                saved++;
            } catch (e) {
                console.error('Failed to insert labor standard:', e.message);
                errors++;
            }
        }

        return jsonResp({ saved, errors, success: saved > 0 }, 201, origin);
    } catch (err) {
        console.error('Failed to save labor standards:', err.message);
        return jsonResp({ error: 'Failed to save labor standards' }, 500, origin);
    }
}

// ─── PUT — Update a labor standard ───────────────────────────
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

        if (body.activity != null) { fields.push('activity = ?'); bindings.push(String(body.activity).substring(0, 200)); }
        if (body.discipline !== undefined) { fields.push('discipline = ?'); bindings.push(body.discipline ? String(body.discipline).substring(0, 80) : null); }
        if (body.role !== undefined) { fields.push('role = ?'); bindings.push(body.role ? String(body.role).substring(0, 80) : null); }
        if (body.unit != null) { fields.push('unit = ?'); bindings.push(String(body.unit).substring(0, 20)); }
        if (body.unit_minutes !== undefined) { fields.push('unit_minutes = ?'); bindings.push(body.unit_minutes != null ? parseFloat(body.unit_minutes) : null); }
        if (body.unit_hours !== undefined) { fields.push('unit_hours = ?'); bindings.push(body.unit_hours != null ? parseFloat(body.unit_hours) : null); }
        if (body.sample_count !== undefined) { fields.push('sample_count = ?'); bindings.push(body.sample_count != null ? parseInt(body.sample_count) : 1); }

        if (fields.length === 0) {
            return jsonResp({ error: 'No fields to update' }, 400, origin);
        }

        fields.push("updated_at = datetime('now')");
        bindings.push(body.id);

        await env.DB.prepare(
            `UPDATE labor_standards SET ${fields.join(', ')} WHERE id = ?`
        ).bind(...bindings).run();

        return jsonResp({ success: true }, 200, origin);
    } catch (err) {
        console.error('Failed to update labor standard:', err.message);
        return jsonResp({ error: 'Failed to update labor standard' }, 500, origin);
    }
}

// ─── DELETE — Remove a labor standard ────────────────────────
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

        await env.DB.prepare(`DELETE FROM labor_standards WHERE id = ?`).bind(id).run();
        return jsonResp({ success: true }, 200, origin);
    } catch (err) {
        console.error('Failed to delete labor standard:', err.message);
        return jsonResp({ error: 'Failed to delete labor standard' }, 500, origin);
    }
}
