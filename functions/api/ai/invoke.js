// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Server-Side Gemini API Proxy v3.2 (STREAMING)
// Uses streamGenerateContent to avoid Cloudflare 524 timeouts
// Pipes SSE stream from Gemini → client, keeping connection alive
// ═══════════════════════════════════════════════════════════════

export async function onRequestPost(context) {
    const { env, request } = context;

    // CORS headers handled by _middleware.js — only set non-CORS headers here
    const corsHeaders = {};

    try {
        const body = await request.json();

        // Extract SmartBrains metadata
        const brainSlot = body._brainSlot || 0;
        const requestedModel = body._model || 'gemini-2.5-flash';

        // Remove custom fields before forwarding
        delete body._brainSlot;
        delete body._model;

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

        if (!apiKey) {
            return Response.json(
                { error: 'No API keys configured. Set GEMINI_KEY_0 through GEMINI_KEY_17 as secrets.' },
                { status: 500, headers: corsHeaders }
            );
        }

        // ── Use streaming endpoint to avoid 524 timeouts ──
        // streamGenerateContent sends chunks every few seconds,
        // keeping the Cloudflare proxy connection alive
        let model = requestedModel;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

        console.log(`[Proxy] Brain ${brainSlot} → slot ${usedSlot} → model: ${model} (streaming)`);

        const geminiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        // ── If model fails with 403/404/400, try fallback ──
        if (!geminiResponse.ok && [403, 404, 400].includes(geminiResponse.status)) {
            const errBody = await geminiResponse.text();
            console.warn(`[Proxy] Model "${model}" returned ${geminiResponse.status}: ${errBody.substring(0, 300)}`);

            if (model !== 'gemini-2.5-flash') {
                const fallbackModel = 'gemini-2.5-flash';
                console.log(`[Proxy] Retrying brain ${brainSlot} with fallback model: ${fallbackModel}`);

                if (body.generationConfig?.thinkingConfig) {
                    delete body.generationConfig.thinkingConfig;
                }

                const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:streamGenerateContent?alt=sse&key=${apiKey}`;
                const fallbackResponse = await fetch(fallbackUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                if (fallbackResponse.ok) {
                    console.log(`[Proxy] ✓ Fallback to ${fallbackModel} succeeded for brain ${brainSlot}`);
                    return new Response(fallbackResponse.body, {
                        status: fallbackResponse.status,
                        headers: { 'Content-Type': 'text/event-stream', ...corsHeaders },
                    });
                }

                const fbErrBody = await fallbackResponse.text();
                console.error(`[Proxy] Fallback also failed: ${fallbackResponse.status} — ${fbErrBody.substring(0, 300)}`);
                return new Response(fbErrBody, {
                    status: fallbackResponse.status,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                });
            }

            return new Response(errBody, {
                status: geminiResponse.status,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        // ── Log non-OK responses ──
        if (!geminiResponse.ok) {
            const errText = await geminiResponse.text();
            console.error(`[Proxy] Gemini ${geminiResponse.status} for brain ${brainSlot} (model: ${model}): ${errText.substring(0, 500)}`);
            return new Response(errText, {
                status: geminiResponse.status,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        // ── Stream SSE response back to client ──
        // This keeps the connection alive — Cloudflare sees data flowing
        // and won't trigger a 524 timeout
        return new Response(geminiResponse.body, {
            status: 200,
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                ...corsHeaders,
            },
        });

    } catch (err) {
        console.error(`[Proxy] Fatal error: ${err.message}`);
        return Response.json(
            { error: 'Proxy error: ' + err.message },
            { status: 500, headers: corsHeaders }
        );
    }
}

// Handle CORS preflight
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
