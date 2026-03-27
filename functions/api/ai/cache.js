// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Context Cache Manager
// Creates a Gemini context cache from uploaded files
// All 27 brains reference the cache instead of re-reading files
// Saves ~90% on API costs
// ═══════════════════════════════════════════════════════════════

export async function onRequestPost(context) {
  const { env, request } = context;

  try {
    const body = await request.json();
    const { fileUris, model, systemInstruction, ttl } = body;

    if (!fileUris || !Array.isArray(fileUris) || fileUris.length === 0) {
      return Response.json({ error: 'fileUris array required' }, { status: 400 });
    }

    // Use the same key selection as invoke.js — prefer Tier 2
    const keyNames = [
      'GEMINI_KEY_10', 'GEMINI_KEY_11', 'GEMINI_KEY_12', 'GEMINI_KEY_13',
      'GEMINI_KEY_14', 'GEMINI_KEY_15', 'GEMINI_KEY_16', 'GEMINI_KEY_17',
      'GEMINI_KEY_0', 'GEMINI_KEY_1', 'GEMINI_KEY_2', 'GEMINI_KEY_3',
      'GEMINI_KEY_4', 'GEMINI_KEY_5', 'GEMINI_KEY_6', 'GEMINI_KEY_7',
      'GEMINI_KEY_8', 'GEMINI_KEY_9',
    ];

    // Find the specific key if requested, otherwise use first available
    const requestedKey = body._uploadKeyName;
    let apiKey = null;
    let usedKeyName = null;

    if (requestedKey && env[requestedKey]) {
      apiKey = env[requestedKey];
      usedKeyName = requestedKey;
    } else {
      for (const kn of keyNames) {
        if (env[kn]) { apiKey = env[kn]; usedKeyName = kn; break; }
      }
    }

    if (!apiKey) {
      return Response.json({ error: 'No API keys configured' }, { status: 500 });
    }

    // Build the cached content request
    const cacheModel = model || 'models/gemini-2.5-pro';
    const parts = [];

    for (const uri of fileUris) {
      if (uri.fileUri) {
        // File API reference
        parts.push({ fileData: { mimeType: uri.mimeType || 'application/pdf', fileUri: uri.fileUri } });
      } else if (uri.inlineData) {
        // Inline base64 data
        parts.push({ inlineData: { mimeType: uri.mimeType || 'application/pdf', data: uri.inlineData } });
      }
    }

    const cacheRequest = {
      model: cacheModel.startsWith('models/') ? cacheModel : `models/${cacheModel}`,
      contents: [{ role: 'user', parts }],
      ttl: ttl || '3600s', // 1 hour default
    };

    if (systemInstruction) {
      cacheRequest.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    console.log(`[Cache] Creating cache with ${parts.length} parts for model ${cacheModel} (key: ${usedKeyName})`);

    const cacheUrl = `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${apiKey}`;
    const cacheResponse = await fetch(cacheUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cacheRequest),
    });

    if (!cacheResponse.ok) {
      const errText = await cacheResponse.text();
      console.error(`[Cache] Failed: ${cacheResponse.status} ${errText.substring(0, 500)}`);
      return Response.json({
        error: 'Cache creation failed',
        status: cacheResponse.status,
        _debug: errText.replace(/key=[^&"\s]+/gi, 'key=REDACTED').substring(0, 300),
      }, { status: cacheResponse.status });
    }

    const cacheResult = await cacheResponse.json();
    console.log(`[Cache] Created: ${cacheResult.name} (${cacheResult.usageMetadata?.totalTokenCount || '?'} tokens, expires: ${cacheResult.expireTime})`);

    return Response.json({
      success: true,
      cacheName: cacheResult.name,
      model: cacheModel,
      tokenCount: cacheResult.usageMetadata?.totalTokenCount || 0,
      expireTime: cacheResult.expireTime,
      _usedKeyName: usedKeyName,
    });

  } catch (err) {
    console.error('[Cache] Error:', err);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
