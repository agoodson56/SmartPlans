// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — PROFESSIONAL PROPOSAL GENERATOR
// Fortune 500-grade client proposals for 3D Technology Services Inc.
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
      _brainSlot: 17,  // Use Report Writer's key slot
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

    progressCallback(60, 'Rendering PDF document…');
    return proposalText;
  },

  // ─── Render proposal to PDF and download ──────────────────
  async renderAndDownload(state, progressCallback) {
    try {
      const proposalText = await this.generateProposal(state, progressCallback);
      progressCallback(70, 'Building PDF layout…');
      this._buildPDF(state, proposalText, progressCallback);
    } catch (err) {
      console.error('[ProposalGen] Error:', err);
      if (typeof spToast === 'function') spToast('Proposal generation failed: ' + err.message, 'error');
      throw err;
    }
  },

  // ─── Build the PDF using browser print ────────────────────
  _buildPDF(state, proposalText, progressCallback) {
    const co = this.COMPANY;
    const projName = state.projectName || 'Untitled Project';
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Convert markdown to styled HTML
    let bodyHtml = this._markdownToHtml(proposalText);

    progressCallback(85, 'Formatting proposal document…');

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Please allow popups to generate the proposal PDF.');
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Proposal — ${this._esc(projName)} | ${co.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  @page {
    size: letter;
    margin: 0.75in 0.85in;
  }

  body {
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    font-size: 10.5pt;
    line-height: 1.65;
    color: #1a1a2e;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Cover Page ── */
  .cover-page {
    page-break-after: always;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    position: relative;
    padding: 2in 1in;
  }

  .cover-accent-bar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 8px;
    background: linear-gradient(90deg, #003366, #0066cc, #003366);
  }

  .cover-company {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 28pt;
    font-weight: 800;
    color: #003366;
    letter-spacing: -0.02em;
    margin-bottom: 6px;
  }

  .cover-tagline {
    font-size: 10pt;
    color: #666;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    font-weight: 500;
    margin-bottom: 48px;
  }

  .cover-divider {
    width: 120px;
    height: 3px;
    background: linear-gradient(90deg, #003366, #0066cc);
    margin: 0 auto 48px;
    border-radius: 2px;
  }

  .cover-title-label {
    font-size: 10pt;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-weight: 600;
    margin-bottom: 12px;
  }

  .cover-project-name {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 22pt;
    font-weight: 700;
    color: #1a1a2e;
    margin-bottom: 48px;
    max-width: 500px;
    line-height: 1.3;
  }

  .cover-meta-table {
    border-collapse: collapse;
    margin: 0 auto;
    text-align: left;
  }

  .cover-meta-table td {
    padding: 6px 16px;
    font-size: 9.5pt;
  }

  .cover-meta-table td:first-child {
    color: #888;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 8.5pt;
  }

  .cover-meta-table td:last-child {
    color: #1a1a2e;
    font-weight: 500;
  }

  .cover-footer {
    position: absolute;
    bottom: 1in;
    left: 0; right: 0;
    text-align: center;
    font-size: 8.5pt;
    color: #aaa;
  }

  .cover-confidential {
    display: inline-block;
    padding: 4px 16px;
    border: 1px solid #ccc;
    border-radius: 3px;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: #999;
    font-weight: 600;
  }

  /* ── Body Pages ── */
  h2 {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 16pt;
    font-weight: 700;
    color: #003366;
    margin: 32px 0 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid #003366;
    page-break-after: avoid;
  }

  h3 {
    font-size: 12pt;
    font-weight: 700;
    color: #004488;
    margin: 20px 0 8px;
    page-break-after: avoid;
  }

  h4 {
    font-size: 10.5pt;
    font-weight: 700;
    color: #1a1a2e;
    margin: 14px 0 6px;
    page-break-after: avoid;
  }

  p { margin: 0 0 10px; }

  ul, ol {
    margin: 0 0 12px 20px;
    padding: 0;
  }

  li { margin-bottom: 4px; }

  strong { color: #003366; }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 18px;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }

  th {
    background: #003366;
    color: #fff;
    padding: 8px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  td {
    padding: 7px 12px;
    border-bottom: 1px solid #e5e5e5;
    vertical-align: top;
  }

  tr:nth-child(even) td { background: #f8f9fc; }
  tr:hover td { background: #eef3f9; }

  /* ── Signature Block ── */
  .signature-block {
    page-break-inside: avoid;
    margin-top: 48px;
    padding-top: 32px;
    border-top: 2px solid #003366;
  }

  .sig-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 48px;
    margin-top: 24px;
  }

  .sig-section h4 {
    font-size: 10pt;
    color: #003366;
    margin-bottom: 24px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .sig-line {
    border-bottom: 1px solid #333;
    margin-bottom: 6px;
    min-height: 36px;
  }

  .sig-label {
    font-size: 8pt;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
    margin-bottom: 20px;
  }

  .sig-prefilled {
    font-size: 10pt;
    font-weight: 600;
    color: #1a1a2e;
    margin-bottom: 2px;
  }

  .sig-prefilled-sub {
    font-size: 8.5pt;
    color: #666;
    margin-bottom: 0;
  }

  /* ── Page Footer ── */
  .page-footer {
    position: fixed;
    bottom: 0;
    left: 0; right: 0;
    padding: 8px 0.85in;
    font-size: 7.5pt;
    color: #aaa;
    border-top: 1px solid #e5e5e5;
    display: flex;
    justify-content: space-between;
    background: #fff;
  }

  @media print {
    .no-print { display: none !important; }
    body { background: #fff; }
  }

  /* ── Print Button (screen only) ── */
  .print-actions {
    position: fixed;
    top: 16px;
    right: 16px;
    display: flex;
    gap: 8px;
    z-index: 9999;
  }

  .print-actions button {
    padding: 10px 24px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-print {
    background: #003366;
    color: #fff;
  }

  .btn-print:hover {
    background: #004488;
  }

  .btn-close-prop {
    background: #eee;
    color: #333;
  }
</style>
</head>
<body>

<!-- Print Buttons -->
<div class="print-actions no-print">
  <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
  <button class="btn-close-prop" onclick="window.close()">✕ Close</button>
</div>

<!-- ═══ COVER PAGE ═══ -->
<div class="cover-page">
  <div class="cover-accent-bar"></div>

  <div class="cover-company">${co.name}</div>
  <div class="cover-tagline">Premier Low-Voltage Technology Integration</div>

  <div class="cover-divider"></div>

  <div class="cover-title-label">Professional Proposal</div>
  <div class="cover-project-name">${this._esc(projName)}</div>

  <table class="cover-meta-table">
    <tr><td>Prepared For</td><td>${this._esc(projName)}</td></tr>
    <tr><td>Location</td><td>${this._esc(state.projectLocation || 'As Specified')}</td></tr>
    <tr><td>Date</td><td>${dateStr}</td></tr>
    <tr><td>Prepared By</td><td>${co.consultant}, ${co.title}</td></tr>
    <tr><td>Contact</td><td>${co.email} · ${co.phone}</td></tr>
    <tr><td>Address</td><td>${co.address}, ${co.cityStateZip}</td></tr>
  </table>

  <div class="cover-footer">
    <div class="cover-confidential">Confidential — Proprietary Information</div>
  </div>
</div>

<!-- ═══ PROPOSAL BODY ═══ -->
<div class="proposal-body">
${bodyHtml}
</div>

<!-- ═══ SIGNATURE BLOCK ═══ -->
<div class="signature-block">
  <h2 style="border-bottom-color: #003366;">Acceptance & Authorization</h2>
  <p style="margin-bottom:8px;">By signing below, the authorized representative of the Client accepts this proposal, including all terms, conditions, scope of work, and pricing as described herein. This proposal is valid for thirty (30) days from the date of issuance.</p>

  <div class="sig-grid">
    <div class="sig-section">
      <h4>${co.name}</h4>
      <div class="sig-line"></div>
      <div class="sig-label">Signature</div>
      <div class="sig-prefilled">${co.consultant}</div>
      <div class="sig-prefilled-sub">${co.title}</div>
      <div class="sig-prefilled-sub">${co.email}</div>
      <div class="sig-prefilled-sub">${co.phone}</div>
      <div style="margin-top:16px;">
        <div class="sig-line" style="width:200px;"></div>
        <div class="sig-label">Date</div>
      </div>
    </div>

    <div class="sig-section">
      <h4>Client Acceptance</h4>
      <div class="sig-line"></div>
      <div class="sig-label">Authorized Signature</div>
      <div class="sig-line"></div>
      <div class="sig-label">Printed Name & Title</div>
      <div class="sig-line" style="width:200px;"></div>
      <div class="sig-label">Date</div>
    </div>
  </div>
</div>

<!-- ═══ FOOTER ═══ -->
<div style="margin-top:48px;padding-top:16px;border-top:1px solid #e5e5e5;text-align:center;font-size:8pt;color:#aaa;">
  <div>${co.name} · ${co.address}, ${co.cityStateZip}</div>
  <div>${co.consultant} · ${co.email} · ${co.phone}</div>
  <div style="margin-top:4px;">This document is confidential and proprietary. © ${today.getFullYear()} ${co.name}. All rights reserved.</div>
</div>

</body>
</html>`);

    printWindow.document.close();
    progressCallback(100, 'Proposal ready!');

    if (typeof spToast === 'function') {
      spToast('Proposal generated — use Print/Save as PDF in the new window ✓');
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
    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');

    // Numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Paragraphs — wrap loose text
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
