// ═══════════════════════════════════════════════════════════════
// DELETE /api/pm/logs/:id — Delete a specific daily log entry
// ═══════════════════════════════════════════════════════════════

export async function onRequestDelete(context) {
    const { env, params } = context;
    try {
        const logId = params.id;
        if (!logId) {
            return Response.json({ error: 'Missing log ID' }, { status: 400 });
        }

        await env.DB.prepare('DELETE FROM pm_daily_logs WHERE id = ?').bind(logId).run();
        return Response.json({ success: true, deleted: logId });
    } catch (err) {
        return Response.json({ error: 'Failed to delete log: ' + err.message }, { status: 500 });
    }
}

// Also support DELETE ALL for a project (via query param)
export async function onRequestPost(context) {
    const { env, request, params } = context;
    try {
        // POST /api/pm/logs/:id with action=delete_all_project
        const body = await request.json();
        if (body.action === 'delete_all' && body.project_id) {
            const result = await env.DB.prepare('DELETE FROM pm_daily_logs WHERE project_id = ?')
                .bind(body.project_id).run();
            return Response.json({ success: true, deleted_count: result.meta?.changes || 0 });
        }
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    } catch (err) {
        return Response.json({ error: 'Failed: ' + err.message }, { status: 500 });
    }
}
