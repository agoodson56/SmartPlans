// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — PROFESSIONAL PROPOSAL GENERATOR v3.0
// Fortune 500-grade Microsoft Word proposals
// Uses Word-native table/bgcolor formatting (NOT modern CSS)
// ═══════════════════════════════════════════════════════════════

const ProposalGenerator = {


  COMPANY: {
    name: '3D Technology Services, Inc.',
    address: '11365 Sunrise Gold Circle',
    cityStateZip: 'Rancho Cordova, CA 95742',
    consultant: 'Justin Whitton',
    title: 'Senior Sales Consultant',
    email: 'jwhitton@3dtsi.com',
    phone: '(916) 267-7319',
    mainPhone: '(916) 859-9111',
    website: 'www.3Dtsi.com',
    tagline: 'Premier Low-Voltage Technology Integration',
  },

  BRAND: {
    gold: '#EBB328',
    teal: '#3B97A1',
    tealDark: '#2B828B',
    navy: '#2B828B',      // Company teal green (was navy blue #2B828B)
    dark: '#237078',       // Darker teal (was #1a1a2e)
    gray: '#4A5568',
    lightGray: '#F4F6F8',
    border: '#D1D5DB',
  },

  // ─── Generate the proposal via Gemini AI ───────────────────
  async generateProposal(state, progressCallback) {
    const co = this.COMPANY;
    const _san = (s, max = 500) => String(s ?? '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').substring(0, max);
    const projName = _san(state.projectName, 200) || 'Untitled Project';
    const projType = _san(state.projectType, 200) || 'Low Voltage Installation';
    const projLoc = _san(state.projectLocation, 300) || 'To Be Determined';
    const preparedFor = _san(state.preparedFor, 200) || projName;
    const disciplines = (state.disciplines || []).map(d => _san(d, 100)).join(', ') || 'Low Voltage Systems';
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    // v5.129.8 — 45-day validity period to match Proposal Validity; Right to Withdraw clause
    const validUntil = new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000)
      .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // CRITICAL: Pre-compute BOM grand total BEFORE anything else.
    this._precomputeBOMTotal(state);
    const grandTotal = this._extractGrandTotal(state);
    const grandTotalDisplay = grandTotal ? this._formatMoney(grandTotal) : null;

    // Strip internal costs/markups from analysis before sending to AI
    // Client must NEVER see base costs, markups, or internal pricing
    const rawAnalysis = (state.aiAnalysis || '').substring(0, 20000);
    const analysisSummary = rawAnalysis
      .replace(/\b(base\s*cost|raw\s*cost|cost\s*before|markup\s*%?|burden|margin|profit\s*%|overhead\s*%|internal)\b[^\n]*\n/gi, '')
      .replace(/\|\s*(?:Base\s*Cost|Markup|Burden|Margin|Profit)\s*\|/gi, '| — |');

    // v5.128.12: Inject the EXACT BOM quantities as an authoritative fact list.
    // The raw AI analysis text often contains earlier/rougher quantity claims
    // (e.g. "10,000 ft Cat 6A") while the final BOM has post-processing numbers
    // (e.g. "11,470 ft" after cable injection with TIA-568 295ft limit).
    // Without this, the narrative and the BOM disagree — customer catches it.
    const bomQuantityFacts = this._buildBOMQuantityFacts(state);

    progressCallback(5, 'Crafting executive proposal with AI…');

    const prompt = `You are the Senior Proposal Manager at ${co.name}, a premier low-voltage technology integrator with 20+ years of excellence. You are writing a WINNING proposal that will be submitted to a real client. This must be the most professional, compelling, and detailed proposal the client has ever received.

PROJECT: "${projName}"
TYPE: ${projType}
LOCATION: ${projLoc}
DISCIPLINES: ${disciplines}
DATE: ${dateStr}
VALID UNTIL: ${validUntil}
CONSULTANT: ${co.consultant}, ${co.title}

TOTAL BID PRICE: ${grandTotalDisplay || 'See financial summary'}

═══ SCOPE DATA (quantities only) ═══
The following contains device counts, cable quantities, and scope details from our AI analysis. Use these quantities in the proposal — do NOT invent different numbers:

${analysisSummary}

═══ AUTHORITATIVE BOM QUANTITIES — USE THESE EXACT NUMBERS ═══
The line items below are the FINAL, post-processed quantities that appear on the Bill of Materials delivered with this proposal. The narrative MUST match these numbers verbatim. If the analysis text above contains a different quantity for the same item (e.g. "10,000 ft" when the BOM says "11,470 ft"), use the BOM number — not the analysis number. The customer will cross-reference. Any mismatch invalidates the proposal.

${bomQuantityFacts}

═══ ABSOLUTE PRICING RULES — VIOLATION = REJECTED PROPOSAL ═══
This proposal goes directly to a CLIENT. Internal pricing is CONFIDENTIAL and must NEVER appear:
- The ONLY dollar amount in the ENTIRE proposal body text is the TOTAL BID PRICE: ${grandTotalDisplay || 'the grand total'}
- NEVER show: base costs, raw costs, unit costs, material costs, labor costs, markup %, burden %, overhead %, profit %, contingency %, per-item prices, category subtotals, or any cost breakdown
- NEVER show any dollar figure other than the total bid price in paragraphs, summaries, or descriptions
- Tables may show quantities and descriptions but NEVER individual prices — only the grand total
- If ANY internal cost number appears anywhere, the proposal is IMMEDIATELY REJECTED
- The financial table in the HTML template handles pricing display — the AI text must NOT duplicate or contradict it

═══ PROPOSAL REQUIREMENTS ═══
Write a MINIMUM 10-page Fortune 500 executive proposal. Each section must have MULTIPLE rich paragraphs (not just bullet points). This proposal must convince the client that ${co.name} is the ONLY professional choice.

## 1. Executive Summary
Write 4-5 substantial paragraphs. Open with a powerful statement about the project. Explain the full scope. Position ${co.name} as the definitive technology integration partner. Reference our BICSI RCDD and NICET certified team, 20+ years of experience, and Fortune 500 track record. Close with a compelling value proposition and the total investment amount from the analysis data.

## 2. Company Qualifications & Experience  
Write detailed paragraphs (NOT just bullets) covering:
- 20+ years as California's premier low-voltage technology integrator
- BICSI Registered Communications Distribution Designer (RCDD) credentials
- NICET certified fire alarm technicians
- Manufacturer certifications (Axis, Genetec, Lenel, Corning, CommScope, Panduit)
- Project portfolio: Fortune 500 headquarters, hospitals, government facilities, K-12 and higher education, data centers
- Safety program: OSHA 30-hour certified supervisors, zero lost-time incidents, EMR rating below 1.0
- Insurance: $5M general liability, full workers compensation, auto liability, professional liability
- Bonding capacity: $10M per project performance and payment bonds
- Quality Management: ISO 9001-aligned quality system with documented inspection checkpoints

## 3. Detailed Scope of Work
Create a subsection (### heading) for ONLY the selected disciplines: ${disciplines}. Do NOT include sections for any other disciplines — if a discipline is not listed here, it is not in scope and must not appear anywhere in the proposal. Under each selected discipline, provide:
- Detailed description of what will be installed
- EXACT material quantities from the analysis data (e.g., "Install 200 Cat 6A data outlets")
- Installation standards that will be followed
- Testing and certification procedures

## 4. Technical Approach & Methodology
Write detailed paragraphs for EACH phase:
### Pre-Construction Planning
- Dedicated project manager assignment, site survey, coordination meetings, submittal process (shop drawings, product data, samples), material procurement and staging

### Rough-In Installation
- Pathway installation (cable tray, J-hooks, conduit, innerduct), fire stopping per ASTM E814, backing boards, equipment room build-out, cable pulling per BICSI guidelines (max 25 lbf tension)

### Trim-Out & Termination
- Device installation, cable termination per TIA-568 standards, labeling per TIA-606-C, patch cord installation, rack dressing and cable management

### Testing & Commissioning
- Category cable certification using Fluke DSX-8000, fiber certification using OTDR, system programming and configuration, integration testing, performance verification

### Project Closeout
- As-built documentation (CAD and PDF), O&M manuals, warranty registration with manufacturers, staff training (minimum 4 hours), 30-day post-installation support period

## 5. Project Timeline & Milestones  
Provide a realistic phased schedule with estimated durations:
- Phase 1: Mobilization, submittals, procurement (Weeks 1-2)
- Phase 2: Rough-in infrastructure (Weeks 3-6)
- Phase 3: Device installation & termination (Weeks 7-10)
- Phase 4: Programming, testing, commissioning (Weeks 11-12)
- Phase 5: Training, documentation, closeout (Week 13-14)
Adjust the timeline based on project complexity from the analysis data.

## 6. Total Project Investment
**SKIP THIS SECTION ENTIRELY. Do NOT write any financial tables, cost summaries, pricing breakdowns, sell prices, material costs, labor costs, subtotals, line items, contingency lines, category totals, or any per-system pricing. Do NOT create any investment summary table. Write ONLY this exact sentence:** "Please refer to the Total Project Investment on the following page."

The Total Project Investment box (a single grand-total figure — no breakdown) will be inserted separately on the next page. The proposal exposes ONE dollar amount only. You must NOT attempt to create any pricing content whatsoever.

## 7. Terms & Conditions
Write comprehensive professional terms:
- Payment: Net 30 from invoice date, progress billing monthly for projects exceeding $50,000
- Change orders: Written authorization required, pricing per unit rates in this proposal or T&M at standard rates
- Warranty: One (1) year comprehensive parts and labor warranty, manufacturer warranties assigned to owner (typically 10-25 years on cable plant)
- Insurance: $5M general liability, workers compensation per California requirements, commercial auto liability, umbrella coverage
- Bonding: Performance and payment bonds available upon request (cost not included unless specified)
- Exclusions: ${(() => { const excl = (state.exclusions || []).filter(e => e.type === 'exclusion'); return excl.length > 0 ? excl.map(e => e.text).join('; ') : 'Electrical power to equipment, HVAC for equipment rooms, architectural modifications, fire alarm monitoring service, permits (unless noted)'; })()}
- Assumptions: ${(() => { const assm = (state.exclusions || []).filter(e => e.type === 'assumption'); return assm.length > 0 ? assm.map(e => e.text).join('; ') : 'Normal working hours, adequate site access, power available at equipment locations'; })()}
- Prevailing wage: If applicable, all labor rates comply with DIR determinations
- Force majeure: Neither party liable for delays beyond reasonable control

DO NOT write a "Proposal Validity" or "Right to Withdraw" or "AI-Assisted Proposal" paragraph here. Those are rendered downstream by the system as a separate dedicated legal section before the signature block — duplicating them in this section would create conflicting language. Skip the validity period entirely; the system inserts it.

## 8. Why Choose 3D Technology Services, Inc.
Write a compelling closing (3-4 paragraphs) covering:
- Single-source accountability from design through ongoing support
- Dedicated project manager and superintendent for every project  
- 24/7/365 emergency service and support
- Comprehensive post-installation training (we don't just install and leave)
- Technology refresh planning and future-proof infrastructure design
- Four office locations: Rancho Cordova CA (HQ), Livermore CA, Sparks NV, and McCall ID — serving California, Nevada, Idaho, and nationwide transit/railroad
- Client references available upon request
- "When you choose ${co.name}, you're choosing a partner, not just a contractor"

OUTPUT FORMAT: Use markdown headers (## for main sections, ### for subsections). Write multiple paragraphs per section — this is NOT a template, it's a real proposal. Every sentence should demonstrate deep expertise and instill absolute confidence. The total document should be 8-12 pages when formatted.`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 32768,
      },
      _model: 'gemini-3.1-pro-preview',
      _brainSlot: 17,
    };

    progressCallback(15, 'AI is drafting your Fortune 500 proposal…');

    let response;
    try {
      response = await fetchWithRetry(GEMINI_CONFIG.endpoint, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(requestBody),
        _timeout: 300000, // 5 minutes for Pro model
        _apiKeyRotator: () => GEMINI_CONFIG.rotateKey(),
      }, 3);
      // Check response INSIDE try block so fallback can fire on 400/404/etc.
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Primary model API error: ${response.status} — ${errText.substring(0, 200)}`);
      }
    } catch (primaryErr) {
      // Fallback to Flash model if Pro fails (network error, timeout, OR bad status)
      console.warn('[ProposalGen] Pro model failed, falling back to Flash:', primaryErr.message);
      progressCallback(15, 'Retrying with alternate AI model…');
      requestBody._model = 'gemini-2.5-flash';
      requestBody._brainSlot = 0;
      try {
        response = await fetchWithRetry(GEMINI_CONFIG.endpoint, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(requestBody),
          _timeout: 180000,
          _apiKeyRotator: () => GEMINI_CONFIG.rotateKey(),
        }, 3);
        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          throw new Error(`Flash model API error: ${response.status} — ${errText.substring(0, 200)}`);
        }
      } catch (flashErr) {
        // Both models failed — try one more time with base config model
        console.warn('[ProposalGen] Flash also failed, final attempt with default model:', flashErr.message);
        progressCallback(15, 'Final retry with default model…');
        requestBody._model = GEMINI_CONFIG.model || 'gemini-2.5-flash';
        requestBody._brainSlot = 0;
        response = await fetchWithRetry(GEMINI_CONFIG.endpoint, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(requestBody),
          _timeout: 180000,
          _apiKeyRotator: () => GEMINI_CONFIG.rotateKey(),
        }, 3);
        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          throw new Error(`All AI models failed. Last error: ${response.status} — ${errText.substring(0, 200)}`);
        }
      }
    }

    // ── Read response (SSE streaming or JSON) ──
    const contentType = response.headers.get('content-type') || '';
    let proposalText = '';

    if (contentType.includes('text/event-stream')) {
      // Streaming SSE response — read chunks
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
            try {
              const chunk = JSON.parse(jsonStr);
              const chunkParts = chunk?.candidates?.[0]?.content?.parts || [];
              for (const p of chunkParts) {
                if (p.text && !p.thought) proposalText += p.text;
              }
            } catch (e) {
              // Skip malformed chunks
            }
          }
        }
      }
      // AUDIT FIX M2: Process any residual buffer content after stream ends
      // SSE streams may not end with \n, leaving the last data: line in the buffer
      if (buffer && buffer.startsWith('data: ')) {
        const jsonStr = buffer.slice(6).trim();
        if (jsonStr && jsonStr !== '[DONE]') {
          try {
            const chunk = JSON.parse(jsonStr);
            const chunkParts = chunk?.candidates?.[0]?.content?.parts || [];
            for (const p of chunkParts) {
              if (p.text && !p.thought) proposalText += p.text;
            }
          } catch (e) { /* skip malformed */ }
        }
      }
    } else {
      // Plain JSON response (fallback)
      const data = await response.json();
      const allParts = data?.candidates?.[0]?.content?.parts || [];
      proposalText = allParts.filter(p => p.text && !p.thought).map(p => p.text).join('\n') || '';
    }

    if (!proposalText || proposalText.length < 500) {
      throw new Error('AI returned insufficient proposal content. Please try again.');
    }

    progressCallback(60, 'Building Word document…');
    return proposalText;
  },


  async renderAndDownload(state, progressCallback, _unused) {
    try {

      const proposalText = await this.generateProposal(state, progressCallback);
      progressCallback(70, 'Formatting Word document…');
      this._downloadWordDoc(state, proposalText, progressCallback);
    } catch (err) {
      console.error('[ProposalGen] Error:', err);
      if (typeof spToast === 'function') spToast('Proposal generation failed: ' + err.message, 'error');
      throw err;
    }
  },

  _downloadWordDoc(state, proposalText, progressCallback) {
    const co = this.COMPANY;
    const b = this.BRAND;
    const projName = state.projectName || 'Untitled Project';
    const projLoc = state.projectLocation || 'As Specified';
    const preparedFor = state.preparedFor || projName;
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    // v5.129.8 — 45-day validity to match Proposal Validity; Right to Withdraw clause
    const validUntil = new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000)
      .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const refNum = `3DTSI-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const year = today.getFullYear();
    // v5.129.7 — pre-scrub the AI markdown so even if the model ignores
    // the "do not write Investment Summary" instructions, the section
    // never reaches the rendered proposal. The full Total Project
    // Investment box (single grand total only) is drawn separately by
    // the proposal HTML at the end.
    const scrubbedMd = this._stripPricingSections(proposalText);
    const bodyHtml = this._sanitizeHtml(this._markdownToHtml(scrubbedMd));

    // Build the DETERMINISTIC financial table from BOM data (code, not AI)
    const financialTableHtml = this._buildFinancialTableHtml(state);
    const pricingStrategySummaryHtml = this._buildPricingStrategySummaryHtml(state);
    const grandTotal = this._extractGrandTotal(state);
    const grandTotalDisplay = grandTotal ? this._formatMoney(grandTotal) : null;

    progressCallback(85, 'Creating downloadable document…');

    // ─── Word-native HTML — uses tables + bgcolor (NOT modern CSS) ───
    let wordHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="SmartPlans v3.0">
<title>${this._escText(projName)} — Professional Proposal | ${co.name}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
    <w:BrowserLevel>MicrosoftInternetExplorer4</w:BrowserLevel>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page {
    size: 8.5in 11in;
    margin: 0.7in 0.85in 0.8in 0.85in;
    mso-header-margin: 0.3in;
    mso-footer-margin: 0.4in;
    mso-paper-source: 0;
  }

  @page Section1 { mso-footer: f1; mso-first-footer: f1; mso-title-page: no; }
  div.Section1 { page: Section1; }

  body {
    font-family: Calibri, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.65;
    color: #222;
    margin: 0;
    padding: 0;
  }

  /* Word-compatible page break */
  .page-break { page-break-before: always; }

  /* ── Section Headers ── */
  h2 {
    font-family: Calibri, Arial, sans-serif;
    font-size: 16pt;
    font-weight: bold;
    color: ${b.navy};
    margin-top: 24pt;
    margin-bottom: 8pt;
    padding-bottom: 4pt;
    border-bottom: 3pt solid ${b.teal};
    page-break-after: avoid;
  }

  h3 {
    font-family: Calibri, Arial, sans-serif;
    font-size: 13pt;
    font-weight: bold;
    color: ${b.teal};
    margin-top: 16pt;
    margin-bottom: 6pt;
    page-break-after: avoid;
  }

  h4 {
    font-family: Calibri, Arial, sans-serif;
    font-size: 11pt;
    font-weight: bold;
    color: ${b.navy};
    margin-top: 10pt;
    margin-bottom: 4pt;
  }

  p { margin-top: 0; margin-bottom: 8pt; line-height: 1.65; }
  ul, ol { margin-top: 4pt; margin-bottom: 8pt; }
  li { margin-bottom: 3pt; line-height: 1.5; }
  strong { color: ${b.navy}; }
  em { color: ${b.teal}; }

  /* ── Data Tables ── */
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 8pt 0 14pt 0;
    font-size: 9pt;
    page-break-inside: avoid;
  }
  table.data-table th {
    background: ${b.navy};
    color: white;
    padding: 6pt 8pt;
    text-align: left;
    font-weight: bold;
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 0.5pt;
    border: 1pt solid ${b.navy};
  }
  table.data-table td {
    padding: 5pt 8pt;
    border: 1pt solid ${b.border};
    vertical-align: top;
  }

  /* ── Signature Lines ── */
  .sig-line {
    border-bottom: 1pt solid #333;
    height: 28pt;
    margin-bottom: 3pt;
  }
  .sig-label {
    font-size: 7.5pt;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1pt;
    font-weight: bold;
    margin-bottom: 14pt;
  }

  /* MsoFooter — Word recognizes this class for footer content */
  p.MsoFooter { margin: 0; }
</style>
</head>
<body>

<!-- Word footer — appears on EVERY page in MS Word -->
<div style="mso-element:footer" id="f1">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="border-top:1.5pt solid ${b.teal};padding-top:4pt;text-align:center;">
      <p class="MsoFooter" style="text-align:center;font-size:8.5pt;font-weight:bold;color:${b.navy};text-transform:uppercase;letter-spacing:3pt;font-family:Calibri,Arial,sans-serif;margin:0;">
        3D &nbsp;CONFIDENTIAL &nbsp;&middot;&nbsp; PROPRIETARY
      </p>
    </td></tr>
  </table>
</div>

<!-- Section1 wrapper — binds all content to @page Section1 which includes the footer -->
<div class="Section1">

<!--
═══════════════════════════════════════════════════════════
COVER PAGE — Word-native table layout (renders perfectly)
═══════════════════════════════════════════════════════════
-->

<!-- Top accent bar -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:-0.7in -0.85in 0 -0.85in;width:calc(100% + 1.7in);">
  <tr><td bgcolor="${b.navy}" style="height:8pt;font-size:1pt;">&nbsp;</td></tr>
  <tr><td bgcolor="${b.teal}" style="height:4pt;font-size:1pt;">&nbsp;</td></tr>
</table>

<br>

<!-- Company Name — Bold text branding (no logo image) -->
<p style="font-size:38pt;font-weight:bold;color:${b.gold};font-family:Calibri,Arial,sans-serif;margin-bottom:0;line-height:1.1;">3D</p>
<p style="font-size:12pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:4pt;font-family:Calibri,Arial,sans-serif;">TECHNOLOGY SERVICES, Inc.</p>

<!-- Company Name — Full text -->
<p style="font-size:28pt;font-weight:bold;color:${b.navy};margin-bottom:2pt;margin-top:6pt;font-family:Calibri,Arial,sans-serif;">
  3D Technology Services, Inc.
</p>
<p style="font-size:10pt;color:${b.teal};font-style:italic;letter-spacing:1pt;font-weight:normal;margin-bottom:0;">
  Premier Low-Voltage Technology Integration
</p>

<!-- Gold accent block + Project Proposal label -->
<table cellpadding="0" cellspacing="0" border="0" style="margin:16pt 0 24pt 0;">
  <tr>
    <td bgcolor="${b.gold}" style="width:60pt;height:42pt;">&nbsp;</td>
    <td style="padding-left:0;vertical-align:bottom;">&nbsp;</td>
  </tr>
</table>

<!-- Document Type -->
<p style="font-size:10pt;color:${b.teal};text-transform:uppercase;letter-spacing:5pt;font-weight:bold;margin-bottom:8pt;margin-top:-16pt;">
  Project Proposal
</p>

<!-- Project Name — Bold and prominent -->
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8pt;">
  <tr>
    <td bgcolor="${b.gold}" style="width:5pt;">&nbsp;</td>
    <td style="padding-left:16pt;">
      <span style="font-size:26pt;font-weight:bold;color:${b.navy};font-family:Calibri,Arial,sans-serif;">${this._escText(projName)}</span>
    </td>
  </tr>
</table>
<p style="font-size:13pt;color:${b.gray};margin-left:21pt;margin-bottom:0;">${this._escText(projLoc)}</p>

<br><br><br>

<!-- Info Grid — Two-column table -->
<table width="100%" cellpadding="8" cellspacing="0" border="0" style="margin-top:20pt;">
  <tr valign="top">
    <td width="48%" style="padding-right:24pt;">
      <p style="font-size:7.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Prepared For</p>
      <p style="font-size:11pt;color:#222;font-weight:500;margin-bottom:14pt;">${this._escText(preparedFor)}</p>

      <p style="font-size:7.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Project Name</p>
      <p style="font-size:11pt;color:#222;font-weight:500;margin-bottom:14pt;">${this._escText(projName)}</p>

      <p style="font-size:7.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Date Submitted</p>
      <p style="font-size:11pt;color:#222;font-weight:500;margin-bottom:14pt;">${dateStr}</p>

      <p style="font-size:7.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Valid Until</p>
      <p style="font-size:11pt;color:#222;font-weight:500;margin-bottom:0;">${validUntil}</p>
    </td>
    <td width="4%" style="border-left:1pt solid ${b.border};">&nbsp;</td>
    <td width="48%" style="padding-left:24pt;">
      <p style="font-size:7.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Prepared By</p>
      <p style="font-size:11pt;color:#222;font-weight:bold;margin-bottom:1pt;">${co.consultant}</p>
      <p style="font-size:9.5pt;color:${b.gray};margin-bottom:14pt;">${co.title}</p>

      <p style="font-size:7.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Direct Contact</p>
      <p style="font-size:11pt;color:#222;margin-bottom:1pt;">${co.email}</p>
      <p style="font-size:11pt;color:#222;margin-bottom:14pt;">${co.phone}</p>

      <p style="font-size:7.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Corporate Office</p>
      <p style="font-size:11pt;color:#222;margin-bottom:1pt;">${co.address}</p>
      <p style="font-size:11pt;color:#222;margin-bottom:1pt;">${co.cityStateZip}</p>
      <p style="font-size:11pt;color:#222;margin-bottom:1pt;">${co.website}</p>
      <p style="font-size:11pt;color:#222;margin-bottom:14pt;">${co.mainPhone}</p>

      <p style="font-size:7.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Reference No.</p>
      <p style="font-size:11pt;color:#222;font-weight:bold;margin-bottom:0;">${refNum}</p>
    </td>
  </tr>
</table>

<br><br><br><br><br>

<!-- Bottom confidential bar -->
<table width="100%" cellpadding="10" cellspacing="0" border="0" style="margin:0 -0.85in;width:calc(100% + 1.7in);">
  <tr><td bgcolor="${b.navy}" align="center" style="font-size:7.5pt;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2pt;font-family:Calibri,Arial,sans-serif;">
    <span style="color:${b.gold};font-weight:bold;">${co.name}</span>
    &nbsp;&nbsp;&middot;&nbsp;&nbsp;CONFIDENTIAL &amp; PROPRIETARY&nbsp;&nbsp;&middot;&nbsp;&nbsp;${co.website}
  </td></tr>
</table>

<!-- Confidential bar before page break -->
${this._confBar(true)}

<!--
═══════════════════════════════════════════════════════════
TABLE OF CONTENTS
═══════════════════════════════════════════════════════════
-->

<p style="font-size:22pt;font-weight:bold;color:${b.navy};margin-bottom:6pt;font-family:Calibri,Arial,sans-serif;">Table of Contents</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18pt;">
  <tr><td bgcolor="${b.teal}" style="height:3pt;font-size:1pt;">&nbsp;</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td style="padding:10pt 0;border-bottom:1pt solid ${b.border};"><span style="font-size:13pt;font-weight:bold;color:${b.teal};display:inline-block;width:36pt;">01</span> <span style="font-size:11pt;color:#222;">Executive Summary</span></td></tr>
  <tr><td style="padding:10pt 0;border-bottom:1pt solid ${b.border};"><span style="font-size:13pt;font-weight:bold;color:${b.teal};display:inline-block;width:36pt;">02</span> <span style="font-size:11pt;color:#222;">Company Qualifications &amp; Experience</span></td></tr>
  <tr><td style="padding:10pt 0;border-bottom:1pt solid ${b.border};"><span style="font-size:13pt;font-weight:bold;color:${b.teal};display:inline-block;width:36pt;">03</span> <span style="font-size:11pt;color:#222;">Detailed Scope of Work</span></td></tr>
  <tr><td style="padding:10pt 0;border-bottom:1pt solid ${b.border};"><span style="font-size:13pt;font-weight:bold;color:${b.teal};display:inline-block;width:36pt;">04</span> <span style="font-size:11pt;color:#222;">Technical Approach &amp; Methodology</span></td></tr>
  <tr><td style="padding:10pt 0;border-bottom:1pt solid ${b.border};"><span style="font-size:13pt;font-weight:bold;color:${b.teal};display:inline-block;width:36pt;">05</span> <span style="font-size:11pt;color:#222;">Project Timeline &amp; Milestones</span></td></tr>
  <tr><td style="padding:10pt 0;border-bottom:1pt solid ${b.border};"><span style="font-size:13pt;font-weight:bold;color:${b.teal};display:inline-block;width:36pt;">06</span> <span style="font-size:11pt;color:#222;">Total Project Investment</span></td></tr>
  <tr><td style="padding:10pt 0;border-bottom:1pt solid ${b.border};"><span style="font-size:13pt;font-weight:bold;color:${b.teal};display:inline-block;width:36pt;">07</span> <span style="font-size:11pt;color:#222;">Terms &amp; Conditions</span></td></tr>
  <tr><td style="padding:10pt 0;border-bottom:1pt solid ${b.border};"><span style="font-size:13pt;font-weight:bold;color:${b.teal};display:inline-block;width:36pt;">08</span> <span style="font-size:11pt;color:#222;">Why Choose 3D Technology Services, Inc.</span></td></tr>
  <tr><td style="padding:10pt 0;border-bottom:1pt solid ${b.border};"><span style="font-size:13pt;font-weight:bold;color:${b.teal};display:inline-block;width:36pt;">09</span> <span style="font-size:11pt;color:#222;">Acceptance &amp; Authorization</span></td></tr>
</table>

<!-- Confidential bar before page break -->
${this._confBar(true)}

<!--
═══════════════════════════════════════════════════════════
PROPOSAL BODY — AI-Generated Content
═══════════════════════════════════════════════════════════
-->

${bodyHtml}

<!-- DETERMINISTIC FINANCIAL TABLE — Built from BOM data in code, NOT AI -->
${financialTableHtml}

<!-- PRICING STRATEGY SUMMARY — Confidence & contingency breakdown (no markup % revealed) -->
${pricingStrategySummaryHtml}

${grandTotalDisplay ? `
<!-- Confidential bar before page break -->
${this._confBar(true)}

<!--
═══════════════════════════════════════════════════════════
TOTAL INVESTMENT — Hardcoded from analysis (guaranteed to appear)
═══════════════════════════════════════════════════════════
-->

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24pt;">
  <tr><td bgcolor="${b.teal}" style="height:3pt;font-size:1pt;">&nbsp;</td></tr>
</table>

<table width="100%" cellpadding="20" cellspacing="0" border="0">
  <tr>
    <td bgcolor="${b.navy}" style="text-align:center;border:2pt solid ${b.gold};">
      <p style="font-size:10pt;color:${b.gold};text-transform:uppercase;letter-spacing:3pt;font-weight:bold;margin-bottom:8pt;font-family:Calibri,Arial,sans-serif;">Total Project Investment</p>
      <p style="font-size:32pt;font-weight:bold;color:white;margin-bottom:4pt;font-family:Calibri,Arial,sans-serif;">${grandTotalDisplay}</p>
      <p style="font-size:9pt;color:rgba(255,255,255,0.7);margin-bottom:0;font-family:Calibri,Arial,sans-serif;">Includes all materials, labor, equipment, and contingency as detailed in this proposal</p>
    </td>
  </tr>
</table>

<p style="font-size:9pt;color:${b.gray};margin-top:8pt;text-align:center;">
  All prices subject to material availability at time of contract execution.
</p>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16pt;">
  <tr><td bgcolor="${b.teal}" style="height:3pt;font-size:1pt;">&nbsp;</td></tr>
</table>
` : ''}

<!-- Confidential bar before page break -->
${this._confBar(true)}

<!--
═══════════════════════════════════════════════════════════
PROPOSAL VALIDITY; RIGHT TO WITHDRAW (v5.129.8 — required legal section)
═══════════════════════════════════════════════════════════
-->
${this._validityClauseHtml()}

<!--
═══════════════════════════════════════════════════════════
ACCEPTANCE & SIGNATURE BLOCK
═══════════════════════════════════════════════════════════
-->

<h2>Acceptance &amp; Authorization</h2>

<p>By executing this document below, the authorized representative of the Client acknowledges receipt of this proposal subject to the terms set forth above, including the Proposal Validity; Right to Withdraw clause. No binding contract shall arise unless and until a definitive written agreement is executed by duly authorized representatives of both ${co.name} and the Client.</p>

<br>

<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr valign="top">
    <!-- LEFT: 3DTSI -->
    <td width="47%">
      <!-- Section header with gold underline -->
      <p style="font-size:10pt;color:${b.teal};font-weight:bold;text-transform:uppercase;letter-spacing:2pt;margin-bottom:4pt;">${co.name}</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${b.gold}" style="height:2pt;font-size:1pt;">&nbsp;</td></tr></table>
      <br><br>

      <div class="sig-line"></div>
      <div class="sig-label">Authorized Signature</div>

      <p style="font-size:11pt;font-weight:bold;color:#222;margin-bottom:1pt;">${co.consultant}</p>
      <p style="font-size:9pt;color:${b.gray};margin-bottom:1pt;">${co.title}</p>
      <p style="font-size:9pt;color:${b.gray};margin-bottom:1pt;">${co.email}</p>
      <p style="font-size:9pt;color:${b.gray};margin-bottom:14pt;">${co.phone}</p>

      <div class="sig-line" style="width:65%;"></div>
      <div class="sig-label">Date</div>
    </td>

    <td width="6%">&nbsp;</td>

    <!-- RIGHT: Client -->
    <td width="47%">
      <p style="font-size:10pt;color:${b.teal};font-weight:bold;text-transform:uppercase;letter-spacing:2pt;margin-bottom:4pt;">Client Acceptance</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${b.gold}" style="height:2pt;font-size:1pt;">&nbsp;</td></tr></table>
      <br><br>

      <div class="sig-line"></div>
      <div class="sig-label">Authorized Signature</div>

      <div class="sig-line"></div>
      <div class="sig-label">Printed Name</div>

      <div class="sig-line"></div>
      <div class="sig-label">Title / Position</div>

      <div class="sig-line"></div>
      <div class="sig-label">Company / Organization</div>

      <div class="sig-line" style="width:65%;"></div>
      <div class="sig-label">Date</div>
    </td>
  </tr>
</table>

<br><br><br>

<!-- Footer -->
<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td bgcolor="${b.teal}" style="height:2pt;font-size:1pt;">&nbsp;</td></tr>
</table>
<p style="text-align:center;font-size:8.5pt;color:${b.gray};margin-top:8pt;">
  <b style="color:${b.teal};">${co.name}</b><br>
  ${co.address}, ${co.cityStateZip} &nbsp;|&nbsp; ${co.mainPhone} &nbsp;|&nbsp; ${co.website}<br>
  ${co.consultant}, ${co.title} &nbsp;|&nbsp; ${co.email} &nbsp;|&nbsp; ${co.phone}<br>
  <span style="font-size:7pt;color:#aaa;">&copy; ${year} ${co.name}. All rights reserved. This document contains confidential and proprietary information.</span>
</p>

<!-- Final confidential bar -->
${this._confBar()}

</div><!-- /Section1 -->
</body>
</html>`;

    // Cache for PDF re-download without re-generating
    this._lastFullProposalHTML = wordHtml;

    // v5.129.11 \u2014 ZIP EVERYTHING capture mode. Skip the .doc download here;
    // zipEverything() pulls the cached HTML and packages it itself. Without
    // this guard the user sees an unwanted .doc download every time they
    // click the green ZIP button.
    if (typeof window !== 'undefined' && window._zipCaptureMode) {
      progressCallback(100, 'Proposal cached for ZIP bundle');
      return;
    }

    try {
      const blob = new Blob(['\ufeff' + wordHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = projName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
      a.download = `3DTSI_Proposal_${safeName}_${today.toISOString().split('T')[0]}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Delay URL revocation to ensure download starts
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      progressCallback(100, 'Proposal downloaded!');
      if (typeof spToast === 'function') spToast('✓ Professional proposal downloaded — open in Microsoft Word');
    } catch (downloadErr) {
      console.error('[ProposalGen] Download error:', downloadErr);
      // Fallback: open in new tab if blob download fails
      try {
        const fallbackBlob = new Blob(['\ufeff' + wordHtml], { type: 'text/html' });
        const fallbackUrl = URL.createObjectURL(fallbackBlob);
        window.open(fallbackUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(fallbackUrl), 10000);
        progressCallback(100, 'Proposal opened in new tab (download failed)');
        if (typeof spToast === 'function') spToast('Proposal opened in new tab — use File > Save As in your browser', 'warning');
      } catch (fallbackErr) {
        console.error('[ProposalGen] Fallback also failed:', fallbackErr);
        throw new Error('Could not download proposal. Try a different browser or reduce document size.');
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // PROPOSAL VALIDITY CLAUSE (v5.129.8)
  // Required legal disclosure rendered in BOTH the Full and Executive
  // proposals, immediately before the acceptance/signature block. Sets
  // 45-day validity, AI-assisted disclosure, right to withdraw,
  // not-a-binding-offer, and California governing law.
  // ═══════════════════════════════════════════════════════════════
  _validityClauseHtml() {
    const b = this.BRAND;
    return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18pt;margin-bottom:6pt;">
  <tr>
    <td bgcolor="${b.navy}" style="border-bottom:3pt solid ${b.gold};padding:8pt 14pt;">
      <span style="font-size:11pt;color:${b.gold};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;font-family:Calibri,Arial,sans-serif;">Proposal Validity; Right to Withdraw <span style="font-size:9pt;color:rgba(255,255,255,0.85);text-transform:none;letter-spacing:0;font-weight:normal;">(AI-Assisted Proposal)</span></span>
    </td>
  </tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18pt;">
  <tr>
    <td style="border:1pt solid ${b.border};padding:14pt 16pt;background:#FAFAFA;">
      <p style="font-size:9.5pt;color:#222;line-height:1.55;margin:0 0 8pt 0;text-align:justify;font-family:Calibri,Arial,sans-serif;">
        This proposal is provided by 3D Technology Services, Inc. (&ldquo;3D&rdquo;) for evaluation purposes only and shall remain valid for a period of forty-five (45) calendar days from the date of issuance, unless earlier withdrawn as provided herein. This proposal has been prepared, in whole or in part, using automated and artificial intelligence&ndash;assisted processes and is subject to internal review and verification.
      </p>
      <p style="font-size:9.5pt;color:#222;line-height:1.55;margin:0 0 8pt 0;text-align:justify;font-family:Calibri,Arial,sans-serif;">
        3D reserves the right, in its sole discretion, to withdraw, modify, or cancel this proposal, in whole or in part, at any time prior to the execution of a definitive written agreement by both parties, including, without limitation, in the event of any errors, omissions, inaccuracies, or inconsistencies identified in the proposal.
      </p>
      <p style="font-size:9.5pt;color:#222;line-height:1.55;margin:0 0 8pt 0;text-align:justify;font-family:Calibri,Arial,sans-serif;">
        This proposal does not constitute a binding agreement or offer capable of acceptance. No contract, obligation, or liability shall arise unless and until a written agreement is executed by duly authorized representatives of both parties.
      </p>
      <p style="font-size:9.5pt;color:#222;line-height:1.55;margin:0;text-align:justify;font-family:Calibri,Arial,sans-serif;">
        This provision shall be governed by and construed in accordance with the laws of the State of California.
      </p>
    </td>
  </tr>
</table>
`;
  },

  // ═══════════════════════════════════════════════════════════════
  // PRICING-SECTION SCRUBBER (v5.129.7)
  // Belt-and-suspenders defense: even with explicit prompt instructions
  // not to write an "Investment Summary" or pricing breakdown, the
  // model occasionally ignores them. Strip any heading that looks like
  // pricing-section content from the markdown BEFORE it renders, so a
  // misbehaving model can't leak per-category prices to the client.
  //
  // Removes a heading line + everything following until the next H2/H3
  // heading or end of document, when the heading text matches:
  //   "Investment Summary", "Pricing Summary", "Cost Breakdown",
  //   "Cost Summary", "Financial Summary", "Pricing Strategy",
  //   "Pricing Strategy Summary", "Pricing Breakdown",
  //   "Investment Breakdown".
  // The Total Project Investment box (single grand total only) is
  // rendered separately by the proposal HTML — preserving the user's
  // rule that the proposal exposes ONE dollar amount only.
  // ═══════════════════════════════════════════════════════════════
  _stripPricingSections(md) {
    if (!md || typeof md !== 'string') return md || '';
    const headingRe = /^\s*#{1,4}\s*(?:\d+\.\s*)?(?:investment\s+(?:summary|breakdown)|pricing\s+(?:summary|strategy(?:\s+summary)?|breakdown)|cost\s+(?:breakdown|summary)|financial\s+(?:summary|breakdown))\s*:?\s*$/im;
    let stripped = md;
    let safety = 0;
    while (safety++ < 6) {
      const m = stripped.match(headingRe);
      if (!m) break;
      const start = m.index;
      // Find the next H2/H3 heading after this section
      const tail = stripped.slice(start + m[0].length);
      const nextHead = tail.search(/^\s*#{1,3}\s+\S/m);
      const cutTo = nextHead >= 0 ? start + m[0].length + nextHead : stripped.length;
      stripped = stripped.slice(0, start) + stripped.slice(cutTo);
    }
    return stripped;
  },

  _markdownToHtml(md) {
    if (!md) return '';

    // ── Step 1: Extract and convert tables BEFORE escaping ──
    // This prevents _esc from destroying pipe characters
    const tablePlaceholders = [];
    let processed = md.replace(/((?:^\|.+\|$\n?){2,})/gm, (tableBlock) => {
      const rows = tableBlock.trim().split('\n').filter(r => r.trim());
      if (rows.length < 2) return tableBlock;

      let tHtml = '<table width="100%" cellpadding="6" cellspacing="0" border="0" style="border-collapse:collapse;margin:10pt 0 16pt 0;font-size:9.5pt;">';
      let rowNum = 0;
      let isFirstDataRow = true;

      rows.forEach((row, idx) => {
        const cells = row.split('|').filter(c => c.trim() !== '');

        // Skip separator rows (---|---|---)
        if (cells.every(c => /^[\s\-:]+$/.test(c))) return;

        if (idx === 0) {
          // Header row
          tHtml += '<tr>';
          cells.forEach(cell => {
            tHtml += `<td bgcolor="#2B828B" style="color:#FFFFFF;padding:7pt 10pt;font-size:8.5pt;text-transform:uppercase;font-weight:bold;letter-spacing:0.5pt;border:1pt solid #2B828B;"><font color="#FFFFFF"><b>${this._escText(cell.trim())}</b></font></td>`;
          });
          tHtml += '</tr>';
        } else {
          rowNum++;
          const cellValues = cells.map(c => c.trim());
          const cellText = cellValues.join(' ').toLowerCase();
          const isTotal = cellText.includes('total') || cellText.includes('contingency') || cellText.includes('overhead') || cellText.includes('markup');
          const isSubtotal = (cellText.includes('subtotal') || cellText.includes('contingency') || cellText.includes('overhead') || cellText.includes('markup')) && !cellText.includes('grand');

          if (isTotal) {
            // Grand total / subtotal rows — navy background
            tHtml += '<tr>';
            cellValues.forEach(cell => {
              const isMoney = /\$/.test(cell);
              const align = isMoney ? 'text-align:right;' : '';
              tHtml += `<td bgcolor="${isSubtotal ? '#3B97A1' : '#2B828B'}" style="color:#FFFFFF;padding:8pt 10pt;font-weight:bold;font-size:${isSubtotal ? '9.5pt' : '11pt'};${align}border:1pt solid #2B828B;"><font color="#FFFFFF"><b>${this._escText(cell)}</b></font></td>`;
            });
            tHtml += '</tr>';
          } else {
            const bgColor = rowNum % 2 === 0 ? '#F4F6F8' : '#FFFFFF';
            tHtml += '<tr>';
            cellValues.forEach(cell => {
              const isMoney = /\$/.test(cell) || /^\d+%$/.test(cell);
              const align = isMoney ? 'text-align:right;' : '';
              tHtml += `<td bgcolor="${bgColor}" style="padding:6pt 10pt;color:#222;${align}border:1pt solid #E2E8F0;"><font color="#222">${this._escText(cell)}</font></td>`;
            });
            tHtml += '</tr>';
          }
        }
      });
      tHtml += '</table>';

      const placeholder = `%%TABLE_${tablePlaceholders.length}%%`;
      tablePlaceholders.push(tHtml);
      return placeholder;
    });

    // ── Step 2: Escape the remaining text (tables already extracted) ──
    let html = this._escText(processed);

    // ── Step 3: Restore tables ──
    tablePlaceholders.forEach((table, i) => {
      html = html.replace(`%%TABLE_${i}%%`, table);
    });

    // ── Step 4: Process markdown formatting ──

    // Horizontal rules
    html = html.replace(/^-{3,}$/gm, '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:14pt 0;"><tr><td bgcolor="#D1D5DB" style="height:1pt;font-size:1pt;">&nbsp;</td></tr></table>');

    // Headers — each ## section starts on a new page
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, `${this._confBar(true)}<h2>$1</h2>`);
    html = html.replace(/^# (.+)$/gm, '<h2 style="font-size:20pt;">$1</h2>');

    // Bold / Italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<b style="color:#2B828B;">$1</b>');
    html = html.replace(/\*(.+?)\*/g, '<i>$1</i>');

    // Lists — process line by line to avoid catastrophic backtracking on long documents
    const lines = html.split('\n');
    const result = [];
    let inList = false;
    let listType = null; // 'ul' or 'ol'

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const ulMatch = line.match(/^(\s*)[-*] (.+)$/);
      const olMatch = line.match(/^\d+\. (.+)$/);

      if (ulMatch) {
        if (!inList || listType !== 'ul') {
          if (inList) result.push(listType === 'ol' ? '</ol>' : '</ul>');
          result.push('<ul style="margin-left:18pt;margin-bottom:8pt;">');
          inList = true;
          listType = 'ul';
        }
        result.push(`<li style="margin-bottom:3pt;">${ulMatch[2]}</li>`);
      } else if (olMatch) {
        if (!inList || listType !== 'ol') {
          if (inList) result.push(listType === 'ol' ? '</ol>' : '</ul>');
          result.push('<ol style="margin-left:18pt;margin-bottom:8pt;">');
          inList = true;
          listType = 'ol';
        }
        result.push(`<li style="margin-bottom:3pt;">${olMatch[1]}</li>`);
      } else {
        if (inList) {
          result.push(listType === 'ol' ? '</ol>' : '</ul>');
          inList = false;
          listType = null;
        }
        result.push(line);
      }
    }
    if (inList) result.push(listType === 'ol' ? '</ol>' : '</ul>');

    html = result.join('\n');

    // Paragraphs — wrap non-tag lines in <p> tags
    html = html.replace(/\n{2,}/g, '</p>\n<p style="margin-bottom:8pt;">');
    if (!html.startsWith('<')) html = '<p style="margin-bottom:8pt;">' + html;
    if (!html.endsWith('>')) html += '</p>';

    return html;
  },

  // ─── Sanitize HTML to prevent XSS from AI-generated content ───
  _sanitizeHtml(html) {
    if (!html) return '';
    // Strip ALL <style> tags and their content
    html = html.replace(/<style[\s\S]*?<\/style>/gi, '');
    // Strip dangerous tags (script, iframe, object, embed, form, meta, base, link)
    html = html.replace(/<\s*\/?\s*(script|iframe|object|embed|form|meta|base|link)\b[^>]*>/gi, '');
    // Strip on* event handler attributes (handles whitespace between "on" and event name)
    html = html.replace(/\s+on\s*\w+\s*=/gi, ' data-removed=');
    // Block data: URIs in src and href attributes
    html = html.replace(/(src|href)\s*=\s*["']?\s*data:/gi, '$1=_blocked:');
    // Strip javascript: URLs in href and src attributes
    html = html.replace(/(href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '$1=""');
    // Also catch unquoted javascript: URLs
    html = html.replace(/(href|src)\s*=\s*javascript:[^\s>]*/gi, '$1=""');
    return html;
  },

  _escText(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  // Inline CONFIDENTIAL bar — rendered visually in the document
  // Uses page-break-after so the bar stays at the BOTTOM of the page
  // (if placed before a page-break-before div, Word pushes it to the next page)
  _confBar(includePageBreak = false) {
    const b = this.BRAND;
    return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14pt;${includePageBreak ? 'page-break-after:always;' : ''}">
  <tr><td style="border-top:1.5pt solid ${b.teal};padding-top:4pt;text-align:center;">
    <p style="text-align:center;font-size:7.5pt;font-weight:bold;color:${b.navy};text-transform:uppercase;letter-spacing:3pt;font-family:Calibri,Arial,sans-serif;margin:0;">
      3D &nbsp;CONFIDENTIAL &nbsp;&middot;&nbsp; PROPRIETARY
    </p>
  </td></tr>
</table>`;
  },


  // ═══════════════════════════════════════════════════════════════
  // DETERMINISTIC FINANCIAL TABLE — Built from BOM data, never AI
  // This is the SINGLE SOURCE OF TRUTH for all proposal pricing
  // ═══════════════════════════════════════════════════════════════
  _buildFinancialTableHtml(state) {
   try {
    const b = this.BRAND;
    const analysis = state.aiAnalysis || '';
    // AUDIT FIX M1: Guard against NaN/undefined — fmt("") or fmt(undefined) would produce "$NaN"
    const fmt = (n) => { const v = Number(n); return '$' + (isNaN(v) ? '0.00' : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })); };

    // Extract BOM from analysis (same function used by export-engine)
    let bom = null;
    try {
      if (typeof SmartPlansExport !== 'undefined' && SmartPlansExport._extractBOMFromAnalysis) {
        bom = SmartPlansExport._extractBOMFromAnalysis(analysis);
        // Apply ALL user BOM edits (price overrides, deletions, manual items)
        if (bom && typeof SmartPlansExport._applyUserBOMEdits === 'function') {
          bom = SmartPlansExport._applyUserBOMEdits(bom, state);
        }
        // Apply transit station-grade pricing adjustments (UPS battery, trench floors, travel cap)
        if (bom && typeof SmartPlansExport._applyTransitAdjustments === 'function') {
          SmartPlansExport._applyTransitAdjustments(bom, state);
        }
        // Filter out categories for unselected disciplines
        if (bom && typeof SmartPlansExport._filterBOMByDisciplines === 'function') {
          bom = SmartPlansExport._filterBOMByDisciplines(bom, state.disciplines);
        }
      }
    } catch (e) { console.warn('[ProposalGen] BOM extraction failed:', e); }

    if (!bom || !bom.categories || bom.categories.length === 0) {
      return ''; // No BOM data — skip financial table
    }

    // Use the SAME breakdown as export-engine.js — single source of truth
    let bd = null;
    try {
      bd = (typeof SmartPlansExport._computeFullBreakdown === 'function')
          ? SmartPlansExport._computeFullBreakdown(state, bom)
          : null;
    } catch (bdErr) {
      console.error('[ProposalGen] _computeFullBreakdown threw:', bdErr);
    }

    if (!bd) {
      console.warn('[ProposalGen] _computeFullBreakdown not available — skipping financial table');
      return '';
    }

    // Cache so all downstream consumers use the same number
    state._bomGrandTotal = bd.grandTotal;
    state._bomBreakdown = bd;

    // v5.129.7 — proposals show ONLY the final grand total. No category
    // line items, no subtotal, no contingency line, no markup exposure,
    // no per-system breakdown. The downstream "Total Project Investment"
    // box (built directly into the proposal HTML at line ~640 for the
    // full proposal and line ~1614 for the executive) reads from the
    // cached state._bomGrandTotal we just set, so returning '' here
    // suppresses the breakdown without breaking the total display.
    return '';
   } catch (finErr) {
    console.error('[ProposalGen] _buildFinancialTableHtml error:', finErr);
    // Return a graceful fallback instead of crashing the entire proposal
    const fallbackTotal = state._bomGrandTotal;
    if (fallbackTotal) {
      return `<p style="font-size:13pt;font-weight:bold;color:#222;font-family:Calibri,Arial,sans-serif;">Total Investment: $${Number(fallbackTotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>`;
    }
    return '';
   }
  },

  // ═══════════════════════════════════════════════════════════════
  // PRICING STRATEGY SUMMARY — DISABLED in v5.129.7
  // The previous version exposed per-confidence-level subtotals
  // ("$ for high confidence categories", etc.) which gives clients
  // a window into our markup chain. The proposal must show ONE
  // dollar amount only — the final Total Project Investment.
  // ═══════════════════════════════════════════════════════════════
  _buildPricingStrategySummaryHtml(state) {
    return '';
    /* eslint-disable no-unreachable */
    // Legacy code retained below in case we ever want to surface
    // contingency methodology to the estimator (NOT to the client).
    if (!state.bidStrategy || !state.bidStrategy.applied) return '';

    const b = this.BRAND;
    // AUDIT FIX M1: Guard against NaN/undefined — fmt("") or fmt(undefined) would produce "$NaN"
    const fmt = (n) => { const v = Number(n); return '$' + (isNaN(v) ? '0.00' : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })); };

    let result = null;
    try {
      if (typeof SmartPlansExport !== 'undefined' && SmartPlansExport.applyBidStrategy) {
        result = SmartPlansExport.applyBidStrategy(state);
      }
    } catch (e) { console.warn('[ProposalGen] Bid strategy extraction failed:', e); }

    if (!result || !result.categories || result.categories.length === 0) return '';

    // Count categories by confidence
    const confCounts = { high: 0, medium: 0, low: 0 };
    const confTotals = { high: 0, medium: 0, low: 0 };
    for (const cat of result.categories) {
      const c = cat.confidence || 'medium';
      confCounts[c]++;
      confTotals[c] += cat.finalPrice;
    }

    const confLabels = { high: 'High Confidence', medium: 'Medium Confidence', low: 'Low Confidence' };
    const confContingency = state.bidStrategy.contingencyByConfidence || { high: 5, medium: 10, low: 20 };

    let rows = '';
    for (const level of ['high', 'medium', 'low']) {
      if (confCounts[level] === 0) continue;
      rows += `<tr>
        <td style="padding:8pt 14pt;border-bottom:1pt solid #E2E8F0;font-size:11pt;color:#222;font-family:Calibri,Arial,sans-serif;"><font color="#222">${confLabels[level]}</font></td>
        <td style="padding:8pt 14pt;border-bottom:1pt solid #E2E8F0;text-align:center;font-size:11pt;color:#222;font-family:Calibri,Arial,sans-serif;"><font color="#222">${confCounts[level]} ${confCounts[level] === 1 ? 'category' : 'categories'}</font></td>
        <td style="padding:8pt 14pt;border-bottom:1pt solid #E2E8F0;text-align:center;font-size:11pt;color:#222;font-family:Calibri,Arial,sans-serif;"><font color="#222">${level === 'high' ? 'Low Risk' : level === 'medium' ? 'Moderate Risk' : 'Higher Risk'}</font></td>
        <td style="padding:8pt 14pt;border-bottom:1pt solid #E2E8F0;text-align:right;font-size:11pt;color:#222;font-family:Calibri,Arial,sans-serif;"><font color="#222">${fmt(confTotals[level])}</font></td>
      </tr>`;
    }

    return `
<!-- Confidential bar with page break -->
${this._confBar(true)}

<table width="100%" cellpadding="8" cellspacing="0" border="0" style="margin-bottom:8pt;">
  <tr>
    <td bgcolor="${b.navy}" style="border-bottom:3pt solid ${b.gold};">
      <span style="font-size:14pt;color:${b.gold};text-transform:uppercase;letter-spacing:3pt;font-weight:bold;font-family:Calibri,Arial,sans-serif;">Pricing Strategy Summary</span>
    </td>
  </tr>
</table>

<p style="font-size:11pt;color:#444;font-family:Calibri,Arial,sans-serif;margin-bottom:12pt;line-height:1.6;">
This estimate incorporates a risk-adjusted pricing strategy. Categories have been assessed for estimation confidence and appropriate contingency levels have been applied to mitigate risk in areas of uncertainty.
</p>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20pt;">
  <tr>
    <td bgcolor="${b.navy}" style="padding:8pt 14pt;color:#FFFFFF;font-size:9pt;text-transform:uppercase;font-weight:bold;letter-spacing:1pt;border:1pt solid ${b.navy};font-family:Calibri,Arial,sans-serif;"><font color="#FFFFFF"><b>Confidence Level</b></font></td>
    <td bgcolor="${b.navy}" style="padding:8pt 14pt;color:#FFFFFF;font-size:9pt;text-transform:uppercase;font-weight:bold;letter-spacing:1pt;border:1pt solid ${b.navy};text-align:center;font-family:Calibri,Arial,sans-serif;"><font color="#FFFFFF"><b>Categories</b></font></td>
    <td bgcolor="${b.navy}" style="padding:8pt 14pt;color:#FFFFFF;font-size:9pt;text-transform:uppercase;font-weight:bold;letter-spacing:1pt;border:1pt solid ${b.navy};text-align:center;font-family:Calibri,Arial,sans-serif;"><font color="#FFFFFF"><b>Contingency</b></font></td>
    <td bgcolor="${b.navy}" style="padding:8pt 14pt;color:#FFFFFF;font-size:9pt;text-transform:uppercase;font-weight:bold;letter-spacing:1pt;border:1pt solid ${b.navy};text-align:right;font-family:Calibri,Arial,sans-serif;"><font color="#FFFFFF"><b>Subtotal</b></font></td>
  </tr>
  ${rows}
  <tr>
    <td bgcolor="#3B97A1" style="padding:10pt 14pt;font-size:11pt;font-weight:bold;color:#FFFFFF;border:1pt solid #2B828B;font-family:Calibri,Arial,sans-serif;" colspan="3"><font color="#FFFFFF"><b>TOTAL WITH STRATEGY</b></font></td>
    <td bgcolor="#3B97A1" style="padding:10pt 14pt;text-align:right;font-size:11pt;font-weight:bold;color:#FFFFFF;border:1pt solid #2B828B;font-family:Calibri,Arial,sans-serif;"><font color="#FFFFFF"><b>${fmt(result.grandTotalWithStrategy)}</b></font></td>
  </tr>
</table>
`;
  },

  // v5.128.12: Build a plain-text fact list of every line item quantity in the
  // final BOM, grouped by category. Injected into the proposal AI prompt so
  // the narrative uses post-processed BOM numbers instead of the pre-processed
  // rougher numbers in the raw analysis text.
  _buildBOMQuantityFacts(state) {
    try {
      if (typeof SmartPlansExport === 'undefined') return '(BOM data unavailable.)';
      const analysis = state.aiAnalysis || '';
      let bom = SmartPlansExport._extractBOMFromAnalysis(analysis);
      if (bom && typeof SmartPlansExport._applyUserBOMEdits === 'function') bom = SmartPlansExport._applyUserBOMEdits(bom, state);
      if (bom && typeof SmartPlansExport._applyTransitAdjustments === 'function') SmartPlansExport._applyTransitAdjustments(bom, state);
      if (bom && typeof SmartPlansExport._filterBOMByDisciplines === 'function') bom = SmartPlansExport._filterBOMByDisciplines(bom, state.disciplines);
      if (!bom?.categories?.length) return '(No BOM categories available.)';

      const lines = [];
      for (const cat of bom.categories) {
        if (!cat?.items?.length) continue;
        lines.push(`### ${cat.name}`);
        for (const item of cat.items) {
          const qty = (typeof item.qty === 'number') ? item.qty.toLocaleString() : (item.qty || '?');
          const unit = item.unit || 'ea';
          const mfg = item.mfg ? `${item.mfg} ` : '';
          const pn = item.partNumber ? ` (${item.partNumber})` : '';
          lines.push(`- ${qty} ${unit} — ${mfg}${item.item || item.name || 'Unnamed'}${pn}`);
        }
        lines.push('');
      }
      // Safety cap — very long BOMs get truncated to keep the prompt bounded
      const out = lines.join('\n');
      return out.length > 8000 ? out.substring(0, 8000) + '\n… (truncated)' : out;
    } catch (e) {
      console.warn('[ProposalGen] _buildBOMQuantityFacts failed:', e);
      return '(BOM fact extraction failed — fall back to analysis data.)';
    }
  },

  // Pre-compute and cache the BOM grand total so ALL consumers use the SAME number.
  // Delegates to _extractGrandTotal which uses the identical formula as
  // export-engine.js _getFullyLoadedTotal.
  _precomputeBOMTotal(state) {
    // Always recompute — previous early-return caused stale totals after BOM edits
    const total = this._extractGrandTotal(state);
    if (total && total > 1000) {
      console.log(`[ProposalGen] Pre-computed BOM total: $${state._bomGrandTotal}`);
    }
  },

  // Extract grand total — ALWAYS recomputes from BOM + user-configured markups.
  // This ensures proposal, export Excel, and contract value all show the SAME number.
  // Uses _computeFullBreakdown (deterministic) — NOT the Financial Engine AI total,
  // which uses a different formula and often produces a lower, inconsistent number.
  _extractGrandTotal(state) {
    // v5.128.1: Prefer the UNIFIED entry point so V1, V2, and Export always agree.
    try {
      if (typeof SmartPlansFinancials !== 'undefined' && typeof SmartPlansExport !== 'undefined') {
        const analysis = state.aiAnalysis || '';
        let bom = SmartPlansExport._extractBOMFromAnalysis ? SmartPlansExport._extractBOMFromAnalysis(analysis) : null;
        if (bom && typeof SmartPlansExport._applyUserBOMEdits === 'function') bom = SmartPlansExport._applyUserBOMEdits(bom, state);
        if (bom && typeof SmartPlansExport._applyTransitAdjustments === 'function') SmartPlansExport._applyTransitAdjustments(bom, state);
        if (bom && typeof SmartPlansExport._filterBOMByDisciplines === 'function') bom = SmartPlansExport._filterBOMByDisciplines(bom, state.disciplines);
        const gt = SmartPlansFinancials.grandTotal(state, bom);
        if (gt?.total > 1000) {
          if (gt.breakdown) state._bomBreakdown = gt.breakdown;
          state._bomGrandTotal = gt.total;
          console.log(`[ProposalGen] Grand total from SmartPlansFinancials (${gt.source}): $${gt.total.toLocaleString()}`);
          return gt.total;
        }
      }
    } catch (e) { console.warn('[ProposalGen] SmartPlansFinancials delegation failed, falling back:', e); }
    // ALWAYS recompute from BOM to avoid stale cached values from Financial Engine AI
    try {
      if (typeof SmartPlansExport !== 'undefined') {
        // Priority 1: Bid Strategy — when user explicitly applied per-category markups,
        // that IS the bid price. Without this, "Apply Strategy" button was cosmetic-only.
        if (state.bidStrategy?.applied && SmartPlansExport.applyBidStrategy) {
          const stratResult = SmartPlansExport.applyBidStrategy(state);
          if (stratResult?.grandTotalWithStrategy > 1000) {
            state._bomGrandTotal = stratResult.grandTotalWithStrategy;
            // Still compute base breakdown for reference display
            const analysis = state.aiAnalysis || '';
            let bom = SmartPlansExport._extractBOMFromAnalysis(analysis);
            if (bom && typeof SmartPlansExport._applyUserBOMEdits === 'function') bom = SmartPlansExport._applyUserBOMEdits(bom, state);
            if (bom && typeof SmartPlansExport._applyTransitAdjustments === 'function') SmartPlansExport._applyTransitAdjustments(bom, state);
            if (bom && typeof SmartPlansExport._filterBOMByDisciplines === 'function') bom = SmartPlansExport._filterBOMByDisciplines(bom, state.disciplines);
            if (bom?.categories?.length > 0 && SmartPlansExport._computeFullBreakdown) {
              state._bomBreakdown = SmartPlansExport._computeFullBreakdown(state, bom);
            }
            console.log(`[ProposalGen] Grand total from Bid Strategy: $${stratResult.grandTotalWithStrategy.toLocaleString()}`);
            return stratResult.grandTotalWithStrategy;
          }
        }

        // Priority 2: Transit/Railroad — use FormulaEngine3D (calibrated to actual winning Amtrak bids)
        if (state.isTransitRailroad && state._engine3DResult?.grandTotalSELL > 1000) {
          state._bomGrandTotal = state._engine3DResult.grandTotalSELL;
          console.log(`[ProposalGen] 🚂 Grand total from 3D Formula Engine (transit): $${state._engine3DResult.grandTotalSELL.toLocaleString()}${state._engine3DResult._calibrated ? ' [CALIBRATED]' : ''}`);
          return state._engine3DResult.grandTotalSELL;
        }

        // Priority 3: Deterministic BOM computation with base markups
        if (SmartPlansExport._computeFullBreakdown) {
          const analysis = state.aiAnalysis || '';
          let bom = SmartPlansExport._extractBOMFromAnalysis(analysis);

          // Apply ALL user BOM edits (price overrides, deletions, manual items)
          // Uses _applyUserBOMEdits which handles all three edit types consistently
          if (bom && typeof SmartPlansExport._applyUserBOMEdits === 'function') {
            bom = SmartPlansExport._applyUserBOMEdits(bom, state);
          }

          // Apply transit station-grade pricing adjustments
          if (bom && typeof SmartPlansExport._applyTransitAdjustments === 'function') {
            SmartPlansExport._applyTransitAdjustments(bom, state);
          }
          if (bom && typeof SmartPlansExport._filterBOMByDisciplines === 'function') {
            bom = SmartPlansExport._filterBOMByDisciplines(bom, state.disciplines);
          }
          if (bom?.categories?.length > 0) {
            const bd = SmartPlansExport._computeFullBreakdown(state, bom);
            if (bd.grandTotal > 1000) {
              state._bomGrandTotal = bd.grandTotal;
              state._bomBreakdown = bd;
              return bd.grandTotal;
            }
          }
        }
      }
    } catch (e) { console.warn('[ProposalGen] _extractGrandTotal error:', e); }

    // Fallback: use cached value only if fresh BOM computation failed
    if (state._bomGrandTotal && state._bomGrandTotal > 1000) {
      console.warn('[ProposalGen] Using cached grand total — fresh computation failed');
      return state._bomGrandTotal;
    }

    console.error('[ProposalGen] ⛔ No valid grand total available — proposal will have no price. Check that BOM has categories and SmartPlansExport is loaded.');
    return null;
  },

  _extractTotalFromProposalText(proposalText) {
    if (!proposalText) return null;
    const patterns = [
      /\|\s*\*?\*?\s*(?:TOTAL|Grand Total|Total Investment)\s*\*?\*?\s*\|[^|]*\|\s*\$?\s*([\d,]+(?:\.\d{1,2})?)\s*\|/i,
      /TOTAL\s*INVESTMENT[^\$]*\$([\d,]+(?:\.\d{1,2})?)/i,
      /\*\*Total\*\*[^\$]*\$([\d,]+(?:\.\d{1,2})?)/i,
      /Grand\s*Total[^\$]*\$([\d,]+(?:\.\d{1,2})?)/i,
      /Total\s*Project\s*(?:Cost|Investment)[^\$]*\$([\d,]+(?:\.\d{1,2})?)/i,
    ];
    for (const p of patterns) {
      const m = proposalText.match(p);
      if (m) {
        const val = parseFloat(m[1].replace(/,/g, ''));
        if (val > 1000) return val;
      }
    }
    return null;
  },

  _formatMoney(amount) {
    if (!amount || isNaN(amount)) return null;
    return '$' + Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  // ═══════════════════════════════════════════════════════════════
  // EXECUTIVE PROPOSAL — Beautiful 3-page Fortune 500 summary
  // ═══════════════════════════════════════════════════════════════

  async renderExecutiveProposal(state, progressCallback) {
    try {
      const co = this.COMPANY;
      const b = this.BRAND;
      const projName = state.projectName || 'Untitled Project';
      const projLoc = state.projectLocation || 'As Specified';
      const preparedFor = state.preparedFor || projName;
      const disciplines = (state.disciplines || []).join(', ') || 'Low Voltage Systems';
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      // v5.129.8 — validity period bumped 30 → 45 days to match the
      // Proposal Validity; Right to Withdraw clause rendered before the
      // signature block on Page 3.
      const validUntil = new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000)
        .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const refNum = `3DTSI-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const year = today.getFullYear();
      // Strip raw costs/markups from analysis before sending to AI — client should NEVER see internal numbers
      const rawAnalysis = (state.aiAnalysis || '').substring(0, 12000);
      const analysisSummary = rawAnalysis
        .replace(/\b(cost|base\s*cost|raw\s*cost|markup|burden|margin|profit\s*%|overhead)\b[^\n]*\$/gi, '')
        .replace(/\$[\d,]+\.\d{2}/g, '[REDACTED]');
      const grandTotalForPrompt = this._extractGrandTotal(state);
      const grandTotalStr = grandTotalForPrompt ? this._formatMoney(grandTotalForPrompt) : 'See proposal';
      // grandTotal extracted after AI generates text (below)

      progressCallback(10, 'Crafting concise executive summary with AI…');

      const prompt = `You are the Senior Proposal Manager at ${co.name}. Write a CONCISE, HIGH-IMPACT executive proposal summary for a client. This must be short but powerful — designed for busy executives.

PROJECT: "${projName}"
TYPE: ${state.projectType || 'Low Voltage Installation'}
LOCATION: ${projLoc}
DISCIPLINES: ${disciplines}
DATE: ${dateStr}
TOTAL BID PRICE: ${grandTotalStr}

═══ SCOPE DATA (quantities only — NO internal pricing) ═══
${analysisSummary}

═══ CRITICAL RULES ═══
- The ONLY dollar amount that may appear ANYWHERE in your output is the TOTAL BID PRICE: ${grandTotalStr}
- NEVER show internal costs, raw costs, base costs, markups, margins, burden, overhead, profit percentages, or any cost breakdown
- NEVER show per-item prices, category subtotals, material costs, or labor costs
- Do NOT write an "Investment Summary" or pricing-breakdown section — the Total Project Investment is rendered separately on Page 3 by the system, with the single grand-total figure only
- Do NOT write a "Proposal Validity", "Right to Withdraw", or "AI-Assisted Proposal" paragraph — those are rendered downstream as a separate dedicated legal section before the signature block. Do NOT mention validity periods, days, withdrawal rights, or governing law.
- If you mention any dollar amount other than ${grandTotalStr}, the proposal is REJECTED
- Be concise but compelling. Every word must earn its place.
- Use specific quantities and data from the analysis — do NOT make up numbers.

Write EXACTLY this structure in markdown (NO Investment Summary section — it is rendered downstream):

## Executive Summary
Write 2-3 powerful paragraphs. Open with a compelling hook about the project. State the total scope concisely. Close with the total investment of ${grandTotalStr} and why ${co.name} is the best choice. Reference BICSI RCDD, NICET, and 20+ years.

## Scope of Work
A concise bullet list of what's included, organized ONLY by the selected disciplines: ${disciplines}. Do NOT include any disciplines that are not listed. Use real quantities from the analysis data. Keep to 10-15 key items max. Do NOT include prices on any line item.

## Key Differentiators
3-4 bullet points on why ${co.name} is the best choice. Keep each to 1-2 sentences max.

IMPORTANT: Keep the ENTIRE response under 700 words. Quality over quantity. The ONLY dollar figure in the entire document is ${grandTotalStr}, and it appears in the Executive Summary closing line — the full Total Project Investment box on Page 3 is rendered by the system separately.`;

      const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
        _model: 'gemini-2.5-flash',
        _brainSlot: 0,
      };

      const response = await fetchWithRetry(GEMINI_CONFIG.endpoint, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(requestBody),
        _timeout: 60000,
        _apiKeyRotator: () => GEMINI_CONFIG.rotateKey(),
      }, 3);

      if (!response.ok) {
        // AUDIT FIX M3: Guard .text() in error path — response may have no body
        const err = await response.text().catch(() => '');
        throw new Error(`AI request failed (${response.status}): ${err.substring(0, 200)}`);
      }

      // Handle both streaming and JSON responses
      const contentType = response.headers.get('content-type') || '';
      let aiText = '';

      if (contentType.includes('text/event-stream')) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (!jsonStr || jsonStr === '[DONE]') continue;
              try {
                const chunk = JSON.parse(jsonStr);
                const chunkParts = chunk?.candidates?.[0]?.content?.parts || [];
                for (const p of chunkParts) {
                  if (p.text && !p.thought) aiText += p.text;
                }
              } catch (e) { console.debug('[ProposalGen] SSE chunk parse skip:', e.message); }
            }
          }
        }
      } else {
        const data = await response.json();
        aiText = (data?.candidates?.[0]?.content?.parts || [])
          .filter(p => p.text && !p.thought).map(p => p.text).join('\n') || '';
      }

      if (!aiText || aiText.length < 200) {
        throw new Error('AI returned insufficient content. Please try again.');
      }

      // Use BOM-computed total as the single source of truth.
      // The AI proposal text may contain a different number — ignore it
      // in favor of the deterministic BOM breakdown + contingency total.
      this._precomputeBOMTotal(state);
      const grandTotal = this._extractGrandTotal(state);
      const grandTotalDisplay = grandTotal ? this._formatMoney(grandTotal) : 'See Detailed Proposal';

      progressCallback(60, 'Building executive Word document…');

      // v5.129.7 — strip any Investment Summary / pricing-table content the
      // AI may have written despite the prompt instructions. The Total
      // Project Investment box on Page 3 is the only place pricing appears.
      const scrubbedAi = this._stripPricingSections(aiText);
      const bodyHtml = this._sanitizeHtml(this._markdownToHtml(scrubbedAi));

      // ─── Build the 3-page Word document ───
      let wordHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="SmartPlans v3.0 Executive">
<title>${this._escText(projName)} — Executive Proposal | ${co.name}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page { size: 8.5in 11in; margin: 0.7in 0.85in 0.8in 0.85in; mso-header-margin: 0.3in; mso-footer-margin: 0.4in; }
  @page Section1 { mso-footer: f1; mso-first-footer: f1; mso-title-page: no; }
  div.Section1 { page: Section1; }
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.65; color: #222; margin: 0; padding: 0; }
  .page-break { page-break-before: always; }
  h2 { font-family: Calibri, Arial, sans-serif; font-size: 16pt; font-weight: bold; color: ${b.navy}; margin-top: 20pt; margin-bottom: 8pt; padding-bottom: 4pt; border-bottom: 3pt solid ${b.teal}; page-break-after: avoid; }
  h3 { font-family: Calibri, Arial, sans-serif; font-size: 13pt; font-weight: bold; color: ${b.teal}; margin-top: 14pt; margin-bottom: 6pt; }
  p { margin-top: 0; margin-bottom: 8pt; line-height: 1.65; }
  ul, ol { margin-top: 4pt; margin-bottom: 8pt; }
  li { margin-bottom: 3pt; line-height: 1.5; }
  strong { color: ${b.navy}; }
  em { color: ${b.teal}; }
  table.data-table { width: 100%; border-collapse: collapse; margin: 8pt 0 14pt 0; font-size: 9.5pt; page-break-inside: avoid; }
  table.data-table th { background: ${b.navy}; color: white; padding: 7pt 10pt; text-align: left; font-weight: bold; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5pt; border: 1pt solid ${b.navy}; }
  table.data-table td { padding: 6pt 10pt; border: 1pt solid ${b.border}; vertical-align: top; }
  .sig-line { border-bottom: 1pt solid #333; height: 28pt; margin-bottom: 3pt; }
  .sig-label { font-size: 7.5pt; color: #888; text-transform: uppercase; letter-spacing: 1pt; font-weight: bold; margin-bottom: 14pt; }
</style>
</head>
<body>

<!-- Word footer — appears on EVERY page in MS Word -->
<div style="mso-element:footer" id="f1">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="border-top:1.5pt solid ${b.teal};padding-top:4pt;text-align:center;">
      <p class="MsoFooter" style="text-align:center;font-size:8.5pt;font-weight:bold;color:${b.navy};text-transform:uppercase;letter-spacing:3pt;font-family:Calibri,Arial,sans-serif;margin:0;">
        3D &nbsp;CONFIDENTIAL &nbsp;&middot;&nbsp; PROPRIETARY
      </p>
    </td></tr>
  </table>
</div>

<div class="Section1">

<!--
═══════════════════════════════════════════════════════════
PAGE 1 — STUNNING COVER PAGE
═══════════════════════════════════════════════════════════
-->

<!-- Full-width navy header bar -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:-0.7in -0.85in 0 -0.85in;width:calc(100% + 1.7in);">
  <tr><td bgcolor="${b.navy}" style="height:10pt;font-size:1pt;">&nbsp;</td></tr>
  <tr><td bgcolor="${b.gold}" style="height:5pt;font-size:1pt;">&nbsp;</td></tr>
</table>

<br><br><br><br><br>

<!-- Company Name -->
<p style="font-size:36pt;font-weight:bold;color:${b.navy};margin-bottom:0;font-family:Calibri,Arial,sans-serif;letter-spacing:-0.5pt;">
  ${co.name}
</p>
<p style="font-size:11pt;color:${b.teal};text-transform:uppercase;letter-spacing:5pt;font-weight:bold;margin-bottom:0;">
  Systems Integration &amp; Technology Solutions
</p>

<!-- Gold divider -->
<table width="250" cellpadding="0" cellspacing="0" border="0" style="margin:20pt 0;">
  <tr><td bgcolor="${b.gold}" style="height:4pt;font-size:1pt;">&nbsp;</td></tr>
</table>

<!-- Document Type -->
<p style="font-size:9pt;color:${b.gray};text-transform:uppercase;letter-spacing:6pt;font-weight:bold;margin-bottom:10pt;">
  Executive Proposal
</p>

<!-- Project Name with gold accent -->
<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:6pt;">
  <tr>
    <td bgcolor="${b.gold}" style="width:6pt;">&nbsp;</td>
    <td style="padding-left:18pt;">
      <span style="font-size:28pt;font-weight:bold;color:${b.navy};font-family:Calibri,Arial,sans-serif;">${this._escText(projName)}</span>
    </td>
  </tr>
</table>
<p style="font-size:13pt;color:${b.gray};margin-left:24pt;margin-bottom:0;">${this._escText(projLoc)}</p>

<br><br><br><br><br><br>

<!-- Info Grid -->
<table width="100%" cellpadding="12" cellspacing="0" border="0">
  <tr>
    <td bgcolor="${b.navy}" width="50%" style="color:white;vertical-align:top;border-right:3pt solid ${b.gold};">
      <p style="font-size:7pt;color:${b.gold};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Prepared For</p>
      <p style="font-size:13pt;color:white;font-weight:bold;margin-bottom:10pt;">${this._escText(preparedFor)}</p>
      <p style="font-size:7pt;color:${b.gold};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Date</p>
      <p style="font-size:11pt;color:white;margin-bottom:10pt;">${dateStr}</p>
      <p style="font-size:7pt;color:${b.gold};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Reference</p>
      <p style="font-size:11pt;color:white;margin-bottom:0;">${refNum}</p>
    </td>
    <td bgcolor="${b.navy}" width="50%" style="color:white;vertical-align:top;">
      <p style="font-size:7pt;color:${b.gold};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Prepared By</p>
      <p style="font-size:13pt;color:white;font-weight:bold;margin-bottom:1pt;">${co.consultant}</p>
      <p style="font-size:9pt;color:rgba(255,255,255,0.7);margin-bottom:10pt;">${co.title}</p>
      <p style="font-size:7pt;color:${b.gold};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Contact</p>
      <p style="font-size:11pt;color:white;margin-bottom:1pt;">${co.email}</p>
      <p style="font-size:11pt;color:white;margin-bottom:1pt;">${co.phone}</p>
      <p style="font-size:9pt;color:rgba(255,255,255,0.7);margin-bottom:0;">${co.website}</p>
    </td>
  </tr>
</table>

<!-- Valid until — see Proposal Validity; Right to Withdraw clause on Page 3 for full terms -->
<p style="font-size:8pt;color:${b.gray};text-align:center;margin-top:10pt;">
  This proposal is valid for forty-five (45) calendar days from ${dateStr} &middot; Valid until ${validUntil}
</p>

<!-- Confidential bar before page break -->
${this._confBar(true)}

<!--
═══════════════════════════════════════════════════════════
PAGE 2 — EXECUTIVE SUMMARY, SCOPE & PRICING TABLE
═══════════════════════════════════════════════════════════
-->

<!-- Teal header bar for page 2 -->
<table width="100%" cellpadding="8" cellspacing="0" border="0" style="margin-bottom:16pt;">
  <tr>
    <td bgcolor="${b.navy}" style="border-bottom:3pt solid ${b.gold};">
      <span style="font-size:10pt;color:${b.gold};text-transform:uppercase;letter-spacing:3pt;font-weight:bold;">${this._escText(projName)}</span>
      <span style="font-size:9pt;color:rgba(255,255,255,0.6);float:right;">${co.name}</span>
    </td>
  </tr>
</table>

${bodyHtml}

<!-- Confidential bar before page break -->
${this._confBar(true)}

<!--
═══════════════════════════════════════════════════════════
PAGE 3 — TOTAL INVESTMENT & SIGNATURE
═══════════════════════════════════════════════════════════
-->

<!-- Header bar -->
<table width="100%" cellpadding="8" cellspacing="0" border="0" style="margin-bottom:20pt;">
  <tr>
    <td bgcolor="${b.navy}" style="border-bottom:3pt solid ${b.gold};">
      <span style="font-size:10pt;color:${b.gold};text-transform:uppercase;letter-spacing:3pt;font-weight:bold;">Total Investment</span>
      <span style="font-size:9pt;color:rgba(255,255,255,0.6);float:right;">${co.name}</span>
    </td>
  </tr>
</table>

<!-- Grand Total Box -->
<table width="100%" cellpadding="24" cellspacing="0" border="0" style="margin-bottom:16pt;">
  <tr>
    <td bgcolor="${b.navy}" style="text-align:center;border:3pt solid ${b.gold};">
      <p style="font-size:9pt;color:${b.gold};text-transform:uppercase;letter-spacing:4pt;font-weight:bold;margin-bottom:8pt;font-family:Calibri,Arial,sans-serif;">Total Project Investment</p>
      <p style="font-size:36pt;font-weight:bold;color:white;margin-bottom:6pt;font-family:Calibri,Arial,sans-serif;">${grandTotalDisplay}</p>
      <p style="font-size:9pt;color:rgba(255,255,255,0.7);margin-bottom:0;">Includes all materials, labor, equipment, and project management</p>
    </td>
  </tr>
</table>

<p style="font-size:9pt;color:${b.gray};text-align:center;margin-bottom:14pt;">
  All prices subject to material availability at time of contract execution.
</p>

<!--
═══════════════════════════════════════════════════════════
PROPOSAL VALIDITY; RIGHT TO WITHDRAW (v5.129.8 — required legal section)
═══════════════════════════════════════════════════════════
-->
${this._validityClauseHtml()}

<!-- Acceptance Section -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8pt;">
  <tr><td bgcolor="${b.teal}" style="height:3pt;font-size:1pt;">&nbsp;</td></tr>
</table>
<h2 style="border-bottom:none;margin-top:12pt;">Acceptance &amp; Authorization</h2>

<p style="font-size:10pt;">By executing this document, the authorized representative acknowledges receipt of this proposal subject to the Proposal Validity; Right to Withdraw clause set forth above. No binding contract shall arise unless and until a definitive written agreement is executed by duly authorized representatives of both parties.</p>

<br>

<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr valign="top">
    <td width="47%">
      <p style="font-size:9pt;color:${b.teal};font-weight:bold;text-transform:uppercase;letter-spacing:2pt;margin-bottom:4pt;">${co.name}</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4pt;"><tr><td bgcolor="${b.gold}" style="height:2pt;font-size:1pt;">&nbsp;</td></tr></table>
      <br><br>
      <div class="sig-line"></div><div class="sig-label">Authorized Signature</div>
      <div class="sig-line"></div><div class="sig-label">Printed Name &amp; Title</div>
      <div class="sig-line"></div><div class="sig-label">Date</div>
    </td>
    <td width="6%">&nbsp;</td>
    <td width="47%">
      <p style="font-size:9pt;color:${b.teal};font-weight:bold;text-transform:uppercase;letter-spacing:2pt;margin-bottom:4pt;">Client</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:4pt;"><tr><td bgcolor="${b.gold}" style="height:2pt;font-size:1pt;">&nbsp;</td></tr></table>
      <br><br>
      <div class="sig-line"></div><div class="sig-label">Authorized Signature</div>
      <div class="sig-line"></div><div class="sig-label">Printed Name &amp; Title</div>
      <div class="sig-line"></div><div class="sig-label">Date</div>
    </td>
  </tr>
</table>

<br>

<!-- Bottom bar -->
<table width="100%" cellpadding="8" cellspacing="0" border="0" style="margin-top:20pt;">
  <tr><td bgcolor="${b.navy}" align="center" style="font-size:7.5pt;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2pt;font-family:Calibri,Arial,sans-serif;">
    <span style="color:${b.gold};font-weight:bold;">${co.name}</span>
    &nbsp;&nbsp;&middot;&nbsp;&nbsp;${co.address}, ${co.cityStateZip}
    &nbsp;&nbsp;&middot;&nbsp;&nbsp;${co.website}
  </td></tr>
</table>

<!-- Final confidential bar -->
${this._confBar()}

</div></body></html>`;

      progressCallback(90, 'Creating downloadable document…');

      // Inline confidential bars added at page breaks + MSO footer for belt-and-suspenders coverage.

      // Cache for PDF re-download without re-generating
      this._lastExecProposalHTML = wordHtml;

      // v5.129.11 \u2014 ZIP EVERYTHING capture mode. Skip the .doc download
      // here; the cached HTML is what zipEverything() packages.
      if (typeof window !== 'undefined' && window._zipCaptureMode) {
        progressCallback(100, 'Executive proposal cached for ZIP bundle');
        return;
      }

      // Download
      const blob = new Blob(['\ufeff' + wordHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = projName.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_');
      a.href = url;
      a.download = `${safeName}_Executive_Proposal.doc`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 60000);

      progressCallback(100, 'Executive proposal downloaded!');
      if (typeof spToast === 'function') spToast('Executive proposal downloaded successfully!', 'success');

    } catch (err) {
      console.error('[ExecProposal] Error:', err);
      if (typeof spToast === 'function') spToast('Executive proposal failed: ' + err.message, 'error');
      throw err;
    }
  },
};

if (typeof window !== 'undefined') {
  window.ProposalGenerator = ProposalGenerator;
}
