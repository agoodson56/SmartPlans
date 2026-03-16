// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — AI API CORS Middleware
// Restricts /api/ai/* to same-origin + allowed origins only.
// Prevents external sites from using our Gemini proxy.
// ═══════════════════════════════════════════════════════════════

const ALLOWED_ORIGINS = [
    // Production
    'https://smartplans.pages.dev',
    // Local development
    'http://localhost:8788',
    'http://127.0.0.1:8788',
    'http://localhost:3000',
];

function getCorsOrigin(request) {
    const origin = request.headers.get('Origin') || '';
    // Allow if origin matches our allowed list
    if (ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
        return origin;
    }
    // Allow same-origin (no Origin header = same origin in most cases)
    if (!origin) return null; // No CORS headers needed for same-origin
    return false; // Block
}

export async function onRequest(context) {
    const { request } = context;

    // Handle preflight
    if (request.method === 'OPTIONS') {
        const allowed = getCorsOrigin(request);
        if (allowed === false) {
            return new Response(null, { status: 403 });
        }
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': allowed || '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    // Process the actual request
    const response = await context.next();

    // Add CORS headers to response
    const allowed = getCorsOrigin(request);
    if (allowed === false) {
        return Response.json(
            { error: 'Origin not allowed' },
            { status: 403 }
        );
    }

    // Clone response and add CORS headers
    const newResponse = new Response(response.body, response);
    if (allowed) {
        newResponse.headers.set('Access-Control-Allow-Origin', allowed);
    }
    // Remove wildcard if it was set by the endpoint
    if (newResponse.headers.get('Access-Control-Allow-Origin') === '*' && allowed) {
        newResponse.headers.set('Access-Control-Allow-Origin', allowed);
    }

    return newResponse;
}
