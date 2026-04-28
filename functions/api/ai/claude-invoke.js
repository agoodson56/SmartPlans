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
        const requestedModel = body._model || 'claude-opus-4-5';
        // Strip SmartPlans-internal fields before translation
        delete body._brainSlot;
        delete body._model;
        delete body._uploadKeyName;
        delete body._cacheName;

        // ── 3. Translate Gemini request → Anthropic Messages API ──
        // Gemini:     { contents: [{role, parts: [{text}, {fileData|inlineData}]}], generationConfig, systemInstruction }
        // Anthropic:  { model, max_tokens, system, messages: [{role, content: [{type:'text',text} | {type:'image',source}]}] }
        const anthropicBody = _translateGeminiToAnthropic(body, requestedModel);

        // v5.142.0 (2026-04-28): STREAMING. The non-streaming path made
        // Cloudflare hold the entire request open while Anthropic thought,
        // which routinely tripped the Pages Function ~30s wall-clock kill on
        // heavy-vision brains (Symbol Scanner, Plan Legend Scanner, Spatial
        // Layout). Each one 504'd, fell back to Gemini, which also returned
        // empty when Google's API was degraded.
        //
        // Now: ask Anthropic for streaming output, pipe its SSE through a
        // TransformStream that reshapes Anthropic events into Gemini-shape
        // SSE chunks, return the piped stream as the response. Cloudflare
        // sees an active streaming response and does NOT enforce wall-clock
        // the same way — bytes flowing = function alive.
        //
        // The browser SmartBrains code already handles SSE responses (see
        // ai-engine.js line 3609 — branches on Content-Type: text/event-stream
        // and parses Gemini-shape chunks). Zero browser changes required.
        anthropicBody.stream = true;

        // ── 4. Forward to Anthropic with streaming ──────────────
        const anthropicUrl = 'https://api.anthropic.com/v1/messages';
        const started = Date.now();
        // v5.128.10 (bid-hang fix): Bound the upstream fetch with an
        // AbortController. Previously a hung Anthropic connection would stall
        // until Cloudflare's ~30s wall-clock killed the Worker, then the client
        // would retry up to 5× (see ai-engine.config.maxRetries) producing the
        // "20 min stuck in the same spot" symptom. 90s is long enough for
        // Claude Opus thinking but short enough to fail fast on a true hang.
        // v5.142.0: This timer now only protects the INITIAL response — once
        // the stream starts flowing we trust the per-token cadence to keep
        // the connection healthy.
        const upstreamController = new AbortController();
        const upstreamTimer = setTimeout(() => upstreamController.abort(), 90000);

        let upstream;
        try {
            upstream = await fetch(anthropicUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    // v5.128.13: was '2024-06-15' which is NOT a valid Anthropic API
                    // version (verified against docs.anthropic.com/en/api/versioning
                    // on 2026-04-23 — only 2023-06-01 and 2023-01-01 are valid).
                    // The bogus version string caused Claude to 400 on the FIRST
                    // brain of every bid, which auto-blacklisted Claude for the
                    // whole session and killed the cross-check layer. Every bid
                    // since this was deployed has been running Gemini-only despite
                    // paying for dual-model consensus.
                    'anthropic-version': '2023-06-01',
                    'anthropic-beta': 'pdfs-2024-09-25',
                    'accept': 'text/event-stream',
                },
                body: JSON.stringify(anthropicBody),
                signal: upstreamController.signal,
            });
        } catch (fetchErr) {
            clearTimeout(upstreamTimer);
            const msg = fetchErr?.name === 'AbortError'
                ? `Anthropic upstream timed out after 90s (no response received)`
                : `Anthropic upstream fetch failed: ${fetchErr?.message || fetchErr}`;
            console.warn(`[ClaudeProxy] Brain ${brainSlot} aborted: ${msg}`);
            return Response.json({ error: 'anthropic_timeout', status: 504, detail: msg }, { status: 504 });
        }
        // Once headers arrive, the upstream is alive; clear the open-time guard.
        clearTimeout(upstreamTimer);

        if (!upstream.ok) {
            // Non-200 from Anthropic: error is in the response body as JSON,
            // NOT as an SSE stream. Read it and return a non-streaming error.
            const errText = await upstream.text();
            let errData;
            try { errData = JSON.parse(errText); } catch { errData = { rawText: errText }; }
            console.warn(`[ClaudeProxy] Brain ${brainSlot} → ${upstream.status} after ${Date.now() - started}ms: ${errText.substring(0, 500)}`);
            return Response.json({
                error: 'anthropic_error',
                status: upstream.status,
                detail: errData?.error?.message || errText.substring(0, 500),
            }, { status: upstream.status });
        }

        // ── 5. Pipe Anthropic SSE through a translator that reshapes
        //       events into Gemini-shape SSE chunks ────────────────
        const transformer = _makeAnthropicToGeminiSseTransformer({
            model: requestedModel,
            startedMs: started,
        });

        return new Response(upstream.body.pipeThrough(transformer), {
            status: 200,
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'X-Provider': 'anthropic',
                'X-Model': requestedModel,
            },
        });

    } catch (err) {
        console.error('[ClaudeProxy] fatal:', err.message);
        return Response.json({ error: 'proxy_fatal', detail: err.message }, { status: 500 });
    }
}

// ═══════════════════════════════════════════════════════════════
// SSE TRANSFORMER — Anthropic events → Gemini-shape SSE chunks
// (v5.142.0)
// ═══════════════════════════════════════════════════════════════
//
// Anthropic emits a sequence of SSE events:
//   event: message_start         data: {message: {usage: {input_tokens}}}
//   event: content_block_start   data: {content_block: {type: 'text'}}
//   event: content_block_delta   data: {delta: {type: 'text_delta', text: 'foo'}}
//   event: content_block_stop
//   event: message_delta         data: {delta: {stop_reason}, usage: {output_tokens}}
//   event: message_stop
//   event: error                 data: {error: {type, message}}
//
// SmartBrains expects Gemini-shape SSE chunks:
//   data: {candidates: [{content: {role, parts: [{text}]}}]}
//   data: {candidates: [{finishReason: 'STOP'}], usageMetadata: {...}}
//
// We accumulate text deltas, then emit one Gemini-shape chunk per Anthropic
// content_block_delta + a final chunk on message_stop carrying finishReason
// and usageMetadata.
function _makeAnthropicToGeminiSseTransformer({ model, startedMs }) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';
    let inputTokens = 0;
    let outputTokens = 0;
    let stopReason = null;

    const emit = (controller, obj) => {
        controller.enqueue(encoder.encode('data: ' + JSON.stringify(obj) + '\n\n'));
    };

    const mapStop = (r) => {
        if (!r) return 'STOP';
        if (r === 'end_turn') return 'STOP';
        if (r === 'max_tokens') return 'MAX_TOKENS';
        if (r === 'stop_sequence') return 'STOP';
        return String(r).toUpperCase();
    };

    const processEvent = (eventType, dataStr, controller) => {
        if (!dataStr) return;
        let evt;
        try { evt = JSON.parse(dataStr); } catch { return; }

        // Anthropic uses both top-level "type" field and SSE event name; trust
        // the data.type when present (it's authoritative).
        const t = evt.type || eventType;

        if (t === 'message_start') {
            inputTokens = evt.message?.usage?.input_tokens || 0;
            outputTokens = evt.message?.usage?.output_tokens || 0;
        } else if (t === 'content_block_delta') {
            const text = evt.delta?.text;
            if (typeof text === 'string' && text.length > 0) {
                emit(controller, {
                    candidates: [{
                        content: { role: 'model', parts: [{ text }] },
                    }],
                });
            }
        } else if (t === 'message_delta') {
            if (evt.delta?.stop_reason) stopReason = evt.delta.stop_reason;
            if (evt.usage?.output_tokens) outputTokens = evt.usage.output_tokens;
        } else if (t === 'message_stop') {
            // Final chunk: finishReason + usageMetadata
            emit(controller, {
                candidates: [{
                    content: { role: 'model', parts: [{ text: '' }] },
                    finishReason: mapStop(stopReason),
                }],
                usageMetadata: {
                    promptTokenCount: inputTokens,
                    candidatesTokenCount: outputTokens,
                    totalTokenCount: inputTokens + outputTokens,
                },
                _provider: 'anthropic',
                _model: model,
                _upstreamMs: Date.now() - startedMs,
            });
        } else if (t === 'error') {
            // Anthropic mid-stream error — surface as a proxy error chunk
            emit(controller, {
                _proxyError: {
                    status: 500,
                    message: evt.error?.message || 'Anthropic stream error',
                    type: evt.error?.type || 'stream_error',
                },
            });
        }
        // content_block_start / content_block_stop / ping events are ignored
    };

    return new TransformStream({
        transform(chunk, controller) {
            buffer += decoder.decode(chunk, { stream: true });
            // SSE events are separated by a blank line (\n\n)
            const events = buffer.split('\n\n');
            buffer = events.pop() ?? '';
            for (const evt of events) {
                if (!evt.trim()) continue;
                let eventType = '';
                let dataStr = '';
                for (const line of evt.split('\n')) {
                    if (line.startsWith('event: ')) eventType = line.slice(7).trim();
                    else if (line.startsWith('event:')) eventType = line.slice(6).trim();
                    else if (line.startsWith('data: ')) dataStr += line.slice(6);
                    else if (line.startsWith('data:')) dataStr += line.slice(5);
                }
                processEvent(eventType, dataStr, controller);
            }
        },
        flush(controller) {
            // Any trailing buffered event
            if (buffer.trim()) {
                let eventType = '';
                let dataStr = '';
                for (const line of buffer.split('\n')) {
                    if (line.startsWith('event: ')) eventType = line.slice(7).trim();
                    else if (line.startsWith('data: ')) dataStr += line.slice(6);
                }
                processEvent(eventType, dataStr, controller);
            }
        },
    });
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
        model: 'claude-opus-4-5',
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
    // Wave 10 M4: concat ALL systemInstruction parts, not just parts[0].
    // A Gemini brain that uses multiple parts for system context was
    // losing everything after the first.
    let systemInstruction = null;
    if (geminiBody.systemInstruction) {
        const si = geminiBody.systemInstruction;
        if (typeof si === 'string') {
            systemInstruction = si;
        } else if (Array.isArray(si.parts)) {
            systemInstruction = si.parts.map(p => p?.text || '').filter(Boolean).join('\n\n') || null;
        } else if (typeof si.text === 'string') {
            systemInstruction = si.text;
        }
    }

    const contents = Array.isArray(geminiBody.contents) ? geminiBody.contents : [];
    const messages = [];
    for (const turn of contents) {
        const role = turn.role === 'model' ? 'assistant' : (turn.role || 'user');
        const content = [];
        for (const part of (turn.parts || [])) {
            if (part.text != null) {
                content.push({ type: 'text', text: String(part.text) });
                continue;
            }
            // v5.140.0: Accept BOTH snake_case (inline_data / mime_type — what
            // ai-engine.js _buildFileParts produces, line 3281) AND camelCase
            // (inlineData / mimeType — what _translateGeminiToAnthropic was
            // originally written to expect). Pre-fix, snake_case parts from
            // every brain call were silently dropped by the proxy → Claude
            // got text-only context for visual brains, hallucinating or
            // failing. The mismatch was invisible because the proxy returned
            // 200 with a Gemini-shaped empty response.
            const inline = part.inlineData ?? part.inline_data;
            if (inline?.data) {
                const mime = inline.mimeType || inline.mime_type || 'application/octet-stream';
                if (mime.startsWith('image/')) {
                    content.push({
                        type: 'image',
                        source: { type: 'base64', media_type: mime, data: inline.data },
                    });
                } else if (mime === 'application/pdf') {
                    content.push({
                        type: 'document',
                        source: { type: 'base64', media_type: mime, data: inline.data },
                    });
                }
                // Other MIME types silently dropped — Claude won't understand them
            }
            // fileData (Gemini File API URI refs) intentionally skipped —
            // Claude has no equivalent. _invokeBrain (v5.140.0) auto-routes
            // any brain with fileData parts back to Gemini so this proxy
            // never sees them in primary-mode operation.
        }
        if (content.length > 0) {
            messages.push({ role, content });
        }
    }

    // Wave 11 C4 (v5.128.8): Final-pass alternation enforcement.
    // Pre-fix the inline bridge only handled PAIRS of same-role turns.
    // A Gemini context with 3+ consecutive model/user turns (e.g.
    // REPORT_WRITER clarification loops) still produced invalid output
    // after the inline bridge. This post-pass iterates until the sequence
    // strictly alternates user → assistant → user → …, bridging every
    // same-role adjacency it finds.
    const alternated = [];
    for (const msg of messages) {
        const prev = alternated[alternated.length - 1];
        if (prev && prev.role === msg.role) {
            const bridgeRole = msg.role === 'user' ? 'assistant' : 'user';
            alternated.push({ role: bridgeRole, content: [{ type: 'text', text: 'Understood.' }] });
        }
        alternated.push(msg);
    }
    // Anthropic also requires the FIRST message to be role='user'. If the
    // Gemini brain started with an assistant/model turn, prepend a stub.
    if (alternated.length > 0 && alternated[0].role !== 'user') {
        alternated.unshift({ role: 'user', content: [{ type: 'text', text: 'Continue.' }] });
    }
    // Overwrite messages with the validated sequence
    messages.length = 0;
    messages.push(...alternated);

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
