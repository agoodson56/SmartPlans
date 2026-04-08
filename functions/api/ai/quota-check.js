// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — API Quota / Rate Limit Health Check
// Lightweight probe that tests key availability without consuming
// significant tokens. Returns status for each key slot.
// ═══════════════════════════════════════════════════════════════

export async function onRequestGet(context) {
    const { env, request } = context;
    const reqUrl = new URL(request.url);

    // Accept ?model= param so you can test the actual model in use
    const model = reqUrl.searchParams.get('model') || 'gemini-2.5-flash';

    // CORS headers handled by _middleware.js
    const corsHeaders = {};

    try {
        // Must match invoke.js and upload.js key ordering
        const tier2Keys = [
            'GEMINI_KEY_10', 'GEMINI_KEY_11', 'GEMINI_KEY_12', 'GEMINI_KEY_13',
            'GEMINI_KEY_14', 'GEMINI_KEY_15', 'GEMINI_KEY_16', 'GEMINI_KEY_17',
        ];
        const tier1Keys = [
            'GEMINI_KEY_0', 'GEMINI_KEY_1', 'GEMINI_KEY_2', 'GEMINI_KEY_3', 'GEMINI_KEY_4',
            'GEMINI_KEY_5', 'GEMINI_KEY_6', 'GEMINI_KEY_7', 'GEMINI_KEY_8', 'GEMINI_KEY_9',
        ];
        const keyNames = [...tier2Keys, ...tier1Keys];

        // Count configured keys
        let configuredKeys = 0;
        let availableKeys = 0;
        let rateLimitedKeys = 0;
        let errorKeys = 0;
        let resetHint = null;

        // FIX #16: Test ALL keys instead of every-other — prevents false healthy status
        const testSlots = Array.from({ length: keyNames.length }, (_, i) => i);
        const results = [];

        for (const slot of testSlots) {
            const key = env[keyNames[slot]];
            if (!key) continue;
            configuredKeys++;

            try {
                // Minimal API call — count tokens on trivial input (near-zero cost)
                // FIX #9: Use header-based auth instead of URL parameter
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:countTokens`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
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

// NOTE: No onRequestOptions export here.
// CORS preflight for /api/ai/* is handled by /api/ai/_middleware.js
// Adding one here overrides and bypasses that middleware.
// See invoke.js for the canonical pattern.
