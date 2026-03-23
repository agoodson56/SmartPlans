// ═══════════════════════════════════════════════════════════════
// GET  /api/pm/settings?key=xxx    — Get a specific setting
// GET  /api/pm/settings             — Get all settings
// POST /api/pm/settings             — Set/update a setting
// ═══════════════════════════════════════════════════════════════

function isAllowedOrigin(origin) {
    if (!origin) return true;
    if (origin.endsWith('.pages.dev') && origin.includes('smartplans-4g5')) return true;
    const allowed = [
        'https://smartplans-4g5.pages.dev',
        'https://smartplans.pages.dev',
        'https://smartplans.3dtechnologyservices.com',
        'https://3dtechnologyservices.com',
    ];
    if (allowed.some(d => origin.startsWith(d))) return true;
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return true;
    return false;
}

/**
 * Hash a password using SHA-256 (one-way, non-reversible)
 */
async function hashPassword(password) {
    if (!password) return '';
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sanitize a settings value before returning to client.
 * For the 'passwords' key: never return plaintext — return existence flags only.
 * For already-hashed values: return as-is.
 */
function sanitizeSettingForClient(key, value) {
    if (key === 'passwords') {
        // Never expose password values (even hashed) — just tell client if they exist
        if (!value) return { estimator: false, pm: false };
        return {
            estimator: !!(value.estimator),
            pm: !!(value.pm),
        };
    }
    return value;
}

export async function onRequestGet(context) {
    const { env, request } = context;

    // Origin validation — block unauthenticated external reads
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const url = new URL(request.url);
        const key = url.searchParams.get('key');

        if (key) {
            const safeKey = String(key).substring(0, 100);
            const row = await env.DB.prepare('SELECT key, value, updated_at FROM pm_settings WHERE key = ?')
                .bind(safeKey).first();
            if (!row) return Response.json({ value: null });
            let parsed;
            try { parsed = JSON.parse(row.value); } catch { parsed = row.value; }
            return Response.json({
                key: row.key,
                value: sanitizeSettingForClient(row.key, parsed),
                updated_at: row.updated_at,
            });
        }

        // Get all settings — sanitize sensitive keys
        const res = await env.DB.prepare('SELECT key, value, updated_at FROM pm_settings ORDER BY key').all();
        const settings = {};
        for (const row of (res.results || [])) {
            let parsed;
            try { parsed = JSON.parse(row.value); } catch { parsed = row.value; }
            settings[row.key] = sanitizeSettingForClient(row.key, parsed);
        }
        return Response.json({ settings });
    } catch (err) {
        return Response.json({ error: 'Failed to load settings: ' + err.message }, { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { env, request } = context;

    // Origin validation
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const key = String(body.key || '').substring(0, 100);
        let value = body.value;

        if (!key) {
            return Response.json({ error: 'Missing key' }, { status: 400 });
        }

        // SECURITY: Hash passwords before storing — never store plaintext.
        // Only update the roles that were actually sent — merge with existing record.
        if (key === 'passwords' && value && typeof value === 'object') {
            // Load existing hashes to preserve roles not being updated
            let existing = { estimator: '', pm: '' };
            try {
                const row = await env.DB.prepare('SELECT value FROM pm_settings WHERE key = ?').bind('passwords').first();
                if (row?.value) existing = JSON.parse(row.value);
            } catch { /* no existing record — start fresh */ }

            value = {
                estimator: value.estimator ? await hashPassword(value.estimator) : (existing.estimator || ''),
                pm: value.pm ? await hashPassword(value.pm) : (existing.pm || ''),
            };
        }


        const serialized = (typeof value === 'string' ? value : JSON.stringify(value));

        // Enforce value size limit to prevent D1 bloat
        if (serialized.length > 50_000) {
            return Response.json({ error: 'Setting value too large' }, { status: 413 });
        }

        await env.DB.prepare(`
            INSERT INTO pm_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `).bind(key, serialized).run();

        return Response.json({ success: true, key });
    } catch (err) {
        return Response.json({ error: 'Failed to save setting: ' + err.message }, { status: 500 });
    }
}
