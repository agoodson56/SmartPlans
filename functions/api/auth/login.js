// ═══════════════════════════════════════════════════════════════
// POST /api/auth/login — Authenticate user and return session token
// Rate-limited: 5 failed attempts per IP per 5 minutes
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, timingSafeCompare } from '../../_shared/cors.js';

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_SEC = 300;

async function hashPasswordPBKDF2(password, saltHex, iterations = 600000) {
    const enc = new TextEncoder();
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
    return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function isRateLimited(db, ip, increment) {
    try {
        const key = `login_fail:${ip}`;
        const now = Math.floor(Date.now() / 1000);
        await db.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now).run();
        const row = await db.prepare('SELECT attempts, expires_at FROM rate_limits WHERE key = ?').bind(key).first();
        if (row && row.expires_at > now) {
            if (row.attempts >= RATE_LIMIT_MAX) return true;
            if (increment) await db.prepare('UPDATE rate_limits SET attempts = attempts + 1 WHERE key = ?').bind(key).run();
        } else if (increment) {
            await db.prepare(
                "INSERT INTO rate_limits (key, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = 1, expires_at = excluded.expires_at"
            ).bind(key, now + RATE_LIMIT_WINDOW_SEC).run();
        }
        return false;
    } catch { return false; } // Fail-open: DB issues should not lock out legitimate users
}

export async function onRequestPost(context) {
    const { env, request } = context;

    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ip = request.headers.get('CF-Connecting-IP') ||
               request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';

    if (await isRateLimited(env.DB, ip, false)) {
        return Response.json({ error: 'Too many failed attempts. Wait 5 minutes.' }, { status: 429 });
    }

    try {
        const body = await request.json();
        const email = String(body.email || '').trim().toLowerCase().substring(0, 200);
        const password = String(body.password || '').substring(0, 200);

        if (!email || !password) {
            return Response.json({ error: 'Email and password required' }, { status: 400 });
        }

        let user;
        try {
            user = await env.DB.prepare(
                'SELECT id, email, name, password_hash, password_salt, role, is_admin, is_active FROM user_accounts WHERE email = ?'
            ).bind(email).first();
        } catch (dbErr) {
            // Table may not exist yet (fresh install — user needs to register first)
            console.warn('[Auth] Login query failed (table may not exist):', dbErr.message);
            return Response.json({ error: 'No accounts exist yet. Please create an account first.' }, { status: 401 });
        }

        if (!user) {
            await isRateLimited(env.DB, ip, true);
            return Response.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        if (!user.is_active) {
            return Response.json({ error: 'Account is deactivated. Contact your administrator.' }, { status: 403 });
        }

        // Verify password — try 600k iterations first, fall back to legacy 100k, auto-upgrade
        let passwordValid = false;
        const inputHash600k = await hashPasswordPBKDF2(password, user.password_salt, 600000);
        if (timingSafeCompare(inputHash600k, user.password_hash)) {
            passwordValid = true;
        } else {
            // Legacy: account was created with 100k iterations — try that
            const inputHash100k = await hashPasswordPBKDF2(password, user.password_salt, 100000);
            if (timingSafeCompare(inputHash100k, user.password_hash)) {
                passwordValid = true;
                // Auto-upgrade to 600k iterations
                try {
                    await env.DB.prepare("UPDATE user_accounts SET password_hash = ? WHERE id = ?")
                        .bind(inputHash600k, user.id).run();
                    console.log(`[Auth] Auto-upgraded ${email} password hash from 100k → 600k iterations`);
                } catch (upgradeErr) {
                    console.warn('[Auth] Hash upgrade failed (non-fatal):', upgradeErr.message);
                }
            }
        }
        if (!passwordValid) {
            await isRateLimited(env.DB, ip, true);
            return Response.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        // Clear rate limit on success
        try { await env.DB.prepare("DELETE FROM rate_limits WHERE key = ?").bind(`login_fail:${ip}`).run(); } catch {}

        // Update last_login
        await env.DB.prepare("UPDATE user_accounts SET last_login = datetime('now') WHERE id = ?").bind(user.id).run();

        // Create session
        await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                expires_at TEXT NOT NULL
            )
        `).run();

        // Clean expired sessions
        await env.DB.prepare("DELETE FROM user_sessions WHERE expires_at < datetime('now')").run();

        const sessionToken = crypto.randomUUID() + '-' + crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await env.DB.prepare(
            "INSERT INTO user_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, datetime('now'), ?)"
        ).bind(sessionToken, user.id, expiresAt).run();

        console.log(`[Auth] Login: ${email}`);

        return Response.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                is_admin: !!user.is_admin,
            },
            sessionToken,
            expiresAt,
        });

    } catch (err) {
        console.error('[Auth] Login error:', err.message, err.stack);
        return Response.json({ error: 'Login failed', _debug: err.message }, { status: 500 });
    }
}
