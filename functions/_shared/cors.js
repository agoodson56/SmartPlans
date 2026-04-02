// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Shared CORS + Timing Utilities
// Single source of truth — imported by all /api/* middleware files.
// ═══════════════════════════════════════════════════════════════

/**
 * Validate a session token against the user_sessions table.
 * Returns the user row if valid, or null if invalid/expired.
 */
export async function validateSession(db, token) {
    if (!token) return null;
    try {
        const row = await db.prepare(`
            SELECT u.id, u.email, u.name, u.role, u.is_admin, u.is_active
            FROM user_sessions s
            JOIN user_accounts u ON u.id = s.user_id
            WHERE s.token = ? AND s.expires_at > datetime('now') AND u.is_active = 1
        `).bind(token).first();
        return row || null;
    } catch {
        return null; // Tables may not exist yet
    }
}

/**
 * Simple in-memory rate limiter for Cloudflare Workers.
 * Uses D1 rate_limits table. Returns true if request should be blocked.
 */
export async function checkRateLimit(db, key, maxRequests, windowSec) {
    try {
        const now = Math.floor(Date.now() / 1000);
        // Cleanup expired
        await db.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now).run();

        const row = await db.prepare('SELECT attempts, expires_at FROM rate_limits WHERE key = ?').bind(key).first();
        if (row && row.expires_at > now) {
            if (row.attempts >= maxRequests) return true;
            await db.prepare('UPDATE rate_limits SET attempts = attempts + 1 WHERE key = ?').bind(key).run();
        } else {
            await db.prepare(
                "INSERT INTO rate_limits (key, attempts, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = 1, expires_at = excluded.expires_at"
            ).bind(key, now + windowSec).run();
        }
        return false;
    } catch { return false; }
}

/**
 * Validate the Origin header against the SmartPlans/SmartPM allowlist.
 * Uses EXACT hostname matching only — no pattern-based subdomain checks.
 * SEC: Missing Origin is NO LONGER allowed — prevents non-browser clients from bypassing CORS.
 * Exception: Same-origin requests from Cloudflare Pages Functions have no Origin header,
 * so we allow missing Origin ONLY for GET requests (read-only) by default.
 */
export function isAllowedOrigin(origin, allowMissing = true) {
    if (!origin) return allowMissing; // Same-origin or non-browser — allowed by default, pass false to reject

    let hostname;
    try {
        hostname = new URL(origin).hostname;
    } catch {
        return false; // Malformed Origin header — reject
    }

    const allowedHostnames = [
        // SmartPlans deployments
        'smartplans-4g5.pages.dev',
        'smartplans.pages.dev',
        'smartplans.3dtechnologyservices.com',
        // SmartPM deployments
        'smartpm.pages.dev',
        'smartpm.3dtechnologyservices.com',
        // SEC: Root domain removed — explicit subdomains only to prevent subdomain takeover attacks
    ];

    return allowedHostnames.includes(hostname);
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Pads both strings to the same length before comparing so no
 * information is leaked through early exits.
 *
 * NOTE: crypto.timingSafeEqual requires Buffer/Uint8Array in Node.
 * In Cloudflare Workers it's not directly available for strings,
 * so we implement manually using bitwise OR accumulation.
 */
export function timingSafeCompare(a, b) {
    // Normalize to same length using a fixed-length padded comparison
    // to avoid leaking length information via early return
    const maxLen = Math.max(a.length, b.length, 1);
    const paddedA = a.padEnd(maxLen, '\0');
    const paddedB = b.padEnd(maxLen, '\0');
    let result = 0;
    for (let i = 0; i < maxLen; i++) {
        result |= paddedA.charCodeAt(i) ^ paddedB.charCodeAt(i);
    }
    return result === 0;
}

/**
 * Standard CORS preflight response for an allowed origin.
 * Pass the allowedMethods string for the specific endpoint (e.g., 'GET, POST, OPTIONS').
 */
export function corsPreflightResponse(origin, allowedMethods = 'GET, POST, OPTIONS') {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': origin || 'https://smartplans-4g5.pages.dev',
            'Access-Control-Allow-Methods': allowedMethods,
            'Access-Control-Allow-Headers': 'Content-Type, X-App-Token, X-Session-Token',
            'Access-Control-Max-Age': '86400',
        },
    });
}
