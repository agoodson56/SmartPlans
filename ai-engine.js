/* ═══════════════════════════════════════════════════════════════
   SMARTPLANS — TRIPLE-READ CONSENSUS ENGINE v5.0
   ═══════════════════════════════════════════════════════════════
   Powered by Gemini 3.1 Pro — 2× reasoning improvement
   27 Specialized AI Brains × 12 Processing Waves
   20× Drawing Scan Architecture for 99%+ accuracy
   
   Architecture:
   ┌─────────────────────────────────────────────────────────┐
   │  WAVE 1 — Document Intelligence (5 parallel brains)    │
   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
   │  │ Symbol   │ │ Code     │ │ MDF/IDF  │ │ Cable &  │  │
   │  │ Scanner  │ │ Comply   │ │ Analyzer │ │ Pathway  │  │
   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
   │  ┌──────────┐                                          │
   │  │ Special  │                                          │
   │  │ Cond.    │                                          │
   │  └──────────┘                                          │
   ├─────────────────────────────────────────────────────────┤
   │  WAVE 2 — Cost Engine (3 parallel brains)              │
   │  ┌──────────┐ ┌──────────┐ ┌──────────┐               │
   │  │ Material │ │ Labor    │ │ Financial│               │
   │  │ Pricer   │ │ Calc     │ │ Engine   │               │
   │  └──────────┘ └──────────┘ └──────────┘               │
   ├─────────────────────────────────────────────────────────┤
   │  WAVE 3 — Cross-Validation (1 brain)                   │
   │  ┌──────────┐                                          │
   │  │ Cross    │                                          │
   │  │ Validator│                                          │
   │  └──────────┘                                          │
   ├─────────────────────────────────────────────────────────┤
   │  WAVE 4 — Final Report (1 brain)                       │
   │  ┌──────────┐                                          │
   │  │ Report   │                                          │
   │  │ Writer   │                                          │
   │  └──────────┘                                          │
   └─────────────────────────────────────────────────────────┘
   ═══════════════════════════════════════════════════════════════ */

/**
 * Sanitize a user-supplied string before interpolating into an AI prompt.
 * 1. Converts to string
 * 2. Strips control characters (keeps \n and \t)
 * 3. Truncates to maxLen (default 500)
 */
function _sanitizeForPrompt(str, maxLen = 500) {
  const s = String(str ?? '');
  // Strip control chars except newline (0x0A) and tab (0x09)
  const cleaned = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

const SmartBrains = {

  VERSION: '5.0.0',

  // Debug logging — set to true to see key names, model details, retry info
  _debug: false,
  _log(...args) { if (this._debug) console.log(...args); },

  // Expose sanitizer as a static method for external callers
  _sanitizeForPrompt,

  // ═══════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════

  config: {
    // API keys are stored server-side as Cloudflare secrets (GEMINI_KEY_0 … GEMINI_KEY_17)
    // No keys in client code — all calls go through /api/ai/invoke proxy
    apiKeys: [],  // Empty — proxy handles key selection
    model: 'gemini-3.1-pro-preview',          // ALL brains use 3.1 Pro (original config that worked)
    accuracyModel: 'gemini-3.1-pro-preview',   // ALL brains use 3.1 Pro
    proModel: 'gemini-3.1-pro-preview',        // ALL brains use 3.1 Pro
    useProxy: true,                          // ENABLED — route all calls through server-side proxy
    proxyEndpoint: '/api/ai/invoke',
    maxRetries: 10,                          // Original: 10 retries with key rotation
    retryBaseDelay: 1500,
    timeout: 150000,                         // 2.5 min for standard brains
    proTimeout: 300000,                      // 5 min for Pro (deep reasoning)
    keySlots: 18,                            // Number of API key slots (GEMINI_KEY_0 … GEMINI_KEY_17)
    sseTimeoutMs: 60000,                     // SSE stream idle timeout
    jpegQuality: 0.85,                       // JPEG compression quality for drawing chunks
    inlineThresholdBytes: 15 * 1024 * 1024,  // 15 MB — above this, use File API upload
    chunkThresholdBytes: 45 * 1024 * 1024,   // Split PDFs over 45MB into chunks
  },


  // ═══════════════════════════════════════════════════════════
  // BRAIN REGISTRY — Each brain is a domain specialist
  // ═══════════════════════════════════════════════════════════

  BRAINS: {
    // ── Wave 0: Legend Pre-Processing + Spatial Layout (Gemini 3.1 Pro) ──
    LEGEND_DECODER: { id: 0, name: 'Legend Decoder', wave: 0, emoji: '📖', needsFiles: ['legends'], maxTokens: 65536, useProModel: true },
    SPATIAL_LAYOUT: { id: 0.5, name: 'Spatial Layout', wave: 0, emoji: '📐', needsFiles: ['plans'], maxTokens: 32768, useProModel: true },
    // ── Wave 1: First Read — Document Intelligence ──
    SYMBOL_SCANNER: { id: 1, name: 'Symbol Scanner', wave: 1, emoji: '🔍', needsFiles: ['legends', 'plans'], maxTokens: 65536, useProModel: true },
    CODE_COMPLIANCE: { id: 2, name: 'Code Compliance', wave: 1, emoji: '📋', needsFiles: ['plans', 'specs'], maxTokens: 65536, useProModel: true },
    MDF_IDF_ANALYZER: { id: 3, name: 'MDF/IDF Analyzer', wave: 1, emoji: '🏗️', needsFiles: ['plans', 'specs'], maxTokens: 65536, useProModel: true },
    CABLE_PATHWAY: { id: 4, name: 'Cable & Pathway', wave: 1, emoji: '🔌', needsFiles: ['plans', 'specs'], maxTokens: 65536, useProModel: true },
    SPECIAL_CONDITIONS: { id: 5, name: 'Special Conditions', wave: 1, emoji: '⚠️', needsFiles: ['plans', 'specs'], maxTokens: 65536, useProModel: true },
    SPEC_CROSS_REF: { id: 21, name: 'Spec Cross-Reference', wave: 1, emoji: '📑', needsFiles: ['plans', 'specs'], maxTokens: 65536, useProModel: true },
    ANNOTATION_READER: { id: 22, name: 'Annotation Reader', wave: 1, emoji: '💬', needsFiles: ['plans', 'specs'], maxTokens: 65536, useProModel: true },
    RISER_DIAGRAM_ANALYZER: { id: 23, name: 'Riser Diagram Analyzer', wave: 1, emoji: '📶', needsFiles: ['plans', 'specs'], maxTokens: 65536, useProModel: true },
    // ── Wave 1.5: Second Read — Independent Verification (all Gemini 3.1 Pro) ──
    SHADOW_SCANNER: { id: 6, name: 'Shadow Scanner', wave: 1.5, emoji: '👁️', needsFiles: ['legends', 'plans'], maxTokens: 65536, useProModel: true },
    DISCIPLINE_DEEP_DIVE: { id: 7, name: 'Discipline Deep-Dive', wave: 1.5, emoji: '🎯', needsFiles: ['legends', 'plans'], maxTokens: 65536, useProModel: true },
    QUADRANT_SCANNER: { id: 8, name: 'Quadrant Scanner', wave: 1.5, emoji: '📐', needsFiles: ['plans'], maxTokens: 65536, useProModel: true },
    ZOOM_SCANNER: { id: 24, name: 'Zoom Scanner', wave: 1.5, emoji: '🔭', needsFiles: ['legends', 'plans'], maxTokens: 65536, useProModel: true },
    PER_FLOOR_ANALYZER: { id: 25, name: 'Per-Floor Analyzer', wave: 1.5, emoji: '🏢', needsFiles: ['plans'], maxTokens: 65536, useProModel: true },
    // ── Wave 1.75: Consensus Resolution (Gemini 3.1 Pro deep reasoning) ──
    CONSENSUS_ARBITRATOR: { id: 9, name: 'Consensus Arbitrator', wave: 1.75, emoji: '⚖️', needsFiles: [], maxTokens: 65536, useProModel: true },
    TARGETED_RESCANNER: { id: 10, name: 'Targeted Re-Scanner', wave: 1.75, emoji: '🔬', needsFiles: ['legends', 'plans'], maxTokens: 65536, useProModel: true },
    // ── Wave 2: Material Pricing (must run BEFORE labor so labor can use material qtys) ──
    MATERIAL_PRICER: { id: 11, name: 'Material Pricer', wave: 2, emoji: '💰', needsFiles: [], maxTokens: 65536, useProModel: true },
    // ── Wave 2.25: Labor Calculator (runs AFTER Material Pricer to use its quantities) ──
    LABOR_CALCULATOR: { id: 12, name: 'Labor Calculator', wave: 2.25, emoji: '👷', needsFiles: [], maxTokens: 65536, useProModel: true },
    // ── Wave 2.5: Financial Engine (runs AFTER both Pricer & Labor to sum their outputs) ──
    FINANCIAL_ENGINE: { id: 13, name: 'Financial Engine', wave: 2.5, emoji: '📊', needsFiles: [], maxTokens: 65536, useProModel: true },
    // ── Wave 2.75: Reverse Verification (Gemini 3.1 Pro) ──
    REVERSE_VERIFIER: { id: 14, name: 'Reverse Verifier', wave: 2.75, emoji: '🔄', needsFiles: ['plans'], maxTokens: 65536, useProModel: true },
    // ── Wave 3: Adversarial Audit (Gemini 3.1 Pro deep reasoning) ──
    CROSS_VALIDATOR: { id: 15, name: 'Cross Validator', wave: 3, emoji: '✅', needsFiles: [], maxTokens: 65536, useProModel: true },
    DEVILS_ADVOCATE: { id: 16, name: "Devil's Advocate", wave: 3, emoji: '😈', needsFiles: ['plans'], maxTokens: 65536, useProModel: true },
    // ── Wave 3.5: 4th, 5th, 6th Read — Deep Accuracy Pass (3 brains, Pro model) ──
    DETAIL_VERIFIER: { id: 18, name: 'Detail Verifier', wave: 3.5, emoji: '🔎', needsFiles: ['legends', 'plans'], maxTokens: 65536, useProModel: true },
    CROSS_SHEET_ANALYZER: { id: 19, name: 'Cross-Sheet Analyzer', wave: 3.5, emoji: '📊', needsFiles: ['plans'], maxTokens: 65536, useProModel: true },
    OVERLAP_DETECTOR: { id: 26, name: 'Overlap Detector', wave: 3.5, emoji: '🔗', needsFiles: ['plans'], maxTokens: 65536, useProModel: true },
    // ── Wave 3.75: Final Reconciliation (1 brain, Pro deep reasoning) ──
    FINAL_RECONCILIATION: { id: 20, name: 'Final Reconciliation', wave: 3.75, emoji: '🏁', needsFiles: ['legends', 'plans'], maxTokens: 65536, useProModel: true },
    // ── Wave 3.85: Estimate Correction (1 brain, Pro — corrects pricing/quantities based on verification findings) ──
    ESTIMATE_CORRECTOR: { id: 27, name: 'Estimate Corrector', wave: 3.85, emoji: '🔧', needsFiles: [], maxTokens: 65536, useProModel: true },
    // ── Wave 4: Final Report (Gemini 3.1 Pro for comprehensive bid generation) ──
    REPORT_WRITER: { id: 17, name: 'Report Synthesizer', wave: 4, emoji: '📝', needsFiles: [], maxTokens: 65536, useProModel: true },
  },

  // Brain status tracking for UI
  _brainStatus: {},

  // ═══════════════════════════════════════════════════════════
  // FILE ENCODING — Encode once, distribute to brains
  // Files > 15MB uploaded via Gemini File API (supports up to 2GB)
  // Files ≤ 15MB sent as inline base64 (faster, no upload needed)
  // ═══════════════════════════════════════════════════════════

  async _encodeAllFiles(state, progressCallback) {
    const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB per file (Gemini File API)
    const INLINE_THRESHOLD = this.config.inlineThresholdBytes;

    const fileGroups = {
      legends: state.legendFiles || [],
      plans: state.planFiles || [],
      specs: state.specFiles || [],
      addenda: state.addendaFiles || [],
    };

    const encoded = { legends: [], plans: [], specs: [], addenda: [] };
    const supportedTypes = [
      'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
      'image/gif', 'image/tiff', 'text/plain',
    ];
    const mimeMap = {
      pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg',
      jpeg: 'image/jpeg', tif: 'image/tiff', tiff: 'image/tiff',
      txt: 'text/plain', webp: 'image/webp',
    };

    let totalFiles = 0;
    let processedFiles = 0;
    for (const files of Object.values(fileGroups)) totalFiles += files.filter(f => f.rawFile).length;

    for (const [category, files] of Object.entries(fileGroups)) {
      for (const entry of files) {
        if (!entry.rawFile) continue;
        processedFiles++;
        const pct = Math.round((processedFiles / totalFiles) * 15);
        progressCallback(pct, `Encoding ${category}: ${entry.name}…`, null);

        if (entry.rawFile.size > MAX_FILE_SIZE) {
          console.warn(`[SmartBrains] Skipping oversized file (>2GB): ${entry.name}`);
          continue;
        }

        try {
          const { base64, mimeType } = await this._fileToBase64(entry.rawFile);
          const ext = entry.name.toLowerCase().split('.').pop();
          const finalMime = mimeMap[ext] || mimeType;

          const isSupported = supportedTypes.some(t =>
            finalMime.startsWith(t.split('/')[0])) || finalMime === 'application/pdf';

          if (isSupported) {
            const fileData = {
              name: entry.name,
              category,
              mimeType: finalMime,
              size: entry.rawFile.size,
            };

            // Large files → split into chunks then upload each via File API
            if (entry.rawFile.size > INLINE_THRESHOLD) {
              const CHUNK_THRESHOLD = this.config.chunkThresholdBytes;
              const PAGES_PER_CHUNK = 30;
              const fileSizeMB = Math.round(entry.rawFile.size / 1024 / 1024);

              // Try chunking large PDFs using PDF.js
              if (finalMime === 'application/pdf' && entry.rawFile.size > CHUNK_THRESHOLD && typeof pdfjsLib !== 'undefined') {
                progressCallback(pct, `Splitting large PDF: ${entry.name} (${fileSizeMB} MB)…`, null);
                this._log(`[SmartBrains] Splitting ${entry.name} (${fileSizeMB} MB) into ${PAGES_PER_CHUNK}-page chunks…`);

                try {
                  const chunks = await this._splitPDFIntoChunks(entry.rawFile, PAGES_PER_CHUNK);
                  this._log(`[SmartBrains] Split ${entry.name} into ${chunks.length} chunks`);

                  let chunkIdx = 0;
                  for (const chunk of chunks) {
                    chunkIdx++;
                    const chunkName = `${entry.name.replace('.pdf', '')}_chunk${chunkIdx}.jpg`;
                    const chunkMime = chunk.type || 'image/jpeg'; // Chunks are rendered as JPEG
                    progressCallback(pct, `Uploading chunk ${chunkIdx}/${chunks.length}: ${chunkName} (${Math.round(chunk.size / 1024 / 1024)} MB)…`, null);

                    const chunkData = {
                      name: chunkName,
                      category,
                      mimeType: chunkMime,
                      size: chunk.size,
                      _isChunk: true,
                      _chunkIndex: chunkIdx,
                      _totalChunks: chunks.length,
                      _originalName: entry.name,
                    };

                    try {
                      const uploadResult = await this._uploadToFileAPI(chunk, chunkMime, chunkName);
                      if (uploadResult && uploadResult.fileUri) {
                        let cleanUri = uploadResult.fileUri;
                        const proxyMatch = cleanUri.match(/___(\s*https?:\/\/[^_]+)___/);
                        if (proxyMatch) { cleanUri = proxyMatch[1].trim(); }
                        if (!/^https:\/\//.test(cleanUri)) {
                          console.warn(`[SmartBrains] Rejecting non-https File URI for chunk: ${cleanUri}`);
                          const chunkB64 = await this._fileToBase64(chunk);
                          chunkData.base64 = chunkB64.base64;
                        } else {
                          chunkData.fileUri = cleanUri;
                          chunkData.uploadedName = uploadResult.name;
                          chunkData._usedKeyName = uploadResult._usedKeyName;
                          this._log(`[SmartBrains] ✓ Uploaded chunk ${chunkIdx}/${chunks.length}: ${chunkName} → ${cleanUri}`);
                        }
                      } else {
                        // Fallback: send chunk as inline base64
                        const chunkB64 = await this._fileToBase64(chunk);
                        chunkData.base64 = chunkB64.base64;
                        console.warn(`[SmartBrains] Chunk ${chunkIdx} upload failed, using inline`);
                      }
                    } catch (chunkErr) {
                      const chunkB64 = await this._fileToBase64(chunk);
                      chunkData.base64 = chunkB64.base64;
                      console.warn(`[SmartBrains] Chunk ${chunkIdx} upload error, using inline:`, chunkErr.message);
                    }
                    encoded[category].push(chunkData);
                  }
                  // DON'T include the full PDF as inline — it's too large (57MB = 77MB base64)
                  // The chunks cover all pages. Skip adding the parent fileData entry.
                  this._log(`[SmartBrains] ✓ All ${chunks.length} chunks uploaded. Skipping full-file inline (${fileSizeMB} MB too large).`);
                  continue; // Skip the normal upload path — chunks are sufficient
                } catch (splitErr) {
                  console.warn(`[SmartBrains] PDF splitting failed for ${entry.name}, using single upload:`, splitErr.message);
                  // Fall through to single upload
                }
              }

              // Single file upload (non-PDF, or splitting failed, or under chunk threshold)
              progressCallback(pct, `Uploading large file: ${entry.name} (${fileSizeMB} MB)…`, null);
              const uploadContainer = document.getElementById('upload-progress-container');
              if (uploadContainer) uploadContainer.style.display = 'block';
              this._log(`[SmartBrains] Uploading ${entry.name} (${fileSizeMB} MB) via File API…`);

              try {
                const uploadResult = await this._uploadToFileAPI(entry.rawFile, finalMime, entry.name);
                if (uploadResult && uploadResult.fileUri) {
                  let cleanUri = uploadResult.fileUri;
                  const proxyMatch = cleanUri.match(/___(\s*https?:\/\/[^_]+)___/);
                  if (proxyMatch) {
                    cleanUri = proxyMatch[1].trim();
                    console.warn(`[SmartBrains] Fixed proxy-mangled File URI → ${cleanUri}`);
                  }
                  if (!/^https:\/\//.test(cleanUri)) {
                    console.warn(`[SmartBrains] Rejecting non-https File URI: ${cleanUri}`);
                    const fb64 = await this._fileToBase64(entry.rawFile);
                    fileData.base64 = fb64.base64;
                  } else {
                    fileData.fileUri = cleanUri;
                    fileData.uploadedName = uploadResult.name;
                    fileData._usedKeyName = uploadResult._usedKeyName;
                  }
                  this._log(`[SmartBrains] ✓ Uploaded ${entry.name} → ${cleanUri} (key: ${uploadResult._usedKeyName})`);
                } else {
                  console.warn(`[SmartBrains] File API upload returned no URI, falling back to inline for ${entry.name}`);
                  fileData.base64 = base64;
                }
              } catch (uploadErr) {
                console.warn(`[SmartBrains] File API upload failed for ${entry.name}, falling back to inline:`, uploadErr.message);
                fileData.base64 = base64;
              }
              // Hide upload progress bar after each file
              const uploadContainerDone = document.getElementById('upload-progress-container');
              if (uploadContainerDone) uploadContainerDone.style.display = 'none';
            } else {
              // Small files → inline base64 (faster)
              fileData.base64 = base64;
            }

            // PDF text extraction for specs (dual-channel accuracy)
            if (finalMime === 'application/pdf' && category === 'specs' && typeof pdfjsLib !== 'undefined') {
              try {
                const text = await extractPDFText(entry.rawFile);
                if (text && text.length > 100) {
                  fileData.extractedText = text.substring(0, 15000);
                }
              } catch (e) { console.warn(`[SmartBrains] PDF text extraction failed for ${entry.name}:`, e.message); }
            }

            encoded[category].push(fileData);
          }
        } catch (err) {
          console.warn(`[SmartBrains] Failed to encode ${entry.name}:`, err.message);
        }
      }
    }

    return encoded;
  },

  // Upload file to Gemini File API via server-side proxy
  // FIX: Server expects multipart/form-data (request.formData()), NOT JSON with base64.
  // Sending the raw File object avoids the ~33% base64 overhead for large PDFs.
  async _uploadToFileAPI(rawFile, mimeType, fileName) {
    const formData = new FormData();
    formData.append('file', rawFile, fileName);

    // Use XHR for upload progress on large files (> 5MB)
    const result = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/ai/upload');
      // SEC: Include auth headers for AI proxy authentication
      if (typeof _sessionToken !== 'undefined' && _sessionToken) xhr.setRequestHeader('X-Session-Token', _sessionToken);
      if (typeof _appToken !== 'undefined' && _appToken) xhr.setRequestHeader('X-App-Token', _appToken);

      // Track upload progress
      if (rawFile.size > 5 * 1024 * 1024) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            const uploadBar = document.getElementById('upload-progress-bar');
            const uploadText = document.getElementById('upload-progress-text');
            if (uploadBar) uploadBar.style.width = pct + '%';
            if (uploadText) uploadText.textContent = `Uploading ${fileName}: ${pct}% (${Math.round(e.loaded / 1024 / 1024)}/${Math.round(e.total / 1024 / 1024)} MB)`;
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch { reject(new Error('Invalid JSON response from upload')); }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.error || `Upload failed: ${xhr.status}`));
          } catch { reject(new Error(`Upload failed: ${xhr.status}`)); }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.ontimeout = () => reject(new Error('Upload timed out'));
      xhr.timeout = 300000; // 5 min timeout for large uploads
      xhr.send(formData);
    });

    // ── Poll for file readiness (large files enter PROCESSING state) ──
    // Gemini returns 400 INVALID_ARGUMENT if you use a file that's still PROCESSING
    // IMPORTANT: Check for ANY state that isn't 'ACTIVE' — including undefined/null
    if (result.state !== 'ACTIVE' && result.name) {
      this._log(`[SmartBrains] File ${fileName} state is "${result.state || 'unknown'}" — polling until ACTIVE…`);
      const maxWaitMs = 120000; // 2 minutes max
      const pollIntervalMs = 3000; // Check every 3 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitMs) {
        await new Promise(r => setTimeout(r, pollIntervalMs));
        try {
          const _authHdrs = {};
          if (typeof _sessionToken !== 'undefined' && _sessionToken) _authHdrs['X-Session-Token'] = _sessionToken;
          if (typeof _appToken !== 'undefined' && _appToken) _authHdrs['X-App-Token'] = _appToken;
          const checkResponse = await fetch(`/api/ai/file-status?name=${encodeURIComponent(result.name)}&key=${encodeURIComponent(result._usedKeyName || '')}`, { headers: _authHdrs });
          if (checkResponse.ok) {
            const status = await checkResponse.json();
            if (status.state === 'ACTIVE') {
              this._log(`[SmartBrains] ✓ File ${fileName} is now ACTIVE (waited ${Math.round((Date.now() - startTime) / 1000)}s)`);
              result.state = 'ACTIVE';
              break;
            }
            this._log(`[SmartBrains] File ${fileName} still ${status.state || 'unknown'}… (${Math.round((Date.now() - startTime) / 1000)}s)`);
          }
        } catch (e) {
          console.warn(`[SmartBrains] File status check failed:`, e.message);
        }
      }

      if (result.state !== 'ACTIVE') {
        console.warn(`[SmartBrains] File ${fileName} did not become ACTIVE within ${maxWaitMs / 1000}s — proceeding anyway`);
      }
    } else if (result.state === 'ACTIVE') {
      this._log(`[SmartBrains] File ${fileName} is immediately ACTIVE — no wait needed`);
    }

    return result;
  },

  _fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, mimeType: file.type || 'application/octet-stream' });
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  },

  // Split a large PDF into smaller chunk files using PDF.js
  async _splitPDFIntoChunks(rawFile, pagesPerChunk) {
    const arrayBuffer = await rawFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    const chunks = [];

    // For each chunk of pages, render to a new PDF-like blob
    // Since PDF.js can't create PDFs, we split the raw bytes by uploading page ranges
    // Alternative: create image-based chunks from rendered pages
    const chunkCount = Math.ceil(totalPages / pagesPerChunk);
    this._log(`[SmartBrains] PDF has ${totalPages} pages → ${chunkCount} chunks of ~${pagesPerChunk} pages`);

    // Strategy: slice the original file into byte-range chunks
    // This won't create valid standalone PDFs, so instead we render pages to canvas → PNG → blob
    for (let c = 0; c < chunkCount; c++) {
      const startPage = c * pagesPerChunk + 1;
      const endPage = Math.min((c + 1) * pagesPerChunk, totalPages);

      // Render pages to images and combine into a single blob
      const canvases = [];
      for (let p = startPage; p <= endPage; p++) {
        try {
          const page = await pdf.getPage(p);
          const scale = 2.0; // 2x for readable text
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;
          canvases.push(canvas);
        } catch (e) {
          console.warn(`[SmartBrains] Failed to render page ${p}:`, e.message);
        }
      }

      if (canvases.length === 0) continue;

      // Combine canvases into a single tall image
      const totalHeight = canvases.reduce((h, c) => h + c.height, 0);
      const maxWidth = Math.max(...canvases.map(c => c.width));
      const combined = document.createElement('canvas');
      combined.width = maxWidth;
      combined.height = Math.min(totalHeight, 32000); // Canvas height limit
      const ctx = combined.getContext('2d');
      let y = 0;
      for (const c of canvases) {
        if (y + c.height > combined.height) break;
        ctx.drawImage(c, 0, y);
        y += c.height;
      }

      // Convert to JPEG blob (much smaller than PNG for drawings)
      const blob = await new Promise(resolve => combined.toBlob(resolve, 'image/jpeg', this.config.jpegQuality));
      if (blob) {
        // Create a File object so it works with _uploadToFileAPI
        const chunkFile = new File([blob], `chunk_${c + 1}.jpg`, { type: 'image/jpeg' });
        chunks.push(chunkFile);
        this._log(`[SmartBrains] Chunk ${c + 1}: pages ${startPage}-${endPage} → ${Math.round(blob.size / 1024)} KB JPEG`);
      }
    }

    pdf.destroy();
    return chunks;
  },

  // ═══════════════════════════════════════════════════════════
  // BUILD FILE PARTS — For a specific brain
  // Supports both inline base64 and Gemini File API URIs
  // ═══════════════════════════════════════════════════════════

  _buildFileParts(brainDef, encodedFiles) {
    // Supported MIME types for Gemini API
    const SUPPORTED_MIMES = new Set([
      'application/pdf',
      'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
      'text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript',
      'application/json', 'application/xml',
    ]);

    const parts = [];
    for (const category of brainDef.needsFiles) {
      const files = encodedFiles[category] || [];
      for (const f of files) {
        // Skip unsupported file types (Word, Excel, PowerPoint, etc.)
        if (f.mimeType && !SUPPORTED_MIMES.has(f.mimeType) && !f.fileUri) {
          console.warn(`[SmartBrains] Skipping unsupported file: ${f.name} (${f.mimeType})`);
          // Still include extracted text if available
          if (f.extractedText) {
            parts.push({ text: `\n--- FILE: ${f.name} (${f.category}) ---` });
            parts.push({ text: `\n[EXTRACTED TEXT FROM ${f.name}]\n${f.extractedText}` });
          }
          continue;
        }

        parts.push({ text: `\n--- FILE: ${f.name} (${f.category}) ---` });

        if (f.fileUri) {
          // File uploaded via Gemini File API — reference by URI
          const part = { fileData: { mimeType: f.mimeType, fileUri: f.fileUri } };
          if (f._usedKeyName) part._usedKeyName = f._usedKeyName; // Track upload key
          parts.push(part);
        } else if (f.base64) {
          // Small file — inline base64
          parts.push({ inline_data: { mime_type: f.mimeType, data: f.base64 } });
        }

        if (f.extractedText) {
          parts.push({ text: `\n[EXTRACTED TEXT FROM ${f.name}]\n${f.extractedText}` });
        }
      }
    }
    return parts;
  },

  // ═══════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════
  // SSE STREAM READER — Shared implementation for all SSE reading
  // ═══════════════════════════════════════════════════════════

  async _readSSEStream(response, brainName, { timeoutMs = 60000, onProxyError = null, trackUsage = false } = {}) {
    const contentType = response.headers.get('content-type') || '';
    let text = '';
    let thoughtText = '';

    if (contentType.includes('text/event-stream')) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await Promise.race([
          reader.read(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('SSE_IDLE_TIMEOUT')), timeoutMs)
          ),
        ]).catch(err => {
          if (err.message === 'SSE_IDLE_TIMEOUT') {
            reader.cancel();
            throw Object.assign(new Error(`SSE stream idle timeout — no data received for ${timeoutMs / 1000}s`), { _retryable: true, status: 504 });
          }
          throw err;
        });
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        if (buffer.length > 10_000_000) {
            throw new Error('SSE response exceeded 10MB buffer limit');
        }

        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          // SSE comments (keepalive) start with ':' — skip silently
          if (line.startsWith(':')) continue;

          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const chunk = JSON.parse(jsonStr);

              // Check for proxy error events
              if (chunk._proxyError) {
                if (onProxyError) {
                  onProxyError(chunk); // Let caller handle specific proxy error logic
                } else {
                  // Default: break on 500+, skip others
                  if ((chunk.status || 500) >= 500) break;
                  continue;
                }
              }

              // Track token usage if requested
              if (trackUsage && chunk.usageMetadata) {
                const um = chunk.usageMetadata;
                const cached = um.cachedContentTokenCount || 0;
                const prompt = um.promptTokenCount || 0;
                const output = um.candidatesTokenCount || 0;
                const fresh = prompt - cached;
                const cost = (cached * 0.00025 + fresh * 0.0025 + output * 0.01) / 1000;
                const savings = cached > 0 ? ((cached * (0.0025 - 0.00025)) / 1000) : 0;
                if (!this._sessionCost) this._sessionCost = { totalCost: 0, totalSavings: 0, totalCached: 0, totalFresh: 0, totalOutput: 0, brainCalls: 0 };
                this._sessionCost.totalCost += cost;
                this._sessionCost.totalSavings += savings;
                this._sessionCost.totalCached += cached;
                this._sessionCost.totalFresh += fresh;
                this._sessionCost.totalOutput += output;
                this._sessionCost.brainCalls++;
                if (cached > 0) {
                  this._log(`[Brain:${brainName}] Tokens: ${prompt} prompt (${cached} CACHED/${fresh} fresh) + ${output} output = $${cost.toFixed(4)} (saved $${savings.toFixed(4)})`);
                }
              }

              const chunkParts = chunk?.candidates?.[0]?.content?.parts || [];
              for (const p of chunkParts) {
                if (p.text && p.thought) {
                  thoughtText += p.text;
                } else if (p.text) {
                  text += p.text;
                }
              }
            } catch (e) {
              if (e._retryable) throw e;
              if (e instanceof Error && e.message?.startsWith('Proxy error')) throw e;
              // Otherwise skip malformed SSE chunks
            }
          }
        }
      }
    } else {
      // Non-streaming fallback (plain JSON response)
      const data = await response.json();
      const allParts = data?.candidates?.[0]?.content?.parts || [];
      text = allParts.filter(p => p.text && !p.thought).map(p => p.text).join('\n') || '';
      if (!text) {
        thoughtText = allParts.filter(p => p.text && p.thought).map(p => p.text).join('\n') || '';
      }
    }

    return { text, thoughtText };
  },

  // BRAIN INVOCATION — Call Gemini with retry & key rotation
  // ═══════════════════════════════════════════════════════════

  async _invokeBrain(brainKey, brainDef, promptText, fileParts, useJsonMode) {
    const maxRetries = this.config.maxRetries;
    let lastError = null;

    // Determine model and URL up front (accessible in fallback block)
    let modelName = brainDef.useProModel ? (this.config.proModel || this.config.model) : (brainDef.useAccuracyModel && this.config.accuracyModel) ? this.config.accuracyModel : this.config.model;
    const url = this.config.proxyEndpoint;

    // Check for uploaded file URIs — needed for key pinning in both main loop and fallback
    const hasUploadedFiles = fileParts.some(p => p.fileData?.fileUri);

    // ── Model compatibility: gemini-3.1-pro-preview does NOT support fileData (File API) ──
    // Auto-downgrade to gemini-2.5-pro for brains that reference uploaded files
    if (hasUploadedFiles && modelName.includes('3.1-pro-preview')) {
      this._log(`[Brain:${brainDef.name}] Auto-switching from ${modelName} → gemini-2.5-pro (3.1 preview doesn't support File API references)`);
      modelName = 'gemini-2.5-pro';
    }

    // ── Key Selection (resolved once, used by both retry loop AND fallback) ──
    // Files uploaded via Gemini File API are owned by the uploading API key.
    // The upload response includes _usedKeyName so we can use the EXACT same key.
    // This distributes load naturally — each upload picks its own key,
    // and the brain invoke uses that same key to read the file.
    let uploadKeyName = null;
    if (hasUploadedFiles) {
      for (const p of fileParts) {
        if (p._usedKeyName) { uploadKeyName = p._usedKeyName; break; }
      }
    }

    // Strip internal metadata (_usedKeyName) from file parts before sending to Gemini API
    // These fields are for internal key-pinning only — Gemini rejects unknown fields with 400
    const cleanFileParts = fileParts.map(p => {
      if (p._usedKeyName) {
        const { _usedKeyName, ...rest } = p;
        return rest;
      }
      return p;
    });

    let _fileDataStripped = false;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // If a previous attempt got 400 with fileData, strip file references and use inline only
      let activeParts = cleanFileParts;
      if (_fileDataStripped) {
        activeParts = cleanFileParts.filter(p => !p.fileData);
        console.warn(`[Brain:${brainDef.name}] Retrying WITHOUT fileData (inline_data only) — attempt ${attempt + 1}`);
      }
      const hasFileData = activeParts.some(p => p.fileData);
      const parts = [{ text: promptText }, ...activeParts];
      // Temperature: 0 for cost-critical brains (deterministic pricing),
      // 0.05 for validators, 0.1 for everything else
      const DETERMINISTIC_BRAINS = ['MATERIAL_PRICER', 'LABOR_CALCULATOR', 'FINANCIAL_ENGINE', 'ESTIMATE_CORRECTOR'];
      const LOW_TEMP_BRAINS = ['CROSS_VALIDATOR', 'CONSENSUS_ARBITRATOR', 'TARGETED_RESCANNER'];
      const genConfig = {
        temperature: DETERMINISTIC_BRAINS.includes(brainKey) ? 0 : LOW_TEMP_BRAINS.includes(brainKey) ? 0.05 : 0.1,
        maxOutputTokens: brainDef.maxTokens,
      };
      if (useJsonMode) {
        genConfig.responseMimeType = 'application/json';
      }
      // NOTE: thinkingConfig disabled — causes Cloudflare 524 timeouts (>100s)
      // Gemini 3.1 Pro produces excellent results without thinking mode
      // thinkingConfig is also MUTUALLY EXCLUSIVE with JSON mode (responseMimeType)

      // keySlot is still used as fallback if _uploadKeyName is not available
      let keySlot;
      if (hasUploadedFiles && !uploadKeyName) {
        // Fallback: pin to slot 0 if key name wasn't tracked
        keySlot = 0;
      } else {
        // No uploaded files — safe to rotate across all keys
        keySlot = (brainDef.id + attempt) % this.config.keySlots;
      }

      // If context cache is available, use it instead of sending files
      // Remove fileData parts since they're already in the cache
      let finalParts = parts;
      const useCache = this._contextCache && hasUploadedFiles;
      if (useCache) {
        finalParts = parts.filter(p => !p.fileData); // Strip file references — they're in the cache
      }

      const body = {
        contents: [{ parts: finalParts }],
        generationConfig: genConfig,
        _model: useCache ? this._contextCache.model : modelName,
        _brainSlot: keySlot,
        ...(useCache ? { _cacheName: this._contextCache.name, _uploadKeyName: this._contextCache.keyName } : (uploadKeyName ? { _uploadKeyName: uploadKeyName } : {})),
      };

      // ── DIAGNOSTIC: Log parts structure on first attempt ──
      if (attempt === 0) {
        const partSummary = parts.map((p, i) => {
          if (p.text) return `  [${i}] text (${p.text.length} chars)`;
          if (p.fileData) return `  [${i}] fileData: ${p.fileData.fileUri} (mime: ${p.fileData.mimeType})`;
          if (p.inline_data) return `  [${i}] inline_data (mime: ${p.inline_data.mime_type}, ${Math.round((p.inline_data.data?.length || 0) / 1024)}KB b64)`;
          if (p.inlineData) return `  [${i}] inlineData (mime: ${p.inlineData.mimeType}, ${Math.round((p.inlineData.data?.length || 0) / 1024)}KB b64)`;
          return `  [${i}] UNKNOWN: ${JSON.stringify(Object.keys(p))}`;
        });
        this._log(`[Brain:${brainDef.name}] Request parts (${parts.length}):\n${partSummary.join('\n')}`);
        this._log(`[Brain:${brainDef.name}] JSON mode: ${useJsonMode}, model: ${modelName}, uploadKey: ${uploadKeyName || 'none'}`);
      }

      const controller = new AbortController();
      // Increase timeout for streaming — data arrives in chunks, so we need more wall-clock time
      const timeoutMs = brainDef.useProModel ? (this.config.proTimeout || this.config.timeout) * 2 : this.config.timeout * 2;
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const _invokeHeaders = { 'Content-Type': 'application/json' };
        if (typeof _sessionToken !== 'undefined' && _sessionToken) _invokeHeaders['X-Session-Token'] = _sessionToken;
        if (typeof _appToken !== 'undefined' && _appToken) _invokeHeaders['X-App-Token'] = _appToken;
        const response = await fetch(url, {
          method: 'POST',
          headers: _invokeHeaders,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);

        // The zero-timeout proxy always returns 200 with SSE stream.
        // Errors come through as _proxyError events in the stream.
        // Non-proxy responses (direct API) may still return error codes.
        if (response.status === 429 || response.status === 403 || response.status >= 500) {
          const nextSlot = (brainDef.id + attempt + 1) % this.config.keySlots;
          const delay = this.config.retryBaseDelay * Math.pow(2, attempt) + Math.random() * 500;
          console.warn(`[Brain:${brainDef.name}] API ${response.status}, rotating to key slot ${nextSlot}, retrying in ${Math.round(delay)}ms`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `API ${response.status}`);
        }

        // ── Read SSE stream and assemble response ──
        const { text, thoughtText } = await this._readSSEStream(response, brainDef.name, {
          timeoutMs: this.config.sseTimeoutMs,
          trackUsage: true,
          onProxyError: (chunk) => {
            const errStatus = chunk.status || 500;
            if (errStatus === 429 || errStatus === 403 || errStatus >= 500) {
              throw Object.assign(new Error(chunk.message || `API ${errStatus}`), { _retryable: true, status: errStatus });
            }
            if (chunk._debug) console.error(`[Brain:${brainDef.name}] Google 400 detail: ${chunk._debug}`);
            if (errStatus === 400 && hasFileData) {
              throw Object.assign(new Error('fileData rejected — will retry with inline_data only'), { _retryable: true, _stripFileData: true, status: 400 });
            }
            throw new Error(`Proxy error ${errStatus}: ${chunk.message || 'Unknown'}`);
          },
        });

        // If regular text is empty but we got thinking content, use that
        if ((!text || text.length < 20) && thoughtText.length >= 20) {
          console.warn(`[Brain:${brainDef.name}] Response was thought-only (${thoughtText.length} chars thinking, ${text.length} chars regular) — using thinking content`);
          text = thoughtText;
        }

        if (!text || text.length < 20) {
          console.warn(`[Brain:${brainDef.name}] Empty response — text: ${text.length} chars, thought: ${thoughtText.length} chars, attempt ${attempt + 1}`);
          throw new Error('Empty response from AI');
        }

        this._log(`[Brain:${brainDef.name}] ✓ Complete (${text.length} chars, attempt ${attempt + 1})`);
        return text;

      } catch (err) {
        clearTimeout(timer);
        lastError = err;
        if (err._retryable) {
          if (err._stripFileData && !_fileDataStripped) {
            _fileDataStripped = true;
            console.warn(`[Brain:${brainDef.name}] fileData rejected by Google — will retry with inline_data only`);
          }
          // Error from zero-timeout proxy — retryable (429/403/500+)
          const nextSlot = (brainDef.id + attempt + 1) % this.config.keySlots;
          console.warn(`[Brain:${brainDef.name}] Proxy reported API ${err.status}, rotating to key slot ${nextSlot}, retrying…`);
        } else if (err.name === 'AbortError') {
          console.warn(`[Brain:${brainDef.name}] Timeout, attempt ${attempt + 1}`);
        }
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, Math.min(this.config.retryBaseDelay * Math.pow(2, attempt), 15000)));
        }
      }
    }

    // ── Model Fallback: If primary model failed, try alternative models ──
    const fallbackModels = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    const triedModel = modelName;
    for (const fbModel of fallbackModels) {
      if (fbModel === triedModel) continue; // skip the one that already failed
      console.warn(`[Brain:${brainDef.name}] ${triedModel} failed — falling back to ${fbModel}`);
      const ctrl = new AbortController();
      const tmr = setTimeout(() => ctrl.abort(), this.config.timeout);
      try {
        const fbParts = [{ text: promptText }, ...cleanFileParts.filter(p => !p.fileData)];
        const fbGenConfig = { temperature: 0.2, maxOutputTokens: 16384 };
        if (brainDef.jsonMode) fbGenConfig.responseMimeType = 'application/json';
        const fbBody = { contents: [{ parts: fbParts }], generationConfig: fbGenConfig, _model: fbModel, _brainSlot: brainDef.id % this.config.keySlots };
        if (uploadKeyName) fbBody._uploadKeyName = uploadKeyName;
        const _fbHeaders = { 'Content-Type': 'application/json' };
        if (typeof _sessionToken !== 'undefined' && _sessionToken) _fbHeaders['X-Session-Token'] = _sessionToken;
        if (typeof _appToken !== 'undefined' && _appToken) _fbHeaders['X-App-Token'] = _appToken;
        const fbResp = await fetch('/api/ai/invoke', { method: 'POST', headers: _fbHeaders, body: JSON.stringify(fbBody), signal: ctrl.signal });
        clearTimeout(tmr);
        const { text: fbText, thoughtText: fbThought } = await this._readSSEStream(fbResp, brainDef.name, {
          timeoutMs: this.config.sseTimeoutMs,
        });
                if (fbText && fbText.length >= 20) {
          this._log(`[Brain:${brainDef.name}] ✓ Fallback ${fbModel} succeeded (${fbText.length} chars)`);
          return fbText;
        }
        console.warn(`[Brain:${brainDef.name}] Fallback ${fbModel} returned empty`);
      } catch (fbErr) {
        clearTimeout(tmr);
        console.warn(`[Brain:${brainDef.name}] Fallback ${fbModel} failed: ${fbErr.message}`);
      }
    }

    throw new Error(`Brain "${brainDef.name}" failed after ${maxRetries} attempts: ${lastError?.message}`);
  },

  // Safe JSON parser — hardened for production (7 recovery strategies)
  _parseJSON(text) {
    if (!text || typeof text !== 'string') return null;
    const cleaned = text.trim();
    
    // Helper: strip trailing commas before } or ] (common AI hallucination)
    const fixTrailingCommas = (s) => s.replace(/,\s*([}\]])/g, '$1');
    
    // Helper: strip control characters and fix unescaped newlines inside JSON strings
    const sanitizeJSON = (s) => {
      // Replace literal newlines/tabs inside string values with escaped versions
      return s.replace(/(["'])(?:(?!\1)[\s\S])*?\1/g, (match) => {
        return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
      }).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ''); // Strip control chars
    };
    
    // Helper: fix unquoted keys (e.g., {key: "value"} → {"key": "value"})
    const fixUnquotedKeys = (s) => s.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    // Strategy 1: Direct parse
    try { return JSON.parse(cleaned); } catch { /* fall through */ }
    
    // Strategy 2: Trailing comma fix
    try { const r = JSON.parse(fixTrailingCommas(cleaned)); r._recoveryUsed = 2; return r; } catch { /* fall through */ }
    
    // Strategy 3: Markdown code block extraction
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      const inner = match[1].trim();
      try { const r = JSON.parse(inner); r._recoveryUsed = 3; return r; } catch { /* fall through */ }
      try { const r = JSON.parse(fixTrailingCommas(inner)); r._recoveryUsed = 3; return r; } catch { /* fall through */ }
    }
    
    // Strategy 4: First { to last } extraction
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const extracted = cleaned.substring(start, end + 1);
      try { const r = JSON.parse(extracted); r._recoveryUsed = 4; return r; } catch { /* fall through */ }
      try { const r = JSON.parse(fixTrailingCommas(extracted)); r._recoveryUsed = 4; return r; } catch { /* fall through */ }
      
      // Strategy 5: Sanitize control characters + retry
      try { const r = JSON.parse(sanitizeJSON(extracted)); r._recoveryUsed = 5; return r; } catch { /* fall through */ }
      try { const r = JSON.parse(fixTrailingCommas(sanitizeJSON(extracted))); r._recoveryUsed = 5; return r; } catch { /* fall through */ }
      
      // Strategy 6: Fix unquoted keys + retry
      try { const r = JSON.parse(fixUnquotedKeys(fixTrailingCommas(sanitizeJSON(extracted)))); r._recoveryUsed = 6; return r; } catch { /* fall through */ }
    }
    
    // Strategy 7: Line-by-line brace matching (handles truncated responses)
    try {
      const lines = cleaned.split('\n');
      let depth = 0;
      let startIdx = -1;
      let endIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        for (const ch of lines[i]) {
          if (ch === '{' || ch === '[') {
            if (depth === 0) startIdx = i;
            depth++;
          } else if (ch === '}' || ch === ']') {
            depth--;
            if (depth === 0) { endIdx = i; break; }
          }
        }
        if (endIdx >= 0) break;
      }
      if (startIdx >= 0 && endIdx >= startIdx) {
        const block = lines.slice(startIdx, endIdx + 1).join('\n');
        try { const r = JSON.parse(block); r._recoveryUsed = 7; return r; } catch { /* fall through */ }
        try { const r = JSON.parse(fixTrailingCommas(block)); r._recoveryUsed = 7; return r; } catch { /* fall through */ }
      }
    } catch { /* fall through */ }
    
    // Strategy 8: Truncation recovery — auto-close braces for truncated responses
    // Handles: missing values after colons, partial strings, partial numbers, etc.
    try {
      const truncStart = cleaned.indexOf('{');
      if (truncStart >= 0) {
        let truncated = cleaned.substring(truncStart);
        
        // Aggressively strip trailing broken content (iterate until stable)
        let prev = '';
        while (prev !== truncated) {
          prev = truncated;
          truncated = truncated
            .replace(/,\s*"[^"]*$/, '')            // trailing incomplete string: , "partial...
            .replace(/,\s*$/, '')                   // trailing comma
            .replace(/"[^"]*":\s*$/, '')            // trailing key with no value: "key":
            .replace(/"[^"]*":\s*"[^"]*$/, '')      // trailing key with incomplete string value: "key": "val...
            .replace(/"[^"]*":\s*\d+\.?\d*$/, '')   // trailing key with partial number: "key": 12
            .replace(/,\s*$/, '')                   // cleanup any new trailing commas
            .replace(/:\s*$/, '')                   // orphaned colon
            .replace(/"[^"]*$/, '')                 // trailing partial key name
            .replace(/,\s*$/, '');                  // final comma cleanup
        }
        
        // Count open brackets/braces and close them
        let openBraces = 0, openBrackets = 0;
        let inString = false, escape = false;
        for (const ch of truncated) {
          if (escape) { escape = false; continue; }
          if (ch === '\\') { escape = true; continue; }
          if (ch === '"') { inString = !inString; continue; }
          if (inString) continue;
          if (ch === '{') openBraces++;
          else if (ch === '}') openBraces--;
          else if (ch === '[') openBrackets++;
          else if (ch === ']') openBrackets--;
        }
        if (openBraces > 0 || openBrackets > 0) {
          // Close unclosed brackets then braces
          const closers = ']'.repeat(Math.max(0, openBrackets)) + '}'.repeat(Math.max(0, openBraces));
          const recovered = truncated + closers;
          try {
            const result = JSON.parse(recovered);
            console.warn(`[SmartBrains] JSON recovered via truncation repair (closed ${openBraces} braces, ${openBrackets} brackets)`);
            result._recoveryUsed = 8;
            return result;
          } catch { /* fall through */ }
          try {
            const result = JSON.parse(fixTrailingCommas(recovered));
            console.warn(`[SmartBrains] JSON recovered via truncation repair + comma fix`);
            result._recoveryUsed = 8;
            return result;
          } catch { /* fall through */ }
        }
      }
    } catch { /* fall through */ }
    
    console.error(`[SmartBrains] JSON parse EXHAUSTED all 8 strategies. Raw text (first 500 chars): ${cleaned.substring(0, 500)}`);
    return null;
  },

  // ═══════════════════════════════════════════════════════════
  // RESPONSE VALIDATION SCHEMAS — Required fields per brain
  // ═══════════════════════════════════════════════════════════

  _SCHEMAS: {
    LEGEND_DECODER: ['symbols', 'legend_quality'],
    SPATIAL_LAYOUT: ['building_dimensions', 'floors'],
    SYMBOL_SCANNER: ['sheets', 'totals'],
    // CODE_COMPLIANCE: schema validation disabled — informational brain, not pricing-critical
    // AI frequently wraps output differently; retries waste time without improving results
    MDF_IDF_ANALYZER: ['rooms'],
    CABLE_PATHWAY: ['horizontal_cables', 'pathways', 'conduit_runs'],
    SPECIAL_CONDITIONS: ['equipment_rentals', 'subcontractors', 'permits'],
    SHADOW_SCANNER: ['sheets', 'totals'],
    DISCIPLINE_DEEP_DIVE: ['discipline_counts'],
    QUADRANT_SCANNER: ['quadrants', 'totals'],
    CONSENSUS_ARBITRATOR: ['consensus_counts', 'disputes', 'confidence'],
    TARGETED_RESCANNER: ['resolved_items', 'final_counts'],
    MATERIAL_PRICER: ['categories', 'grand_total'],
    LABOR_CALCULATOR: ['phases', 'total_hours'],
    FINANCIAL_ENGINE: ['sov', 'project_summary'],
    REVERSE_VERIFIER: ['verified_items', 'discrepancies'],
    CROSS_VALIDATOR: ['status', 'issues', 'confidence_score'],
    DEVILS_ADVOCATE: ['challenges', 'risk_score', 'missed_items'],
    DETAIL_VERIFIER: ['area_audits', 'corrections', 'verified_counts'],
    CROSS_SHEET_ANALYZER: ['sheet_comparisons', 'inconsistencies', 'adjusted_counts'],
    FINAL_RECONCILIATION: ['final_counts', 'adjustment_log', 'confidence_score'],
    SPEC_CROSS_REF: ['spec_vs_drawing', 'discrepancies'],
    ANNOTATION_READER: ['annotations', 'referenced_details'],
    RISER_DIAGRAM_ANALYZER: ['risers', 'backbone_cables'],
    ZOOM_SCANNER: ['quadrant_counts', 'zoom_findings'],
    PER_FLOOR_ANALYZER: ['floor_breakdown', 'anomalies'],
    OVERLAP_DETECTOR: ['overlapping_areas', 'potential_duplicates'],
    ESTIMATE_CORRECTOR: ['corrected_categories', 'correction_log'],
    // REPORT_WRITER returns markdown, no JSON schema
  },

  _validateBrainOutput(brainKey, parsed) {
    // Skip validation for non-JSON brains (Report Writer)
    if (brainKey === 'REPORT_WRITER') return { valid: true };
    if (!parsed || parsed._parseFailed || parsed._failed) {
      return { valid: false, reason: 'JSON parse failed or empty response' };
    }

    // Cost-critical brains must not rely on aggressive JSON recovery
    const COST_CRITICAL = ['MATERIAL_PRICER', 'FINANCIAL_ENGINE', 'LABOR_CALCULATOR'];
    if (COST_CRITICAL.includes(brainKey) && parsed._recoveryUsed && parsed._recoveryUsed > 2) {
      return { valid: false, reason: `Cost-critical brain required JSON recovery strategy ${parsed._recoveryUsed} — forcing retry for cleaner output` };
    }

    const schema = this._SCHEMAS[brainKey];
    if (!schema) return { valid: true };

    // Check required fields exist — also try unwrapping if AI nested the response
    let missing = schema.filter(field => !(field in parsed));
    if (missing.length > 0) {
      // AI sometimes wraps output in an extra object layer — try to unwrap
      const innerKeys = Object.keys(parsed).filter(k => !k.startsWith('_'));
      if (innerKeys.length === 1 && typeof parsed[innerKeys[0]] === 'object' && parsed[innerKeys[0]] !== null) {
        const inner = parsed[innerKeys[0]];
        const innerMissing = schema.filter(field => !(field in inner));
        if (innerMissing.length < missing.length) {
          // Inner object is a better match — promote its fields
          for (const [k, v] of Object.entries(inner)) { parsed[k] = v; }
          missing = schema.filter(field => !(field in parsed));
        }
      }
      // AI sometimes returns array directly when object with array field expected
      if (Array.isArray(parsed) && missing.length === 1 && Array.isArray(schema) && schema.length > 0) {
        const promoted = { [schema[0]]: parsed };
        for (const [k, v] of Object.entries(promoted)) { parsed[k] = v; }
        missing = schema.filter(field => !(field in parsed));
      }
    }
    if (missing.length > 0) {
      return { valid: false, reason: `Missing required fields: ${missing.join(', ')}` };
    }

    // ── Labor Calculator: ensure PM and non-installation phases have hours ──
    if (brainKey === 'LABOR_CALCULATOR' && Array.isArray(parsed.phases)) {
      const requiredPhases = ['project management', 'engineering', 'coordination', 'superintendent', 'safety'];
      const phaseNames = parsed.phases.map(p => (p.name || '').toLowerCase());
      const missingPhases = requiredPhases.filter(rp => !phaseNames.some(pn => pn.includes(rp)));
      if (missingPhases.length >= 3) {
        return { valid: false, reason: `Missing non-installation phases: ${missingPhases.join(', ')}. These are mandatory labor costs.` };
      }
      const pmPhase = parsed.phases.find(p => /project management/i.test(p.name));
      if (pmPhase && (pmPhase.phase_hours || 0) === 0) {
        return { valid: false, reason: 'Project Management phase has 0 hours — PM is mandatory on every project.' };
      }
    }

    // ── Confidence-based check for Symbol Scanner ──
    // If average confidence across all symbols is below 70%, flag for retry
    if (brainKey === 'SYMBOL_SCANNER' && Array.isArray(parsed.sheets)) {
      const allConfidences = parsed.sheets.flatMap(sheet =>
        (sheet.symbols || []).map(sym => typeof sym.confidence === 'number' ? sym.confidence : 100)
      );
      if (allConfidences.length > 0) {
        const avgConfidence = allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length;
        if (avgConfidence < 70) {
          return { valid: false, reason: `Low confidence: ${avgConfidence.toFixed(0)}% avg (threshold: 70%). Retrying with enhanced prompt.` };
        }
      }
    }

    return { valid: true };
  },

  // ═══════════════════════════════════════════════════════════
  // BRAIN PROMPTS — Domain-Specific Expert Instructions
  // ═══════════════════════════════════════════════════════════

  _getPrompt(brainKey, context) {
    const prompts = {

      // ── BRAIN 1: Symbol Scanner ──────────────────────────────
      SYMBOL_SCANNER: () => `You are a CONSTRUCTION DOCUMENT SYMBOL SCANNER — the #1 expert at finding and counting symbols on ELV floor plans.

PROJECT: ${_sanitizeForPrompt(context.projectName || 'Unknown', 200)} | Type: ${_sanitizeForPrompt(context.projectType || 'Unknown', 100)}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

YOUR MISSION: Scan EVERY sheet and count EVERY device symbol. Be exhaustive.

WHAT TO COUNT BY DISCIPLINE:
${(context.disciplines || []).includes('Structured Cabling') ? '- CABLING: Data outlets, voice outlets, WAPs, fiber outlets, combo outlets' : ''}
${(context.disciplines || []).includes('CCTV') ? '- CCTV: Fixed cameras, PTZ cameras, dome cameras, bullet cameras, multi-sensor cameras' : ''}
${(context.disciplines || []).includes('Access Control') ? '- ACCESS: Card readers, keypads, door contacts, REX devices, electric strikes, maglocks, intercoms' : ''}
${(context.disciplines || []).includes('Fire Alarm') ? '- FIRE: Smoke detectors, heat detectors, pull stations, horn/strobes, duct detectors, modules, annunciators' : ''}
${(context.disciplines || []).includes('Intrusion Detection') ? '- INTRUSION: Motion detectors, door contacts, glass break, keypads, sirens' : ''}
${(context.disciplines || []).includes('Audio Visual') ? '- AV: Speakers, displays, projectors, touch panels, microphones, signal plates' : ''}
- POWER & INFRASTRUCTURE (ALWAYS scan for these regardless of discipline):
  UPS units, inverters, power inverters, transfer switches (ATS/STS), power supplies, battery backup units,
  PDUs, surge protectors, generators, solar inverters, rectifiers, battery chargers, power conditioners
  — If ANY of these appear on plans or in schedules, count them with location and specs

INSTRUCTIONS:
1. Study the legend first to learn what each symbol means
2. Go sheet by sheet systematically
3. Count carefully — zoom into dense areas
4. Note any symbols you cannot identify
5. For each count, provide your confidence (0-100)
6. LOCATION TAG EVERY DEVICE — list the specific room or area name for each device

LOCATION TAGGING RULES:
- For EVERY device counted, record WHICH ROOM or AREA it is in
- Use room names from the drawings (e.g., "Room 101", "Lobby", "Corridor A", "MDF", "Mechanical Room")
- If a room has no label, use a description (e.g., "Unlabeled office NE corner")
- For corridor/hallway devices, note which corridor section
- This data flows to the project management system for installation tracking

Return ONLY valid JSON:
{
  "sheets": [
    {
      "sheet_id": "E1.01",
      "sheet_name": "First Floor Plan",
      "symbols": [
        { "type": "camera", "subtype": "fixed_dome", "count": 12, "confidence": 95, "locations": ["Lobby","Corridor A","Office 101"], "device_locations": [{"room": "Lobby", "qty": 3}, {"room": "Corridor A", "qty": 5}, {"room": "Office 101", "qty": 4}] }
      ]
    }
  ],
  "totals": { "camera": 48, "data_outlet": 200 },
  "device_inventory": [
    { "type": "camera", "subtype": "fixed_dome", "room": "Lobby", "floor": "1st Floor", "sheet": "E1.01", "qty": 3 },
    { "type": "camera", "subtype": "fixed_dome", "room": "Corridor A", "floor": "1st Floor", "sheet": "E1.01", "qty": 5 }
  ],
  "unidentified_symbols": [],
  "notes": "string with any observations"
}`,

      // ── BRAIN 2: Code Compliance ─────────────────────────────
      CODE_COMPLIANCE: () => `You are a CONSTRUCTION CODE COMPLIANCE EXPERT specializing in ELV/low voltage systems.

PROJECT: ${_sanitizeForPrompt(context.projectName, 200)} | Type: ${_sanitizeForPrompt(context.projectType, 100)}
JURISDICTION: ${_sanitizeForPrompt(context.codeJurisdiction || 'General — apply national codes', 200)}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

YOUR MISSION: Review these construction documents for code violations, warnings, and compliance issues.

CODES TO CHECK:
- NEC (NFPA 70): Articles 725 (Class 2/3), 760 (Fire Alarm), 770 (Fiber), 800 (Comm Circuits), 300 (Wiring Methods)
- NFPA 72: Fire alarm device spacing, NAC calculations, pathway survivability
- TIA-568: Structured cabling distances, bend radius, separation from EMI
- TIA-569: Pathway and spaces standards
- TIA-607: Grounding and bonding
- IBC/IFC: Firestopping, plenum requirements
- ADA/ABA: Mounting heights, reach ranges, visual notification

For EACH issue found, classify severity:
🔴 CRITICAL — Code violation requiring correction
🟡 WARNING — Potential non-compliance, needs verification
🔵 INFO — Best practice recommendation

Return ONLY a valid JSON object. The top-level keys MUST be "issues", "summary", "permits_required", and "inspections_required" — no wrapper object, no array, no markdown:
{
  "issues": [
    {
      "severity": "critical|warning|info",
      "code": "NEC 760.46",
      "article": "Fire alarm circuit wiring methods",
      "location": "Sheet E2.01, Corridor B",
      "description": "Fire alarm circuits shown in same raceway as power conductors",
      "action": "Separate fire alarm and power circuits per NEC 760.46"
    }
  ],
  "summary": { "critical": 0, "warning": 0, "info": 0 },
  "permits_required": ["Fire alarm permit","Low voltage permit"],
  "inspections_required": ["AHJ fire alarm inspection"]
}
If no code issues are found, return: {"issues":[],"summary":{"critical":0,"warning":0,"info":0},"permits_required":[],"inspections_required":[]}`,

      // ── BRAIN 3: MDF/IDF Analyzer ────────────────────────────
      MDF_IDF_ANALYZER: () => `You are a TELECOM INFRASTRUCTURE SPECIALIST analyzing MDF/IDF/TR rooms.

PROJECT: ${_sanitizeForPrompt(context.projectName, 200)} | Type: ${_sanitizeForPrompt(context.projectType, 100)}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

YOUR MISSION: Identify and detail EVERY telecom room (MDF, IDF, TR, Server Room, Head-End) on the drawings.

FOR EACH ROOM, DETERMINE:
1. Room name, type (MDF/IDF/TR), floor, room number
2. Equipment requirements: racks, patch panels, switches, UPS, PDU, fiber panels
3. Cable management: horizontal/vertical managers, ladder rack
4. Grounding: TMGB, TGB, TBB
5. Environmental: dedicated HVAC, fire suppression
6. Power: dedicated circuits, UPS sizing, generator backup

Return ONLY valid JSON:
{
  "rooms": [
    {
      "name": "MDF — Room 101",
      "type": "mdf",
      "floor": "1",
      "room_number": "101",
      "building": "Main",
      "equipment": [
        { "item": "42U Floor-Mount Rack", "qty": 2, "unit": "ea", "notes": "" }
      ],
      "grounding": { "tmgb": true, "tgb": true, "tbb_length_ft": 50 },
      "power": { "dedicated_circuits": 2, "ups_kva": 3, "generator": false },
      "hvac": { "dedicated": true, "tonnage": 1.5 },
      "observations": "Room shown as 10x12, adequate for 2 racks per TIA-569"
    }
  ],
  "backbone_connections": [
    { "from": "MDF-101", "to": "IDF-201", "fiber_sm_count": 12, "fiber_mm_count": 12, "copper_count": 0, "est_distance_ft": 250 }
  ]
}`,

      // ── BRAIN 4: Cable & Pathway ─────────────────────────────
      CABLE_PATHWAY: () => `You are a CABLE & PATHWAY ENGINEER analyzing cable runs, conduit systems, and pathway infrastructure for ELV construction.

PROJECT: ${_sanitizeForPrompt(context.projectName, 200)} | Type: ${_sanitizeForPrompt(context.projectType, 100)}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

SPATIAL LAYOUT DATA (from floor plan analysis — use this to calculate zone-based run lengths):
${JSON.stringify(context.wave0?.SPATIAL_LAYOUT || {}, null, 2).substring(0, 3000)}

BUILDING HEIGHTS: Ceiling=${context.ceilingHeight || 10}ft, Floor-to-Floor=${context.floorToFloorHeight || 14}ft

YOUR MISSION: Analyze ALL cable pathways, conduit (every type and size), cable tray, underground routes, and estimate cable/conduit quantities WITH PER-ZONE RUN LENGTHS.

═══ CABLE RUN LENGTH CALCULATION — CRITICAL ═══
For each cable type, break the run estimate down by ZONE (floor area served by one IDF):
- Use the Spatial Layout data above — it includes PER-SHEET scale and dimensions
- Each zone has a "sheet_id" linking it to the correct sheet's scale and dimensions
- For each zone, calculate: horizontal distance from zone centroid to IDF + ceiling height + 15ft slack
- Manhattan distance formula: |zone_x - IDF_x| + |zone_y - IDF_y| (in feet, using that sheet's dimensions)
- Add ceiling height for the vertical stub-up (default 10ft)
- Add 15ft for termination, dressing, and slack loops
- DO NOT use a flat 150ft average — calculate each zone separately

ZONE RUN LENGTH EXAMPLES:
- Zone directly next to IDF: 50ft horizontal + 10ft vertical + 15ft slack = 75ft per drop
- Zone across the building: 180ft horizontal + 10ft vertical + 15ft slack = 205ft per drop
- Zone one floor above IDF: 80ft horizontal + 14ft floor-to-floor + 10ft ceiling + 15ft slack = 119ft per drop
- TIA-568 horizontal limit: 295ft (295ft is 100m max for Category cable — flag any zone exceeding this!)

ANALYZE THOROUGHLY:
1. Horizontal cable runs — type (Cat5e/6/6A), PER-ZONE run lengths (not flat average)
2. Backbone/riser cables — fiber (SM/MM) and copper between rooms
3. Pathway types — J-hooks, cable tray, conduit (EMT/rigid/PVC/liquid-tight), innerduct
4. ALL conduit runs with exact type and size:
   - EMT: 3/4", 1", 1-1/4", 1-1/2", 2" (indoor, above ceiling, exposed walls)
   - Rigid/IMC: outdoor, wet, exposed (specify gauge)
   - PVC Schedule 40/80: underground, direct burial, exterior
   - Liquid-tight flexible: equipment whips, transitions
   - Include all fittings: couplings, connectors, elbows, LBs, pull boxes
5. Conduit sizing and fill calculations (NEC Chapter 9)
6. Vertical risers and sleeve sizes
7. UNDERGROUND/EXTERIOR PATHWAYS — This is critical:
   - Direct-buried conduit runs (measure distances from site plans)
   - Duct bank configurations
   - Handholes and underground pull boxes
   - Boring paths under roads, parking lots, sidewalks
   - Trenching routes through landscape areas
   - Depth requirements per NEC/local code
8. Special pathway requirements (plenum, riser, LSZH, outdoor UV)
9. Conduit support: Unistrut/channel, straps, trapeze hangers, threaded rod

Return ONLY valid JSON:
{
  "horizontal_cables": [
    {
      "type": "cat6a",
      "rating": "plenum",
      "avg_length_ft": 148,
      "count": 200,
      "total_ft": 30000,
      "zones": [
        {
          "zone_name": "2nd Floor East Wing",
          "zone": "2nd Floor East Wing",
          "idf_serving": "IDF-2E",
          "floor": 2,
          "approx_x_pct": 80,
          "approx_y_pct": 40,
          "device_count": 24,
          "est_run_ft": 185,
          "total_ft": 4440,
          "basis": "Zone is ~150ft from IDF-2E horizontally + 10ft ceiling + 15ft slack + 10ft stub-up"
        },
        {
          "zone_name": "3rd Floor Lobby",
          "zone": "3rd Floor Lobby",
          "idf_serving": "IDF-3W",
          "floor": 3,
          "approx_x_pct": 50,
          "approx_y_pct": 80,
          "device_count": 8,
          "est_run_ft": 95,
          "total_ft": 760,
          "basis": "IDF-3W directly adjacent to lobby, short run"
        }
      ]
    }
  ],
  "backbone_cables": [
    { "type": "fiber_sm_os2", "strand_count": 12, "runs": 3, "avg_length_ft": 300, "total_length_ft": 900 }
  ],
  "pathways": [
    { "type": "cable_tray", "size": "12x4", "length_ft": 500, "location": "Above ceiling corridors" },
    { "type": "j_hooks", "count": 250, "spacing": "5ft OC" },
    { "type": "conduit_emt", "size": "1 inch", "length_ft": 200, "location": "Exposed walls" }
  ],
  "conduit_runs": [
    { "type": "EMT", "size": "1 inch", "length_ft": 200, "location": "Above ceiling - MDF to IDF", "purpose": "backbone fiber" },
    { "type": "EMT", "size": "3/4 inch", "length_ft": 400, "location": "Stub-ups to device locations", "purpose": "camera/reader drops" },
    { "type": "PVC Sch 40", "size": "2 inch", "length_ft": 150, "location": "Underground parking lot to bldg entry", "purpose": "exterior camera feeds" },
    { "type": "Rigid", "size": "1 inch", "length_ft": 80, "location": "Exposed exterior wall", "purpose": "outdoor camera pathway" }
  ],
  "underground_pathways": [
    { "route": "Building A to Building B", "distance_ft": 200, "conduit_type": "PVC Sch 40", "conduit_size": "2 inch", "conduit_qty": 2, "depth_in": 24, "surface": "parking lot", "method": "directional_boring" },
    { "route": "Main building to gate", "distance_ft": 150, "conduit_type": "PVC Sch 40", "conduit_size": "2 inch", "conduit_qty": 1, "depth_in": 24, "surface": "landscape", "method": "open_trench" }
  ],
  "exterior_conduit": [
    { "type": "Rigid 1-inch", "length_ft": 120, "location": "Exterior walls for cameras", "weatherproof": true },
    { "type": "PVC Sch 40 2-inch", "length_ft": 200, "location": "Underground to parking structure", "underground": true }
  ],
  "firestopping": { "penetrations": 24, "type": "EZ-Path or Hilti firestop" },
  "notes": []
}`,

      // ── BRAIN 5: Special Conditions ──────────────────────────
      SPECIAL_CONDITIONS: () => `You are a CONSTRUCTION SPECIAL CONDITIONS ANALYST for ELV (Extra Low Voltage) projects. You must identify EVERY item that requires subcontracting, renting, purchasing, or coordinating beyond standard ELV technician labor.

PROJECT: ${_sanitizeForPrompt(context.projectName, 200)} | Type: ${_sanitizeForPrompt(context.projectType, 100)}
LOCATION: ${_sanitizeForPrompt(context.projectLocation || 'Not specified', 200)}
PREVAILING WAGE: ${_sanitizeForPrompt(context.prevailingWage || 'Not specified', 100)}
WORK SHIFT: ${_sanitizeForPrompt(context.workShift || 'Standard', 100)}

YOUR MISSION: Identify EVERY special condition, subcontractor scope, equipment rental, civil work, traffic control, site preparation, and specialty item needed to COMPLETE this installation from start to finish.

═══ CHECK EVERY CATEGORY BELOW — DO NOT SKIP ANY ═══

1. CONDUIT & RACEWAY (identify ALL conduit runs on plans):
   - EMT conduit (3/4", 1", 1-1/4", 1-1/2", 2", 3", 4") — indoor exposed/concealed runs
   - Rigid/IMC conduit — outdoor/wet locations, exposed areas
   - PVC Schedule 40/80 — underground, direct burial, outdoor
   - Liquid-tight flexible conduit (LFMC) — equipment connections, transitions
   - Flex/FMC — short equipment whips
   - Conduit fittings: couplings, connectors, elbows, LBs, condulets, expansion fittings
   - Conduit straps, hangers, trapeze supports, Unistrut/channel
   - Pull boxes, junction boxes (NEMA 1, 3R, 4X)
   - Innerduct/microduct for fiber pathways

2. UNDERGROUND & CIVIL WORK (check site plans, exterior routes):
   - Trenching: open-cut trenching for conduit runs (depth, length, surface type)
   - Backfilling: sand bedding, compacted backfill, soil disposal
   - Directional boring/drilling: under roadways, parking lots, sidewalks, landscaping
   - Backhoe/mini-excavator rental or subcontractor
   - Handholes & pull boxes: polymer/concrete (underground splice points)
   - Direct-buried conduit: PVC schedule 40/80 with warning tape
   - Concrete encasement (if required by specs or crossing utilities)
   - Utility locating (811/USA North) before any excavation
   - Saw cutting: asphalt, concrete (for trench routing)
   - Asphalt/concrete patching & restoration after trenching
   - Landscape restoration: sod, irrigation repair, hardscape repair
   - Bollard installation for equipment protection

3. TRAFFIC CONTROL & SAFETY (for any work in roads, parking, or public areas):
   - Flagmen/flaggers (certified, per shift — REQUIRED for roadway work)
   - Traffic cones, delineators, barricades, channelizers
   - Arrow boards, variable message signs (VMS)
   - Traffic control plan (TCP) — engineering/design by licensed engineer
   - Lane closure permits, encroachment permits
   - High-visibility vests, signage, temporary striping
   - Police escort/detail (if required by jurisdiction)

4. SETUP, MOBILIZATION & TEARDOWN:
   - Mobilization/demobilization of tools, materials, equipment
   - Job trailer or storage container rental (if long-duration project)
   - Temporary power setup and removal
   - Temporary lighting for after-hours work
   - Material staging area setup
   - Daily cleanup and debris removal
   - Final cleanup and demobilization
   - Dumpster/waste container rental

5. EQUIPMENT RENTALS:
   - Scissor lifts (electric indoor, rough-terrain outdoor)
   - Boom lifts / articulating lifts (for high exterior work)
   - Scaffolding (stationary, rolling, suspended)
   - Telehandler/forklift (for heavy material handling)
   - Backhoe/mini-excavator (for trenching)
   - Trencher (ride-on or walk-behind)
   - Directional drill rig (for horizontal boring)
   - Concrete saw / asphalt saw
   - Cable puller/tugger (for long conduit pulls)
   - Vacuum truck (for potholing/utility locating)

6. SUBCONTRACTORS TO PRICE:
   - Core drilling (concrete floors, walls, foundations) — price per hole by diameter
   - Directional boring/drilling — price per linear foot by diameter
   - Trenching & backfilling — price per linear foot by depth and surface
   - Electrical contractor (for dedicated circuits, new panels, grounding)
   - Firestopping (rated penetration seals per UL listing)
   - Concrete/masonry (patching, new pads, bollard bases)
   - Asphalt paving/patching
   - Painting/patching (wall restoration after surface-mount work)
   - Roofing (for any roof penetrations — weatherproofing)
   - Structural engineer (for heavy equipment mounting, seismic)
   - General contractor/GC coordination fees
   - Crane service (for heavy rooftop equipment placement)
   - Fencing contractor (for perimeter security installations)
   - Landscaping (restoration after underground work)

7. PERMITS & INSPECTIONS:
   - Fire alarm permit (AHJ)
   - Low voltage/telecom permit
   - Building permit (if structural modifications)
   - Excavation/grading permit
   - Right-of-way / encroachment permit
   - Hot work permit (welding near combustibles)
   - AHJ fire alarm inspection fees
   - City/county inspection fees
   - Utility crossing permits (water, gas, sewer, power)

8. SPECIALTY TOOLS & TESTING EQUIPMENT:
   - Cable certifier (Fluke DSX/Versiv) — rental or technician time
   - Fusion splicer + cleaver (for fiber termination)
   - OTDR (optical time-domain reflectometer)
   - Thermal imager (for cable tray/pathway routing)
   - Pipe/cable locator (for underground detection)
   - Concrete scanner (GPR for rebar/conduit detection before drilling)
   - Hydraulic knockout punch set
   - Conduit bender (hand, electric, hydraulic by size)
   - Wire/cable pulling equipment (tugger, swivels, pulling eyes, lubricant)

9. SITE CONDITIONS & CONSTRAINTS:
   - Asbestos/lead paint (pre-1980 buildings — environmental survey REQUIRED)
   - Occupied building restrictions (work hours, noise, dust containment)
   - High-security facility (background checks, escorts, clearance wait times)
   - Hazardous locations (Class I/II/III div 1/2 — explosion-proof equipment)
   - Clean room / data center (anti-static, limited access windows)
   - Weather exposure (outdoor work — rain days, heat, cold)
   - Height work (OSHA fall protection for work >6ft)
   - Confined space entry
   - Union requirements (if applicable)

10. SAFETY & COMPLIANCE:
    - OSHA 10/30 certification requirements
    - Site-specific safety orientation/training
    - Drug testing / background checks
    - PPE beyond standard (hard hats, harnesses, respirators)
    - Safety barriers and caution tape

11. FIBER OPTIC SPECIALTY:
    - Fusion splicing services
    - Fiber testing and certification
    - Fiber entrance facility equipment
    - Telephone company coordination for DEMARC
    - ISP/carrier circuit ordering lead time

12. PROJECT MANAGEMENT & COORDINATION:
    - GC coordination meetings and schedule alignment
    - As-built documentation and closeout packages
    - O&M manual preparation
    - Training for building staff/owner
    - Warranty administration
    - Project management software/tools

13. SPECIALTY MATERIALS (not in standard ELV takeoff):
    - Underground warning tape ("Caution: Buried Cable")
    - Pull string/mule tape for conduit
    - Conduit spacers for duct bank
    - Cable pulling lubricant
    - Weatherproof boxes and covers (NEMA 3R/4X)
    - UV-rated cable ties and supports (outdoor)
    - Seismic bracing (anchors, bracing wire, clips)
    - Plenum-rated materials (where required by code)

14. TEMPORARY SERVICES:
    - Temporary internet/network for commissioning and programming
    - Temporary phone/radio communication
    - Generator rental (if no permanent power available)
    - Portable restroom (remote locations)

15. TRAVEL & PER DIEM (if project location is NOT local — over 60 miles from Rancho Cordova, CA):
    - Hotel/lodging: estimate $150-$250/night per worker (use GSA rates for location)
    - Per diem meals: $60-$79/day per worker (GSA M&IE rate)
    - Vehicle mileage or rental: truck rental + fuel for crew and materials
    - Airfare (if 500+ miles) for crew rotation
    - Number of workers × number of project days = TOTAL TRAVEL COST
    - Weekend trips home (if project > 2 weeks, budget 1 round-trip/worker/2 weeks)
    - Parking, tolls, and incidental expenses
    - CALCULATE: (hotel + per_diem) × workers × project_days = travel subtotal
    - This is often 15-25% OF TOTAL PROJECT COST on out-of-town work

16. TRANSIT / RAILROAD / INFRASTRUCTURE-SPECIFIC (for Amtrak, BNSF, UP, light rail, metro, airport, DOT):
    - Railroad flagmen/RWIC (Railroad Worker in Charge): $1,000-$1,500/DAY — MANDATORY for any track-side work
    - Railroad safety orientation/training: 4-8 hrs per worker, $200-$500/person
    - TSA/TWIC background checks: $100-$200/worker, 2-4 week lead time
    - Railroad Protective Liability (RPL) insurance: $15,000-$50,000+ per project
    - Restricted work windows: track time limited to 2-4 hour windows (dramatically increases duration)
    - Night/weekend shift differential: 15-25% labor premium
    - Right-of-Way access agreements and permits
    - Safety equipment: track-rated PPE, flagging equipment, radio communication
    - Escort requirements: railroad escort may be required at $800-$1,200/day
    - Station shutdowns/platform closures: coordination fees
    - DOT/transit authority review and approval fees
    - Long conduit corridor runs typical in railroad/transit work (1,000-10,000+ LF)

17. SPECIALTY INSURANCE & BONDING:
    - Railroad Protective Liability (RPL) insurance
    - Owners Protective Liability (OPL)
    - Additional insured endorsements
    - Performance bond (if required, typically 1-3% of contract)
    - Payment bond
    - Builder's risk insurance
    - Umbrella/excess liability (if project requires higher limits)

═══ CIVIL WORK COST REFERENCE (USE THESE — DO NOT GUESS LOWER) ═══
DIRECTIONAL BORING:
- 2" conduit: $25-$60 per linear foot (+ $2,500-$6,000 mobilization per rig)
- 3" conduit: $35-$80 per linear foot
- 4" conduit: $45-$100 per linear foot
- PVC Sch 80 under railroad/highway: use HIGH end ($60-$100/LF) due to depth and safety requirements
- Minimum bore job: $5,000 (even for short runs — mobilization dominates)

TRENCHING:
- 24" deep in landscape: $8-$22 per linear foot
- 24" deep through asphalt: $18-$42 per linear foot
- 36" deep in landscape: $12-$30 per linear foot
- Backfill + compaction: add $3-$10 per linear foot
- Sand bedding required for all conduit: add $3-$6 per linear foot

SURFACE RESTORATION (often forgotten — MAJOR cost):
- Asphalt sawcut + remove + repave: $8-$22 per square foot (trench width × length)
- Concrete sawcut + remove + repour: $12-$32 per square foot
- Landscape/sod restoration: $4-$15 per linear foot

CORE DRILLING:
- 2" hole: $75-$200 per hole
- 4" hole: $150-$400 per hole
- 6" hole: $250-$600 per hole
- Mobilization: $500-$1,200 per trip

═══ SUBCONTRACTOR COST MINIMUMS (HARD FLOORS) ═══
${(() => {
  const isTransit = (context.projectType || '').toLowerCase().includes('transit') ||
                    (context.projectType || '').toLowerCase().includes('railroad') ||
                    (context.projectName || '').toLowerCase().includes('amtrak') ||
                    (context.projectName || '').toLowerCase().includes('rail');
  const benchmarks = typeof PRICING_DB !== 'undefined' && PRICING_DB.subcontractorBenchmarks
    ? (isTransit ? PRICING_DB.subcontractorBenchmarks.transit_railroad : PRICING_DB.subcontractorBenchmarks.standard)
    : {};
  if (isTransit) {
    return `THIS IS A TRANSIT/RAILROAD PROJECT — apply these MINIMUM subcontractor costs:
- Civil contractor (boring + trenching + restoration): MINIMUM $${benchmarks.civil_contractor_min || 60000}
- Electrical contractor (dedicated circuits, panels, grounding): MINIMUM $${benchmarks.electrical_contractor_min || 80000}
- RWIC/Flagman: $${benchmarks.rwic_flagman_daily || 1200}/day × minimum ${benchmarks.rwic_min_days || 25} days = MINIMUM $${benchmarks.rwic_min_total || 30000}
- RPL Insurance: MINIMUM $${benchmarks.rpl_insurance_min || 25000}
- Safety training: $${benchmarks.safety_training_per_worker || 350}/worker
- Traffic control: $${benchmarks.traffic_control_daily || 1500}/day × minimum ${benchmarks.traffic_control_min_days || 15} days
If your subcontractor totals fall below these minimums, you are UNDERESTIMATING. Adjust UP.`;
  }
  return `Subcontractor minimums (standard project):
- Civil contractor: minimum $${benchmarks.civil_contractor_min || 15000} if ANY underground work exists
- Electrical contractor: minimum $${benchmarks.electrical_contractor_min || 25000} for dedicated circuits`;
})()}

CRITICAL: Be EXHAUSTIVE. If you see ANY exterior conduit runs, underground pathways, parking lot crossings, road crossings, or rooftop equipment on the plans, you MUST include the associated civil work, trenching, boring, traffic control, and restoration. Missing these items leads to MASSIVE cost overruns.

CRITICAL — OUT-OF-TOWN PROJECTS: If the project location is NOT within 60 miles of Rancho Cordova, CA, travel & per diem is MANDATORY. Calculate: crew_size × daily_rate × project_duration_days. This is typically $150K-$400K+ on large out-of-town projects and is the #1 reason estimates come in too low.

CRITICAL — TRANSIT/RAILROAD PROJECTS: If the project is for Amtrak, BNSF, a transit authority, or any railroad, you MUST include RWIC/flagman costs, RPL insurance, safety training, and work window restrictions. Railroad flagmen alone can cost $30,000-$80,000+ on a multi-week project.
RWIC/flagman is required for EVERY DAY that crews work near or on railroad right-of-way — not just a few days. For a multi-week project with 5+ crew, budget 25-40 flagman-days minimum.

Return ONLY valid JSON:
{
  "equipment_rentals": [
    { "item": "Scissor Lift", "duration_days": 20, "daily_rate": 185, "reason": "Ceiling height 15ft+" }
  ],
  "conduit_infrastructure": [
    { "type": "EMT 1-inch", "quantity_ft": 500, "location": "Above ceiling corridors", "install_method": "straps on unistrut" },
    { "type": "PVC Schedule 40 2-inch", "quantity_ft": 200, "location": "Underground parking lot to building", "install_method": "direct burial 24-inch depth" }
  ],
  "civil_work": [
    { "scope": "Directional boring", "distance_ft": 500, "diameter": "2-inch", "surface": "Under parking lot/railroad ROW", "est_cost_range": "$20000-$35000", "rate_per_ft": "$40-$60" },
    { "scope": "Open-cut trenching", "distance_ft": 300, "depth_in": 24, "surface": "Grass/landscape", "est_cost_range": "$4200-$9000", "rate_per_ft": "$14-$30" }
  ],
  "traffic_control": [
    { "item": "Certified Flaggers", "duration_days": 15, "daily_rate": 650, "reason": "Road crossing boring operation and track-side work" },
    { "item": "Traffic Control Plan", "est_cost": 2500, "reason": "Required by city/railroad for lane/track closure" },
    { "item": "Cones/barricades/arrow board", "duration_days": 15, "daily_rate": 350, "reason": "Parking lot and roadway work zone safety" }
  ],
  "subcontractors": [
    { "trade": "Core Drilling", "scope": "12 penetrations through concrete floors", "est_cost_range": "$3000-$5000" },
    { "trade": "Directional Boring", "scope": "500ft bore under parking/railroad ROW for 2-inch PVC Sch 80", "est_cost_range": "$20000-$35000" },
    { "trade": "Electrical Contractor", "scope": "Dedicated 20A circuits to each IDF, new sub-panel, grounding", "est_cost_range": "$80000-$150000" },
    { "trade": "Asphalt/Concrete Patching", "scope": "Restore sawcuts and boring entry/exit pits", "est_cost_range": "$5000-$12000" },
    { "trade": "Landscape Restoration", "scope": "Sod replacement, irrigation repair after trenching", "est_cost_range": "$3000-$8000" }
  ],
  "setup_teardown": [
    { "item": "Mobilization", "est_cost": 2500, "details": "Initial delivery of tools, lifts, materials" },
    { "item": "Demobilization", "est_cost": 1500, "details": "Final cleanup, equipment return, site restoration" },
    { "item": "Daily cleanup", "duration_days": 30, "daily_cost": 150, "details": "Debris removal, work area maintenance" }
  ],
  "permits": [
    { "type": "Fire Alarm Permit", "jurisdiction": "City", "est_cost": 500, "lead_time_days": 14 },
    { "type": "Excavation Permit", "jurisdiction": "City", "est_cost": 300, "lead_time_days": 7 }
  ],
  "site_conditions": [
    { "condition": "Occupied building", "impact": "Work restricted to nights/weekends in patient areas", "cost_impact": "$$" }
  ],
  "travel_per_diem": {
    "applicable": true,
    "crew_size": 5,
    "project_duration_days": 40,
    "hotel_per_night": 180,
    "per_diem_per_day": 69,
    "vehicle_rental_monthly": 2500,
    "hotel_total": 36000,
    "per_diem_total": 13800,
    "vehicle_total": 5000,
    "travel_subtotal": 54800,
    "note": "5 crew × 40 days out of town"
  },
  "transit_railroad": {
    "applicable": false,
    "rwic_flagman_days": 0,
    "rwic_daily_rate": 1200,
    "rwic_total": 0,
    "safety_training_cost": 0,
    "rpl_insurance": 0,
    "work_window_premium_pct": 0,
    "note": ""
  },
  "specialty_insurance": {
    "rpl_insurance": 0,
    "performance_bond": 0,
    "additional_insured": 0,
    "total": 0
  },
  "risks": [
    { "risk": "Pre-1980 building — potential asbestos", "mitigation": "Environmental survey before penetrations", "severity": "high" }
  ],
  "true_change_orders": [
    { "description": "Scope item NOT in plans or specs that may arise during construction", "severity": "medium", "estimated_impact": "$5,000-$10,000", "justification": "Not shown on plans, not called out in specifications — only discoverable during construction or site walk" }
  ]
}

═══ CRITICAL: BID vs. CHANGE ORDER DISTINCTION ═══
Everything you identify above (equipment rentals, subcontractors, permits, civil work, etc.) that IS shown on the plans or called out in the specifications MUST be included in the bid — these are NOT change orders.
The "true_change_orders" field is ONLY for items that are NOT in the plans AND NOT in the specs but could reasonably arise during construction. Examples: hidden site conditions, ambiguous scope boundaries, code requirements not addressed in contract documents.`,

      // ── BRAIN 6: Material Pricer ─────────────────────────────
      MATERIAL_PRICER: () => {
        const tier = context.pricingTier || 'mid';
        const regionKey = context.regionalMultiplier || 'national_average';
        const regionMult = (typeof PRICING_DB !== 'undefined' && PRICING_DB.regionalMultipliers)
          ? (PRICING_DB.regionalMultipliers[regionKey] || 1.0) : 1.0;

        // Use CONSENSUS counts (not raw scanner) — these are verified by 3+ reads
        const consensusCounts = context.wave1_75?.CONSENSUS_ARBITRATOR?.consensus_counts
          || context.wave1_75?.TARGETED_RESCANNER?.final_counts
          || context.wave1?.SYMBOL_SCANNER?.totals
          || {};

        // ── Build explicit discipline checklist from consensus data ──
        // This prevents the Pricer from silently dropping entire systems
        const disciplineChecklist = (context.disciplines || []).map(d => {
          const dLower = d.toLowerCase();
          // Find matching keys in consensus counts
          const matchingKeys = Object.keys(consensusCounts).filter(k => {
            const kl = k.toLowerCase();
            if (dLower.includes('cabling') && (kl.includes('data') || kl.includes('cable') || kl.includes('outlet') || kl.includes('wap') || kl.includes('keystone'))) return true;
            if (dLower.includes('cctv') && (kl.includes('camera') || kl.includes('cctv') || kl.includes('nvr'))) return true;
            if (dLower.includes('access') && (kl.includes('reader') || kl.includes('access') || kl.includes('door') || kl.includes('rex') || kl.includes('contact') || kl.includes('strike') || kl.includes('maglock'))) return true;
            if (dLower.includes('fire') && (kl.includes('smoke') || kl.includes('fire') || kl.includes('pull') || kl.includes('horn') || kl.includes('strobe') || kl.includes('duct') || kl.includes('heat'))) return true;
            if (dLower.includes('audio') && (kl.includes('speaker') || kl.includes('display') || kl.includes('av') || kl.includes('projector') || kl.includes('microphone'))) return true;
            if (dLower.includes('intrusion') && (kl.includes('motion') || kl.includes('glass') || kl.includes('intrusion') || kl.includes('siren') || kl.includes('keypad'))) return true;
            return false;
          });
          const items = matchingKeys.map(k => {
            const val = consensusCounts[k];
            const count = typeof val === 'object' ? (val.consensus || val.count || val) : val;
            return `${k}=${typeof count === 'number' ? count : JSON.stringify(count)}`;
          }).join(', ');
          return `  - ${d}: ${items || 'CHECK SYMBOL DATA FOR EXACT COUNTS'}`;
        }).join('\n');

        return `You are a CONSTRUCTION MATERIAL PRICING SPECIALIST. Calculate exact material costs.

PROJECT: ${_sanitizeForPrompt(context.projectName, 200)}
PRICING TIER: ${tier.toUpperCase()} | REGION: ${regionKey} (${regionMult}× multiplier)
MATERIAL MARKUP: ${context.markup?.material || 50}%

═══ SELECTED DISCIPLINES (you MUST price ALL of these) ═══
${disciplineChecklist}

═══ VERIFIED DEVICE COUNTS (from Triple-Read Consensus — USE THESE EXACT QUANTITIES) ═══
${JSON.stringify(consensusCounts, null, 2).substring(0, 3000)}

═══ EQUIPMENT SCHEDULE (AUTHORITATIVE — overrides symbol counts) ═══
${(() => {
  const schedData = context.wave1?.ANNOTATION_READER?.schedule_data;
  if (schedData && Object.keys(schedData).length > 0) {
    return `Architect's definitive quantities. Schedule counts ALWAYS win over symbol counts. Do NOT add symbol-counted devices on top — they are the SAME devices.
${JSON.stringify(schedData, null, 2).substring(0, 2500)}`;
  }
  return 'No equipment schedule — use consensus counts as primary source.';
})()}

${(() => {
  const annotations = context.wave1?.ANNOTATION_READER?.annotations || [];
  const ofci = annotations.filter(a => /furnished|ofci|owner furnished|by others/i.test(a.text || ''));
  return ofci.length > 0 ? `⚠️ OFCI ITEMS (labor only, do NOT price materials):\n${ofci.map(a => `- ${a.text}`).join('\n')}` : '';
})()}

MDF/IDF ROOMS: ${JSON.stringify(context.wave1?.MDF_IDF_ANALYZER || {}, null, 2).substring(0, 2000)}

CABLE PATHWAYS: ${JSON.stringify(context.wave1?.CABLE_PATHWAY || {}, null, 2).substring(0, 2000)}

PRICING DATABASE (use EXACT prices — do NOT deviate):
${(context.pricingContext || 'Use industry standard pricing').substring(0, 8000)}

═══ PRICING RULES ═══
Use ONLY ${tier.toUpperCase()} tier × ${regionMult} region × project type multiplier (if any). Do NOT invent prices — use closest DB match. Use exact DB key prices (e.g. fixed_indoor_dome), not interpolated values.
${(() => {
  const isTransit = (context.projectType || '').toLowerCase().includes('transit') ||
                    (context.projectType || '').toLowerCase().includes('railroad') ||
                    (context.projectName || '').toLowerCase().includes('amtrak') ||
                    (context.projectName || '').toLowerCase().includes('rail');
  if (isTransit) {
    const ptm = typeof PRICING_DB !== 'undefined' && PRICING_DB.projectTypeMultipliers?.transit_railroad;
    return `
═══ TRANSIT/RAILROAD EQUIPMENT PRICING (MANDATORY) ═══
This is a TRANSIT/RAILROAD project. ALL equipment MUST be transit-rated:
- Cameras: Use PREMIUM tier × ${ptm?.equipment_multiplier || 2.5}× transit multiplier. Minimum $${ptm?.min_camera_cost || 1500}/camera.
  Transit cameras are IK10 vandal-proof, IP67 weatherproof, -40°C to +60°C rated. They cost 2-3× standard cameras.
  Do NOT use budget camera models (no Hikvision DS-2CD series, no Dahua). Use Axis Q-series, Bosch FLEXIDOME, or Hanwha X-series.
- NVRs/Servers: Minimum $${ptm?.min_nvr_cost || 3000}/unit. Enterprise-grade with RAID, redundant power.
- Switches: Minimum $${ptm?.min_switch_cost || 800}/unit. Industrial managed PoE switches (Cisco IE series, Hirschmann).
- Labor multiplier: ${ptm?.labor_multiplier || 1.8}× (restricted work windows, safety overhead).
If your per-camera cost is below $${ptm?.min_camera_cost || 1500}, you are using the WRONG camera model. Fix it.`;
  }
  return '';
})()}

═══ PRICING GUARDRAILS (max unit costs — clamp if exceeded) ═══
Max = premium × 2.5. Fixed dome indoor $1300, outdoor $1800 | PTZ $8750 | Panoramic $7000 | Fisheye $8750 | LPR $8000 | NVR $16250 | PoE 8p $950, 24p $2375, 48p $3750 | AC panel $2125 | Reader $1200 | Strike $700 | Monitor 22" $1125, 32" $1875 | Pole $3000 | Patch panel $650

═══ CRITICAL RULES ═══
1. Create category for EVERY selected discipline — missing one is a FATAL ERROR
2. Schedule quantities override symbol counts (same devices, not additive)
3. Use EXACT prices from pricing database × ${regionMult} regional multiplier. Verify: Qty × Unit Cost × ${regionMult} = Extended
4. Access Control: include panels, readers, contacts, REX, strikes/maglocks, DPS, cabling, power supplies
5. Each camera/access point: include mount hardware, cable, connectors, head-end (NVR, switch, license)
6. Include MDF/IDF: racks, patch panels, UPS, grounding (TMGB/TGB), cable management
7. Include backbone/riser cables, ~150ft/drop for station cable
8. Do NOT price OFCI items as materials — labor only
9. Include UPS, inverters, ATS, battery backup, PDUs, surge protectors from all sources
10. EVERY item MUST have non-empty "mfg" and "partNumber" fields

═══ GENERAL CONDITIONS (MANDATORY — every project has these) ═══
11. ALWAYS create a "General Conditions" category with:
    - Performance & Payment Bonds: typically 1.5-2.5% of total contract value
    - General Liability Insurance: typically 1% of contract
    - Mobilization/Demobilization: typically 1-2% of contract (trailers, temp power, setup/teardown)
    - Permits & Fees: building permits, inspection fees
    For TRANSIT/RAILROAD: ALSO include Railroad Protective Liability Insurance (RRPLI) at $25,000-$65,000
    For GOVERNMENT: Include prevailing wage compliance costs
    General Conditions typically total 8-15% of direct costs. If yours is below 5%, you are UNDERESTIMATING.

═══ TRENCHING & CIVIL WORK (CRITICAL — #1 CAUSE OF UNDERESTIMATION) ═══
12. Sawcutting and trenching MUST be priced as SCOPE OF WORK per linear foot, NOT as equipment rental.
    When drawings show "sawcut and trench for conduit" with a linear footage quantity, price the WORK:
    - ALL-IN rate includes: sawcutting pavement, excavating trench, installing conduit in trench, sand bedding, backfill, compaction, surface restoration (repave/repour)
    - Concrete ALL-IN: $85-$290/LF depending on depth and tier
    - Asphalt ALL-IN: $65-$225/LF depending on depth and tier
    - Railroad/transit heavy: $160-$420/LF (includes RWIC overhead, multiple conduits)
    - A concrete saw is a TOOL (~$150/day rental). The WORK of sawcutting 2000 LF of concrete is $10,000-$16,000 for the sawcutting ALONE, plus trenching, plus conduit, plus restoration.
    - EXAMPLE: 2100 LF of sawcut+trench through concrete at a railroad station = 2100 × $280/LF = $588,000 (not $1,500 for a saw rental)
    DO NOT confuse equipment rental costs with scope-of-work costs. This error causes $200K-$500K underestimates.

═══ UPS SIZING (MATCH THE SPEC — DO NOT DOWNSIZE) ═══
13. If drawings or equipment schedules show a station-sized UPS/inverter (10kVA+), price the ACTUAL specified size:
    - 50kVA station UPS: $50,000-$135,000 (not a $725 rack-mount unit)
    - 100kVA station UPS: $85,000-$220,000
    - Station inverter/charger: $60,000-$190,000
    Check equipment schedules for kVA ratings. A "station sized UPS" is NOT a rack-mount UPS.

═══ ELECTRICAL DISTRIBUTION (include if in scope) ═══
14. Include dedicated power circuits if drawings show them:
    - 20A circuit all-in: $1,500-$4,000/circuit
    - 30A circuit all-in: $2,500-$6,500/circuit
    - New panelboards: $800-$9,000 depending on amperage
    - New poles with foundations: $8,000-$38,000/pole
    - Handholes/pull boxes: $400-$3,000 each
    If electrical is subcontracted, ensure the sub amount covers ALL circuits, panels, and site electrical.

═══ NON-ELV SCOPES (include ONLY if in our contract scope) ═══
15. If construction documents show non-ELV scopes that WE are responsible for, create categories for:
    - Glazing/window film: blast film $200-$550/window, glazing replacement $120-$320/SF
    - Masonry: infill openings $800-$2,200/SF
    - HVAC: mini-split for IDF/MDF $6,000-$18,000 each
    - Finishes: paint touchup, ceiling repair, drywall patch (use allowances)
    - Signage: $400-$1,500/sign
    - Survey: $5,000-$22,000 (construction survey + utility locating)
    These are REAL costs that add up to $50K-$150K on security/station projects.

═══ SPECIFIED PRODUCTS ═══
${JSON.stringify(context.wave1?.SPEC_CROSS_REF?.specified_products || [], null, 2).substring(0, 1500)}
${JSON.stringify(context.wave1?.SPEC_CROSS_REF?.power_equipment_found || [], null, 2).substring(0, 1000)}

DEFAULT MANUFACTURERS (when not specified): Cabling: Panduit/CommScope/Corning | CCTV: Axis/Hanwha/Bosch/Genetec | Access: HID/Lenel/Mercury/Assa Abloy | Fire: Notifier/EST/Simplex | AV: Crestron/Extron/QSC | Network: Cisco/Aruba | Power: APC/Eaton/Altronix

═══ WASTE & SPARES (MANDATORY) ═══
Cable waste +12%, conduit +8%, spare parts/attic stock 5% of each device qty (rounded up), consumables 2.5% of total material cost, connector overage 15%

═══ SELF-CHECK ═══
Verify before returning: every discipline has a category, every item has mfg + partNumber, math is correct.

Return ONLY valid JSON:
{"categories":[{"name":"Structured Cabling","items":[{"item":"Cat 6A Plenum Cable","qty":30000,"unit":"ft","unit_cost":0.32,"ext_cost":9600.00,"mfg":"Panduit","partNumber":"PUP6AV04BU-CEG"}],"subtotal":45200.00},{"name":"Spare Parts & Attic Stock","items":[{"item":"Spare cameras (5%)","qty":2,"unit":"ea","unit_cost":380,"ext_cost":760}],"subtotal":760},{"name":"Small Tools & Consumables","items":[{"item":"Consumables","qty":1,"unit":"lot","unit_cost":0,"ext_cost":0}],"subtotal":0}],"grand_total":125000,"waste_factor_total":0,"spare_parts_total":0,"consumables_total":0,"markup_pct":${context.markup?.material || 50},"total_with_markup":156250}`;
      },

      // ── BRAIN 7: Labor Calculator ────────────────────────────
      LABOR_CALCULATOR: () => {
        const burdenMult = context.includeBurden ? (1 + (context.burdenRate || 35) / 100) : 1.0;
        // Use CONSENSUS counts + actual Material Pricer output (now available since Pricer runs first)
        const consensusCounts = context.wave1_75?.CONSENSUS_ARBITRATOR?.consensus_counts
          || context.wave1_75?.TARGETED_RESCANNER?.final_counts
          || context.wave1?.SYMBOL_SCANNER?.totals
          || {};

        return `You are a CONSTRUCTION LABOR ESTIMATOR using NECA labor standards.

PROJECT: ${_sanitizeForPrompt(context.projectName, 200)} | Type: ${_sanitizeForPrompt(context.projectType, 100)}
LABOR MARKUP: ${context.markup?.labor || 50}%
BURDEN RATE: ${context.includeBurden ? context.burdenRate + '%' : 'Not applied'}
PREVAILING WAGE: ${_sanitizeForPrompt(context.prevailingWage || 'No', 100)}
WORK SHIFT: ${_sanitizeForPrompt(context.workShift || 'Standard', 100)}

LABOR RATES:
${Object.entries(context.laborRates || {}).map(([k, v]) =>
          `- ${k}: $${v}/hr base × ${burdenMult.toFixed(2)} burden = $${(v * burdenMult).toFixed(2)}/hr loaded`
        ).join('\n')}

═══ VERIFIED DEVICE COUNTS (from Triple-Read Consensus — USE THESE) ═══
${JSON.stringify(consensusCounts, null, 2).substring(0, 5000)}

MATERIAL PRICER OUTPUT (actual priced quantities — match your labor to THESE):
${JSON.stringify(context.wave2?.MATERIAL_PRICER || {}, null, 2).substring(0, 8000)}

NECA LABOR UNIT GUIDELINES:
- Cat6A drop (install+terminate+test): 0.45-0.55 hrs/drop
- Camera install (mount+wire+aim): 2.0-3.5 hrs/camera
- Card reader (mount+wire+program): 2.5-4.0 hrs/door
- Fire alarm device: 0.5-1.5 hrs/device depending on type
- Rack build-out: 8-16 hrs/rack
- Cable tray: 0.15-0.25 hrs/ft
- AV display mounting: 1.5-3.0 hrs/display
- Speaker install: 0.5-1.0 hrs/speaker

CONDUIT LABOR UNITS (do NOT skip conduit labor — it is a major cost driver):
- EMT conduit 3/4": 0.08-0.12 hrs/ft (measure, cut, bend, strap, pull wire)
- EMT conduit 1": 0.10-0.15 hrs/ft
- EMT conduit 1-1/4" to 2": 0.15-0.25 hrs/ft
- Rigid/IMC conduit: 0.20-0.35 hrs/ft (threading adds time)
- PVC conduit underground: 0.12-0.20 hrs/ft (not counting trenching)
- Liquid-tight flex: 0.10-0.15 hrs/ft
- Pull boxes/junction boxes: 1.0-2.0 hrs each
- Cable pulling through conduit: 0.03-0.08 hrs/ft depending on fill

TRENCHING / SAWCUTTING LABOR (if NOT subcontracted):
- Concrete sawcutting: 0.15-0.25 hrs/LF (walk-behind saw through concrete/asphalt)
- Trench excavation: 0.20-0.40 hrs/LF (mini-excavator + hand work)
- Conduit installation in trench: 0.10-0.15 hrs/LF
- Backfill and compaction: 0.08-0.12 hrs/LF
- Surface restoration: 0.15-0.30 hrs/LF (concrete repour or asphalt patch)
- TOTAL all-in trenching labor: 0.70-1.20 hrs/LF through concrete
NOTE: If trenching is subcontracted (civil contractor), include ONLY coordination/supervision labor, not the trench labor itself. The sub's cost covers their labor.

SHIFT DIFFERENTIALS (apply if work shift is not Standard):
- Night shift: add 15% to base labor rates
- Weekend shift: add 25% to base labor rates
- Overtime (>8 hrs/day or >40 hrs/wk): 1.5× rate
- Double-time (holidays, 7th day): 2.0× rate
- Railroad/transit restricted windows: add 20-30% for productivity loss

SPECIAL CONDITIONS DATA (use for conduit quantities and site-specific labor):
${JSON.stringify(context.wave1?.SPECIAL_CONDITIONS || {}, null, 2).substring(0, 4000)}

CRITICAL RULES:
1. Your device quantities MUST EXACTLY MATCH the consensus counts and Material Pricer
2. If Material Pricer has 24 cameras, your labor must cover EXACTLY 24 cameras
3. If Material Pricer has 21 card readers, your labor must cover EXACTLY 21 doors
4. If consensus has AV devices, you MUST include AV installation labor
5. ONLY include labor for categories that exist in the consensus counts
6. If consensus shows 0 fire alarm devices, do NOT add fire alarm labor
7. You MUST include conduit installation labor if Special Conditions or Cable Pathway shows conduit runs
8. Apply shift differential if work shift is not Standard
9. If project is transit/railroad, apply 20-30% productivity loss factor for restricted work windows
10. You MUST include all NON-INSTALLATION phases below — these are real labor costs

═══ LABOR HOUR SANITY BOUNDS (MANDATORY CHECK) ═══
Before returning, verify your total_hours against these project-size benchmarks:
- Under 50 devices: 400-2,000 total hours (2-10 tech-weeks)
- 50-100 devices: 1,500-5,000 total hours (8-25 tech-weeks)
- 100-200 devices: 3,000-10,000 total hours (15-50 tech-weeks)
- 200-500 devices: 6,000-20,000 total hours (30-100 tech-weeks)
- Over 500 devices: 15,000-50,000 total hours (max realistic scope)
If your total_hours falls OUTSIDE these ranges, RE-CHECK your math. Do NOT return hours above 50,000.
crew_recommendation.duration_weeks should be 4-52 (1 month to 1 year). If above 52, reduce weeks and increase crew.

Calculate labor by PROJECT PHASE:
1. Rough-In (35-40% of field labor) — pathway, CONDUIT INSTALLATION, cable pulling, backboxes
2. Trim/Termination (20-25%) — device mounting, terminations, rack dress
3. Programming (8-12%) — system programming, configuration, database entry
4. Testing/Commissioning (8-12%) — cable certification, device verification, punch list
5. Commissioning & Owner Training (3-5%) — AHJ walkthroughs, camera aiming sessions with owner, access control enrollment, system integration testing with existing infrastructure, owner staff training (2-4 sessions)
6. As-Built Drawings & Closeout (2-3%) — red-line markups, CAD/Revit as-builts, O&M manual compilation, warranty documentation, closeout binder assembly. Typically 40-80 hours for a large project.

NON-INSTALLATION LABOR — you MUST include ALL of these as separate phases with NON-ZERO hours.
These are REAL costs on every project. Omitting them is the #1 reason bids lose money.

7. Engineering & Submittals (3-5% of total labor cost):
   - Submittal preparation: product data, shop drawings, cut sheets (40-80 hrs)
   - Engineer review coordination and resubmittals (20-40 hrs)
   - Riser diagram and pathway design (20-40 hrs)
   - Use PM rate for this work
   - MINIMUM 60 hours for any project over $500K

8. Project Management (MANDATORY — dedicated PM for full project duration):
   - 1 PM at PM rate × 40 hrs/wk × project duration in weeks
   - Scheduling, procurement, RFIs, change orders, weekly OAC meetings, daily reports
   - For an 8-week project: 320 hrs. For 12 weeks: 480 hrs. For 16 weeks: 640 hrs.
   - PM hours are NEVER zero — every project has a PM from mobilization to closeout
   - This is NOT included in field labor — it is ADDITIONAL overhead

9. Site Superintendent / Foreman (on-site supervision for duration):
   - 1 Foreman at foreman rate × 40-50 hrs/wk × field duration
   - Crew coordination, quality control, daily safety briefings, GC interface
   - For an 8-week field project: 320-400 hrs at foreman rate
   - Required on ALL projects with 3+ field techs

10. Safety & Compliance (especially transit/railroad/prevailing wage):
    - Safety orientation for each worker (4-8 hrs per person)
    - Weekly toolbox talks (0.5 hr × crew size × weeks)
    - Site-specific safety plans, JSA/JHA preparation
    - Transit/railroad: RWIC coordination, safety briefings, track safety training
    - Typical: 40-120 hours depending on project size and requirements

11. Warehouse, Material Handling & Logistics:
    - Receiving, inventory, staging, kitting for field crews
    - Delivery coordination, material returns
    - Tool management and calibration
    - Typical: 40-80 hours for a $500K+ project
    - Use apprentice rate

12. CAD / As-Built Documentation:
    - Shop drawing preparation (if not covered in Engineering phase)
    - As-built red-line markup and CAD/Revit updates
    - O&M manual compilation, warranty documentation
    - Typical: 40-100 hours. Use PM or programmer rate

13. Coordination & Idle Time (10-15% of total field labor hours):
    - Waiting for other trades (electrician, drywall, ceiling grid)
    - GC schedule delays and re-sequencing
    - Elevator/lift access wait times, material delivery delays
    - Safety stand-downs, orientation time
    - This is REAL cost — crews get paid whether working or waiting
    - MINIMUM 10% of total field hours

Return ONLY valid JSON. EVERY phase MUST have non-zero hours and cost:
{
  "phases": [
    {"name":"Rough-In","pct_of_total":35,"tasks":[
      {"description":"Install EMT conduit — 2000 LF","classification":"journeyman","hours":240,"rate":65.00,"cost":15600},
      {"description":"Pull cable — 45000 ft","classification":"journeyman","hours":180,"rate":65.00,"cost":11700},
      {"description":"Install cable tray — 500 LF","classification":"journeyman","hours":100,"rate":65.00,"cost":6500}
    ],"phase_hours":520,"phase_cost":33800},
    {"name":"Trim & Termination","pct_of_total":22,"tasks":[
      {"description":"Mount & wire 56 cameras","classification":"journeyman","hours":168,"rate":65.00,"cost":10920},
      {"description":"Terminate 150 data drops","classification":"journeyman","hours":75,"rate":65.00,"cost":4875}
    ],"phase_hours":243,"phase_cost":15795},
    {"name":"Programming & Configuration","pct_of_total":10,"tasks":[
      {"description":"VMS programming, camera config","classification":"programmer","hours":80,"rate":55.00,"cost":4400}
    ],"phase_hours":80,"phase_cost":4400},
    {"name":"Testing & Commissioning","pct_of_total":9,"tasks":[
      {"description":"Cable certification, device verification","classification":"lead","hours":100,"rate":72.00,"cost":7200}
    ],"phase_hours":100,"phase_cost":7200},
    {"name":"Owner Training & Closeout","pct_of_total":3,"tasks":[
      {"description":"Owner training sessions, closeout docs","classification":"pm","hours":40,"rate":75.00,"cost":3000}
    ],"phase_hours":40,"phase_cost":3000},
    {"name":"Engineering & Submittals","pct_of_total":4,"tasks":[
      {"description":"Submittal prep, shop drawings, resubmittals","classification":"pm","hours":80,"rate":75.00,"cost":6000},
      {"description":"Riser diagram and pathway design","classification":"pm","hours":24,"rate":75.00,"cost":1800}
    ],"phase_hours":104,"phase_cost":7800},
    {"name":"Project Management","pct_of_total":8,"tasks":[
      {"description":"Dedicated PM — 10 weeks × 40 hrs","classification":"pm","hours":400,"rate":75.00,"cost":30000}
    ],"phase_hours":400,"phase_cost":30000},
    {"name":"Site Superintendent","pct_of_total":5,"tasks":[
      {"description":"Foreman on-site supervision — 8 weeks × 45 hrs","classification":"foreman","hours":360,"rate":52.00,"cost":18720}
    ],"phase_hours":360,"phase_cost":18720},
    {"name":"Safety & Compliance","pct_of_total":2,"tasks":[
      {"description":"Safety orientation, toolbox talks, JSAs","classification":"foreman","hours":60,"rate":52.00,"cost":3120}
    ],"phase_hours":60,"phase_cost":3120},
    {"name":"Warehouse & Material Handling","pct_of_total":2,"tasks":[
      {"description":"Receiving, staging, kitting, tool mgmt","classification":"apprentice","hours":60,"rate":22.00,"cost":1320}
    ],"phase_hours":60,"phase_cost":1320},
    {"name":"CAD / As-Built Documentation","pct_of_total":2,"tasks":[
      {"description":"As-built markups, CAD updates, O&M manuals","classification":"pm","hours":60,"rate":75.00,"cost":4500}
    ],"phase_hours":60,"phase_cost":4500},
    {"name":"Coordination & Idle Time","pct_of_total":10,"tasks":[
      {"description":"Trade coordination, GC delays, access waits","classification":"journeyman","hours":150,"rate":65.00,"cost":9750}
    ],"phase_hours":150,"phase_cost":9750}
  ],
  "total_field_hours": 983,
  "total_non_field_hours": 1094,
  "total_hours": 2077,
  "total_base_cost": 139405,
  "markup_pct": ${context.markup?.labor || 50},
  "total_with_markup": 209108,
  "crew_recommendation": {"journeyman":3,"apprentice":2,"foreman":1,"pm":1,"superintendent":1,"duration_weeks":10}
}`;
      },

      // ── BRAIN 8: Financial Engine ────────────────────────────
      FINANCIAL_ENGINE: () => `You are a CONSTRUCTION FINANCIAL ANALYST producing SOV and final pricing.

PROJECT: ${_sanitizeForPrompt(context.projectName, 200)} | Location: ${_sanitizeForPrompt(context.projectLocation || 'Not specified', 200)}
PREVAILING WAGE: ${_sanitizeForPrompt(context.prevailingWage || 'No', 100)}
MARKUP: Material ${context.markup?.material || 50}% | Labor ${context.markup?.labor || 50}% | Equipment ${context.markup?.equipment || 15}% | Subcontractor ${context.markup?.subcontractor || 10}%

═══ MATERIAL PRICER OUTPUT (USE THESE EXACT TOTALS) ═══
${JSON.stringify(context.wave2?.MATERIAL_PRICER || {}, null, 2).substring(0, 6000)}

═══ LABOR CALCULATOR OUTPUT (USE THESE EXACT TOTALS) ═══
${JSON.stringify(context.wave2_25?.LABOR_CALCULATOR || {}, null, 2).substring(0, 6000)}

SPECIAL CONDITIONS (includes subcontractors, civil work, traffic control, setup/teardown):
${JSON.stringify(context.wave1?.SPECIAL_CONDITIONS || {}, null, 2).substring(0, 6000)}

CABLE & PATHWAY DATA (includes conduit runs, underground pathways):
${JSON.stringify(context.wave1?.CABLE_PATHWAY || {}, null, 2).substring(0, 4000)}

═══ TRAVEL & PER DIEM COSTS ═══
NOTE: Travel costs are now configured by the user on Stage 7 (Travel & Costs) AFTER your analysis.
Set total_travel to $0 in your project_summary. The system will inject the correct deterministic travel amount.
Do NOT estimate or guess travel costs — they will be overridden by user-configured values.

CRITICAL RULES (VIOLATING ANY OF THESE IS A FATAL ERROR):
1. Your total_materials MUST EXACTLY EQUAL the Material Pricer's "total_with_markup" value (NOT "grand_total" — that is the base cost before markup). The sell price is what goes into the SOV and project summary. Copy the EXACT number — do not round, recalculate, or adjust it.
2. Your total_labor MUST EXACTLY EQUAL the Labor Calculator's "total_with_markup" value (NOT the base cost). Copy the EXACT number.
3. SOV must include columns: Material, Labor, Equipment, Subcontractor, Total — all values must be SELL PRICES (with markup applied)
4. SOV line items must mathematically balance: Material + Labor + Equipment + Subcontractor = Total
5. All SOV line items must sum to the grand total
6. The project_summary grand_total must include ALL cost components: materials + labor + equipment + subcontractors + travel + transit + insurance + general_conditions + G&A + profit + warranty + contingency
7. SUBCONTRACTOR costs MUST include ALL items from Special Conditions: civil work (trenching, boring, patching), traffic control (flaggers, cones, arrow boards), core drilling, firestopping, electrical, and any other contracted work
8. EQUIPMENT costs MUST include ALL rental items from Special Conditions: lifts, backhoes, trenchers, saws, etc.
9. Include a separate SOV line item for "Mobilization/Setup & Demobilization/Teardown"
10. Include a separate SOV line item for "Civil Work & Site Restoration" if underground/exterior work exists
11. G&A OVERHEAD is MANDATORY: Apply 15% to (materials + labor + equipment + subcontractors) subtotal. This covers company overhead (office, trucks, insurance, admin staff). This is separate from markup.
12. PROFIT MARGIN is MANDATORY: Apply 10% to the subtotal after G&A. This is the company's profit. Without this, you are bidding at cost.
13. WARRANTY RESERVE: Add 1.5% of total project cost for warranty callback labor during the 1-year warranty period.

═══ GENERAL CONDITIONS (MANDATORY — INCLUDE IN EVERY BID) ═══
14. ALWAYS include a "General Conditions" SOV line item containing:
    - Performance & Payment Bonds: 1.5-2.5% of total contract value
    - General Liability Insurance: ~1% of contract
    - Mobilization/Demobilization: 1-2% of contract
    - Permits & Fees
    For TRANSIT/RAILROAD: ALSO include Railroad Protective Liability Insurance (RRPLI) at $25,000-$65,000
    General Conditions typically total 8-15% of direct costs ($80K-$200K on a $1M+ project).
    If your general_conditions total is below 5% of direct costs, you are UNDERESTIMATING.
15. Add total_general_conditions to the project_summary alongside other cost components.

═══ TRENCHING SCOPE VALIDATION (CRITICAL) ═══
16. If Material Pricer or Special Conditions shows sawcut/trench scope with linear footage:
    - Verify it is priced as ALL-IN scope-of-work per linear foot ($85-$420/LF), NOT as equipment rental ($150/day)
    - If Civil Contractor sub amount seems too low for the trenching scope, INCREASE it
    - EXAMPLE: 2100 LF of concrete sawcut+trench at a transit station should be $400,000-$600,000, not $40,000
    - Cross-check: Material Pricer's trenching cost vs Special Conditions' civil work estimate

═══ COST BUILD-UP ORDER (follow this EXACTLY) ═══
1. Direct Costs: total_materials + total_labor + total_equipment + total_subcontractors
2. Add: total_travel + total_transit_costs + total_insurance
3. = PROJECT DIRECT COST SUBTOTAL
4. Add: G&A Overhead (15% of direct costs) → this covers company operating expenses
5. = TOTAL COST WITH OVERHEAD
6. Add: Profit (10% of cost with overhead) → this is the company's earnings
7. Add: Warranty Reserve (1.5% of total)
8. Add: Contingency (10% of total) → for unknowns and scope changes
9. = GRAND TOTAL (this is the BID PRICE)

GENERATE:
1. Schedule of Values (SOV) in AIA G703 format with Material + Labor + Equipment + Subcontractor columns
2. Travel & Per Diem calculation — MANDATORY if project is 60+ miles from Rancho Cordova, CA
3. Transit/Railroad costs — MANDATORY if project involves Amtrak, BNSF, transit authority, railroad, airport, or DOT
4. Prevailing wage determination (if applicable)
5. Complete project cost summary with G&A, profit, warranty, and contingency

═══ TRAVEL & PER DIEM CALCULATION RULES ═══
If the project location is 60+ miles from Rancho Cordova, CA (Sacramento area):
- Crew size: use the Labor Calculator's crew_recommendation
- Project duration: use the Labor Calculator's duration_weeks × 5 working days
- Hotel: use GSA rate for the city (typically $150-$250/night)
- Per diem: use GSA M&IE rate for the city (typically $60-$79/day)
- Vehicle: $2,000-$3,500/month for truck rental + fuel
- Weekend trips home: 1 round-trip per worker per 2 weeks if project > 2 weeks
- FORMULA: travel_total = (hotel_rate + per_diem_rate) × crew_size × working_days + vehicle_costs + weekend_trips
- Travel is typically 15-25% of total project cost on out-of-town work — if your travel is less than 10%, you are probably UNDERESTIMATING

═══ TRANSIT / RAILROAD COST RULES ═══
If Special Conditions flagged transit/railroad work:
- RWIC/Flagman costs: $1,000-$1,500/day × number of track-side work days → add to Subcontractor column
- RPL Insurance: $15,000-$50,000+ → add to project_summary
- Safety training: $200-$500/worker → add to Labor column
- Work window premium: 20-30% increase to labor hours (reduced productivity) → should already be in Labor Calculator

═══ SUBCONTRACTOR COST VALIDATION (MANDATORY CHECK BEFORE RETURNING) ═══
${(() => {
  const isTransit = (context.projectType || '').toLowerCase().includes('transit') ||
                    (context.projectType || '').toLowerCase().includes('railroad') ||
                    (context.projectName || '').toLowerCase().includes('amtrak') ||
                    (context.projectName || '').toLowerCase().includes('rail');
  const benchmarks = typeof PRICING_DB !== 'undefined' && PRICING_DB.subcontractorBenchmarks
    ? (isTransit ? PRICING_DB.subcontractorBenchmarks.transit_railroad : PRICING_DB.subcontractorBenchmarks.standard)
    : {};
  if (isTransit) {
    return `THIS IS A TRANSIT/RAILROAD PROJECT — enforce these MINIMUM subcontractor costs in your SOV:
- Civil work (boring + trenching + restoration): MINIMUM $${benchmarks.civil_contractor_min || 60000}
- Electrical contractor (dedicated circuits, panels, grounding for camera/access systems): MINIMUM $${benchmarks.electrical_contractor_min || 80000}
- RWIC/Flagman: MINIMUM $${benchmarks.rwic_min_total || 30000} (${benchmarks.rwic_min_days || 25}+ days × $${benchmarks.rwic_flagman_daily || 1200}/day)
- RPL Insurance: MINIMUM $${benchmarks.rpl_insurance_min || 25000}
- Traffic control: MINIMUM $${(benchmarks.traffic_control_daily || 1500) * (benchmarks.traffic_control_min_days || 15)} (${benchmarks.traffic_control_min_days || 15} days × $${benchmarks.traffic_control_daily || 1500}/day)
If your total_subcontractors is below $200,000 on a transit project with underground work, you are almost certainly UNDERESTIMATING.
The subcontractor column should typically be 15-25% of total project cost on transit work.
CHECK: Does your subcontractor total look reasonable compared to the scope? If not, INCREASE IT.`;
  }
  return `Subcontractor minimums:
- If underground work exists: civil contractor minimum $${benchmarks.civil_contractor_min || 15000}
- Electrical contractor minimum: $${benchmarks.electrical_contractor_min || 25000}`;
})()}

Return ONLY valid JSON:
{
  "sov": [
    { "item_num": "01-001", "description": "Mobilization/Demobilization", "material": 0, "labor": 2500, "equipment": 500, "subcontractor": 0, "total": 3000 }
  ],
  "travel": {
    "applicable": true,
    "crew_size": 5,
    "duration_days": 40,
    "hotel_rate": 180,
    "per_diem_rate": 69,
    "vehicle_monthly": 2500,
    "breakdown": {
      "hotel_total": 36000,
      "per_diem_total": 13800,
      "vehicle_total": 5000,
      "weekend_trips": 3000,
      "incidentals": 2000
    },
    "total": 59800,
    "note": "5 crew × 40 days, GSA rates for [city]"
  },
  "transit_infrastructure": {
    "applicable": false,
    "rwic_flagman": { "days": 0, "daily_rate": 1200, "total": 0 },
    "rpl_insurance": 0,
    "safety_training": { "workers": 0, "cost_per": 350, "total": 0 },
    "work_window_premium": 0,
    "escort_costs": 0,
    "total": 0,
    "note": ""
  },
  "prevailing_wage": {
    "applicable": false,
    "classifications": [],
    "note": ""
  },
  "project_summary": {
    "total_materials": 0,
    "total_labor": 0,
    "total_equipment": 0,
    "total_subcontractors": 0,
    "total_general_conditions": 0,
    "total_travel": 0,
    "total_transit_costs": 0,
    "total_insurance": 0,
    "direct_cost_subtotal": 0,
    "ga_overhead_pct": 15,
    "ga_overhead": 0,
    "cost_with_overhead": 0,
    "profit_pct": 10,
    "profit": 0,
    "warranty_reserve_pct": 1.5,
    "warranty_reserve": 0,
    "contingency_pct": 10,
    "contingency": 0,
    "grand_total": 0
  },
  "payment_terms": "Net 30, 10% retainage until substantial completion",
  "assumptions": [],
  "exclusions": []
}`,

      // ── BRAIN 9: Cross Validator ─────────────────────────────
      CROSS_VALIDATOR: () => `You are a SENIOR QA AUDITOR cross-checking an AI construction estimate.
This estimate may be used for projects up to $50 BILLION. Errors are UNACCEPTABLE.

VERIFY ALL OF THE FOLLOWING:

1. MATH CHECK: For every Qty × Unit Cost = Extended Cost, verify multiplication is correct
2. QUANTITY CONSISTENCY: Symbol counts from scanner must match material quantities from pricer
3. COST REASONABLENESS: Flag any unit costs that seem unreasonable (e.g., camera at $15 or cable drop at $5,000)
4. COMPLETENESS: Every counted symbol must have a corresponding material line item
5. LABOR REASONABLENESS: Hours should align with NECA standards for the scope described
6. MARKUP ACCURACY: Verify markups were applied correctly
7. SOV BALANCING: SOV line items must sum to grand total
8. ROOM EQUIPMENT: MDF/IDF equipment lists must be complete for room type

SYMBOL SCANNER DATA:
${JSON.stringify(context.wave1?.SYMBOL_SCANNER || {}, null, 2).substring(0, 4000)}

MATERIAL PRICER DATA:
${JSON.stringify(context.wave2?.MATERIAL_PRICER || {}, null, 2).substring(0, 4000)}

LABOR CALCULATOR DATA:
${JSON.stringify(context.wave2_25?.LABOR_CALCULATOR || {}, null, 2).substring(0, 4000)}

FINANCIAL ENGINE DATA:
${JSON.stringify(context.wave2_5_fin?.FINANCIAL_ENGINE || {}, null, 2).substring(0, 4000)}

Return ONLY valid JSON:
{
  "status": "PASSED|ISSUES_FOUND",
  "checks_performed": 50,
  "issues": [
    { "severity": "critical|warning|info", "category": "math|quantity|cost|completeness", "description": "...", "brain": "MATERIAL_PRICER", "correction": "..." }
  ],
  "confidence_score": 96,
  "quantity_crosscheck": [
    { "item": "cameras", "scanner_count": 48, "pricer_count": 48, "match": true }
  ],
  "math_errors": [],
  "recommendations": []
}`,

      // ── BRAIN 28: Estimate Corrector (Wave 3.85) ──────────────
      ESTIMATE_CORRECTOR: () => {
        const tier = context.pricingTier || 'mid';
        return `You are a CONSTRUCTION ESTIMATE AUDITOR. Your job is to CORRECT the Material Pricer's output using findings from the verification brains.

You receive:
1. The original Material Pricer output (categories + items + prices)
2. The Devil's Advocate challenges (missed items, inflated prices, phantom items)
3. The Cross Validator issues (quantity mismatches, math errors, missing scope)
4. The Reverse Verifier discrepancies (items in BOQ not on plans, or vice versa)
5. The Final Reconciliation counts (authoritative device counts from 6 reads)

Your task: produce a CORRECTED version of the Material Pricer categories with fixes applied.

═══ ORIGINAL MATERIAL PRICER OUTPUT ═══
${JSON.stringify(context.wave2?.MATERIAL_PRICER || {}, null, 2).substring(0, 8000)}

═══ DEVIL'S ADVOCATE CHALLENGES ═══
${JSON.stringify(context.wave3?.DEVILS_ADVOCATE?.challenges || [], null, 2).substring(0, 4000)}

═══ CROSS VALIDATOR ISSUES ═══
${JSON.stringify(context.wave3?.CROSS_VALIDATOR?.issues || [], null, 2).substring(0, 4000)}

═══ REVERSE VERIFIER DISCREPANCIES ═══
${JSON.stringify(context.wave2_75?.REVERSE_VERIFIER?.discrepancies || [], null, 2).substring(0, 3000)}

═══ FINAL RECONCILIATION COUNTS (6-read consensus — AUTHORITATIVE) ═══
${JSON.stringify(context.wave3_75?.FINAL_RECONCILIATION?.final_counts || context.wave1_75?.CONSENSUS_ARBITRATOR?.consensus_counts || {}, null, 2).substring(0, 4000)}

═══ EQUIPMENT SCHEDULE DATA (if available — overrides all counts) ═══
${JSON.stringify(context.wave1?.ANNOTATION_READER?.schedule_data || {}, null, 2).substring(0, 3000)}

═══ PRICING GUARDRAILS ═══
Maximum unit costs (premium × 2.5 for transit/ruggedized):
- Indoor dome camera: $1,300 max
- Outdoor dome camera: $1,800 max
- PTZ outdoor: $8,750 max
- Multi-sensor panoramic/fisheye: $8,750 max
- NVR/VMS server: $16,250 max
- PoE switch 24-port: $2,375 max
- PoE switch 48-port: $3,750 max
- Monitor 22": $1,125 max | 32": $1,875 max | 55": $3,750 max
- Camera pole 20ft: $3,000 max

CORRECTION RULES:
1. QUANTITY FIX: If Devil's Advocate says "13 phantom cameras" — REDUCE the camera count by 13
2. PRICE FIX: If any unit cost exceeds the guardrail max — CLAMP it to the max
3. MISSING ITEMS: If Devil's Advocate says "missing camera poles" or "missing concrete foundations" — ADD them
4. OFCI: If an item is marked "owner furnished, contractor install" — set unit_cost to 0 (labor only)
5. DOUBLE-COUNT: If the same devices were counted from both schedule AND symbols — use the LOWER count (schedule preferred)
6. MATH: Recalculate ext_cost = qty × unit_cost for every row you change
7. SUBTOTALS: Recalculate category subtotals after corrections
8. Do NOT remove legitimate items — only correct quantities and prices that are wrong

Return ONLY valid JSON:
{
  "corrected_categories": [
    {
      "name": "Category Name",
      "items": [
        { "item": "description", "qty": 10, "unit": "ea", "unit_cost": 380.00, "ext_cost": 3800.00, "corrected": true, "correction_reason": "Reduced from 25 per Devil's Advocate finding" }
      ],
      "subtotal": 3800.00,
      "original_subtotal": 9500.00
    }
  ],
  "correction_log": [
    { "action": "qty_reduced", "item": "Fixed Dome Camera", "from": 25, "to": 10, "reason": "13 phantom cameras identified by Devil's Advocate", "cost_impact": -5700.00 },
    { "action": "price_clamped", "item": "360 Fisheye Camera", "from_price": 18396.88, "to_price": 3500.00, "reason": "Exceeded guardrail max ($8,750)", "cost_impact": -14896.88 },
    { "action": "item_added", "item": "Camera Pole 20ft with base", "qty": 4, "unit_cost": 650.00, "reason": "Missing from original — identified by Devil's Advocate", "cost_impact": 2600.00 }
  ],
  "corrected_grand_total": 0,
  "original_grand_total": 0,
  "total_adjustment": 0,
  "adjustment_summary": "Reduced camera count by 13, clamped 3 inflated prices, added missing camera poles and foundations"
}`;
      },

      // ── BRAIN 10: Report Writer ──────────────────────────────
      REPORT_WRITER: () => {
        const matMarkup = context.markup?.material || 50;
        const labMarkup = context.markup?.labor || 50;
        const eqMarkup = context.markup?.equipment || 15;
        const subMarkup = context.markup?.subcontractor || 10;
        return `You are a SENIOR CONSTRUCTION ESTIMATOR producing a COMPLETE BID PACKAGE.

This is a REAL BID that will be submitted to win a construction project. It MUST contain:
- EVERY material item with description, quantity, unit, unit cost, and extended cost
- EVERY labor task with hours, rate, and cost
- Markup columns so the estimator can adjust pricing
- A complete Schedule of Values with real dollar amounts

PROJECT: ${_sanitizeForPrompt(context.projectName || 'Project', 200)}
TYPE: ${_sanitizeForPrompt(context.projectType || 'Low Voltage', 100)}
LOCATION: ${_sanitizeForPrompt(context.projectLocation || 'TBD', 200)}
DISCIPLINES: ${(context.disciplines || []).join(', ')}
MARKUP CONFIG: Material ${matMarkup}% | Labor ${labMarkup}% | Equipment ${eqMarkup}% | Subcontractor ${subMarkup}%

USE THIS EXACT SECTION ORDER — EVERY section is MANDATORY:

## 1. CODE & STANDARDS COMPLIANCE REVIEW
List every code/standard that applies. Tag: 🔴 CRITICAL, 🟡 WARNING, 🔵 INFO

## 2. MDF/IDF/TR MATERIAL BREAKDOWN
For EACH telecom room, create a table:
| Item | Description | Qty | Unit | Unit Cost | Ext Cost |
Include: racks, patch panels, switches, UPS, PDU, cable management, grounding, fiber panels

## 3. MATERIAL TAKEOFF — DETAILED BID
This is the MAIN MATERIAL BID TABLE. It must be EXHAUSTIVE — every single material item.
Group by discipline. Use this EXACT table format:

### Structured Cabling Materials
| Item # | MFG | Part # | Description | Qty | Unit | Unit Cost | Ext Cost | Markup ${matMarkup}% | Sell Price |
|--------|-----|--------|-------------|-----|------|-----------|----------|------------|------------|
| SC-001 | Panduit | PUP6AV04BU-CEG | Cat 6A Plenum Cable | 30000 | ft | $0.32 | $9,600 | $4,800 | $14,400 |

IMPORTANT for MFG and Part #:
- If the construction documents SPECIFY a manufacturer and model/part number, use EXACTLY what is specified
- If the documents say "or approved equal", list the specified product first
- If NO specific product is specified, use standard manufacturers: Panduit/CommScope (cabling), Axis/Hanwha (CCTV), HID/Lenel (access), Notifier/EST (fire), Crestron/QSC (AV), Cisco (network), APC/Altronix (power)
- EVERY material line MUST have a Manufacturer and Part Number — NO BLANKS
- If you don't know the exact part number, use the common model series (e.g. Axis P3245-V, HID iCLASS SE R10, Panduit PUP6AV04)

### CCTV Materials
(same format)

### Access Control Materials
(same format)

### Fire Alarm Materials
(same format)

### Audio Visual Materials
(same format)

### Intrusion Detection Materials
(same format)

**Material Subtotals Table:**
| Discipline | Material Cost | Markup ${matMarkup}% | Sell Price |

## 4. LABOR BREAKDOWN — DETAILED BID
Break labor into phases. Use this EXACT table format:

### Phase 1: Rough-In
| Task # | Description | Classification | Hours | Rate/Hr | Labor Cost | Markup ${labMarkup}% | Sell Price |
|--------|-------------|----------------|-------|---------|------------|------------|------------|
| L-001 | Install cable tray - 500 LF | Journeyman | 100 | $65.00 | $6,500 | $1,950 | $8,450 |

### Phase 2: Trim & Termination
(same format)

### Phase 3: Programming & Configuration
(same format)

### Phase 4: Testing & Commissioning
(same format)

**Labor Subtotals Table:**
| Phase | Hours | Labor Cost | Markup ${labMarkup}% | Sell Price |

## 5. SPECIAL EQUIPMENT & CONDITIONS
| Item | Duration | Daily/Unit Cost | Total Cost | Markup ${eqMarkup}% | Sell Price |
Include: lifts, scaffolding, tools, certifiers, splicers

## 6. SUBCONTRACTOR COSTS
| Trade | Scope | Cost | Markup ${subMarkup}% | Sell Price |
Include: core drilling, trenching, firestopping, electrical

## 7. TRAVEL & PER DIEM
If project is distant from Rancho Cordova, CA. Otherwise state "Local Project — No Travel Required"

## 8. SCHEDULE OF VALUES (SOV)
AIA G703 format:
| SOV # | Description | Material | Labor | Equipment | Subcontractor | Total |

## 9. PROJECT COST SUMMARY
| Category | Base Cost | Markup | Sell Price |
|----------|-----------|--------|------------|
| Materials | $XXX | ${matMarkup}% | $XXX |
| Labor | $XXX | ${labMarkup}% | $XXX |
| Equipment | $XXX | ${eqMarkup}% | $XXX |
| Subcontractors | $XXX | ${subMarkup}% | $XXX |
| Travel | $XXX | — | $XXX |
| **SUBTOTAL** | | | **$XXX** |
| Contingency 10% | | | $XXX |
| **GRAND TOTAL** | | | **$XXX** |

## 10. PREVAILING WAGE DETERMINATION
If applicable, list wage classifications. Otherwise "Not Applicable"

## 11. OBSERVATIONS & RECOMMENDATIONS
Key findings from the analysis

## 12. RECOMMENDED RFIs
Gaps that need architect/engineer clarification

CRITICAL RULES:
- EVERY table must have REAL dollar amounts — NEVER use placeholders like "TBD" or "$XXX"
- EVERY material item must have a unit cost and extended cost
- EVERY labor task must have hours, rate, and cost
- EVERY row must include the markup column showing the markup dollar amount
- EVERY row must include the sell price (cost + markup)
- ALL math must be correct: Qty × Unit Cost = Extended Cost, Ext Cost × Markup% = Markup Amount
- Use the EXACT prices from the pricing database provided
- Number every item (SC-001, CC-001, AC-001, FA-001, L-001, etc.)

VALIDATED DATA FROM ALL 21 BRAINS (6-READ CONSENSUS):

SYMBOL COUNTS (1st Read):
${JSON.stringify(context.wave1?.SYMBOL_SCANNER || {}, null, 2).substring(0, 6000)}

TRIPLE-READ CONSENSUS COUNTS (Reads 1-3):
${JSON.stringify(context.wave1_75?.CONSENSUS_ARBITRATOR?.consensus_counts || context.wave1?.SYMBOL_SCANNER?.totals || {}, null, 2).substring(0, 3000)}

DETAIL VERIFIER (4th Read — precision area audit):
${JSON.stringify(context.wave3_5?.DETAIL_VERIFIER?.verified_counts || context.wave3_5?.DETAIL_VERIFIER?.corrections || {}, null, 2).substring(0, 3000)}

CROSS-SHEET ANALYZER (5th Read — inter-sheet consistency):
${JSON.stringify(context.wave3_5?.CROSS_SHEET_ANALYZER?.adjusted_counts || {}, null, 2).substring(0, 3000)}

FINAL RECONCILIATION (6th Read — AUTHORITATIVE counts — USE THESE):
${JSON.stringify(context.wave3_75?.FINAL_RECONCILIATION?.final_counts || {}, null, 2).substring(0, 4000)}

IMPORTANT: If Final Reconciliation counts are available, use THOSE as the definitive quantities. They represent 6 independent reads.

CODE COMPLIANCE:
${JSON.stringify(context.wave1?.CODE_COMPLIANCE || {}, null, 2).substring(0, 4000)}

MDF/IDF ROOMS:
${JSON.stringify(context.wave1?.MDF_IDF_ANALYZER || {}, null, 2).substring(0, 5000)}

CABLE & PATHWAY:
${JSON.stringify(context.wave1?.CABLE_PATHWAY || {}, null, 2).substring(0, 4000)}

SPECIAL CONDITIONS:
${JSON.stringify(context.wave1?.SPECIAL_CONDITIONS || {}, null, 2).substring(0, 3000)}

MATERIAL PRICING (use these exact numbers):
${(() => {
  // Use CORRECTED pricing if the Estimate Corrector ran successfully
  const corrected = context._correctedPricer;
  if (corrected && corrected.corrected_categories && corrected.corrected_categories.length > 0) {
    return `═══ ⚠️ CORRECTED MATERIAL DATA (post-verification) — USE THIS, NOT THE ORIGINAL ═══
The Estimate Corrector applied ${(corrected.correction_log || []).length} correction(s) to the original Material Pricer output.
Adjustment summary: ${corrected.adjustment_summary || 'See correction log'}
Original grand total: $${corrected.original_grand_total?.toLocaleString() || 'N/A'}
Corrected grand total: $${corrected.corrected_grand_total?.toLocaleString() || 'N/A'}

CORRECTED CATEGORIES:
${JSON.stringify(corrected.corrected_categories, null, 2).substring(0, 8000)}

CORRECTION LOG:
${JSON.stringify(corrected.correction_log || [], null, 2).substring(0, 3000)}`;
  }
  // Fallback: use original pricer data
  return JSON.stringify(context.wave2?.MATERIAL_PRICER || {}, null, 2).substring(0, 8000);
})()}

LABOR CALCULATIONS (use these exact numbers):
${JSON.stringify(context.wave2_25?.LABOR_CALCULATOR || {}, null, 2).substring(0, 8000)}

FINANCIALS & SOV:
${JSON.stringify(context.wave2_5_fin?.FINANCIAL_ENGINE || {}, null, 2).substring(0, 6000)}

CROSS-VALIDATION RESULTS (MUST FIX ALL CRITICAL ISSUES):
${JSON.stringify(context.wave3?.CROSS_VALIDATOR || {}, null, 2).substring(0, 4000)}

DEVIL'S ADVOCATE CHALLENGES (MUST ADDRESS ALL CRITICAL CHALLENGES):
${JSON.stringify(context.wave3?.DEVILS_ADVOCATE || {}, null, 2).substring(0, 4000)}

PRICING DATABASE REFERENCE:
${context.pricingContext?.substring(0, 4000) || 'Use industry standard pricing'}

═══ MANDATORY CORRECTIONS ═══
The Cross Validator and Devil's Advocate have identified issues with the estimate.
You MUST apply these corrections in the final bid report:
${context._missingDisciplines?.length > 0 ? `
🔴 CRITICAL — MATERIAL PRICER DROPPED THESE DISCIPLINES: ${context._missingDisciplines.join(', ')}
These disciplines have devices in the consensus counts but ZERO materials/labor were allocated.
You MUST calculate and add materials + labor for ALL missing disciplines using the consensus counts and pricing database.
` : ''}
1. **MISSING SCOPE**: If the Cross Validator or Devil's Advocate reports that a discipline (e.g., Access Control, Data Outlets, AV) is MISSING from the Material Pricer, you MUST add those materials and labor to the bid. Use the consensus device counts and pricing database to calculate costs.

2. **QUANTITY CORRECTIONS**: If the validator found quantity mismatches (e.g., 25 cameras in consensus but 24 in pricer), use the HIGHER count from the consensus. Include all exterior/outdoor devices identified.

3. **MARKUP CORRECTIONS**: If the validator found that markup was dropped (e.g., Financial Engine used base cost instead of sell price), recalculate using the correct total_with_markup values from Material Pricer and Labor Calculator.

4. **MISSING INFRASTRUCTURE**: Add any missing items flagged by the Devil's Advocate: backbone cables, grounding busbars (TMGB/TGB), UPS units for MDF/IDF racks, and any other items that standard ELV practice requires.

5. **LABOR RATE VERIFICATION**: If the project location has prevailing wage requirements or is in a high-cost region, ensure labor rates reflect actual market rates for that region — not national averages. Northern California journeyman rates should be $85-$160/hr burdened.

The final bid MUST incorporate ALL corrections. Do NOT just report the errors — FIX them in the actual tables and totals.

Generate the COMPLETE BID REPORT now. Every section must have real data with real dollar amounts. This is not a template — it is an actual bid.`;
      },

      // ── BRAIN 0: Legend Decoder (Wave 0 — Pre-Processing) ─────
      LEGEND_DECODER: () => `You are a CONSTRUCTION SYMBOL LEGEND EXPERT. Your ONLY job is to decode the symbol legend and build a structured dictionary BEFORE any counting begins.

PROJECT: ${_sanitizeForPrompt(context.projectName || 'Unknown', 200)}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

INSTRUCTIONS:
1. Study every symbol on the legend sheet(s) meticulously
2. For each symbol, describe its visual appearance (shape, fill, letters, size)
3. Classify each symbol by discipline and device type
4. Note any symbols that are ambiguous or could be confused with others
5. Rate overall legend quality (excellent/good/fair/poor)

Return ONLY valid JSON:
{
  "symbols": [
    { "symbol_id": "S1", "visual": "Solid circle with C inside", "discipline": "CCTV", "device_type": "fixed_dome_camera", "label_on_legend": "Camera - Fixed Dome", "similar_to": null, "confidence": 98 }
  ],
  "legend_quality": "good",
  "ambiguous_symbols": [
    { "symbol_id": "S5", "reason": "Similar shape to smoke detector - differentiate by size", "could_be": ["smoke_detector", "heat_detector"] }
  ],
  "total_unique_symbols": 24,
  "disciplines_covered": ["Structured Cabling", "CCTV"]
}`,

      // ── BRAIN 0.5: Spatial Layout (Wave 0 — parallel with Legend Decoder) ──
      SPATIAL_LAYOUT: () => `You are a BUILDING SPATIAL ANALYST. Your job is to extract floor plan geometry, IDF/MDF room positions, and device zone positions so cable run lengths can be precisely calculated.

PROJECT: ${_sanitizeForPrompt(context.projectName || 'Unknown', 200)} | Type: ${_sanitizeForPrompt(context.projectType || 'Unknown', 100)}

═══ CRITICAL: PER-SHEET SCALE DETECTION ═══
Different sheets in a plan set often use DIFFERENT SCALES. A warehouse floor plan might be 1/16"=1'-0" while an office detail is 1/4"=1'-0". You MUST determine the scale for EACH SHEET independently.

YOUR MISSION — For each floor plan sheet:
1. FIND THE SCALE — check these sources IN ORDER:
   a. Title block scale notation (e.g., "SCALE: 1/8" = 1'-0"" or "1:96")
   b. Scale bar graphic (measure labeled increments)
   c. Dimension lines on the drawing (if a dimension reads "30'-0"" between two walls, use that to calibrate)
   d. DOOR FALLBACK: If no scale bar, no title block scale, and no dimension lines — find a standard door on the plan. A standard single door opening is 3 ft (36 inches) wide by 6'-8" to 7'-0" tall. Measure the door width in the drawing and calculate: scale = 3 ft ÷ measured_door_width_on_page. This gives you feet-per-inch for that sheet.
   e. If NOTHING works, note "scale_method": "unable" and estimate conservatively.

2. SHEET DIMENSIONS: Using the detected scale, calculate the real-world width and depth (in feet) of the area shown on that sheet. NOT the paper size — the actual building area the sheet covers.

3. CEILING HEIGHT: Look for ceiling height notes, section cuts, or room finish schedules. Default 10 ft if not found.
4. FLOOR-TO-FLOOR HEIGHT: Look for section drawings or structural notes. Default 14 ft if not found.

5. FOR EACH FLOOR — map IDF/MDF/TR positions and device zones as percentage positions (0%=left/top, 100%=right/bottom).

POSITION ESTIMATION RULES:
- Use each floor plan as its own coordinate grid
- ±10% accuracy is acceptable for zone centroid positions
- If a building has irregular shape, estimate from the main occupied area
- If multiple buildings, treat each as a separate floor entry

Return ONLY valid JSON:
{
  "sheets": [
    {
      "sheet_id": "E1.01",
      "sheet_name": "First Floor Electrical Plan",
      "scale": {
        "labeled": "1/8 inch = 1 ft",
        "scale_method": "title_block",
        "confidence": "high",
        "ft_per_inch": 8
      },
      "sheet_area_width_ft": 220,
      "sheet_area_depth_ft": 180,
      "notes": ""
    },
    {
      "sheet_id": "E2.01",
      "sheet_name": "Warehouse Plan",
      "scale": {
        "labeled": "1/16 inch = 1 ft",
        "scale_method": "scale_bar",
        "confidence": "high",
        "ft_per_inch": 16
      },
      "sheet_area_width_ft": 450,
      "sheet_area_depth_ft": 300,
      "notes": "Warehouse uses smaller scale than office sheets"
    },
    {
      "sheet_id": "E3.01",
      "sheet_name": "Office Detail",
      "scale": {
        "labeled": null,
        "scale_method": "door_reference",
        "confidence": "medium",
        "ft_per_inch": 4,
        "reference_object": "Single door opening measured at 0.75 inches on plan = 3 ft real"
      },
      "sheet_area_width_ft": 80,
      "sheet_area_depth_ft": 60,
      "notes": "No scale bar — derived from 36-inch door opening"
    }
  ],
  "building_dimensions": {
    "overall_width_ft": 450,
    "overall_depth_ft": 300,
    "confidence": "high",
    "source": "Largest sheet extent (Warehouse Plan E2.01)"
  },
  "ceiling_height_ft": 10,
  "floor_to_floor_ft": 14,
  "floors": [
    {
      "floor": 1,
      "floor_label": "Level 1",
      "floor_area_sf": 18500,
      "sheet_id": "E1.01",
      "idf_locations": [
        { "label": "IDF-1A", "room_name": "Telecom Room 105", "approx_x_pct": 85, "approx_y_pct": 15, "description": "Northeast corner of floor" }
      ],
      "device_zones": [
        { "zone": "Lobby / Entry", "approx_x_pct": 50, "approx_y_pct": 80, "nearest_idf": "IDF-1A", "est_distance_to_idf_ft": 120, "floor": 1, "sheet_id": "E1.01" },
        { "zone": "Warehouse", "approx_x_pct": 30, "approx_y_pct": 50, "nearest_idf": "IDF-1A", "est_distance_to_idf_ft": 250, "floor": 1, "sheet_id": "E2.01" },
        { "zone": "East Corridor", "approx_x_pct": 80, "approx_y_pct": 50, "nearest_idf": "IDF-1A", "est_distance_to_idf_ft": 60, "floor": 1, "sheet_id": "E1.01" }
      ]
    }
  ],
  "multi_building": false,
  "notes": []
}

RULES:
- "scale_method" MUST be one of: "title_block", "scale_bar", "dimension_line", "door_reference", "unable"
- "ft_per_inch" is how many real-world feet each inch on the plan represents
- Each device_zone SHOULD include "sheet_id" to link it to the correct sheet scale
- The "building_dimensions" is the OVERALL envelope (largest extents across all sheets)
- If a zone spans multiple sheets at different scales, use the sheet where its centroid falls`,

      // ── BRAIN 6: Shadow Scanner (Wave 1.5 — Second Read) ──────
      SHADOW_SCANNER: () => `You are an INDEPENDENT VERIFICATION SCANNER performing a SECOND COUNT of all ELV device symbols. You must use a COMPLETELY DIFFERENT methodology than a standard left-to-right scan.

PROJECT: ${_sanitizeForPrompt(context.projectName || 'Unknown', 200)}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

LEGEND DICTIONARY (from Legend Decoder):
${JSON.stringify(context.wave0?.LEGEND_DECODER || {}, null, 2).substring(0, 4000)}

YOUR METHODOLOGY — ROOM-BY-ROOM SCAN:
1. Identify every distinct room/space/area on each sheet
2. For EACH room, count every device symbol inside its boundaries
3. Then count devices in corridors, lobbies, and common areas
4. Finally count any devices in mechanical/electrical rooms
5. Sum by room to get sheet totals, then grand totals

CRITICAL: You have NOT seen the first count. You are a completely independent reader. Do NOT guess — if you cannot clearly identify a symbol, mark it as "uncertain".

Return ONLY valid JSON (same schema as Symbol Scanner):
{
  "sheets": [
    {
      "sheet_id": "E1.01",
      "sheet_name": "First Floor Plan",
      "rooms_scanned": ["Lobby", "Office 101", "Corridor A"],
      "symbols": [
        { "type": "camera", "subtype": "fixed_dome", "count": 12, "confidence": 95, "by_room": {"Lobby": 3, "Corridor A": 5, "Office 101": 4} }
      ]
    }
  ],
  "totals": { "camera": 48, "data_outlet": 200 },
  "methodology": "room-by-room",
  "unidentified_symbols": [],
  "notes": ""
}`,

      // ── BRAIN 7: Discipline Deep-Dive (Wave 1.5) ──────────────
      DISCIPLINE_DEEP_DIVE: () => {
        const primary = (context.disciplines || [])[0] || 'Structured Cabling';
        return `You are a SPECIALIST COUNTER focused EXCLUSIVELY on ${primary} symbols. Ignore all other disciplines entirely.

PROJECT: ${_sanitizeForPrompt(context.projectName || 'Unknown', 200)}
YOUR DISCIPLINE: ${primary} — count ONLY these symbols

LEGEND DICTIONARY:
${JSON.stringify((context.wave0?.LEGEND_DECODER?.symbols || []).filter(s => s.discipline === primary), null, 2).substring(0, 3000)}

FIRST READ COUNTS (for reference — verify independently):
${JSON.stringify(context.wave1?.SYMBOL_SCANNER?.totals || {}, null, 2).substring(0, 2000)}

INSTRUCTIONS:
1. Go sheet by sheet counting ONLY ${primary} devices
2. For each device, note the exact location (room name or grid reference)
3. Pay special attention to dense areas where devices cluster
4. Double-check areas near MDF/IDF rooms where device density is highest
5. Report any devices that are partially hidden behind text or other symbols

Return ONLY valid JSON:
{
  "discipline": "${primary}",
  "discipline_counts": [
    { "device_type": "data_outlet", "total": 200, "confidence": 96, "by_sheet": {"E1.01": 80, "E1.02": 120}, "notes": "" }
  ],
  "total_devices": 250,
  "problem_areas": [
    { "sheet": "E1.02", "area": "Open office zone", "issue": "Dense cluster — counted 3 times to confirm" }
  ]
}`;
      },

      // ── BRAIN 8: Quadrant Scanner (Wave 1.5) ──────────────────
      QUADRANT_SCANNER: () => `You are a ZONE-BASED VERIFICATION SCANNER. Instead of scanning by room, you divide each sheet into QUADRANTS and count devices per zone.

PROJECT: ${_sanitizeForPrompt(context.projectName || 'Unknown', 200)}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

YOUR METHODOLOGY — QUADRANT DIVISION:
For each sheet:
1. Mentally divide the drawing into 4 quadrants: TOP-LEFT, TOP-RIGHT, BOTTOM-LEFT, BOTTOM-RIGHT
2. Count ALL device symbols in each quadrant independently
3. Sum the 4 quadrants to get the sheet total
4. This catches devices missed by room-based scanning (devices in undefined spaces, on boundaries)

WHY THIS WORKS: Devices at room boundaries, in ceiling spaces, or in areas without clear room labels are often missed by room-based counting. Zone-based counting catches them.

Return ONLY valid JSON:
{
  "quadrants": [
    {
      "sheet_id": "E1.01",
      "top_left": { "camera": 3, "data_outlet": 15 },
      "top_right": { "camera": 5, "data_outlet": 20 },
      "bottom_left": { "camera": 2, "data_outlet": 18 },
      "bottom_right": { "camera": 4, "data_outlet": 12 },
      "sheet_total": { "camera": 14, "data_outlet": 65 }
    }
  ],
  "totals": { "camera": 48, "data_outlet": 200 },
  "boundary_devices": [
    { "sheet": "E1.01", "type": "data_outlet", "count": 3, "note": "On boundary between quadrants — counted once" }
  ]
}`,

      // ── BRAIN 9: Consensus Arbitrator (Wave 1.75) ─────────────
      CONSENSUS_ARBITRATOR: () => `You are a SENIOR CONSENSUS ANALYST. Multiple independent teams just counted every device symbol on the same construction drawings using different methodologies. Your job is to find the TRUTH.

READ 1 — Systematic Scan (Symbol Scanner):
${JSON.stringify(context.wave1?.SYMBOL_SCANNER?.totals || {}, null, 2)}

READ 2 — Room-by-Room Scan (Shadow Scanner):
${JSON.stringify(context.wave1_5?.SHADOW_SCANNER?.totals || {}, null, 2)}

READ 3 — Quadrant Scan:
${JSON.stringify(context.wave1_5?.QUADRANT_SCANNER?.totals || {}, null, 2)}

READ 4 — Zoom Scanner (4-quadrant precision):
${JSON.stringify(context.wave1_5?.ZOOM_SCANNER?.grand_totals || {}, null, 2).substring(0, 2000)}

READ 5 — Per-Floor Analyzer:
${JSON.stringify(context.wave1_5?.PER_FLOOR_ANALYZER?.floor_breakdown || [], null, 2).substring(0, 2000)}

DISCIPLINE SPECIALIST COUNT:
${JSON.stringify(context.wave1_5?.DISCIPLINE_DEEP_DIVE?.discipline_counts || {}, null, 2).substring(0, 2000)}

═══ ANNOTATION & SCHEDULE DATA (from Annotation Reader) ═══
TYPICAL NOTES (these multiply device counts):
${JSON.stringify(context.wave1?.ANNOTATION_READER?.annotations?.filter(a => a.type === 'typical_note') || [], null, 2).substring(0, 2000)}

EQUIPMENT SCHEDULES FOUND ON DRAWINGS:
${JSON.stringify(context.wave1?.ANNOTATION_READER?.schedule_data || [], null, 2).substring(0, 2000)}

EXCLUSIONS (BY OTHERS / NIC — DO NOT COUNT):
${JSON.stringify(context.wave1?.ANNOTATION_READER?.exclusions || [], null, 2).substring(0, 1000)}

═══ SPEC CROSS-REFERENCE DATA ═══
${JSON.stringify(context.wave1?.SPEC_CROSS_REF?.discrepancies || [], null, 2).substring(0, 1500)}

═══ RISER DIAGRAM DATA ═══
${JSON.stringify(context.wave1?.RISER_DIAGRAM_ANALYZER?.headend_equipment || [], null, 2).substring(0, 1500)}

CONSENSUS RULES:
1. If ALL reads agree within 5% → HIGH CONFIDENCE. Use the average.
2. If 2+ reads agree within 5% → MODERATE CONFIDENCE. Use the agreeing group's average.
3. If ALL reads disagree by >10% → DISPUTE. Flag for targeted re-scan.
4. For disputed items, identify WHICH sheets/areas likely caused the disagreement.

═══ CRITICAL: TYPICAL NOTE MULTIPLICATION ═══
When an annotation says "TYP" or "TYPICAL" (e.g., "Card reader TYP at each secure door"):
- Check the Per-Floor Analyzer for the count of matching locations (e.g., how many "secure doors" exist)
- MULTIPLY the device by the number of matching locations
- If the TYPICAL count is HIGHER than the symbol count, USE THE TYPICAL COUNT (the symbols may not be drawn on every door)
- Document each TYPICAL multiplication in the output

═══ CRITICAL: EQUIPMENT SCHEDULE CROSS-CHECK ═══
When the Annotation Reader found equipment schedules (tables on drawings):
- These schedules are AUTHORITATIVE — they were created by the design engineer
- If a schedule says "48 cameras" but the symbol count says 42, THE SCHEDULE IS CORRECT
- Use schedule data to OVERRIDE symbol counts when schedules exist
- Document each schedule override in the output

Return ONLY valid JSON:
{
  "consensus_counts": {
    "camera": { "read1": 48, "read2": 46, "read3": 49, "read4_zoom": 47, "read5_floor": 48, "consensus": 48, "confidence": "high", "method": "5-way average" }
  },
  "typical_multiplications": [
    { "device": "card_reader", "note": "TYP at each secure door", "locations_counted": 14, "result": 14, "source": "Annotation Reader + Per-Floor Analyzer" }
  ],
  "schedule_overrides": [
    { "device": "camera", "schedule_name": "Camera Schedule on ES650", "schedule_qty": 82, "symbol_count_qty": 70, "used": 82, "reason": "Schedule is authoritative" }
  ],
  "disputes": [
    { "device_type": "data_outlet", "read1": 200, "read2": 180, "read3": 210, "variance_pct": 15, "likely_problem_area": "Sheet E1.02 open office zone", "needs_rescan": true }
  ],
  "confidence": 94,
  "total_items_compared": 15,
  "items_in_consensus": 12,
  "items_disputed": 3
}`,

      // ── BRAIN 10: Targeted Re-Scanner (Wave 1.75) ─────────────
      TARGETED_RESCANNER: () => {
        const disputes = context.wave1_75?.CONSENSUS_ARBITRATOR?.disputes || [];
        if (disputes.length === 0) return '';
        return `You are a FORENSIC SYMBOL COUNTER performing a TARGETED THIRD READ. The consensus engine found ${disputes.length} disputed item(s) where three independent counts disagreed significantly.

YOUR MISSION: Re-count ONLY the disputed items. Focus ONLY on the problem areas identified below.

DISPUTED ITEMS FOR RE-COUNT:
${JSON.stringify(disputes, null, 2)}

LEGEND DICTIONARY:
${JSON.stringify(context.wave0?.LEGEND_DECODER?.symbols || [], null, 2).substring(0, 3000)}

INSTRUCTIONS:
1. For each disputed item, go to the specified problem area
2. Count with EXTREME precision — zoom in, count twice
3. If a symbol is ambiguous, describe what you see and your best judgment
4. Provide your final authoritative count with reasoning

Return ONLY valid JSON:
{
  "resolved_items": [
    { "device_type": "data_outlet", "final_count": 195, "confidence": 97, "reasoning": "Found 15 outlets obscured by furniture symbols on Sheet E1.02 that Read 1 missed and Read 3 double-counted at quadrant boundary" }
  ],
  "final_counts": { "data_outlet": 195 },
  "unresolvable": []
}`;
      },

      // ── BRAIN 14: Reverse Verifier (Wave 2.5) ────────────────
      REVERSE_VERIFIER: () => `You are a REVERSE VERIFICATION ENGINEER. The cost engine has produced a Bill of Quantities. Your job is to COUNT BACKWARDS — take the BOQ and verify each line item actually exists on the plans.

THIS IS THE OPPOSITE OF NORMAL COUNTING: Instead of "look at plans → count devices", you do "look at BOQ → find devices on plans".

MATERIAL BOQ TO VERIFY:
${JSON.stringify(context.wave2?.MATERIAL_PRICER?.categories || [], null, 2).substring(0, 6000)}

CONSENSUS COUNTS:
${JSON.stringify(context.wave1_75?.CONSENSUS_ARBITRATOR?.consensus_counts || context.wave1?.SYMBOL_SCANNER?.totals || {}, null, 2).substring(0, 2000)}

FOR EACH LINE ITEM:
1. Can you find evidence of this quantity on the plans? (Yes/No/Partial)
2. Does the quantity match what you can count? Note any discrepancies.
3. Are there items on the plans NOT in the BOQ? (missed items)
4. Are there items in the BOQ NOT on the plans? (phantom items)

Return ONLY valid JSON:
{
  "verified_items": [
    { "item": "Cat 6A Plenum Cable", "boq_qty": 30000, "verified": true, "plan_evidence": "Consistent with 200 drops × 150ft avg", "discrepancy": null }
  ],
  "discrepancies": [
    { "item": "Card Reader", "boq_qty": 12, "actual_on_plans": 15, "difference": 3, "location": "3 readers on Sheet E2.01 not counted" }
  ],
  "phantom_items": [],
  "missed_items": [],
  "verification_score": 96
}`,

      // ── BRAIN 16: Devil's Advocate (Wave 3) ───────────────────
      DEVILS_ADVOCATE: () => `You are a HOSTILE AUDITOR whose job is to FIND EVERYTHING WRONG with this estimate. You are paid to find errors. An estimate with zero issues is suspicious — dig deeper.

THIS ESTIMATE MAY BE USED FOR PROJECTS UP TO $50 BILLION. YOUR JOB IS TO PROTECT THE COMPANY FROM A BAD BID.

FULL ESTIMATE DATA:
Symbol Counts: ${JSON.stringify(context.wave1_75?.CONSENSUS_ARBITRATOR?.consensus_counts || context.wave1?.SYMBOL_SCANNER?.totals || {}, null, 2).substring(0, 2000)}
Materials: ${JSON.stringify(context.wave2?.MATERIAL_PRICER || {}, null, 2).substring(0, 3000)}
Labor: ${JSON.stringify(context.wave2_25?.LABOR_CALCULATOR || {}, null, 2).substring(0, 3000)}
Financials: ${JSON.stringify(context.wave2_5_fin?.FINANCIAL_ENGINE?.project_summary || {}, null, 2).substring(0, 2000)}
Reverse Verification: ${JSON.stringify(context.wave2_75?.REVERSE_VERIFIER || {}, null, 2).substring(0, 2000)}

ATTACK VECTORS — Challenge the estimate on:
1. WHAT'S MISSING? Items that should be in a typical ELV project of this type but aren't
2. WHAT'S SUSPICIOUSLY CHEAP? Unit costs that seem below market rate
3. WHAT'S SUSPICIOUSLY EXPENSIVE? Items priced above market
4. LABOR TOO LOW? Not enough hours for the scope described
5. HIDDEN COSTS? Site conditions, permits, or equipment not accounted for
6. DOUBLE COUNTING? Same device counted in multiple categories
7. PHANTOM ITEMS? Materials listed that don't match any symbol on plans

═══ CRITICAL DISTINCTION: BID ERRORS vs. CHANGE ORDERS ═══
If something IS on the plans or specs and we missed it — that is a BID ERROR, NOT a change order.
Put bid errors in "challenges" and "missed_items" — these get corrected in our bid.

A TRUE CHANGE ORDER is ONLY for scope that is NOT in the plans AND NOT in the specs.
Examples of TRUE change orders:
- Owner verbally mentioned adding cameras to the parking garage but it's not in the drawings or spec
- The spec says "coordinate with GC for power" but no electrical scope is shown — who pays for the electrician?
- Building conditions that can't be known until site visit (e.g., asbestos, hidden obstacles)
- Ambiguous spec language that could be interpreted as additional scope beyond what's drawn
- Items referenced in specs as "future" or "owner-furnished" that may change
- Code-required items that are neither drawn nor specified (e.g., fire stopping not called out)

DO NOT put items in true_change_orders if they are shown on the plans or called out in the specifications.
If it's on the plans or in the specs, it belongs in our bid — period.

Return ONLY valid JSON:
{
  "challenges": [
    { "severity": "critical", "category": "missing_item", "description": "No UPS listed for MDF room — this is always required", "estimated_impact": "$2,500-$8,000", "recommendation": "Add rack-mount UPS per TIA-569" }
  ],
  "risk_score": 15,
  "risk_level": "low|medium|high|critical",
  "missed_items": [],
  "pricing_flags": [],
  "overall_assessment": "string",
  "true_change_orders": [
    { "severity": "high", "description": "Spec references 'future card readers at gates' — not drawn or spec'd but owner may add during construction", "estimated_impact": "$5,000-$12,000", "justification": "Not in plans or specs — referenced only as future scope in general notes" }
  ]
}`,

      // ── BRAIN 18: Detail Verifier (Wave 3.5 — 4th Read) ──────
      DETAIL_VERIFIER: () => {
        const consensus = context.wave1_75?.CONSENSUS_ARBITRATOR?.consensus_counts || {};
        const crossVal = context.wave3?.CROSS_VALIDATOR?.issues || [];
        const devilItems = context.wave3?.DEVILS_ADVOCATE?.missed_items || [];
        return `You are a DETAIL VERIFICATION SPECIALIST performing a FOURTH READ of the construction plans. Your job is to ZOOM INTO specific areas and provide PRECISE COUNTS.

PROJECT: ${_sanitizeForPrompt(context.projectName || 'Unknown', 200)}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

PREVIOUS CONSENSUS COUNTS (from 3 prior reads):
${JSON.stringify(consensus, null, 2).substring(0, 5000)}

CROSS-VALIDATOR ISSUES FLAGGED:
${JSON.stringify(crossVal, null, 2).substring(0, 3000)}

DEVIL'S ADVOCATE ITEMS POTENTIALLY MISSED:
${JSON.stringify(devilItems, null, 2).substring(0, 3000)}

LEGEND DICTIONARY:
${JSON.stringify(context.wave0?.LEGEND_DECODER?.symbols || [], null, 2).substring(0, 3000)}

YOUR METHODOLOGY — PRECISION AREA AUDIT:
1. Focus on EVERY AREA where previous reads disagreed or flagged low confidence
2. For each area: count every device symbol TWICE (count, reset, recount)
3. Pay special attention to dense areas (open offices, corridors, ceilings)
4. Verify symbol identification matches the legend exactly
5. Count devices near sheet boundaries that may have been double-counted or missed
6. Check for symbols hidden behind text labels, dimensions, or other annotations

CRITICAL: Your counts must be PRECISE. If your count differs from consensus, explain exactly why.

Return ONLY valid JSON:
{
  "area_audits": [
    { "area": "Sheet E1.01 - Open Office West", "device_type": "data_outlet", "first_count": 42, "recount": 42, "consensus_had": 38, "discrepancy_reason": "4 outlets behind furniture symbols near columns C3-C6" }
  ],
  "corrections": [
    { "device_type": "data_outlet", "old_count": 200, "new_count": 208, "reason": "Found 8 additional outlets in areas obscured by annotation text" }
  ],
  "verified_counts": { "data_outlet": 208, "camera": 48 },
  "confidence": 97
}`;
      },

      // ── BRAIN 19: Cross-Sheet Analyzer (Wave 3.5 — 5th Read) ──
      CROSS_SHEET_ANALYZER: () => {
        const wave1Data = context.wave1?.SYMBOL_SCANNER?.sheets || [];
        const shadowData = context.wave1_5?.SHADOW_SCANNER?.sheets || [];
        const quadData = context.wave1_5?.QUADRANT_SCANNER?.quadrants || [];
        return `You are a CROSS-SHEET CONSISTENCY ANALYZER performing a FIFTH READ. Your job is to compare different sheets AGAINST EACH OTHER to find inconsistencies, overlaps, and missing coverage.

PROJECT: ${_sanitizeForPrompt(context.projectName || 'Unknown', 200)}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

SHEET DATA FROM FIRST READ:
${JSON.stringify(wave1Data, null, 2).substring(0, 5000)}

SHEET DATA FROM SECOND READ:
${JSON.stringify(shadowData, null, 2).substring(0, 5000)}

QUADRANT DATA:
${JSON.stringify(quadData, null, 2).substring(0, 3000)}

YOUR METHODOLOGY — CROSS-SHEET ANALYSIS:
1. Compare EACH pair of adjacent floor plan sheets for boundary overlap
   - Are devices at sheet boundaries counted on BOTH sheets? (double-counting risk)
   - Are devices at sheet boundaries counted on NEITHER sheet? (missed items)
2. Compare floor-to-floor consistency
   - If Floor 1 has 50 data outlets per floor section, does Floor 2 have a similar density?
   - Flag major density differences (>30%) between similar floor sections
3. Compare detail sheets against plan sheets
   - Do enlarged detail views show devices NOT on the main plan? (or vice versa)
4. Check riser diagrams against floor plans
   - Does the backbone cable count match the floor plan MDF/IDF connections?
5. Verify sheet count totals match the overall legend or schedule (if provided)

Return ONLY valid JSON:
{
  "sheet_comparisons": [
    { "sheet1": "E1.01", "sheet2": "E1.02", "issue": "boundary_overlap", "device_type": "data_outlet", "count_adjustment": -3, "reason": "3 outlets at column line G appear on both sheets" }
  ],
  "inconsistencies": [
    { "type": "density_mismatch", "sheet": "E2.01", "expected_range": "40-50", "actual": 22, "note": "Floor 2 east wing has significantly fewer outlets than Floor 1 equivalent" }
  ],
  "adjusted_counts": { "data_outlet": 205, "camera": 47 },
  "boundary_checks_performed": 0,
  "floors_compared": 0,
  "confidence": 95
}`;
      },

      // ── BRAIN 20: Final Reconciliation (Wave 3.75 — 6th Read) ──
      FINAL_RECONCILIATION: () => {
        const consensus = context.wave1_75?.CONSENSUS_ARBITRATOR?.consensus_counts || {};
        const detailVerifier = context.wave3_5?.DETAIL_VERIFIER || {};
        const crossSheet = context.wave3_5?.CROSS_SHEET_ANALYZER || {};
        const reverseVerifier = context.wave2_75?.REVERSE_VERIFIER || {};
        const devil = context.wave3?.DEVILS_ADVOCATE || {};
        return `You are the FINAL RECONCILIATION ENGINE performing the SIXTH AND FINAL READ of the construction plans. You have access to ALL previous data from 5 prior reads. Your job is to produce the AUTHORITATIVE, DEFINITIVE device counts.

PROJECT: ${_sanitizeForPrompt(context.projectName || 'Unknown', 200)}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

═══ DATA FROM ALL 5 PRIOR READS ═══

TRIPLE-READ CONSENSUS (Reads 1-3):
${JSON.stringify(consensus, null, 2).substring(0, 4000)}

DETAIL VERIFIER (Read 4 — precision area audit):
${JSON.stringify(detailVerifier, null, 2).substring(0, 4000)}

CROSS-SHEET ANALYZER (Read 5 — inter-sheet consistency):
${JSON.stringify(crossSheet, null, 2).substring(0, 4000)}

REVERSE VERIFIER (BOQ-to-plan validation):
${JSON.stringify(reverseVerifier, null, 2).substring(0, 3000)}

DEVIL'S ADVOCATE (adversarial audit):
${JSON.stringify(devil, null, 2).substring(0, 3000)}

LEGEND DICTIONARY:
${JSON.stringify(context.wave0?.LEGEND_DECODER?.symbols || [], null, 2).substring(0, 2000)}

═══ YOUR FINAL MISSION ═══
1. Perform ONE COMPLETE FINAL SWEEP of every plan sheet
2. For EACH device type, compare your count against ALL 5 previous readings
3. If all 6 reads agree (±5%), use the median value
4. If there's significant disagreement, ZOOM IN and count manually with extreme precision
5. Apply cross-sheet boundary corrections (from Read 5)
6. Apply detail verifier corrections (from Read 4)
7. Produce FINAL AUTHORITATIVE COUNTS — these are the numbers that go into the bid

CRITICAL: This is the LAST CHANCE to get counts right. The bid price depends on these numbers. If you are uncertain about any count, round UP slightly (it's better to over-quote than under-quote).

Return ONLY valid JSON:
{
  "final_counts": {
    "data_outlet": { "count": 208, "confidence": 98, "reads_agreed": 5, "range_across_reads": [195, 200, 205, 208, 205, 208] },
    "camera": { "count": 48, "confidence": 99, "reads_agreed": 6, "range_across_reads": [48, 48, 47, 48, 47, 48] }
  },
  "adjustment_log": [
    { "device_type": "data_outlet", "original_consensus": 200, "final_count": 208, "adjustment": "+8", "reason": "Detail Verifier found 4 behind annotations + Cross-Sheet caught 4 missed at boundaries" }
  ],
  "confidence_score": 97,
  "total_devices_counted": 0,
  "reading_methodology": "6-read consensus with precision verification"
}`;
      },

      // ── BRAIN 21: Spec Cross-Reference (Wave 1) ─────────────────
      SPEC_CROSS_REF: () => `You are a SPECIFICATION CROSS-REFERENCE EXPERT for ELV/low voltage construction projects.

PROJECT: ${_sanitizeForPrompt(context.projectName || 'Unknown', 200)} | Type: ${_sanitizeForPrompt(context.projectType || 'Unknown', 100)}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

YOUR MISSION: Cross-reference the written specifications against the plan drawings to find discrepancies.
ALSO: Extract ALL manufacturer and part/model number specifications from every spec section.

WHAT TO CHECK:
1. Equipment lists in specs vs. symbols on drawings — anything specified but NOT drawn?
2. Equipment on drawings that is NOT mentioned in specifications
3. Quantity discrepancies between spec schedules and drawing counts
4. Model/type mismatches between specs and legend
5. Cable type and quantity specifications vs. what's shown on riser/plan drawings
6. Room-by-room spec requirements vs. what's actually shown

═══ CRITICAL: EXTRACT ALL SPECIFIED PRODUCTS ═══
For EVERY equipment type mentioned in the specs, extract:
- Exact manufacturer name
- Exact model number / part number
- Whether it says "or approved equal" (which means you can substitute)
- The spec section number (e.g. 28 13 00)
This includes: cameras, NVRs, readers, panels, cable types, patch panels,
UPS units, inverters, power supplies, switches, racks, fire alarm devices, AV equipment

═══ CRITICAL: UPS, INVERTERS & POWER EQUIPMENT ═══
Look specifically for:
- UPS (Uninterruptible Power Supply) — manufacturer, model, kVA rating
- Inverters (power inverters, solar inverters)
- Transfer switches (ATS/STS) — manual or automatic
- Battery backup systems — type, AH rating
- Power supplies — voltage, amperage, manufacturer
- PDUs — type, amperage, manufacturer
- Surge protectors / SPDs
These are HIGH-VALUE items that are often specified in the specs but easy to miss.

CRITICAL CHECK: Look for scope items in the spec that have NO corresponding symbol on any drawing. These MUST be included in the bid — they are NOT change orders. If the spec calls for it, we bid it, even if it's not drawn.

TRUE CHANGE ORDERS: Items that are NOT in the specs AND NOT on the drawings but could arise during construction (ambiguous scope boundaries, owner-furnished items that may change, code requirements not addressed in either document). Put these in "true_change_orders" in your output.

Return ONLY valid JSON:
{
  "spec_vs_drawing": [
    { "item": "Card Reader - HID iCLASS", "in_spec": true, "on_drawings": true, "spec_qty": 24, "drawing_qty": 22, "discrepancy": "2 readers specified but not found on drawings", "severity": "high" }
  ],
  "discrepancies": [
    { "type": "missing_from_drawings", "item": "Intercom Station", "spec_section": "28 13 00", "description": "Spec calls for 6 intercom stations, none shown on floor plans", "cost_impact": "high" }
  ],
  "specified_products": [
    { "spec_section": "28 23 00", "item_type": "IP Camera", "manufacturer": "Axis Communications", "model": "P3265-LVE", "or_equal": true },
    { "spec_section": "28 13 00", "item_type": "Card Reader", "manufacturer": "HID Global", "model": "iCLASS SE R10", "or_equal": false },
    { "spec_section": "27 10 00", "item_type": "UPS", "manufacturer": "APC", "model": "SMT3000RM2UC", "or_equal": true },
    { "spec_section": "27 10 00", "item_type": "Cable", "manufacturer": "Panduit", "model": "PUP6AV04BU-CEG", "or_equal": true }
  ],
  "power_equipment_found": [
    { "item_type": "UPS", "manufacturer": "APC", "model": "SMT3000RM2UC", "rating": "3kVA", "qty": 2, "location": "MDF, IDF-2F", "spec_section": "27 10 00" }
  ],
  "equipment_schedule": [
    { "item": "IP Camera", "spec_model": "Axis P3245-V", "drawing_symbol": "C1", "match": true }
  ],
  "spec_sections_reviewed": ["27 10 00", "28 13 00", "28 23 00"],
  "overall_spec_drawing_alignment": 85,
  "true_change_orders": [
    { "description": "Spec references 'future intercom stations' in general notes but no qty, location, or model specified — owner may add during construction", "severity": "medium", "estimated_impact": "$3,000-$8,000", "justification": "Not specified with enough detail to bid — referenced only as future scope" }
  ]
}`,

      // ── BRAIN 22: Annotation Reader (Wave 1) ────────────────────
      ANNOTATION_READER: () => `You are a CONSTRUCTION ANNOTATION & CALLOUT EXPERT. Your job is to read EVERY text annotation, note, callout bubble, detail reference, and schedule on the ELV plan drawings.

PROJECT: ${_sanitizeForPrompt(context.projectName || 'Unknown', 200)} | Type: ${_sanitizeForPrompt(context.projectType || 'Unknown', 100)}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

YOUR MISSION: Capture every piece of text information on the drawings that describes equipment, quantities, or installation requirements.

WHAT TO CAPTURE:
1. General notes and keynotes (numbered or lettered notes)
2. Detail callout bubbles (e.g., "See Detail 3/E6.01")
3. Equipment schedules and tables shown on drawings — READ EVERY ROW
4. Typical installation notes (e.g., "TYP." or "TYPICAL — provide at each door")
5. "NIC" (Not In Contract) or "BY OTHERS" annotations — these exclude scope
6. Quantity notes like "QTY: 4" or "(x3)" next to symbols
7. Demolition notes (items to be removed or replaced)
8. References to addenda changes

═══ CRITICAL: EQUIPMENT SCHEDULE EXTRACTION ═══
Many ELV drawings include EQUIPMENT SCHEDULES — tables that list every device with its tag, type, location, and specifications. These are the MOST ACCURATE source of device counts because the design engineer created them.

WHEN YOU FIND A SCHEDULE TABLE:
- Read EVERY ROW of the table
- Extract: Tag number, device type, location/room, model/specs
- Extract MANUFACTURER and MODEL/PART NUMBER if listed (e.g., "Axis P3265-LVE", "HID iCLASS SE R10")
- Count the total number of rows = total devices of that type
- Note the sheet ID where the schedule appears
- THIS DATA WILL OVERRIDE symbol counts in consensus

CRITICAL — CAPTURE PART NUMBERS AND MANUFACTURERS:
- If a schedule lists specific manufacturer names (Axis, HID, Panduit, Corning, APC, etc.), RECORD THEM
- If model numbers or part numbers appear (P3265-LVE, 920NTNTEK00000, SMT3000RM2UC), RECORD THEM
- These will be used directly in the BOM — accuracy here prevents costly errors

CRITICAL — CAPTURE UPS, INVERTERS & POWER EQUIPMENT:
- UPS units (APC, Eaton, Vertiv, CyberPower) — record model, kVA rating, runtime
- Inverters (power inverters, solar inverters) — record model, wattage, voltage
- Transfer switches (ATS/STS) — automatic or manual, amperage
- Battery backup systems — record AH rating, voltage
- Power supplies — voltage, amperage, manufacturer (Altronix, LifeSafety Power)

Common schedule types:
- Camera Schedule (lists every camera with type, location, resolution)
- Door Hardware Schedule (lists every controlled door)
- Device Schedule (fire alarm devices by zone/location)
- Panel Schedule (access control panels and readers)
- Data Outlet Schedule (outlet locations and types)

═══ CRITICAL: TYPICAL NOTE MULTIPLICATION ═══
When you find "TYP" or "TYPICAL" notes:
- Count how many MATCHING LOCATIONS exist for that note
- Example: "Card reader TYP at each secure door" → count all secure doors on all floors
- Example: "Smoke detector TYP in each office" → count all offices across all sheets
- Example: "Data outlet TYP 2 per office" → count offices × 2
- Provide the multiplication calculation in the output

Return ONLY valid JSON:
{
  "annotations": [
    { "sheet_id": "E1.01", "type": "keynote", "text": "1. Provide CAT6A cable to each data outlet location", "impacts": "cable_specification", "quantity_implied": null },
    { "sheet_id": "E1.01", "type": "typical_note", "text": "TYP card reader at each secure door", "impacts": "access_control", "quantity_implied": 14, "basis": "14 secure doors counted across all floors", "multiplication": "1 reader × 14 doors = 14 total" }
  ],
  "referenced_details": [
    { "reference": "Detail 3/E6.01", "description": "Camera mounting detail", "devices_in_detail": ["dome_camera", "junction_box"], "sheet_id": "E1.02" }
  ],
  "schedule_data": [
    {
      "schedule_name": "Camera Schedule",
      "sheet_id": "ES650",
      "total_items": 82,
      "columns": ["Tag", "Type", "Location", "Resolution"],
      "line_items": [
        { "tag": "CAM-01", "type": "Fixed Dome Indoor", "location": "Lobby", "specs": "4MP" },
        { "tag": "CAM-02", "type": "Fixed Dome Outdoor", "location": "Loading Dock", "specs": "8MP IP67" }
      ],
      "summary_by_type": { "Fixed Dome Indoor": 24, "Fixed Dome Outdoor": 18, "PTZ": 6, "Multi-Lens": 12, "Fisheye 360": 4, "Dual-Lens": 9, "LPR": 3 }
    }
  ],
  "typical_multiplications": [
    { "note_text": "TYP card reader at secure doors", "device_type": "card_reader", "per_location_qty": 1, "total_locations": 14, "calculated_total": 14, "sheets_checked": ["E1.01", "E2.01", "E3.01"] }
  ],
  "exclusions": [
    { "item": "PA/Paging System", "note": "BY OTHERS — see Division 27", "sheet_id": "E1.01" }
  ],
  "total_annotations_found": 0,
  "total_schedule_items_extracted": 0
}`,

      // ── BRAIN 23: Riser Diagram Analyzer (Wave 1) ───────────────
      RISER_DIAGRAM_ANALYZER: () => `You are a RISER DIAGRAM & ONE-LINE DIAGRAM EXPERT for ELV/low voltage construction projects.

PROJECT: ${_sanitizeForPrompt(context.projectName || 'Unknown', 200)} | Type: ${_sanitizeForPrompt(context.projectType || 'Unknown', 100)}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

YOUR MISSION: Analyze all riser diagrams, one-line diagrams, block diagrams, and system architecture drawings to extract backbone infrastructure details.

WHAT TO EXTRACT:
1. BACKBONE CABLES: Fiber runs, multi-pair copper, coax — count strands/pairs per run
2. VERTICAL PATHWAYS: Conduit/sleeve sizes between floors, pathway fill calculations
3. RISER ROOM EQUIPMENT: Switches, patch panels, splitters, amplifiers per floor
4. HEAD-END EQUIPMENT: Main MDF/server room equipment from one-line diagrams
5. SYSTEM ARCHITECTURE: How systems interconnect (IP backbone, analog runs, etc.)
6. FIBER COUNTS: Total fiber strand counts, SM vs. MM, termination types
7. NETWORK TOPOLOGY: Star, ring, daisy-chain configurations per system

CRITICAL: Riser diagrams show infrastructure that floor plans DON'T — backbone cables, vertical pathways, and head-end equipment are ONLY visible here. These items are expensive and commonly missed in bids.

Return ONLY valid JSON:
{
  "risers": [
    { "system": "Structured Cabling", "description": "Main fiber backbone", "from": "MDF-1F", "to": "IDF-3F", "cable_type": "12-strand SM fiber", "quantity": 2, "pathway": "4\" conduit" }
  ],
  "backbone_cables": [
    { "type": "fiber_sm", "strand_count": 12, "runs": 6, "avg_length_ft": 200, "total_length_ft": 1200, "termination": "LC connectors" },
    { "type": "cat6a_25pair", "pairs": 25, "runs": 4, "avg_length_ft": 200, "total_length_ft": 800 }
  ],
  "vertical_pathways": [
    { "from_floor": "1F", "to_floor": "2F", "pathway_type": "4-inch conduit", "quantity": 3, "fill_pct": 40 }
  ],
  "headend_equipment": [
    { "location": "MDF Room 101", "item": "48-port PoE+ switch", "quantity": 4, "rack_units": 4 }
  ],
  "network_topology": "star",
  "total_backbone_cost_items": 0
}`,

      // ── BRAIN 24: Zoom Scanner (Wave 1.5) ───────────────────────
      ZOOM_SCANNER: () => `You are a HIGH-MAGNIFICATION ZOOM SCANNER for ELV device symbols. Divide each sheet into 4 quadrants and count with extreme precision.

PROJECT: ${_sanitizeForPrompt(context.projectName || 'Unknown', 200)}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

LEGEND (key symbols only):
${JSON.stringify(context.wave0?.LEGEND_DECODER?.symbols || [], null, 2).substring(0, 2000)}

METHOD — For EACH sheet, divide into 4 quadrants (top-left, top-right, bottom-left, bottom-right):
- Count every device symbol in each quadrant independently
- Add all 4 quadrants for the sheet total
- Pay special attention to: dense areas, stacked symbols, devices behind text
- Don't double-count at quadrant boundaries

Return ONLY valid JSON:
{
  "quadrant_counts": [
    {
      "sheet_id": "E1.01",
      "top_left": { "data_outlet": 12, "camera": 3 },
      "top_right": { "data_outlet": 15, "camera": 2 },
      "bottom_left": { "data_outlet": 8, "camera": 4 },
      "bottom_right": { "data_outlet": 10, "camera": 2 },
      "sheet_total": { "data_outlet": 45, "camera": 11 }
    }
  ],
  "zoom_findings": [
    { "sheet_id": "E1.01", "description": "3 stacked WAPs behind title block", "device_type": "wap", "additional_count": 3 }
  ],
  "grand_totals": {},
  "methodology": "4-quadrant zoom scan"
}`,

      // ── BRAIN 25: Per-Floor Analyzer (Wave 1.5) ─────────────────
      PER_FLOOR_ANALYZER: () => `You are a PER-FLOOR INDEPENDENT ANALYZER for ELV construction documents. You analyze each floor as a SEPARATE ENTITY and compare results to find floor-specific anomalies.

PROJECT: ${_sanitizeForPrompt(context.projectName || 'Unknown', 200)} | Type: ${_sanitizeForPrompt(context.projectType || 'Unknown', 100)}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

LEGEND DICTIONARY:
${JSON.stringify(context.wave0?.LEGEND_DECODER || {}, null, 2).substring(0, 3000)}

YOUR METHOD — FLOOR-BY-FLOOR ISOLATION:
1. Group sheets by floor (1st Floor, 2nd Floor, 3rd Floor, Basement, Roof, etc.)
2. For EACH floor independently:
   a. Count all devices by type
   b. Calculate density (devices per sq ft or per room)
   c. Note any floor-specific requirements
3. COMPARE floors against each other:
   a. Are typical floors consistent? If Floor 2 has 40 data outlets but Floor 3 has only 15, investigate.
   b. Are ground floors different from upper floors (more security, different cabling)?
   c. Do specialty floors (penthouse, basement, mechanical) have unique requirements?

ANOMALY DETECTION: Flag any floor that deviates >20% from the average of similar floors. This often indicates missed symbols.

Return ONLY valid JSON:
{
  "floor_breakdown": [
    { "floor": "1st Floor", "sheets": ["E1.01", "E1.02"], "device_counts": { "data_outlet": 45, "camera": 12, "card_reader": 8 }, "total_devices": 65, "notes": "Lobby has higher camera density" },
    { "floor": "2nd Floor", "sheets": ["E2.01"], "device_counts": { "data_outlet": 52, "camera": 6, "card_reader": 4 }, "total_devices": 62, "notes": "Typical office floor" }
  ],
  "floor_comparisons": [
    { "comparison": "Floor 2 vs Floor 3", "consistent": true, "variance_pct": 5, "notes": "Within normal range" }
  ],
  "anomalies": [
    { "floor": "4th Floor", "issue": "Data outlet count is 60% lower than other typical floors", "expected": 50, "actual": 20, "severity": "high", "likely_cause": "Symbols may be missing or floor has different use" }
  ],
  "total_floors": 0,
  "total_devices_all_floors": 0
}`,

      // ── BRAIN 26: Overlap Detector (Wave 3.5) ───────────────────
      OVERLAP_DETECTOR: () => {
        const consensus = context.wave1_75?.CONSENSUS_ARBITRATOR || {};
        const wave1Counts = context.wave1?.SYMBOL_SCANNER?.totals || {};
        const wave15Counts = context.wave1_5?.SHADOW_SCANNER?.totals || {};
        return `You are an OVERLAP & DUPLICATION DETECTION EXPERT for multi-sheet ELV construction drawings.

PROJECT: ${_sanitizeForPrompt(context.projectName || 'Unknown', 200)} | Type: ${_sanitizeForPrompt(context.projectType || 'Unknown', 100)}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

CURRENT CONSENSUS COUNTS:
${JSON.stringify(consensus.consensus_counts || {}, null, 2).substring(0, 3000)}

YOUR MISSION: Detect and correct double-counted devices that appear on multiple overlapping sheets.

COMMON OVERLAP SCENARIOS:
1. SHEET BOUNDARY OVERLAP: Adjacent floor plan sheets overlap by 5-10 feet — devices in the overlap zone appear on BOTH sheets
2. ENLARGED PLAN AREAS: A detail sheet shows the same area that appears on the main floor plan — devices get counted twice
3. PARTIAL PLAN OVERLAP: Separate discipline sheets (security, cabling, fire alarm) may show overlapping areas
4. DEMOLITION vs NEW: Some devices appear on both demo and new work sheets — only count once
5. TYPICAL details applied to multiple locations should not be double-counted with the individual location counts

HOW TO DETECT:
1. Look for matching key plans/match lines that show overlap zones
2. Compare device counts in border areas between adjacent sheets
3. Check if enlarged plans duplicate main plan counts
4. Verify that typical installation counts aren't already included in per-sheet counts

Return ONLY valid JSON:
{
  "overlapping_areas": [
    { "sheet_a": "E1.01", "sheet_b": "E1.02", "overlap_zone": "Corridor B between grid lines 5-6", "devices_in_overlap": { "data_outlet": 4, "camera": 1 }, "recommendation": "Subtract from E1.02 total" }
  ],
  "potential_duplicates": [
    { "device_type": "camera", "count_on_main": 6, "count_on_enlarged": 6, "is_duplicate": true, "actual_count": 6, "sheets": ["E1.01", "E1.50"], "reason": "Enlarged lobby plan duplicates main floor plan cameras" }
  ],
  "adjusted_counts": { "camera": -2, "data_outlet": -4 },
  "total_duplicates_found": 0,
  "confidence": 90,
  "methodology": "Match-line and key-plan overlap analysis"
}`;
      },

    };

    return prompts[brainKey] ? prompts[brainKey]() : '';
  },

  // ═══════════════════════════════════════════════════════════
  // PRICING CONTEXT BUILDER
  // ═══════════════════════════════════════════════════════════

  _buildPricingContext(state) {
    if (typeof PRICING_DB === 'undefined') return 'Use industry standard pricing';

    const tier = state.pricingTier || 'mid';
    const regionKey = state.regionalMultiplier || 'national_average';
    const regionMult = PRICING_DB.regionalMultipliers?.[regionKey] || 1.0;
    let ctx = `PRICING TIER: ${tier.toUpperCase()} | REGION: ${regionKey} (${regionMult}×)\n\n`;

    // ── Detect project type and apply multiplier ──
    const projectText = `${state.projectName || ''} ${state.projectType || ''}`.toLowerCase();
    let projectTypeKey = 'commercial_standard';
    
    if (/amtrak|bnsf|union pacific|transit|railroad|railway|metro|bart|caltrain|light rail|commuter rail|rail station|train station/.test(projectText)) {
      projectTypeKey = 'transit_railroad';
    } else if (/government|federal|state|county|municipal|courthouse|city hall|military|dod|va hospital|gsa/.test(projectText)) {
      projectTypeKey = 'government_institutional';
    } else if (/hospital|medical|clinic|healthcare|surgery center|urgent care/.test(projectText)) {
      projectTypeKey = 'healthcare';
    } else if (/school|k-12|university|college|campus|education/.test(projectText)) {
      projectTypeKey = 'education_k12';
    } else if (/data center|datacenter|colocation|server farm|mission critical/.test(projectText)) {
      projectTypeKey = 'data_center';
    }

    const ptMult = PRICING_DB.projectTypeMultipliers?.[projectTypeKey];
    if (ptMult && projectTypeKey !== 'commercial_standard') {
      ctx += `⚠️ PROJECT TYPE: ${ptMult.label}\n`;
      ctx += `  EQUIPMENT MULTIPLIER: ${ptMult.equipment_multiplier}× — apply to ALL cameras, NVRs, switches, panels, readers\n`;
      ctx += `  LABOR MULTIPLIER: ${ptMult.labor_multiplier}× — apply to ALL labor hours and rates\n`;
      ctx += `  MINIMUM CAMERA COST: $${ptMult.min_camera_cost}/each (do NOT price cameras below this)\n`;
      ctx += `  MINIMUM NVR COST: $${ptMult.min_nvr_cost}/each (do NOT price NVRs below this)\n`;
      ctx += `  MINIMUM SWITCH COST: $${ptMult.min_switch_cost}/each (do NOT price switches below this)\n`;
      ctx += `  NOTE: ${ptMult.notes}\n`;
      ctx += `  THIS IS MANDATORY — prices BELOW these minimums will result in a losing bid.\n\n`;
    }

    // Only include pricing categories relevant to selected disciplines
    const disciplines = (state.disciplines || []).map(d => d.toLowerCase());
    const allCategories = {
      'Structured Cabling': PRICING_DB.structuredCabling,
      'CCTV': PRICING_DB.cctv,
      'Access Control': PRICING_DB.accessControl,
      'Fire Alarm': PRICING_DB.fireAlarm,
      'Intrusion Detection': PRICING_DB.intrusionDetection,
      'Audio Visual': PRICING_DB.audioVisual,
    };
    const disciplineMap = {
      'Structured Cabling': ['cabling', 'structured', 'data', 'network'],
      'CCTV': ['cctv', 'camera', 'surveillance', 'video'],
      'Access Control': ['access', 'door', 'entry'],
      'Fire Alarm': ['fire', 'alarm', 'life safety'],
      'Intrusion Detection': ['intrusion', 'burglar', 'security'],
      'Audio Visual': ['audio', 'av', 'visual', 'display'],
    };

    for (const [catName, catData] of Object.entries(allCategories)) {
      if (!catData) continue;
      // Filter: include if no disciplines selected or if discipline matches
      const keywords = disciplineMap[catName] || [];
      const relevant = disciplines.length === 0 || disciplines.some(d => keywords.some(k => d.includes(k)));
      if (!relevant) continue;

      ctx += `\n${catName}:\n`;
      for (const [subCat, items] of Object.entries(catData)) {
        for (const [key, item] of Object.entries(items)) {
          if (typeof item === 'object' && item[tier] !== undefined) {
            let adjusted = +(item[tier] * regionMult).toFixed(2);
            if (ptMult && ptMult.equipment_multiplier > 1.0 &&
                /camera|ptz|multisensor|nvr|lpr|thermal|reader|panel|poe_switch|monitor|dome|bullet/.test(key)) {
              adjusted = +(adjusted * ptMult.equipment_multiplier).toFixed(2);
              ctx += `  ${key}: $${adjusted}/${item.unit || 'ea'} [${ptMult.equipment_multiplier}× transit]\n`;
            } else {
              ctx += `  ${key}: $${adjusted}/${item.unit || 'ea'}\n`;
            }
          }
        }
      }
    }

    // ── Add General Conditions reference ──
    if (PRICING_DB.generalConditions) {
      ctx += `\n\nGENERAL CONDITIONS (MANDATORY on every project):\n`;
      ctx += `Bonds:\n`;
      for (const [k, v] of Object.entries(PRICING_DB.generalConditions.bonds || {})) {
        if (typeof v === 'object' && v[tier] !== undefined) ctx += `  ${k}: ${v[tier]}% of contract (${v.description})\n`;
      }
      ctx += `Insurance:\n`;
      for (const [k, v] of Object.entries(PRICING_DB.generalConditions.insurance || {})) {
        if (typeof v === 'object' && v[tier] !== undefined) {
          if (v.unit === 'lump sum') ctx += `  ${k}: $${(v[tier] * regionMult).toFixed(0)} lump sum (${v.description})\n`;
          else ctx += `  ${k}: ${v[tier]}% of contract (${v.description})\n`;
        }
      }
      ctx += `Mobilization:\n`;
      for (const [k, v] of Object.entries(PRICING_DB.generalConditions.mobilization || {})) {
        if (typeof v === 'object' && v[tier] !== undefined) {
          if (v.unit === 'lump sum') ctx += `  ${k}: $${(v[tier] * regionMult).toFixed(0)} (${v.description})\n`;
          else ctx += `  ${k}: ${v[tier]}% of contract (${v.description})\n`;
        }
      }
    }

    // ── Add Electrical Distribution reference ──
    if (PRICING_DB.electricalDistribution) {
      ctx += `\n\nELECTRICAL DISTRIBUTION (UPS, panels, circuits, site electrical):\n`;
      for (const [subCat, items] of Object.entries(PRICING_DB.electricalDistribution)) {
        ctx += `  ${subCat}:\n`;
        for (const [k, v] of Object.entries(items)) {
          if (typeof v === 'object' && v[tier] !== undefined) {
            ctx += `    ${k}: $${(v[tier] * regionMult).toFixed(0)}/${v.unit || 'ea'} (${v.description})\n`;
          }
        }
      }
    }

    // ── Add Equipment Rental reference ──
    if (PRICING_DB.equipmentRental) {
      ctx += `\n\nEQUIPMENT RENTAL (per-day rates — multiply by rental days):\n`;
      for (const [subCat, items] of Object.entries(PRICING_DB.equipmentRental)) {
        for (const [k, v] of Object.entries(items)) {
          if (typeof v === 'object' && v[tier] !== undefined) {
            ctx += `  ${k}: $${(v[tier] * regionMult).toFixed(0)}/day (${v.description})\n`;
          }
        }
      }
    }

    // ── Add Non-ELV Scopes reference ──
    if (PRICING_DB.nonELVScopes) {
      ctx += `\n\nNON-ELV SCOPES (include if in contract — glazing, masonry, HVAC, finishes):\n`;
      for (const [subCat, items] of Object.entries(PRICING_DB.nonELVScopes)) {
        for (const [k, v] of Object.entries(items)) {
          if (typeof v === 'object' && v[tier] !== undefined) {
            ctx += `  ${k}: $${(v[tier] * regionMult).toFixed(0)}/${v.unit || 'ea'} (${v.description})\n`;
          }
        }
      }
    }

    // ── Add civil work cost references ──
    if (PRICING_DB.civilWork) {
      ctx += `\n\nCIVIL WORK COST REFERENCE (use these for subcontractor pricing):\n`;
      ctx += `Directional Boring:\n`;
      for (const [k, v] of Object.entries(PRICING_DB.civilWork.directional_boring || {})) {
        if (typeof v === 'object' && v.mid !== undefined) {
          ctx += `  ${k}: $${v.low}-$${v.high} ${v.unit} (${v.description})\n`;
        }
      }
      ctx += `Trenching:\n`;
      for (const [k, v] of Object.entries(PRICING_DB.civilWork.trenching || {})) {
        if (typeof v === 'object' && v.mid !== undefined) {
          ctx += `  ${k}: $${v.low}-$${v.high} ${v.unit} (${v.description})\n`;
        }
      }
      ctx += `Surface Restoration:\n`;
      for (const [k, v] of Object.entries(PRICING_DB.civilWork.surface_restoration || {})) {
        if (typeof v === 'object' && v.mid !== undefined) {
          ctx += `  ${k}: $${v.low}-$${v.high} ${v.unit} (${v.description})\n`;
        }
      }
      ctx += `Core Drilling:\n`;
      for (const [k, v] of Object.entries(PRICING_DB.civilWork.core_drilling || {})) {
        if (typeof v === 'object' && v.mid !== undefined) {
          ctx += `  ${k}: $${v.low}-$${v.high} ${v.unit} (${v.description})\n`;
        }
      }
    }

    // ── Add subcontractor benchmarks ──
    if (PRICING_DB.subcontractorBenchmarks) {
      const isTransit = /amtrak|bnsf|transit|railroad|rail/i.test(projectText);
      const bench = isTransit ? PRICING_DB.subcontractorBenchmarks.transit_railroad : PRICING_DB.subcontractorBenchmarks.standard;
      if (bench) {
        ctx += `\nSUBCONTRACTOR BENCHMARKS (${isTransit ? 'TRANSIT' : 'STANDARD'}):\n`;
        for (const [k, v] of Object.entries(bench)) {
          ctx += `  ${k}: $${v.toLocaleString()}\n`;
        }
      }
    }

    return ctx.substring(0, 8000);
  },


  // ═══════════════════════════════════════════════════════════
  // BRAIN OUTPUT SANITIZATION — Defense-in-depth against prompt injection chains
  // ═══════════════════════════════════════════════════════════

  _sanitizeBrainOutput(obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        // Truncate excessively long strings
        if (obj[key].length > 5000) obj[key] = obj[key].substring(0, 5000);
        // Strip instruction-like patterns (defense-in-depth)
        obj[key] = obj[key].replace(/(?:ignore|disregard)\s+(?:all\s+)?(?:previous|above|prior)\s+(?:instructions?|prompts?|rules?)/gi, '[removed]');
        obj[key] = obj[key].replace(/you\s+are\s+now\s+/gi, '[removed] ');
        obj[key] = obj[key].replace(/^system:\s*/gmi, '');
        obj[key] = obj[key].replace(/^IMPORTANT:\s*/gmi, '');
      } else if (Array.isArray(obj[key])) {
        obj[key].forEach(item => this._sanitizeBrainOutput(item));
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this._sanitizeBrainOutput(obj[key]);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════
  // SINGLE BRAIN EXECUTION — Extracted for batched orchestration
  // ═══════════════════════════════════════════════════════════

  async _runSingleBrain(key, context, encodedFiles, baseProgress, endProgress, totalBrains, results, incrementCompleted, progressCallback) {
    const brain = this.BRAINS[key];

    // Critical brains that MUST succeed — they get the full retry budget
    const CRITICAL_BRAINS = ['SYMBOL_SCANNER', 'MATERIAL_PRICER', 'LABOR_CALCULATOR', 'FINANCIAL_ENGINE', 'CONSENSUS_ARBITRATOR', 'ESTIMATE_CORRECTOR', 'REPORT_WRITER'];
    const MAX_VALIDATION_RETRIES = CRITICAL_BRAINS.includes(key) ? (this.config.maxRetries || 8) : Math.ceil((this.config.maxRetries || 8) / 2);

    try {
      // Build prompt with context
      const prompt = this._getPrompt(key, context);
      
      // Guard: if prompt is empty, skip brain cleanly (e.g., TARGETED_RESCANNER with no disputes)
      if (!prompt || prompt.trim().length === 0) {
        this._log(`[Brain:${brain.name}] Prompt is empty — skipping (no work required)`);
        this._brainStatus[key] = { status: 'done', progress: 100, result: { _skipped: true, reason: 'No input data' }, error: null };
        results[key] = { _skipped: true, reason: 'No input data' };
        const completed = incrementCompleted();
        const pct = baseProgress + (completed / totalBrains) * (endProgress - baseProgress);
        progressCallback(pct, `✅ ${brain.name} skipped (no work required)`, this._brainStatus);
        return;
      }
      
      const fileParts = brain.needsFiles.length > 0 ? this._buildFileParts(brain, encodedFiles) : [];
      const useJsonMode = key !== 'REPORT_WRITER';

      this._brainStatus[key].status = 'running';
      progressCallback(baseProgress, `${brain.emoji} ${brain.name} analyzing…`, this._brainStatus);

      let rawResult = await this._invokeBrain(key, brain, prompt, fileParts, useJsonMode);

      // Parse JSON for non-report brains
      let parsed;
      if (useJsonMode) {
        parsed = this._parseJSON(rawResult);
        if (!parsed) {
          console.warn(`[Brain:${brain.name}] JSON parse failed, using raw text`);
          parsed = { _raw: rawResult, _parseFailed: true };
        }
      } else {
        parsed = rawResult; // Report writer returns markdown
      }

      // ── Schema Validation + Auto-Retry (up to MAX_VALIDATION_RETRIES attempts) ──
      const validation = this._validateBrainOutput(key, parsed);
      if (!validation.valid) {
        let retrySucceeded = false;
        
        for (let retryNum = 1; retryNum <= MAX_VALIDATION_RETRIES; retryNum++) {
          const isCritical = CRITICAL_BRAINS.includes(key);
          console.warn(`[Brain:${brain.name}] Validation failed: ${validation.reason}. Retry ${retryNum}/${MAX_VALIDATION_RETRIES}${isCritical ? ' (CRITICAL BRAIN)' : ''}…`);
          this._brainStatus[key].status = 'retrying';
          progressCallback(baseProgress, `🔄 ${brain.name} retry ${retryNum}/${MAX_VALIDATION_RETRIES}…`, this._brainStatus);

          try {
            // Escalating retry strategy: retry 1 uses enhanced prompt, retry 2 bumps temperature
            const retryPrefix = retryNum === 1
              ? 'IMPORTANT: Your previous response was incomplete or had issues. STRICTLY follow the JSON schema. Include ALL required fields. Be thorough.\n\n'
              : 'CRITICAL RETRY: Your previous TWO responses failed validation. You MUST return ONLY valid JSON matching this exact schema. No markdown, no explanations, no extra text. Just the JSON object.\n\n';
            
            rawResult = await this._invokeBrain(key, brain, retryPrefix + prompt, fileParts, useJsonMode);
            if (useJsonMode) {
              const retryParsed = this._parseJSON(rawResult);
              if (retryParsed) {
                const retryValidation = this._validateBrainOutput(key, retryParsed);
                if (retryValidation.valid) {
                  parsed = retryParsed;
                  this._log(`[Brain:${brain.name}] ✓ Retry ${retryNum} succeeded — validation passed`);
                  retrySucceeded = true;
                  break;
                } else {
                  console.warn(`[Brain:${brain.name}] Retry ${retryNum} still invalid: ${retryValidation.reason}`);
                  parsed = retryParsed; // Use latest result — likely better than original
                }
              }
            }
          } catch (retryErr) {
            console.warn(`[Brain:${brain.name}] Retry ${retryNum} failed: ${retryErr.message}`);
          }
        }
        
        if (!retrySucceeded && CRITICAL_BRAINS.includes(key)) {
          console.error(`[Brain:${brain.name}] ⚠️ CRITICAL BRAIN failed validation after ${MAX_VALIDATION_RETRIES} retries — using best available result`);
        }
      }

      // Strip any instruction-like content from brain outputs before downstream use
      if (parsed && typeof parsed === 'object' && !parsed._failed) {
        const sanitized = JSON.parse(JSON.stringify(parsed));
        // Remove any string values that look like prompt injections
        // (This is defense-in-depth — the main protection is input sanitization)
        this._sanitizeBrainOutput(sanitized);
        results[key] = sanitized;
      }

      this._brainStatus[key] = { status: 'done', progress: 100, result: parsed, error: null };
      if (!results[key]) results[key] = parsed; // fallback if sanitization guard didn't apply
      const completed = incrementCompleted();

      const pct = baseProgress + (completed / totalBrains) * (endProgress - baseProgress);
      progressCallback(pct, `✅ ${brain.name} complete`, this._brainStatus);

    } catch (err) {
      console.error(`[Brain:${brain.name}] FAILED:`, err.message);
      this._brainStatus[key] = { status: 'failed', progress: 0, result: null, error: err.message };
      results[key] = { _error: err.message, _failed: true };
      const completed = incrementCompleted();

      const pct = baseProgress + (completed / totalBrains) * (endProgress - baseProgress);
      progressCallback(pct, `⚠️ ${brain.name} failed — continuing…`, this._brainStatus);
    }
  },

  async _runWave(waveNum, brainKeys, encodedFiles, state, context, progressCallback) {
    const waveStart = { 0: 5, 1: 12, 1.5: 35, 1.75: 50, 2: 56, 2.25: 62, 2.5: 68, 2.75: 72, 3: 76, 3.5: 80, 3.75: 84, 3.85: 88, 4: 92 };
    const waveEnd = { 0: 12, 1: 35, 1.5: 50, 1.75: 56, 2: 62, 2.25: 68, 2.5: 72, 2.75: 76, 3: 80, 3.5: 84, 3.75: 88, 3.85: 92, 4: 98 };
    const baseProgress = waveStart[waveNum] ?? 0;
    const endProgress = waveEnd[waveNum] ?? 100;
    const waveNames = { 0: 'Legend Pre-Processing', 1: 'First Read', 1.5: 'Second Read', 1.75: 'Consensus Resolution', 2: 'Material Pricing', 2.25: 'Labor Calculation', 2.5: 'Financial Engine', 2.75: 'Reverse Verification', 3: 'Adversarial Audit', 3.5: '4th & 5th Read — Deep Accuracy', 3.75: '6th Read — Final Reconciliation', 3.85: 'Estimate Correction', 4: 'Report Synthesis' };

    const results = {};
    let completed = 0;

    // Set all brains in this wave to 'active'
    for (const key of brainKeys) {
      const brain = this.BRAINS[key];
      this._brainStatus[key] = { status: 'active', progress: 0, result: null, error: null };
      progressCallback(baseProgress, `Wave ${waveNum}: ${waveNames[waveNum]}`, this._brainStatus);
    }

    // ── Batched execution to avoid API rate limiting ──
    // Waves with 4+ brains: run in batches of 2 with stagger delay
    // Waves with 1-3 brains: run all in parallel (no rate limit risk)
    const BATCH_SIZE = 2;
    const STAGGER_DELAY_MS = 2000; // 2 seconds between batches

    if (brainKeys.length <= 3) {
      // Small wave — run all in parallel (safe)
      const promises = brainKeys.map(async (key) => {
        await this._runSingleBrain(key, context, encodedFiles, baseProgress, endProgress, brainKeys.length, results, () => ++completed, progressCallback);
      });
      await Promise.allSettled(promises);
    } else {
      // Large wave — stagger in batches of 2 to avoid rate limits
      for (let i = 0; i < brainKeys.length; i += BATCH_SIZE) {
        const batch = brainKeys.slice(i, i + BATCH_SIZE);
        this._log(`[SmartBrains] Wave ${waveNum}: Starting batch ${Math.floor(i/BATCH_SIZE) + 1} — ${batch.map(k => this.BRAINS[k].name).join(', ')}`);

        const batchPromises = batch.map(async (key) => {
          await this._runSingleBrain(key, context, encodedFiles, baseProgress, endProgress, brainKeys.length, results, () => ++completed, progressCallback);
        });
        await Promise.allSettled(batchPromises);

        // Stagger delay between batches (not after the last batch)
        if (i + BATCH_SIZE < brainKeys.length) {
          this._log(`[SmartBrains] Wave ${waveNum}: Stagger delay ${STAGGER_DELAY_MS}ms before next batch…`);
          await new Promise(r => setTimeout(r, STAGGER_DELAY_MS));
        }
      }
    }

    const failedCount = Object.values(results).filter(r => r?._failed).length;
    const CRITICAL_WAVES = [0, 1, 1.5, 1.75, 2, 2.25, 2.5]; // These must have at least 1 brain succeed
    if (failedCount === brainKeys.length) {
      if (CRITICAL_WAVES.includes(waveNum)) {
        throw new Error(`Wave ${waveNum} completely failed — all ${brainKeys.length} brains errored. This wave is critical and cannot be skipped.`);
      } else {
        console.warn(`[SmartBrains] ⚠️ Wave ${waveNum} completely failed (${brainKeys.length} brains) — non-critical, continuing analysis`);
      }
    } else if (failedCount > 0) {
      console.warn(`[SmartBrains] Wave ${waveNum}: ${failedCount}/${brainKeys.length} brain(s) failed — continuing with ${brainKeys.length - failedCount} successful`);
    }

    return results;
  },


  // ═══════════════════════════════════════════════════════════
  // MAIN ENTRY POINT — Full Multi-Brain Analysis
  // ═══════════════════════════════════════════════════════════

  async runFullAnalysis(state, progressCallback) {
    // Rate limiting: prevent concurrent analyses and enforce cooldown
    if (this._analysisRunning) {
      throw new Error('Analysis already in progress. Please wait for the current analysis to complete.');
    }
    if (this._lastAnalysisTime && (Date.now() - this._lastAnalysisTime) < 30000) {
      throw new Error('Please wait at least 30 seconds between analyses.');
    }
    this._analysisRunning = true;

    try {
    // Validate required state fields
    if (!state || typeof state !== 'object') throw new Error('Invalid state object');
    if (typeof state.projectName !== 'string' || !state.projectName.trim()) throw new Error('Project name is required');
    if (!state.markup || typeof state.markup !== 'object') {
      state.markup = { material: 50, labor: 50, equipment: 15, subcontractor: 10 };
    }
    // Ensure markup values are numbers
    for (const k of ['material', 'labor', 'equipment', 'subcontractor']) {
      if (typeof state.markup[k] !== 'number' || isNaN(state.markup[k])) {
        state.markup[k] = k === 'material' || k === 'labor' ? 50 : k === 'equipment' ? 15 : 10;
      }
    }
    if (state.laborRates && typeof state.laborRates === 'object') {
      for (const [k, v] of Object.entries(state.laborRates)) {
        if (typeof v !== 'number' || isNaN(v) || v < 0) state.laborRates[k] = 0;
      }
    }

    // Validate PRICING_DB structure if available
    if (typeof PRICING_DB !== 'undefined') {
      const required = ['structuredCabling', 'cctv', 'accessControl'];
      const missing = required.filter(k => !PRICING_DB[k]);
      if (missing.length > 0) console.warn('[SmartBrains] PRICING_DB missing categories:', missing.join(', '));
    }

    this._log(`[SmartBrains] ═══ Starting Triple-Read Consensus Engine v${this.VERSION} ═══`);
    this._log(`[SmartBrains] API Keys: ${this.config.apiKeys.length} | Pro: ${this.config.proModel} | Accuracy: ${this.config.accuracyModel} | Flash: ${this.config.model}`);
    this._log(`[SmartBrains] 🚀 Gemini 3.1 Pro active — thinking mode enabled`);

    // Reset brain status
    this._brainStatus = {};
    for (const [key, brain] of Object.entries(this.BRAINS)) {
      this._brainStatus[key] = { status: 'pending', progress: 0, result: null, error: null };
    }

    // Phase 0: Encode all files once
    progressCallback(2, '📁 Encoding documents…', this._brainStatus);
    const encodedFiles = await this._encodeAllFiles(state, progressCallback);
    const totalFiles = Object.values(encodedFiles).reduce((s, arr) => s + arr.length, 0);
    this._log(`[SmartBrains] Encoded ${totalFiles} files`);

    // ═══ CONTEXT CACHING — Upload files once, all brains reference the cache ═══
    // Saves ~90% on API costs by avoiding re-processing files for each brain
    let _contextCache = null;
    try {
      const fileUris = [];
      const uploadKeyName = Object.values(encodedFiles).flat().find(f => f._usedKeyName)?._usedKeyName;
      for (const files of Object.values(encodedFiles)) {
        for (const f of files) {
          if (f.fileUri) {
            fileUris.push({ fileUri: f.fileUri, mimeType: f.mimeType || 'application/pdf' });
          }
        }
      }
      if (fileUris.length > 0) {
        progressCallback(4, '🧠 Creating context cache (saves 90% on API costs)…', this._brainStatus);
        const _cacheHeaders = { 'Content-Type': 'application/json' };
        if (typeof _sessionToken !== 'undefined' && _sessionToken) _cacheHeaders['X-Session-Token'] = _sessionToken;
        if (typeof _appToken !== 'undefined' && _appToken) _cacheHeaders['X-App-Token'] = _appToken;
        const cacheResp = await fetch('/api/ai/cache', {
          method: 'POST',
          headers: _cacheHeaders,
          body: JSON.stringify({
            fileUris,
            model: 'models/gemini-2.5-pro',
            systemInstruction: 'You are an expert low-voltage ELV construction estimator analyzing construction drawings and specifications. Extract precise device counts, material quantities, and cost data.',
            ttl: '3600s',
            _uploadKeyName: uploadKeyName,
          }),
        });
        const cacheData = await cacheResp.json();
        if (cacheData.success && cacheData.cacheName) {
          _contextCache = { name: cacheData.cacheName, model: 'gemini-2.5-pro', keyName: cacheData._usedKeyName };
          this._log(`[SmartBrains] ✓ Context cache created: ${cacheData.cacheName} (${cacheData.tokenCount} tokens, expires: ${cacheData.expireTime})`);
        } else {
          console.warn('[SmartBrains] Context cache creation failed, falling back to per-request file sending:', cacheData.error || cacheData._debug);
        }
      }
    } catch (cacheErr) {
      console.warn('[SmartBrains] Context cache unavailable, using standard mode:', cacheErr.message);
    }

    // Store cache reference for brains to use
    this._contextCache = _contextCache;

    // Build shared context — expanded for 7 waves
    const context = {
      projectName: state.projectName,
      projectType: state.projectType,
      projectLocation: state.projectLocation,
      codeJurisdiction: state.codeJurisdiction,
      disciplines: state.disciplines,
      pricingTier: state.pricingTier,
      regionalMultiplier: state.regionalMultiplier,
      markup: state.markup,
      laborRates: state.laborRates,
      includeBurden: state.includeBurden,
      burdenRate: state.burdenRate,
      prevailingWage: state.prevailingWage,
      workShift: state.workShift,
      specificItems: state.specificItems,
      knownQuantities: state.knownQuantities,
      travel: state.travel,
      // Building dimensions for cable pathway spatial calculation
      floorPlateWidth: state.floorPlateWidth || 0,
      floorPlateDepth: state.floorPlateDepth || 0,
      ceilingHeight: state.ceilingHeight || 10,
      floorToFloorHeight: state.floorToFloorHeight || 14,
      pricingContext: this._buildPricingContext(state),
      wave0: null, wave1: null, wave1_5: null, wave1_75: null,
      wave2: null, wave2_25: null, wave2_5_fin: null, wave2_75: null,
      wave3: null, wave3_5: null, wave3_75: null,
    };

    // ═══ WAVE 0: Legend Pre-Processing (1 brain, Pro model) — NON-FATAL ═══
    progressCallback(5, '📖 Wave 0: Decoding legend + mapping spatial layout…', this._brainStatus);
    let wave0Results = {};
    try {
      wave0Results = await this._runWave(0, ['LEGEND_DECODER', 'SPATIAL_LAYOUT'], encodedFiles, state, context, progressCallback);
      this._log('[SmartBrains] ═══ Wave 0 Complete — Legend decoded + Spatial layout mapped ═══');
    } catch (wave0Err) {
      console.warn('[SmartBrains] ⚠️ Wave 0 failed — continuing without legend/spatial context:', wave0Err.message);
      this._brainStatus['LEGEND_DECODER'] = { status: 'failed', progress: 0, result: null, error: wave0Err.message };
      this._brainStatus['SPATIAL_LAYOUT'] = { status: 'failed', progress: 0, result: null, error: wave0Err.message };
      wave0Results = { LEGEND_DECODER: { _failed: true, _error: wave0Err.message }, SPATIAL_LAYOUT: { _failed: true, _error: wave0Err.message } };
    }
    context.wave0 = wave0Results;

    // ═══ WAVE 1: First Read — Document Intelligence (8 parallel brains) ═══
    progressCallback(12, '🔍 Wave 1: First Read — 8 brains scanning…', this._brainStatus);
    const wave1Keys = ['SYMBOL_SCANNER', 'CODE_COMPLIANCE', 'MDF_IDF_ANALYZER', 'CABLE_PATHWAY', 'SPECIAL_CONDITIONS', 'SPEC_CROSS_REF', 'ANNOTATION_READER', 'RISER_DIAGRAM_ANALYZER'];
    const wave1Results = await this._runWave(1, wave1Keys, encodedFiles, state, context, progressCallback);
    context.wave1 = wave1Results;
    this._log('[SmartBrains] ═══ Wave 1 Complete — First Read done (8 brains) ═══');

    // ═══ WAVE 1.5: Second Read — Independent Verification (5 parallel brains, Pro model) ═══
    progressCallback(35, '👁️ Wave 1.5: Second Read — 5 independent verifiers…', this._brainStatus);
    const wave15Keys = ['SHADOW_SCANNER', 'DISCIPLINE_DEEP_DIVE', 'QUADRANT_SCANNER', 'ZOOM_SCANNER', 'PER_FLOOR_ANALYZER'];
    const wave15Results = await this._runWave(1.5, wave15Keys, encodedFiles, state, context, progressCallback);
    context.wave1_5 = wave15Results;
    this._log('[SmartBrains] ═══ Wave 1.5 Complete — Second Read done (5 brains) ═══');

    // ═══ WAVE 1.75: Consensus Resolution ═══
    progressCallback(50, '⚖️ Wave 1.75: Building consensus from 3 reads…', this._brainStatus);
    const wave175Results = await this._runWave(1.75, ['CONSENSUS_ARBITRATOR'], encodedFiles, state, context, progressCallback);
    context.wave1_75 = wave175Results;

    // Conditional: If significant disputes exist, run Targeted Re-Scanner (3rd read)
    // Filter: only rescan disputes with meaningful variance (>15%) and real quantity (≥3 items)
    const allDisputes = wave175Results.CONSENSUS_ARBITRATOR?.disputes || [];
    const significantDisputes = allDisputes.filter(d => 
      d.needs_rescan && 
      (d.variance_pct || 0) > 15 &&
      Math.max(d.read1 || 0, d.read2 || 0, d.read3 || 0) >= 3
    );
    const disputes = significantDisputes;

    if (disputes.length > 0) {
      // Inject only significant disputes into context so Re-Scanner gets a focused list
      const originalDisputes = wave175Results.CONSENSUS_ARBITRATOR.disputes;
      wave175Results.CONSENSUS_ARBITRATOR.disputes = disputes;
      context.wave1_75 = wave175Results;

      progressCallback(54, `🔬 Targeted Re-Scan — ${disputes.length} significant dispute(s)…`, this._brainStatus);
      const rescanResults = await this._runWave(1.75, ['TARGETED_RESCANNER'], encodedFiles, state, context, progressCallback);
      
      // Restore full dispute list for logging
      wave175Results.CONSENSUS_ARBITRATOR.disputes = originalDisputes;
      context.wave1_75 = wave175Results;

      // Merge re-scan results into consensus
      if (rescanResults.TARGETED_RESCANNER && !rescanResults.TARGETED_RESCANNER._failed && !rescanResults.TARGETED_RESCANNER._parseFailed) {
        context.wave1_75.TARGETED_RESCANNER = rescanResults.TARGETED_RESCANNER;
        // Update consensus counts with resolved values
        const resolved = rescanResults.TARGETED_RESCANNER.final_counts || {};
        for (const [key, val] of Object.entries(resolved)) {
          if (context.wave1_75.CONSENSUS_ARBITRATOR?.consensus_counts?.[key]) {
            context.wave1_75.CONSENSUS_ARBITRATOR.consensus_counts[key].consensus = val;
            context.wave1_75.CONSENSUS_ARBITRATOR.consensus_counts[key].confidence = 'resolved';
            context.wave1_75.CONSENSUS_ARBITRATOR.consensus_counts[key].method = 'targeted-rescan';
          }
        }
      } else {
        console.warn(`[SmartBrains] Re-Scanner failed — using Consensus Arbitrator values as-is (safe fallback)`);
        this._brainStatus['TARGETED_RESCANNER'] = { status: 'done', progress: 100, result: { _skipped: true, reason: 'Parse failed — consensus values used' }, error: null };
      }
    } else {
      const skipReason = allDisputes.length === 0 ? 'No disputes' : `${allDisputes.length} minor dispute(s) below threshold — consensus values sufficient`;
      this._brainStatus['TARGETED_RESCANNER'] = { status: 'done', progress: 100, result: { _skipped: true, reason: skipReason }, error: null };
      if (allDisputes.length > 0) {
        this._log(`[SmartBrains] ℹ️ ${allDisputes.length} dispute(s) found but all below re-scan threshold (variance ≤15% or qty <3). Using consensus values.`);
      }
    }
    this._log(`[SmartBrains] ═══ Wave 1.75 Complete — ${allDisputes.length} dispute(s) total, ${disputes.length} required re-scan ═══`);

    // ═══ WAVE 2: Material Pricer (1 brain — runs first so Labor can use its quantities) ═══
    progressCallback(56, '💰 Wave 2: Material Pricer — computing material costs…', this._brainStatus);
    const wave2Results = await this._runWave(2, ['MATERIAL_PRICER'], encodedFiles, state, context, progressCallback);
    context.wave2 = wave2Results;

    // ── Post-Pricer Discipline Coverage Check ──
    // Verify Material Pricer didn't silently drop entire disciplines
    const pricerCategories = (wave2Results.MATERIAL_PRICER?.categories || []).map(c => (c.name || '').toLowerCase());
    const selectedDisciplines = state.disciplines || [];
    const missingDisciplines = [];
    for (const disc of selectedDisciplines) {
      const dl = disc.toLowerCase();
      const found = pricerCategories.some(cat => {
        if (dl.includes('cabling') && (cat.includes('cabling') || cat.includes('cable') || cat.includes('data'))) return true;
        if (dl.includes('cctv') && (cat.includes('cctv') || cat.includes('camera') || cat.includes('video') || cat.includes('surveillance'))) return true;
        if (dl.includes('access') && (cat.includes('access') || cat.includes('card') || cat.includes('reader'))) return true;
        if (dl.includes('fire') && (cat.includes('fire') || cat.includes('alarm'))) return true;
        if (dl.includes('audio') && (cat.includes('audio') || cat.includes('av') || cat.includes('visual'))) return true;
        if (dl.includes('intrusion') && (cat.includes('intrusion') || cat.includes('detection') || cat.includes('burglar'))) return true;
        return false;
      });
      if (!found) missingDisciplines.push(disc);
    }
    if (missingDisciplines.length > 0) {
      console.warn(`[SmartBrains] ⚠️ Material Pricer DROPPED ${missingDisciplines.length} discipline(s): ${missingDisciplines.join(', ')}`);
      console.warn('[SmartBrains] Report Writer will be instructed to add missing scope');
      context._missingDisciplines = missingDisciplines;
    }
    this._log('[SmartBrains] ═══ Wave 2 Complete — Materials priced ═══');

    // ═══ WAVE 2.25: Labor Calculator (runs AFTER Pricer to use priced quantities) ═══
    progressCallback(62, '👷 Wave 2.25: Labor Calculator — computing labor hours…', this._brainStatus);
    const wave225Results = await this._runWave(2.25, ['LABOR_CALCULATOR'], encodedFiles, state, context, progressCallback);
    context.wave2_25 = wave225Results;
    this._log('[SmartBrains] ═══ Wave 2.25 Complete — Labor calculated ═══');

    // ═══ WAVE 2.5: Financial Engine (runs AFTER both to sum their outputs) ═══
    progressCallback(68, '📊 Wave 2.5: Financial Engine — building SOV…', this._brainStatus);
    const wave25FinResults = await this._runWave(2.5, ['FINANCIAL_ENGINE'], encodedFiles, state, context, progressCallback);
    context.wave2_5_fin = wave25FinResults;
    this._log('[SmartBrains] ═══ Wave 2.5 Complete — Financials computed ═══');

    // ═══ WAVE 2.75: Reverse Verification (1 brain, Pro model) ═══
    progressCallback(72, '🔄 Wave 2.75: Reverse-verifying BOQ against plans…', this._brainStatus);
    const wave275Results = await this._runWave(2.75, ['REVERSE_VERIFIER'], encodedFiles, state, context, progressCallback);
    context.wave2_75 = wave275Results;
    this._log('[SmartBrains] ═══ Wave 2.75 Complete ═══');

    // ═══ WAVE 3: Adversarial Audit (2 parallel brains, Pro model) ═══
    progressCallback(78, '😈 Wave 3: Adversarial Audit — cross-validator + devil\'s advocate…', this._brainStatus);
    const wave3Results = await this._runWave(3, ['CROSS_VALIDATOR', 'DEVILS_ADVOCATE'], encodedFiles, state, context, progressCallback);
    context.wave3 = wave3Results;
    this._log('[SmartBrains] ═══ Wave 3 Complete ═══');

    // ═══ WAVE 3.5: Deep Accuracy Pass (3 parallel brains, Pro) ═══
    try {
      progressCallback(82, '🔎 Wave 3.5: Deep Accuracy — Detail Verifier + Cross-Sheet + Overlap Detector…', this._brainStatus);
      const wave35Keys = ['DETAIL_VERIFIER', 'CROSS_SHEET_ANALYZER', 'OVERLAP_DETECTOR'];
      const wave35Results = await this._runWave(3.5, wave35Keys, encodedFiles, state, context, progressCallback);
      context.wave3_5 = wave35Results;
      this._log('[SmartBrains] ═══ Wave 3.5 Complete — Deep Accuracy done (3 brains) ═══');
    } catch (e) {
      console.warn('[SmartBrains] Wave 3.5 failed (non-fatal, continuing):', e.message);
      context.wave3_5 = {};
    }

    // ═══ WAVE 3.75: 6th Read — Final Reconciliation (1 brain, Pro deep reasoning) ═══
    try {
      progressCallback(86, '🏁 Wave 3.75: 6th Read — Final Reconciliation sweep…', this._brainStatus);
      const wave375Results = await this._runWave(3.75, ['FINAL_RECONCILIATION'], encodedFiles, state, context, progressCallback);
      context.wave3_75 = wave375Results;
      this._log('[SmartBrains] ═══ Wave 3.75 Complete — 6th Read done ═══');
    } catch (e) {
      console.warn('[SmartBrains] Wave 3.75 failed (non-fatal, continuing):', e.message);
      context.wave3_75 = {};
    }

    // ═══ WAVE 3.85: Estimate Correction (1 brain, Pro — corrects pricer using verification findings) ═══
    try {
      progressCallback(88, '🔧 Wave 3.85: Estimate Corrector — applying verification fixes…', this._brainStatus);
      const wave385Results = await this._runWave(3.85, ['ESTIMATE_CORRECTOR'], encodedFiles, state, context, progressCallback);
      context.wave3_85 = wave385Results;

      // If corrections were produced, log the summary and inject into context
      const corrector = wave385Results.ESTIMATE_CORRECTOR;
      if (corrector && !corrector._failed && !corrector._parseFailed && corrector.corrected_categories) {
        const log = corrector.correction_log || [];
        this._log(`[SmartBrains] ═══ Wave 3.85 Complete — ${log.length} correction(s) applied ═══`);
        for (const entry of log) {
          this._log(`[SmartBrains]   🔧 ${entry.action}: ${entry.item} — ${entry.reason} (${entry.cost_impact >= 0 ? '+' : ''}$${entry.cost_impact?.toLocaleString()})`);
        }
        if (corrector.total_adjustment) {
          this._log(`[SmartBrains]   📊 Total adjustment: ${corrector.total_adjustment >= 0 ? '+' : ''}$${corrector.total_adjustment?.toLocaleString()}`);
        }
        // Inject corrected data so Report Writer uses it
        context._correctedPricer = corrector;
      } else {
        console.warn('[SmartBrains] Estimate Corrector returned no corrections — Report Writer will use original pricer data');
      }
    } catch (e) {
      console.warn('[SmartBrains] Wave 3.85 failed (non-fatal, continuing):', e.message);
      context.wave3_85 = {};
    }

    // ═══ WAVE 4: Report Synthesis (1 brain) ═══
    progressCallback(92, '📝 Wave 4: Writing final report…', this._brainStatus);
    const wave4Results = await this._runWave(4, ['REPORT_WRITER'], encodedFiles, state, context, progressCallback);
    this._log('[SmartBrains] ═══ Wave 4 Complete ═══');

    // Log session cost summary
    if (this._sessionCost) {
      const sc = this._sessionCost;
      this._log(`[SmartBrains] ═══ API COST SUMMARY ═══`);
      this._log(`[SmartBrains]   Brain calls: ${sc.brainCalls}`);
      this._log(`[SmartBrains]   Tokens: ${sc.totalCached.toLocaleString()} cached + ${sc.totalFresh.toLocaleString()} fresh + ${sc.totalOutput.toLocaleString()} output`);
      this._log(`[SmartBrains]   Total cost: $${sc.totalCost.toFixed(4)}`);
      this._log(`[SmartBrains]   Cache savings: $${sc.totalSavings.toFixed(4)}`);
      this._log(`[SmartBrains]   Effective rate: $${(sc.totalCost / Math.max(sc.brainCalls, 1)).toFixed(4)} per brain`);
      if (sc.totalCached > 0) {
        const pctCached = ((sc.totalCached / (sc.totalCached + sc.totalFresh)) * 100).toFixed(1);
        this._log(`[SmartBrains]   Cache hit rate: ${pctCached}%`);
      }
    }

    // Extract final report
    const report = wave4Results.REPORT_WRITER;
    if (!report || report._failed) {
      throw new Error('Report synthesis failed — unable to generate final report');
    }

    // Build verification appendix from Cross Validator + Devil's Advocate + Consensus
    const validator = wave3Results.CROSS_VALIDATOR;
    const devil = wave3Results.DEVILS_ADVOCATE;
    const consensus = wave175Results.CONSENSUS_ARBITRATOR;
    let validationAppendix = '';

    // Consensus summary
    if (consensus && !consensus._failed) {
      validationAppendix += '\n\n## 🎯 TRIPLE-READ CONSENSUS REPORT\n';
      validationAppendix += `**Items Compared**: ${consensus.total_items_compared || 'N/A'}\n`;
      validationAppendix += `**In Consensus**: ${consensus.items_in_consensus || 'N/A'}\n`;
      validationAppendix += `**Disputes Resolved**: ${disputes.length}\n`;
      validationAppendix += `**Consensus Confidence**: ${consensus.confidence || 'N/A'}%\n`;
    }

    // Cross-validator summary
    if (validator && !validator._failed) {
      validationAppendix += '\n\n## ⚠️ VERIFICATION AUDIT\n';
      validationAppendix += `**Audit Status**: ${validator.status === 'PASSED' ? 'PASSED ✅' : 'ISSUES FOUND ⚠️'}\n`;
      validationAppendix += `**Checks Performed**: ${validator.checks_performed || 'N/A'}\n`;
      validationAppendix += `**Confidence Score**: ${validator.confidence_score || 'N/A'}%\n`;
      if (validator.issues && validator.issues.length > 0) {
        validationAppendix += '\n### Issues:\n';
        for (const issue of validator.issues) {
          const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
          validationAppendix += `${icon} **${issue.category}**: ${issue.description}\n`;
          if (issue.correction) validationAppendix += `   → Fix: ${issue.correction}\n`;
        }
      }
    }

    // Devil's advocate summary
    if (devil && !devil._failed) {
      validationAppendix += '\n\n## 😈 DEVIL\'S ADVOCATE CHALLENGE\n';
      validationAppendix += `**Risk Score**: ${devil.risk_score || 'N/A'}/100\n`;
      validationAppendix += `**Risk Level**: ${devil.risk_level || 'N/A'}\n`;
      validationAppendix += `**Assessment**: ${devil.overall_assessment || 'N/A'}\n`;
      if (devil.challenges && devil.challenges.length > 0) {
        validationAppendix += '\n### Challenges:\n';
        for (const c of devil.challenges) {
          const icon = c.severity === 'critical' ? '🔴' : c.severity === 'warning' ? '🟡' : '🔵';
          validationAppendix += `${icon} **${c.category}**: ${c.description} (Impact: ${c.estimated_impact || 'TBD'})\n`;
        }
      }
    }

    // Reverse verification summary
    const reverseV = wave275Results?.REVERSE_VERIFIER;
    if (reverseV && !reverseV._failed) {
      validationAppendix += `\n\n## 🔄 REVERSE VERIFICATION\n`;
      validationAppendix += `**Verification Score**: ${reverseV.verification_score || 'N/A'}%\n`;
      if (reverseV.discrepancies && reverseV.discrepancies.length > 0) {
        validationAppendix += '\n### Discrepancies Found:\n';
        for (const d of reverseV.discrepancies) {
          validationAppendix += `⚠️ **${d.item}**: BOQ=${d.boq_qty}, Plans=${d.actual_on_plans}, Δ=${d.difference}\n`;
        }
      }
    }

    const finalReport = (typeof report === 'string' ? report : JSON.stringify(report, null, 2)) + validationAppendix;

    progressCallback(100, '🎯 Analysis complete — 27 brains finished!', this._brainStatus);

    return {
      report: finalReport,
      brainResults: {
        wave0: wave0Results, wave1: wave1Results, wave1_5: wave15Results,
        wave1_75: wave175Results, wave2: wave2Results, wave2_25: wave225Results,
        wave2_5_fin: wave25FinResults, wave2_75: wave275Results,
        wave3: wave3Results, wave3_5: context.wave3_5, wave3_75: context.wave3_75,
        wave3_85_corrected: context.wave3_85?.ESTIMATE_CORRECTOR || null,
      },
      brainStatus: { ...this._brainStatus },
      stats: {
        totalBrains: Object.keys(this.BRAINS).length,
        successfulBrains: Object.values(this._brainStatus).filter(s => s.status === 'done').length,
        failedBrains: Object.values(this._brainStatus).filter(s => s.status === 'failed').length,
        confidence: validator?.confidence_score || consensus?.confidence || null,
        consensusDisputes: disputes.length,
        devilRiskScore: devil?.risk_score || null,
        reverseVerificationScore: reverseV?.verification_score || null,
      },
    };
    } finally {
      this._analysisRunning = false;
      this._lastAnalysisTime = Date.now();
    }
  },
};


// Make available globally
// Prevent external mutation of the engine API
Object.freeze(SmartBrains.config);
if (typeof window !== 'undefined') {
  window.SmartBrains = SmartBrains;
}
