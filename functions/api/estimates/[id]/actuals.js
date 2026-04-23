// ═══════════════════════════════════════════════════════════════
// GET  /api/estimates/:id/actuals — List all actuals for an estimate
// POST /api/estimates/:id/actuals — Save actuals (array of line items)
// ═══════════════════════════════════════════════════════════════

function isValidId(id) {
    return id && String(id).length <= 64 && /^[a-zA-Z0-9_-]+$/.test(String(id));
}

// SEC: Verify the requesting user owns the estimate (or is admin)
async function checkOwnership(env, id, context) {
    const user = context.data?.user;
    if (!user) return true; // No auth middleware = legacy setup, allow
    const est = await env.DB.prepare('SELECT created_by FROM estimates WHERE id = ?').bind(id).first();
    if (!est) return false;
    if (user.is_admin) return true;
    if (est.created_by && user.id !== est.created_by) return false;
    return true;
}

export async function onRequestGet(context) {
    const { env, params } = context;
    const id = params.id;

    if (!isValidId(id)) {
        return Response.json({ error: 'Invalid estimate ID' }, { status: 400 });
    }

    if (!(await checkOwnership(env, id, context))) {
        return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    try {
        const res = await env.DB.prepare(
            `SELECT * FROM project_actuals WHERE estimate_id = ? ORDER BY category, item_name`
        ).bind(id).all();

        return Response.json({ actuals: res.results || [] });
    } catch (err) {
        console.error('Failed to load actuals:', err.message);
        return Response.json({ error: 'Failed to load actuals' }, { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { env, request, params } = context;
    const id = params.id;

    if (!isValidId(id)) {
        return Response.json({ error: 'Invalid estimate ID' }, { status: 400 });
    }
    if (!(await checkOwnership(env, id, context))) {
        return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const contentLength = parseInt(request.headers.get('content-length') || '0');
    if (contentLength > 10 * 1024 * 1024) {
        return Response.json({ error: 'Request too large' }, { status: 413 });
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

        // Delete + insert in a single atomic batch to prevent partial state
        const allStmts = [
            env.DB.prepare(`DELETE FROM project_actuals WHERE estimate_id = ?`).bind(id)
        ];
        let inserted = 0;

        for (const item of items) {
            const estCost = (item.estimated_qty || 0) * (item.estimated_unit_cost || 0);
            const actCost = (item.actual_qty || 0) * (item.actual_unit_cost || 0);
            const variancePct = estCost > 0
                ? Math.round(((actCost - estCost) / estCost) * 10000) / 100
                : 0;

            allStmts.push(env.DB.prepare(`
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
            ));
            inserted++;
        }

        await env.DB.batch(allStmts);

        // Wave 8 (v5.128.5) — Auto-aggregate actuals into cost_benchmarks.
        // Old behavior: benchmarks only refreshed when someone manually hit
        // POST /api/benchmarks. That meant the feedback loop was cold: new
        // actuals came in but the next bid's benchmark comparison was stale.
        // New behavior: every actuals save rolls the latest aggregates into
        // cost_benchmarks so the NEXT bid sees up-to-date averages.
        let benchmarksRefreshed = 0;
        try {
            const aggregated = await env.DB.prepare(`
                SELECT item_name, category,
                    AVG(actual_unit_cost) as avg_unit_cost,
                    MIN(actual_unit_cost) as min_unit_cost,
                    MAX(actual_unit_cost) as max_unit_cost,
                    AVG(actual_labor_hours) as avg_labor_hours,
                    COUNT(*) as sample_count
                FROM project_actuals
                WHERE actual_unit_cost > 0
                GROUP BY LOWER(item_name), category
                LIMIT 5000
            `).all();
            const rows = aggregated.results || [];
            if (rows.length > 0) {
                const stmts = [env.DB.prepare('DELETE FROM cost_benchmarks')];
                for (const r of rows) {
                    stmts.push(env.DB.prepare(`
                        INSERT INTO cost_benchmarks
                            (id, item_name, category, avg_unit_cost, min_unit_cost, max_unit_cost, avg_labor_hours, sample_count)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `).bind(
                        crypto.randomUUID().replace(/-/g, ''),
                        // Wave 10 H8: normalize item_name to lowercase on INSERT so
                        // the aggregation (GROUP BY LOWER(item_name)) and future
                        // lookups see a single deterministic case. Pre-fix, "CAMERA",
                        // "Camera", "camera" grouped for averaging but stored with
                        // non-deterministic case, fragmenting future lookups.
                        String(r.item_name || '').toLowerCase(),
                        r.category,
                        Math.round((r.avg_unit_cost || 0) * 100) / 100,
                        Math.round((r.min_unit_cost || 0) * 100) / 100,
                        Math.round((r.max_unit_cost || 0) * 100) / 100,
                        Math.round((r.avg_labor_hours || 0) * 100) / 100,
                        r.sample_count || 0,
                    ));
                }
                await env.DB.batch(stmts);
                benchmarksRefreshed = rows.length;
            }
        } catch (aggErr) {
            // Non-fatal — actuals saved even if rollup fails. Log and continue.
            console.error('Auto-aggregate into cost_benchmarks failed:', aggErr.message);
        }

        return Response.json({ success: true, inserted, benchmarksRefreshed }, { status: 201 });
    } catch (err) {
        console.error('Failed to save actuals:', err.message);
        return Response.json({ error: 'Failed to save actuals' }, { status: 500 });
    }
}
