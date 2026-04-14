// ═══════════════════════════════════════════════════════════════
// GET    /api/salespeople        — List all salespeople
// POST   /api/salespeople        — Add or update a salesperson
// DELETE /api/salespeople?id=xxx — Remove a salesperson (admin only)
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, timingSafeCompare, validateSession, corsPreflightResponse } from '../_shared/cors.js';

// ── Shared auth helper ──────────────────────────────────────────
async function authenticate(request, env) {
    const sessionToken = request.headers.get('X-Session-Token') || '';
    const appToken = request.headers.get('X-App-Token') || '';
    const envToken = env.ESTIMATES_TOKEN;

    if (sessionToken) {
        const user = await validateSession(env.DB, sessionToken);
        if (user) return user;
    }
    if (envToken && appToken && timingSafeCompare(appToken, envToken)) {
        return { id: null, is_admin: false }; // legacy app-token — read-only effective
    }
    return null;
}

// ── OPTIONS (CORS preflight) ────────────────────────────────────
export async function onRequestOptions(context) {
    const origin = context.request.headers.get('Origin') || '';
    if (!isAllowedOrigin(origin, false)) return new Response(null, { status: 403 });
    return corsPreflightResponse(origin, 'GET, POST, DELETE, OPTIONS');
}

// ── GET: List all salespeople ───────────────────────────────────
export async function onRequestGet(context) {
    const { env, request } = context;
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const user = await authenticate(request, env);
    if (!user) {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
        // Ensure table exists (first-run safety)
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS salespeople (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            title TEXT DEFAULT 'Sales Consultant',
            phone TEXT,
            email TEXT NOT NULL,
            office TEXT,
            created_by TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )`).run();

        const res = await env.DB.prepare(
            'SELECT id, first_name, last_name, title, phone, email, office FROM salespeople ORDER BY last_name, first_name'
        ).all();

        const resp = Response.json({ salespeople: res.results || [] });
        if (origin) resp.headers.set('Access-Control-Allow-Origin', origin);
        return resp;
    } catch (err) {
        console.error('Failed to load salespeople:', err.message);
        return Response.json({ error: 'Failed to load salespeople' }, { status: 500 });
    }
}

// ── POST: Add or update a salesperson ───────────────────────────
export async function onRequestPost(context) {
    const { env, request } = context;
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const user = await authenticate(request, env);
    if (!user) {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    try {
        // Ensure table exists (same as GET — in case POST is called before GET)
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS salespeople (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            title TEXT DEFAULT 'Sales Consultant',
            phone TEXT,
            email TEXT NOT NULL,
            office TEXT,
            created_by TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )`).run();

        const body = await request.json();
        const firstName = String(body.firstName || '').trim().substring(0, 100);
        const lastName = String(body.lastName || '').trim().substring(0, 100);
        const email = String(body.email || '').trim().toLowerCase().substring(0, 200);
        if (!firstName || !lastName || !email) {
            return Response.json({ error: 'firstName, lastName, and email are required' }, { status: 400 });
        }

        const title = String(body.title || 'Sales Consultant').trim().substring(0, 100);
        const phone = String(body.phone || '').trim().substring(0, 30);
        const office = String(body.office || '').trim().substring(0, 200);
        const createdBy = user.id || null;

        // Upsert by email — update if exists, insert if new
        const existing = await env.DB.prepare('SELECT id FROM salespeople WHERE email = ?').bind(email).first();

        if (existing) {
            await env.DB.prepare(
                `UPDATE salespeople SET first_name = ?, last_name = ?, title = ?, phone = ?, office = ?, updated_at = datetime('now') WHERE id = ?`
            ).bind(firstName, lastName, title, phone, office, existing.id).run();
            const resp = Response.json({ id: existing.id, updated: true, success: true });
            if (origin) resp.headers.set('Access-Control-Allow-Origin', origin);
            return resp;
        } else {
            const id = crypto.randomUUID().replace(/-/g, '');
            await env.DB.prepare(
                `INSERT INTO salespeople (id, first_name, last_name, title, phone, email, office, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(id, firstName, lastName, title, phone, email, office, createdBy).run();
            const resp = Response.json({ id, created: true, success: true }, { status: 201 });
            if (origin) resp.headers.set('Access-Control-Allow-Origin', origin);
            return resp;
        }
    } catch (err) {
        console.error('Failed to save salesperson:', err.message);
        return Response.json({ error: 'Failed to save salesperson' }, { status: 500 });
    }
}

// ── DELETE: Remove a salesperson (admin only) ───────────────────
export async function onRequestDelete(context) {
    const { env, request } = context;
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const user = await authenticate(request, env);
    if (!user) {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.is_admin) {
        return Response.json({ error: 'Admin access required to delete salespeople' }, { status: 403 });
    }

    try {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id || id.length > 40) {
            return Response.json({ error: 'Missing or invalid salesperson id' }, { status: 400 });
        }

        const result = await env.DB.prepare('DELETE FROM salespeople WHERE id = ?').bind(id).run();
        const resp = Response.json({ deleted: result.meta?.changes > 0, success: true });
        if (origin) resp.headers.set('Access-Control-Allow-Origin', origin);
        return resp;
    } catch (err) {
        console.error('Failed to delete salesperson:', err.message);
        return Response.json({ error: 'Failed to delete salesperson' }, { status: 500 });
    }
}
