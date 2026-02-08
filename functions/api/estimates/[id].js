// ═══════════════════════════════════════════════════════════════
// GET    /api/estimates/:id — Get full estimate with export data
// PUT    /api/estimates/:id — Update estimate
// DELETE /api/estimates/:id — Delete estimate
// ═══════════════════════════════════════════════════════════════

export async function onRequestGet(context) {
    const { env, params } = context;
    try {
        const est = await env.DB.prepare(
            `SELECT * FROM estimates WHERE id = ?`
        ).bind(params.id).first();
        if (!est) return Response.json({ error: 'Estimate not found' }, { status: 404 });

        // Parse export_data back to object
        if (est.export_data) {
            try { est.export_data = JSON.parse(est.export_data); } catch { }
        }
        if (est.disciplines) {
            try { est.disciplines = JSON.parse(est.disciplines); } catch { }
        }

        return Response.json({ estimate: est });
    } catch (err) {
        return Response.json({ error: 'Failed to load estimate: ' + err.message }, { status: 500 });
    }
}

export async function onRequestPut(context) {
    const { env, request, params } = context;
    try {
        const body = await request.json();
        const sets = [];
        const vals = [];

        if (body.project_name !== undefined) { sets.push('project_name = ?'); vals.push(body.project_name); }
        if (body.project_type !== undefined) { sets.push('project_type = ?'); vals.push(body.project_type); }
        if (body.project_location !== undefined) { sets.push('project_location = ?'); vals.push(body.project_location); }
        if (body.disciplines !== undefined) { sets.push('disciplines = ?'); vals.push(JSON.stringify(body.disciplines)); }
        if (body.pricing_tier !== undefined) { sets.push('pricing_tier = ?'); vals.push(body.pricing_tier); }
        if (body.status !== undefined) { sets.push('status = ?'); vals.push(body.status); }
        if (body.export_data !== undefined) { sets.push('export_data = ?'); vals.push(JSON.stringify(body.export_data)); }

        if (sets.length === 0) return Response.json({ error: 'No fields to update' }, { status: 400 });

        sets.push("updated_at = datetime('now')");
        vals.push(params.id);

        await env.DB.prepare(
            `UPDATE estimates SET ${sets.join(', ')} WHERE id = ?`
        ).bind(...vals).run();

        return Response.json({ success: true });
    } catch (err) {
        return Response.json({ error: 'Failed to update estimate: ' + err.message }, { status: 500 });
    }
}

export async function onRequestDelete(context) {
    const { env, params } = context;
    try {
        await env.DB.prepare(`DELETE FROM estimates WHERE id = ?`).bind(params.id).run();
        return Response.json({ success: true });
    } catch (err) {
        return Response.json({ error: 'Failed to delete estimate: ' + err.message }, { status: 500 });
    }
}
