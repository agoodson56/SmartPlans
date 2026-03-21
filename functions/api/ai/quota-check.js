// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — API Quota / Rate Limit Health Check
// Lightweight probe that tests key availability without consuming
// significant tokens. Returns status for each key slot.
// ═══════════════════════════════════════════════════════════════

export async function onRequestGet(context) {
    const { env } = context;

    // CORS headers handled by _middleware.js
    const corsHeaders = {};

    try {
        const keyNames = [
            'GEMINI_KEY_0', 'GEMINI_KEY_1', 'GEMINI_KEY_2', 'GEMINI_KEY_3', 'GEMINI_KEY_4',
            'GEMINI_KEY_5', 'GEMINI_KEY_6', 'GEMINI_KEY_7', 'GEMINI_KEY_8', 'GEMINI_KEY_9',
            'GEMINI_KEY_10', 'GEMINI_KEY_11', 'GEMINI_KEY_12', 'GEMINI_KEY_13', 'GEMINI_KEY_14',
            'GEMINI_KEY_15', 'GEMINI_KEY_16', 'GEMINI_KEY_17',
        ];

        // Count configured keys
        let configuredKeys = 0;
        let availableKeys = 0;
        let rateLimitedKeys = 0;
        let errorKeys = 0;
        let resetHint = null;

        // Test a subset of keys (first, middle, last) to avoid hammering API
        const testSlots = [0, 6, 12, 17];
        const results = [];

        for (const slot of testSlots) {
            const key = env[keyNames[slot]];
            if (!key) continue;
            configuredKeys++;

            try {
                // Minimal API call — count tokens on trivial input (near-zero cost)
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:countTokens?key=${key}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: 'test' }] }],
                    }),
                });

                if (response.ok) {
                    availableKeys++;
                    results.push({ slot, status: 'ok' });
                } else if (response.status === 429) {
                    rateLimitedKeys++;
                    // Try to extract retry-after or quota reset info
                    const retryAfter = response.headers.get('Retry-After');
                    const body = await response.json().catch(() => ({}));
                    const errorMsg = body?.error?.message || '';

                    // Parse reset time hints from error message
                    if (retryAfter) {
                        resetHint = parseInt(retryAfter);
                    } else if (errorMsg.includes('minute')) {
                        resetHint = resetHint || 60;
                    }

                    results.push({
                        slot,
                        status: 'rate_limited',
                        message: errorMsg.substring(0, 200),
                        retryAfter: retryAfter || null,
                    });
                } else if (response.status === 403) {
                    rateLimitedKeys++;
                    const body = await response.json().catch(() => ({}));
                    results.push({
                        slot,
                        status: 'quota_exceeded',
                        message: (body?.error?.message || '').substring(0, 200),
                    });
                } else {
                    errorKeys++;
                    results.push({ slot, status: 'error', code: response.status });
                }
            } catch (err) {
                errorKeys++;
                results.push({ slot, status: 'error', message: err.message });
            }
        }

        // Also count total configured keys (without testing all)
        let totalConfigured = 0;
        for (const name of keyNames) {
            if (env[name]) totalConfigured++;
        }

        // Determine overall health
        let health = 'healthy';       // All tested keys OK
        let severity = 'none';        // none, warning, critical
        let message = 'All API keys are operational. Ready to analyze.';

        if (availableKeys === 0 && configuredKeys > 0) {
            health = 'blocked';
            severity = 'critical';
            message = 'All API keys are rate-limited or quota-exhausted. Please wait for limits to reset before running an analysis.';
        } else if (rateLimitedKeys > 0 && availableKeys > 0) {
            health = 'degraded';
            severity = 'warning';
            message = `${rateLimitedKeys} of ${configuredKeys} tested API keys are rate-limited. Analysis may be slower or partially fail.`;
        } else if (configuredKeys === 0) {
            health = 'no_keys';
            severity = 'critical';
            message = 'No API keys are configured. Contact your administrator.';
        }

        return Response.json({
            health,
            severity,
            message,
            totalConfiguredKeys: totalConfigured,
            testedKeys: configuredKeys,
            availableKeys,
            rateLimitedKeys,
            errorKeys,
            resetHint,  // seconds until reset (if detected)
            results,
            checkedAt: new Date().toISOString(),
        }, { headers: corsHeaders });

    } catch (err) {
        return Response.json(
            { health: 'error', severity: 'warning', message: 'Quota check failed: ' + err.message },
            { status: 500, headers: corsHeaders }
        );
    }
}

// Handle CORS preflight
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
