// ═══════════════════════════════════════════════════════════════
// GET  /api/estimates/:id/revisions — List all revisions for an estimate
// POST /api/estimates/:id/revisions — Create a new revision snapshot
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
            `SELECT id, revision_number, project_name, contract_value, created_at
             FROM estimate_revisions
             WHERE estimate_id = ?
             ORDER BY revision_number DESC`
        ).bind(id).all();

        return Response.json({ revisions: res.results || [] });
    } catch (err) {
        console.error('Failed to load revisions:', err.message);
        return Response.json({ error: 'Failed to load revisions' }, { status: 500 });
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

    try {
        const body = await request.json();

        // Determine next revision number
        const revMax = await env.DB.prepare(
            'SELECT COALESCE(MAX(revision_number), 0) as max_rev FROM estimate_revisions WHERE estimate_id = ?'
        ).bind(id).first();
        const revNum = (revMax?.max_rev || 0) + 1;

        const revId = crypto.randomUUID().replace(/-/g, '');
        const exportData = body.export_data ? (typeof body.export_data === 'string' ? body.export_data : JSON.stringify(body.export_data)) : null;

        await env.DB.prepare(`
            INSERT INTO estimate_revisions (id, estimate_id, revision_number, project_name, disciplines, contract_value, analysis_summary, export_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            revId,
            id,
            revNum,
            body.project_name || null,
            body.disciplines ? (typeof body.disciplines === 'string' ? body.disciplines : JSON.stringify(body.disciplines)) : null,
            body.contract_value || 0,
            body.analysis_summary || null,
            exportData
        ).run();

        return Response.json({ id: revId, revision_number: revNum, success: true }, { status: 201 });
    } catch (err) {
        console.error('Failed to create revision:', err.message);
        return Response.json({ error: 'Failed to create revision' }, { status: 500 });
    }
}
