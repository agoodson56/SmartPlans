// ═══════════════════════════════════════════════════════════════
// GET  /api/estimates/:id/actuals — List all actuals for an estimate
// POST /api/estimates/:id/actuals — Save actuals (array of line items)
// ═══════════════════════════════════════════════════════════════

function isValidId(id) {
    return id && String(id).length <= 64 && /^[a-zA-Z0-9_-]+$/.test(String(id));
}

export async function onRequestGet(context) {
    const { env, params } = context;
    const id = params.id;

    if (!isValidId(id)) {
        return Response.json({ error: 'Invalid estimate ID' }, { status: 400 });
    }

    try {
        const res = await env.DB.prepare(
            `SELECT * FROM project_actuals WHERE estimate_id = ? ORDER BY category, item_name`
        ).bind(id).all();

        return Response.json({ actuals: res.results || [] });
    } catch (err) {
        return Response.json({ error: 'Failed to load actuals: ' + err.message }, { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { env, request, params } = context;
    const id = params.id;

    if (!isValidId(id)) {
        return Response.json({ error: 'Invalid estimate ID' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const items = body.items;

        if (!Array.isArray(items) || items.length === 0) {
            return Response.json({ error: 'items array is required' }, { status: 400 });
        }

        if (items.length > 500) {
            return Response.json({ error: 'Too many items (max 500)' }, { status: 400 });
        }

        // Delete existing actuals for this estimate before inserting new ones
        await env.DB.prepare(
            `DELETE FROM project_actuals WHERE estimate_id = ?`
        ).bind(id).run();

        // Insert all actuals in batches
        const batchSize = 25;
        let inserted = 0;

        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const stmts = batch.map(item => {
                const estCost = (item.estimated_qty || 0) * (item.estimated_unit_cost || 0);
                const actCost = (item.actual_qty || 0) * (item.actual_unit_cost || 0);
                const variancePct = estCost > 0
                    ? Math.round(((actCost - estCost) / estCost) * 10000) / 100
                    : 0;

                return env.DB.prepare(`
                    INSERT INTO project_actuals
                        (id, estimate_id, project_name, category, item_name,
                         estimated_qty, actual_qty, estimated_unit_cost, actual_unit_cost,
                         estimated_labor_hours, actual_labor_hours, variance_pct, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    crypto.randomUUID().replace(/-/g, ''),
                    id,
                    String(item.project_name || '').substring(0, 200),
                    String(item.category || 'General').substring(0, 100),
                    String(item.item_name || '').substring(0, 200),
                    item.estimated_qty || 0,
                    item.actual_qty || 0,
                    item.estimated_unit_cost || 0,
                    item.actual_unit_cost || 0,
                    item.estimated_labor_hours || 0,
                    item.actual_labor_hours || 0,
                    variancePct,
                    String(item.notes || '').substring(0, 500)
                );
            });

            await env.DB.batch(stmts);
            inserted += batch.length;
        }

        return Response.json({ success: true, inserted }, { status: 201 });
    } catch (err) {
        return Response.json({ error: 'Failed to save actuals: ' + err.message }, { status: 500 });
    }
}
