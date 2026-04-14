// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Bid Decisions API
// Historical bid decision records for tracking adjustments,
// outcomes, and patterns across project types and categories.
//
// GET    ?estimate_id=&project_type=&category=   List / filter bid decisions
// POST                                           Create or bulk-import decisions
// PUT                                            Update a bid decision (id in body)
// DELETE ?id=                                    Delete a bid decision
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
        CREATE TABLE IF NOT EXISTS bid_decisions (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            estimate_id TEXT,
            project_name TEXT,
            project_type TEXT,
            category TEXT NOT NULL,
            original_value REAL,
            adjusted_value REAL,
            adjustment_pct REAL,
            reason TEXT,
            outcome TEXT,
            decided_by TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_bid_decisions_category ON bid_decisions(category)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_bid_decisions_type ON bid_decisions(project_type)`).run();
}

// ─── GET — List bid decisions ────────────────────────────────
export async function onRequestGet({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authErr = await authorize(request, env);
    if (authErr) return authErr;

    try {
        await ensureTable(env.DB);
        const url = new URL(request.url);
        const estimateId = url.searchParams.get('estimate_id') || '';
        const projectType = url.searchParams.get('project_type') || '';
        const category = url.searchParams.get('category') || '';

        let sql = `SELECT * FROM bid_decisions`;
        const conditions = [];
        const bindings = [];

        if (estimateId) {
            conditions.push(`estimate_id = ?`);
            bindings.push(estimateId);
        }
        if (projectType) {
            conditions.push(`project_type = ?`);
            bindings.push(projectType);
        }
        if (category) {
            conditions.push(`category = ?`);
            bindings.push(category);
        }

        if (conditions.length > 0) {
            sql += ` WHERE ` + conditions.join(' AND ');
        }
        sql += ` ORDER BY created_at DESC LIMIT 500`;

        const stmt = env.DB.prepare(sql);
        const res = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();

        return jsonResp({ decisions: res.results || [] }, 200, origin);
    } catch (err) {
        console.error('Failed to load bid decisions:', err.message);
        return jsonResp({ error: 'Failed to load bid decisions' }, 500, origin);
    }
}

// ─── POST — Create or bulk-import bid decisions ──────────────
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
            if (!item.category) {
                errors++;
                continue;
            }

            const id = crypto.randomUUID().replace(/-/g, '');
            try {
                await env.DB.prepare(`
                    INSERT INTO bid_decisions (id, estimate_id, project_name, project_type, category,
                        original_value, adjusted_value, adjustment_pct, reason, outcome, decided_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    id,
                    item.estimate_id ? String(item.estimate_id).substring(0, 100) : null,
                    item.project_name ? String(item.project_name).substring(0, 300) : null,
                    item.project_type ? String(item.project_type).substring(0, 100) : null,
                    String(item.category).substring(0, 100),
                    item.original_value != null ? parseFloat(item.original_value) : null,
                    item.adjusted_value != null ? parseFloat(item.adjusted_value) : null,
                    item.adjustment_pct != null ? parseFloat(item.adjustment_pct) : null,
                    item.reason ? String(item.reason).substring(0, 500) : null,
                    item.outcome ? String(item.outcome).substring(0, 100) : null,
                    item.decided_by ? String(item.decided_by).substring(0, 100) : null,
                ).run();
                saved++;
            } catch (e) {
                console.error('Failed to insert bid decision:', e.message);
                errors++;
            }
        }

        return jsonResp({ saved, errors, success: saved > 0 }, 201, origin);
    } catch (err) {
        console.error('Failed to save bid decisions:', err.message);
        return jsonResp({ error: 'Failed to save bid decisions' }, 500, origin);
    }
}

// ─── PUT — Update a bid decision ─────────────────────────────
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

        if (body.estimate_id !== undefined) { fields.push('estimate_id = ?'); bindings.push(body.estimate_id ? String(body.estimate_id).substring(0, 100) : null); }
        if (body.project_name !== undefined) { fields.push('project_name = ?'); bindings.push(body.project_name ? String(body.project_name).substring(0, 300) : null); }
        if (body.project_type !== undefined) { fields.push('project_type = ?'); bindings.push(body.project_type ? String(body.project_type).substring(0, 100) : null); }
        if (body.category !== undefined) { fields.push('category = ?'); bindings.push(body.category ? String(body.category).substring(0, 100) : null); }
        if (body.original_value !== undefined) { fields.push('original_value = ?'); bindings.push(body.original_value != null ? parseFloat(body.original_value) : null); }
        if (body.adjusted_value !== undefined) { fields.push('adjusted_value = ?'); bindings.push(body.adjusted_value != null ? parseFloat(body.adjusted_value) : null); }
        if (body.adjustment_pct !== undefined) { fields.push('adjustment_pct = ?'); bindings.push(body.adjustment_pct != null ? parseFloat(body.adjustment_pct) : null); }
        if (body.reason !== undefined) { fields.push('reason = ?'); bindings.push(body.reason ? String(body.reason).substring(0, 500) : null); }
        if (body.outcome !== undefined) { fields.push('outcome = ?'); bindings.push(body.outcome ? String(body.outcome).substring(0, 100) : null); }
        if (body.decided_by !== undefined) { fields.push('decided_by = ?'); bindings.push(body.decided_by ? String(body.decided_by).substring(0, 100) : null); }

        if (fields.length === 0) {
            return jsonResp({ error: 'No fields to update' }, 400, origin);
        }

        bindings.push(body.id);

        await env.DB.prepare(
            `UPDATE bid_decisions SET ${fields.join(', ')} WHERE id = ?`
        ).bind(...bindings).run();

        return jsonResp({ success: true }, 200, origin);
    } catch (err) {
        console.error('Failed to update bid decision:', err.message);
        return jsonResp({ error: 'Failed to update bid decision' }, 500, origin);
    }
}

// ─── DELETE — Remove a bid decision ──────────────────────────
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

        await env.DB.prepare(`DELETE FROM bid_decisions WHERE id = ?`).bind(id).run();
        return jsonResp({ success: true }, 200, origin);
    } catch (err) {
        console.error('Failed to delete bid decision:', err.message);
        return jsonResp({ error: 'Failed to delete bid decision' }, 500, origin);
    }
}
