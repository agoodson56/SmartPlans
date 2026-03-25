// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — AI API CORS Middleware
// Restricts /api/ai/* to same-origin + Cloudflare Pages origins.
// Prevents external sites from using our Gemini proxy.
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

    // CRIT-1 fix: Never re-wrap SSE streams — consuming response.body breaks the ReadableStream
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
