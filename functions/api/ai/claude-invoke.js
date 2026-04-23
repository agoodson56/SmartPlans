// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Claude (Anthropic) API Proxy  (Wave 9, v5.128.6)
//
// Secondary AI provider. Used for:
//   1. Fallback when Gemini 3.1 Pro is degraded beyond Wave 4.5 threshold
//   2. Dual-provider cross-check on high-stakes brains
//      (LEGEND_DECODER, MATERIAL_PRICER, CONSENSUS_ARBITRATOR, DEVILS_ADVOCATE)
//
// Graceful degrade: if ANTHROPIC_KEY is not set as a Cloudflare secret,
// this endpoint returns 503 CLAUDE_NOT_CONFIGURED and the client falls
// back to Gemini-only behavior. No Anthropic key → no crash, just no
// second-opinion.
//
// Required Cloudflare secret: ANTHROPIC_KEY (single key, Anthropic
// handles rate limiting server-side). Optional: ANTHROPIC_KEY_BACKUP
// for a secondary key with its own quota pool.
//
// Accepts the same input shape as /api/ai/invoke (Gemini-style
// generateContent body with `contents` + optional `systemInstruction`
// + `generationConfig`), translates to Anthropic's Messages API,
// and returns the Gemini-style response so ai-engine.js doesn't have
// to branch on provider for every brain.
// ═══════════════════════════════════════════════════════════════

export async function onRequestPost(context) {
    const { env, request } = context;

    // ── 1. Key resolution with graceful degrade ──────────────
    const primaryKey = env.ANTHROPIC_KEY;
    const backupKey = env.ANTHROPIC_KEY_BACKUP;
    const apiKey = primaryKey || backupKey;
    if (!apiKey) {
        return Response.json({
            error: 'CLAUDE_NOT_CONFIGURED',
            detail: 'Anthropic API key not set. Add ANTHROPIC_KEY as a Cloudflare Pages secret to enable Claude as a second AI provider.',
        }, { status: 503 });
    }

    try {
        const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
        if (contentLength > 50 * 1024 * 1024) {
            return Response.json({ error: 'Payload too large' }, { status: 413 });
        }

        const body = await request.json();

        // ── 2. Extract SmartBrains metadata (identical to Gemini proxy) ──
        const brainSlot = body._brainSlot || 0;
        const requestedModel = body._model || 'claude-opus-4-7';
        // Strip SmartPlans-internal fields before translation
        delete body._brainSlot;
        delete body._model;
        delete body._uploadKeyName;
        delete body._cacheName;

        // ── 3. Translate Gemini request → Anthropic Messages API ──
        // Gemini:     { contents: [{role, parts: [{text}, {fileData|inlineData}]}], generationConfig, systemInstruction }
        // Anthropic:  { model, max_tokens, system, messages: [{role, content: [{type:'text',text} | {type:'image',source}]}] }
        const anthropicBody = _translateGeminiToAnthropic(body, requestedModel);

        // ── 4. Forward to Anthropic ─────────────────────────────
        // NOTE: Anthropic supports streaming; we use non-streaming here for simpler
        // integration with the existing SmartBrains retry loop. Streaming can be
        // added in a future wave if per-token progress is needed.
        const anthropicUrl = 'https://api.anthropic.com/v1/messages';
        const started = Date.now();
        const upstream = await fetch(anthropicUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(anthropicBody),
        });

        const upstreamText = await upstream.text();
        let upstreamData;
        try { upstreamData = JSON.parse(upstreamText); }
        catch { upstreamData = { rawText: upstreamText }; }

        if (!upstream.ok) {
            console.warn(`[ClaudeProxy] Brain ${brainSlot} → ${upstream.status} after ${Date.now() - started}ms: ${upstreamText.substring(0, 500)}`);
            return Response.json({
                error: 'anthropic_error',
                status: upstream.status,
                detail: upstreamData?.error?.message || upstreamText.substring(0, 500),
            }, { status: upstream.status });
        }

        // ── 5. Translate Anthropic response → Gemini-shaped response ──
        // so ai-engine's JSON parser doesn't branch on provider.
        const geminiShaped = _translateAnthropicToGemini(upstreamData);
        geminiShaped._provider = 'anthropic';
        geminiShaped._model = upstreamData.model || requestedModel;
        geminiShaped._upstreamMs = Date.now() - started;
        return Response.json(geminiShaped, { status: 200 });

    } catch (err) {
        console.error('[ClaudeProxy] fatal:', err.message);
        return Response.json({ error: 'proxy_fatal', detail: err.message }, { status: 500 });
    }
}

export async function onRequestOptions() {
    return new Response(null, { status: 200 });
}

// ─── GET /api/ai/claude-invoke — lightweight availability probe ──
// Returns { configured: true|false, model } so the client can detect
// whether Claude is usable before dispatching a real request.
export async function onRequestGet({ env }) {
    const configured = !!(env.ANTHROPIC_KEY || env.ANTHROPIC_KEY_BACKUP);
    return Response.json({
        configured,
        model: 'claude-opus-4-7',
        note: configured ? 'Claude is available as an AI provider' : 'ANTHROPIC_KEY not set — Claude paths are dormant',
    });
}

// ═══════════════════════════════════════════════════════════════
// TRANSLATION HELPERS
// ═══════════════════════════════════════════════════════════════

// Gemini request → Anthropic Messages request.
// Drops parts Anthropic doesn't support (fileData refs — Claude reads
// images/PDFs via base64 source, not URI refs). File uploads via
// Gemini File API stay Gemini-only; Claude brains run on inline
// base64 for compatibility with SmartBrains encoded files.
function _translateGeminiToAnthropic(geminiBody, model) {
    const systemInstruction = geminiBody.systemInstruction?.parts?.[0]?.text
        || geminiBody.systemInstruction?.text
        || (typeof geminiBody.systemInstruction === 'string' ? geminiBody.systemInstruction : null);

    const contents = Array.isArray(geminiBody.contents) ? geminiBody.contents : [];
    const messages = [];
    for (const turn of contents) {
        const role = turn.role === 'model' ? 'assistant' : (turn.role || 'user');
        const content = [];
        for (const part of (turn.parts || [])) {
            if (part.text != null) {
                content.push({ type: 'text', text: String(part.text) });
            } else if (part.inlineData?.data) {
                // Inline base64 image or PDF — Anthropic supports image
                // directly, PDFs via the document content block type
                const mime = part.inlineData.mimeType || 'application/octet-stream';
                if (mime.startsWith('image/')) {
                    content.push({
                        type: 'image',
                        source: { type: 'base64', media_type: mime, data: part.inlineData.data },
                    });
                } else if (mime === 'application/pdf') {
                    content.push({
                        type: 'document',
                        source: { type: 'base64', media_type: mime, data: part.inlineData.data },
                    });
                }
                // Other MIME types silently dropped — Claude won't understand them
            }
            // fileData (Gemini File API URI refs) intentionally skipped —
            // Claude has no equivalent. Brain must provide inlineData to
            // be Claude-compatible.
        }
        if (content.length > 0) messages.push({ role, content });
    }

    // If every turn had only fileData and nothing made it through, inject
    // a stub text message so Anthropic doesn't 400 on empty content.
    if (messages.length === 0) {
        messages.push({ role: 'user', content: [{ type: 'text', text: 'No compatible content provided.' }] });
    }

    // Max tokens: respect Gemini's maxOutputTokens when provided, else generous default.
    const maxTokens = Number(geminiBody.generationConfig?.maxOutputTokens) || 16384;

    const anthropicBody = {
        model,
        max_tokens: Math.min(maxTokens, 64000),
        messages,
    };
    if (systemInstruction) anthropicBody.system = systemInstruction;
    // Temperature (Gemini default 1.0, Anthropic default 1.0 — pass through when set)
    const t = geminiBody.generationConfig?.temperature;
    if (typeof t === 'number') anthropicBody.temperature = Math.max(0, Math.min(1, t));
    return anthropicBody;
}

// Anthropic response → Gemini-shaped response so the existing parser
// doesn't need a Claude branch. Only the pieces SmartBrains actually
// reads are mirrored.
function _translateAnthropicToGemini(resp) {
    const blocks = Array.isArray(resp?.content) ? resp.content : [];
    const text = blocks.filter(b => b.type === 'text').map(b => b.text || '').join('');
    return {
        candidates: [{
            content: { role: 'model', parts: [{ text }] },
            finishReason: _mapStopReason(resp?.stop_reason),
        }],
        usageMetadata: {
            promptTokenCount: resp?.usage?.input_tokens ?? null,
            candidatesTokenCount: resp?.usage?.output_tokens ?? null,
            totalTokenCount: (resp?.usage?.input_tokens ?? 0) + (resp?.usage?.output_tokens ?? 0),
        },
    };
}

function _mapStopReason(r) {
    if (!r) return 'STOP';
    if (r === 'end_turn') return 'STOP';
    if (r === 'max_tokens') return 'MAX_TOKENS';
    if (r === 'stop_sequence') return 'STOP';
    return String(r).toUpperCase();
}
