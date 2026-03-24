// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — PM API CORS Middleware
// Allows SmartPM (smartpm.pages.dev) to call /api/pm/* endpoints.
// ═══════════════════════════════════════════════════════════════

// Canonical isAllowedOrigin — keep in sync across all middleware files
// Duplicated in: functions/api/ai/_middleware.js, functions/api/estimates/_middleware.js,
//                functions/api/pm/_middleware.js, functions/api/usage-stats.js
function isAllowedOrigin(origin) {
    if (!origin) return true; // Same-origin

    // SmartPlans origins (project suffix: -4g5)
    if (origin.endsWith('.pages.dev') && origin.includes('smartplans-4g5')) return true;

    // SmartPM origins
    if (origin.endsWith('.pages.dev') && origin.includes('smartpm')) return true;

    // Production domains
    const allowedDomains = [
        'https://smartplans-4g5.pages.dev',
        'https://smartplans.pages.dev',
        'https://smartpm.pages.dev',
        'https://smartplans.3dtechnologyservices.com',
        'https://smartpm.3dtechnologyservices.com',
        'https://3dtechnologyservices.com',
    ];
    if (allowedDomains.some(d => origin.startsWith(d))) return true;

    // Local dev
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return true;

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
