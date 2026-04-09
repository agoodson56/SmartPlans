// ═══════════════════════════════════════════════════════════════
// GET  /api/pm/settings?key=xxx    — Get a specific setting
// GET  /api/pm/settings             — Get all settings
// POST /api/pm/settings             — Set/update a setting
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, timingSafeCompare, validateSession } from '../../_shared/cors.js';

/**
 * Hash a password using PBKDF2 with 100,000 iterations and a random 16-byte salt.
 * Returns { hash, salt } where both are hex strings.
 */
async function hashPasswordPBKDF2(password, existingSalt) {
    if (!password) return { hash: '', salt: '' };
    const enc = new TextEncoder();
    const salt = existingSalt || crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
    const hash = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
    const saltHex = Array.from(new Uint8Array(salt)).map(b => b.toString(16).padStart(2, '0')).join('');
    return { hash, salt: saltHex };
}

/**
 * Legacy SHA-256 hash for backward compatibility during auto-upgrade.
 */
async function hashPasswordSHA256(password) {
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
        console.error('Failed to load settings:', err);
        return Response.json({ error: 'Failed to load settings' }, { status: 500 });
    }
}

export async function onRequestPost(context) {
    const { env, request } = context;

    // Origin validation
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // SEC: Require authentication for POST — session token OR ESTIMATES_TOKEN
    const sessionToken = request.headers.get('X-Session-Token') || '';
    const appToken = request.headers.get('X-App-Token') || '';
    const envToken = env.ESTIMATES_TOKEN;
    let authenticated = false;
    if (sessionToken) {
        const user = await validateSession(env.DB, sessionToken);
        if (user) authenticated = true;
    }
    if (!authenticated && envToken && appToken && timingSafeCompare(appToken, envToken)) {
        authenticated = true;
    }
    if (!authenticated) {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
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

            // Load existing salts
            let existingSalts = { estimator: '', pm: '' };
            try {
                const saltRow = await env.DB.prepare('SELECT value FROM pm_settings WHERE key = ?').bind('passwords_salt').first();
                if (saltRow?.value) existingSalts = JSON.parse(saltRow.value);
            } catch { /* no existing salt record */ }

            const newSalts = { ...existingSalts };

            if (value.estimator) {
                const result = await hashPasswordPBKDF2(value.estimator);
                value.estimator = result.hash;
                newSalts.estimator = result.salt;
            } else {
                value.estimator = existing.estimator || '';
            }

            if (value.pm) {
                const result = await hashPasswordPBKDF2(value.pm);
                value.pm = result.hash;
                newSalts.pm = result.salt;
            } else {
                value.pm = existing.pm || '';
            }

            // Store salts as a separate setting key
            await env.DB.prepare(`
                INSERT INTO pm_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
                ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
            `).bind('passwords_salt', JSON.stringify(newSalts)).run();
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
        console.error('Failed to save setting:', err);
        return Response.json({ error: 'Failed to save setting' }, { status: 500 });
    }
}
