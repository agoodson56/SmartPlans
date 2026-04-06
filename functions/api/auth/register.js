// ═══════════════════════════════════════════════════════════════
// POST /api/auth/register — Create a new account
// Restricted to @3dtsi.com email addresses only.
// Admin can disable registration via pm_settings "registration_enabled".
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, checkRateLimit } from '../../_shared/cors.js';

const ALLOWED_DOMAIN = '3dtsi.com';

/**
 * Hash a password using PBKDF2 with 100,000 iterations + random 16-byte salt (CF Workers max).
 */
async function hashPasswordPBKDF2(password) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
    const hash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    const saltHex = Array.from(new Uint8Array(salt)).map(b => b.toString(16).padStart(2, '0')).join('');
    return { hash, salt: saltHex };
}

export async function onRequestPost(context) {
    const { env, request } = context;

    // H3 fix: IP-based rate limiting for registration
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const blocked = await checkRateLimit(env.DB, `reg:${ip}`, 5, 3600, true);
    if (blocked) {
        return Response.json({ error: 'Too many registration attempts. Try again later.' }, { status: 429 });
    }

    // Origin validation
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // Check if registration is enabled (admin toggle)
        try {
            const regRow = await env.DB.prepare(
                "SELECT value FROM pm_settings WHERE key = 'registration_enabled'"
            ).first();
            if (regRow && regRow.value === 'false') {
                return Response.json(
                    { error: 'Account registration is currently disabled. Contact your administrator.' },
                    { status: 403 }
                );
            }
        } catch { /* table might not exist yet — allow registration */ }

        const body = await request.json();
        const email = String(body.email || '').trim().toLowerCase().substring(0, 200);
        const password = String(body.password || '').substring(0, 200);
        const name = String(body.name || '').trim().substring(0, 100);

        // Validate email
        if (!email || !password) {
            return Response.json({ error: 'Email and password are required' }, { status: 400 });
        }

        // Must be @3dtsi.com
        const emailParts = email.split('@');
        if (emailParts.length !== 2 || emailParts[1] !== ALLOWED_DOMAIN) {
            return Response.json(
                { error: `Registration is restricted to @${ALLOWED_DOMAIN} email addresses.` },
                { status: 403 }
            );
        }

        // Basic email format validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return Response.json({ error: 'Invalid email format' }, { status: 400 });
        }

        // Password strength — require 12+ chars with uppercase, lowercase, digit, and special char
        if (password.length < 12) {
            return Response.json({ error: 'Password must be at least 12 characters' }, { status: 400 });
        }
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
            return Response.json({ error: 'Password must include uppercase, lowercase, number, and special character' }, { status: 400 });
        }

        // Ensure accounts table exists
        await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS user_accounts (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL DEFAULT '',
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'estimator',
                is_admin INTEGER NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT DEFAULT (datetime('now')),
                last_login TEXT
            )
        `).run();

        // Check if email already exists
        const existing = await env.DB.prepare(
            'SELECT id FROM user_accounts WHERE email = ?'
        ).bind(email).first();
        if (existing) {
            return Response.json({ error: 'An account with this email already exists' }, { status: 409 });
        }

        // Hash password
        const { hash, salt } = await hashPasswordPBKDF2(password);

        // First user is automatically admin
        let isFirstUser = false;
        try {
            const countRow = await env.DB.prepare('SELECT COUNT(*) as cnt FROM user_accounts').first();
            isFirstUser = (!countRow || countRow.cnt === 0);
        } catch { isFirstUser = true; /* table was just created */ }

        // Create account
        const userId = crypto.randomUUID().replace(/-/g, '');
        await env.DB.prepare(`
            INSERT INTO user_accounts (id, email, name, password_hash, password_salt, role, is_admin, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, 'estimator', ?, 1, datetime('now'))
        `).bind(userId, email, name || email.split('@')[0], hash, salt, isFirstUser ? 1 : 0).run();

        // Generate session token
        const sessionToken = crypto.randomUUID() + '-' + crypto.randomUUID();
        await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                expires_at TEXT NOT NULL
            )
        `).run();

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
        await env.DB.prepare(
            "INSERT INTO user_sessions (token, user_id, created_at, expires_at) VALUES (?, ?, datetime('now'), ?)"
        ).bind(sessionToken, userId, expiresAt).run();

        console.log(`[Auth] New account created: ${email} (${userId})${isFirstUser ? ' [ADMIN - first user]' : ''}`);

        return Response.json({
            success: true,
            user: { id: userId, email, name: name || email.split('@')[0], role: 'estimator', is_admin: isFirstUser },
            sessionToken,
            expiresAt,
        }, { status: 201 });

    } catch (err) {
        console.error('[Auth] Registration error:', err);
        return Response.json({ error: 'Registration failed' }, { status: 500 });
    }
}
