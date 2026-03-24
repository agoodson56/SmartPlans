// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Estimate API Auth + CORS Middleware
// Validates requests to /api/estimates/* using a shared app token.
// Handles CORS preflight with PUT + DELETE for estimate updates.
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
    const { request, env } = context;
    const origin = request.headers.get('Origin') || '';

    // Handle CORS preflight — must include PUT and DELETE
    if (request.method === 'OPTIONS') {
        if (!isAllowedOrigin(origin)) {
            return new Response(null, { status: 403 });
        }
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': origin || '*',
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

    // Strategy 1: If ESTIMATES_TOKEN is configured, require it
    const envToken = env.ESTIMATES_TOKEN;
    if (envToken) {
        const authHeader = request.headers.get('X-App-Token') || '';
        if (authHeader !== envToken) {
            return Response.json(
                { error: 'Unauthorized — invalid or missing X-App-Token' },
                { status: 401 }
            );
        }
    } else {
        // Strategy 2: Fallback — same-origin check via Origin/Referer header
        const url = new URL(request.url);
        const host = url.origin;
        if (origin && origin !== host && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
            return Response.json(
                { error: 'Unauthorized — cross-origin requests not allowed' },
                { status: 403 }
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
