// ═══════════════════════════════════════════════════════════════
// GET  /api/estimates — List all saved estimates
// POST /api/estimates — Save a new estimate
// ═══════════════════════════════════════════════════════════════

export async function onRequestGet(context) {
    const { env } = context;
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

        await env.DB.prepare(`
            INSERT INTO estimates (id, project_name, project_type, project_location,
                disciplines, pricing_tier, status, export_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            projectName,
            projectType,
            projectLocation,
            body.disciplines ? JSON.stringify(body.disciplines) : null,
            pricingTier,
            status,
            exportData,
        ).run();

        return Response.json({ id, success: true }, { status: 201 });
    } catch (err) {
        return Response.json({ error: 'Failed to save estimate: ' + err.message }, { status: 500 });
    }
}

