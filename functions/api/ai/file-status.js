// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — File Status Check (polls Gemini File API)
// Returns the current state of an uploaded file (PROCESSING → ACTIVE)
// ═══════════════════════════════════════════════════════════════

export async function onRequestGet(context) {
    const { env, request } = context;

    // Validate auth token (matches pattern from other endpoints)
    const envToken = env.ESTIMATES_TOKEN;
    if (envToken) {
        const token = request.headers.get('X-App-Token') || '';
        if (token !== envToken) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const url = new URL(request.url);
        const fileName = url.searchParams.get('name');
        const keyName = url.searchParams.get('key');

        if (!fileName) {
            return Response.json({ error: 'Missing "name" parameter' }, { status: 400 });
        }

        // Select API key — prefer the key that uploaded the file
        const tier2Keys = [
            'GEMINI_KEY_10', 'GEMINI_KEY_11', 'GEMINI_KEY_12', 'GEMINI_KEY_13',
            'GEMINI_KEY_14', 'GEMINI_KEY_15', 'GEMINI_KEY_16', 'GEMINI_KEY_17',
        ];
        const tier1Keys = [
            'GEMINI_KEY_0', 'GEMINI_KEY_1', 'GEMINI_KEY_2', 'GEMINI_KEY_3', 'GEMINI_KEY_4',
            'GEMINI_KEY_5', 'GEMINI_KEY_6', 'GEMINI_KEY_7', 'GEMINI_KEY_8', 'GEMINI_KEY_9',
        ];
        const allKeys = [...tier2Keys, ...tier1Keys];
        const validKeyNames = new Set(allKeys);

        let apiKey = null;

        // Use the same key that uploaded the file
        if (keyName && validKeyNames.has(keyName) && env[keyName]) {
            apiKey = env[keyName];
        } else {
            // Fallback to first available key
            for (const k of allKeys) {
                if (env[k]) { apiKey = env[k]; break; }
            }
        }

        if (!apiKey) {
            return Response.json({ error: 'No API keys configured' }, { status: 500 });
        }

        // Query Gemini File API for file status
        const statusUrl = `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`;
        const response = await fetch(statusUrl);

        if (!response.ok) {
            const errText = await response.text();
            return Response.json(
                { error: `File status check failed (${response.status}): ${errText.substring(0, 200)}` },
                { status: response.status }
            );
        }

        const fileInfo = await response.json();

        return Response.json({
            name: fileInfo.name,
            displayName: fileInfo.displayName,
            state: fileInfo.state,
            mimeType: fileInfo.mimeType,
            sizeBytes: fileInfo.sizeBytes,
        });

    } catch (err) {
        console.error('[FileStatus] Error:', err.message);
        return Response.json({ error: 'File status check error' }, { status: 500 });
    }
}
