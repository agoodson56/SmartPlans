// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Estimate API Auth + CORS Middleware
// Validates requests to /api/estimates/* using a shared app token.
// Handles CORS preflight with PUT + DELETE for estimate updates.
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, timingSafeCompare, validateSession } from '../../_shared/cors.js';

export async function onRequest(context) {
    const { request, env } = context;
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight — must include PUT and DELETE
    if (request.method === 'OPTIONS') {
        if (!isAllowedOrigin(origin)) {
            return new Response(null, { status: 403 });
        }
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': origin || 'https://smartplans-4g5.pages.dev',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-App-Token, X-Session-Token',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    // Block unauthorized origins on actual requests too
    if (!isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    }

    // SEC: Require session token OR ESTIMATES_TOKEN — fail-closed
    const sessionToken = request.headers.get('X-Session-Token') || '';
    const appToken = request.headers.get('X-App-Token') || '';
    const envToken = env.ESTIMATES_TOKEN;
    let authenticated = false;

    // Path 1: Session-based auth (new account system)
    if (sessionToken) {
        const user = await validateSession(env.DB, sessionToken);
        if (user) authenticated = true;
    }

    // Path 2: Legacy ESTIMATES_TOKEN auth
    if (!authenticated && envToken && appToken) {
        if (timingSafeCompare(appToken, envToken)) authenticated = true;
    }

    // SEC: Fail-closed — ALWAYS require authentication
    // Previously only checked when ESTIMATES_TOKEN was configured, leaving
    // the API open if the env var was missing. Now requires auth unconditionally.
    if (!authenticated) {
        return Response.json(
            { error: 'Authentication required — please log in' },
            { status: 401 }
        );
    }

    // Process the actual request
    const response = await context.next();

    // Add CORS headers to response
    const newResponse = new Response(response.body, response);
    if (origin) {
        newResponse.headers.set('Access-Control-Allow-Origin', origin);
    }
    return newResponse;
}
