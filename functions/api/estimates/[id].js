// ═══════════════════════════════════════════════════════════════
// GET    /api/estimates/:id — Get full estimate with export data
// PUT    /api/estimates/:id — Update estimate
// DELETE /api/estimates/:id — Delete estimate
// ═══════════════════════════════════════════════════════════════

import { validateSession } from '../../_shared/cors.js';

// CRIT-2 fix: shared ID validator — reject oversized or malformed IDs before DB lookup
function isValidId(id) {
    return id && String(id).length <= 64 && /^[a-zA-Z0-9_-]+$/.test(String(id));
}

export async function onRequestGet(context) {
    const { env, params } = context;

    if (!isValidId(params.id)) {
        return Response.json({ error: 'Invalid estimate ID' }, { status: 400 });
    }

    try {
        const est = await env.DB.prepare(
            `SELECT e.*, COALESCE(e.created_by_name, u.name, 'Unknown') AS created_by_name
             FROM estimates e LEFT JOIN user_accounts u ON u.id = e.created_by
             WHERE e.id = ?`
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
        console.error('Failed to load estimate:', err.message);
        return Response.json({ error: 'Failed to load estimate' }, { status: 500 });
    }
}

export async function onRequestPut(context) {
    const { env, request, params } = context;

    if (!isValidId(params.id)) {
        return Response.json({ error: 'Invalid estimate ID' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const id = params.id;

        // Auto-save current version as revision before overwriting
        const current = await env.DB.prepare('SELECT * FROM estimates WHERE id = ?').bind(id).first();
        if (current && current.export_data) {
            try {
                const revCount = await env.DB.prepare(
                    'SELECT COUNT(*) as count FROM estimate_revisions WHERE estimate_id = ?'
                ).bind(id).first();
                const revNum = (revCount?.count || 0) + 1;

                // Extract a contract value from export_data if possible
                let contractValue = 0;
                try {
                    const parsed = typeof current.export_data === 'string' ? JSON.parse(current.export_data) : current.export_data;
                    contractValue = parsed?.pricing?.totalContract || parsed?.pricing?.grandTotal || parsed?.summary?.contractValue || 0;
                } catch { }

                await env.DB.prepare(`
                    INSERT INTO estimate_revisions (id, estimate_id, revision_number, project_name, disciplines, contract_value, analysis_summary, export_data)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                    crypto.randomUUID().replace(/-/g, ''),
                    id,
                    revNum,
                    current.project_name,
                    current.disciplines,
                    contractValue,
                    (current.export_data || '').substring(0, 500),
                    current.export_data
                ).run();
            } catch (revErr) {
                // Log but don't block the update if revision save fails
                console.error('Failed to save revision:', revErr.message);
            }
        }

        const sets = [];
        const vals = [];

        if (body.project_name !== undefined) {
            sets.push('project_name = ?');
            vals.push(String(body.project_name).substring(0, 200));
        }
        if (body.project_type !== undefined) {
            sets.push('project_type = ?');
            vals.push(String(body.project_type).substring(0, 100));
        }
        if (body.project_location !== undefined) {
            sets.push('project_location = ?');
            vals.push(String(body.project_location).substring(0, 300));
        }
        if (body.disciplines !== undefined) {
            sets.push('disciplines = ?');
            vals.push(JSON.stringify(body.disciplines));
        }
        if (body.pricing_tier !== undefined) {
            sets.push('pricing_tier = ?');
            vals.push(String(body.pricing_tier).substring(0, 20));
        }
        if (body.status !== undefined) {
            sets.push('status = ?');
            vals.push(String(body.status).substring(0, 20));
        }
        if (body.export_data !== undefined) {
            const serialized = JSON.stringify(body.export_data);
            if (serialized.length > 5_000_000) {
                return Response.json({ error: 'Export data too large (max 5MB)' }, { status: 413 });
            }
            sets.push('export_data = ?');
            vals.push(serialized);
        }

        if (sets.length === 0) return Response.json({ error: 'No fields to update' }, { status: 400 });

        sets.push("updated_at = datetime('now')");
        vals.push(params.id);

        await env.DB.prepare(
            `UPDATE estimates SET ${sets.join(', ')} WHERE id = ?`
        ).bind(...vals).run();

        return Response.json({ success: true });
    } catch (err) {
        console.error('Failed to update estimate:', err.message);
        return Response.json({ error: 'Failed to update estimate' }, { status: 500 });
    }
}


export async function onRequestDelete(context) {
    const { env, request, params } = context;

    if (!isValidId(params.id)) {
        return Response.json({ error: 'Invalid estimate ID' }, { status: 400 });
    }

    try {
        // C1 fix: only the creator or an admin can delete an estimate
        const sessionToken = request.headers.get('X-Session-Token') || '';
        const user = await validateSession(env.DB, sessionToken);

        const est = await env.DB.prepare('SELECT created_by FROM estimates WHERE id = ?').bind(params.id).first();
        if (!est) return Response.json({ error: 'Estimate not found' }, { status: 404 });

        if (est.created_by && user?.id !== est.created_by && !user?.is_admin) {
            return Response.json({ error: 'Only the creator or an admin can delete this estimate' }, { status: 403 });
        }

        // Delete all revisions for this estimate first
        await env.DB.prepare(`DELETE FROM estimate_revisions WHERE estimate_id = ?`).bind(params.id).run();
        await env.DB.prepare(`DELETE FROM estimates WHERE id = ?`).bind(params.id).run();
        return Response.json({ success: true });
    } catch (err) {
        console.error('Failed to delete estimate:', err.message);
        return Response.json({ error: 'Failed to delete estimate' }, { status: 500 });
    }
}
