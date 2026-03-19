/* ═══════════════════════════════════════════════════════════════
   SMARTPLANS — TRIPLE-READ CONSENSUS ENGINE v3.0
   ═══════════════════════════════════════════════════════════════
   Powered by Gemini 3.1 Pro — 2× reasoning improvement
   18 Specialized AI Brains × 7 Processing Waves
   Triple-Read Consensus Architecture for 99%+ accuracy
   
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

const SmartBrains = {

  VERSION: '3.1.0',

  // ═══════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════

  config: {
    // API keys are stored server-side as Cloudflare secrets (GEMINI_KEY_0 … GEMINI_KEY_17)
    // No keys in client code — all calls go through /api/ai/invoke proxy
    apiKeys: [],  // Empty — proxy handles key selection
    model: 'gemini-2.5-flash',              // Flash model for lightweight brains
    accuracyModel: 'gemini-2.5-pro',         // Pro model for report writing (accuracy-critical)
    proModel: 'gemini-3.1-pro-preview',      // Gemini 3.1 Pro — released Feb 19, 2026
    useProxy: true,                          // ENABLED — route all calls through server-side proxy
    proxyEndpoint: '/api/ai/invoke',
    maxRetries: 8,
    retryBaseDelay: 1500,
    timeout: 150000,                         // 2.5 min for Flash brains
    proTimeout: 300000,                      // 5 min for Pro (deep reasoning)
  },


  // ═══════════════════════════════════════════════════════════
  // BRAIN REGISTRY — Each brain is a domain specialist
  // ═══════════════════════════════════════════════════════════

  BRAINS: {
    // ── Wave 0: Legend Pre-Processing (Gemini 3.1 Pro) ──
    LEGEND_DECODER: { id: 0, name: 'Legend Decoder', wave: 0, emoji: '📖', needsFiles: ['legends'], maxTokens: 16384, useProModel: true },
    // ── Wave 1: First Read — Document Intelligence ──
    SYMBOL_SCANNER: { id: 1, name: 'Symbol Scanner', wave: 1, emoji: '🔍', needsFiles: ['legends', 'plans'], maxTokens: 16384, useProModel: true },
    CODE_COMPLIANCE: { id: 2, name: 'Code Compliance', wave: 1, emoji: '📋', needsFiles: ['plans', 'specs'], maxTokens: 12288, useProModel: true },
    MDF_IDF_ANALYZER: { id: 3, name: 'MDF/IDF Analyzer', wave: 1, emoji: '🏗️', needsFiles: ['plans', 'specs'], maxTokens: 12288, useProModel: true },
    CABLE_PATHWAY: { id: 4, name: 'Cable & Pathway', wave: 1, emoji: '🔌', needsFiles: ['plans', 'specs'], maxTokens: 16384, useProModel: true },
    SPECIAL_CONDITIONS: { id: 5, name: 'Special Conditions', wave: 1, emoji: '⚠️', needsFiles: ['plans', 'specs'], maxTokens: 16384, useProModel: true },
    // ── Wave 1.5: Second Read — Independent Verification (all Gemini 3.1 Pro) ──
    SHADOW_SCANNER: { id: 6, name: 'Shadow Scanner', wave: 1.5, emoji: '👁️', needsFiles: ['legends', 'plans'], maxTokens: 16384, useProModel: true },
    DISCIPLINE_DEEP_DIVE: { id: 7, name: 'Discipline Deep-Dive', wave: 1.5, emoji: '🎯', needsFiles: ['legends', 'plans'], maxTokens: 12288, useProModel: true },
    QUADRANT_SCANNER: { id: 8, name: 'Quadrant Scanner', wave: 1.5, emoji: '📐', needsFiles: ['plans'], maxTokens: 12288, useProModel: true },
    // ── Wave 1.75: Consensus Resolution (Gemini 3.1 Pro deep reasoning) ──
    CONSENSUS_ARBITRATOR: { id: 9, name: 'Consensus Arbitrator', wave: 1.75, emoji: '⚖️', needsFiles: [], maxTokens: 16384, useProModel: true },
    TARGETED_RESCANNER: { id: 10, name: 'Targeted Re-Scanner', wave: 1.75, emoji: '🔬', needsFiles: ['legends', 'plans'], maxTokens: 12288, useProModel: true },
    // ── Wave 2: Material Pricing (must run BEFORE labor so labor can use material qtys) ──
    MATERIAL_PRICER: { id: 11, name: 'Material Pricer', wave: 2, emoji: '💰', needsFiles: [], maxTokens: 16384, useProModel: true },
    // ── Wave 2.25: Labor Calculator (runs AFTER Material Pricer to use its quantities) ──
    LABOR_CALCULATOR: { id: 12, name: 'Labor Calculator', wave: 2.25, emoji: '👷', needsFiles: [], maxTokens: 16384, useProModel: true },
    // ── Wave 2.5: Financial Engine (runs AFTER both Pricer & Labor to sum their outputs) ──
    FINANCIAL_ENGINE: { id: 13, name: 'Financial Engine', wave: 2.5, emoji: '📊', needsFiles: [], maxTokens: 16384, useProModel: true },
    // ── Wave 2.75: Reverse Verification (Gemini 3.1 Pro) ──
    REVERSE_VERIFIER: { id: 14, name: 'Reverse Verifier', wave: 2.75, emoji: '🔄', needsFiles: ['plans'], maxTokens: 12288, useProModel: true },
    // ── Wave 3: Adversarial Audit (Gemini 3.1 Pro deep reasoning) ──
    CROSS_VALIDATOR: { id: 15, name: 'Cross Validator', wave: 3, emoji: '✅', needsFiles: [], maxTokens: 16384, useProModel: true },
    DEVILS_ADVOCATE: { id: 16, name: "Devil's Advocate", wave: 3, emoji: '😈', needsFiles: ['plans'], maxTokens: 16384, useProModel: true },
    // ── Wave 3.5: 4th, 5th, 6th Read — Deep Accuracy Pass (3 brains, Pro model) ──
    DETAIL_VERIFIER: { id: 18, name: 'Detail Verifier', wave: 3.5, emoji: '🔎', needsFiles: ['legends', 'plans'], maxTokens: 16384, useProModel: true },
    CROSS_SHEET_ANALYZER: { id: 19, name: 'Cross-Sheet Analyzer', wave: 3.5, emoji: '📊', needsFiles: ['plans'], maxTokens: 16384, useProModel: true },
    // ── Wave 3.75: Final Reconciliation (1 brain, Pro deep reasoning) ──
    FINAL_RECONCILIATION: { id: 20, name: 'Final Reconciliation', wave: 3.75, emoji: '🏁', needsFiles: ['legends', 'plans'], maxTokens: 16384, useProModel: true },
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
    const INLINE_THRESHOLD = 15 * 1024 * 1024; // 15 MB — above this, use File API upload

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

            // Large files → upload to Gemini File API (server-side)
            if (entry.rawFile.size > INLINE_THRESHOLD) {
              progressCallback(pct, `Uploading large file: ${entry.name} (${Math.round(entry.rawFile.size / 1024 / 1024)} MB)…`, null);
              console.log(`[SmartBrains] Uploading ${entry.name} (${Math.round(entry.rawFile.size / 1024 / 1024)} MB) via File API…`);

              try {
                const uploadResult = await this._uploadToFileAPI(base64, finalMime, entry.name);
                if (uploadResult && uploadResult.fileUri) {
                  fileData.fileUri = uploadResult.fileUri;
                  fileData.uploadedName = uploadResult.name;
                  console.log(`[SmartBrains] ✓ Uploaded ${entry.name} → ${uploadResult.fileUri}`);
                } else {
                  // Fallback to inline if upload fails
                  console.warn(`[SmartBrains] File API upload returned no URI, falling back to inline for ${entry.name}`);
                  fileData.base64 = base64;
                }
              } catch (uploadErr) {
                console.warn(`[SmartBrains] File API upload failed for ${entry.name}, falling back to inline:`, uploadErr.message);
                fileData.base64 = base64;
              }
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
              } catch (e) { /* PDF extraction optional */ }
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
  async _uploadToFileAPI(base64Data, mimeType, fileName) {
    const response = await fetch('/api/ai/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64Data,
        mimeType,
        fileName,
        brainSlot: 0,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Upload failed: ${response.status}`);
    }

    return await response.json();
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
          parts.push({ fileData: { mimeType: f.mimeType, fileUri: f.fileUri } });
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
  // BRAIN INVOCATION — Call Gemini with retry & key rotation
  // ═══════════════════════════════════════════════════════════

  async _invokeBrain(brainKey, brainDef, promptText, fileParts, useJsonMode) {
    const maxRetries = this.config.maxRetries;
    let lastError = null;

    // Determine model and URL up front (accessible in fallback block)
    const modelName = brainDef.useProModel ? (this.config.proModel || this.config.model) : (brainDef.useAccuracyModel && this.config.accuracyModel) ? this.config.accuracyModel : this.config.model;
    const url = this.config.proxyEndpoint;

    // Check for uploaded file URIs — needed for key pinning in both main loop and fallback
    const hasUploadedFiles = fileParts.some(p => p.fileData?.fileUri);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const parts = [{ text: promptText }, ...fileParts];
      // Low temperature for deterministic construction analysis
      const genConfig = {
        temperature: brainKey === 'CROSS_VALIDATOR' || brainKey === 'CONSENSUS_ARBITRATOR' ? 0.05 : 0.1,
        maxOutputTokens: brainDef.maxTokens,
      };
      if (useJsonMode) {
        genConfig.responseMimeType = 'application/json';
      }
      // NOTE: thinkingConfig disabled — causes Cloudflare 524 timeouts (>100s)
      // Gemini 3.1 Pro produces excellent results without thinking mode
      // thinkingConfig is also MUTUALLY EXCLUSIVE with JSON mode (responseMimeType)

      // ── Key Slot Selection ──
      // Files uploaded via Gemini File API are owned by the uploading project (slot 0).
      // Brains referencing fileUri MUST use keys from the same project or get 403.
      // Upload uses brainSlot 0, so pin file-referencing brains to slots 0-4 (same project).
      let keySlot;
      if (hasUploadedFiles) {
        // Pin to upload project — rotate within slots 0-4 only
        keySlot = attempt % 5;
      } else {
        // No uploaded files — safe to rotate across all projects
        keySlot = (brainDef.id + attempt) % 18;
      }

      const body = {
        contents: [{ parts }],
        generationConfig: genConfig,
        _model: modelName,       // Proxy reads this to select the right Gemini model
        _brainSlot: keySlot,
      };

      try {
        const controller = new AbortController();
        // Increase timeout for streaming — data arrives in chunks, so we need more wall-clock time
        const timeoutMs = brainDef.useProModel ? (this.config.proTimeout || this.config.timeout) * 2 : this.config.timeout * 2;
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.status === 429 || response.status === 403 || response.status >= 500) {
          const nextSlot = (brainDef.id + attempt + 1) % 18;
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
        const contentType = response.headers.get('content-type') || '';
        let text = '';

        if (contentType.includes('text/event-stream')) {
          // Streaming response — read SSE chunks
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE lines
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === '[DONE]') continue;
                try {
                  const chunk = JSON.parse(jsonStr);
                  const chunkParts = chunk?.candidates?.[0]?.content?.parts || [];
                  for (const p of chunkParts) {
                    if (p.text && !p.thought) {
                      text += p.text;
                    }
                  }
                } catch (e) {
                  // Skip malformed SSE chunks
                }
              }
            }
          }
        } else {
          // Non-streaming fallback (plain JSON response)
          const data = await response.json();
          const allParts = data?.candidates?.[0]?.content?.parts || [];
          text = allParts.filter(p => p.text && !p.thought).map(p => p.text).join('\n') || '';
        }

        if (!text || text.length < 20) {
          throw new Error('Empty response from AI');
        }

        console.log(`[Brain:${brainDef.name}] ✓ Complete (${text.length} chars, attempt ${attempt + 1})`);
        return text;

      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError') {
          console.warn(`[Brain:${brainDef.name}] Timeout, attempt ${attempt + 1}`);
        }
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, this.config.retryBaseDelay * Math.pow(2, attempt)));
        }
      }
    }

    // ── Model Fallback: If Pro model failed, retry once with Flash ──
    if (brainDef.useProModel && modelName !== this.config.model) {
      console.warn(`[Brain:${brainDef.name}] Pro model failed — falling back to ${this.config.model}`);
      try {
        const fbParts = [{ text: promptText }, ...fileParts];
        const fbGenConfig = {
          temperature: brainKey === 'CROSS_VALIDATOR' || brainKey === 'CONSENSUS_ARBITRATOR' ? 0.05 : 0.1,
          maxOutputTokens: brainDef.maxTokens,
        };
        if (useJsonMode) {
          fbGenConfig.responseMimeType = 'application/json';
        }
        // No thinkingConfig for Flash model

        const fbBody = {
          contents: [{ parts: fbParts }],
          generationConfig: fbGenConfig,
          _model: this.config.model,
          // Pin to upload project if file URIs are referenced
          _brainSlot: hasUploadedFiles ? 0 : brainDef.id,
        };

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.config.timeout);
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fbBody),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.ok) {
          // Handle SSE streaming in fallback too
          const ct = response.headers.get('content-type') || '';
          let text = '';
          if (ct.includes('text/event-stream')) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buf = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              const lines = buf.split('\n');
              buf = lines.pop();
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const js = line.slice(6).trim();
                  if (!js || js === '[DONE]') continue;
                  try {
                    const chunk = JSON.parse(js);
                    const cp = chunk?.candidates?.[0]?.content?.parts || [];
                    for (const p of cp) { if (p.text && !p.thought) text += p.text; }
                  } catch (e) {}
                }
              }
            }
          } else {
            const data = await response.json();
            const allParts = data?.candidates?.[0]?.content?.parts || [];
            text = allParts.filter(p => p.text && !p.thought).map(p => p.text).join('\n') || '';
          }
          if (text && text.length >= 20) {
            console.log(`[Brain:${brainDef.name}] ✓ Fallback complete (${text.length} chars)`);
            return text;
          }
        }
      } catch (fbErr) {
        console.warn(`[Brain:${brainDef.name}] Fallback also failed:`, fbErr.message);
      }
    }

    throw new Error(`Brain "${brainDef.name}" failed after ${maxRetries} attempts: ${lastError?.message}`);
  },

  // Safe JSON parser
  _parseJSON(text) {
    try {
      // Try direct parse
      return JSON.parse(text);
    } catch {
      // Try extracting JSON from markdown code block
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) {
        try { return JSON.parse(match[1].trim()); } catch { /* fall through */ }
      }
      // Try finding first { to last }
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) {
        try { return JSON.parse(text.substring(start, end + 1)); } catch { /* fall through */ }
      }
      return null;
    }
  },

  // ═══════════════════════════════════════════════════════════
  // RESPONSE VALIDATION SCHEMAS — Required fields per brain
  // ═══════════════════════════════════════════════════════════

  _SCHEMAS: {
    LEGEND_DECODER: ['symbols', 'legend_quality'],
    SYMBOL_SCANNER: ['sheets', 'totals'],
    CODE_COMPLIANCE: ['issues', 'summary'],
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
    // REPORT_WRITER returns markdown, no JSON schema
  },

  _validateBrainOutput(brainKey, parsed) {
    // Skip validation for non-JSON brains (Report Writer)
    if (brainKey === 'REPORT_WRITER') return { valid: true };
    if (!parsed || parsed._parseFailed || parsed._failed) {
      return { valid: false, reason: 'JSON parse failed or empty response' };
    }

    const schema = this._SCHEMAS[brainKey];
    if (!schema) return { valid: true };

    // Check required fields exist
    const missing = schema.filter(field => !(field in parsed));
    if (missing.length > 0) {
      return { valid: false, reason: `Missing required fields: ${missing.join(', ')}` };
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

PROJECT: ${context.projectName || 'Unknown'} | Type: ${context.projectType || 'Unknown'}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

YOUR MISSION: Scan EVERY sheet and count EVERY device symbol. Be exhaustive.

WHAT TO COUNT BY DISCIPLINE:
${(context.disciplines || []).includes('Structured Cabling') ? '- CABLING: Data outlets, voice outlets, WAPs, fiber outlets, combo outlets' : ''}
${(context.disciplines || []).includes('CCTV') ? '- CCTV: Fixed cameras, PTZ cameras, dome cameras, bullet cameras, multi-sensor cameras' : ''}
${(context.disciplines || []).includes('Access Control') ? '- ACCESS: Card readers, keypads, door contacts, REX devices, electric strikes, maglocks' : ''}
${(context.disciplines || []).includes('Fire Alarm') ? '- FIRE: Smoke detectors, heat detectors, pull stations, horn/strobes, duct detectors, modules' : ''}
${(context.disciplines || []).includes('Intrusion Detection') ? '- INTRUSION: Motion detectors, door contacts, glass break, keypads, sirens' : ''}
${(context.disciplines || []).includes('Audio Visual') ? '- AV: Speakers, displays, projectors, touch panels, microphones, signal plates' : ''}

INSTRUCTIONS:
1. Study the legend first to learn what each symbol means
2. Go sheet by sheet systematically
3. Count carefully — zoom into dense areas
4. Note any symbols you cannot identify
5. For each count, provide your confidence (0-100)

Return ONLY valid JSON:
{
  "sheets": [
    {
      "sheet_id": "E1.01",
      "sheet_name": "First Floor Plan",
      "symbols": [
        { "type": "camera", "subtype": "fixed_dome", "count": 12, "confidence": 95, "locations": ["Lobby","Corridor A"] }
      ]
    }
  ],
  "totals": { "camera": 48, "data_outlet": 200 },
  "unidentified_symbols": [],
  "notes": "string with any observations"
}`,

      // ── BRAIN 2: Code Compliance ─────────────────────────────
      CODE_COMPLIANCE: () => `You are a CONSTRUCTION CODE COMPLIANCE EXPERT specializing in ELV/low voltage systems.

PROJECT: ${context.projectName} | Type: ${context.projectType}
JURISDICTION: ${context.codeJurisdiction || 'General — apply national codes'}
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

Return ONLY valid JSON:
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
}`,

      // ── BRAIN 3: MDF/IDF Analyzer ────────────────────────────
      MDF_IDF_ANALYZER: () => `You are a TELECOM INFRASTRUCTURE SPECIALIST analyzing MDF/IDF/TR rooms.

PROJECT: ${context.projectName} | Type: ${context.projectType}
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

PROJECT: ${context.projectName} | Type: ${context.projectType}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

YOUR MISSION: Analyze ALL cable pathways, conduit (every type and size), cable tray, underground routes, and estimate cable/conduit quantities.

ANALYZE THOROUGHLY:
1. Horizontal cable runs — type (Cat5e/6/6A), estimated average length per drop
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
    { "type": "cat6a", "count": 200, "avg_length_ft": 150, "total_ft": 30000, "rating": "plenum" }
  ],
  "backbone_cables": [
    { "type": "fiber_sm_os2", "strand_count": 12, "runs": 3, "avg_length_ft": 300 }
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

PROJECT: ${context.projectName} | Type: ${context.projectType}
LOCATION: ${context.projectLocation || 'Not specified'}
PREVAILING WAGE: ${context.prevailingWage || 'Not specified'}
WORK SHIFT: ${context.workShift || 'Standard'}

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

CRITICAL: Be EXHAUSTIVE. If you see ANY exterior conduit runs, underground pathways, parking lot crossings, road crossings, or rooftop equipment on the plans, you MUST include the associated civil work, trenching, boring, traffic control, and restoration. Missing these items leads to MASSIVE cost overruns.

CRITICAL — OUT-OF-TOWN PROJECTS: If the project location is NOT within 60 miles of Rancho Cordova, CA, travel & per diem is MANDATORY. Calculate: crew_size × daily_rate × project_duration_days. This is typically $150K-$400K+ on large out-of-town projects and is the #1 reason estimates come in too low.

CRITICAL — TRANSIT/RAILROAD PROJECTS: If the project is for Amtrak, BNSF, a transit authority, or any railroad, you MUST include RWIC/flagman costs, RPL insurance, safety training, and work window restrictions. Railroad flagmen alone can cost $30,000-$80,000+ on a multi-week project.

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
    { "scope": "Directional boring", "distance_ft": 150, "diameter": "2-inch", "surface": "Under parking lot", "est_cost_range": "$3000-$5000" },
    { "scope": "Open-cut trenching", "distance_ft": 300, "depth_in": 24, "surface": "Grass/landscape", "est_cost_range": "$2000-$3500" }
  ],
  "traffic_control": [
    { "item": "Certified Flaggers", "duration_days": 3, "daily_rate": 450, "reason": "Road crossing boring operation" },
    { "item": "Traffic Control Plan", "est_cost": 1500, "reason": "Required by city for lane closure" },
    { "item": "Cones/barricades/arrow board", "duration_days": 3, "daily_rate": 200, "reason": "Parking lot work zone safety" }
  ],
  "subcontractors": [
    { "trade": "Core Drilling", "scope": "12 penetrations through concrete floors", "est_cost_range": "$3000-$5000" },
    { "trade": "Directional Boring", "scope": "150ft bore under parking lot for 2-inch conduit", "est_cost_range": "$4500-$7000" },
    { "trade": "Asphalt Patching", "scope": "Restore 2 saw cuts in parking lot", "est_cost_range": "$800-$1500" }
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
  ]
}`,

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

PROJECT: ${context.projectName}
PRICING TIER: ${tier.toUpperCase()} | REGION: ${regionKey} (${regionMult}× multiplier)
MATERIAL MARKUP: ${context.markup?.material || 50}%

═══ SELECTED DISCIPLINES (you MUST price ALL of these) ═══
${disciplineChecklist}

═══ VERIFIED DEVICE COUNTS (from Triple-Read Consensus — USE THESE EXACT QUANTITIES) ═══
${JSON.stringify(consensusCounts, null, 2).substring(0, 5000)}

DETAILED SYMBOL DATA (for reference — quantities above take priority):
${JSON.stringify(context.wave1?.SYMBOL_SCANNER?.sheets || context.wave1?.SYMBOL_SCANNER || {}, null, 2).substring(0, 5000)}

MDF/IDF ROOMS & EQUIPMENT:
${JSON.stringify(context.wave1?.MDF_IDF_ANALYZER || {}, null, 2).substring(0, 4000)}

CABLE QUANTITIES & PATHWAYS:
${JSON.stringify(context.wave1?.CABLE_PATHWAY || {}, null, 2).substring(0, 4000)}

PRICING DATABASE (use these exact prices):
${context.pricingContext || 'Use industry standard pricing'}

CRITICAL RULES:
1. You MUST create a category for EVERY discipline listed above — do NOT skip any discipline that has devices in the consensus counts or symbol data
2. If consensus says 24 cameras, price EXACTLY 24 cameras — not 20, not 30
3. If consensus says 200 data outlets, price EXACTLY 200 data outlets
4. For Access Control: include controllers, card readers, door contacts, REX devices, electric strikes/maglocks, door position switches, cabling, and power supplies
5. For each camera or access point, include mounting hardware, cable, connectors, and associated head-end equipment (NVR, switches, license)
6. Use the EXACT prices from the pricing database. Apply the ${regionMult}× regional multiplier to all unit costs
7. Calculate: Qty × Unit Cost × ${regionMult} = Extended Cost (VERIFY YOUR MATH on every single row)
8. Include ALL MDF/IDF equipment: racks, patch panels, UPS, grounding busbars (TMGB/TGB), cable management
9. Include backbone/riser cables from CABLE QUANTITIES section — do NOT omit fiber or copper backbone
10. Cable quantities: use ~150ft average per data drop, verify against CABLE_PATHWAY data

═══ MANDATORY SELF-CHECK (do this before returning) ═══
Before responding, verify that your output includes a category for EACH selected discipline listed above.
If ANY selected discipline is missing from your categories array, ADD IT NOW with all required materials.
Missing an entire discipline is a FATAL ERROR that will cause catastrophic underestimation.

═══ WASTE FACTOR, SPARE PARTS & CONSUMABLES ═══
You MUST add these to your output — they are REAL costs that every project incurs:
1. CABLE WASTE FACTOR: Add 12% to all cable quantities. Cable gets cut, pulled wrong, rejected, damaged. Price the waste.
2. CONDUIT WASTE: Add 8% to all conduit quantities. Mis-cuts, damaged sticks, offcuts.
3. SPARE PARTS / ATTIC STOCK: Add a category called "Spare Parts & Attic Stock" with 5% of each device type quantity (cameras, readers, detectors, outlets, etc.) rounded up. Most specs REQUIRE attic stock delivery to owner.
4. SMALL TOOLS & CONSUMABLES: Add a line item "Small Tools & Consumables" = 2.5% of total material cost. This covers drill bits, saw blades, anchors, screws, bolts, zip ties, tape, markers, velcro, cable lube, etc.
5. CONNECTOR & TERMINATION SUPPLIES: Ensure you have enough RJ45 connectors, splice cassettes, heat shrink, crimp connectors, wire nuts, etc. (at least 15% overage on connectors).

Return ONLY valid JSON:
{
  "categories": [
    {
      "name": "Structured Cabling",
      "items": [
        { "item": "Cat 6A Plenum Cable", "qty": 30000, "unit": "ft", "unit_cost": 0.52, "ext_cost": 15600.00 },
        { "item": "Cat 6A Cable — Waste Factor (12%)", "qty": 3600, "unit": "ft", "unit_cost": 0.52, "ext_cost": 1872.00 }
      ],
      "subtotal": 45200.00
    },
    {
      "name": "Spare Parts & Attic Stock",
      "items": [
        { "item": "Spare cameras (5%)", "qty": 2, "unit": "ea", "unit_cost": 380.00, "ext_cost": 760.00 }
      ],
      "subtotal": 0
    },
    {
      "name": "Small Tools & Consumables",
      "items": [
        { "item": "Misc consumables (drill bits, anchors, screws, ties, tape, markers)", "qty": 1, "unit": "lot", "unit_cost": 0, "ext_cost": 0 }
      ],
      "subtotal": 0
    }
  ],
  "grand_total": 125000.00,
  "waste_factor_total": 0,
  "spare_parts_total": 0,
  "consumables_total": 0,
  "markup_pct": ${context.markup?.material || 50},
  "total_with_markup": 156250.00
}`;
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

PROJECT: ${context.projectName} | Type: ${context.projectType}
LABOR MARKUP: ${context.markup?.labor || 50}%
BURDEN RATE: ${context.includeBurden ? context.burdenRate + '%' : 'Not applied'}
PREVAILING WAGE: ${context.prevailingWage || 'No'}
WORK SHIFT: ${context.workShift || 'Standard'}

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

Calculate labor by PROJECT PHASE:
1. Rough-In (35-40% of field labor) — pathway, CONDUIT INSTALLATION, cable pulling, backboxes
2. Trim/Termination (20-25%) — device mounting, terminations, rack dress
3. Programming (8-12%) — system programming, configuration, database entry
4. Testing/Commissioning (8-12%) — cable certification, device verification, punch list
5. Commissioning & Owner Training (3-5%) — AHJ walkthroughs, camera aiming sessions with owner, access control enrollment, system integration testing with existing infrastructure, owner staff training (2-4 sessions)
6. As-Built Drawings & Closeout (2-3%) — red-line markups, CAD/Revit as-builts, O&M manual compilation, warranty documentation, closeout binder assembly. Typically 40-80 hours for a large project.

NON-INSTALLATION LABOR (you MUST include these as separate phases — they are NOT optional):
7. Engineering & Submittals (3-5% of total labor cost):
   - Submittal preparation: product data, shop drawings, cut sheets
   - Engineer review coordination and resubmittals
   - Riser diagram and pathway design
   - Typically 60-200 hours on a large project ($50K-$200K+)
   - Use PM rate ($65-$85/hr) for this work

8. Project Management (dedicated PM for duration):
   - 1 PM at $65-$85/hr × 40 hrs/wk × project duration in weeks
   - Includes: scheduling, procurement, RFIs, change orders, meetings, daily reports
   - For an 8-12 week project: $20,800-$40,800
   - This is NOT included in field labor — it is additional

9. Coordination & Idle Time (10-15% of total field labor hours):
   - Waiting for other trades (electrician, drywall, ceiling grid)
   - GC schedule delays and re-sequencing
   - Elevator/lift access wait times
   - Material delivery delays
   - Safety stand-downs and orientation time
   - This is REAL cost — crews get paid whether working or waiting

Return ONLY valid JSON:
{
  "phases": [
    {
      "name": "Rough-In",
      "pct_of_total": 37,
      "tasks": [
        { "description": "Install cable tray — 500 LF", "classification": "journeyman", "hours": 100, "rate": 65.00, "cost": 6500.00 }
      ],
      "phase_hours": 500,
      "phase_cost": 32500.00
    },
    {
      "name": "Engineering & Submittals",
      "pct_of_total": 4,
      "tasks": [
        { "description": "Submittal preparation and coordination", "classification": "pm", "hours": 80, "rate": 75.00, "cost": 6000.00 }
      ],
      "phase_hours": 80,
      "phase_cost": 6000.00
    },
    {
      "name": "Project Management",
      "pct_of_total": 0,
      "tasks": [
        { "description": "Dedicated PM for project duration", "classification": "pm", "hours": 0, "rate": 75.00, "cost": 0 }
      ],
      "phase_hours": 0,
      "phase_cost": 0
    },
    {
      "name": "Coordination & Idle Time",
      "pct_of_total": 12,
      "tasks": [
        { "description": "Trade coordination, GC delays, access waits", "classification": "journeyman", "hours": 0, "rate": 65.00, "cost": 0 }
      ],
      "phase_hours": 0,
      "phase_cost": 0
    }
  ],
  "total_field_hours": 0,
  "total_non_field_hours": 0,
  "total_hours": 1200,
  "total_base_cost": 78000.00,
  "markup_pct": ${context.markup?.labor || 50},
  "total_with_markup": 101400.00,
  "crew_recommendation": { "journeyman": 3, "apprentice": 2, "foreman": 1, "pm": 1, "duration_weeks": 8 }
}`;
      },

      // ── BRAIN 8: Financial Engine ────────────────────────────
      FINANCIAL_ENGINE: () => `You are a CONSTRUCTION FINANCIAL ANALYST producing SOV and final pricing.

PROJECT: ${context.projectName} | Location: ${context.projectLocation || 'Not specified'}
PREVAILING WAGE: ${context.prevailingWage || 'No'}
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
${context.travel?.enabled ? (() => {
  const t = context.travel;
  const totalNights = t.crewSize * t.numTrips * t.daysPerTrip;
  const hotel = totalNights * t.hotelPerNight;
  const perdiem = totalNights * t.perDiemPerDay;
  const mileage = t.numTrips * (t.mileageRoundTrip || 0) * t.mileageRate;
  const airfare = t.crewSize * t.numTrips * (t.airfarePerPerson || 0);
  const rental = t.numTrips * t.daysPerTrip * (t.rentalCarPerDay || 0);
  const parking = t.numTrips * t.daysPerTrip * (t.parkingPerDay || 0);
  const total = hotel + perdiem + mileage + airfare + rental + parking;
  return `TRAVEL IS REQUIRED — use these EXACT pre-calculated amounts:
Hotel: $${hotel.toFixed(2)} (${totalNights} nights × $${t.hotelPerNight}/night)
Per Diem (meals): $${perdiem.toFixed(2)} (${totalNights} person-days × $${t.perDiemPerDay}/day)
Mileage: $${mileage.toFixed(2)}
Airfare: $${airfare.toFixed(2)}
Rental Car: $${rental.toFixed(2)}
Parking: $${parking.toFixed(2)}
TOTAL TRAVEL: $${total.toFixed(2)}
⚠️ YOU MUST include this $${total.toFixed(2)} as "total_travel" in the project summary. Do NOT skip it.`;
})() : 'No travel costs — local project.'}

CRITICAL RULES:
1. Your total_materials MUST EXACTLY EQUAL the Material Pricer's "total_with_markup" value (NOT "grand_total" — that is the base cost before markup). The sell price is what goes into the SOV and project summary.
2. Your total_labor MUST EXACTLY EQUAL the Labor Calculator's "total_with_markup" value (NOT the base cost)
3. SOV must include columns: Material, Labor, Equipment, Subcontractor, Total — all values must be SELL PRICES (with markup applied)
4. SOV line items must mathematically balance: Material + Labor + Equipment + Subcontractor = Total
5. All SOV line items must sum to the grand total
6. The project_summary grand_total must include ALL cost components: materials + labor + equipment + subcontractors + travel + transit + insurance + G&A + profit + warranty + contingency
7. SUBCONTRACTOR costs MUST include ALL items from Special Conditions: civil work (trenching, boring, patching), traffic control (flaggers, cones, arrow boards), core drilling, firestopping, electrical, and any other contracted work
8. EQUIPMENT costs MUST include ALL rental items from Special Conditions: lifts, backhoes, trenchers, saws, etc.
9. Include a separate SOV line item for "Mobilization/Setup & Demobilization/Teardown"
10. Include a separate SOV line item for "Civil Work & Site Restoration" if underground/exterior work exists
11. G&A OVERHEAD is MANDATORY: Apply 15% to (materials + labor + equipment + subcontractors) subtotal. This covers company overhead (office, trucks, insurance, admin staff). This is separate from markup.
12. PROFIT MARGIN is MANDATORY: Apply 10% to the subtotal after G&A. This is the company's profit. Without this, you are bidding at cost.
13. WARRANTY RESERVE: Add 1.5% of total project cost for warranty callback labor during the 1-year warranty period.

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

PROJECT: ${context.projectName || 'Project'}
TYPE: ${context.projectType || 'Low Voltage'}
LOCATION: ${context.projectLocation || 'TBD'}
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
| Item # | Description | Qty | Unit | Unit Cost | Ext Cost | Markup ${matMarkup}% | Sell Price |
|--------|-------------|-----|------|-----------|----------|------------|------------|
| SC-001 | Cat 6A Plenum Cable | 30000 | ft | $0.52 | $15,600 | $3,900 | $19,500 |

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
${JSON.stringify(context.wave2?.MATERIAL_PRICER || {}, null, 2).substring(0, 8000)}

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

PROJECT: ${context.projectName || 'Unknown'}
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

      // ── BRAIN 6: Shadow Scanner (Wave 1.5 — Second Read) ──────
      SHADOW_SCANNER: () => `You are an INDEPENDENT VERIFICATION SCANNER performing a SECOND COUNT of all ELV device symbols. You must use a COMPLETELY DIFFERENT methodology than a standard left-to-right scan.

PROJECT: ${context.projectName || 'Unknown'}
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

PROJECT: ${context.projectName || 'Unknown'}
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

PROJECT: ${context.projectName || 'Unknown'}
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
      CONSENSUS_ARBITRATOR: () => `You are a SENIOR CONSENSUS ANALYST. Three independent teams just counted every device symbol on the same construction drawings using different methodologies. Your job is to find the TRUTH.

READ 1 — Systematic Scan (Symbol Scanner):
${JSON.stringify(context.wave1?.SYMBOL_SCANNER?.totals || {}, null, 2)}

READ 2 — Room-by-Room Scan (Shadow Scanner):
${JSON.stringify(context.wave1_5?.SHADOW_SCANNER?.totals || {}, null, 2)}

READ 3 — Quadrant Scan:
${JSON.stringify(context.wave1_5?.QUADRANT_SCANNER?.totals || {}, null, 2)}

DISCIPLINE SPECIALIST COUNT:
${JSON.stringify(context.wave1_5?.DISCIPLINE_DEEP_DIVE?.discipline_counts || {}, null, 2).substring(0, 2000)}

CONSENSUS RULES:
1. If ALL 3 reads agree within 5% → HIGH CONFIDENCE. Use the average.
2. If 2 of 3 agree within 5% → MODERATE CONFIDENCE. Use the agreeing pair's average.
3. If ALL 3 disagree by >10% → DISPUTE. Flag for targeted re-scan.
4. For disputed items, identify WHICH sheets/areas likely caused the disagreement.

Return ONLY valid JSON:
{
  "consensus_counts": {
    "camera": { "read1": 48, "read2": 46, "read3": 49, "consensus": 48, "confidence": "high", "method": "3-way average" }
  },
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

Return ONLY valid JSON:
{
  "challenges": [
    { "severity": "critical", "category": "missing_item", "description": "No UPS listed for MDF room — this is always required", "estimated_impact": "$2,500-$8,000", "recommendation": "Add rack-mount UPS per TIA-569" }
  ],
  "risk_score": 15,
  "risk_level": "low|medium|high|critical",
  "missed_items": [],
  "pricing_flags": [],
  "overall_assessment": "string"
}`,

      // ── BRAIN 18: Detail Verifier (Wave 3.5 — 4th Read) ──────
      DETAIL_VERIFIER: () => {
        const consensus = context.wave1_75?.CONSENSUS_ARBITRATOR?.consensus_counts || {};
        const crossVal = context.wave3?.CROSS_VALIDATOR?.issues || [];
        const devilItems = context.wave3?.DEVILS_ADVOCATE?.missed_items || [];
        return `You are a DETAIL VERIFICATION SPECIALIST performing a FOURTH READ of the construction plans. Your job is to ZOOM INTO specific areas and provide PRECISE COUNTS.

PROJECT: ${context.projectName || 'Unknown'}
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

PROJECT: ${context.projectName || 'Unknown'}
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

PROJECT: ${context.projectName || 'Unknown'}
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

    const categories = {
      'Structured Cabling': PRICING_DB.structuredCabling,
      'CCTV': PRICING_DB.cctv,
      'Access Control': PRICING_DB.accessControl,
      'Fire Alarm': PRICING_DB.fireAlarm,
      'Intrusion Detection': PRICING_DB.intrusionDetection,
      'Audio Visual': PRICING_DB.audioVisual,
    };

    for (const [catName, catData] of Object.entries(categories)) {
      if (!catData) continue;
      ctx += `\n${catName}:\n`;
      for (const [subCat, items] of Object.entries(catData)) {
        for (const [key, item] of Object.entries(items)) {
          if (typeof item === 'object' && item[tier] !== undefined) {
            let adjusted = +(item[tier] * regionMult).toFixed(2);
            // Apply project type equipment multiplier to device prices
            if (ptMult && ptMult.equipment_multiplier > 1.0 && 
                (key.includes('camera') || key.includes('ptz') || key.includes('multisensor') || 
                 key.includes('nvr') || key.includes('lpr') || key.includes('thermal') ||
                 key.includes('reader') || key.includes('panel') || key.includes('poe_switch') ||
                 key.includes('monitor') || key.includes('dome') || key.includes('bullet'))) {
              adjusted = +(adjusted * ptMult.equipment_multiplier).toFixed(2);
              ctx += `  ${key}: $${adjusted}/${item.unit || 'ea'} (${item.description || ''}) [${ptMult.equipment_multiplier}× transit-rated]\n`;
            } else {
              ctx += `  ${key}: $${adjusted}/${item.unit || 'ea'} (${item.description || ''})\n`;
            }
          }
        }
      }
    }

    return ctx.substring(0, 12000);
  },


  // ═══════════════════════════════════════════════════════════
  // SINGLE BRAIN EXECUTION — Extracted for batched orchestration
  // ═══════════════════════════════════════════════════════════

  async _runSingleBrain(key, context, encodedFiles, baseProgress, endProgress, totalBrains, results, incrementCompleted, progressCallback) {
    const brain = this.BRAINS[key];

    try {
      // Build prompt with context
      const prompt = this._getPrompt(key, context);
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

      // ── Schema Validation + Auto-Retry ──
      const validation = this._validateBrainOutput(key, parsed);
      if (!validation.valid) {
        console.warn(`[Brain:${brain.name}] Validation failed: ${validation.reason}. Auto-retrying…`);
        this._brainStatus[key].status = 'retrying';
        progressCallback(baseProgress, `🔄 ${brain.name} retrying (${validation.reason})…`, this._brainStatus);

        try {
          // Retry with enhanced prompt prefix
          const retryPrefix = 'IMPORTANT: Your previous response was incomplete or had issues. STRICTLY follow the JSON schema. Include ALL required fields. Be thorough.\n\n';
          rawResult = await this._invokeBrain(key, brain, retryPrefix + prompt, fileParts, useJsonMode);
          if (useJsonMode) {
            const retryParsed = this._parseJSON(rawResult);
            if (retryParsed) {
              const retryValidation = this._validateBrainOutput(key, retryParsed);
              if (retryValidation.valid) {
                parsed = retryParsed;
                console.log(`[Brain:${brain.name}] ✓ Retry succeeded — validation passed`);
              } else {
                console.warn(`[Brain:${brain.name}] Retry still invalid: ${retryValidation.reason}. Using best result.`);
                parsed = retryParsed; // Use retry result even if imperfect — it's likely better
              }
            }
          }
        } catch (retryErr) {
          console.warn(`[Brain:${brain.name}] Retry failed: ${retryErr.message}. Using original result.`);
        }
      }

      this._brainStatus[key] = { status: 'done', progress: 100, result: parsed, error: null };
      results[key] = parsed;
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
    const waveStart = { 0: 5, 1: 12, 1.5: 35, 1.75: 50, 2: 56, 2.25: 62, 2.5: 68, 2.75: 72, 3: 76, 3.5: 80, 3.75: 84, 4: 90 };
    const waveEnd = { 0: 12, 1: 35, 1.5: 50, 1.75: 56, 2: 62, 2.25: 68, 2.5: 72, 2.75: 76, 3: 80, 3.5: 84, 3.75: 90, 4: 98 };
    const baseProgress = waveStart[waveNum] ?? 0;
    const endProgress = waveEnd[waveNum] ?? 100;
    const waveNames = { 0: 'Legend Pre-Processing', 1: 'First Read', 1.5: 'Second Read', 1.75: 'Consensus Resolution', 2: 'Material Pricing', 2.25: 'Labor Calculation', 2.5: 'Financial Engine', 2.75: 'Reverse Verification', 3: 'Adversarial Audit', 3.5: '4th & 5th Read — Deep Accuracy', 3.75: '6th Read — Final Reconciliation', 4: 'Report Synthesis' };

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
        console.log(`[SmartBrains] Wave ${waveNum}: Starting batch ${Math.floor(i/BATCH_SIZE) + 1} — ${batch.map(k => this.BRAINS[k].name).join(', ')}`);

        const batchPromises = batch.map(async (key) => {
          await this._runSingleBrain(key, context, encodedFiles, baseProgress, endProgress, brainKeys.length, results, () => ++completed, progressCallback);
        });
        await Promise.allSettled(batchPromises);

        // Stagger delay between batches (not after the last batch)
        if (i + BATCH_SIZE < brainKeys.length) {
          console.log(`[SmartBrains] Wave ${waveNum}: Stagger delay ${STAGGER_DELAY_MS}ms before next batch…`);
          await new Promise(r => setTimeout(r, STAGGER_DELAY_MS));
        }
      }
    }

    const failedCount = Object.values(results).filter(r => r?._failed).length;
    if (failedCount === brainKeys.length) {
      throw new Error(`Wave ${waveNum} completely failed — all ${brainKeys.length} brains errored`);
    }

    return results;
  },


  // ═══════════════════════════════════════════════════════════
  // MAIN ENTRY POINT — Full Multi-Brain Analysis
  // ═══════════════════════════════════════════════════════════

  async runFullAnalysis(state, progressCallback) {
    console.log(`[SmartBrains] ═══ Starting Triple-Read Consensus Engine v${this.VERSION} ═══`);
    console.log(`[SmartBrains] API Keys: ${this.config.apiKeys.length} | Pro: ${this.config.proModel} | Accuracy: ${this.config.accuracyModel} | Flash: ${this.config.model}`);
    console.log(`[SmartBrains] 🚀 Gemini 3.1 Pro active — thinking mode enabled`);

    // Reset brain status
    this._brainStatus = {};
    for (const [key, brain] of Object.entries(this.BRAINS)) {
      this._brainStatus[key] = { status: 'pending', progress: 0, result: null, error: null };
    }

    // Phase 0: Encode all files once
    progressCallback(2, '📁 Encoding documents…', this._brainStatus);
    const encodedFiles = await this._encodeAllFiles(state, progressCallback);
    const totalFiles = Object.values(encodedFiles).reduce((s, arr) => s + arr.length, 0);
    console.log(`[SmartBrains] Encoded ${totalFiles} files`);

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
      pricingContext: this._buildPricingContext(state),
      wave0: null, wave1: null, wave1_5: null, wave1_75: null,
      wave2: null, wave2_25: null, wave2_5_fin: null, wave2_75: null,
      wave3: null, wave3_5: null, wave3_75: null,
    };

    // ═══ WAVE 0: Legend Pre-Processing (1 brain, Pro model) — NON-FATAL ═══
    progressCallback(5, '📖 Wave 0: Decoding symbol legend…', this._brainStatus);
    let wave0Results = {};
    try {
      wave0Results = await this._runWave(0, ['LEGEND_DECODER'], encodedFiles, state, context, progressCallback);
      console.log('[SmartBrains] ═══ Wave 0 Complete — Legend decoded ═══');
    } catch (wave0Err) {
      console.warn('[SmartBrains] ⚠️ Wave 0 (Legend) failed — continuing without legend context:', wave0Err.message);
      this._brainStatus['LEGEND_DECODER'] = { status: 'failed', progress: 0, result: null, error: wave0Err.message };
      wave0Results = { LEGEND_DECODER: { _failed: true, _error: wave0Err.message } };
    }
    context.wave0 = wave0Results;

    // ═══ WAVE 1: First Read — Document Intelligence (5 parallel brains) ═══
    progressCallback(12, '🔍 Wave 1: First Read — 5 brains scanning…', this._brainStatus);
    const wave1Keys = ['SYMBOL_SCANNER', 'CODE_COMPLIANCE', 'MDF_IDF_ANALYZER', 'CABLE_PATHWAY', 'SPECIAL_CONDITIONS'];
    const wave1Results = await this._runWave(1, wave1Keys, encodedFiles, state, context, progressCallback);
    context.wave1 = wave1Results;
    console.log('[SmartBrains] ═══ Wave 1 Complete — First Read done ═══');

    // ═══ WAVE 1.5: Second Read — Independent Verification (3 parallel brains, Pro model) ═══
    progressCallback(35, '👁️ Wave 1.5: Second Read — 3 independent verifiers…', this._brainStatus);
    const wave15Keys = ['SHADOW_SCANNER', 'DISCIPLINE_DEEP_DIVE', 'QUADRANT_SCANNER'];
    const wave15Results = await this._runWave(1.5, wave15Keys, encodedFiles, state, context, progressCallback);
    context.wave1_5 = wave15Results;
    console.log('[SmartBrains] ═══ Wave 1.5 Complete — Second Read done ═══');

    // ═══ WAVE 1.75: Consensus Resolution ═══
    progressCallback(50, '⚖️ Wave 1.75: Building consensus from 3 reads…', this._brainStatus);
    const wave175Results = await this._runWave(1.75, ['CONSENSUS_ARBITRATOR'], encodedFiles, state, context, progressCallback);
    context.wave1_75 = wave175Results;

    // Conditional: If disputes exist, run Targeted Re-Scanner (3rd read)
    const disputes = wave175Results.CONSENSUS_ARBITRATOR?.disputes || [];
    if (disputes.length > 0 && disputes.some(d => d.needs_rescan)) {
      progressCallback(54, `🔬 Targeted Re-Scan — ${disputes.length} disputed items…`, this._brainStatus);
      const rescanResults = await this._runWave(1.75, ['TARGETED_RESCANNER'], encodedFiles, state, context, progressCallback);
      // Merge re-scan results into consensus
      if (rescanResults.TARGETED_RESCANNER && !rescanResults.TARGETED_RESCANNER._failed) {
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
      }
    } else {
      this._brainStatus['TARGETED_RESCANNER'] = { status: 'done', progress: 100, result: { _skipped: true, reason: 'No disputes' }, error: null };
    }
    console.log(`[SmartBrains] ═══ Wave 1.75 Complete — ${disputes.length} disputes resolved ═══`);

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
    console.log('[SmartBrains] ═══ Wave 2 Complete — Materials priced ═══');

    // ═══ WAVE 2.25: Labor Calculator (runs AFTER Pricer to use priced quantities) ═══
    progressCallback(62, '👷 Wave 2.25: Labor Calculator — computing labor hours…', this._brainStatus);
    const wave225Results = await this._runWave(2.25, ['LABOR_CALCULATOR'], encodedFiles, state, context, progressCallback);
    context.wave2_25 = wave225Results;
    console.log('[SmartBrains] ═══ Wave 2.25 Complete — Labor calculated ═══');

    // ═══ WAVE 2.5: Financial Engine (runs AFTER both to sum their outputs) ═══
    progressCallback(68, '📊 Wave 2.5: Financial Engine — building SOV…', this._brainStatus);
    const wave25FinResults = await this._runWave(2.5, ['FINANCIAL_ENGINE'], encodedFiles, state, context, progressCallback);
    context.wave2_5_fin = wave25FinResults;
    console.log('[SmartBrains] ═══ Wave 2.5 Complete — Financials computed ═══');

    // ═══ WAVE 2.75: Reverse Verification (1 brain, Pro model) ═══
    progressCallback(72, '🔄 Wave 2.75: Reverse-verifying BOQ against plans…', this._brainStatus);
    const wave275Results = await this._runWave(2.75, ['REVERSE_VERIFIER'], encodedFiles, state, context, progressCallback);
    context.wave2_75 = wave275Results;
    console.log('[SmartBrains] ═══ Wave 2.75 Complete ═══');

    // ═══ WAVE 3: Adversarial Audit (2 parallel brains, Pro model) ═══
    progressCallback(78, '😈 Wave 3: Adversarial Audit — cross-validator + devil\'s advocate…', this._brainStatus);
    const wave3Results = await this._runWave(3, ['CROSS_VALIDATOR', 'DEVILS_ADVOCATE'], encodedFiles, state, context, progressCallback);
    context.wave3 = wave3Results;
    console.log('[SmartBrains] ═══ Wave 3 Complete ═══');

    // ═══ WAVE 3.5: 4th & 5th Read — Deep Accuracy (2 parallel brains, Pro) ═══
    try {
      progressCallback(82, '🔎 Wave 3.5: 4th & 5th Read — Detail Verifier + Cross-Sheet Analyzer…', this._brainStatus);
      const wave35Keys = ['DETAIL_VERIFIER', 'CROSS_SHEET_ANALYZER'];
      const wave35Results = await this._runWave(3.5, wave35Keys, encodedFiles, state, context, progressCallback);
      context.wave3_5 = wave35Results;
      console.log('[SmartBrains] ═══ Wave 3.5 Complete — 4th & 5th Read done ═══');
    } catch (e) {
      console.warn('[SmartBrains] Wave 3.5 failed (non-fatal, continuing):', e.message);
      context.wave3_5 = {};
    }

    // ═══ WAVE 3.75: 6th Read — Final Reconciliation (1 brain, Pro deep reasoning) ═══
    try {
      progressCallback(86, '🏁 Wave 3.75: 6th Read — Final Reconciliation sweep…', this._brainStatus);
      const wave375Results = await this._runWave(3.75, ['FINAL_RECONCILIATION'], encodedFiles, state, context, progressCallback);
      context.wave3_75 = wave375Results;
      console.log('[SmartBrains] ═══ Wave 3.75 Complete — 6th Read done ═══');
    } catch (e) {
      console.warn('[SmartBrains] Wave 3.75 failed (non-fatal, continuing):', e.message);
      context.wave3_75 = {};
    }

    // ═══ WAVE 4: Report Synthesis (1 brain) ═══
    progressCallback(90, '📝 Wave 4: Writing final report…', this._brainStatus);
    const wave4Results = await this._runWave(4, ['REPORT_WRITER'], encodedFiles, state, context, progressCallback);
    console.log('[SmartBrains] ═══ Wave 4 Complete ═══');

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

    progressCallback(100, '🎯 Analysis complete — 21 brains finished!', this._brainStatus);

    return {
      report: finalReport,
      brainResults: {
        wave0: wave0Results, wave1: wave1Results, wave1_5: wave15Results,
        wave1_75: wave175Results, wave2: wave2Results, wave2_25: wave225Results,
        wave2_5_fin: wave25FinResults, wave2_75: wave275Results,
        wave3: wave3Results, wave3_5: context.wave3_5, wave3_75: context.wave3_75,
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
  },
};


// Make available globally
if (typeof window !== 'undefined') {
  window.SmartBrains = SmartBrains;
}
