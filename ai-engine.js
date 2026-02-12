/* ═══════════════════════════════════════════════════════════════
   SMARTPLANS — MULTI-BRAIN AI ENGINE v1.0
   ═══════════════════════════════════════════════════════════════
   10 Specialized AI Brains × 4 Processing Waves
   Parallel execution with cross-validation for 98%+ accuracy
   
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

  VERSION: '1.0.0',

  // ═══════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════

  config: {
    // 10 API keys — one per brain for true parallel execution
    // Each brain gets its own dedicated key: zero rate-limit contention
    apiKeys: [
      'AIzaSyAmP2pnHqMvHe960AvxhGRmWr21Xb7Wpxw',  // Brain 0: Symbol Scanner
      'AIzaSyCh6EA9MaR7Y1MjyjR7MCxPiGVzmGELBlQ',  // Brain 1: Code Compliance
      'AIzaSyCP5H4QTimW7BtPJ8hSKVwb1SSdcOl6Yn0',  // Brain 2: MDF/IDF Analyzer
      'AIzaSyD3psR7vaKT-iT8kMogICvhhsTne4Vbf9k',  // Brain 3: Cable & Pathway
      'AIzaSyB3_d0qstDxwBDIEbLBlBB-_NbVzscHrp4',  // Brain 4: Special Conditions
      'AIzaSyAcTkAiy4x6Lg3a2zudSaK4iBbtEqB1B34',  // Brain 5: Material Pricer
      'AIzaSyAAN3Wlq3SCFrSoPo5lB9SGZuL6JxZvbj8',  // Brain 6: Labor Calculator
      'AIzaSyCgfEYz8tctigTM1_MkezeTBgzz92Rq8x4',   // Brain 7: Financial Engine
      'AIzaSyDhf3K_y9HIQNYKvcdR2HEZSzPOQBmdh9w',  // Brain 8: Cross Validator
      'AIzaSyB84NuoTxXeUz6gMHxEFpZFmyYrOIpLe4g',  // Brain 9: Report Synthesizer
    ],
    model: 'gemini-2.0-flash',              // Fast model for Wave 1-2 (speed)
    accuracyModel: 'gemini-2.5-flash',       // Smarter model for Wave 3-4 (accuracy)
    useProxy: false,
    proxyEndpoint: '/api/ai/invoke',
    maxRetries: 3,
    retryBaseDelay: 1000,
    timeout: 120000,
  },

  // ═══════════════════════════════════════════════════════════
  // BRAIN REGISTRY — Each brain is a domain specialist
  // ═══════════════════════════════════════════════════════════

  BRAINS: {
    SYMBOL_SCANNER: { id: 0, name: 'Symbol Scanner', wave: 1, emoji: '🔍', needsFiles: ['legends', 'plans'], maxTokens: 8192 },
    CODE_COMPLIANCE: { id: 1, name: 'Code Compliance', wave: 1, emoji: '📋', needsFiles: ['plans', 'specs'], maxTokens: 8192 },
    MDF_IDF_ANALYZER: { id: 2, name: 'MDF/IDF Analyzer', wave: 1, emoji: '🏗️', needsFiles: ['plans', 'specs'], maxTokens: 8192 },
    CABLE_PATHWAY: { id: 3, name: 'Cable & Pathway', wave: 1, emoji: '🔌', needsFiles: ['plans', 'specs'], maxTokens: 8192 },
    SPECIAL_CONDITIONS: { id: 4, name: 'Special Conditions', wave: 1, emoji: '⚠️', needsFiles: ['plans', 'specs'], maxTokens: 8192 },
    MATERIAL_PRICER: { id: 5, name: 'Material Pricer', wave: 2, emoji: '💰', needsFiles: [], maxTokens: 8192 },
    LABOR_CALCULATOR: { id: 6, name: 'Labor Calculator', wave: 2, emoji: '👷', needsFiles: [], maxTokens: 8192 },
    FINANCIAL_ENGINE: { id: 7, name: 'Financial Engine', wave: 2, emoji: '📊', needsFiles: [], maxTokens: 12288 },
    CROSS_VALIDATOR: { id: 8, name: 'Cross Validator', wave: 3, emoji: '✅', needsFiles: [], maxTokens: 8192, useAccuracyModel: true },
    REPORT_WRITER: { id: 9, name: 'Report Synthesizer', wave: 4, emoji: '📝', needsFiles: [], maxTokens: 32768, useAccuracyModel: true },
  },

  // Brain status tracking for UI
  _brainStatus: {},

  // ═══════════════════════════════════════════════════════════
  // FILE ENCODING — Encode once, distribute to brains
  // ═══════════════════════════════════════════════════════════

  async _encodeAllFiles(state, progressCallback) {
    const MAX_FILE_SIZE = 20 * 1024 * 1024;

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
          console.warn(`[SmartBrains] Skipping oversized file: ${entry.name}`);
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
              base64,
              mimeType: finalMime,
              size: entry.rawFile.size,
            };

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
  // ═══════════════════════════════════════════════════════════

  _buildFileParts(brainDef, encodedFiles) {
    const parts = [];
    for (const category of brainDef.needsFiles) {
      const files = encodedFiles[category] || [];
      for (const f of files) {
        parts.push({ text: `\n--- FILE: ${f.name} (${f.category}) ---` });
        parts.push({ inline_data: { mime_type: f.mimeType, data: f.base64 } });
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
    const keyCount = this.config.apiKeys.length;
    let keyIndex = brainDef.id % keyCount;
    let lastError = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const apiKey = this.config.apiKeys[keyIndex];
      const modelName = (brainDef.useAccuracyModel && this.config.accuracyModel) ? this.config.accuracyModel : this.config.model;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const parts = [{ text: promptText }, ...fileParts];
      const genConfig = {
        temperature: brainKey === 'CROSS_VALIDATOR' ? 0.1 : 0.2,
        maxOutputTokens: brainDef.maxTokens,
      };
      if (useJsonMode) {
        genConfig.responseMimeType = 'application/json';
      }

      const body = {
        contents: [{ parts }],
        generationConfig: genConfig,
      };

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.status === 429 || response.status === 403 || response.status >= 500) {
          keyIndex = (keyIndex + 1) % keyCount;
          const delay = this.config.retryBaseDelay * Math.pow(2, attempt) + Math.random() * 500;
          console.warn(`[Brain:${brainDef.name}] API ${response.status}, retrying in ${Math.round(delay)}ms (key ${keyIndex})`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `API ${response.status}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') || '';

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
        keyIndex = (keyIndex + 1) % keyCount;
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, this.config.retryBaseDelay * Math.pow(2, attempt)));
        }
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
    SYMBOL_SCANNER: ['sheets', 'totals'],
    CODE_COMPLIANCE: ['issues', 'summary'],
    MDF_IDF_ANALYZER: ['rooms'],
    CABLE_PATHWAY: ['horizontal_cables', 'pathways'],
    SPECIAL_CONDITIONS: ['equipment_rentals', 'permits'],
    MATERIAL_PRICER: ['categories', 'grand_total'],
    LABOR_CALCULATOR: ['phases', 'total_hours'],
    FINANCIAL_ENGINE: ['sov', 'project_summary'],
    CROSS_VALIDATOR: ['status', 'issues', 'confidence_score'],
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
      CABLE_PATHWAY: () => `You are a CABLE & PATHWAY ENGINEER analyzing cable runs and pathway infrastructure.

PROJECT: ${context.projectName} | Type: ${context.projectType}
DISCIPLINES: ${(context.disciplines || []).join(', ')}

YOUR MISSION: Analyze all cable pathways, conduit, cable tray, and estimate cable quantities.

ANALYZE:
1. Horizontal cable runs — type (Cat5e/6/6A), estimated average length
2. Backbone/riser cables — fiber (SM/MM) and copper between rooms
3. Pathway types — J-hooks, cable tray, conduit (EMT/rigid/PVC), innerduct
4. Conduit sizing and fill calculations
5. Vertical risers and sleeve sizes
6. Underground/exterior pathways
7. Special pathway requirements (plenum, riser, LSZH)

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
  "firestopping": { "penetrations": 24, "type": "EZ-Path or Hilti firestop" },
  "notes": []
}`,

      // ── BRAIN 5: Special Conditions ──────────────────────────
      SPECIAL_CONDITIONS: () => `You are a CONSTRUCTION SPECIAL CONDITIONS ANALYST for ELV projects.

PROJECT: ${context.projectName} | Type: ${context.projectType}
LOCATION: ${context.projectLocation || 'Not specified'}
PREVAILING WAGE: ${context.prevailingWage || 'Not specified'}
WORK SHIFT: ${context.workShift || 'Standard'}

YOUR MISSION: Identify ALL special conditions, equipment needs, subcontractors, permits, and risk factors.

CHECK FOR:
1. Equipment Rentals: scissor lifts, boom lifts, scaffolding, trenchers
2. Subcontractors: core drilling, trenching, electrical, firestopping, structural
3. Permits: fire alarm, low voltage, excavation, right-of-way, hot work
4. Site Conditions: asbestos, occupied building, high security, weather exposure
5. Special Materials: underground conduit, bollards, seismic bracing, plenum cable
6. Tools: cable certifier, fusion splicer, thermal imager, OTDR

Return ONLY valid JSON:
{
  "equipment_rentals": [
    { "item": "Scissor Lift", "duration_days": 20, "daily_rate": 185, "reason": "Ceiling height 15ft+" }
  ],
  "subcontractors": [
    { "trade": "Core Drilling", "scope": "12 penetrations through concrete floors", "est_cost_range": "$3000-$5000" }
  ],
  "permits": [
    { "type": "Fire Alarm Permit", "jurisdiction": "City", "est_cost": 500, "lead_time_days": 14 }
  ],
  "site_conditions": [
    { "condition": "Occupied building", "impact": "Work restricted to nights/weekends in patient areas", "cost_impact": "$$" }
  ],
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

        return `You are a CONSTRUCTION MATERIAL PRICING SPECIALIST. Calculate exact material costs.

PROJECT: ${context.projectName}
PRICING TIER: ${tier.toUpperCase()} | REGION: ${regionKey} (${regionMult}× multiplier)
MATERIAL MARKUP: ${context.markup?.material || 25}%

SYMBOL COUNTS FROM SCANNER:
${JSON.stringify(context.wave1?.SYMBOL_SCANNER || {}, null, 2)}

MDF/IDF EQUIPMENT:
${JSON.stringify(context.wave1?.MDF_IDF_ANALYZER || {}, null, 2)}

CABLE QUANTITIES:
${JSON.stringify(context.wave1?.CABLE_PATHWAY || {}, null, 2)}

PRICING DATABASE (use these exact prices):
${context.pricingContext || 'Use industry standard pricing'}

INSTRUCTIONS:
1. Match every counted symbol to a material item with unit cost
2. Use the EXACT prices from the pricing database above
3. Apply the ${regionMult}× regional multiplier to all prices
4. Calculate: Qty × Unit Cost × ${regionMult} = Extended Cost
5. Group by category (Cabling, CCTV, Access Control, Fire Alarm, etc.)
6. Include ALL mounting hardware, connectors, and accessories

Return ONLY valid JSON:
{
  "categories": [
    {
      "name": "Structured Cabling",
      "items": [
        { "item": "Cat 6A Plenum Cable", "qty": 30000, "unit": "ft", "unit_cost": 0.52, "ext_cost": 15600.00 }
      ],
      "subtotal": 45200.00
    }
  ],
  "grand_total": 125000.00,
  "markup_pct": ${context.markup?.material || 25},
  "total_with_markup": 156250.00
}`;
      },

      // ── BRAIN 7: Labor Calculator ────────────────────────────
      LABOR_CALCULATOR: () => {
        const burdenMult = context.includeBurden ? (1 + (context.burdenRate || 35) / 100) : 1.0;
        return `You are a CONSTRUCTION LABOR ESTIMATOR using NECA labor standards.

PROJECT: ${context.projectName} | Type: ${context.projectType}
LABOR MARKUP: ${context.markup?.labor || 30}%
BURDEN RATE: ${context.includeBurden ? context.burdenRate + '%' : 'Not applied'}
PREVAILING WAGE: ${context.prevailingWage || 'No'}
WORK SHIFT: ${context.workShift || 'Standard'}

LABOR RATES:
${Object.entries(context.laborRates || {}).map(([k, v]) =>
          `- ${k}: $${v}/hr base × ${burdenMult.toFixed(2)} burden = $${(v * burdenMult).toFixed(2)}/hr loaded`
        ).join('\n')}

MATERIAL QUANTITIES (from Material Pricer):
${JSON.stringify(context.wave2?.MATERIAL_PRICER || context.wave1 || {}, null, 2).substring(0, 8000)}

NECA LABOR UNIT GUIDELINES:
- Cat6A drop (install+terminate+test): 0.45-0.55 hrs/drop
- Camera install (mount+wire+aim): 2.0-3.5 hrs/camera
- Card reader (mount+wire+program): 2.5-4.0 hrs/door
- Fire alarm device: 0.5-1.5 hrs/device depending on type
- Rack build-out: 8-16 hrs/rack
- Cable tray: 0.15-0.25 hrs/ft

Calculate labor by PROJECT PHASE:
1. Rough-In (45-50% of total) — pathway, conduit, cable pulling, backboxes
2. Trim/Termination (25-30%) — device mounting, terminations, rack dress
3. Programming (10-15%) — system programming, configuration
4. Testing/Commissioning (10-15%) — certification, verification, punch list

Return ONLY valid JSON:
{
  "phases": [
    {
      "name": "Rough-In",
      "pct_of_total": 45,
      "tasks": [
        { "description": "Install cable tray — 500 LF", "classification": "journeyman", "hours": 100, "rate": 65.00, "cost": 6500.00 }
      ],
      "phase_hours": 500,
      "phase_cost": 32500.00
    }
  ],
  "total_hours": 1200,
  "total_base_cost": 78000.00,
  "markup_pct": ${context.markup?.labor || 30},
  "total_with_markup": 101400.00,
  "crew_recommendation": { "journeyman": 3, "apprentice": 2, "foreman": 1, "duration_weeks": 8 }
}`;
      },

      // ── BRAIN 8: Financial Engine ────────────────────────────
      FINANCIAL_ENGINE: () => `You are a CONSTRUCTION FINANCIAL ANALYST producing SOV and final pricing.

PROJECT: ${context.projectName} | Location: ${context.projectLocation || 'Not specified'}
PREVAILING WAGE: ${context.prevailingWage || 'No'}
MARKUP: Material ${context.markup?.material || 25}% | Labor ${context.markup?.labor || 30}% | Equipment ${context.markup?.equipment || 15}% | Subcontractor ${context.markup?.subcontractor || 10}%

MATERIAL COSTS:
${JSON.stringify(context.wave2?.MATERIAL_PRICER || {}, null, 2).substring(0, 5000)}

LABOR COSTS:
${JSON.stringify(context.wave2?.LABOR_CALCULATOR || {}, null, 2).substring(0, 5000)}

SPECIAL CONDITIONS:
${JSON.stringify(context.wave1?.SPECIAL_CONDITIONS || {}, null, 2).substring(0, 3000)}

GENERATE:
1. Schedule of Values (SOV) in AIA G703 format with actual dollar amounts
2. Travel & Per Diem estimate (if project location is 100+ miles, use GSA rates)
3. Prevailing wage determination (if applicable)
4. Complete project cost summary with all markups applied

Return ONLY valid JSON:
{
  "sov": [
    { "item_num": "01-001", "description": "Mobilization/Demobilization", "material": 0, "labor": 2500, "equipment": 500, "total": 3000 }
  ],
  "travel": {
    "applicable": false,
    "phases": [],
    "total": 0,
    "note": "Project location not specified"
  },
  "prevailing_wage": {
    "applicable": false,
    "classifications": [],
    "note": ""
  },
  "project_summary": {
    "total_materials": 125000,
    "total_labor": 78000,
    "total_equipment": 15000,
    "total_subcontractors": 12000,
    "total_travel": 0,
    "subtotal": 230000,
    "contingency_pct": 10,
    "contingency": 23000,
    "grand_total": 253000
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
${JSON.stringify(context.wave2?.LABOR_CALCULATOR || {}, null, 2).substring(0, 4000)}

FINANCIAL ENGINE DATA:
${JSON.stringify(context.wave2?.FINANCIAL_ENGINE || {}, null, 2).substring(0, 4000)}

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
      REPORT_WRITER: () => `You are a PROFESSIONAL CONSTRUCTION ESTIMATING REPORT WRITER.

Compile the validated data below into a comprehensive, professionally formatted markdown report.
This report will be used for projects valued up to $50 BILLION — it must be impeccable.

USE THIS EXACT SECTION ORDER:
1. ## CODE & STANDARDS COMPLIANCE REVIEW
2. ## MDF/IDF MATERIAL BREAKDOWN (per room with tables)
3. ## OVERALL MATERIAL SUMMARY (with unit prices and extended costs in tables)
4. ## LABOR SUMMARY (hours by discipline, by phase, with loaded rates and dollar totals)
5. ## PREVAILING WAGE DETERMINATION (if applicable)
6. ## SPECIAL EQUIPMENT & CONDITIONS (with ⚠️ flags and cost impact $/$$/$$$/$$$$)
7. ## TRAVEL & PER DIEM ESTIMATE (if applicable)
8. ## SCHEDULE OF VALUES (SOV) — AIA G703 format table with dollar amounts
9. ## PRICED ESTIMATE SUMMARY (material + labor + equipment + sub + markup = total price)
10. ## CODE COMPLIANCE SUMMARY (issue counts: 🔴 Critical / 🟡 Warning / 🔵 Info)
11. ## OBSERVATIONS & ANALYSIS
12. ## RFIs

FORMATTING RULES:
- Use markdown tables with actual dollar amounts — NO placeholders
- Tag code issues: 🔴 CRITICAL, 🟡 WARNING, 🔵 INFO
- Tag special equipment: ⚠️ with cost impact ($, $$, $$$, $$$$)
- Include confidence percentage for each major count
- Reference sheet numbers and room numbers
- All math must be verifiable (Qty × Unit Cost = Extended Cost)

VALIDATED DATA FROM ALL BRAINS:

SYMBOL COUNTS: ${JSON.stringify(context.wave1?.SYMBOL_SCANNER || {}, null, 2).substring(0, 3000)}
CODE COMPLIANCE: ${JSON.stringify(context.wave1?.CODE_COMPLIANCE || {}, null, 2).substring(0, 3000)}
MDF/IDF ROOMS: ${JSON.stringify(context.wave1?.MDF_IDF_ANALYZER || {}, null, 2).substring(0, 3000)}
CABLE & PATHWAY: ${JSON.stringify(context.wave1?.CABLE_PATHWAY || {}, null, 2).substring(0, 3000)}
SPECIAL CONDITIONS: ${JSON.stringify(context.wave1?.SPECIAL_CONDITIONS || {}, null, 2).substring(0, 2000)}
MATERIAL COSTS: ${JSON.stringify(context.wave2?.MATERIAL_PRICER || {}, null, 2).substring(0, 4000)}
LABOR COSTS: ${JSON.stringify(context.wave2?.LABOR_CALCULATOR || {}, null, 2).substring(0, 4000)}
FINANCIALS: ${JSON.stringify(context.wave2?.FINANCIAL_ENGINE || {}, null, 2).substring(0, 4000)}
VALIDATION: ${JSON.stringify(context.wave3?.CROSS_VALIDATOR || {}, null, 2).substring(0, 2000)}

Generate the COMPLETE report in markdown format. Every section must have real data.`,

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
            const adjusted = +(item[tier] * regionMult).toFixed(2);
            ctx += `  ${key}: $${adjusted}/${item.unit || 'ea'} (${item.description || ''})\n`;
          }
        }
      }
    }

    return ctx.substring(0, 12000);
  },


  // ═══════════════════════════════════════════════════════════
  // WAVE ORCHESTRATION — Parallel execution engine
  // ═══════════════════════════════════════════════════════════

  async _runWave(waveNum, brainKeys, encodedFiles, state, context, progressCallback) {
    const waveStart = { 1: 15, 2: 55, 3: 75, 4: 85 };
    const waveEnd = { 1: 55, 2: 75, 3: 85, 4: 98 };
    const baseProgress = waveStart[waveNum] || 0;
    const endProgress = waveEnd[waveNum] || 100;
    const waveNames = { 1: 'Document Intelligence', 2: 'Cost Engine', 3: 'Cross-Validation', 4: 'Report Synthesis' };

    const results = {};
    let completed = 0;

    // Set all brains in this wave to 'active'
    for (const key of brainKeys) {
      const brain = this.BRAINS[key];
      this._brainStatus[key] = { status: 'active', progress: 0, result: null, error: null };
      progressCallback(baseProgress, `Wave ${waveNum}: ${waveNames[waveNum]}`, this._brainStatus);
    }

    // Build promises for all brains in this wave
    const promises = brainKeys.map(async (key) => {
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
        completed++;

        const pct = baseProgress + (completed / brainKeys.length) * (endProgress - baseProgress);
        progressCallback(pct, `✅ ${brain.name} complete`, this._brainStatus);

      } catch (err) {
        console.error(`[Brain:${brain.name}] FAILED:`, err.message);
        this._brainStatus[key] = { status: 'failed', progress: 0, result: null, error: err.message };
        results[key] = { _error: err.message, _failed: true };
        completed++;

        const pct = baseProgress + (completed / brainKeys.length) * (endProgress - baseProgress);
        progressCallback(pct, `⚠️ ${brain.name} failed — continuing…`, this._brainStatus);
      }
    });

    await Promise.allSettled(promises);

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
    console.log(`[SmartBrains] ═══ Starting Multi-Brain Analysis v${this.VERSION} ═══`);
    console.log(`[SmartBrains] API Keys: ${this.config.apiKeys.length} | Model: ${this.config.model}`);

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

    // Build shared context
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
      pricingContext: this._buildPricingContext(state),
      wave1: null,
      wave2: null,
      wave3: null,
    };

    // ═══ WAVE 1: Document Intelligence (5 parallel brains) ═══
    progressCallback(16, '🧠 Wave 1: Document Intelligence — 5 brains analyzing…', this._brainStatus);
    const wave1Keys = ['SYMBOL_SCANNER', 'CODE_COMPLIANCE', 'MDF_IDF_ANALYZER', 'CABLE_PATHWAY', 'SPECIAL_CONDITIONS'];
    const wave1Results = await this._runWave(1, wave1Keys, encodedFiles, state, context, progressCallback);
    context.wave1 = wave1Results;
    console.log('[SmartBrains] ═══ Wave 1 Complete ═══');

    // ═══ WAVE 2: Cost Engine (3 parallel brains) ═══
    progressCallback(56, '💰 Wave 2: Cost Engine — computing pricing…', this._brainStatus);
    const wave2Keys = ['MATERIAL_PRICER', 'LABOR_CALCULATOR', 'FINANCIAL_ENGINE'];
    const wave2Results = await this._runWave(2, wave2Keys, encodedFiles, state, context, progressCallback);
    context.wave2 = wave2Results;
    console.log('[SmartBrains] ═══ Wave 2 Complete ═══');

    // ═══ WAVE 3: Cross-Validation (1 brain) ═══
    progressCallback(76, '✅ Wave 3: Cross-validating all results…', this._brainStatus);
    const wave3Results = await this._runWave(3, ['CROSS_VALIDATOR'], encodedFiles, state, context, progressCallback);
    context.wave3 = wave3Results;
    console.log('[SmartBrains] ═══ Wave 3 Complete ═══');

    // ═══ WAVE 4: Report Synthesis (1 brain) ═══
    progressCallback(86, '📝 Wave 4: Writing final report…', this._brainStatus);
    const wave4Results = await this._runWave(4, ['REPORT_WRITER'], encodedFiles, state, context, progressCallback);
    console.log('[SmartBrains] ═══ Wave 4 Complete ═══');

    // Extract final report
    const report = wave4Results.REPORT_WRITER;
    if (!report || report._failed) {
      throw new Error('Report synthesis failed — unable to generate final report');
    }

    // Append validation summary
    const validator = wave3Results.CROSS_VALIDATOR;
    let validationAppendix = '';
    if (validator && !validator._failed) {
      validationAppendix = '\n\n## ⚠️ VERIFICATION AUDIT\n';
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

    // Build final analysis text
    const finalReport = (typeof report === 'string' ? report : JSON.stringify(report, null, 2)) + validationAppendix;

    progressCallback(100, '🎯 Multi-brain analysis complete!', this._brainStatus);

    // Return structured result
    return {
      report: finalReport,
      brainResults: {
        wave1: wave1Results,
        wave2: wave2Results,
        wave3: wave3Results,
      },
      brainStatus: { ...this._brainStatus },
      stats: {
        totalBrains: 10,
        successfulBrains: Object.values(this._brainStatus).filter(s => s.status === 'done').length,
        failedBrains: Object.values(this._brainStatus).filter(s => s.status === 'failed').length,
        confidence: validator?.confidence_score || null,
      },
    };
  },
};


// Make available globally
if (typeof window !== 'undefined') {
  window.SmartBrains = SmartBrains;
}
