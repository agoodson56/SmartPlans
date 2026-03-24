// ═══════════════════════════════════════════════════════════════
// POST /api/pm/verify-password
// Verifies a role password against the stored SHA-256 hash.
// Returns { valid: true/false } — never returns the hash itself.
// ═══════════════════════════════════════════════════════════════

function isAllowedOrigin(origin) {
    if (!origin) return true;
    // Allow any SmartPlans or SmartPM Cloudflare Pages deploy
    if (origin.endsWith('.pages.dev') && (origin.includes('smartplans-4g5') || origin.includes('smartpm'))) return true;
    const allowed = [
        'https://smartplans-4g5.pages.dev',
        'https://smartplans.pages.dev',
        'https://smartplans.3dtechnologyservices.com',
        'https://smartpm.3dtechnologyservices.com',
        'https://3dtechnologyservices.com',
    ];
    if (allowed.some(d => origin.startsWith(d))) return true;
    if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return true;
    return false;
}

async function hashPassword(password) {
    if (!password) return '';
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost(context) {
    const { env, request } = context;

    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const role = String(body.role || '').substring(0, 20);    // 'estimator' or 'pm'
        const password = String(body.password || '').substring(0, 200);

        if (!role || !password) {
            return Response.json({ valid: false });
        }

        // Load stored passwords
        const row = await env.DB.prepare('SELECT value FROM pm_settings WHERE key = ?')
            .bind('passwords').first();

        if (!row) {
            // No passwords set — allow access (fresh install)
            return Response.json({ valid: true, reason: 'no_password_set' });
        }

        let stored;
        try { stored = JSON.parse(row.value); } catch { return Response.json({ valid: false }); }

        const storedHash = stored?.[role];
        if (!storedHash) {
            // This role has no password set — allow
            return Response.json({ valid: true, reason: 'no_password_set' });
        }

        const inputHash = await hashPassword(password);
        return Response.json({ valid: inputHash === storedHash });

    } catch (err) {
        return Response.json({ error: 'Verification failed: ' + err.message }, { status: 500 });
    }
}

// NOTE: No onRequestOptions export here.
// CORS preflight for /api/pm/* is handled by /api/pm/_middleware.js
// Adding one here overrides and bypasses that middleware.
