// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Shared CORS + Timing Utilities
// Single source of truth — imported by all /api/* middleware files.
// ═══════════════════════════════════════════════════════════════

/**
 * Validate the Origin header against the SmartPlans/SmartPM allowlist.
 * Uses EXACT hostname matching only — no pattern-based subdomain checks.
 * An absent Origin (same-origin server-to-server) is always allowed.
 */
export function isAllowedOrigin(origin) {
    if (!origin) return true; // Same-origin — no Origin header sent by browser

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
            'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
            'Access-Control-Max-Age': '86400',
        },
    });
}
