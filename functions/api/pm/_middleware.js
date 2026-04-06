// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — PM API CORS Middleware
// Allows SmartPM (smartpm.pages.dev) to call /api/pm/* endpoints.
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, validateSession, timingSafeCompare } from '../../_shared/cors.js';

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
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-App-Token, X-Session-Token',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    // Block unauthorized origins
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    }

    // SEC: Authentication — require session token OR legacy ESTIMATES_TOKEN
    const sessionToken = request.headers.get('X-Session-Token') || '';
    const appToken = request.headers.get('X-App-Token') || '';
    const envToken = env.ESTIMATES_TOKEN;

    let authenticated = false;
    if (sessionToken) {
        const user = await validateSession(env.DB, sessionToken);
        if (user) authenticated = true;
    }
    if (!authenticated && envToken && appToken) {
        if (timingSafeCompare(appToken, envToken)) authenticated = true;
    }
    if (!authenticated) {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
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
