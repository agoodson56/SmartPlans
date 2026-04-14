// ═══════════════════════════════════════════════════════════════
// POST /api/auth/login — Authenticate user and return session token
// Rate-limited: 5 failed attempts per IP per 5 minutes
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, timingSafeCompare } from '../../_shared/cors.js';

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SEC = 300;

// ─── Admin Recovery List (v5.125.1) ─────────────────────────────
// Emails in this list are auto-promoted to admin + activated on
// successful login — BUT ONLY when env.ADMIN_RECOVERY_MODE === 'true'.
//
// Default state: gate is CLOSED. Auto-promotion is INERT.
// To use: set ADMIN_RECOVERY_MODE=true in Cloudflare Pages → Variables
//         and Secrets, log in once, then clear the variable.
//
// Security rationale: a hardcoded list without a kill switch is a
// one-footgun-waiting-to-fire if a 3dtsi.com email is ever compromised.
// Gating behind an env var gives the owner a manual shutoff they control
// entirely from the Cloudflare dashboard — no code push needed to disable.
const ADMIN_RECOVERY_EMAILS = new Set([
    'agoodson@3dtsi.com',
]);

async function hashPasswordPBKDF2(password, saltHex, iterations = 100000) {
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
    } catch (err) {
        console.error('[Login] Rate limit check failed — failing CLOSED for security:', err.message);
        return true; // Fail-closed: block login attempts when DB unavailable to prevent brute force
    }
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

        // Verify password (100k iterations — Cloudflare Workers max supported)
        const inputHash = await hashPasswordPBKDF2(password, user.password_salt);
        if (!timingSafeCompare(inputHash, user.password_hash)) {
            await isRateLimited(env.DB, ip, true);
            return Response.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        // Clear rate limit on success
        try { await env.DB.prepare("DELETE FROM rate_limits WHERE key = ?").bind(`login_fail:${ip}`).run(); } catch {}

        // ─── Admin Recovery Auto-Promotion (v5.125.1) ────────────
        // Only fires when BOTH conditions are met:
        //   (1) ADMIN_RECOVERY_MODE === 'true' in Cloudflare env
        //   (2) Email is in the hardcoded ADMIN_RECOVERY_EMAILS set
        // The env var is the kill switch — when clear, this block is inert.
        const recoveryModeOn = env.ADMIN_RECOVERY_MODE === 'true';
        if (recoveryModeOn && ADMIN_RECOVERY_EMAILS.has(email)) {
            if (!user.is_admin || !user.is_active) {
                try {
                    await env.DB.prepare(
                        "UPDATE user_accounts SET is_admin = 1, is_active = 1 WHERE id = ?"
                    ).bind(user.id).run();
                    console.log(`[Auth] 🔓 Admin recovery: promoted ${email} (ADMIN_RECOVERY_MODE=true)`);
                } catch (e) {
                    console.warn('[Auth] Recovery auto-promote DB update failed:', e.message);
                }
            }
            user.is_admin = 1;
            user.is_active = 1;
        } else if (!recoveryModeOn && ADMIN_RECOVERY_EMAILS.has(email)) {
            // Log (but do not act) so the owner can verify the gate is holding
            console.log(`[Auth] Admin recovery list matched ${email} but ADMIN_RECOVERY_MODE is OFF — no action`);
        }

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
        return Response.json({ error: 'Login failed' }, { status: 500 });
    }
}
