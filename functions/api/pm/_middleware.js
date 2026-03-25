// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — PM API CORS Middleware
// Allows SmartPM (smartpm.pages.dev) to call /api/pm/* endpoints.
// ═══════════════════════════════════════════════════════════════

// Canonical isAllowedOrigin — keep in sync across all middleware files
// Duplicated in: functions/api/ai/_middleware.js, functions/api/estimates/_middleware.js,
//                functions/api/pm/_middleware.js, functions/api/usage-stats.js
function isAllowedOrigin(origin) {
    if (!origin) return true; // Same-origin

    let hostname;
    try {
        hostname = new URL(origin).hostname;
    } catch {
        return false;
    }

    // SmartPlans origins (project suffix: -4g5)
    if (hostname.endsWith('.pages.dev') && hostname.includes('smartplans-4g5')) return true;

    // SmartPM origins
    if (hostname.endsWith('.pages.dev') && hostname.includes('smartpm')) return true;

    // Production domains
    const allowedHostnames = [
        'smartplans-4g5.pages.dev',
        'smartplans.pages.dev',
        'smartpm.pages.dev',
        'smartplans.3dtechnologyservices.com',
        'smartpm.3dtechnologyservices.com',
        '3dtechnologyservices.com',
    ];
    if (allowedHostnames.includes(hostname)) return true;

    // Local dev
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

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
