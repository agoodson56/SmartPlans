// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Clarification Answers API  (v5.128.2, Wave 2B)
//
// Human-in-the-loop answers. Every time an estimator resolves an
// ambiguous symbol / schedule conflict / count dispute, the Q+A
// lands here so the next bid with the same ambiguity (same symbol
// label or question fingerprint) can pre-fill the modal.
//
// Schema is auto-created on first request (mirrors bid-corrections.js
// pattern). The fingerprint column is a normalized key:
//    LEGEND_DECODER + <legend_label>|<visual> (trimmed, lowercased)
// so a future bid can find prior answers by matching its own
// fingerprint against this table.
//
// GET    ?fingerprint=&limit=                 Filter by fingerprint
// POST                                         Create or bulk-import
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, timingSafeCompare, validateSession } from '../_shared/cors.js';

function corsHeaders(origin) {
    return {
        'Access-Control-Allow-Origin': origin || 'https://smartplans-4g5.pages.dev',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

async function ensureTable(db) {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS clarification_answers (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            fingerprint TEXT NOT NULL,
            question_id TEXT,
            category TEXT,
            source TEXT,
            legend_label TEXT,
            visual TEXT,
            first_seen_sheet TEXT,
            chosen_option TEXT NOT NULL,
            options_json TEXT,
            confidence REAL,
            estimate_id TEXT,
            project_name TEXT,
            answered_by TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_clarification_answers_fp ON clarification_answers(fingerprint)`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_clarification_answers_created ON clarification_answers(created_at DESC)`).run();
}

// ─── OPTIONS — CORS preflight ───────────────────────────────
export async function onRequestOptions({ request }) {
    const origin = request.headers.get('Origin') || '';
    if (!isAllowedOrigin(origin, false)) return new Response(null, { status: 403 });
    return new Response(null, { headers: corsHeaders(origin) });
}

// ─── GET — Look up prior answers by fingerprint ──────────────
export async function onRequestGet({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authResp = await authorize(request, env);
    if (authResp instanceof Response) return authResp;

    const url = new URL(request.url);
    const fingerprint = (url.searchParams.get('fingerprint') || '').trim().slice(0, 500);
    const limit = Math.max(1, Math.min(200, parseInt(url.searchParams.get('limit') || '25', 10)));

    try {
        await ensureTable(env.DB);
        if (fingerprint) {
            const rows = await env.DB
                .prepare('SELECT * FROM clarification_answers WHERE fingerprint = ? ORDER BY created_at DESC LIMIT ?')
                .bind(fingerprint, limit)
                .all();
            return jsonResp({ answers: rows.results || [] }, 200, origin);
        }
        const rows = await env.DB
            .prepare('SELECT * FROM clarification_answers ORDER BY created_at DESC LIMIT ?')
            .bind(limit)
            .all();
        return jsonResp({ answers: rows.results || [] }, 200, origin);
    } catch (err) {
        return jsonResp({ error: 'Query failed', detail: err.message }, 500, origin);
    }
}

// ─── POST — Save one or many answers ────────────────────────
export async function onRequestPost({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authResp = await authorize(request, env);
    if (authResp instanceof Response) return authResp;
    const { user } = authResp;

    let body;
    try { body = await request.json(); }
    catch { return jsonResp({ error: 'Invalid JSON' }, 400, origin); }

    const records = Array.isArray(body?.answers) ? body.answers : (body ? [body] : []);
    if (records.length === 0) return jsonResp({ error: 'No answers provided' }, 400, origin);
    if (records.length > 100) return jsonResp({ error: 'Max 100 answers per request' }, 400, origin);

    try {
        await ensureTable(env.DB);
        const now = new Date().toISOString();
        const stmts = records.map(r => env.DB.prepare(`
            INSERT INTO clarification_answers
                (fingerprint, question_id, category, source, legend_label, visual,
                 first_seen_sheet, chosen_option, options_json, confidence,
                 estimate_id, project_name, answered_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            String(r.fingerprint || '').slice(0, 500),
            r.question_id ? String(r.question_id).slice(0, 200) : null,
            r.category ? String(r.category).slice(0, 100) : null,
            r.source ? String(r.source).slice(0, 100) : null,
            r.legend_label ? String(r.legend_label).slice(0, 200) : null,
            r.visual ? String(r.visual).slice(0, 500) : null,
            r.first_seen_sheet ? String(r.first_seen_sheet).slice(0, 100) : null,
            String(r.chosen_option || '').slice(0, 500),
            r.options_json ? String(r.options_json).slice(0, 2000) : null,
            Number.isFinite(Number(r.confidence)) ? Number(r.confidence) : null,
            r.estimate_id ? String(r.estimate_id).slice(0, 200) : null,
            r.project_name ? String(r.project_name).slice(0, 300) : null,
            (r.answered_by || user?.email || user?.name || null),
            now,
        ));
        await env.DB.batch(stmts);
        return jsonResp({ saved: records.length }, 200, origin);
    } catch (err) {
        return jsonResp({ error: 'Insert failed', detail: err.message }, 500, origin);
    }
}
