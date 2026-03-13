// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — PROFESSIONAL PROPOSAL GENERATOR v2.0
// Fortune 500-grade client proposals for 3D Technology Services Inc.
// Downloads as a Word document (.doc) — brand-matched to 3dtsi.com
// ═══════════════════════════════════════════════════════════════

const ProposalGenerator = {

  // ─── Company Info ───────────────────────────────────────────
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

  // ─── Brand Colors (matched to 3dtsi.com) ───────────────────
  BRAND: {
    gold: '#EBB328',
    goldDark: '#D4A01E',
    teal: '#3B97A1',
    tealDark: '#2B828B',
    navy: '#1B2A4A',
    dark: '#1a1a2e',
    gray: '#4A5568',
    lightGray: '#F8F9FA',
    border: '#E2E8F0',
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

    const analysisSummary = (state.aiAnalysis || '').substring(0, 12000);

    progressCallback(5, 'Crafting executive proposal with AI…');

    const prompt = `You are a Fortune 500 proposal writer for ${co.name}, a premier low-voltage technology integrator headquartered in Rancho Cordova, California. Generate a COMPLETE, HIGHLY DETAILED, PROFESSIONALLY WRITTEN proposal document.

PROJECT: "${projName}"
TYPE: ${projType}
LOCATION: ${projLoc}
DISCIPLINES: ${disciplines}
DATE: ${dateStr}
VALID UNTIL: ${validUntil}

BID ANALYSIS DATA (use real numbers from this data — do NOT invent numbers):
${analysisSummary}

CRITICAL INSTRUCTIONS:
- Write 8-12 pages of thorough, executive-level content
- Use REAL quantities, costs, and material counts from the analysis data above
- Every section must have substantial detail — no one-liner sections
- Write paragraphs, not just bullet points — this must read like a Fortune 500 RFP response
- Be specific about 3D Technology Services capabilities
- Reference actual industry standards (BICSI, TIA-568, NFPA 72, NEC Article 725/760/770/800)

Write the proposal in these EXACT sections:

## 1. Executive Summary
3 full paragraphs minimum. Open with a powerful statement about the project's importance. Explain why ${co.name} is the definitive choice — 20+ years of systems integration excellence, BICSI RCDD & NICET certified technicians, Fortune 500 client portfolio. End with a compelling value proposition that differentiates 3D TSI from every competitor.

## 2. Company Qualifications & Experience
Write rich, detailed paragraphs covering:
- Company history (20+ years in low-voltage technology integration)
- BICSI Registered Communications Distribution Designer (RCDD) credentials
- NICET Fire Alarm certified technicians
- Manufacturer certifications and partnerships
- Fortune 500, healthcare, government, and educational project experience
- Safety record (OSHA compliant, EMR rating, safety programs)
- $5M+ general liability, workers compensation, bonding capacity
- Quality Management System based on ISO 9001 principles

## 3. Detailed Scope of Work
Break down EVERY deliverable by discipline from the analysis. Use the actual material counts and system descriptions. Each discipline should have its own subsection (### heading) with bullet points of specific deliverables and quantities.

## 4. Technical Approach & Methodology
Detailed paragraphs for each phase:
- Pre-Construction: Site survey, coordination meetings, submittal process, material procurement
- Rough-In Phase: Pathway installation, cable tray, conduit, J-hooks, fire stopping, backing boards
- Trim-Out Phase: Device installation, cable termination, labeling per TIA-606
- Testing & Commissioning: Category cable certification (Fluke DSX), fiber OTDR testing, system programming
- Project Closeout: As-built drawings, O&M manuals, warranty registration, training

## 5. Project Timeline & Milestones
Provide a realistic phased schedule. Include:
- Mobilization & submittals
- Rough-in phase
- Trim-out & device installation
- System programming & testing
- Commissioning & client training
- Project closeout & final documentation

## 6. Investment Summary
Use a professional pricing table with these columns: Description | Quantity | Unit | Unit Price | Extended Price
Include subtotals for Material, Labor, Equipment, and a Grand Total.
Use REAL numbers from the analysis data.

## 7. Terms & Conditions
Comprehensive terms including:
- Payment terms (Net 30 from invoice date, progress billing for projects over $50,000)
- Change order process and pricing
- Warranty coverage (1-year comprehensive parts and labor, manufacturer warranties pass-through)
- Insurance coverage ($5M general liability, workers compensation, auto)
- Performance and payment bonding availability
- Exclusions and clarifications (above-ceiling access, permits, patching/painting/core drilling unless specified)
- Force majeure provisions

## 8. Why Choose 3D Technology Services
Write a compelling closing with:
- Single-source accountability from design through ongoing support
- Dedicated project manager assigned to every project
- 24/7/365 emergency service and support
- Comprehensive post-installation training and documentation
- Technology refresh and scalability planning
- Local presence with nationwide capabilities
- References available upon request

Output ONLY the proposal body text. Use markdown headers (## for sections, ### for subsections). Write like a senior proposal manager at a Fortune 500 company. Every paragraph should demonstrate deep expertise and instill absolute confidence.`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 16384,
      },
      _model: 'gemini-3.1-pro-preview',
      _brainSlot: 17,
    };

    progressCallback(15, 'AI is drafting your Fortune 500 proposal…');

    const response = await fetchWithRetry(GEMINI_CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      _timeout: 120000,
      _apiKeyRotator: () => GEMINI_CONFIG.rotateKey(),
    }, 3);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const allParts = data?.candidates?.[0]?.content?.parts || [];
    const proposalText = allParts.filter(p => p.text && !p.thought).map(p => p.text).join('\n') || '';

    if (!proposalText || proposalText.length < 200) {
      throw new Error('AI returned insufficient proposal content. Please try again.');
    }

    progressCallback(60, 'Building Word document…');
    return proposalText;
  },

  // ─── Generate and download as Word document ──────────────────
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

  // ─── Build Word-compatible HTML and trigger download ────────
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

    let bodyHtml = this._markdownToHtml(proposalText);
    progressCallback(85, 'Creating downloadable document…');

    const wordHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="SmartPlans Proposal Generator v2.0">
<title>${this._esc(projName)} — Proposal | ${co.name}</title>
<!--[if gte mso 9]>
<xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml>
<![endif]-->
<style>
  /* ═════════════════════════════════════════════════════════════
     3D TECHNOLOGY SERVICES — PROFESSIONAL PROPOSAL STYLES
     Brand Colors: Gold #EBB328 | Teal #3B97A1 | Navy #1B2A4A
     ═════════════════════════════════════════════════════════════ */

  @page { size: 8.5in 11in; margin: 0.8in 1in; }

  body {
    font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.7;
    color: ${b.dark};
    margin: 0;
    padding: 0;
  }

  /* ══════════════════════════════════════════════════════════
     COVER PAGE — Full-page, premium corporate design
     ══════════════════════════════════════════════════════════ */
  .cover-page {
    page-break-after: always;
    position: relative;
    min-height: 9in;
    padding: 0;
    text-align: left;
  }

  /* Top accent bar with brand gradient */
  .cover-top-bar {
    height: 8px;
    background: linear-gradient(90deg, ${b.teal}, ${b.gold});
    margin: -0.8in -1in 0 -1in;
  }

  /* Company header section */
  .cover-header {
    margin-top: 1.2in;
    padding-bottom: 30px;
    border-bottom: 3px solid ${b.teal};
  }

  .cover-company-name {
    font-size: 28pt;
    font-weight: bold;
    color: ${b.teal};
    letter-spacing: -0.5px;
    margin: 0 0 2px 0;
    line-height: 1.2;
  }

  .cover-company-sub {
    font-size: 11pt;
    color: ${b.gold};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 3px;
    margin: 0;
  }

  /* Main proposal title section */
  .cover-title-section {
    margin-top: 1in;
    margin-bottom: 0.8in;
  }

  .cover-doc-type {
    font-size: 12pt;
    color: ${b.teal};
    text-transform: uppercase;
    letter-spacing: 4px;
    font-weight: 600;
    margin-bottom: 12px;
  }

  .cover-project-name {
    font-size: 26pt;
    font-weight: bold;
    color: ${b.navy};
    line-height: 1.25;
    margin-bottom: 8px;
    border-left: 5px solid ${b.gold};
    padding-left: 20px;
  }

  .cover-project-location {
    font-size: 13pt;
    color: ${b.gray};
    margin-top: 8px;
    padding-left: 25px;
  }

  /* Info grid */
  .cover-info-grid {
    border-collapse: collapse;
    margin-top: 0.6in;
    width: 100%;
  }

  .cover-info-grid td {
    padding: 10px 0;
    font-size: 10.5pt;
    border: none;
    vertical-align: top;
  }

  .cover-info-grid .info-left {
    width: 50%;
    padding-right: 30px;
  }

  .cover-info-grid .info-right {
    width: 50%;
    padding-left: 30px;
    border-left: 1px solid ${b.border};
  }

  .cover-info-label {
    font-size: 8pt;
    color: ${b.teal};
    text-transform: uppercase;
    letter-spacing: 2px;
    font-weight: 700;
    margin-bottom: 3px;
  }

  .cover-info-value {
    font-size: 10.5pt;
    color: ${b.dark};
    font-weight: 500;
  }

  .cover-info-row {
    margin-bottom: 16px;
  }

  /* Bottom confidential bar */
  .cover-bottom {
    position: absolute;
    bottom: 0;
    left: -1in;
    right: -1in;
    background: ${b.navy};
    padding: 14px 1in;
    color: rgba(255,255,255,0.7);
    font-size: 8pt;
    text-transform: uppercase;
    letter-spacing: 2px;
    text-align: center;
  }

  .cover-ref {
    color: ${b.gold};
    font-weight: 600;
  }

  /* ══════════════════════════════════════════════════════════
     TABLE OF CONTENTS PAGE
     ══════════════════════════════════════════════════════════ */
  .toc-page {
    page-break-after: always;
    padding-top: 0.5in;
  }

  .toc-title {
    font-size: 20pt;
    font-weight: bold;
    color: ${b.navy};
    margin-bottom: 30px;
    padding-bottom: 12px;
    border-bottom: 3px solid ${b.teal};
  }

  .toc-item {
    display: block;
    padding: 10px 0;
    border-bottom: 1px solid ${b.border};
    font-size: 11pt;
    color: ${b.dark};
    text-decoration: none;
  }

  .toc-num {
    display: inline-block;
    width: 40px;
    font-weight: 700;
    color: ${b.teal};
    font-size: 12pt;
  }

  .toc-text {
    font-weight: 500;
  }

  /* ══════════════════════════════════════════════════════════
     BODY — Section Headers, Text, Tables
     ══════════════════════════════════════════════════════════ */
  .proposal-body {
    text-align: left;
  }

  h2 {
    font-size: 16pt;
    font-weight: bold;
    color: ${b.navy};
    margin-top: 36px;
    margin-bottom: 14px;
    padding-bottom: 8px;
    border-bottom: 3px solid ${b.teal};
    page-break-after: avoid;
    text-align: left;
  }

  h3 {
    font-size: 13pt;
    font-weight: bold;
    color: ${b.teal};
    margin-top: 22px;
    margin-bottom: 8px;
    padding-left: 12px;
    border-left: 4px solid ${b.gold};
    page-break-after: avoid;
    text-align: left;
  }

  h4 {
    font-size: 11pt;
    font-weight: bold;
    color: ${b.dark};
    margin-top: 14px;
    margin-bottom: 5px;
    text-align: left;
  }

  p {
    margin: 0 0 10px;
    text-align: left;
    line-height: 1.7;
  }

  ul, ol {
    margin: 0 0 12px 24px;
    padding: 0;
    text-align: left;
  }

  li {
    margin-bottom: 4px;
    line-height: 1.6;
    text-align: left;
  }

  strong { color: ${b.navy}; }

  /* Professional Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0 20px;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }

  th {
    background: ${b.navy};
    color: #fff;
    padding: 9px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border: 1px solid ${b.navy};
  }

  td {
    padding: 8px 12px;
    border: 1px solid ${b.border};
    vertical-align: top;
    text-align: left;
  }

  tr:nth-child(even) td { background: ${b.lightGray}; }

  /* Highlight row for totals */
  .total-row td {
    background: ${b.navy} !important;
    color: #fff !important;
    font-weight: 700;
    font-size: 10pt;
  }

  /* ══════════════════════════════════════════════════════════
     SIGNATURE BLOCK
     ══════════════════════════════════════════════════════════ */
  .signature-block {
    page-break-inside: avoid;
    margin-top: 50px;
    padding-top: 30px;
    border-top: 3px solid ${b.teal};
  }

  .sig-title {
    font-size: 16pt;
    font-weight: bold;
    color: ${b.navy};
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 3px solid ${b.teal};
  }

  .sig-intro {
    font-size: 10pt;
    color: ${b.gray};
    margin-bottom: 30px;
    line-height: 1.6;
  }

  .sig-table { border-collapse: collapse; width: 100%; }
  .sig-table td { border: none; padding: 5px 24px; vertical-align: top; width: 50%; }

  .sig-heading {
    font-size: 11pt;
    color: ${b.teal};
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 24px;
    padding-bottom: 6px;
    border-bottom: 2px solid ${b.gold};
  }

  .sig-line {
    border-bottom: 1px solid #333;
    height: 32px;
    margin-bottom: 4px;
  }

  .sig-label {
    font-size: 8pt;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
    margin-bottom: 18px;
  }

  .sig-prefilled {
    font-size: 10.5pt;
    font-weight: 600;
    color: ${b.dark};
  }

  .sig-prefilled-sub {
    font-size: 9pt;
    color: ${b.gray};
  }

  /* ══════════════════════════════════════════════════════════
     FOOTER
     ══════════════════════════════════════════════════════════ */
  .doc-footer {
    margin-top: 50px;
    padding-top: 14px;
    border-top: 2px solid ${b.teal};
    text-align: center;
    font-size: 8.5pt;
    color: ${b.gray};
  }

  .footer-company {
    font-weight: 700;
    color: ${b.teal};
    font-size: 9pt;
    margin-bottom: 2px;
  }

  .footer-copy {
    color: #aaa;
    font-size: 7.5pt;
    margin-top: 6px;
  }
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════════
     COVER PAGE
     ═══════════════════════════════════════════════════════════ -->
<div class="cover-page">
  <div class="cover-top-bar"></div>

  <div class="cover-header">
    <div class="cover-company-name">${co.name}</div>
    <div class="cover-company-sub">Systems Integration &amp; Technology Solutions</div>
  </div>

  <div class="cover-title-section">
    <div class="cover-doc-type">Professional Proposal</div>
    <div class="cover-project-name">${this._esc(projName)}</div>
    <div class="cover-project-location">${this._esc(projLoc)}</div>
  </div>

  <table class="cover-info-grid">
    <tr>
      <td class="info-left">
        <div class="cover-info-row">
          <div class="cover-info-label">Prepared For</div>
          <div class="cover-info-value">${this._esc(projName)}</div>
        </div>
        <div class="cover-info-row">
          <div class="cover-info-label">Project Location</div>
          <div class="cover-info-value">${this._esc(projLoc)}</div>
        </div>
        <div class="cover-info-row">
          <div class="cover-info-label">Date Submitted</div>
          <div class="cover-info-value">${dateStr}</div>
        </div>
        <div class="cover-info-row">
          <div class="cover-info-label">Valid Until</div>
          <div class="cover-info-value">${validUntil}</div>
        </div>
      </td>
      <td class="info-right">
        <div class="cover-info-row">
          <div class="cover-info-label">Prepared By</div>
          <div class="cover-info-value">${co.consultant}</div>
          <div class="cover-info-value" style="font-weight:400;color:${b.gray};font-size:9.5pt;">${co.title}</div>
        </div>
        <div class="cover-info-row">
          <div class="cover-info-label">Contact</div>
          <div class="cover-info-value">${co.email}</div>
          <div class="cover-info-value">${co.phone}</div>
        </div>
        <div class="cover-info-row">
          <div class="cover-info-label">Corporate Office</div>
          <div class="cover-info-value">${co.address}</div>
          <div class="cover-info-value">${co.cityStateZip}</div>
        </div>
        <div class="cover-info-row">
          <div class="cover-info-label">Reference Number</div>
          <div class="cover-info-value">${refNum}</div>
        </div>
      </td>
    </tr>
  </table>

  <div class="cover-bottom">
    <span class="cover-ref">${co.name}</span> &nbsp;&middot;&nbsp; Confidential &amp; Proprietary &nbsp;&middot;&nbsp; ${co.website}
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     TABLE OF CONTENTS
     ═══════════════════════════════════════════════════════════ -->
<div class="toc-page">
  <div class="toc-title">Table of Contents</div>
  <div class="toc-item"><span class="toc-num">01</span> <span class="toc-text">Executive Summary</span></div>
  <div class="toc-item"><span class="toc-num">02</span> <span class="toc-text">Company Qualifications &amp; Experience</span></div>
  <div class="toc-item"><span class="toc-num">03</span> <span class="toc-text">Detailed Scope of Work</span></div>
  <div class="toc-item"><span class="toc-num">04</span> <span class="toc-text">Technical Approach &amp; Methodology</span></div>
  <div class="toc-item"><span class="toc-num">05</span> <span class="toc-text">Project Timeline &amp; Milestones</span></div>
  <div class="toc-item"><span class="toc-num">06</span> <span class="toc-text">Investment Summary</span></div>
  <div class="toc-item"><span class="toc-num">07</span> <span class="toc-text">Terms &amp; Conditions</span></div>
  <div class="toc-item"><span class="toc-num">08</span> <span class="toc-text">Why Choose 3D Technology Services</span></div>
  <div class="toc-item"><span class="toc-num">09</span> <span class="toc-text">Acceptance &amp; Authorization</span></div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     PROPOSAL BODY (AI-generated content)
     ═══════════════════════════════════════════════════════════ -->
<div class="proposal-body">
${bodyHtml}
</div>

<!-- ═══════════════════════════════════════════════════════════
     SIGNATURE / ACCEPTANCE BLOCK
     ═══════════════════════════════════════════════════════════ -->
<div class="signature-block">
  <div class="sig-title">Acceptance &amp; Authorization</div>
  <div class="sig-intro">
    By signing below, the authorized representative of the Client accepts this proposal, including all terms, conditions, scope of work, and pricing as described herein. This proposal and the pricing contained within are valid for thirty (30) calendar days from the date of issuance (${dateStr}). This proposal supersedes any previous proposals or communications regarding the same scope of work.
  </div>

  <table class="sig-table">
    <tr>
      <td>
        <div class="sig-heading">${co.name}</div>
        <div class="sig-line"></div>
        <div class="sig-label">Authorized Signature</div>
        <div class="sig-prefilled">${co.consultant}</div>
        <div class="sig-prefilled-sub">${co.title}</div>
        <div class="sig-prefilled-sub">${co.email}</div>
        <div class="sig-prefilled-sub">${co.phone}</div>
        <br>
        <div class="sig-line" style="width:220px;"></div>
        <div class="sig-label">Date</div>
      </td>
      <td>
        <div class="sig-heading">Client Acceptance</div>
        <div class="sig-line"></div>
        <div class="sig-label">Authorized Signature</div>
        <div class="sig-line"></div>
        <div class="sig-label">Printed Name</div>
        <div class="sig-line"></div>
        <div class="sig-label">Title / Position</div>
        <div class="sig-line"></div>
        <div class="sig-label">Company Name</div>
        <div class="sig-line" style="width:220px;"></div>
        <div class="sig-label">Date</div>
      </td>
    </tr>
  </table>
</div>

<!-- ═══════════════════════════════════════════════════════════
     DOCUMENT FOOTER
     ═══════════════════════════════════════════════════════════ -->
<div class="doc-footer">
  <div class="footer-company">${co.name}</div>
  <div>${co.address}, ${co.cityStateZip} &nbsp;|&nbsp; ${co.mainPhone} &nbsp;|&nbsp; ${co.website}</div>
  <div>${co.consultant}, ${co.title} &nbsp;|&nbsp; ${co.email} &nbsp;|&nbsp; ${co.phone}</div>
  <div class="footer-copy">&copy; ${today.getFullYear()} ${co.name}. All rights reserved. This document contains confidential and proprietary information.</div>
</div>

</body>
</html>`;

    // Download as .doc — Word opens HTML .doc files natively with full formatting
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
    if (typeof spToast === 'function') {
      spToast('✓ Professional proposal downloaded — open in Microsoft Word');
    }
  },

  // ─── Markdown → HTML converter ─────────────────────────────
  _markdownToHtml(md) {
    if (!md) return '';
    let html = this._esc(md);

    html = html.replace(/^-{3,}$/gm, '<hr style="border:none;border-top:2px solid #E2E8F0;margin:28px 0;">');
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h2 style="font-size:18pt;">$1</h2>');
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Tables
    html = html.replace(/((?:^\|.+\|$\n?)+)/gm, (tableBlock) => {
      const rows = tableBlock.trim().split('\n').filter(r => r.trim());
      if (rows.length < 2) return tableBlock;
      let tHtml = '<table>';
      rows.forEach((row, idx) => {
        const cells = row.split('|').filter(c => c.trim() !== '');
        if (cells.every(c => /^[\s\-:]+$/.test(c))) return;
        const tag = idx === 0 ? 'th' : 'td';
        const isLast = idx === rows.length - 1;
        const cellText = cells.map(c => c.trim()).join('');
        const isTotalRow = isLast && (cellText.toLowerCase().includes('total') || cellText.toLowerCase().includes('grand'));
        tHtml += isTotalRow ? '<tr class="total-row">' : '<tr>';
        cells.forEach(cell => { tHtml += `<${tag}>${cell.trim()}</${tag}>`; });
        tHtml += '</tr>';
      });
      tHtml += '</table>';
      return tHtml;
    });

    // Lists
    html = html.replace(/^(\s*)[-*] (.+)$/gm, (m, indent, text) => {
      return `<li style="margin-left:${indent.length > 2 ? 20 : 0}px;">${text}</li>`;
    });
    html = html.replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Paragraphs
    html = html.replace(/\n{2,}/g, '</p><p>');
    if (!html.startsWith('<')) html = '<p>' + html;
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
