// ═══════════════════════════════════════════════════════════════
// /api/auth/admin — Admin-only account management
// GET    — List all accounts
// PUT    — Update account (toggle active, admin, role)
// POST   — Admin actions (toggle registration, etc.)
// Requires admin session token
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin } from '../../_shared/cors.js';

async function requireAdmin(env, request) {
    const token = request.headers.get('X-Session-Token') || '';
    if (!token) return null;

    try {
        const row = await env.DB.prepare(`
            SELECT u.id, u.email, u.name, u.role, u.is_admin
            FROM user_sessions s
            JOIN user_accounts u ON u.id = s.user_id
            WHERE s.token = ? AND s.expires_at > datetime('now') AND u.is_active = 1
        `).bind(token).first();

        if (row && row.is_admin) return row;
    } catch {}
    return null;
}

// GET — List all accounts (admin only)
export async function onRequestGet(context) {
    const { env, request } = context;
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const admin = await requireAdmin(env, request);
    if (!admin) return Response.json({ error: 'Admin access required' }, { status: 403 });

    try {
        const res = await env.DB.prepare(
            'SELECT id, email, name, role, is_admin, is_active, created_at, last_login FROM user_accounts ORDER BY created_at DESC'
        ).all();

        // Get registration status
        let registrationEnabled = true;
        try {
            const regRow = await env.DB.prepare("SELECT value FROM pm_settings WHERE key = 'registration_enabled'").first();
            if (regRow) registrationEnabled = regRow.value !== 'false';
        } catch {}

        return Response.json({
            accounts: res.results || [],
            registrationEnabled,
        });
    } catch (err) {
        console.error('[Admin] List accounts error:', err);
        return Response.json({ error: 'Failed to list accounts' }, { status: 500 });
    }
}

// PUT — Update a specific account (admin only)
export async function onRequestPut(context) {
    const { env, request } = context;
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const admin = await requireAdmin(env, request);
    if (!admin) return Response.json({ error: 'Admin access required' }, { status: 403 });

    try {
        const body = await request.json();
        const userId = String(body.userId || '').substring(0, 64);
        if (!userId) return Response.json({ error: 'Missing userId' }, { status: 400 });

        // Prevent admin from deactivating themselves
        if (userId === admin.id && body.is_active === false) {
            return Response.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
        }

        const updates = [];
        const values = [];

        if (typeof body.is_active === 'boolean') {
            updates.push('is_active = ?');
            values.push(body.is_active ? 1 : 0);
        }
        if (typeof body.is_admin === 'boolean') {
            updates.push('is_admin = ?');
            values.push(body.is_admin ? 1 : 0);
        }
        if (body.role && ['estimator', 'pm', 'viewer'].includes(body.role)) {
            updates.push('role = ?');
            values.push(body.role);
        }

        if (updates.length === 0) {
            return Response.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        values.push(userId);
        await env.DB.prepare(
            `UPDATE user_accounts SET ${updates.join(', ')} WHERE id = ?`
        ).bind(...values).run();

        // If deactivating, kill their sessions
        if (body.is_active === false) {
            await env.DB.prepare('DELETE FROM user_sessions WHERE user_id = ?').bind(userId).run();
        }

        console.log(`[Admin] ${admin.email} updated account ${userId}: ${JSON.stringify(body)}`);
        return Response.json({ success: true });
    } catch (err) {
        console.error('[Admin] Update error:', err);
        return Response.json({ error: 'Update failed' }, { status: 500 });
    }
}

// POST — Admin actions (toggle registration, etc.)
export async function onRequestPost(context) {
    const { env, request } = context;
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const admin = await requireAdmin(env, request);
    if (!admin) return Response.json({ error: 'Admin access required' }, { status: 403 });

    try {
        const body = await request.json();
        const action = String(body.action || '');

        if (action === 'toggle_registration') {
            const enabled = !!body.enabled;
            await env.DB.prepare(`
                INSERT INTO pm_settings (key, value, updated_at) VALUES ('registration_enabled', ?, datetime('now'))
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
            `).bind(enabled ? 'true' : 'false').run();

            console.log(`[Admin] ${admin.email} ${enabled ? 'enabled' : 'disabled'} registration`);
            return Response.json({ success: true, registrationEnabled: enabled });
        }

        return Response.json({ error: 'Unknown action' }, { status: 400 });
    } catch (err) {
        console.error('[Admin] Action error:', err);
        return Response.json({ error: 'Action failed' }, { status: 500 });
    }
}
