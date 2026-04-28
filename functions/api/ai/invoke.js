// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Server-Side Gemini API Proxy v5.0 (ZERO-TIMEOUT)
// Returns SSE stream IMMEDIATELY with keepalive, then pipes Gemini
// Eliminates Cloudflare 524 timeouts completely
// ═══════════════════════════════════════════════════════════════

// H3 fix (audit 2026-04-27): key-health cache via Cloudflare Cache API.
// Pre-fix the proxy rotated keys round-robin by brainSlot regardless of
// whether a key was rate-limited — every Nth request burned a 429 round-trip
// before retrying. Now: on 429 the key is marked blocked for 60s in the
// Cache API (survives across worker invocations), and key selection skips
// blocked keys, falling forward to the next available.
const KEY_HEALTH_TTL_SEC = 60; // how long a 429'd key stays blocked
const _keyHealthUrl = (keyName) => `https://internal.smartplans/key-health/${encodeURIComponent(keyName)}`;
async function _isKeyBlocked(keyName) {
    try {
        const cache = caches.default;
        const hit = await cache.match(new Request(_keyHealthUrl(keyName)));
        if (!hit) return false;
        const data = await hit.json();
        if (!data || !Number.isFinite(data.blockedUntil)) return false;
        return Date.now() < data.blockedUntil;
    } catch (e) {
        // Cache API failure should never block requests — fail open.
        return false;
    }
}
async function _markKeyBlocked(keyName, reason, ctx) {
    try {
        const cache = caches.default;
        const blockedUntil = Date.now() + (KEY_HEALTH_TTL_SEC * 1000);
        const body = JSON.stringify({ blockedUntil, reason: String(reason || 'unknown').substring(0, 80), ts: Date.now() });
        const res = new Response(body, {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': `max-age=${KEY_HEALTH_TTL_SEC}`,
            },
        });
        const put = cache.put(new Request(_keyHealthUrl(keyName)), res);
        if (ctx && typeof ctx.waitUntil === 'function') {
            ctx.waitUntil(put);
        } else {
            await put;
        }
    } catch (e) { /* cache failure is non-fatal */ }
}

export async function onRequestPost(context) {
    const { env, request } = context;

    try {
        const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
        if (contentLength > 50 * 1024 * 1024) {
            return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413, headers: { 'Content-Type': 'application/json' } });
        }

        const body = await request.json();

        // Extract SmartBrains metadata
        const brainSlot = body._brainSlot || 0;
        const requestedModel = body._model || 'gemini-2.5-flash';
        const uploadKeyName = body._uploadKeyName || null;
        const cacheName = body._cacheName || null;

        // Remove custom fields before forwarding
        delete body._brainSlot;
        delete body._model;
        delete body._uploadKeyName;
        delete body._cacheName;

        // If using context cache, add it to the request body
        if (cacheName) {
            body.cachedContent = cacheName;
            console.log(`[Proxy] Brain ${brainSlot} using context cache: ${cacheName}`);
        }

        // Select API key — Tier 2 keys first (higher rate limits), then Tier 1 fallback
        // Tier 2 (2000 RPM): keys 10-17 (SmartP3, SmartP4)
        // Tier 1 (15 RPM):   keys 0-9  (SmartP1, SmartP2) — low-limit fallback
        const tier2Keys = [
            'GEMINI_KEY_10', 'GEMINI_KEY_11', 'GEMINI_KEY_12', 'GEMINI_KEY_13',
            'GEMINI_KEY_14', 'GEMINI_KEY_15', 'GEMINI_KEY_16', 'GEMINI_KEY_17',
        ];
        const tier1Keys = [
            'GEMINI_KEY_0', 'GEMINI_KEY_1', 'GEMINI_KEY_2', 'GEMINI_KEY_3', 'GEMINI_KEY_4',
            'GEMINI_KEY_5', 'GEMINI_KEY_6', 'GEMINI_KEY_7', 'GEMINI_KEY_8', 'GEMINI_KEY_9',
        ];
        const keyNames = [...tier2Keys, ...tier1Keys]; // Tier 2 always tried first

        let apiKey = null;
        let usedSlot = -1;

        // PRIORITY 1: If _uploadKeyName was passed, use that EXACT key
        // This ensures the same key that uploaded a file is used to read it
        // SECURITY: Validate against whitelist — client-supplied name must be a known key
        const validKeyNames = new Set(keyNames);
        if (uploadKeyName && validKeyNames.has(uploadKeyName) && env[uploadKeyName]) {
            apiKey = env[uploadKeyName];
            usedSlot = keyNames.indexOf(uploadKeyName);
            console.log(`[Proxy] Brain ${brainSlot} → pinned to upload key ${uploadKeyName} (slot ${usedSlot})`);
        } else {
            // PRIORITY 2: Normal slot-based rotation, skipping recently 429'd keys.
            // H3 fix: read key-health cache and skip any key that's blocked. The
            // loop falls forward through all 18 keys; if every key is blocked we
            // fall back to using the slot key anyway (better to try and fail than
            // return 500 with no attempt).
            const slotIndex = brainSlot % keyNames.length;
            let firstAvailableKey = null;
            let firstAvailableSlot = -1;
            for (let i = 0; i < keyNames.length; i++) {
                const idx = (slotIndex + i) % keyNames.length;
                const keyName = keyNames[idx];
                const keyVal = env[keyName];
                if (!keyVal) continue;
                // First non-empty key (fallback if every key is blocked)
                if (firstAvailableKey === null) {
                    firstAvailableKey = keyVal;
                    firstAvailableSlot = idx;
                }
                if (await _isKeyBlocked(keyName)) continue;
                apiKey = keyVal;
                usedSlot = idx;
                break;
            }
            if (!apiKey && firstAvailableKey) {
                apiKey = firstAvailableKey;
                usedSlot = firstAvailableSlot;
                // M8 fix (audit-2 2026-04-27): mark this attempt so we can
                // surface a distinct allKeysExhausted error to the client if
                // it 429s again. Pre-fix the client just saw _proxyError and
                // retried with the same blocked key in a tight loop.
                console.warn(`[Proxy] All non-blocked keys exhausted — falling back to slot ${usedSlot} (likely rate-limited).`);
                context._allKeysExhausted = true;
            }
        }

        if (!apiKey) {
            return Response.json(
                { error: 'No API keys configured. Set GEMINI_KEY_0 through GEMINI_KEY_17 as secrets.' },
                { status: 500 }
            );
        }

        let model = requestedModel;
        // SEC: Validate model name to prevent path traversal / SSRF against Google APIs
        if (!/^[a-zA-Z0-9._-]+$/.test(model)) {
            return Response.json({ error: 'Invalid model name' }, { status: 400 });
        }
        // FIX #9: Use header-based auth instead of URL parameter to keep keys out of logs
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

        console.log(`[Proxy] Brain ${brainSlot} → slot ${usedSlot} → model: ${model} (zero-timeout streaming)`);

        // ═══ ZERO-TIMEOUT ARCHITECTURE ═══
        // Return SSE stream to client IMMEDIATELY with keepalive comments.
        // Gemini fetch runs in background and pipes data when ready.
        // This prevents Cloudflare 524 timeouts no matter how long Gemini thinks.
        const encoder = new TextEncoder();
        const { readable, writable } = new TransformStream({
            start(controller) {
                // CRITICAL: Enqueue first byte IMMEDIATELY so Cloudflare sees data
                // right away — prevents any first-byte timeout
                controller.enqueue(encoder.encode(': smartplans-proxy-connected\n\n'));
            }
        });

        // ─── Hard upstream timeout (Wave 12 fix) ──────────────────
        // Before this, a hung Gemini upstream connection had no kill switch:
        // the client's per-brain timeout (5min Pro / 2.5min Flash) only timed
        // the SSE stream from the proxy's perspective, while the proxy itself
        // would keep waiting on Gemini indefinitely. Some bids ran 60+ minutes
        // because Symbol Scanner pages stalled mid-stream.
        //
        // Cap upstream fetch + stream-read at 5 minutes for Pro models (which
        // take longest) and 3 minutes otherwise. AbortController triggers a
        // _proxyError SSE event the client retries on, same as a 5xx.
        const isProModel = /pro|3\.\d/.test(model);
        const UPSTREAM_TIMEOUT_MS = isProModel ? 300000 : 180000;
        const upstreamCtrl = new AbortController();
        const upstreamTimer = setTimeout(() => {
            upstreamCtrl.abort(new Error(`upstream-timeout-${UPSTREAM_TIMEOUT_MS}ms`));
        }, UPSTREAM_TIMEOUT_MS);

        const pipeTask = (async () => {
            const writer = writable.getWriter();

            // Send keepalive comment every 15 seconds — SSE spec ignores lines starting with ':'
            // This keeps the Cloudflare proxy connection alive
            const keepAlive = setInterval(() => {
                writer.write(encoder.encode(': keepalive\n\n')).catch(() => {});
            }, 15000);

            try {
                const geminiResponse = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
                    body: JSON.stringify(body),
                    signal: upstreamCtrl.signal,
                });
                clearInterval(keepAlive);

                // Handle Gemini errors — send as SSE error event so client can detect
                if (!geminiResponse.ok) {
                    const errText = await geminiResponse.text();
                    console.warn(`[Proxy] Model "${model}" returned ${geminiResponse.status}: ${errText.substring(0, 500)}`);

                    // H3: on 429 (rate limit) or 503 (overloaded), mark this key blocked
                    // so the next request rotates past it instead of burning another round-trip.
                    if ((geminiResponse.status === 429 || geminiResponse.status === 503) && usedSlot >= 0 && keyNames[usedSlot]) {
                        await _markKeyBlocked(keyNames[usedSlot], `${geminiResponse.status} ${model}`, context);
                        console.warn(`[Proxy] Key slot ${usedSlot} (${keyNames[usedSlot]}) marked blocked for ${KEY_HEALTH_TTL_SEC}s due to ${geminiResponse.status}.`);
                        // M8 fix (audit-2 2026-04-27): if every key was already blocked when
                        // we picked this one, signal "allKeysExhausted" so the client can
                        // back off rather than retry tight-loop on the same blocked slots.
                        if (context._allKeysExhausted) {
                            const safeErr = errText.replace(/key=[^&"\s]+/gi, 'key=REDACTED').substring(0, 300);
                            await writer.write(encoder.encode(
                                `data: ${JSON.stringify({_proxyError: true, status: geminiResponse.status, allKeysExhausted: true, message: 'All Gemini keys are rate-limited — back off and retry in 60s', _debug: safeErr})}\n\n`
                            ));
                            await writer.close();
                            return;
                        }
                    }

                    // Log request diagnostics for 400 errors
                    if (geminiResponse.status === 400) {
                        const partTypes = (body.contents?.[0]?.parts || []).map(p => {
                            if (p.text) return `text(${p.text.length}ch)`;
                            if (p.fileData) return `fileData(${p.fileData.fileUri?.substring(0, 60)})`;
                            if (p.inline_data) return `inline(${p.inline_data.mime_type})`;
                            if (p.inlineData) return `inline(${p.inlineData.mimeType})`;
                            return `unknown(${Object.keys(p).join(',')})`;
                        });
                        console.error(`[Proxy] 400 DIAGNOSTIC — model: ${model}, parts: [${partTypes.join(', ')}], genConfig: ${JSON.stringify(body.generationConfig)}`);
                    }

                    // Send error event to client — include sanitized Google error for debugging
                    // Client handles retries and model fallback
                    const safeErr = errText.replace(/key=[^&"\s]+/gi, 'key=REDACTED').substring(0, 500);
                    await writer.write(encoder.encode(
                        `data: ${JSON.stringify({_proxyError: true, status: geminiResponse.status, message: 'AI service temporarily unavailable', _debug: safeErr})}\n\n`
                    ));
                    await writer.close();
                    return;
                }

                // ── Success: pipe Gemini's SSE stream through to client ──
                const reader = geminiResponse.body.getReader();
                while (true) {
                    if (upstreamCtrl.signal.aborted) {
                        try { reader.cancel(); } catch {}
                        throw new Error(`upstream-stream-timeout-${UPSTREAM_TIMEOUT_MS}ms`);
                    }
                    const { done, value } = await reader.read();
                    if (done) break;
                    await writer.write(value);
                }
                clearTimeout(upstreamTimer);
                await writer.close();

            } catch (err) {
                clearInterval(keepAlive);
                clearTimeout(upstreamTimer);
                const isTimeout = err?.name === 'AbortError' || /upstream-(stream-)?timeout/.test(err?.message || '');
                if (isTimeout) {
                    console.warn(`[Proxy] Upstream timeout (${UPSTREAM_TIMEOUT_MS}ms) on model ${model} — sending SSE error so client retries`);
                } else {
                    console.error(`[Proxy] Pipe error: ${err.message}`);
                }
                try {
                    await writer.write(encoder.encode(
                        `data: ${JSON.stringify({
                            _proxyError: true,
                            status: isTimeout ? 504 : 500,
                            message: isTimeout ? 'Upstream timeout — please retry' : 'AI service temporarily unavailable',
                            _timeout: !!isTimeout,
                            _timeoutMs: isTimeout ? UPSTREAM_TIMEOUT_MS : undefined,
                        })}\n\n`
                    ));
                } catch {}
                try { await writer.close(); } catch {}
            }
        })();

        // Ensure the pipe task runs to completion
        context.waitUntil(pipeTask);

        // Return immediately — client gets SSE stream right away
        // Keepalive comments flow every 15s until Gemini responds
        const corsOrigin = request.headers.get('Origin') || '';
        return new Response(readable, {
            status: 200,
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                // MED-1 fix: CORS header required on streaming response for cross-domain clients
                ...(corsOrigin ? { 'Access-Control-Allow-Origin': corsOrigin } : {}),
            },
        });

    } catch (err) {
        console.error(`[Proxy] Fatal error: ${err.message}`);
        return Response.json(
            { error: 'AI service temporarily unavailable' },
            { status: 500 }
        );
    }
}


// NOTE: No onRequestOptions export here.
// CORS preflight for /api/ai/* is handled by /api/ai/_middleware.js
// Adding one here would OVERRIDE and bypass that middleware.

