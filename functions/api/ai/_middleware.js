// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — AI API CORS Middleware
// Restricts /api/ai/* to same-origin + SmartPlans/SmartPM origins.
// Prevents external sites from using our Gemini proxy.
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
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    // Block unauthorized origins
    if (!isAllowedOrigin(origin)) {
        return Response.json(
            { error: 'Origin not allowed' },
            { status: 403 }
        );
    }

    // Process the actual request
    const response = await context.next();

    // Never re-wrap SSE streams — consuming response.body breaks the ReadableStream
    // for cross-domain clients waiting on the event-stream. Clone headers only.
    if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
        const headers = new Headers(response.headers);
        if (origin) headers.set('Access-Control-Allow-Origin', origin);
        return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }

    // For normal (non-streaming) responses, safe to re-wrap
    const newResponse = new Response(response.body, response);
    if (origin) {
        newResponse.headers.set('Access-Control-Allow-Origin', origin);
    }

    return newResponse;
}
