// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Bid Corrections API  (v5.127.1 Estimator Feedback Loop)
//
// Item-level corrections logged every time an estimator edits a BOM
// quantity or unit cost after Material Pricer output. Aggregated
// across all past bids and fed back into the Material Pricer prompt
// on the next run of the same project_type + discipline.
//
// GET    ?project_type=&discipline=&item_name=&limit=   Filter corrections
// POST                                                  Create or bulk-import
// DELETE ?id=                                           Remove a correction
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, timingSafeCompare, validateSession } from '../_shared/cors.js';

function corsHeaders(origin) {
    return {
        'Access-Control-Allow-Origin': origin || 'https://smartplans-4g5.pages.dev',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
    return { user };
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
        CREATE TABLE IF NOT EXISTS bid_corrections (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            estimate_id TEXT,
            project_name TEXT,
            project_type TEXT,
            discipline TEXT,
            category TEXT,
            item_name TEXT NOT NULL,
            field_changed TEXT NOT NULL,
            original_value REAL,
            corrected_value REAL,
            delta_pct REAL,
            region TEXT,
            corrected_by TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_bid_corrections_type ON bid_corrections(project_type)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_bid_corrections_disc ON bid_corrections(discipline)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_bid_corrections_item ON bid_corrections(item_name)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_bid_corrections_created ON bid_corrections(created_at DESC)`).run();
}

// ─── GET — List / filter corrections ─────────────────────────
//
// Typical queries:
//   GET /api/bid-corrections                                            → 200 most recent
//   GET /api/bid-corrections?project_type=Hospital&discipline=CCTV      → filtered
//   GET /api/bid-corrections?item_name=Fixed%20Dome                     → single item history
//
// Results are capped at 500 rows and ordered newest-first so the
// Material Pricer sees the most recent estimator behavior.
// ────────────────────────────────────────────────────────────
export async function onRequestGet({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authErr = await authorize(request, env);
    if (authErr && authErr.status) return authErr;

    try {
        await ensureTable(env.DB);
        const url = new URL(request.url);
        const projectType = (url.searchParams.get('project_type') || '').trim();
        const discipline = (url.searchParams.get('discipline') || '').trim();
        const itemName = (url.searchParams.get('item_name') || '').trim();
        const limit = Math.max(1, Math.min(500, parseInt(url.searchParams.get('limit') || '200', 10)));

        let sql = `SELECT * FROM bid_corrections`;
        const conditions = [];
        const bindings = [];

        if (projectType) { conditions.push(`project_type = ?`); bindings.push(projectType.substring(0, 100)); }
        if (discipline) { conditions.push(`discipline = ?`); bindings.push(discipline.substring(0, 100)); }
        if (itemName) { conditions.push(`item_name LIKE ?`); bindings.push('%' + itemName.substring(0, 200) + '%'); }

        if (conditions.length > 0) sql += ` WHERE ` + conditions.join(' AND ');
        sql += ` ORDER BY created_at DESC LIMIT ${limit}`;

        const stmt = env.DB.prepare(sql);
        const res = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();

        return jsonResp({ corrections: res.results || [] }, 200, origin);
    } catch (err) {
        console.error('Failed to load bid corrections:', err.message);
        return jsonResp({ error: 'Failed to load bid corrections' }, 500, origin);
    }
}

// ─── POST — Create or bulk-import corrections ────────────────
//
// Accepts either a single object or { items: [...] } / raw array.
// All string fields are capped defensively to prevent D1 abuse.
// ────────────────────────────────────────────────────────────
export async function onRequestPost({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authRes = await authorize(request, env);
    if (authRes && authRes.status) return authRes;
    const user = authRes?.user;

    try {
        await ensureTable(env.DB);
        const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
        if (contentLength > 1 * 1024 * 1024) {
            return jsonResp({ error: 'Request too large' }, 413, origin);
        }

        const body = await request.json();
        const items = Array.isArray(body) ? body : (Array.isArray(body?.items) ? body.items : [body]);

        if (items.length > 200) {
            return jsonResp({ error: 'Too many items (max 200)' }, 400, origin);
        }

        let saved = 0;
        let errors = 0;

        for (const item of items) {
            if (!item || !item.item_name || !item.field_changed) {
                errors++;
                continue;
            }
            const field = String(item.field_changed).trim().toLowerCase();
            if (field !== 'qty' && field !== 'unit_cost') {
                errors++;
                continue;
            }

            const origVal = item.original_value != null ? parseFloat(item.original_value) : null;
            const corrVal = item.corrected_value != null ? parseFloat(item.corrected_value) : null;
            let deltaPct = null;
            if (origVal != null && corrVal != null && origVal !== 0) {
                deltaPct = Math.round(((corrVal - origVal) / origVal) * 10000) / 100;
            }

            // Skip no-op corrections (0% delta) — they add noise without signal
            if (deltaPct === 0) continue;

            const correctedBy = item.corrected_by
                || user?.name
                || user?.email
                || user?.id
                || null;

            try {
                const id = crypto.randomUUID().replace(/-/g, '');
                await env.DB.prepare(`
                    INSERT INTO bid_corrections
                        (id, estimate_id, project_name, project_type, discipline, category,
                         item_name, field_changed, original_value, corrected_value, delta_pct,
                         region, corrected_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    id,
                    item.estimate_id ? String(item.estimate_id).substring(0, 100) : null,
                    item.project_name ? String(item.project_name).substring(0, 300) : null,
                    item.project_type ? String(item.project_type).substring(0, 100) : null,
                    item.discipline ? String(item.discipline).substring(0, 100) : null,
                    item.category ? String(item.category).substring(0, 100) : null,
                    String(item.item_name).substring(0, 200),
                    field,
                    origVal,
                    corrVal,
                    deltaPct,
                    item.region ? String(item.region).substring(0, 100) : null,
                    correctedBy ? String(correctedBy).substring(0, 200) : null,
                ).run();
                saved++;
            } catch (e) {
                console.error('Failed to insert bid correction:', e.message);
                errors++;
            }
        }

        return jsonResp({ saved, errors, success: saved > 0 }, 201, origin);
    } catch (err) {
        console.error('Failed to save bid corrections:', err.message);
        return jsonResp({ error: 'Failed to save bid corrections' }, 500, origin);
    }
}

// ─── DELETE — Remove a correction by id ──────────────────────
export async function onRequestDelete({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authErr = await authorize(request, env);
    if (authErr && authErr.status) return authErr;

    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id || id.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
            return jsonResp({ error: 'Invalid or missing id' }, 400, origin);
        }
        await env.DB.prepare(`DELETE FROM bid_corrections WHERE id = ?`).bind(id).run();
        return jsonResp({ success: true }, 200, origin);
    } catch (err) {
        console.error('Failed to delete bid correction:', err.message);
        return jsonResp({ error: 'Failed to delete bid correction' }, 500, origin);
    }
}
