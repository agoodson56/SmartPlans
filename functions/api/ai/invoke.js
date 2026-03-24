// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Server-Side Gemini API Proxy v4.0 (ZERO-TIMEOUT)
// Returns SSE stream IMMEDIATELY with keepalive, then pipes Gemini
// Eliminates Cloudflare 524 timeouts completely
// ═══════════════════════════════════════════════════════════════

export async function onRequestPost(context) {
    const { env, request } = context;

    try {
        const body = await request.json();

        // Extract SmartBrains metadata
        const brainSlot = body._brainSlot || 0;
        const requestedModel = body._model || 'gemini-2.5-flash';
        const uploadKeyName = body._uploadKeyName || null;

        // Remove custom fields before forwarding
        delete body._brainSlot;
        delete body._model;
        delete body._uploadKeyName;

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
            // PRIORITY 2: Normal slot-based rotation
            const slotIndex = brainSlot % keyNames.length;
            for (let i = 0; i < keyNames.length; i++) {
                const idx = (slotIndex + i) % keyNames.length;
                const key = env[keyNames[idx]];
                if (key) {
                    apiKey = key;
                    usedSlot = idx;
                    break;
                }
            }
        }

        if (!apiKey) {
            return Response.json(
                { error: 'No API keys configured. Set GEMINI_KEY_0 through GEMINI_KEY_17 as secrets.' },
                { status: 500 }
            );
        }

        let model = requestedModel;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

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
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                clearInterval(keepAlive);

                // Handle Gemini errors — send as SSE error event so client can detect
                if (!geminiResponse.ok) {
                    const errText = await geminiResponse.text();
                    console.warn(`[Proxy] Model "${model}" returned ${geminiResponse.status}: ${errText.substring(0, 500)}`);

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

                    // Send error event to client — no server-side fallback
                    // Client handles retries and model fallback
                    await writer.write(encoder.encode(
                        `data: ${JSON.stringify({_proxyError: true, status: geminiResponse.status, message: errText.substring(0, 500)})}\n\n`
                    ));
                    await writer.close();
                    return;
                }

                // ── Success: pipe Gemini's SSE stream through to client ──
                const reader = geminiResponse.body.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    await writer.write(value);
                }
                await writer.close();

            } catch (err) {
                clearInterval(keepAlive);
                console.error(`[Proxy] Pipe error: ${err.message}`);
                try {
                    await writer.write(encoder.encode(
                        `data: ${JSON.stringify({_proxyError: true, status: 500, message: err.message})}\n\n`
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
            { error: 'Proxy error: ' + err.message },
            { status: 500 }
        );
    }
}


// NOTE: No onRequestOptions export here.
// CORS preflight for /api/ai/* is handled by /api/ai/_middleware.js
// Adding one here would OVERRIDE and bypass that middleware.

