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
             FROM estimates ORDER BY updated_at DESC`
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

        await env.DB.prepare(`
            INSERT INTO estimates (id, project_name, project_type, project_location,
                disciplines, pricing_tier, status, export_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            id,
            body.project_name || 'Untitled',
            body.project_type || null,
            body.project_location || null,
            body.disciplines ? JSON.stringify(body.disciplines) : null,
            body.pricing_tier || 'mid',
            body.status || 'draft',
            body.export_data ? JSON.stringify(body.export_data) : null,
        ).run();

        return Response.json({ id, success: true }, { status: 201 });
    } catch (err) {
        return Response.json({ error: 'Failed to save estimate: ' + err.message }, { status: 500 });
    }
}
