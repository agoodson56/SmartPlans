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
        // FIX #20: Cleanup only ~1% of requests instead of every request (reduce D1 churn)
        if (Math.random() < 0.01) {
            await db.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now).run().catch(() => {});
        }

        // Upsert then read — D1 doesn't support RETURNING clause
        await db.prepare(
            `INSERT INTO rate_limits (key, attempts, expires_at) VALUES (?, 1, ?)
             ON CONFLICT(key) DO UPDATE SET
               attempts = CASE WHEN excluded.expires_at > rate_limits.expires_at
                               THEN 1 ELSE rate_limits.attempts + 1 END,
               expires_at = CASE WHEN excluded.expires_at > rate_limits.expires_at
                                 THEN excluded.expires_at ELSE rate_limits.expires_at END`
        ).bind(key, now + windowSec).run();

        const row = await db.prepare('SELECT attempts FROM rate_limits WHERE key = ?').bind(key).first();
        if (row && row.attempts > maxRequests) return true;
        return false;
    } catch { return true; } // FIX #11: Fail-CLOSED — if DB is down, block requests to prevent abuse
}

/**
 * Validate the Origin header against the SmartPlans/SmartPM allowlist.
 * Uses EXACT hostname matching only — no pattern-based subdomain checks.
 * SEC: Missing Origin is NOT allowed by default — prevents non-browser clients from bypassing CORS.
 * Callers must explicitly pass allowMissing=true if same-origin (no Origin header) is expected.
 */
export function isAllowedOrigin(origin, allowMissing = false) {
    // allowMissing defaults to false — callers must explicitly opt in for same-origin
    if (!origin) return allowMissing;

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
    // FIX #15/18: Reject empty strings — prevents bypass when both token and env are empty
    if (a.length === 0 || b.length === 0) return false;
    // FIX #8: Pad to fixed minimum length (256) to prevent leaking target token length
    // via timing differences on different-length inputs
    const maxLen = Math.max(a.length, b.length, 256);
    const paddedA = a.padEnd(maxLen, '\0');
    const paddedB = b.padEnd(maxLen, '\0');
    let result = a.length ^ b.length; // Also compare lengths to reject different-length tokens
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
            'Access-Control-Allow-Origin': origin || '',
            'Access-Control-Allow-Methods': allowedMethods,
            'Access-Control-Allow-Headers': 'Content-Type, X-App-Token, X-Session-Token',
            'Access-Control-Max-Age': '86400',
        },
    });
}
