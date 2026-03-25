// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Server-Side File Upload Proxy
// Uploads files to Gemini File API (supports up to 100 MB per file)
// Accepts multipart/form-data with field name "file"
// CORS and origin check handled by /api/ai/_middleware.js
// ═══════════════════════════════════════════════════════════════

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB hard limit

export async function onRequestPost(context) {
    const { env, request } = context;

    try {
        // ── Read the uploaded file from multipart form data ──────────
        let formData;
        try {
            formData = await request.formData();
        } catch {
            return Response.json({ error: 'Expected multipart/form-data upload' }, { status: 400 });
        }

        const file = formData.get('file');
        if (!file || typeof file.arrayBuffer !== 'function') {
            return Response.json({ error: 'No file field found in upload' }, { status: 400 });
        }

        const mimeType = file.type || 'application/octet-stream';
        const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/tiff'];
        if (!allowedMimeTypes.includes(mimeType)) {
            return Response.json({ error: 'Unsupported file type' }, { status: 415 });
        }
        const fileName = file.name || `smartplans_upload_${Date.now()}`;

        // Convert file to bytes
        const bytes = new Uint8Array(await file.arrayBuffer());

        // ── Size guard ────────────────────────────────────────────────
        if (bytes.length > MAX_FILE_BYTES) {
            return Response.json(
                { error: `File too large — maximum 100 MB, received ${(bytes.length / 1024 / 1024).toFixed(1)} MB` },
                { status: 413 }
            );
        }

        if (bytes.length === 0) {
            return Response.json({ error: 'File is empty' }, { status: 400 });
        }

        // ── Select API key — Tier 2 first (higher rate limits) ────────
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
        let usedKeyName = null;
        for (let i = 0; i < keyNames.length; i++) {
            const key = env[keyNames[i]];
            if (key) { apiKey = key; usedKeyName = keyNames[i]; break; }
        }

        if (!apiKey) {
            return Response.json({ error: 'No Gemini API keys configured on server.' }, { status: 500 });
        }

        // ── Step 1: Start resumable upload session ────────────────────
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
            body: JSON.stringify({ file: { displayName: fileName } }),
        });

        if (!startResponse.ok) {
            const errText = await startResponse.text();
            return Response.json(
                { error: 'Upload session start failed' },
                { status: startResponse.status }
            );
        }

        const uploadUrl = startResponse.headers.get('X-Goog-Upload-URL');
        if (!uploadUrl) {
            return Response.json({ error: 'Gemini File API returned no upload URL' }, { status: 500 });
        }

        // ── Step 2: Upload the file bytes ─────────────────────────────
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
                { error: 'File upload failed' },
                { status: uploadResponse.status }
            );
        }

        const result = await uploadResponse.json();

        return Response.json({
            fileUri: result.file?.uri,
            name: result.file?.name,
            displayName: result.file?.displayName,
            mimeType: result.file?.mimeType,
            sizeBytes: result.file?.sizeBytes,
            state: result.file?.state,
            _usedKeyName: usedKeyName,
        });

    } catch (err) {
        console.error('[Upload] Unexpected error:', err.message);
        return Response.json({ error: 'Upload proxy error' }, { status: 500 });
    }
}

// NOTE: No onRequestOptions export here.
// CORS preflight for /api/ai/* is handled by /api/ai/_middleware.js
// Adding one here would OVERRIDE and bypass that middleware.
