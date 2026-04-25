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
    // SEC: Validate model name to prevent path traversal / SSRF
    if (!/^[a-zA-Z0-9._-]+$/.test(model)) {
        return Response.json({ error: 'Invalid model name' }, { status: 400 });
    }

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
        // Wave 12 fix: probe all keys in PARALLEL via Promise.allSettled.
        // Sequential probing took 18-36s of wall-clock at the start of every
        // bid (one health check) — parallel probing collapses to ~2s.
        const testSlots = Array.from({ length: keyNames.length }, (_, i) => i);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:countTokens`;
        const PROBE_TIMEOUT_MS = 8000;

        const probeOne = async (slot) => {
            const key = env[keyNames[slot]];
            if (!key) return { slot, missing: true };
            // Per-probe timeout so a hung key doesn't drag down the whole batch
            const ctrl = new AbortController();
            const timer = setTimeout(() => { try { ctrl.abort(); } catch {} }, PROBE_TIMEOUT_MS);
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
                    body: JSON.stringify({ contents: [{ parts: [{ text: 'test' }] }] }),
                    signal: ctrl.signal,
                });
                clearTimeout(timer);
                if (response.ok) {
                    return { slot, status: 'ok' };
                } else if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After');
                    const body = await response.json().catch(() => ({}));
                    const errorMsg = body?.error?.message || '';
                    return { slot, status: 'rate_limited', message: errorMsg.substring(0, 200), retryAfter: retryAfter || null };
                } else if (response.status === 403) {
                    const body = await response.json().catch(() => ({}));
                    return { slot, status: 'quota_exceeded', message: (body?.error?.message || '').substring(0, 200) };
                } else {
                    return { slot, status: 'error', code: response.status };
                }
            } catch (err) {
                clearTimeout(timer);
                return { slot, status: 'error', message: err?.message || String(err), aborted: err?.name === 'AbortError' };
            }
        };

        const settled = await Promise.allSettled(testSlots.map(probeOne));
        const results = [];
        for (const s of settled) {
            const r = s.status === 'fulfilled' ? s.value : { slot: -1, status: 'error', message: 'probe-rejected' };
            if (r.missing) continue;
            configuredKeys++;
            if (r.status === 'ok') {
                availableKeys++;
                results.push({ slot: r.slot, status: 'ok' });
            } else if (r.status === 'rate_limited') {
                rateLimitedKeys++;
                if (r.retryAfter) resetHint = parseInt(r.retryAfter);
                else if ((r.message || '').includes('minute')) resetHint = resetHint || 60;
                results.push({ slot: r.slot, status: 'rate_limited', message: r.message, retryAfter: r.retryAfter });
            } else if (r.status === 'quota_exceeded') {
                rateLimitedKeys++;
                results.push({ slot: r.slot, status: 'quota_exceeded', message: r.message });
            } else {
                errorKeys++;
                results.push({ slot: r.slot, status: 'error', code: r.code, message: r.message });
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
