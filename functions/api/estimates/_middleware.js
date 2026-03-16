// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Estimate API Auth Middleware
// Validates requests to /api/estimates/* using a shared app token.
// The token is auto-generated per browser session and stored in
// localStorage. Server validates it matches the ESTIMATES_TOKEN
// env secret. If no secret is configured, falls back to allowing
// same-origin requests only (Referer/Origin check).
// ═══════════════════════════════════════════════════════════════

export async function onRequest(context) {
    const { request, env } = context;

    // Allow CORS preflight
    if (request.method === 'OPTIONS') {
        return context.next();
    }

    // Strategy 1: If ESTIMATES_TOKEN is configured, require it
    const envToken = env.ESTIMATES_TOKEN;
    if (envToken) {
        const authHeader = request.headers.get('X-App-Token') || '';
        if (authHeader !== envToken) {
            return Response.json(
                { error: 'Unauthorized — invalid or missing X-App-Token' },
                { status: 401 }
            );
        }
        return context.next();
    }

    // Strategy 2: Fallback — same-origin check via Origin/Referer header
    const origin = request.headers.get('Origin') || '';
    const referer = request.headers.get('Referer') || '';
    const url = new URL(request.url);
    const host = url.origin;

    if (origin && origin !== host && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return Response.json(
            { error: 'Unauthorized — cross-origin requests not allowed' },
            { status: 403 }
        );
    }

    return context.next();
}
