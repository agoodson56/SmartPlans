// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — PM API CORS Middleware
// Allows SmartPM (smartpm.pages.dev) to call /api/pm/* endpoints.
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin } from '../../_shared/cors.js';

export async function onRequest(context) {
    const { request } = context;
    const origin = request.headers.get('Origin') || '';

    // Handle preflight
    if (request.method === 'OPTIONS') {
        if (!isAllowedOrigin(origin)) {
            return new Response(null, { status: 403 });
        }
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': origin || 'https://smartplans-4g5.pages.dev',
                'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    // Block unauthorized origins
    if (!isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403 });
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
