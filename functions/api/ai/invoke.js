// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Server-Side Gemini API Proxy v3.0
// Supports Gemini 3.1 Pro Preview + 18-key brain pool
// Hides API keys from client code, distributes across 18 key slots
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
        const model = body._model || 'gemini-2.5-flash';

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
        const slotIndex = brainSlot % keyNames.length;

        for (let i = 0; i < keyNames.length; i++) {
            const idx = (slotIndex + i) % keyNames.length;
            const key = env[keyNames[idx]];
            if (key) {
                apiKey = key;
                break;
            }
        }

        if (!apiKey) {
            return Response.json(
                { error: 'No API keys configured. Set GEMINI_KEY_0 through GEMINI_KEY_17 as secrets.' },
                { status: 500, headers: corsHeaders }
            );
        }

        // Forward to Gemini API (supports all model variants including gemini-3.1-pro-preview)
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const geminiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        // Stream the response back
        return new Response(geminiResponse.body, {
            status: geminiResponse.status,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
            },
        });

    } catch (err) {
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
