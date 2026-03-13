// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — PROFESSIONAL PROPOSAL GENERATOR v3.0
// Fortune 500-grade Microsoft Word proposals
// Uses Word-native table/bgcolor formatting (NOT modern CSS)
// ═══════════════════════════════════════════════════════════════

const ProposalGenerator = {

  COMPANY: {
    name: '3D Technology Services Inc.',
    address: '11365 Sunrise Gold Circle',
    cityStateZip: 'Rancho Cordova, CA 95742',
    consultant: 'Justin Whitton',
    title: 'Senior Sales Consultant',
    email: 'jwhitton@3dtsi.com',
    phone: '(916) 267-7319',
    mainPhone: '(916) 859-9111',
    website: 'www.3dtsi.com',
    tagline: 'Guiding Businesses to Quality Technology Solutions',
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
    const disciplines = (state.disciplines || []).join(', ') || 'Low Voltage Systems';
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const validUntil = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Pull the FULL analysis — the bid report has the real numbers
    const analysisSummary = (state.aiAnalysis || '').substring(0, 20000);

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
Create a subsection (### heading) for EACH discipline found in the analysis. Under each, provide:
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
Create a professional pricing summary using the EXACT numbers from the analysis. Include:
- Material costs by category with line items
- Labor costs by phase  
- Equipment and tool costs
- Subtotals for each category
- Grand total
USE THE REAL NUMBERS FROM THE ANALYSIS DATA ABOVE. Do not use placeholder amounts.

## 7. Terms & Conditions
Write comprehensive professional terms:
- Payment: Net 30 from invoice date, progress billing monthly for projects exceeding $50,000
- Change orders: Written authorization required, pricing per unit rates in this proposal or T&M at standard rates
- Warranty: One (1) year comprehensive parts and labor warranty, manufacturer warranties assigned to owner (typically 10-25 years on cable plant)
- Insurance: $5M general liability, workers compensation per California requirements, commercial auto liability, umbrella coverage
- Bonding: Performance and payment bonds available upon request (cost not included unless specified)
- Exclusions: Electrical power to equipment, HVAC for equipment rooms, architectural modifications, fire alarm monitoring service, permits (unless noted)
- Prevailing wage: If applicable, all labor rates comply with DIR determinations
- Force majeure: Neither party liable for delays beyond reasonable control

## 8. Why Choose 3D Technology Services
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

    const response = await fetchWithRetry(GEMINI_CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      _timeout: 180000,
      _apiKeyRotator: () => GEMINI_CONFIG.rotateKey(),
    }, 3);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const allParts = data?.candidates?.[0]?.content?.parts || [];
    const proposalText = allParts.filter(p => p.text && !p.thought).map(p => p.text).join('\n') || '';

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
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const validUntil = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const refNum = `3DTSI-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const year = today.getFullYear();
    const bodyHtml = this._markdownToHtml(proposalText);

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
    margin: 0.7in 0.85in 0.7in 0.85in;
    mso-header-margin: 0.3in;
    mso-footer-margin: 0.3in;
    mso-paper-source: 0;
  }

  @page Section1 { mso-header: h1; mso-footer: f1; }

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

<br><br><br><br>

<!-- Company Name — Large, commanding -->
<p style="font-size:32pt;font-weight:bold;color:${b.navy};margin-bottom:2pt;font-family:Calibri,Arial,sans-serif;">
  ${co.name}
</p>
<p style="font-size:11pt;color:${b.teal};text-transform:uppercase;letter-spacing:4pt;font-weight:bold;margin-bottom:0;">
  Systems Integration &amp; Technology Solutions
</p>

<!-- Gold divider line -->
<table width="200" cellpadding="0" cellspacing="0" border="0" style="margin:16pt 0 24pt 0;">
  <tr><td bgcolor="${b.gold}" style="height:3pt;font-size:1pt;">&nbsp;</td></tr>
</table>

<!-- Document Type -->
<p style="font-size:10pt;color:${b.teal};text-transform:uppercase;letter-spacing:5pt;font-weight:bold;margin-bottom:8pt;">
  Professional Proposal
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
      <p style="font-size:11pt;color:#222;font-weight:500;margin-bottom:14pt;">${this._esc(projName)}</p>

      <p style="font-size:7.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Project Location</p>
      <p style="font-size:11pt;color:#222;font-weight:500;margin-bottom:14pt;">${this._esc(projLoc)}</p>

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
      <p style="font-size:11pt;color:#222;margin-bottom:14pt;">${co.cityStateZip}</p>

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
  <tr><td style="padding:10pt 0;border-bottom:1pt solid ${b.border};"><span style="font-size:13pt;font-weight:bold;color:${b.teal};display:inline-block;width:36pt;">08</span> <span style="font-size:11pt;color:#222;">Why Choose 3D Technology Services</span></td></tr>
  <tr><td style="padding:10pt 0;border-bottom:1pt solid ${b.border};"><span style="font-size:13pt;font-weight:bold;color:${b.teal};display:inline-block;width:36pt;">09</span> <span style="font-size:11pt;color:#222;">Acceptance &amp; Authorization</span></td></tr>
</table>

<!--
═══════════════════════════════════════════════════════════
PROPOSAL BODY — AI-Generated Content
═══════════════════════════════════════════════════════════
-->
<div class="page-break"></div>

${bodyHtml}

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
    let html = this._esc(md);

    // Horizontal rules
    html = html.replace(/^-{3,}$/gm, '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16pt 0;"><tr><td bgcolor="#D1D5DB" style="height:1pt;font-size:1pt;">&nbsp;</td></tr></table>');

    // Headers
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<div class="page-break"></div><h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h2 style="font-size:20pt;">$1</h2>');

    // Bold / Italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<b><i>$1</i></b>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<b style="color:#1B2A4A;">$1</b>');
    html = html.replace(/\*(.+?)\*/g, '<i>$1</i>');

    // Tables → Word-native tables
    html = html.replace(/((?:^\|.+\|$\n?)+)/gm, (tableBlock) => {
      const rows = tableBlock.trim().split('\n').filter(r => r.trim());
      if (rows.length < 2) return tableBlock;
      let tHtml = '<table class="data-table" width="100%" cellpadding="5" cellspacing="0" border="1" bordercolor="#D1D5DB">';
      let rowNum = 0;
      rows.forEach((row, idx) => {
        const cells = row.split('|').filter(c => c.trim() !== '');
        if (cells.every(c => /^[\s\-:]+$/.test(c))) return;
        if (idx === 0) {
          tHtml += '<tr>';
          cells.forEach(cell => { tHtml += `<th bgcolor="#1B2A4A" style="color:white;padding:6pt 8pt;font-size:8pt;text-transform:uppercase;font-weight:bold;">${cell.trim()}</th>`; });
          tHtml += '</tr>';
        } else {
          rowNum++;
          const bgColor = rowNum % 2 === 0 ? ' bgcolor="#F4F6F8"' : '';
          // Check if this is a total/grand total row
          const cellText = cells.map(c => c.trim().toLowerCase()).join(' ');
          const isTotal = cellText.includes('total') || cellText.includes('grand');
          if (isTotal) {
            tHtml += '<tr>';
            cells.forEach(cell => { tHtml += `<td bgcolor="#1B2A4A" style="color:white;padding:6pt 8pt;font-weight:bold;font-size:10pt;">${cell.trim()}</td>`; });
            tHtml += '</tr>';
          } else {
            tHtml += `<tr${bgColor}>`;
            cells.forEach(cell => { tHtml += `<td style="padding:5pt 8pt;font-size:9pt;">${cell.trim()}</td>`; });
            tHtml += '</tr>';
          }
        }
      });
      tHtml += '</table>';
      return tHtml;
    });

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

  _esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  },
};

if (typeof window !== 'undefined') {
  window.ProposalGenerator = ProposalGenerator;
}
