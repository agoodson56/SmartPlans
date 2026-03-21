// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Server-Side File Upload Proxy
// Uploads files to Gemini File API (supports up to 2 GB per file)
// Returns file URI for use in generateContent requests
// ═══════════════════════════════════════════════════════════════

export async function onRequestPost(context) {
    const { env, request } = context;

    // CORS headers handled by _middleware.js
    const corsHeaders = {};

    try {
        // Get the file data from the request
        const body = await request.json();
        const { fileName, mimeType, base64Data, brainSlot } = body;

        if (!base64Data || !mimeType) {
            return Response.json(
                { error: 'Missing required fields: base64Data, mimeType' },
                { status: 400, headers: corsHeaders }
            );
        }

        // Select API key — MUST match invoke.js ordering exactly!
        // Files uploaded here are owned by the uploading project.
        // invoke.js must use the same project's key when referencing these files.
        const tier2Keys = [
            'GEMINI_KEY_10', 'GEMINI_KEY_11', 'GEMINI_KEY_12', 'GEMINI_KEY_13',
            'GEMINI_KEY_14', 'GEMINI_KEY_15', 'GEMINI_KEY_16', 'GEMINI_KEY_17',
        ];
        const tier1Keys = [
            'GEMINI_KEY_0', 'GEMINI_KEY_1', 'GEMINI_KEY_2', 'GEMINI_KEY_3', 'GEMINI_KEY_4',
            'GEMINI_KEY_5', 'GEMINI_KEY_6', 'GEMINI_KEY_7', 'GEMINI_KEY_8', 'GEMINI_KEY_9',
        ];
        const keyNames = [...tier2Keys, ...tier1Keys];

        let apiKey = null;
        const slotIndex = (brainSlot || 0) % keyNames.length;
        for (let i = 0; i < keyNames.length; i++) {
            const idx = (slotIndex + i) % keyNames.length;
            const key = env[keyNames[idx]];
            if (key) { apiKey = key; break; }
        }

        if (!apiKey) {
            return Response.json(
                { error: 'No API keys configured.' },
                { status: 500, headers: corsHeaders }
            );
        }

        // Convert base64 to binary
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }

        const displayName = fileName || `smartplans_upload_${Date.now()}`;

        // ─── Step 1: Start resumable upload session ───────────
        const startUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
        const startResponse = await fetch(startUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Upload-Protocol': 'resumable',
                'X-Goog-Upload-Command': 'start',
                'X-Goog-Upload-Header-Content-Length': bytes.length.toString(),
                'X-Goog-Upload-Header-Content-Type': mimeType,
            },
            body: JSON.stringify({
                file: { displayName }
            }),
        });

        if (!startResponse.ok) {
            const errText = await startResponse.text();
            return Response.json(
                { error: `Upload start failed: ${startResponse.status} — ${errText}` },
                { status: startResponse.status, headers: corsHeaders }
            );
        }

        const uploadUrl = startResponse.headers.get('X-Goog-Upload-URL');
        if (!uploadUrl) {
            return Response.json(
                { error: 'No upload URL returned from Gemini File API' },
                { status: 500, headers: corsHeaders }
            );
        }

        // ─── Step 2: Upload the file bytes ─────────────────────
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Content-Length': bytes.length.toString(),
                'X-Goog-Upload-Offset': '0',
                'X-Goog-Upload-Command': 'upload, finalize',
            },
            body: bytes,
        });

        if (!uploadResponse.ok) {
            const errText = await uploadResponse.text();
            return Response.json(
                { error: `File upload failed: ${uploadResponse.status} — ${errText}` },
                { status: uploadResponse.status, headers: corsHeaders }
            );
        }

        const result = await uploadResponse.json();

        // Return the file URI and metadata
        return Response.json({
            fileUri: result.file?.uri,
            name: result.file?.name,
            displayName: result.file?.displayName,
            mimeType: result.file?.mimeType,
            sizeBytes: result.file?.sizeBytes,
            state: result.file?.state,
        }, { headers: corsHeaders });

    } catch (err) {
        return Response.json(
            { error: 'Upload proxy error: ' + err.message },
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
