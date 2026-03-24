// ═══════════════════════════════════════════════════════════════
// GET  /api/estimates — List all saved estimates
// POST /api/estimates — Save a new estimate
// ═══════════════════════════════════════════════════════════════

function isAllowedOrigin(origin) {
    if (!origin) return true;
    // Allow any SmartPlans or SmartPM Cloudflare Pages deploy
    if (origin.endsWith('.pages.dev') && (origin.includes('smartplans-4g5') || origin.includes('smartpm'))) return true;
    const allowed = [
        'https://smartplans-4g5.pages.dev',
        'https://smartplans.pages.dev',
        'https://smartplans.3dtechnologyservices.com',
        'https://smartpm.3dtechnologyservices.com',
        'https://3dtechnologyservices.com',
    ];
    if (allowed.some(d => origin.startsWith(d))) return true;
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return true;
    return false;
}

export async function onRequestGet(context) {
    const { env, request } = context;

    // Origin check — same allowlist used across all PM endpoints
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    // Token check — require X-App-Token if ESTIMATES_TOKEN is configured
    const envToken = env.ESTIMATES_TOKEN;
    if (envToken) {
        const token = request.headers.get('X-App-Token') || '';
        if (token !== envToken) {
            return Response.json({ error: 'Unauthorized — invalid or missing X-App-Token' }, { status: 401 });
        }
    }

    try {
        const res = await env.DB.prepare(
            `SELECT id, project_name, project_type, project_location, disciplines,
                    pricing_tier, status, created_at, updated_at
             FROM estimates ORDER BY updated_at DESC LIMIT 100`
        ).all();
        return Response.json({ estimates: res.results || [] });
    } catch (err) {
        return Response.json({ error: 'Failed to load estimates: ' + err.message }, { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { env, request } = context;

    // CRIT-1 fix: POST had zero auth — now matches GET security
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    const envToken = env.ESTIMATES_TOKEN;
    if (envToken) {
        const token = request.headers.get('X-App-Token') || '';
        if (token !== envToken) {
            return Response.json({ error: 'Unauthorized — invalid or missing X-App-Token' }, { status: 401 });
        }
    }

    try {
        const body = await request.json();
        const id = crypto.randomUUID().replace(/-/g, '');

        // Input validation
        const projectName = String(body.project_name || 'Untitled').substring(0, 200);
        const projectType = body.project_type ? String(body.project_type).substring(0, 100) : null;
        const projectLocation = body.project_location ? String(body.project_location).substring(0, 300) : null;
        const status = body.status ? String(body.status).substring(0, 20) : 'draft';
        const pricingTier = body.pricing_tier ? String(body.pricing_tier).substring(0, 20) : 'mid';

        const exportData = body.export_data ? JSON.stringify(body.export_data) : null;
        if (exportData && exportData.length > 900_000) {
            return Response.json({ error: 'Export data too large (max 900KB)' }, { status: 413 });
        }

        // MED-3 fix: disciplines may arrive as a pre-stringified string from the client.
        // If we JSON.stringify a string, we get double-encoded output (e.g. '"[...]"').
        // Detect the type and only serialize when it's actually an object/array.
        let disciplines = null;
        if (body.disciplines != null) {
            disciplines = typeof body.disciplines === 'string'
                ? body.disciplines
                : JSON.stringify(body.disciplines);
        }

        await env.DB.prepare(`
            INSERT INTO estimates (id, project_name, project_type, project_location,
                disciplines, pricing_tier, status, export_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            projectName,
            projectType,
            projectLocation,
            disciplines,
            pricingTier,
            status,
            exportData,
        ).run();

        return Response.json({ id, success: true }, { status: 201 });
    } catch (err) {
        return Response.json({ error: 'Failed to save estimate: ' + err.message }, { status: 500 });
    }
}

