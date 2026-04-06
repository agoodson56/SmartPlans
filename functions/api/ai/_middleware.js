// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — AI API Auth + CORS Middleware
// SEC: Requires valid session token OR ESTIMATES_TOKEN to prevent
// unauthorized use of Gemini API proxy.
// Rate-limited: 60 requests per IP per minute.
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, timingSafeCompare, validateSession, checkRateLimit } from '../../_shared/cors.js';

export async function onRequest(context) {
    const { request, env } = context;
    const origin = request.headers.get('Origin') || '';

    // Handle preflight
    if (request.method === 'OPTIONS') {
        if (!isAllowedOrigin(origin, false)) {
            return new Response(null, { status: 403 });
        }
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': origin || 'https://smartplans-4g5.pages.dev',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-App-Token, X-Session-Token',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    // Block unauthorized origins — allow same-origin (missing Origin header is normal
    // for same-origin fetch on Cloudflare Pages), but reject bad Origins.
    // The session/token auth below is the real protection against unauthorized access.
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    }

    // SEC: Rate limiting — 60 requests per session per minute for AI endpoints
    // Uses session token (not IP) to prevent spoofing via X-Forwarded-For
    const sessionToken = request.headers.get('X-Session-Token') || '';
    const rateLimitKey = sessionToken ? `ai_rate:session:${sessionToken}` :
        `ai_rate:ip:${request.headers.get('CF-Connecting-IP') || 'unknown'}`;
    try {
        const blocked = await checkRateLimit(env.DB, rateLimitKey, 60, 60, true);
        if (blocked) {
            return Response.json(
                { error: 'Rate limit exceeded — please wait before making more AI requests' },
                { status: 429 }
            );
        }
    } catch { /* rate limit check failure is non-fatal */ }

    // SEC: Authentication — require session token OR legacy ESTIMATES_TOKEN
    // This prevents anyone who discovers the URL from burning through API keys
    // sessionToken already declared above (line 39) for rate limiting
    const appToken = request.headers.get('X-App-Token') || '';
    const envToken = env.ESTIMATES_TOKEN;

    let authenticated = false;

    // Path 1: Session-based auth (new account system)
    if (sessionToken) {
        const user = await validateSession(env.DB, sessionToken);
        if (user) authenticated = true;
    }

    // Path 2: Legacy app token auth
    if (!authenticated && envToken && appToken) {
        if (timingSafeCompare(appToken, envToken)) {
            authenticated = true;
        }
    }

    // SEC: Fail-closed — ALWAYS require authentication
    if (!authenticated) {
        return Response.json(
            { error: 'Authentication required — please log in' },
            { status: 401 }
        );
    }

    // Process the actual request
    const response = await context.next();

    // Never re-wrap SSE streams — consuming response.body breaks the ReadableStream
    if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
        const headers = new Headers(response.headers);
        if (origin) headers.set('Access-Control-Allow-Origin', origin);
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }

    // For normal responses
    const newResponse = new Response(response.body, response);
    if (origin) {
        newResponse.headers.set('Access-Control-Allow-Origin', origin);
    }

    return newResponse;
}
