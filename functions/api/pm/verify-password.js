// ═══════════════════════════════════════════════════════════════
// POST /api/pm/verify-password
// Verifies a role password against the stored PBKDF2 hash.
// Falls back to SHA-256 for legacy hashes and auto-upgrades them.
// Returns { valid: true/false } — never returns the hash itself.
// Rate-limited: 5 failed attempts per IP per 5 minutes → 429.
// CORS/origin check handled by /api/pm/_middleware.js
// ═══════════════════════════════════════════════════════════════

import { timingSafeCompare } from '../../../_shared/cors.js';

const RATE_LIMIT_MAX = 5;          // max failed attempts
const RATE_LIMIT_WINDOW_SEC = 300; // 5 minutes

/**
 * Hash a password using PBKDF2 with 100,000 iterations.
 * If saltHex is provided, converts from hex; otherwise generates a new 16-byte salt.
 * Returns { hash, salt } where both are hex strings.
 */
async function hashPasswordPBKDF2(password, saltHex) {
    if (!password) return { hash: '', salt: '' };
    const enc = new TextEncoder();
    let salt;
    if (saltHex) {
        salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
    } else {
        salt = crypto.getRandomValues(new Uint8Array(16));
    }
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
    const hash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    const saltOut = Array.from(new Uint8Array(salt)).map(b => b.toString(16).padStart(2, '0')).join('');
    return { hash, salt: saltOut };
}

/**
 * Legacy SHA-256 hash for backward compatibility.
 */
async function hashPasswordSHA256(password) {
    if (!password) return '';
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check and increment the failed-attempt counter for an IP.
 * Returns true if the IP is over the limit (should block).
 * Only increments on a failed attempt (caller passes incrementOnFail=true).
 */
async function isRateLimited(db, ip, incrementOnFail) {
    try {
        const key = `pw_fail:${ip}`;
        const now = Math.floor(Date.now() / 1000);

        // Clean up expired entries opportunistically (best-effort)
        await db.prepare(`DELETE FROM rate_limits WHERE expires_at < ?`).bind(now).run();

        const row = await db.prepare(
            `SELECT attempts, expires_at FROM rate_limits WHERE key = ?`
        ).bind(key).first();

        if (row && row.expires_at > now) {
            if (row.attempts >= RATE_LIMIT_MAX) return true; // already over limit
            if (incrementOnFail) {
                await db.prepare(
                    `UPDATE rate_limits SET attempts = attempts + 1 WHERE key = ?`
                ).bind(key).run();
            }
        } else if (incrementOnFail) {
            const expiresAt = now + RATE_LIMIT_WINDOW_SEC;
            await db.prepare(
                `INSERT INTO rate_limits (key, attempts, expires_at)
                 VALUES (?, 1, ?)
                 ON CONFLICT(key) DO UPDATE SET attempts = 1, expires_at = excluded.expires_at`
            ).bind(key, expiresAt).run();
        }
        return false;
    } catch (err) {
        // If rate_limits table doesn't exist yet, fail open (don't block)
        console.warn('[verify-password] Rate limit check error (non-fatal):', err.message);
        return false;
    }
}

/**
 * Clear the rate limit counter for an IP on successful login.
 */
async function clearRateLimit(db, ip) {
    try {
        await db.prepare(`DELETE FROM rate_limits WHERE key = ?`).bind(`pw_fail:${ip}`).run();
    } catch { /* non-fatal */ }
}

export async function onRequestPost(context) {
    const { env, request } = context;

    // Extract client IP for rate limiting
    const ip = request.headers.get('CF-Connecting-IP') ||
                request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
                'unknown';

    // Check rate limit before doing any work
    if (await isRateLimited(env.DB, ip, false)) {
        return Response.json(
            { error: 'Too many failed attempts — please wait 5 minutes before trying again' },
            { status: 429 }
        );
    }

    try {
        const body = await request.json();
        const role = String(body.role || '').substring(0, 20);    // 'estimator' or 'pm'
        const password = String(body.password || '').substring(0, 200);

        if (!role || !password) {
            await isRateLimited(env.DB, ip, true);
            return Response.json({ valid: false });
        }

        // Load stored passwords
        const row = await env.DB.prepare('SELECT value FROM pm_settings WHERE key = ?')
            .bind('passwords').first();

        if (!row) {
            // No passwords set — allow access (fresh install)
            return Response.json({ valid: true, reason: 'no_password_set' });
        }

        let stored;
        try { stored = JSON.parse(row.value); } catch {
            await isRateLimited(env.DB, ip, true);
            return Response.json({ valid: false });
        }

        const storedHash = stored?.[role];
        if (!storedHash) {
            // This role has no password set — allow
            return Response.json({ valid: true, reason: 'no_password_set' });
        }

        // Load salts
        let salts = {};
        try {
            const saltRow = await env.DB.prepare('SELECT value FROM pm_settings WHERE key = ?')
                .bind('passwords_salt').first();
            if (saltRow?.value) salts = JSON.parse(saltRow.value);
        } catch { /* no salt record */ }

        const roleSalt = salts?.[role];

        if (roleSalt) {
            // PBKDF2 path — salt exists, verify with PBKDF2
            const result = await hashPasswordPBKDF2(password, roleSalt);
            const valid = timingSafeCompare(result.hash, storedHash);
            if (!valid) await isRateLimited(env.DB, ip, true);
            else await clearRateLimit(env.DB, ip);
            return Response.json({ valid });
        } else {
            // Legacy SHA-256 path — no salt stored, try SHA-256
            const legacyHash = await hashPasswordSHA256(password);
            if (timingSafeCompare(legacyHash, storedHash)) {
                await clearRateLimit(env.DB, ip);
                // Auto-upgrade: re-hash with PBKDF2 and store salt
                try {
                    const upgraded = await hashPasswordPBKDF2(password);
                    stored[role] = upgraded.hash;
                    await env.DB.prepare(`
                        INSERT INTO pm_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
                        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
                    `).bind('passwords', JSON.stringify(stored)).run();

                    // Store the new salt
                    salts[role] = upgraded.salt;
                    await env.DB.prepare(`
                        INSERT INTO pm_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
                        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
                    `).bind('passwords_salt', JSON.stringify(salts)).run();

                    console.log(`[verify-password] Auto-upgraded ${role} password from SHA-256 to PBKDF2`);
                } catch (upgradeErr) {
                    console.error('[verify-password] Auto-upgrade failed:', upgradeErr);
                    // Verification still succeeded even if upgrade failed
                }
                return Response.json({ valid: true });
            }
            await isRateLimited(env.DB, ip, true);
            return Response.json({ valid: false });
        }

    } catch (err) {
        console.error('Verification failed:', err);
        return Response.json({ error: 'Verification failed' }, { status: 500 });
    }
}

// NOTE: No onRequestOptions export here.
// CORS preflight for /api/pm/* is handled by /api/pm/_middleware.js
// Adding one here overrides and bypasses that middleware.
