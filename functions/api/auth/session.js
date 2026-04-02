// ═══════════════════════════════════════════════════════════════
// GET  /api/auth/session — Validate session token, return user
// DELETE /api/auth/session — Logout (delete session)
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin } from '../../_shared/cors.js';

export async function onRequestGet(context) {
    const { env, request } = context;

    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const token = request.headers.get('X-Session-Token') || '';
    if (!token) {
        return Response.json({ error: 'No session' }, { status: 401 });
    }

    try {
        const row = await env.DB.prepare(`
            SELECT s.user_id, s.expires_at, u.id, u.email, u.name, u.role, u.is_admin, u.is_active
            FROM user_sessions s
            JOIN user_accounts u ON u.id = s.user_id
            WHERE s.token = ?
        `).bind(token).first();

        if (!row) {
            return Response.json({ error: 'Invalid session' }, { status: 401 });
        }

        if (new Date(row.expires_at) < new Date()) {
            await env.DB.prepare('DELETE FROM user_sessions WHERE token = ?').bind(token).run();
            return Response.json({ error: 'Session expired' }, { status: 401 });
        }

        if (!row.is_active) {
            return Response.json({ error: 'Account deactivated' }, { status: 403 });
        }

        return Response.json({
            user: {
                id: row.id,
                email: row.email,
                name: row.name,
                role: row.role,
                is_admin: !!row.is_admin,
            },
        });
    } catch (err) {
        console.error('[Auth] Session check error:', err);
        return Response.json({ error: 'Session check failed' }, { status: 500 });
    }
}

export async function onRequestDelete(context) {
    const { env, request } = context;

    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const token = request.headers.get('X-Session-Token') || '';
    if (token) {
        try {
            await env.DB.prepare('DELETE FROM user_sessions WHERE token = ?').bind(token).run();
        } catch {}
    }
    return Response.json({ success: true });
}
