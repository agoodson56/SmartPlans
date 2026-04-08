// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Server-Side File Upload Proxy
// Uploads files to Gemini File API (supports up to 100 MB per file)
// Accepts multipart/form-data with field name "file"
// CORS and origin check handled by /api/ai/_middleware.js
// ═══════════════════════════════════════════════════════════════

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB hard limit
const SESSION_START_TIMEOUT_MS = 15_000;   // 15 s for session start (small payload)
// Upload timeout scales with file size — minimum 30s, ~100KB/s assumed throughput
function uploadTimeoutMs(byteLen) {
    return Math.max(30_000, Math.ceil(byteLen / 100_000) * 1000);
}

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

        // FIX #11: Accept preferredKey from client to pin ALL uploads to the same API key.
        // Without this, each chunk filename hashes to a different key, potentially across
        // different GCP projects — causing PERMISSION_DENIED when brains/cache access files.
        // SECURITY: Validate against whitelist — client-supplied name must be a known key.
        const validKeyNames = new Set(keyNames);
        const preferredKey = formData.get('preferredKey');
        if (preferredKey && validKeyNames.has(preferredKey) && env[preferredKey]) {
            apiKey = env[preferredKey];
            usedKeyName = preferredKey;
            console.log(`[Upload] Pinned to preferred key: ${preferredKey}`);
        } else {
            // Fallback: Rotate using hash of filename (original behavior)
            const rotationSeed = Array.from(fileName).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
            const startIdx = Math.abs(rotationSeed) % keyNames.length;
            for (let i = 0; i < keyNames.length; i++) {
                const idx = (startIdx + i) % keyNames.length;
                const key = env[keyNames[idx]];
                if (key) { apiKey = key; usedKeyName = keyNames[idx]; break; }
            }
        }

        if (!apiKey) {
            return Response.json({ error: 'No Gemini API keys configured on server.' }, { status: 500 });
        }

        // ── Step 1: Start resumable upload session ────────────────────
        // AbortController ensures we don't hang if Gemini API is unresponsive
        // FIX #9: Use header-based auth instead of URL parameter to keep keys out of logs
        const startUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files`;
        const startController = new AbortController();
        const startTimeout = setTimeout(() => startController.abort(), SESSION_START_TIMEOUT_MS);

        let startResponse;
        try {
            startResponse = await fetch(startUrl, {
                method: 'POST',
                signal: startController.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey,
                    'X-Goog-Upload-Protocol': 'resumable',
                    'X-Goog-Upload-Command': 'start',
                    'X-Goog-Upload-Header-Content-Length': bytes.length.toString(),
                    'X-Goog-Upload-Header-Content-Type': mimeType,
                },
                body: JSON.stringify({ file: { displayName: fileName } }),
            });
        } catch (err) {
            clearTimeout(startTimeout);
            const isTimeout = err.name === 'AbortError';
            console.error(`[Upload] Session start ${isTimeout ? 'timed out' : 'failed'}: ${err.message}`);
            return Response.json(
                { error: isTimeout ? 'Upload session timed out — Gemini API unresponsive' : 'Upload session start failed' },
                { status: 504 }
            );
        }
        clearTimeout(startTimeout);

        if (!startResponse.ok) {
            const errText = await startResponse.text().catch(() => '');
            console.error(`[Upload] Session start HTTP ${startResponse.status}: ${errText.substring(0, 200)}`);
            return Response.json({ error: 'Upload session start failed' }, { status: startResponse.status });
        }

        const uploadUrl = startResponse.headers.get('X-Goog-Upload-URL');
        if (!uploadUrl) {
            return Response.json({ error: 'Gemini File API returned no upload URL' }, { status: 500 });
        }

        // ── Step 2: Upload the file bytes ─────────────────────────────
        // FIX #6: Separate, size-scaled timeout for actual file upload
        const uploadController = new AbortController();
        const uploadTimeout = setTimeout(() => uploadController.abort(), uploadTimeoutMs(bytes.length));

        let uploadResponse;
        try {
            uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                signal: uploadController.signal,
                headers: {
                    'Content-Length': bytes.length.toString(),
                    'X-Goog-Upload-Offset': '0',
                    'X-Goog-Upload-Command': 'upload, finalize',
                },
                body: bytes,
            });
        } catch (err) {
            clearTimeout(uploadTimeout);
            const isTimeout = err.name === 'AbortError';
            console.error(`[Upload] File upload ${isTimeout ? 'timed out' : 'failed'}: ${err.message}`);
            return Response.json(
                { error: isTimeout ? 'File upload timed out — file may be too large or connection slow' : 'File upload failed' },
                { status: 504 }
            );
        }
        clearTimeout(uploadTimeout);

        if (!uploadResponse.ok) {
            const errText = await uploadResponse.text().catch(() => '');
            console.error(`[Upload] File upload HTTP ${uploadResponse.status}: ${errText.substring(0, 200)}`);
            return Response.json({ error: 'File upload failed' }, { status: uploadResponse.status });
        }

        const result = await uploadResponse.json();

        // Validate that Gemini returned a usable file URI before responding
        if (!result?.file?.uri) {
            console.error('[Upload] Gemini returned no file URI:', JSON.stringify(result).substring(0, 200));
            return Response.json({ error: 'Gemini File API did not return a file URI' }, { status: 502 });
        }

        return Response.json({
            fileUri: result.file.uri,
            name: result.file.name,
            displayName: result.file.displayName,
            mimeType: result.file.mimeType,
            sizeBytes: result.file.sizeBytes,
            state: result.file.state,
            _usedKeyName: usedKeyName, // Client needs this to pin cache/invoke to same key
        });

    } catch (err) {
        console.error('[Upload] Unexpected error:', err.message);
        return Response.json({ error: 'Upload proxy error' }, { status: 500 });
    }
}

// NOTE: No onRequestOptions export here.
// CORS preflight for /api/ai/* is handled by /api/ai/_middleware.js
// Adding one here would OVERRIDE and bypass that middleware.
