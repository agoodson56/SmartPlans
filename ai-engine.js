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

// Safe JSON.stringify — catches circular refs and non-serializable objects
function _safeJSON(obj, indent, maxLen) {
  try { const s = JSON.stringify(obj, null, indent); return maxLen ? s.substring(0, maxLen) : s; }
  catch { return '{}'; }
}

const SmartBrains = {

  VERSION: '5.0.0',

  // ── Auth headers for API calls — reads from app.js globals ──
  _authHeaders(extra = {}) {
    const h = { ...extra };
    if (typeof _sessionToken !== 'undefined' && _sessionToken) h['X-Session-Token'] = _sessionToken;
    if (typeof _appToken !== 'undefined' && _appToken) h['X-App-Token'] = _appToken;
    return h;
  },

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
    maxRetries: 5,                           // FIX: Reduced from 10 — blacklist handles model failures, retries are for transient errors only
    retryBaseDelay: 1500,
    timeout: 150000,                         // 2.5 min for standard brains
    proTimeout: 300000,                      // 5 min for Pro (deep reasoning)
    DEBUG: false,                            // FIX #18: Gate verbose logging behind debug flag
  },

  // FIX #20: Session-level model blacklist — skip models that consistently 400
  // After the first 400 from a model (e.g., gemini-3.1-pro-preview rejects File API refs),
  // blacklist it for the remainder of this session to avoid wasting API calls
  _model400Blacklist: new Set(),

  // FIX #19: Circuit breaker — pause all brains when API is overwhelmed
  _circuitBreaker: {
    consecutive429s: 0,
    trippedUntil: 0,     // timestamp when circuit breaker clears
    TRIP_THRESHOLD: 5,   // trip after 5 consecutive 429s across different keys
    COOLDOWN_MS: 60000,  // pause for 60 seconds
    record429() {
      this.consecutive429s++;
      if (this.consecutive429s >= this.TRIP_THRESHOLD) {
        this.trippedUntil = Date.now() + this.COOLDOWN_MS;
        console.warn(`[CircuitBreaker] TRIPPED — ${this.consecutive429s} consecutive 429s. Pausing all brains for ${this.COOLDOWN_MS / 1000}s`);
      }
    },
    recordSuccess() { this.consecutive429s = 0; },
    isTripped() { return Date.now() < this.trippedUntil; },
    async waitIfTripped() {
      if (this.isTripped()) {
        const waitMs = this.trippedUntil - Date.now();
        console.warn(`[CircuitBreaker] Waiting ${Math.round(waitMs / 1000)}s for rate limits to reset…`);
        await new Promise(r => setTimeout(r, waitMs));
        this.consecutive429s = 0; // reset after wait
      }
    }
  },


  // ═══════════════════════════════════════════════════════════
  // BRAIN REGISTRY — Each brain is a domain specialist
  // ═══════════════════════════════════════════════════════════

  BRAINS: {
    // ── Wave 0: Legend Pre-Processing + Spatial Layout (Gemini 3.1 Pro) ──
    LEGEND_DECODER: { id: 0, name: 'Legend Decoder', wave: 0, emoji: '📖', needsFiles: ['legends'], maxTokens: 65536, useProModel: true },
    PLAN_LEGEND_SCANNER: { id: 0.25, name: 'Plan Legend Scanner', wave: 0, emoji: '🗺️', needsFiles: ['plans'], maxTokens: 65536, useProModel: true },
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
    DEVICE_LOCATOR: { id: 28, name: 'Device Locator', wave: 1, emoji: '📍', needsFiles: ['legends', 'plans'], maxTokens: 65536, useProModel: true },
    SCOPE_EXCLUSION_SCANNER: { id: 29, name: 'Scope Exclusion Scanner', wave: 1, emoji: '🚫', needsFiles: ['plans', 'specs'], maxTokens: 65536, useProModel: true },
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
    MATERIAL_PRICER: { id: 11, name: 'Material Pricer', wave: 2, emoji: '💰', needsFiles: ['plans'], maxTokens: 65536, useProModel: true },
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
  // SHEET CLASSIFICATION — Identify sheet types by AEC naming conventions
  // Standard AEC sheet numbering: A=Arch, S=Struct, M=Mech, E=Elec, P=Plumb,
  // T=Telecom/Tech, FA=Fire Alarm, D=Demo, L=Landscape, C=Civil, G=General
  // ELV sheets: T, E (sometimes), FA, ES (electronic safety), LS (low-voltage)
  // ═══════════════════════════════════════════════════════════

  // Maps sheet ID prefixes to disciplines they're relevant for
  SHEET_DISCIPLINE_MAP: {
    // Always relevant — general/cover/legend/site
    'G':   ['all'],    // General sheets
    'G0':  ['all'],    // Cover, index, abbreviations
    'G1':  ['all'],    // Code/legend sheets
    'CS':  ['all'],    // Cover sheets
    'IN':  ['all'],    // Index

    // Low-voltage / Technology sheets — always relevant for selected disciplines
    'T':   ['Structured Cabling', 'CCTV', 'Access Control', 'Audio Visual', 'Intrusion Detection', 'Fire Alarm'],
    'ET':  ['Structured Cabling', 'CCTV', 'Access Control', 'Audio Visual', 'Intrusion Detection'],
    'TD':  ['Structured Cabling', 'CCTV', 'Access Control', 'Audio Visual', 'Intrusion Detection'],
    'LS':  ['Structured Cabling', 'CCTV', 'Access Control', 'Audio Visual', 'Intrusion Detection'],
    'IT':  ['Structured Cabling'],
    'ES':  ['CCTV', 'Access Control', 'Intrusion Detection'],

    // Fire alarm sheets
    'FA':  ['Fire Alarm'],
    'FP':  ['Fire Alarm'],

    // Electrical — relevant for power coordination, conduit, device locations
    'E':   ['Structured Cabling', 'CCTV', 'Access Control', 'Audio Visual', 'Intrusion Detection', 'Fire Alarm'],
    'EP':  ['Structured Cabling', 'CCTV', 'Access Control', 'Audio Visual', 'Intrusion Detection', 'Fire Alarm'],
    'EL':  ['Structured Cabling', 'CCTV', 'Access Control', 'Audio Visual', 'Intrusion Detection', 'Fire Alarm'],

    // Architectural — relevant for access control (door schedules), layout reference
    'A':   ['Access Control', 'Structured Cabling', 'CCTV', 'Audio Visual', 'Fire Alarm', 'Intrusion Detection'],
    'AD':  ['Access Control'],
    'AI':  ['Access Control', 'Structured Cabling'],

    // Door/hardware schedules — critical for access control (Div 08)
    'HW':  ['Access Control'],
    'DH':  ['Access Control'],

    // Site/civil — relevant for exterior cameras, gate operators
    'C':   ['CCTV', 'Access Control'],
    'L':   ['CCTV'],
    'SP':  ['CCTV', 'Access Control'],

    // Structural — relevant for seismic bracing, core drilling
    'S':   [],  // Skip structural unless specifically needed

    // Mechanical/plumbing — rarely relevant for LV
    'M':   [],  // Skip mechanical
    'P':   [],  // Skip plumbing
    // Note: 'FP' (Fire Protection) already mapped above under fire alarm sheets
  },

  // Content-based keywords that indicate sheet relevance (when sheet naming is ambiguous)
  SHEET_CONTENT_KEYWORDS: {
    'Structured Cabling': /data|outlet|network|telecom|mdf|idf|mpoe|tr\b|cat\s?6|fiber|backbone|horizontal|riser|cable\s*tray|j-hook|wap|wireless/i,
    'CCTV':               /camera|cctv|surveillance|video|nvr|vms|security\s*camera|ptz|dome\s*cam/i,
    'Access Control':     /access\s*control|card\s*reader|door\s*(schedule|hardware)|keypad|electric\s*strike|maglock|rex|intercom|gate\s*operator/i,
    'Audio Visual':       /audio|visual|av\b|speaker|display|projector|sound|paging|intercom.*av/i,
    'Intrusion Detection':/intrusion|alarm\s*panel|motion\s*detect|glass\s*break|keypad.*alarm|burglar/i,
    'Fire Alarm':         /fire\s*alarm|facp|smoke\s*detect|pull\s*station|horn.*strobe|notification|nac\b|slc\b|duct\s*detect/i,
  },

  // Spec section to CSI division mapping
  SPEC_DIVISION_MAP: {
    '01': ['all'],        // General Requirements
    '08': ['Access Control'], // Openings
    '27': ['Structured Cabling', 'Audio Visual'],
    '28': ['CCTV', 'Access Control', 'Fire Alarm', 'Intrusion Detection'],
  },

  /**
   * Classify sheets from Wave 0 SPATIAL_LAYOUT + chunk filenames
   * Returns a Map<chunkName, { relevant: boolean, disciplines: string[], sheetId: string, reason: string }>
   */
  _classifySheets(encodedFiles, wave0Results, disciplines) {
    const classification = new Map();
    if (!disciplines || disciplines.length === 0) return classification; // No filtering if no disciplines selected

    const spatialSheets = wave0Results?.SPATIAL_LAYOUT?.sheets || [];
    const legendData = wave0Results?.LEGEND_DECODER || {};
    const planFiles = encodedFiles.plans || [];

    // Build lookup: chunk index → spatial sheet data (if available)
    const sheetByIndex = new Map();
    spatialSheets.forEach((sheet, idx) => {
      sheetByIndex.set(idx, sheet);
    });

    for (const file of planFiles) {
      // Extract chunk index from filename
      const chunkMatch = file.name?.match(/_chunk(\d+)\./);
      const chunkIdx = chunkMatch ? parseInt(chunkMatch[1], 10) : -1;

      // Try to get sheet ID from SPATIAL_LAYOUT data
      const spatialSheet = chunkIdx >= 0 ? sheetByIndex.get(chunkIdx) : null;
      const sheetId = spatialSheet?.sheet_id || file.name || '';
      const sheetName = spatialSheet?.sheet_name || '';

      // Phase 1: Classify by sheet ID prefix (standard AEC naming)
      const relevance = this._classifyBySheetId(sheetId, sheetName, disciplines);

      if (relevance.determined) {
        classification.set(file.name, { ...relevance, sheetId });
        continue;
      }

      // Phase 2: Classify by sheet name content keywords
      const contentRelevance = this._classifyByContent(sheetId, sheetName, disciplines);
      if (contentRelevance.determined) {
        classification.set(file.name, { ...contentRelevance, sheetId });
        continue;
      }

      // Phase 3: Unknown — include by default (conservative — don't skip potentially relevant sheets)
      classification.set(file.name, {
        relevant: true,
        disciplines: ['unknown'],
        sheetId,
        reason: 'unclassified — included by default',
        determined: true,
      });
    }

    return classification;
  },

  /**
   * Classify a sheet by its ID prefix using AEC naming conventions
   */
  _classifyBySheetId(sheetId, sheetName, selectedDisciplines) {
    const id = (sheetId || '').toUpperCase().replace(/[\s.-]/g, '');
    const name = (sheetName || '').toLowerCase();

    // Try matching progressively shorter prefixes (e.g., "FA1.01" → "FA", "E1.01" → "E")
    for (let len = Math.min(id.length, 3); len >= 1; len--) {
      const prefix = id.substring(0, len);
      const mappedDisciplines = this.SHEET_DISCIPLINE_MAP[prefix];

      if (mappedDisciplines !== undefined) {
        // 'all' means always include
        if (mappedDisciplines.includes('all')) {
          return { relevant: true, disciplines: ['all'], reason: `sheet prefix ${prefix} = always include`, determined: true };
        }
        // Empty array means skip (structural, mechanical, plumbing)
        if (mappedDisciplines.length === 0) {
          return { relevant: false, disciplines: [], reason: `sheet prefix ${prefix} = not ELV-relevant`, determined: true };
        }
        // Check if any mapped discipline is in the user's selection
        const overlap = mappedDisciplines.filter(d => selectedDisciplines.includes(d));
        if (overlap.length > 0) {
          return { relevant: true, disciplines: overlap, reason: `sheet prefix ${prefix} matches ${overlap.join(', ')}`, determined: true };
        }
        return { relevant: false, disciplines: mappedDisciplines, reason: `sheet prefix ${prefix} = ${mappedDisciplines.join(', ')} (not selected)`, determined: true };
      }
    }

    // Additional heuristic: check sheet name for discipline keywords
    if (name.includes('door') || name.includes('hardware')) {
      if (selectedDisciplines.includes('Access Control')) {
        return { relevant: true, disciplines: ['Access Control'], reason: 'sheet name contains door/hardware', determined: true };
      }
    }
    if (name.includes('fire') || name.includes('alarm')) {
      if (selectedDisciplines.includes('Fire Alarm')) {
        return { relevant: true, disciplines: ['Fire Alarm'], reason: 'sheet name contains fire/alarm', determined: true };
      }
    }

    return { relevant: true, disciplines: [], reason: 'prefix not recognized', determined: false };
  },

  /**
   * Classify by content keywords in sheet name/ID
   */
  _classifyByContent(sheetId, sheetName, selectedDisciplines) {
    const combined = `${sheetId} ${sheetName}`;

    for (const disc of selectedDisciplines) {
      const pattern = this.SHEET_CONTENT_KEYWORDS[disc];
      if (pattern && pattern.test(combined)) {
        return { relevant: true, disciplines: [disc], reason: `content keyword match for ${disc}`, determined: true };
      }
    }

    return { relevant: true, disciplines: [], reason: 'no content keyword match', determined: false };
  },

  /**
   * Filter encoded plan chunks — returns only chunks relevant to selected disciplines.
   * Also separates filtered-out chunks so they can still be referenced if needed.
   */
  _filterEncodedFilesByDiscipline(encodedFiles, classification) {
    if (!classification || classification.size === 0) return { filtered: encodedFiles, skipped: [], stats: null };

    const originalPlans = encodedFiles.plans || [];
    const filteredPlans = [];
    const skippedPlans = [];

    for (const file of originalPlans) {
      const info = classification.get(file.name);
      if (!info || info.relevant) {
        filteredPlans.push(file);
      } else {
        skippedPlans.push({ name: file.name, reason: info.reason, sheetId: info.sheetId });
      }
    }

    const stats = {
      totalPages: originalPlans.length,
      relevantPages: filteredPlans.length,
      skippedPages: skippedPlans.length,
      savingsPercent: originalPlans.length > 0 ? Math.round((skippedPlans.length / originalPlans.length) * 100) : 0,
    };

    // Create a new encodedFiles object with filtered plans (keep everything else)
    const filtered = { ...encodedFiles, plans: filteredPlans };
    return { filtered, skipped: skippedPlans, stats };
  },

  /**
   * Filter spec file chunks/text by CSI division relevance.
   * Checks extracted text for division headers and filters irrelevant sections.
   */
  _filterSpecsByDivision(encodedFiles, disciplines) {
    const specs = encodedFiles.specs || [];
    if (specs.length === 0 || !disciplines || disciplines.length === 0) return encodedFiles;

    // Determine which CSI divisions are relevant
    const relevantDivisions = new Set();
    for (const [div, divDiscs] of Object.entries(this.SPEC_DIVISION_MAP)) {
      if (divDiscs.includes('all') || divDiscs.some(d => disciplines.includes(d))) {
        relevantDivisions.add(div);
      }
    }

    const filteredSpecs = [];
    let specSkipped = 0;

    for (const spec of specs) {
      // Never filter out full project manuals — they contain ALL divisions including 27/28
      // Only filter individual spec section PDFs (typically named by division)
      if (!spec._isChunk && specs.length <= 2) {
        // Single/dual spec uploads are likely full project manuals — always include
        filteredSpecs.push(spec);
        continue;
      }

      // If spec has extracted text, check for division relevance
      if (spec.extractedText) {
        const text = spec.extractedText;
        // Check if this spec chunk contains any relevant division content
        const divPattern = /(?:SECTION|DIVISION)\s*(0?\d{5}|0?\d{1,2})\b/gi;
        const matches = [...text.matchAll(divPattern)];

        if (matches.length > 0) {
          // Has division markers — check if any are relevant
          const foundDivs = matches.map(m => {
            let num = m[1].replace(/^0+/, ''); // Strip leading zeros
            if (num.length >= 5) num = num.substring(0, 2); // 5-digit CSI → first 2
            // Pad to 2 digits for consistent comparison with SPEC_DIVISION_MAP keys
            return num.padStart(2, '0');
          });
          const hasRelevant = foundDivs.some(d => relevantDivisions.has(d));

          if (!hasRelevant) {
            specSkipped++;
            console.log(`[SheetFilter] Skipping spec chunk: ${spec.name} — divisions ${[...new Set(foundDivs)].join(', ')} not relevant`);
            continue;
          }
        }
        // No division markers or has relevant ones — include
      }
      filteredSpecs.push(spec);
    }

    if (specSkipped > 0) {
      console.log(`[SheetFilter] Filtered specs: kept ${filteredSpecs.length}/${specs.length} chunks (skipped ${specSkipped} irrelevant division sections)`);
    }

    return { ...encodedFiles, specs: filteredSpecs };
  },

  // ═══════════════════════════════════════════════════════════
  // FILE ENCODING — Encode once, distribute to brains
  // Files > 15MB uploaded via Gemini File API (supports up to 2GB)
  // Files ≤ 15MB sent as inline base64 (faster, no upload needed)
  // ═══════════════════════════════════════════════════════════

  async _encodeAllFiles(state, progressCallback) {
    const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB per file (Gemini File API)
    const INLINE_THRESHOLD = 4 * 1024 * 1024; // 4 MB — above this, use File API upload (was 15MB but multiple 8-9MB PDFs inline caused 500 errors)

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
    // FIX #11: Pin ALL uploads to the same API key to prevent cross-project PERMISSION_DENIED 403s.
    // Gemini File API files are project-scoped — a file uploaded with Key A (Project 1) returns 403
    // when accessed by Key B (Project 2). The first successful upload determines the key for all others.
    let pinnedUploadKey = null;
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

          const isSupported = supportedTypes.includes(finalMime);

          if (isSupported) {
            const fileData = {
              name: entry.name,
              category,
              mimeType: finalMime,
              size: entry.rawFile.size,
            };

            // Large files → split into chunks then upload each via File API
            if (entry.rawFile.size > INLINE_THRESHOLD) {
              const CHUNK_THRESHOLD = 20 * 1024 * 1024; // Split PDFs over 20MB into chunks — Gemini 3.1 Pro needs per-page scanning for accuracy
              const PAGES_PER_CHUNK = 5; // 5 pages per chunk — smaller canvas, better AI accuracy, safer for browser limits
              const fileSizeMB = Math.round(entry.rawFile.size / 1024 / 1024);

              // Try chunking large PDFs using PDF.js
              if (finalMime === 'application/pdf' && entry.rawFile.size > CHUNK_THRESHOLD && typeof pdfjsLib !== 'undefined') {
                progressCallback(pct, `Splitting large PDF: ${entry.name} (${fileSizeMB} MB)…`, null);
                console.log(`[SmartBrains] Splitting ${entry.name} (${fileSizeMB} MB) into ${PAGES_PER_CHUNK}-page chunks…`);

                try {
                  const chunks = await this._splitPDFIntoChunks(entry.rawFile, PAGES_PER_CHUNK, state.disciplines);
                  console.log(`[SmartBrains] Split ${entry.name} into ${chunks.length} chunks`);

                  let chunkIdx = 0;
                  for (const chunk of chunks) {
                    chunkIdx++;
                    // Chunk filename now includes sheet ID (e.g., "page5_T-101.jpg") set by _splitPDFIntoChunks
                    const chunkName = `${entry.name.replace('.pdf', '')}_${chunk.name}`;
                    const chunkMime = chunk.type || 'image/jpeg';
                    progressCallback(pct, `Uploading page ${chunkIdx}/${chunks.length}: ${chunk._sheetId || chunk.name}…`, null);

                    const chunkData = {
                      name: chunkName,
                      category,
                      mimeType: chunkMime,
                      size: chunk.size,
                      _isChunk: true,
                      _chunkIndex: chunkIdx,
                      _totalChunks: chunks.length,
                      _originalName: entry.name,
                      _pageNum: chunk._pageNum,
                      _sheetId: chunk._sheetId,
                    };

                    try {
                      const uploadResult = await this._uploadToFileAPI(chunk, chunkMime, chunkName, pinnedUploadKey);
                      if (uploadResult && uploadResult.fileUri) {
                        let cleanUri = uploadResult.fileUri;
                        const proxyMatch = cleanUri.match(/___(\s*https?:\/\/[^_]+)___/);
                        if (proxyMatch) { cleanUri = proxyMatch[1].trim(); }
                        chunkData.fileUri = cleanUri;
                        chunkData.uploadedName = uploadResult.name;
                        chunkData._usedKeyName = uploadResult._usedKeyName;
                        // Pin all subsequent uploads to same key (same GCP project)
                        if (!pinnedUploadKey && uploadResult._usedKeyName) {
                          pinnedUploadKey = uploadResult._usedKeyName;
                          console.log(`[SmartBrains] 📌 Pinned all uploads to key: ${pinnedUploadKey}`);
                        }
                        console.log(`[SmartBrains] ✓ Uploaded chunk ${chunkIdx}/${chunks.length}: ${chunkName} → ${cleanUri}`);
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
                  console.log(`[SmartBrains] ✓ All ${chunks.length} chunks uploaded. Skipping full-file inline (${fileSizeMB} MB too large).`);
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
              console.log(`[SmartBrains] Uploading ${entry.name} (${fileSizeMB} MB) via File API…`);

              try {
                const uploadResult = await this._uploadToFileAPI(entry.rawFile, finalMime, entry.name, pinnedUploadKey);
                if (uploadResult && uploadResult.fileUri) {
                  let cleanUri = uploadResult.fileUri;
                  const proxyMatch = cleanUri.match(/___(\s*https?:\/\/[^_]+)___/);
                  if (proxyMatch) {
                    cleanUri = proxyMatch[1].trim();
                    console.warn(`[SmartBrains] Fixed proxy-mangled File URI → ${cleanUri}`);
                  }
                  fileData.fileUri = cleanUri;
                  fileData.uploadedName = uploadResult.name;
                  fileData._usedKeyName = uploadResult._usedKeyName;
                  // Pin all subsequent uploads to same key (same GCP project)
                  if (!pinnedUploadKey && uploadResult._usedKeyName) {
                    pinnedUploadKey = uploadResult._usedKeyName;
                    console.log(`[SmartBrains] 📌 Pinned all uploads to key: ${pinnedUploadKey}`);
                  }
                  console.log(`[SmartBrains] ✓ Uploaded ${entry.name} → ${cleanUri} (key: ${uploadResult._usedKeyName})`);
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
                  fileData.extractedText = text.substring(0, 100000); // 100KB — specs need full text for scope, products, and requirements
                }
              } catch (e) { console.warn(`[SmartBrains] PDF text extraction failed for ${entry.name}:`, e.message); }
            }

            // OCR Scale extraction for plan PDFs — deterministic scale from text layer
            if (finalMime === 'application/pdf' && category === 'plans' && typeof pdfjsLib !== 'undefined') {
              try {
                progressCallback(null, `Extracting scale data from ${entry.name}…`, null);
                const scaleData = await this._extractScaleFromPDF(entry.rawFile);
                if (scaleData.pagesWithScale > 0) {
                  fileData._ocrScaleData = scaleData;
                  console.log(`[SmartBrains] OCR Scale: Found scale on ${scaleData.pagesWithScale}/${scaleData.totalPages} pages of ${entry.name}`);
                }
                // Store page texts for text-layer device counting (ground truth)
                if (scaleData._pageTexts && Object.keys(scaleData._pageTexts).length > 0) {
                  try {
                    if (!state._ocrPageTexts) state._ocrPageTexts = {};
                    Object.assign(state._ocrPageTexts, scaleData._pageTexts);
                    console.log(`[SmartBrains] Stored ${Object.keys(scaleData._pageTexts).length} page texts for text-layer device counting (total: ${Object.keys(state._ocrPageTexts).length} pages)`);
                  } catch (e) {
                    console.error('[SmartBrains] ⚠️ FAILED to store page texts — state may not be accessible:', e.message);
                    // Fallback: store on the engine instance so app.js can retrieve it later
                    if (!this._fallbackPageTexts) this._fallbackPageTexts = {};
                    Object.assign(this._fallbackPageTexts, scaleData._pageTexts);
                  }
                } else {
                  console.warn(`[SmartBrains] ⚠️ No page texts extracted from ${entry.name} — text layer counting will not work for this file`);
                }

                // Fallback: if OCR text extraction found no scale for some pages,
                // use canvas-based scale bar detection results if available
                if (this._canvasScaleData && this._canvasScaleData.length > 0 && scaleData.pages) {
                  let canvasFallbackCount = 0;
                  for (const page of scaleData.pages) {
                    // Only fall back for pages where OCR found nothing useful
                    if (page.ftPerInch > 0 || page.method === 'nts') continue;

                    const canvasResult = this._canvasScaleData.find(
                      r => r.pageNum === page.pageNum && r.found && r.confidence > 0.3
                    );
                    if (canvasResult) {
                      // Convert pixelsPerFoot to ftPerInch: at 3x scale (216 ppi),
                      // ftPerInch = 216 / pixelsPerFoot
                      page.ftPerInch = Math.round((216 / canvasResult.pixelsPerFoot) * 1000) / 1000;
                      page.method = 'scale_bar_canvas';
                      page.confidence = canvasResult.confidence;
                      page.scaleText = `Scale bar: ~${canvasResult.labeledDistance} ft (${canvasResult.tickCount} ticks)`;
                      page._canvasDetail = canvasResult;
                      canvasFallbackCount++;
                    }
                  }

                  if (canvasFallbackCount > 0) {
                    // Recount pages with scale after canvas fallback
                    const updatedFound = scaleData.pages.filter(p => p.ftPerInch > 0);
                    scaleData.pagesWithScale = updatedFound.length;
                    if (!fileData._ocrScaleData) fileData._ocrScaleData = scaleData;
                    console.log(`[SmartBrains] Canvas Scale Fallback: recovered scale on ${canvasFallbackCount} additional pages of ${entry.name} (total: ${scaleData.pagesWithScale}/${scaleData.totalPages})`);
                  }
                }
              } catch (e) { console.warn(`[SmartBrains] OCR Scale extraction failed for ${entry.name}:`, e.message); }
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
  async _uploadToFileAPI(rawFile, mimeType, fileName, preferredKey) {
    // FIX #14: Add retry logic to uploads (3 attempts with exponential backoff)
    const MAX_UPLOAD_RETRIES = 3;
    let result = null;
    let lastUploadError = null;

    for (let uploadAttempt = 0; uploadAttempt < MAX_UPLOAD_RETRIES; uploadAttempt++) {
      try {
        const formData = new FormData();
        formData.append('file', rawFile, fileName);
        // FIX #11: Pin all uploads to the same API key to avoid cross-project 403s
        if (preferredKey) formData.append('preferredKey', preferredKey);

        result = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', '/api/ai/upload');
          // Add auth headers for session-based auth
          const authH = SmartBrains._authHeaders();
          Object.entries(authH).forEach(([k, v]) => xhr.setRequestHeader(k, v));

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
        break; // Success — exit retry loop
      } catch (uploadErr) {
        lastUploadError = uploadErr;
        if (uploadAttempt < MAX_UPLOAD_RETRIES - 1) {
          const delay = 2000 * Math.pow(2, uploadAttempt);
          console.warn(`[SmartBrains] Upload attempt ${uploadAttempt + 1} failed: ${uploadErr.message}. Retrying in ${delay}ms…`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    if (!result) {
      throw lastUploadError || new Error('Upload failed after all retries');
    }

    // ── Poll for file readiness (large files enter PROCESSING state) ──
    // Gemini returns 400 INVALID_ARGUMENT if you use a file that's still PROCESSING
    // IMPORTANT: Check for ANY state that isn't 'ACTIVE' — including undefined/null
    if (result.state !== 'ACTIVE' && result.name) {
      console.log(`[SmartBrains] File ${fileName} state is "${result.state || 'unknown'}" — polling until ACTIVE…`);
      const maxWaitMs = 120000; // 2 minutes max
      const pollIntervalMs = 3000; // Check every 3 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitMs) {
        await new Promise(r => setTimeout(r, pollIntervalMs));
        try {
          const checkResponse = await fetch(`/api/ai/file-status?name=${encodeURIComponent(result.name)}&key=${encodeURIComponent(result._usedKeyName || '')}`, { headers: SmartBrains._authHeaders() });
          if (checkResponse.ok) {
            const status = await checkResponse.json();
            if (status.state === 'ACTIVE') {
              console.log(`[SmartBrains] ✓ File ${fileName} is now ACTIVE (waited ${Math.round((Date.now() - startTime) / 1000)}s)`);
              result.state = 'ACTIVE';
              break;
            }
            console.log(`[SmartBrains] File ${fileName} still ${status.state || 'unknown'}… (${Math.round((Date.now() - startTime) / 1000)}s)`);
          }
        } catch (e) {
          console.warn(`[SmartBrains] File status check failed:`, e.message);
        }
      }

      if (result.state !== 'ACTIVE') {
        console.warn(`[SmartBrains] File ${fileName} did not become ACTIVE within ${maxWaitMs / 1000}s — proceeding anyway`);
      }
    } else if (result.state === 'ACTIVE') {
      console.log(`[SmartBrains] File ${fileName} is immediately ACTIVE — no wait needed`);
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

  // ═══════════════════════════════════════════════════════════
  // OCR SCALE EXTRACTION — Extract scale text from PDF text layer
  // Uses pdf.js getTextContent() for reliable deterministic extraction
  // Falls back to canvas-based text region analysis
  // ═══════════════════════════════════════════════════════════

  /**
   * Extract scale information from every page of a PDF using the embedded text layer.
   * This is deterministic — no AI guessing. Returns per-page scale data.
   * @param {File} rawFile - The PDF file
   * @returns {Object} { pages: [{ pageNum, scaleText, ftPerInch, method, confidence }] }
   */
  async _extractScaleFromPDF(rawFile) {
    if (typeof pdfjsLib === 'undefined') return { pages: [] };

    try {
      const arrayBuffer = await rawFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      const pages = [];

      // Common scale patterns in construction drawings
      const scalePatterns = [
        // "1/8" = 1'-0"" or "1/8"=1'-0""
        { regex: /(\d+\/\d+)\s*["″]\s*=\s*(\d+)\s*['′]\s*-?\s*(\d+)?\s*["″]?/i, parse: (m) => {
          const [num, den] = m[1].split('/').map(Number);
          const feet = parseInt(m[2]) + (parseInt(m[3] || 0) / 12);
          return { ftPerInch: feet / (num / den), text: m[0] };
        }},
        // "1/4" = 1'-0"" variant with quotes
        { regex: /(\d+\/\d+)\s*(?:"|''|″|inch)\s*=\s*(\d+)\s*(?:'|'|′|ft|foot|feet)/i, parse: (m) => {
          const [num, den] = m[1].split('/').map(Number);
          const feet = parseInt(m[2]);
          return { ftPerInch: feet / (num / den), text: m[0] };
        }},
        // "SCALE: 1:96" or "1:48" (architectural ratio)
        { regex: /(?:SCALE\s*[:=]\s*)?1\s*:\s*(\d+)/i, parse: (m) => {
          const ratio = parseInt(m[1]);
          // Architectural: 1:96 means 1 inch = 96 inches = 8 ft
          return { ftPerInch: ratio / 12, text: m[0] };
        }},
        // "SCALE: 1/8" = 1'" shorthand
        { regex: /SCALE\s*[:=]?\s*(\d+\/\d+)\s*["″]?\s*=\s*(\d+)\s*['′]/i, parse: (m) => {
          const [num, den] = m[1].split('/').map(Number);
          const feet = parseInt(m[2]);
          return { ftPerInch: feet / (num / den), text: m[0] };
        }},
        // "3/32" = 1'-0""
        { regex: /(\d+\/\d+)\s*["″]?\s*=\s*1\s*['′]\s*-?\s*0\s*["″]?/i, parse: (m) => {
          const [num, den] = m[1].split('/').map(Number);
          return { ftPerInch: 1 / (num / den), text: m[0] };
        }},
        // "1" = 10'" or "1"=20'" (engineer's scale)
        { regex: /1\s*["″]\s*=\s*(\d+)\s*['′]/i, parse: (m) => {
          return { ftPerInch: parseInt(m[1]), text: m[0] };
        }},
        // "SCALE: 1/4 INCH = 1 FOOT"
        { regex: /(\d+\/\d+)\s*(?:INCH|IN)\s*=\s*(\d+)\s*(?:FOOT|FT|FEET)/i, parse: (m) => {
          const [num, den] = m[1].split('/').map(Number);
          const feet = parseInt(m[2]);
          return { ftPerInch: feet / (num / den), text: m[0] };
        }},
        // "HALF INCH SCALE" / "QUARTER INCH SCALE"
        { regex: /(?:HALF|1\/2)\s*(?:INCH)?\s*SCALE/i, parse: (m) => {
          return { ftPerInch: 2, text: m[0] };
        }},
        { regex: /(?:QUARTER|1\/4)\s*(?:INCH)?\s*SCALE/i, parse: (m) => {
          return { ftPerInch: 4, text: m[0] };
        }},
        { regex: /(?:EIGHTH|1\/8)\s*(?:INCH)?\s*SCALE/i, parse: (m) => {
          return { ftPerInch: 8, text: m[0] };
        }},
      ];

      // NTS (Not To Scale) patterns
      const ntsPatterns = [
        /\bN\.?T\.?S\.?\b/i,
        /NOT\s+TO\s+SCALE/i,
        /NO\s+SCALE/i,
      ];

      // Multi-scale / non-standard scale notation patterns
      const multiScalePatterns = [
        /\bAS\s+NOTED\b/i,
        /\bVARIES\b/i,
        /\bSEE\s+PLAN\b/i,
      ];

      // Per-detail scale patterns (ENLARGED PLAN, DETAIL, SECTION with inline scale)
      const detailScalePatterns = [
        // "ENLARGED PLAN SCALE: 1/4" = 1'-0""
        { regex: /(?:ENLARGED\s+(?:PLAN|FLOOR\s+PLAN|AREA))\s*(?:SCALE)?\s*[:=]?\s*(\d+\/\d+)\s*["″]?\s*=\s*(\d+)\s*['′]\s*-?\s*(\d+)?\s*["″]?/gi, parse: (m) => {
          const [num, den] = m[1].split('/').map(Number);
          const feet = parseInt(m[2]) + (parseInt(m[3] || 0) / 12);
          return { ftPerInch: feet / (num / den), text: m[0], context: 'enlarged_plan' };
        }},
        // "DETAIL A (SCALE: 1/2" = 1'-0"")" or "DETAIL 3 SCALE: 1/4" = 1'-0""
        { regex: /(?:DETAIL)\s*[A-Z0-9]{1,3}\s*\(?\s*(?:SCALE)?\s*[:=]?\s*(\d+\/\d+)\s*["″]?\s*=\s*(\d+)\s*['′]\s*-?\s*(\d+)?\s*["″]?\s*\)?/gi, parse: (m) => {
          const [num, den] = m[1].split('/').map(Number);
          const feet = parseInt(m[2]) + (parseInt(m[3] || 0) / 12);
          return { ftPerInch: feet / (num / den), text: m[0], context: 'detail' };
        }},
        // "SECTION A-A (SCALE: 1/4" = 1'-0"")" or "SECTION 1 SCALE: 1/2" = 1'-0""
        { regex: /(?:SECTION)\s*[A-Z0-9]{1,3}(?:\s*-\s*[A-Z0-9]{1,3})?\s*\(?\s*(?:SCALE)?\s*[:=]?\s*(\d+\/\d+)\s*["″]?\s*=\s*(\d+)\s*['′]\s*-?\s*(\d+)?\s*["″]?\s*\)?/gi, parse: (m) => {
          const [num, den] = m[1].split('/').map(Number);
          const feet = parseInt(m[2]) + (parseInt(m[3] || 0) / 12);
          return { ftPerInch: feet / (num / den), text: m[0], context: 'section' };
        }},
        // Generic inline "SCALE: 1/4" = 1'-0"" near ENLARGED/DETAIL/SECTION keywords
        { regex: /(?:ENLARGED|DETAIL|SECTION)\b[^]*?SCALE\s*[:=]\s*(\d+\/\d+)\s*["″]?\s*=\s*(\d+)\s*['′]\s*-?\s*(\d+)?\s*["″]?/gi, parse: (m) => {
          const [num, den] = m[1].split('/').map(Number);
          const feet = parseInt(m[2]) + (parseInt(m[3] || 0) / 12);
          return { ftPerInch: feet / (num / den), text: m[0], context: 'keyword_nearby' };
        }},
      ];

      // Sheet ID patterns (to identify which sheet we're on)
      const sheetIdPatterns = [
        /\b([A-Z]\d+[.\-]\d+[a-zA-Z]?)\b/,           // E1.01, T2.01, A-101
        /\b(SHEET\s*#?\s*\d+)\b/i,                      // Sheet 1, Sheet #3
        /\b([A-Z]{1,3}\d{3,4})\b/,                      // E101, T201
      ];

      // ── Sheet physical size detection ──
      // Patterns to detect printed sheet size from text like "IF THIS SHEET IS NOT 30" X 42""
      const sheetSizePatterns = [
        // "IF THIS SHEET IS NOT 30" X 42"" or "...30" × 42"..."
        /(?:SHEET\s+IS\s+NOT|SHEET\s+SIZE|PRINTED?\s+(?:ON|SIZE))\s*[:=]?\s*(\d+)\s*["″]?\s*[X×x]\s*(\d+)\s*["″]?/i,
        // "30" X 42" SHEET" or "30×42 SHEET"
        /(\d+)\s*["″]?\s*[X×x]\s*(\d+)\s*["″]?\s*(?:SHEET|PAPER|PRINT)/i,
        // "FULL SIZE: 30" X 42""
        /FULL\s+SIZE\s*[:=]?\s*(\d+)\s*["″]?\s*[X×x]\s*(\d+)\s*["″]?/i,
        // Standalone "30 X 42" or "24 X 36" near bottom of page (title block area)
        /\b(\d{2})\s*["″]?\s*[X×x]\s*(\d{2})\s*["″]?\b/i,
      ];

      // Standard architectural sheet sizes (width × height in inches, landscape orientation)
      // PDF units = 72 per inch, so we match with ±36 units (±0.5 inch) tolerance
      const STANDARD_SHEETS = [
        { name: 'ARCH D',  w: 36, h: 24, pdfW: 2592, pdfH: 1728 },
        { name: 'ANSI D',  w: 34, h: 22, pdfW: 2448, pdfH: 1584 },
        { name: '30×42',   w: 42, h: 30, pdfW: 3024, pdfH: 2160 },
        { name: 'ARCH E',  w: 48, h: 36, pdfW: 3456, pdfH: 2592 },
        { name: 'ANSI E',  w: 44, h: 34, pdfW: 3168, pdfH: 2448 },
        { name: 'ARCH E1', w: 42, h: 30, pdfW: 3024, pdfH: 2160 },
        { name: '36×48',   w: 48, h: 36, pdfW: 3456, pdfH: 2592 },
        { name: 'ARCH C',  w: 24, h: 18, pdfW: 1728, pdfH: 1296 },
        { name: 'ANSI C',  w: 22, h: 17, pdfW: 1584, pdfH: 1224 },
      ];

      const pageTexts = {}; // Store full text for each page → used by getTextLayerDeviceCounts()
      for (let p = 1; p <= totalPages; p++) {
        try {
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();
          const viewport = page.getViewport({ scale: 1.0 });

          // Get ALL text items with their positions
          const textItems = content.items.map(item => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width,
            height: item.height || Math.abs(item.transform[3]),
          }));

          // Combine all text for pattern matching
          const fullText = textItems.map(t => t.str).join(' ');
          pageTexts[p] = fullText; // Store for device counting

          // Also look specifically at the title block area (bottom 20% of page, right 40%)
          const pageH = viewport.height;
          const pageW = viewport.width;
          const titleBlockItems = textItems.filter(t =>
            t.y < pageH * 0.25 && t.x > pageW * 0.55
          );
          const titleBlockText = titleBlockItems.map(t => t.str).join(' ');

          // Also check bottom strip (many title blocks are at very bottom)
          const bottomStripItems = textItems.filter(t => t.y < pageH * 0.15);
          const bottomStripText = bottomStripItems.map(t => t.str).join(' ');

          // Combine title block candidates (most likely to contain scale)
          const candidateTexts = [titleBlockText, bottomStripText, fullText];

          let found = false;
          let pageResult = { pageNum: p, scaleText: null, ftPerInch: null, method: 'unable', confidence: 0, sheetId: null, sheetWidthIn: null, sheetHeightIn: null };

          // ── Detect physical sheet size ──
          // Method 1: From PDF page dimensions (most reliable)
          const pdfWide = Math.max(pageW, pageH);
          const pdfNarrow = Math.min(pageW, pageH);
          let sheetDetected = false;
          for (const ss of STANDARD_SHEETS) {
            const refWide = Math.max(ss.pdfW, ss.pdfH);
            const refNarrow = Math.min(ss.pdfW, ss.pdfH);
            if (Math.abs(pdfWide - refWide) < 72 && Math.abs(pdfNarrow - refNarrow) < 72) {
              pageResult.sheetWidthIn = ss.w; // landscape width (long edge)
              pageResult.sheetHeightIn = ss.h; // landscape height (short edge)
              pageResult._sheetName = ss.name;
              sheetDetected = true;
              break;
            }
          }

          // Method 2: From text layer (e.g. "IF THIS SHEET IS NOT 30" X 42"")
          if (!sheetDetected) {
            for (const text of [bottomStripText, titleBlockText, fullText]) {
              for (const ssPat of sheetSizePatterns) {
                const ssMatch = text.match(ssPat);
                if (ssMatch) {
                  let w = parseInt(ssMatch[1]);
                  let h = parseInt(ssMatch[2]);
                  // Sanity: valid sheet sizes are between 17" and 60"
                  if (w >= 17 && w <= 60 && h >= 17 && h <= 60) {
                    // Ensure width is the long edge (landscape)
                    pageResult.sheetWidthIn = Math.max(w, h);
                    pageResult.sheetHeightIn = Math.min(w, h);
                    pageResult._sheetName = `${pageResult.sheetWidthIn}×${pageResult.sheetHeightIn} (from text)`;
                    sheetDetected = true;
                    break;
                  }
                }
              }
              if (sheetDetected) break;
            }
          }

          // Method 3: Derive from raw PDF units (no standard match — compute directly)
          if (!sheetDetected && pdfWide > 500) {
            const wIn = Math.round(pdfWide / 72);
            const hIn = Math.round(pdfNarrow / 72);
            if (wIn >= 17 && hIn >= 11) {
              pageResult.sheetWidthIn = wIn;
              pageResult.sheetHeightIn = hIn;
              pageResult._sheetName = `${wIn}×${hIn} (computed)`;
              sheetDetected = true;
            }
          }

          if (sheetDetected) {
            console.log(`[OCR Scale] Page ${p}: Sheet size detected as ${pageResult._sheetName} (${pageResult.sheetWidthIn}"×${pageResult.sheetHeightIn}")`);
          }

          // Try to extract sheet ID
          for (const text of candidateTexts) {
            for (const pat of sheetIdPatterns) {
              const match = text.match(pat);
              if (match) {
                pageResult.sheetId = match[1];
                break;
              }
            }
            if (pageResult.sheetId) break;
          }
          if (!pageResult.sheetId) pageResult.sheetId = `page_${p}`;

          // Check for NTS first
          for (const text of candidateTexts) {
            for (const ntsPat of ntsPatterns) {
              if (ntsPat.test(text)) {
                pageResult.method = 'nts';
                pageResult.confidence = 0.95;
                pageResult.scaleText = 'NOT TO SCALE';
                found = true;
                break;
              }
            }
            if (found) break;
          }

          // Check for multi-scale notation ("AS NOTED", "VARIES", "SEE PLAN")
          // These indicate the sheet has multiple scales — flag it and scan for per-detail scales
          if (!found) {
            for (const text of candidateTexts) {
              for (const msPat of multiScalePatterns) {
                if (msPat.test(text)) {
                  pageResult.multi_scale = true;
                  pageResult.method = 'multi_scale';
                  pageResult.confidence = 0.90;
                  pageResult.scaleText = text.match(msPat)[0].trim().toUpperCase();
                  // Don't set found=true — continue to scan for actual scale values below
                  break;
                }
              }
              if (pageResult.multi_scale) break;
            }
          }

          // Scan full page text for per-detail scale notations (ENLARGED PLAN, DETAIL, SECTION)
          const detailScales = [];
          for (const dsp of detailScalePatterns) {
            // Reset regex lastIndex for global patterns
            dsp.regex.lastIndex = 0;
            let dMatch;
            while ((dMatch = dsp.regex.exec(fullText)) !== null) {
              try {
                const result = dsp.parse(dMatch);
                if (result.ftPerInch > 0 && result.ftPerInch < 200) {
                  detailScales.push({
                    ftPerInch: Math.round(result.ftPerInch * 1000) / 1000,
                    scaleText: result.text.trim(),
                    context: result.context,
                  });
                }
              } catch (e) { /* parse failed, skip */ }
            }
          }

          // If multiple detail scales found, determine the most common as primary
          if (detailScales.length > 0) {
            pageResult.detail_scales = detailScales;

            // Count frequency of each ftPerInch value
            const freq = {};
            detailScales.forEach(ds => {
              freq[ds.ftPerInch] = (freq[ds.ftPerInch] || 0) + 1;
            });
            const mostCommon = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
            const primaryFtPerInch = parseFloat(mostCommon[0]);

            // If we haven't found a title-block scale yet, use the most common detail scale
            if (!found || pageResult.multi_scale) {
              pageResult.ftPerInch = primaryFtPerInch;
              pageResult.scaleText = pageResult.scaleText
                ? `${pageResult.scaleText} (primary: ${primaryFtPerInch} ft/in from ${mostCommon[1]} detail(s))`
                : `${primaryFtPerInch} ft/in (most common of ${detailScales.length} detail scale(s))`;
              pageResult.method = pageResult.multi_scale ? 'multi_scale_resolved' : 'detail_scale_ocr';
              pageResult.confidence = detailScales.length >= 2 ? 0.88 : 0.75;
              if (!pageResult.multi_scale) found = true;
            }

            if (pageResult.multi_scale) {
              // Mark found so we don't overwrite with title-block patterns
              found = true;
            }
          }

          // Try scale patterns (title block first, then full page)
          if (!found) {
            for (let ci = 0; ci < candidateTexts.length && !found; ci++) {
              const text = candidateTexts[ci];
              for (const sp of scalePatterns) {
                const match = text.match(sp.regex);
                if (match) {
                  try {
                    const result = sp.parse(match);
                    if (result.ftPerInch > 0 && result.ftPerInch < 200) { // Sanity check
                      pageResult.ftPerInch = Math.round(result.ftPerInch * 1000) / 1000;
                      pageResult.scaleText = result.text.trim();
                      pageResult.method = ci < 2 ? 'title_block_ocr' : 'page_text_ocr';
                      pageResult.confidence = ci === 0 ? 0.98 : (ci === 1 ? 0.95 : 0.85);
                      found = true;
                      break;
                    }
                  } catch (e) { /* pattern parse failed, try next */ }
                }
              }
            }
          }

          // Try to find dimension text for fallback scale inference
          if (!found) {
            // Look for dimension strings like "30'-0"" near dimension lines
            const dimPattern = /(\d{1,3})\s*['′]\s*-?\s*(\d{1,2})\s*["″]?/g;
            let dimMatch;
            const dimensions = [];
            while ((dimMatch = dimPattern.exec(fullText)) !== null) {
              const ft = parseInt(dimMatch[1]) + parseInt(dimMatch[2] || 0) / 12;
              if (ft >= 5 && ft <= 500) dimensions.push(ft);
            }
            if (dimensions.length >= 2) {
              // Can't compute exact scale without pixel measurement, but flag that dimensions exist
              pageResult.method = 'dimensions_found';
              pageResult.confidence = 0.3;
              pageResult.scaleText = `${dimensions.length} dimension annotations found (${dimensions.slice(0, 3).map(d => d + "'").join(', ')})`;
              pageResult._dimensions = dimensions;
            }
          }

          pages.push(pageResult);

          if (found && pageResult.ftPerInch) {
            console.log(`[OCR Scale] Page ${p} (${pageResult.sheetId}): ${pageResult.scaleText} → ${pageResult.ftPerInch} ft/inch [${pageResult.method}, conf=${pageResult.confidence}]`);
          }
        } catch (e) {
          console.warn(`[OCR Scale] Failed to extract text from page ${p}:`, e.message);
          pages.push({ pageNum: p, scaleText: null, ftPerInch: null, method: 'error', confidence: 0, sheetId: `page_${p}` });
        }
      }

      pdf.destroy();

      const found = pages.filter(p => p.ftPerInch > 0);
      console.log(`[OCR Scale] Extracted scale from ${found.length}/${totalPages} pages deterministically`);

      return { pages, totalPages, pagesWithScale: found.length, _pageTexts: pageTexts };
    } catch (err) {
      console.warn(`[OCR Scale] PDF scale extraction failed:`, err.message);
      return { pages: [], totalPages: 0, pagesWithScale: 0 };
    }
  },

  /**
   * Canvas-based scale bar detection fallback for rasterized/scanned PDFs.
   * Analyzes the title block region of a rendered canvas for ruler-like horizontal
   * features: a dark horizontal line with evenly-spaced tick marks and number labels.
   *
   * @param {HTMLCanvasElement} canvas - Page canvas rendered at 3x scale
   * @param {number} pageNum - 1-based page number
   * @returns {Object} { found, pixelsPerFoot, confidence, method, pageNum, tickCount, labeledDistance }
   */
  _detectScaleBarFromCanvas(canvas, pageNum) {
    const DARK_THRESHOLD = 80;       // Pixel brightness below this = "dark"
    const MIN_LINE_LENGTH = 50;      // Min px for a candidate horizontal line segment
    const MIN_TICKS = 3;             // Need at least 3 tick marks for a valid scale bar
    const TICK_HEIGHT_MIN = 6;       // Min vertical extent of a tick mark (px)
    const TICK_HEIGHT_MAX = 40;      // Max vertical extent of a tick mark (px)
    const SPACING_TOLERANCE = 0.20;  // 20% tolerance on even tick spacing
    const DPI_AT_3X = 216;           // 72 dpi x 3x scale

    const result = { found: false, pixelsPerFoot: 0, confidence: 0, method: 'scale_bar_canvas', pageNum };

    try {
      const w = canvas.width;
      const h = canvas.height;
      if (w < 100 || h < 100) return result;

      const ctx = canvas.getContext('2d');

      // Focus on title block region: bottom-right 25% of the canvas
      const regionX = Math.floor(w * 0.75);
      const regionY = Math.floor(h * 0.75);
      const regionW = w - regionX;
      const regionH = h - regionY;

      if (regionW < 50 || regionH < 50) return result;

      const imageData = ctx.getImageData(regionX, regionY, regionW, regionH);
      const pixels = imageData.data; // RGBA flat array

      // Helper: get brightness at (x, y) relative to the region
      const brightness = (x, y) => {
        const i = (y * regionW + x) * 4;
        return (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      };

      const isDark = (x, y) => {
        if (x < 0 || x >= regionW || y < 0 || y >= regionH) return false;
        return brightness(x, y) < DARK_THRESHOLD;
      };

      // -- Step 1: Find candidate horizontal dark lines --
      // Scan rows looking for long horizontal runs of dark pixels
      const candidateLines = [];
      const rowStep = 2; // Check every 2nd row for speed

      for (let row = 0; row < regionH; row += rowStep) {
        let runStart = -1;
        let runLen = 0;

        for (let col = 0; col < regionW; col++) {
          if (isDark(col, row)) {
            if (runStart === -1) runStart = col;
            runLen++;
          } else {
            if (runLen >= MIN_LINE_LENGTH) {
              candidateLines.push({ row, startCol: runStart, endCol: runStart + runLen - 1, length: runLen });
            }
            runStart = -1;
            runLen = 0;
          }
        }
        // End-of-row flush
        if (runLen >= MIN_LINE_LENGTH) {
          candidateLines.push({ row, startCol: runStart, endCol: runStart + runLen - 1, length: runLen });
        }
      }

      if (candidateLines.length === 0) return result;

      // Merge lines on adjacent rows into consolidated line segments
      candidateLines.sort((a, b) => a.row - b.row || a.startCol - b.startCol);

      // Group nearby horizontal line segments (within 4px vertically, overlapping horizontally)
      const mergedLines = [];
      const used = new Set();

      for (let i = 0; i < candidateLines.length; i++) {
        if (used.has(i)) continue;
        const group = [candidateLines[i]];
        used.add(i);

        for (let j = i + 1; j < candidateLines.length; j++) {
          if (used.has(j)) continue;
          const last = group[group.length - 1];
          const cand = candidateLines[j];
          if (cand.row - last.row > 4) break; // Too far apart vertically
          // Check horizontal overlap
          if (cand.startCol <= last.endCol + 10 && cand.endCol >= last.startCol - 10) {
            group.push(cand);
            used.add(j);
          }
        }

        const minCol = Math.min(...group.map(g => g.startCol));
        const maxCol = Math.max(...group.map(g => g.endCol));
        const avgRow = Math.round(group.reduce((s, g) => s + g.row, 0) / group.length);
        mergedLines.push({ row: avgRow, startCol: minCol, endCol: maxCol, length: maxCol - minCol + 1 });
      }

      // -- Step 2: For each candidate line, look for vertical tick marks --
      const scaleBarCandidates = [];

      for (const line of mergedLines) {
        if (line.length < MIN_LINE_LENGTH) continue;

        // Scan along the line looking for vertical tick marks above and/or below
        const tickPositions = [];

        for (let col = line.startCol; col <= line.endCol; col += 1) {
          // Check for vertical dark pixels extending above the line
          let upCount = 0;
          for (let dy = 1; dy <= TICK_HEIGHT_MAX; dy++) {
            if (isDark(col, line.row - dy)) upCount++;
            else break;
          }

          // Check for vertical dark pixels extending below the line
          let downCount = 0;
          for (let dy = 1; dy <= TICK_HEIGHT_MAX; dy++) {
            if (isDark(col, line.row + dy)) downCount++;
            else break;
          }

          const tickLen = Math.max(upCount, downCount);
          if (tickLen >= TICK_HEIGHT_MIN) {
            // Avoid counting the same tick multiple times -- merge nearby columns
            const lastTick = tickPositions.length > 0 ? tickPositions[tickPositions.length - 1] : null;
            if (lastTick && col - lastTick.col < 5) {
              // Merge: keep the taller tick
              if (tickLen > lastTick.height) {
                lastTick.col = col;
                lastTick.height = tickLen;
              }
            } else {
              tickPositions.push({ col, height: tickLen });
            }
          }
        }

        if (tickPositions.length < MIN_TICKS) continue;

        // -- Step 3: Check for even spacing between ticks --
        const spacings = [];
        for (let t = 1; t < tickPositions.length; t++) {
          spacings.push(tickPositions[t].col - tickPositions[t - 1].col);
        }

        if (spacings.length < 2) continue;

        // Find the most common spacing (mode) using a tolerance bucket
        const spacingBuckets = {};
        for (const s of spacings) {
          const bucket = Math.round(s / 5) * 5; // Bucket to nearest 5px
          spacingBuckets[bucket] = (spacingBuckets[bucket] || 0) + 1;
        }

        let bestBucket = 0;
        let bestCount = 0;
        for (const [bucket, count] of Object.entries(spacingBuckets)) {
          if (count > bestCount) {
            bestCount = count;
            bestBucket = parseInt(bucket);
          }
        }

        if (bestBucket < 10) continue; // Ticks too close together -- probably not a scale bar

        // Count how many spacings match the dominant spacing within tolerance
        const matchingSpacings = spacings.filter(s => Math.abs(s - bestBucket) / bestBucket < SPACING_TOLERANCE);
        const evenRatio = matchingSpacings.length / spacings.length;

        if (evenRatio < 0.5) continue; // Not evenly spaced enough

        // Compute average spacing from matching ticks
        const avgSpacing = matchingSpacings.reduce((a, b) => a + b, 0) / matchingSpacings.length;

        scaleBarCandidates.push({
          line,
          tickPositions,
          tickCount: tickPositions.length,
          avgSpacing,
          evenRatio,
        });
      }

      if (scaleBarCandidates.length === 0) return result;

      // Pick the best candidate (most ticks with good even spacing)
      scaleBarCandidates.sort((a, b) => {
        const scoreA = a.tickCount * a.evenRatio;
        const scoreB = b.tickCount * b.evenRatio;
        return scoreB - scoreA;
      });

      const best = scaleBarCandidates[0];

      // -- Step 4: Look for number labels near tick marks --
      // Scan a region below (and above) each tick for clusters of dark pixels
      // that could be digit labels (0, 5, 10, 20, etc.).
      // Since we cannot do full OCR, we detect dark pixel density as a proxy for labels.
      const labelRegionAbove = 30; // px above the line to search for labels
      const labelRegionBelow = 30; // px below the line to search for labels
      let hasLabelsAbove = false;
      let hasLabelsBelow = false;

      // Check for dark pixel density near first, second, and last ticks (label zones)
      const ticksToCheck = [0, Math.min(1, best.tickPositions.length - 1), best.tickPositions.length - 1];
      for (const ti of ticksToCheck) {
        const tick = best.tickPositions[ti];
        if (!tick) continue;

        // Check below the line for labels
        let darkCountBelow = 0;
        for (let dx = -12; dx <= 12; dx++) {
          for (let dy = 4; dy <= labelRegionBelow; dy++) {
            if (isDark(tick.col + dx, best.line.row + dy + tick.height)) darkCountBelow++;
          }
        }
        if (darkCountBelow > 20) hasLabelsBelow = true;

        // Check above the line for labels
        let darkCountAbove = 0;
        for (let dx = -12; dx <= 12; dx++) {
          for (let dy = 4; dy <= labelRegionAbove; dy++) {
            if (isDark(tick.col + dx, best.line.row - dy - tick.height)) darkCountAbove++;
          }
        }
        if (darkCountAbove > 20) hasLabelsAbove = true;
      }

      const hasLabels = hasLabelsAbove || hasLabelsBelow;

      // -- Step 5: Estimate pixelsPerFoot from tick spacing --
      // Without full OCR on labels, use common scale bar conventions.
      // At 3x scale (216 ppi), typical scale bars:
      //   1/8" = 1'-0"  -> 1 inch on paper = 8 ft  -> tick spacing ~27px per ft
      //   1/4" = 1'-0"  -> 1 inch on paper = 4 ft  -> tick spacing ~54px per ft
      //   3/16"= 1'-0"  -> 1 inch on paper = 5.33 ft -> tick spacing ~40.5px per ft
      //   1" = 10'      -> 1 inch on paper = 10 ft -> tick spacing ~21.6px per ft
      //   1" = 20'      -> 1 inch on paper = 20 ft -> tick spacing ~10.8px per ft

      const totalBarPx = best.tickPositions[best.tickPositions.length - 1].col - best.tickPositions[0].col;
      const numDivisions = best.tickCount - 1;

      // Guess the labeled distance based on common construction drawing patterns
      const commonTotalFeet = [5, 10, 15, 20, 25, 30, 40, 50, 100];
      let bestFitFeet = 0;
      let bestFitScore = 0;

      for (const totalFt of commonTotalFeet) {
        const feetPerDiv = totalFt / numDivisions;
        // Prefer round numbers per division (1, 2, 5, 10, 20, 25, 50)
        const roundDividers = [1, 2, 2.5, 5, 10, 20, 25, 50];
        const isRound = roundDividers.some(d => Math.abs(feetPerDiv - d) < 0.01);
        if (!isRound) continue;

        const ppf = totalBarPx / totalFt; // pixels per foot

        // Check if this ppf corresponds to a standard architectural scale
        // ppf = DPI_AT_3X / ftPerInch, so ftPerInch = DPI_AT_3X / ppf
        const ftPerInch = DPI_AT_3X / ppf;

        const commonScales = [1, 2, 4, 5.333, 8, 10, 10.667, 16, 20, 32, 40, 50, 100];
        let scaleMatch = false;
        for (const cs of commonScales) {
          if (Math.abs(ftPerInch - cs) / cs < 0.15) {
            scaleMatch = true;
            break;
          }
        }

        let score = isRound ? 1 : 0;
        if (scaleMatch) score += 2;
        if (totalFt >= 10) score += 0.5;

        if (score > bestFitScore) {
          bestFitScore = score;
          bestFitFeet = totalFt;
        }
      }

      if (bestFitFeet === 0) {
        // No good fit found -- assume each tick division = 5 feet (very common)
        bestFitFeet = numDivisions * 5;
      }

      const pixelsPerFoot = totalBarPx / bestFitFeet;

      // Compute confidence based on quality signals
      let confidence = 0.3; // Base confidence for finding a ruler-like pattern
      if (best.evenRatio > 0.7) confidence += 0.15;
      if (best.evenRatio > 0.9) confidence += 0.1;
      if (best.tickCount >= 4) confidence += 0.1;
      if (best.tickCount >= 6) confidence += 0.05;
      if (hasLabels) confidence += 0.15;
      if (bestFitScore >= 2) confidence += 0.1;
      confidence = Math.min(confidence, 0.85); // Cap -- canvas detection is never as sure as text

      result.found = true;
      result.pixelsPerFoot = Math.round(pixelsPerFoot * 100) / 100;
      result.confidence = Math.round(confidence * 100) / 100;
      result.tickCount = best.tickCount;
      result.labeledDistance = bestFitFeet;
      result.avgTickSpacing = Math.round(best.avgSpacing * 10) / 10;
      result.barLengthPx = totalBarPx;

      console.log(`[Canvas Scale] Page ${pageNum}: Scale bar detected - ${best.tickCount} ticks, `
        + `${totalBarPx}px span, est. ${bestFitFeet} ft -> ${result.pixelsPerFoot} px/ft `
        + `[confidence=${result.confidence}, labels=${hasLabels}]`);

    } catch (err) {
      console.warn(`[Canvas Scale] Detection failed on page ${pageNum}:`, err.message);
    }

    return result;
  },

  // Split a large PDF into smaller chunk files using PDF.js
  async _splitPDFIntoChunks(rawFile, pagesPerChunk, selectedDisciplines) {
    const arrayBuffer = await rawFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    const chunks = [];

    // Initialize canvas scale detection results array on the SmartBrains object
    if (!this._canvasScaleData) this._canvasScaleData = [];
    const canvasScaleResults = [];

    // ── Per-page discipline filter setup ──
    // Extract text from each page to identify sheet IDs (e.g., T-101, FA-201, A-101)
    // then check against selected disciplines BEFORE rendering/uploading
    const hasDisciplineFilter = selectedDisciplines && selectedDisciplines.length > 0;
    const selectedSet = hasDisciplineFilter ? new Set(selectedDisciplines) : null;
    let skippedPages = 0;
    let includedPages = 0;

    // Sheet ID patterns to extract from page text (title block)
    const sheetIdPatterns = [
      /\b([A-Z]{1,3}[-.]?\d{1,3}[.\-]\d{1,3}[a-zA-Z]?)\b/,  // T-101, FA-2.01, E1.01
      /\b([A-Z]{1,3}[-.]?\d{3,4}[a-zA-Z]?)\b/,                // T101, FA201, E101a
      /\b([A-Z]{1,3}[-.]?\d{1,2})\b/,                          // T-1, FA-2 (short form)
    ];

    // Map sheet prefixes to disciplines (mirrors SHEET_DISCIPLINE_MAP but for text-extracted IDs)
    const prefixDisciplineMap = this.SHEET_DISCIPLINE_MAP;

    console.log(`[SmartBrains] PDF has ${totalPages} pages — rendering 1 page per chunk`);
    if (hasDisciplineFilter) {
      console.log(`[SmartBrains] 🎯 Pre-upload discipline filter: [${selectedDisciplines.join(', ')}]`);
    }

    // ── Render scale (2x for upload, 3x for scale detection) ──
    const RENDER_SCALE = 2.0;
    const DETECT_SCALE = 3.0;

    for (let p = 1; p <= totalPages; p++) {
      try {
        const page = await pdf.getPage(p);

        // ── STEP 1: Extract text to identify sheet ID ──
        let sheetId = null;
        let sheetPrefix = null;
        let pageText = '';
        try {
          const content = await page.getTextContent();
          const viewport1x = page.getViewport({ scale: 1.0 });
          const textItems = content.items.map(item => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
          }));
          pageText = textItems.map(t => t.str).join(' ');

          // Focus on title block area (bottom-right of page) for sheet ID
          const pageH = viewport1x.height;
          const pageW = viewport1x.width;
          const titleBlockItems = textItems.filter(t =>
            t.y < pageH * 0.25 && t.x > pageW * 0.5
          );
          const titleBlockText = titleBlockItems.map(t => t.str).join(' ');

          // Also check bottom strip and right edge
          const bottomItems = textItems.filter(t => t.y < pageH * 0.15);
          const bottomText = bottomItems.map(t => t.str).join(' ');
          const rightItems = textItems.filter(t => t.x > pageW * 0.75);
          const rightText = rightItems.map(t => t.str).join(' ');

          // Search title block first (most reliable), then bottom, then full page
          const searchTexts = [titleBlockText, bottomText, rightText, pageText];
          for (const text of searchTexts) {
            for (const pat of sheetIdPatterns) {
              const match = text.match(pat);
              if (match) {
                sheetId = match[1].toUpperCase();
                break;
              }
            }
            if (sheetId) break;
          }
        } catch (textErr) {
          // Text extraction failed — include page by default
        }

        // ── STEP 2: Determine discipline from sheet ID prefix ──
        let skipThisPage = false;
        if (hasDisciplineFilter && sheetId) {
          // Extract the letter prefix from sheet ID (e.g., "T" from "T-101", "FA" from "FA-201")
          const prefixMatch = sheetId.match(/^([A-Z]{1,3})/);
          if (prefixMatch) {
            sheetPrefix = prefixMatch[1];
            const mappedDisciplines = prefixDisciplineMap[sheetPrefix];

            if (mappedDisciplines !== undefined) {
              if (mappedDisciplines.includes('all')) {
                // General/cover sheets — always include
                skipThisPage = false;
              } else if (mappedDisciplines.length === 0) {
                // Structural, mechanical, plumbing — skip (not ELV-relevant)
                skipThisPage = true;
              } else {
                // Check if any mapped discipline is in user's selection
                const overlap = mappedDisciplines.some(d => selectedSet.has(d));
                skipThisPage = !overlap;
              }
            }
            // If prefix not in map, include by default (unknown = safe to include)
          }

          // Also check for discipline keywords in page text (backup detection)
          if (!skipThisPage && sheetPrefix) {
            const upperText = pageText.toUpperCase();
            // If page clearly belongs to an unselected discipline by keyword
            const keywordChecks = [
              { kw: 'PLUMBING', disc: [] },
              { kw: 'MECHANICAL', disc: [] },
              { kw: 'STRUCTURAL', disc: [] },
              { kw: 'HVAC', disc: [] },
            ];
            for (const { kw, disc } of keywordChecks) {
              if (upperText.includes(kw) && disc.length === 0) {
                // Only skip if sheet prefix is also not ELV-relevant
                if (!prefixDisciplineMap[sheetPrefix] || prefixDisciplineMap[sheetPrefix].length === 0) {
                  skipThisPage = true;
                  break;
                }
              }
            }
          }
        }

        // ── STEP 3: Scale bar detection (always, even on skipped pages — fast & useful) ──
        try {
          const detectVP = page.getViewport({ scale: DETECT_SCALE });
          const detectCanvas = document.createElement('canvas');
          detectCanvas.width = detectVP.width;
          detectCanvas.height = detectVP.height;
          const detectCtx = detectCanvas.getContext('2d');
          await page.render({ canvasContext: detectCtx, viewport: detectVP }).promise;
          const scaleResult = this._detectScaleBarFromCanvas(detectCanvas, p);
          scaleResult.sheetId = sheetId || `page_${p}`;
          canvasScaleResults.push(scaleResult);
          detectCanvas.width = 0;
          detectCanvas.height = 0;
        } catch (scaleErr) {
          canvasScaleResults.push({ found: false, pixelsPerFoot: 0, confidence: 0, method: 'scale_bar_canvas', pageNum: p, sheetId: sheetId || `page_${p}` });
        }

        // ── STEP 4: Skip page if discipline filter says so ──
        if (skipThisPage) {
          const reason = sheetPrefix ? `prefix "${sheetPrefix}" not in selected disciplines` : 'not relevant';
          console.log(`[SmartBrains] ✗ Skipping page ${p}/${totalPages} (${sheetId || 'unknown'}) — ${reason}`);
          skippedPages++;
          continue;
        }

        // ── STEP 5: Render page at upload resolution (2x) → JPEG ──
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.90));
        canvas.width = 0;
        canvas.height = 0;

        if (blob) {
          // Name chunk with sheet ID if available (makes filtering logs clearer)
          const chunkName = sheetId
            ? `page${p}_${sheetId}.jpg`
            : `page${p}.jpg`;
          const chunkFile = new File([blob], chunkName, { type: 'image/jpeg' });
          chunkFile._pageNum = p;
          chunkFile._sheetId = sheetId;
          chunks.push(chunkFile);
          includedPages++;
          console.log(`[SmartBrains] ✓ Page ${p}/${totalPages} (${sheetId || 'no ID'}) → ${Math.round(blob.size / 1024)} KB JPEG`);
        }
      } catch (e) {
        console.warn(`[SmartBrains] Failed to process page ${p}:`, e.message);
      }
    }

    pdf.destroy();

    // Store canvas scale detection results
    this._canvasScaleData = canvasScaleResults;
    const canvasFound = canvasScaleResults.filter(r => r.found);
    if (canvasFound.length > 0) {
      console.log(`[SmartBrains] Canvas scale bar detection: found on ${canvasFound.length}/${totalPages} pages`);
    }

    // Log filtering summary
    if (hasDisciplineFilter) {
      const savings = totalPages > 0 ? Math.round((skippedPages / totalPages) * 100) : 0;
      console.log(`[SmartBrains] ═══ PAGE FILTER RESULTS ═══`);
      console.log(`[SmartBrains]   Total pages: ${totalPages}`);
      console.log(`[SmartBrains]   Included: ${includedPages} pages (${chunks.length} chunks to upload)`);
      console.log(`[SmartBrains]   Skipped: ${skippedPages} pages (${savings}% savings — you won't be charged for these)`);
    }

    return chunks;
  },

  // ═══════════════════════════════════════════════════════════
  // BUILD FILE PARTS — For a specific brain
  // Supports both inline base64 and Gemini File API URIs
  // ═══════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════
  // DISCIPLINE → SHEET PREFIX MAPPING
  // Maps each selectable discipline to the construction sheet prefixes
  // and spec section numbers that belong to it.
  // Files whose names match an EXCLUDED discipline are skipped.
  // Files that don't match ANY known prefix are ALWAYS INCLUDED (safe default).
  // ═══════════════════════════════════════════════════════════

  _DISCIPLINE_SHEET_PREFIXES: {
    // Division 27 — Communications
    'Structured Cabling':                ['T-', 'TD-', 'TEL-', 'COM-', 'D-', 'TC-', 'IT-', 'T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9'],
    'Audio Visual':                      ['AV-', 'AV0', 'AV1', 'AV2'],
    'Distributed Antenna Systems (DAS)': ['DAS-', 'DAS0', 'DAS1'],
    'Paging / Intercom':                 ['PA-', 'PA0', 'IC-', 'IC0'],
    'Nurse Call Systems':                ['NC-', 'NC0', 'NC1'],
    // Division 28 — Electronic Safety & Security
    'CCTV':                              ['CCTV-', 'CCTV0', 'CCTV1', 'V-', 'V0', 'V1', 'CAM-'],
    'Access Control':                    ['AC-', 'AC0', 'AC1', 'ACS-', 'ACS0'],
    'Intrusion Detection':               ['IDS-', 'IDS0', 'ID-', 'ID0', 'INTR-'],
    'Fire Alarm':                        ['FA-', 'FA0', 'FA1', 'FA2', 'FA3', 'FALP-', 'FP-', 'FP0', 'FP1', 'FP2'],
    // Division 8 — Openings
    'Door Hardware / Electrified Hardware': ['HW-', 'HW0', 'DH-', 'DH0', 'DR-', 'DR0'],
    // Division 1 — General Requirements
    'General Requirements / Conditions': ['G-', 'G0', 'G1', 'GN-', 'GR-'],
  },

  // Spec section numbers per discipline (CSI MasterFormat)
  _DISCIPLINE_SPEC_SECTIONS: {
    'Structured Cabling':                ['27 10', '27 11', '27 13', '27 15', '271'],
    'Audio Visual':                      ['27 41', '27 42', '27 51', '274'],
    'Distributed Antenna Systems (DAS)': ['27 21', '27 22', '272'],
    'Paging / Intercom':                 ['27 51', '27 52', '275'],
    'Nurse Call Systems':                ['27 52', '275'],
    'CCTV':                              ['28 23', '282'],
    'Access Control':                    ['28 13', '281'],
    'Intrusion Detection':               ['28 16', '281'],
    'Fire Alarm':                        ['28 31', '28 30', '283'],
    'Door Hardware / Electrified Hardware': ['08 71', '08 74', '08 75', '087'],
    'General Requirements / Conditions': ['01 00', '01 10', '01 20', '01 30', '01 40', '01 50', '01 70', '01 73', '01 77', '01 78', '011', '012', '013', '014', '015', '017'],
  },

  /**
   * Check if a file should be SKIPPED based on selected disciplines.
   * Returns true if the file clearly belongs to an UNSELECTED discipline.
   * Returns false (include the file) if:
   *   - No discipline filtering is active
   *   - File can't be matched to any known discipline (safe default)
   *   - File matches a SELECTED discipline
   */
  _shouldSkipFile(fileName, category, selectedDisciplines) {
    // No filtering if no disciplines selected (include everything)
    if (!selectedDisciplines || selectedDisciplines.length === 0) return false;

    const upper = (fileName || '').toUpperCase().replace(/\s+/g, '');
    const selectedSet = new Set(selectedDisciplines);

    // For specs: also check spec section numbers in the filename
    if (category === 'specs') {
      let matchedDiscipline = null;
      for (const [discipline, sections] of Object.entries(this._DISCIPLINE_SPEC_SECTIONS)) {
        for (const sec of sections) {
          const secNorm = sec.replace(/\s+/g, '');
          if (upper.includes(secNorm)) {
            matchedDiscipline = discipline;
            break;
          }
        }
        if (matchedDiscipline) break;
      }

      // If file matched a discipline, only include if that discipline is selected
      if (matchedDiscipline) {
        if (!selectedSet.has(matchedDiscipline)) {
          console.log(`[Filter] Skipping spec "${fileName}" — matches "${matchedDiscipline}" (not selected)`);
          return true;
        }
        return false;
      }
      // Didn't match any spec section → include it (could be general specs)
      return false;
    }

    // For plans and legends: check sheet prefixes
    let matchedDiscipline = null;
    for (const [discipline, prefixes] of Object.entries(this._DISCIPLINE_SHEET_PREFIXES)) {
      for (const prefix of prefixes) {
        const prefixUpper = prefix.toUpperCase().replace(/\s+/g, '');
        // Match prefix at start of filename (after stripping path), or after common separators
        if (upper.startsWith(prefixUpper) || upper.includes('/' + prefixUpper) || upper.includes('\\' + prefixUpper) || upper.includes('_' + prefixUpper)) {
          matchedDiscipline = discipline;
          break;
        }
      }
      if (matchedDiscipline) break;
    }

    // Also check for common keywords in filenames
    if (!matchedDiscipline) {
      const KEYWORD_MAP = {
        'Fire Alarm':        ['FIRE ALARM', 'FIRE_ALARM', 'FIREALARM', 'FIRE-ALARM'],
        'CCTV':              ['CCTV', 'CAMERA', 'VIDEO SURVEILLANCE', 'VIDEOSURVEILLANCE'],
        'Access Control':    ['ACCESS CONTROL', 'ACCESS_CONTROL', 'ACCESSCONTROL', 'CARD READER', 'CARDREADER'],
        'Intrusion Detection': ['INTRUSION', 'BURGLAR', 'IDS', 'INTRUSION DETECTION'],
        'Structured Cabling': ['TELECOM', 'TELECOMMUNICATIONS', 'STRUCTURED CABLING', 'STRUCTUREDCABLING', 'DATA CABLING', 'DATACABLING'],
        'Audio Visual':      ['AUDIO VISUAL', 'AUDIOVISUAL', 'AUDIO-VISUAL', 'AV SYSTEM'],
        'Distributed Antenna Systems (DAS)': ['DAS ', 'DISTRIBUTED ANTENNA', 'DISTRIBUTEDANTENNA'],
        'Paging / Intercom': ['PAGING', 'INTERCOM', 'PA SYSTEM'],
        'Nurse Call Systems': ['NURSE CALL', 'NURSECALL'],
        'Door Hardware / Electrified Hardware': ['DOOR HARDWARE', 'DOORHARDWARE', 'ELECTRIFIED HARDWARE', 'DOOR SCHEDULE', 'DOORSCHEDULE'],
        'General Requirements / Conditions': ['GENERAL REQUIREMENTS', 'GENERALREQUIREMENTS', 'GENERAL CONDITIONS', 'GENERALCONDITIONS', 'DIVISION 01', 'DIVISION01', 'DIV 01', 'DIV01'],
      };

      for (const [discipline, keywords] of Object.entries(KEYWORD_MAP)) {
        for (const kw of keywords) {
          if (upper.includes(kw.replace(/\s+/g, ''))) {
            matchedDiscipline = discipline;
            break;
          }
        }
        if (matchedDiscipline) break;
      }
    }

    // File matched a discipline → skip if that discipline is NOT selected
    if (matchedDiscipline) {
      if (!selectedSet.has(matchedDiscipline)) {
        console.log(`[Filter] Skipping "${fileName}" — matches "${matchedDiscipline}" (not selected)`);
        return true;
      }
      return false;
    }

    // ── ELECTRICAL SHEET FILTER ──
    // Sheets starting with E- are general electrical (Division 26) — NOT low-voltage.
    // Skip them unless they also match a selected discipline keyword above.
    // This prevents electrical power plans from polluting ELV symbol counts.
    if (category === 'plans' && /^E[-\s]?\d/i.test(fileName)) {
      // Check if the filename also contains an ELV keyword (e.g., "E-101 TELECOM PLAN")
      const elvKeywords = ['TELECOM', 'LOW VOLTAGE', 'CCTV', 'ACCESS', 'FIRE ALARM', 'SECURITY', 'DATA', 'COMM', 'ELV', 'TECHNOLOGY', 'DAS', 'AUDIO', 'NURSE'];
      const hasElvKeyword = elvKeywords.some(kw => upper.includes(kw));
      if (!hasElvKeyword) {
        console.log(`[Filter] Skipping electrical sheet "${fileName}" — Division 26 (not ELV)`);
        return true;
      }
    }

    // No match → INCLUDE the file (safe default — don't accidentally drop relevant docs)
    return false;
  },

  _buildFileParts(brainDef, encodedFiles, selectedDisciplines) {
    // Supported MIME types for Gemini API
    const SUPPORTED_MIMES = new Set([
      'application/pdf',
      'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
      'text/plain', 'text/csv', 'text/html', 'text/css', 'text/javascript',
      'application/json', 'application/xml',
    ]);

    const parts = [];
    let skippedCount = 0;

    for (const category of brainDef.needsFiles) {
      const files = encodedFiles[category] || [];
      for (const f of files) {
        // ── DISCIPLINE FILTER: Skip files that belong to unselected disciplines ──
        if (this._shouldSkipFile(f.name, category, selectedDisciplines)) {
          skippedCount++;
          continue;
        }

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

    if (skippedCount > 0) {
      console.log(`[SmartBrains] Discipline filter: skipped ${skippedCount} file(s) not matching selected disciplines`);
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
    let modelName = brainDef.useProModel ? (this.config.proModel || this.config.model) : (brainDef.useAccuracyModel && this.config.accuracyModel) ? this.config.accuracyModel : this.config.model;
    const url = this.config.proxyEndpoint;

    // Check for uploaded file URIs — needed for key pinning in both main loop and fallback
    const hasUploadedFiles = fileParts.some(p => p.fileData?.fileUri);

    // FIX #20: Skip models that have been blacklisted due to persistent 400s this session
    // Normalize: strip "models/" prefix for consistent blacklist matching
    const _normalizeModel = (m) => m ? m.replace(/^models\//, '') : m;
    const _isBlacklisted = (m) => this._model400Blacklist.has(_normalizeModel(m));
    const _blacklistModel = (m) => { this._model400Blacklist.add(_normalizeModel(m)); };

    if (_isBlacklisted(modelName)) {
      const fallback = hasUploadedFiles
        ? ['gemini-2.5-flash', 'gemini-2.0-flash'].find(m => !_isBlacklisted(m))
        : ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'].find(m => !_isBlacklisted(m));
      if (fallback) {
        console.log(`[Brain:${brainDef.name}] Skipping blacklisted model ${modelName} → using ${fallback}`);
        modelName = fallback;
      } else {
        // ALL models blacklisted — skip retry loop entirely, go straight to fallback
        console.warn(`[Brain:${brainDef.name}] All models blacklisted — skipping to fallback`);
      }
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

    const _exhaustedSlots = new Set(); // FIX #5: Track 429'd key slots to skip them

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // FIX #19: Wait if circuit breaker is tripped (all keys rate-limited)
      await this._circuitBreaker.waitIfTripped();

      const activeParts = cleanFileParts;
      const hasFileData = activeParts.some(p => p.fileData);
      const parts = [{ text: promptText }, ...activeParts];
      // Zero temperature for critical counting brains — same input MUST produce same output every run
      const genConfig = {
        temperature: brainKey === 'CROSS_VALIDATOR' || brainKey === 'CONSENSUS_ARBITRATOR' ? 0.0 : 0.05,
        maxOutputTokens: brainDef.maxTokens,
      };
      if (useJsonMode) {
        genConfig.responseMimeType = 'application/json';
      }
      // NOTE: thinkingConfig disabled — causes Cloudflare 524 timeouts (>100s)
      // Gemini 3.1 Pro produces excellent results without thinking mode
      // thinkingConfig is also MUTUALLY EXCLUSIVE with JSON mode (responseMimeType)
      // gemini-2.5-pro has MANDATORY thinking — cannot use JSON mode with it

      // FIX #13: Use Math.floor for brain IDs (some are floats like 0.5, 1.75)
      // FIX #5: Skip exhausted key slots that returned 429
      let keySlot;
      if (hasUploadedFiles && !uploadKeyName) {
        // Fallback: pin to slot 0 if key name wasn't tracked
        keySlot = 0;
      } else {
        // Rotate across all keys, skipping exhausted ones
        const brainInt = Math.floor(brainDef.id);
        let candidate = (brainInt + attempt) % 18;
        let tries = 0;
        while (_exhaustedSlots.has(candidate) && tries < 18) {
          candidate = (candidate + 1) % 18;
          tries++;
        }
        keySlot = candidate;
      }

      // If context cache is available, use it instead of sending files
      // Remove fileData parts since they're already in the cache
      // FIX #20b: Don't use cache if the cache's model is blacklisted — the cache is tied to that model
      let finalParts = parts;
      const cacheModel = this._contextCache?.model;
      const cacheBlacklisted = cacheModel && _isBlacklisted(cacheModel);
      const useCache = this._contextCache && hasUploadedFiles && !cacheBlacklisted;
      if (useCache) {
        finalParts = parts.filter(p => !p.fileData); // Strip file references — they're in the cache
      }
      if (cacheBlacklisted && hasUploadedFiles) {
        // Cache model is blacklisted — send files directly with the working model
        if (attempt === 0) console.log(`[Brain:${brainDef.name}] Cache model ${_normalizeModel(cacheModel)} is blacklisted — sending files directly with ${modelName}`);
      }

      const body = {
        contents: [{ parts: finalParts }],
        generationConfig: genConfig,
        _model: useCache ? this._contextCache.model : modelName,
        _brainSlot: keySlot,
        ...(useCache ? { _cacheName: this._contextCache.name, _uploadKeyName: this._contextCache.keyName } : (uploadKeyName ? { _uploadKeyName: uploadKeyName } : {})),
      };

      // FIX #18: Diagnostic logging gated behind DEBUG flag
      if (attempt === 0 && this.config.DEBUG) {
        const partSummary = parts.map((p, i) => {
          if (p.text) return `  [${i}] text (${p.text.length} chars)`;
          if (p.fileData) return `  [${i}] fileData: ${p.fileData.fileUri} (mime: ${p.fileData.mimeType})`;
          if (p.inline_data) return `  [${i}] inline_data (mime: ${p.inline_data.mime_type}, ${Math.round((p.inline_data.data?.length || 0) / 1024)}KB b64)`;
          if (p.inlineData) return `  [${i}] inlineData (mime: ${p.inlineData.mimeType}, ${Math.round((p.inlineData.data?.length || 0) / 1024)}KB b64)`;
          return `  [${i}] UNKNOWN: ${JSON.stringify(Object.keys(p))}`;
        });
        console.log(`[Brain:${brainDef.name}] Request parts (${parts.length}):\n${partSummary.join('\n')}`);
        console.log(`[Brain:${brainDef.name}] JSON mode: ${useJsonMode}, model: ${modelName}, uploadKey: ${uploadKeyName || 'none'}`);
      }

      try {
        const controller = new AbortController();
        // FIX #15: Use configured timeouts directly — zero-timeout proxy already prevents CF 524s
        // Doubling was causing 10-min waits on unresponsive endpoints
        const timeoutMs = brainDef.useProModel ? (this.config.proTimeout || this.config.timeout) : this.config.timeout;
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
          method: 'POST',
          headers: this._authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);

        // The zero-timeout proxy always returns 200 with SSE stream.
        // Errors come through as _proxyError events in the stream.
        // Non-proxy responses (direct API) may still return error codes.
        if (response.status === 429 || response.status === 403 || response.status >= 500) {
          // FIX #5: Track exhausted key slots so we skip them on next retry
          if (response.status === 429 || response.status === 403) {
            _exhaustedSlots.add(keySlot);
            this._circuitBreaker.record429(); // FIX #19
          }
          const delay = Math.min(this.config.retryBaseDelay * Math.pow(2, attempt) + Math.random() * 500, 15000);
          console.warn(`[Brain:${brainDef.name}] API ${response.status}, slot ${keySlot} exhausted (${_exhaustedSlots.size} total), retrying in ${Math.round(delay)}ms`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        // HTTP 400 = bad request (wrong model, File API refs, etc.) — don't retry, skip to next model
        if (response.status === 400) {
          const errData = await response.json().catch(() => ({}));
          const msg400 = errData?.error?.message || 'Bad Request';
          // FIX #20: Blacklist the ACTUAL model sent (cache may override modelName)
          const actualModelSent = useCache ? cacheModel : modelName;
          _blacklistModel(actualModelSent);
          console.warn(`[Brain:${brainDef.name}] HTTP 400 — ${msg400}, blacklisting ${_normalizeModel(actualModelSent)} for session, skipping to fallback`);
          lastError = new Error(`API 400: ${msg400}`);
          break;
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `API ${response.status}`);
        }

        // ── Read SSE stream and assemble response ──
        const contentType = response.headers.get('content-type') || '';
        let text = '';
        let thoughtText = ''; // Track thinking-only responses from Gemini 3.1 Pro

        if (contentType.includes('text/event-stream')) {
          // Streaming response — read SSE chunks
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          // FIX #3: Increase idle timeout for Pro model (can think 90-120s before first chunk)
          // and count keepalive comments as valid activity (they prove the connection is alive)
          const SSE_IDLE_TIMEOUT = brainDef.useProModel ? 180000 : 90000;
          let lastActivity = Date.now();
          while (true) {
            // Clear any leftover interval from previous iteration to prevent timer leaks
            if (reader._idleCheck) { clearInterval(reader._idleCheck); reader._idleCheck = null; }
            const { done, value } = await Promise.race([
              reader.read(),
              new Promise((_, reject) => {
                const checkInterval = setInterval(() => {
                  if (Date.now() - lastActivity > SSE_IDLE_TIMEOUT) {
                    clearInterval(checkInterval);
                    reject(new Error('SSE_IDLE_TIMEOUT'));
                  }
                }, 5000);
                // Store cleanup ref so we can clear on success
                reader._idleCheck = checkInterval;
              }),
            ]).catch(err => {
              if (reader._idleCheck) clearInterval(reader._idleCheck);
              if (err.message === 'SSE_IDLE_TIMEOUT') {
                reader.cancel();
                throw { _retryable: true, status: 504, message: `SSE stream idle timeout — no data for ${SSE_IDLE_TIMEOUT / 1000}s` };
              }
              throw err;
            });
            if (reader._idleCheck) clearInterval(reader._idleCheck);
            if (done) break;
            lastActivity = Date.now(); // ANY data from stream resets idle timer
            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE lines
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
              // SSE comments (keepalive) start with ':' — count as activity but skip processing
              if (line.startsWith(':')) {
                lastActivity = Date.now(); // FIX #3: Keepalives prove connection is alive
                continue;
              }

              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === '[DONE]') continue;
                try {
                  const chunk = JSON.parse(jsonStr);

                  // Check for proxy error events from the zero-timeout proxy
                  if (chunk._proxyError) {
                    const errStatus = chunk.status || 500;
                    // Log the actual Google error for ALL error codes (not just 400)
                    if (chunk._debug) console.error(`[Brain:${brainDef.name}] Google ${errStatus} detail: ${chunk._debug}`);
                    // FIX: Detect expired context cache — 403 "CachedContent not found" is NOT a rate limit,
                    // it's a permanent error that won't resolve by retrying. Invalidate cache immediately.
                    if (errStatus === 403 && chunk._debug && chunk._debug.includes('CachedContent not found')) {
                      throw { _cacheExpired: true, status: 403, message: 'Context cache expired — invalidating' };
                    }
                    // Throw retryable errors so the retry loop handles them
                    if (errStatus === 429 || errStatus === 403 || errStatus >= 500) {
                      throw { _retryable: true, status: errStatus, message: chunk.message || `API ${errStatus}` };
                    }
                    // 400 = bad request — don't waste retries, go straight to fallback
                    if (errStatus === 400) {
                      throw { _fatal400: true, status: 400, message: chunk.message || 'Bad Request — skipping to model fallback' };
                    }
                    throw new Error(`Proxy error ${errStatus}: ${chunk.message || 'Unknown'}`);
                  }

                  // Capture token usage from final chunk
                  if (chunk.usageMetadata) {
                    const um = chunk.usageMetadata;
                    const cached = um.cachedContentTokenCount || 0;
                    const prompt = um.promptTokenCount || 0;
                    const output = um.candidatesTokenCount || 0;
                    const fresh = prompt - cached;
                    // Gemini pricing: $0.00025/1K cached, $0.0025/1K fresh input, $0.01/1K output
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
                      console.log(`[Brain:${brainDef.name}] Tokens: ${prompt} prompt (${cached} CACHED/${fresh} fresh) + ${output} output = $${cost.toFixed(4)} (saved $${savings.toFixed(4)})`);
                    }
                  }
                  const chunkParts = chunk?.candidates?.[0]?.content?.parts || [];
                  for (const p of chunkParts) {
                    if (p.text && p.thought) {
                      thoughtText += p.text; // Gemini 3.1 Pro thinking content
                    } else if (p.text) {
                      text += p.text;
                    }
                  }
                } catch (e) {
                  // If it's a cache expiration, rethrow immediately
                  if (e._cacheExpired) throw e;
                  // If it's a retryable error from proxy, rethrow it
                  if (e._retryable) throw e;
                  // If it's a real Error (e.g. proxy 400), rethrow — don't silently swallow
                  if (e instanceof Error && e.message?.startsWith('Proxy error')) throw e;
                  // Otherwise skip malformed SSE chunks
                }
              }
            }
          }
          // Flush any remaining data left in buffer after stream ends
          if (buffer && buffer.trim()) {
            if (buffer.startsWith('data: ')) {
              const jsonStr = buffer.slice(6).trim();
              if (jsonStr && jsonStr !== '[DONE]') {
                try {
                  const chunk = JSON.parse(jsonStr);
                  const chunkParts = chunk?.candidates?.[0]?.content?.parts || [];
                  for (const p of chunkParts) {
                    if (p.text && p.thought) { thoughtText += p.text; }
                    else if (p.text) { text += p.text; }
                  }
                } catch (e) { console.warn('[SSE] Skipped malformed final chunk:', e.message); }
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

        // If regular text is empty but we got thinking content, use that
        if ((!text || text.length < 20) && thoughtText.length >= 20) {
          console.warn(`[Brain:${brainDef.name}] Response was thought-only (${thoughtText.length} chars thinking, ${text.length} chars regular) — using thinking content`);
          text = thoughtText;
        }

        if (!text || text.length < 20) {
          console.warn(`[Brain:${brainDef.name}] Empty response — text: ${text.length} chars, thought: ${thoughtText.length} chars, attempt ${attempt + 1}`);
          throw new Error('Empty response from AI');
        }

        // FIX #19: Reset circuit breaker on success
        this._circuitBreaker.recordSuccess();
        console.log(`[Brain:${brainDef.name}] ✓ Complete (${text.length} chars, attempt ${attempt + 1})`);
        return text;

      } catch (err) {
        lastError = err;

        // FIX #21: Cache expired — invalidate immediately, don't waste retries or trip circuit breaker.
        // 403 "CachedContent not found" is permanent — no amount of retrying or waiting will bring it back.
        if (err._cacheExpired) {
          if (this._contextCache) {
            console.warn(`[Brain:${brainDef.name}] ⚠️ Context cache EXPIRED — invalidating cache for all remaining brains`);
            this._contextCache = null; // Kill the cache reference globally
          }
          // Break to fallback — fallback builds fresh body without _cacheName
          break;
        }

        // 400 = bad request — retrying won't help. Break immediately to model fallback.
        if (err._fatal400) {
          // FIX #20: Blacklist the ACTUAL model sent (cache may override modelName)
          const actualModelSent = useCache ? cacheModel : modelName;
          _blacklistModel(actualModelSent);
          console.warn(`[Brain:${brainDef.name}] 400 Bad Request — blacklisting ${_normalizeModel(actualModelSent)}, skipping ${maxRetries - attempt - 1} remaining retries`);
          break;
        }

        if (err._retryable) {
          // FIX #5: Track exhausted slots from proxy-reported errors too
          if (err.status === 429 || err.status === 403) {
            _exhaustedSlots.add(keySlot);
            this._circuitBreaker.record429(); // FIX #19
          }
          console.warn(`[Brain:${brainDef.name}] Proxy reported API ${err.status}, slot ${keySlot} exhausted (${_exhaustedSlots.size} total), retrying…`);
        } else if (err.name === 'AbortError') {
          console.warn(`[Brain:${brainDef.name}] Timeout, attempt ${attempt + 1}`);
        } else {
          console.warn(`[Brain:${brainDef.name}] Error (attempt ${attempt + 1}/${maxRetries}): ${err.message}`);
        }
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, Math.min(this.config.retryBaseDelay * Math.pow(2, attempt), 15000)));
        }
      }
    }

    // ── Model Fallback: If primary model failed, try alternative models ──
    // When File API refs are present, prefer models that support fileData
    const fallbackModels = hasUploadedFiles
      ? ['gemini-2.5-flash', 'gemini-2.0-flash']  // Skip 2.5-pro (400s with File API)
      : ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    const triedModel = modelName;
    for (const fbModel of fallbackModels) {
      if (fbModel === triedModel) continue; // skip the one that already failed
      if (_isBlacklisted(fbModel)) continue; // FIX: skip blacklisted models in fallback too
      console.warn(`[Brain:${brainDef.name}] ${triedModel} failed — falling back to ${fbModel}`);
      try {
        // FIX: Keep fileData refs — brains analyzing images NEED them. Only strip if no upload key.
        const fbParts = [{ text: promptText }, ...cleanFileParts];
        const fbGenConfig = { temperature: 0.1, maxOutputTokens: 16384 };
        if (brainDef.jsonMode || useJsonMode) fbGenConfig.responseMimeType = 'application/json';
        const fbBody = { contents: [{ parts: fbParts }], generationConfig: fbGenConfig, _model: fbModel, _brainSlot: Math.floor(brainDef.id) % 18 };
        if (uploadKeyName) fbBody._uploadKeyName = uploadKeyName;
        const ctrl = new AbortController();
        const tmr = setTimeout(() => ctrl.abort(), this.config.timeout);
        const fbResp = await fetch('/api/ai/invoke', { method: 'POST', headers: this._authHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify(fbBody), signal: ctrl.signal });
        clearTimeout(tmr);
        if (fbResp.status === 400) {
            // FIX: Blacklist this fallback model too, so next brain doesn't retry it
            _blacklistModel(fbModel);
            console.warn(`[Brain:${brainDef.name}] Fallback ${fbModel} returned 400 — blacklisting, trying next`);
            continue;
        }
        if (!fbResp.ok) {
            throw new Error(`Fallback HTTP ${fbResp.status}: ${fbResp.statusText}`);
        }
        let fbText = '', fbThought = '';
        const fbReader = fbResp.body.getReader();
        const fbDec = new TextDecoder();
        let fbBuf = '';
        // Idle timeout: abort if no data received for 60 seconds
        let fbIdleTimer = setTimeout(() => ctrl.abort(), 60000);
        while (true) {
          const { done, value } = await fbReader.read();
          clearTimeout(fbIdleTimer);
          if (done) break;
          fbIdleTimer = setTimeout(() => ctrl.abort(), 60000);
          fbBuf += fbDec.decode(value, { stream: true });
          const fbLines = fbBuf.split('\n');
          fbBuf = fbLines.pop(); // Keep incomplete line
          for (const line of fbLines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const ch = JSON.parse(line.substring(6));
              if (ch._proxyError) {
                if (ch.status === 400) { _blacklistModel(fbModel); throw new Error(`Fallback proxy 400 from ${fbModel}`); }
                if (ch.status === 503 || ch.status >= 500) break;
                continue;
              }
              for (const p of (ch?.candidates?.[0]?.content?.parts || [])) {
                if (p.text && p.thought) fbThought += p.text;
                else if (p.text) fbText += p.text;
              }
            } catch (e) { console.warn('[Brain] parse skip:', e.message); }
          }
        }
        // Flush remaining buffer
        if (fbBuf && fbBuf.startsWith('data: ')) {
          try {
            const ch = JSON.parse(fbBuf.substring(6));
            for (const p of (ch?.candidates?.[0]?.content?.parts || [])) {
              if (p.text && p.thought) fbThought += p.text;
              else if (p.text) fbText += p.text;
            }
          } catch (e) { console.warn('[SSE] Skipped malformed final chunk:', e.message); }
        }
        if (fbText && fbText.length >= 20) {
          console.log(`[Brain:${brainDef.name}] ✓ Fallback ${fbModel} succeeded (${fbText.length} chars)`);
          this._circuitBreaker.recordSuccess();
          return fbText;
        }
        console.warn(`[Brain:${brainDef.name}] Fallback ${fbModel} returned empty`);
      } catch (fbErr) {
        console.warn(`[Brain:${brainDef.name}] Fallback ${fbModel} failed: ${fbErr.message}`);
      }
    }

    // ── Legacy fallback path (kept for backward compat) ──
    // Only try if the config model isn't blacklisted and is different from what we already tried
    if (brainDef.useProModel && modelName !== this.config.model && !_isBlacklisted(this.config.model)) {
      console.warn(`[Brain:${brainDef.name}] All fallbacks failed — last attempt with ${this.config.model}`);
      try {
        const fbParts = [{ text: promptText }, ...cleanFileParts];
        const fbGenConfig = {
          temperature: brainKey === 'CROSS_VALIDATOR' || brainKey === 'CONSENSUS_ARBITRATOR' ? 0.0 : 0.05,
          maxOutputTokens: brainDef.maxTokens,
        };
        if (useJsonMode) {
          fbGenConfig.responseMimeType = 'application/json';
        }

        const fbBody = {
          contents: [{ parts: fbParts }],
          generationConfig: fbGenConfig,
          _model: this.config.model,
          _brainSlot: hasUploadedFiles ? 0 : Math.floor(brainDef.id),
          ...(uploadKeyName ? { _uploadKeyName: uploadKeyName } : {}),
        };

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.config.timeout);
        const response = await fetch(url, {
          method: 'POST',
          headers: this._authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(fbBody),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.ok) {
          // Handle SSE streaming in fallback too
          const ct = response.headers.get('content-type') || '';
          let text = '';
          let fbThoughtText = '';
          if (ct.includes('text/event-stream')) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buf = '';
            const FB_SSE_IDLE_TIMEOUT = 60000; // 60 seconds per-read idle timeout
            while (true) {
              let idleTimer;
              const { done, value } = await Promise.race([
                reader.read(),
                new Promise((_, reject) => {
                  idleTimer = setTimeout(() => reject(new Error('SSE_IDLE_TIMEOUT')), FB_SSE_IDLE_TIMEOUT);
                }),
              ]).then(result => { clearTimeout(idleTimer); return result; })
                .catch(err => {
                clearTimeout(idleTimer);
                if (err.message === 'SSE_IDLE_TIMEOUT') {
                  reader.cancel();
                  throw { _retryable: true, status: 504, message: 'Fallback SSE stream idle timeout — no data received for 60s' };
                }
                throw err;
              });
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              const lines = buf.split('\n');
              buf = lines.pop();
              for (const line of lines) {
                if (line.startsWith(':')) continue; // Skip keepalive comments
                if (line.startsWith('data: ')) {
                  const js = line.slice(6).trim();
                  if (!js || js === '[DONE]') continue;
                  try {
                    const chunk = JSON.parse(js);
                    // Handle proxy errors in fallback too
                    if (chunk._proxyError) {
                      console.warn(`[Brain:${brainDef.name}] Fallback proxy error: ${chunk.status} ${chunk.message}`);
                      if (chunk._debug) console.error(`[Brain:${brainDef.name}] Google says: ${chunk._debug}`);
                      break;
                    }
                    const cp = chunk?.candidates?.[0]?.content?.parts || [];
                    for (const p of cp) {
                      if (p.text && p.thought) { fbThoughtText += p.text; }
                      else if (p.text) { text += p.text; }
                    }
                  } catch (e) { if (e._retryable) throw e; console.warn(`[Brain:${brainDef.name}] Skipped malformed SSE chunk:`, e.message); }
                }
              }
            }
            // Flush remaining buffer after stream ends
            if (buf && buf.startsWith('data: ')) {
              const js = buf.slice(6).trim();
              if (js && js !== '[DONE]') {
                try {
                  const chunk = JSON.parse(js);
                  const cp = chunk?.candidates?.[0]?.content?.parts || [];
                  for (const p of cp) {
                    if (p.text && p.thought) { fbThoughtText += p.text; }
                    else if (p.text) { text += p.text; }
                  }
                } catch (e) { console.warn('[SSE] Skipped malformed final chunk:', e.message); }
              }
            }
          } else {
            const data = await response.json();
            const allParts = data?.candidates?.[0]?.content?.parts || [];
            text = allParts.filter(p => p.text && !p.thought).map(p => p.text).join('\n') || '';
            if (!text) fbThoughtText = allParts.filter(p => p.text && p.thought).map(p => p.text).join('\n') || '';
          }
          // Use thought content if regular text is empty
          if ((!text || text.length < 20) && fbThoughtText.length >= 20) {
            console.warn(`[Brain:${brainDef.name}] Fallback was thought-only (${fbThoughtText.length} chars) — using thinking content`);
            text = fbThoughtText;
          }
          if (text && text.length >= 20) {
            console.log(`[Brain:${brainDef.name}] ✓ Fallback complete (${text.length} chars)`);
            return text;
          }
          console.warn(`[Brain:${brainDef.name}] Fallback returned empty — text: ${text.length} chars, thought: ${fbThoughtText.length} chars`);
        } else {
          console.warn(`[Brain:${brainDef.name}] Fallback HTTP ${response.status}`);
        }
      } catch (fbErr) {
        console.warn(`[Brain:${brainDef.name}] Fallback also failed:`, fbErr.message);
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
    try { return JSON.parse(fixTrailingCommas(cleaned)); } catch { /* fall through */ }
    
    // Strategy 3: Markdown code block extraction
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      const inner = match[1].trim();
      try { return JSON.parse(inner); } catch { /* fall through */ }
      try { return JSON.parse(fixTrailingCommas(inner)); } catch { /* fall through */ }
    }
    
    // Strategy 4: First { to last } extraction
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const extracted = cleaned.substring(start, end + 1);
      try { return JSON.parse(extracted); } catch { /* fall through */ }
      try { return JSON.parse(fixTrailingCommas(extracted)); } catch { /* fall through */ }
      
      // Strategy 5: Sanitize control characters + retry
      try { return JSON.parse(sanitizeJSON(extracted)); } catch { /* fall through */ }
      try { return JSON.parse(fixTrailingCommas(sanitizeJSON(extracted))); } catch { /* fall through */ }
      
      // Strategy 6: Fix unquoted keys + retry
      try { return JSON.parse(fixUnquotedKeys(fixTrailingCommas(sanitizeJSON(extracted)))); } catch { /* fall through */ }
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
        try { return JSON.parse(block); } catch { /* fall through */ }
        try { return JSON.parse(fixTrailingCommas(block)); } catch { /* fall through */ }
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
            return result;
          } catch { /* fall through */ }
          try {
            const result = JSON.parse(fixTrailingCommas(recovered));
            console.warn(`[SmartBrains] JSON recovered via truncation repair + comma fix`);
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
    CODE_COMPLIANCE: ['issues', 'summary'],
    MDF_IDF_ANALYZER: ['rooms'],
    CABLE_PATHWAY: ['horizontal_cables', 'pathways', 'conduit_runs'],
    SPECIAL_CONDITIONS: ['equipment_rentals', 'subcontractors', 'permits', 'true_change_orders', 'transit_railroad_checklist', 'prevailing_wage_detected', 'prevailing_wage_type'],
    SHADOW_SCANNER: ['totals'],
    DISCIPLINE_DEEP_DIVE: ['discipline_counts'],
    QUADRANT_SCANNER: ['quadrants', 'totals'],
    CONSENSUS_ARBITRATOR: ['consensus_counts', 'disputes', 'confidence'],
    TARGETED_RESCANNER: ['resolved_items', 'final_counts'],
    MATERIAL_PRICER: ['categories', 'grand_total'],
    LABOR_CALCULATOR: ['phases', 'total_hours'],
    FINANCIAL_ENGINE: ['sov', 'project_summary'],
    REVERSE_VERIFIER: ['verified_items', 'discrepancies'],
    CROSS_VALIDATOR: ['status', 'issues', 'confidence_score'],
    DEVILS_ADVOCATE: ['challenges', 'risk_score', 'missed_items', 'true_change_orders'],
    DETAIL_VERIFIER: ['area_audits', 'corrections', 'verified_counts'],
    CROSS_SHEET_ANALYZER: ['sheet_comparisons', 'inconsistencies', 'adjusted_counts'],
    FINAL_RECONCILIATION: ['final_counts', 'adjustment_log', 'confidence_score'],
    SPEC_CROSS_REF: ['spec_vs_drawing', 'discrepancies', 'true_change_orders', 'specified_products', 'power_equipment_found', 'equipment_schedule'],
    ANNOTATION_READER: ['annotations', 'referenced_details', 'schedule_data'],
    RISER_DIAGRAM_ANALYZER: ['risers', 'backbone_cables'],
    DEVICE_LOCATOR: ['devices'],
    SCOPE_EXCLUSION_SCANNER: ['exclusions'],
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
    // AUDIT FIX #17: Prompt injection defense — sanitize all user-supplied context fields
    // Strip any instruction-like patterns from user text that could hijack the AI brain
    const _sanitize = (s) => {
      if (typeof s !== 'string') return s;
      // Remove attempts to override system prompts or inject new instructions
      return s.replace(/(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|above|prior)\s+(?:instructions?|prompts?|rules?)/gi, '[FILTERED]')
              .replace(/(?:you\s+are\s+now|new\s+instructions?|system\s*:\s*|assistant\s*:\s*|human\s*:\s*)/gi, '[FILTERED]')
              .replace(/(?:output|return|respond\s+with)\s+(?:only|just)\s+(?:the\s+word|")/gi, '[FILTERED]');
    };
    // AUDIT FIX M4: Sanitize ALL user-facing context fields, not just 3
    const _userFields = ['projectName', 'projectType', 'codeJurisdiction', 'projectLocation',
      'buildingType', 'clientName', 'notes', 'specialInstructions', 'scopeNotes'];
    for (const field of _userFields) {
      if (context[field]) context[field] = _sanitize(context[field]);
    }

    const prompts = {

      // ── BRAIN 1: Symbol Scanner ──────────────────────────────
      SYMBOL_SCANNER: () => `You are a CONSTRUCTION DOCUMENT SYMBOL SCANNER — the #1 expert at finding and counting symbols on ELV floor plans.

PROJECT: ${context.projectName || 'Unknown'} | Type: ${context.projectType || 'Unknown'}
DISCIPLINES: ${(context.disciplines || []).join(', ')}
NOTE: Documents have been pre-filtered to only include sheets/specs matching the selected disciplines above. Only count devices belonging to these disciplines — ignore any symbols from other trades that may appear on shared sheets.

YOUR MISSION: Scan EVERY sheet and count EVERY device symbol for the selected disciplines. Be exhaustive.
${context._hasAddenda ? `
═══ ADDENDA ALERT — Revised sheets are included in this set ═══
This plan set includes ADDENDA (revised sheets). Addenda sheets have "ADDENDUM" or revision clouds/deltas in their names or on the drawing.
- If an addenda sheet replaces a base plan sheet (same sheet number), use the ADDENDA version counts
- Look for revision clouds (dashed ovals/rectangles) on addenda sheets — these highlight WHAT CHANGED
- Track any devices that were ADDED, REMOVED, or RELOCATED by addenda
- Include an "addenda_changes" array in your response listing changes you detected
` : ''}

WHAT TO COUNT BY DISCIPLINE:
${(context.disciplines || []).includes('Structured Cabling') ? '- CABLING: Data outlets, voice outlets, WAPs, fiber outlets, combo outlets, patch panels, cable trays' : ''}
${(context.disciplines || []).includes('Structured Cabling') ? `═══ CRITICAL — DATA OUTLET COUNTING (READ THIS CAREFULLY) ═══
  Data outlets on construction plans appear as SMALL TRIANGLES (▲) with a label like "2D", "4D", or just a plain triangle.
  The number before the "D" tells you HOW MANY CABLES run to that location:
  - A triangle labeled "2D" = 2 Cat6 cables = 2 keystone jacks = needs a 2-port faceplate
  - A triangle labeled "4D" = 4 Cat6 cables = 4 keystone jacks = needs a 4-port faceplate
  - A plain triangle or "1D" = 1 cable = 1 jack = 1-port faceplate
  - WAP symbols (wireless access points) are separate — usually a circle or "WAP" label, NOT a triangle

  HOW TO COUNT:
  1. Scan EVERY room on the floor plan — check patient rooms, corridors, lobbies, offices, nurse stations, break rooms, conference rooms, storage, restrooms (some have data)
  2. Count EVERY triangle symbol — they are often small and densely packed near walls
  3. Look BEHIND text labels and room names — triangles often hide behind room name text
  4. Check BOTH SIDES of corridor walls — outlets serve rooms on both sides
  5. Look at the ENLARGED PLANS if available — they show the same outlets at higher detail
  6. In medical/VA projects, EVERY patient care room typically has 2-4 data outlets

  YOU MUST REPORT TWO SEPARATE COUNTS:
  1. "data_outlet_symbols" in totals = number of PHYSICAL TRIANGLE SYMBOLS on the plans
  2. "data_outlet" in totals = total CABLES: (count_of_2D × 2) + (count_of_4D × 4) + (count_of_1D × 1)

  OUTLET BREAKDOWN (MANDATORY): Include "outlet_breakdown" in the top-level JSON:
  {"1D": count_of_1D_symbols, "2D": count_of_2D_symbols, "4D": count_of_4D_symbols, "6D": count_of_6D_symbols}

${context.wave0?.LEGEND_DECODER?.multiplier_map ? `  LEGEND-CONFIRMED MULTIPLIERS: ${JSON.stringify(context.wave0.LEGEND_DECODER.multiplier_map)}
  Use these EXACT multipliers from the legend when calculating data_outlet from data_outlet_symbols.` : ''}` : ''}
${(context.disciplines || []).includes('CCTV') ? '- CCTV: Fixed cameras, PTZ cameras, dome cameras, bullet cameras, multi-sensor cameras, NVRs, encoders' : ''}
${(context.disciplines || []).includes('Access Control') ? '- ACCESS (Div 28 + Div 08): Card readers, keypads, door contacts, REX devices, electric strikes, maglocks, intercoms, controllers, power transfer hinges, auto-operators, delayed egress devices, gate operators, barrier arms' : ''}
${(context.disciplines || []).includes('Fire Alarm') ? '- FIRE: Smoke detectors, heat detectors, pull stations, horn/strobes, duct detectors, modules, annunciators, NACs, SLCs' : ''}
${(context.disciplines || []).includes('Intrusion Detection') ? '- INTRUSION: Motion detectors, door contacts, glass break, keypads, sirens, panels' : ''}
${(context.disciplines || []).includes('Audio Visual') ? '- AV: Speakers, displays, projectors, touch panels, microphones, signal plates, amplifiers, DSPs' : ''}
${(context.disciplines || []).includes('Distributed Antenna Systems (DAS)') ? '- DAS: Antennas, remote units, head-end equipment, splitters, couplers, fiber trunk cables, coax runs' : ''}
${(context.disciplines || []).includes('Paging / Intercom') ? '- PAGING/INTERCOM: Speakers, amplifiers, paging stations, intercom substations, master stations, door stations' : ''}
${(context.disciplines || []).includes('Nurse Call Systems') ? '- NURSE CALL: Patient stations, staff stations, pillow speakers, dome lights, pull cords, corridor lights, master panels' : ''}
${(context.disciplines || []).includes('Door Hardware / Electrified Hardware') ? '- DOOR HARDWARE: Electric strikes, maglocks, auto-operators, door closers, electrified hinges, power transfers, door position switches' : ''}
${(context.disciplines || []).includes('General Requirements / Conditions') ? '- GENERAL: Mobilization items, temporary facilities, testing/commissioning requirements, submittals, closeout documents' : ''}
- POWER & INFRASTRUCTURE (ALWAYS scan for these regardless of discipline):
  UPS units, inverters, power inverters, transfer switches (ATS/STS), power supplies, battery backup units,
  PDUs, surge protectors, generators, solar inverters, rectifiers, battery chargers, power conditioners
  — If ANY of these appear on plans or in schedules, count them with location and specs

═══ CRITICAL: READ ALL NOTES ON EVERY PAGE ═══
On EVERY sheet you scan, you MUST read and report ALL text notes including:
- General Notes blocks (usually at right side or bottom of sheet)
- Keynotes (numbered/lettered references)
- Specifications written directly on the plan (cable types, installation methods, conduit requirements)
- "Note:" or "N:" callouts near specific devices or areas
- Title block notes, scope notes, responsibility notes
- Any text that says "Provide...", "Install...", "Furnish...", "Contractor shall...", "By others..."
- Mounting height notes, conduit routing notes, cable type requirements
- Any references to conduits being provided by electrical contractor or others
Include ALL notes you find in the "notes" field of your response. These notes often contain critical scope information.

INSTRUCTIONS:
1. Study the legend first to learn what each symbol means
2. Go sheet by sheet systematically
3. Count carefully — zoom into dense areas
4. Note any symbols you cannot identify
5. For each count, provide your confidence (0-100)
6. LOCATION TAG EVERY DEVICE — list the specific room or area name for each device
7. READ AND RECORD every General Note, Keynote, and annotation on every page

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
  "totals": { "camera": 48, "data_outlet": 200, "data_outlet_symbols": 105 },
  "outlet_breakdown": { "1D": 10, "2D": 80, "4D": 15, "6D": 0 },
  "device_inventory": [
    { "type": "camera", "subtype": "fixed_dome", "room": "Lobby", "floor": "1st Floor", "sheet": "E1.01", "qty": 3 },
    { "type": "camera", "subtype": "fixed_dome", "room": "Corridor A", "floor": "1st Floor", "sheet": "E1.01", "qty": 5 }
  ],
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
  AUDIT FIX #16 — NFPA 72 NAC/SLC CALCULATIONS (verify these for fire alarm projects):
  * NAC (Notification Appliance Circuit): Total device current draw must not exceed panel NAC output
    - Typical NAC output: 2.5A per circuit. Each horn/strobe draws 0.09-0.30A depending on candela rating
    - Max devices per NAC ≈ 8-25 depending on device type and candela setting
    - Wire voltage drop: V_drop = 2 × L × I × R_per_ft (must stay above 16V at last device for 24VDC)
    - #14 AWG: 2.58Ω/1000ft | #12 AWG: 1.62Ω/1000ft — use to verify wire gauge adequacy
  * SLC (Signaling Line Circuit): Addressable loop device limits
    - Typical SLC capacity: 127-250 devices per loop depending on panel manufacturer
    - Wire distance limit: typically 12,000ft total loop length (Class B) or 6,000ft per side (Class A)
  * Smoke detector spacing: 30ft max between detectors, 15ft from walls (NFPA 72 Table 17.6.3.5.1)
  * Horn/strobe candela: 15cd minimum for rooms, 110cd for corridors, per NFPA 72 Table 18.5.5.4.1(a)
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
2. Equipment requirements: racks/cabinets (use 7ft floor-mount cabinet if shown), patch panels, switches, UPS, PDU, fiber panels
   — FIBER ENCLOSURES ARE CRITICAL: Include a Corning Rack-Mount Fiber Enclosure 1RU (CCH-01U) at EVERY room with backbone fiber (minimum 2 total — one at MDF, one at each IDF).
   — LC ADAPTER PANELS: Include Corning LC Adapter Panel 6-Pack (CCH-CP06-E4) at BOTH ends. Qty = fiber strand count ÷ 6, round UP, PER END. Example: 24-strand = 4 panels × 2 ends = 8 total.
   — FIBER CABLE: Include the correct footage of fiber between rooms (measure the backbone route on plans).
3. Cable management: horizontal/vertical managers, ladder rack/cable runway
   — LADDER RACK IS CRITICAL: Check plans for overhead ladder rack (cable runway) shown entering/exiting each TR.
   — Look for symbols showing ladder rack runs connecting rooms to corridor ceiling pathways.
   — Common notation: "LR", "CR", "Cable Runway", "Ladder Rack", or drawn as parallel lines overhead.
   — Include TOTAL length in feet (measure the FULL route from rack top through corridor to all rooms — typical clinic/hospital is ~100 LF).
   — If plans show ladder rack entering the room, include ALL ladder rack components as SEPARATE equipment line items:
     • Ladder Rack / Cable Runway (qty in LF — the straight sections, typically 12" or 18" wide)
     • Trapeze / Support Kit (1 every 5 ft of ladder rack run — includes crossbar bracket)
     • Threaded Rod 3/8" (2 rods per support × length from ceiling anchor to rack height, typically 36-48" each)
     • Beam Clamp or Ceiling Anchor (2 per support — attaches threaded rod to structure above)
     • Splice Plate / Butt Splice (1 per joint where sections connect — typically every 10-12 ft)
     • 90° Horizontal Elbow (count turns from plan routing)
     • Tee Fitting (if ladder rack branches/splits)
     • Wall Bracket / Wall Support (where rack enters/exits room through wall — 2 per penetration)
     • Rack-to-Runway Mounting Kit (transitions from ladder rack down to top of equipment rack — 1 per rack)
     • Ground Lug / Bonding Bushing (1 per section for grounding continuity per TIA-607)
4. Grounding: TMGB, TGB, TBB
5. Environmental: dedicated HVAC, fire suppression
6. Power: dedicated circuits, UPS sizing, generator backup

CRITICAL: EVERY equipment item MUST include the manufacturer name AND part number in the "item" field.
Format: "Manufacturer PartNumber Description" — e.g., "Chatsworth 55053-703 7ft 45RU Open Frame Rack"
DEFAULT MANUFACTURER for racks, cable management, ladder rack, and MDF/IDF infrastructure: CPI (Chatsworth Products Inc.)
Use CPI/Chatsworth part numbers for: open frame racks, floor-mount cabinets, horizontal/vertical cable managers, ladder rack, trapeze kits, splice plates, elbows, wall brackets, rack-to-runway kits.
Use Corning for fiber enclosures, adapter panels, splice-on connectors. Use Harger for grounding (TMGB, TGB, bus bars).
If you don't know the exact part number, use the manufacturer's standard catalog number.

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
        { "item": "Chatsworth 55053-703 7ft 45RU Open Frame Rack", "qty": 2, "unit": "ea", "notes": "Full-height 2-post rack" },
        { "item": "Chatsworth 10250-712 Ladder Rack 12\" Cable Runway", "qty": 100, "unit": "lf", "notes": "Overhead from rack to corridor pathway — measure FULL route" },
        { "item": "Chatsworth 12250-712 Ladder Rack Trapeze/Support Kit", "qty": 20, "unit": "ea", "notes": "1 every 5 ft of run (100 LF ÷ 5)" },
        { "item": "Hilti 387517 Threaded Rod 3/8\" x 48\"", "qty": 40, "unit": "ea", "notes": "2 per support (20 supports × 2)" },
        { "item": "B-Line B2010 Beam Clamp 3/8\"", "qty": 40, "unit": "ea", "notes": "2 per support (20 supports × 2)" },
        { "item": "Chatsworth 11301-712 Ladder Rack Splice Plate", "qty": 5, "unit": "ea", "notes": "1 per joint where 10-12 ft sections connect" },
        { "item": "Chatsworth 11451-712 Ladder Rack 90° Elbow", "qty": 6, "unit": "ea", "notes": "Count every turn in the routing path" },
        { "item": "Chatsworth 12301-712 Ladder Rack Wall Bracket", "qty": 4, "unit": "ea", "notes": "2 per wall penetration" },
        { "item": "Chatsworth 13250-712 Rack-to-Runway Kit", "qty": 3, "unit": "ea", "notes": "1 per rack (transition from runway to rack top)" },
        { "item": "Harger 3/0 Ground Lug", "qty": 10, "unit": "ea", "notes": "1 per 10ft section for bonding per TIA-607" },
        { "item": "Corning CCH-01U Rack-Mount Fiber Enclosure 1RU", "qty": 1, "unit": "ea", "notes": "MDF end — MUST have enclosure at BOTH ends" },
        { "item": "Corning CCH-CP06-E4 LC Adapter Panel 6-Pack", "qty": 4, "unit": "ea", "notes": "24-strand ÷ 6 per pack = 4 panels (MDF end)" },
        { "item": "Corning 95-200-99 LC Fiber Splice-On Connector SM", "qty": 24, "unit": "ea", "notes": "1 per strand at MDF end (24-strand × 1)" },
        { "item": "Corning FT-SPLY-12 Fiber Splice Tray", "qty": 2, "unit": "ea", "notes": "Holds 12 splices each (24 strands ÷ 12)" },
        { "item": "Chatsworth 40250-719 Horizontal Cable Manager 2U", "qty": 4, "unit": "ea", "notes": "Between patch panels" },
        { "item": "Chatsworth 30130-719 Vertical Cable Manager 40U", "qty": 2, "unit": "ea", "notes": "Side-mount" }
      ],
      "grounding": { "tmgb": true, "tgb": true, "tbb_length_ft": 50 },
      "power": { "dedicated_circuits": 2, "ups_kva": 3, "generator": false },
      "hvac": { "dedicated": true, "tonnage": 1.5 },
      "observations": "Room shown as 10x12, adequate for 2 racks per TIA-569"
    },
    {
      "name": "IDF — Room 201",
      "type": "idf",
      "floor": "2",
      "room_number": "201",
      "building": "Main",
      "equipment": [
        { "item": "7ft Floor-Mount Cabinet (84\"H)", "qty": 1, "unit": "ea", "notes": "" },
        { "item": "Corning Rack-Mount Fiber Enclosure 1RU (CCH-01U)", "qty": 1, "unit": "ea", "notes": "IDF end — fiber enclosure REQUIRED at BOTH ends" },
        { "item": "Corning LC Adapter Panel 6-Pack (CCH-CP06-E4)", "qty": 4, "unit": "ea", "notes": "24-strand ÷ 6 per pack = 4 panels (IDF end)" },
        { "item": "Corning LC Fiber Splice-On Connector SM", "qty": 24, "unit": "ea", "notes": "1 per strand at IDF end (24-strand × 1)" },
        { "item": "Fiber Splice Tray", "qty": 2, "unit": "ea", "notes": "Holds 12 splices each (24 strands ÷ 12)" }
      ],
      "grounding": { "tmgb": false, "tgb": true, "tbb_length_ft": 25 },
      "power": { "dedicated_circuits": 1, "ups_kva": 1.5, "generator": false },
      "hvac": { "dedicated": false, "tonnage": 0 },
      "observations": "Remote IDF — must have fiber enclosure + adapter panels at this end too"
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

SPATIAL LAYOUT DATA (from floor plan analysis — use this to calculate zone-based run lengths):
${JSON.stringify(context.wave0?.SPATIAL_LAYOUT || {}, null, 2).substring(0, 10000)}

═══ OCR-EXTRACTED SCALE DATA (DETERMINISTIC — highest confidence) ═══
${(() => {
  const ocrData = context._ocrScaleData || [];
  const withScale = ocrData.filter(p => p.ftPerInch > 0);
  if (withScale.length === 0) return 'No OCR scale data available — use SPATIAL_LAYOUT scales above.';
  return 'These scales were extracted from the PDF text layer (not AI-estimated). USE THESE for distance calculations:\n' +
    withScale.map(p => '  Page ' + p.pageNum + ' (' + p.sheetId + '): ' + p.ftPerInch + ' ft/inch (' + p.scaleText + ')').join('\n');
})()}

BUILDING HEIGHTS: Ceiling=${context.ceilingHeight || 10}ft, Floor-to-Floor=${context.floorToFloorHeight || 14}ft

YOUR MISSION: Analyze ALL cable pathways, cable tray, underground routes, and estimate cable quantities WITH PER-ZONE RUN LENGTHS calculated to BICSI TDMM standards.

═══ CRITICAL: READ ALL NOTES ON EVERY PAGE ═══
Before counting anything, READ every General Note, Keynote, and annotation on each sheet.
Notes often contain critical scope information like:
- "Conduit provided by electrical contractor" → Do NOT include conduit in your quantities
- "Cable type shall be Cat6A plenum rated" → Use specified cable type
- "All cabling shall be home run to TR-101" → routing instruction
- "Provide 10ft service loop at each end" → affects run length calculation
- Installation method requirements, mounting heights, pathway specifications
Include ALL notes you find in the "notes" field of your response.

═══ CONDUIT SCOPE — IMPORTANT ═══
On many projects, conduit (EMT, rigid, PVC, etc.) is provided and installed by the ELECTRICAL CONTRACTOR, not the low-voltage contractor. READ THE NOTES to determine this. If the notes or specifications say conduit is by the electrical contractor or "by others", then:
- Still LIST the conduit runs for reference (the low-voltage contractor needs to know the pathway)
- Mark each conduit run with "by_others": true
- Do NOT include conduit in the low-voltage contractor's material quantities
- The low-voltage contractor only pulls cable through conduits provided by others

═══ CABLE RUN LENGTH CALCULATION — BICSI TDMM STANDARD ═══
For each cable type, break the run estimate down by ZONE (floor area served by one IDF):
- Use the Spatial Layout data above — it includes PER-SHEET scale and dimensions
- Use OCR scale data when available (it is more reliable than AI-estimated scale)
- Each zone has a "sheet_id" linking it to the correct sheet's scale and dimensions
- BICSI TDMM cable run formula per zone:
  1. Horizontal pathway distance = Manhattan distance × routing factor (1.30x for standard commercial, 1.40x for medical/govt)
     Manhattan distance: |zone_x - IDF_x| + |zone_y - IDF_y| (in feet, using that sheet's dimensions)
  2. Stub-up at device end: 10 ft (device up the wall into ceiling plenum — ~10 ft wall height)
  3. IDF drop: 20 ft (from ceiling plenum, through TR wall, down the rack to patch panel — ~20 ft)
  4. Service loop at TR: 10 ft (BICSI minimum for re-termination)
  5. Service loop at outlet: 1 ft (coiled in outlet box)
  6. Dressing/rack routing: 5 ft (cable management within rack)
  7. Riser (if cross-floor): floor-to-floor height × number of floors
  TOTAL = horizontal + stub-up(10) + IDF drop(20) + service loops(11) + dressing(5) + riser
- DO NOT use a flat average — calculate each zone separately

ZONE RUN LENGTH EXAMPLES (BICSI compliant):
- Zone directly next to IDF: 40ft horiz×1.3=52 + 10 stub + 20 drop + 11 loops + 5 dress = 98ft per drop
- Zone across the building: 140ft horiz×1.3=182 + 10 stub + 20 drop + 11 loops + 5 dress = 228ft per drop
- Zone one floor above IDF: 80ft horiz×1.3=104 + 14 riser + 10 stub + 20 drop + 11 loops + 5 dress = 164ft per drop
- TIA-568 horizontal limit: 295ft (90m permanent link — flag any zone exceeding this!)

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
5. Conduit sizing and fill calculations — AUDIT FIX #15: VERIFY NEC CHAPTER 9 CONDUIT FILL:
   - 1 cable: max 53% fill  |  2 cables: max 31% fill  |  3+ cables: max 40% fill
   - Use NEC Table 5 (conductor area) and Table 4 (conduit internal area)
   - Common fills: 3/4" EMT = 0.213 sq-in usable (40%), 1" = 0.346, 1-1/4" = 0.598, 2" = 1.342
   - Cat6A cable ~0.049 sq-in each → 3/4" EMT max 4 cables, 1" max 7, 1-1/4" max 12, 2" max 27
   - If conduit fill exceeds NEC maximum, flag as a code violation and recommend upsizing
   - Include fill calculation in conduit_runs output: { "fill_pct": 38, "nec_compliant": true }
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
          "basis": "Zone is ~150ft from IDF-2E horizontally × 1.30 routing + 10ft stub-up + 20ft IDF drop + 16ft slack/dressing"
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
    { "type": "fiber_sm_os2", "strand_count": 12, "runs": 3, "avg_length_ft": 300 }
  ],
  "pathways": [
    { "type": "cable_tray", "size": "12x4", "length_ft": 500, "location": "Above ceiling corridors" },
    { "type": "j_hooks", "count": 250, "spacing": "5ft OC" },
    { "type": "conduit_emt", "size": "1 inch", "length_ft": 200, "location": "Exposed walls" }
  ],
  "conduit_runs": [
    { "type": "EMT", "size": "1 inch", "length_ft": 200, "location": "Above ceiling - MDF to IDF", "purpose": "backbone fiber", "by_others": false },
    { "type": "EMT", "size": "3/4 inch", "length_ft": 400, "location": "Stub-ups to device locations", "purpose": "camera/reader drops", "by_others": true, "by_others_note": "Conduit provided by electrical contractor per General Note 5" },
    { "type": "PVC Sch 40", "size": "2 inch", "length_ft": 150, "location": "Underground parking lot to bldg entry", "purpose": "exterior camera feeds", "by_others": false },
    { "type": "Rigid", "size": "1 inch", "length_ft": 80, "location": "Exposed exterior wall", "purpose": "outdoor camera pathway", "by_others": false }
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
${context.isTransitRailroad ? `⚠️ TRANSIT/RAILROAD PROJECT — MANDATORY: Include ALL transit-specific costs (RWIC flagman, RPL insurance, TWIC/TSA, safety training, railroad escort, track-rated PPE, FRA approval, ROW permits, station coordination, specialty tools). Do NOT skip these — they are REAL costs that add 20-40% to project budget.` : ''}

YOUR MISSION: Identify EVERY special condition, subcontractor scope, equipment rental, civil work, traffic control, site preparation, and specialty item needed to COMPLETE this installation from start to finish.

═══ CRITICAL: PREVAILING WAGE DETECTION ═══
Search the specifications and drawings for ANY of these indicators that prevailing wage applies:
- "Davis-Bacon" or "Davis Bacon Act" → federal prevailing wage (Davis-Bacon)
- "Prevailing wage" or "prevailing rate of wages" → state prevailing wage
- "DIR" or "Department of Industrial Relations" or "DIR registered" → California state PW
- "Project Labor Agreement" or "PLA" → PLA rates (highest)
- "Certified payroll" or "certified payrolls required" → PW indicator
- "Wage determination" or "wage decision" → federal or state PW
- "Public works" or "publicly funded" → likely PW
- "State-funded" or "federally funded" → likely PW
- Government/public agency owner (VA, DOD, GSA, state, county, city, school district) → likely PW
You MUST include these as REQUIRED TOP-LEVEL fields in your JSON response:
  "prevailing_wage_detected": true/false (boolean — did you find ANY prevailing wage indicators?)
  "prevailing_wage_type": "davis-bacon" | "state-prevailing" | "pla" | "none" (string — which type?)
These two fields are MANDATORY and must appear at the top level of the JSON object. The validator will REJECT your response if they are missing.

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

5. EQUIPMENT RENTALS (all lifts: minimum 2-WEEK rental; certifier/splicer: 2-WEEK minimum):
   - Scissor lifts (electric indoor, rough-terrain outdoor) — $925/week, 2-week minimum
   - Boom lifts / articulating lifts (for high exterior work) — $1,700-$2,800/week, 2-week minimum
   - Safety harness + lanyard — $250/each, REQUIRED with EVERY lift (1 per crew member using lift)
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

8. SPECIALTY TOOLS & TESTING EQUIPMENT (use WEEKLY rental, minimum 2 weeks each):
   - Cable certifier (Fluke DSX/Versiv) — 2-week rental minimum (~$1,200/wk)
   - Fusion splicer + cleaver (for fiber termination) — 2-week rental minimum (~$1,500/wk)
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

15. TRAVEL & PER DIEM — ONLY if project is over 60 miles from ALL 3D offices:
    3D OFFICE LOCATIONS (check distance to the NEAREST one):
    - Rancho Cordova, CA (Sacramento area)
    - Livermore, CA (Bay Area)
    - Sparks, NV (Reno area)
    - McCall, ID
    ${context.nearestOfficeDistance ? `\n    ⚠️ COMPUTED DISTANCE: Project is ${context.nearestOfficeDistance} miles from nearest 3D office (${context.nearestOfficeName || 'unknown'}). ${context.nearestOfficeDistance <= 60 ? 'This is a LOCAL PROJECT — DO NOT include travel/hotel/per diem costs.' : 'Travel costs are required.'}` : ''}
    - If project is WITHIN 60 miles of ANY office → NO travel, NO hotel, NO per diem (local project)
    - If project is 60+ miles from ALL offices:
      - Hotel/lodging: $150-$250/night per worker (GSA rates)
      - Per diem meals: $60-$79/day per worker (GSA M&IE rate)
      - Vehicle rental + fuel
      - Weekend trips home (if > 2 weeks)
      - CALCULATE: (hotel + per_diem) × workers × project_days = travel subtotal

16. TRANSIT / RAILROAD / INFRASTRUCTURE-SPECIFIC (for Amtrak, BNSF, UP, light rail, metro, airport, DOT):
    CREW COMPLIANCE (per person × entire crew):
    - TWIC Card: $124/person (TSA credential, mandatory)
    - eRailSafe screening: $70/person (background + badge)
    - RWP Training (Roadway Worker Protection): $225/person
    - Drug & alcohol testing (DOT 10-panel): $120/person
    - Railroad safety vest (Class 3 hi-vis): $45/person
    - Railroad hard hat (color-coded): $35/person
    - TOTAL PER PERSON: $619 × crew size

    RWIC / FLAGMAN:
    - $125/hr billed rate, 4-hour minimum per day
    - $1,000/day typical (8-hour day)
    - Budget 1 RWIC per day for FULL project duration
    - TYPICAL: 30-60 days = $30,000-$60,000

    INSURANCE:
    - RRPLI (Railroad Protective Liability): 3% of contract value — MANDATORY
    - Additional insured endorsements: 1% of contract value
    - Railroad will NOT issue NTP without active RRPLI policy

    EQUIPMENT (all lifts & specialty tools: minimum 2-WEEK rental):
    - Hi-rail vehicle: $1,000/day (trackside work, ~40% of project days)
    - Scissor lift: $925/week (2-week minimum), Boom 40-60': $1,700/week, Boom 60-80': $2,800/week
    - Safety harness + lanyard: $250/each — REQUIRED with EVERY lift (1 per crew member using lift)
    - Cable certifier (Fluke DSX): $1,200/week (2-week minimum)
    - Fusion splicer kit: $1,500/week (2-week minimum)
    - Generator (trackside power): $325/day + $250 delivery
    - Fall protection equipment: $500/project

    MATERIAL PREMIUMS:
    - Vandal-resistant IK10 camera housings: $500/each
    - NEMA 4X outdoor enclosures: $850/each
    - Seismic bracing per rack/cabinet: $1,150/each
    - Emergency blue light phone: $18,500/each installed
    - Tamper-proof hardware: 3% adder on material
    - Rigid conduit premium (transit mandates rigid over EMT): 15% material adder
    - UV-rated outdoor cable: 8% material adder
    - Cable tray with covers: $38/LF installed

    LABOR PREMIUMS:
    - Restricted work window premium (nights/weekends): 15% of field labor
    - Standby / escort wait time: 10% of field labor cost
    - Daily safety briefings: 30 min per crew per day (paid time)
    - Multiple mobilizations: $1,500 per trip (1 per 5 work days)

    TESTING & DOCUMENTATION:
    - OTDR fiber testing: $35/strand ($650 min mobilization)
    - Copper cable certification: $22/cable (Fluke DSX)
    - As-built drawing preparation: $135/sheet
    - O&M manual preparation: $3,500/system
    - Training: multiple sessions for railroad operations staff

    CIVIL / SITE WORK (all subcontracted):
    - Saw cutting concrete: $8/LF, asphalt: $4.50/LF ($350 min callout)
    - Trenching 24": $18/LF, 36": $24/LF (transit heavy: $95-$281/LF)
    - Directional boring 2": $24/LF, 4": $34/LF ($3,500 mob)
    - Concrete restoration: $16/SF, asphalt: $12/SF
    - Duct bank 2-way: $80/LF, handhole: $1,600/each
    - Bollard install: $1,000/each, ADA dome: $475/each
    - Concrete pad: $575/CY, core drill 4": $100/hole

    MOBILIZATION / DEMOBILIZATION:
    - 4% of contract value (standard)
    - Multiple mob trips: ~$1,500/trip × 1 per 5 work days

17. SPECIALTY INSURANCE & BONDING:
    - Railroad Protective Liability (RPL/RRPLI): 3% of contract — MANDATORY for rail
    - Owners Protective Liability (OPL)
    - Additional insured endorsements: 1% of contract
    - Performance bond (typically 2% of contract)
    - Payment bond
    - Builder's risk insurance
    - Umbrella/excess liability (railroad minimums are high)

CRITICAL: Be EXHAUSTIVE. If you see ANY exterior conduit runs, underground pathways, parking lot crossings, road crossings, or rooftop equipment on the plans, you MUST include the associated civil work, trenching, boring, traffic control, and restoration. Missing these items leads to MASSIVE cost overruns.

CRITICAL — OUT-OF-TOWN PROJECTS: If the project location is NOT within 60 miles of ANY 3D office (Rancho Cordova CA, Livermore CA, Sparks NV, McCall ID), travel & per diem is MANDATORY. If the project IS within 60 miles of any office, DO NOT include travel costs — it is a local project.
${context.nearestOfficeDistance !== undefined ? `COMPUTED: Project is ${context.nearestOfficeDistance} miles from ${context.nearestOfficeName || 'nearest office'}. ${context.nearestOfficeDistance <= 60 ? '⚠️ LOCAL PROJECT — NO TRAVEL COSTS.' : 'Travel costs required.'}` : ''}

CRITICAL — TRANSIT/RAILROAD PROJECTS: If the project is for Amtrak, BNSF, a transit authority, or any railroad, you MUST include ALL of the above transit costs. Transit adders typically add 25-45% to the base bid. Missing RWIC alone = $30K-$80K. Missing RRPLI = $15K-$50K. Missing crew compliance = $3K-$5K. Missing hi-rail = $10K-$30K. DO NOT leave money on the table.

Return ONLY valid JSON:
{
  "prevailing_wage_detected": false,
  "prevailing_wage_type": "none",
  "equipment_rentals": [
    { "item": "Scissor Lift", "duration_weeks": 2, "weekly_rate": 925, "reason": "Ceiling height 15ft+" },
    { "item": "Safety Harness + Lanyard", "qty": 2, "unit_cost": 250, "reason": "REQUIRED with every lift — 1 per crew member using lift" },
    { "item": "Cable Certifier (Fluke DSX)", "duration_weeks": 2, "weekly_rate": 1200, "reason": "Cat 6/6A certification per TIA" },
    { "item": "Fusion Splicer Kit", "duration_weeks": 2, "weekly_rate": 1500, "reason": "Fiber optic splicing & termination" }
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
  "transit_railroad_checklist": {
    "applicable": ${context.isTransitRailroad ? 'true' : 'false'},
    "_instructions": "For EVERY item below, set checked=true and fill qty/cost if the item applies to this project. Set checked=false ONLY if you verified it is truly not needed. Do NOT skip items — check ALL 40+.",

    "crew_compliance": {
      "crew_size": 0,
      "twic_cards":          { "checked": false, "qty": 0, "unit_cost": 124,  "total": 0, "note": "" },
      "erailsafe_screening": { "checked": false, "qty": 0, "unit_cost": 70,   "total": 0, "note": "" },
      "rwp_training":        { "checked": false, "qty": 0, "unit_cost": 225,  "total": 0, "note": "" },
      "drug_alcohol_test":   { "checked": false, "qty": 0, "unit_cost": 120,  "total": 0, "note": "" },
      "safety_vests":        { "checked": false, "qty": 0, "unit_cost": 45,   "total": 0, "note": "" },
      "hard_hats":           { "checked": false, "qty": 0, "unit_cost": 35,   "total": 0, "note": "" }
    },
    "rwic_flagman": {
      "checked": false, "days": 0, "daily_rate": 1000, "total": 0,
      "note": "1 RWIC per day for full project duration — mandatory for all trackside work"
    },
    "insurance": {
      "rrpli":               { "checked": false, "pct": 0.03, "base_value": 0, "total": 0, "note": "3% of contract — mandatory" },
      "additional_insured":  { "checked": false, "pct": 0.01, "base_value": 0, "total": 0, "note": "1% of contract" },
      "builders_risk":       { "checked": false, "est_cost": 0, "note": "" },
      "umbrella_excess":     { "checked": false, "est_cost": 0, "note": "" }
    },
    "equipment": {
      "hirail_vehicle":      { "checked": false, "days": 0, "daily_rate": 1000, "total": 0, "note": "Required for trackside work" },
      "scissor_lift":        { "checked": false, "weeks": 2, "weekly_rate": 925,  "total": 0, "note": "2-week minimum rental" },
      "boom_lift_40_60":     { "checked": false, "weeks": 2, "weekly_rate": 1700, "total": 0, "note": "2-week minimum rental" },
      "boom_lift_60_80":     { "checked": false, "weeks": 2, "weekly_rate": 2800, "total": 0, "note": "2-week minimum rental" },
      "safety_harness":      { "checked": false, "qty": 0, "unit_cost": 250, "total": 0, "note": "Full-body harness + lanyard — REQUIRED with every lift" },
      "generator":           { "checked": false, "days": 0, "daily_rate": 325,  "total": 0, "note": "Trackside power" },
      "fall_protection":     { "checked": false, "est_cost": 500, "note": "" }
    },
    "material_premiums": {
      "vandal_housings_ik10":    { "checked": false, "qty": 0, "unit_cost": 500,   "total": 0, "note": "IK10 vandal-resistant camera housings" },
      "nema4x_enclosures":       { "checked": false, "qty": 0, "unit_cost": 850,   "total": 0, "note": "Outdoor/trackside enclosures" },
      "seismic_bracing":         { "checked": false, "qty": 0, "unit_cost": 1150,  "total": 0, "note": "Per rack/cabinet" },
      "emergency_phones":        { "checked": false, "qty": 0, "unit_cost": 18500, "total": 0, "note": "Blue light tower stations" },
      "blast_film":              { "checked": false, "qty": 0, "unit_cost": 590,   "total": 0, "note": "Security film per window" },
      "tamper_proof_hardware":   { "checked": false, "pct_adder": 0.03, "base_material": 0, "total": 0, "note": "" },
      "rigid_conduit_premium":   { "checked": false, "pct_adder": 0.15, "base_material": 0, "total": 0, "note": "Transit mandates rigid over EMT" },
      "uv_cable_premium":        { "checked": false, "pct_adder": 0.08, "base_material": 0, "total": 0, "note": "UV-rated outdoor cable" },
      "cable_tray_covered":      { "checked": false, "qty_lf": 0, "unit_cost": 38,  "total": 0, "note": "Aluminum with covers" }
    },
    "labor_premiums": {
      "work_window_premium":     { "checked": false, "pct": 0.15, "base_labor": 0, "total": 0, "note": "Night/weekend restricted windows" },
      "standby_escort_time":     { "checked": false, "pct": 0.10, "base_labor": 0, "total": 0, "note": "Waiting for track access" },
      "daily_safety_briefings":  { "checked": false, "crew_size": 0, "days": 0, "hrs_per_day": 0.5, "hourly_rate": 125, "total": 0 },
      "multiple_mobilizations":  { "checked": false, "trips": 0, "cost_per_trip": 1500, "total": 0, "note": "1 per 5 work days" }
    },
    "civil_work": {
      "saw_cutting_concrete":    { "checked": false, "qty_lf": 0, "unit_cost": 8.00,  "total": 0 },
      "saw_cutting_asphalt":     { "checked": false, "qty_lf": 0, "unit_cost": 4.50,  "total": 0 },
      "trenching_24in":          { "checked": false, "qty_lf": 0, "unit_cost": 18,    "total": 0 },
      "trenching_36in":          { "checked": false, "qty_lf": 0, "unit_cost": 24,    "total": 0 },
      "trenching_transit_heavy": { "checked": false, "qty_lf": 0, "unit_cost": 95,    "total": 0, "note": "Railroad corridor" },
      "directional_bore_2in":    { "checked": false, "qty_lf": 0, "unit_cost": 24,    "total": 0 },
      "directional_bore_4in":    { "checked": false, "qty_lf": 0, "unit_cost": 34,    "total": 0 },
      "bore_mobilization":       { "checked": false, "qty": 0,    "unit_cost": 3500,  "total": 0 },
      "concrete_restoration":    { "checked": false, "qty_sf": 0, "unit_cost": 16,    "total": 0 },
      "asphalt_restoration":     { "checked": false, "qty_sf": 0, "unit_cost": 12,    "total": 0 },
      "duct_bank_2way":          { "checked": false, "qty_lf": 0, "unit_cost": 80,    "total": 0 },
      "handholes":               { "checked": false, "qty": 0,    "unit_cost": 1600,  "total": 0 },
      "bollards":                { "checked": false, "qty": 0,    "unit_cost": 1000,  "total": 0 },
      "ada_truncated_domes":     { "checked": false, "qty": 0,    "unit_cost": 475,   "total": 0 },
      "concrete_pads":           { "checked": false, "qty_cy": 0, "unit_cost": 575,   "total": 0 },
      "core_drilling":           { "checked": false, "qty": 0,    "unit_cost": 100,   "total": 0 }
    },
    "conduit_raceway": {
      "rigid_075":               { "checked": false, "qty_lf": 0, "unit_cost": 14, "total": 0 },
      "rigid_100":               { "checked": false, "qty_lf": 0, "unit_cost": 17, "total": 0 },
      "rigid_125":               { "checked": false, "qty_lf": 0, "unit_cost": 20, "total": 0 },
      "rigid_200":               { "checked": false, "qty_lf": 0, "unit_cost": 26, "total": 0 }
    },
    "testing_documentation": {
      "otdr_fiber_testing":      { "checked": false, "qty_strands": 0, "unit_cost": 35, "mobilization": 650, "total": 0 },
      "copper_certification":    { "checked": false, "qty_cables": 0,  "unit_cost": 22, "total": 0 },
      "asbuilt_drawings":        { "checked": false, "qty_sheets": 0,  "unit_cost": 135, "total": 0 },
      "om_manuals":              { "checked": false, "qty_systems": 0, "unit_cost": 3500, "total": 0 },
      "training_sessions":       { "checked": false, "qty_sessions": 0, "hrs_per_session": 4, "total": 0 }
    },
    "mobilization": {
      "initial_mob":             { "checked": false, "pct": 0.04, "base_value": 0, "total": 0 },
      "performance_bond":        { "checked": false, "pct": 0.02, "base_value": 0, "total": 0 }
    },
    "permits": {
      "row_permit":              { "checked": false, "est_cost": 0, "note": "Railroad right-of-way permit" },
      "encroachment_permit":     { "checked": false, "est_cost": 0, "note": "" },
      "building_permit":         { "checked": false, "est_cost": 0, "note": "" },
      "excavation_permit":       { "checked": false, "est_cost": 0, "note": "" },
      "fire_marshal_inspection": { "checked": false, "est_cost": 0, "note": "" },
      "fra_compliance":          { "checked": false, "est_cost": 0, "note": "" },
      "utility_locates":         { "checked": false, "est_cost": 0, "note": "811/USA North" }
    },
    "checklist_grand_total": 0,
    "checklist_items_checked": 0,
    "checklist_items_total": 55,
    "checklist_note": "Every item above MUST be evaluated. If an item doesn't apply, mark checked=false. If it applies, fill in qty and cost. The Formula Engine adds percentage-based items (RRPLI, insurance, mob, labor premiums) automatically — but you MUST identify plan-specific quantities (bollards, trenching LF, camera housings, windows for blast film, conduit LF, etc.) from the drawings."
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
    { "description": "Owner may require additional conduit pathway not shown on plans for future AV rough-in", "estimated_impact": "$3,000-$6,000", "severity": "medium", "justification": "Specs mention 'future AV provisions' but no conduit pathways are shown on drawings — this scope is not in the contract documents and will likely be added during construction", "recommendation": "Submit RFI asking owner to confirm AV rough-in scope before bid — if confirmed, price as add-alternate", "cost_breakdown": "100ft EMT conduit + fittings: $800, pull boxes (3): $450, labor 12hrs @ $145/hr: $1,740, overhead: $1,010", "discipline": "Structured Cabling", "contract_reference": "Spec Section 27 41 00 — Audio-Visual Systems" },
    { "description": "Unforeseen underground utility conflict at north parking lot crossing", "estimated_impact": "$5,000-$12,000", "severity": "high", "justification": "Site plans show an approximate utility crossing but no potholing or survey was performed — actual conditions cannot be known until excavation begins, making this a legitimate change order risk", "recommendation": "Include exclusion in proposal stating 'Bid assumes no underground utility conflicts — relocations or reroutes will be billed as change order'", "cost_breakdown": "Potholing/survey: $2,000, reroute labor 24hrs: $3,480, additional boring/trenching: $2,000-$6,500", "discipline": "Site/Civil", "contract_reference": "Site Plan Sheet C-1" }
  ]
}

CRITICAL — true_change_orders RULES:
These are ONLY items that are NOT in the plans, NOT in the specs, and NOT in the contract scope. They are risks that may arise DURING construction due to:
- Ambiguous or incomplete contract documents
- Conditions that cannot be known until construction begins (underground conflicts, concealed conditions)
- Owner-requested additions not in the original scope
- Code requirements discovered during construction that were not addressed in design
- Design gaps where the plans show something but lack sufficient detail to bid accurately
Do NOT put items here that ARE on the plans or in the specs — those belong in the bid estimate.
Each item MUST have ALL of these fields:
- description: Clear statement of what the change order IS
- estimated_impact: Dollar range (e.g. "$3,000-$6,000")
- severity: critical/high/medium/low
- justification: Detailed explanation of WHY this will become a change order — what's missing, what code requires it, what site condition triggers it
- recommendation: Actionable advice — what should 3D do about it (submit RFI, add exclusion, price as alternate, etc.)
- cost_breakdown: Itemized breakdown of material, labor hours, rates, and overhead that make up the estimated impact
- discipline: Which trade/discipline this falls under (Structured Cabling, Fire Alarm, Security, Access Control, Site/Civil, etc.)
- contract_reference: Spec section number, drawing sheet, or code reference where the gap or conflict exists`,

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
            if (dLower.includes('access') && (kl.includes('reader') || kl.includes('access') || kl.includes('door') || kl.includes('contact') || kl.includes('strike') || kl.includes('maglock') || kl.includes('intercom'))) return true;
            if (dLower.includes('access') && kl.includes('rex') && !kl.includes('reader')) return true;
            if (dLower.includes('fire') && (kl.includes('smoke') || kl.includes('fire') || kl.includes('pull') || kl.includes('horn') || kl.includes('strobe') || kl.includes('duct') || kl.includes('heat'))) return true;
            if (dLower.includes('audio') && (kl.includes('display') || kl.includes('projector') || kl.includes('microphone'))) return true;
            if (dLower.includes('audio') && kl.includes('speaker') && !kl.includes('glass') && !kl.includes('break')) return true;
            if (dLower.includes('audio') && kl.includes('av') && !kl.includes('wave') && !kl.includes('cavity')) return true;
            if (dLower.includes('intrusion') && (kl.includes('motion') || kl.includes('intrusion') || kl.includes('siren'))) return true;
            if (dLower.includes('intrusion') && kl.includes('glass') && kl.includes('break')) return true;
            if (dLower.includes('intrusion') && kl.includes('keypad') && !kl.includes('reader') && !kl.includes('access')) return true;
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

═══ SELECTED DISCIPLINES ═══
${disciplineChecklist}

⚠️ IMPORTANT: The disciplines above are the USER-SELECTED disciplines. However, NOT ALL of them may be in YOUR scope.
Check the SCOPE EXCLUSION SCANNER RESULTS below. If the Responsibility Matrix says a discipline is "NOT OUR SCOPE"
(assigned to another trade like SEC, AV, EC, Owner, GC, NC), you MUST SKIP that discipline entirely — create ZERO line items for it.
Only price disciplines where the Responsibility Matrix confirms they are IN OUR SCOPE (assigned to TC / Telecom Contractor).

═══ VERIFIED DEVICE COUNTS (from Triple-Read Consensus — USE THESE EXACT QUANTITIES) ═══
${JSON.stringify(consensusCounts, null, 2).substring(0, 5000)}

═══ OUTLET BREAKDOWN (for faceplate sizing — CRITICAL) ═══
${(() => {
  const ob = context.wave1_75?.CONSENSUS_ARBITRATOR?.outlet_breakdown
    || context.wave1?.SYMBOL_SCANNER?.outlet_breakdown;
  if (ob) {
    return `The following shows how many OUTLET LOCATIONS use each port multiplier:
${JSON.stringify(ob, null, 2)}
FACEPLATE SIZING RULES:
- Each "1D" location needs a 1-Port faceplate
- Each "2D" location needs a 2-Port faceplate (this is the most common)
- Each "4D" location needs a 4-Port faceplate
- Each "6D" location needs a 6-Port faceplate
- Generate SEPARATE faceplate line items for each port size (do NOT use a single faceplate type for all)
- WAPs do NOT need faceplates — they mount directly to cable`;
  }
  return 'No outlet breakdown available — default to 2-Port faceplates for all data outlet locations (most common in commercial construction). WAPs do NOT need faceplates.';
})()}

═══ EQUIPMENT SCHEDULE DATA (AUTHORITATIVE — overrides symbol counts if present) ═══
${(() => {
  const schedData = context.wave1?.ANNOTATION_READER?.schedule_data;
  if (schedData && Object.keys(schedData).length > 0) {
    return `The following equipment schedule was extracted from the drawings. These are the ARCHITECT'S DEFINITIVE quantities.
If the schedule says 56 cameras, that is the correct count — even if symbol counting found a different number.
SCHEDULE DATA:
${JSON.stringify(schedData, null, 2).substring(0, 4000)}

RULES FOR SCHEDULE vs. SYMBOL CONFLICTS:
- Schedule counts ALWAYS win over symbol counts — NO EXCEPTIONS
- Do NOT add symbol-counted devices ON TOP of schedule devices — they are the SAME devices
- If the schedule specifies model numbers or type codes (C-FD, C-ML, C-FE, C-DL, etc.), map each code to the correct product category and price each type separately
- EVERY row in the schedule must appear as a line item in your BOM — if the camera schedule has 4 camera types, your BOM must have 4 camera line items
- If the schedule has a "Card Reader" count of 15 and an "Electric Strike" count of 15, your Access Control section MUST have 15 readers AND 15 strikes
- SPARE EQUIPMENT: If the schedule or keynotes say "provide spare cameras", "spare card readers", etc., ADD those as separate BOM line items

MANUFACTURER / MODEL MATCHING (CRITICAL FOR BID ACCURACY):
- If the schedule, specs, or keynotes specify an EXACT manufacturer and model (e.g., "Axis P3265-LVE", "HID iCLASS SE R40", "Corning 760109046"),
  use THAT EXACT product in your BOM — set "mfg" and "partNumber" to match the specified product
- Do NOT substitute generic products (e.g., "Generic 4MP Dome") when the plans specify exact models
- If a "basis of design" product is listed with "or approved equal", use the basis of design product as your primary line item
- Price the SPECIFIED product, not a cheaper/different alternative — the bid must match the spec
- If you cannot identify the exact price for a specified product, use the pricing tier for that category but keep the correct mfg/partNumber`;
  }
  return 'No equipment schedule found — use consensus counts above as primary source.';
})()}

DETAILED SYMBOL DATA (for reference — schedule and consensus quantities take priority):
${JSON.stringify(context.wave1?.SYMBOL_SCANNER?.sheets || context.wave1?.SYMBOL_SCANNER || {}, null, 2).substring(0, 5000)}

ANNOTATION NOTES (check for OFCI / OFOI / NIC / BY OTHERS exclusions):
${(() => {
  const annotations = context.wave1?.ANNOTATION_READER?.annotations || [];
  const exclusionKeywords = [
    'furnished', 'ofci', 'ofoi', 'owner furnished', 'owner installed',
    'by others', 'by ec', 'by electrical', 'by owner', 'not in contract',
    'nic', 'provided by', 'vendor furnished', 'vendor supplied',
    'existing to remain', 'reuse existing', 'furnished by general',
    'furnished by mechanical', 'grounding by ec', 'grounding by electrical'
  ];
  const ofci = annotations.filter(a => {
    const txt = (a.text || '').toLowerCase();
    return exclusionKeywords.some(kw => txt.includes(kw));
  });
  if (ofci.length > 0) {
    return `⚠️ EXCLUSION ITEMS FOUND — Read each carefully and apply the correct treatment:
- OFCI (Owner Furnished, Contractor Installed) → material = $0, include labor only
- OFOI (Owner Furnished, Owner Installed) → EXCLUDE ENTIRELY (no material, no labor)
- NIC / By Others / By EC → EXCLUDE ENTIRELY from our scope
- "Provided by owner" / "vendor furnished" → material = $0

EXCLUSION ANNOTATIONS FROM DRAWINGS:
${ofci.map(a => `- ${a.text} [Sheet: ${a.sheet || 'unknown'}]`).join('\n')}

CRITICAL: If cameras/mounts/VMS are owner furnished AND owner installed, we price ONLY the cabling to camera locations. Do NOT include cameras, mounts, NVR, VMS software, or licenses in our BOM.
If network switches/PDUs are owner provided, EXCLUDE them from our BOM entirely.
If grounding is by EC (electrical contractor), EXCLUDE grounding busbars (TMGB/TGB) and bonding conductors.`;
  }
  return 'No OFCI/exclusion annotations found from Annotation Reader.';
})()}

═══ SCOPE EXCLUSION SCANNER RESULTS (dedicated per-page exclusion analysis) ═══
${(() => {
  const scopeData = context.wave1?.SCOPE_EXCLUSION_SCANNER || {};
  const exclusions = scopeData.exclusions || [];
  const respMatrix = scopeData.responsibility_matrix || [];
  const scopeBounds = scopeData.scope_boundaries || [];

  if (exclusions.length === 0 && respMatrix.length === 0 && scopeBounds.length === 0) {
    return 'No scope exclusions found by dedicated scanner — price all items as contractor-furnished.';
  }

  let result = `⚠️ ═══ MANDATORY EXCLUSIONS — YOU MUST APPLY THESE ═══\n`;
  result += `The Scope Exclusion Scanner found ${exclusions.length} exclusion(s), ${respMatrix.length} responsibility assignment(s), and ${scopeBounds.length} scope boundary note(s).\n\n`;

  if (exclusions.length > 0) {
    result += `EXCLUSION ITEMS (apply the treatment listed for each):\n`;
    for (const e of exclusions) {
      result += `- [${e.treatment}] ${e.item} (${e.category}): "${e.annotation_text}" [Sheet: ${e.sheet_id}]\n`;
      result += `  → ACTION: ${e.impact}\n`;
    }
    result += '\n';
  }

  if (respMatrix.length > 0) {
    result += `\n🚨 RESPONSIBILITY MATRIX — THIS IS THE AUTHORITY ON WHAT YOU PRICE 🚨\n`;
    result += `The following was extracted from the project's Responsibility Matrix (typically sheet T-0.0).\n`;
    result += `This is the ARCHITECT'S DEFINITIVE scope assignment. It OVERRIDES the completeness checklist.\n\n`;
    const inScope = respMatrix.filter(r => r.our_scope);
    const outScope = respMatrix.filter(r => !r.our_scope);
    if (inScope.length > 0) {
      result += `✅ IN OUR SCOPE (price these fully with completeness checklist):\n`;
      for (const r of inScope) {
        result += `  ✅ ${r.discipline}: ${r.responsible_party} — PRICE THIS\n`;
      }
      result += '\n';
    }
    if (outScope.length > 0) {
      result += `🚫 NOT OUR SCOPE (create ZERO line items for these — NO EXCEPTIONS):\n`;
      for (const r of outScope) {
        result += `  🚫 ${r.discipline}: ${r.responsible_party} — DO NOT PRICE, DO NOT INCLUDE\n`;
      }
      result += '\n';
    }
  }

  if (scopeBounds.length > 0) {
    result += `SCOPE BOUNDARY NOTES:\n`;
    for (const s of scopeBounds) {
      result += `- [Sheet ${s.sheet_id}]: "${s.text}"\n  → ${s.interpretation}\n`;
    }
  }

  result += `\nCRITICAL RULES FOR APPLYING EXCLUSIONS:
- OFCI items: Set unit_cost to $0, keep the line item for labor tracking
- OFOI items: REMOVE the line item entirely from the BOM
- NIC / By Others / By EC items: REMOVE entirely from the BOM
- If an entire DISCIPLINE is excluded (e.g., Fire Alarm by Div 26), create NO line items for that discipline
- If cameras are OFOI but cabling is in scope: price ONLY cable, conduit, J-hooks, backboxes to camera locations
- If grounding is by EC: REMOVE TMGB, TGB, bonding conductors, ground lugs
- If switches/PDUs are owner furnished: REMOVE from BOM, keep rack space`;

  return result;
})()}

MDF/IDF ROOMS & EQUIPMENT:
${JSON.stringify(context.wave1?.MDF_IDF_ANALYZER || {}, null, 2).substring(0, 4000)}

CABLE QUANTITIES & PATHWAYS (zone-by-zone run lengths — DO NOT use flat averages if this data exists):
${JSON.stringify(context.wave1?.CABLE_PATHWAY || {}, null, 2).substring(0, 16000)}

SPATIAL LAYOUT (scale per sheet, building dimensions — use for cable run verification):
${JSON.stringify(context.wave0?.SPATIAL_LAYOUT || {}, null, 2).substring(0, 6000)}

═══ RATE LIBRARY — KNOWN-GOOD PRICES FROM PAST PROJECTS (HIGHEST PRIORITY) ═══
${(() => {
  const rates = context.rateLibrary || [];
  if (rates.length === 0) return 'No rate library entries — use pricing database below.';
  let result = 'These are REAL prices from completed projects — verified by the estimator. Use these INSTEAD of the generic pricing database when a match exists.\n\n';
  const byCategory = {};
  for (const r of rates) {
    const cat = r.category || 'Uncategorized';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(r);
  }
  for (const [cat, items] of Object.entries(byCategory)) {
    result += cat + ':\n';
    for (const r of items.slice(0, 30)) {
      result += '  - ' + r.item_name + ': $' + r.unit_cost + '/' + (r.unit || 'ea');
      if (r.labor_hours) result += ' (labor: ' + r.labor_hours + ' hrs)';
      if (r.supplier) result += ' [' + r.supplier + ']';
      if (r.notes) result += ' — ' + r.notes;
      result += '\n';
    }
  }
  result += '\nRULE: If a rate library entry matches an item you are pricing, use the rate library price. It is more accurate than the generic database.';
  return result;
})()}

═══ COST BENCHMARKS — Historical averages from completed projects (feedback loop) ═══
${(() => {
  const bm = context.costBenchmarks || [];
  if (bm.length === 0) return 'No historical benchmarks yet — enter project actuals after completion to build this database.';
  let result = 'These are AGGREGATED costs from completed projects. Use as a SANITY CHECK — if your price is 2x the benchmark, verify.\n\n';
  const byCategory = {};
  for (const b of bm) {
    const cat = b.category || 'General';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(b);
  }
  for (const [cat, items] of Object.entries(byCategory)) {
    result += cat + ':\n';
    for (const b of items.slice(0, 20)) {
      result += '  - ' + b.item_name + ': avg $' + (b.avg_unit_cost || 0).toFixed(2);
      result += ' (range $' + (b.min_unit_cost || 0).toFixed(2) + '-$' + (b.max_unit_cost || 0).toFixed(2) + ')';
      if (b.avg_labor_hours) result += ' labor: ' + b.avg_labor_hours.toFixed(2) + ' hrs';
      result += ' [' + (b.sample_count || 0) + ' projects]\n';
    }
  }
  return result;
})()}

═══ DISTRIBUTOR PRICE CACHE — Recent quotes from Graybar/Anixter/WESCO/ADI ═══
${(() => {
  const prices = context.distributorPrices || [];
  if (prices.length === 0) return 'No cached distributor prices available.';
  let result = 'These are REAL quotes from distributors. Use when available — more current than generic database.\n\n';
  const byDist = {};
  for (const p of prices) {
    const dist = p.distributor || 'Unknown';
    if (!byDist[dist]) byDist[dist] = [];
    byDist[dist].push(p);
  }
  for (const [dist, items] of Object.entries(byDist)) {
    result += dist + ':\n';
    for (const p of items.slice(0, 25)) {
      result += '  - ' + p.item_name;
      if (p.manufacturer) result += ' (' + p.manufacturer;
      if (p.part_number) result += ' ' + p.part_number;
      if (p.manufacturer) result += ')';
      result += ': $' + p.unit_cost + '/' + (p.unit || 'ea');
      if (p.quote_date) result += ' [quoted ' + p.quote_date + ']';
      result += '\n';
    }
  }
  return result;
})()}

PRICING DATABASE (use these prices when no rate library or distributor cache match exists):
${context.pricingContext || 'Use industry standard pricing'}

═══ PRICING GUARDRAILS (HARD LIMITS — violations will be rejected) ═══
These are maximum allowable unit costs. If your calculated cost exceeds these, use the maximum listed.
Even for transit-rated, ruggedized, or specialty items, the multiplier must not exceed 2.5× the premium tier.

| Equipment Type | Max Unit Cost |
|---------------|---------------|
| Fixed Dome Camera (indoor) | $1,300 |
| Fixed Dome Camera (outdoor) | $1,800 |
| PTZ Camera (outdoor) | $8,750 |
| Multi-sensor Panoramic 180° | $7,000 |
| Multi-sensor Fisheye 360° | $8,750 |
| LPR/ANPR Camera | $8,000 |
| NVR/VMS Server | $16,250 |
| PoE Switch 8-port | $950 |
| PoE Switch 24-port | $2,375 |
| PoE Switch 48-port | $3,750 |
| Access Control Panel 2-door | $2,125 |
| Card Reader | $1,200 |
| Electric Strike | $700 |
| Surveillance Monitor 22" | $1,125 |
| Surveillance Monitor 32" | $1,875 |
| Camera Pole 20ft | $3,000 |
| Patch Panel 48-port | $650 |

Formula: Max = PRICING_DB premium price × 2.5 (accounts for transit-rated/ruggedized)
If your unit cost exceeds the max, CLAMP it to the max value.

CRITICAL RULES:
1. You MUST create a category for EVERY discipline listed above — do NOT skip any discipline that has devices in the consensus counts or symbol data
2. EQUIPMENT SCHEDULE IS THE SINGLE SOURCE OF TRUTH:
   - If the schedule says "C-FD Fixed Dome: 24, C-ML Multi-Lens: 6, C-FE Fisheye: 6, C-DL Dual-Lens: 6" you price EXACTLY those types and quantities
   - Map each schedule code/type to the correct product (e.g., C-FD = fixed dome, C-ML = multi-lens panoramic, C-FE = fisheye 360, C-DL = dual-lens)
   - Do NOT collapse different camera types into fewer types — if the schedule lists 4 camera types, price 4 camera types
   - If schedule says "Card Reader: 15, Electric Strike: 15, DPS: 15, REX: 15" then price EXACTLY 15 of each — not 10, not 12
   - NEVER reduce schedule quantities — the architect counted these, you price them
3. If NO schedule exists, use consensus counts: if consensus says 24 cameras, price EXACTLY 24 cameras
4. For Access Control (Div 28 + Div 08 Openings): include controllers, card readers, door contacts, REX devices, electric strikes/maglocks, power transfer hinges, delayed egress devices, auto-operators, door position switches, gate operators, barrier arms, vehicle detection loops, cabling, and power supplies — the DOOR COUNT must match the schedule or consensus exactly
5. For each camera or access point, include mounting hardware, cable, connectors, and associated head-end equipment (NVR, switches, license)
6. Use the EXACT prices from the pricing database. Apply the ${regionMult}× regional multiplier to all unit costs
7. Calculate: Qty × Unit Cost × ${regionMult} = Extended Cost (VERIFY YOUR MATH on every single row)
8. Include ALL MDF/IDF equipment: racks, patch panels, UPS, grounding busbars (TMGB/TGB), cable management
9. Include backbone/riser cables from CABLE QUANTITIES section — do NOT omit fiber or copper backbone
10. Cable quantities: Use the CABLE_PATHWAY brain's calculated per-zone averages. If unavailable, use 200ft average for commercial buildings over 20,000 SF, 225ft for VA/government clinics, 150ft ONLY for small offices under 10,000 SF. NEVER use a flat 150ft for large buildings — it will underbid cable by 30-50%
11. OFCI / OFOI / NIC / BY OTHERS — CRITICAL EXCLUSION RULES:
    - OFCI (Owner Furnished, Contractor Installed): Set material cost to $0 — include LABOR ONLY
    - OFOI (Owner Furnished, Owner Installed): EXCLUDE ENTIRELY — no material, no labor
    - NIC (Not In Contract) / "By Others" / "By EC" / "By Electrical Contractor": EXCLUDE ENTIRELY
    - "Provided by owner" / "vendor furnished" / "furnished by others": Set material to $0
    - Network switches, PDUs, UPS marked as owner-provided: EXCLUDE from material BOM
    - If drawings show cameras as OFOI but cabling is in our scope, price ONLY the cabling (no cameras, no mounts, no NVR, no VMS)
    - CHECK EVERY ITEM against the OFCI/exclusion list below — missing an exclusion means we're pricing items we don't furnish
12. NEVER exceed the pricing guardrail maximums listed above — clamp to the max if your calculation is higher
13. SPARE EQUIPMENT — If drawing keynotes or specs require spare devices (e.g., "provide spare cameras of each type", "spare card readers", "spare power supplies"), you MUST include them as separate line items in the BOM. Label them clearly as "SPARE — [device name]". Spares are NOT optional — they are contractually required
14. RACK SCHEDULE — If the drawings show a rack schedule (e.g., "4-Post Rack 44U: 2"), use those EXACT specifications. Do NOT substitute different rack sizes or quantities
15. WAP ACCESSORIES — For every Wireless Access Point (WAP), include a surface mount box (SMB) or mounting bracket as a separate BOM line item. WAPs cannot be installed without a mounting solution
16. PATCH PANEL SIZING — Calculate patch panels from the TOTAL number of data drops and ports, not from an arbitrary count. Formula: Total drops ÷ 24 (or 48) ports per panel, rounded UP. If 310 drops need termination, that's 7× 48-port panels or 13× 24-port panels — NOT 5
17. COUNTING ACCURACY — This is the #1 source of bid errors. For EVERY device type:
    - Count symbols on EVERY floor plan sheet (not just the first sheet)
    - Apply TYPICAL note multipliers (if drawing says "TYP" on a detail, multiply by the number of matching locations)
    - Cross-reference the equipment SCHEDULE (if it exists) — schedule count is AUTHORITATIVE
    - If your symbol count is MORE than 20% different from the schedule, USE THE SCHEDULE and flag the discrepancy
    - Common counting errors: missing devices on detail sheets, missing devices in reflected ceiling plans, missing devices shown only in enlarged plans

═══ UPS, INVERTERS & POWER EQUIPMENT (MANDATORY) ═══
You MUST check ALL sources (schedules, plans, specs) for power equipment and price them:
- UPS units — price based on kVA rating and form factor (rack-mount, tower)
- Inverters — power inverters, solar inverters, frequency inverters
- Transfer switches (ATS/STS) — automatic or manual
- Battery backup systems (standalone or integrated)
- Power supplies for access control, fire alarm, intrusion (Altronix, LifeSafety Power)
- PDUs — basic, metered, switched, per-outlet monitoring
- Surge protectors / SPDs (Surge Protective Devices)
These are HIGH-VALUE items. Missing a $5,000 UPS or $3,000 transfer switch destroys your margin.

═══ DOCUMENT-SPECIFIED MANUFACTURERS & PART NUMBERS (MANDATORY OVERRIDES) ═══
The Spec Cross-Reference brain extracted these SPECIFIED PRODUCTS from the construction documents.
You MUST use these exact manufacturers. Using a different brand is a BID-KILLING COMPLIANCE ERROR.
${JSON.stringify(context.wave1?.SPEC_CROSS_REF?.specified_products || [], null, 2).substring(0, 3000)}

═══ SPEC-TO-DEVICE KEY MAPPING (connect spec products → consensus counts) ═══
${(() => {
  const specProducts = context.wave1?.SPEC_CROSS_REF?.specified_products || [];
  const counts = context.wave1_75?.CONSENSUS_ARBITRATOR?.consensus_counts
    || context.wave1_75?.TARGETED_RESCANNER?.final_counts
    || context.wave1?.SYMBOL_SCANNER?.totals || {};
  if (specProducts.length === 0) return 'No spec products found — use defaults below.';
  const mappings = specProducts.map(sp => {
    const itemType = (sp.item_type || '').toLowerCase();
    const matchingKeys = Object.keys(counts).filter(k => {
      const kl = k.toLowerCase();
      if (itemType.includes('camera') && (kl.includes('camera') || kl.includes('cctv') || kl.includes('dome') || kl.includes('bullet') || kl.includes('ptz'))) return true;
      if (itemType.includes('reader') && (kl.includes('reader') || kl.includes('card'))) return true;
      if (itemType.includes('nvr') && kl.includes('nvr')) return true;
      if (itemType.includes('vms') && (kl.includes('vms') || kl.includes('nvr'))) return true;
      if (itemType.includes('switch') && kl.includes('switch')) return true;
      if (itemType.includes('cable') && (kl.includes('cable') || kl.includes('cat'))) return true;
      if (itemType.includes('panel') && kl.includes('panel')) return true;
      if (itemType.includes('ups') && kl.includes('ups')) return true;
      if (itemType.includes('speaker') && kl.includes('speaker')) return true;
      if (itemType.includes('smoke') && (kl.includes('smoke') || kl.includes('detector'))) return true;
      if (itemType.includes('pull') && kl.includes('pull')) return true;
      if (itemType.includes('strobe') && (kl.includes('strobe') || kl.includes('horn'))) return true;
      return kl.includes(itemType);
    });
    const countStr = matchingKeys.map(k => {
      const val = counts[k];
      const c = typeof val === 'object' ? (val.consensus || val.count || val) : val;
      return k + '=' + c;
    }).join(', ');
    return '  → ' + sp.item_type + ' (' + sp.manufacturer + ' ' + (sp.model || '') + ') maps to: ' + (countStr || 'CHECK COUNTS MANUALLY');
  }).join('\\n');
  return 'USE THESE MAPPINGS — each spec product MUST use the specified manufacturer:\\n' + mappings;
})()}

SPECIFIED POWER EQUIPMENT:
${JSON.stringify(context.wave1?.SPEC_CROSS_REF?.power_equipment_found || [], null, 2).substring(0, 2000)}

SCHEDULE DATA (may include manufacturer and model):
${JSON.stringify(context.wave1?.ANNOTATION_READER?.schedule_data || [], null, 2).substring(0, 3000)}

═══ RAW SPECIFICATION TEXT (extracted from uploaded spec PDFs — search for products, requirements, scope) ═══
${(() => {
  const specTexts = context._specTexts || [];
  if (specTexts.length === 0) return 'No spec PDFs uploaded — rely on Spec Cross-Reference brain data above.';
  let combined = '';
  for (const st of specTexts) {
    combined += '--- ' + st.name + ' ---\n' + st.text + '\n\n';
    if (combined.length > 30000) break; // Cap total spec text at 30KB in pricer prompt
  }
  return combined.substring(0, 30000) + (combined.length > 30000 ? '\n[...truncated...]' : '');
})()}

RULES FOR MANUFACTURERS & PART NUMBERS (MANDATORY — items without these are REJECTED):
- PRIORITY 1 (ABSOLUTE): If the SPECIFIED PRODUCTS list above contains a manufacturer for an item type, you MUST use that EXACT manufacturer — using ANY different brand is a FATAL COMPLIANCE ERROR that will be rejected
- PRIORITY 2: If specs say "or approved equal", use the SPECIFIED product as primary (not the equal)
- PRIORITY 3: ONLY if NO manufacturer is specified anywhere in the documents OR the specified_products list, use these defaults:
  * Structured Cabling: Panduit, CommScope/Systimax, Corning (fiber), Belden
  * CCTV: Axis Communications, Hanwha/Samsung, Bosch, Genetec (VMS), Avigilon
  * Access Control: HID (readers), Lenel/LenelS2, Mercury (panels), Assa Abloy (locks)
  * Fire Alarm: Notifier/Honeywell, EST/Edwards, Simplex, Bosch
  * Audio Visual: Crestron, Extron, QSC, Samsung (displays), Biamp
  * Network: Cisco, Aruba, Juniper
  * Power: APC/Schneider (UPS), Eaton, Altronix (power supplies), LifeSafety Power
- WARNING: Defaulting to Axis when the spec says Avigilon (or vice versa) is a BID-KILLING ERROR — the owner will reject non-compliant submittals
- EVERY item in the "items" array MUST have non-empty "mfg" and "partNumber" fields
- If you don't know the exact part number, use the manufacturer's common model series (e.g., "P3245-V" for Axis dome, "H5A-BO-IR" for Avigilon bullet)
- BLANK mfg or partNumber is a FATAL ERROR — the system will REJECT your output

${context.isTransitRailroad ? `═══ TRANSIT / RAILROAD MANDATORY SCOPE (CHECK EVERY ITEM) ═══
This is a transit/railroad project. These scope items are COMMONLY REQUIRED and frequently missed.
Check the plans and specs for EACH — if present, you MUST price them:

1. VEHICULAR BOLLARDS (anti-ram): Check site plans for bollard locations.
   - M30 rated bollard: $3,250-$13,717 each (material + foundation)
   - TYPICAL: 25-60 bollards per transit station = $80K-$820K scope

2. BLAST MITIGATION / SECURITY FILM: Check window schedules.
   - Security film per window: $590 installed (verified Emeryville)
   - TYPICAL: 80-200 windows per station = $47K-$118K scope

3. TRENCHING & UNDERGROUND CONDUIT: Check site plans for underground routes.
   - Railroad heavy-duty trenching: $95-$281 per LF ALL-IN
   - Concrete saw cutting: $8/LF, asphalt saw cutting: $4.50/LF
   - Surface restoration: concrete $16/SF, asphalt $12/SF
   - Duct bank (2-way, concrete encased): $80/LF
   - Directional boring 2": $24/LF, 4": $34/LF
   - Handhole/pullbox installation: $1,600 each
   - TYPICAL: 500-2000 LF = $47K-$562K scope
   - Price as SUBCONTRACTOR category — 3D does NOT self-perform

4. RWIC / FLAGMAN: Required for ALL trackside work.
   - $1,000/day per RWIC (billed $125/hr, 4-hr minimum)
   - Budget 1 RWIC per day for FULL project duration
   - TYPICAL: 30-60 days = $30,000-$60,000

5. CREW COMPLIANCE (per person — budget for entire crew):
   - TWIC Card: $124/person (TSA credential)
   - eRailSafe screening: $70/person
   - RWP (Roadway Worker Protection) training: $225/person
   - Drug & alcohol testing: $120/person
   - Railroad safety vest (Class 3): $45/person
   - Railroad hard hat: $35/person
   - TOTAL: ~$619/person × crew size (typically 4-8 workers)

6. INSURANCE (transit-specific):
   - RRPLI (Railroad Protective Liability): 3% of contract value
   - Additional insured endorsements: 1% of contract value
   - These are MANDATORY — railroad will not issue NTP without RRPLI

7. EQUIPMENT (transit-specific — all lifts: 2-WEEK minimum rental):
   - Hi-rail vehicle: $1,000/day (required for trackside work, ~40% of project days)
   - Scissor lift: $925/week (2-week minimum), Boom 40-60': $1,700/week, Boom 60-80': $2,800/week
   - Safety harness + lanyard: $250/each — REQUIRED with EVERY lift (1 per crew member using lift)
   - Generator (trackside power): $325/day

8. MATERIAL PREMIUMS (transit-specific):
   - Vandal-resistant IK10 camera housings: $500/each
   - NEMA 4X outdoor enclosures: $850/each
   - Seismic bracing per rack: $1,150/each
   - Tamper-proof hardware: 3% adder on material
   - Rigid conduit premium (transit mandates rigid over EMT): 15% material adder
   - UV-rated outdoor cable: 8% material adder
   - Emergency blue light phone station: $18,500 each installed

9. SPECIAL FOUNDATIONS: Camera pole bases, equipment pads.
   - Camera pole foundation (drilled pier): $2,000-$8,000 each
   - Concrete pad pour: $575/CY
   - Core drill 4" hole: $100/hole
   - ADA truncated dome mat: $475/each

10. LABOR PREMIUMS (transit-specific):
    - Restricted work window premium: 15% labor adder (nights/weekends)
    - Standby / escort wait time: 10% of field labor cost
    - Daily safety briefings: 30 min per crew per day (paid time)
    - Multiple mobilizations: transit = many short work windows, not one long trip

11. TESTING & DOCUMENTATION:
    - OTDR fiber testing: $35/strand (min mobilization $650)
    - Copper cable certification: $22/cable (Fluke DSX)
    - As-built drawing preparation: $135/sheet (CAD conversion)
    - O&M manual preparation: $3,500/system
    - Multiple training sessions for railroad staff

12. MOBILIZATION / DEMOBILIZATION:
    - 4% of contract value standard
    - Multiple mobilization trips: ~$1,500 per trip (budget 1 per 5 work days)

DO NOT skip ANY of these items. On Amtrak projects, transit-specific costs typically add 25-45% to the base bid. Missing RWIC alone can be $30K-$80K. Missing RRPLI can be $15K-$50K. Missing crew compliance can be $3K-$5K.
` : ''}═══ SUBCONTRACTED CIVIL WORK (ALWAYS INCLUDE WHEN APPLICABLE) ═══
3D Technology does NOT self-perform trenching, directional boring, or saw cutting.
When plans show underground conduit runs, outdoor cable pathways, or exterior routing:
- ALWAYS add a "Subcontractor — Civil / Trenching" category
- Price trenching as SUBCONTRACTOR line items (3D subs this out, CA upper-mid pricing):
  • Saw cutting concrete: $8.00/LF (4" depth, $350 minimum callout)
  • Saw cutting asphalt: $4.50/LF (3" depth, $350 minimum callout)
  • Trenching 24" deep (urban CA): $18/LF ($22 for PW)
  • Trenching 36" deep (urban CA): $24/LF ($28 for PW)
  • Concrete patching/restoration: $16/SF
  • Asphalt patching: $12/SF
  • Directional boring 2" conduit: $24/LF
  • Directional boring 4" conduit: $34/LF
  • Bore mobilization: $3,500 flat fee per bore setup
  • Concrete pad pour: $575/CY
  • Core drill 4" in concrete: $100/hole
  • Handhole/pullbox install (24x36): $1,600/each
  • Duct bank 2-way (concrete encased): $80/LF
  • Bollard install (6" steel, filled): $1,000/each
  • ADA truncated dome mat: $475/each
- Estimate linear footage from site plans (measure cable routes between buildings, to poles, etc.)
- Include conduit material in the subcontractor line item cost
- These are COST prices — the engine applies 20% markup automatically

═══ MANDATORY SELF-CHECK (do this before returning) ═══
Before responding, verify:
1. Your output includes a category for EACH selected discipline that IS IN YOUR SCOPE per the Responsibility Matrix above.
   ⚠️ Disciplines marked "NOT OUR SCOPE" in the Responsibility Matrix MUST be ABSENT from your output — including them is a FATAL ERROR that inflates the bid.
2. EVERY item has a non-empty "mfg" field (manufacturer name)
3. EVERY item has a non-empty "partNumber" field (model or part number)
If ANY item is missing mfg or partNumber, FIX IT NOW before returning.
If ANY IN-SCOPE discipline is missing from your categories array, ADD IT NOW with all required materials.
Missing an IN-SCOPE discipline is a FATAL ERROR that will cause catastrophic underestimation.
Including a NOT-IN-SCOPE discipline is equally a FATAL ERROR that will cause catastrophic overestimation and lose the bid.

═══ SYSTEM COMPLETENESS CHECKLIST (apply ONLY to IN-SCOPE disciplines) ═══
A system with missing components DOES NOT WORK. For each IN-SCOPE discipline, you MUST include ALL of these.
⚠️ CRITICAL SCOPE FILTER: ONLY apply the checklist below for disciplines the Responsibility Matrix confirmed as IN OUR SCOPE (TC / Telecom Contractor).
For any discipline marked NOT OUR SCOPE (assigned to SEC, AV, EC, Owner, GC/DH, NC, or any other trade), SKIP that entire checklist section — do NOT create line items for it.
If NO Responsibility Matrix was found, fall back to pricing all selected disciplines.

🔒 ACCESS CONTROL — Every controlled door needs ALL of these:
  □ Card Reader (1 per door, or 2 if in+out) — match schedule/consensus count
  □ REX Button / Request-to-Exit device (1 per door) — DOORS CANNOT OPEN WITHOUT REX
  □ Electric Strike OR Mag-Lock (1 per door) — DOORS CANNOT LOCK WITHOUT HARDWARE
  □ Door Position Switch / Door Contact (1 per door) — monitors open/close status
  □ Dual Reader Interface Module (DRIM) — 1 per 2 doors (round UP: 15 doors = 8 DRIMs)
  □ Controller (1 per 8-16 doors depending on manufacturer)
  □ Power Supply w/ battery backup (1 per 4-8 doors)
  □ Composite Access Control Cable — per door run (22/6 + 18/4 or equiv)
  □ Lock Power Cable — 18/2 or 16/2 for strikes/mag-locks (separate run per door)
  ⚠️ COMMON ERROR: Pricing readers but forgetting REX + strikes = doors that don't lock or unlock

🔐 INTRUSION DETECTION — Complete system needs:
  □ Control Panel (1 per building)
  □ LCD Keypad (minimum 2 — main entrance + secondary entry/admin area)
  □ Motion Detectors / PIR (6-15 for a clinic — hallways, lobbies, admin areas after-hours)
  □ Glass Break Detectors (perimeter rooms with windows)
  □ Door Contacts (entry doors not covered by access control, or SHARED with access control)
  □ Interior Siren / Sounder (minimum 1 — audible alarm notification)
  □ Tamper Switch on panel enclosure
  □ 22/4 Cable for all devices
  ⚠️ COMMON ERROR: Pricing panel + glass breaks but no motion detectors or siren = non-functional system

📹 CCTV — Every camera needs:
  □ Camera (dome, bullet, PTZ, etc.)
  □ Camera Mount / Pendant / Adapter (wall mount, ceiling pendant, corner adapter, pole mount)
  □ Camera Back Box or Junction Box (weatherproof for exterior)
  □ Camera License / VMS License (1 per camera)
  □ NVR or Server with adequate storage
  □ PoE Network Switch with sufficient ports (cameras + uplinks + spare ports)
  □ Cat6A cable per camera (counted in structured cabling)
  ⚠️ COMMON ERROR: Pricing cameras but no mounts = cameras can't be installed

🔊 PAGING / INTERCOM — Complete system needs:
  □ Paging Controller / Master Station
  □ Amplifier(s) — total wattage must exceed speaker tap wattage (speakers × tap setting)
  □ Ceiling Speakers with transformers (25V or 70V line)
  □ Speaker Back Can / Enclosure (plenum-rated if above drop ceiling — REQUIRED by code)
  □ Audio Cable (16/2 or 18/2) — avg run 150-200 ft for commercial buildings, NOT 60 ft
  □ Volume Controls / Zone Attenuators (if multiple zones shown on plans)
  ⚠️ COMMON ERROR: 63 speakers × 150 ft avg = 9,450 ft cable, NOT 4,000 ft

🏥 NURSE CALL — VA/Healthcare MUST include:
  □ Master Console / Annunciator (1 per nurse station)
  □ Patient Station (1 per bed)
  □ Corridor Dome Light (1 per patient room — matches patient station count)
  □ Staff Station / Duty Station (at nurse station — for call acknowledgment)
  □ Bathroom Emergency Pull Cord (1 per patient bathroom — REQUIRED for VA/ADA)
  □ Code Blue Station (emergency — REQUIRED for VA healthcare facilities)
  □ Pillow Speaker (if patient rooms have entertainment/communication)
  □ Nurse Call Cable (dedicated plenum-rated)
  ⚠️ COMMON ERROR: Missing bathroom pull cords + staff station + Code Blue = non-compliant VA system

📺 AUDIO VISUAL — Complete installations need:
  □ Displays / Monitors
  □ Wall Mounts / Ceiling Mounts (1 per display)
  □ HDMI / DisplayPort Cables (1-2 per display)
  □ AV Wall Plates / Input Receptacles (for conference/meeting rooms)
  □ DSP / Audio Processor (if audio system present)
  □ AV Rack Shelf or mounting hardware for head-end equipment

🏗️ MDF / IDF — Every telecom room needs:
  □ 7ft Floor-Mount Cabinet (84"H) or Rack(s) (2-post or 4-post per plan) — use 7ft cabinet if plans show enclosed cabinets
  □ Patch Panels — enough ports for ALL drops served (total drops ÷ 48, round UP)
  □ Horizontal Cable Managers (minimum 2 per rack — above and below patch panels)
  □ Vertical Cable Manager (1 per rack)
  □ PDU (minimum 2 per rack for redundancy)
  □ UPS (sized for equipment load)
  □ Fiber Enclosure (Corning CCH-01U or equiv) — minimum 2: one at MDF + one at EACH IDF (BOTH ENDS required!)
  □ LC Adapter Panel 6-Pack (Corning CCH-CP06-E4 or equiv) — fiber strand count ÷ 6, round UP, × 2 (BOTH ends!)
    ⚠️ Example: 24-strand fiber = 24÷6 = 4 panels PER END × 2 ends = 8 total adapter panels
    ⚠️ COMMON ERROR: 1 fiber enclosure + 1 adapter panel = fiber cannot terminate at remote end
  □ Fiber Splice-On Connectors (LC) — 1 per strand PER END. 24-strand = 24 connectors × 2 ends = 48 total minimum
  □ Fiber Splice Trays — 1 tray per 12 splices, at EACH end (24-strand = 2 trays × 2 ends = 4 total)
    ⚠️ COMMON ERROR: Buying fiber cable but no connectors = fiber cannot be terminated. EVERY strand needs a connector at EACH end.
  □ Grounding Busbar (TMGB at MDF, TGB at each IDF)
  □ Bonding Conductor (#6 AWG from busbar to building ground)
  □ LADDER RACK / CABLE RUNWAY — ALL of these parts are required (typical clinic ~100 LF):
    - Chatsworth Ladder Rack straight sections (qty in LF — measure FULL route, typical clinic ~100 LF)
    - Trapeze / Support Kit (1 every 5 ft of ladder rack run)
    - Threaded Rod 3/8" (2 per support × length needed, typically 36-48" each)
    - Beam Clamp or Ceiling Anchor (2 per support — attaches rod to structure)
    - Splice Plate / Butt Splice (1 per joint where 10-12 ft sections connect)
    - 90° Horizontal Elbow (count every turn from the plan routing)
    - Tee Fitting (if ladder rack splits/branches)
    - Wall Bracket / Wall Support (2 per wall penetration)
    - Rack-to-Runway Mounting Kit (1 per rack — transition from runway to rack top)
    - Ground Lug / Bonding Bushing (1 per section for grounding continuity per TIA-607)
  ⚠️ COMMON ERROR: Pricing ladder rack LF but no supports, rod, clamps, or splices = rack cannot be installed
  ⚠️ COMMON ERROR: Fiber shelf at MDF but not at IDF = fiber can't terminate at remote end

📡 DISTRIBUTED ANTENNA SYSTEM (DAS) — AUDIT FIX #18 Completeness Checklist:
  □ BDA / Bi-Directional Amplifier (1 per building/coverage zone — signal source)
  □ Donor Antenna (outdoor Yagi or omni — feeds signal to BDA)
  □ DAS Head-End Unit (active DAS for large buildings) OR Signal Booster (passive for small)
  □ Remote Units / Nodes (1 per 15,000-25,000 sq ft coverage area)
  □ Indoor Antennas (ceiling-mount omni — 1 per 5,000-8,000 sq ft for adequate coverage)
  □ RF Splitters (2-way, 4-way — distribute signal from head-end to remote units)
  □ Directional Couplers / Tappers (balance signal levels across long runs)
  □ 1/2" Plenum-Rated Coax (DAS backbone — measure total routing between components)
  □ 7/8" Coax (riser/long backbone runs — lower loss over distance)
  □ Fiber for DAS (if fiber-fed DAS — OS2 SM between head-end and remote units)
  □ RF Connectors (N-type, 7-16 DIN — 2 per cable run, minimum)
  □ Grounding Kit (per code, lightning protection for donor antenna)
  □ RF Site Survey (pre-construction signal mapping — REQUIRED for system design)
  □ iBwave Design (DAS coverage modeling — most specs require engineered design)
  □ FCC/carrier coordination (if connecting to carrier macro network)
  ⚠️ COMMON ERROR: Pricing antennas + BDA but no coax/splitters = signal can't reach coverage areas
  ⚠️ COMMON ERROR: Missing RF survey = system may not meet coverage requirements

🔌 STRUCTURED CABLING — J-hooks and pathway:
  □ J-Hooks — 1 every 4-5 ft of horizontal cable run (total horizontal ft ÷ 4.5)
  □ Cable Tray / Basket Tray (if shown on plans — measure LF from routing)
  □ Ladder Rack in telecom rooms (see MDF/IDF above)
  □ Firestop Penetrations (every floor/wall penetration)
  ⚠️ COMMON ERROR: 90,000 ft cable ÷ 4.5 = 20,000 J-hooks, NOT 1,500

═══ SCOPE EXCLUSIONS ALWAYS WIN — FINAL OVERRIDE ═══
This is the HIGHEST PRIORITY rule in this entire prompt. It overrides everything above including the completeness checklist:
1. If the Responsibility Matrix says a discipline is NOT assigned to TC (Telecom Contractor), DO NOT price it — period.
2. Even if the completeness checklist above lists items for that discipline, SKIP them entirely.
3. Even if the user selected that discipline, the plans define the actual scope — the Responsibility Matrix is the authority.
4. Only create line items for disciplines where our_scope = true OR where NO Responsibility Matrix was found.
5. If you include ANY line item for a NOT-IN-SCOPE discipline, the entire bid is INVALID and will be rejected.
6. When equipment schedules specify exact manufacturer/model numbers (e.g., "Axis P3265-LVE", "HID iCLASS SE R40"),
   use those EXACT products in your BOM — do NOT substitute generic or default products.
   The architect specified these products for a reason (compatibility, VA standards, spec compliance).

═══ WASTE FACTOR, SPARE PARTS & CONSUMABLES ═══
You MUST add these to your output — they are REAL costs that every project incurs:
1. CABLE WASTE FACTOR: Add 12% to all cable quantities. Cable gets cut, pulled wrong, rejected, damaged. Price the waste.
2. CONDUIT WASTE: Add 8% to all conduit quantities. Mis-cuts, damaged sticks, offcuts.
3. SPARE PARTS / ATTIC STOCK: Add a category called "Spare Parts & Attic Stock" with 5% of each device type quantity (cameras, readers, detectors, outlets, etc.) rounded up. Most specs REQUIRE attic stock delivery to owner.
4. SMALL TOOLS & CONSUMABLES: Add a line item "Small Tools & Consumables" = 2.5% of total material cost. This covers drill bits, saw blades, anchors, screws, bolts, zip ties, tape, markers, velcro, cable lube, etc.
5. CONNECTOR & TERMINATION SUPPLIES: Ensure you have enough RJ45 connectors, LC fiber splice-on connectors (1 per fiber strand PER END — 24-strand = 48 LC connectors minimum), fiber splice trays (1 per 12 splices per end), heat shrink, crimp connectors, wire nuts, etc. (at least 15% overage on connectors).

Return ONLY valid JSON:
{
  "categories": [
    {
      "name": "Structured Cabling",
      "items": [
        { "item": "Cat 6A Plenum Cable", "qty": 30000, "unit": "ft", "unit_cost": 0.32, "ext_cost": 9600.00, "mfg": "Panduit", "partNumber": "PUP6AV04BU-CEG" },
        { "item": "Cat 6A Cable — Waste Factor (12%)", "qty": 3600, "unit": "ft", "unit_cost": 0.32, "ext_cost": 1152.00, "mfg": "Panduit", "partNumber": "PUP6AV04BU-CEG" }
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

═══ RATE LIBRARY — KNOWN LABOR HOURS FROM PAST PROJECTS ═══
${(() => {
  const rates = context.rateLibrary || [];
  const withLabor = rates.filter(r => r.labor_hours && r.labor_hours > 0);
  if (withLabor.length === 0) return 'No rate library labor data — use NECA guidelines below.';
  let result = 'These are VERIFIED labor hours from completed projects. Use these instead of NECA defaults when a match exists:\n';
  for (const r of withLabor.slice(0, 40)) {
    result += '  - ' + r.item_name + ': ' + r.labor_hours + ' hrs/' + (r.unit || 'ea');
    if (r.notes) result += ' — ' + r.notes;
    result += '\n';
  }
  return result;
})()}

NECA LABOR UNIT GUIDELINES (use when no rate library match):
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
1. Your device quantities MUST EXACTLY MATCH the Material Pricer output — it is your source of truth for what to price
2. If Material Pricer has 24 cameras, your labor must cover EXACTLY 24 cameras
3. If Material Pricer has 21 card readers, your labor must cover EXACTLY 21 doors
4. ONLY include labor for categories that the Material Pricer actually priced
5. If a discipline is ABSENT from the Material Pricer output (because scope exclusions removed it), do NOT add labor for it
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
      "pct_of_total": 8,
      "tasks": [
        { "description": "Dedicated PM for project duration — CALCULATE from total field hours × 15-20%", "classification": "pm", "hours": 200, "rate": 75.00, "cost": 15000.00 }
      ],
      "phase_hours": 200,
      "phase_cost": 15000.00
    },
    {
      "name": "Coordination & Idle Time",
      "pct_of_total": 12,
      "tasks": [
        { "description": "Trade coordination, GC delays, access waits — CALCULATE from total field hours × 12-15%", "classification": "journeyman", "hours": 180, "rate": 65.00, "cost": 11700.00 }
      ],
      "phase_hours": 180,
      "phase_cost": 11700.00
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
NOTE: Travel costs are now configured by the user on Stage 7 (Travel & Costs) AFTER your analysis.
Set total_travel to $0 in your project_summary. The system will inject the correct deterministic travel amount.
Do NOT estimate or guess travel costs — they will be overridden by user-configured values.

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
2. DO NOT calculate travel — set total_travel to $0 (the system injects deterministic travel from user config)
${context.nearestOfficeDistance !== undefined ? `   COMPUTED: ${context.nearestOfficeDistance} miles from ${context.nearestOfficeName || 'nearest office'}. ${context.nearestOfficeDistance <= 60 ? '⚠️ LOCAL PROJECT — SKIP TRAVEL COSTS ENTIRELY.' : 'Include travel costs.'}` : ''}
3. Transit/Railroad costs — MANDATORY if project involves Amtrak, BNSF, transit authority, railroad, airport, or DOT
4. Prevailing wage determination (if applicable)
5. Complete project cost summary with G&A, profit, warranty, and contingency

═══ TRAVEL & PER DIEM ═══
IMPORTANT: Travel costs are handled deterministically by the system from user-configured Stage 7 settings.
Do NOT calculate or estimate travel costs. Set total_travel to $0 in your output.
The system will inject the correct travel amount after your analysis.

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

═══ SPEC-SPECIFIED MANUFACTURERS (MANDATORY COMPLIANCE CHECK) ═══
The following manufacturers are REQUIRED by the construction specifications.
If the Material Pricer used a DIFFERENT manufacturer for any of these item types, you MUST CORRECT IT.
Using Axis when the spec says Avigilon (or vice versa) is a BID-KILLING COMPLIANCE ERROR.
${JSON.stringify(context.wave1?.SPEC_CROSS_REF?.specified_products || [], null, 2).substring(0, 2000)}

MANUFACTURER CORRECTION RULES:
- For each item in the Material Pricer output, check if a manufacturer was specified in the specs above
- If the Pricer used a different manufacturer than what's specified, REPLACE it with the correct manufacturer and update the part number and pricing to match
- Add a correction_log entry: { "action": "mfg_corrected", "item": "...", "from_mfg": "Axis", "to_mfg": "Avigilon", "reason": "Spec section XX XX XX requires Avigilon" }
- This is CORRECTION RULE #0 — it takes priority over all other rules

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

VALIDATED DATA — 6-READ CONSENSUS (use FINAL RECONCILIATION as authoritative):

FINAL RECONCILIATION COUNTS (AUTHORITATIVE — 6 independent reads):
${JSON.stringify(context.wave3_75?.FINAL_RECONCILIATION?.final_counts || context.wave1_75?.CONSENSUS_ARBITRATOR?.consensus_counts || context.wave1?.SYMBOL_SCANNER?.totals || {}, null, 2).substring(0, 5000)}

DETAIL VERIFIER CORRECTIONS:
${JSON.stringify(context.wave3_5?.DETAIL_VERIFIER?.verified_counts || context.wave3_5?.DETAIL_VERIFIER?.corrections || {}, null, 2).substring(0, 2000)}

CODE COMPLIANCE:
${JSON.stringify(context.wave1?.CODE_COMPLIANCE || {}, null, 2).substring(0, 3000)}

MDF/IDF ROOMS:
${JSON.stringify(context.wave1?.MDF_IDF_ANALYZER || {}, null, 2).substring(0, 4000)}

CABLE & PATHWAY:
${JSON.stringify(context.wave1?.CABLE_PATHWAY || {}, null, 2).substring(0, 3000)}

SPECIAL CONDITIONS:
${JSON.stringify(context.wave1?.SPECIAL_CONDITIONS || {}, null, 2).substring(0, 2000)}

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
${JSON.stringify(corrected.corrected_categories, null, 2).substring(0, 6000)}

CORRECTION LOG:
${JSON.stringify(corrected.correction_log || [], null, 2).substring(0, 2000)}`;
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

${(() => {
  const proposals = context.winningProposals || [];
  if (proposals.length === 0) return '';
  // Only include proposals of similar project type for relevance
  const typeMatch = proposals.filter(p => {
    const pt = (p.project_type || '').toLowerCase();
    const ct = (context.projectType || '').toLowerCase();
    return pt === ct || pt.includes(ct) || ct.includes(pt);
  });
  const toUse = typeMatch.length > 0 ? typeMatch.slice(0, 3) : proposals.slice(0, 2);
  return `
═══ WINNING PROPOSAL INTELLIGENCE — Match this tone & strategy ═══
These are excerpts from PAST WINNING BIDS. Study the executive summary style, value proposition approach, and exclusion phrasing. Mirror this company's voice and winning strategy:
${toUse.map((p, i) => `
── Won: ${p.project_name} (${p.project_type || 'N/A'}) — $${(p.contract_value || 0).toLocaleString()} ──
Executive Summary Style: ${(p.executive_summary || 'N/A').substring(0, 500)}
Value Props: ${(p.value_propositions || 'N/A').substring(0, 400)}
Strategy Notes: ${(p.strategy_notes || 'N/A').substring(0, 300)}
${p.win_margin_pct ? `Win Margin: ${p.win_margin_pct}%` : ''}`).join('\n')}
Use similar language, confidence level, and positioning in Sections 11 and 12 of this bid.
`;
})()}
${(() => {
  const strengths = context.companyStrengths || [];
  if (strengths.length === 0) return '';
  const byCat = {};
  strengths.forEach(s => { (byCat[s.category] = byCat[s.category] || []).push(s); });
  return `
═══ COMPANY COMPETITIVE STRENGTHS — Weave into proposal narrative ═══
Incorporate these differentiators into the Observations & Recommendations section and any executive summary language:
${Object.entries(byCat).map(([cat, items]) =>
    `▸ ${cat}: ${items.map(i => `${i.strength}${i.detail ? ` (${i.detail.substring(0, 100)})` : ''}`).join('; ')}`
  ).join('\n')}
These are REAL company capabilities — use them to position the bid as the strongest option.
`;
})()}
${(() => {
  const decisions = context.bidDecisions || [];
  if (decisions.length === 0) return '';
  // Analyze patterns: which categories get sharpened vs padded
  const patterns = {};
  for (const d of decisions.slice(0, 50)) {
    const cat = d.category || 'unknown';
    if (!patterns[cat]) patterns[cat] = { sharpen: 0, pad: 0, avgPct: 0, count: 0 };
    patterns[cat].count++;
    patterns[cat].avgPct += (d.adjustment_pct || 0);
    if ((d.adjustment_pct || 0) < 0) patterns[cat].sharpen++;
    else patterns[cat].pad++;
  }
  const summary = Object.entries(patterns).map(([cat, p]) =>
    `${cat}: avg ${(p.avgPct / Math.max(p.count, 1)).toFixed(1)}% adjustment (${p.sharpen} sharpened, ${p.pad} padded across ${p.count} bids)`
  ).join('\n');
  return `
═══ BID DAY INTELLIGENCE — Historical adjustment patterns ═══
Past estimator bid-day adjustments for similar projects (learn from these patterns):
${summary}
Consider these patterns when setting final prices — the estimator typically sharpens or pads these categories.
`;
})()}

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

═══ CRITICAL — DATA DROP MULTIPLIER SYMBOLS (MUST FIND) ═══
LOOK FOR TRIANGLE SYMBOLS with labels "1D", "2D", "4D", "6D" on the legend. These are DATA OUTLETS.
- Triangle with "2D" next to it = 2 data cables go to that wall location
- Triangle with "4D" = 4 data cables
- Plain triangle or "1D" = 1 data cable
- Also look for "1V", "2V" = voice drops (same concept)
The legend page typically shows a section called "DATA OUTLET DIAGRAM" or "OUTLET DESIGNATIONS" with these.
You MUST include a "multiplier_map" object in your response showing each prefix and its cable count.
If the legend shows 2D and 4D symbols, return: "multiplier_map": {"1D": 1, "2D": 2, "4D": 4}
If you don't find any multiplier symbols, return: "multiplier_map": {}

Return ONLY valid JSON:
{
  "symbols": [
    { "symbol_id": "S1", "visual": "Solid circle with C inside", "discipline": "CCTV", "device_type": "fixed_dome_camera", "label_on_legend": "Camera - Fixed Dome", "similar_to": null, "confidence": 98 }
  ],
  "multiplier_map": { "1D": 1, "2D": 2, "4D": 4, "6D": 6, "1V": 1, "2V": 2 },
  "legend_quality": "good",
  "ambiguous_symbols": [
    { "symbol_id": "S5", "reason": "Similar shape to smoke detector - differentiate by size", "could_be": ["smoke_detector", "heat_detector"] }
  ],
  "total_unique_symbols": 24,
  "disciplines_covered": ["Structured Cabling", "CCTV"]
}

CRITICAL — multiplier_map: You MUST include a "multiplier_map" object showing EVERY numeric prefix symbol found on the legend. Examples:
- If legend shows "2D" = 2 data drops: include "2D": 2
- If legend shows "4D" = 4 data drops: include "4D": 4
- If legend shows "1D" = 1 data drop: include "1D": 1
- Also check for voice: "1V", "2V", "4V"
- If NO multiplier symbols are found on the legend, return an empty object: {}
This map is used by downstream code to VERIFY scanner counts — it is the ground truth for how many cables each symbol represents.`,

      // ── BRAIN 0.25: Plan Legend Scanner (Wave 0 — finds legends embedded in plan sheets) ──
      PLAN_LEGEND_SCANNER: () => `You are a CONSTRUCTION PLAN LEGEND HUNTER. Your job is to find SYMBOL LEGENDS, SYMBOL KEYS, ABBREVIATION TABLES, and DEVICE SCHEDULES that are embedded WITHIN construction plan sheets — NOT on a separate legend sheet.

PROJECT: ${context.projectName || 'Unknown'}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

═══ WHY THIS MATTERS ═══
Many construction plan sets embed legends directly on individual discipline sheets (e.g., T-001 has a telecom symbol key, E-001 has an electrical legend, FA-001 has a fire alarm legend). These are often in a corner or margin of the plan sheet and contain CRITICAL symbol definitions that the separate legend sheet may not include. Missing these causes miscounting.

═══ WHAT TO LOOK FOR ON EACH PAGE ═══
1. SYMBOL LEGENDS / KEYS — tables or grouped areas showing symbol shapes with labels
   - Usually titled "SYMBOL LEGEND", "LEGEND", "SYMBOL KEY", "DEVICE LEGEND", or similar
   - Often in top-right, bottom-right, or right margin of the sheet
   - May be inside a bordered box or just a grouped list
2. ABBREVIATION TABLES — lists of abbreviations and their meanings (e.g., "WAP = Wireless Access Point")
3. DEVICE SCHEDULES — tables listing device types, models, quantities per room
4. GENERAL NOTES with symbol definitions embedded in text
5. KEYNOTES — numbered references that define what symbols mean

═══ CRITICAL — DATA DROP MULTIPLIER SYMBOLS ═══
Look for symbols with NUMERIC PREFIXES like "2D", "4D", "1D", "6D" — these indicate the number of data cables at each drop location. Example: a triangle labeled "2D" = 2 data drops (2 Cat6 cables). Similarly "2V" = 2 voice drops. Record these multiplier definitions so counters know that each "2D" symbol = qty 2 data outlets, NOT qty 1.

═══ FOR EACH LEGEND FOUND ═══
- Note which sheet/page it appears on (use the sheet ID like T-001, E-101, FA-001 if visible)
- Extract EVERY symbol definition: what the symbol looks like and what it represents
- Note the discipline it covers (Telecom, Fire Alarm, Electrical, Security, etc.)
- Flag any symbols not found on the dedicated legend sheet (if one exists)

Return ONLY valid JSON:
{
  "legends_found": [
    {
      "page": "page5_T-001.jpg",
      "sheet_id": "T-001",
      "legend_type": "symbol_legend",
      "legend_title": "TELECOM SYMBOL LEGEND",
      "location_on_page": "right margin",
      "discipline": "Structured Cabling",
      "symbols": [
        { "symbol_id": "PL1", "visual": "Triangle with D inside", "device_type": "data_outlet", "label": "Data Outlet - Cat6A", "confidence": 95 },
        { "symbol_id": "PL2", "visual": "Circle with W inside", "device_type": "wireless_access_point", "label": "WAP - Ceiling Mount", "confidence": 92 }
      ]
    }
  ],
  "abbreviations_found": [
    { "page": "page5_T-001.jpg", "abbreviation": "WAP", "meaning": "Wireless Access Point" },
    { "page": "page5_T-001.jpg", "abbreviation": "MDF", "meaning": "Main Distribution Frame" }
  ],
  "device_schedules_found": [
    { "page": "page8_T-004.jpg", "sheet_id": "T-004", "schedule_type": "device_schedule", "devices": [] }
  ],
  "total_legends_found": 3,
  "total_symbols_extracted": 18,
  "pages_with_legends": ["T-001", "E-001", "FA-001"],
  "pages_without_legends": "most plan sheets"
}`,

      // ── BRAIN 0.5: Spatial Layout (Wave 0 — parallel with Legend Decoder) ──
      SPATIAL_LAYOUT: () => `You are a BUILDING SPATIAL ANALYST. Your job is to extract floor plan geometry, IDF/MDF room positions, and device zone positions so cable run lengths can be precisely calculated.

PROJECT: ${context.projectName || 'Unknown'} | Type: ${context.projectType || 'Unknown'}
${context.planSheetSize ? `
═══ USER-SPECIFIED SHEET SIZE (AUTHORITATIVE — do NOT override) ═══
The user has confirmed that ALL plan sheets in this set are: ${(() => {
  const sizes = { ARCH_D: 'ARCH D (24"×36")', ARCH_E: 'ARCH E (36"×48")', ARCH_E1: 'ARCH E1 (30"×42")', ARCH_C: 'ARCH C (18"×24")', ARCH_B: 'ARCH B (12"×18")', ANSI_D: 'ANSI D (22"×34")', ANSI_E: 'ANSI E (34"×44")', ANSI_C: 'ANSI C (17"×22")', HALF_D: 'Half-size (11"×17")', HALF_E: 'Half-size (18"×24")' };
  return sizes[context.planSheetSize] || context.planSheetSize;
})()}
Use this sheet size when calculating building dimensions from the scale. For example, if the scale is 1/8"=1'-0" (8 ft/inch) and the sheet is ARCH D, the drawable area is ~33"×21", so the building area shown is approximately 264'×168'.
DO NOT guess or auto-detect the sheet size — the user has told you what it is.
` : ''}
═══ PRE-EXTRACTED SCALE DATA (from PDF text layer — HIGH CONFIDENCE) ═══
The following scale notations were extracted deterministically from the PDF text layer.
These are AUTHORITATIVE — use them as ground truth. Only override if you can visually confirm a different scale.
${(() => {
  const ocrData = context._ocrScaleData || [];
  const withScale = ocrData.filter(p => p.ftPerInch > 0);
  if (withScale.length === 0) return 'No scale text found in PDF text layer — you must detect scale visually.';
  return withScale.map(p =>
    '  Page ' + p.pageNum + ' (' + p.sheetId + '): ' + p.scaleText + ' → ' + p.ftPerInch + ' ft/inch [' + p.method + ', confidence=' + p.confidence + ']'
  ).join('\n');
})()}

═══ CRITICAL: PER-SHEET SCALE DETECTION ═══
Different sheets in a plan set often use DIFFERENT SCALES. A warehouse floor plan might be 1/16"=1'-0" while an office detail is 1/4"=1'-0". You MUST determine the scale for EACH SHEET independently.

═══ CRITICAL: READ ALL NOTES ON EVERY PAGE ═══
On EVERY sheet, READ and CAPTURE all General Notes, Keynotes, and annotations. Include them in your response.
Notes often specify: conduit routing, cable types, pathway requirements, ceiling types (hard lid vs drop ceiling),
who provides conduit (electrical contractor vs. low-voltage contractor), mounting heights, fire-rated assemblies,
and scope delineations. These are essential for accurate estimation.

YOUR MISSION — For each floor plan sheet:
1. FIND THE SCALE — check these sources IN ORDER (OCR data above is PRIORITY 0):
   a. Title block scale notation (e.g., "SCALE: 1/8" = 1'-0"" or "1:96")
   b. Scale bar graphic (measure labeled increments)
   c. Dimension lines on the drawing (if a dimension reads "30'-0"" between two walls, use that to calibrate)
   d. DOOR FALLBACK: If no scale bar, no title block scale, and no dimension lines — find a standard door on the plan. A standard single door opening is 3 ft (36 inches) wide by 6'-8" to 7'-0" tall. Measure the door width in the drawing and calculate: scale = 3 ft ÷ measured_door_width_on_page. This gives you feet-per-inch for that sheet.
   e. If NOTHING works, note "scale_method": "unable" and estimate conservatively.

2. SHEET DIMENSIONS: Using the detected scale, calculate the real-world width and depth (in feet) of the area shown on that sheet. NOT the paper size — the actual building area the sheet covers.

3. CEILING HEIGHT: Look for ceiling height notes, section cuts, or room finish schedules. Default 10 ft if not found.
4. FLOOR-TO-FLOOR HEIGHT: Look for section drawings or structural notes. Default 14 ft if not found.

5. FOR EACH FLOOR — map IDF/MDF/TR positions and device zones as percentage positions (0%=left/top, 100%=right/bottom).

6. MULTI-BUILDING CAMPUS DETECTION:
   - Determine if the project consists of multiple SEPARATE buildings (e.g., campus, multi-building site, detached structures)
   - Report "building_count" (1 if single building, 2+ for campus)
   - For each building, provide:
     a. "building_id" (e.g., "Building A", "Main", "Annex", "Gymnasium")
     b. "approx_x_pct" and "approx_y_pct" — position of building centroid relative to the full site plan (0-100)
     c. "sheet_ids" — which sheets show this building
   - Report "inter_building_distances" — estimated distances in feet between each pair of buildings
   - Clues for multiple buildings: separate structures on a site plan, "Building A / Building B" labels, separate floor plans per building, campus maps, site plans showing detached structures

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
  "pixel_calibration": {
    "description": "Reference measurement for pixel-to-feet conversion (from scale bar, dimension line, or door)",
    "point1": { "x_px": 100, "y_px": 500 },
    "point2": { "x_px": 340, "y_px": 500 },
    "distance_ft": 30,
    "pixels_per_ft": 8.0,
    "source": "dimension_line"
  },
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
  "building_count": 1,
  "buildings": [
    {
      "building_id": "Main Building",
      "approx_x_pct": 50,
      "approx_y_pct": 50,
      "sheet_ids": ["E1.01", "E1.02"]
    }
  ],
  "inter_building_distances": [],
  "notes": []
}

MULTI-BUILDING EXAMPLE (when building_count >= 2):
"multi_building": true,
"building_count": 3,
"buildings": [
  { "building_id": "Admin Building", "approx_x_pct": 20, "approx_y_pct": 40, "sheet_ids": ["E1.01"] },
  { "building_id": "Warehouse", "approx_x_pct": 70, "approx_y_pct": 30, "sheet_ids": ["E2.01"] },
  { "building_id": "Guard House", "approx_x_pct": 10, "approx_y_pct": 90, "sheet_ids": ["E3.01"] }
],
"inter_building_distances": [
  { "from": "Admin Building", "to": "Warehouse", "distance_ft": 250, "notes": "Across parking lot" },
  { "from": "Admin Building", "to": "Guard House", "distance_ft": 180, "notes": "Along main drive" },
  { "from": "Warehouse", "to": "Guard House", "distance_ft": 350, "notes": "Diagonal across site" }
]

PIXEL CALIBRATION (IMPORTANT for automated cable measurement):
- If you detect a scale bar, dimension line, or door on ANY sheet, record two pixel coordinates on the image that correspond to a known real-world distance.
- Include "pixel_calibration" in your output with point1 (x_px, y_px), point2 (x_px, y_px), and distance_ft.
- pixels_per_ft = pixel_distance_between_points / distance_ft
- This enables automated device-to-device distance measurement from the uploaded images.
- Pixel coordinates are relative to the full uploaded image (0,0 = top-left).

RULES:
- "scale_method" MUST be one of: "title_block", "scale_bar", "dimension_line", "door_reference", "unable"
- "ft_per_inch" is how many real-world feet each inch on the plan represents
- Each device_zone SHOULD include "sheet_id" to link it to the correct sheet scale
- The "building_dimensions" is the OVERALL envelope (largest extents across all sheets)
- If a zone spans multiple sheets at different scales, use the sheet where its centroid falls`,

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

═══ READ ALL NOTES ON EVERY PAGE ═══
Read and record ALL General Notes, Keynotes, and annotations on every sheet. Include them in your "notes" field. Notes contain critical scope info (conduit by others, cable types, mounting heights, etc.).

═══ CRITICAL — DATA DROP MULTIPLIER NOTATION ═══
Symbols with numeric prefixes like "2D", "4D", "1D" indicate the number of data cables at that location.
YOU MUST REPORT TWO COUNTS: "data_outlet_symbols" = physical symbols counted, "data_outlet" = cables after multiplying.
Example: 80 symbols labeled "2D" + 15 symbols labeled "4D" → data_outlet_symbols=95, data_outlet=80×2+15×4=220.
Also include "outlet_breakdown": {"1D": N, "2D": N, "4D": N, "6D": N} showing locations per prefix type.

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
  "outlet_breakdown": { "1D": 10, "2D": 80, "4D": 15, "6D": 0 },
  "methodology": "room-by-room",
  "unidentified_symbols": [],
  "notes": ""
}`,

      // ── BRAIN 7: Discipline Deep-Dive (Wave 1.5) ──────────────
      DISCIPLINE_DEEP_DIVE: () => {
        const allDisc = (context.disciplines || []).length > 0
          ? context.disciplines
          : ['Structured Cabling'];
        const discList = allDisc.join(', ');
        return `You are a SPECIALIST COUNTER analyzing ALL selected disciplines: ${discList}.

PROJECT: ${context.projectName || 'Unknown'}
YOUR DISCIPLINES: ${discList} — count devices for EACH discipline separately

LEGEND DICTIONARY:
${JSON.stringify((context.wave0?.LEGEND_DECODER?.symbols || []).filter(s => allDisc.some(d => s.discipline === d || s.category === d)), null, 2).substring(0, 4000)}

FIRST READ COUNTS (for reference — verify independently):
${JSON.stringify(context.wave1?.SYMBOL_SCANNER?.totals || {}, null, 2).substring(0, 2000)}

INSTRUCTIONS:
1. Go sheet by sheet counting devices for EACH of the ${allDisc.length} discipline(s)
2. For each device, note the exact location (room name or grid reference)
3. Pay special attention to dense areas where devices cluster
4. Double-check areas near MDF/IDF rooms where device density is highest
5. Report any devices that are partially hidden behind text or other symbols

═══ CRITICAL — DATA DROP MULTIPLIER NOTATION ═══
Symbols with numeric prefixes like "2D", "4D", "1D" indicate the number of data cables at that location.
YOU MUST REPORT TWO COUNTS: "data_outlet_symbols" = physical symbols counted, "data_outlet" = cables after multiplying.
Example: 80 symbols labeled "2D" + 15 labeled "4D" → data_outlet_symbols=95, data_outlet=80×2+15×4=220.
Also include "outlet_breakdown": {"1D": N, "2D": N, "4D": N, "6D": N} showing locations per prefix type.

Return ONLY valid JSON:
{
  "disciplines": ${JSON.stringify(allDisc)},
  "discipline_counts": [
    { "discipline": "${allDisc[0]}", "device_type": "data_outlet", "total": 200, "confidence": 96, "by_sheet": {"E1.01": 80, "E1.02": 120}, "notes": "" }
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

YOUR METHODOLOGY — 9-ZONE GRID DIVISION (3×3):
For each sheet:
1. Mentally divide the drawing into a 3×3 GRID (9 zones): TL, TC, TR, ML, MC, MR, BL, BC, BR
   (Top-Left, Top-Center, Top-Right, Middle-Left, Middle-Center, Middle-Right, Bottom-Left, Bottom-Center, Bottom-Right)
2. Count ALL device symbols in each of the 9 zones independently
3. Sum all 9 zones to get the sheet total
4. This catches devices missed by room-based scanning — smaller zones = higher resolution counting
5. After counting all 9 zones, do a BOUNDARY CHECK: scan the grid lines between zones for devices that sit on borders

WHY THIS WORKS: 9 smaller zones (vs 4 quadrants) dramatically reduces missed devices. Devices at room boundaries, in ceiling spaces, corridors, or areas without clear room labels are caught because each zone is small enough to visually inspect completely.

═══ CRITICAL — DATA DROP MULTIPLIER NOTATION ═══
Symbols with numeric prefixes like "2D", "4D", "1D" indicate the number of data cables at that location.
YOU MUST REPORT TWO COUNTS: "data_outlet_symbols" = physical symbols counted, "data_outlet" = cables after multiplying.
Example: 80 symbols labeled "2D" + 15 labeled "4D" → data_outlet_symbols=95, data_outlet=80×2+15×4=220.
Also include "outlet_breakdown": {"1D": N, "2D": N, "4D": N, "6D": N} showing locations per prefix type.

Return ONLY valid JSON:
{
  "grid_counts": [
    {
      "sheet_id": "E1.01",
      "TL": { "camera": 2, "data_outlet": 8 }, "TC": { "camera": 1, "data_outlet": 5 }, "TR": { "camera": 2, "data_outlet": 7 },
      "ML": { "camera": 1, "data_outlet": 6 }, "MC": { "camera": 0, "data_outlet": 4 }, "MR": { "camera": 1, "data_outlet": 5 },
      "BL": { "camera": 2, "data_outlet": 10 }, "BC": { "camera": 3, "data_outlet": 8 }, "BR": { "camera": 2, "data_outlet": 12 },
      "sheet_total": { "camera": 14, "data_outlet": 65 }
    }
  ],
  "totals": { "camera": 48, "data_outlet": 200 },
  "outlet_breakdown": { "1D": 10, "2D": 80, "4D": 15, "6D": 0 },
  "boundary_devices": [
    { "sheet": "E1.01", "type": "data_outlet", "count": 3, "note": "On grid boundary — counted once in nearest zone" }
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

EXCLUSIONS (BY OTHERS / NIC — DO NOT COUNT these in device totals):
${JSON.stringify(context.wave1?.ANNOTATION_READER?.exclusions || [], null, 2).substring(0, 2000)}

SCOPE EXCLUSION SCANNER (dedicated per-page exclusion findings):
${JSON.stringify(context.wave1?.SCOPE_EXCLUSION_SCANNER?.exclusions || [], null, 2).substring(0, 3000)}
RESPONSIBILITY MATRIX:
${JSON.stringify(context.wave1?.SCOPE_EXCLUSION_SCANNER?.responsibility_matrix || [], null, 2).substring(0, 2000)}

═══ SPEC CROSS-REFERENCE DATA ═══
${JSON.stringify(context.wave1?.SPEC_CROSS_REF?.discrepancies || [], null, 2).substring(0, 1500)}

═══ RISER DIAGRAM DATA ═══
${JSON.stringify(context.wave1?.RISER_DIAGRAM_ANALYZER?.headend_equipment || [], null, 2).substring(0, 1500)}

CONSENSUS RULES:
1. If ALL reads agree within 5% → HIGH CONFIDENCE. Use the average of all reads.
2. If 2+ reads agree within 5% → MODERATE CONFIDENCE. Use the average of the agreeing group ONLY (discard outliers).
3. If ALL reads disagree by >10% → DISPUTE. Flag for targeted re-scan.
4. For disputed items, identify WHICH sheets/areas likely caused the disagreement.
5. MULTIPLIER DETECTION: If one scanner reports SIGNIFICANTLY more data_outlets than others (e.g., 280 vs 130), check if the higher count correctly applied the 2D/4D multiplier notation while lower counts did NOT. In this case, PREFER THE HIGHER COUNT — the lower scanners miscounted by treating each "2D" symbol as 1 outlet instead of 2. A count that is ~2× another is a classic sign of missed multipliers.
6. When reads disagree and it's NOT a multiplier issue, prefer the count most CONSISTENT with the building size and floor plan density. Do NOT blindly use the highest count — overcounting inflates bids.
7. COMMON UNDERCOUNTING ERRORS TO WATCH FOR:
   - Data drops: Check EVERY floor including basement, mechanical rooms, and spaces behind the main corridors
   - WAPs: Look in reflected ceiling plans AND enlarged plans — WAPs are often on separate sheets
   - Speakers: Count on EACH floor — reflected ceiling plans sometimes show only one floor as "typical"
   - Card readers: Count on door schedules AND floor plans — some readers are on doors not shown on the security plan
   - Glass break sensors: Often shown on enlarged interior elevation details, NOT on floor plans
   - If your total count seems LOW compared to the building size, it probably IS low — recount

═══ CRITICAL: DATA DROP MULTIPLIER VERIFICATION ═══
Each scanner now reports TWO separate counts:
- "data_outlet_symbols" = physical outlet symbols counted on the plans
- "data_outlet" = total cables after applying multipliers (2D×2, 4D×4, etc.)

HOW TO VERIFY MULTIPLIER APPLICATION:
1. Compare data_outlet_symbols vs data_outlet for EACH scanner read
2. If data_outlet ≈ data_outlet_symbols (ratio ~1.0), that scanner DID NOT multiply — it counted symbols as cables
3. If data_outlet ≈ data_outlet_symbols × 2 (ratio ~2.0), that scanner correctly applied 2D multiplier
4. For your consensus, ALWAYS use the MULTIPLIED count (data_outlet), never the symbol count
5. If scanners disagree on data_outlet but AGREE on data_outlet_symbols, the symbol count is reliable — multiply it yourself using the outlet_breakdown

${context.wave0?.LEGEND_DECODER?.multiplier_map ? `LEGEND-CONFIRMED MULTIPLIERS: ${JSON.stringify(context.wave0.LEGEND_DECODER.multiplier_map)}
Use these to VERIFY: if outlet_breakdown shows 118 "2D" locations and multiplier_map says "2D"=2, then data_outlet for those MUST be 236.` : ''}

OUTLET BREAKDOWN (MANDATORY): Include "outlet_breakdown" in your response:
{"1D": count, "2D": count, "4D": count, "6D": count} — these are LOCATIONS (physical symbols), not cable counts.
Also include "data_outlet_symbols" in consensus_counts showing the verified physical symbol count.

VERIFICATION FORMULA: data_outlet = (1D×1) + (2D×2) + (4D×4) + (6D×6). If your consensus data_outlet does NOT equal this formula applied to your consensus outlet_breakdown, FIX IT to match the formula. The formula is deterministic — the arithmetic cannot be wrong.

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
  "outlet_breakdown": { "1D": 10, "2D": 80, "4D": 15, "6D": 0 },
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
        // Also collect problem areas from per-page scans where counts varied wildly between passes
        const perPageVariances = [];
        const scanResults = context._perPageScanResults || {};
        for (const [sheetId, passes] of Object.entries(scanResults)) {
          if (!Array.isArray(passes) || passes.length < 2) continue;
          const deviceTypes = new Set();
          passes.forEach(p => { if (p?.totals) Object.keys(p.totals).forEach(k => deviceTypes.add(k)); });
          for (const dt of deviceTypes) {
            const counts = passes.map(p => p?.totals?.[dt] || 0).filter(c => c > 0);
            if (counts.length < 2) continue;
            const max = Math.max(...counts);
            const min = Math.min(...counts);
            if (max > 0 && ((max - min) / max) > 0.2) {
              perPageVariances.push({ sheet_id: sheetId, device_type: dt, pass_counts: counts, variance_pct: Math.round(((max - min) / max) * 100) });
            }
          }
        }
        if (disputes.length === 0 && perPageVariances.length === 0) return '';
        return `You are a FORENSIC SYMBOL COUNTER performing a TARGETED THIRD READ. The consensus engine found ${disputes.length} disputed item(s) and per-page scanning found ${perPageVariances.length} high-variance sheet(s).

YOUR MISSION: Re-count ONLY the disputed items. Focus ONLY on the problem areas identified below.
${perPageVariances.length > 0 ? `
═══ HIGH-VARIANCE SHEETS (per-page scan passes disagreed by >20%) ═══
These specific sheets had inconsistent counts across scan passes. Re-examine each carefully:
${JSON.stringify(perPageVariances.slice(0, 20), null, 2)}
` : ''}
DISPUTED ITEMS FOR RE-COUNT:
${JSON.stringify(disputes, null, 2)}

LEGEND DICTIONARY:
${JSON.stringify(context.wave0?.LEGEND_DECODER?.symbols || [], null, 2).substring(0, 3000)}

INSTRUCTIONS:
1. For each disputed item, go to the specified problem area on the drawings
2. Count with EXTREME precision — examine each room individually, count twice
3. CHECK SCHEDULES: If an equipment schedule exists for this device type, the schedule count is AUTHORITATIVE
4. CHECK TYPICAL NOTES: If "TYP" or "TYPICAL" appears, multiply the device by the number of matching locations
   - SPEAKERS/PAGING: Speakers on plans almost ALWAYS have "TYP" annotation meaning one per room or one per zone.
     Count the number of rooms/zones that need coverage and multiply. A plan showing 1 speaker with "TYP" on a floor
     with 20 offices means 20 speakers, not 1.
   - DETECTORS: Smoke/heat detectors marked "TYP" in a corridor = one per code-required spacing interval (~30ft)
   - DATA OUTLETS: "TYP" at a workstation = one per workstation of that type on the floor
   ═══ DATA DROP MULTIPLIER NOTATION ═══
   Symbols with numeric prefixes like "2D", "4D", "1D" indicate HOW MANY CABLES at that location.
   "2D" = 2 data drops (2 Cat6 cables), "4D" = 4 data drops. Count each "2D" as 2 data_outlets, each "4D" as 4.
   Total data_outlet count = SUM of multiplied values, NOT number of symbols. A sheet with 20x "2D" symbols and 5x "4D" symbols = 60 data outlets (40+20), NOT 25.
5. CHECK EVERY FLOOR: Devices often repeat on multiple floors — count each floor separately and add
6. If a symbol is ambiguous, describe what you see and your best judgment
7. When in doubt, prefer the HIGHER count — undercounting loses bids, overcounting gets corrected at submittal
8. SPEAKER/PAGING SPECIFIC: If the dispute involves speakers, check ceiling plans, reflected ceiling plans, AND
   paging/intercom diagrams. Speakers are often shown on a different sheet than other ELV devices.
9. Provide your final authoritative count with PER-SHEET breakdown and reasoning

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
  "overall_assessment": "string",
  "true_change_orders": [
    { "description": "No grounding bus bar specified for MDF rack — NEC 250.94 requires intersystem bonding termination", "estimated_impact": "$800-$1,500", "severity": "medium", "justification": "Code requirement not addressed in the contract documents — this will be discovered during inspection and result in a change order to add compliant grounding", "recommendation": "Include grounding bus bar in bid as a line item with note 'Required per NEC 250.94 — not shown on plans' — positions 3D for approved CO if GC pushes back", "cost_breakdown": "TMGB bus bar: $250, #6 AWG bonding conductor (50ft): $120, Cadweld/clamps: $80, labor 4hrs @ $145/hr: $580", "discipline": "Structured Cabling", "contract_reference": "NEC 250.94 / TIA-607-C — not referenced in spec or drawings" },
    { "description": "Fire-rated backboard and barrier required above drop ceiling at fire wall penetrations — not shown on plans", "estimated_impact": "$2,000-$5,000", "severity": "high", "justification": "Fire code requires rated barriers at all penetrations through fire-rated assemblies — drawings show cable pathways crossing fire walls but no firestopping details are provided, making this a guaranteed change order", "recommendation": "Submit RFI requesting firestopping details at all fire-rated wall/floor penetrations — add exclusion to proposal: 'Firestopping by others unless shown on plans'", "cost_breakdown": "Firestop pillows/putty per penetration (est. 8): $640, fire-rated backboards (4): $480, labor 16hrs @ $145/hr: $2,320, fire marshal inspection coordination: $500", "discipline": "Structured Cabling / Fire Alarm", "contract_reference": "IBC 714, NFPA 101 — no firestopping detail on drawings" }
  ]
}

CRITICAL — true_change_orders RULES:
These are REAL change orders — items NOT in the plans or specs that WILL cost the contractor money. As a hostile auditor, identify scope gaps that will become change orders during construction:
- Code requirements the designer missed or didn't detail
- Industry-standard items that are ALWAYS needed but not shown (grounding, firestopping, seismic bracing)
- Scope that is ambiguous enough that the owner will request it but the contractor didn't price it
- Conditions that cannot be verified until construction begins
- Items where the plans are silent but field conditions will demand action
Do NOT include items that are already on the plans or in the specs — those are bid corrections, not change orders.
Each item MUST have ALL of these fields:
- description: Clear statement of what the change order IS
- estimated_impact: Dollar range (e.g. "$800-$1,500")
- severity: critical/high/medium/low
- justification: Detailed explanation of WHY this will become a change order — what code requires it, what's missing from the documents, what will trigger it during construction
- recommendation: Actionable advice for 3D — submit RFI, add exclusion to proposal, price as alternate, include in bid with note, etc.
- cost_breakdown: Itemized breakdown showing material costs, labor hours × rate, and overhead that justify the estimated impact
- discipline: Which trade this falls under (Structured Cabling, Fire Alarm, Security, Access Control, AV, Site/Civil, etc.)
- contract_reference: The specific code section, spec section, or drawing sheet where the gap exists`,

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

      // ── BRAIN 21: Spec Cross-Reference (Wave 1) ─────────────────
      SPEC_CROSS_REF: () => `You are a SPECIFICATION CROSS-REFERENCE EXPERT for ELV/low voltage construction projects.

PROJECT: ${context.projectName || 'Unknown'} | Type: ${context.projectType || 'Unknown'}
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

CRITICAL CHECK: Look for scope items in the spec that have NO corresponding symbol on any drawing. These are commonly missed and result in change orders.

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
    { "description": "Spec section 28 23 00 calls for tamper switches on all camera housings but no tamper switches are shown on drawings or included in any schedule", "estimated_impact": "$1,500-$3,000", "severity": "medium", "justification": "The specification requires this item but it is not detailed in the contract drawings — this gap between specs and drawings will likely result in a change order when the installer discovers the requirement during construction", "recommendation": "Submit RFI: 'Spec 28 23 00 requires tamper switches but none shown on drawings or in device schedule — please clarify if required.' If required, submit CO for additional material and labor.", "cost_breakdown": "Tamper switches (est. 12 cameras × $45 ea): $540, additional wiring per camera (15ft × $0.35/ft × 12): $63, labor 6hrs @ $145/hr: $870, commissioning/testing: $300", "discipline": "Security / CCTV", "contract_reference": "Spec 28 23 00 vs. Drawing Sheet T-3 Device Schedule" },
    { "description": "Specs require Cat6A shielded cable but drawings show standard Cat6 — if owner enforces spec, material cost increase is significant", "estimated_impact": "$8,000-$15,000", "severity": "high", "justification": "Direct conflict between specifications and drawings creates ambiguity in the contract documents — the contractor cannot be held to both requirements, and resolution will require a change order", "recommendation": "Submit RFI immediately: 'Spec 27 15 00 calls for Cat6A shielded but drawing notes reference Cat6 UTP — please confirm cable type.' Bid to the drawing (Cat6 UTP) and note the spec conflict as exclusion.", "cost_breakdown": "Cat6A shielded vs Cat6 UTP delta: ~$0.35/ft × est. 25,000ft = $8,750, shielded patch panels (6 × $180 delta): $1,080, additional grounding/bonding: $800, labor premium for shielded termination: $2,400", "discipline": "Structured Cabling", "contract_reference": "Spec 27 15 00 Section 2.1 vs. Drawing T-1 General Notes" }
  ]
}

CRITICAL — true_change_orders RULES:
These are ONLY scope items where the SPECS and DRAWINGS CONFLICT or where scope is IMPLIED but not explicitly documented. They represent real change order risks due to:
- Spec requirements with no corresponding drawing detail (spec says it, drawings don't show it)
- Drawing items that contradict the written specifications
- Spec sections that reference standards or codes requiring additional work not shown on plans
- Equipment specified but with no installation detail, location, or pathway shown
- Ambiguities between spec language and drawing intent that will require clarification (and cost) during construction
Each item MUST have ALL of these fields:
- description: Clear statement of the conflict or gap
- estimated_impact: Dollar range (e.g. "$1,500-$3,000")
- severity: critical/high/medium/low
- justification: Detailed explanation of WHY this is a change order — what the spec says vs. what the drawing shows, and why it can't be resolved without additional cost
- recommendation: Actionable advice — submit RFI, add exclusion, bid to drawings with spec conflict noted, etc.
- cost_breakdown: Itemized material, labor, and overhead breakdown justifying the estimated impact
- discipline: Which trade (Structured Cabling, Fire Alarm, Security, Access Control, AV, etc.)
- contract_reference: The specific spec section AND drawing sheet where the conflict exists`,

      // ── BRAIN 22: Annotation Reader (Wave 1) ────────────────────
      ANNOTATION_READER: () => `You are a CONSTRUCTION ANNOTATION & CALLOUT EXPERT. Your job is to read EVERY text annotation, note, callout bubble, detail reference, and schedule on the ELV plan drawings.

PROJECT: ${context.projectName || 'Unknown'} | Type: ${context.projectType || 'Unknown'}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

YOUR MISSION: Capture EVERY piece of text information on EVERY page of the drawings. Read ALL notes, annotations, callouts, and schedules. Do NOT skip any page or any note.

═══ CRITICAL: READ ALL NOTES ON EVERY SINGLE PAGE ═══
You must read EVERY note on EVERY sheet — not just the ones near devices. Notes contain critical scope information that directly affects the bid price. Missing a single note like "conduit provided by electrical contractor" can cost thousands of dollars.

WHAT TO CAPTURE:
1. General notes and keynotes (numbered or lettered notes) — READ EVERY ONE
2. Detail callout bubbles (e.g., "See Detail 3/E6.01")
3. Equipment schedules and tables shown on drawings — READ EVERY ROW
4. Typical installation notes (e.g., "TYP." or "TYPICAL — provide at each door")
5. "NIC" (Not In Contract), "BY OTHERS", "OFCI", "OFOI", "BY EC", "BY ELECTRICAL", "VENDOR FURNISHED" annotations — these exclude scope. READ EVERY INSTANCE — each one saves thousands of dollars in bid accuracy
6. Quantity notes like "QTY: 4" or "(x3)" next to symbols
7. Demolition notes (items to be removed or replaced)
8. References to addenda changes
9. CONDUIT NOTES — who provides conduit? "Conduit by electrical contractor", "conduit by others", "EC to provide conduit" all mean the low-voltage contractor does NOT provide conduit
10. Cable type specifications — "All data cabling shall be Cat6A", "Provide plenum-rated cable above drop ceiling"
11. Mounting height notes — "Mount cameras at 12' AFF", "Card readers at 48" AFF"
12. Pathway routing notes — "Route cables in cable tray", "Use J-hooks at 5' spacing"
13. Testing and certification requirements — "Test and certify all data drops per TIA-568"

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

      // ── BRAIN 29: Scope Exclusion Scanner (Wave 1 — Per-Page) ──────
      SCOPE_EXCLUSION_SCANNER: () => `You are a SCOPE EXCLUSION EXPERT for ELV construction projects. Your ONLY job is to find items that are NOT in the low-voltage contractor's scope.

PROJECT: ${context.projectName || 'Unknown'} | Type: ${context.projectType || 'Unknown'}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

YOUR MISSION: On THIS PAGE, find EVERY annotation, note, schedule entry, keynote, abbreviation, or responsibility assignment that indicates an item is:

═══ EXCLUSION CATEGORIES — SEARCH FOR ALL OF THESE ═══

1. OFCI (Owner Furnished, Contractor Installed)
   Keywords: "OFCI", "owner furnished", "furnished by owner", "GFE" (government furnished equipment)
   Treatment: Material = $0, labor only

2. OFOI (Owner Furnished, Owner Installed)
   Keywords: "OFOI", "owner furnished owner installed", "owner installed"
   Treatment: EXCLUDE ENTIRELY — no material, no labor

3. NIC (Not In Contract)
   Keywords: "NIC", "not in contract", "N.I.C.", "not included"
   Treatment: EXCLUDE ENTIRELY

4. BY OTHERS
   Keywords: "by others", "by owner", "by GC", "by general contractor", "by mechanical", "by electrical", "by EC", "by electrical contractor", "by plumbing", "by Division 26", "by Division 28", "by Div 26", "Div. 26", "by fire protection contractor"
   Treatment: EXCLUDE ENTIRELY

5. VENDOR/MANUFACTURER FURNISHED
   Keywords: "vendor furnished", "vendor supplied", "manufacturer furnished", "factory furnished", "pre-installed", "furnished by security integrator"
   Treatment: Material = $0 (someone else buys it, we may install it)

6. EXISTING TO REMAIN / REUSE
   Keywords: "existing to remain", "ETR", "reuse existing", "existing", "salvage and reinstall"
   Treatment: No new material — labor only if reinstallation required

7. RESPONSIBILITY MATRIX / DIVISION OF WORK
   Look for tables or matrices that assign responsibility per trade:
   - "Division 26 — Electrical" vs "Division 27 — Communications" vs "Division 28 — Safety"
   - "Contractor Responsibility Matrix" or "Scope Matrix"
   - Column headers like "By EC", "By Low Voltage", "By Owner", "By GC"
   - If fire alarm is assigned to Division 26 or "electrical contractor" → it's NOT our scope
   - If grounding/bonding is assigned to "EC" or "electrical contractor" → NOT our scope

   VA / FEDERAL PROJECT RESPONSIBILITY MATRICES:
   VA projects use a "Technology Systems Responsibility Matrix" (usually on sheet T-0.0) with abbreviations:
   - TC = Telecom Contractor (THIS IS US — our scope)
   - SEC = Security Contractor (NOT us unless we are also the security sub)
   - AV = Audio Visual Contractor (NOT us)
   - EC = Electrical Contractor (NOT us)
   - NC = Nurse Call Contractor (NOT us unless specified)
   - GC/DH = General Contractor / Door Hardware (NOT us)
   - Owner = Government/VA (NOT us)

   For EACH discipline row in the matrix, output a responsibility_matrix entry with our_scope = true ONLY if TC is the responsible party.
   If a discipline shows "SEC" or "AV" or "EC" or "NC" or "Owner" or "GC" as the responsible party, set our_scope = false.

8. DRAWING SHEET SCOPE NOTES
   Title blocks or general notes that say things like:
   - "This contractor shall furnish and install..." (defines what IS in scope)
   - "The following are NOT included in this contract..."
   - "Work by others includes..."
   - "Telecommunications contractor scope is limited to..."

═══ WHAT TO LOOK FOR ON EACH PAGE ═══

A. TEXT ANNOTATIONS next to or near device symbols (e.g., "OFOI" next to a camera symbol)
B. KEYNOTES in the margin (e.g., "3. Network switches by owner")
C. GENERAL NOTES blocks (usually on sheet T-0.0, T-0.1, or the first sheet of each discipline)
D. SCHEDULE COLUMNS that say "Furnished By" or "Installed By" or "Responsibility"
E. ABBREVIATION LEGENDS that define OFCI, OFOI, NIC, GFE
F. RESPONSIBILITY MATRICES — tables showing which trade provides what
G. SMALL TEXT near specific items — often "BY EC" or "NIC" is printed very small
H. TITLE BLOCK NOTES about scope limitations

═══ COMMON PATTERNS BY DISCIPLINE ═══

CCTV:
- Cameras may be OFOI (owner buys and installs their own preferred cameras)
- VMS/NVR software may be "vendor furnished" or "by security integrator"
- Only cabling/conduit/backboxes may be in our scope
- Look for: "Cabling only" or "rough-in only" or "conduit and box only"

ACCESS CONTROL:
- Head-end server often "by others" or "owner furnished"
- Readers/hardware may be furnished by the access control vendor
- Look for: "hardware by door hardware supplier" or "by HHW" (hollow metal/hardware)

FIRE ALARM:
- Often assigned entirely to Division 26 (Electrical) or Division 28
- Look for responsibility matrix on sheet T-0.0 or FA-0.0
- If assigned to another division, our scope = $0 for fire alarm

STRUCTURED CABLING:
- Network switches almost always OFCI or "by IT" or "by owner"
- UPS may be owner furnished
- PDUs may be owner furnished
- Grounding/bonding may be "by EC" (electrical contractor)
- CONDUIT — CRITICAL: Conduit (EMT, rigid, PVC, liquidtight) is very often provided and installed by the ELECTRICAL CONTRACTOR (Division 26), not the low-voltage contractor. Look for:
  - "Conduit by EC" or "Conduit by electrical contractor"
  - "Conduit provided by others"
  - "Division 26 to provide all conduit"
  - "Electrical contractor to provide empty conduit"
  - "Low-voltage contractor to pull cable in conduit provided by EC"
  - Responsibility matrix showing "Conduit" under "By EC" column
  If conduit is by EC, it is a MAJOR cost exclusion — all conduit material and conduit labor is NOT in our scope

INTRUSION:
- Alarm panel may be "vendor furnished" by monitoring company

Return ONLY valid JSON:
{
  "exclusions": [
    {
      "item": "IP Cameras (all types)",
      "category": "CCTV",
      "treatment": "OFOI",
      "annotation_text": "OFOI — cameras, mounts, and VMS furnished and installed by owner",
      "sheet_id": "T-5.1",
      "impact": "Exclude all camera hardware, mounts, NVR, VMS licenses from BOM. Price cabling only.",
      "estimated_cost_excluded": "high"
    },
    {
      "item": "Network Switches",
      "category": "Structured Cabling",
      "treatment": "OFCI",
      "annotation_text": "Network switches OFCI — furnished by owner IT department",
      "sheet_id": "T-0.0",
      "impact": "Set switch material cost to $0. Include rack space and patch cord labor.",
      "estimated_cost_excluded": "high"
    },
    {
      "item": "Grounding and Bonding",
      "category": "Structured Cabling",
      "treatment": "BY_EC",
      "annotation_text": "Grounding and bonding by electrical contractor per Division 26",
      "sheet_id": "T-0.0",
      "impact": "Exclude TMGB, TGB, bonding conductors, ground lugs from BOM.",
      "estimated_cost_excluded": "medium"
    }
  ],
  "responsibility_matrix": [
    {
      "sheet_id": "T-0.0",
      "discipline": "Fire Alarm",
      "responsible_party": "Division 26 — Electrical Contractor",
      "our_scope": false,
      "notes": "Fire alarm design-build by electrical contractor"
    }
  ],
  "scope_boundaries": [
    {
      "sheet_id": "T-0.0",
      "text": "Telecommunications contractor scope includes structured cabling, access control cabling, and CCTV cabling only",
      "interpretation": "We provide cabling infrastructure only — no end devices for CCTV or access control"
    }
  ],
  "no_exclusions_found": false
}`,

      // ── BRAIN 23: Riser Diagram Analyzer (Wave 1) ───────────────
      RISER_DIAGRAM_ANALYZER: () => `You are a RISER DIAGRAM & ONE-LINE DIAGRAM EXPERT for ELV/low voltage construction projects.

PROJECT: ${context.projectName || 'Unknown'} | Type: ${context.projectType || 'Unknown'}
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
    { "type": "fiber_sm", "strand_count": 12, "runs": 6, "total_length_ft": 1200, "termination": "LC connectors" },
    { "type": "cat6a_25pair", "pairs": 25, "runs": 4, "total_length_ft": 800 }
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

      // ── BRAIN 28: Device Locator (Wave 1) ───────────────────────
      DEVICE_LOCATOR: () => `You are a DEVICE POSITION MAPPER for ELV construction plan sheets.

PROJECT: ${context.projectName || 'Unknown'} | Type: ${context.projectType || 'Unknown'}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

═══ OCR-EXTRACTED SCALE DATA (use to ground your position estimates) ═══
${(() => {
  const ocrData = context._ocrScaleData || [];
  const withScale = ocrData.filter(p => p.ftPerInch > 0);
  if (withScale.length === 0) return 'No OCR scale data available.';
  return withScale.map(p =>
    '  Page ' + p.pageNum + ' (' + p.sheetId + '): ' + p.ftPerInch + ' ft/inch (' + p.scaleText + ')'
  ).join('\n') + '\nUse these scales to estimate real-world distances between devices and to calibrate door measurements.';
})()}

LEGEND (decoded symbols):
${JSON.stringify(context.wave0?.LEGEND_DECODER?.symbols || [], null, 2).substring(0, 2000)}

SPATIAL LAYOUT (sheet data):
${JSON.stringify((context.wave0?.SPATIAL_LAYOUT?.sheets || []).map(s => ({ sheet_id: s.sheet_id, scale: s.scale, width_ft: s.sheet_area_width_ft, depth_ft: s.sheet_area_depth_ft })), null, 2).substring(0, 6000)}

YOUR MISSION: For every ELV device symbol on every plan sheet, record its PIXEL POSITION on the image.
This data is used for automated cable run length measurement.

INSTRUCTIONS:
1. For each sheet, identify ALL device symbols (cameras, readers, WAPs, speakers, detectors, panels, etc.)
2. Record the pixel coordinates (x_px, y_px) of each device's CENTER POINT on the uploaded image
3. Mark IDF/MDF/telecom rooms/FACP panels as "is_home_run: true" — these are cable destination points
4. Assign each device a unique ID using its label from the drawing (e.g., "CAM-01", "CR-3", "WAP-2F-01")
5. Also detect DOOR SWINGS and record the hinge point and latch edge coordinates for scale calibration

SCALE CALIBRATION SUPPORT:
- Look for door swings (quarter-circle arcs with straight door leaf line)
- Record the hinge point (x1_px, y1_px) and latch edge (x2_px, y2_px) of each door
- Standard commercial door = 36" wide (3 feet)
- This data enables automatic scale calibration from door measurements

Return ONLY valid JSON:
{
  "devices": [
    {
      "id": "CAM-01",
      "type": "camera",
      "sheet_id": "E1.01",
      "x_px": 1432,
      "y_px": 890,
      "x_pct": 45.2,
      "y_pct": 62.1,
      "floor": 1,
      "is_home_run": false,
      "home_run_id": "IDF-1",
      "mount_type": "ceiling",
      "label": "Camera C-1"
    }
  ],
  "home_runs": [
    {
      "id": "IDF-1",
      "type": "idf",
      "sheet_id": "E1.01",
      "x_px": 200,
      "y_px": 450,
      "x_pct": 6.3,
      "y_pct": 31.5,
      "floor": 1,
      "is_home_run": true,
      "label": "Telecom Room 101"
    }
  ],
  "doors": [
    {
      "sheet_id": "E1.01",
      "x1_px": 500,
      "y1_px": 300,
      "x2_px": 530,
      "y2_px": 300,
      "type": "commercial_single",
      "arc_radius_px": 30
    }
  ],
  "image_dimensions": {
    "width_px": 3200,
    "height_px": 2400
  }
}

CRITICAL RULES:
- Pixel coordinates must be relative to the FULL uploaded image (0,0 = top-left corner)
- Also provide x_pct/y_pct as percentage positions (0-100) for compatibility with existing systems
- Include ALL devices, not just one type — cameras, readers, WAPs, speakers, detectors, EVERYTHING
- For multi-sheet uploads, include sheet_id on every device so positions map to the correct sheet
- home_run_id should reference the nearest IDF/MDF/panel the device would cable back to
- mount_type: "ceiling" for ceiling devices, "wall" for wall-mount, "floor" for floor/desk mount`,

      // ── BRAIN 24: Zoom Scanner (Wave 1.5) ───────────────────────
      ZOOM_SCANNER: () => `You are a HIGH-MAGNIFICATION ZOOM SCANNER for ELV device symbols. Divide each sheet into a 3×3 GRID (9 zones) and count with extreme precision.

PROJECT: ${context.projectName || 'Unknown'}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

LEGEND (key symbols only):
${JSON.stringify(context.wave0?.LEGEND_DECODER?.symbols || [], null, 2).substring(0, 2000)}

METHOD — For EACH sheet, divide into a 3×3 GRID (9 zones: TL, TC, TR, ML, MC, MR, BL, BC, BR):
- Count every device symbol in each of the 9 zones independently
- Sum all 9 zones for the sheet total
- Pay special attention to: dense areas, stacked symbols, devices behind text
- Don't double-count at zone boundaries — count each device in the zone where its CENTER falls
- After counting all zones, do a FOCUSED RE-CHECK of zone boundaries where devices cluster

═══ CRITICAL — DATA DROP MULTIPLIER NOTATION ═══
Symbols with numeric prefixes like "2D", "4D", "1D" indicate the number of data cables at that location.
YOU MUST REPORT TWO COUNTS: "data_outlet_symbols" = physical symbols counted, "data_outlet" = cables after multiplying.
Example: 80 symbols labeled "2D" + 15 labeled "4D" → data_outlet_symbols=95, data_outlet=80×2+15×4=220.
Also include "outlet_breakdown": {"1D": N, "2D": N, "4D": N, "6D": N} showing locations per prefix type.

Return ONLY valid JSON:
{
  "grid_counts": [
    {
      "sheet_id": "E1.01",
      "TL": { "data_outlet": 5, "camera": 1 }, "TC": { "data_outlet": 4, "camera": 1 }, "TR": { "data_outlet": 3, "camera": 1 },
      "ML": { "data_outlet": 6, "camera": 1 }, "MC": { "data_outlet": 3, "camera": 0 }, "MR": { "data_outlet": 6, "camera": 1 },
      "BL": { "data_outlet": 4, "camera": 2 }, "BC": { "data_outlet": 6, "camera": 1 }, "BR": { "data_outlet": 8, "camera": 3 },
      "sheet_total": { "data_outlet": 45, "camera": 11 }
    }
  ],
  "zoom_findings": [
    { "sheet_id": "E1.01", "zone": "BR", "description": "3 stacked WAPs behind title block", "device_type": "wap", "additional_count": 3 }
  ],
  "grand_totals": {},
  "methodology": "9-zone high-magnification scan"
}`,

      // ── BRAIN 25: Per-Floor Analyzer (Wave 1.5) ─────────────────
      PER_FLOOR_ANALYZER: () => `You are a PER-FLOOR INDEPENDENT ANALYZER for ELV construction documents. You analyze each floor as a SEPARATE ENTITY and compare results to find floor-specific anomalies.

PROJECT: ${context.projectName || 'Unknown'} | Type: ${context.projectType || 'Unknown'}
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

═══ CRITICAL — DATA DROP MULTIPLIER NOTATION ═══
Symbols with numeric prefixes like "2D", "4D", "1D" indicate the number of data cables at that location.
YOU MUST REPORT TWO COUNTS: "data_outlet_symbols" = physical symbols counted, "data_outlet" = cables after multiplying.
Example: 80 symbols labeled "2D" + 15 labeled "4D" → data_outlet_symbols=95, data_outlet=80×2+15×4=220.
Also include "outlet_breakdown": {"1D": N, "2D": N, "4D": N, "6D": N} showing locations per prefix type.

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

PROJECT: ${context.projectName || 'Unknown'} | Type: ${context.projectType || 'Unknown'}
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

    if (state.isTransitRailroad || /amtrak|bnsf|union pacific|transit|railroad|railway|metro|bart|caltrain|light rail|commuter rail|rail station|train station/.test(projectText)) {
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

    // Critical brains that MUST succeed — they get the full retry budget
    // FIX: Cap validation retries to 3 (was up to 8-10, each triggering full _invokeBrain with 10 retries = up to 100 API calls)
    const CRITICAL_BRAINS = ['SYMBOL_SCANNER', 'MATERIAL_PRICER', 'LABOR_CALCULATOR', 'FINANCIAL_ENGINE', 'CONSENSUS_ARBITRATOR', 'ESTIMATE_CORRECTOR', 'REPORT_WRITER'];
    const MAX_VALIDATION_RETRIES = CRITICAL_BRAINS.includes(key) ? 3 : 2;

    try {
      // Build prompt with context
      const prompt = this._getPrompt(key, context);
      
      // Guard: if prompt is empty, skip brain cleanly (e.g., TARGETED_RESCANNER with no disputes)
      if (!prompt || prompt.trim().length === 0) {
        console.log(`[Brain:${brain.name}] Prompt is empty — skipping (no work required)`);
        this._brainStatus[key] = { status: 'done', progress: 100, result: { _skipped: true, reason: 'No input data' }, error: null };
        results[key] = { _skipped: true, reason: 'No input data' };
        const completed = incrementCompleted();
        const pct = baseProgress + (completed / totalBrains) * (endProgress - baseProgress);
        progressCallback(pct, `✅ ${brain.name} skipped (no work required)`, this._brainStatus);
        return;
      }
      
      const fileParts = brain.needsFiles.length > 0 ? this._buildFileParts(brain, encodedFiles, context.disciplines) : [];
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
                  console.log(`[Brain:${brain.name}] ✓ Retry ${retryNum} succeeded — validation passed`);
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

  // ═══════════════════════════════════════════════════════════
  // PER-PAGE SCANNING — Individual page analysis for counting brains
  // Sends one page at a time for maximum counting accuracy
  // ═══════════════════════════════════════════════════════════

  // Brains that benefit from per-page scanning (counting-focused brains)
  PER_PAGE_BRAINS: new Set(['SYMBOL_SCANNER', 'SHADOW_SCANNER', 'ZOOM_SCANNER', 'SCOPE_EXCLUSION_SCANNER']),
  // Scans per page is now DYNAMIC based on page count:
  // >50 pages → 1 scan (speed priority — avoids API overload on large sets)
  // 26-50 pages → 2 scans (balanced accuracy)
  // ≤25 pages → 4 scans (maximum accuracy on small sets)
  _getScansPerPage(pageCount) {
    if (pageCount > 50) return 1;
    if (pageCount > 25) return 2;
    return 4;
  },

  async _runPerPageBrain(key, context, encodedFiles, baseProgress, endProgress, totalBrains, results, incrementCompleted, progressCallback) {
    const brain = this.BRAINS[key];
    const useJsonMode = true;

    try {
      const basePrompt = this._getPrompt(key, context);
      if (!basePrompt || basePrompt.trim().length === 0) {
        console.log(`[Brain:${brain.name}] Prompt is empty — skipping (no work required)`);
        this._brainStatus[key] = { status: 'done', progress: 100, result: { _skipped: true, reason: 'No input data' }, error: null };
        results[key] = { _skipped: true, reason: 'No input data' };
        incrementCompleted();
        progressCallback(baseProgress, `✅ ${brain.name} skipped (no work required)`, this._brainStatus);
        return;
      }

      // Collect all JPEG chunk files from the brain's needed file categories
      const pageChunks = [];
      const contextTextParts = [];

      for (const category of brain.needsFiles) {
        const files = encodedFiles[category] || [];
        for (const f of files) {
          if (f.name && (f.name.includes('_chunk') || f.name.includes('_page')) && (f.mimeType === 'image/jpeg' || f.mimeType === 'image/png') && f.fileUri) {
            pageChunks.push(f);
          } else if (f.extractedText) {
            // Non-chunk files with text (specs, etc.) — include as context
            // SCOPE_EXCLUSION_SCANNER needs more spec text to find responsibility matrices and scope definitions
            const textLimit = (key === 'SCOPE_EXCLUSION_SCANNER') ? 15000 : 2000;
            contextTextParts.push({ text: `\n[CONTEXT: ${f.name}]\n${f.extractedText.substring(0, textLimit)}` });
          }
        }
      }

      // Deduplicate: if the same page was uploaded from two PDFs (same page position, similar size),
      // keep only one copy to avoid double-counting
      const deduped = [];
      const seen = new Map(); // key: chunkNumber, value: file
      for (const f of pageChunks) {
        // Extract page/chunk number from filename (e.g., "legend_chunk14.jpg" → "14", "set_page5_T-101.jpg" → "5")
        const match = f.name.match(/_(?:chunk|page)(\d+)/);
        const chunkNum = match ? match[1] : f.name;
        // Include category (legends/plans/specs) to avoid cross-PDF collisions
        const sizeKey = `${f.category || f.name.replace(/_(?:chunk|page)\d+.*/, '')}_page${chunkNum}_${Math.round(f.size / 1024)}`;

        if (!seen.has(sizeKey)) {
          seen.set(sizeKey, f);
          deduped.push(f);
        } else {
          console.log(`[Brain:${brain.name}] Skipping duplicate chunk: ${f.name} (same page as ${seen.get(sizeKey).name})`);
        }
      }

      if (deduped.length === 0) {
        // No chunks found — fall back to standard single-brain execution
        console.log(`[Brain:${brain.name}] No page chunks found — falling back to standard scan`);
        return this._runSingleBrain(key, context, encodedFiles, baseProgress, endProgress, totalBrains, results, incrementCompleted, progressCallback);
      }

      const scansPerPage = this._getScansPerPage(deduped.length);
      const totalScans = deduped.length * scansPerPage;
      console.log(`[Brain:${brain.name}] ═══ Per-page scanning: ${deduped.length} unique pages × ${scansPerPage} scans = ${totalScans} total scans (${pageChunks.length} chunks, ${pageChunks.length - deduped.length} duplicates removed) ═══`);
      this._brainStatus[key].status = 'running';
      progressCallback(baseProgress, `${brain.emoji} ${brain.name} per-page scanning (${deduped.length} pages × ${scansPerPage} passes)…`, this._brainStatus);

      // ── MULTI-PAGE PAIRING: Find T-0.0 / general notes reference page ──
      // The first telecom page (T-0.0, T-0.1, T0.0) contains the Responsibility Matrix,
      // general notes, abbreviations, and scope definitions. Include it alongside EVERY
      // per-page scan so the brain can cross-reference scope and notes.
      let referencePageParts = [];
      const refPagePatterns = [/T[-.]?0[.-]0/i, /T[-.]?0[.-]1/i, /T[-.]?0\.0/i, /T0\.0/i, /T[-.]?001/i];
      for (const chunk of deduped) {
        const name = chunk.name || '';
        const sheetId = chunk._sheetId || '';
        if (refPagePatterns.some(p => p.test(name) || p.test(sheetId))) {
          referencePageParts = [
            { text: `\n--- REFERENCE PAGE: ${name} (General Notes / Responsibility Matrix — included for cross-reference) ---` },
            { fileData: { mimeType: chunk.mimeType, fileUri: chunk.fileUri } },
          ];
          if (chunk._usedKeyName) referencePageParts[1]._usedKeyName = chunk._usedKeyName;
          console.log(`[Brain:${brain.name}] 📋 Multi-page pairing: T-0.0 reference page found (${name}) — will include with every page scan`);
          break;
        }
      }

      // Build decoded legend context to include in every per-page call
      // Includes both dedicated legend sheet symbols AND plan-embedded legend symbols
      const legendSymbols = context.wave0?.LEGEND_DECODER?.symbols;
      const abbreviations = context.wave0?.LEGEND_DECODER?._abbreviations;
      const planLegendPages = context.wave0?.LEGEND_DECODER?._plan_legend_pages || [];
      let legendContext = '';
      if (legendSymbols && legendSymbols.length > 0) {
        legendContext = `\nDECODED LEGEND — Symbol Meanings (from legend sheets + plan-embedded legends):\n${JSON.stringify(legendSymbols, null, 2).substring(0, 5000)}\n`;
        if (abbreviations && abbreviations.length > 0) {
          legendContext += `\nABBREVIATIONS (from plan sheets):\n${JSON.stringify(abbreviations, null, 2).substring(0, 1500)}\n`;
        }
        if (planLegendPages.length > 0) {
          legendContext += `\nNOTE: Embedded legends were found on these plan pages: ${planLegendPages.join(', ')}. Use these symbol definitions for accurate counting.\n`;
        }
      } else {
        legendContext = '\nNO LEGEND DECODED — If this page contains a symbol legend/key, use it to identify devices.\n';
      }

      // Per-page prompt wrappers (different approach for each scan pass)
      const legendOnPageNote = `
IMPORTANT — EMBEDDED LEGEND CHECK: If this page contains a SYMBOL LEGEND, SYMBOL KEY, ABBREVIATION TABLE, or DEVICE SCHEDULE (often in a corner or margin), USE those definitions to identify devices on this page. Include any legend symbols you find in your "page_legend" field. If no legend is on this page, omit the "page_legend" field.`;

      const scanPrefixes = [
        `═══ PER-PAGE SCAN MODE — PASS 1 (Standard Scan) ═══
You are scanning a SINGLE PAGE of a multi-page construction document set.
Count ONLY the devices visible on THIS ONE PAGE. Do NOT estimate or extrapolate.
If this page is a title sheet, cover page, or has no ELV devices, return empty counts.
Count every symbol carefully — examine each room on this page individually.
${legendOnPageNote}
${legendContext}
═══ END PER-PAGE INSTRUCTIONS ═══

`,
        `═══ PER-PAGE SCAN MODE — PASS 2 (Verification Scan) ═══
You are performing a SECOND INDEPENDENT COUNT of this SINGLE PAGE.
Use a DIFFERENT methodology than a standard left-to-right scan:
- Divide the page into 4 quadrants and count each quadrant separately
- Pay extra attention to: dense clusters, stacked symbols, devices behind text/dimensions
- Check reflected ceiling areas for speakers, detectors, WAPs
- Look for "TYP" annotations — multiply the device by matching locations on this page
- Check door openings for access control devices (reader + REX + contact + strike per door)
Count ONLY the devices visible on THIS ONE PAGE. Do NOT estimate or extrapolate.
${legendOnPageNote}
${legendContext}
═══ END PASS 2 INSTRUCTIONS ═══

`,
        `═══ PER-PAGE SCAN MODE — PASS 3 (Room-by-Room Scan) ═══
You are performing a THIRD INDEPENDENT COUNT of this SINGLE PAGE.
Use ROOM-BY-ROOM methodology:
- Identify every distinct room, corridor, and area on this page
- For EACH room: list every device symbol you see inside it, then count
- After counting each room individually, sum the totals
- Pay special attention to small rooms (closets, vestibules) that may have hidden devices
- Check corridors and open areas for ceiling-mounted devices
- Verify door hardware at every entrance/exit
Count ONLY the devices visible on THIS ONE PAGE. Do NOT estimate or extrapolate.
${legendOnPageNote}
${legendContext}
═══ END PASS 3 INSTRUCTIONS ═══

`,
        `═══ PER-PAGE SCAN MODE — PASS 4 (Symbol-Type Focused Scan) ═══
You are performing a FOURTH INDEPENDENT COUNT of this SINGLE PAGE.
Use SYMBOL-TYPE methodology — count one device type at a time across the entire page:
- Pick one symbol type (e.g., cameras), scan the ENTIRE page for ONLY that type, record the count
- Move to the next symbol type and repeat
- This prevents miscounting when different symbol types are near each other
- After scanning all symbol types individually, compile the final count
- Double-check any symbol that appears more than 5 times on a single page
Count ONLY the devices visible on THIS ONE PAGE. Do NOT estimate or extrapolate.
${legendOnPageNote}
${legendContext}
═══ END PASS 4 INSTRUCTIONS ═══

`,
      ];

      // Process pages in batches with concurrency limiting
      const CONCURRENCY = 5;
      const PAGE_DELAY_MS = 800; // Delay between batches to respect rate limits
      const pageResults = [];
      let scansCompleted = 0;

      // Run all passes for all pages
      for (let pass = 0; pass < scansPerPage; pass++) {
        const passPrefix = scanPrefixes[pass] || scanPrefixes[0];

        for (let i = 0; i < deduped.length; i += CONCURRENCY) {
          const batch = deduped.slice(i, i + CONCURRENCY);

          const batchPromises = batch.map(async (file) => {
            try {
              // Build file parts for just this one page + reference page (T-0.0)
              const fileParts = [
                { text: `\n--- PAGE: ${file.name} (Pass ${pass + 1}) ---` },
                { fileData: { mimeType: file.mimeType, fileUri: file.fileUri } },
                ...referencePageParts, // T-0.0 general notes page (if found) — enables cross-referencing
                ...contextTextParts,
              ];

              // Preserve key pinning for File API access
              if (file._usedKeyName) {
                fileParts[1]._usedKeyName = file._usedKeyName;
              }

              const pagePrompt = passPrefix + basePrompt;
              const rawResult = await this._invokeBrain(key, brain, pagePrompt, fileParts, useJsonMode);
              const parsed = this._parseJSON(rawResult);

              if (parsed && !parsed._parseFailed) {
                return { page: file.name, pass: pass + 1, success: true, data: parsed };
              } else {
                console.warn(`[Brain:${brain.name}] Page ${file.name} pass ${pass + 1}: JSON parse failed`);
                return { page: file.name, pass: pass + 1, success: false, data: null };
              }
            } catch (err) {
              console.warn(`[Brain:${brain.name}] Page ${file.name} pass ${pass + 1} failed: ${err.message}`);
              return { page: file.name, pass: pass + 1, success: false, data: null, error: err.message };
            }
          });

          const batchResults = await Promise.allSettled(batchPromises);
          for (const r of batchResults) {
            if (r.status === 'fulfilled') {
              pageResults.push(r.value);
            }
            scansCompleted++;
          }

          // Progress update
          const scanPct = scansCompleted / totalScans;
          const brainPct = baseProgress + scanPct * ((endProgress - baseProgress) / totalBrains);
          progressCallback(brainPct, `${brain.emoji} ${brain.name}: pass ${pass + 1}/${scansPerPage}, ${scansCompleted}/${totalScans} scans`, this._brainStatus);

          // Rate limit delay between batches
          if (i + CONCURRENCY < deduped.length || pass < scansPerPage - 1) {
            await new Promise(r => setTimeout(r, PAGE_DELAY_MS));
          }
        }

        if (pass < scansPerPage - 1) {
          console.log(`[Brain:${brain.name}] Pass ${pass + 1} complete — starting pass ${pass + 2}`);
        }
      }

      // Multi-pass deduplication: for each page, take the HIGHER count from multiple passes
      // This prevents undercounting (which loses bids) while the consensus engine handles overcounting
      const dedupedPageResults = this._deduplicateMultiPassResults(key, pageResults, scansPerPage);

      // Store per-page variance data for intelligent re-query (TARGETED_RESCANNER)
      if (key === 'SYMBOL_SCANNER' && scansPerPage > 1) {
        context._perPageScanResults = context._perPageScanResults || {};
        for (const pr of pageResults) {
          if (pr.success && pr.sheetId) {
            if (!context._perPageScanResults[pr.sheetId]) context._perPageScanResults[pr.sheetId] = [];
            context._perPageScanResults[pr.sheetId].push({ totals: pr.data?.totals || pr.data?.counts || {} });
          }
        }
      }

      // Aggregate all page-level results into brain-level output
      const aggregated = this._aggregatePerPageResults(key, dedupedPageResults);
      const succeeded = dedupedPageResults.filter(r => r.success).length;
      const totalSucceeded = pageResults.filter(r => r.success).length;
      console.log(`[Brain:${brain.name}] ═══ Per-page scan complete: ${totalSucceeded} successful scans across ${deduped.length} pages × ${scansPerPage} passes → ${succeeded} merged results ═══`);

      this._brainStatus[key] = { status: 'done', progress: 100, result: aggregated, error: null };
      results[key] = aggregated;
      incrementCompleted();

      const pct = baseProgress + (1 / totalBrains) * (endProgress - baseProgress);
      progressCallback(pct, `✅ ${brain.name} per-page scan complete (${succeeded}/${deduped.length} pages)`, this._brainStatus);

    } catch (err) {
      console.error(`[Brain:${brain.name}] Per-page scan FAILED:`, err.message);
      this._brainStatus[key] = { status: 'failed', progress: 0, result: null, error: err.message };
      results[key] = { _error: err.message, _failed: true };
      incrementCompleted();
      const pct = baseProgress + (1 / totalBrains) * (endProgress - baseProgress);
      progressCallback(pct, `⚠️ ${brain.name} per-page scan failed — continuing…`, this._brainStatus);
    }
  },

  // AUDIT FIX H1: Helper — compute median of array of numbers
  _median(arr) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  },

  // Deduplicate multi-pass per-page results: for each page, merge passes using MEDIAN counts
  _deduplicateMultiPassResults(brainKey, allResults, scansPerPage) {
    if (scansPerPage <= 1) return allResults;

    // Group results by page name (strip pass info)
    const byPage = new Map();
    for (const r of allResults) {
      if (!r.success || !r.data) continue;
      const pageKey = r.page.replace(/ \(Pass \d+\)/, ''); // Normalize page name
      if (!byPage.has(pageKey)) byPage.set(pageKey, []);
      byPage.get(pageKey).push(r);
    }

    const merged = [];
    for (const [pageKey, passes] of byPage) {
      if (passes.length === 1) {
        merged.push(passes[0]);
        continue;
      }

      // AUDIT FIX H1: Use MEDIAN instead of MAX for device counts across passes
      // Math.max caused consistent 5-15% overcounting. Median is more robust to outliers.
      // Text layer is ground truth for counting; this only affects AI-supplementary data.
      const mergedData = JSON.parse(JSON.stringify(passes[0].data)); // Deep clone pass 1

      // Helper: merge numeric fields using median across all passes
      const _mergeNumericMedian = (target, fieldName) => {
        if (!target) return;
        for (const k of Object.keys(target)) {
          if (typeof target[k] !== 'number') continue;
          const allValues = passes.map(p => p.data?.[fieldName]?.[k]).filter(v => typeof v === 'number');
          if (allValues.length > 0) target[k] = this._median(allValues);
        }
        // Also pick up keys from other passes not in pass 1
        for (let p = 1; p < passes.length; p++) {
          const src = passes[p].data?.[fieldName];
          if (!src) continue;
          for (const [k, v] of Object.entries(src)) {
            if (typeof v === 'number' && !(k in target)) {
              const allValues = passes.map(pp => pp.data?.[fieldName]?.[k]).filter(vv => typeof vv === 'number');
              target[k] = this._median(allValues);
            }
          }
        }
      };

      // Merge totals using median
      _mergeNumericMedian(mergedData.totals, 'totals');

      // Merge grand_totals for ZOOM_SCANNER using median
      _mergeNumericMedian(mergedData.grand_totals, 'grand_totals');

      // Merge sheet-level totals using median
      if (mergedData.sheets) {
        for (let si = 0; si < mergedData.sheets.length; si++) {
          const existing = mergedData.sheets[si];
          if (!existing.totals) continue;
          for (const k of Object.keys(existing.totals)) {
            if (typeof existing.totals[k] !== 'number') continue;
            const allValues = passes.map(p => {
              const sheet = p.data?.sheets?.find(s => s.sheet_id === existing.sheet_id || s.sheet === existing.sheet);
              return sheet?.totals?.[k];
            }).filter(v => typeof v === 'number');
            if (allValues.length > 0) existing.totals[k] = this._median(allValues);
          }
        }
      }

      // Merge exclusions and rooms from all passes (union strategy)
      for (let p = 1; p < passes.length; p++) {
        const passData = passes[p].data;

        // Merge exclusions (union, not median)
        if (passData.exclusions && mergedData.exclusions) {
          const seenExcl = new Set(mergedData.exclusions.map(e =>
            `${(e.item || '').toLowerCase()}_${(e.treatment || '').toLowerCase()}`
          ));
          for (const e of passData.exclusions) {
            const eKey = `${(e.item || '').toLowerCase()}_${(e.treatment || '').toLowerCase()}`;
            if (!seenExcl.has(eKey)) {
              mergedData.exclusions.push(e);
              seenExcl.add(eKey);
            }
          }
        }

        // Merge rooms (union for SHADOW_SCANNER) — use median for device counts
        if (passData.rooms && mergedData.rooms) {
          for (const passRoom of passData.rooms) {
            const existingRoom = mergedData.rooms.find(r =>
              (r.room_name || r.name) === (passRoom.room_name || passRoom.name)
            );
            if (existingRoom && passRoom.devices) {
              for (const [k, v] of Object.entries(passRoom.devices || {})) {
                if (typeof v === 'number') {
                  existingRoom.devices = existingRoom.devices || {};
                  // Collect all pass values for this room's device type and take median
                  const allRoomValues = passes.map(pp => {
                    const rm = pp.data?.rooms?.find(r => (r.room_name || r.name) === (passRoom.room_name || passRoom.name));
                    return rm?.devices?.[k];
                  }).filter(vv => typeof vv === 'number');
                  existingRoom.devices[k] = allRoomValues.length > 0 ? this._median(allRoomValues) : v;
                }
              }
            } else if (!existingRoom) {
              mergedData.rooms.push(passRoom);
            }
          }
        }
      }

      mergedData._multiPass = true;
      mergedData._passesUsed = passes.length;
      merged.push({ page: pageKey, success: true, data: mergedData });
    }

    console.log(`[MultiPass] ${brainKey}: ${allResults.length} total scans → ${merged.length} merged page results (${scansPerPage} passes/page, higher-count strategy)`);
    return merged;
  },

  // Aggregate per-page results into a single brain-level output
  _aggregatePerPageResults(brainKey, pageResults) {
    const successResults = pageResults.filter(r => r.success && r.data);
    const meta = {
      _perPageScan: true,
      _pagesScanned: pageResults.length,
      _pagesSucceeded: successResults.length,
    };

    if (brainKey === 'SYMBOL_SCANNER') {
      const sheets = [];
      const totals = {};
      const deviceInventory = [];
      const unidentified = [];
      const discoveredLegends = []; // Legends found embedded in plan pages during scanning

      for (const r of successResults) {
        if (r.data.sheets) sheets.push(...r.data.sheets);
        if (r.data.device_inventory) deviceInventory.push(...r.data.device_inventory);
        if (r.data.unidentified_symbols) unidentified.push(...r.data.unidentified_symbols);
        if (r.data.totals) {
          for (const [k, v] of Object.entries(r.data.totals)) {
            totals[k] = (totals[k] || 0) + (typeof v === 'number' ? v : 0);
          }
        }
        // Capture any legends discovered on individual pages during scanning
        if (r.data.page_legend && Array.isArray(r.data.page_legend) && r.data.page_legend.length > 0) {
          discoveredLegends.push({ page: r.page, symbols: r.data.page_legend });
        }
      }

      if (discoveredLegends.length > 0) {
        console.log(`[SmartBrains] 🗺️ Per-page scanning discovered embedded legends on ${discoveredLegends.length} page(s)`);
      }

      return { ...meta, sheets, totals, device_inventory: deviceInventory, unidentified_symbols: unidentified,
        _discovered_legends: discoveredLegends.length > 0 ? discoveredLegends : undefined,
        notes: `Per-page scan: ${successResults.length}/${pageResults.length} pages analyzed individually` };
    }

    if (brainKey === 'ZOOM_SCANNER') {
      const quadrantCounts = [];
      const grandTotals = {};
      const zoomFindings = [];

      for (const r of successResults) {
        if (r.data.quadrant_counts) quadrantCounts.push(...r.data.quadrant_counts);
        if (r.data.zoom_findings) zoomFindings.push(...r.data.zoom_findings);
        if (r.data.grand_totals) {
          for (const [k, v] of Object.entries(r.data.grand_totals)) {
            grandTotals[k] = (grandTotals[k] || 0) + (typeof v === 'number' ? v : 0);
          }
        }
      }

      return { ...meta, quadrant_counts: quadrantCounts, grand_totals: grandTotals, zoom_findings: zoomFindings,
        methodology: 'per-page 4-quadrant zoom scan' };
    }

    if (brainKey === 'SCOPE_EXCLUSION_SCANNER') {
      const exclusions = [];
      const responsibilityMatrix = [];
      const scopeBoundaries = [];

      for (const r of successResults) {
        if (r.data.exclusions) exclusions.push(...r.data.exclusions);
        if (r.data.responsibility_matrix) responsibilityMatrix.push(...r.data.responsibility_matrix);
        if (r.data.scope_boundaries) scopeBoundaries.push(...r.data.scope_boundaries);
      }

      // Deduplicate exclusions by item + treatment
      const uniqueExclusions = [];
      const seenExclusions = new Set();
      for (const e of exclusions) {
        const key = `${(e.item || '').toLowerCase()}_${(e.treatment || '').toLowerCase()}`;
        if (!seenExclusions.has(key)) {
          seenExclusions.add(key);
          uniqueExclusions.push(e);
        }
      }

      return { ...meta, exclusions: uniqueExclusions, responsibility_matrix: responsibilityMatrix,
        scope_boundaries: scopeBoundaries,
        notes: `Per-page exclusion scan: ${uniqueExclusions.length} unique exclusions found across ${successResults.length} pages` };
    }

    if (brainKey === 'SHADOW_SCANNER') {
      const allRooms = [];
      const totals = {};

      for (const r of successResults) {
        if (r.data.rooms) allRooms.push(...r.data.rooms);
        if (r.data.room_counts) allRooms.push(...r.data.room_counts);
        if (r.data.totals) {
          for (const [k, v] of Object.entries(r.data.totals)) {
            totals[k] = (totals[k] || 0) + (typeof v === 'number' ? v : 0);
          }
        }
      }

      return { ...meta, rooms: allRooms, totals, methodology: 'per-page room-by-room shadow scan' };
    }

    // Generic fallback: merge arrays, sum numbers
    const merged = { ...meta };
    for (const r of successResults) {
      for (const [k, v] of Object.entries(r.data)) {
        if (Array.isArray(v)) {
          merged[k] = (merged[k] || []).concat(v);
        } else if (typeof v === 'number') {
          merged[k] = (merged[k] || 0) + v;
        } else if (typeof v === 'object' && v !== null) {
          merged[k] = merged[k] || {};
          for (const [k2, v2] of Object.entries(v)) {
            if (typeof v2 === 'number') {
              merged[k][k2] = (merged[k][k2] || 0) + v2;
            }
          }
        }
      }
    }
    return merged;
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

    // Helper: route brain to per-page or standard execution
    const runBrain = async (key) => {
      if (this.PER_PAGE_BRAINS.has(key)) {
        await this._runPerPageBrain(key, context, encodedFiles, baseProgress, endProgress, brainKeys.length, results, () => ++completed, progressCallback);
      } else {
        await this._runSingleBrain(key, context, encodedFiles, baseProgress, endProgress, brainKeys.length, results, () => ++completed, progressCallback);
      }
    };

    // Per-page brains run sequentially (they make many API calls internally)
    // Standard brains run in parallel batches as before
    const perPageKeys = brainKeys.filter(k => this.PER_PAGE_BRAINS.has(k));
    const standardKeys = brainKeys.filter(k => !this.PER_PAGE_BRAINS.has(k));

    // Run per-page brains first (they're the heavy hitters — run one at a time to avoid rate limits)
    for (const key of perPageKeys) {
      console.log(`[SmartBrains] Wave ${waveNum}: Running per-page brain — ${this.BRAINS[key].name}`);
      await runBrain(key);
    }

    // Then run standard brains in parallel batches
    if (standardKeys.length <= 3) {
      const promises = standardKeys.map(async (key) => await runBrain(key));
      await Promise.allSettled(promises);
    } else {
      for (let i = 0; i < standardKeys.length; i += BATCH_SIZE) {
        const batch = standardKeys.slice(i, i + BATCH_SIZE);
        console.log(`[SmartBrains] Wave ${waveNum}: Starting batch ${Math.floor(i/BATCH_SIZE) + 1} — ${batch.map(k => this.BRAINS[k].name).join(', ')}`);

        const batchPromises = batch.map(async (key) => await runBrain(key));
        await Promise.allSettled(batchPromises);

        if (i + BATCH_SIZE < standardKeys.length) {
          console.log(`[SmartBrains] Wave ${waveNum}: Stagger delay ${STAGGER_DELAY_MS}ms before next batch…`);
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

    // Log discipline filtering summary
    const selectedDisc = state.disciplines || [];
    if (selectedDisc.length > 0) {
      console.log(`[SmartBrains] 🎯 Discipline filter active: [${selectedDisc.join(', ')}]`);
      for (const cat of ['legends', 'plans', 'specs']) {
        const files = encodedFiles[cat] || [];
        const skipped = files.filter(f => this._shouldSkipFile(f.name, cat, selectedDisc));
        if (skipped.length > 0) {
          console.log(`[SmartBrains]   → ${cat}: ${skipped.length}/${files.length} files will be skipped: [${skipped.map(f => f.name).join(', ')}]`);
        }
      }
    }

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
        const cacheResp = await fetch('/api/ai/cache', {
          method: 'POST',
          headers: this._authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            fileUris,
            model: `models/${this.config.proModel || this.config.model || 'gemini-2.5-pro'}`,
            systemInstruction: 'You are an expert low-voltage ELV construction estimator analyzing construction drawings and specifications. Extract precise device counts, material quantities, and cost data.',
            ttl: '3600s',
            _uploadKeyName: uploadKeyName,
          }),
        });
        const cacheData = await cacheResp.json();
        if (cacheData.success && cacheData.cacheName) {
          _contextCache = { name: cacheData.cacheName, model: this.config.proModel || this.config.model || 'gemini-2.5-pro', keyName: cacheData._usedKeyName };
          console.log(`[SmartBrains] ✓ Context cache created: ${cacheData.cacheName} (${cacheData.tokenCount} tokens, expires: ${cacheData.expireTime})`);
        } else {
          console.warn('[SmartBrains] Context cache creation failed, falling back to per-request file sending:', cacheData.error);
          if (cacheData._debug) console.error('[SmartBrains] Google cache error detail:', cacheData._debug);
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
      isTransitRailroad: state.isTransitRailroad || false,
      specificItems: state.specificItems,
      knownQuantities: state.knownQuantities,
      travel: state.travel,
      // Building dimensions for cable pathway spatial calculation
      floorPlateWidth: state.floorPlateWidth || 0,
      floorPlateDepth: state.floorPlateDepth || 0,
      ceilingHeight: state.ceilingHeight || 10,
      floorToFloorHeight: state.floorToFloorHeight || 14,
      planSheetSize: state.planSheetSize || '',
      pricingContext: this._buildPricingContext(state),
      // Pre-computed distance to nearest 3D office (injected into AI prompts to prevent incorrect travel costs)
      nearestOfficeDistance: state._nearestOfficeDistance ?? undefined,
      nearestOfficeName: state._nearestOfficeName ?? undefined,
      wave0: null, wave1: null, wave1_5: null, wave1_75: null,
      wave2: null, wave2_25: null, wave2_5_fin: null, wave2_75: null,
      wave3: null, wave3_5: null, wave3_75: null,
    };

    // ═══ PRE-WAVE: Collect spec text for direct injection into Material Pricer ═══
    const specTexts = [];
    for (const specFile of encodedFiles.specs || []) {
      if (specFile.extractedText && specFile.extractedText.length > 100) {
        specTexts.push({ name: specFile.name, text: specFile.extractedText });
      }
    }
    if (specTexts.length > 0) {
      context._specTexts = specTexts;
      const totalChars = specTexts.reduce((s, t) => s + t.text.length, 0);
      console.log(`[SmartBrains] 📑 Spec text: ${specTexts.length} file(s), ${Math.round(totalChars / 1024)}KB total — will be injected into Material Pricer`);
    }

    // ═══ PRE-WAVE: Collect OCR scale data extracted during file encoding ═══
    const ocrScalePages = [];
    for (const planFile of encodedFiles.plans || []) {
      if (planFile._ocrScaleData?.pages) {
        ocrScalePages.push(...planFile._ocrScaleData.pages);
      }
    }
    if (ocrScalePages.length > 0) {
      context._ocrScaleData = ocrScalePages;
      const withScale = ocrScalePages.filter(p => p.ftPerInch > 0);
      console.log(`[SmartBrains] OCR Scale: ${withScale.length}/${ocrScalePages.length} pages have deterministic scale data`);
    }

    // ═══ WAVE 0: Legend Pre-Processing (1 brain, Pro model) — NON-FATAL ═══
    progressCallback(5, '📖 Wave 0: Decoding legend + scanning plans for embedded legends + mapping spatial layout…', this._brainStatus);
    let wave0Results = {};
    try {
      wave0Results = await this._runWave(0, ['LEGEND_DECODER', 'PLAN_LEGEND_SCANNER', 'SPATIAL_LAYOUT'], encodedFiles, state, context, progressCallback);
      console.log('[SmartBrains] ═══ Wave 0 Complete — Legend decoded + Plan legends scanned + Spatial layout mapped ═══');
    } catch (wave0Err) {
      console.warn('[SmartBrains] ⚠️ Wave 0 failed — continuing without legend/spatial context:', wave0Err.message);
      this._brainStatus['LEGEND_DECODER'] = { status: 'failed', progress: 0, result: null, error: wave0Err.message };
      this._brainStatus['PLAN_LEGEND_SCANNER'] = { status: 'failed', progress: 0, result: null, error: wave0Err.message };
      this._brainStatus['SPATIAL_LAYOUT'] = { status: 'failed', progress: 0, result: null, error: wave0Err.message };
      wave0Results = { LEGEND_DECODER: { _failed: true, _error: wave0Err.message }, PLAN_LEGEND_SCANNER: { _failed: true, _error: wave0Err.message }, SPATIAL_LAYOUT: { _failed: true, _error: wave0Err.message } };
    }

    // ═══ POST-WAVE 0: Merge Plan Legend Scanner results into Legend Decoder ═══
    // Legends found embedded in plan sheets get combined with dedicated legend sheet analysis
    const planLegends = wave0Results.PLAN_LEGEND_SCANNER;
    if (planLegends && !planLegends._failed && planLegends.legends_found?.length > 0) {
      // Ensure LEGEND_DECODER has a symbols array
      if (!wave0Results.LEGEND_DECODER) wave0Results.LEGEND_DECODER = {};
      if (!wave0Results.LEGEND_DECODER.symbols) wave0Results.LEGEND_DECODER.symbols = [];

      // Convert plan legend symbols into LEGEND_DECODER format and merge
      let mergedCount = 0;
      const existingIds = new Set(wave0Results.LEGEND_DECODER.symbols.map(s =>
        `${(s.visual || '').toLowerCase()}_${(s.device_type || '').toLowerCase()}`
      ));

      for (const legend of planLegends.legends_found) {
        if (!legend.symbols) continue;
        for (const sym of legend.symbols) {
          // Deduplicate: skip if same visual+device_type already exists from dedicated legend
          const dedupeKey = `${(sym.visual || '').toLowerCase()}_${(sym.device_type || '').toLowerCase()}`;
          if (existingIds.has(dedupeKey)) continue;
          existingIds.add(dedupeKey);

          wave0Results.LEGEND_DECODER.symbols.push({
            symbol_id: sym.symbol_id || `PL${mergedCount + 1}`,
            visual: sym.visual,
            discipline: sym.discipline || legend.discipline,
            device_type: sym.device_type,
            label_on_legend: sym.label || sym.label_on_legend,
            similar_to: sym.similar_to || null,
            confidence: sym.confidence || 80,
            _source: `plan_sheet:${legend.sheet_id || legend.page}`,
          });
          mergedCount++;
        }
      }

      // Also merge abbreviations into a top-level field
      if (planLegends.abbreviations_found?.length > 0) {
        wave0Results.LEGEND_DECODER._abbreviations = planLegends.abbreviations_found;
      }

      // Track which pages had legends (useful for downstream brains)
      wave0Results.LEGEND_DECODER._plan_legend_pages = planLegends.pages_with_legends || [];
      wave0Results.LEGEND_DECODER._plan_legends_merged = mergedCount;

      if (mergedCount > 0) {
        console.log(`[SmartBrains] 🗺️ Merged ${mergedCount} NEW symbols from plan-embedded legends into Legend Decoder (total: ${wave0Results.LEGEND_DECODER.symbols.length} symbols)`);
        console.log(`[SmartBrains] 🗺️ Pages with embedded legends: ${(planLegends.pages_with_legends || []).join(', ')}`);
      } else {
        console.log(`[SmartBrains] 🗺️ Plan Legend Scanner found ${planLegends.legends_found.length} legend(s) but all symbols already in dedicated legend — no new symbols to merge`);
      }

      if (planLegends.abbreviations_found?.length > 0) {
        console.log(`[SmartBrains] 🗺️ Found ${planLegends.abbreviations_found.length} abbreviations from plan sheets`);
      }
    } else if (planLegends && !planLegends._failed) {
      console.log('[SmartBrains] 🗺️ Plan Legend Scanner: No embedded legends found in plan sheets');
    }

    // ═══ POST-WAVE 0: Merge OCR scale data into SPATIAL_LAYOUT results ═══
    if (ocrScalePages.length > 0 && wave0Results.SPATIAL_LAYOUT?.sheets) {
      let ocrOverrides = 0;
      for (const ocrPage of ocrScalePages) {
        if (!ocrPage.ftPerInch || ocrPage.ftPerInch <= 0) continue;

        // Find matching sheet in SPATIAL_LAYOUT by sheet_id or page number
        let matched = wave0Results.SPATIAL_LAYOUT.sheets.find(s =>
          s.sheet_id === ocrPage.sheetId ||
          s.sheet_id?.replace(/[\s.-]/g, '') === ocrPage.sheetId?.replace(/[\s.-]/g, '')
        );

        // If no match by ID, try by page index
        if (!matched && ocrPage.pageNum <= wave0Results.SPATIAL_LAYOUT.sheets.length) {
          matched = wave0Results.SPATIAL_LAYOUT.sheets[ocrPage.pageNum - 1];
        }

        if (matched) {
          const aiMethod = matched.scale?.scale_method || 'unable';
          const aiConf = matched.scale?.confidence || 'low';

          // OCR override conditions:
          // 1. AI has no scale or low confidence
          // 2. AI and OCR disagree by >15% (trust OCR — it's deterministic)
          const shouldOverride =
            aiMethod === 'unable' || aiMethod === 'door_reference' ||
            aiConf === 'low' ||
            !matched.scale?.ft_per_inch ||
            (matched.scale?.ft_per_inch > 0 && Math.abs(matched.scale.ft_per_inch - ocrPage.ftPerInch) / ocrPage.ftPerInch > 0.15);

          if (shouldOverride) {
            const prevScale = matched.scale?.ft_per_inch || 'none';
            matched.scale = matched.scale || {};
            matched.scale.ft_per_inch = ocrPage.ftPerInch;
            matched.scale.scale_method = ocrPage.method;
            matched.scale.confidence = 'high';
            matched.scale.labeled = ocrPage.scaleText;
            matched.scale._ocr_override = true;
            matched.scale._previous_ai_scale = prevScale;
            ocrOverrides++;
            console.log(`[OCR Scale Override] Sheet ${matched.sheet_id}: AI scale ${prevScale} → OCR scale ${ocrPage.ftPerInch} ft/inch (${ocrPage.scaleText})`);
          }
        }
      }
      if (ocrOverrides > 0) {
        console.log(`[SmartBrains] OCR Scale overrode AI on ${ocrOverrides} sheets — deterministic text layer takes priority`);
      }
    } else if (ocrScalePages.length > 0 && !wave0Results.SPATIAL_LAYOUT?.sheets) {
      // SPATIAL_LAYOUT failed or returned no sheets — build minimal sheet data from OCR
      wave0Results.SPATIAL_LAYOUT = wave0Results.SPATIAL_LAYOUT || {};
      wave0Results.SPATIAL_LAYOUT.sheets = ocrScalePages.filter(p => p.ftPerInch > 0).map(p => ({
        sheet_id: p.sheetId,
        sheet_name: `Page ${p.pageNum}`,
        scale: {
          labeled: p.scaleText,
          scale_method: p.method,
          confidence: 'high',
          ft_per_inch: p.ftPerInch,
          _ocr_generated: true,
        },
        sheet_area_width_ft: 0,
        sheet_area_depth_ft: 0,
        notes: 'Generated from OCR scale extraction — AI spatial layout unavailable',
      }));
      console.log(`[SmartBrains] Built ${wave0Results.SPATIAL_LAYOUT.sheets.length} sheets from OCR scale data (SPATIAL_LAYOUT was empty)`);
    }

    context.wave0 = wave0Results;

    // ═══ SMART SHEET FILTER — Skip pages irrelevant to selected disciplines ═══
    // Uses Wave 0 spatial data + AEC sheet naming conventions to classify sheets.
    // Skips structural, mechanical, plumbing, civil sheets when not needed.
    // Always includes: general/cover sheets, legend sheets, and unclassifiable sheets (conservative).
    let filteredEncodedFiles = encodedFiles;
    const sheetClassification = this._classifySheets(encodedFiles, wave0Results, state.disciplines);

    if (sheetClassification.size > 0) {
      const { filtered, skipped, stats } = this._filterEncodedFilesByDiscipline(encodedFiles, sheetClassification);
      filteredEncodedFiles = filtered;

      // Also filter specs by CSI division relevance
      filteredEncodedFiles = this._filterSpecsByDivision(filteredEncodedFiles, state.disciplines);

      if (stats && stats.skippedPages > 0) {
        console.log(`[SheetFilter] ═══ SMART FILTER ACTIVE ═══`);
        console.log(`[SheetFilter] Disciplines: ${state.disciplines.join(', ')}`);
        console.log(`[SheetFilter] Plans: ${stats.relevantPages}/${stats.totalPages} pages relevant (skipping ${stats.skippedPages} — ${stats.savingsPercent}% reduction)`);
        for (const s of skipped) {
          console.log(`[SheetFilter]   ✗ ${s.sheetId || s.name}: ${s.reason}`);
        }
        progressCallback(11, `📋 Smart Filter: scanning ${stats.relevantPages}/${stats.totalPages} relevant pages (${stats.savingsPercent}% savings)`, this._brainStatus);
        context._sheetFilterStats = stats;
        context._skippedSheets = skipped;
      } else {
        console.log('[SheetFilter] All pages classified as relevant — no filtering applied');
      }
    }

    // ═══ ADDENDA PROCESSING — Merge addenda sheets into plans for full analysis ═══
    const addendaFiles = encodedFiles.addenda || [];
    if (addendaFiles.length > 0) {
      console.log(`[SmartBrains] 📋 Addenda: ${addendaFiles.length} addendum file(s) detected — merging into plan set`);
      // Tag addenda files so brains can identify them as revisions
      for (const af of addendaFiles) {
        af._isAddendum = true;
        af.name = af.name || 'addendum';
        if (!af.name.toLowerCase().includes('addend')) {
          af.name = `ADDENDUM_${af.name}`;
        }
      }
      // Merge addenda into plans so all counting/pricing brains see the updated sheets
      filteredEncodedFiles.plans = [...(filteredEncodedFiles.plans || []), ...addendaFiles];
      // Store addenda sheet names for change tracking
      context._addendaSheets = addendaFiles.map(f => f.name || 'unknown');
      context._hasAddenda = true;
      progressCallback(11.5, `📋 ${addendaFiles.length} addendum file(s) merged into analysis`, this._brainStatus);
    }

    // ═══ WAVE 1: First Read — Document Intelligence (8 parallel brains) ═══
    progressCallback(12, '🔍 Wave 1: First Read — 8 brains scanning…', this._brainStatus);
    const wave1Keys = ['SYMBOL_SCANNER', 'CODE_COMPLIANCE', 'MDF_IDF_ANALYZER', 'CABLE_PATHWAY', 'SPECIAL_CONDITIONS', 'SPEC_CROSS_REF', 'ANNOTATION_READER', 'RISER_DIAGRAM_ANALYZER', 'DEVICE_LOCATOR', 'SCOPE_EXCLUSION_SCANNER'];
    const wave1Results = await this._runWave(1, wave1Keys, filteredEncodedFiles, state, context, progressCallback);
    context.wave1 = wave1Results;

    // ═══ POST-WAVE 1: Log scope exclusion findings for estimator visibility ═══
    const scopeResults = wave1Results.SCOPE_EXCLUSION_SCANNER;
    if (scopeResults && !scopeResults._failed) {
      const respMatrix = scopeResults.responsibility_matrix || [];
      const exclusions = scopeResults.exclusions || [];
      const inScope = respMatrix.filter(r => r.our_scope);
      const outScope = respMatrix.filter(r => !r.our_scope);
      if (respMatrix.length > 0) {
        console.log(`[SmartBrains] 🚫 Scope Exclusion Scanner — Responsibility Matrix found:`);
        for (const r of inScope) console.log(`[SmartBrains]   ✅ ${r.discipline}: ${r.responsible_party} — IN SCOPE`);
        for (const r of outScope) console.log(`[SmartBrains]   🚫 ${r.discipline}: ${r.responsible_party} — EXCLUDED`);
      }
      if (exclusions.length > 0) {
        console.log(`[SmartBrains] 🚫 ${exclusions.length} individual exclusion(s) found (OFCI/OFOI/NIC/By Others)`);
      }
      // Store scope summary on state for UI display
      state._scopeSummary = {
        inScope: inScope.map(r => r.discipline),
        outScope: outScope.map(r => ({ discipline: r.discipline, assignedTo: r.responsible_party })),
        exclusionCount: exclusions.length,
      };
    }

    console.log('[SmartBrains] ═══ Wave 1 Complete — First Read done (8 brains) ═══');

    // ═══ WAVE 1.5: Second Read — Independent Verification (5 parallel brains, Pro model) ═══
    progressCallback(35, '👁️ Wave 1.5: Second Read — 5 independent verifiers…', this._brainStatus);
    const wave15Keys = ['SHADOW_SCANNER', 'DISCIPLINE_DEEP_DIVE', 'QUADRANT_SCANNER', 'ZOOM_SCANNER', 'PER_FLOOR_ANALYZER'];
    const wave15Results = await this._runWave(1.5, wave15Keys, filteredEncodedFiles, state, context, progressCallback);
    context.wave1_5 = wave15Results;
    console.log('[SmartBrains] ═══ Wave 1.5 Complete — Second Read done (5 brains) ═══');

    // ═══ WAVE 1.75: Consensus Resolution ═══
    progressCallback(50, '⚖️ Wave 1.75: Building consensus from 3 reads…', this._brainStatus);
    const wave175Results = await this._runWave(1.75, ['CONSENSUS_ARBITRATOR'], filteredEncodedFiles, state, context, progressCallback);
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
      const rescanResults = await this._runWave(1.75, ['TARGETED_RESCANNER'], filteredEncodedFiles, state, context, progressCallback);
      
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
        console.log(`[SmartBrains] ℹ️ ${allDisputes.length} dispute(s) found but all below re-scan threshold (variance ≤15% or qty <3). Using consensus values.`);
      }
    }
    console.log(`[SmartBrains] ═══ Wave 1.75 Complete — ${allDisputes.length} dispute(s) total, ${disputes.length} required re-scan ═══`);

    // ═══ AUTO-DETECT MISSING DISCIPLINES from consensus counts & equipment schedules ═══
    // If the drawings show Access Control, CCTV, etc. but user didn't select them, add them now.
    const consensusCts = context.wave1_75?.CONSENSUS_ARBITRATOR?.consensus_counts
                      || context.wave1_75?.TARGETED_RESCANNER?.final_counts
                      || context.wave1?.SYMBOL_SCANNER?.totals || {};
    const scheduleData = context.wave1?.ANNOTATION_READER?.schedule_data || {};
    const allEvidence = JSON.stringify({ ...consensusCts, ...scheduleData }).toLowerCase();
    const DISCIPLINE_DETECTORS = {
      'CCTV':                 /camera|cctv|nvr|vms|dome|bullet|ptz|fisheye|panoram|surveillance/,
      'Access Control':       /card\s*reader|access\s*control|rex|electric\s*strike|maglock|door\s*contact|credential|hid|lenel|mercury|glass\s*break|intercom/,
      'Structured Cabling':   /data\s*outlet|cat\s*6|keystone|patch\s*panel|wap|wireless\s*access|fiber|cable\s*tray/,
      'Fire Alarm':           /smoke\s*detect|heat\s*detect|pull\s*station|horn.*strobe|facp|fire\s*alarm|duct\s*detect/,
      'Audio Visual':         /speaker|display|projector|amplifier|microphone|av\s*|audio/,
      'Intrusion Detection':  /motion\s*detect|glass\s*break|intrusion|keypad|siren/,
    };
    let disciplinesAdded = [];
    for (const [disc, regex] of Object.entries(DISCIPLINE_DETECTORS)) {
      if (!state.disciplines.includes(disc) && regex.test(allEvidence)) {
        state.disciplines.push(disc);
        disciplinesAdded.push(disc);
      }
    }
    if (disciplinesAdded.length > 0) {
      // Track which disciplines were auto-added so UI can distinguish user-selected vs auto-detected
      state._autoDetectedDisciplines = disciplinesAdded;
      console.log(`[SmartBrains] ⚡ Auto-added missing disciplines from document evidence: ${disciplinesAdded.join(', ')}`);
      progressCallback(55, `⚡ Auto-detected disciplines: ${disciplinesAdded.join(', ')}`, this._brainStatus);
    }

    // ═══ PRE-WAVE 2: Load Rate Library + Distributor Cache + Cost Benchmarks ═══
    // All loaded in parallel for speed
    const [rlResult, dpResult, bmResult] = await Promise.allSettled([
      fetch('/api/rate-library', { headers: this._authHeaders() }).then(r => r.ok ? r.json() : null),
      fetch('/api/distributor-prices', { headers: this._authHeaders() }).then(r => r.ok ? r.json() : null),
      fetch('/api/benchmarks', { headers: this._authHeaders() }).then(r => r.ok ? r.json() : null),
    ]);

    if (rlResult.status === 'fulfilled' && rlResult.value?.rates?.length > 0) {
      context.rateLibrary = rlResult.value.rates;
      console.log(`[SmartBrains] 📚 Rate Library: loaded ${context.rateLibrary.length} known-good prices from past projects`);
    }

    if (dpResult.status === 'fulfilled' && dpResult.value?.prices?.length > 0) {
      context.distributorPrices = dpResult.value.prices;
      console.log(`[SmartBrains] 🏪 Distributor Cache: loaded ${context.distributorPrices.length} cached distributor prices`);
    }

    if (bmResult.status === 'fulfilled' && bmResult.value?.benchmarks?.length > 0) {
      context.costBenchmarks = bmResult.value.benchmarks;
      console.log(`[SmartBrains] 📊 Cost Benchmarks: loaded ${context.costBenchmarks.length} historical price benchmarks from completed projects`);
    }

    // ═══ WAVE 2: Material Pricer (1 brain — runs first so Labor can use its quantities) ═══
    progressCallback(56, '💰 Wave 2: Material Pricer — computing material costs…', this._brainStatus);
    const wave2Results = await this._runWave(2, ['MATERIAL_PRICER'], filteredEncodedFiles, state, context, progressCallback);
    context.wave2 = wave2Results;

    // ── Post-Pricer Discipline Coverage Check (scope-aware) ──
    // Verify Material Pricer didn't silently drop IN-SCOPE disciplines
    // Disciplines excluded by the Responsibility Matrix are EXPECTED to be missing
    const pricerCategories = (wave2Results.MATERIAL_PRICER?.categories || []).map(c => (c.name || '').toLowerCase());
    const selectedDisciplines = state.disciplines || [];
    const scopeExclusions = context.wave1?.SCOPE_EXCLUSION_SCANNER?.responsibility_matrix || [];
    const excludedDisciplines = new Set(
      scopeExclusions.filter(r => !r.our_scope).map(r => (r.discipline || '').toLowerCase())
    );
    const missingDisciplines = [];
    const correctlyExcludedDisciplines = [];
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
      if (!found) {
        // Check if this discipline was excluded by scope — that's CORRECT behavior
        const isExcludedByScope = [...excludedDisciplines].some(exd =>
          dl.includes(exd) || exd.includes(dl) ||
          (dl.includes('cctv') && exd.includes('cctv')) ||
          (dl.includes('access') && exd.includes('access')) ||
          (dl.includes('fire') && exd.includes('fire')) ||
          (dl.includes('nurse') && exd.includes('nurse')) ||
          (dl.includes('intrusion') && exd.includes('intrusion')) ||
          (dl.includes('paging') && exd.includes('paging')) ||
          (dl.includes('audio') && (exd.includes('audio') || exd.includes('av')))
        );
        if (isExcludedByScope) {
          correctlyExcludedDisciplines.push(disc);
        } else {
          missingDisciplines.push(disc);
        }
      }
    }
    if (correctlyExcludedDisciplines.length > 0) {
      console.log(`[SmartBrains] ✅ Scope exclusions correctly removed ${correctlyExcludedDisciplines.length} out-of-scope discipline(s): ${correctlyExcludedDisciplines.join(', ')}`);
    }
    if (missingDisciplines.length > 0) {
      console.warn(`[SmartBrains] ⚠️ Material Pricer DROPPED ${missingDisciplines.length} IN-SCOPE discipline(s): ${missingDisciplines.join(', ')}`);
      console.warn('[SmartBrains] Report Writer will be instructed to add missing scope');
      context._missingDisciplines = missingDisciplines;
    }
    // ═══ POST-PRICER: Code-enforced price guardrails based on ACTUAL 3D purchase costs ═══
    // Commercial: from Marysville, San Joaquin Juvenile, Lovelock winning bids
    // Transit: higher costs for IK10 vandal-rated, stainless steel, railroad-grade equipment
    const _isTransit = state.isTransitRailroad || false;
    const _pricer = wave2Results.MATERIAL_PRICER;
    if (_pricer && (_pricer.categories || _pricer.material_categories)) {
      const _pCats = _pricer.categories || _pricer.material_categories || [];
      // MAX prices differ by project type — transit cameras cost 2-3x more than commercial
      // AUDIT FIX C10: Per-subtype pricing guardrails — PTZ cameras cost $4K-$8K, can't use flat $2500 cap
      const _maxCosts = _isTransit ? {
        // Transit: calibrated to actual Amtrak distributor pricing + 50% buffer
        'fixed camera': 2500, 'dome': 2500, 'bullet': 2500, 'ptz': 8000,
        'fisheye': 3500, 'panoram': 4000, 'multi-sensor': 6000, 'multi-lens': 6000,
        'mini dome': 2000, 'turret': 2500, 'box camera': 2500,
        'nvr': 18000, 'server': 18000, 'switch': 6000, 'reader': 800,
        'panel': 4000, 'controller': 4000, 'ups': 9000, 'patch panel': 800,
        'jack': 50, 'faceplate': 25, 'cable': 1500, 'speaker': 800,
        'strobe': 600, 'horn': 400, 'detector': 300, 'pull station': 150,
      } : {
        // Commercial: based on actual 3D purchase costs × 1.5 buffer
        'fixed camera': 2000, 'dome': 2000, 'bullet': 1500, 'ptz': 7000,
        'fisheye': 2500, 'panoram': 3000, 'multi-sensor': 5000, 'multi-lens': 5000,
        'mini dome': 1500, 'turret': 1500, 'box camera': 2000,
        'nvr': 16500, 'server': 16500, 'switch': 5000, 'reader': 500,
        'panel': 3000, 'controller': 3000, 'ups': 5000, 'patch panel': 700,
        'jack': 30, 'faceplate': 20, 'cable': 800, 'speaker': 600,
        'strobe': 400, 'horn': 300, 'detector': 200, 'pull station': 100,
      };
      let _clampCount = 0;
      for (const cat of _pCats) {
        for (const item of (cat.items || [])) {
          const iName = (item.item || item.name || '').toLowerCase();
          const iCost = item.unit_cost || item.unitCost || 0;
          // AUDIT FIX C10: Match longest keyword first so "ptz" doesn't match before "fixed camera"
          const _sortedGuardrails = Object.entries(_maxCosts).sort((a, b) => b[0].length - a[0].length);
          for (const [keyword, maxPrice] of _sortedGuardrails) {
            if (iName.includes(keyword) && iCost > maxPrice) {
              console.warn(`[SmartBrains] ⚠️ CLAMPED ${item.item || item.name}: $${iCost} -> $${maxPrice} (actual 3D max for ${keyword})`);
              item.unit_cost = maxPrice; item.unitCost = maxPrice;
              item.ext_cost = (item.qty || 1) * maxPrice;
              item.extCost = (item.qty || 1) * maxPrice;
              _clampCount++;
              break;
            }
          }
        }
        cat.subtotal = (cat.items || []).reduce((s, i) => s + (i.ext_cost || i.extCost || 0), 0);
      }
      if (_clampCount > 0) {
        _pricer.grand_total = _pCats.reduce((s, c) => s + (c.subtotal || 0), 0);
        // Recalculate total_with_markup so Financial Engine uses correct clamped values
        const _markupPct = _pricer.markup_pct || state.markup?.material || 50;
        _pricer.total_with_markup = Math.round(_pricer.grand_total * (1 + _markupPct / 100));
        console.log(`[SmartBrains] Price guardrails: clamped ${_clampCount} item(s) to actual 3D cost levels — grand_total: $${_pricer.grand_total}, total_with_markup: $${_pricer.total_with_markup}`);
      }
    }
    console.log('[SmartBrains] ═══ Wave 2 Complete — Materials priced ═══');

    // ═══ WAVE 2.25: Labor Calculator (runs AFTER Pricer to use priced quantities) ═══
    progressCallback(62, '👷 Wave 2.25: Labor Calculator — computing labor hours…', this._brainStatus);
    const wave225Results = await this._runWave(2.25, ['LABOR_CALCULATOR'], filteredEncodedFiles, state, context, progressCallback);
    context.wave2_25 = wave225Results;
    console.log('[SmartBrains] ═══ Wave 2.25 Complete — Labor calculated ═══');

    // ═══ WAVE 2.5: Financial Engine (runs AFTER both to sum their outputs) ═══
    progressCallback(68, '📊 Wave 2.5: Financial Engine — building SOV…', this._brainStatus);
    const wave25FinResults = await this._runWave(2.5, ['FINANCIAL_ENGINE'], filteredEncodedFiles, state, context, progressCallback);
    context.wave2_5_fin = wave25FinResults;
    console.log('[SmartBrains] ═══ Wave 2.5 Complete — Financials computed ═══');

    // ═══ WAVE 2.75: Reverse Verification (1 brain, Pro model) ═══
    progressCallback(72, '🔄 Wave 2.75: Reverse-verifying BOQ against plans…', this._brainStatus);
    const wave275Results = await this._runWave(2.75, ['REVERSE_VERIFIER'], filteredEncodedFiles, state, context, progressCallback);
    context.wave2_75 = wave275Results;
    console.log('[SmartBrains] ═══ Wave 2.75 Complete ═══');

    // ═══ WAVE 3: Adversarial Audit (2 parallel brains, Pro model) ═══
    progressCallback(78, '😈 Wave 3: Adversarial Audit — cross-validator + devil\'s advocate…', this._brainStatus);
    const wave3Results = await this._runWave(3, ['CROSS_VALIDATOR', 'DEVILS_ADVOCATE'], filteredEncodedFiles, state, context, progressCallback);
    context.wave3 = wave3Results;
    console.log('[SmartBrains] ═══ Wave 3 Complete ═══');

    // ═══ WAVE 3.5: Deep Accuracy Pass (3 parallel brains, Pro) ═══
    try {
      progressCallback(82, '🔎 Wave 3.5: Deep Accuracy — Detail Verifier + Cross-Sheet + Overlap Detector…', this._brainStatus);
      const wave35Keys = ['DETAIL_VERIFIER', 'CROSS_SHEET_ANALYZER', 'OVERLAP_DETECTOR'];
      const wave35Results = await this._runWave(3.5, wave35Keys, filteredEncodedFiles, state, context, progressCallback);
      context.wave3_5 = wave35Results;
      console.log('[SmartBrains] ═══ Wave 3.5 Complete — Deep Accuracy done (3 brains) ═══');
    } catch (e) {
      console.warn('[SmartBrains] Wave 3.5 failed (non-fatal, continuing):', e.message);
      context.wave3_5 = {};
    }

    // ═══ WAVE 3.75: 6th Read — Final Reconciliation (1 brain, Pro deep reasoning) ═══
    try {
      progressCallback(86, '🏁 Wave 3.75: 6th Read — Final Reconciliation sweep…', this._brainStatus);
      const wave375Results = await this._runWave(3.75, ['FINAL_RECONCILIATION'], filteredEncodedFiles, state, context, progressCallback);
      context.wave3_75 = wave375Results;
      console.log('[SmartBrains] ═══ Wave 3.75 Complete — 6th Read done ═══');
    } catch (e) {
      console.warn('[SmartBrains] Wave 3.75 failed (non-fatal, continuing):', e.message);
      context.wave3_75 = {};
    }

    // ═══ WAVE 3.85: Estimate Correction (1 brain, Pro — corrects pricer using verification findings) ═══
    try {
      progressCallback(88, '🔧 Wave 3.85: Estimate Corrector — applying verification fixes…', this._brainStatus);
      const wave385Results = await this._runWave(3.85, ['ESTIMATE_CORRECTOR'], filteredEncodedFiles, state, context, progressCallback);
      context.wave3_85 = wave385Results;

      // If corrections were produced, log the summary and inject into context
      const corrector = wave385Results.ESTIMATE_CORRECTOR;
      if (corrector && !corrector._failed && !corrector._parseFailed && corrector.corrected_categories) {
        const log = corrector.correction_log || [];
        console.log(`[SmartBrains] ═══ Wave 3.85 Complete — ${log.length} correction(s) applied ═══`);
        for (const entry of log) {
          console.log(`[SmartBrains]   🔧 ${entry.action}: ${entry.item} — ${entry.reason} (${entry.cost_impact >= 0 ? '+' : ''}$${entry.cost_impact?.toLocaleString()})`);
        }
        if (corrector.total_adjustment) {
          console.log(`[SmartBrains]   📊 Total adjustment: ${corrector.total_adjustment >= 0 ? '+' : ''}$${corrector.total_adjustment?.toLocaleString()}`);
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

    // ═══ PRE-WAVE 4: Load Winning Proposals + Company Strengths + Bid Decision Patterns ═══
    try {
      const [wpResult, csResult, bdResult] = await Promise.allSettled([
        fetch('/api/winning-proposals', { headers: this._authHeaders() }).then(r => r.ok ? r.json() : null),
        fetch('/api/company-strengths', { headers: this._authHeaders() }).then(r => r.ok ? r.json() : null),
        fetch(`/api/bid-decisions?project_type=${encodeURIComponent(state.projectType || '')}`, { headers: this._authHeaders() }).then(r => r.ok ? r.json() : null),
      ]);

      if (wpResult.status === 'fulfilled' && wpResult.value?.proposals?.length > 0) {
        context.winningProposals = wpResult.value.proposals;
        console.log(`[SmartBrains] 🏆 Winning Proposals: loaded ${context.winningProposals.length} past winning bid(s) for tone/strategy learning`);
      }

      if (csResult.status === 'fulfilled' && csResult.value?.strengths?.length > 0) {
        context.companyStrengths = csResult.value.strengths;
        console.log(`[SmartBrains] 💪 Company Strengths: loaded ${context.companyStrengths.length} competitive positioning data point(s)`);
      }

      if (bdResult.status === 'fulfilled' && bdResult.value?.decisions?.length > 0) {
        context.bidDecisions = bdResult.value.decisions;
        console.log(`[SmartBrains] 🎯 Bid Decisions: loaded ${context.bidDecisions.length} past bid adjustment pattern(s)`);
      }
    } catch (e) {
      console.warn('[SmartBrains] Pre-Wave 4 data loading failed (non-fatal):', e.message);
    }

    // ═══ WAVE 4: Report Synthesis (1 brain) ═══
    progressCallback(92, '📝 Wave 4: Writing final report…', this._brainStatus);
    const wave4Results = await this._runWave(4, ['REPORT_WRITER'], filteredEncodedFiles, state, context, progressCallback);
    console.log('[SmartBrains] ═══ Wave 4 Complete ═══');

    // Log session cost summary
    if (this._sessionCost) {
      const sc = this._sessionCost;
      console.log(`[SmartBrains] ═══ API COST SUMMARY ═══`);
      console.log(`[SmartBrains]   Brain calls: ${sc.brainCalls}`);
      console.log(`[SmartBrains]   Tokens: ${sc.totalCached.toLocaleString()} cached + ${sc.totalFresh.toLocaleString()} fresh + ${sc.totalOutput.toLocaleString()} output`);
      console.log(`[SmartBrains]   Total cost: $${sc.totalCost.toFixed(4)}`);
      console.log(`[SmartBrains]   Cache savings: $${sc.totalSavings.toFixed(4)}`);
      console.log(`[SmartBrains]   Effective rate: $${(sc.totalCost / Math.max(sc.brainCalls, 1)).toFixed(4)} per brain`);
      if (sc.totalCached > 0) {
        const pctCached = ((sc.totalCached / (sc.totalCached + sc.totalFresh)) * 100).toFixed(1);
        console.log(`[SmartBrains]   Cache hit rate: ${pctCached}%`);
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
      _ocrScaleData: ocrScalePages.length > 0 ? ocrScalePages : undefined,
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
        sheetFilter: context._sheetFilterStats || null,
        skippedSheets: context._skippedSheets || [],
      },
    };
  },
};


// Make available globally
if (typeof window !== 'undefined') {
  window.SmartBrains = SmartBrains;
}
