// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — PROFESSIONAL PROPOSAL GENERATOR
// Fortune 500-grade client proposals for 3D Technology Services Inc.
// Downloads as a Word document (.doc) — no popups needed
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

    // Extract pricing summary from AI analysis
    const analysisSummary = (state.aiAnalysis || '').substring(0, 12000);

    progressCallback(5, 'Crafting executive proposal with AI…');

    const prompt = `You are a Fortune 500 proposal writer for ${co.name}, a premier low-voltage technology integrator. Generate a COMPLETE, HIGHLY DETAILED professional proposal document.

PROJECT: "${projName}"
TYPE: ${projType}
LOCATION: ${projLoc}
DISCIPLINES: ${disciplines}
DATE: ${dateStr}
VALID UNTIL: ${validUntil}

ANALYSIS DATA (use real numbers from this):
${analysisSummary}

Write the proposal in these EXACT sections with rich, professional detail. Use real quantities and costs from the analysis data above. Do NOT use placeholder text.

1. EXECUTIVE SUMMARY (2-3 paragraphs — why 3D TSI is uniquely qualified, project overview, value proposition)

2. COMPANY QUALIFICATIONS
   - 20+ years of excellence in low-voltage technology integration
   - Certified technicians (BICSI RCDD, NICET, manufacturer certifications)
   - Fortune 500 and government project experience
   - Safety record and insurance coverage
   - Quality assurance and warranty programs

3. SCOPE OF WORK (detailed by discipline — list every deliverable with quantities from the analysis)

4. TECHNICAL APPROACH & METHODOLOGY
   - Pre-construction planning and coordination
   - Installation standards (BICSI, TIA/EIA, NFPA, NEC compliance)
   - Quality control checkpoints
   - Testing and commissioning procedures
   - As-built documentation

5. PROJECT TIMELINE (realistic phased schedule with milestones)

6. PRICING SUMMARY (use ACTUAL costs from the analysis — material, labor, equipment totals with line items)

7. TERMS & CONDITIONS
   - Payment schedule (net 30)
   - Change order process
   - Warranty (1-year parts and labor, manufacturer warranties)
   - Insurance and bonding
   - Exclusions and clarifications

8. WHY CHOOSE 3D TECHNOLOGY SERVICES
   - Single-source accountability
   - Dedicated project management
   - 24/7 emergency support
   - Post-installation training
   - Scalable solutions for future growth

Output ONLY the proposal body text. Use markdown headers (##) for sections. Be specific, professional, and compelling. Every paragraph should demonstrate expertise and instill confidence.`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 8192,
      },
      _model: GEMINI_CONFIG.model,
      _brainSlot: 17,
    };

    progressCallback(15, 'AI is drafting your proposal…');

    const response = await fetchWithRetry(GEMINI_CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      _timeout: 90000,
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

    progressCallback(60, 'Rendering Word document…');
    return proposalText;
  },

  // ─── Generate and download as Word document ──────────────────
  async renderAndDownload(state, progressCallback, _unused) {
    try {
      const proposalText = await this.generateProposal(state, progressCallback);
      progressCallback(70, 'Building Word document…');
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
    const projName = state.projectName || 'Untitled Project';
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Convert markdown to styled HTML
    let bodyHtml = this._markdownToHtml(proposalText);

    progressCallback(85, 'Formatting Word document…');

    // Word-compatible HTML document
    const wordHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="SmartPlans Proposal Generator">
<title>Proposal — ${this._esc(projName)} | ${co.name}</title>
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
  @page { size: 8.5in 11in; margin: 0.75in 0.85in; }
  body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1a1a2e; }
  .cover-page { page-break-after: always; text-align: center; padding-top: 2in; }
  .cover-accent-bar { height: 6px; background: #003366; margin: -0.75in -0.85in 2in -0.85in; }
  .cover-company { font-size: 26pt; font-weight: bold; color: #003366; margin-bottom: 4px; }
  .cover-tagline { font-size: 10pt; color: #666; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 36px; }
  .cover-divider { width: 120px; height: 3px; background: #003366; margin: 0 auto 36px; }
  .cover-title-label { font-size: 10pt; color: #999; text-transform: uppercase; letter-spacing: 3px; font-weight: 600; margin-bottom: 10px; }
  .cover-project-name { font-size: 20pt; font-weight: bold; color: #1a1a2e; margin-bottom: 36px; line-height: 1.3; }
  .cover-meta-table { border-collapse: collapse; margin: 0 auto; text-align: left; }
  .cover-meta-table td { padding: 5px 14px; font-size: 10pt; border: none; }
  .cover-meta-label { color: #888; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; font-size: 8.5pt; }
  .cover-meta-value { color: #1a1a2e; font-weight: 500; }
  .cover-confidential { display: inline-block; padding: 4px 16px; border: 1px solid #ccc; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 2px; color: #999; font-weight: 600; margin-top: 80px; }
  h2 { font-size: 16pt; font-weight: bold; color: #003366; margin-top: 28px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #003366; page-break-after: avoid; }
  h3 { font-size: 13pt; font-weight: bold; color: #004488; margin-top: 18px; margin-bottom: 8px; page-break-after: avoid; }
  h4 { font-size: 11pt; font-weight: bold; color: #1a1a2e; margin-top: 12px; margin-bottom: 5px; }
  p { margin: 0 0 8px; }
  ul, ol { margin: 0 0 10px 20px; padding: 0; }
  li { margin-bottom: 3px; }
  strong { color: #003366; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; font-size: 9.5pt; page-break-inside: avoid; }
  th { background: #003366; color: #fff; padding: 7px 10px; text-align: left; font-weight: 600; font-size: 8.5pt; text-transform: uppercase; border: 1px solid #003366; }
  td { padding: 6px 10px; border: 1px solid #ddd; vertical-align: top; }
  .signature-block { page-break-inside: avoid; margin-top: 40px; padding-top: 24px; border-top: 2px solid #003366; }
  .sig-table { border-collapse: collapse; width: 100%; }
  .sig-table td { border: none; padding: 4px 20px; vertical-align: top; width: 50%; }
  .sig-heading { font-size: 10pt; color: #003366; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 20px; }
  .sig-line { border-bottom: 1px solid #333; height: 30px; margin-bottom: 4px; }
  .sig-label { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 16px; }
  .sig-prefilled { font-size: 10pt; font-weight: 600; color: #1a1a2e; }
  .sig-prefilled-sub { font-size: 9pt; color: #666; }
  .doc-footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e5e5e5; text-align: center; font-size: 8pt; color: #aaa; }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover-page">
  <div class="cover-accent-bar"></div>
  <div class="cover-company">${co.name}</div>
  <div class="cover-tagline">Premier Low-Voltage Technology Integration</div>
  <div class="cover-divider"></div>
  <div class="cover-title-label">Professional Proposal</div>
  <div class="cover-project-name">${this._esc(projName)}</div>
  <table class="cover-meta-table">
    <tr><td class="cover-meta-label">Prepared For</td><td class="cover-meta-value">${this._esc(projName)}</td></tr>
    <tr><td class="cover-meta-label">Location</td><td class="cover-meta-value">${this._esc(state.projectLocation || 'As Specified')}</td></tr>
    <tr><td class="cover-meta-label">Date</td><td class="cover-meta-value">${dateStr}</td></tr>
    <tr><td class="cover-meta-label">Prepared By</td><td class="cover-meta-value">${co.consultant}, ${co.title}</td></tr>
    <tr><td class="cover-meta-label">Contact</td><td class="cover-meta-value">${co.email} · ${co.phone}</td></tr>
    <tr><td class="cover-meta-label">Address</td><td class="cover-meta-value">${co.address}, ${co.cityStateZip}</td></tr>
  </table>
  <div class="cover-confidential">Confidential — Proprietary Information</div>
</div>

<!-- PROPOSAL BODY -->
<div class="proposal-body">
${bodyHtml}
</div>

<!-- SIGNATURE BLOCK -->
<div class="signature-block">
  <h2>Acceptance &amp; Authorization</h2>
  <p>By signing below, the authorized representative of the Client accepts this proposal, including all terms, conditions, scope of work, and pricing as described herein. This proposal is valid for thirty (30) days from the date of issuance.</p>
  <table class="sig-table">
    <tr>
      <td>
        <div class="sig-heading">${co.name}</div>
        <div class="sig-line"></div>
        <div class="sig-label">Signature</div>
        <div class="sig-prefilled">${co.consultant}</div>
        <div class="sig-prefilled-sub">${co.title}</div>
        <div class="sig-prefilled-sub">${co.email}</div>
        <div class="sig-prefilled-sub">${co.phone}</div>
        <br>
        <div class="sig-line" style="width:200px;"></div>
        <div class="sig-label">Date</div>
      </td>
      <td>
        <div class="sig-heading">Client Acceptance</div>
        <div class="sig-line"></div>
        <div class="sig-label">Authorized Signature</div>
        <div class="sig-line"></div>
        <div class="sig-label">Printed Name &amp; Title</div>
        <div class="sig-line" style="width:200px;"></div>
        <div class="sig-label">Date</div>
      </td>
    </tr>
  </table>
</div>

<!-- FOOTER -->
<div class="doc-footer">
  <div>${co.name} &middot; ${co.address}, ${co.cityStateZip}</div>
  <div>${co.consultant} &middot; ${co.email} &middot; ${co.phone}</div>
  <div>This document is confidential and proprietary. &copy; ${today.getFullYear()} ${co.name}. All rights reserved.</div>
</div>

</body>
</html>`;

    // Download as .doc file — Word opens HTML .doc files natively
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
      spToast('Proposal downloaded as Word document ✓');
    }
  },

  // ─── Markdown → HTML converter ─────────────────────────────
  _markdownToHtml(md) {
    if (!md) return '';
    let html = this._esc(md);

    // Horizontal rules
    html = html.replace(/^-{3,}$/gm, '<hr style="border:none;border-top:2px solid #e5e5e5;margin:24px 0;">');

    // Headers
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h2 style="font-size:18pt;">$1</h2>');

    // Bold and italic
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
        tHtml += '<tr>';
        cells.forEach(cell => { tHtml += `<${tag}>${cell.trim()}</${tag}>`; });
        tHtml += '</tr>';
      });
      tHtml += '</table>';
      return tHtml;
    });

    // Bullet lists
    html = html.replace(/^(\s*)[-*] (.+)$/gm, (m, indent, text) => {
      return `<li style="margin-left:${indent.length > 2 ? 20 : 0}px;">${text}</li>`;
    });
    html = html.replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');

    // Numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Paragraphs
    html = html.replace(/\n{2,}/g, '</p><p>');
    if (!html.startsWith('<')) html = '<p>' + html;
    if (!html.endsWith('>')) html += '</p>';

    return html;
  },

  // ─── HTML Escape ───────────────────────────────────────────
  _esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  },
};

// Make available globally
if (typeof window !== 'undefined') {
  window.ProposalGenerator = ProposalGenerator;
}
