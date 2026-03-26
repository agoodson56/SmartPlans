// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — PROFESSIONAL PROPOSAL GENERATOR v3.0
// Fortune 500-grade Microsoft Word proposals
// Uses Word-native table/bgcolor formatting (NOT modern CSS)
// ═══════════════════════════════════════════════════════════════

const ProposalGenerator = {

  _round(val) { return Math.round((val || 0) * 100) / 100; },

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
    navy: '#1B2A4A',
    dark: '#1a1a2e',
    gray: '#4A5568',
    lightGray: '#F4F6F8',
    border: '#D1D5DB',
  },

  // ─── Generate the proposal via Gemini AI ───────────────────
  async generateProposal(state, progressCallback) {
    const co = this.COMPANY;
    const projName = state.projectName || 'Untitled Project';
    const projType = state.projectType || 'Low Voltage Installation';
    const projLoc = state.projectLocation || 'To Be Determined';
    const preparedFor = state.preparedFor || projName;
    const disciplines = (state.disciplines || []).join(', ') || 'Low Voltage Systems';
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const validUntil = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Pull the FULL analysis — the bid report has the real numbers
    const analysisSummary = (state.aiAnalysis || '').substring(0, 20000);

    // CRITICAL: Pre-compute BOM grand total BEFORE anything else.
    // This ensures the SAME number is used in the AI prompt, the
    // financial table, the hero section, and the export package.
    // Without this, _extractGrandTotal falls through to different methods.
    this._precomputeBOMTotal(state);
    const grandTotal = this._extractGrandTotal(state);
    const grandTotalDisplay = grandTotal ? this._formatMoney(grandTotal) : null;

    progressCallback(5, 'Crafting executive proposal with AI…');

    const prompt = `You are the Senior Proposal Manager at ${co.name}, a premier low-voltage technology integrator with 20+ years of excellence. You are writing a WINNING proposal that will be submitted to a real client. This must be the most professional, compelling, and detailed proposal the client has ever received.

PROJECT: "${projName}"
TYPE: ${projType}
LOCATION: ${projLoc}
DISCIPLINES: ${disciplines}
DATE: ${dateStr}
VALID UNTIL: ${validUntil}
CONSULTANT: ${co.consultant}, ${co.title}

═══ COMPLETE BID ANALYSIS DATA ═══
The following contains the REAL material counts, labor hours, and pricing from our 21-brain AI analysis system. Use these EXACT numbers in the proposal — do NOT invent different numbers:

${analysisSummary}

═══ CRITICAL PRICING RULE ═══
This proposal is for a CLIENT. You must NEVER show internal costs, base costs, cost breakdowns, markup amounts, or markup percentages anywhere in the proposal. Only show SELL PRICES (the final price the client pays). You may show unit sell prices, quantities, and unit hours — but NEVER internal cost or markup columns. This applies to ALL tables and ALL text throughout the entire proposal.

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

## 6. Investment Summary
**SKIP THIS SECTION ENTIRELY. Do NOT write any financial tables, cost summaries, pricing breakdowns, sell prices, material costs, labor costs, subtotals, or grand totals. Do NOT create any investment summary table. Write ONLY this exact sentence:** "Please refer to the Investment Summary on the following page."

The financial table will be inserted separately with verified numbers. You must NOT attempt to create any pricing content whatsoever.

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

## 8. Why Choose 3D Technology Services, Inc.
Write a compelling closing (3-4 paragraphs) covering:
- Single-source accountability from design through ongoing support
- Dedicated project manager and superintendent for every project  
- 24/7/365 emergency service and support
- Comprehensive post-installation training (we don't just install and leave)
- Technology refresh planning and future-proof infrastructure design
- Local presence in Rancho Cordova with projects throughout California and nationwide
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        _timeout: 300000, // 5 minutes for Pro model
        _apiKeyRotator: () => GEMINI_CONFIG.rotateKey(),
      }, 3);
    } catch (primaryErr) {
      // Fallback to Flash model if Pro fails
      console.warn('[ProposalGen] Pro model failed, falling back to Flash:', primaryErr.message);
      progressCallback(15, 'Retrying with alternate AI model…');
      requestBody._model = 'gemini-2.5-flash';
      requestBody._brainSlot = 0;
      response = await fetchWithRetry(GEMINI_CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        _timeout: 180000,
        _apiKeyRotator: () => GEMINI_CONFIG.rotateKey(),
      }, 3);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`API Error: ${response.status} — ${errText.substring(0, 200)}`);
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
    const validUntil = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const refNum = `3DTSI-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const year = today.getFullYear();
    const bodyHtml = this._markdownToHtml(proposalText);

    // Build the DETERMINISTIC financial table from BOM data (code, not AI)
    const financialTableHtml = this._buildFinancialTableHtml(state);
    const pricingStrategySummaryHtml = this._buildPricingStrategySummaryHtml(state);
    const grandTotal = this._extractGrandTotal(state);
    const grandTotalDisplay = grandTotal ? this._formatMoney(grandTotal) : null;

    progressCallback(85, 'Creating downloadable document…');

    // ─── Word-native HTML — uses tables + bgcolor (NOT modern CSS) ───
    const wordHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="SmartPlans v3.0">
<title>${this._esc(projName)} — Professional Proposal | ${co.name}</title>
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

  @page Section1 { mso-header: h1; mso-footer: f1; }
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
</style>
</head>
<body>

<!-- Word footer — appears on EVERY page -->
<div style="mso-element:footer" id="f1">
  <p style="text-align:center;font-size:8pt;font-weight:bold;color:${b.navy};text-transform:uppercase;letter-spacing:3pt;font-family:Calibri,Arial,sans-serif;margin:0;padding-top:4pt;border-top:1pt solid ${b.teal};">
    3D CONFIDENTIAL
  </p>
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
      <span style="font-size:26pt;font-weight:bold;color:${b.navy};font-family:Calibri,Arial,sans-serif;">${this._esc(projName)}</span>
    </td>
  </tr>
</table>
<p style="font-size:13pt;color:${b.gray};margin-left:21pt;margin-bottom:0;">${this._esc(projLoc)}</p>

<br><br><br>

<!-- Info Grid — Two-column table -->
<table width="100%" cellpadding="8" cellspacing="0" border="0" style="margin-top:20pt;">
  <tr valign="top">
    <td width="48%" style="padding-right:24pt;">
      <p style="font-size:7.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Prepared For</p>
      <p style="font-size:11pt;color:#222;font-weight:500;margin-bottom:14pt;">${this._esc(preparedFor)}</p>

      <p style="font-size:7.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Project Name</p>
      <p style="font-size:11pt;color:#222;font-weight:500;margin-bottom:14pt;">${this._esc(projName)}</p>

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
      <p style="font-size:11pt;color:#222;margin-bottom:1pt;">www.3Dtsi.com</p>
      <p style="font-size:11pt;color:#222;margin-bottom:14pt;">(800) 733-3453</p>

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

<!--
═══════════════════════════════════════════════════════════
TABLE OF CONTENTS
═══════════════════════════════════════════════════════════
-->
<div class="page-break"></div>

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
  <tr><td style="padding:10pt 0;border-bottom:1pt solid ${b.border};"><span style="font-size:13pt;font-weight:bold;color:${b.teal};display:inline-block;width:36pt;">06</span> <span style="font-size:11pt;color:#222;">Investment Summary</span></td></tr>
  <tr><td style="padding:10pt 0;border-bottom:1pt solid ${b.border};"><span style="font-size:13pt;font-weight:bold;color:${b.teal};display:inline-block;width:36pt;">07</span> <span style="font-size:11pt;color:#222;">Terms &amp; Conditions</span></td></tr>
  <tr><td style="padding:10pt 0;border-bottom:1pt solid ${b.border};"><span style="font-size:13pt;font-weight:bold;color:${b.teal};display:inline-block;width:36pt;">08</span> <span style="font-size:11pt;color:#222;">Why Choose 3D Technology Services, Inc.</span></td></tr>
  <tr><td style="padding:10pt 0;border-bottom:1pt solid ${b.border};"><span style="font-size:13pt;font-weight:bold;color:${b.teal};display:inline-block;width:36pt;">09</span> <span style="font-size:11pt;color:#222;">Acceptance &amp; Authorization</span></td></tr>
</table>

<!--
═══════════════════════════════════════════════════════════
PROPOSAL BODY — AI-Generated Content
═══════════════════════════════════════════════════════════
-->
<div class="page-break"></div>

${bodyHtml}

<!-- DETERMINISTIC FINANCIAL TABLE — Built from BOM data in code, NOT AI -->
${financialTableHtml}

<!-- PRICING STRATEGY SUMMARY — Confidence & contingency breakdown (no markup % revealed) -->
${pricingStrategySummaryHtml}

${grandTotalDisplay ? `
<!--
═══════════════════════════════════════════════════════════
TOTAL INVESTMENT — Hardcoded from analysis (guaranteed to appear)
═══════════════════════════════════════════════════════════
-->
<div class="page-break"></div>

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
  This pricing is valid for thirty (30) calendar days from ${dateStr}.<br>
  All prices subject to material availability at time of contract execution.
</p>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16pt;">
  <tr><td bgcolor="${b.teal}" style="height:3pt;font-size:1pt;">&nbsp;</td></tr>
</table>
` : ''}

<!--
═══════════════════════════════════════════════════════════
ACCEPTANCE & SIGNATURE BLOCK
═══════════════════════════════════════════════════════════
-->
<div class="page-break"></div>

<h2>Acceptance &amp; Authorization</h2>

<p>By executing this document below, the authorized representative of the Client hereby accepts this proposal in its entirety, including all terms, conditions, scope of work, and investment summary as described herein. This agreement constitutes a binding contract between ${co.name} and the Client upon signature by both parties.</p>

<p>This proposal and the pricing contained within are valid for <b>thirty (30) calendar days</b> from the date of issuance (${dateStr}). After this period, ${co.name} reserves the right to re-quote based on current material pricing and labor availability.</p>

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

</div><!-- /Section1 -->
</body>
</html>`;

    const blob = new Blob(['\ufeff' + wordHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = projName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
    a.download = `3DTSI_Proposal_${safeName}_${today.toISOString().split('T')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    progressCallback(100, 'Proposal downloaded!');
    if (typeof spToast === 'function') spToast('✓ Professional proposal downloaded — open in Microsoft Word');
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
            tHtml += `<td bgcolor="#1B2A4A" style="color:#FFFFFF;padding:7pt 10pt;font-size:8.5pt;text-transform:uppercase;font-weight:bold;letter-spacing:0.5pt;border:1pt solid #1B2A4A;"><font color="#FFFFFF"><b>${this._escText(cell.trim())}</b></font></td>`;
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
              tHtml += `<td bgcolor="${isSubtotal ? '#2B4A6A' : '#1B2A4A'}" style="color:#FFFFFF;padding:8pt 10pt;font-weight:bold;font-size:${isSubtotal ? '9.5pt' : '11pt'};${align}border:1pt solid #1B2A4A;"><font color="#FFFFFF"><b>${this._escText(cell)}</b></font></td>`;
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
    html = html.replace(/^## (.+)$/gm, '<div class="page-break"></div><h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h2 style="font-size:20pt;">$1</h2>');

    // Bold / Italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<b style="color:#1B2A4A;">$1</b>');
    html = html.replace(/\*(.+?)\*/g, '<i>$1</i>');

    // Lists
    html = html.replace(/^(\s*)[-*] (.+)$/gm, '<li style="margin-bottom:3pt;">$2</li>');
    html = html.replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/g, '<ul style="margin-left:18pt;margin-bottom:8pt;">$1</ul>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin-bottom:3pt;">$1</li>');

    // Paragraphs
    html = html.replace(/\n{2,}/g, '</p>\n<p style="margin-bottom:8pt;">');
    if (!html.startsWith('<')) html = '<p style="margin-bottom:8pt;">' + html;
    if (!html.endsWith('>')) html += '</p>';

    return html;
  },

  _escText(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  _esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  },

  // ═══════════════════════════════════════════════════════════════
  // DETERMINISTIC FINANCIAL TABLE — Built from BOM data, never AI
  // This is the SINGLE SOURCE OF TRUTH for all proposal pricing
  // ═══════════════════════════════════════════════════════════════
  _buildFinancialTableHtml(state) {
    const b = this.BRAND;
    const analysis = state.aiAnalysis || '';
    const fmt = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Extract BOM from analysis (same function used by export-engine)
    let bom = null;
    try {
      if (typeof SmartPlansExport !== 'undefined' && SmartPlansExport._extractBOMFromAnalysis) {
        bom = SmartPlansExport._extractBOMFromAnalysis(analysis);
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
    const bd = SmartPlansExport._computeFullBreakdown(state, bom);

    // Cache so all downstream consumers use the same number
    state._bomGrandTotal = bd.grandTotal;
    state._bomBreakdown = bd;

    // Build line items for the table
    const lineItems = [
      { label: 'Materials', base: bd.materials, markup: `${Math.round(bd.matPct * 100)}%`, sell: bd.matSell },
      { label: 'Labor', base: bd.laborBase, markup: `${Math.round(bd.labPct * 100)}%`, sell: bd.labSell },
      { label: 'Equipment', base: bd.equipment, markup: `${Math.round(bd.eqPct * 100)}%`, sell: bd.eqSell },
      { label: 'Subcontractors', base: bd.subs, markup: `${Math.round(bd.subPct * 100)}%`, sell: bd.subSell },
    ].filter(g => g.base > 0);
    if (bd.burden > 0) lineItems.push({ label: 'Burden/Overhead', base: bd.laborBase, markup: `${Math.round(bd.burdenRate * 100)}%`, sell: bd.burden });
    if (bd.travel > 0) lineItems.push({ label: 'Travel/Incidentals', base: bd.travel, markup: '—', sell: bd.travel });

    const subtotal = bd.subtotal;
    const contingency = bd.contingency;
    const grandTotal = bd.grandTotal;

    // Build Word-compatible HTML table with Base Cost + Markup + Sell Price
    let rows = '';
    lineItems.forEach(g => {
      rows += `<tr>
        <td style="padding:10pt 14pt;border-bottom:1pt solid #E2E8F0;font-size:11pt;color:#222;font-family:Calibri,Arial,sans-serif;"><font color="#222">${g.label}</font></td>
        <td style="padding:10pt 14pt;border-bottom:1pt solid #E2E8F0;text-align:right;font-size:11pt;color:#222;font-family:Calibri,Arial,sans-serif;"><font color="#222">${fmt(g.base)}</font></td>
        <td style="padding:10pt 14pt;border-bottom:1pt solid #E2E8F0;text-align:center;font-size:11pt;color:#222;font-family:Calibri,Arial,sans-serif;"><font color="#222">${g.markup}</font></td>
        <td style="padding:10pt 14pt;border-bottom:1pt solid #E2E8F0;text-align:right;font-size:11pt;color:#222;font-family:Calibri,Arial,sans-serif;"><font color="#222">${fmt(g.sell)}</font></td>
      </tr>`;
    });

    return `
<div class="page-break"></div>

<table width="100%" cellpadding="8" cellspacing="0" border="0" style="margin-bottom:8pt;">
  <tr>
    <td bgcolor="${b.navy}" style="border-bottom:3pt solid ${b.gold};">
      <span style="font-size:14pt;color:${b.gold};text-transform:uppercase;letter-spacing:3pt;font-weight:bold;font-family:Calibri,Arial,sans-serif;">Investment Summary</span>
    </td>
  </tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20pt;">
  <tr>
    <td bgcolor="${b.navy}" style="padding:8pt 14pt;color:#FFFFFF;font-size:9pt;text-transform:uppercase;font-weight:bold;letter-spacing:1pt;border:1pt solid ${b.navy};width:35%;font-family:Calibri,Arial,sans-serif;"><font color="#FFFFFF"><b>Category</b></font></td>
    <td bgcolor="${b.navy}" style="padding:8pt 14pt;color:#FFFFFF;font-size:9pt;text-transform:uppercase;font-weight:bold;letter-spacing:1pt;border:1pt solid ${b.navy};text-align:right;font-family:Calibri,Arial,sans-serif;"><font color="#FFFFFF"><b>Base Cost</b></font></td>
    <td bgcolor="${b.navy}" style="padding:8pt 14pt;color:#FFFFFF;font-size:9pt;text-transform:uppercase;font-weight:bold;letter-spacing:1pt;border:1pt solid ${b.navy};text-align:center;font-family:Calibri,Arial,sans-serif;"><font color="#FFFFFF"><b>Markup</b></font></td>
    <td bgcolor="${b.navy}" style="padding:8pt 14pt;color:#FFFFFF;font-size:9pt;text-transform:uppercase;font-weight:bold;letter-spacing:1pt;border:1pt solid ${b.navy};text-align:right;font-family:Calibri,Arial,sans-serif;"><font color="#FFFFFF"><b>Sell Price</b></font></td>
  </tr>
  ${rows}
  <tr>
    <td colspan="3" bgcolor="#2B4A6A" style="padding:10pt 14pt;font-size:11pt;font-weight:bold;color:#FFFFFF;border:1pt solid #1B2A4A;font-family:Calibri,Arial,sans-serif;"><font color="#FFFFFF"><b>SUBTOTAL</b></font></td>
    <td bgcolor="#2B4A6A" style="padding:10pt 14pt;text-align:right;font-size:11pt;font-weight:bold;color:#FFFFFF;border:1pt solid #1B2A4A;font-family:Calibri,Arial,sans-serif;"><font color="#FFFFFF"><b>${fmt(subtotal)}</b></font></td>
  </tr>
  <tr>
    <td colspan="3" style="padding:10pt 14pt;border-bottom:1pt solid #E2E8F0;font-size:11pt;color:#222;font-family:Calibri,Arial,sans-serif;"><font color="#222">Contingency 10%</font></td>
    <td style="padding:10pt 14pt;border-bottom:1pt solid #E2E8F0;text-align:right;font-size:11pt;color:#222;font-family:Calibri,Arial,sans-serif;"><font color="#222">${fmt(contingency)}</font></td>
  </tr>
  <tr>
    <td colspan="3" bgcolor="${b.navy}" style="padding:12pt 14pt;font-size:13pt;font-weight:bold;color:#FFFFFF;border:2pt solid ${b.gold};font-family:Calibri,Arial,sans-serif;"><font color="#FFFFFF"><b>GRAND TOTAL</b></font></td>
    <td bgcolor="${b.navy}" style="padding:12pt 14pt;text-align:right;font-size:13pt;font-weight:bold;color:#FFFFFF;border:2pt solid ${b.gold};font-family:Calibri,Arial,sans-serif;"><font color="#FFFFFF"><b>${fmt(grandTotal)}</b></font></td>
  </tr>
</table>
`;
  },

  // ═══════════════════════════════════════════════════════════════
  // PRICING STRATEGY SUMMARY — Shows confidence breakdown without revealing markup %
  // ═══════════════════════════════════════════════════════════════
  _buildPricingStrategySummaryHtml(state) {
    if (!state.bidStrategy || !state.bidStrategy.applied) return '';

    const b = this.BRAND;
    const fmt = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
        <td style="padding:8pt 14pt;border-bottom:1pt solid #E2E8F0;text-align:center;font-size:11pt;color:#222;font-family:Calibri,Arial,sans-serif;"><font color="#222">${confContingency[level]}%</font></td>
        <td style="padding:8pt 14pt;border-bottom:1pt solid #E2E8F0;text-align:right;font-size:11pt;color:#222;font-family:Calibri,Arial,sans-serif;"><font color="#222">${fmt(confTotals[level])}</font></td>
      </tr>`;
    }

    return `
<div class="page-break"></div>

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
    <td bgcolor="#2B4A6A" style="padding:10pt 14pt;font-size:11pt;font-weight:bold;color:#FFFFFF;border:1pt solid #1B2A4A;font-family:Calibri,Arial,sans-serif;" colspan="3"><font color="#FFFFFF"><b>TOTAL WITH STRATEGY</b></font></td>
    <td bgcolor="#2B4A6A" style="padding:10pt 14pt;text-align:right;font-size:11pt;font-weight:bold;color:#FFFFFF;border:1pt solid #1B2A4A;font-family:Calibri,Arial,sans-serif;"><font color="#FFFFFF"><b>${fmt(result.grandTotalWithStrategy)}</b></font></td>
  </tr>
</table>
`;
  },

  // Pre-compute and cache the BOM grand total so ALL consumers use the SAME number.
  // Delegates to _extractGrandTotal which uses the identical formula as
  // export-engine.js _getFullyLoadedTotal.
  _precomputeBOMTotal(state) {
    if (state._bomGrandTotal && state._bomGrandTotal > 1000) return; // Already computed
    const total = this._extractGrandTotal(state);
    if (total && total > 1000) {
      console.log(`[ProposalGen] Pre-computed BOM total: $${state._bomGrandTotal}`);
    }
  },

  // Extract grand total — MUST return the SAME number as export-engine.js
  // _getFullyLoadedTotal so that the proposal hero number, the BOM Excel
  // BID PRICE, the SmartPM Contract Value, and the JSON grandTotal all match.
  //
  // Formula (identical to _getFullyLoadedTotal Priority 1b):
  //   sum of filtered BOM category subtotals + 10% contingency
  _extractGrandTotal(state) {
    // Priority 1: Use cached number from _computeFullBreakdown
    if (state._bomGrandTotal && state._bomGrandTotal > 1000) {
      return state._bomGrandTotal;
    }

    // Priority 2: Compute using the SAME function as export-engine.js
    try {
      if (typeof SmartPlansExport !== 'undefined' && SmartPlansExport._computeFullBreakdown) {
        const analysis = state.aiAnalysis || '';
        let bom = SmartPlansExport._extractBOMFromAnalysis(analysis);
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
    } catch (e) { console.warn('[ProposalGen] _extractGrandTotal error:', e); }

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
      const validUntil = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
        .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const refNum = `3DTSI-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;
      const year = today.getFullYear();
      const analysisSummary = (state.aiAnalysis || '').substring(0, 12000);
      // grandTotal extracted after AI generates text (below)

      progressCallback(10, 'Crafting concise executive summary with AI…');

      const prompt = `You are the Senior Proposal Manager at ${co.name}. Write a CONCISE, HIGH-IMPACT executive proposal summary for a client. This must be short but powerful — designed for busy executives.

PROJECT: "${projName}"
TYPE: ${state.projectType || 'Low Voltage Installation'}
LOCATION: ${projLoc}
DISCIPLINES: ${disciplines}
DATE: ${dateStr}

═══ BID ANALYSIS DATA ═══
${analysisSummary}

═══ RULES ═══
- NEVER show internal costs, markups, or cost breakdowns. Show ONLY sell prices.
- Be concise but compelling. Every word must earn its place.
- Use specific quantities and data from the analysis — do NOT make up numbers.

Write EXACTLY this structure in markdown:

## Executive Summary
Write 2-3 powerful paragraphs. Open with a compelling hook about the project. State the total scope concisely. Close with why ${co.name} is the best choice. Reference BICSI RCDD, NICET, and 20+ years.

## Scope of Work
A concise bullet list of what's included, organized ONLY by the selected disciplines: ${disciplines}. Do NOT include any disciplines that are not listed. Use real quantities from the analysis data. Keep to 10-15 key items max.

## Investment Summary
Create a markdown table with these columns: | System | Description | Investment |
Include 4-8 line items that summarize the major cost categories from the analysis for the selected disciplines ONLY. Add a TOTAL row at the bottom.

## Key Differentiators
3-4 bullet points on why ${co.name} is the best choice. Keep each to 1-2 sentences max.

IMPORTANT: Keep the ENTIRE response under 800 words. Quality over quantity.`;

      const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4000 },
        _model: 'gemini-2.5-flash',
        _brainSlot: 0,
      };

      const response = await fetchWithRetry(GEMINI_CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        _timeout: 60000,
        _apiKeyRotator: () => GEMINI_CONFIG.rotateKey(),
      }, 3);

      if (!response.ok) {
        const err = await response.text();
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
              } catch (e) { /* skip malformed */ }
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

      const bodyHtml = this._markdownToHtml(aiText);

      // ─── Build the 3-page Word document ───
      const wordHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="SmartPlans v3.0 Executive">
<title>${this._esc(projName)} — Executive Proposal | ${co.name}</title>
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
  @page Section1 { mso-footer: f1; }
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

<!-- Footer -->
<div style="mso-element:footer" id="f1">
  <p style="text-align:center;font-size:8pt;font-weight:bold;color:${b.navy};text-transform:uppercase;letter-spacing:3pt;font-family:Calibri,Arial,sans-serif;margin:0;padding-top:4pt;border-top:1pt solid ${b.teal};">
    3D CONFIDENTIAL
  </p>
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
      <span style="font-size:28pt;font-weight:bold;color:${b.navy};font-family:Calibri,Arial,sans-serif;">${this._esc(projName)}</span>
    </td>
  </tr>
</table>
<p style="font-size:13pt;color:${b.gray};margin-left:24pt;margin-bottom:0;">${this._esc(projLoc)}</p>

<br><br><br><br><br><br>

<!-- Info Grid -->
<table width="100%" cellpadding="12" cellspacing="0" border="0">
  <tr>
    <td bgcolor="${b.navy}" width="50%" style="color:white;vertical-align:top;border-right:3pt solid ${b.gold};">
      <p style="font-size:7pt;color:${b.gold};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Prepared For</p>
      <p style="font-size:13pt;color:white;font-weight:bold;margin-bottom:10pt;">${this._esc(preparedFor)}</p>
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

<!-- Valid until -->
<p style="font-size:8pt;color:${b.gray};text-align:center;margin-top:10pt;">
  This proposal is valid for thirty (30) calendar days from ${dateStr} &middot; Valid until ${validUntil}
</p>

<!--
═══════════════════════════════════════════════════════════
PAGE 2 — EXECUTIVE SUMMARY, SCOPE & PRICING TABLE
═══════════════════════════════════════════════════════════
-->
<div class="page-break"></div>

<!-- Teal header bar for page 2 -->
<table width="100%" cellpadding="8" cellspacing="0" border="0" style="margin-bottom:16pt;">
  <tr>
    <td bgcolor="${b.navy}" style="border-bottom:3pt solid ${b.gold};">
      <span style="font-size:10pt;color:${b.gold};text-transform:uppercase;letter-spacing:3pt;font-weight:bold;">${this._esc(projName)}</span>
      <span style="font-size:9pt;color:rgba(255,255,255,0.6);float:right;">${co.name}</span>
    </td>
  </tr>
</table>

${bodyHtml}

<!--
═══════════════════════════════════════════════════════════
PAGE 3 — TOTAL INVESTMENT & SIGNATURE
═══════════════════════════════════════════════════════════
-->
<div class="page-break"></div>

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

<p style="font-size:9pt;color:${b.gray};text-align:center;margin-bottom:20pt;">
  Pricing valid for thirty (30) calendar days from ${dateStr}.<br>
  All prices subject to material availability at time of contract execution.
</p>

<!-- Acceptance Section -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8pt;">
  <tr><td bgcolor="${b.teal}" style="height:3pt;font-size:1pt;">&nbsp;</td></tr>
</table>
<h2 style="border-bottom:none;margin-top:12pt;">Acceptance &amp; Authorization</h2>

<p style="font-size:10pt;">By executing this document, the authorized representative accepts this proposal in its entirety. This constitutes a binding contract upon signature by both parties.</p>

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

</div></body></html>`;

      progressCallback(90, 'Creating downloadable document…');

      // Download
      const blob = new Blob([wordHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = projName.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_');
      a.href = url;
      a.download = `${safeName}_Executive_Proposal.doc`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);

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
