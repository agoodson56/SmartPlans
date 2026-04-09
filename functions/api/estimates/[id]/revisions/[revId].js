// ═══════════════════════════════════════════════════════════════
// GET    /api/estimates/:id/revisions/:revId — Get full revision data
// DELETE /api/estimates/:id/revisions/:revId — Delete a specific revision
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
    const { id, revId } = params;

    if (!isValidId(id) || !isValidId(revId)) {
        return Response.json({ error: 'Invalid ID' }, { status: 400 });
    }
    if (!(await checkOwnership(env, id, context))) {
        return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    try {
        const rev = await env.DB.prepare(
            `SELECT * FROM estimate_revisions WHERE id = ? AND estimate_id = ?`
        ).bind(revId, id).first();

        if (!rev) return Response.json({ error: 'Revision not found' }, { status: 404 });

        // Parse JSON fields
        if (rev.export_data) {
            try { rev.export_data = JSON.parse(rev.export_data); } catch { }
        }
        if (rev.disciplines) {
            try { rev.disciplines = JSON.parse(rev.disciplines); } catch { }
        }

        return Response.json({ revision: rev });
    } catch (err) {
        console.error('[Revision] Load error:', err);
        return Response.json({ error: 'Failed to load revision' }, { status: 500 });
    }
}

export async function onRequestDelete(context) {
    const { env, params } = context;
    const { id, revId } = params;

    if (!isValidId(id) || !isValidId(revId)) {
        return Response.json({ error: 'Invalid ID' }, { status: 400 });
    }
    if (!(await checkOwnership(env, id, context))) {
        return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    try {
        await env.DB.prepare(
            `DELETE FROM estimate_revisions WHERE id = ? AND estimate_id = ?`
        ).bind(revId, id).run();

        return Response.json({ success: true });
    } catch (err) {
        console.error('[Revision] Delete error:', err);
        return Response.json({ error: 'Failed to delete revision' }, { status: 500 });
    }
}
