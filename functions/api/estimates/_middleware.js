// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Estimate API Auth + CORS Middleware
// Validates requests to /api/estimates/* using a shared app token.
// Handles CORS preflight with PUT + DELETE for estimate updates.
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, timingSafeCompare } from '../../_shared/cors.js';

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
                'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    // Block unauthorized origins on actual requests too
    if (!isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
    }

    // Require X-App-Token if ESTIMATES_TOKEN is configured (timing-safe comparison)
    const envToken = env.ESTIMATES_TOKEN;
    if (envToken) {
        const authHeader = request.headers.get('X-App-Token') || '';
        if (!timingSafeCompare(authHeader, envToken)) {
            return Response.json(
                { error: 'Unauthorized — invalid or missing X-App-Token' },
                { status: 401 }
            );
        }
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
