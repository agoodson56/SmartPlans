// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — AI API CORS Middleware
// Restricts /api/ai/* to same-origin + Cloudflare Pages origins.
// Prevents external sites from using our Gemini proxy.
// ═══════════════════════════════════════════════════════════════

function isAllowedOrigin(origin) {
    if (!origin) return true; // No Origin = same-origin request, always OK

    // Allow any Cloudflare Pages deploy (production + preview URLs)
    if (origin.endsWith('.pages.dev') && origin.includes('smartplans')) return true;

    // Allow custom domain if configured
    if (origin.includes('smartplans')) return true;

    // Local development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;

    return false;
}

export async function onRequest(context) {
    const { request } = context;
    const origin = request.headers.get('Origin') || '';

    // Handle preflight
    if (request.method === 'OPTIONS') {
        if (!isAllowedOrigin(origin)) {
            return new Response(null, { status: 403 });
        }
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': origin || '*',
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

    // Add CORS headers to response
    const newResponse = new Response(response.body, response);
    if (origin) {
        newResponse.headers.set('Access-Control-Allow-Origin', origin);
    }

    return newResponse;
}
