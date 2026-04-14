// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Winning Proposals API
// Historical winning proposals with executive summaries, scope
// narratives, value propositions, and strategy notes.
//
// GET    ?project_type=&search=           List / filter proposals
// POST                                    Create a new proposal
// PUT                                     Update a proposal (id in body)
// DELETE ?id=                             Delete a proposal
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
        CREATE TABLE IF NOT EXISTS winning_proposals (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            project_name TEXT NOT NULL,
            project_type TEXT,
            contract_value REAL,
            win_margin_pct REAL,
            executive_summary TEXT,
            scope_narrative TEXT,
            value_propositions TEXT,
            exclusions_text TEXT,
            strategy_notes TEXT,
            outcome TEXT DEFAULT 'won',
            created_at TEXT DEFAULT (datetime('now'))
        )
    `).run();
    await db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_proposals_type ON winning_proposals(project_type)
    `).run();
}

// ─── GET — List / filter winning proposals ───────────────────
export async function onRequestGet({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authErr = await authorize(request, env);
    if (authErr) return authErr;

    try {
        await ensureTable(env.DB);
        const url = new URL(request.url);
        const projectType = url.searchParams.get('project_type') || '';
        let search = url.searchParams.get('search') || '';
        if (search.length > 100) search = search.substring(0, 100);
        search = search.replace(/[%_]/g, '');

        let sql = `SELECT * FROM winning_proposals`;
        const conditions = [];
        const bindings = [];

        if (projectType) {
            conditions.push(`project_type = ?`);
            bindings.push(projectType);
        }
        if (search) {
            conditions.push(`(project_name LIKE ? OR executive_summary LIKE ?)`);
            bindings.push(`%${search}%`, `%${search}%`);
        }

        if (conditions.length > 0) {
            sql += ` WHERE ` + conditions.join(' AND ');
        }
        sql += ` ORDER BY created_at DESC LIMIT 100`;

        const stmt = env.DB.prepare(sql);
        const res = bindings.length > 0 ? await stmt.bind(...bindings).all() : await stmt.all();

        return jsonResp({ proposals: res.results || [] }, 200, origin);
    } catch (err) {
        console.error('Failed to load winning proposals:', err.message);
        return jsonResp({ error: 'Failed to load proposals' }, 500, origin);
    }
}

// ─── POST — Create a new winning proposal ────────────────────
export async function onRequestPost({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authErr = await authorize(request, env);
    if (authErr) return authErr;

    try {
        await ensureTable(env.DB);
        const body = await request.json();

        if (!body.project_name) {
            return jsonResp({ error: 'project_name is required' }, 400, origin);
        }

        const id = crypto.randomUUID().replace(/-/g, '');

        await env.DB.prepare(`
            INSERT INTO winning_proposals (id, project_name, project_type, contract_value,
                win_margin_pct, executive_summary, scope_narrative, value_propositions,
                exclusions_text, strategy_notes, outcome)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            String(body.project_name).substring(0, 300),
            body.project_type ? String(body.project_type).substring(0, 100) : null,
            body.contract_value != null ? parseFloat(body.contract_value) : null,
            body.win_margin_pct != null ? parseFloat(body.win_margin_pct) : null,
            body.executive_summary ? String(body.executive_summary).substring(0, 5000) : null,
            body.scope_narrative ? String(body.scope_narrative).substring(0, 5000) : null,
            body.value_propositions ? String(body.value_propositions).substring(0, 5000) : null,
            body.exclusions_text ? String(body.exclusions_text).substring(0, 5000) : null,
            body.strategy_notes ? String(body.strategy_notes).substring(0, 5000) : null,
            body.outcome ? String(body.outcome).substring(0, 50) : 'won',
        ).run();

        return jsonResp({ id, success: true }, 201, origin);
    } catch (err) {
        console.error('Failed to save winning proposal:', err.message);
        return jsonResp({ error: 'Failed to save proposal' }, 500, origin);
    }
}

// ─── PUT — Update a winning proposal ─────────────────────────
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

        if (body.project_name != null) { fields.push('project_name = ?'); bindings.push(String(body.project_name).substring(0, 300)); }
        if (body.project_type !== undefined) { fields.push('project_type = ?'); bindings.push(body.project_type ? String(body.project_type).substring(0, 100) : null); }
        if (body.contract_value !== undefined) { fields.push('contract_value = ?'); bindings.push(body.contract_value != null ? parseFloat(body.contract_value) : null); }
        if (body.win_margin_pct !== undefined) { fields.push('win_margin_pct = ?'); bindings.push(body.win_margin_pct != null ? parseFloat(body.win_margin_pct) : null); }
        if (body.executive_summary !== undefined) { fields.push('executive_summary = ?'); bindings.push(body.executive_summary ? String(body.executive_summary).substring(0, 5000) : null); }
        if (body.scope_narrative !== undefined) { fields.push('scope_narrative = ?'); bindings.push(body.scope_narrative ? String(body.scope_narrative).substring(0, 5000) : null); }
        if (body.value_propositions !== undefined) { fields.push('value_propositions = ?'); bindings.push(body.value_propositions ? String(body.value_propositions).substring(0, 5000) : null); }
        if (body.exclusions_text !== undefined) { fields.push('exclusions_text = ?'); bindings.push(body.exclusions_text ? String(body.exclusions_text).substring(0, 5000) : null); }
        if (body.strategy_notes !== undefined) { fields.push('strategy_notes = ?'); bindings.push(body.strategy_notes ? String(body.strategy_notes).substring(0, 5000) : null); }
        if (body.outcome !== undefined) { fields.push('outcome = ?'); bindings.push(body.outcome ? String(body.outcome).substring(0, 50) : null); }

        if (fields.length === 0) {
            return jsonResp({ error: 'No fields to update' }, 400, origin);
        }

        bindings.push(body.id);

        await env.DB.prepare(
            `UPDATE winning_proposals SET ${fields.join(', ')} WHERE id = ?`
        ).bind(...bindings).run();

        return jsonResp({ success: true }, 200, origin);
    } catch (err) {
        console.error('Failed to update winning proposal:', err.message);
        return jsonResp({ error: 'Failed to update proposal' }, 500, origin);
    }
}

// ─── DELETE — Remove a winning proposal ──────────────────────
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

        await env.DB.prepare(`DELETE FROM winning_proposals WHERE id = ?`).bind(id).run();
        return jsonResp({ success: true }, 200, origin);
    } catch (err) {
        console.error('Failed to delete winning proposal:', err.message);
        return jsonResp({ error: 'Failed to delete proposal' }, 500, origin);
    }
}
