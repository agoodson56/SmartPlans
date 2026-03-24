// ═══════════════════════════════════════════════════════════════
// GET    /api/estimates/:id/revisions/:revId — Get full revision data
// DELETE /api/estimates/:id/revisions/:revId — Delete a specific revision
// ═══════════════════════════════════════════════════════════════

function isValidId(id) {
    return id && String(id).length <= 64 && /^[a-zA-Z0-9_-]+$/.test(String(id));
}

export async function onRequestGet(context) {
    const { env, params } = context;
    const { id, revId } = params;

    if (!isValidId(id) || !isValidId(revId)) {
        return Response.json({ error: 'Invalid ID' }, { status: 400 });
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
        return Response.json({ error: 'Failed to load revision: ' + err.message }, { status: 500 });
    }
}

export async function onRequestDelete(context) {
    const { env, params } = context;
    const { id, revId } = params;

    if (!isValidId(id) || !isValidId(revId)) {
        return Response.json({ error: 'Invalid ID' }, { status: 400 });
    }

    try {
        await env.DB.prepare(
            `DELETE FROM estimate_revisions WHERE id = ? AND estimate_id = ?`
        ).bind(revId, id).run();

        return Response.json({ success: true });
    } catch (err) {
        return Response.json({ error: 'Failed to delete revision: ' + err.message }, { status: 500 });
    }
}
