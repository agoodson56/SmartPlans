// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Server-Side Gemini API Proxy v3.1
// Supports Gemini 3.1 Pro Preview + 18-key brain pool
// Hides API keys from client code, distributes across 18 key slots
// Now with: detailed error surfacing, model fallback, and logging
// ═══════════════════════════════════════════════════════════════

export async function onRequestPost(context) {
    const { env, request } = context;

    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    try {
        const body = await request.json();

        // Extract SmartBrains metadata
        const brainSlot = body._brainSlot || 0;
        const requestedModel = body._model || 'gemini-2.5-flash';

        // Remove custom fields before forwarding
        delete body._brainSlot;
        delete body._model;

        // Select API key for this brain slot — supports up to 18 keys (one per brain)
        const keyNames = [
            'GEMINI_KEY_0', 'GEMINI_KEY_1', 'GEMINI_KEY_2', 'GEMINI_KEY_3', 'GEMINI_KEY_4',
            'GEMINI_KEY_5', 'GEMINI_KEY_6', 'GEMINI_KEY_7', 'GEMINI_KEY_8', 'GEMINI_KEY_9',
            'GEMINI_KEY_10', 'GEMINI_KEY_11', 'GEMINI_KEY_12', 'GEMINI_KEY_13', 'GEMINI_KEY_14',
            'GEMINI_KEY_15', 'GEMINI_KEY_16', 'GEMINI_KEY_17',
        ];

        // Find an available key — try the requested slot first, then fallback
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

        // ── Try requested model first ──
        let model = requestedModel;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        console.log(`[Proxy] Brain ${brainSlot} → slot ${usedSlot} → model: ${model}`);

        const geminiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        // ── If model fails with 404/400, try fallback model ──
        if (!geminiResponse.ok && [404, 400].includes(geminiResponse.status)) {
            const errBody = await geminiResponse.text();
            console.warn(`[Proxy] Model "${model}" returned ${geminiResponse.status}: ${errBody.substring(0, 300)}`);

            // Fallback: try gemini-2.5-flash if we weren't already using it
            if (model !== 'gemini-2.5-flash') {
                const fallbackModel = 'gemini-2.5-flash';
                console.log(`[Proxy] Retrying brain ${brainSlot} with fallback model: ${fallbackModel}`);

                // Remove thinkingConfig if present (not supported on Flash)
                if (body.generationConfig?.thinkingConfig) {
                    delete body.generationConfig.thinkingConfig;
                }

                const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${fallbackModel}:generateContent?key=${apiKey}`;
                const fallbackResponse = await fetch(fallbackUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                if (fallbackResponse.ok) {
                    console.log(`[Proxy] ✓ Fallback to ${fallbackModel} succeeded for brain ${brainSlot}`);
                    return new Response(fallbackResponse.body, {
                        status: fallbackResponse.status,
                        headers: { 'Content-Type': 'application/json', ...corsHeaders },
                    });
                }

                // Fallback also failed — return the fallback error
                const fbErrBody = await fallbackResponse.text();
                console.error(`[Proxy] Fallback also failed: ${fallbackResponse.status} — ${fbErrBody.substring(0, 300)}`);
                return new Response(fbErrBody, {
                    status: fallbackResponse.status,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                });
            }

            // Already using flash and it failed — return the error
            return new Response(errBody, {
                status: geminiResponse.status,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        // ── Log non-OK responses for debugging ──
        if (!geminiResponse.ok) {
            const errText = await geminiResponse.text();
            console.error(`[Proxy] Gemini ${geminiResponse.status} for brain ${brainSlot} (model: ${model}): ${errText.substring(0, 500)}`);
            return new Response(errText, {
                status: geminiResponse.status,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }

        // Stream successful response back
        return new Response(geminiResponse.body, {
            status: geminiResponse.status,
            headers: {
                'Content-Type': 'application/json',
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
