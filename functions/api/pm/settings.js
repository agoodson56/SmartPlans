// ═══════════════════════════════════════════════════════════════
// GET  /api/pm/settings?key=xxx    — Get a specific setting
// GET  /api/pm/settings             — Get all settings
// POST /api/pm/settings             — Set/update a setting
// ═══════════════════════════════════════════════════════════════

export async function onRequestGet(context) {
    const { env, request } = context;
    try {
        const url = new URL(request.url);
        const key = url.searchParams.get('key');

        if (key) {
            const row = await env.DB.prepare('SELECT key, value, updated_at FROM pm_settings WHERE key = ?')
                .bind(key).first();
            if (!row) return Response.json({ value: null });
            // Try to parse JSON values
            try {
                return Response.json({ key: row.key, value: JSON.parse(row.value), updated_at: row.updated_at });
            } catch {
                return Response.json({ key: row.key, value: row.value, updated_at: row.updated_at });
            }
        }

        // Get all settings
        const res = await env.DB.prepare('SELECT key, value, updated_at FROM pm_settings ORDER BY key').all();
        const settings = {};
        for (const row of (res.results || [])) {
            try { settings[row.key] = JSON.parse(row.value); }
            catch { settings[row.key] = row.value; }
        }
        return Response.json({ settings });
    } catch (err) {
        return Response.json({ error: 'Failed to load settings: ' + err.message }, { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { env, request } = context;
    try {
        const body = await request.json();
        const { key, value } = body;

        if (!key) {
            return Response.json({ error: 'Missing key' }, { status: 400 });
        }

        const serialized = typeof value === 'string' ? value : JSON.stringify(value);

        await env.DB.prepare(`
            INSERT INTO pm_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `).bind(key, serialized).run();

        return Response.json({ success: true, key });
    } catch (err) {
        return Response.json({ error: 'Failed to save setting: ' + err.message }, { status: 500 });
    }
}
