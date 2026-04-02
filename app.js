/* ================================================================
   SmartPlans — Application Logic
   AI-Powered Construction Document Analysis Wizard
   ================================================================ */

// ═══════════════════════════════════════════════════════════════
// GEMINI API CONFIG — Server-Side Proxy (keys in Cloudflare secrets)
// ═══════════════════════════════════════════════════════════════

const GEMINI_CONFIG = {
  // No API keys in client code — all calls route through /api/ai/invoke
  // Keys are stored as Cloudflare environment secrets (GEMINI_KEY_0 … GEMINI_KEY_17)
  _proxyEndpoint: '/api/ai/invoke',
  _currentSlot: 0,
  model: "gemini-2.5-flash",
  verificationModel: "gemini-2.5-flash",
  get apiKey() { return 'PROXY'; },
  get endpoint() { return this._proxyEndpoint; },
  get verificationEndpoint() { return this._proxyEndpoint; },
  rotateKey() {
    this._currentSlot = (this._currentSlot + 1) % 18;
    console.log(`[SmartPlans] Rotated to brain slot ${this._currentSlot}`);
  },
};

// ═══════════════════════════════════════════════════════════════
// API QUOTA MONITOR — Warns users before hitting rate limits
// ═══════════════════════════════════════════════════════════════

const QuotaMonitor = {
  _status: null,        // Last check result
  _checkInterval: null, // Periodic check timer
  _countdownInterval: null, // Reset countdown timer
  _bannerEl: null,      // DOM reference to warning banner
  CHECK_INTERVAL_MS: 5 * 60 * 1000, // Re-check every 5 minutes

  // ── Start monitoring on app load ──
  start() {
    this.check(); // Immediate first check
    if (this._checkInterval) clearInterval(this._checkInterval);
    this._checkInterval = setInterval(() => this.check(), this.CHECK_INTERVAL_MS);
  },

  // ── Check API quota health ──
  async check() {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      const res = await fetch('/api/ai/quota-check', { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        console.warn('[QuotaMonitor] Health check returned', res.status);
        return;
      }

      this._status = await res.json();
      console.log(`[QuotaMonitor] Health: ${this._status.health} | Available: ${this._status.availableKeys}/${this._status.testedKeys} tested keys`);
      this.updateBanner();
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[QuotaMonitor] Check failed:', err.message);
      }
    }
  },

  // ── Update the warning banner in the UI ──
  updateBanner() {
    const status = this._status;
    if (!status) return;

    // Remove existing banner
    if (this._bannerEl) {
      this._bannerEl.remove();
      this._bannerEl = null;
    }
    if (this._countdownInterval) {
      clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    }

    // No banner needed if healthy
    if (status.severity === 'none') return;

    // Create banner
    const banner = document.createElement('div');
    banner.id = 'quota-warning-banner';

    const isCritical = status.severity === 'critical';
    const bgColor = isCritical
      ? 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.08))'
      : 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.08))';
    const borderColor = isCritical ? 'rgba(239,68,68,0.4)' : 'rgba(245,158,11,0.4)';
    const accentColor = isCritical ? '#f43f5e' : '#f59e0b';
    const icon = isCritical ? '🚫' : '⚠️';
    const title = isCritical ? 'API Limits Reached — Analysis Unavailable' : 'API Rate Limit Warning';

    let resetInfo = '';
    if (status.resetHint) {
      const resetTime = new Date(Date.now() + status.resetHint * 1000);
      resetInfo = `<span id="quota-reset-countdown" style="font-weight:600;color:${accentColor};"></span>`;
    }

    let detailLine = '';
    if (isCritical) {
      detailLine = `<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">` +
        `${status.rateLimitedKeys} of ${status.testedKeys} tested keys are rate-limited. ` +
        `Wait for Gemini API quotas to reset (usually 1-2 minutes for RPM, or the daily limit resets at midnight PT). ` +
        resetInfo +
        `</div>`;
    } else {
      detailLine = `<div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:4px;">` +
        `${status.availableKeys} of ${status.testedKeys} tested keys are available. ` +
        `Analysis may run slower than normal. ` +
        resetInfo +
        `</div>`;
    }

    banner.style.cssText = `
      background: ${bgColor};
      border: 1px solid ${borderColor};
      border-radius: 12px;
      padding: 14px 20px;
      margin: 0 16px 0 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      animation: quotaBannerSlideIn 0.4s ease-out;
      position: relative;
    `;

    banner.innerHTML = `
      <span style="font-size:24px;line-height:1;flex-shrink:0;">${icon}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:14px;color:${accentColor};">${title}</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:2px;line-height:1.5;">${esc(status.message)}</div>
        ${detailLine}
      </div>
      <button onclick="QuotaMonitor.dismissBanner()" style="
        background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;
        font-size:18px;padding:0 4px;flex-shrink:0;line-height:1;
      " title="Dismiss">✕</button>
      <button onclick="QuotaMonitor.check()" style="
        background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);
        color:rgba(255,255,255,0.6);cursor:pointer;font-size:11px;padding:4px 10px;
        border-radius:6px;flex-shrink:0;transition:all 0.2s;
      " title="Re-check API status now">🔄 Re-check</button>
    `;

    // Insert after the header
    const appShell = document.getElementById('app-shell');
    const header = document.getElementById('app-header');
    if (appShell && header) {
      header.after(banner);
    }

    this._bannerEl = banner;

    // Start countdown if we have a reset hint
    if (status.resetHint) {
      let remaining = status.resetHint;
      const countdownEl = document.getElementById('quota-reset-countdown');
      if (countdownEl) {
        const updateCountdown = () => {
          if (remaining <= 0) {
            countdownEl.textContent = 'Limits should be resetting now — re-checking...';
            this.check();
            return;
          }
          const mins = Math.floor(remaining / 60);
          const secs = remaining % 60;
          countdownEl.textContent = `Estimated reset: ${mins > 0 ? mins + 'm ' : ''}${secs}s`;
          remaining--;
        };
        updateCountdown();
        this._countdownInterval = setInterval(updateCountdown, 1000);
      }
    }
  },

  // ── Dismiss the banner ──
  dismissBanner() {
    if (this._bannerEl) {
      this._bannerEl.style.animation = 'quotaBannerSlideOut 0.3s ease-in forwards';
      setTimeout(() => {
        if (this._bannerEl) this._bannerEl.remove();
        this._bannerEl = null;
      }, 300);
    }
  },

  // ── Check if analysis should be blocked ──
  isBlocked() {
    return this._status && this._status.health === 'blocked';
  },

  // ── Get current severity for UI decisions ──
  getSeverity() {
    return this._status ? this._status.severity : 'none';
  },
};

// ═══════════════════════════════════════════════════════════════
// USAGE STATS — Cross-Device Bid Counter & Cost Tracker
// ═══════════════════════════════════════════════════════════════

const UsageStats = {
  _data: { total_cost: 0, bid_count: 0 },
  _refreshInterval: null,

  // ── Start on app load ──
  start() {
    this.fetch();
    if (this._refreshInterval) clearInterval(this._refreshInterval);
    this._refreshInterval = setInterval(() => this.fetch(), 30000); // Refresh every 30s
    
    // Admin mode: tap logo 5 times to show reset button
    this._adminClicks = 0;
    this._adminTimer = null;
    const logo = document.querySelector('.header-logo');
    if (logo) {
      logo.style.cursor = 'pointer';
      logo.addEventListener('click', () => {
        this._adminClicks++;
        clearTimeout(this._adminTimer);
        if (this._adminClicks >= 5) {
          const btn = document.getElementById('btn-reset-stats');
          if (btn) {
            const isVisible = btn.style.display !== 'none';
            btn.style.display = isVisible ? 'none' : 'inline-flex';
            if (typeof spToast === 'function') {
              spToast(isVisible ? '🔒 Admin tools hidden' : '🔓 Admin tools enabled', 'info');
            }
          }
          this._adminClicks = 0;
        } else {
          this._adminTimer = setTimeout(() => { this._adminClicks = 0; }, 3000);
        }
      });
    }
  },

  // ── Fetch stats from D1 ──
  async fetch() {
    try {
      const res = await fetch('/api/usage-stats');
      if (!res.ok) return;
      this._data = await res.json();
      this.updateDisplay();
    } catch (err) {
      console.warn('[UsageStats] Fetch failed:', err.message);
    }
  },

  // ── Update the DOM counters ──
  updateDisplay() {
    const countEl = document.getElementById('stat-bid-count');
    const costEl = document.getElementById('stat-total-cost');
    if (countEl) countEl.textContent = this._data.bid_count || 0;
    if (costEl) costEl.textContent = '$' + (this._data.total_cost || 0).toFixed(2);
  },

  // ── Show/hide reset button based on role ──
  showResetButton(isAdmin) {
    const btn = document.getElementById('btn-reset-stats');
    if (btn) btn.style.display = isAdmin ? 'inline-block' : 'none';
  },

  // ── Report a completed bid ──
  async reportBid(projectName, estimatedCost) {
    try {
      const res = await fetch('/api/usage-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: projectName || 'Unknown Project',
          cost: estimatedCost || 0,
        }),
      });
      if (res.ok) {
        this._data = await res.json();
        this.updateDisplay();
        console.log(`[UsageStats] Reported bid: ${projectName} | Total: $${this._data.total_cost?.toFixed(2)} | Bids: ${this._data.bid_count}`);
      }
    } catch (err) {
      console.warn('[UsageStats] Report failed:', err.message);
    }
  },

  // ── Admin reset with confirmation ──
  confirmReset() {
    const key = prompt('Enter admin key to reset counters:');
    if (!key) return;
    if (!confirm('Reset bid count and total cost to zero?\n\nThis affects all devices and cannot be undone.')) return;
    this.reset(key);
  },

  async reset(adminKey) {
    try {
      const res = await fetch('/api/usage-stats', {
        method: 'DELETE',
        headers: { 'X-Admin-Key': adminKey },
      });
      if (res.ok) {
        this._data = { total_cost: 0, bid_count: 0 };
        this.updateDisplay();
        if (typeof spToast === 'function') spToast('✅ Usage counters reset to zero', 'success');
      } else {
        const data = await res.json();
        if (typeof spToast === 'function') spToast(`❌ Reset failed: ${data.error}`, 'error');
      }
    } catch (err) {
      console.warn('[UsageStats] Reset failed:', err.message);
    }
  },

  // ── Get current stats ──
  get() {
    return { ...this._data };
  },
};

// ═══════════════════════════════════════════════════════════════
// DATA & CONFIG
// ═══════════════════════════════════════════════════════════════

const STEPS = [
  { id: "setup", title: "Project Setup", subtitle: "Let's get started", icon: "📋" },
  { id: "legend", title: "Symbol Legend", subtitle: "Upload your key", icon: "🔑" },
  { id: "plans", title: "Floor Plans", subtitle: "Upload drawings", icon: "📐" },
  { id: "specs", title: "Specifications", subtitle: "Upload spec docs", icon: "📄" },
  { id: "addenda", title: "Addenda", subtitle: "Changes & updates", icon: "📝" },
  { id: "review", title: "Review & Analyze", subtitle: "Final check", icon: "🔍" },
  { id: "travel", title: "Travel & Costs", subtitle: "Per diem & incidentals", icon: "✈️" },
  { id: "results", title: "Results & RFIs", subtitle: "Analysis complete", icon: "✅" },
];

const DISCIPLINES = [
  "Structured Cabling",
  "CCTV",
  "Access Control",
  "Audio Visual",
  "Intrusion Detection",
  "Fire Alarm",
];

const PROJECT_TYPES = [
  "New Construction",
  "Renovation / Remodel",
  "Tenant Improvement",
  "Addition",
  "Design-Build",
  "Service / Retrofit",
];

const FILE_FORMATS = [
  { label: "Vector PDF (from CAD)", quality: "best", color: "#10b981" },
  { label: "DWG / DXF (AutoCAD)", quality: "best", color: "#10b981" },
  { label: "IFC / Revit BIM", quality: "best", color: "#10b981" },
  { label: "High-res scan (300+ DPI)", quality: "ok", color: "#f59e0b" },
  { label: "Low-res PDF / JPEG", quality: "poor", color: "#f43f5e" },
];

// ═══════════════════════════════════════════════════════════════
// EXCLUSION & ASSUMPTION TEMPLATES — Pre-built defaults by discipline
// ═══════════════════════════════════════════════════════════════

const EXCLUSION_TEMPLATES = {
  _general: {
    exclusion: [
      { text: "Excludes permit fees unless noted", category: "General" },
      { text: "Excludes sales tax", category: "General" },
      { text: "Excludes core drilling", category: "General" },
      { text: "Excludes painting/patching after installation", category: "General" },
      { text: "Excludes engineering or design services", category: "General" },
      { text: "Excludes work above 12ft without scaffolding provided by others", category: "General" },
      { text: "Excludes overtime, weekend, or holiday premium labor", category: "General" },
    ],
    assumption: [
      { text: "Assumes normal working hours (7am-3:30pm)", category: "General" },
      { text: "Assumes adequate site access for material delivery", category: "General" },
      { text: "Assumes power available within 50ft of equipment locations", category: "General" },
      { text: "Assumes clean, dry, and secure storage area available on-site", category: "General" },
      { text: "Assumes all pathways are in place by others prior to cable installation", category: "General" },
    ],
    clarification: [
      { text: "Pricing is valid for 30 days from date of proposal", category: "General" },
      { text: "Quantities are based on plan review and may change with field conditions", category: "General" },
    ],
  },
  "Structured Cabling": {
    exclusion: [
      { text: "Excludes furniture feeds", category: "Structured Cabling" },
      { text: "Excludes firestopping (by others)", category: "Structured Cabling" },
      { text: "Excludes backbone cabling between buildings", category: "Structured Cabling" },
      { text: "Excludes telecom room build-out (racks, power, cooling) unless listed in BOM", category: "Structured Cabling" },
    ],
    assumption: [
      { text: "Assumes open ceiling access throughout", category: "Structured Cabling" },
      { text: "Assumes J-hooks or cable tray installed by others at 5ft intervals", category: "Structured Cabling" },
      { text: "Assumes all cabling is plenum-rated per code", category: "Structured Cabling" },
    ],
    clarification: [],
  },
  "CCTV": {
    exclusion: [
      { text: "Excludes network switches (OFCI)", category: "CCTV" },
      { text: "Excludes lighting for camera coverage", category: "CCTV" },
      { text: "Excludes network infrastructure beyond camera drops", category: "CCTV" },
      { text: "Excludes VMS software licensing (OFCI)", category: "CCTV" },
    ],
    assumption: [
      { text: "Assumes adequate PoE budget at switches", category: "CCTV" },
      { text: "Assumes adequate power at camera locations", category: "CCTV" },
      { text: "Assumes network bandwidth is sufficient for camera streams", category: "CCTV" },
    ],
    clarification: [],
  },
  "Access Control": {
    exclusion: [
      { text: "Excludes door hardware modifications", category: "Access Control" },
      { text: "Excludes integration with elevator controls", category: "Access Control" },
      { text: "Excludes visitor management software licensing", category: "Access Control" },
    ],
    assumption: [
      { text: "Assumes standard door prep by door hardware contractor", category: "Access Control" },
      { text: "Assumes low-voltage power at each door location", category: "Access Control" },
      { text: "Assumes max 300ft cable run from panel to farthest reader", category: "Access Control" },
    ],
    clarification: [],
  },
  "Fire Alarm": {
    exclusion: [
      { text: "Excludes fire sprinkler system", category: "Fire Alarm" },
      { text: "Excludes seismic bracing", category: "Fire Alarm" },
      { text: "Excludes mass notification system (MNS) unless listed", category: "Fire Alarm" },
    ],
    assumption: [
      { text: "Assumes existing FACP has capacity for new devices", category: "Fire Alarm" },
      { text: "Assumes existing wiring is in acceptable condition for reuse", category: "Fire Alarm" },
      { text: "Assumes AHJ will not require full system replacement", category: "Fire Alarm" },
    ],
    clarification: [],
  },
  "Audio Visual": {
    exclusion: [
      { text: "Excludes furniture integration and millwork modifications", category: "Audio Visual" },
      { text: "Excludes acoustical treatment", category: "Audio Visual" },
      { text: "Excludes display content creation or programming beyond initial setup", category: "Audio Visual" },
    ],
    assumption: [
      { text: "Assumes dedicated 20A circuit at each equipment rack location", category: "Audio Visual" },
      { text: "Assumes conduit and backing boxes installed by electrical contractor", category: "Audio Visual" },
    ],
    clarification: [],
  },
  "Intrusion Detection": {
    exclusion: [
      { text: "Excludes central station monitoring service contract", category: "Intrusion Detection" },
      { text: "Excludes integration with fire alarm system", category: "Intrusion Detection" },
    ],
    assumption: [
      { text: "Assumes standard partition walls (not concrete/masonry) for sensor mounting", category: "Intrusion Detection" },
      { text: "Assumes dedicated phone line or IP connection for alarm communication", category: "Intrusion Detection" },
    ],
    clarification: [],
  },
};

function getDefaultExclusions(disciplines) {
  const items = [];
  for (const type of ['exclusion', 'assumption', 'clarification']) {
    (EXCLUSION_TEMPLATES._general[type] || []).forEach((t, i) => {
      items.push({ ...t, type, sort_order: i });
    });
  }
  for (const disc of disciplines) {
    const tpl = EXCLUSION_TEMPLATES[disc];
    if (!tpl) continue;
    for (const type of ['exclusion', 'assumption', 'clarification']) {
      (tpl[type] || []).forEach((t, i) => {
        items.push({ ...t, type, sort_order: 100 + i });
      });
    }
  }
  return items;
}

const RFI_TEMPLATES = {
  "Structured Cabling": [
    { id: "SC-001", q: "Data outlet symbols are inconsistent across sheets. Please confirm symbol definitions and clarify whether each represents single-gang, dual-gang, or multi-port configurations.", reason: "Inconsistent symbols cause cable and faceplate miscounts." },
    { id: "SC-002", q: "MDF/IDF/TR locations are shown but room dimensions, dedicated HVAC, and electrical requirements are not specified. Please provide telecom room details.", reason: "Telecom room build-out (racks, power, cooling, grounding) is a significant cost driver." },
    { id: "SC-003", q: "Cable pathways (conduit, J-hooks, cable tray, innerduct) are not shown for horizontal runs. Please specify pathway type and sizing.", reason: "Pathway type dramatically affects labor and material cost per BICSI standards." },
    { id: "SC-004", q: "Backbone cabling between MDF and IDFs is not shown on riser diagrams. Please provide backbone routing, fiber counts, and cable types (OS2, OM3, OM4).", reason: "Backbone infrastructure drives major material costs and cannot be assumed." },
    { id: "SC-005", q: "Cable category is not specified on the drawings (Cat 5e, Cat 6, Cat 6A). Please confirm cable performance category per TIA-568 requirements.", reason: "Cat 6A costs 40-60% more than Cat 6 for cable and connectivity." },
    { id: "SC-006", q: "Grounding and bonding requirements for telecom rooms are not shown. Please confirm TBB, TMGB, and TGB requirements per TIA-607.", reason: "Telecom grounding is code-required and a separate scope item." },
    { id: "SC-007", q: "Wireless access point (WAP) locations are shown but mounting details, pathway to ceiling, and PoE switch requirements are not specified. Please clarify.", reason: "WAP quantity drives PoE switch sizing and ceiling pathway costs." },
    { id: "SC-008", q: "Firestopping requirements for cable penetrations through rated walls and floors are not specified. Please confirm firestop product and method.", reason: "Firestopping is often missed in LV bids but is code-required and labor-intensive." },
  ],
  "CCTV": [
    { id: "CC-001", q: "Camera locations are shown but camera types (fixed, PTZ, dome, bullet, multi-sensor) are not specified for each location. Please provide a camera schedule.", reason: "Camera type determines mounting, lens, housing, and unit cost." },
    { id: "CC-002", q: "Field of view and coverage requirements are not indicated. Please confirm intended coverage areas, focal lengths, and minimum PPF (pixels per foot) requirements.", reason: "Coverage requirements determine camera count, lens selection, and mounting height." },
    { id: "CC-003", q: "Network Video Recorder (NVR) or Video Management System (VMS) specifications are not provided. Please confirm storage duration, resolution, and frame rate requirements.", reason: "Storage calculations drive server sizing and are a major cost variable." },
    { id: "CC-004", q: "PoE power budget and network switch requirements for the camera system are not specified. Please confirm PoE class requirements per camera.", reason: "High-resolution and PTZ cameras require PoE+ or PoE++, affecting switch selection." },
    { id: "CC-005", q: "Exterior camera locations do not indicate weatherproofing requirements, pole/arm mounting details, or conduit routing. Please provide mounting and pathway details.", reason: "Exterior installations require poles, arms, weatherproof enclosures, and underground conduit." },
    { id: "CC-006", q: "Integration requirements between CCTV and access control (door-triggered recording, video verification) are not defined. Please confirm integration scope.", reason: "System integration requires software licensing, network configuration, and programming hours." },
    { id: "CC-007", q: "Monitor/display requirements for guard stations or command centers are not specified. Please provide monitor sizes, quantities, and video wall layout.", reason: "Display hardware and video decoders are a separate cost center." },
  ],
  "Access Control": [
    { id: "AC-001", q: "Door hardware schedule does not indicate which doors require access control. Please provide a door-by-door access control matrix.", reason: "Not all doors shown on plans require access control; assuming all creates scope inflation." },
    { id: "AC-002", q: "Reader types are not specified per door (proximity, smart card, biometric, mobile credential). Please confirm reader technology and credential type.", reason: "Reader technology drives per-door cost from $200 to $3,000+." },
    { id: "AC-003", q: "Electrified hardware requirements (electric strikes, maglocks, electric hinges, auto-operators) are not specified per door. Please confirm locking hardware.", reason: "Lock type affects door prep, power supply sizing, and fire code compliance." },
    { id: "AC-004", q: "Request-to-exit (REX) device types are not shown. Please confirm whether PIR sensors, push buttons, or crash bars with REX switches are required.", reason: "REX type affects wiring, door hardware coordination, and ADA compliance." },
    { id: "AC-005", q: "Access control panel locations and power requirements are not shown on the drawings. Please confirm panel locations, dedicated circuits, and UPS/battery backup requirements.", reason: "Panel placement drives home-run cable lengths and power infrastructure costs." },
    { id: "AC-006", q: "Integration with elevator control for floor access restriction is noted in specs but not detailed on drawings. Please provide elevator cab reader locations and floor mapping.", reason: "Elevator integration requires coordination with elevator vendor and additional I/O modules." },
    { id: "AC-007", q: "Head-end software licensing (number of doors, cardholders, concurrent users) is not specified. Please confirm software tier and licensing model.", reason: "Software licensing can range from $0 (included) to $50,000+ depending on platform and scale." },
    { id: "AC-008", q: "Door contact and door position switch (DPS) types are not specified. Please confirm surface mount, concealed, or recessed contacts per door.", reason: "Contact type must match door material (wood, metal, glass) and frame condition." },
  ],
  "Audio Visual": [
    { id: "AV-001", q: "AV system equipment lists and connection diagrams (signal flow drawings) are not provided. Please furnish for each room type.", reason: "AV integration scope is impossible to price from floor plans alone." },
    { id: "AV-002", q: "Display sizes, types (LED, LCD, projector/screen), and mounting methods are not specified per room. Please provide an AV equipment schedule.", reason: "Display selection drives mounting infrastructure, power, and conduit requirements." },
    { id: "AV-003", q: "Audio system requirements (ceiling speakers, wall speakers, DSP, amplifiers) are not shown. Please confirm speaker zones, coverage, and paging integration.", reason: "Audio coverage design determines speaker count, amplifier sizing, and cable quantities." },
    { id: "AV-004", q: "Control system type (Crestron, Extron, Q-SYS, Biamp) and user interface (touch panel, button panel, scheduling panel) are not specified. Please confirm.", reason: "Control system platform determines programming hours and hardware costs, which vary dramatically." },
    { id: "AV-005", q: "Video conferencing and unified communication (UC) platform requirements are not specified. Please confirm (Zoom Rooms, Teams Rooms, Webex, BYOD).", reason: "UC platform determines codec, camera, microphone, and display requirements per room." },
    { id: "AV-006", q: "AV rack locations, sizes, ventilation, and dedicated power requirements are not shown. Please provide rack elevations and power specs.", reason: "Rack infrastructure is a significant cost item often omitted from AV drawings." },
    { id: "AV-007", q: "Digital signage locations, content management system, and media player requirements are not specified. Please confirm signage scope.", reason: "Digital signage includes displays, media players, CMS licensing, and network drops." },
  ],
  "Intrusion Detection": [
    { id: "ID-001", q: "Intrusion detection zones and device types (door contacts, motion detectors, glass break sensors) are not shown on plans. Please provide a device schedule and zone map.", reason: "Zone design determines panel sizing, device count, and wiring topology." },
    { id: "ID-002", q: "Alarm panel location, type, and communication path (IP, cellular, POTS) are not specified. Please confirm panel specifications.", reason: "Communication method affects monthly monitoring costs and infrastructure requirements." },
    { id: "ID-003", q: "Keypad locations and quantities are not shown. Please confirm keypad types (standard, touchscreen) and locations.", reason: "Keypad type and placement affect user experience and wiring runs." },
    { id: "ID-004", q: "Integration with access control system is referenced but not detailed. Please confirm whether intrusion arming/disarming is tied to access control events.", reason: "Integration requires compatible platforms and additional programming." },
    { id: "ID-005", q: "Siren/strobe locations for interior and exterior alarm notification are not shown. Please confirm quantities and placement.", reason: "Notification devices are code-required in many jurisdictions and affect wiring layout." },
    { id: "ID-006", q: "Central station monitoring requirements and UL listing (UL 681, UL 2050) are not specified. Please confirm monitoring level and certification requirements.", reason: "UL-listed installations have specific wiring, device spacing, and inspection requirements that increase cost." },
  ],
  "Fire Alarm": [
    { id: "FA-001", q: "Fire alarm device symbols are shown but the device schedule (manufacturer, model, type) is not provided. Please furnish a complete device schedule.", reason: "Device selection determines compatibility with the specified FACP and affects unit pricing." },
    { id: "FA-002", q: "NAC (Notification Appliance Circuit) circuit routing and conduit paths are not shown. Please provide NAC wiring diagrams.", reason: "NAC wiring is the largest labor component of fire alarm installation." },
    { id: "FA-003", q: "Fire alarm control panel (FACP) location and size are not specified. Please confirm panel manufacturer, model, and number of SLC/NAC circuits.", reason: "Panel sizing determines circuit capacity, cabinet size, and battery backup requirements." },
    { id: "FA-004", q: "Smoke detector spacing does not appear to comply with NFPA 72 for the ceiling heights shown. Please confirm ceiling heights and verify detector spacing.", reason: "Ceiling height affects detector spacing per NFPA 72 Table 17.6.3.5.1, which changes device count." },
    { id: "FA-005", q: "Duct smoke detector locations are shown but HVAC unit identification and coordination with mechanical contractor are not addressed. Please confirm duct detector assignments.", reason: "Duct detectors require coordination for mounting location, remote test/reset stations, and HVAC shutdown wiring." },
    { id: "FA-006", q: "Fire alarm system integration with building systems (elevator recall, HVAC shutdown, door holders, access control) is referenced but relay assignments are not provided. Please furnish an integration matrix.", reason: "Auxiliary relay programming and wiring for building integration is a significant cost item." },
    { id: "FA-007", q: "Mass notification or voice evacuation requirements are referenced in specs but not shown on drawings. Please clarify whether the system is horn/strobe or voice evacuation.", reason: "Voice evacuation systems cost 2-3x more than conventional horn/strobe systems." },
    { id: "FA-008", q: "Existing fire alarm system information (manufacturer, protocol, age) is not provided. Please confirm existing system for compatibility assessment.", reason: "Retrofit projects require compatibility with existing FACP and devices, limiting vendor options." },
  ],
};


// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════

const state = {
  currentStep: 0,
  completedSteps: new Set(),
  analyzing: false,
  analysisComplete: false,

  // Form
  projectName: "",
  preparedFor: "",
  projectType: "",
  disciplines: [],
  fileFormat: "",
  specificItems: "",
  knownQuantities: "",
  codeJurisdiction: "",
  projectLocation: "",
  prevailingWage: "",
  workShift: "",
  priorEstimate: "",

  // Travel & Per Diem (configured on Stage 6 after analysis)
  travel: {
    enabled: false,
    // Scheduling
    calcMode: 'byTechs',  // 'byTechs' or 'bySchedule'
    techCount: 4,
    projectDays: 30,       // deadline days for bySchedule mode
    hoursPerDay: 8,
    // AI-recommended (populated after analysis)
    aiRecommendedTechs: null,
    aiRecommendedDays: null,
    aiCrewBreakdown: null,
    aiReasoning: null,
    // Trips
    numTrips: 1,
    // Costs
    hotelPerNight: 175,
    perDiemPerDay: 79,     // GSA per diem rate
    mileageRoundTrip: 0,   // miles
    mileageRate: 0.70,     // IRS rate $/mile
    airfarePerPerson: 0,
    rentalCarPerDay: 85,
    parkingPerDay: 25,
    tollsPerTrip: 0,
  },
  // Incidentals (configured on Stage 6)
  incidentals: {
    permits: 0,
    insurance: 0,
    bonding: 0,
    equipmentRental: 0,
    fuelTransit: 0,
    unexpectedBufferPct: 5,  // percentage of direct costs
  },
  _travelOpen: false,

  // Change Orders
  _changeOrdersOpen: false,
  _excludedCOs: new Set(),

  // Cable Pathway Analysis (for spatial run-length calculation)
  floorPlateWidth: 0,       // ft — 0 means "let AI estimate from plans"
  floorPlateDepth: 0,       // ft
  ceilingHeight: 10,        // ft, typical finished ceiling height
  floorToFloorHeight: 14,   // ft, slab-to-slab height
  _cablePathwayOpen: false,
  _symbolInventoryOpen: false,
  _symbolInventorySort: 'sheet',     // 'sheet', 'type', 'room', 'floor'
  _symbolInventoryFilter: '',         // device type filter

  // Pricing Configuration (loaded from PRICING_DB defaults)
  pricingTier: "mid",  // "budget", "mid", "premium"
  regionalMultiplier: "national_average",
  laborRates: {
    journeyman: 38.00,
    lead: 45.00,
    foreman: 52.00,
    apprentice: 22.00,
    pm: 65.00,
    programmer: 55.00,
  },
  burdenRate: 35, // percentage
  includeBurden: true,
  markup: {
    material: 50,
    labor: 50,
    equipment: 15,
    subcontractor: 10,
  },

  // Files (arrays of {name, size, type, base64?, rawFile?})
  legendFiles: [],
  planFiles: [],
  specFiles: [],
  addendaFiles: [],
  hasAddenda: null,

  // Raw File objects for Gemini API
  rawFiles: new Map(), // key: "category-index", value: File object

  notes: "",

  // Results
  selectedRFIs: new Set(),
  expandedRFI: null,

  // AI Analysis
  aiAnalysis: null,  // raw text response from Gemini
  aiError: null,     // error message if API fails

  // Validation Results
  mathValidation: null,       // automated math check results
  sectionCompleteness: null,  // section completeness check results

  // Supplier Pricing
  supplierPriceOverrides: {},   // "catIndex-itemIndex" → { unitCost, supplierName, appliedAt }
  manualBomItems: [],           // user-added items: [{ catIndex, name, qty, unit, unitCost, mfg, partNumber }]
  deletedBomItems: {},          // "catIndex-itemIndex" → true for deleted AI items
  supplierQuotes: [],           // cached list from API

  // Bid Strategy — per-category markup & confidence
  bidStrategy: {
    categoryMarkups: {},        // { "Structured Cabling": { materialMarkup: 50, laborMarkup: 50, confidence: "medium" }, ... }
    defaultMaterialMarkup: 50,
    defaultLaborMarkup: 50,
    contingencyByConfidence: { high: 5, medium: 10, low: 20 },
    applied: false,             // true after user clicks "Apply Strategy"
  },

  // Bid Phases / Alternates
  // Each phase: { id, name, type: 'base'|'add'|'deduct'|'optional', categoryIndices: [], includeInProposal: true }
  // categoryIndices holds BOM category indices assigned to this phase
  bidPhases: [
    { id: 'base', name: 'Base Bid', type: 'base', categoryIndices: [], includeInProposal: true }
  ],
  _bidPhasesOpen: false,
  _bidPhaseCounter: 0,

  // Exclusions & Assumptions
  exclusions: [],           // cached from API: [{ id, type, text, category, sort_order }]
  _exclusionsLoaded: false, // true after first API load
  _exclusionsTab: 'exclusion', // active tab: 'exclusion', 'assumption', 'clarification'
};

let _appToken = '';

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// ─── Sanitize HTML to prevent XSS — strips dangerous tags, event handlers, and javascript: URLs ──
function sanitizeHtml(html) {
  if (!html) return '';
  // Strip dangerous tags (script, iframe, object, embed, form, meta, base, link)
  html = html.replace(/<\s*\/?\s*(script|iframe|object|embed|form|meta|base|link)\b[^>]*>/gi, '');
  // Strip <style> tags that contain expressions (IE expression hack)
  html = html.replace(/<style\b[^>]*>[\s\S]*?expression\s*\([\s\S]*?<\/style>/gi, '');
  // Strip on* event handler attributes (onclick, onerror, onload, etc.)
  html = html.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // Strip javascript: URLs in href and src attributes
  html = html.replace(/(href|src)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '$1=""');
  // Also catch unquoted javascript: URLs
  html = html.replace(/(href|src)\s*=\s*javascript:[^\s>]*/gi, '$1=""');
  return html;
}

// ── Shared BOM Override Application — single source of truth for supplier price overrides ──
function applyBOMOverrides(bom, overrides) {
  if (!bom || !overrides || Object.keys(overrides).length === 0) return bom;
  for (const [key, override] of Object.entries(overrides)) {
    const [catIdx, itemIdx] = key.split('-').map(Number);
    if (isNaN(catIdx) || isNaN(itemIdx) || catIdx < 0 || itemIdx < 0) continue;
    if (!bom.categories?.[catIdx]?.items?.[itemIdx]) continue;
    const item = bom.categories[catIdx].items[itemIdx];
    if (override.qty != null) item.qty = override.qty;
    if (typeof override.unitCost === 'number' && override.unitCost > 0 && isFinite(override.unitCost)) {
      item.unitCost = override.unitCost;
    }
    item.extCost = Math.round((item.qty * item.unitCost) * 100) / 100;
    if (override.mfg) item.mfg = override.mfg;
    if (override.partNumber) item.partNumber = override.partNumber;
  }
  bom.grandTotal = 0;
  for (const cat of (bom.categories || [])) {
    cat.subtotal = cat.items.reduce((s, it) => s + (it.extCost || 0), 0);
    cat.subtotal = Math.round(cat.subtotal * 100) / 100;
    bom.grandTotal += cat.subtotal;
  }
  bom.grandTotal = Math.round(bom.grandTotal * 100) / 100;
  return bom;
}

// ── Save to PDF utility — opens HTML in print window for browser "Save as PDF" ──
function openPrintAsPDF(html) {
  const printWin = window.open('', '_blank', 'width=900,height=700');
  if (!printWin) {
    if (typeof spToast === 'function') spToast('Pop-up blocked — please allow pop-ups for this site', 'error');
    return;
  }
  // Strip Word-specific XML that causes browser rendering issues
  const cleanHtml = html
    .replace(/xmlns:o="[^"]*"/g, '')
    .replace(/xmlns:w="[^"]*"/g, '')
    .replace(/xmlns:v="[^"]*"/g, '')
    .replace(/<!\[if[^]*?\]>/gi, '')
    .replace(/<!\[endif\]-->/gi, '')
    .replace(/<!--\[if[^]*?endif\]-->/gi, '')
    .replace(/mso-[^;":]+(:[^;"]+)?/g, '')
    .replace(/<xml>[\s\S]*?<\/xml>/gi, '')
    .replace(/style="mso-element:footer"[^>]*>[\s\S]*?<\/div>/gi, '');
  printWin.document.write(cleanHtml);
  printWin.document.close();
  printWin.onload = () => { setTimeout(() => printWin.print(), 500); };
}

// ═══════════════════════════════════════════════════════════════
// MASTER REPORT — One-click comprehensive PDF with everything
// ═══════════════════════════════════════════════════════════════
function generateMasterReport() {
  const fmt = n => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtInt = n => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  // Helper: safely render any brain value (object → table, array → list, string → text)
  const renderVal = v => {
    if (v == null) return '';
    if (typeof v === 'string') return esc(v);
    if (Array.isArray(v)) return '<ul>' + v.map(i => '<li>' + renderVal(i) + '</li>').join('') + '</ul>';
    if (typeof v === 'object') {
      return '<table style="font-size:9pt;">' + Object.entries(v).map(([k, val]) => {
        const label = esc(String(k).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
        return `<tr><td style="font-weight:600;width:35%;vertical-align:top;padding:4px 8px;">${label}</td><td style="padding:4px 8px;">${renderVal(val)}</td></tr>`;
      }).join('') + '</table>';
    }
    return esc(String(v));
  };

  // ── Gather all data ──
  const bom = getFilteredBOM(state.aiAnalysis, state.disciplines);

  // Apply supplier price overrides so Master Report matches Step 7 table and exports
  applyBOMOverrides(bom, state.supplierPriceOverrides);

  const bomWithTravel = state.travel.enabled ? injectTravelIntoBOM(bom) : bom;
  const travelCosts = state.travel.enabled ? computeTravelIncidentals() : null;
  const cos = extractPotentialChangeOrders(state);
  const laborCalc = state.brainResults?.wave2_25?.LABOR_CALCULATOR;
  const financialEngine = state.brainResults?.wave2_5_fin?.FINANCIAL_ENGINE;
  const devilsAdvocate = state.brainResults?.wave3?.DEVILS_ADVOCATE;
  const specialConditions = state.brainResults?.wave1?.SPECIAL_CONDITIONS;
  const bidStrategy = state.brainResults?.wave3?.BID_STRATEGIST;
  const cablePath = state.brainResults?.wave1?.CABLE_PATHWAY;
  const symbolScanner = state.brainResults?.wave1?.SYMBOL_SCANNER;
  const reportWriter = state.brainResults?.wave4?.REPORT_WRITER;
  const estimateCorrector = state.brainResults?.wave3_5?.ESTIMATE_CORRECTOR;
  const crossValidator = state.brainResults?.wave3?.CROSS_VALIDATOR;
  const annotationReader = state.brainResults?.wave1?.ANNOTATION_READER;
  const codeCompliance = state.brainResults?.wave1?.CODE_COMPLIANCE;
  const mdfIdf = state.brainResults?.wave1?.MDF_IDF_ANALYZER;
  const specCrossRef = state.brainResults?.wave1?.SPEC_CROSS_REF;
  const riserDiagram = state.brainResults?.wave1?.RISER_DIAGRAM_ANALYZER;

  const confidence = financialEngine?.confidence_score || financialEngine?.confidence || 85;
  // Use the SAME deterministic calculation as export-engine and proposal-generator:
  // BOM materials × markup + labor × markup + equipment + subs + burden + travel + contingency.
  // This ensures Master Report, Excel BOM, JSON export, and proposals all show ONE number.
  const materialTotal = bomWithTravel.grandTotal || 0;
  let grandTotal = 0;
  try {
    if (typeof SmartPlansExport !== 'undefined' && SmartPlansExport._computeFullBreakdown) {
      const bd = SmartPlansExport._computeFullBreakdown(state, bomWithTravel);
      if (bd.grandTotal > 1000) {
        grandTotal = bd.grandTotal;
        state._bomGrandTotal = bd.grandTotal;
        state._bomBreakdown = bd;
      }
    }
  } catch (e) { console.warn('[MasterReport] _computeFullBreakdown error:', e); }
  // Fallback: Financial Engine AI total, then raw BOM
  if (grandTotal <= 0) {
    const financialGrandTotal = financialEngine?.project_summary?.grand_total || 0;
    grandTotal = financialGrandTotal > 0 ? financialGrandTotal : materialTotal;
  }
  const bidNumber = state.estimateId || ('SP-' + now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0'));

  // Build section numbering dynamically
  let secNum = 0;
  const nextSec = () => ++secNum;

  // Compute cable pathway if available
  let pathwayData = null;
  try { pathwayData = typeof computePathwayDistances === 'function' ? computePathwayDistances() : null; } catch(e) { /* ignore */ }

  // ── Styles ──
  const styles = `
    <style>
      @page { size: letter; margin: 0.7in 0.7in 0.9in 0.7in; }
      @media print {
        .page-break { page-break-before: always; }
        .no-print { display: none !important; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; }
      }
      * { box-sizing: border-box; }
      body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; color: #1a1a2e; font-size: 10pt; line-height: 1.45; margin: 0; padding: 20px; }
      h1 { font-size: 22pt; color: #0D9488; margin: 0 0 6px 0; font-weight: 800; }
      h2 { font-size: 14pt; color: #0D9488; border-bottom: 2px solid #0D9488; padding-bottom: 5px; margin: 24px 0 12px 0; font-weight: 800; letter-spacing: 0.5px; }
      h3 { font-size: 11pt; color: #1a1a2e; margin: 14px 0 6px 0; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; margin: 8px 0 14px 0; font-size: 9.5pt; }
      th { background: #0D9488; color: white; padding: 7px 8px; text-align: left; font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
      td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
      tr:nth-child(even) { background: #f8fffe; }
      .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin: 12px 0; }
      .stat-box { background: linear-gradient(135deg, #f0fdfa, #e6fffa); border: 1px solid #99f6e4; border-radius: 8px; padding: 12px 10px; text-align: center; }
      .stat-value { font-size: 16pt; font-weight: 800; color: #0D9488; }
      .stat-label { font-size: 7.5pt; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
      .sev-critical { background: #DC2626; color: white; padding: 2px 8px; border-radius: 10px; font-size: 8pt; font-weight: 700; }
      .sev-high { background: #EA580C; color: white; padding: 2px 8px; border-radius: 10px; font-size: 8pt; font-weight: 700; }
      .sev-medium { background: #D97706; color: white; padding: 2px 8px; border-radius: 10px; font-size: 8pt; font-weight: 700; }
      .sev-low { background: #65A30D; color: white; padding: 2px 8px; border-radius: 10px; font-size: 8pt; font-weight: 700; }
      .sev-warning { background: #F59E0B; color: white; padding: 2px 8px; border-radius: 10px; font-size: 8pt; font-weight: 700; }
      .sev-info { background: #6366F1; color: white; padding: 2px 8px; border-radius: 10px; font-size: 8pt; font-weight: 700; }
      .cover-hero { background: linear-gradient(135deg, #0D9488, #065f5b); color: white; padding: 40px 36px; border-radius: 10px; margin: 50px 0 24px 0; }
      .cover-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 16px; font-size: 10pt; }
      .cover-meta div { opacity: 0.9; }
      .toc { padding-left: 20px; }
      .toc li { margin: 5px 0; font-size: 10.5pt; }
      .footer-bar { text-align: center; font-size: 8.5pt; font-weight: 700; color: #94a3b8; padding: 6px 0; border-top: 1px solid #e2e8f0; margin-top: 30px; }
      .callout { background: #fffbeb; border-left: 4px solid #F59E0B; padding: 10px 14px; margin: 10px 0; font-size: 9.5pt; border-radius: 0 6px 6px 0; }
      .callout-teal { background: #f0fdfa; border-left: 4px solid #0D9488; padding: 10px 14px; margin: 10px 0; font-size: 9.5pt; border-radius: 0 6px 6px 0; }
      ul { margin: 6px 0; padding-left: 18px; }
      li { margin: 3px 0; }
      p { margin: 6px 0; }
    </style>`;

  // ═══ COVER PAGE ═══
  let html = `<html><head><meta charset="utf-8"><title>${esc(state.projectName || 'SmartPlans')} — Master Report</title>${styles}</head><body>`;

  html += `
    <div style="text-align:center;margin-top:10px;">
      <div style="font-size:9pt;color:#94a3b8;letter-spacing:3px;text-transform:uppercase;">3D TECHNOLOGY SERVICES, INC.</div>
    </div>
    <div class="cover-hero">
      <div style="font-size: 9pt; letter-spacing: 3px; text-transform: uppercase; opacity: 0.7; margin-bottom: 6px;">SMARTPLANS MASTER REPORT</div>
      <h1 style="color: white; border: none; font-size: 26pt; margin-bottom: 4px;">${esc(state.projectName || 'Untitled Project')}</h1>
      ${state.projectLocation ? `<div style="font-size: 12pt; opacity: 0.9;">${esc(state.projectLocation)}</div>` : ''}
      <div style="margin-top: 20px; font-size: 22pt; font-weight: 800;">Total Bid: ${fmt(grandTotal)}</div>
      <div class="cover-meta">
        <div><strong>Bid #:</strong> ${esc(bidNumber)}</div>
        <div><strong>Date:</strong> ${dateStr}</div>
        <div><strong>Disciplines:</strong> ${state.disciplines.join(', ')}</div>
        <div><strong>Documents:</strong> ${state.planFiles.length + (state.specFiles?.length || 0)} analyzed</div>
        ${state.preparedFor ? `<div><strong>Prepared For:</strong> ${esc(state.preparedFor)}</div>` : ''}
        <div><strong>Confidence:</strong> ${confidence}%</div>
      </div>
    </div>
    <div style="margin-top: 24px;">
      <h3 style="color:#0D9488;">Table of Contents</h3>
      <ol class="toc">
        <li>Executive Summary & Financial Overview</li>
        <li>Bill of Materials</li>
        ${laborCalc?.phases ? '<li>Labor Breakdown</li>' : ''}
        ${travelCosts ? '<li>Travel & Incidentals</li>' : ''}
        ${financialEngine?.sov ? '<li>Schedule of Values</li>' : ''}
        <li>Exclusions, Assumptions & Clarifications</li>
        <li>Requests for Information (RFIs)</li>
        ${cos.length > 0 ? '<li>Potential Change Orders</li>' : ''}
        <li>Bid Phases & Alternates</li>
        ${bidStrategy ? '<li>Bid Strategy</li>' : ''}
        <li>Infrastructure & Cable Pathways</li>
        ${symbolScanner?.totals ? '<li>Symbol Inventory</li>' : ''}
        ${annotationReader ? '<li>Critical Drawing Notes & Annotations</li>' : ''}
        ${codeCompliance ? '<li>Code Compliance & Required Permits</li>' : ''}
        ${devilsAdvocate ? "<li>Devil's Advocate Review</li>" : ''}
        ${estimateCorrector?.correction_log ? '<li>Estimate Corrections & Quality Audit</li>' : ''}
        ${specialConditions ? '<li>Special Conditions</li>' : ''}
      </ol>
    </div>
    <div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — SmartPlans v5.0 — ${dateStr}</div>`;

  // ═══ SECTION: EXECUTIVE SUMMARY ═══
  html += `<div class="page-break"></div>`;
  const secExec = nextSec();
  html += `<h2>${secExec}. Executive Summary & Financial Overview</h2>`;
  html += `<div class="stat-grid">
    <div class="stat-box"><div class="stat-value">${fmt(grandTotal)}</div><div class="stat-label">Total Bid Price</div></div>
    <div class="stat-box"><div class="stat-value">${fmt(materialTotal)}</div><div class="stat-label">Material Cost</div></div>
    ${laborCalc ? `<div class="stat-box"><div class="stat-value">${fmt(laborCalc.total_with_markup || laborCalc.total_base_cost || 0)}</div><div class="stat-label">Labor Cost</div></div>` : ''}
    ${laborCalc ? `<div class="stat-box"><div class="stat-value">${(laborCalc.total_hours || 0).toLocaleString()}</div><div class="stat-label">Total Labor Hours</div></div>` : ''}
    <div class="stat-box"><div class="stat-value">${confidence}%</div><div class="stat-label">Confidence Score</div></div>
    <div class="stat-box"><div class="stat-value">${bomWithTravel.categories.length}</div><div class="stat-label">BOM Categories</div></div>
  </div>`;

  // Executive narrative
  if (reportWriter?.executive_summary) {
    html += `<div class="callout-teal">${esc(reportWriter.executive_summary)}</div>`;
  } else if (financialEngine?.project_summary?.scope_description) {
    html += `<div class="callout-teal">${esc(financialEngine.project_summary.scope_description)}</div>`;
  }

  // Financial breakdown table — use deterministic breakdown when available, fall back to AI Financial Engine
  const bd = state._bomBreakdown;
  if (bd && bd.grandTotal > 1000) {
    // Deterministic breakdown (matches export/proposal numbers exactly)
    const pct = (v) => grandTotal > 0 ? ((v / grandTotal) * 100).toFixed(1) + '%' : '';
    html += `<h3>Financial Summary</h3><table>
      <tr><th style="width:55%;">Category</th><th style="text-align:right;">Base Cost</th><th style="text-align:right;">Markup</th><th style="text-align:right;">Sell Price</th><th style="text-align:right;">% of Total</th></tr>
      <tr><td>Materials</td><td style="text-align:right;">${fmt(bd.materials)}</td><td style="text-align:right;">${Math.round(bd.matPct * 100)}%</td><td style="text-align:right;">${fmt(bd.matSell)}</td><td style="text-align:right;">${pct(bd.matSell)}</td></tr>
      <tr><td>Labor</td><td style="text-align:right;">${fmt(bd.laborBase)}</td><td style="text-align:right;">${Math.round(bd.labPct * 100)}%</td><td style="text-align:right;">${fmt(bd.labSell)}</td><td style="text-align:right;">${pct(bd.labSell)}</td></tr>
      ${bd.eqSell > 0 ? `<tr><td>Equipment</td><td style="text-align:right;">${fmt(bd.equipment)}</td><td style="text-align:right;">${Math.round(bd.eqPct * 100)}%</td><td style="text-align:right;">${fmt(bd.eqSell)}</td><td style="text-align:right;">${pct(bd.eqSell)}</td></tr>` : ''}
      ${bd.subSell > 0 ? `<tr><td>Subcontractors</td><td style="text-align:right;">${fmt(bd.subs)}</td><td style="text-align:right;">${Math.round(bd.subPct * 100)}%</td><td style="text-align:right;">${fmt(bd.subSell)}</td><td style="text-align:right;">${pct(bd.subSell)}</td></tr>` : ''}
      ${bd.burden > 0 ? `<tr><td>Burden/Overhead</td><td style="text-align:right;">${fmt(bd.laborBase)}</td><td style="text-align:right;">${Math.round(bd.burdenRate * 100)}%</td><td style="text-align:right;">${fmt(bd.burden)}</td><td style="text-align:right;">${pct(bd.burden)}</td></tr>` : ''}
      ${bd.travel > 0 ? `<tr><td>Travel & Incidentals</td><td style="text-align:right;">${fmt(bd.travel)}</td><td style="text-align:right;">—</td><td style="text-align:right;">${fmt(bd.travel)}</td><td style="text-align:right;">${pct(bd.travel)}</td></tr>` : ''}
      <tr style="background:#e0f2fe;font-weight:700;"><td>SUBTOTAL</td><td colspan="2"></td><td style="text-align:right;">${fmt(bd.subtotal)}</td><td style="text-align:right;"></td></tr>
      <tr><td>Contingency (10%)</td><td colspan="2"></td><td style="text-align:right;">${fmt(bd.contingency)}</td><td style="text-align:right;">${pct(bd.contingency)}</td></tr>
      <tr style="background:#0D9488;color:white;font-weight:700;"><td>TOTAL BID</td><td colspan="2"></td><td style="text-align:right;">${fmt(grandTotal)}</td><td style="text-align:right;">100%</td></tr>
    </table>`;
  } else if (financialEngine?.project_summary) {
    // Fallback: AI Financial Engine breakdown (legacy path)
    const ps = financialEngine.project_summary;
    html += `<h3>Financial Summary</h3><table>
      <tr><th style="width:55%;">Category</th><th style="text-align:right;">Amount</th><th style="text-align:right;">% of Total</th></tr>
      ${ps.total_materials ? `<tr><td>Materials</td><td style="text-align:right;">${fmt(ps.total_materials)}</td><td style="text-align:right;">${grandTotal > 0 ? ((ps.total_materials / grandTotal) * 100).toFixed(1) + '%' : ''}</td></tr>` : ''}
      ${ps.total_labor ? `<tr><td>Labor</td><td style="text-align:right;">${fmt(ps.total_labor)}</td><td style="text-align:right;">${grandTotal > 0 ? ((ps.total_labor / grandTotal) * 100).toFixed(1) + '%' : ''}</td></tr>` : ''}
      ${ps.total_equipment ? `<tr><td>Equipment</td><td style="text-align:right;">${fmt(ps.total_equipment)}</td><td style="text-align:right;">${grandTotal > 0 ? ((ps.total_equipment / grandTotal) * 100).toFixed(1) + '%' : ''}</td></tr>` : ''}
      ${ps.total_subcontractor ? `<tr><td>Subcontractors</td><td style="text-align:right;">${fmt(ps.total_subcontractor)}</td><td style="text-align:right;">${grandTotal > 0 ? ((ps.total_subcontractor / grandTotal) * 100).toFixed(1) + '%' : ''}</td></tr>` : ''}
      ${travelCosts ? `<tr><td>Travel & Incidentals</td><td style="text-align:right;">${fmt(travelCosts.grandTotal)}</td><td style="text-align:right;">${grandTotal > 0 ? ((travelCosts.grandTotal / grandTotal) * 100).toFixed(1) + '%' : ''}</td></tr>` : ''}
      <tr style="background:#0D9488;color:white;font-weight:700;"><td>TOTAL BID</td><td style="text-align:right;">${fmt(grandTotal)}</td><td style="text-align:right;">100%</td></tr>
    </table>`;
  }
  html += `<div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — ${dateStr}</div>`;

  // ═══ SECTION: BILL OF MATERIALS ═══
  html += `<div class="page-break"></div>`;
  const secBom = nextSec();
  html += `<h2>${secBom}. Bill of Materials</h2>`;
  bomWithTravel.categories.forEach(cat => {
    html += `<h3>${esc(cat.name)} — ${fmtInt(cat.subtotal)}</h3>`;
    html += `<table>
      <tr><th style="width:45%;">Item</th><th style="text-align:center;">Qty</th><th style="text-align:center;">Unit</th><th style="text-align:right;">Unit Cost</th><th style="text-align:right;">Ext. Cost</th></tr>`;
    (cat.items || []).forEach(item => {
      html += `<tr>
        <td>${esc(item.name || item.item || '')}</td>
        <td style="text-align:center;">${item.qty || 0}</td>
        <td style="text-align:center;">${esc(item.unit || 'EA')}</td>
        <td style="text-align:right;">${fmt(item.unitCost)}</td>
        <td style="text-align:right;">${fmt(item.extCost)}</td>
      </tr>`;
    });
    html += `<tr style="background:#f0fdfa;font-weight:700;"><td colspan="4" style="text-align:right;">Subtotal</td><td style="text-align:right;">${fmt(cat.subtotal)}</td></tr>`;
    html += `</table>`;
  });
  html += `<div style="text-align:right;font-size:13pt;font-weight:800;color:#0D9488;margin-top:8px;padding:8px 10px;background:#f0fdfa;border-radius:6px;">BOM Grand Total: ${fmt(bomWithTravel.grandTotal)}</div>`;
  html += `<div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — ${dateStr}</div>`;

  // ═══ SECTION: LABOR BREAKDOWN ═══
  if (laborCalc?.phases) {
    html += `<div class="page-break"></div>`;
    const secLabor = nextSec();
    html += `<h2>${secLabor}. Labor Breakdown</h2>`;
    html += `<div class="stat-grid">
      <div class="stat-box"><div class="stat-value">${(laborCalc.total_hours || 0).toLocaleString()}</div><div class="stat-label">Total Hours</div></div>
      <div class="stat-box"><div class="stat-value">${fmt(laborCalc.total_base_cost)}</div><div class="stat-label">Base Cost</div></div>
      <div class="stat-box"><div class="stat-value">${fmt(laborCalc.total_with_markup)}</div><div class="stat-label">With ${state.markup?.labor || 50}% Markup</div></div>
    </div>`;
    html += `<table><tr><th>Phase</th><th style="text-align:center;">Hours</th><th style="text-align:center;">% of Total</th><th style="text-align:right;">Cost</th></tr>`;
    laborCalc.phases.forEach(p => {
      html += `<tr><td>${esc(p.name)}</td><td style="text-align:center;">${(p.phase_hours || 0).toLocaleString()}</td><td style="text-align:center;">${p.pct_of_total || 0}%</td><td style="text-align:right;">${fmt(p.phase_cost)}</td></tr>`;
    });
    html += `<tr style="background:#0D9488;color:white;font-weight:700;"><td>Total</td><td style="text-align:center;">${(laborCalc.total_hours || 0).toLocaleString()}</td><td style="text-align:center;">100%</td><td style="text-align:right;">${fmt(laborCalc.total_base_cost)}</td></tr>`;
    html += `</table>`;
    if (laborCalc.crew_recommendation) {
      const cr = laborCalc.crew_recommendation;
      html += `<h3>Crew Recommendation</h3><div class="callout-teal">`;
      const crew = [];
      if (cr.foreman) crew.push(`<strong>${cr.foreman}</strong> Foreman`);
      if (cr.journeyman) crew.push(`<strong>${cr.journeyman}</strong> Journeyman`);
      if (cr.apprentice) crew.push(`<strong>${cr.apprentice}</strong> Apprentice`);
      if (cr.pm) crew.push(`<strong>${cr.pm}</strong> PM`);
      html += crew.join(' &middot; ');
      if (cr.duration_weeks) html += ` &middot; <strong>${cr.duration_weeks}</strong> weeks estimated duration`;
      html += `</div>`;
    }
    html += `<div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — ${dateStr}</div>`;
  }

  // ═══ SECTION: TRAVEL & INCIDENTALS ═══
  if (travelCosts) {
    html += `<div class="page-break"></div>`;
    const secTravel = nextSec();
    html += `<h2>${secTravel}. Travel & Incidentals</h2>`;
    html += `<div class="stat-grid">
      <div class="stat-box"><div class="stat-value">${travelCosts.techs}</div><div class="stat-label">Technicians</div></div>
      <div class="stat-box"><div class="stat-value">${travelCosts.workDays}</div><div class="stat-label">Work Days</div></div>
      <div class="stat-box"><div class="stat-value">${travelCosts.totalPersonDays}</div><div class="stat-label">Person-Days</div></div>
      <div class="stat-box"><div class="stat-value">${fmt(travelCosts.grandTotal)}</div><div class="stat-label">Total Travel Cost</div></div>
    </div>`;
    html += `<table><tr><th style="width:65%;">Item</th><th style="text-align:right;">Amount</th></tr>`;
    if (travelCosts.hotel > 0) html += `<tr><td>Hotel (${travelCosts.totalPersonDays} nights @ ${fmt(state.travel.hotelPerNight)}/night)</td><td style="text-align:right;">${fmt(travelCosts.hotel)}</td></tr>`;
    if (travelCosts.perdiem > 0) html += `<tr><td>Per Diem / Meals (${travelCosts.totalPersonDays} days @ ${fmt(state.travel.perDiemPerDay)}/day)</td><td style="text-align:right;">${fmt(travelCosts.perdiem)}</td></tr>`;
    if (travelCosts.mileage > 0) html += `<tr><td>Mileage</td><td style="text-align:right;">${fmt(travelCosts.mileage)}</td></tr>`;
    if (travelCosts.airfare > 0) html += `<tr><td>Airfare</td><td style="text-align:right;">${fmt(travelCosts.airfare)}</td></tr>`;
    if (travelCosts.rental > 0) html += `<tr><td>Rental Vehicle</td><td style="text-align:right;">${fmt(travelCosts.rental)}</td></tr>`;
    if (travelCosts.parking > 0) html += `<tr><td>Parking</td><td style="text-align:right;">${fmt(travelCosts.parking)}</td></tr>`;
    if (travelCosts.tolls > 0) html += `<tr><td>Tolls</td><td style="text-align:right;">${fmt(travelCosts.tolls)}</td></tr>`;
    html += `<tr style="font-weight:700;background:#f0fdfa;"><td>Travel Subtotal</td><td style="text-align:right;">${fmt(travelCosts.travelSubtotal)}</td></tr>`;
    if (travelCosts.permits > 0) html += `<tr><td>Permits & Fees</td><td style="text-align:right;">${fmt(travelCosts.permits)}</td></tr>`;
    if (travelCosts.insurance > 0) html += `<tr><td>Insurance</td><td style="text-align:right;">${fmt(travelCosts.insurance)}</td></tr>`;
    if (travelCosts.bonding > 0) html += `<tr><td>Bonding</td><td style="text-align:right;">${fmt(travelCosts.bonding)}</td></tr>`;
    if (travelCosts.equipmentRental > 0) html += `<tr><td>Equipment Rental</td><td style="text-align:right;">${fmt(travelCosts.equipmentRental)}</td></tr>`;
    if (travelCosts.unexpectedBuffer > 0) html += `<tr><td>Contingency Buffer (${state.incidentals.unexpectedBufferPct || 0}%)</td><td style="text-align:right;">${fmt(travelCosts.unexpectedBuffer)}</td></tr>`;
    html += `<tr style="background:#0D9488;color:white;font-weight:700;"><td>Travel & Incidentals Total</td><td style="text-align:right;">${fmt(travelCosts.grandTotal)}</td></tr>`;
    html += `</table>`;
    html += `<div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — ${dateStr}</div>`;
  }

  // ═══ SECTION: SCHEDULE OF VALUES ═══
  if (financialEngine?.sov && Array.isArray(financialEngine.sov)) {
    html += `<div class="page-break"></div>`;
    const secSov = nextSec();
    html += `<h2>${secSov}. Schedule of Values</h2>`;
    html += `<table><tr><th>Line</th><th>Description</th><th style="text-align:right;">Material</th><th style="text-align:right;">Labor</th><th style="text-align:right;">Equipment</th><th style="text-align:right;">Total</th></tr>`;
    financialEngine.sov.forEach((line, i) => {
      html += `<tr><td>${i + 1}</td><td>${esc(line.description || line.name || '')}</td><td style="text-align:right;">${fmt(line.material || 0)}</td><td style="text-align:right;">${fmt(line.labor || 0)}</td><td style="text-align:right;">${fmt(line.equipment || 0)}</td><td style="text-align:right;font-weight:600;">${fmt(line.total || (line.material || 0) + (line.labor || 0) + (line.equipment || 0))}</td></tr>`;
    });
    html += `</table>`;
    html += `<div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — ${dateStr}</div>`;
  }

  // ═══ SECTION: EXCLUSIONS, ASSUMPTIONS & CLARIFICATIONS ═══
  html += `<div class="page-break"></div>`;
  const secExcl = nextSec();
  html += `<h2>${secExcl}. Exclusions, Assumptions & Clarifications</h2>`;

  // Merge user-entered items with AI-identified ones
  const userExclusions = state.exclusions || [];
  const aiExclusions = [];
  const aiAssumptions = [];

  // Pull exclusions from Financial Engine
  if (financialEngine?.exclusions && Array.isArray(financialEngine.exclusions)) {
    financialEngine.exclusions.forEach(ex => {
      const txt = typeof ex === 'string' ? ex : (ex.description || ex.text || ex.item || '');
      if (txt && !userExclusions.some(u => u.text === txt)) aiExclusions.push(txt);
    });
  }
  // Pull exclusions from Annotation Reader (BY OTHERS / NIC / OFCI)
  if (annotationReader?.exclusions && Array.isArray(annotationReader.exclusions)) {
    annotationReader.exclusions.forEach(ex => {
      const txt = typeof ex === 'string' ? ex : `${ex.item || ''} — ${ex.note || 'BY OTHERS'}${ex.sheet_id ? ' (Sheet ' + ex.sheet_id + ')' : ''}`;
      if (txt && !userExclusions.some(u => u.text === txt) && !aiExclusions.includes(txt)) aiExclusions.push(txt);
    });
  }
  // Pull assumptions from Financial Engine
  if (financialEngine?.assumptions && Array.isArray(financialEngine.assumptions)) {
    financialEngine.assumptions.forEach(a => {
      const txt = typeof a === 'string' ? a : (a.description || a.text || '');
      if (txt) aiAssumptions.push(txt);
    });
  }

  // Render user-entered items
  ['exclusion', 'assumption', 'clarification'].forEach(type => {
    const items = userExclusions.filter(e => e.type === type);
    if (items.length > 0) {
      html += `<h3>${type.charAt(0).toUpperCase() + type.slice(1)}s (${items.length})</h3><ul>`;
      items.forEach(e => { html += `<li>${esc(e.text)}${e.category && e.category !== 'General' ? ` <em style="color:#6b7280;">[${esc(e.category)}]</em>` : ''}</li>`; });
      html += `</ul>`;
    }
  });

  // Auto-populate AI-identified exclusions if user didn't enter any
  if (!userExclusions.some(e => e.type === 'exclusion') && aiExclusions.length > 0) {
    html += `<h3>Exclusions — Identified from Plans & Specifications (${aiExclusions.length})</h3>`;
    html += `<div class="callout-teal">The following exclusions were automatically identified from the construction documents by AI analysis. Items marked "BY OTHERS", "NIC", or "OFCI" on the drawings are listed here.</div>`;
    html += `<ul>`;
    aiExclusions.forEach(ex => { html += `<li>${esc(ex)}</li>`; });
    html += `</ul>`;
  }
  // Auto-populate AI assumptions
  if (!userExclusions.some(e => e.type === 'assumption') && aiAssumptions.length > 0) {
    html += `<h3>Assumptions — From AI Analysis (${aiAssumptions.length})</h3>`;
    html += `<ul>`;
    aiAssumptions.forEach(a => { html += `<li>${esc(a)}</li>`; });
    html += `</ul>`;
  }
  // Standard industry exclusions as fallback
  if (userExclusions.length === 0 && aiExclusions.length === 0 && aiAssumptions.length === 0) {
    html += `<h3>Standard Exclusions</h3>`;
    html += `<ul>
      <li>Electrical power and dedicated circuits to ELV equipment (by Electrical Contractor)</li>
      <li>Core drilling, firestopping, and penetrations through rated assemblies (unless noted)</li>
      <li>Painting, patching, and wall repair after device installation</li>
      <li>Furniture, fixtures, and equipment (FF&E) unless specifically noted in BOM</li>
      <li>Software licensing beyond first year (ongoing subscription costs by Owner)</li>
      <li>Commissioning and acceptance testing by third-party agents</li>
      <li>As-built drawings (unless specified in contract)</li>
    </ul>`;
    html += `<h3>Standard Assumptions</h3>`;
    html += `<ul>
      <li>Work performed during normal business hours (M-F, 7AM-3:30PM) unless noted</li>
      <li>Building is weather-tight and suitable for low-voltage installation</li>
      <li>Adequate laydown/staging area provided at no charge</li>
      <li>General Contractor provides clean, safe access to all work areas</li>
      <li>All required permits and inspections are included unless otherwise stated</li>
      <li>Pricing valid for 30 days from date of estimate</li>
    </ul>`;
  }
  html += `<div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — ${dateStr}</div>`;

  // ═══ SECTION: RFIs ═══
  html += `<div class="page-break"></div>`;
  const secRfi = nextSec();
  const allRFIs = typeof getRelevantRFIs === 'function' ? getRelevantRFIs() : [];
  // Auto-include ALL relevant RFIs — user-selected ones marked as priority, rest included automatically
  const selectedRFIs = allRFIs.filter(r => state.selectedRFIs && state.selectedRFIs.has(r.id));
  const rfis = selectedRFIs.length > 0 ? selectedRFIs : allRFIs; // If user selected specific ones use those, otherwise include all
  html += `<h2>${secRfi}. Requests for Information (RFIs)</h2>`;
  if (rfis.length > 0) {
    html += `<div class="callout"><strong>${rfis.length}</strong> RFI${rfis.length > 1 ? 's' : ''} identified for <strong>${state.disciplines.join(', ')}</strong> — these represent gaps in the construction documents that cannot be resolved from the drawings and specifications alone. Clarification from the Architect/Engineer is required before finalizing the bid.${selectedRFIs.length === 0 ? ' <em>All discipline-relevant RFIs have been auto-included for completeness.</em>' : ''}</div>`;
    // Summary table first
    html += `<h3>RFI Summary Log</h3>`;
    html += `<table><tr><th style="width:10%;">RFI #</th><th style="width:52%;">Subject</th><th style="width:18%;">Discipline</th><th style="width:20%;">Status</th></tr>`;
    rfis.forEach((r, i) => {
      const shortQ = (r.q || r.question || r.text || '').split('.')[0];
      html += `<tr><td style="font-weight:700;">RFI-${String(i + 1).padStart(3, '0')}</td><td>${esc(shortQ)}</td><td>${esc(r.discipline || 'General')}</td><td style="color:#D97706;font-weight:600;">Open — Pending Response</td></tr>`;
    });
    html += `</table>`;
    // Detailed RFI pages
    html += `<h3>RFI Detail Sheets</h3>`;
    rfis.forEach((r, i) => {
      const rfiNum = `RFI-${String(i + 1).padStart(3, '0')}`;
      html += `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin:12px 0;page-break-inside:avoid;">`;
      html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">`;
      html += `<span style="font-size:12pt;font-weight:800;color:#0D9488;">${rfiNum}</span>`;
      html += `<span style="font-size:8.5pt;background:#0D9488;color:white;padding:3px 10px;border-radius:10px;">${esc(r.discipline || 'General')}</span>`;
      html += `</div>`;
      html += `<div style="margin-bottom:8px;"><strong style="font-size:8.5pt;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Question / Request:</strong></div>`;
      html += `<div style="font-size:10pt;line-height:1.5;margin-bottom:10px;">${esc(r.q || r.question || r.text || '')}</div>`;
      if (r.reason) {
        html += `<div style="margin-bottom:8px;"><strong style="font-size:8.5pt;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Why This Matters (Cost & Schedule Impact):</strong></div>`;
        html += `<div style="font-size:9.5pt;line-height:1.5;color:#374151;background:#f0fdfa;padding:8px 12px;border-radius:6px;border-left:3px solid #0D9488;">${esc(r.reason)}</div>`;
      }
      html += `<div style="margin-top:10px;border-top:1px dashed #e5e7eb;padding-top:8px;">`;
      html += `<div style="font-size:8.5pt;color:#6b7280;"><strong>Response:</strong> <em>Pending — to be completed by Architect/Engineer</em></div>`;
      html += `</div></div>`;
    });
  } else {
    html += `<p style="color:#6b7280;font-style:italic;">No RFIs available. Ensure disciplines are selected before generating the Master Report.</p>`;
  }
  html += `<div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — ${dateStr}</div>`;

  // ═══ SECTION: POTENTIAL CHANGE ORDERS ═══
  if (cos.length > 0) {
    html += `<div class="page-break"></div>`;
    const secCO = nextSec();
    const includedCOs = cos.filter(c => !state._excludedCOs.has(c.id));
    const totalCOValue = includedCOs.reduce((s, c) => s + c.estimatedCost, 0);
    html += `<h2>${secCO}. Potential Change Orders</h2>`;
    html += `<div class="callout"><strong>${includedCOs.length}</strong> potential change orders identified — estimated total impact: <strong>${fmtInt(totalCOValue)}</strong>. Each CO below includes full wording ready to copy/paste into a change order form.</div>`;

    // ── Summary Table ──
    html += `<h3>Change Order Summary</h3>`;
    html += `<table><tr><th style="width:8%;">CO#</th><th style="width:42%;">Description</th><th style="text-align:center;width:10%;">Severity</th><th style="text-align:right;width:14%;">Est. Impact</th><th style="width:12%;">Category</th><th style="width:14%;">Source</th></tr>`;
    cos.forEach(c => {
      const excl = state._excludedCOs.has(c.id);
      const catLabel = (c.category || '').replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
      html += `<tr${excl ? ' style="opacity:0.4;"' : ''}>
        <td style="white-space:nowrap;font-weight:700;">${esc(c.id)}</td>
        <td>${esc(c.description)}</td>
        <td style="text-align:center;"><span class="sev-${c.severity}">${c.severity}</span></td>
        <td style="text-align:right;font-weight:600;">${c.estimatedCost > 0 ? fmtInt(c.estimatedCost) : 'TBD'}</td>
        <td style="font-size:8.5pt;">${esc(catLabel)}</td>
        <td style="font-size:8.5pt;color:#6b7280;">${esc(c.source)}</td>
      </tr>`;
    });
    html += `<tr style="background:#0D9488;color:white;font-weight:700;"><td colspan="3" style="text-align:right;">Total Estimated CO Exposure</td><td style="text-align:right;">${fmtInt(totalCOValue)}</td><td colspan="2"></td></tr>`;
    html += `</table>`;
    html += `<div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — ${dateStr}</div>`;

    // ── Detailed CO Forms (copy-paste ready) ──
    html += `<div class="page-break"></div>`;
    html += `<h2>${secCO}. Potential Change Orders — Detail Sheets</h2>`;
    html += `<div class="callout-teal">Each change order below is written in formal language ready to copy/paste into a CO request form. The <strong>"Description of Change"</strong> and <strong>"Justification"</strong> fields are formatted for direct submission to the Architect/Engineer or Owner.</div>`;

    cos.forEach((c, idx) => {
      const excl = state._excludedCOs.has(c.id);
      if (excl) return; // Skip excluded COs from detail sheets
      if (idx > 0 && idx % 3 === 0) html += `<div class="page-break"></div>`;

      // Build justification based on category and source
      let justification = '';
      if (c.category === 'missing_item') {
        justification = `This item was not included in the original contract documents or was omitted from the drawings and specifications. The AI analysis identified this as a required component based on code requirements, industry standards, and the scope described in the project documents. Without this item, the installation will be incomplete or non-compliant.`;
      } else if (c.category === 'scope_gap') {
        justification = `The contract documents contain ambiguous or incomplete information regarding this scope item. The original bid was based on the information available at the time. This change order addresses the gap between what was shown on the documents and what is required for a complete and functional installation.`;
      } else if (c.category === 'pricing_flag') {
        justification = `A pricing discrepancy was identified during the estimate review process. The original unit cost or quantity requires adjustment based on current market conditions, manufacturer pricing, or a more accurate interpretation of the construction documents.`;
      } else if (c.category === 'hidden_cost') {
        justification = `This cost was not apparent from the face of the construction documents but is required for a complete installation. Site conditions, code requirements, or coordination needs that were not visible during the bidding phase have created this additional cost.`;
      } else if (c.category === 'double_counting') {
        justification = `A duplicate scope item was identified in the original estimate. This change order corrects the count to reflect the actual required quantities per the construction documents.`;
      } else if (c.category === 'permits' || c.category === 'site_conditions') {
        justification = `Site-specific conditions or permit requirements identified during plan review require additional scope beyond the base bid. These conditions were identified from the construction documents and project location analysis.`;
      } else if (c.category === 'labor_issue') {
        justification = `The labor allocation for this scope item requires adjustment. Working conditions, site access restrictions, or complexity factors identified during the detailed plan analysis indicate the original labor estimate is insufficient for the described work.`;
      } else {
        justification = `This potential change was identified during the AI-assisted plan review process. The original bid does not account for this item, and it represents additional scope or cost that should be addressed before contract execution.`;
      }

      html += `<div style="border:2px solid #e5e7eb;border-radius:10px;padding:16px 18px;margin:14px 0;page-break-inside:avoid;">`;
      // Header
      html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #0D9488;">`;
      html += `<div><span style="font-size:14pt;font-weight:800;color:#0D9488;">${esc(c.id)}</span> <span class="sev-${c.severity}" style="margin-left:8px;">${c.severity.toUpperCase()}</span></div>`;
      html += `<div style="font-size:12pt;font-weight:800;color:#1a1a2e;">${c.estimatedCost > 0 ? fmtInt(c.estimatedCost) : 'TBD'}</div>`;
      html += `</div>`;
      // Project reference
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:9pt;color:#6b7280;margin-bottom:10px;">`;
      html += `<div><strong>Project:</strong> ${esc(state.projectName || 'N/A')}</div>`;
      html += `<div><strong>Bid #:</strong> ${esc(bidNumber)}</div>`;
      html += `<div><strong>Date Identified:</strong> ${dateStr}</div>`;
      html += `<div><strong>Identified By:</strong> SmartPlans AI Analysis (${esc(c.source)})</div>`;
      html += `</div>`;
      // Description of Change
      html += `<div style="margin-bottom:10px;">`;
      html += `<div style="font-size:8.5pt;font-weight:700;color:#0D9488;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Description of Change:</div>`;
      html += `<div style="font-size:10pt;line-height:1.55;padding:8px 12px;background:#f8fffe;border:1px solid #e5e7eb;border-radius:6px;">${esc(c.description)}</div>`;
      html += `</div>`;
      // Justification
      html += `<div style="margin-bottom:10px;">`;
      html += `<div style="font-size:8.5pt;font-weight:700;color:#0D9488;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Justification / Reason for Change:</div>`;
      html += `<div style="font-size:9.5pt;line-height:1.55;padding:8px 12px;background:#f8fffe;border:1px solid #e5e7eb;border-radius:6px;">${esc(justification)}</div>`;
      html += `</div>`;
      // Recommendation
      if (c.recommendation) {
        html += `<div style="margin-bottom:10px;">`;
        html += `<div style="font-size:8.5pt;font-weight:700;color:#0D9488;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Recommended Resolution:</div>`;
        html += `<div style="font-size:9.5pt;line-height:1.55;padding:8px 12px;background:#fffbeb;border:1px solid #fef3c7;border-radius:6px;">${esc(c.recommendation)}</div>`;
        html += `</div>`;
      }
      // Cost impact
      html += `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px;padding-top:8px;border-top:1px dashed #e5e7eb;font-size:9pt;">`;
      html += `<div><strong>Estimated Cost Impact:</strong> ${c.estimatedCost > 0 ? fmtInt(c.estimatedCost) : 'To Be Determined'}</div>`;
      html += `<div><strong>Schedule Impact:</strong> TBD</div>`;
      html += `<div><strong>Status:</strong> <em style="color:#D97706;">Pending Review</em></div>`;
      html += `</div>`;
      html += `</div>`;
    });
    html += `<div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — ${dateStr}</div>`;
  }

  // ═══ SECTION: BID PHASES & ALTERNATES ═══
  html += `<div class="page-break"></div>`;
  const secPhases = nextSec();
  html += `<h2>${secPhases}. Bid Phases & Alternates</h2>`;
  if (state.bidPhases && state.bidPhases.length > 0) {
    const phaseBom = getBidPhaseBOM();
    html += `<table><tr><th>Phase</th><th>Type</th><th style="text-align:right;">Amount</th><th style="text-align:center;">In Proposal</th></tr>`;
    let runningTotal = 0;
    state.bidPhases.forEach(phase => {
      const tot = typeof getPhaseTotal === 'function' ? getPhaseTotal(phase, phaseBom) : 0;
      const display = phase.type === 'deduct' ? -Math.abs(tot) : tot;
      if (phase.includeInProposal) runningTotal += display;
      const typeLabels = { base: 'Base Bid', add: 'Add Alternate', deduct: 'Deduct Alt', optional: 'Optional' };
      html += `<tr><td>${esc(phase.name)}</td><td>${typeLabels[phase.type] || phase.type}</td><td style="text-align:right;font-weight:600;">${fmtInt(display)}</td><td style="text-align:center;">${phase.includeInProposal ? '✓' : '—'}</td></tr>`;
    });
    html += `<tr style="background:#0D9488;color:white;font-weight:700;"><td colspan="2" style="text-align:right;">Total (if all accepted)</td><td style="text-align:right;">${fmtInt(runningTotal)}</td><td></td></tr>`;
    html += `</table>`;
  } else {
    html += `<p style="color:#6b7280;">Single base bid — no alternates configured.</p>`;
  }
  html += `<div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — ${dateStr}</div>`;

  // ═══ SECTION: BID STRATEGY ═══
  if (bidStrategy) {
    html += `<div class="page-break"></div>`;
    const secStrat = nextSec();
    html += `<h2>${secStrat}. Bid Strategy</h2>`;
    // Handle various bid strategy formats from the AI
    if (bidStrategy.win_probability != null) html += `<div class="stat-grid"><div class="stat-box"><div class="stat-value">${bidStrategy.win_probability}%</div><div class="stat-label">Win Probability</div></div></div>`;
    if (bidStrategy.recommended_strategy) {
      html += `<h3>Recommended Strategy</h3><div class="callout-teal">${renderVal(bidStrategy.recommended_strategy)}</div>`;
    }
    if (bidStrategy.pricing_recommendations) {
      html += `<h3>Pricing Recommendations</h3>`;
      if (Array.isArray(bidStrategy.pricing_recommendations)) {
        html += '<ul>';
        bidStrategy.pricing_recommendations.forEach(r => { html += `<li>${renderVal(r)}</li>`; });
        html += '</ul>';
      } else { html += renderVal(bidStrategy.pricing_recommendations); }
    }
    if (bidStrategy.risk_factors) {
      html += `<h3>Risk Factors</h3>`;
      if (Array.isArray(bidStrategy.risk_factors)) {
        html += '<ul>';
        bidStrategy.risk_factors.forEach(r => { html += `<li>${renderVal(r)}</li>`; });
        html += '</ul>';
      } else { html += renderVal(bidStrategy.risk_factors); }
    }
    if (bidStrategy.competitive_analysis) {
      html += `<h3>Competitive Analysis</h3>${renderVal(bidStrategy.competitive_analysis)}`;
    }
    html += `<div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — ${dateStr}</div>`;
  }

  // ═══ SECTION: INFRASTRUCTURE & CABLE PATHWAYS ═══
  html += `<div class="page-break"></div>`;
  const secInfra = nextSec();
  html += `<h2>${secInfra}. Infrastructure & Cable Pathways</h2>`;
  // Use computed pathway data if available, otherwise fall back to raw brain data
  if (pathwayData && pathwayData.results && pathwayData.results.length > 0) {
    html += `<div class="stat-grid">
      <div class="stat-box"><div class="stat-value">${(pathwayData.grandTotalFt || 0).toLocaleString()}</div><div class="stat-label">Total Cable (ft)</div></div>
      <div class="stat-box"><div class="stat-value">${fmt(pathwayData.grandTotalCost || 0)}</div><div class="stat-label">Cable Material Cost</div></div>
    </div>`;
    html += `<table><tr><th>Cable Type</th><th style="text-align:center;">Runs</th><th style="text-align:right;">Avg Length</th><th style="text-align:right;">Total Feet</th><th style="text-align:right;">Material Cost</th></tr>`;
    pathwayData.results.forEach(r => {
      html += `<tr><td>${esc(r.label || r.cableType || '')}</td><td style="text-align:center;">${r.totalDrops || r.count || '—'}</td><td style="text-align:right;">${r.avgRunFt ? r.avgRunFt + ' ft' : '—'}</td><td style="text-align:right;">${(r.totalFt || 0).toLocaleString()} ft</td><td style="text-align:right;">${fmt(r.materialCost || 0)}</td></tr>`;
    });
    html += `</table>`;
  }
  // Raw brain data sections
  if (cablePath) {
    if (cablePath.backbone_runs && Array.isArray(cablePath.backbone_runs) && cablePath.backbone_runs.length > 0) {
      html += `<h3>Backbone Runs</h3><table><tr><th>From</th><th>To</th><th>Media</th><th style="text-align:right;">Distance</th></tr>`;
      cablePath.backbone_runs.forEach(r => {
        html += `<tr><td>${esc(r.from || '')}</td><td>${esc(r.to || '')}</td><td>${esc(r.media || r.cable_type || '')}</td><td style="text-align:right;">${r.distance_ft ? r.distance_ft + ' ft' : '—'}</td></tr>`;
      });
      html += `</table>`;
    }
    if (cablePath.horizontal_cables && Array.isArray(cablePath.horizontal_cables) && cablePath.horizontal_cables.length > 0) {
      html += `<h3>Horizontal Distribution</h3><table><tr><th>Cable Type</th><th style="text-align:center;">Count</th><th style="text-align:right;">Avg Length</th><th style="text-align:right;">Total</th></tr>`;
      cablePath.horizontal_cables.forEach(r => {
        html += `<tr><td>${esc(r.type || r.cable_type || '')}</td><td style="text-align:center;">${r.count || r.qty || '—'}</td><td style="text-align:right;">${r.avg_length_ft ? r.avg_length_ft + ' ft' : '—'}</td><td style="text-align:right;">${r.total_ft ? r.total_ft + ' ft' : '—'}</td></tr>`;
      });
      html += `</table>`;
    }
    if (cablePath.conduit_schedule && Array.isArray(cablePath.conduit_schedule) && cablePath.conduit_schedule.length > 0) {
      html += `<h3>Conduit Schedule</h3><table><tr><th>Size</th><th>Type</th><th style="text-align:right;">Length</th><th>Route</th></tr>`;
      cablePath.conduit_schedule.forEach(r => {
        html += `<tr><td>${esc(r.size || '')}</td><td>${esc(r.type || '')}</td><td style="text-align:right;">${r.length_ft ? r.length_ft + ' ft' : '—'}</td><td>${esc(r.location || r.route || '')}</td></tr>`;
      });
      html += `</table>`;
    }
  }
  if (!pathwayData?.results?.length && !cablePath) {
    html += `<p style="color:#6b7280;font-style:italic;">Cable pathway data not available for this analysis.</p>`;
  }
  html += `<div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — ${dateStr}</div>`;

  // ═══ SECTION: SYMBOL INVENTORY ═══
  if (symbolScanner?.totals) {
    html += `<div class="page-break"></div>`;
    const secSym = nextSec();
    html += `<h2>${secSym}. Symbol Inventory</h2>`;
    const totals = symbolScanner.totals;
    const totalDevices = Object.values(totals).reduce((s, v) => s + (v > 0 ? v : 0), 0);
    html += `<div class="stat-grid"><div class="stat-box"><div class="stat-value">${totalDevices}</div><div class="stat-label">Total Devices</div></div></div>`;
    html += `<table><tr><th>Device Type</th><th style="text-align:center;">Count</th></tr>`;
    Object.entries(totals).forEach(([key, val]) => {
      if (val > 0) html += `<tr><td>${esc(key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))}</td><td style="text-align:center;font-weight:600;">${val}</td></tr>`;
    });
    html += `</table>`;
    if (symbolScanner.by_sheet && Array.isArray(symbolScanner.by_sheet)) {
      html += `<h3>Per-Sheet Breakdown</h3><table><tr><th>Sheet</th><th>Devices Found</th></tr>`;
      symbolScanner.by_sheet.forEach(sh => {
        const devList = Object.entries(sh.counts || sh.devices || {}).filter(([, v]) => v > 0).map(([k, v]) => `${k}: ${v}`).join(', ');
        if (devList) html += `<tr><td>${esc(sh.sheet_id || sh.sheet || '')}</td><td style="font-size:9pt;">${esc(devList)}</td></tr>`;
      });
      html += `</table>`;
    }
    html += `<div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — ${dateStr}</div>`;
  }

  // ═══ SECTION: CRITICAL DRAWING NOTES & ANNOTATIONS ═══
  if (annotationReader) {
    html += `<div class="page-break"></div>`;
    const secAnnot = nextSec();
    html += `<h2>${secAnnot}. Critical Drawing Notes & Annotations</h2>`;
    html += `<div class="callout">The AI analyzed every text annotation, callout, keynote, and equipment schedule on the drawings. Items below are flagged because they directly affect scope, pricing, or coordination and should not be overlooked.</div>`;

    // ── Scope Exclusions (BY OTHERS / NIC / OFCI) ──
    const exclusions = annotationReader.exclusions || [];
    if (exclusions.length > 0) {
      html += `<h3 style="color:#DC2626;">⚠ Scope Exclusions Found on Drawings (BY OTHERS / NIC / OFCI)</h3>`;
      html += `<div class="callout" style="border-left-color:#DC2626;background:#fef2f2;">These items are explicitly marked on the drawings as <strong>outside your scope</strong>. Verify each one — if incorrectly excluded, they become change orders.</div>`;
      html += `<table><tr><th style="width:55%;">Item / Note</th><th style="width:20%;">Drawing Reference</th><th style="width:25%;">Marking</th></tr>`;
      exclusions.forEach(ex => {
        if (typeof ex === 'string') { html += `<tr><td colspan="3">${esc(ex)}</td></tr>`; }
        else { html += `<tr><td style="font-weight:600;">${esc(ex.item || ex.description || ex.text || '')}</td><td>${esc(ex.sheet_id || ex.sheet || '')}</td><td><span class="sev-warning">${esc(ex.note || ex.marking || 'BY OTHERS')}</span></td></tr>`; }
      });
      html += `</table>`;
    }

    // ── Equipment Schedules Extracted ──
    const schedules = annotationReader.schedule_data || [];
    if (schedules.length > 0) {
      html += `<h3>Equipment Schedules (Architect's Definitive Quantities)</h3>`;
      html += `<div class="callout-teal">Equipment schedules on the drawings are the <strong>most authoritative source</strong> of device counts. These override symbol counts when conflicts exist.</div>`;
      schedules.forEach(sched => {
        html += `<h3 style="font-size:10pt;">${esc(sched.schedule_name || 'Equipment Schedule')} — Sheet ${esc(sched.sheet_id || '?')} (${sched.total_items || 0} items)</h3>`;
        if (sched.summary_by_type && typeof sched.summary_by_type === 'object') {
          html += `<table><tr><th>Device Type</th><th style="text-align:center;">Count</th></tr>`;
          Object.entries(sched.summary_by_type).forEach(([type, count]) => {
            html += `<tr><td>${esc(type)}</td><td style="text-align:center;font-weight:700;">${count}</td></tr>`;
          });
          html += `</table>`;
        }
        // Show manufacturer/model data if present in line items
        const withMfr = (sched.line_items || []).filter(li => li.manufacturer || li.model);
        if (withMfr.length > 0) {
          html += `<table><tr><th>Tag</th><th>Type</th><th>Manufacturer</th><th>Model / Part #</th><th>Location</th></tr>`;
          withMfr.forEach(li => {
            html += `<tr><td>${esc(li.tag || '')}</td><td>${esc(li.type || '')}</td><td style="font-weight:600;">${esc(li.manufacturer || '—')}</td><td style="font-weight:600;">${esc(li.model || li.part_number || '—')}</td><td style="font-size:8.5pt;">${esc(li.location || '')}</td></tr>`;
          });
          html += `</table>`;
        }
      });
    }

    // ── Typical Note Multiplications ──
    const typicals = annotationReader.typical_multiplications || [];
    if (typicals.length > 0) {
      html += `<h3>Typical Note Calculations (TYP / TYPICAL)</h3>`;
      html += `<div class="callout-teal">"TYP" notes on drawings mean a device repeats at every matching location. The AI counted all qualifying locations across every sheet to derive totals.</div>`;
      html += `<table><tr><th style="width:35%;">Note Text</th><th style="width:15%;">Device</th><th style="text-align:center;width:10%;">Per Location</th><th style="text-align:center;width:10%;">Locations</th><th style="text-align:center;width:10%;">Total</th><th style="width:20%;">Sheets Checked</th></tr>`;
      typicals.forEach(t => {
        html += `<tr><td style="font-size:9pt;">${esc(t.note_text || t.text || '')}</td><td>${esc((t.device_type || '').replace(/_/g, ' '))}</td><td style="text-align:center;">${t.per_location_qty || 1}</td><td style="text-align:center;">${t.total_locations || '—'}</td><td style="text-align:center;font-weight:800;color:#0D9488;">${t.calculated_total || '—'}</td><td style="font-size:8pt;color:#6b7280;">${Array.isArray(t.sheets_checked) ? t.sheets_checked.join(', ') : (t.sheets_checked || '')}</td></tr>`;
      });
      html += `</table>`;
    }

    // ── Key Annotations by Sheet ──
    const annotations = annotationReader.annotations || [];
    const critAnnotations = annotations.filter(a => {
      const txt = (a.text || '').toLowerCase();
      return txt.includes('nic') || txt.includes('by others') || txt.includes('ofci') || txt.includes('owner') ||
             txt.includes('demolition') || txt.includes('remove') || txt.includes('existing') || txt.includes('addend') ||
             txt.includes('typ') || txt.includes('future') || txt.includes('not in contract') || txt.includes('deferred') ||
             a.type === 'typical_note' || a.type === 'demolition' || a.type === 'scope_exclusion';
    });
    if (critAnnotations.length > 0) {
      html += `<h3>Critical Annotations by Sheet</h3>`;
      // Group by sheet
      const bySheet = {};
      critAnnotations.forEach(a => {
        const sheet = a.sheet_id || 'Unknown';
        if (!bySheet[sheet]) bySheet[sheet] = [];
        bySheet[sheet].push(a);
      });
      Object.entries(bySheet).forEach(([sheet, items]) => {
        html += `<div style="margin-bottom:10px;"><strong style="color:#0D9488;">Sheet ${esc(sheet)}</strong>`;
        html += `<table style="margin-top:4px;"><tr><th style="width:15%;">Type</th><th style="width:55%;">Annotation Text</th><th style="width:30%;">Impact</th></tr>`;
        items.forEach(a => {
          const typeLabel = (a.type || 'note').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          html += `<tr><td><span class="sev-${a.type === 'scope_exclusion' || a.type === 'demolition' ? 'high' : 'info'}">${esc(typeLabel)}</span></td><td style="font-size:9pt;">${esc(a.text || '')}</td><td style="font-size:9pt;color:#6b7280;">${esc(a.impacts || a.impact || '')}</td></tr>`;
        });
        html += `</table></div>`;
      });
    }

    // ── Detail References ──
    const details = annotationReader.referenced_details || [];
    if (details.length > 0) {
      html += `<h3>Referenced Details</h3>`;
      html += `<table><tr><th>Reference</th><th>Description</th><th>Devices in Detail</th><th>From Sheet</th></tr>`;
      details.forEach(d => {
        html += `<tr><td style="font-weight:600;">${esc(d.reference || '')}</td><td>${esc(d.description || '')}</td><td style="font-size:9pt;">${Array.isArray(d.devices_in_detail) ? d.devices_in_detail.map(x => esc(x.replace(/_/g, ' '))).join(', ') : ''}</td><td>${esc(d.sheet_id || '')}</td></tr>`;
      });
      html += `</table>`;
    }

    html += `<div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — ${dateStr}</div>`;
  }

  // ═══ SECTION: CODE COMPLIANCE & REQUIRED PERMITS ═══
  if (codeCompliance) {
    html += `<div class="page-break"></div>`;
    const secCode = nextSec();
    html += `<h2>${secCode}. Code Compliance & Required Permits</h2>`;

    // Summary stats
    const summary = codeCompliance.summary || {};
    const critCount = summary.critical || 0;
    const warnCount = summary.warning || 0;
    const infoCount = summary.info || 0;
    html += `<div class="stat-grid">
      <div class="stat-box" style="${critCount > 0 ? 'border-color:#DC2626;background:linear-gradient(135deg,#fef2f2,#fee2e2);' : ''}"><div class="stat-value" style="${critCount > 0 ? 'color:#DC2626;' : ''}">${critCount}</div><div class="stat-label">Critical Issues</div></div>
      <div class="stat-box" style="${warnCount > 0 ? 'border-color:#D97706;background:linear-gradient(135deg,#fffbeb,#fef3c7);' : ''}"><div class="stat-value" style="${warnCount > 0 ? 'color:#D97706;' : ''}">${warnCount}</div><div class="stat-label">Warnings</div></div>
      <div class="stat-box"><div class="stat-value">${infoCount}</div><div class="stat-label">Informational</div></div>
    </div>`;

    // Issues table
    const issues = codeCompliance.issues || [];
    if (issues.length > 0) {
      html += `<h3>Compliance Findings</h3>`;
      if (critCount > 0) html += `<div class="callout" style="border-left-color:#DC2626;background:#fef2f2;"><strong>Critical findings require resolution before bid submission.</strong> These may affect scope, cost, or code compliance.</div>`;
      html += `<table><tr><th style="width:10%;">Severity</th><th style="width:12%;">Code Ref</th><th style="width:45%;">Description</th><th style="width:33%;">Required Action</th></tr>`;
      // Sort: critical first, then warning, then info
      const sevOrder = { critical: 0, warning: 1, info: 2 };
      [...issues].sort((a, b) => (sevOrder[a.severity] || 2) - (sevOrder[b.severity] || 2)).forEach(iss => {
        html += `<tr><td><span class="sev-${(iss.severity || 'info').toLowerCase()}">${esc(iss.severity || 'info')}</span></td><td style="font-weight:600;font-size:9pt;">${esc(iss.code || iss.article || '')}</td><td>${esc(iss.description || '')}${iss.location ? `<br><em style="font-size:8.5pt;color:#6b7280;">Location: ${esc(iss.location)}</em>` : ''}</td><td style="font-size:9pt;">${esc(iss.action || iss.recommendation || '')}</td></tr>`;
      });
      html += `</table>`;
    }

    // Required Permits
    const permits = codeCompliance.permits_required || [];
    if (permits.length > 0) {
      html += `<h3>Required Permits</h3>`;
      html += `<ul>`;
      permits.forEach(p => { html += `<li style="font-weight:600;">${esc(typeof p === 'string' ? p : p.name || p.type || '')}</li>`; });
      html += `</ul>`;
    }

    // Required Inspections
    const inspections = codeCompliance.inspections_required || [];
    if (inspections.length > 0) {
      html += `<h3>Required Inspections</h3>`;
      html += `<ul>`;
      inspections.forEach(insp => { html += `<li>${esc(typeof insp === 'string' ? insp : insp.name || insp.type || '')}</li>`; });
      html += `</ul>`;
    }

    html += `<div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — ${dateStr}</div>`;
  }

  // ═══ SECTION: DEVIL'S ADVOCATE ═══
  if (devilsAdvocate) {
    html += `<div class="page-break"></div>`;
    const secDevil = nextSec();
    html += `<h2>${secDevil}. Devil's Advocate Review</h2>`;
    if (devilsAdvocate.challenges && Array.isArray(devilsAdvocate.challenges)) {
      html += `<h3>Challenges & Risks</h3><table><tr><th style="width:55%;">Issue</th><th style="text-align:center;width:12%;">Severity</th><th style="text-align:right;width:15%;">Est. Impact</th></tr>`;
      devilsAdvocate.challenges.forEach(c => {
        html += `<tr><td>${esc(c.description || c.issue || (typeof c === 'string' ? c : ''))}</td><td style="text-align:center;"><span class="sev-${(c.severity || 'medium').toLowerCase()}">${c.severity || 'medium'}</span></td><td style="text-align:right;">${esc(typeof c.estimated_impact === 'number' ? fmtInt(c.estimated_impact) : (c.estimated_impact || '—'))}</td></tr>`;
      });
      html += `</table>`;
    }
    if (devilsAdvocate.missed_items && Array.isArray(devilsAdvocate.missed_items)) {
      html += `<h3>Potentially Missed Items</h3><ul>`;
      devilsAdvocate.missed_items.forEach(m => { html += `<li>${esc(typeof m === 'string' ? m : m.description || m.item || '')}</li>`; });
      html += `</ul>`;
    }
    if (devilsAdvocate.recommendations && Array.isArray(devilsAdvocate.recommendations)) {
      html += `<h3>Recommendations</h3><ul>`;
      devilsAdvocate.recommendations.forEach(r => { html += `<li>${esc(typeof r === 'string' ? r : r.description || r.recommendation || '')}</li>`; });
      html += `</ul>`;
    }
    html += `<div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — ${dateStr}</div>`;
  }

  // ═══ SECTION: ESTIMATE CORRECTIONS & QUALITY AUDIT ═══
  if (estimateCorrector?.correction_log || crossValidator?.issues) {
    html += `<div class="page-break"></div>`;
    const secCorr = nextSec();
    html += `<h2>${secCorr}. Estimate Corrections & Quality Audit</h2>`;
    html += `<div class="callout-teal">The AI performed automated quality checks on the estimate — verifying math, cross-checking quantities across multiple analysis passes, and correcting anomalies. Every correction is logged below for full transparency.</div>`;

    // Estimate Corrector results
    if (estimateCorrector) {
      if (estimateCorrector.original_grand_total && estimateCorrector.corrected_grand_total) {
        const adj = (estimateCorrector.total_adjustment || estimateCorrector.corrected_grand_total - estimateCorrector.original_grand_total);
        html += `<div class="stat-grid">
          <div class="stat-box"><div class="stat-value">${fmt(estimateCorrector.original_grand_total)}</div><div class="stat-label">Original Total</div></div>
          <div class="stat-box"><div class="stat-value">${fmt(estimateCorrector.corrected_grand_total)}</div><div class="stat-label">Corrected Total</div></div>
          <div class="stat-box" style="${adj < 0 ? 'border-color:#65A30D;' : 'border-color:#DC2626;'}"><div class="stat-value" style="${adj < 0 ? 'color:#65A30D;' : 'color:#DC2626;'}">${adj >= 0 ? '+' : ''}${fmt(adj)}</div><div class="stat-label">Net Adjustment</div></div>
        </div>`;
      }
      if (estimateCorrector.adjustment_summary) {
        html += `<div class="callout-teal"><strong>Summary:</strong> ${esc(estimateCorrector.adjustment_summary)}</div>`;
      }
      // Correction log
      const log = estimateCorrector.correction_log || [];
      if (log.length > 0) {
        html += `<h3>Correction Log</h3>`;
        html += `<table><tr><th style="width:12%;">Action</th><th style="width:30%;">Item</th><th style="text-align:center;width:10%;">From</th><th style="text-align:center;width:10%;">To</th><th style="text-align:right;width:15%;">Cost Impact</th><th style="width:23%;">Reason</th></tr>`;
        log.forEach(entry => {
          const actionLabel = (entry.action || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          html += `<tr><td><span class="sev-${entry.action === 'item_added' ? 'medium' : entry.action === 'qty_reduced' ? 'low' : 'warning'}">${esc(actionLabel)}</span></td><td style="font-weight:600;">${esc(entry.item || '')}</td><td style="text-align:center;">${entry.from != null ? entry.from : '—'}</td><td style="text-align:center;">${entry.to != null ? entry.to : '—'}</td><td style="text-align:right;font-weight:700;color:${(entry.cost_impact || 0) < 0 ? '#65A30D' : '#DC2626'};">${entry.cost_impact ? fmt(entry.cost_impact) : '—'}</td><td style="font-size:9pt;">${esc(entry.reason || '')}</td></tr>`;
        });
        html += `</table>`;
      }
    }

    // Cross-Validator results
    if (crossValidator?.issues && crossValidator.issues.length > 0) {
      html += `<h3>Cross-Validation Checks</h3>`;
      html += `<table><tr><th style="width:10%;">Severity</th><th style="width:12%;">Category</th><th style="width:45%;">Finding</th><th style="width:33%;">Correction</th></tr>`;
      crossValidator.issues.forEach(iss => {
        html += `<tr><td><span class="sev-${(iss.severity || 'info').toLowerCase()}">${esc(iss.severity || 'info')}</span></td><td style="font-size:9pt;">${esc((iss.category || '').replace(/_/g, ' '))}</td><td>${esc(iss.description || '')}</td><td style="font-size:9pt;">${esc(iss.correction || '')}</td></tr>`;
      });
      html += `</table>`;
    }

    // Quantity crosscheck
    if (crossValidator?.quantity_crosscheck && crossValidator.quantity_crosscheck.length > 0) {
      const mismatches = crossValidator.quantity_crosscheck.filter(q => !q.match);
      if (mismatches.length > 0) {
        html += `<h3>Quantity Discrepancies</h3>`;
        html += `<table><tr><th>Item</th><th style="text-align:center;">Scanner Count</th><th style="text-align:center;">Pricer Count</th><th style="text-align:center;">Match</th></tr>`;
        mismatches.forEach(q => {
          html += `<tr><td>${esc(q.item || '')}</td><td style="text-align:center;">${q.scanner_count || 0}</td><td style="text-align:center;">${q.pricer_count || 0}</td><td style="text-align:center;color:#DC2626;font-weight:700;">✗ Mismatch</td></tr>`;
        });
        html += `</table>`;
      }
    }

    html += `<div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — ${dateStr}</div>`;
  }

  // ═══ SECTION: SPECIAL CONDITIONS ═══
  if (specialConditions) {
    html += `<div class="page-break"></div>`;
    const secSpec = nextSec();
    html += `<h2>${secSpec}. Special Conditions</h2>`;
    // Permits — handle object format
    if (specialConditions.permits && Array.isArray(specialConditions.permits) && specialConditions.permits.length > 0) {
      html += `<h3>Required Permits</h3><table><tr><th>Permit</th><th>Jurisdiction</th><th style="text-align:right;">Est. Cost</th><th>Lead Time</th><th>Notes</th></tr>`;
      specialConditions.permits.forEach(p => {
        if (typeof p === 'string') { html += `<tr><td colspan="5">${esc(p)}</td></tr>`; }
        else { html += `<tr><td>${esc(p.type || p.name || p.description || '')}</td><td>${esc(p.jurisdiction || '')}</td><td style="text-align:right;">${p.est_cost ? fmtInt(p.est_cost) : '—'}</td><td>${p.lead_time_days ? p.lead_time_days + ' days' : '—'}</td><td style="font-size:8.5pt;">${esc(p.note || '')}</td></tr>`; }
      });
      html += `</table>`;
    }
    // Subcontractors — handle string or object
    if (specialConditions.subcontractors && Array.isArray(specialConditions.subcontractors) && specialConditions.subcontractors.length > 0) {
      html += `<h3>Subcontractor Requirements</h3><ul>`;
      specialConditions.subcontractors.forEach(s => {
        if (typeof s === 'string') { html += `<li>${esc(s)}</li>`; }
        else { html += `<li><strong>${esc(s.trade || s.name || '')}</strong>${s.scope ? ': ' + esc(s.scope) : ''}${s.est_cost ? ' — ' + fmtInt(s.est_cost) : ''}</li>`; }
      });
      html += `</ul>`;
    }
    // Site conditions — handle array of objects
    if (specialConditions.site_conditions) {
      html += `<h3>Site Conditions</h3>`;
      const sc = specialConditions.site_conditions;
      if (Array.isArray(sc)) {
        html += `<table><tr><th>Condition</th><th>Impact</th><th style="text-align:center;">Cost Impact</th></tr>`;
        sc.forEach(c => {
          if (typeof c === 'string') { html += `<tr><td colspan="3">${esc(c)}</td></tr>`; }
          else { html += `<tr><td style="font-weight:600;">${esc(c.condition || '')}</td><td style="font-size:9pt;">${esc(c.impact || '')}</td><td style="text-align:center;font-weight:700;color:#D97706;">${esc(c.cost_impact || '')}</td></tr>`; }
        });
        html += `</table>`;
      } else if (typeof sc === 'string') {
        html += `<p>${esc(sc)}</p>`;
      } else {
        html += renderVal(sc);
      }
    }
    // Equipment
    if (specialConditions.equipment && Array.isArray(specialConditions.equipment) && specialConditions.equipment.length > 0) {
      html += `<h3>Special Equipment Required</h3><ul>`;
      specialConditions.equipment.forEach(e => {
        if (typeof e === 'string') { html += `<li>${esc(e)}</li>`; }
        else { html += `<li><strong>${esc(e.name || e.type || '')}</strong>${e.description ? ': ' + esc(e.description) : ''}${e.est_cost ? ' — ' + fmtInt(e.est_cost) : ''}</li>`; }
      });
      html += `</ul>`;
    }
    // Equipment Rentals
    if (specialConditions.equipment_rentals && Array.isArray(specialConditions.equipment_rentals) && specialConditions.equipment_rentals.length > 0) {
      html += `<h3>Equipment Rentals</h3><table><tr><th>Equipment</th><th style="text-align:center;">Duration</th><th style="text-align:right;">Daily Rate</th><th style="text-align:right;">Est. Total</th><th>Reason</th></tr>`;
      specialConditions.equipment_rentals.forEach(er => {
        if (typeof er === 'string') { html += `<tr><td colspan="5">${esc(er)}</td></tr>`; }
        else {
          const total = (er.duration_days || 0) * (er.daily_rate || 0);
          html += `<tr><td style="font-weight:600;">${esc(er.item || er.name || '')}</td><td style="text-align:center;">${er.duration_days || '—'} days</td><td style="text-align:right;">${er.daily_rate ? fmt(er.daily_rate) : '—'}</td><td style="text-align:right;font-weight:600;">${total > 0 ? fmt(total) : '—'}</td><td style="font-size:9pt;">${esc(er.reason || '')}</td></tr>`;
        }
      });
      html += `</table>`;
    }
    // Civil Work / Underground
    if (specialConditions.civil_work && Array.isArray(specialConditions.civil_work) && specialConditions.civil_work.length > 0) {
      html += `<h3>Civil Work & Underground</h3>`;
      html += `<div class="callout" style="border-left-color:#DC2626;background:#fef2f2;">Civil work often requires subcontractors, permits, and utility locates. Verify scope with site survey before bidding.</div>`;
      html += `<table><tr><th>Scope</th><th style="text-align:center;">Distance</th><th style="text-align:center;">Depth</th><th>Surface</th><th style="text-align:right;">Est. Cost</th></tr>`;
      specialConditions.civil_work.forEach(cw => {
        if (typeof cw === 'string') { html += `<tr><td colspan="5">${esc(cw)}</td></tr>`; }
        else { html += `<tr><td style="font-weight:600;">${esc(cw.scope || '')}</td><td style="text-align:center;">${cw.distance_ft ? cw.distance_ft + ' ft' : '—'}</td><td style="text-align:center;">${cw.depth_in ? cw.depth_in + ' in' : '—'}</td><td>${esc(cw.surface || '')}</td><td style="text-align:right;font-weight:600;">${esc(cw.est_cost_range || '—')}</td></tr>`; }
      });
      html += `</table>`;
    }
    // Traffic Control
    if (specialConditions.traffic_control && Array.isArray(specialConditions.traffic_control) && specialConditions.traffic_control.length > 0) {
      html += `<h3>Traffic Control</h3><table><tr><th>Item</th><th style="text-align:center;">Duration</th><th style="text-align:right;">Daily Rate</th><th>Reason</th></tr>`;
      specialConditions.traffic_control.forEach(tc => {
        if (typeof tc === 'string') { html += `<tr><td colspan="4">${esc(tc)}</td></tr>`; }
        else { html += `<tr><td style="font-weight:600;">${esc(tc.item || '')}</td><td style="text-align:center;">${tc.duration_days ? tc.duration_days + ' days' : '—'}</td><td style="text-align:right;">${tc.daily_rate ? fmt(tc.daily_rate) : '—'}</td><td style="font-size:9pt;">${esc(tc.reason || '')}</td></tr>`; }
      });
      html += `</table>`;
    }
    // Conduit Infrastructure
    if (specialConditions.conduit_infrastructure && Array.isArray(specialConditions.conduit_infrastructure) && specialConditions.conduit_infrastructure.length > 0) {
      html += `<h3>Conduit Infrastructure</h3><table><tr><th>Type / Size</th><th style="text-align:center;">Quantity</th><th>Location</th><th>Install Method</th></tr>`;
      specialConditions.conduit_infrastructure.forEach(ci => {
        if (typeof ci === 'string') { html += `<tr><td colspan="4">${esc(ci)}</td></tr>`; }
        else { html += `<tr><td style="font-weight:600;">${esc(ci.type || '')}</td><td style="text-align:center;">${ci.quantity_ft ? ci.quantity_ft + ' ft' : '—'}</td><td>${esc(ci.location || '')}</td><td style="font-size:9pt;">${esc(ci.install_method || '')}</td></tr>`; }
      });
      html += `</table>`;
    }
    // Risks
    if (specialConditions.risks && Array.isArray(specialConditions.risks) && specialConditions.risks.length > 0) {
      html += `<h3>Identified Risks</h3>`;
      html += `<table><tr><th style="width:10%;">Severity</th><th style="width:40%;">Risk</th><th style="width:50%;">Mitigation</th></tr>`;
      specialConditions.risks.forEach(r => {
        if (typeof r === 'string') { html += `<tr><td colspan="3">${esc(r)}</td></tr>`; }
        else { html += `<tr><td><span class="sev-${(r.severity || 'medium').toLowerCase()}">${esc(r.severity || 'medium')}</span></td><td style="font-weight:600;">${esc(r.risk || r.description || '')}</td><td style="font-size:9pt;">${esc(r.mitigation || '')}</td></tr>`; }
      });
      html += `</table>`;
    }
    // Transit / Railroad
    if (specialConditions.transit_railroad && specialConditions.transit_railroad.applicable) {
      const tr = specialConditions.transit_railroad;
      html += `<h3>Transit / Railroad Requirements</h3>`;
      html += `<div class="callout" style="border-left-color:#DC2626;background:#fef2f2;"><strong>Railroad/Transit work adds significant cost.</strong> RWIC flagmen, RPL insurance, safety training, and restricted work windows typically add 20-30% to productivity.</div>`;
      html += `<table><tr><th style="width:65%;">Item</th><th style="text-align:right;">Cost</th></tr>`;
      if (tr.rwic_flagman_days) html += `<tr><td>RWIC Flagman (${tr.rwic_flagman_days} days × ${fmt(tr.rwic_daily_rate || 1200)}/day)</td><td style="text-align:right;font-weight:600;">${fmt(tr.rwic_flagman_days * (tr.rwic_daily_rate || 1200))}</td></tr>`;
      if (tr.safety_training_cost) html += `<tr><td>Safety Training & Certification</td><td style="text-align:right;font-weight:600;">${fmt(tr.safety_training_cost)}</td></tr>`;
      if (tr.rpl_insurance) html += `<tr><td>Railroad Protective Liability (RPL) Insurance</td><td style="text-align:right;font-weight:600;">${fmt(tr.rpl_insurance)}</td></tr>`;
      html += `</table>`;
    }
    // Safety requirements
    if (specialConditions.safety_requirements && Array.isArray(specialConditions.safety_requirements)) {
      html += `<h3>Safety Requirements</h3><ul>`;
      specialConditions.safety_requirements.forEach(s => { html += `<li>${renderVal(s)}</li>`; });
      html += `</ul>`;
    }
    html += `<div class="footer-bar">3D CONFIDENTIAL — Bid #${esc(bidNumber)} — ${dateStr}</div>`;
  }

  // ═══ END ═══
  html += `</body></html>`;

  openPrintAsPDF(html);
}

function _safeParseDisciplines(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[')) { try { return JSON.parse(trimmed); } catch(e) { console.warn('JSON parse fall-through:', e); } }
    return trimmed.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function showValidationToast(errors) {
  // Remove any existing toast
  const existing = document.getElementById("validation-toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "validation-toast";
  toast.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--surface-2,#1e1e2e);border:1px solid var(--red-dim,#f87171);color:var(--text-primary,#fff);padding:12px 20px;border-radius:10px;z-index:9999;max-width:400px;font-size:14px;box-shadow:0 4px 20px rgba(0,0,0,0.4);";
  toast.innerHTML = errors.map(e => "<div style='margin:2px 0;'>⚠ " + esc(e) + "</div>").join("");
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4000);
}

function getStep0ValidationErrors() {
  const errors = [];
  const name = state.projectName.trim();
  if (!name) errors.push("Project name is required.");
  else if (name.length > 200) errors.push("Project name must be 200 characters or fewer.");
  if (!state.projectType) errors.push("Project type is required.");
  if (state.disciplines.length === 0) errors.push("At least one discipline must be selected.");
  return errors;
}

function canProceed() {
  switch (state.currentStep) {
    case 0: return getStep0ValidationErrors().length === 0;
    case 1: return true; // legend is recommended but we allow skipping
    case 2: return state.planFiles.length > 0;
    case 3: return true; // specs optional
    case 4: return state.hasAddenda !== null;
    case 5: return true;
    case 6: return true; // travel/incidentals — always allow proceeding
    default: return false;
  }
}

function getAccuracyEstimate() {
  let base = 58;
  const fmt = state.fileFormat;
  if (fmt === "Vector PDF (from CAD)" || fmt === "DWG / DXF (AutoCAD)" || fmt === "IFC / Revit BIM") base = 86;
  else if (fmt === "High-res scan (300+ DPI)") base = 70;
  if (state.legendFiles.length > 0) base += 5;
  if (state.specFiles.length > 0) base += 3;
  if (state.knownQuantities.trim()) base += 2;
  if (state.specificItems.trim()) base += 2;
  if (state.codeJurisdiction.trim()) base += 1;
  if (state.priorEstimate.trim()) base += 1;
  return Math.min(base, 99);
}

function getTrafficLight(accuracy) {
  if (accuracy >= 85) return { color: '#10b981', glow: 'rgba(16,185,129,0.25)', label: '🟢 HIGH', css: 'traffic-green' };
  if (accuracy >= 70) return { color: '#f59e0b', glow: 'rgba(245,158,11,0.25)', label: '🟡 MODERATE', css: 'traffic-yellow' };
  return { color: '#ef4444', glow: 'rgba(239,68,68,0.25)', label: '🔴 LOW', css: 'traffic-red' };
}

function getRelevantRFIs() {
  const rfis = [];
  state.disciplines.forEach(d => {
    const key = Object.keys(RFI_TEMPLATES).find(k => k === d || d.startsWith(k.split(" ")[0]));
    if (key && RFI_TEMPLATES[key]) {
      rfis.push(...RFI_TEMPLATES[key].map(r => ({ ...r, discipline: key })));
    }
  });
  // Always include Architectural for cross-discipline gaps
  if (!state.disciplines.includes("Architectural") && RFI_TEMPLATES["Architectural"]) {
    rfis.push(...RFI_TEMPLATES["Architectural"].map(r => ({ ...r, discipline: "Architectural" })));
  }
  return rfis;
}

function getFormatInfo(label) {
  return FILE_FORMATS.find(f => f.label === label) || null;
}

// ─── Extract BOM filtered by selected disciplines ────────────
// Convenience wrapper: extracts BOM from AI analysis, then removes
// categories for unselected disciplines. All UI code should use this
// instead of calling SmartPlansExport._extractBOMFromAnalysis directly.
function getFilteredBOM(aiAnalysis, disciplines) {
  if (typeof SmartPlansExport === 'undefined') return { categories: [], grandTotal: 0 };

  // FIX: If this estimate was loaded from a truncated save, use the pre-structured
  // financials data instead of re-parsing the chopped markdown. This restores the
  // correct BOM for bids saved with the old truncation bug.
  let bom;
  if (state._restoredFinancials?.categories?.length > 0) {
    const restored = state._restoredFinancials;
    bom = {
      categories: restored.categories.map(cat => ({
        name: cat.name,
        subtotal: cat.subtotal,
        items: cat.items.map(item => ({
          item: item.name,
          name: item.name,
          qty: item.qty,
          unit: item.unit || 'ea',
          unitCost: item.unitCost,
          extCost: item.extCost,
          mfg: item.mfg || '',
          partNumber: item.partNumber || '',
          category: item.category || 'other',
        })),
      })),
      grandTotal: restored.bomRawTotal || restored.categories.reduce((s, c) => s + c.subtotal, 0),
    };
  } else {
    bom = SmartPlansExport._extractBOMFromAnalysis(aiAnalysis);
    if (typeof SmartPlansExport._filterBOMByDisciplines === 'function') {
      bom = SmartPlansExport._filterBOMByDisciplines(bom, disciplines);
    }
  }

  // ── Apply manual item edits (add/delete) ──
  const deleted = state.deletedBomItems || {};
  const manual = state.manualBomItems || [];

  // Remove deleted items
  if (Object.keys(deleted).length > 0) {
    bom.categories.forEach((cat, ci) => {
      cat.items = cat.items.filter((_, ii) => !deleted[ci + '-' + ii]);
    });
  }

  // Add manual items into their target categories
  if (manual.length > 0) {
    manual.forEach(mi => {
      const ci = mi.catIndex;
      if (bom.categories[ci]) {
        bom.categories[ci].items.push({
          name: mi.name,
          item: mi.name,
          qty: mi.qty || 0,
          unit: mi.unit || 'EA',
          unitCost: mi.unitCost || 0,
          extCost: Math.round((mi.qty || 0) * (mi.unitCost || 0) * 100) / 100,
          mfg: mi.mfg || '',
          partNumber: mi.partNumber || '',
          category: 'manual',
          _manual: true,
          _manualId: mi.id,
        });
      }
    });
  }

  // Recalculate subtotals and grand total after add/delete
  if (Object.keys(deleted).length > 0 || manual.length > 0) {
    bom.grandTotal = 0;
    bom.categories.forEach(cat => {
      cat.subtotal = cat.items.reduce((s, it) => s + (it.extCost || 0), 0);
      cat.subtotal = Math.round(cat.subtotal * 100) / 100;
      bom.grandTotal += cat.subtotal;
    });
    bom.grandTotal = Math.round(bom.grandTotal * 100) / 100;
  }

  return bom;
}


// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

function render() {
  renderStepNav();
  renderContent();
  renderFooter();
  // Initialize Lucide icons after DOM update
  if (typeof lucide !== 'undefined') {
    try { lucide.createIcons(); } catch(e) { console.warn('Lucide createIcons failed:', e); }
  }
}

// ─── Step Navigation ───
function renderStepNav() {
  const nav = document.getElementById("step-nav");
  if (!nav) return;
  let html = "";
  STEPS.forEach((step, i) => {
    const isActive = i === state.currentStep;
    const isCompleted = state.completedSteps.has(step.id);
    const isClickable = isCompleted || i <= state.currentStep;

    let classes = "step-btn";
    if (isActive) classes += " active";
    if (isCompleted) classes += " completed";
    if (isClickable) classes += " clickable";

    html += `<div class="step-item">
      <button class="${classes}" data-step="${i}" ${!isClickable ? "disabled" : ""} aria-label="${step.title}">
        <div class="step-circle">${isCompleted ? "✓" : step.icon}</div>
        <span class="step-label">${step.title}</span>
      </button>
      ${i < STEPS.length - 1 ? `<div class="step-connector${isCompleted ? " done" : ""}"></div>` : ""}
    </div>`;
  });
  nav.innerHTML = html;

  nav.querySelectorAll(".step-btn.clickable").forEach(btn => {
    btn.addEventListener("click", () => {
      state.currentStep = parseInt(btn.dataset.step);
      render();
      scrollContentTop();
    });
  });
}

// ─── Content Router ───
function renderContent() {
  const main = document.getElementById("step-content");
  if (!main) return;

  try {
    if (state.analyzing) {
      renderAnalysis(main);
      return;
    }

    switch (state.currentStep) {
      case 0: renderStep0(main); break;
      case 1: renderStep1(main); break;
      case 2: renderStep2(main); break;
      case 3: renderStep3(main); break;
      case 4: renderStep4(main); break;
      case 5: renderStep5(main); break;
      case 6:
        if (state.analyzing) {
          main.innerHTML = `<div style="padding:60px 20px;text-align:center;">
            <div style="font-size:48px;margin-bottom:16px;">⏳</div>
            <div style="font-size:16px;font-weight:600;color:var(--text-primary);">Analysis in progress…</div>
            <div style="font-size:13px;color:var(--text-muted);margin-top:8px;">Please wait while the analysis completes.</div>
          </div>`;
          return;
        }
        renderStep6Travel(main);
        break;
      case 7: renderStep7(main); break;
    }
  } catch (err) {
    console.error('Render error:', err);
    main.innerHTML = `<div style="padding:40px;color:#f43f5e;">
      <h3>Something went wrong</h3>
      <p>${esc(err.message)}</p>
      <button onclick="render()" style="margin-top:12px;padding:8px 16px;border-radius:6px;border:1px solid #f43f5e;background:rgba(244,63,94,0.1);color:#f43f5e;cursor:pointer;">Try Again</button>
    </div>`;
  }
}

// ─── Footer ───
function renderFooter() {
  const footer = document.getElementById("step-footer");
  if (!footer) return;

  if (state.analyzing) {
    footer.innerHTML = "";
    footer.style.display = "none";
    return;
  }

  footer.style.display = "flex";

  if (state.currentStep === 7) {
    footer.innerHTML = `
      <button class="footer-btn--restart" id="btn-restart">🔄 Start New Analysis</button>
    `;
    footer.style.justifyContent = "center";
    document.getElementById("btn-restart").addEventListener("click", () => {
      state.currentStep = 0;
      state.completedSteps.clear();
      state.analysisComplete = false;
      state.selectedRFIs.clear();
      state.expandedRFI = null;
      state.estimateId = null; // Reset so next save creates a new record
      state.aiAnalysis = null;
      state.aiError = null;
      state.supplierPriceOverrides = {};
      state.supplierQuotes = [];
      render();
      scrollContentTop();
    });
    return;
  }

  footer.style.justifyContent = "space-between";
  const can = canProceed();

  const showSave = state.projectName && state.currentStep > 0;
  footer.innerHTML = `
    <button class="footer-btn footer-btn--back" id="btn-back" ${state.currentStep === 0 ? "disabled" : ""}>&larr; Back</button>
    <div style="display:flex;align-items:center;gap:12px;">
      ${showSave ? '<button class="footer-btn footer-btn--back" id="btn-save-draft" style="border-color:rgba(129,140,248,0.3);color:var(--accent-indigo);">💾 Save</button>' : ''}
      <span class="footer-step-indicator">Step ${state.currentStep + 1} of ${STEPS.length}</span>
    </div>
    <button class="footer-btn footer-btn--next" id="btn-next" ${!can || (state.currentStep === 5 && QuotaMonitor.isBlocked()) ? "disabled" : ""}>
      ${state.currentStep === 5 ? "🔍 Begin Analysis" : state.currentStep === 6 ? "📊 View Results →" : "Next →"}
    </button>
  `;

  document.getElementById("btn-back").addEventListener("click", () => {
    if (state.currentStep > 0) {
      state.currentStep--;
      render();
      scrollContentTop();
    }
  });

  document.getElementById("btn-next").addEventListener("click", () => {
    if (!canProceed() || (state.currentStep === 5 && QuotaMonitor.isBlocked())) {
      // Show validation errors for step 0
      if (state.currentStep === 0) {
        const errors = getStep0ValidationErrors();
        if (errors.length > 0) {
          showValidationToast(errors);
        }
      }
      return;
    }
    const stepId = STEPS[state.currentStep].id;
    state.completedSteps.add(stepId);

    if (state.currentStep === 5) {
      if (state.analyzing) {
        spToast('Analysis already in progress — please wait', 'warning');
        return;
      }
      state.analyzing = true;
      render();
    } else {
      state.currentStep++;
      render();
      scrollContentTop();
    }
  });

  const saveBtn = document.getElementById("btn-save-draft");
  if (saveBtn) saveBtn.addEventListener("click", () => saveEstimate(true));
}

function scrollContentTop() {
  const main = document.getElementById("step-content");
  if (!main) return;
  main.scrollTo({ top: 0, behavior: "smooth" });
}


// ═══════════════════════════════════════════════════════════════
// STEP RENDERERS
// ═══════════════════════════════════════════════════════════════

// ─── Step 0: Project Setup ───
function renderStep0(container) {
  const formatOptions = FILE_FORMATS.map(f => `<option value="${esc(f.label)}">${esc(f.label)}</option>`).join("");
  const projectTypeOptions = PROJECT_TYPES.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
  const disciplineChips = DISCIPLINES.map(d => {
    const sel = state.disciplines.includes(d) ? " selected" : "";
    return `<button class="chip${sel}" data-disc="${esc(d)}">${sel ? "✓ " : ""}${esc(d)}</button>`;
  }).join("");

  let formatFeedback = "";
  if (state.fileFormat) {
    const fi = getFormatInfo(state.fileFormat);
    if (fi) {
      const q = fi.quality;
      let msg = "";
      if (q === "best") msg = "Excellent choice. This format preserves full symbol data, text selectability, and precise geometry. You'll get the highest accuracy possible.";
      else if (q === "ok") msg = "Acceptable but not ideal. Scanned plans lose text selectability and fine detail. Expect 70–85% accuracy. If possible, request vector PDFs from the architect.";
      else msg = "This format will significantly limit accuracy. Small symbols blur together and text becomes unreadable. Strongly recommend requesting higher-quality files from the design team.";

      formatFeedback = `
        <div class="format-badge ${q}">
          ${q === "best" ? "✓ Best Quality" : q === "ok" ? "⚠ Acceptable" : "⚠ Low Quality"}
        </div>
        <div class="info-card info-card--${q === "best" ? "emerald" : q === "ok" ? "amber" : "rose"}">
          <div class="info-card-title">Format Quality</div>
          <div class="info-card-body">${msg}</div>
        </div>
      `;
    }
  }

  container.innerHTML = `
    <h2 class="step-heading">Tell me about your project</h2>
    <p class="step-subheading">This context helps me analyze your plans more accurately. The more detail you provide, the better my results will be.</p>

    <div class="form-group">
      <label class="form-label" for="project-name">Project Name <span class="required">*</span></label>
      <p class="form-hint">A name to identify this analysis</p>
      <input class="form-input" type="text" id="project-name" value="${esc(state.projectName)}" placeholder="e.g., Sunrise Medical Center Phase 2">
    </div>

    <div class="form-group">
      <label class="form-label" for="prepared-for">Prepared For (GC / Agency) <span style="color:var(--text-muted);font-weight:400">(optional)</span></label>
      <p class="form-hint">The General Contractor, agency, or client this proposal will be addressed to.</p>
      <input class="form-input" type="text" id="prepared-for" value="${esc(state.preparedFor)}" placeholder="e.g., Turner Construction, Sacramento County">
    </div>

    <div class="form-group">
      <label class="form-label" for="project-type">Project Type <span class="required">*</span></label>
      <p class="form-hint">This determines how I interpret existing vs. new work on the plans</p>
      <select class="form-select" id="project-type">
        <option value="">Select…</option>
        ${projectTypeOptions}
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">Which disciplines should I focus on? <span class="required">*</span></label>
      <p class="form-hint">Select all that apply. Focusing on specific trades eliminates false positives from similar-looking symbols across disciplines.</p>
      <div class="chip-grid" id="discipline-chips">${disciplineChips}</div>
    </div>

    <div class="form-group">
      <label class="form-label" for="file-format">What file format are your drawings in?</label>
      <select class="form-select" id="file-format">
        <option value="">Select…</option>
        ${formatOptions}
      </select>
    </div>
    ${formatFeedback}

    <div class="form-group">
      <label class="form-label" for="specific-items">Specific items to count <span style="color:var(--text-muted);font-weight:400">(optional)</span></label>
      <p class="form-hint">e.g., "Count all duplex receptacles, GFI outlets, and dedicated circuits on sheets E-101 through E-105." Targeted requests are much more accurate than "count everything."</p>
      <textarea class="form-textarea" id="specific-items" placeholder="Describe what you'd like counted…">${esc(state.specificItems)}</textarea>
    </div>

    <div class="form-group">
      <label class="form-label" for="known-quantities">Known quantities for verification <span style="color:var(--text-muted);font-weight:400">(optional)</span></label>
      <p class="form-hint">If you already know approximate counts (e.g., "roughly 47 light fixtures on 2nd floor"), I can flag significant deviations.</p>
      <textarea class="form-textarea" id="known-quantities" placeholder="Describe any counts you already have…">${esc(state.knownQuantities)}</textarea>
    </div>

    <div class="form-group">
      <label class="form-label" for="code-jurisdiction">Building code jurisdiction <span style="color:var(--text-muted);font-weight:400">(optional)</span></label>
      <p class="form-hint">e.g., IBC 2021, California CBC, NYC Building Code. Helps me flag potential code-required minimums.</p>
      <input class="form-input" type="text" id="code-jurisdiction" value="${esc(state.codeJurisdiction)}" placeholder="e.g., IBC 2021">
    </div>

    <div class="form-group">
      <label class="form-label" for="project-location">Project Location <span style="color:var(--text-muted);font-weight:400">(for travel estimate)</span></label>
      <p class="form-hint">City and state of the project site. If the project is 100+ miles from your office, travel expenses (hotel, meals, airfare, vehicle) will be calculated.</p>
      <input class="form-input" type="text" id="project-location" value="${esc(state.projectLocation)}" placeholder="e.g., Austin, TX or Miami, FL">
    </div>

    <div class="form-group">
      <label class="form-label">Building Heights <span style="color:var(--text-muted);font-weight:400">optional — defaults shown</span></label>
      <p class="form-hint">The AI reads the scale on every page of your plans automatically — including using door openings (36" standard) when no scale bar is found. Floor plate dimensions are detected per-sheet. Override ceiling/floor heights only if the plans don't show them.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px;">
        <div>
          <label style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:4px;">Ceiling Height (ft)</label>
          <input class="form-input" type="number" id="ceiling-height" min="6" max="40" step="0.5"
            value="${state.ceilingHeight || 10}" placeholder="10">
        </div>
        <div>
          <label style="font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);font-weight:600;display:block;margin-bottom:4px;">Floor-to-Floor Height (ft)</label>
          <input class="form-input" type="number" id="floor-to-floor-height" min="8" max="60" step="0.5"
            value="${state.floorToFloorHeight || 14}" placeholder="14">
        </div>
      </div>
      <div style="margin-top:8px;font-size:11px;color:var(--text-muted);">💡 Scale is detected per-sheet from: title block notations → scale bars → dimension lines → door openings (36" fallback). See the Cable Pathway card on results for what was detected.</div>
    </div>

    <div class="form-group">
      <label class="form-label" for="prevailing-wage">Prevailing Wage / Davis-Bacon</label>
      <p class="form-hint">For government, public, or federally funded projects. Determines labor rate classifications and certified payroll requirements. When active, labor rates auto-populate with loaded rates (base + fringes) and burden is disabled to prevent double-counting.</p>
      <select class="form-select" id="prevailing-wage">
        <option value="">Not applicable — standard rates</option>
        <option value="davis-bacon">Davis-Bacon (federal project)</option>
        <option value="state-prevailing">State prevailing wage</option>
        <option value="pla">Project Labor Agreement (PLA)</option>
      </select>
    </div>
    ${state.prevailingWage ? `
    <div class="info-card info-card--amber" style="margin-bottom:16px;">
      <div class="info-card-title">⚖️ Prevailing Wage Active</div>
      <div class="info-card-body">
        Labor costs will be calculated using ${state.prevailingWage === 'davis-bacon' ? 'federal Davis-Bacon' : state.prevailingWage === 'state-prevailing' ? 'CA DIR' : 'PLA'} wage determinations.<br>

        <div class="form-group" style="margin-top:12px;margin-bottom:8px;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="pw-county">📍 California County</label>
          <select class="form-select" id="pw-county" style="font-size:13px;">
            <option value="">— Select county for auto-rates —</option>
            ${typeof CA_PREVAILING_WAGES !== 'undefined' ? CA_PREVAILING_WAGES.getCounties().map(c =>
              `<option value="${c}" ${state._pwCounty === c ? 'selected' : ''}>${c} County</option>`
            ).join('') : ''}
          </select>
        </div>

        <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(235,179,40,0.15);">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="pw-state">📍 Other States (Davis-Bacon)</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <select class="form-select" id="pw-state" style="font-size:13px;">
              <option value="">— Select state —</option>
              ${typeof NATIONAL_PREVAILING_WAGES !== 'undefined' ? NATIONAL_PREVAILING_WAGES.getStates().map(s =>
                `<option value="${s}" ${state._pwState === s ? 'selected' : ''}>${NATIONAL_PREVAILING_WAGES._stateNames[s] || s}</option>`
              ).join('') : ''}
            </select>
            <select class="form-select" id="pw-metro" style="font-size:13px;" ${!state._pwState ? 'disabled' : ''}>
              <option value="">— Select metro —</option>
              ${state._pwState && typeof NATIONAL_PREVAILING_WAGES !== 'undefined' ? NATIONAL_PREVAILING_WAGES.getMetrosForState(state._pwState).map(m =>
                `<option value="${m.key}" ${state._pwMetro === m.key ? 'selected' : ''}>${m.label}</option>`
              ).join('') : ''}
            </select>
          </div>
        </div>

        ${state._pwMetro && typeof NATIONAL_PREVAILING_WAGES !== 'undefined' ? (() => {
          const rates = NATIONAL_PREVAILING_WAGES.getRates(state._pwMetro);
          const zoneLabel = NATIONAL_PREVAILING_WAGES.getZoneLabel(state._pwMetro);
          const blended = NATIONAL_PREVAILING_WAGES.getBlendedRate(state._pwMetro);
          if (!rates) return '';
          const fmt = n => '$' + n.toFixed(2);
          return `
        <div style="margin-top:8px;padding:10px 14px;background:rgba(235,179,40,0.08);border-radius:8px;border:1px solid rgba(235,179,40,0.2);font-size:11px;">
          <div style="font-weight:700;color:var(--accent-amber);margin-bottom:6px;">${zoneLabel}</div>
          <div style="display:grid;grid-template-columns:1fr auto;gap:2px 10px;font-size:11px;">
            <div>Comm Installer → Journeyman</div><div style="text-align:right;font-weight:600;color:var(--accent-amber);">${fmt(rates.comm_installer.total)}</div>
            <div>Comm Technician → Lead</div><div style="text-align:right;font-weight:600;color:var(--accent-amber);">${fmt(rates.comm_tech.total)}</div>
            <div>Foreman (+${rates.foreman_pct}%)</div><div style="text-align:right;font-weight:600;color:var(--accent-amber);">${fmt(rates.comm_tech.total * (1 + rates.foreman_pct/100))}</div>
            <div>Apprentice (${rates.apprentice_pct}%)</div><div style="text-align:right;font-weight:600;color:var(--accent-amber);">${fmt(rates.comm_installer.total * rates.apprentice_pct/100)}</div>
            <div>Electrician</div><div style="text-align:right;font-weight:600;color:var(--accent-amber);">${fmt(rates.electrician.total)}</div>
          </div>
          <div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(235,179,40,0.2);font-weight:700;color:var(--accent-amber);">
            Blended Crew Rate: ${fmt(blended.blended)}/hr
          </div>
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--accent-amber);font-weight:600;">✓ Labor rates auto-populated from Davis-Bacon determination</div>`;
        })() : ''}

        ${state._pwCounty && typeof CA_PREVAILING_WAGES !== 'undefined' ? (() => {
          const wageType = state.prevailingWage === 'davis-bacon' ? 'davis-bacon' : 'dir';
          const rates = CA_PREVAILING_WAGES.getRates(state._pwCounty, wageType);
          const zoneLabel = CA_PREVAILING_WAGES.getZoneLabel(state._pwCounty);
          const blended = CA_PREVAILING_WAGES.getBlendedRate(state._pwCounty, wageType);
          if (!rates) return '';
          const fmt = n => '$' + n.toFixed(2);
          return `
        <div style="margin-top:8px;padding:10px 14px;background:rgba(235,179,40,0.08);border-radius:8px;border:1px solid rgba(235,179,40,0.2);font-size:11px;">
          <div style="font-weight:700;color:var(--accent-amber);margin-bottom:6px;">${zoneLabel}</div>
          <div style="display:grid;grid-template-columns:1fr auto auto;gap:2px 10px;font-size:11px;">
            <div style="font-weight:600;color:var(--text-muted);">Classification</div>
            <div style="font-weight:600;color:var(--text-muted);text-align:right;">Base</div>
            <div style="font-weight:600;color:var(--text-muted);text-align:right;">Loaded</div>
            <div>Comm Installer → Journeyman</div><div style="text-align:right;">${fmt(rates.comm_installer.base)}</div><div style="text-align:right;font-weight:600;color:var(--accent-amber);">${fmt(rates.comm_installer.total)}</div>
            <div>Comm Technician → Lead</div><div style="text-align:right;">${fmt(rates.comm_tech.base)}</div><div style="text-align:right;font-weight:600;color:var(--accent-amber);">${fmt(rates.comm_tech.total)}</div>
            <div>Foreman (Tech +${rates.foreman_pct}%)</div><div style="text-align:right;">—</div><div style="text-align:right;font-weight:600;color:var(--accent-amber);">${fmt(rates.comm_tech.total * (1 + rates.foreman_pct/100))}</div>
            <div>Apprentice (${rates.apprentice_pct}%)</div><div style="text-align:right;">—</div><div style="text-align:right;font-weight:600;color:var(--accent-amber);">${fmt(rates.comm_installer.total * rates.apprentice_pct/100)}</div>
            <div>Electrician (PM/Programmer)</div><div style="text-align:right;">${fmt(rates.electrician.base)}</div><div style="text-align:right;font-weight:600;color:var(--accent-amber);">${fmt(rates.electrician.total)}</div>
          </div>
          <div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(235,179,40,0.2);font-weight:700;color:var(--accent-amber);">
            Blended Crew Rate: ${fmt(blended.blended)}/hr
          </div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Mix: 60% Installer + 25% Tech + 10% Foreman + 5% Apprentice</div>
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--accent-amber);font-weight:600;">✓ Labor rates auto-populated from ${wageType === 'davis-bacon' ? 'Davis-Bacon' : 'CA DIR'} determination</div>`;
        })() : `
        <div style="margin-top:6px;color:var(--accent-amber);font-weight:600;">💡 Select a county above to auto-populate labor rates</div>`}

        <div style="margin-top:10px;padding:8px 12px;background:rgba(244,63,94,0.08);border:1px solid rgba(244,63,94,0.25);border-radius:6px;font-size:11px;color:#f43f5e;font-weight:600;">
          ⚠️ Do NOT add burden on top of prevailing wage loaded rates — fringes (health, pension, vacation, training) are already included. Burden is automatically disabled when prevailing wage rates are applied.
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--text-muted);">
          <div>• Correct wage classifications per ELV trade</div>
          <div>• Base hourly rate + fringe benefits = loaded rate (burden is baked in)</div>
          <div>• Certified payroll requirements</div>
          <div>• Apprentice ratio guidelines</div>
        </div>
      </div>
    </div>
    ` : ""}

    <div class="form-group">
      <label class="form-label" for="work-shift">Work Shift / Schedule</label>
      <p class="form-hint">Off-shift work affects labor rates, productivity, and scheduling. Select the primary shift for this project.</p>
      <select class="form-select" id="work-shift">
        <option value="">1st Shift — Standard (7AM-3:30PM)</option>
        <option value="2nd-shift">2nd Shift (3PM-11:30PM)</option>
        <option value="3rd-shift">3rd Shift / Overnight (11PM-7:30AM)</option>
        <option value="weekends">Weekends Only (Sat-Sun)</option>
        <option value="split">Split Shift (work around occupants)</option>
        <option value="mixed">Mixed — varies by phase</option>
        <option value="4-10">4/10s (4 days × 10 hours)</option>
      </select>
    </div>
    ${state.workShift ? `
    <div class="info-card info-card--rose" style="margin-bottom:16px;">
      <div class="info-card-title">🌙 Off-Shift Premium Active</div>
      <div class="info-card-body">
        Off-shift work impacts your project budget:<br>
        <div>• Shift differential pay (10-15% premium on 2nd, 15-20% on 3rd)</div>
        <div>• Overtime rates for weekends (1.5×) and holidays (2.0×)</div>
        <div>• Reduced productivity (10-25% efficiency loss at night)</div>
        <div>• Possible security escort or building access fees</div>
        <div>• Noise restrictions may limit power tool use</div>
      </div>
    </div>
    ` : ""}

    <div class="form-group">
      <label class="form-label" for="prior-estimate">Prior estimate or bid to compare against <span style="color:var(--text-muted);font-weight:400">(optional)</span></label>
      <p class="form-hint">Describe it briefly. I can investigate discrepancies between my analysis and prior counts.</p>
      <textarea class="form-textarea" id="prior-estimate" placeholder="Describe any prior estimate data…">${esc(state.priorEstimate)}</textarea>
    </div>

    <div class="info-card info-card--amber" style="margin-top:24px;">
      <div class="info-card-title">✈️ Travel & Per Diem</div>
      <div class="info-card-body">Travel, per diem, and incidental costs are configured in <strong>Stage 7</strong> after the AI analysis completes. The AI will recommend crew size and schedule based on your project scope.</div>
    </div>

    <div style="border-top:1px solid rgba(255,255,255,0.08);margin:24px 0 8px;"></div>
    <div style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:8px 0;" id="pricing-toggle">
      <span style="font-size:22px;">💲</span>
      <div>
        <div style="font-weight:700;font-size:15px;color:var(--text-primary);">Pricing & Rate Configuration</div>
        <div style="font-size:12px;color:var(--text-muted);">Material pricing tier, labor rates, burden, and markup percentages</div>
      </div>
      <span style="margin-left:auto;font-size:18px;color:var(--text-muted);transition:transform 0.2s;" id="pricing-chevron">${state._pricingOpen ? "▼" : "▶"}</span>
    </div>

    <div id="pricing-panel" style="display:${state._pricingOpen ? "block" : "none"};margin-top:12px;">

      <div class="form-group">
        <label class="form-label" for="pricing-tier">Material Pricing Tier</label>
        <p class="form-hint">Sets the unit cost level for all materials. Budget = value brands, Mid = standard spec, Premium = high-end specified.</p>
        <select class="form-select" id="pricing-tier">
          <option value="budget">💰 Budget — Value brands, competitive bid</option>
          <option value="mid">⚖️ Mid-Range — Standard spec, name brands (default)</option>
          <option value="premium">👑 Premium — High-end, specified brand</option>
        </select>
        <div style="margin-top:8px;padding:10px 14px;background:rgba(56,189,248,0.06);border-radius:8px;border:1px solid rgba(56,189,248,0.12);font-size:12px;color:var(--text-secondary);">
          <strong>Example comparison:</strong><br>
          Cat 6A Plenum: Budget $0.22/ft → Mid $0.32/ft → Premium $0.48/ft<br>
          Fixed Outdoor Dome: Budget $180 → Mid $380 → Premium $720<br>
          FACP (Medium): Budget $2,500 → Mid $5,000 → Premium $9,500
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="regional-multiplier">Regional Cost Multiplier</label>
        <p class="form-hint">Adjusts all material costs based on geographic market conditions. Example: 1.15x means materials cost 15% more than national average. Select the region closest to your project location.</p>
        <select class="form-select" id="regional-multiplier">
          ${Object.entries(PRICING_DB.regionalMultipliers).map(([key, val]) =>
    `<option value="${key}">${key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} (${val.toFixed(2)}×)</option>`
  ).join("")}
        </select>
      </div>

      <div style="border-top:1px solid rgba(255,255,255,0.06);margin:16px 0;"></div>
      <div style="font-weight:700;font-size:14px;color:var(--text-primary);margin-bottom:4px;">👷 Labor Rates ($/hr)</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;">
        ${state.prevailingWage
          ? '🔒 These are <strong>loaded rates</strong> (base + fringes) auto-populated from prevailing wage tables. Do not add burden on top.'
          : 'Enter your company\'s <strong>base hourly rates</strong> for each role. If burden is enabled below, it will be applied on top of these rates. If using prevailing wage, select it above to auto-populate.'}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${Object.entries(state.laborRates).map(([key, val]) => {
          const labels = { pm: 'Project Manager', journeyman: 'Journeyman Tech', lead: 'Lead Tech', foreman: 'Foreman', apprentice: 'Apprentice', programmer: 'Programmer' };
          const hints = { pm: 'Oversees schedule, budget, and coordination', journeyman: 'Primary installer — cable pulling, device mounting', lead: 'Senior tech — leads crew, troubleshoots', foreman: 'On-site supervisor — manages daily work', apprentice: 'Entry-level — assists journeymen, lower rate', programmer: 'System programming, commissioning, testing' };
          return `
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="labor-${key}">${labels[key] || key}</label>
            <input class="form-input labor-rate-input" type="number" step="0.50" min="0" id="labor-${key}" value="${val.toFixed(2)}" style="font-size:14px;padding:8px 10px;">
            <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">${hints[key] || ''}</div>
          </div>`;
        }).join("")}
      </div>

      <div style="display:flex;align-items:center;gap:10px;margin-top:16px;">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--text-secondary);">
          <input type="checkbox" id="include-burden" ${state.includeBurden ? "checked" : ""} style="width:16px;height:16px;">
          Include labor burden (taxes, WC, GL, insurance)
        </label>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px;padding-left:26px;">
        ${state.prevailingWage
          ? '<span style="color:#f43f5e;font-weight:600;">⚠️ Prevailing wage rates already include fringes — burden should be OFF to avoid double-counting.</span>'
          : 'Enable for private/commercial jobs where your labor rates are base rates only. Adds employer taxes (FICA, FUTA/SUTA), Workers Comp, GL insurance, and benefits on top of base hourly rates.'}
      </div>
      ${state.includeBurden ? `
      <div class="form-group" style="margin-top:8px;margin-bottom:0;">
        <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="burden-rate">Burden Rate (%)</label>
        <input class="form-input" type="number" step="1" min="0" max="100" id="burden-rate" value="${state.burdenRate}" style="width:120px;font-size:14px;padding:8px 10px;">
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
          Typical: 30-40% for private work. Covers FICA (7.65%), FUTA/SUTA (3-6%), Workers Comp (5-15%), GL (3-5%), Health/Benefits (5-12%).
        </div>
        ${state.prevailingWage ? '<div style="margin-top:4px;font-size:11px;color:#f43f5e;font-weight:600;">⚠️ WARNING: You have prevailing wage selected AND burden enabled. This will double-count fringes. Uncheck burden or switch to standard rates.</div>' : ''}
      </div>
      ` : ""}

      <div style="border-top:1px solid rgba(255,255,255,0.06);margin:16px 0;"></div>
      <div style="font-weight:700;font-size:14px;color:var(--text-primary);margin-bottom:4px;">📈 Markup / Margin (%)</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;">
        Markup is applied on top of cost to produce your sell price. Example: $100 cost × 25% markup = $125 sell price. Applies to all items in each category. Typical ELV ranges: Materials 15-30%, Labor 20-40%, Equipment 10-25%, Subs 5-15%.
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="markup-material">Material Markup</label>
          <input class="form-input markup-input" type="number" step="1" min="0" max="200" id="markup-material" value="${state.markup.material}" style="font-size:14px;padding:8px 10px;">
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Applied to all cable, devices, panels, hardware. Typical: 15-30%</div>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="markup-labor">Labor Markup</label>
          <input class="form-input markup-input" type="number" step="1" min="0" max="200" id="markup-labor" value="${state.markup.labor}" style="font-size:14px;padding:8px 10px;">
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Applied to total labor cost (hours × rate ${state.includeBurden ? '× burden' : ''}). Typical: 20-40%</div>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="markup-equipment">Equipment Markup</label>
          <input class="form-input markup-input" type="number" step="1" min="0" max="200" id="markup-equipment" value="${state.markup.equipment}" style="font-size:14px;padding:8px 10px;">
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Lifts, test equipment, specialty tools. Typical: 10-25%</div>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="markup-subcontractor">Subcontractor Markup</label>
          <input class="form-input markup-input" type="number" step="1" min="0" max="200" id="markup-subcontractor" value="${state.markup.subcontractor}" style="font-size:14px;padding:8px 10px;">
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Applied to sub bids (fire alarm, electrical, etc.). Typical: 5-15%</div>
        </div>
      </div>

      <div class="info-card info-card--emerald" style="margin-top:16px;">
        <div class="info-card-title">💡 How Pricing Works</div>
        <div class="info-card-body">
          <div>• Material costs use <strong>${state.pricingTier.toUpperCase()}</strong> tier prices from the built-in database (200+ ELV items)</div>
          <div>• Labor cost = Hours × Rate ${state.includeBurden ? `× (1 + ${state.burdenRate}% burden)` : "(no burden applied)"}</div>
          <div>• Final price = Cost × (1 + Markup%)</div>
          <div>• Regional multiplier adjusts for local market: <strong>${(PRICING_DB.regionalMultipliers[state.regionalMultiplier] || 1.0).toFixed(2)}×</strong></div>
          <div>• The AI references these rates to produce a <strong>fully priced estimate</strong></div>
          ${state.prevailingWage ? '<div style="margin-top:6px;color:#f43f5e;font-weight:600;">⚠️ Prevailing wage active — labor rates are loaded (base + fringes). Do NOT enable burden or you will double-count fringes.</div>' : ''}
          ${!state.prevailingWage && !state.includeBurden ? '<div style="margin-top:6px;color:var(--accent-amber);">💡 Burden is OFF — make sure your labor rates already include taxes, WC, GL, and insurance, or enable burden above.</div>' : ''}
        </div>
      </div>
    </div>
  `;

  // Bind events
  const nameInput = document.getElementById("project-name");
  nameInput.addEventListener("input", () => { state.projectName = nameInput.value; renderFooter(); });

  const preparedForInput = document.getElementById("prepared-for");
  preparedForInput.addEventListener("input", () => { state.preparedFor = preparedForInput.value; });

  const typeSelect = document.getElementById("project-type");
  typeSelect.value = state.projectType;
  typeSelect.addEventListener("change", () => { state.projectType = typeSelect.value; renderFooter(); });

  document.getElementById("discipline-chips").addEventListener("click", e => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    const d = btn.dataset.disc;
    const idx = state.disciplines.indexOf(d);
    if (idx >= 0) state.disciplines.splice(idx, 1);
    else state.disciplines.push(d);
    renderStep0(container);
    renderFooter();
  });

  const fmtSelect = document.getElementById("file-format");
  fmtSelect.value = state.fileFormat;
  fmtSelect.addEventListener("change", () => { state.fileFormat = fmtSelect.value; renderStep0(container); renderFooter(); });

  document.getElementById("specific-items").addEventListener("input", e => { state.specificItems = e.target.value; });
  document.getElementById("known-quantities").addEventListener("input", e => { state.knownQuantities = e.target.value; });
  document.getElementById("code-jurisdiction").addEventListener("input", e => { state.codeJurisdiction = e.target.value; });
  document.getElementById("project-location").addEventListener("input", e => { state.projectLocation = e.target.value; });

  const pwSelect = document.getElementById("prevailing-wage");
  pwSelect.value = state.prevailingWage;
  pwSelect.addEventListener("change", () => { state.prevailingWage = pwSelect.value; renderStep0(container); renderFooter(); });

  // County prevailing wage dropdown
  const pwCounty = document.getElementById("pw-county");
  if (pwCounty) {
    pwCounty.addEventListener("change", () => {
      state._pwCounty = pwCounty.value;
      if (pwCounty.value && typeof CA_PREVAILING_WAGES !== 'undefined') {
        const wageType = state.prevailingWage === 'davis-bacon' ? 'davis-bacon' : 'dir';
        const rates = CA_PREVAILING_WAGES.getRates(pwCounty.value, wageType);
        if (rates) {
          // Auto-populate labor rates with loaded (total) rates
          state.laborRates.journeyman = rates.comm_installer.total;
          state.laborRates.lead = rates.comm_tech.total;
          state.laborRates.foreman = Math.round(rates.comm_tech.total * (1 + rates.foreman_pct / 100) * 100) / 100;
          state.laborRates.apprentice = Math.round(rates.comm_installer.total * (rates.apprentice_pct / 100) * 100) / 100;
          state.laborRates.pm = rates.electrician.total;
          state.laborRates.programmer = rates.electrician.total;
          // Fringes are already included in loaded rate, so disable burden
          state.includeBurden = false;
        }
      }
      renderStep0(container);
    });
  }

  // National prevailing wage dropdowns (state → metro)
  const pwState = document.getElementById("pw-state");
  if (pwState) {
    pwState.addEventListener("change", () => {
      state._pwState = pwState.value;
      state._pwMetro = ''; // Reset metro when state changes
      renderStep0(container);
    });
  }
  const pwMetro = document.getElementById("pw-metro");
  if (pwMetro) {
    pwMetro.addEventListener("change", () => {
      state._pwMetro = pwMetro.value;
      if (pwMetro.value && typeof NATIONAL_PREVAILING_WAGES !== 'undefined') {
        const rates = NATIONAL_PREVAILING_WAGES.getRates(pwMetro.value);
        if (rates) {
          state.laborRates.journeyman = rates.comm_installer.total;
          state.laborRates.lead = rates.comm_tech.total;
          state.laborRates.foreman = Math.round(rates.comm_tech.total * (1 + rates.foreman_pct / 100) * 100) / 100;
          state.laborRates.apprentice = Math.round(rates.comm_installer.total * (rates.apprentice_pct / 100) * 100) / 100;
          state.laborRates.pm = rates.electrician.total;
          state.laborRates.programmer = rates.electrician.total;
          state.includeBurden = false; // Fringes included in loaded rates
        }
      }
      renderStep0(container);
    });
  }

  const shiftSelect = document.getElementById("work-shift");
  shiftSelect.value = state.workShift;
  shiftSelect.addEventListener("change", () => { state.workShift = shiftSelect.value; renderStep0(container); renderFooter(); });

  document.getElementById("prior-estimate").addEventListener("input", e => { state.priorEstimate = e.target.value; });

  // Building height fields (ceiling + floor-to-floor only — scale/dimensions are AI-detected per-sheet)
  const ch = document.getElementById("ceiling-height");
  if (ch) ch.addEventListener("input", e => { state.ceilingHeight = parseFloat(e.target.value) || 10; });
  const ftf = document.getElementById("floor-to-floor-height");
  if (ftf) ftf.addEventListener("input", e => { state.floorToFloorHeight = parseFloat(e.target.value) || 14; });

  // Pricing panel toggle
  document.getElementById("pricing-toggle").addEventListener("click", () => {
    state._pricingOpen = !state._pricingOpen;
    renderStep0(container);
  });

  // Pricing tier
  const tierSelect = document.getElementById("pricing-tier");
  if (tierSelect) {
    tierSelect.value = state.pricingTier;
    tierSelect.addEventListener("change", () => { state.pricingTier = tierSelect.value; renderStep0(container); });
  }

  // Regional multiplier
  const regionSelect = document.getElementById("regional-multiplier");
  if (regionSelect) {
    regionSelect.value = state.regionalMultiplier;
    regionSelect.addEventListener("change", () => { state.regionalMultiplier = regionSelect.value; renderStep0(container); });
  }

  // Labor rates
  document.querySelectorAll(".labor-rate-input").forEach(input => {
    input.addEventListener("change", e => {
      const key = e.target.id.replace("labor-", "");
      let val = parseFloat(e.target.value) || 0;
      if (val < 0) { val = 0; e.target.value = val; showValidationToast(["Labor rate cannot be negative."]); }
      else if (val > 500) { val = 500; e.target.value = val; showValidationToast(["Labor rate cannot exceed $500/hr."]); }
      state.laborRates[key] = val;
    });
  });

  // Burden
  const burdenCheck = document.getElementById("include-burden");
  if (burdenCheck) {
    burdenCheck.addEventListener("change", () => { state.includeBurden = burdenCheck.checked; renderStep0(container); });
  }
  const burdenInput = document.getElementById("burden-rate");
  if (burdenInput) {
    burdenInput.addEventListener("change", e => { state.burdenRate = parseFloat(e.target.value) || 0; renderStep0(container); });
  }

  // Markup inputs
  document.querySelectorAll(".markup-input").forEach(input => {
    input.addEventListener("change", e => {
      const key = e.target.id.replace("markup-", "");
      let val = parseFloat(e.target.value) || 0;
      if (val < 0) { val = 0; e.target.value = val; showValidationToast(["Markup cannot be negative."]); }
      else if (val > 500) { val = 500; e.target.value = val; showValidationToast(["Markup cannot exceed 500%."]); }
      state.markup[key] = val;
    });
  });
}


// ─── Step 1: Symbol Legend ───
function renderStep1(container) {
  container.innerHTML = `
    <h2 class="step-heading">Upload Your Symbol Legend</h2>
    <p class="step-subheading">The symbol legend is the single most important reference for accurate analysis. Without it, I'm guessing at what symbols mean.</p>

    <div class="info-card info-card--amber">
      <div class="info-card-title">Why This Is Critical</div>
      <div class="info-card-body">
        Every architecture and engineering firm uses different symbol libraries. A circle with a line could be a receptacle, a junction box, or a thermostat depending on the firm.
        The legend is my <strong>Rosetta Stone</strong> — without it, accuracy drops significantly because I must infer symbol meaning from context alone.
      </div>
    </div>

    <div id="legend-upload"></div>

    <div class="info-card info-card--indigo" style="margin-top: 18px;">
      <div class="info-card-title">No legend on your plans?</div>
      <div class="info-card-body">
        If the drawings don't include a symbol legend, you have several options:<br>
        <div>• Ask the architect/engineer for the legend sheets — they always have them</div>
        <div>• Create a quick reference: list each symbol you see and what it represents</div>
        <div>• Even a photo of a hand-drawn key helps enormously</div>
        <div>• You can also describe symbols in the notes field during the Review step</div>
        <div style="margin-top:8px;color:var(--accent-amber);font-weight:600;">⚠ Skipping the legend is allowed, but expect 10–20% lower accuracy.</div>
      </div>
    </div>
  `;

  renderFileUpload(document.getElementById("legend-upload"), {
    label: "Symbol Legend Sheets",
    description: "Upload ALL legend pages — electrical, plumbing, mechanical, architectural, fire protection. Each discipline typically has its own legend.",
    files: state.legendFiles,
    onFilesChange: files => { state.legendFiles = files; renderFooter(); },
    accept: ".pdf,.dwg,.dxf,.ifc,.rvt,.png,.jpg,.jpeg,.tif,.tiff",
  });
}


// ─── Step 2: Floor Plans ───
function renderStep2(container) {
  const discList = state.disciplines.length > 0 ? state.disciplines.join(", ") : "all disciplines";

  container.innerHTML = `
    <h2 class="step-heading">Upload Floor Plans</h2>
    <p class="step-subheading">Upload your drawing sheets. For best results, each sheet should be a separate file or a separate page in a multi-page PDF.</p>

    <div class="info-card info-card--sky">
      <div class="info-card-title">Upload Tips for Best Accuracy</div>
      <div class="info-card-body">
        <div>• <strong>One floor per page</strong> — don't combine multiple levels on one sheet</div>
        <div>• <strong>Include enlarged details</strong> — restroom details, electrical room enlargements, etc. often contain symbols not visible on the main plan</div>
        <div>• <strong>Consistent orientation</strong> — all sheets should face the same direction</div>
        <div>• <strong>Clean backgrounds</strong> — remove sticky notes, revision clouds, and contractor markups if possible</div>
        <div>• <strong>Include schedules</strong> — door, fixture, panel, and equipment schedules help verify counts</div>
      </div>
    </div>

    <div id="plans-upload"></div>

    <div id="plans-count" style="margin-top: 14px;"></div>
  `;

  renderFileUpload(document.getElementById("plans-upload"), {
    label: "Floor Plan Sheets",
    description: `Upload sheets for the disciplines you selected: ${discList}`,
    files: state.planFiles,
    onFilesChange: files => {
      state.planFiles = files;
      updatePlanCount();
      renderFooter();
    },
    accept: ".pdf,.dwg,.dxf,.ifc,.rvt,.png,.jpg,.jpeg,.tif,.tiff",
  });

  function updatePlanCount() {
    const el = document.getElementById("plans-count");
    if (state.planFiles.length > 0) {
      el.innerHTML = `<div class="upload-count">✓ ${state.planFiles.length} sheet${state.planFiles.length !== 1 ? "s" : ""} uploaded. I'll analyze each one individually and provide counts per sheet.</div>`;
    } else {
      el.innerHTML = "";
    }
  }
  updatePlanCount();
}


// ─── Step 3: Specifications ───
function renderStep3(container) {
  container.innerHTML = `
    <h2 class="step-heading">Upload Specifications</h2>
    <p class="step-subheading">Specification documents let me cross-check what's shown on the plans against what's required in the written specs. This is where I catch conflicts.</p>

    <div class="info-card info-card--rose">
      <div class="info-card-title">⚠ Critical Requirement</div>
      <div class="info-card-body">
        Specifications <strong>must be searchable text PDFs or Word documents — not scanned images.</strong>
        OCR on spec books is unreliable for section numbers and product model codes, which are exactly the things I need to read accurately.
        If your specs are scanned, request digital copies from the design team.
      </div>
    </div>

    <div id="specs-upload"></div>

    <div class="info-card info-card--indigo" style="margin-top: 18px;">
      <div class="info-card-title">What I Cross-Check</div>
      <div class="info-card-body">
        <div>• Products specified vs. products shown on plans</div>
        <div>• Quantities implied by specs vs. counts on drawings</div>
        <div>• Code references and compliance requirements</div>
        <div>• Performance criteria that affect scope</div>
        <div>• Conflicts between spec sections and drawing notes</div>
      </div>
    </div>
  `;

  renderFileUpload(document.getElementById("specs-upload"), {
    label: "Specification Sections",
    description: "Upload all relevant spec sections, not just the ones you think apply. Cross-references between sections are common.",
    files: state.specFiles,
    onFilesChange: files => { state.specFiles = files; renderFooter(); },
    accept: ".pdf,.doc,.docx,.txt",
  });
}


// ─── Step 4: Addenda ───
function renderStep4(container) {
  container.innerHTML = `
    <h2 class="step-heading">Addenda & Supplemental Instructions</h2>
    <p class="step-subheading">Addenda frequently change quantities, substitute products, or modify scope. Without them, my analysis is based on outdated information.</p>

    <div class="toggle-row">
      <button class="toggle-btn ${state.hasAddenda === true ? "selected" : ""}" id="toggle-yes">Yes, I have addenda</button>
      <button class="toggle-btn ${state.hasAddenda === false ? "selected" : ""}" id="toggle-no">No addenda issued</button>
    </div>

    <div id="addenda-content"></div>
  `;

  document.getElementById("toggle-yes").addEventListener("click", () => {
    state.hasAddenda = true;
    renderStep4Content();
    renderFooter();
  });
  document.getElementById("toggle-no").addEventListener("click", () => {
    state.hasAddenda = false;
    state.addendaFiles = [];
    renderStep4Content();
    renderFooter();
  });

  renderStep4Content();

  function renderStep4Content() {
    const el = document.getElementById("addenda-content");
    // Update toggle classes
    document.getElementById("toggle-yes").className = `toggle-btn ${state.hasAddenda === true ? "selected" : ""}`;
    document.getElementById("toggle-no").className = `toggle-btn ${state.hasAddenda === false ? "selected" : ""}`;

    if (state.hasAddenda === true) {
      el.innerHTML = `
        <div id="addenda-upload"></div>
        <div class="info-card info-card--amber" style="margin-top: 18px;">
          <div class="info-card-title">What Addenda Typically Change</div>
          <div class="info-card-body">
            <div>• Substituted products or materials</div>
            <div>• Added or removed scope items</div>
            <div>• Revised quantities or dimensions</div>
            <div>• Clarifications to ambiguous details</div>
            <div>• Extended or changed bid dates</div>
          </div>
        </div>
      `;
      renderFileUpload(document.getElementById("addenda-upload"), {
        label: "Addenda Documents",
        description: "Upload all issued addenda in order. Include both revised drawing sheets and written addenda instructions.",
        files: state.addendaFiles,
        onFilesChange: files => { state.addendaFiles = files; renderFooter(); },
        accept: ".pdf,.doc,.docx,.png,.jpg,.jpeg,.tif,.tiff",
      });
    } else if (state.hasAddenda === false) {
      el.innerHTML = `
        <div class="info-card info-card--emerald">
          <div class="info-card-title">Noted</div>
          <div class="info-card-body">No addenda to review. I'll analyze based on the base bid documents you've provided.</div>
        </div>
      `;
    } else {
      el.innerHTML = "";
    }
  }
}


// ─── Step 5: Review ───
function renderStep5(container) {
  const accuracy = getAccuracyEstimate();
  const fileRows = [
    { label: "Symbol Legend", count: state.legendFiles.length, icon: "🔑" },
    { label: "Floor Plans", count: state.planFiles.length, icon: "📐" },
    { label: "Specifications", count: state.specFiles.length, icon: "📄" },
    { label: "Addenda", count: state.addendaFiles.length, icon: "📝" },
  ];

  container.innerHTML = `
    <h2 class="step-heading">Review Before Analysis</h2>
    <p class="step-subheading">Confirm everything looks right. You can go back to any step to make changes.</p>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-card-label">Project</div>
        <div class="summary-card-value">${esc(state.projectName) || "—"}</div>
        <div class="summary-card-sub">${esc(state.projectType) || "—"}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Disciplines</div>
        <div class="summary-card-value">${state.disciplines.length > 0 ? esc(state.disciplines.join(", ")) : "None selected"}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">File Format</div>
        <div class="summary-card-value">${esc(state.fileFormat) || "Not specified"}</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Code Jurisdiction</div>
        <div class="summary-card-value">${esc(state.codeJurisdiction) || "Not specified"}</div>
      </div>
    </div>

    <div class="files-summary">
      <div class="files-summary-title">Files Ready for Analysis</div>
      ${fileRows.map(f => `
        <div class="files-summary-row">
          <div class="files-summary-row-left"><span>${f.icon}</span><span>${f.label}</span></div>
          <span class="files-summary-count ${f.count > 0 ? "has-files" : "no-files"}">${f.count} file${f.count !== 1 ? "s" : ""}</span>
        </div>
      `).join("")}
    </div>

    <div class="accuracy-panel" style="border-color:${getTrafficLight(accuracy).glow};">
      <div class="accuracy-label">Estimated Accuracy</div>
      <div class="accuracy-traffic-light">
        <div class="traffic-dot" style="background:${accuracy >= 85 ? '#10b981' : 'rgba(255,255,255,0.1)'};box-shadow:${accuracy >= 85 ? '0 0 12px rgba(16,185,129,0.6)' : 'none'};"></div>
        <div class="traffic-dot" style="background:${accuracy >= 70 && accuracy < 85 ? '#f59e0b' : 'rgba(255,255,255,0.1)'};box-shadow:${accuracy >= 70 && accuracy < 85 ? '0 0 12px rgba(245,158,11,0.6)' : 'none'};"></div>
        <div class="traffic-dot" style="background:${accuracy < 70 ? '#ef4444' : 'rgba(255,255,255,0.1)'};box-shadow:${accuracy < 70 ? '0 0 12px rgba(239,68,68,0.6)' : 'none'};"></div>
      </div>
      <div class="accuracy-value" style="background:linear-gradient(135deg, ${getTrafficLight(accuracy).color}, ${getTrafficLight(accuracy).color}cc);-webkit-background-clip:text;background-clip:text;">${accuracy}%</div>
      <div class="accuracy-sub">${getTrafficLight(accuracy).label} — Based on your file format, legend, and context provided</div>
    </div>

    <div class="form-group">
      <label class="form-label" for="final-notes">Any additional notes or instructions?</label>
      <p class="form-hint">Anything else I should know — unusual symbols, areas to skip, specific concerns about the drawings.</p>
      <textarea class="form-textarea" id="final-notes" placeholder="Add notes here…">${esc(state.notes)}</textarea>
    </div>
  `;

  document.getElementById("final-notes").addEventListener("input", e => { state.notes = e.target.value; });
}


// ─── Bid Strategy Card Builder ───
function buildBidStrategyCard(st) {
  if (!st.aiAnalysis) return '';
  const bom = getFilteredBOM(st.aiAnalysis, st.disciplines);
  if (!bom || !bom.categories || bom.categories.length === 0) return '';
  const bs = st.bidStrategy;
  const fmtD = (v) => '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const confColors = { high: '#10b981', medium: '#f59e0b', low: '#ef4444' };
  const confBgColors = { high: 'rgba(16,185,129,0.08)', medium: 'rgba(245,158,11,0.08)', low: 'rgba(239,68,68,0.08)' };
  const confBorderColors = { high: 'rgba(16,185,129,0.3)', medium: 'rgba(245,158,11,0.3)', low: 'rgba(239,68,68,0.3)' };
  const isLaborCat = (name) => /labor|install|rough|trim|commission|program|test|mobiliz/i.test(name);
  let totalMaterial = 0, totalLabor = 0, totalMarkup = 0, totalContingency = 0;
  let catRows = '';
  bom.categories.forEach((cat, ci) => {
    const catName = cat.name;
    const isLabor = isLaborCat(catName);
    const cm = bs.categoryMarkups[catName] || { materialMarkup: bs.defaultMaterialMarkup, laborMarkup: bs.defaultLaborMarkup, confidence: 'medium' };
    const materialCost = isLabor ? 0 : cat.subtotal;
    const laborCost = isLabor ? cat.subtotal : 0;
    const matPct = cm.materialMarkup, labPct = cm.laborMarkup, conf = cm.confidence;
    const contPct = bs.contingencyByConfidence[conf] || 10;
    const matMarked = materialCost * (1 + matPct / 100);
    const labMarked = laborCost * (1 + labPct / 100);
    const subMarked = matMarked + labMarked;
    const contAmt = subMarked * (contPct / 100);
    const finalPrice = subMarked + contAmt;
    totalMaterial += materialCost; totalLabor += laborCost;
    totalMarkup += (matMarked - materialCost) + (labMarked - laborCost);
    totalContingency += contAmt;
    const cc = confColors[conf], cbg = confBgColors[conf], cbr = confBorderColors[conf];
    catRows += `<tr class="bid-strategy-row" data-bs-cat="${esc(catName)}" data-bs-idx="${ci}" style="border-bottom:1px solid var(--border-subtle);">
      <td style="padding:10px 12px;font-size:12px;font-weight:600;color:var(--text-primary);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(catName)}">${esc(catName)}</td>
      <td style="padding:10px 8px;font-size:12px;color:var(--text-secondary);text-align:right;">${fmtD(materialCost)}</td>
      <td style="padding:10px 4px;text-align:center;"><input type="number" class="bid-strategy-input bs-mat-markup" data-bs-cat="${esc(catName)}" value="${matPct}" min="0" max="200" step="1" style="width:58px;padding:4px 6px;border-radius:0;border:1px solid var(--border-medium);background:var(--bg-surface-2);color:var(--text-primary);font-size:12px;text-align:center;outline:none;" ${isLabor ? 'disabled' : ''} /><span style="font-size:10px;color:var(--text-muted);">%</span></td>
      <td style="padding:10px 8px;font-size:12px;color:var(--text-secondary);text-align:right;">${fmtD(laborCost)}</td>
      <td style="padding:10px 4px;text-align:center;"><input type="number" class="bid-strategy-input bs-lab-markup" data-bs-cat="${esc(catName)}" value="${labPct}" min="0" max="200" step="1" style="width:58px;padding:4px 6px;border-radius:0;border:1px solid var(--border-medium);background:var(--bg-surface-2);color:var(--text-primary);font-size:12px;text-align:center;outline:none;" ${!isLabor ? 'disabled' : ''} /><span style="font-size:10px;color:var(--text-muted);">%</span></td>
      <td style="padding:10px 4px;text-align:center;"><select class="bid-strategy-input bs-confidence" data-bs-cat="${esc(catName)}" style="padding:4px 6px;border-radius:0;border:1px solid ${cbr};background:${cbg};color:${cc};font-size:11px;font-weight:700;cursor:pointer;outline:none;text-transform:uppercase;">
        <option value="high" ${conf === 'high' ? 'selected' : ''} style="color:#10b981;">High</option>
        <option value="medium" ${conf === 'medium' ? 'selected' : ''} style="color:#f59e0b;">Medium</option>
        <option value="low" ${conf === 'low' ? 'selected' : ''} style="color:#ef4444;">Low</option>
      </select></td>
      <td style="padding:10px 8px;font-size:11px;text-align:center;color:${cc};font-weight:700;">${contPct}%</td>
      <td style="padding:10px 12px;font-size:12px;font-weight:700;color:var(--accent-teal);text-align:right;">${fmtD(finalPrice)}</td>
    </tr>`;
  });
  const grandTotal = totalMaterial + totalLabor + totalMarkup + totalContingency;
  return `
    <div style="border-top:1px solid var(--border-subtle);margin:24px 0;"></div>
    <div class="info-card" style="margin-bottom:22px;border:1px solid rgba(13,148,136,0.2);background:#FFFFFF;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding-left:8px;cursor:pointer;" id="bid-strategy-toggle">
        <div class="info-card-title" style="margin-bottom:0;color:var(--accent-teal);">BID STRATEGY</div>
        <span id="bid-strategy-toggle-icon" style="font-size:14px;color:var(--text-muted);transition:transform 0.2s;padding:8px;">&#9654;</span>
      </div>
      <div id="bid-strategy-collapsible" style="display:none;margin-top:12px;">
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px;padding-left:8px;line-height:1.6;">Adjust markup percentages and confidence levels for each BOM category. Higher markup on uncertain items, lower on well-known items. Contingency is auto-calculated from confidence level.</div>
        <div style="overflow-x:auto;border:1px solid var(--border-subtle);">
          <table style="width:100%;border-collapse:collapse;font-size:12px;" id="bid-strategy-table">
            <thead><tr style="background:var(--bg-surface-2);">
              <th class="bs-th">Category</th><th class="bs-th" style="text-align:right;">Material Cost</th><th class="bs-th" style="text-align:center;">Mat Markup</th><th class="bs-th" style="text-align:right;">Labor Cost</th><th class="bs-th" style="text-align:center;">Lab Markup</th><th class="bs-th" style="text-align:center;">Confidence</th><th class="bs-th" style="text-align:center;">Conting.</th><th class="bs-th" style="text-align:right;">Final Price</th>
            </tr></thead>
            <tbody>${catRows}</tbody>
          </table>
        </div>
        <div id="bid-strategy-summary" style="margin-top:14px;padding:14px 16px;background:var(--bg-surface-2);border:1px solid var(--border-subtle);">
          <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;text-align:center;">
            <div><div class="bs-summary-label">Total Material</div><div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-top:4px;" id="bs-total-material">${fmtD(totalMaterial)}</div></div>
            <div><div class="bs-summary-label">Total Labor</div><div style="font-size:14px;font-weight:700;color:var(--text-primary);margin-top:4px;" id="bs-total-labor">${fmtD(totalLabor)}</div></div>
            <div><div class="bs-summary-label">Total Markup</div><div style="font-size:14px;font-weight:700;color:var(--accent-teal);margin-top:4px;" id="bs-total-markup">${fmtD(totalMarkup)}</div></div>
            <div><div class="bs-summary-label">Total Contingency</div><div style="font-size:14px;font-weight:700;color:#f59e0b;margin-top:4px;" id="bs-total-contingency">${fmtD(totalContingency)}</div></div>
            <div><div class="bs-summary-label">Grand Total</div><div style="font-size:16px;font-weight:800;color:var(--accent-teal);margin-top:4px;" id="bs-grand-total">${fmtD(grandTotal)}</div></div>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px;">
          <button id="bs-apply-strategy" class="bs-action-btn bs-action-btn--apply">Apply Strategy</button>
          <button id="bs-reset-default" class="bs-action-btn bs-action-btn--reset">Reset to Default</button>
        </div>
        ${bs.applied ? '<div class="bs-applied-banner">Strategy applied. Export or generate proposal to include these markups.</div>' : ''}
      </div>
    </div>`;
}

function bindBidStrategyEvents(container) {
  const bsToggle = document.getElementById('bid-strategy-toggle');
  if (bsToggle) {
    bsToggle.addEventListener('click', () => {
      const body = document.getElementById('bid-strategy-collapsible');
      const icon = document.getElementById('bid-strategy-toggle-icon');
      if (body.style.display === 'none') { body.style.display = 'block'; icon.innerHTML = '&#9660;'; }
      else { body.style.display = 'none'; icon.innerHTML = '&#9654;'; }
    });
  }
  const bsTable = document.getElementById('bid-strategy-table');
  if (bsTable) {
    bsTable.addEventListener('input', (e) => {
      const input = e.target;
      if (!input.classList.contains('bid-strategy-input')) return;
      const catName = input.dataset.bsCat; if (!catName) return;
      const bs = state.bidStrategy;
      if (!bs.categoryMarkups[catName]) bs.categoryMarkups[catName] = { materialMarkup: bs.defaultMaterialMarkup, laborMarkup: bs.defaultLaborMarkup, confidence: 'medium' };
      if (input.classList.contains('bs-mat-markup')) bs.categoryMarkups[catName].materialMarkup = parseFloat(input.value) || 0;
      else if (input.classList.contains('bs-lab-markup')) bs.categoryMarkups[catName].laborMarkup = parseFloat(input.value) || 0;
      recalcBidStrategySummary();
    });
    bsTable.addEventListener('change', (e) => {
      const sel = e.target;
      if (!sel.classList.contains('bs-confidence')) return;
      const catName = sel.dataset.bsCat; if (!catName) return;
      const bs = state.bidStrategy;
      if (!bs.categoryMarkups[catName]) bs.categoryMarkups[catName] = { materialMarkup: bs.defaultMaterialMarkup, laborMarkup: bs.defaultLaborMarkup, confidence: 'medium' };
      bs.categoryMarkups[catName].confidence = sel.value;
      const cCols = { high: '#10b981', medium: '#f59e0b', low: '#ef4444' };
      const cBgs = { high: 'rgba(16,185,129,0.08)', medium: 'rgba(245,158,11,0.08)', low: 'rgba(239,68,68,0.08)' };
      const cBrs = { high: 'rgba(16,185,129,0.3)', medium: 'rgba(245,158,11,0.3)', low: 'rgba(239,68,68,0.3)' };
      sel.style.color = cCols[sel.value]; sel.style.background = cBgs[sel.value]; sel.style.borderColor = cBrs[sel.value];
      recalcBidStrategySummary();
    });
  }
  const applyBtn = document.getElementById('bs-apply-strategy');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      const result = SmartPlansExport.applyBidStrategy(state);
      state.bidStrategy.applied = true;
      if (typeof spToast === 'function') {
        const f = (v) => '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        spToast('Bid strategy applied. Grand total: ' + f(result.grandTotalWithStrategy), 'success');
      }
      renderStep7(container);
    });
  }
  const resetBtn = document.getElementById('bs-reset-default');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.bidStrategy.categoryMarkups = {};
      state.bidStrategy.applied = false;
      renderStep7(container);
    });
  }
}

function recalcBidStrategySummary() {
  const bom = getFilteredBOM(state.aiAnalysis, state.disciplines);
  if (!bom || !bom.categories) return;
  const bs = state.bidStrategy;
  const isLaborCat = (name) => /labor|install|rough|trim|commission|program|test|mobiliz/i.test(name);
  const fmtD = (v) => '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let totalMaterial = 0, totalLabor = 0, totalMarkup = 0, totalContingency = 0;
  document.querySelectorAll('.bid-strategy-row').forEach(row => {
    const catName = row.dataset.bsCat, ci = parseInt(row.dataset.bsIdx);
    const cat = bom.categories[ci]; if (!cat) return;
    const isLabor = isLaborCat(catName);
    const cm = bs.categoryMarkups[catName] || { materialMarkup: bs.defaultMaterialMarkup, laborMarkup: bs.defaultLaborMarkup, confidence: 'medium' };
    const materialCost = isLabor ? 0 : cat.subtotal, laborCost = isLabor ? cat.subtotal : 0;
    const contPct = bs.contingencyByConfidence[cm.confidence] || 10;
    const matMarked = materialCost * (1 + cm.materialMarkup / 100);
    const labMarked = laborCost * (1 + cm.laborMarkup / 100);
    const subMarked = matMarked + labMarked;
    const contAmt = subMarked * (contPct / 100);
    const finalPrice = subMarked + contAmt;
    totalMaterial += materialCost; totalLabor += laborCost;
    totalMarkup += (matMarked - materialCost) + (labMarked - laborCost);
    totalContingency += contAmt;
    const cells = row.querySelectorAll('td');
    const cCols = { high: '#10b981', medium: '#f59e0b', low: '#ef4444' };
    if (cells[6]) { cells[6].textContent = contPct + '%'; cells[6].style.color = cCols[cm.confidence]; }
    if (cells[7]) cells[7].textContent = fmtD(finalPrice);
  });
  const grandTotal = totalMaterial + totalLabor + totalMarkup + totalContingency;
  const vals = { 'bs-total-material': fmtD(totalMaterial), 'bs-total-labor': fmtD(totalLabor), 'bs-total-markup': fmtD(totalMarkup), 'bs-total-contingency': fmtD(totalContingency), 'bs-grand-total': fmtD(grandTotal) };
  for (const [id, val] of Object.entries(vals)) { const el = document.getElementById(id); if (el) el.textContent = val; }
}


// ─── Competitor Bid Comparison Renderer ───
function renderBidComparison(comparison, competitorName) {
  const fmtDollar = (v) => '$' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtDollarSigned = (v) => (v >= 0 ? '+' : '-') + fmtDollar(v);
  const diff = comparison.difference;
  const diffColor = diff > 0 ? '#ef4444' : diff < 0 ? '#10b981' : 'rgba(0,0,0,0.6)';

  // Summary dashboard
  let html = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">
    <div style="padding:12px;background:rgba(13,148,136,0.04);border:1px solid rgba(13,148,136,0.15);">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:rgba(0,0,0,0.4);font-weight:600;margin-bottom:4px;">OUR TOTAL</div>
      <div style="font-size:18px;font-weight:700;color:#0D9488;">${fmtDollar(comparison.ourTotal)}</div>
    </div>
    <div style="padding:12px;background:rgba(99,102,241,0.04);border:1px solid rgba(99,102,241,0.15);">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:rgba(0,0,0,0.4);font-weight:600;margin-bottom:4px;">THEIR TOTAL</div>
      <div style="font-size:18px;font-weight:700;color:#6366f1;">${fmtDollar(comparison.theirTotal)}</div>
    </div>
    <div style="padding:12px;background:${diff > 0 ? 'rgba(239,68,68,0.04)' : 'rgba(16,185,129,0.04)'};border:1px solid ${diff > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)'};">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:rgba(0,0,0,0.4);font-weight:600;margin-bottom:4px;">DIFFERENCE</div>
      <div style="font-size:18px;font-weight:700;color:${diffColor};">${fmtDollarSigned(diff)}</div>
    </div>
    <div style="padding:12px;background:rgba(0,0,0,0.02);border:1px solid rgba(0,0,0,0.08);">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:rgba(0,0,0,0.4);font-weight:600;margin-bottom:4px;">MATCH RATE</div>
      <div style="font-size:18px;font-weight:700;color:rgba(0,0,0,0.7);">${comparison.matchRate} <span style="font-size:12px;font-weight:400;color:rgba(0,0,0,0.4);">of ${comparison.totalItems} items</span></div>
    </div>
  </div>`;

  // Breakdown cards
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
    <div style="padding:12px;background:rgba(239,68,68,0.04);border:1px solid rgba(239,68,68,0.12);">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:rgba(239,68,68,0.7);font-weight:600;margin-bottom:4px;">WE'RE HIGHER ON ${comparison.higherItems.length} ITEMS</div>
      <div style="font-size:16px;font-weight:700;color:#ef4444;">${fmtDollar(comparison.higherTotal)} <span style="font-size:11px;font-weight:400;color:rgba(0,0,0,0.4);">more expensive</span></div>
    </div>
    <div style="padding:12px;background:rgba(16,185,129,0.04);border:1px solid rgba(16,185,129,0.12);">
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:rgba(16,185,129,0.7);font-weight:600;margin-bottom:4px;">WE'RE LOWER ON ${comparison.lowerItems.length} ITEMS</div>
      <div style="font-size:16px;font-weight:700;color:#10b981;">${fmtDollar(comparison.lowerTotal)} <span style="font-size:11px;font-weight:400;color:rgba(0,0,0,0.4);">cheaper</span></div>
    </div>
  </div>`;

  // Comparison table
  if (comparison.matched.length > 0) {
    // Group by category
    const categories = {};
    for (const m of comparison.matched) {
      const cat = m.category || 'General';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(m);
    }

    html += `<div style="overflow-x:auto;margin-bottom:16px;"><table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead><tr style="border-bottom:2px solid rgba(0,0,0,0.1);">
        <th style="text-align:left;padding:8px 6px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:rgba(0,0,0,0.5);font-weight:600;">ITEM</th>
        <th style="text-align:right;padding:8px 6px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:rgba(0,0,0,0.5);font-weight:600;">OUR $</th>
        <th style="text-align:right;padding:8px 6px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:rgba(0,0,0,0.5);font-weight:600;">THEIR $</th>
        <th style="text-align:right;padding:8px 6px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:rgba(0,0,0,0.5);font-weight:600;">VARIANCE $</th>
        <th style="text-align:right;padding:8px 6px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:rgba(0,0,0,0.5);font-weight:600;">VARIANCE %</th>
      </tr></thead><tbody>`;

    const catKeys = Object.keys(categories);
    for (const cat of catKeys) {
      if (catKeys.length > 1) {
        html += `<tr><td colspan="5" style="padding:8px 6px 4px;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:rgba(0,0,0,0.4);font-weight:700;border-top:1px solid rgba(0,0,0,0.06);">${esc(cat)}</td></tr>`;
      }
      for (const m of categories[cat]) {
        const absPct = Math.abs(m.variancePct);
        let rowBg = 'transparent';
        let varColor = 'rgba(0,0,0,0.6)';
        if (absPct > 5) {
          if (m.variance > 0) { rowBg = 'rgba(239,68,68,0.04)'; varColor = '#ef4444'; }
          else { rowBg = 'rgba(16,185,129,0.04)'; varColor = '#10b981'; }
        }
        html += `<tr style="background:${rowBg};border-bottom:1px solid rgba(0,0,0,0.04);">
          <td style="padding:6px;color:rgba(0,0,0,0.7);">${esc(m.item)}</td>
          <td style="padding:6px;text-align:right;font-weight:600;">${fmtDollar(m.ourCost)}</td>
          <td style="padding:6px;text-align:right;font-weight:600;">${fmtDollar(m.theirCost)}</td>
          <td style="padding:6px;text-align:right;font-weight:600;color:${varColor};">${fmtDollarSigned(m.variance)}</td>
          <td style="padding:6px;text-align:right;font-weight:600;color:${varColor};">${m.variancePct >= 0 ? '+' : ''}${m.variancePct.toFixed(1)}%</td>
        </tr>`;
      }
    }
    html += '</tbody></table></div>';
  }

  // Unmatched sections
  if (comparison.ourOnly.length > 0) {
    html += `<div style="margin-bottom:12px;">
      <div style="cursor:pointer;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(0,0,0,0.5);font-weight:600;padding:6px 0;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';">
        &#9654; ITEMS ONLY IN OUR BID (${comparison.ourOnly.length})
      </div>
      <div style="display:none;padding-left:12px;">
        ${comparison.ourOnly.map(it => `<div style="padding:4px 0;font-size:12px;color:rgba(0,0,0,0.6);border-bottom:1px solid rgba(0,0,0,0.04);">${esc(it.item)} <span style="float:right;font-weight:600;">${fmtDollar(it.cost)}</span></div>`).join('')}
      </div>
    </div>`;
  }

  if (comparison.theirOnly.length > 0) {
    html += `<div style="margin-bottom:12px;">
      <div style="cursor:pointer;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(0,0,0,0.5);font-weight:600;padding:6px 0;" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';">
        &#9654; ITEMS ONLY IN ${esc(competitorName.toUpperCase())}'S BID (${comparison.theirOnly.length})
      </div>
      <div style="display:none;padding-left:12px;">
        ${comparison.theirOnly.map(it => `<div style="padding:4px 0;font-size:12px;color:rgba(0,0,0,0.6);border-bottom:1px solid rgba(0,0,0,0.04);">${esc(it.item)} <span style="float:right;font-weight:600;">${fmtDollar(it.cost)}</span></div>`).join('')}
      </div>
    </div>`;
  }

  // Clear button
  html += `<div style="text-align:right;margin-top:12px;">
    <button id="bid-compare-clear" style="padding:6px 16px;border:1px solid rgba(0,0,0,0.12);background:rgba(0,0,0,0.02);color:rgba(0,0,0,0.5);cursor:pointer;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">CLEAR COMPARISON</button>
  </div>`;

  return html;
}

// ─── BOM Validation & Auto-Repair ───
// Runs after AI analysis to catch and fix absurd values before the estimator sees them
function validateAndRepairBOM(analysis) {
  if (!analysis?.categories) return analysis;
  const warnings = [];
  const cats = analysis.categories;

  for (let ci = 0; ci < cats.length; ci++) {
    const cat = cats[ci];
    if (!cat.items || !Array.isArray(cat.items)) continue;

    for (let ii = cat.items.length - 1; ii >= 0; ii--) {
      const item = cat.items[ii];
      const name = (item.item || item.name || '').toLowerCase();
      const qty = item.qty || 0;
      const unitCost = item.unit_cost || item.unitCost || 0;
      const unit = (item.unit || '').toLowerCase();

      // ── Check 1: $0 or $1 unit costs on real equipment (broken pricing) ──
      const isEquipment = /camera|switch|nvr|ups|rack|panel|reader|controller|server|monitor|detector|strobe|horn/i.test(name);
      if (isEquipment && unitCost < 5) {
        warnings.push(`⚠️ REMOVED: "${item.item || item.name}" has $${unitCost} unit cost (broken pricing)`);
        cat.items.splice(ii, 1);
        continue;
      }

      // ── Check 2: Absurd quantities ──
      // Cameras should never exceed 500 on any realistic project
      if (/camera|dome|ptz|bullet|fisheye|panoramic|multisensor/i.test(name) && unit === 'ea' && qty > 500) {
        warnings.push(`⚠️ CAPPED: "${item.item || item.name}" qty ${qty} → 500 (max realistic camera count)`);
        item.qty = 500;
        item.ext_cost = item.qty * unitCost;
      }
      // Switches, NVRs, racks should never exceed 50
      if (/switch|nvr|server|rack|cabinet/i.test(name) && unit === 'ea' && qty > 50) {
        warnings.push(`⚠️ CAPPED: "${item.item || item.name}" qty ${qty} → 50`);
        item.qty = 50;
        item.ext_cost = item.qty * unitCost;
      }
      // Cable in feet: cap at 500,000 ft (~95 miles)
      if (unit === 'ft' && qty > 500000) {
        warnings.push(`⚠️ CAPPED: "${item.item || item.name}" qty ${qty}ft → 500,000ft`);
        item.qty = 500000;
        item.ext_cost = item.qty * unitCost;
      }

      // ── Check 3: Math verification — ext_cost must equal qty × unit_cost ──
      const expectedExt = Math.round(item.qty * unitCost * 100) / 100;
      if (item.ext_cost && Math.abs(item.ext_cost - expectedExt) > 1) {
        warnings.push(`⚠️ MATH FIX: "${item.item || item.name}" ext_cost $${item.ext_cost} → $${expectedExt} (${item.qty} × $${unitCost})`);
        item.ext_cost = expectedExt;
      }
    }

    // Recalculate category subtotal
    cat.subtotal = cat.items.reduce((s, i) => s + (i.ext_cost || 0), 0);
  }

  // Recalculate grand total
  analysis.grandTotal = cats.reduce((s, c) => s + (c.subtotal || 0), 0);
  if (analysis.grand_total !== undefined) analysis.grand_total = analysis.grandTotal;

  // ── Check 4: Missing CCTV category when CCTV discipline is selected ──
  const disciplines = state.disciplines || [];
  if (disciplines.includes('CCTV')) {
    const hasCCTV = cats.some(c => /cctv|camera|surveillance/i.test(c.name) && c.items && c.items.length > 1);
    if (!hasCCTV) {
      warnings.push('🔴 CRITICAL: CCTV discipline selected but no CCTV category found or it has ≤1 item — analysis may have failed partially');
    }
  }

  if (warnings.length > 0) {
    console.warn(`[BOM Validation] ${warnings.length} issue(s) found and repaired:`);
    warnings.forEach(w => console.warn(`  ${w}`));
    state._bomValidationWarnings = warnings;
    if (typeof spToast === 'function') {
      spToast(`BOM Validation: ${warnings.length} issue(s) auto-repaired. Check console for details.`, 'warning');
    }
  } else {
    state._bomValidationWarnings = [];
    console.log('[BOM Validation] ✅ All checks passed');
  }

  return analysis;
}

// ─── Travel & Incidentals Computation ───
function computeTravelIncidentals() {
  const t = state.travel;
  const inc = state.incidentals;

  // Get total labor hours from AI
  const laborCalc = state.brainResults?.wave2_25?.LABOR_CALCULATOR;
  let totalLaborHours = laborCalc?.total_hours || 0;

  // ═══ SANITY BOUNDS ═══
  // AI can hallucinate extreme labor hours (e.g. 800K hours = 68 years of work).
  // Cap at 50,000 hours — the largest realistic low-voltage project
  // (25 techs × 250 workdays × 8 hrs/day = 50,000 hours).
  const MAX_LABOR_HOURS = 50000;
  const MAX_WORK_DAYS = 500;   // ~2 years absolute max
  const MAX_TECHS = 50;
  let laborHoursCapped = false;
  if (totalLaborHours > MAX_LABOR_HOURS) {
    console.warn(`[Travel] AI labor hours (${totalLaborHours.toLocaleString()}) exceeded cap of ${MAX_LABOR_HOURS.toLocaleString()} — capping.`);
    totalLaborHours = MAX_LABOR_HOURS;
    laborHoursCapped = true;
  }

  // Calculate scheduling
  let techs, workDays;
  if (t.calcMode === 'byTechs') {
    techs = Math.min(t.techCount || 4, MAX_TECHS);
    workDays = totalLaborHours > 0 ? Math.ceil(totalLaborHours / (techs * t.hoursPerDay)) : (t.projectDays || 30);
  } else {
    workDays = Math.min(t.projectDays || 30, MAX_WORK_DAYS);
    techs = totalLaborHours > 0 ? Math.min(Math.ceil(totalLaborHours / (workDays * t.hoursPerDay)), MAX_TECHS) : (t.techCount || 4);
  }
  // Final clamp
  workDays = Math.min(workDays, MAX_WORK_DAYS);
  techs = Math.min(techs, MAX_TECHS);

  // ON-SITE days — same total regardless of how many trips (work doesn't change)
  const totalPersonDays = techs * workDays;        // total person-days on site
  const totalTripDays = workDays;                   // total days on site

  // Travel costs
  // Hotel & per diem: based on total on-site days (doesn't multiply by trips)
  const hotelRate = t.hotelPerNight || 175;
  const perDiemRate = t.perDiemPerDay || 79;
  const hotel = totalPersonDays * hotelRate;
  const perdiem = totalPersonDays * perDiemRate;
  // Getting TO the site: these DO multiply by trips
  const mileage = t.numTrips * (t.mileageRoundTrip || 0) * (t.mileageRate || 0.70);
  const airfare = techs * t.numTrips * (t.airfarePerPerson || 0);
  const rental = totalTripDays * (t.rentalCarPerDay || 0);
  const parking = totalTripDays * (t.parkingPerDay || 0);
  const tolls = t.numTrips * (t.tollsPerTrip || 0);
  const travelSubtotal = hotel + perdiem + mileage + airfare + rental + parking + tolls;

  // Incidentals
  const permits = inc.permits || 0;
  const insurance = inc.insurance || 0;
  const bonding = inc.bonding || 0;
  const equipmentRental = inc.equipmentRental || 0;
  const fuelTransit = inc.fuelTransit || 0;
  const incidentalsSubtotal = permits + insurance + bonding + equipmentRental + fuelTransit;

  // Unexpected buffer — based on travel + incidentals subtotal
  const bufferBase = travelSubtotal + incidentalsSubtotal;
  const unexpectedBuffer = bufferBase * ((inc.unexpectedBufferPct || 0) / 100);

  const grandTotal = travelSubtotal + incidentalsSubtotal + unexpectedBuffer;

  return {
    totalLaborHours, techs, workDays, totalPersonDays, totalTripDays,
    laborHoursCapped,
    hotel, perdiem, mileage, airfare, rental, parking, tolls,
    travelSubtotal,
    permits, insurance, bonding, equipmentRental, fuelTransit,
    incidentalsSubtotal, unexpectedBuffer, grandTotal,
  };
}

// ─── Inject travel & incidentals into BOM as a category ───
function injectTravelIntoBOM(bom) {
  if (!state.travel.enabled) return bom;
  const costs = computeTravelIncidentals();
  if (costs.grandTotal <= 0) return bom;

  const travelItems = [];
  const addItem = (name, qty, unit, unitCost) => {
    if (unitCost > 0 && qty > 0) travelItems.push({ name, qty, unit, unitCost: Math.round(unitCost * 100) / 100, extCost: Math.round(qty * unitCost * 100) / 100 });
  };

  addItem(`Hotel (${costs.techs} techs × ${costs.workDays} days)`, costs.totalPersonDays, 'NIGHT', state.travel.hotelPerNight);
  addItem(`Per Diem / Meals (${costs.totalPersonDays} person-days)`, costs.totalPersonDays, 'DAY', state.travel.perDiemPerDay);
  if (state.travel.mileageRoundTrip > 0) addItem(`Mileage (${state.travel.mileageRoundTrip} mi RT × ${state.travel.numTrips} trips)`, state.travel.numTrips * state.travel.mileageRoundTrip, 'MI', state.travel.mileageRate);
  if (state.travel.airfarePerPerson > 0) addItem(`Airfare (${costs.techs} techs × ${state.travel.numTrips} trips)`, costs.techs * state.travel.numTrips, 'EA', state.travel.airfarePerPerson);
  if (state.travel.rentalCarPerDay > 0) addItem(`Rental Vehicle (${costs.totalTripDays} days)`, costs.totalTripDays, 'DAY', state.travel.rentalCarPerDay);
  if (state.travel.parkingPerDay > 0) addItem(`Parking (${costs.totalTripDays} days)`, costs.totalTripDays, 'DAY', state.travel.parkingPerDay);
  if (state.travel.tollsPerTrip > 0) addItem(`Tolls (${state.travel.numTrips} trips)`, state.travel.numTrips, 'EA', state.travel.tollsPerTrip);
  if (state.incidentals.permits > 0) addItem('Permits & Fees', 1, 'LS', state.incidentals.permits);
  if (state.incidentals.insurance > 0) addItem('Insurance / Bonding', 1, 'LS', state.incidentals.insurance + (state.incidentals.bonding || 0));
  if (state.incidentals.equipmentRental > 0) addItem('Equipment Rental', 1, 'LS', state.incidentals.equipmentRental);
  if (state.incidentals.fuelTransit > 0) addItem('Fuel / Transit Costs', 1, 'LS', state.incidentals.fuelTransit);
  if (costs.unexpectedBuffer > 0) addItem(`Contingency Buffer (${state.incidentals.unexpectedBufferPct}%)`, 1, 'LS', Math.round(costs.unexpectedBuffer * 100) / 100);

  const travelCategory = {
    name: 'Travel, Per Diem & Incidentals',
    subtotal: Math.round(costs.grandTotal * 100) / 100,
    items: travelItems,
  };

  // Remove any existing travel category and append new one
  const filtered = (bom.categories || []).filter(c => c.name !== 'Travel, Per Diem & Incidentals');
  filtered.push(travelCategory);
  const newTotal = filtered.reduce((sum, c) => sum + (c.subtotal || 0), 0);

  return { ...bom, categories: filtered, grandTotal: Math.round(newTotal * 100) / 100 };
}

// ─── Cable Pathway Distance Calculator ───────────────────────────────────────
// Uses SPATIAL_LAYOUT (wave0) + CABLE_PATHWAY (wave1) zone data for precise
// per-zone cable run lengths. Falls back to AI avg_length_ft if no spatial data.
function computePathwayDistances() {
  const cable  = state.brainResults?.wave1?.CABLE_PATHWAY || {};
  const spatial = state.brainResults?.wave0?.SPATIAL_LAYOUT || {};
  const ceilingH = state.ceilingHeight || 10;
  const floorH   = state.floorToFloorHeight || 14;
  const SLACK_FT = 15;   // termination + dressing + slack loops
  const WASTE    = 1.12; // 12% cable waste factor

  // Build IDF position lookup: { "IDF-1A": { x_pct, y_pct, floor } }
  const idfMap = {};
  (spatial.floors || []).forEach(fl => {
    (fl.idf_locations || []).forEach(idf => {
      idfMap[idf.label] = { x: idf.approx_x_pct || 50, y: idf.approx_y_pct || 50, floor: fl.floor || 1 };
    });
  });

  // Per-sheet scale lookup — maps sheet_id → { width_ft, depth_ft }
  const sheetDims = {};
  (spatial.sheets || []).forEach(sh => {
    if (sh.sheet_id && sh.sheet_area_width_ft > 0 && sh.sheet_area_depth_ft > 0) {
      sheetDims[sh.sheet_id] = { w: sh.sheet_area_width_ft, d: sh.sheet_area_depth_ft };
    }
  });
  const hasPerSheetDims = Object.keys(sheetDims).length > 0;

  // Overall building envelope — fallback when no per-sheet data
  const bldgW = spatial.building_dimensions?.overall_width_ft || state.floorPlateWidth || 0;
  const bldgD = spatial.building_dimensions?.overall_depth_ft || state.floorPlateDepth || 0;
  const hasDimensions = hasPerSheetDims || (bldgW > 0 && bldgD > 0);

  const results = [];
  let grandTotalFt = 0;
  let grandTotalCost = 0;
  let hasSpatialZones = false;

  // Walk each cable type from CABLE_PATHWAY brain output
  const horizontals = cable.horizontal_cables || [];
  horizontals.forEach(hc => {
    const cableType = hc.type || 'unknown';
    const zones = hc.zones || [];
    const ratePerFt = _getCableRatePerFt(cableType, hc.rating);

    if (zones.length > 0 && hasDimensions) {
      // ── SPATIAL MODE: calculate from zone positions using per-sheet scale ──
      hasSpatialZones = true;
      const zoneRows = zones.map(z => {
        let runFt;
        const idf = idfMap[z.idf_serving];
        if (idf && hasDimensions) {
          // Use per-sheet dimensions if available, otherwise fall back to overall building
          const zoneSheet = z.sheet_id && sheetDims[z.sheet_id];
          const zW = zoneSheet ? zoneSheet.w : bldgW;
          const zD = zoneSheet ? zoneSheet.d : bldgD;
          const dx = Math.abs((z.approx_x_pct || 50) - idf.x) / 100 * zW;
          const dy = Math.abs((z.approx_y_pct || 50) - idf.y) / 100 * zD;
          const floorsApart = Math.abs((z.floor || 1) - (idf.floor || 1));
          const vertFt = floorsApart > 0 ? floorsApart * floorH : ceilingH;
          runFt = Math.round(dx + dy + vertFt + SLACK_FT);
        } else {
          // IDF not in map — use zone's own estimate or fall back
          runFt = z.est_run_ft || hc.avg_length_ft || 150;
        }
        // TIA-568 horizontal cable limit
        const tiaFlag = runFt > 295;
        const qty = z.device_count || 0;
        const totalFt = Math.round(qty * runFt * WASTE);
        const cost = totalFt * ratePerFt;
        grandTotalFt += totalFt;
        grandTotalCost += cost;
        return { zone: z.zone_name || z.zone, idf: z.idf_serving, deviceCount: qty, runFt, totalFt, cost, tiaFlag, basis: z.basis || 'spatial calculation' };
      });
      results.push({ cableType, rating: hc.rating || '', zones: zoneRows, mode: 'spatial', ratePerFt });

    } else if (zones.length > 0) {
      // ── ZONE MODE: use AI's per-zone est_run_ft, just no coordinate math ──
      hasSpatialZones = true;
      const zoneRows = zones.map(z => {
        const runFt = z.est_run_ft || hc.avg_length_ft || 150;
        const tiaFlag = runFt > 295;
        const qty = z.device_count || 0;
        const totalFt = Math.round(qty * runFt * WASTE);
        const cost = totalFt * ratePerFt;
        grandTotalFt += totalFt;
        grandTotalCost += cost;
        return { zone: z.zone_name || z.zone, idf: z.idf_serving, deviceCount: qty, runFt, totalFt, cost, tiaFlag, basis: z.basis || 'AI zone estimate' };
      });
      results.push({ cableType, rating: hc.rating || '', zones: zoneRows, mode: 'zone-estimate', ratePerFt });

    } else {
      // ── FALLBACK: single average (old brain output format) ──
      const runFt = hc.avg_length_ft || 150;
      const qty   = hc.count || 0;
      const totalFt = hc.total_ft || Math.round(qty * runFt * WASTE);
      const cost = totalFt * ratePerFt;
      grandTotalFt += totalFt;
      grandTotalCost += cost;
      results.push({ cableType, rating: hc.rating || '', zones: [{ zone: 'All areas (estimated avg)', idf: 'Various', deviceCount: qty, runFt, totalFt, cost, tiaFlag: runFt > 295, basis: `${qty} drops × ${runFt} ft avg (no spatial data)` }], mode: 'avg-fallback', ratePerFt });
    }
  });

  // TIA-568 violations across all zones
  const tiaViolations = results.flatMap(r => r.zones.filter(z => z.tiaFlag));

  return { results, grandTotalFt, grandTotalCost, hasSpatialZones, tiaViolations, hasDimensions, bldgW, bldgD };
}

// Helper: look up cable cost rate from pricing database
function _getCableRatePerFt(type, rating) {
  if (typeof PRICING_DB === 'undefined') return 0.32; // safe default
  const tier = state.pricingTier || 'mid';
  const rm = state.regionalMultiplier || 1.0;
  const db = PRICING_DB.structured_cabling?.cable || {};
  const t = (type || '').toLowerCase();
  const r = (rating || '').toLowerCase();
  let key;
  if (t.includes('6a') || t.includes('cat6a')) key = r.includes('riser') ? 'cat6a_riser' : 'cat6a_plenum';
  else if (t.includes('cat6') || t === 'cat6') key = r.includes('riser') ? 'cat6_riser' : 'cat6_plenum';
  else if (t.includes('5e') || t.includes('cat5')) key = r.includes('riser') ? 'cat5e_riser' : 'cat5e_plenum';
  else if (t.includes('fiber') && t.includes('sm')) key = 'fiber_sm_os2';
  else if (t.includes('fiber') && t.includes('mm')) key = 'fiber_mm_om4';
  else if (t.includes('coax') || t.includes('rg6')) key = 'coax_rg6';
  else key = 'cat6a_plenum';
  const entry = db[key];
  return entry ? (entry[tier] || entry.mid || 0.32) * rm : 0.32;
}

// ─── Inject Calculated Cable Quantities into BOM ─────────────────────────────
// Called from export-engine._filterBOMByDisciplines after injectTravelIntoBOM.
// Replaces AI-estimated cable line items with spatially-calculated quantities
// ONLY when zone data is available and quantities have improved confidence.
function injectCalculatedCableQuantities(bom) {
  // Only run when CABLE_PATHWAY brain has zone-level data
  const cable = state.brainResults?.wave1?.CABLE_PATHWAY || {};
  const horizontals = cable.horizontal_cables || [];
  const hasZones = horizontals.some(hc => (hc.zones || []).length > 0);
  if (!hasZones) return bom; // No zone data — leave BOM untouched

  const pathway = computePathwayDistances();
  if (!pathway.hasSpatialZones || pathway.grandTotalFt <= 0) return bom;

  // Build a lookup of calculated totals by cable type
  const calcByType = {};
  pathway.results.forEach(r => {
    const key = r.cableType.toLowerCase();
    if (!calcByType[key]) calcByType[key] = { totalFt: 0, ratePerFt: r.ratePerFt, mode: r.mode };
    r.zones.forEach(z => { calcByType[key].totalFt += z.totalFt; });
  });

  // Walk BOM categories and update cable line items
  const updatedCategories = (bom.categories || []).map(cat => {
    if (!/(cabling|structured|cable|network|telecom)/i.test(cat.name)) return cat;
    const updatedItems = (cat.items || []).map(item => {
      const name = (item.name || '').toLowerCase();
      let matchKey = null;
      if (/cat\s*6a|cat6a/.test(name)) matchKey = 'cat6a';
      else if (/cat\s*6(?!a)|cat6(?!a)/.test(name)) matchKey = 'cat6';
      else if (/cat\s*5e?|cat5/.test(name)) matchKey = 'cat5e';
      else if (/fiber.*sm|sm.*fiber|os2/.test(name)) matchKey = 'fiber_sm_os2';
      else if (/fiber.*mm|mm.*fiber|om[34]/.test(name)) matchKey = 'fiber_mm_om4';
      else if (/coax|rg.?6/.test(name)) matchKey = 'coax_rg6';

      if (matchKey && calcByType[matchKey] && item.unit === 'ft') {
        const calc = calcByType[matchKey];
        const newQty  = Math.round(calc.totalFt);
        const newCost = Math.round(newQty * (item.unitCost || calc.ratePerFt) * 100) / 100;
        return { ...item, qty: newQty, extCost: newCost, _calculatedRun: true };
      }
      return item;
    });
    const newSubtotal = updatedItems.reduce((s, i) => s + (i.extCost || 0), 0);
    return { ...cat, items: updatedItems, subtotal: Math.round(newSubtotal * 100) / 100 };
  });

  const newGrandTotal = updatedCategories.reduce((s, c) => s + (c.subtotal || 0), 0);
  return { ...bom, categories: updatedCategories, grandTotal: Math.round(newGrandTotal * 100) / 100 };
}

// ─── Step 6: Travel, Per Diem & Incidentals ───
function renderStep6Travel(container) {
  const laborCalc = state.brainResults?.wave2_25?.LABOR_CALCULATOR;
  const totalHours = laborCalc?.total_hours || 0;
  const crew = laborCalc?.crew_recommendation || {};
  const t = state.travel;
  const inc = state.incidentals;
  const costs = computeTravelIncidentals();
  const fmt = n => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  container.innerHTML = `
    <h2 class="step-heading">Travel, Per Diem & Incidentals</h2>
    <p class="step-subheading">Configure travel costs, permits, and other project expenses. The AI has analyzed your plans and recommends the crew and schedule below.</p>

    <!-- LABOR HOURS SUMMARY -->
    <div style="background:linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08));border:1px solid rgba(99,102,241,0.25);border-radius:12px;padding:20px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
        <span style="font-size:28px;">⏱️</span>
        <div>
          <div style="font-size:22px;font-weight:800;color:var(--accent-indigo);">${totalHours.toLocaleString()} Total Labor Hours</div>
          <div style="font-size:12px;color:var(--text-muted);">From AI analysis (${laborCalc ? 'Labor Calculator brain' : 'not available'})</div>
        </div>
      </div>
      ${crew.duration_weeks ? `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-top:8px;">
        ${Object.entries(crew).filter(([k,v]) => k !== 'duration_weeks' && v > 0).map(([k,v]) => `
          <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:8px 12px;text-align:center;">
            <div style="font-size:18px;font-weight:700;color:var(--text-primary);">${v}</div>
            <div style="font-size:11px;color:var(--text-muted);text-transform:capitalize;">${k}</div>
          </div>`).join('')}
        <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:8px 12px;text-align:center;">
          <div style="font-size:18px;font-weight:700;color:var(--text-primary);">${crew.duration_weeks}</div>
          <div style="font-size:11px;color:var(--text-muted);">Weeks</div>
        </div>
      </div>` : ''}
      ${!totalHours ? '<div style="color:var(--accent-amber);font-size:12px;margin-top:8px;">⚠️ Labor hours not available from analysis. Enter scheduling manually below.</div>' : ''}
    </div>

    <!-- ENABLE TRAVEL -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;font-weight:600;color:var(--text-primary);">
        <input type="checkbox" id="travel-enabled" ${t.enabled ? 'checked' : ''} style="width:18px;height:18px;">
        Enable Travel & Per Diem Costs
      </label>
    </div>

    ${t.enabled ? `
    <!-- SCHEDULING MODE -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="font-weight:700;font-size:14px;color:var(--text-primary);margin-bottom:12px;">📅 Scheduling Mode</div>
      <div style="display:flex;gap:12px;margin-bottom:16px;">
        <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px;border-radius:8px;border:2px solid ${t.calcMode === 'byTechs' ? 'var(--accent-indigo)' : 'rgba(255,255,255,0.08)'};cursor:pointer;background:${t.calcMode === 'byTechs' ? 'rgba(99,102,241,0.08)' : 'transparent'};">
          <input type="radio" name="calc-mode" value="byTechs" ${t.calcMode === 'byTechs' ? 'checked' : ''} style="width:16px;height:16px;">
          <div>
            <div style="font-weight:600;font-size:13px;color:var(--text-primary);">By Techs</div>
            <div style="font-size:11px;color:var(--text-muted);">I know how many techs — calculate days needed</div>
          </div>
        </label>
        <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px;border-radius:8px;border:2px solid ${t.calcMode === 'bySchedule' ? 'var(--accent-indigo)' : 'rgba(255,255,255,0.08)'};cursor:pointer;background:${t.calcMode === 'bySchedule' ? 'rgba(99,102,241,0.08)' : 'transparent'};">
          <input type="radio" name="calc-mode" value="bySchedule" ${t.calcMode === 'bySchedule' ? 'checked' : ''} style="width:16px;height:16px;">
          <div>
            <div style="font-weight:600;font-size:13px;color:var(--text-primary);">By Schedule</div>
            <div style="font-size:11px;color:var(--text-muted);">I have a deadline — calculate techs needed</div>
          </div>
        </label>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        ${t.calcMode === 'byTechs' ? `
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="sched-techs">Techs on Job</label>
          <input class="form-input sched-input" type="number" min="1" max="50" id="sched-techs" value="${t.techCount}" style="font-size:14px;padding:8px 10px;">
          ${t.aiRecommendedTechs ? `<div style="font-size:10px;color:var(--accent-indigo);margin-top:2px;">AI recommends: ${t.aiRecommendedTechs}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;background:rgba(16,185,129,0.08);border-radius:8px;padding:8px;">
          <div style="font-size:20px;font-weight:800;color:var(--accent-emerald);">${costs.workDays}</div>
          <div style="font-size:11px;color:var(--text-muted);">Work Days Needed</div>
        </div>
        ` : `
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="sched-days">Days to Complete</label>
          <input class="form-input sched-input" type="number" min="1" max="365" id="sched-days" value="${t.projectDays}" style="font-size:14px;padding:8px 10px;">
          ${t.aiRecommendedDays ? `<div style="font-size:10px;color:var(--accent-indigo);margin-top:2px;">AI recommends: ${t.aiRecommendedDays}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;background:rgba(16,185,129,0.08);border-radius:8px;padding:8px;">
          <div style="font-size:20px;font-weight:800;color:var(--accent-emerald);">${costs.techs}</div>
          <div style="font-size:11px;color:var(--text-muted);">Techs Needed</div>
        </div>
        `}
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="sched-trips">Mobilizations (Trips)</label>
          <input class="form-input sched-input" type="number" min="1" max="10" id="sched-trips" value="${t.numTrips}" style="font-size:14px;padding:8px 10px;">
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Separate crew deployments — usually 1</div>
        </div>
      </div>
      <div style="margin-top:8px;font-size:11px;color:var(--text-muted);">
        ${totalHours > 0 ? `${totalHours.toLocaleString()} hrs ÷ (${costs.techs} techs × ${t.hoursPerDay} hrs/day) = ${costs.workDays} work days | ${costs.totalPersonDays} total person-days${costs.laborHoursCapped ? ' <span style="color:#f59e0b;font-weight:700;">⚠️ AI labor hours were unrealistically high and were capped at 50,000 — review scheduling manually</span>' : ''}` : 'Enter scheduling details manually — labor hours not available from analysis.'}
      </div>
    </div>

    <!-- TRAVEL COSTS -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="font-weight:700;font-size:14px;color:var(--text-primary);margin-bottom:12px;">💰 Travel Costs</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="t6-hotel">Hotel $/night</label>
          <input class="form-input t6-input" type="number" min="0" step="5" id="t6-hotel" data-key="hotelPerNight" value="${t.hotelPerNight || 175}" placeholder="175" style="font-size:14px;padding:8px 10px;">
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">GSA avg: $175/night</div>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="t6-perdiem">Per Diem $/day</label>
          <input class="form-input t6-input" type="number" min="0" step="1" id="t6-perdiem" data-key="perDiemPerDay" value="${t.perDiemPerDay || 79}" placeholder="79" style="font-size:14px;padding:8px 10px;">
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">GSA rate: $79/day</div>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="t6-mileage">Mileage (RT miles)</label>
          <input class="form-input t6-input" type="number" min="0" id="t6-mileage" data-key="mileageRoundTrip" value="${t.mileageRoundTrip}" style="font-size:14px;padding:8px 10px;">
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">@ $${t.mileageRate}/mi</div>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="t6-airfare">Airfare $/person</label>
          <input class="form-input t6-input" type="number" min="0" step="25" id="t6-airfare" data-key="airfarePerPerson" value="${t.airfarePerPerson}" style="font-size:14px;padding:8px 10px;">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="t6-rental">Rental Car $/day</label>
          <input class="form-input t6-input" type="number" min="0" step="5" id="t6-rental" data-key="rentalCarPerDay" value="${t.rentalCarPerDay}" style="font-size:14px;padding:8px 10px;">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="t6-parking">Parking $/day</label>
          <input class="form-input t6-input" type="number" min="0" step="5" id="t6-parking" data-key="parkingPerDay" value="${t.parkingPerDay}" style="font-size:14px;padding:8px 10px;">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="t6-tolls">Tolls $/trip</label>
          <input class="form-input t6-input" type="number" min="0" step="5" id="t6-tolls" data-key="tollsPerTrip" value="${t.tollsPerTrip}" style="font-size:14px;padding:8px 10px;">
        </div>
      </div>
    </div>

    <!-- OTHER INCIDENTALS -->
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="font-weight:700;font-size:14px;color:var(--text-primary);margin-bottom:12px;">📋 Other Incidentals</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="inc-permits">Permits & Fees ($)</label>
          <input class="form-input inc-input" type="number" min="0" step="100" id="inc-permits" data-key="permits" value="${inc.permits}" style="font-size:14px;padding:8px 10px;">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="inc-insurance">Insurance ($)</label>
          <input class="form-input inc-input" type="number" min="0" step="100" id="inc-insurance" data-key="insurance" value="${inc.insurance}" style="font-size:14px;padding:8px 10px;">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="inc-bonding">Bonding ($)</label>
          <input class="form-input inc-input" type="number" min="0" step="100" id="inc-bonding" data-key="bonding" value="${inc.bonding}" style="font-size:14px;padding:8px 10px;">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="inc-equipment">Equipment Rental ($)</label>
          <input class="form-input inc-input" type="number" min="0" step="100" id="inc-equipment" data-key="equipmentRental" value="${inc.equipmentRental}" style="font-size:14px;padding:8px 10px;">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="inc-fuel">Fuel / Transit ($)</label>
          <input class="form-input inc-input" type="number" min="0" step="50" id="inc-fuel" data-key="fuelTransit" value="${inc.fuelTransit}" style="font-size:14px;padding:8px 10px;">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label class="form-label" style="font-size:12px;margin-bottom:4px;" for="inc-buffer">Unexpected Buffer (%)</label>
          <input class="form-input inc-input" type="number" min="0" max="25" step="1" id="inc-buffer" data-key="unexpectedBufferPct" value="${inc.unexpectedBufferPct}" style="font-size:14px;padding:8px 10px;">
        </div>
      </div>
    </div>

    <!-- COST SUMMARY -->
    <div style="background:linear-gradient(135deg,rgba(245,158,11,0.12),rgba(251,191,36,0.06));border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:20px;">
      <div style="font-weight:800;font-size:16px;color:var(--accent-amber);margin-bottom:12px;">🧮 Stage 7 Cost Summary</div>
      <div style="display:grid;grid-template-columns:1fr auto;gap:4px 16px;font-size:13px;">
        <div>🏨 Hotel (${costs.totalPersonDays} person-nights)</div><div style="text-align:right;font-weight:600;">${fmt(costs.hotel)}</div>
        <div>🍽️ Per Diem (${costs.totalPersonDays} person-days)</div><div style="text-align:right;font-weight:600;">${fmt(costs.perdiem)}</div>
        ${costs.mileage > 0 ? `<div>🚗 Mileage</div><div style="text-align:right;font-weight:600;">${fmt(costs.mileage)}</div>` : ''}
        ${costs.airfare > 0 ? `<div>✈️ Airfare</div><div style="text-align:right;font-weight:600;">${fmt(costs.airfare)}</div>` : ''}
        ${costs.rental > 0 ? `<div>🚙 Rental Vehicle</div><div style="text-align:right;font-weight:600;">${fmt(costs.rental)}</div>` : ''}
        ${costs.parking > 0 ? `<div>🅿️ Parking</div><div style="text-align:right;font-weight:600;">${fmt(costs.parking)}</div>` : ''}
        ${costs.tolls > 0 ? `<div>🛣️ Tolls</div><div style="text-align:right;font-weight:600;">${fmt(costs.tolls)}</div>` : ''}
        <div style="border-top:1px solid rgba(255,255,255,0.12);padding-top:4px;font-weight:600;">Travel Subtotal</div>
        <div style="border-top:1px solid rgba(255,255,255,0.12);padding-top:4px;text-align:right;font-weight:600;">${fmt(costs.travelSubtotal)}</div>
        ${costs.permits > 0 ? `<div>📋 Permits & Fees</div><div style="text-align:right;font-weight:600;">${fmt(costs.permits)}</div>` : ''}
        ${costs.insurance > 0 ? `<div>🛡️ Insurance</div><div style="text-align:right;font-weight:600;">${fmt(costs.insurance)}</div>` : ''}
        ${costs.bonding > 0 ? `<div>📎 Bonding</div><div style="text-align:right;font-weight:600;">${fmt(costs.bonding)}</div>` : ''}
        ${costs.equipmentRental > 0 ? `<div>🔧 Equipment Rental</div><div style="text-align:right;font-weight:600;">${fmt(costs.equipmentRental)}</div>` : ''}
        ${costs.fuelTransit > 0 ? `<div>⛽ Fuel / Transit</div><div style="text-align:right;font-weight:600;">${fmt(costs.fuelTransit)}</div>` : ''}
        ${costs.incidentalsSubtotal > 0 ? `
        <div style="border-top:1px solid rgba(255,255,255,0.12);padding-top:4px;font-weight:600;">Incidentals Subtotal</div>
        <div style="border-top:1px solid rgba(255,255,255,0.12);padding-top:4px;text-align:right;font-weight:600;">${fmt(costs.incidentalsSubtotal)}</div>
        ` : ''}
        ${costs.unexpectedBuffer > 0 ? `<div>⚠️ Contingency Buffer (${inc.unexpectedBufferPct}%)</div><div style="text-align:right;font-weight:600;">${fmt(costs.unexpectedBuffer)}</div>` : ''}
        <div style="border-top:2px solid rgba(245,158,11,0.4);padding-top:8px;margin-top:4px;font-weight:800;font-size:16px;color:var(--accent-amber);">STAGE 7 TOTAL</div>
        <div style="border-top:2px solid rgba(245,158,11,0.4);padding-top:8px;margin-top:4px;text-align:right;font-weight:800;font-size:18px;color:var(--accent-amber);">${fmt(costs.grandTotal)}</div>
      </div>
      <div style="margin-top:12px;font-size:11px;color:var(--text-muted);">This amount will be added as a "Travel, Per Diem & Incidentals" category in the BOM on the Results page.</div>
    </div>
    ` : `
    <div class="info-card info-card--emerald" style="margin-top:8px;">
      <div class="info-card-title">💡 Local Project</div>
      <div class="info-card-body">Travel costs are disabled. Enable the checkbox above if this is an out-of-town project requiring hotel, per diem, or other travel expenses.</div>
    </div>
    `}
  `;

  // Event bindings
  document.getElementById('travel-enabled').addEventListener('change', e => {
    state.travel.enabled = e.target.checked;
    renderStep6Travel(container);
  });

  document.querySelectorAll('input[name="calc-mode"]').forEach(radio => {
    radio.addEventListener('change', e => {
      state.travel.calcMode = e.target.value;
      renderStep6Travel(container);
    });
  });

  const schedTechs = document.getElementById('sched-techs');
  if (schedTechs) schedTechs.addEventListener('change', e => { state.travel.techCount = parseInt(e.target.value) || 4; renderStep6Travel(container); });

  const schedDays = document.getElementById('sched-days');
  if (schedDays) schedDays.addEventListener('change', e => { state.travel.projectDays = parseInt(e.target.value) || 30; renderStep6Travel(container); });

  const schedTrips = document.getElementById('sched-trips');
  if (schedTrips) schedTrips.addEventListener('change', e => { state.travel.numTrips = parseInt(e.target.value) || 1; renderStep6Travel(container); });

  document.querySelectorAll('.t6-input').forEach(input => {
    input.addEventListener('change', e => {
      const key = e.target.dataset.key;
      if (key) { state.travel[key] = parseFloat(e.target.value) || 0; renderStep6Travel(container); }
    });
  });

  document.querySelectorAll('.inc-input').forEach(input => {
    input.addEventListener('change', e => {
      const key = e.target.dataset.key;
      if (key) { state.incidentals[key] = parseFloat(e.target.value) || 0; renderStep6Travel(container); }
    });
  });
}

// ─── Step 7: Results & RFIs ───
function renderStep7(container) {
  const rfis = getRelevantRFIs();
  const accuracy = getAccuracyEstimate();
  const tl = getTrafficLight(accuracy);
  let confLabel, confDesc;
  if (accuracy >= 85) {
    confLabel = "🟢 High";
    confDesc = "Your file quality and context should produce reliable counts. Spot-check 2–3 sheets to verify.";
  } else if (accuracy >= 70) {
    confLabel = "🟡 Moderate";
    confDesc = "Results are usable but require manual verification on dense areas. Consider upgrading file format.";
  } else {
    confLabel = "🔴 Low";
    confDesc = "Significant manual verification needed. Request vector PDFs from the design team for better results.";
  }

  const rfiListHtml = rfis.map(rfi => {
    const isSel = state.selectedRFIs.has(rfi.id);
    const isExp = state.expandedRFI === rfi.id;
    return `
      <div class="rfi-item${isSel ? " selected" : ""}" data-rfi-id="${rfi.id}">
        <div class="rfi-item-header" data-rfi-toggle="${rfi.id}">
          <button class="rfi-checkbox${isSel ? " checked" : ""}" data-rfi-check="${rfi.id}">${isSel ? "✓" : ""}</button>
          <div class="rfi-item-content">
            <div class="rfi-item-tags">
              <span class="rfi-tag rfi-tag--id">${rfi.id}</span>
              <span class="rfi-tag rfi-tag--discipline">${esc(rfi.discipline)}</span>
            </div>
            <div class="rfi-item-question${isExp ? "" : " truncated"}">${esc(rfi.q)}</div>
          </div>
          <span class="rfi-expand-icon${isExp ? " open" : ""}">▼</span>
        </div>
        ${isExp ? `<div class="rfi-item-reason"><strong>Reason:</strong> ${esc(rfi.reason)}</div>` : ""}
      </div>
    `;
  }).join("");

  // Build failed brains banner
  let failedBrainsBanner = '';
  if (state.failedBrains && state.failedBrains.length > 0) {
    const brainList = state.failedBrains.map(b =>
      `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(245,158,11,0.1);">
        <span style="font-size:16px;">❌</span>
        <div>
          <div style="font-weight:600;font-size:13px;color:rgba(255,255,255,0.85);">${esc(b.name)}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:1px;">${esc(b.error || 'Unknown error')}</div>
        </div>
      </div>`
    ).join('');
    failedBrainsBanner = `
      <div class="info-card info-card--amber" style="margin-bottom:16px;">
        <div class="info-card-title">⚠️ ${state.failedBrains.length} Brain(s) Failed During Analysis</div>
        <div class="info-card-body" style="padding:8px 0;">
          ${brainList}
        </div>
        <div style="font-size:12px;color:rgba(255,255,255,0.45);margin-top:8px;line-height:1.5;">
          The analysis continued with remaining brains. Results may be less accurate for the affected areas.
          You can retry the analysis or proceed with partial results.
        </div>
      </div>
    `;
  }

  // Build AI analysis section
  let aiSection = "";

  if (state.aiError) {
    aiSection = `
      <div class="info-card info-card--amber" style="margin-bottom:22px;">
        <div class="info-card-title">⚠ AI Analysis Note</div>
        <div class="info-card-body">
          The Gemini AI analysis encountered an issue: <strong>${esc(state.aiError)}</strong><br>
          Template-based RFI recommendations are shown below as a fallback. You can retry by starting a new analysis.
        </div>
      </div>
    `;
  } else if (state.aiAnalysis) {
    // Build validation banners
    let validationBanners = '';

    // Math validation banner
    if (state.mathValidation) {
      const mv = state.mathValidation;
      if (mv.passed) {
        validationBanners += `
          <div class="info-card" style="margin-bottom:12px; border-left:4px solid #10b981; background:rgba(16,185,129,0.08);">
            <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;">
              <span style="font-size:18px;">✅</span>
              <span style="color:#10b981;font-weight:600;">Math Validation Passed</span>
              <span style="color:rgba(255,255,255,0.5);font-size:13px;margin-left:auto;">${mv.total_tables_checked} cost rows checked</span>
            </div>
          </div>`;
      } else {
        validationBanners += `
          <div class="info-card" style="margin-bottom:12px; border-left:4px solid #f59e0b; background:rgba(245,158,11,0.08);">
            <div style="padding:10px 14px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <span style="font-size:18px;">⚠️</span>
                <span style="color:#f59e0b;font-weight:600;">Math Discrepancies Found: ${mv.issues.length}</span>
              </div>
              <div style="font-size:13px;color:rgba(255,255,255,0.6);line-height:1.6;">
                ${mv.issues.slice(0, 5).map(iss => `<div>Line ${iss.line}: ${iss.qty} × $${iss.unitCost.toLocaleString()} = <strong style="color:#f43f5e;">$${iss.extCost.toLocaleString()}</strong> (expected $${iss.expected.toLocaleString()})</div>`).join('')}
                ${mv.issues.length > 5 ? `<div style="color:#f59e0b;">+ ${mv.issues.length - 5} more — check Verification Audit section below</div>` : ''}
              </div>
            </div>
          </div>`;
      }
    }

    // Section completeness banner
    if (state.sectionCompleteness) {
      const sc = state.sectionCompleteness;
      if (sc.complete) {
        validationBanners += `
          <div class="info-card" style="margin-bottom:12px; border-left:4px solid #10b981; background:rgba(16,185,129,0.08);">
            <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;">
              <span style="font-size:18px;">✅</span>
              <span style="color:#10b981;font-weight:600;">All ${sc.found.length} Required Sections Present</span>
            </div>
          </div>`;
      } else {
        validationBanners += `
          <div class="info-card" style="margin-bottom:12px; border-left:4px solid #f59e0b; background:rgba(245,158,11,0.08);">
            <div style="padding:10px 14px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <span style="font-size:18px;">🟡</span>
                <span style="color:#f59e0b;font-weight:600;">Section Completeness: ${sc.score}% (${sc.found.length}/${sc.found.length + sc.missing.length})</span>
              </div>
              <div style="font-size:13px;color:rgba(255,255,255,0.6);">
                Missing: ${sc.missing.map(m => `<span style="color:#f59e0b;">${m.replace(/_/g, ' ')}</span>`).join(', ')}
              </div>
            </div>
          </div>`;
      }
    }

    // Build Table of Contents from AI analysis headings
    const tocItems = [];
    if (state.aiAnalysis) {
      const tocRegex = /^#{1,3}\s+(.+)$/gm;
      let tocMatch, tocIdx = 0;
      while ((tocMatch = tocRegex.exec(state.aiAnalysis)) !== null) {
        const title = tocMatch[1].replace(/\*+/g, '').trim();
        if (title.length > 2 && title.length < 80) {
          tocItems.push({ title, id: 'toc-' + tocIdx++ });
        }
      }
    }
    const tocHtml = tocItems.length > 3 ? `
      <div style="margin-bottom:12px;padding:10px 14px;background:rgba(13,148,136,0.04);border:1px solid rgba(13,148,136,0.15);border-radius:8px;">
        <div style="font-weight:700;font-size:11px;color:var(--accent-teal);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">Jump to Section</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;">${tocItems.map(t =>
          `<a href="#${esc(t.id)}" data-toc-target="${esc(t.id)}" style="padding:3px 8px;border-radius:4px;font-size:11px;color:var(--accent-teal);background:rgba(13,148,136,0.06);border:1px solid rgba(13,148,136,0.12);text-decoration:none;cursor:pointer;">${esc(t.title)}</a>`
        ).join('')}</div>
      </div>` : '';

    aiSection = `
      <div class="info-card info-card--emerald" style="margin-bottom:22px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding-left:8px;flex-wrap:wrap;gap:8px;">
          <div class="info-card-title" style="margin-bottom:0;">📋 AI Estimation & Analysis</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button id="btn-copy-analysis" style="display:flex;align-items:center;gap:4px;padding:7px 12px;border-radius:8px;border:1px solid rgba(129,140,248,0.35);background:rgba(129,140,248,0.06);color:var(--accent-indigo);cursor:pointer;font-size:12px;font-weight:600;" title="Copy to clipboard">
              📋 Copy
            </button>
            <button id="btn-expand-analysis" style="display:flex;align-items:center;gap:4px;padding:7px 12px;border-radius:8px;border:1px solid rgba(245,158,11,0.35);background:rgba(245,158,11,0.06);color:var(--accent-amber);cursor:pointer;font-size:12px;font-weight:600;" title="Expand/collapse">
              ↕ Expand
            </button>
            <button id="btn-save-analysis-pdf" style="display:flex;align-items:center;gap:4px;padding:7px 12px;border-radius:8px;border:1px solid rgba(16,185,129,0.35);background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(16,185,129,0.04));color:#10b981;cursor:pointer;font-size:12px;font-weight:600;">
              📄 PDF
            </button>
          </div>
        </div>
        ${tocHtml}
        <div class="info-card-body ai-analysis-content" id="ai-analysis-printable" style="white-space:pre-wrap; line-height:1.75; max-height:600px; overflow-y:auto;">${formatAIResponse(state.aiAnalysis)}</div>
      </div>
      ${validationBanners}
    `;
  }

  // Export panel — ALWAYS show download buttons + proposal button
  const noAnalysisWarning = !state.aiAnalysis ? `
      <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:10px;margin-bottom:14px;">
        <span style="font-size:20px;">⚠️</span>
        <div style="font-size:13px;color:rgba(255,255,255,0.7);line-height:1.5;">
          AI analysis did not complete. Exports will contain project setup data only (no AI-generated counts or pricing).
          You can still generate a professional proposal below, or re-run the analysis.
        </div>
      </div>` : '';

  const exportButtons = `
      <div class="info-card-body" style="line-height:1.8;">
        Export your ${state.aiAnalysis ? 'complete analysis' : 'project data'} for use in project management, client proposals, or record keeping.
      </div>
      ${noAnalysisWarning}
      <button class="export-pkg-btn" id="btn-master-report" style="display:flex;align-items:center;gap:14px;padding:18px 22px;border-radius:12px;border:2px solid rgba(13,148,136,0.5);background:linear-gradient(135deg,rgba(13,148,136,0.15),rgba(13,148,136,0.04));color:var(--text-primary);cursor:pointer;text-align:left;transition:all 0.2s;width:100%;margin-top:14px;margin-bottom:14px;">
        <span style="font-size:32px;">📑</span>
        <div style="flex:1;">
          <div style="font-weight:800;font-size:15px;color:#0D9488;">Generate Master Report (PDF)</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:3px;">One comprehensive document with BOM, labor, travel, RFIs, exclusions, change orders, bid strategy, infrastructure, symbol inventory, and more — ready to print or save as PDF</div>
        </div>
        <span style="font-size:22px;color:#0D9488;">📄</span>
      </button>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px;">
        <button class="export-pkg-btn" id="export-json" style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-radius:10px;border:1px solid rgba(56,189,248,0.25);background:rgba(56,189,248,0.06);color:var(--text-primary);cursor:pointer;text-align:left;transition:all 0.15s;">
          <span style="font-size:24px;">🔗</span>
          <div>
            <div style="font-weight:700;font-size:13px;">JSON — PM App Import</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Structured data for project management app</div>
          </div>
        </button>
        <button class="export-pkg-btn" id="export-excel" style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-radius:10px;border:1px solid rgba(16,185,129,0.25);background:rgba(16,185,129,0.06);color:var(--text-primary);cursor:pointer;text-align:left;transition:all 0.15s;">
          <span style="font-size:24px;"><i data-lucide="table" style="width:22px;height:22px;color:#14B8A6;"></i></span>
          <div>
            <div style="font-weight:700;font-size:13px;">Excel — Spreadsheet</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Multi-sheet workbook for review & editing</div>
          </div>
        </button>
        <button class="export-pkg-btn" id="export-markdown" style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-radius:10px;border:1px solid rgba(245,158,11,0.25);background:rgba(245,158,11,0.06);color:var(--text-primary);cursor:pointer;text-align:left;transition:all 0.15s;">
          <span style="font-size:24px;"><i data-lucide="file-spreadsheet" style="width:22px;height:22px;color:#14B8A6;"></i></span>
          <div>
            <div style="font-weight:700;font-size:13px;">Markdown — Proposal Report</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Formatted document for client proposals</div>
          </div>
        </button>
        <button class="export-pkg-btn" id="export-all" style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-radius:10px;border:1px solid rgba(129,140,248,0.25);background:rgba(129,140,248,0.06);color:var(--text-primary);cursor:pointer;text-align:left;transition:all 0.15s;">
          <span style="font-size:24px;">📦</span>
          <div>
            <div style="font-weight:700;font-size:13px;">Export All Formats</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Download JSON + Excel + Markdown at once</div>
          </div>
        </button>
      </div>
      <div style="margin-top:14px;display:flex;gap:8px;">
        <button class="export-pkg-btn" id="export-bom" style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-radius:10px;border:1px solid rgba(20,184,166,0.35);background:linear-gradient(135deg,rgba(20,184,166,0.10),rgba(6,182,212,0.06));color:var(--text-primary);cursor:pointer;text-align:left;transition:all 0.15s;flex:1;">
          <span style="font-size:24px;">📋</span>
          <div style="flex:1;">
            <div style="font-weight:700;font-size:14px;">Download Detailed Bill of Materials</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Complete BOM with all items, quantities, unit costs & extended costs — Excel spreadsheet</div>
          </div>
          <span style="font-size:18px;color:rgba(20,184,166,0.7);">⬇</span>
        </button>
        <button class="export-pkg-btn" id="export-bom-pdf" style="display:flex;align-items:center;justify-content:center;padding:14px 16px;border-radius:10px;border:1px solid rgba(16,185,129,0.4);background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(16,185,129,0.04));color:#10b981;cursor:pointer;font-weight:700;font-size:13px;flex:0 0 auto;">📄 PDF</button>
      </div>

      <!-- Supplier Pricing Section -->
      <div style="margin-top:18px;padding-top:14px;border-top:1px solid rgba(20,184,166,0.15);">
        <div style="font-weight:700;font-size:13px;color:rgba(20,184,166,0.9);margin-bottom:10px;"><i data-lucide="send" style="width:16px;height:16px;"></i> Supplier Pricing</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <button class="export-pkg-btn" id="supplier-export-excel" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:10px;border:1px solid rgba(20,184,166,0.3);background:linear-gradient(135deg,rgba(20,184,166,0.08),rgba(6,182,212,0.04));color:var(--text-primary);cursor:pointer;text-align:left;transition:all 0.15s;width:100%;">
            <span style="font-size:20px;"><i data-lucide="table" style="width:22px;height:22px;color:#14B8A6;"></i></span>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:13px;">Send to Supplier (Excel)</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Pre-filled BOM with blank pricing column</div>
            </div>
          </button>
          <button class="export-pkg-btn" id="supplier-export-csv" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:10px;border:1px solid rgba(20,184,166,0.3);background:linear-gradient(135deg,rgba(20,184,166,0.08),rgba(6,182,212,0.04));color:var(--text-primary);cursor:pointer;text-align:left;transition:all 0.15s;width:100%;">
            <span style="font-size:20px;"><i data-lucide="file-spreadsheet" style="width:22px;height:22px;color:#14B8A6;"></i></span>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:13px;">Send to Supplier (CSV)</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">CSV format for email or portal upload</div>
            </div>
          </button>
        </div>
        <div style="margin-top:12px;">
          <div id="supplier-import-zone" class="upload-zone" style="border:2px dashed rgba(20,184,166,0.25);border-radius:10px;padding:18px;text-align:center;cursor:pointer;transition:all 0.2s;background:rgba(20,184,166,0.02);">
            <input type="file" accept=".xlsx,.csv,.pdf" id="supplier-file-input" style="display:none;">
            <div style="font-size:20px;margin-bottom:4px;"><i data-lucide="download" style="width:22px;height:22px;color:#14B8A6;"></i></div>
            <div style="font-size:12px;font-weight:600;color:var(--text-primary);">Import Supplier Pricing</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Drop completed pricing file here or click to browse · XLSX or CSV</div>
          </div>
        </div>
        <div id="supplier-quotes-container"></div>
      </div>

      <!-- Rate Library Section -->
      <div style="margin-top:18px;padding-top:14px;border-top:1px solid rgba(13,148,136,0.15);">
        <div style="font-weight:700;font-size:13px;color:rgba(13,148,136,0.9);margin-bottom:10px;letter-spacing:0.03em;text-transform:uppercase;">
          <i data-lucide="library" style="width:16px;height:16px;"></i> Rate Library
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <button class="export-pkg-btn" id="rate-library-open" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:0;border:1px solid rgba(13,148,136,0.3);background:linear-gradient(135deg,rgba(13,148,136,0.08),rgba(13,148,136,0.03));color:var(--text-primary);cursor:pointer;text-align:left;transition:all 0.15s;width:100%;">
            <span style="font-size:20px;">📚</span>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:13px;">Rate Library</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Browse &amp; manage your saved material rates</div>
            </div>
          </button>
          <button class="export-pkg-btn" id="rate-library-apply" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:0;border:1px solid rgba(13,148,136,0.3);background:linear-gradient(135deg,rgba(13,148,136,0.08),rgba(13,148,136,0.03));color:var(--text-primary);cursor:pointer;text-align:left;transition:all 0.15s;width:100%;">
            <span style="font-size:20px;">⚡</span>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:13px;">Apply to Estimate</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Override BOM pricing with your saved rates</div>
            </div>
          </button>
        </div>
        ${state.aiAnalysis ? `
        <div style="margin-top:10px;">
          <button class="export-pkg-btn" id="rate-library-save-from-estimate" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:0;border:1px dashed rgba(13,148,136,0.3);background:rgba(13,148,136,0.02);color:var(--text-primary);cursor:pointer;text-align:left;transition:all 0.15s;width:100%;">
            <span style="font-size:20px;">💾</span>
            <div style="flex:1;">
              <div style="font-weight:700;font-size:13px;">Save Rates from This Estimate</div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Bulk-save all BOM items to your rate library for future bids</div>
            </div>
          </button>
        </div>` : ''}
      </div>`;

  // ── Editable BOM Table ──
  let bomTableHtml = '';
  if (state.aiAnalysis) {
    const _bomData = getFilteredBOM(state.aiAnalysis, state.disciplines);
    const _bomOverrides = state.supplierPriceOverrides || {};
    const _overrideCount = Object.keys(_bomOverrides).length;
    // Apply overrides to a working copy
    let _bomOriginalGrand = _bomData.grandTotal;
    applyBOMOverrides(_bomData, _bomOverrides);
    const _fmtDollar = (v) => '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const _delta = _bomData.grandTotal - _bomOriginalGrand;
    const _deltaStr = _delta >= 0 ? '+' + _fmtDollar(_delta) : '-' + _fmtDollar(Math.abs(_delta));

    let _bomRowNum = 0;
    let _bomRows = '';
    _bomData.categories.forEach((cat, ci) => {
      _bomRows += `<tr style="background:rgba(13,148,136,0.08);">
        <td colspan="9" style="padding:10px 12px;font-weight:700;font-size:13px;color:rgba(20,184,166,0.95);border-bottom:1px solid rgba(20,184,166,0.12);">${esc(cat.name)}</td>
      </tr>`;
      cat.items.forEach((item, ii) => {
        _bomRowNum++;
        const _key = ci + '-' + ii;
        const _isEdited = !!_bomOverrides[_key];
        const _editBg = _isEdited ? 'background:rgba(13,148,136,0.10);' : '';
        _bomRows += `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);${_editBg}" data-bom-cat="${ci}" data-bom-item="${ii}">
          <td style="padding:6px 10px;font-size:12px;color:var(--text-muted);text-align:center;">${_bomRowNum}</td>
          <td style="padding:6px 10px;font-size:12px;color:var(--text-primary);max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(item.name)}">${esc(item.name)}</td>
          <td style="padding:6px 10px;font-size:11px;color:var(--text-muted);">${esc(item.mfg || '-')}</td>
          <td style="padding:6px 10px;font-size:11px;color:var(--text-muted);">${esc(item.partNumber || '-')}</td>
          <td style="padding:6px 8px;text-align:center;">
            <input type="number" class="bom-edit-input bom-edit-qty" data-key="${_key}" value="${item.qty}" min="0" step="1"
              style="width:60px;padding:3px 6px;border-radius:5px;border:1px solid rgba(20,184,166,0.25);background:rgba(20,184,166,0.04);color:var(--text-primary);font-size:12px;text-align:center;outline:none;${_isEdited ? 'border-color:rgba(13,148,136,0.5);background:rgba(13,148,136,0.12);' : ''}" />
          </td>
          <td style="padding:6px 10px;font-size:11px;color:var(--text-muted);text-align:center;">${esc(item.unit || 'EA')}</td>
          <td style="padding:6px 8px;text-align:right;">
            <input type="number" class="bom-edit-input bom-edit-cost" data-key="${_key}" value="${Number(item.unitCost || 0).toFixed(2)}" min="0" step="0.01"
              style="width:80px;padding:3px 6px;border-radius:5px;border:1px solid rgba(20,184,166,0.25);background:rgba(20,184,166,0.04);color:var(--text-primary);font-size:12px;text-align:right;outline:none;${_isEdited ? 'border-color:rgba(13,148,136,0.5);background:rgba(13,148,136,0.12);' : ''}" />
          </td>
          <td style="padding:6px 10px;font-size:12px;color:var(--text-primary);text-align:right;font-weight:600;" class="bom-ext-cost" data-key="${_key}">${_fmtDollar(item.extCost)}</td>
          <td style="padding:4px 6px;text-align:center;">
            <button class="bom-delete-btn" data-key="${_key}" data-manual-id="${item._manualId || ''}" title="Remove item" style="background:none;border:1px solid rgba(239,68,68,0.2);color:#ef4444;cursor:pointer;font-size:11px;padding:2px 6px;border-radius:4px;line-height:1;opacity:0.6;transition:opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">✕</button>
          </td>
        </tr>`;
      });
      // Add Item button for this category
      _bomRows += `<tr class="bom-add-item-row" data-cat="${ci}">
        <td colspan="9" style="padding:4px 12px;">
          <button class="bom-add-item-btn" data-cat="${ci}" style="background:none;border:1px dashed rgba(20,184,166,0.3);color:rgba(20,184,166,0.7);cursor:pointer;font-size:11px;padding:4px 12px;border-radius:4px;font-weight:600;transition:all 0.2s;width:100%;" onmouseover="this.style.borderColor='rgba(20,184,166,0.6)';this.style.color='rgba(20,184,166,1)'" onmouseout="this.style.borderColor='rgba(20,184,166,0.3)';this.style.color='rgba(20,184,166,0.7)'">+ Add Item to ${esc(cat.name)}</button>
        </td>
      </tr>`;
      _bomRows += `<tr style="background:rgba(13,148,136,0.04);border-bottom:2px solid rgba(20,184,166,0.12);">
        <td colspan="8" style="padding:6px 12px;font-size:12px;font-weight:700;color:var(--text-muted);text-align:right;">Subtotal — ${esc(cat.name)}</td>
        <td style="padding:6px 10px;font-size:13px;font-weight:700;color:rgba(20,184,166,0.9);text-align:right;" class="bom-subtotal" data-cat="${ci}">${_fmtDollar(cat.subtotal)}</td>
      </tr>`;
    });

    const _manualCount = (state.manualBomItems || []).length;
    const _deletedCount = Object.keys(state.deletedBomItems || {}).length;
    const _totalEdits = _overrideCount + _manualCount + _deletedCount;
    const _editParts = [];
    if (_overrideCount > 0) _editParts.push(`${_overrideCount} edited`);
    if (_manualCount > 0) _editParts.push(`${_manualCount} added`);
    if (_deletedCount > 0) _editParts.push(`${_deletedCount} removed`);
    const _summaryBar = _totalEdits > 0
      ? `<div id="bom-summary-bar" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(13,148,136,0.06);border:1px solid rgba(13,148,136,0.18);border-radius:8px;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
          <span style="font-size:12px;color:var(--text-muted);">${_editParts.join(' · ')} &middot; Original: ${_fmtDollar(_bomOriginalGrand)} &rarr; Current: ${_fmtDollar(_bomData.grandTotal)} (${_deltaStr})</span>
          <button id="bom-reset-overrides" style="padding:5px 12px;border-radius:6px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.06);color:#ef4444;font-size:11px;font-weight:600;cursor:pointer;">Reset to AI Prices</button>
        </div>`
      : `<div id="bom-summary-bar" style="display:none;"></div>`;

    bomTableHtml = `
    <div style="border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;"></div>
    <div class="info-card" style="margin-bottom:22px;border:1px solid rgba(20,184,166,0.15);background:rgba(20,184,166,0.02);">
      <div style="display:flex;align-items:center;justify-content:space-between;padding-left:8px;cursor:pointer;" id="bom-table-toggle">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="info-card-title" style="margin-bottom:0;">📋 Bill of Materials</div>
          <span style="font-size:10px;font-weight:700;color:#0D9488;background:rgba(13,148,136,0.1);padding:3px 8px;border-radius:4px;letter-spacing:0.5px;">CLICK QTY OR PRICE TO EDIT</span>
        </div>
        <span id="bom-toggle-icon" style="font-size:14px;color:var(--text-muted);transition:transform 0.2s;padding:8px;">▼</span>
      </div>
      <div id="bom-table-collapsible" style="display:block;margin-top:12px;">
        ${_summaryBar}
        <div style="padding:8px 12px;margin-bottom:8px;background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.15);border-radius:8px;font-size:11px;color:var(--text-muted);line-height:1.5;">
          <strong style="color:var(--text-primary);">How to edit:</strong> Click any <span style="color:#0D9488;font-weight:600;">Qty</span> or <span style="color:#0D9488;font-weight:600;">Unit Cost</span> field to type a new value — the extended cost, subtotals, and grand total update instantly. Use <span style="color:#ef4444;font-weight:600;">✕</span> to remove items, or <span style="color:#0D9488;font-weight:600;">+ Add Item</span> below each category to add new ones. All changes carry through to the proposal and exports.
        </div>
        <div style="overflow-x:auto;border-radius:8px;border:1px solid rgba(20,184,166,0.12);">
          <table style="width:100%;border-collapse:collapse;font-size:12px;" id="bom-editable-table">
            <thead>
              <tr style="background:rgba(13,148,136,0.12);">
                <th style="padding:8px 10px;text-align:center;font-size:11px;color:rgba(20,184,166,0.8);font-weight:700;border-bottom:2px solid rgba(20,184,166,0.2);width:40px;">#</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;color:rgba(20,184,166,0.8);font-weight:700;border-bottom:2px solid rgba(20,184,166,0.2);">Item</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;color:rgba(20,184,166,0.8);font-weight:700;border-bottom:2px solid rgba(20,184,166,0.2);">MFG</th>
                <th style="padding:8px 10px;text-align:left;font-size:11px;color:rgba(20,184,166,0.8);font-weight:700;border-bottom:2px solid rgba(20,184,166,0.2);">Part#</th>
                <th style="padding:8px 10px;text-align:center;font-size:11px;color:rgba(20,184,166,0.8);font-weight:700;border-bottom:2px solid rgba(20,184,166,0.2);">Qty</th>
                <th style="padding:8px 10px;text-align:center;font-size:11px;color:rgba(20,184,166,0.8);font-weight:700;border-bottom:2px solid rgba(20,184,166,0.2);">Unit</th>
                <th style="padding:8px 10px;text-align:right;font-size:11px;color:rgba(20,184,166,0.8);font-weight:700;border-bottom:2px solid rgba(20,184,166,0.2);">Unit Cost</th>
                <th style="padding:8px 10px;text-align:right;font-size:11px;color:rgba(20,184,166,0.8);font-weight:700;border-bottom:2px solid rgba(20,184,166,0.2);">Ext Cost</th>
                <th style="padding:8px 10px;text-align:center;font-size:11px;color:rgba(20,184,166,0.8);font-weight:700;border-bottom:2px solid rgba(20,184,166,0.2);width:36px;"></th>
              </tr>
            </thead>
            <tbody>
              ${_bomRows}
              <tr style="background:rgba(13,148,136,0.15);">
                <td colspan="8" style="padding:10px 12px;font-size:14px;font-weight:700;color:var(--text-primary);text-align:right;">Grand Total</td>
                <td style="padding:10px 12px;font-size:14px;font-weight:700;color:#0D9488;text-align:right;" id="bom-grand-total">${_fmtDollar(_bomData.grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  // ── Regenerate Proposal button (conditional) ──
  const _hasOverrides = Object.keys(state.supplierPriceOverrides || {}).length > 0 || (state.manualBomItems || []).length > 0 || Object.keys(state.deletedBomItems || {}).length > 0;
  const regenButton = _hasOverrides ? `
      <button class="proposal-gen-btn" id="btn-regen-proposal" style="margin-top:10px;background:linear-gradient(135deg,rgba(16,185,129,0.15),rgba(13,148,136,0.06));border:2px solid rgba(16,185,129,0.45);">
        <div class="proposal-gen-btn__shine" style="background:linear-gradient(90deg,transparent,rgba(16,185,129,0.15),transparent);"></div>
        <div class="proposal-gen-btn__content">
          <span class="proposal-gen-btn__icon">🔄</span>
          <div>
            <div class="proposal-gen-btn__title" style="color:#10b981;">Regenerate Proposal with Updated Pricing</div>
            <div class="proposal-gen-btn__sub">Uses your manually edited quantities and supplier pricing</div>
          </div>
          <span class="proposal-gen-btn__arrow" style="color:#10b981;">→</span>
        </div>
      </button>` : '';

  const exportPanel = `
    <div style="border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;"></div>
    <div class="info-card info-card--indigo" style="margin-bottom:22px;">
      <div class="info-card-title"><i data-lucide="package" style="width:18px;height:18px;"></i> Export & Proposal</div>
      ${exportButtons}

      <button class="proposal-gen-btn" id="btn-generate-proposal">
        <div class="proposal-gen-btn__shine"></div>
        <div class="proposal-gen-btn__content">
          <span class="proposal-gen-btn__icon"><i data-lucide="file-check" style="width:24px;height:24px;"></i></span>
          <div>
            <div class="proposal-gen-btn__title">Generate Full Proposal (10+ pages)</div>
            <div class="proposal-gen-btn__sub">Complete Fortune 500-grade proposal with detailed scope, pricing tables, and qualifications</div>
          </div>
          <span class="proposal-gen-btn__arrow">→</span>
        </div>
      </button>
      <button id="btn-pdf-proposal" style="display:none;margin-top:6px;padding:10px 16px;border-radius:8px;border:1px solid rgba(16,185,129,0.4);background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(16,185,129,0.04));color:#10b981;cursor:pointer;font-size:13px;font-weight:700;width:100%;text-align:center;">📄 Save Full Proposal as PDF</button>

      <button class="proposal-gen-btn" id="btn-generate-exec-proposal" style="margin-top:10px;background:linear-gradient(135deg,rgba(191,144,0,0.12),rgba(235,179,40,0.04));border:2px solid rgba(191,144,0,0.4);">
        <div class="proposal-gen-btn__shine" style="background:linear-gradient(90deg,transparent,rgba(235,179,40,0.15),transparent);"></div>
        <div class="proposal-gen-btn__content">
          <span class="proposal-gen-btn__icon"><i data-lucide="sparkles" style="width:24px;height:24px;color:#BF9000;"></i></span>
          <div>
            <div class="proposal-gen-btn__title" style="color:#BF9000;">Generate Executive Proposal (3 pages)</div>
            <div class="proposal-gen-btn__sub">High-impact executive summary — visually stunning, concise, designed to impress decision-makers</div>
          </div>
          <span class="proposal-gen-btn__arrow" style="color:#BF9000;">→</span>
        </div>
      </button>
      <button id="btn-pdf-exec-proposal" style="display:none;margin-top:6px;padding:10px 16px;border-radius:8px;border:1px solid rgba(191,144,0,0.4);background:linear-gradient(135deg,rgba(191,144,0,0.12),rgba(191,144,0,0.04));color:#BF9000;cursor:pointer;font-size:13px;font-weight:700;width:100%;text-align:center;">📄 Save Executive Proposal as PDF</button>

      ${regenButton}

      <a href="https://smartpm.pages.dev/" target="_blank" rel="noopener" id="btn-open-smartpm" style="display:flex;align-items:center;gap:14px;padding:16px 20px;margin-top:14px;border-radius:12px;border:2px solid rgba(13,148,136,0.4);background:linear-gradient(135deg,rgba(13,148,136,0.08),rgba(13,148,136,0.02));color:var(--text-primary);text-decoration:none;cursor:pointer;transition:all 0.2s;">
        <span style="font-size:28px;"><i data-lucide="building-2" style="width:26px;height:26px;color:#0D9488;"></i></span>
        <div style="flex:1;">
          <div style="font-weight:700;font-size:14px;color:#0D9488;">Open SmartPM — Project Manager</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Import this estimate into SmartPM to track installation progress, labor hours, and material usage across your project.</div>
        </div>
        <span style="font-size:18px;color:#0D9488;">→</span>
      </a>
    </div>
  `;

  container.innerHTML = `
    <h2 class="step-heading">Estimate Complete</h2>
    <p class="step-subheading">Your AI-powered estimate is ready. Review the analysis below, then export for your project management workflow.</p>

    <div class="results-hero">
      <div class="results-top">
        <div class="results-ring" style="background:conic-gradient(${tl.color} ${accuracy * 3.6}deg, rgba(255,255,255,0.05) 0deg);box-shadow:0 0 20px ${tl.glow};">
          <div class="results-ring-inner">
            <span class="results-ring-pct" style="color:${tl.color};">${accuracy}%</span>
          </div>
        </div>
        <div>
          <div class="results-confidence-label" style="color:${tl.color};">Confidence Level: ${confLabel}</div>
          <div class="results-confidence-desc">${confDesc}</div>
          <div class="results-traffic-lights" style="margin-top:10px;display:flex;gap:8px;">
            <div class="traffic-dot" style="background:${accuracy >= 85 ? '#10b981' : 'rgba(255,255,255,0.1)'};box-shadow:${accuracy >= 85 ? '0 0 12px rgba(16,185,129,0.6)' : 'none'};"></div>
            <div class="traffic-dot" style="background:${accuracy >= 70 && accuracy < 85 ? '#f59e0b' : 'rgba(255,255,255,0.1)'};box-shadow:${accuracy >= 70 && accuracy < 85 ? '0 0 12px rgba(245,158,11,0.6)' : 'none'};"></div>
            <div class="traffic-dot" style="background:${accuracy < 70 ? '#ef4444' : 'rgba(255,255,255,0.1)'};box-shadow:${accuracy < 70 ? '0 0 12px rgba(239,68,68,0.6)' : 'none'};"></div>
          </div>
        </div>
      </div>
      <div class="results-stats">
        <div class="results-stat">
          <div class="results-stat-icon"><i data-lucide="ruler" style="width:22px;height:22px;color:#14B8A6;"></i></div>
          <div class="results-stat-value">${state.planFiles.length}</div>
          <div class="results-stat-label">Sheets Analyzed</div>
        </div>
        <div class="results-stat">
          <div class="results-stat-icon"><i data-lucide="file-text" style="width:22px;height:22px;color:#14B8A6;"></i></div>
          <div class="results-stat-value">${state.specFiles.length}</div>
          <div class="results-stat-label">Spec Sections</div>
        </div>
        <div class="results-stat">
          <div class="results-stat-icon"><i data-lucide="alert-triangle" style="width:22px;height:22px;color:#FBBF24;"></i></div>
          <div class="results-stat-value">${rfis.length}</div>
          <div class="results-stat-label">RFIs Recommended</div>
        </div>
      </div>
    </div>

    ${failedBrainsBanner}
    ${aiSection}

    ${bomTableHtml}

    <div style="border-top:1px solid rgba(0,0,0,0.06);margin:24px 0;"></div>
    <div class="info-card info-card--sky" id="exclusions-card" style="margin-bottom:22px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-left:8px;">
        <div class="info-card-title" style="margin-bottom:0;"><i data-lucide="shield-alert" style="width:16px;height:16px;"></i> EXCLUSIONS &amp; ASSUMPTIONS</div>
        <div style="display:flex;gap:6px;">
          <button id="excl-auto-generate" style="display:flex;align-items:center;gap:4px;padding:6px 12px;border-radius:0;border:1px solid rgba(13,148,136,0.3);background:rgba(13,148,136,0.06);color:var(--accent-teal);cursor:pointer;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
            <i data-lucide="sparkles" style="width:12px;height:12px;"></i> Auto-Generate
          </button>
          <button id="excl-load-defaults" style="display:flex;align-items:center;gap:4px;padding:6px 12px;border-radius:0;border:1px solid rgba(0,0,0,0.1);background:rgba(0,0,0,0.02);color:var(--text-secondary);cursor:pointer;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
            <i data-lucide="list-plus" style="width:12px;height:12px;"></i> Load Defaults
          </button>
        </div>
      </div>
      <div class="info-card-body" style="padding-left:8px;margin-bottom:14px;font-size:12px;color:var(--text-muted);">
        Document what is NOT included in your bid and what assumptions you are making. These lists go into proposals for legal protection.
      </div>
      <div class="excl-tabs" style="display:flex;gap:0;margin-bottom:16px;border-bottom:2px solid rgba(0,0,0,0.06);">
        <button class="excl-tab excl-tab--active" data-excl-tab="exclusion" style="padding:8px 18px;border:none;background:none;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;cursor:pointer;color:var(--accent-teal);border-bottom:2px solid var(--accent-teal);margin-bottom:-2px;">Exclusions</button>
        <button class="excl-tab" data-excl-tab="assumption" style="padding:8px 18px;border:none;background:none;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;cursor:pointer;color:var(--text-muted);border-bottom:2px solid transparent;margin-bottom:-2px;">Assumptions</button>
        <button class="excl-tab" data-excl-tab="clarification" style="padding:8px 18px;border:none;background:none;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;cursor:pointer;color:var(--text-muted);border-bottom:2px solid transparent;margin-bottom:-2px;">Clarifications</button>
      </div>
      <div id="excl-list" style="min-height:40px;"></div>
      <div id="excl-add-form" style="display:flex;gap:8px;margin-top:12px;align-items:flex-start;">
        <input type="text" id="excl-add-text" placeholder="Add new item..." style="flex:1;padding:8px 12px;border:1px solid rgba(0,0,0,0.1);border-radius:0;font-size:13px;font-family:var(--font-sans);color:var(--text-primary);background:#FAFBFC;">
        <select id="excl-add-category" style="padding:8px 10px;border:1px solid rgba(0,0,0,0.1);border-radius:0;font-size:12px;font-family:var(--font-sans);color:var(--text-secondary);background:#FAFBFC;min-width:140px;">
          <option value="General">General</option>
          ${state.disciplines.map(d => '<option value="' + esc(d) + '">' + esc(d) + '</option>').join('')}
        </select>
        <button id="excl-add-btn" style="padding:8px 16px;border:1px solid rgba(13,148,136,0.3);border-radius:0;background:rgba(13,148,136,0.08);color:var(--accent-teal);font-size:12px;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:1px;white-space:nowrap;">+ ADD</button>
      </div>
    </div>

    ${buildBidStrategyCard(state)}

    ${buildCablePathwayCard(state)}

    ${buildBidPhasesCard(state)}

    ${buildChangeOrderCard(state)}

    ${buildSymbolInventoryCard(state)}

    <div class="info-card" id="bid-compare-card" style="border-left:3px solid #0D9488;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;cursor:pointer;" id="bid-compare-toggle">
        <h3 class="info-card-title" style="margin:0;">
          <i data-lucide="git-compare" style="width:16px;height:16px;"></i> COMPETITOR BID COMPARISON
        </h3>
        <span style="font-size:11px;color:rgba(0,0,0,0.4);text-transform:uppercase;letter-spacing:1px;">&#9660; EXPAND</span>
      </div>
      <div id="bid-compare-body" style="display:none;">
        <p style="color:rgba(0,0,0,0.5);font-size:12.5px;margin-bottom:16px;">Upload a competitor's bid to compare line items, pricing, and identify where to sharpen your numbers.</p>
        <div style="display:flex;gap:12px;align-items:end;margin-bottom:16px;">
          <div style="flex:1;">
            <label style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:rgba(0,0,0,0.5);font-weight:600;">Competitor Name</label>
            <input type="text" id="competitor-name" placeholder="e.g., ABC Electric" style="width:100%;margin-top:4px;padding:8px 12px;border:1px solid rgba(0,0,0,0.12);font-size:13px;">
          </div>
          <div>
            <label for="competitor-file" style="display:inline-block;padding:8px 20px;background:#0D9488;color:white;cursor:pointer;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
              <i data-lucide="upload" style="width:12px;height:12px;"></i> UPLOAD BID
            </label>
            <input type="file" id="competitor-file" accept=".xlsx,.csv" style="display:none;">
          </div>
        </div>
        <div id="bid-compare-results"></div>
      </div>
    </div>

    ${exportPanel}

    ${state.estimateId ? `
    <div style="border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;"></div>
    <div class="info-card" style="margin-bottom:22px;border:1px solid rgba(129,140,248,0.15);background:rgba(129,140,248,0.03);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding-left:8px;">
        <div class="info-card-title" style="margin-bottom:0;color:var(--accent-indigo);">🕐 Version History</div>
        <button id="btn-load-revisions" style="display:flex;align-items:center;gap:4px;padding:7px 12px;border-radius:8px;border:1px solid rgba(129,140,248,0.35);background:rgba(129,140,248,0.06);color:var(--accent-indigo);cursor:pointer;font-size:12px;font-weight:600;">
          View Revisions
        </button>
      </div>
      <div class="info-card-body" style="font-size:13px;color:var(--text-muted);line-height:1.6;">
        Previous versions are automatically saved when you re-run an analysis. Click "View Revisions" to compare or restore.
      </div>
      <div id="revision-inline-list" style="margin-top:12px;"></div>
    </div>
    ` : ''}

    <div class="info-card info-card--sky">
      <div class="info-card-title">What to Do Next</div>
      <div class="info-card-body" style="line-height:1.9">
        <strong>1.</strong> Review the AI analysis above and verify symbol counts against your drawings.<br>
        <strong>2.</strong> Export your estimate package (JSON for PM app, Excel for spreadsheet review).<br>
        <strong>3.</strong> Submit the selected RFIs below to the architect/engineer to resolve gaps.<br>
        <strong>4.</strong> Import the JSON file into your Project Management app for tracking, billing, and change orders.
      </div>
    </div>

    <div class="rfi-header">
      <h3 class="rfi-title">Recommended RFIs</h3>
      <div class="rfi-actions">
        <button class="rfi-action-btn rfi-action-btn--select" id="rfi-select-all">Select All</button>
        <button class="rfi-action-btn rfi-action-btn--clear" id="rfi-clear-all">Clear All</button>
      </div>
    </div>
    <p class="rfi-desc">Based on your selected disciplines (${esc(state.disciplines.join(", "))}), these are the most common gaps that AI analysis cannot resolve from drawings alone. Select the ones relevant to your project, then export.</p>

    <div id="rfi-list">${rfiListHtml}</div>

    ${state.selectedRFIs.size > 0 ? `
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="export-btn" id="export-rfis" style="flex:1;">
          📥 Export ${state.selectedRFIs.size} Selected RFI${state.selectedRFIs.size !== 1 ? "s" : ""} to Word
        </button>
        <button class="export-btn" id="export-rfis-pdf" style="flex:0 0 auto;padding:10px 18px;background:linear-gradient(135deg,rgba(16,185,129,0.12),rgba(16,185,129,0.04));border:1px solid rgba(16,185,129,0.4);color:#10b981;">
          📄 PDF
        </button>
      </div>
    ` : ""}
  `;

  // Bind RFI events
  document.getElementById("rfi-select-all").addEventListener("click", () => {
    rfis.forEach(r => state.selectedRFIs.add(r.id));
    renderStep7(container);
  });

  document.getElementById("rfi-clear-all").addEventListener("click", () => {
    state.selectedRFIs.clear();
    renderStep7(container);
  });

  document.querySelectorAll("[data-rfi-check]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = btn.dataset.rfiCheck;
      if (state.selectedRFIs.has(id)) state.selectedRFIs.delete(id);
      else state.selectedRFIs.add(id);
      renderStep7(container);
    });
  });

  document.querySelectorAll("[data-rfi-toggle]").forEach(row => {
    row.addEventListener("click", e => {
      if (e.target.closest("[data-rfi-check]")) return;
      const id = row.dataset.rfiToggle;
      state.expandedRFI = state.expandedRFI === id ? null : id;
      renderStep7(container);
    });
  });

  const exportBtn = document.getElementById("export-rfis");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportRFIs);
  }

  // Master Report button
  const masterBtn = document.getElementById("btn-master-report");
  if (masterBtn) masterBtn.addEventListener("click", () => {
    try { generateMasterReport(); } catch (err) { console.error('[MasterReport]', err); if (typeof spToast === 'function') spToast('Error generating report. Please try again.', 'error'); }
  });

  // Export package buttons
  const jsonBtn = document.getElementById("export-json");
  if (jsonBtn) jsonBtn.addEventListener("click", () => SmartPlansExport.exportJSON(state));

  const excelBtn = document.getElementById("export-excel");
  if (excelBtn) excelBtn.addEventListener("click", () => SmartPlansExport.exportExcel(state));

  const mdBtn = document.getElementById("export-markdown");
  if (mdBtn) mdBtn.addEventListener("click", () => SmartPlansExport.exportMarkdown(state));

  const allBtn = document.getElementById("export-all");
  if (allBtn) allBtn.addEventListener("click", () => SmartPlansExport.exportAll(state));

  const bomBtn = document.getElementById("export-bom");
  if (bomBtn) bomBtn.addEventListener("click", () => SmartPlansExport.exportBOM(state));

  // ── Supplier Pricing Handlers ──
  const supplierExcelBtn = document.getElementById("supplier-export-excel");
  const supplierCsvBtn = document.getElementById("supplier-export-csv");

  async function handleSupplierExport(format) {
    const supplierName = prompt("Enter supplier name:");
    if (!supplierName || !supplierName.trim()) return;
    try {
      const result = SmartPlansExport.exportSupplierBOM(state, supplierName.trim(), format);
      // Record the quote in the database
      if (state.estimateId) {
        await fetch(`/api/estimates/${state.estimateId}/supplier-quotes`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-App-Token": _appToken },
          body: JSON.stringify({
            supplier_name: supplierName.trim(),
            item_count: result.itemCount || 0,
            original_total: result.grandTotal || 0,
          }),
        });
        await loadSupplierQuotes();
      }
      spToast(`BOM sent to ${esc(supplierName.trim())} (${format.toUpperCase()})`, "success");
    } catch (err) {
      console.error('[SmartPlans]', err);
      spToast("Failed to export supplier BOM. Please try again.", "error");
    }
  }

  if (supplierExcelBtn) supplierExcelBtn.addEventListener("click", () => handleSupplierExport("xlsx"));
  if (supplierCsvBtn) supplierCsvBtn.addEventListener("click", () => handleSupplierExport("csv"));

  // Supplier import drag-drop
  const supplierZone = document.getElementById("supplier-import-zone");
  const supplierInput = document.getElementById("supplier-file-input");
  if (supplierZone && supplierInput) {
    supplierZone.addEventListener("click", () => supplierInput.click());
    supplierZone.addEventListener("dragover", (e) => { e.preventDefault(); supplierZone.style.borderColor = "rgba(20,184,166,0.6)"; supplierZone.style.background = "rgba(20,184,166,0.06)"; });
    supplierZone.addEventListener("dragleave", () => { supplierZone.style.borderColor = "rgba(20,184,166,0.25)"; supplierZone.style.background = "rgba(20,184,166,0.02)"; });
    supplierZone.addEventListener("drop", (e) => {
      e.preventDefault();
      supplierZone.style.borderColor = "rgba(20,184,166,0.25)";
      supplierZone.style.background = "rgba(20,184,166,0.02)";
      if (e.dataTransfer.files.length) handleSupplierImport(e.dataTransfer.files[0]);
    });
    supplierInput.addEventListener("change", (e) => {
      if (e.target.files.length) handleSupplierImport(e.target.files[0]);
      supplierInput.value = "";
    });
  }

  async function handleSupplierImport(file) {
    try {
      const ext = (file.name || '').split('.').pop().toLowerCase();
      const isPDF = ext === 'pdf';

      if (isPDF) {
        spToast('Reading supplier PDF with AI... this may take 30-60 seconds', 'info');
      }

      const result = isPDF
        ? await SmartPlansExport.importSupplierPDF(file, state)
        : await SmartPlansExport.importSupplierPricing(file, state);
      // Show confirmation before applying
      const delta = result.delta >= 0 ? `+$${result.delta.toLocaleString()}` : `-$${Math.abs(result.delta).toLocaleString()}`;
      const pct = result.deltaPercent >= 0 ? `+${result.deltaPercent.toFixed(1)}%` : `${result.deltaPercent.toFixed(1)}%`;
      let matchInfo = '';
      if (result.matchDetails && result.matchDetails.length > 0) {
        const top5 = result.matchDetails.slice(0, 5);
        matchInfo = '\n\nTop matches:\n' + top5.map(m =>
          `  ${m.ourItem.substring(0, 35)} → $${m.oldCost} → $${m.newCost} (${m.confidence})`
        ).join('\n');
        if (result.matchDetails.length > 5) matchInfo += `\n  ... and ${result.matchDetails.length - 5} more`;
      }
      const confirmed = confirm(
        `Supplier Pricing Import Summary\n\n` +
        `Supplier: ${result.supplierName || 'Unknown'}\n` +
        `Items Updated: ${result.itemsUpdated} of ${result.itemsTotal}\n` +
        (result.itemsSkipped ? `Items Skipped: ${result.itemsSkipped}\n` : '') +
        `\nOld Total: $${result.oldTotal.toLocaleString()}\n` +
        `New Total: $${result.newTotal.toLocaleString()}\n` +
        `Change: ${delta} (${pct})` +
        matchInfo +
        `\n\nApply supplier pricing?`
      );
      if (!confirmed) return;

      // Apply overrides to state
      state.supplierPriceOverrides = result.overrides;

      // Update the matching supplier quote record
      if (state.estimateId) {
        // Find the most recent 'sent' quote to update
        const quotes = state.supplierQuotes || [];
        const sentQuote = quotes.find(q => q.status === "sent");
        if (sentQuote) {
          await fetch(`/api/estimates/${state.estimateId}/supplier-quotes/${sentQuote.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-App-Token": _appToken },
            body: JSON.stringify({
              received_at: new Date().toISOString(),
              quoted_total: result.newTotal,
              items_quoted: result.itemsUpdated,
              status: "applied",
            }),
          });
        }
      }

      // Save the estimate (triggers revision)
      await saveEstimate(true);
      await loadSupplierQuotes();
      render();
      spToast(`Supplier pricing applied — ${result.itemsUpdated} items updated, total changed by ${delta}`, "success");
    } catch (err) {
      console.error('[SmartPlans]', err);
      spToast("Failed to import supplier pricing. Please try again.", "error");
    }
  }

  // Load and render supplier quotes
  async function loadSupplierQuotes() {
    if (!state.estimateId) return;
    try {
      const resp = await fetch(`/api/estimates/${state.estimateId}/supplier-quotes`, {
        headers: { "X-App-Token": _appToken },
      });
      if (resp.ok) {
        const data = await resp.json();
        state.supplierQuotes = data.quotes || [];
        renderSupplierQuotes();
      }
    } catch (err) {
      console.warn("[SupplierQuotes] Failed to load:", err);
    }
  }

  function renderSupplierQuotes() {
    const container = document.getElementById("supplier-quotes-container");
    if (!container) return;
    const quotes = state.supplierQuotes || [];
    if (quotes.length === 0) {
      container.innerHTML = "";
      return;
    }
    const statusColors = { sent: "#f59e0b", received: "#3b82f6", applied: "#10b981" };
    const rows = quotes.map(q => {
      const color = statusColors[q.status] || "#6b7280";
      const quotedStr = q.quoted_total != null ? `$${Number(q.quoted_total).toLocaleString()}` : "—";
      const sentDate = q.sent_at ? new Date(q.sent_at).toLocaleDateString() : "—";
      const recvDate = q.received_at ? new Date(q.received_at).toLocaleDateString() : "—";
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:12px;">
        <div style="flex:1;">
          <div style="font-weight:600;">${esc(q.supplier_name)}</div>
          <div style="color:var(--text-muted);margin-top:2px;">Sent: ${sentDate} · Received: ${recvDate}</div>
        </div>
        <div style="text-align:right;margin-right:10px;">
          <div>Original: $${Number(q.original_total).toLocaleString()}</div>
          <div>Quoted: ${quotedStr}</div>
        </div>
        <span class="supplier-status-badge" style="background:${color};color:white;padding:3px 8px;border-radius:10px;font-size:10px;font-weight:700;text-transform:uppercase;">${esc(q.status)}</span>
      </div>`;
    }).join("");
    container.innerHTML = `
      <div style="margin-top:14px;border:1px solid rgba(20,184,166,0.15);border-radius:10px;overflow:hidden;">
        <div style="padding:10px 14px;font-weight:700;font-size:12px;color:rgba(20,184,166,0.9);background:rgba(20,184,166,0.04);border-bottom:1px solid rgba(20,184,166,0.1);">
          <i data-lucide="bar-chart-3" style="width:16px;height:16px;"></i> Supplier Quotes (${quotes.length})
        </div>
        ${rows}
      </div>`;
  }

  // Load supplier quotes on step 6 render
  loadSupplierQuotes();

  // Inject benchmark indicators into BOM table if available
  _injectBenchmarksIntoBOM();

  // ── Exclusions & Assumptions ──
  initExclusionsPanel(container);
  bindBidStrategyEvents(container);
  bindCablePathwayEvents(container);
  bindBidPhasesEvents(container);
  bindChangeOrderEvents(container);
  bindSymbolInventoryEvents(container);

  // ── Bid Compare toggle ──
  const bcToggle = document.getElementById('bid-compare-toggle');
  if (bcToggle) bcToggle.addEventListener('click', () => {
    const body = document.getElementById('bid-compare-body');
    if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
  });

  // ── Bid Compare file upload ──
  const bcFile = document.getElementById('competitor-file');
  if (bcFile) bcFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const resultsDiv = document.getElementById('bid-compare-results');
    const nameInput = document.getElementById('competitor-name');
    resultsDiv.innerHTML = '<p style="color:#0D9488;font-size:12px;">Analyzing competitor bid...</p>';

    try {
      const competitorData = await SmartPlansExport.importCompetitorBid(file);
      if (nameInput && nameInput.value.trim()) competitorData.competitorName = nameInput.value.trim();
      else if (competitorData.competitorName && nameInput) nameInput.value = competitorData.competitorName;

      const comparison = SmartPlansExport.compareWithCompetitorBid(state, competitorData);
      resultsDiv.innerHTML = renderBidComparison(comparison, competitorData.competitorName || 'Competitor');

      // Bind clear button
      const clearBtn = document.getElementById('bid-compare-clear');
      if (clearBtn) clearBtn.addEventListener('click', () => {
        resultsDiv.innerHTML = '';
        if (bcFile) bcFile.value = '';
      });

      if (typeof lucide !== 'undefined') try { lucide.createIcons(); } catch(e) { console.warn('Silent error:', e); }
    } catch (err) {
      console.error('[SmartPlans] Bid comparison error:', err);
      resultsDiv.innerHTML = `<p style="color:#ef4444;font-size:12px;">Failed to parse bid data. Please check the format.</p>`;
    }
  });

  // Initialize Lucide icons after DOM update
  if (typeof lucide !== 'undefined') {
    try { lucide.createIcons(); } catch(e) { console.warn('Lucide createIcons failed:', e); }
  }

  // ── BOM Table: toggle, edit, reset handlers ──
  const bomToggle = document.getElementById('bom-table-toggle');
  if (bomToggle) {
    bomToggle.addEventListener('click', () => {
      const body = document.getElementById('bom-table-collapsible');
      const icon = document.getElementById('bom-toggle-icon');
      const isOpen = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : 'block';
      icon.textContent = isOpen ? '▶' : '▼';
    });
  }

  // BOM reset overrides
  const bomResetBtn = document.getElementById('bom-reset-overrides');
  if (bomResetBtn) {
    bomResetBtn.addEventListener('click', () => {
      state.supplierPriceOverrides = {};
      state.manualBomItems = [];
      state.deletedBomItems = {};
      renderStep7(container);
    });
  }

  // BOM editable inputs — debounced recalculation
  let _bomDebounce = null;
  const _fmtD = (v) => '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function _bomRecalc(key, qtyInput, costInput) {
    const qty = parseFloat(qtyInput.value) || 0;
    const unitCost = parseFloat(costInput.value) || 0;
    const extCost = Math.round(qty * unitCost * 100) / 100;

    // Update ext cost cell
    const extCell = document.querySelector(`.bom-ext-cost[data-key="${key}"]`);
    if (extCell) extCell.textContent = _fmtD(extCost);

    // Store override
    const [ci, ii] = key.split('-').map(Number);
    // Get original values to detect if this is a real edit
    const origBom = getFilteredBOM(state.aiAnalysis, state.disciplines);
    const origItem = origBom.categories[ci] && origBom.categories[ci].items[ii];
    const origQty = origItem ? origItem.qty : 0;
    const origCost = origItem ? origItem.unitCost : 0;

    if (qty !== origQty || unitCost !== origCost) {
      state.supplierPriceOverrides[key] = {
        unitCost: unitCost,
        qty: qty,
        supplierName: 'Manual Edit',
        appliedAt: new Date().toISOString()
      };
    } else {
      // Reverted to original — remove override
      delete state.supplierPriceOverrides[key];
    }

    // Highlight edited inputs
    const editBg = state.supplierPriceOverrides[key]
      ? 'border-color:rgba(13,148,136,0.5);background:rgba(13,148,136,0.12);'
      : 'border-color:rgba(20,184,166,0.25);background:rgba(20,184,166,0.04);';
    qtyInput.style.cssText = qtyInput.style.cssText.replace(/border-color:[^;]+;background:[^;]+;/, '') + editBg;
    costInput.style.cssText = costInput.style.cssText.replace(/border-color:[^;]+;background:[^;]+;/, '') + editBg;
    const row = qtyInput.closest('tr');
    if (row) row.style.background = state.supplierPriceOverrides[key] ? 'rgba(13,148,136,0.10)' : '';

    // Recalculate subtotals and grand total from DOM
    const table = document.getElementById('bom-editable-table');
    if (!table) return;
    const allQtyInputs = table.querySelectorAll('.bom-edit-qty');
    const allCostInputs = table.querySelectorAll('.bom-edit-cost');
    const catTotals = {};
    allQtyInputs.forEach((qI, idx) => {
      const k = qI.dataset.key;
      const cI = allCostInputs[idx];
      const q = parseFloat(qI.value) || 0;
      const c = parseFloat(cI.value) || 0;
      const catIdx = k.split('-')[0];
      if (!catTotals[catIdx]) catTotals[catIdx] = 0;
      catTotals[catIdx] += Math.round(q * c * 100) / 100;
    });
    let grandTotal = 0;
    for (const [catIdx, sub] of Object.entries(catTotals)) {
      const subCell = document.querySelector(`.bom-subtotal[data-cat="${catIdx}"]`);
      if (subCell) subCell.textContent = _fmtD(sub);
      grandTotal += sub;
    }
    grandTotal = Math.round(grandTotal * 100) / 100;
    const gtCell = document.getElementById('bom-grand-total');
    if (gtCell) gtCell.textContent = _fmtD(grandTotal);

    // Update summary bar
    const overrideCount = Object.keys(state.supplierPriceOverrides).length;
    const summaryBar = document.getElementById('bom-summary-bar');
    if (summaryBar) {
      if (overrideCount > 0) {
        const origBomFull = getFilteredBOM(state.aiAnalysis, state.disciplines);
        const origGrand = origBomFull.grandTotal;
        const delta = grandTotal - origGrand;
        const deltaStr = delta >= 0 ? '+' + _fmtD(delta) : '-' + _fmtD(Math.abs(delta));
        summaryBar.style.display = 'flex';
        summaryBar.innerHTML = `<span style="font-size:12px;color:var(--text-muted);">${overrideCount} item${overrideCount > 1 ? 's' : ''} manually edited &middot; Original: ${_fmtD(origGrand)} &rarr; Current: ${_fmtD(grandTotal)} (${deltaStr})</span>
          <button id="bom-reset-overrides" style="padding:5px 12px;border-radius:6px;border:1px solid rgba(239,68,68,0.3);background:rgba(239,68,68,0.06);color:#ef4444;font-size:11px;font-weight:600;cursor:pointer;">Reset to AI Prices</button>`;
        // Re-bind reset button
        const newResetBtn = document.getElementById('bom-reset-overrides');
        if (newResetBtn) newResetBtn.addEventListener('click', () => { state.supplierPriceOverrides = {}; state.manualBomItems = []; state.deletedBomItems = {}; renderStep7(container); });
      } else {
        summaryBar.style.display = 'none';
      }
    }

    // Show/hide regenerate proposal button
    const regenBtn = document.getElementById('btn-regen-proposal');
    if (overrideCount > 0 && !regenBtn) {
      // Re-render needed to show the button — but only on next full render
    } else if (overrideCount === 0 && regenBtn) {
      regenBtn.style.display = 'none';
    }
  }

  document.querySelectorAll('.bom-edit-qty, .bom-edit-cost').forEach(input => {
    input.addEventListener('input', () => {
      clearTimeout(_bomDebounce);
      _bomDebounce = setTimeout(() => {
        const key = input.dataset.key;
        const row = input.closest('tr');
        const qtyInput = row.querySelector('.bom-edit-qty');
        const costInput = row.querySelector('.bom-edit-cost');
        if (qtyInput && costInput) _bomRecalc(key, qtyInput, costInput);
      }, 300);
    });
  });

  // ── BOM Delete Item handlers ──
  document.querySelectorAll('.bom-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const manualId = btn.dataset.manualId;
      if (manualId) {
        // Remove manually added item
        state.manualBomItems = (state.manualBomItems || []).filter(mi => mi.id !== manualId);
      } else {
        // Mark AI item as deleted
        if (!state.deletedBomItems) state.deletedBomItems = {};
        state.deletedBomItems[key] = true;
        // Clean up any override for this item
        delete state.supplierPriceOverrides[key];
      }
      renderStep7(container);
    });
  });

  // ── BOM Add Item handlers ──
  document.querySelectorAll('.bom-add-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ci = parseInt(btn.dataset.cat);
      const row = btn.closest('tr');
      // Check if form already exists
      if (row.nextElementSibling && row.nextElementSibling.classList.contains('bom-add-form-row')) return;
      // Insert inline add form
      const formRow = document.createElement('tr');
      formRow.className = 'bom-add-form-row';
      formRow.style.cssText = 'background:rgba(13,148,136,0.06);border:1px dashed rgba(20,184,166,0.3);';
      formRow.innerHTML = `
        <td style="padding:6px 4px;"></td>
        <td style="padding:6px 4px;" colspan="2">
          <input type="text" class="bom-add-name" placeholder="Item name" style="width:100%;padding:4px 8px;border:1px solid rgba(20,184,166,0.3);background:rgba(0,0,0,0.02);color:var(--text-primary);font-size:12px;border-radius:4px;outline:none;font-family:var(--font-sans);" />
        </td>
        <td style="padding:6px 4px;">
          <input type="text" class="bom-add-mfg" placeholder="MFG" style="width:100%;padding:4px 6px;border:1px solid rgba(20,184,166,0.3);background:rgba(0,0,0,0.02);color:var(--text-primary);font-size:11px;border-radius:4px;outline:none;" />
        </td>
        <td style="padding:6px 4px;">
          <input type="number" class="bom-add-qty" placeholder="Qty" value="1" min="0" step="1" style="width:60px;padding:4px 6px;border:1px solid rgba(20,184,166,0.3);background:rgba(0,0,0,0.02);color:var(--text-primary);font-size:12px;border-radius:4px;text-align:center;outline:none;" />
        </td>
        <td style="padding:6px 4px;">
          <input type="text" class="bom-add-unit" placeholder="EA" value="EA" style="width:50px;padding:4px 6px;border:1px solid rgba(20,184,136,0.3);background:rgba(0,0,0,0.02);color:var(--text-primary);font-size:11px;border-radius:4px;text-align:center;outline:none;" />
        </td>
        <td style="padding:6px 4px;">
          <input type="number" class="bom-add-cost" placeholder="0.00" min="0" step="0.01" style="width:80px;padding:4px 6px;border:1px solid rgba(20,184,166,0.3);background:rgba(0,0,0,0.02);color:var(--text-primary);font-size:12px;border-radius:4px;text-align:right;outline:none;" />
        </td>
        <td style="padding:6px 4px;" colspan="2">
          <div style="display:flex;gap:4px;">
            <button class="bom-add-save" style="padding:4px 10px;border:1px solid rgba(16,185,129,0.4);background:rgba(16,185,129,0.1);color:#059669;cursor:pointer;font-size:11px;font-weight:700;border-radius:4px;">Add</button>
            <button class="bom-add-cancel" style="padding:4px 8px;border:1px solid rgba(239,68,68,0.2);background:none;color:#ef4444;cursor:pointer;font-size:11px;border-radius:4px;">Cancel</button>
          </div>
        </td>
      `;
      row.parentNode.insertBefore(formRow, row.nextSibling);

      // Focus name field
      const nameInput = formRow.querySelector('.bom-add-name');
      if (nameInput) nameInput.focus();

      // Save handler
      formRow.querySelector('.bom-add-save').addEventListener('click', () => {
        const name = formRow.querySelector('.bom-add-name').value.trim();
        if (!name) { formRow.querySelector('.bom-add-name').style.borderColor = '#ef4444'; return; }
        const qty = parseFloat(formRow.querySelector('.bom-add-qty').value) || 1;
        const unit = formRow.querySelector('.bom-add-unit').value.trim() || 'EA';
        const unitCost = parseFloat(formRow.querySelector('.bom-add-cost').value) || 0;
        const mfg = formRow.querySelector('.bom-add-mfg').value.trim();
        if (!state.manualBomItems) state.manualBomItems = [];
        state.manualBomItems.push({
          id: 'manual-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          catIndex: ci,
          name,
          qty,
          unit,
          unitCost,
          mfg,
          partNumber: '',
        });
        renderStep7(container);
      });

      // Cancel handler
      formRow.querySelector('.bom-add-cancel').addEventListener('click', () => {
        formRow.remove();
      });

      // Enter key saves
      formRow.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('keydown', e => {
          if (e.key === 'Enter') formRow.querySelector('.bom-add-save').click();
          if (e.key === 'Escape') formRow.querySelector('.bom-add-cancel').click();
        });
      });
    });
  });

  // ── Regenerate Proposal button handler ──
  const regenProposalBtn = document.getElementById('btn-regen-proposal');
  if (regenProposalBtn) {
    regenProposalBtn.addEventListener('click', () => {
      regenProposalBtn.disabled = true;
      regenProposalBtn.querySelector('.proposal-gen-btn__title').textContent = 'Regenerating Proposal...';
      regenProposalBtn.querySelector('.proposal-gen-btn__sub').textContent = 'Applying your pricing edits and generating updated proposal';
      regenProposalBtn.classList.add('generating');

      ProposalGenerator.renderAndDownload(state, (pct, msg) => {
        regenProposalBtn.querySelector('.proposal-gen-btn__sub').textContent = `${pct}% — ${msg}`;
      }).then(() => {
        regenProposalBtn.disabled = false;
        regenProposalBtn.classList.remove('generating');
        regenProposalBtn.querySelector('.proposal-gen-btn__title').textContent = 'Regenerate Proposal with Updated Pricing';
        regenProposalBtn.querySelector('.proposal-gen-btn__sub').textContent = 'Uses your manually edited quantities and supplier pricing';
      }).catch(e => {
        console.error('[RegenProposal] Failed:', e);
        regenProposalBtn.classList.remove('generating');
        regenProposalBtn.querySelector('.proposal-gen-btn__title').textContent = '❌ Regeneration Failed';
        regenProposalBtn.querySelector('.proposal-gen-btn__sub').textContent = 'Please try again';
        if (typeof spToast === 'function') spToast('Proposal regeneration failed. Please try again.', 'error');
        setTimeout(() => {
          regenProposalBtn.disabled = false;
          regenProposalBtn.querySelector('.proposal-gen-btn__title').textContent = 'Regenerate Proposal with Updated Pricing';
          regenProposalBtn.querySelector('.proposal-gen-btn__sub').textContent = 'Uses your manually edited quantities and supplier pricing';
        }, 5000);
      });
    });
  }

  // ── Rate Library Button Handlers ──
  const rateLibOpenBtn = document.getElementById('rate-library-open');
  if (rateLibOpenBtn) rateLibOpenBtn.addEventListener('click', () => showRateLibraryPanel());

  const rateLibApplyBtn = document.getElementById('rate-library-apply');
  if (rateLibApplyBtn) rateLibApplyBtn.addEventListener('click', () => applyRateLibraryToEstimate(container));

  const rateLibSaveBtn = document.getElementById('rate-library-save-from-estimate');
  if (rateLibSaveBtn) rateLibSaveBtn.addEventListener('click', () => saveRatesFromEstimate());

  // Copy analysis to clipboard
  const copyBtn = document.getElementById("btn-copy-analysis");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      if (state.aiAnalysis) {
        navigator.clipboard.writeText(state.aiAnalysis).then(() => {
          copyBtn.innerHTML = '✅ Copied!';
          setTimeout(() => { copyBtn.innerHTML = '📋 Copy'; }, 2000);
        }).catch(() => {
          // Fallback for older browsers
          const ta = document.createElement('textarea');
          ta.value = state.aiAnalysis;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          copyBtn.innerHTML = '✅ Copied!';
          setTimeout(() => { copyBtn.innerHTML = '📋 Copy'; }, 2000);
        });
      }
    });
  }

  // TOC smooth-scroll links (delegated — no inline onclick)
  container.querySelectorAll('a[data-toc-target]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = a.getAttribute('data-toc-target');
      if (targetId) {
        const targetEl = document.getElementById(targetId);
        if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Expand/collapse analysis view
  const expandBtn = document.getElementById("btn-expand-analysis");
  if (expandBtn) {
    expandBtn.addEventListener("click", () => {
      const el = document.getElementById("ai-analysis-printable");
      if (!el) return;
      const isExpanded = el.style.maxHeight === 'none';
      el.style.maxHeight = isExpanded ? '600px' : 'none';
      expandBtn.innerHTML = isExpanded ? '↕ Expand' : '↕ Collapse';
    });
  }

  // Save AI Analysis as PDF
  const pdfBtn = document.getElementById("btn-save-analysis-pdf");
  if (pdfBtn) {
    pdfBtn.addEventListener("click", () => {
      const analysisEl = document.getElementById("ai-analysis-printable");
      if (!analysisEl) return;

      const projectName = state.projectName || 'Untitled Project';
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      // Build a standalone HTML document for printing
      const printHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${projectName} — AI Estimation & Analysis</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1a1a2e; background: #fff;
      padding: 40px 50px; font-size: 11px; line-height: 1.7;
    }
    .pdf-header {
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 3px solid #0d9488; padding-bottom: 16px; margin-bottom: 24px;
    }
    .pdf-header h1 { font-size: 20px; color: #0d9488; font-weight: 700; }
    .pdf-header .meta { text-align: right; font-size: 10px; color: #666; line-height: 1.6; }
    .pdf-header .meta strong { color: #333; }
    h1, h2, h3, h4 { color: #0f172a; margin-top: 18px; margin-bottom: 8px; }
    h2 { font-size: 16px; color: #0d9488; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    h3 { font-size: 13px; color: #334155; }
    h4 { font-size: 12px; color: #475569; }
    p, li, td { font-size: 11px; line-height: 1.7; }
    table {
      width: 100%; border-collapse: collapse; margin: 10px 0 16px; font-size: 10px;
    }
    th, td {
      border: 1px solid #d1d5db; padding: 6px 8px; text-align: left;
    }
    th {
      background: #f0fdfa; color: #0d9488; font-weight: 600; font-size: 10px;
    }
    tr:nth-child(even) { background: #f9fafb; }
    strong { color: #0f172a; }
    ul, ol { padding-left: 20px; margin: 6px 0; }
    li { margin-bottom: 3px; }
    .pdf-footer {
      margin-top: 30px; padding-top: 12px; border-top: 1px solid #e5e7eb;
      font-size: 9px; color: #94a3b8; text-align: center;
    }
    @media print {
      body { padding: 20px 30px; }
      @page { margin: 0.5in; size: letter; }
    }
  </style>
</head>
<body>
  <div class="pdf-header">
    <h1>AI Estimation & Analysis</h1>
    <div class="meta">
      <div><strong>${esc(projectName)}</strong></div>
      <div>${esc(dateStr)}</div>
      <div>Generated by SmartPlans</div>
    </div>
  </div>
  <div class="pdf-body">${sanitizeHtml(analysisEl.innerHTML)}</div>
  <div class="pdf-footer">
    This report was generated by SmartPlans AI-Powered ELV Estimation — ${esc(dateStr)}
  </div>
  <div style="text-align:center;margin-top:20px;font-size:14px;font-weight:800;color:#BF9000;letter-spacing:3px;">3D CONFIDENTIAL</div>
</body>
</html>`;

      // Open print window
      const printWin = window.open('', '_blank', 'width=900,height=700');
      if (!printWin) {
        if (typeof spToast === 'function') spToast('Popup blocked — please allow popups for this site', 'error');
        return;
      }
      printWin.document.write(printHTML);
      printWin.document.close();
      // Wait for fonts to load, then trigger print (browser Save as PDF option)
      printWin.onload = () => {
        setTimeout(() => {
          printWin.print();
        }, 500);
      };
    });
  }

  // Proposal Generator button — downloads .doc file directly, no popup needed
  const proposalBtn = document.getElementById("btn-generate-proposal");
  if (proposalBtn) {
    proposalBtn.addEventListener("click", () => {
      proposalBtn.disabled = true;
      proposalBtn.querySelector('.proposal-gen-btn__title').textContent = 'Generating Proposal…';
      proposalBtn.querySelector('.proposal-gen-btn__sub').textContent = 'AI is crafting your professional proposal — please wait';
      proposalBtn.classList.add('generating');

      ProposalGenerator.renderAndDownload(state, (pct, msg) => {
        proposalBtn.querySelector('.proposal-gen-btn__sub').textContent = `${pct}% — ${msg}`;
      }).then(() => {
        proposalBtn.disabled = false;
        proposalBtn.classList.remove('generating');
        proposalBtn.querySelector('.proposal-gen-btn__title').textContent = 'Generate Full Proposal (10+ pages)';
        proposalBtn.querySelector('.proposal-gen-btn__sub').textContent = 'Complete Fortune 500-grade proposal with detailed scope, pricing tables, and qualifications';
        // Show the PDF button after successful generation
        const pdfProposalBtn = document.getElementById('btn-pdf-proposal');
        if (pdfProposalBtn && ProposalGenerator._lastFullProposalHTML) pdfProposalBtn.style.display = 'block';
      }).catch(e => {
        console.error('[ProposalGen] Failed:', e);
        proposalBtn.classList.remove('generating');
        proposalBtn.classList.add('error');
        proposalBtn.querySelector('.proposal-gen-btn__title').textContent = '❌ Proposal Generation Failed';
        proposalBtn.querySelector('.proposal-gen-btn__sub').textContent = 'Please try again';
        if (typeof spToast === 'function') spToast('Proposal generation failed. Please try again.', 'error');
        setTimeout(() => {
          proposalBtn.disabled = false;
          proposalBtn.classList.remove('error');
          proposalBtn.querySelector('.proposal-gen-btn__title').textContent = 'Generate Full Proposal (10+ pages)';
          proposalBtn.querySelector('.proposal-gen-btn__sub').textContent = 'Complete Fortune 500-grade proposal with detailed scope, pricing tables, and qualifications';
        }, 5000);
      });
    });
  }

  // Executive (3-page) Proposal Generator button
  const execBtn = document.getElementById("btn-generate-exec-proposal");
  if (execBtn) {
    execBtn.addEventListener("click", () => {
      execBtn.disabled = true;
      execBtn.querySelector('.proposal-gen-btn__title').textContent = 'Generating Executive Proposal…';
      execBtn.querySelector('.proposal-gen-btn__sub').textContent = 'AI is crafting your 3-page executive summary — please wait';
      execBtn.classList.add('generating');

      ProposalGenerator.renderExecutiveProposal(state, (pct, msg) => {
        execBtn.querySelector('.proposal-gen-btn__sub').textContent = `${pct}% — ${msg}`;
      }).catch(e => {
        console.error('[ExecProposal] Failed:', e);
        execBtn.querySelector('.proposal-gen-btn__title').textContent = '❌ Generation Failed';
        execBtn.querySelector('.proposal-gen-btn__sub').textContent = e.message || 'Unknown error';
        execBtn.classList.remove('generating');
        if (typeof spToast === 'function') spToast('Executive proposal failed: ' + (e.message || 'Unknown error'), 'error');
        setTimeout(() => {
          execBtn.disabled = false;
          execBtn.querySelector('.proposal-gen-btn__title').textContent = 'Generate Executive Proposal (3 pages)';
          execBtn.querySelector('.proposal-gen-btn__sub').textContent = 'High-impact executive summary — visually stunning, concise, designed to impress decision-makers';
        }, 5000);
      }).then(() => {
        execBtn.disabled = false;
        execBtn.classList.remove('generating');
        execBtn.querySelector('.proposal-gen-btn__title').textContent = 'Generate Executive Proposal (3 pages)';
        execBtn.querySelector('.proposal-gen-btn__sub').textContent = 'High-impact executive summary — visually stunning, concise, designed to impress decision-makers';
        // Show the PDF button after successful generation
        const pdfExecBtn = document.getElementById('btn-pdf-exec-proposal');
        if (pdfExecBtn && ProposalGenerator._lastExecProposalHTML) pdfExecBtn.style.display = 'block';
      });
    });
  }

  // ── PDF Save Buttons — open cached HTML in print window ──
  const pdfProposalBtn = document.getElementById('btn-pdf-proposal');
  if (pdfProposalBtn) {
    // Show immediately if HTML was previously cached (e.g., re-render of step 7)
    if (typeof ProposalGenerator !== 'undefined' && ProposalGenerator._lastFullProposalHTML) pdfProposalBtn.style.display = 'block';
    pdfProposalBtn.addEventListener('click', () => {
      if (ProposalGenerator._lastFullProposalHTML) openPrintAsPDF(ProposalGenerator._lastFullProposalHTML);
      else spToast('Generate the proposal first, then click Save as PDF', 'error');
    });
  }
  const pdfExecBtn = document.getElementById('btn-pdf-exec-proposal');
  if (pdfExecBtn) {
    if (typeof ProposalGenerator !== 'undefined' && ProposalGenerator._lastExecProposalHTML) pdfExecBtn.style.display = 'block';
    pdfExecBtn.addEventListener('click', () => {
      if (ProposalGenerator._lastExecProposalHTML) openPrintAsPDF(ProposalGenerator._lastExecProposalHTML);
      else spToast('Generate the executive proposal first, then click Save as PDF', 'error');
    });
  }
  // ── BOM PDF — render formatted print table ──
  const bomPdfBtn = document.getElementById('export-bom-pdf');
  if (bomPdfBtn) bomPdfBtn.addEventListener('click', () => {
    if (!state.aiAnalysis) { spToast('Run the analysis first to generate BOM data', 'error'); return; }
    const bomData = getFilteredBOM(state.aiAnalysis, state.disciplines);
    if (!bomData || !bomData.categories.length) { spToast('No BOM data available', 'error'); return; }
    const fmtD = (v) => '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const projName = esc(state.projectName || 'Untitled Project');
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    let tableRows = '';
    let rowNum = 0;
    for (const cat of bomData.categories) {
      tableRows += `<tr style="background:#f0fdfa;"><td colspan="6" style="padding:10px 12px;font-weight:700;font-size:13px;color:#0d9488;border:1px solid #d1d5db;">${esc(cat.name)}</td></tr>`;
      for (const item of cat.items) {
        rowNum++;
        const bg = rowNum % 2 === 0 ? '#f9fafb' : '#fff';
        tableRows += `<tr style="background:${bg};">
          <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;font-size:10px;">${rowNum}</td>
          <td style="border:1px solid #d1d5db;padding:6px 8px;font-size:10px;">${esc(item.item || item.name || '')}</td>
          <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;font-size:10px;">${item.qty}</td>
          <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:center;font-size:10px;">${esc(item.unit || 'ea')}</td>
          <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:right;font-size:10px;">${fmtD(item.unitCost)}</td>
          <td style="border:1px solid #d1d5db;padding:6px 8px;text-align:right;font-size:10px;font-weight:600;">${fmtD(item.extCost)}</td>
        </tr>`;
      }
      tableRows += `<tr style="background:#f0fdfa;"><td colspan="5" style="border:1px solid #d1d5db;padding:6px 12px;text-align:right;font-weight:600;font-size:11px;">Subtotal — ${esc(cat.name)}</td><td style="border:1px solid #d1d5db;padding:6px 8px;text-align:right;font-weight:700;font-size:11px;">${fmtD(cat.subtotal)}</td></tr>`;
    }
    tableRows += `<tr style="background:#0d9488;"><td colspan="5" style="border:1px solid #0d9488;padding:10px 12px;text-align:right;font-weight:800;font-size:13px;color:#fff;">GRAND TOTAL</td><td style="border:1px solid #0d9488;padding:10px 12px;text-align:right;font-weight:800;font-size:14px;color:#fff;">${fmtD(bomData.grandTotal)}</td></tr>`;
    const bomPdfHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${projName} — Bill of Materials</title>
      <style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      *{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Inter',-apple-system,sans-serif;color:#1a1a2e;background:#fff;padding:40px 50px;font-size:11px;}
      .hdr{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0d9488;padding-bottom:16px;margin-bottom:24px;}
      .hdr h1{font-size:20px;color:#0d9488;font-weight:700;}.hdr .meta{text-align:right;font-size:10px;color:#666;line-height:1.6;}.hdr .meta strong{color:#333;}
      table{width:100%;border-collapse:collapse;margin:10px 0;}th{background:#0d9488;color:#fff;font-weight:600;font-size:10px;padding:8px;border:1px solid #0d9488;text-align:left;}
      @media print{body{padding:20px 30px;}@page{margin:0.5in;size:letter;}}</style></head>
      <body><div class="hdr"><h1>Bill of Materials</h1><div class="meta"><div><strong>${projName}</strong></div><div>${dateStr}</div><div>Generated by SmartPlans</div></div></div>
      <table><thead><tr><th style="width:40px;text-align:center;">#</th><th>Item Description</th><th style="width:50px;text-align:center;">Qty</th><th style="width:50px;text-align:center;">Unit</th><th style="width:90px;text-align:right;">Unit Cost</th><th style="width:100px;text-align:right;">Extended Cost</th></tr></thead>
      <tbody>${tableRows}</tbody></table>
      <div style="text-align:center;margin-top:30px;font-size:14px;font-weight:800;color:#BF9000;letter-spacing:3px;">3D CONFIDENTIAL</div>
      <div style="text-align:center;margin-top:8px;font-size:9px;color:#94a3b8;">Generated by SmartPlans AI — 3D Technology Services Inc. — ${dateStr}</div>
      </body></html>`;
    openPrintAsPDF(bomPdfHtml);
  });

  // ── RFI PDF — build same Word HTML but open in print window ──
  const rfiPdfBtn = document.getElementById('export-rfis-pdf');
  if (rfiPdfBtn) rfiPdfBtn.addEventListener('click', () => {
    exportRFIs('pdf');
  });

  // Version History — load revisions inline in Step 6
  const revBtn = document.getElementById("btn-load-revisions");
  if (revBtn) {
    revBtn.addEventListener("click", async () => {
      if (!state.estimateId) return;
      revBtn.textContent = 'Loading...';
      revBtn.disabled = true;

      try {
        const res = await fetchWithRetry(`/api/estimates/${state.estimateId}/revisions`, { headers: { 'X-App-Token': _appToken }, _timeout: 10000 }, 3);
        const data = await res.json();
        const revisions = data.revisions || [];
        const inlineList = document.getElementById('revision-inline-list');
        if (!inlineList) return;

        if (revisions.length === 0) {
          inlineList.innerHTML = `<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:13px;">No previous versions found. Revisions are created automatically when you re-analyze.</div>`;
        } else {
          inlineList.innerHTML = revisions.map(rev => {
            const dateStr = rev.created_at ? new Date(rev.created_at.endsWith('Z') ? rev.created_at : rev.created_at + 'Z').toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
            }) : '';
            const costStr = rev.contract_value ? '$' + Number(rev.contract_value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '';
            return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid rgba(129,140,248,0.1);border-radius:8px;margin-bottom:6px;background:rgba(129,140,248,0.02);">
              <div>
                <span style="font-weight:600;font-size:13px;color:var(--text-primary);">Rev #${rev.revision_number}</span>
                <span style="font-size:12px;color:var(--text-muted);margin-left:8px;">${dateStr}</span>
                ${costStr ? '<span style="font-size:12px;color:var(--accent-indigo);margin-left:8px;font-weight:600;">' + costStr + '</span>' : ''}
              </div>
              <div style="display:flex;gap:6px;">
                <button onclick="compareRevision('${esc(state.estimateId)}','${esc(rev.id)}')" style="padding:5px 10px;border-radius:6px;border:1px solid rgba(56,189,248,0.25);background:rgba(56,189,248,0.06);color:var(--accent-sky);cursor:pointer;font-size:11px;font-weight:600;">Compare</button>
                <button onclick="restoreRevision('${esc(state.estimateId)}','${esc(rev.id)}',${rev.revision_number})" style="padding:5px 10px;border-radius:6px;border:1px solid rgba(16,185,129,0.25);background:rgba(16,185,129,0.06);color:#10b981;cursor:pointer;font-size:11px;font-weight:600;">Restore</button>
              </div>
            </div>`;
          }).join('');
        }

        revBtn.textContent = 'Refresh';
        revBtn.disabled = false;
      } catch (err) {
        console.error('[SmartPlans] Failed to load revisions:', err);
        revBtn.textContent = 'View Revisions';
        revBtn.disabled = false;
        console.error('[SmartPlans]', err); spToast('Failed to load revisions. Please try again.', 'error');
      }
    });
  }

}


// ═══════════════════════════════════════════════════════════════
// EXCLUSIONS & ASSUMPTIONS PANEL
// ═══════════════════════════════════════════════════════════════

function initExclusionsPanel(container) {
  const card = document.getElementById('exclusions-card');
  if (!card) return;

  function renderExclList() {
    const listEl = document.getElementById('excl-list');
    if (!listEl) return;
    const filtered = state.exclusions.filter(e => e.type === state._exclusionsTab);
    filtered.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

    if (filtered.length === 0) {
      const typeLabel = state._exclusionsTab === 'exclusion' ? 'exclusions' : state._exclusionsTab === 'assumption' ? 'assumptions' : 'clarifications';
      listEl.innerHTML = `<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px;border:1px dashed rgba(0,0,0,0.08);">No ${typeLabel} added yet. Click "Load Defaults" or "Auto-Generate" to get started, or add items manually below.</div>`;
      return;
    }

    listEl.innerHTML = filtered.map((item, idx) => `
      <div class="excl-item" data-excl-id="${esc(item.id)}" style="display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border:1px solid rgba(0,0,0,0.06);margin-bottom:4px;background:#FAFBFC;transition:background 0.15s;">
        <div style="display:flex;flex-direction:column;gap:2px;margin-right:2px;">
          <button class="excl-move-up" data-excl-id="${esc(item.id)}" style="border:none;background:none;cursor:pointer;padding:0 2px;font-size:10px;color:var(--text-muted);line-height:1;" ${idx === 0 ? 'disabled' : ''} title="Move up">&#9650;</button>
          <button class="excl-move-down" data-excl-id="${esc(item.id)}" style="border:none;background:none;cursor:pointer;padding:0 2px;font-size:10px;color:var(--text-muted);line-height:1;" ${idx === filtered.length - 1 ? 'disabled' : ''} title="Move down">&#9660;</button>
        </div>
        <div style="flex:1;min-width:0;">
          <div class="excl-item-text" style="font-size:13px;color:var(--text-primary);line-height:1.5;">${esc(item.text)}</div>
          ${item.category ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px;text-transform:uppercase;letter-spacing:1px;">${esc(item.category)}</div>` : ''}
        </div>
        <button class="excl-edit-btn" data-excl-id="${esc(item.id)}" style="border:none;background:none;cursor:pointer;padding:4px;color:var(--text-muted);font-size:12px;" title="Edit"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
        <button class="excl-delete-btn" data-excl-id="${esc(item.id)}" style="border:none;background:none;cursor:pointer;padding:4px;color:var(--accent-rose);font-size:12px;" title="Delete"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
      </div>
    `).join('');

    if (typeof lucide !== 'undefined') try { lucide.createIcons(); } catch(e) { console.warn('Silent error:', e); }
    listEl.querySelectorAll('.excl-move-up').forEach(btn => btn.addEventListener('click', () => moveExclItem(btn.dataset.exclId, -1)));
    listEl.querySelectorAll('.excl-move-down').forEach(btn => btn.addEventListener('click', () => moveExclItem(btn.dataset.exclId, 1)));
    listEl.querySelectorAll('.excl-edit-btn').forEach(btn => btn.addEventListener('click', () => editExclItem(btn.dataset.exclId)));
    listEl.querySelectorAll('.excl-delete-btn').forEach(btn => btn.addEventListener('click', () => deleteExclItem(btn.dataset.exclId)));
  }

  function moveExclItem(id, dir) {
    const filtered = state.exclusions.filter(e => e.type === state._exclusionsTab).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const idx = filtered.findIndex(e => e.id === id);
    if (idx < 0) return;
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= filtered.length) return;
    const tmp = filtered[idx].sort_order; filtered[idx].sort_order = filtered[swapIdx].sort_order; filtered[swapIdx].sort_order = tmp;
    if (state.estimateId) {
      fetch(`/api/estimates/${state.estimateId}/exclusions`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-App-Token': _appToken },
        body: JSON.stringify({ id: filtered[idx].id, items: [{ id: filtered[idx].id, sort_order: filtered[idx].sort_order }, { id: filtered[swapIdx].id, sort_order: filtered[swapIdx].sort_order }] })
      }).catch(err => console.warn('[SmartPlans] Sort order update failed:', err));
    }
    renderExclList();
  }

  function editExclItem(id) {
    const item = state.exclusions.find(e => e.id === id);
    if (!item) return;
    const row = card.querySelector(`.excl-item[data-excl-id="${id}"]`);
    const textDiv = row && row.querySelector('.excl-item-text');
    if (!textDiv) return;
    const cur = item.text;
    textDiv.innerHTML = `<input type="text" class="excl-inline-edit" value="${esc(cur)}" style="width:100%;padding:4px 8px;border:1px solid rgba(13,148,136,0.3);font-size:13px;font-family:var(--font-sans);color:var(--text-primary);">`;
    const inp = textDiv.querySelector('.excl-inline-edit'); inp.focus(); inp.select();
    function save() {
      const v = inp.value.trim();
      if (!v || v === cur) { renderExclList(); return; }
      item.text = v;
      if (state.estimateId) { fetch(`/api/estimates/${state.estimateId}/exclusions`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-App-Token': _appToken }, body: JSON.stringify({ id: item.id, text: v }) }).then(r => { if (!r.ok) console.error('[Exclusions] API error:', r.status); }).catch(err => { console.error('[Exclusions] Network error:', err.message); if (typeof spToast === 'function') spToast('Failed to sync exclusion — check connection', 'error'); }); }
      renderExclList();
      if (typeof spToast === 'function') spToast('Item updated', 'success');
    }
    inp.addEventListener('blur', save);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') renderExclList(); });
  }

  function deleteExclItem(id) {
    const idx = state.exclusions.findIndex(e => e.id === id);
    if (idx < 0) return;
    state.exclusions.splice(idx, 1);
    if (state.estimateId) { fetch(`/api/estimates/${state.estimateId}/exclusions`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'X-App-Token': _appToken }, body: JSON.stringify({ id }) }).then(r => { if (!r.ok) console.error('[Exclusions] API error:', r.status); }).catch(err => { console.error('[Exclusions] Network error:', err.message); if (typeof spToast === 'function') spToast('Failed to sync exclusion — check connection', 'error'); }); }
    renderExclList();
    if (typeof spToast === 'function') spToast('Item removed', 'success');
  }

  function addExclItem(text, category) {
    const t = text.trim(); if (!t) return;
    const maxOrder = state.exclusions.filter(e => e.type === state._exclusionsTab).reduce((m, e) => Math.max(m, e.sort_order || 0), 0);
    const newItem = { id: crypto.randomUUID().replace(/-/g, ''), type: state._exclusionsTab, text: t, category: category || 'General', sort_order: maxOrder + 1 };
    state.exclusions.push(newItem);
    if (state.estimateId) { fetch(`/api/estimates/${state.estimateId}/exclusions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-App-Token': _appToken }, body: JSON.stringify(newItem) }).then(r => { if (!r.ok) console.error('[Exclusions] API error:', r.status); }).catch(err => { console.error('[Exclusions] Network error:', err.message); if (typeof spToast === 'function') spToast('Failed to sync exclusion — check connection', 'error'); }); }
    renderExclList();
  }

  // Tab switching
  card.querySelectorAll('.excl-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      state._exclusionsTab = tab.dataset.exclTab;
      card.querySelectorAll('.excl-tab').forEach(t => {
        const active = t.dataset.exclTab === state._exclusionsTab;
        t.style.color = active ? 'var(--accent-teal)' : 'var(--text-muted)';
        t.style.borderBottomColor = active ? 'var(--accent-teal)' : 'transparent';
      });
      renderExclList();
    });
  });

  // Add button + enter key
  const addBtn = document.getElementById('excl-add-btn');
  const addText = document.getElementById('excl-add-text');
  const addCat = document.getElementById('excl-add-category');
  if (addBtn && addText) {
    addBtn.addEventListener('click', () => { addExclItem(addText.value, addCat ? addCat.value : 'General'); addText.value = ''; addText.focus(); });
    addText.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addExclItem(addText.value, addCat ? addCat.value : 'General'); addText.value = ''; } });
  }

  // Load Defaults
  const loadDefaultsBtn = document.getElementById('excl-load-defaults');
  if (loadDefaultsBtn) {
    loadDefaultsBtn.addEventListener('click', () => {
      const defaults = getDefaultExclusions(state.disciplines);
      let added = 0; const newItems = [];
      for (const d of defaults) {
        if (state.exclusions.some(e => e.type === d.type && e.text === d.text)) continue;
        const ni = { id: crypto.randomUUID().replace(/-/g, ''), type: d.type, text: d.text, category: d.category || 'General', sort_order: d.sort_order || 0 };
        state.exclusions.push(ni); newItems.push(ni); added++;
      }
      if (state.estimateId && newItems.length > 0) { fetch(`/api/estimates/${state.estimateId}/exclusions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-App-Token': _appToken }, body: JSON.stringify(newItems) }).then(r => { if (!r.ok) console.error('[Exclusions] API error:', r.status); }).catch(err => { console.error('[Exclusions] Network error:', err.message); if (typeof spToast === 'function') spToast('Failed to sync exclusion — check connection', 'error'); }); }
      renderExclList();
      if (typeof spToast === 'function') spToast(`${added} default items loaded`, 'success');
    });
  }

  // Auto-Generate via AI
  const autoGenBtn = document.getElementById('excl-auto-generate');
  if (autoGenBtn) {
    autoGenBtn.addEventListener('click', async () => {
      if (state._exclusionsGenerating) return;
      state._exclusionsGenerating = true;
      if (!state.aiAnalysis) { if (typeof spToast === 'function') spToast('Run the AI analysis first', 'warning'); return; }
      autoGenBtn.disabled = true;
      autoGenBtn.innerHTML = '<i data-lucide="loader" style="width:12px;height:12px;"></i> Generating...';
      if (typeof lucide !== 'undefined') try { lucide.createIcons(); } catch(e) { console.warn('Silent error:', e); }
      try {
        const snippet = (state.aiAnalysis || '').substring(0, 8000);
        const discs = state.disciplines.join(', ');
        const prompt = `Based on this low-voltage estimate analysis for disciplines: ${discs}\n\n${snippet}\n\nGenerate a JSON array of exclusions, assumptions, and clarifications for this project proposal. Each: {"type":"exclusion"|"assumption"|"clarification","text":"...","category":"..."}. Focus on project-specific items beyond standard defaults. Return ONLY the JSON array.`;
        const _ac = new AbortController();
        const _to = setTimeout(() => _ac.abort(), 30000);
        let resp;
        try {
          resp = await fetch(GEMINI_CONFIG.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _model: 'gemini-2.5-flash', _brainSlot: 0, contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.3, maxOutputTokens: 2000 } }), signal: _ac.signal });
        } finally { clearTimeout(_to); }
        if (!resp.ok) throw new Error('AI service error: ' + resp.status);
        const rawText = await resp.text();
        let aiText = '';
        try {
          const lines = rawText.split('\n').filter(l => l.startsWith('data: '));
          if (lines.length > 0) {
            for (const l of lines) { try { const j = JSON.parse(l.slice(6)); aiText += j?.candidates?.[0]?.content?.parts?.[0]?.text || ''; } catch(e2) { console.warn('SSE line parse error:', e2); } }
          }
          if (!aiText) {
            try { const direct = JSON.parse(rawText); aiText = direct?.candidates?.[0]?.content?.parts?.[0]?.text || ''; if (!aiText && rawText.includes('[')) aiText = rawText; } catch(e3) { aiText = rawText; }
          }
        } catch(e) { aiText = rawText; }
        console.log('[SmartPlans] Auto-generate AI response:', aiText.substring(0, 200));
        let jsonMatch = aiText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) { const cb = aiText.match(/```(?:json)?\s*([\s\S]*?)```/); if (cb) jsonMatch = cb[1].match(/\[[\s\S]*\]/); }
        if (jsonMatch) {
          let suggestions;
          try { suggestions = JSON.parse(jsonMatch[0]); } catch (pe) { if (typeof spToast === 'function') spToast('Could not parse AI suggestions. Please try again.', 'warning'); return; }
          let added = 0; const newItems = [];
          for (const s of suggestions) {
            if (!s.text || !s.type || !['exclusion','assumption','clarification'].includes(s.type)) continue;
            if (state.exclusions.some(e => e.type === s.type && e.text === s.text)) continue;
            const maxO = state.exclusions.filter(e => e.type === s.type).reduce((m, e) => Math.max(m, e.sort_order || 0), 0);
            const ni = { id: crypto.randomUUID().replace(/-/g, ''), type: s.type, text: s.text.trim(), category: s.category || 'General', sort_order: maxO + 1 };
            state.exclusions.push(ni); newItems.push(ni); added++;
          }
          if (state.estimateId && newItems.length > 0) { fetch(`/api/estimates/${state.estimateId}/exclusions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-App-Token': _appToken }, body: JSON.stringify(newItems) }).then(r => { if (!r.ok) console.error('[Exclusions] API error:', r.status); }).catch(err => { console.error('[Exclusions] Network error:', err.message); if (typeof spToast === 'function') spToast('Failed to sync exclusion — check connection', 'error'); }); }
          renderExclList();
          if (typeof spToast === 'function') spToast(`${added} AI-generated items added`, 'success');
        } else { if (typeof spToast === 'function') spToast('Could not parse AI suggestions', 'warning'); }
      } catch (err) {
        console.error('[SmartPlans] Auto-generate exclusions error:', err);
        console.error('[SmartPlans]', err); if (typeof spToast === 'function') spToast('Auto-generate failed. Please try again.', 'error');
      } finally {
        state._exclusionsGenerating = false;
        autoGenBtn.disabled = false;
        autoGenBtn.innerHTML = '<i data-lucide="sparkles" style="width:12px;height:12px;"></i> Auto-Generate';
        if (typeof lucide !== 'undefined') try { lucide.createIcons(); } catch(e) { console.warn('Silent error:', e); }
      }
    });
  }

  // Load from API on first render
  if (state.estimateId && !state._exclusionsLoaded) {
    state._exclusionsLoaded = true;
    fetch(`/api/estimates/${state.estimateId}/exclusions`, { headers: { 'X-App-Token': _appToken } }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(data => {
      if (data.exclusions && data.exclusions.length > 0) { state.exclusions = data.exclusions.map(e => ({ ...e, _saved: true })); renderExclList(); }
    }).catch(err => console.warn('[SmartPlans] Failed to load exclusions:', err));
  }
  renderExclList();
}


// ═══════════════════════════════════════════════════════════════
// FILE UPLOAD COMPONENT
// ═══════════════════════════════════════════════════════════════

function renderFileUpload(container, { label, description, files, onFilesChange, accept }) {
  const acceptAttr = accept || ".pdf,.dwg,.dxf,.ifc,.rvt,.png,.jpg,.jpeg,.tif,.tiff";
  const formats = acceptAttr.split(",").map(s => s.replace(".", "").toUpperCase()).join("  ·  ");

  const fileListHtml = files.map((f, i) => `
    <div class="file-item">
      <div class="file-item-info">
        <span class="file-item-icon">📎</span>
        <span class="file-item-name">${esc(f.name)}</span>
        <span class="file-item-size">${formatFileSize(f.size)}</span>
      </div>
      <button class="file-remove-btn" data-file-idx="${i}">✕</button>
    </div>
  `).join("");

  container.innerHTML = `
    <div class="form-group">
      ${label ? `<label class="form-label">${esc(label)}</label>` : ""}
      ${description ? `<p class="form-hint">${esc(description)}</p>` : ""}
      <div class="upload-zone" id="upload-zone-${container.id}">
        <input type="file" multiple accept="${acceptAttr}" id="upload-input-${container.id}">
        <div class="upload-icon">📁</div>
        <div class="upload-text">Drop files here or click to browse</div>
        <div class="upload-formats">${formats}</div>
      </div>
      ${files.length > 0 ? `<div class="file-list">${fileListHtml}</div>` : ""}
    </div>
  `;

  const zone = document.getElementById(`upload-zone-${container.id}`);
  const input = document.getElementById(`upload-input-${container.id}`);

  zone.addEventListener("dragover", e => { e.preventDefault(); zone.classList.add("drag-over"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
  zone.addEventListener("drop", e => {
    e.preventDefault();
    zone.classList.remove("drag-over");
    handleNewFiles(e.dataTransfer.files);
  });

  input.addEventListener("change", e => {
    handleNewFiles(e.target.files);
    input.value = "";
  });

  container.querySelectorAll(".file-remove-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.fileIdx);
      const newFiles = files.filter((_, i) => i !== idx);
      onFilesChange(newFiles);
      renderFileUpload(container, { label, description, files: newFiles, onFilesChange, accept });
    });
  });

  function handleNewFiles(fileList) {
    const newRawFiles = Array.from(fileList);
    const arr = newRawFiles.map(f => ({ name: f.name, size: f.size, type: f.type, rawFile: f }));
    const updated = [...files, ...arr];
    onFilesChange(updated);
    renderFileUpload(container, { label, description, files: updated, onFilesChange, accept });
  }
}


// ═══════════════════════════════════════════════════════════════
// GEMINI API — File Conversion & Analysis
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// RELIABILITY UTILITIES — Retry, Backoff, File Validation
// ═══════════════════════════════════════════════════════════════

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB per file (Gemini File API)
const MAX_TOTAL_PAYLOAD = 4 * 1024 * 1024 * 1024; // 4 GB total payload
const API_TIMEOUT_MS = 120000; // 120 seconds
const MAX_RETRIES = 3;

async function fetchWithRetry(url, options, maxRetries = MAX_RETRIES) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options._timeout || 30000);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok || res.status === 400 || res.status === 404) return res;
      // Quota/rate limit — rotate slot for next retry
      if ([429, 403].includes(res.status) && options._apiKeyRotator) {
        options._apiKeyRotator();
        console.warn(`[SmartPlans] Brain slot rotated due to ${res.status}`);
      }
      // Retryable server errors (429, 403, 500, 502, 503, 504)
      if ([429, 403, 500, 502, 503, 504].includes(res.status)) {
        lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000) + Math.random() * 500;
          console.warn(`[SmartPlans] Retry ${attempt}/${maxRetries} after ${Math.round(delay)}ms — ${res.status}`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
      return res;
    } catch (err) {
      lastError = err;
      if (err.name === 'AbortError') lastError = new Error('Request timed out');
      if (options._apiKeyRotator && attempt < maxRetries) {
        options._apiKeyRotator();
      }
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 8000) + Math.random() * 500;
        console.warn(`[SmartPlans] Retry ${attempt}/${maxRetries} after ${Math.round(delay)}ms — ${err.message}`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
      console.warn(`[SmartPlans] File "${file.name}" exceeds 50MB (${(file.size / 1048576).toFixed(1)}MB) — skipping`);
      resolve({ base64: null, mimeType: file.type, skipped: true, reason: 'too_large' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      resolve({ base64, mimeType: file.type || "application/octet-stream", skipped: false });
    };
    reader.onerror = () => {
      console.warn(`[SmartPlans] Failed to read file "${file.name}" — skipping`);
      resolve({ base64: null, mimeType: file.type, skipped: true, reason: 'read_error' });
    };
    reader.readAsDataURL(file);
  });
}

// ── PDF Text Extraction (for specification accuracy boost) ──
// Uses PDF.js to extract raw text from PDF files locally.
// This text is sent alongside the base64 PDF to give the AI
// both visual and textual data channels for cross-referencing.
async function extractPDFText(file) {
  if (typeof pdfjsLib === 'undefined') return null;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const maxPages = Math.min(pdf.numPages, 30); // Cap at 30 pages
    let fullText = '';

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      if (pageText.trim()) {
        fullText += `\n--- PAGE ${i} ---\n${pageText}\n`;
      }
      // Safety: don't accumulate more than 50KB of text
      if (fullText.length > 50000) break;
    }

    return fullText.trim();
  } catch (err) {
    console.warn(`[SmartPlans] PDF.js extraction error for ${file.name}:`, err.message);
    return null;
  }
}

function buildPricingContext() {
  const tier = state.pricingTier;
  const regionKey = state.regionalMultiplier;
  const regionMult = PRICING_DB.regionalMultipliers[regionKey] || 1.0;
  const regionLabel = regionKey.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  // Build compact pricing reference from selected tier
  function extractPrices(category, parentLabel) {
    let lines = [];
    for (const [subCat, items] of Object.entries(category)) {
      for (const [key, item] of Object.entries(items)) {
        if (typeof item === "object" && item[tier] !== undefined) {
          const adjusted = (item[tier] * regionMult).toFixed(2);
          lines.push(`   ${item.description}: $${adjusted} ${item.unit}`);
        }
      }
    }
    return lines;
  }

  // Labor rate summary
  const burdenMult = state.includeBurden ? (1 + state.burdenRate / 100) : 1.0;
  const laborLines = Object.entries(state.laborRates).map(([key, rate]) => {
    const label = key === "pm" ? "Project Manager" : key === "journeyman" ? "Journeyman Tech" : key === "lead" ? "Lead Tech" : key === "foreman" ? "Foreman" : key === "apprentice" ? "Apprentice" : "Programmer";
    const loaded = (rate * burdenMult).toFixed(2);
    return `   ${label}: $${rate.toFixed(2)}/hr base × ${burdenMult.toFixed(2)} burden = $${loaded}/hr loaded`;
  });

  let ctx = `
PRICING CONFIGURATION:
Pricing Tier: ${tier.toUpperCase()} (${tier === "budget" ? "value brands" : tier === "mid" ? "standard spec, name brands" : "high-end, specified brand"})
Regional Multiplier: ${regionLabel} (${regionMult.toFixed(2)}×)
Labor Burden: ${state.includeBurden ? state.burdenRate + "% (included)" : "Not applied"}
Markup — Material: ${state.markup.material}% | Labor: ${state.markup.labor}% | Equipment: ${state.markup.equipment}% | Subcontractor: ${state.markup.subcontractor}%

LABOR RATES (use these exact rates for all labor calculations):
${laborLines.join("\n")}

MATERIAL UNIT PRICES (${tier.toUpperCase()} tier, ${regionLabel} ${regionMult.toFixed(2)}× — use these exact prices for all material calculations):

Structured Cabling:
${extractPrices(PRICING_DB.structuredCabling).join("\n")}

CCTV / Video Surveillance:
${extractPrices(PRICING_DB.cctv).join("\n")}

Access Control:
${extractPrices(PRICING_DB.accessControl).join("\n")}

Fire Alarm:
${extractPrices(PRICING_DB.fireAlarm).join("\n")}

Intrusion Detection:
${extractPrices(PRICING_DB.intrusionDetection).join("\n")}

Audio Visual:
${extractPrices(PRICING_DB.audioVisual).join("\n")}

COST CALCULATION RULES:
1. Material Cost = Σ(quantity × unit price from above) — already includes regional multiplier
2. Material Sell Price = Material Cost × (1 + ${state.markup.material}%)
3. Labor Cost = Σ(hours × loaded labor rate from above)
4. Labor Sell Price = Labor Cost × (1 + ${state.markup.labor}%)
5. Equipment Sell Price = Equipment Cost × (1 + ${state.markup.equipment}%)
6. Subcontractor Sell Price = Sub Cost × (1 + ${state.markup.subcontractor}%)
7. Total Project Price = Material Sell + Labor Sell + Equipment Sell + Sub Sell + Travel
8. Apply these calculations to produce ACTUAL DOLLAR AMOUNTS in every summary table and in the SOV
`;
  return ctx;
}

function buildGeminiPrompt() {
  let prompt = `You are a senior low-voltage / ELV estimator, code compliance reviewer, and construction document analyst specializing in: Structured Cabling, CCTV, Access Control, Audio Visual, Intrusion Detection, and Fire Alarm systems.

You have expert knowledge of all applicable federal, state, local codes and industry standards. You MUST flag any code violations or non-compliant items found in the documents.

Project: "${state.projectName}"
Project Type: ${state.projectType}
Project Location: ${state.projectLocation || "Not specified"}
ELV Disciplines to analyze: ${state.disciplines.join(", ")}
File Format: ${state.fileFormat || "Not specified"}
Code Jurisdiction: ${state.codeJurisdiction || "Not specified"}
Prevailing Wage: ${state.prevailingWage === "davis-bacon" ? "Davis-Bacon Act (Federal)" : state.prevailingWage === "state-prevailing" ? "State Prevailing Wage" : state.prevailingWage === "pla" ? "Project Labor Agreement (PLA)" : "Not applicable — standard rates"}
Work Shift: ${state.workShift === "2nd-shift" ? "2nd Shift (3PM-11:30PM)" : state.workShift === "3rd-shift" ? "3rd Shift / Overnight (11PM-7:30AM)" : state.workShift === "weekends" ? "Weekends Only" : state.workShift === "split" ? "Split Shift (around occupants)" : state.workShift === "mixed" ? "Mixed — varies by phase" : state.workShift === "4-10" ? "4/10s (4 days × 10 hours)" : "1st Shift — Standard (7AM-3:30PM)"}
`;

  // Inject full pricing context with unit prices, labor rates, and markup rules
  prompt += buildPricingContext();

  if (state.specificItems) {
    prompt += `\nSpecific items to count:\n${state.specificItems}\n`;
  }
  if (state.knownQuantities) {
    prompt += `\nKnown quantities for verification:\n${state.knownQuantities}\n`;
  }
  if (state.priorEstimate) {
    prompt += `\nPrior estimate data:\n${state.priorEstimate}\n`;
  }
  if (state.notes) {
    prompt += `\nAdditional notes:\n${state.notes}\n`;
  }

  prompt += `

INSTRUCTIONS:
1. Analyze the uploaded construction documents (symbol legends, floor plans, specifications, addenda) for all low-voltage / ELV systems.
2. For each selected discipline, identify and count:
   - STRUCTURED CABLING: Data outlets, voice outlets, WAPs, fiber runs, MDF/IDF/TR rooms, cable tray, J-hooks, conduit, backbone cables
   - CCTV: Camera locations (fixed, PTZ, dome, bullet), NVR/VMS, monitors, exterior vs interior, pole mounts
   - ACCESS CONTROL: Controlled doors, reader locations, electrified hardware, REX devices, panels, credential type
   - AUDIO VISUAL: Displays, projectors, speakers, control panels, AV racks, video conferencing systems, digital signage
   - INTRUSION DETECTION: Motion detectors, door contacts, glass break sensors, keypads, panels, sirens
   - FIRE ALARM: Smoke detectors, heat detectors, pull stations, horn/strobes, duct detectors, FACP, NAC circuits
3. Cross-reference floor plan symbols against the symbol legend provided.
4. Check for discrepancies between plans, specifications, and any addenda.

5. **CODE & STANDARDS COMPLIANCE REVIEW** — This section is MANDATORY. Review the documents against ALL of the following. Flag ANY violations, missing requirements, or areas needing clarification:

   FEDERAL / NATIONAL CODES:
   - NEC (NFPA 70):
     * Article 725: Class 1/2/3 Remote-Control, Signaling, Power-Limited Circuits (access control, intrusion, AV control wiring)
     * Article 760: Fire Alarm Systems (power-limited vs non-power-limited, conductor types, pathway separation from Class 2)
     * Article 770: Optical Fiber Cables and Raceways (fiber installation, listing requirements)
     * Article 800: Communications Circuits (data/voice cabling, grounding, entrance protection)
     * Article 820: CATV/Radio Distribution Systems (coax for CCTV)
     * Article 830: Network-Powered Broadband Communications
     * Article 300.22: Wiring in plenums and air-handling spaces (plenum-rated cable requirements — CMP, OFNP)
   - NFPA 72 — National Fire Alarm and Signaling Code:
     * Smoke/heat detector spacing per ceiling height (Table 17.6.3.5.1)
     * NAC candela requirements per room size and ADA
     * Pull station placement (within 5 ft of each exit, max travel 200 ft)
     * Audibility (15 dB above ambient or 5 dB above max, whichever greater)
     * Pathway Class designations (A, B, X, N) and survivability
     * Duct detector requirements per HVAC unit size (>2000 CFM)
     * Two-way emergency communication (elevators, areas of refuge)
   - NFPA 101 — Life Safety Code:
     * Egress requirements affecting door hardware (access control on egress paths)
     * Delayed egress locks (15/30-second delay, signage, integration with fire alarm)
     * Controlled egress (requires approval of AHJ)
     * Fire door requirements affecting electrified hardware
   - NFPA 70E — Arc flash and electrical safety
   - IBC — International Building Code:
     * Occupancy classification driving fire alarm and access control requirements
     * Fire-rated assembly penetrations (firestopping per UL Systems)
     * Accessible design for readers, keypads, intercoms
   - IFC — International Fire Code:
     * Fire command center requirements
     * Manual fire alarm by occupancy type
     * Emergency Responder Radio Coverage (ERRC/BDA/DAS) — Section 510
   - ADA / ADA Standards for Accessible Design:
     * Card reader mounting: 48" max, 15" min from finished floor
     * Keypad/intercom accessibility (reach range, operable parts)
     * Visual notification appliance candela for hearing impaired per NFPA 72
     * Pull station height: 42"-48" AFF
     * Door opening force max 5 lbs, clearances for controlled doors
   - OSHA:
     * 29 CFR 1926 construction safety
     * Fall protection for ceiling/overhead installations
     * Confined space for telecom rooms without proper egress or ventilation

   STATE & LOCAL CODES:
   - State fire marshal amendments to NFPA 72 / IFC (flag items where local amendments commonly differ)
   - State licensing requirements for fire alarm, access control, intrusion systems
   - Local building department amendments to IBC
   - State energy code (lighting controls integration)
   - Local AHJ-specific requirements — flag items that typically need AHJ approval or special inspection

   INDUSTRY STANDARDS:
   - BICSI TDMM:
     * Telecom room sizing per workstations served
     * Minimum MDF/IDF room dimensions
     * Equipment clearance: 36" front, 30" rear
     * Max horizontal cable run: 90m (100m total channel)
   - TIA-568 — Telecommunications Cabling Standard:
     * Category performance (Cat 6 vs Cat 6A)
     * Max cable distances and bend radius
     * Testing requirements (permanent link vs channel)
   - TIA-569 — Pathways and Spaces:
     * Pathway fill ratios (40% conduit fill per NEC, BICSI 50% initial + 25% growth)
     * Telecom room environment: 64-75°F, 30-55% relative humidity
     * Ceiling pathway support spacing
   - TIA-606 — Administration Standard:
     * Labeling for cables, panels, outlets, pathways
     * Color coding for system identification
     * As-built documentation requirements
   - TIA-607 — Bonding and Grounding:
     * TMGB (Telecom Main Grounding Busbar) requirements
     * TGB per telecom room
     * TBB (Bonding Backbone) sizing and routing
   - UL Standards:
     * UL 294 — Access Control System Units
     * UL 681 — Burglar Alarm System Installation/Classification
     * UL 827 — Central Station Alarm Services
     * UL 864 — Fire Alarm Control Units
     * UL 1076 — Proprietary Burglar Alarm Units
     * UL 2050 — National Industrial Security Systems
     * UL 2572 — Mass Notification Systems
   - AVIXA:
     * F502.01 — Display Image Size for 2D Content
     * F501.01 — Audio Coverage Uniformity
   - ASIS / SIA:
     * SIA OSDP for access control readers
     * Physical asset protection standards
   - FM Global — FM Approved equipment for insured properties

   For each code issue found, provide:
   - Severity: 🔴 CRITICAL (code violation) / 🟡 WARNING (potential issue) / 🔵 INFO (best practice)
   - Specific code section
   - What the code requires
   - What the documents show (or fail to show)
   - Recommended corrective action or RFI

6. **MDF/IDF/TR MATERIAL BREAKDOWN** — For EACH telecom room provide:
   a) Room Designation & Location (building, floor, room number)
   b) Code compliance for this room:
      - Sizing adequacy per BICSI/TIA-569
      - HVAC present per TIA-569 requirements
      - Dedicated electrical circuit per NEC
      - Fire suppression requirements
      - ADA accessibility
   c) Devices/drops served
   d) Structured Cabling: drop count, cable type/qty, patch panels, estimated run lengths (flag runs near 90m)
   e) Rack/Cabinet: size, RU needed, accessories, clearance compliance per BICSI
   f) Networking: PoE switch ports, fiber backbone, patch panel
   g) Power: circuits per NEC, UPS sizing, grounding per TIA-607
   h) CCTV equipment in this room
   i) Access control panels in this room
   j) Fire alarm panels/annunciators in this room
   k) Intrusion detection panels in this room
   l) AV head-end equipment in this room

   **CRITICAL FORMAT — For each room, list ALL equipment and materials in this EXACT markdown table format:**
   | Item | Qty | Unit | Unit Cost | Extended Cost |
   |------|-----|------|-----------|---------------|
   | 42U Server Cabinet | 1 | ea | $2,500 | $2,500 |
   | 48-Port Cat6A Patch Panel | 2 | ea | $450 | $900 |
   | (continue for EVERY item in this room...) |

   **Also list cable quantities clearly as:**
   - "XX Cat6A drops" or "XX Cat6A runs"
   - "XX-strand SM fiber backbone"
   - "XX Cat6 cables"

   Format each room as its own ### subsection — an install checklist for project managers.

7. **OVERALL MATERIAL SUMMARY** — Consolidated bill of materials:
   - Total cable by type (Cat 6, Cat 6A, fiber, coax, 18/2, 18/4, 22/4, etc.)
   - Total devices by type across all rooms
   - Total rack units
   - Total patch panels, switches, accessories
   - Pathway materials (cable tray, J-hooks, conduit, firestop)

8. **LABOR ESTIMATION — NECA NATIONAL LABOR UNITS** — Apply standard NECA (National Electrical Contractors Association) labor units to ALL device counts and material quantities. Use the following reference labor units (adjust for project complexity and conditions):

   STRUCTURED CABLING LABOR UNITS:
   | Task | Unit | Labor Hours |
   |------|------|-------------|
   | Cat 6 data drop — rough-in (w/ J-hook pathway, box, ring, support) | each | 0.75 hr |
   | Cat 6 data drop — trim (terminate, test, label, faceplate) | each | 0.35 hr |
   | Cat 6A data drop — rough-in | each | 0.85 hr |
   | Cat 6A data drop — trim | each | 0.40 hr |
   | Patch panel 24-port — install and terminate | each | 2.5 hr |
   | Patch panel 48-port — install and terminate | each | 4.0 hr |
   | Cable tray installation — straight section | per 10 ft | 0.80 hr |
   | Cable tray fittings (elbow, tee, cross) | each | 0.50 hr |
   | J-hook installation | each | 0.15 hr |
   | 3/4" EMT conduit | per 100 ft | 4.0 hr |
   | 1" EMT conduit | per 100 ft | 5.0 hr |
   | 1-1/4" EMT conduit | per 100 ft | 6.5 hr |
   | Firestop penetration — single cable bundle | each | 0.50 hr |
   | Firestop penetration — sleeve/multi-cable | each | 1.0 hr |
   | 2-post relay rack — assemble and install | each | 3.0 hr |
   | 4-post equipment rack — assemble and install | each | 4.0 hr |
   | Wall-mount cabinet — install | each | 2.0 hr |
   | WAP — install, mount, cable, test | each | 1.25 hr |
   | Fiber termination — per strand (fusion splice) | each | 0.30 hr |
   | Fiber termination — per strand (mechanical) | each | 0.20 hr |
   | Fiber enclosure — install and label | each | 1.0 hr |
   | TGB — install and bond | each | 2.5 hr |
   | TMGB — install and bond | each | 4.0 hr |
   | TBB — install per 100 ft | per 100 ft | 3.0 hr |
   | Cable pulling — per 1000 ft (horizontal) | per 1000 ft | 2.0 hr |
   | Cable pulling — per 1000 ft (riser/vertical) | per 1000 ft | 4.0 hr |

   CCTV LABOR UNITS:
   | Task | Unit | Labor Hours |
   |------|------|-------------|
   | Fixed indoor dome camera — mount, cable, aim, configure | each | 1.5 hr |
   | Fixed indoor bullet camera — mount, cable, aim, configure | each | 1.5 hr |
   | Fixed outdoor dome camera — mount, weatherproof, cable, configure | each | 2.5 hr |
   | Fixed outdoor bullet camera — mount, weatherproof, cable, configure | each | 2.5 hr |
   | PTZ camera — mount, cable, configure, program presets | each | 3.5 hr |
   | Multi-sensor/panoramic camera — mount, cable, configure | each | 4.0 hr |
   | Exterior pole/arm mount with base | each | 4.0 hr |
   | NVR — rack mount, configure, connect | each | 4.0 hr |
   | VMS server — rack mount, configure, license | each | 8.0 hr |
   | Monitor/display — mount and connect | each | 1.0 hr |
   | Video wall — mount, configure, processor | per display | 2.0 hr |
   | PoE switch — rack mount, configure, patch | each | 2.0 hr |

   ACCESS CONTROL LABOR UNITS:
   | Task | Unit | Labor Hours |
   |------|------|-------------|
   | Single door — reader, electrified hardware, REX, DPS, wiring | each | 6.0 hr |
   | Card reader — mount and wire (reader only) | each | 1.0 hr |
   | Electric strike — install and wire | each | 2.0 hr |
   | Magnetic lock — install and wire | each | 1.5 hr |
   | Electric latch retraction — install and wire | each | 3.0 hr |
   | REX sensor (PIR) — mount and wire | each | 0.5 hr |
   | Door contact — install and wire | each | 0.75 hr |
   | Access control panel (4-door) — mount, wire, configure | each | 4.0 hr |
   | Access control panel (8-door) — mount, wire, configure | each | 6.0 hr |
   | Power supply with battery backup | each | 1.5 hr |
   | Elevator floor control module — per floor | each | 2.0 hr |
   | Intercom station — mount, wire, configure | each | 2.0 hr |
   | Software programming — per door | each | 0.5 hr |

   AUDIO VISUAL LABOR UNITS:
   | Task | Unit | Labor Hours |
   |------|------|-------------|
   | Flat panel display — wall mount, connect, configure | each | 2.0 hr |
   | Projector and screen — ceiling mount, connect, align | each | 4.0 hr |
   | Ceiling speaker — install, wire, aim | each | 0.75 hr |
   | Wall speaker — install, wire | each | 1.0 hr |
   | DSP/Amplifier — rack mount, configure, tune | each | 3.0 hr |
   | Control panel/touch panel — mount, wire, program | each | 3.0 hr |
   | Video conferencing system — install, configure, test | each | 6.0 hr |
   | AV rack — build, wire, terminate, test | each | 16.0 hr |
   | Digital signage player — mount, connect, configure | each | 1.0 hr |
   | Wireless presentation system — install, configure | each | 1.5 hr |

   INTRUSION DETECTION LABOR UNITS:
   | Task | Unit | Labor Hours |
   |------|------|-------------|
   | PIR motion detector — mount and wire | each | 0.75 hr |
   | Door/window contact — install and wire | each | 0.50 hr |
   | Glass break sensor — mount and wire | each | 0.50 hr |
   | Intrusion panel — mount, wire, program | each | 6.0 hr |
   | Keypad — mount, wire, configure | each | 1.0 hr |
   | Interior siren/strobe — mount and wire | each | 0.75 hr |
   | Exterior siren/strobe — mount and wire | each | 1.5 hr |
   | Cellular communicator — install and activate | each | 1.0 hr |

   FIRE ALARM LABOR UNITS:
   | Task | Unit | Labor Hours |
   |------|------|-------------|
   | Smoke detector (addressable) — mount, wire, address | each | 0.65 hr |
   | Heat detector (addressable) — mount, wire, address | each | 0.65 hr |
   | Pull station — mount, wire, address | each | 0.75 hr |
   | Horn/strobe (wall) — mount, wire, address | each | 0.80 hr |
   | Horn/strobe (ceiling) — mount, wire, address | each | 0.90 hr |
   | Speaker/strobe (voice evac) — mount, wire, address | each | 1.0 hr |
   | Duct smoke detector — mount, wire, address, remote test/reset | each | 2.5 hr |
   | FACP — mount, wire, program, test | each | 16.0 hr |
   | Annunciator — mount, wire, configure | each | 3.0 hr |
   | NAC extender/booster — mount, wire | each | 2.0 hr |
   | Monitor module — install and wire | each | 0.50 hr |
   | Control module (relay) — install and wire | each | 0.75 hr |
   | 3/4" EMT conduit for FA circuits | per 100 ft | 4.0 hr |
   | Fire alarm wire pulling (per circuit) | per 100 ft | 1.5 hr |

   GENERAL / OVERHEAD LABOR:
   | Task | Unit | Labor Hours |
   |------|------|-------------|
   | Project mobilization/demobilization | per project | 8.0 hr |
   | Telecom room build-out (per room, general) | each | 8.0 hr |
   | Final testing and commissioning — structured cabling | per 100 drops | 8.0 hr |
   | Final testing and commissioning — fire alarm | per device loop | 4.0 hr |
   | Final testing and commissioning — access control | per door | 0.5 hr |
   | As-built documentation | per project | 8.0-16.0 hr |
   | Punch list / warranty walk | per project | 8.0 hr |

   LABOR ADJUSTMENT FACTORS (note these to the PM):
   - Working above 10 ft (ladder/lift required): multiply by 1.25
   - Existing/occupied building: multiply by 1.15
   - Concrete/masonry wall penetrations: add 0.5 hr per penetration
   - Union labor jurisdiction: check local rates and productivity factors

   **OFF-SHIFT / AFTER-HOURS WORK ADJUSTMENTS** — Apply these based on the work shift indicated above:

   SHIFT DIFFERENTIAL RATE MULTIPLIERS:
   | Shift | Typical Hours | Rate Premium | Productivity Factor | Effective Cost Multiplier |
   |-------|---------------|-------------|--------------------|--------------------------|
   | 1st Shift (Standard) | 7:00AM – 3:30PM | Base rate (1.0×) | 100% productivity | 1.0× |
   | 2nd Shift | 3:00PM – 11:30PM | Base + 10-15% differential | 90% productivity | ~1.20-1.28× |
   | 3rd Shift / Overnight | 11:00PM – 7:30AM | Base + 15-20% differential | 80-85% productivity | ~1.35-1.50× |
   | Saturday | 8 hrs | 1.5× base (OT) | 95% productivity | ~1.58× |
   | Sunday | 8 hrs | 2.0× base (DT) | 90% productivity | ~2.22× |
   | Holiday | 8 hrs | 2.0-2.5× base | 85% productivity | ~2.35-2.94× |
   | 4/10s (Mon-Thurs) | 10 hr/day | 1.0× for 8 hrs + 1.5× for 2 hrs OT/day | 95% avg | ~1.10× |
   | Split Shift | Varies | Base + coordination premium | 75-85% productivity | ~1.30-1.45× |

   OFF-SHIFT COST IMPACTS — Factor these into the estimate:
   - **Shift differential pay**: Additional hourly premium on top of base/prevailing wage rate
   - **Overtime (OT)**: 1.5× base rate after 8 hrs/day or 40 hrs/week (fringe stays at straight-time for prevailing wage)
   - **Double-time (DT)**: 2.0× base rate for Sundays, holidays, or 7th consecutive day worked
   - **Reduced productivity**: Night work is inherently less productive — apply efficiency loss factor
   - **Supervision premium**: Foreman/lead tech may require additional premium for off-shift

   OFF-SHIFT SITE CONDITIONS TO ACCOUNT FOR:
   - Security escort fees — some facilities require paid security to accompany after-hours crews ($50-$100/hr)
   - Building access coordination — key/badge management, alarm system deactivation
   - Temporary lighting — work lights for poorly lit areas at night (cost + setup time)
   - HVAC availability — building HVAC may be off during off-hours (extreme temps affect productivity)
   - Noise restrictions — no hammer drilling, sawing, or loud tools during certain hours (adjacent occupied spaces)
   - Elevator availability — may be locked out after hours, require operator or manual freight key
   - Loading dock hours — material deliveries may be restricted to daytime only
   - Parking — different rules/availability for off-shift crews
   - Emergency response time — reduced site staff means slower injury/incident response

   SHIFT WORK SCHEDULING NOTES FOR PM:
   - 2nd/3rd shift crews often need 1-2 days of overlap with 1st shift for coordination
   - Testing and commissioning typically MUST happen during normal business hours (stakeholder availability)
   - Fire alarm system testing must coordinate with building management and monitoring company
   - Weekend work in occupied buildings requires advance notice to tenants/management
   - Mixed-shift projects should identify which phases are off-shift vs standard

   LABOR SUMMARY — Produce the following:
   a) Calculate total labor hours per discipline using the units above × device counts
   b) Calculate total labor hours per MDF/IDF room
   c) Provide a grand total labor hours for the project
   d) Estimate crew size and duration (assume 8-hour days, 2-person crew minimum for safety)
   e) Break out labor into phases: Rough-In, Trim/Termination, Programming/Commissioning, Testing
   f) If off-shift: show base labor cost at standard rate vs adjusted off-shift cost side by side

9. **SPECIAL EQUIPMENT, CONDITIONS & SUBCONTRACTOR CALLOUTS** — This section is MANDATORY. Scan the documents for ANY tasks that require special tools, equipment, materials, or subcontracted labor. Flag each item with a ⚠️ marker. Look for:

   HEAVY EQUIPMENT / RENTALS:
   - Scissor lift — interior ceiling work above 10 ft (note: check floor load capacity for slab-on-grade vs elevated decks)
   - Boom lift / articulating lift — exterior camera mounts, exterior cable runs, building-mounted equipment above 20 ft
   - Bucket truck — pole-mounted cameras, aerial cable runs, building-mounted equipment
   - Forklift — equipment delivery, rack staging, material handling
   - Trencher — underground conduit runs between buildings, parking lot crossings
   - Directional boring / horizontal directional drill (HDD) — road crossings, parking lot crossings, landscaped areas (no-dig requirement)
   - Mini excavator — deep trench runs, utility crossings, duct bank installation
   - Concrete saw / saw cutting — cutting concrete for underground conduit, slab penetrations, curb crossings
   - Core drill — concrete wall/floor penetrations, CMU block penetrations, rated assembly penetrations
   - Cable puller / tugger — long conduit runs (over 150 ft), large cable bundles, backbone pulls
   - Generator — temporary power for remote installations, exterior work areas

   SPECIALTY TOOLS / EQUIPMENT:
   - Fusion splicer — fiber optic splicing (own or rent, plus certified operator)
   - OTDR (Optical Time Domain Reflectometer) — fiber certification testing
   - Cable certifier (Fluke DSX or equivalent) — Cat 6/6A certification per TIA
   - Thermal imager — verifying HVAC in telecom rooms, hot spot detection
   - Fire alarm programmer / service tool — manufacturer-specific (Notifier, EST, Simplex, etc.)
   - Access control programming laptop — manufacturer-specific software (Lenel, Genetec, S2, Brivo, etc.)
   - CCTV camera aiming/focus tool — for long-distance lens adjustment
   - Hydraulic knockout punch — panel/backbox knockouts in existing enclosures
   - Conduit bender (hand, mechanical, or hydraulic) — based on conduit size (hand < 1-1/4", mech/hydraulic > 1-1/4")
   - Crimping/pressing tools — for specific connector or compression fitting types (BNC, F-type, RJ-45)

   SPECIAL MATERIALS (often missed in estimates):
   - Underground / direct burial conduit (Schedule 40/80 PVC, HDPE)
   - Duct bank materials (spacers, concrete encasement, warning tape, tracer wire)
   - Underground pull boxes / handholes
   - Bollards for exterior equipment protection (cameras, pull boxes)
   - Pole foundations — concrete pier, base plate, anchor bolts
   - Weatherproof junction boxes — NEMA 3R/4/4X rated
   - Plenum-rated cable (CMP/OFNP) — verify ceiling return air plenums vs ducted returns
   - Riser-rated cable (CMR/OFNR) — for vertical shaft runs between floors
   - LSZH (Low Smoke Zero Halogen) cable — if specified or required by occupancy
   - Seismic bracing — for racks, cable tray, and overhead equipment in seismic zones
   - Fire-rated cable (CI/FPL) — for fire alarm circuits in some jurisdictions
   - Armored / MC cable — if required for exposed runs or per spec

   PERMITS & INSPECTIONS:
   - City/county excavation/trenching permit
   - Right-of-way permit (if crossing public property)
   - Hot work permit (if welding/brazing near existing systems)
   - Fire alarm permit and required inspections (AHJ)
   - Low voltage permit (where required by jurisdiction)
   - Roof penetration approval (if mounting equipment on roof)
   - OSHA confined space entry (if applicable to any telecom rooms)

   SUBCONTRACTOR / SPECIALTY LABOR:
   - Concrete cutting / core drilling subcontractor
   - Trenching / excavation subcontractor
   - Directional boring subcontractor
   - Electrical subcontractor — for dedicated circuits, panels, disconnects for LV equipment
   - Fire stopping / firesafe subcontractor — UL-listed systems in rated assemblies
   - Structural engineer — if adding roof loads, pole foundations, or wall-mounted equipment > 100 lbs
   - Painting / patching — wall repair after surface-mount conduit or device relocation
   - Roofing subcontractor — for roof penetrations to maintain warranty
   - Elevator subcontractor — required for elevator cab equipment, phone, camera, card reader

   SITE CONDITIONS TO FLAG:
   - Asbestos / lead paint — pre-1980 buildings, require abatement before penetrations
   - Above-ceiling conditions — accessible vs hard lid, existing congestion, clearance restrictions
   - Existing building occupancy — working around tenants, restricted hours, security requirements
   - High-security areas — SCIFs, data centers, vaults requiring special clearance
   - Outdoor exposure — weather delays, seasonal temperature restrictions for concrete/adhesives
   - Parking lot / road crossings — traffic control, night work, flagging requirements
   - Roof access — safety requirements, fall protection, guardrail systems
   - Attic/crawl space access — limited clearance, hazardous conditions
   - Historic buildings — preservation requirements limiting mounting methods and pathways

   For each special item identified, provide:
   - What triggered it (specific location, drawing reference, or scope item)
   - Estimated rental duration or subcontractor scope
   - Impact on schedule (add days/weeks)
   - Approximate cost impact category: $ (under $1K), $$ ($1K-$5K), $$$ ($5K-$25K), $$$$ (over $25K)

10. **TRAVEL & PER DIEM EXPENSES** — If a project location was provided, evaluate whether travel expenses apply. For projects 100+ miles from the contractor's office, calculate out-of-town expenses using the following GSA (General Services Administration) federal per diem rate structure:

   TRAVEL EXPENSE CALCULATION:
   a) Determine if this is an out-of-town project (100+ miles from nearest office)
   b) Based on the total labor hours calculated above, determine:
      - Total on-site work days (labor hours ÷ 8 hours/day)
      - Number of overnight stays required
      - Number of mobilization/demobilization trips (typically one per phase: Rough-In, Trim, Programming, Testing/Commissioning)

   GSA PER DIEM RATES (use current standard rates, adjust for project city if known):
   | Expense Category | Standard Rate | High-Cost City Rate | Notes |
   |------------------|---------------|---------------------|-------|
   | Lodging (hotel) | $107/night | $150-$300/night | Use actual GSA rate for project city/county if known |
   | M&IE (Meals & Incidental Expenses) | $68/day | $74-$79/day | Breakfast, lunch, dinner, tips, misc |
   | First & Last Day M&IE | 75% of full rate | 75% of full rate | Travel days are reduced rate |
   | Rental car | $75/day | $75-$100/day | Mid-size SUV for tool/material transport |
   | Fuel / mileage | $0.70/mile | $0.70/mile | IRS standard mileage rate |
   | Airfare (if 500+ miles) | $400-$800 RT | $400-$800 RT | Per person, round trip, economy |
   | Checked bags (tools) | $35-$70 RT | $35-$70 RT | Tool cases, test equipment |
   | Parking at jobsite | $0-$25/day | $15-$40/day | Varies by urban vs suburban |

   TRAVEL COST CALCULATION TABLE — Produce a table like this:
   | Phase | Crew Size | On-Site Days | Nights | Lodging | M&IE | Vehicle | Phase Total |
   |-------|-----------|-------------|--------|---------|------|---------|-------------|
   | Rough-In | X | X | X | $X | $X | $X | $X |
   | Trim/Term | X | X | X | $X | $X | $X | $X |
   | Programming | X | X | X | $X | $X | $X | $X |
   | Testing/Commissioning | X | X | X | $X | $X | $X | $X |
   | Punch List | X | X | X | $X | $X | $X | $X |
   | **TOTAL** | | | | **$X** | **$X** | **$X** | **$X** |

   ADDITIONAL TRAVEL CONSIDERATIONS:
   - Weekend return trips home (for jobs > 2 weeks, budget RT airfare/mileage every 2 weeks)
   - Tool shipping costs if flying (heavy test equipment: fusion splicer, OTDR, Fluke, fire alarm tools)
   - Per diem adjustments for extended stays (hotels may offer weekly rates for 7+ nights — factor 15-25% discount)
   - Multiple mobilization trips if phases are separated by weeks/months
   - Project manager site visits (separate from install crew, typically 1-2 day trips)

   If no project location is provided, include a note: "⚠️ Project location not specified — unable to calculate travel expenses. If this project is 100+ miles from your office, add travel costs."

11. **PREVAILING WAGE / DAVIS-BACON WAGE DETERMINATION** — If prevailing wage is indicated, this section is MANDATORY. Apply DOL (Department of Labor) wage classifications and rates to all labor calculations.

   WAGE CLASSIFICATION MAPPING FOR ELV TRADES:
   Identify the correct DOL wage classification for each type of work. Common classifications:

   | ELV Task | DOL Wage Classification | Typical WD Code |
   |----------|------------------------|------------------|
   | Structured Cabling (install, terminate, test) | Sound & Communication Installer / Telecom Technician | SCOM / TELE |
   | CCTV (camera install, NVR, programming) | Sound & Communication Installer | SCOM |
   | Access Control (readers, panels, hardware) | Sound & Communication Installer | SCOM |
   | Fire Alarm (devices, panels, wiring) | Electrician (Inside Wireman) — required in many jurisdictions | ELEC |
   | Intrusion Detection (sensors, panels) | Sound & Communication Installer | SCOM |
   | Audio Visual (speakers, displays, DSP) | Sound & Communication Installer | SCOM |
   | Conduit installation (EMT, rigid) | Electrician (Inside Wireman) | ELEC |
   | Cable tray installation | Electrician or Ironworker (varies by jurisdiction) | ELEC / IRON |
   | Trenching / Underground work | Laborer | LABR |
   | Equipment operation (lifts, boring) | Operating Engineer | OPER |
   | Firestopping | Laborer or Carpenter (varies) | LABR / CARP |
   | General material handling | Laborer | LABR |
   | Project Manager / Foreman (on-site) | Foreman rate (typically 10-15% above journeyman) | FORE |

   WAGE RATE STRUCTURE — For each classification, provide:
   | Classification | Base Rate/hr | Fringe Benefits/hr | Loaded Rate/hr |
   |----------------|-------------|--------------------|-----------------|
   | Electrician (Inside Wireman) | $XX.XX | $XX.XX | $XX.XX |
   | Sound & Communication Installer | $XX.XX | $XX.XX | $XX.XX |
   | Telecom Technician | $XX.XX | $XX.XX | $XX.XX |
   | Laborer | $XX.XX | $XX.XX | $XX.XX |
   | Operating Engineer | $XX.XX | $XX.XX | $XX.XX |
   | Foreman | $XX.XX | $XX.XX | $XX.XX |

   Use the project location to determine the correct county/locality wage rates. If the exact WD rates are not known, use representative national averages:
   - Electrician (Inside Wireman): Base $45-$55/hr + Fringe $25-$35/hr = Loaded $70-$90/hr
   - Sound & Comm Installer: Base $35-$48/hr + Fringe $18-$28/hr = Loaded $53-$76/hr
   - Telecom Technician: Base $30-$42/hr + Fringe $15-$25/hr = Loaded $45-$67/hr
   - Laborer: Base $22-$32/hr + Fringe $15-$22/hr = Loaded $37-$54/hr
   - Operating Engineer: Base $40-$55/hr + Fringe $25-$35/hr = Loaded $65-$90/hr

   FRINGE BENEFIT COMPONENTS (typical):
   - Health & Welfare insurance
   - Pension / retirement fund
   - Vacation / holiday pay
   - Training / apprenticeship fund
   - FICA, FUTA, SUTA (employer payroll taxes)
   - Workers' compensation insurance
   - General liability insurance allocation

   APPRENTICE GUIDELINES:
   - Apprentice-to-journeyman ratios vary by trade and jurisdiction (typically 1:1 to 1:3)
   - Apprentice rates are a percentage of journeyman rate based on period (1st period: 50%, 2nd: 55%, etc.)
   - Must be registered in approved apprenticeship program
   - Flag any tasks where apprentice labor can reduce costs

   CERTIFIED PAYROLL REQUIREMENTS:
   - Weekly certified payroll (WH-347) required for Davis-Bacon projects
   - All workers must be classified correctly — misclassification is a federal violation
   - Overtime: 1.5x base rate after 40 hours/week (fringe stays the same)
   - Penalty for underpayment: back wages + liquidated damages + potential debarment

   LABOR COST SUMMARY — Apply loaded rates to all labor hours:
   | Classification | Hours | Loaded Rate | Total Cost |
   |----------------|-------------|-------------|------------|
   | Electrician | X hrs | $XX.XX/hr | $X,XXX |
   | Sound & Comm | X hrs | $XX.XX/hr | $X,XXX |
   | Laborer | X hrs | $XX.XX/hr | $X,XXX |
   | Operating Eng | X hrs | $XX.XX/hr | $X,XXX |
   | Foreman | X hrs | $XX.XX/hr | $X,XXX |
   | **TOTAL LABOR COST** | **X hrs** | | **$XX,XXX** |

   If prevailing wage is NOT selected, skip this section and note: "Standard (non-prevailing) labor rates apply. No certified payroll required."

12. **SCHEDULE OF VALUES (SOV)** — Generate a complete Schedule of Values for this project. The SOV is used for progress billing via AIA G702/G703 payment applications. Structure the SOV as follows:

   SOV FORMAT — Each line item should include:
   | Item # | Description of Work | Scheduled Value | Material | Labor | Equipment/Sub |
   |--------|---------------------|-----------------|----------|-------|---------------|

   SOV LINE ITEMS — Organize by CSI Division and discipline. Include at minimum:

   GENERAL CONDITIONS / MOBILIZATION:
   | Item | Description |
   |------|-------------|
   | 01-001 | Mobilization / Demobilization |
   | 01-002 | Project Management & Supervision |
   | 01-003 | As-Built Documentation |
   | 01-004 | Permits & Inspections |
   | 01-005 | Bonds & Insurance (if applicable) |
   | 01-006 | Travel & Per Diem (if out of town) |
   | 01-007 | Temporary Facilities / Storage |

   DIVISION 27 — COMMUNICATIONS (Structured Cabling):
   | Item | Description |
   |------|-------------|
   | 27-001 | MDF/IDF Room Build-Out (per room — list each) |
   | 27-002 | Equipment Racks & Cabinets |
   | 27-003 | Horizontal Cabling — Rough-In (Cat 6/6A) |
   | 27-004 | Horizontal Cabling — Termination & Testing |
   | 27-005 | Backbone / Riser Cabling (Fiber & Copper) |
   | 27-006 | Wireless Access Points (WAP) |
   | 27-007 | Cable Tray & J-Hook Pathway |
   | 27-008 | Conduit & Raceway |
   | 27-009 | Grounding & Bonding (TMGB/TGB/TBB) |
   | 27-010 | Firestopping |
   | 27-011 | Patch Panels, Patch Cords & Cable Management |
   | 27-012 | Labeling & Documentation |
   | 27-013 | Cable Certification Testing |

   DIVISION 28 — ELECTRONIC SAFETY & SECURITY:
   | Item | Description |
   |------|-------------|
   | 28-001 | CCTV — Camera Installation (Interior) |
   | 28-002 | CCTV — Camera Installation (Exterior) |
   | 28-003 | CCTV — NVR/VMS & Head-End Equipment |
   | 28-004 | CCTV — Monitors & Video Wall |
   | 28-005 | CCTV — Cabling & Pathway |
   | 28-006 | CCTV — Programming & Commissioning |
   | 28-007 | Access Control — Door Hardware & Readers |
   | 28-008 | Access Control — Panels & Power Supplies |
   | 28-009 | Access Control — Cabling & Pathway |
   | 28-010 | Access Control — Software & Programming |
   | 28-011 | Access Control — Commissioning & Testing |
   | 28-012 | Intrusion Detection — Sensors & Devices |
   | 28-013 | Intrusion Detection — Panels & Keypads |
   | 28-014 | Intrusion Detection — Cabling & Programming |
   | 28-015 | Fire Alarm — Initiating Devices (Smokes, Heats, Pulls) |
   | 28-016 | Fire Alarm — Notification Devices (Horn/Strobes, Speakers) |
   | 28-017 | Fire Alarm — FACP & Annunciators |
   | 28-018 | Fire Alarm — Modules (Monitor & Control) |
   | 28-019 | Fire Alarm — Conduit & Wiring |
   | 28-020 | Fire Alarm — Programming & Commissioning |
   | 28-021 | Fire Alarm — AHJ Inspection & Acceptance Testing |

   DIVISION 27 — AUDIO VISUAL:
   | Item | Description |
   |------|-------------|
   | 27-050 | AV — Displays & Projectors |
   | 27-051 | AV — Audio (Speakers, Amps, DSP) |
   | 27-052 | AV — Control Systems |
   | 27-053 | AV — Video Conferencing |
   | 27-054 | AV — Rack Build & Wiring |
   | 27-055 | AV — Cabling & Pathway |
   | 27-056 | AV — Programming & Commissioning |
   | 27-057 | AV — Digital Signage |

   SPECIAL CONDITIONS (add if applicable):
   | Item | Description |
   |------|-------------|
   | SC-001 | Underground / Exterior Conduit & Trenching |
   | SC-002 | Core Drilling & Concrete Work |
   | SC-003 | Aerial Cable Runs / Pole Mounts |
   | SC-004 | Equipment Rental (Lifts, Boring, etc.) |
   | SC-005 | Subcontractor — Electrical |
   | SC-006 | Subcontractor — Excavation/Boring |
   | SC-007 | Subcontractor — Firestopping |

   CLOSEOUT:
   | Item | Description |
   |------|-------------|
   | CL-001 | Punch List |
   | CL-002 | Owner Training |
   | CL-003 | Warranty Documentation |
   | CL-004 | Final As-Builts & O&M Manuals |

   SOV GUIDELINES FOR THE PM:
   - **Retainage**: Typically 10% held until substantial completion, reduced to 5% at 50% complete (verify contract terms)
   - **Front-loading**: Distribute values so early phases (mobilization, rough-in) carry slightly higher material values for cash flow
   - **Granularity**: Break large-value items into sub-items when a single line exceeds 15% of total contract value
   - **Change Orders**: Reserve a contingency line or note that COs will be added as separate SOV line items
   - **Stored Materials**: If contract allows billing for stored materials, note which line items may have early material procurement
   - **Percentage Complete**: Each line item should be billable by percentage complete per month
   - **Balancing**: Total of all SOV line items MUST equal the total contract value

   For each SOV line item, calculate the Scheduled Value using:
   - Material cost (from the Overall Material Summary)
   - Labor cost (from the Labor Summary, with shift/prevailing wage adjustments)
   - Equipment rental allocation
   - Subcontractor cost allocation
   - Proportional share of General Conditions

   Produce the SOV as a complete table ready for direct entry into an AIA G703 form.

13. **PRICED ESTIMATE SUMMARY** — Using the PRICING CONFIGURATION data provided above, calculate the complete project cost. This is MANDATORY — produce ACTUAL DOLLAR AMOUNTS, not placeholders.

   MATERIAL COST BREAKDOWN:
   | Category | Item Count | Material Cost | Markup (${state.markup.material}%) | Sell Price |
   |----------|-----------|---------------|--------|------------|
   | (one row per major material category) |

   LABOR COST BREAKDOWN:
   | Classification | Hours | Loaded Rate | Labor Cost | Markup (${state.markup.labor}%) | Sell Price |
   |----------------|-------|-------------|------------|--------|------------|
   | (one row per labor classification) |

   PROJECT COST SUMMARY:
   | Cost Category | Cost | Markup | Sell Price |
   |---------------|------|--------|------------|
   | Total Materials | $X,XXX | ${state.markup.material}% | $X,XXX |
   | Total Labor | $X,XXX | ${state.markup.labor}% | $X,XXX |
   | Equipment Rentals | $X,XXX | ${state.markup.equipment}% | $X,XXX |
   | Subcontractors | $X,XXX | ${state.markup.subcontractor}% | $X,XXX |
   | Travel & Per Diem | $X,XXX | — | $X,XXX |
   | **TOTAL PROJECT PRICE** | **$XX,XXX** | | **$XX,XXX** |

   Include notes on:
   - What's included vs excluded
   - Assumptions made
   - Contingency recommendation (typically 5-10%)
   - Payment terms suggestion

14. **CODE COMPLIANCE SUMMARY** — Dedicated summary section:
   - Total issues found: 🔴 Critical / 🟡 Warning / 🔵 Info
   - Each issue with code reference, location, and recommended action
   - Items requiring AHJ approval or inspection
   - Permits likely required (fire alarm, low voltage, electrical)

15. Analysis observations:
   - Device counts by type, per sheet/floor
   - Cable/conduit pathway observations
   - Spec-to-plan conflicts
   - Missing info requiring RFIs
   - Scope gaps or ambiguities
   - Confidence level for each count

16. Specific, actionable RFI questions with code references where applicable.
17. If known quantities provided, compare and flag deviations over 10%.

FORMAT REQUIREMENTS:
- Use markdown headers (##) to organize each major section
- Follow this exact section order:
  1. ## CODE & STANDARDS COMPLIANCE REVIEW
  2. ## MDF/IDF MATERIAL BREAKDOWN (per room)
  3. ## OVERALL MATERIAL SUMMARY (with unit prices and extended costs)
  4. ## LABOR SUMMARY (hours by discipline, by phase, with loaded rates and dollar totals)
  5. ## PREVAILING WAGE DETERMINATION (if applicable — classifications, rates, labor cost)
  6. ## SPECIAL EQUIPMENT & CONDITIONS (⚠️ flags and cost impact)
  7. ## TRAVEL & PER DIEM ESTIMATE (cost table by phase)
  8. ## SCHEDULE OF VALUES (SOV) — AIA G703 format with dollar amounts
  9. ## PRICED ESTIMATE SUMMARY (material + labor + equipment + sub + markup = total price)
  10. ## CODE COMPLIANCE SUMMARY (issue count table)
  11. ## OBSERVATIONS & ANALYSIS
  12. ## RFIs
- Use tables where possible for readability
- ALL cost tables must show ACTUAL DOLLAR AMOUNTS calculated from the pricing data provided
- Tag code issues: 🔴 CRITICAL, 🟡 WARNING, 🔵 INFO
- Tag special equipment: ⚠️ with cost impact ($, $$, $$$, $$$$)
- Include confidence percentage for each major count
- Reference sheet numbers, room numbers, device types
- Detailed enough for PM procurement, labor planning, wage compliance, progress billing, travel budgeting, equipment scheduling, and subcontractor coordination`;


  return prompt;
}

async function callGeminiAPI(progressCallback) {
  // Gather all files with raw File objects
  const allFileEntries = [
    ...state.legendFiles.map(f => ({ ...f, category: "Symbol Legend" })),
    ...state.planFiles.map(f => ({ ...f, category: "Floor Plan" })),
    ...state.specFiles.map(f => ({ ...f, category: "Specification" })),
    ...state.addendaFiles.map(f => ({ ...f, category: "Addendum" })),
  ];

  const filesToSend = allFileEntries.filter(f => f.rawFile);

  progressCallback(5, "Validating files…");

  // ── File size validation pass ──
  let totalPayloadBytes = 0;
  const oversizedFiles = [];
  for (const entry of filesToSend) {
    if (entry.rawFile.size > MAX_FILE_SIZE) {
      oversizedFiles.push(`${entry.name} (${(entry.rawFile.size / 1048576).toFixed(1)}MB)`);
    }
    totalPayloadBytes += entry.rawFile.size;
  }
  if (oversizedFiles.length > 0) {
    console.warn(`[SmartPlans] Oversized files will be skipped: ${oversizedFiles.join(', ')}`);
  }

  progressCallback(10, "Preparing files for analysis…");

  // Convert files to base64 for Gemini inline_data
  const parts = [];
  parts.push({ text: buildGeminiPrompt() });

  const supportedTypes = [
    "application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif",
    "image/tiff", "text/plain",
  ];

  let fileIdx = 0;
  let runningPayload = 0;
  const skippedFiles = [];

  for (const entry of filesToSend) {
    fileIdx++;
    const pct = 10 + Math.round((fileIdx / filesToSend.length) * 30);
    progressCallback(pct, `Encoding ${entry.category}: ${entry.name}…`);

    // Check if adding this file would exceed total payload limit
    if (runningPayload + entry.rawFile.size > MAX_TOTAL_PAYLOAD) {
      skippedFiles.push({ name: entry.name, reason: 'payload_limit' });
      parts.push({ text: `[File "${entry.name}" skipped — total payload limit reached. File size: ${(entry.rawFile.size / 1048576).toFixed(1)}MB]` });
      continue;
    }

    const { base64, mimeType, skipped, reason } = await fileToBase64(entry.rawFile);

    if (skipped) {
      skippedFiles.push({ name: entry.name, reason });
      parts.push({ text: `[File "${entry.name}" skipped — ${reason === 'too_large' ? 'exceeds 50MB limit' : 'read error'}]` });
      continue;
    }

    runningPayload += entry.rawFile.size;

    // Detect MIME type from extension for reliability
    let finalMime = mimeType;
    const ext = entry.name.toLowerCase().split('.').pop();
    const mimeMap = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', tif: 'image/tiff', tiff: 'image/tiff', txt: 'text/plain', webp: 'image/webp' };
    if (mimeMap[ext]) finalMime = mimeMap[ext];

    parts.push({ text: `\n--- FILE: ${entry.name} (${entry.category}) ---` });

    if (supportedTypes.some(t => finalMime.startsWith(t.split("/")[0])) || finalMime === "application/pdf") {
      parts.push({ inline_data: { mime_type: finalMime, data: base64 } });

      // ── PDF Text Pre-Extraction for Specs (dual-channel accuracy boost) ──
      // Specifications are text-heavy documents. Extracting text locally
      // and including it alongside the PDF gives Gemini both visual + text
      // data channels, dramatically improving spec interpretation accuracy.
      if (finalMime === 'application/pdf' && entry.category === 'Specification' && typeof pdfjsLib !== 'undefined') {
        try {
          const extractedText = await extractPDFText(entry.rawFile);
          if (extractedText && extractedText.length > 100) {
            parts.push({ text: `\n[EXTRACTED TEXT FROM ${entry.name} — use alongside the PDF for cross-reference]\n${extractedText.substring(0, 15000)}` });
            console.log(`[SmartPlans] Extracted ${extractedText.length} chars from ${entry.name}`);
          }
        } catch (pdfErr) {
          console.warn(`[SmartPlans] PDF text extraction failed for ${entry.name}:`, pdfErr.message);
        }
      }
    } else {
      parts.push({ text: `[File type ${finalMime} not supported for direct analysis. Filename: ${entry.name}]` });
    }
  }

  // Append skip report to prompt if any files were skipped
  if (skippedFiles.length > 0) {
    parts.push({ text: `\n\n⚠ NOTE: ${skippedFiles.length} file(s) were skipped due to size limits. The analysis is based on the files that were successfully uploaded. Skipped: ${skippedFiles.map(f => f.name).join(', ')}` });
  }

  progressCallback(45, "Sending documents to Gemini AI…");

  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 32768,
    },
    _model: GEMINI_CONFIG.model,
    _brainSlot: GEMINI_CONFIG._currentSlot,
  };

  // ── Retry with exponential backoff + timeout ──
  const response = await fetchWithRetry(GEMINI_CONFIG.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    _timeout: API_TIMEOUT_MS,
    _apiKeyRotator: () => GEMINI_CONFIG.rotateKey(),
  }, MAX_RETRIES);

  progressCallback(80, "Processing AI response…");

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`API Error: ${response.status} — ${errText.substring(0, 200)}`);
  }

  // ── Read response (SSE streaming or JSON) ──
  const contentType = response.headers.get('content-type') || '';
  let text = '';

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
            const cp = chunk?.candidates?.[0]?.content?.parts || [];
            for (const p of cp) { if (p.text && !p.thought) text += p.text; }
          } catch (e) { console.warn('Silent error:', e); }
        }
      }
    }
  } else {
    const data = await response.json();
    progressCallback(95, "Compiling results…");
    const allParts = data?.candidates?.[0]?.content?.parts || [];
    text = allParts.filter(p => p.text && !p.thought).map(p => p.text).join("\n") || "";
  }

  progressCallback(95, "Compiling results…");
  if (!text || text.length < 100) {
    throw new Error("AI returned an empty or incomplete response. Please try again.");
  }
  return text;
}


// ═══════════════════════════════════════════════════════════════
// ACCURACY VALIDATION ENGINE
// ═══════════════════════════════════════════════════════════════

// ── 1. Automated Math Validation ──────────────────────────────
// Scans the AI analysis for material/labor tables and verifies
// that Qty × Unit Cost = Extended Cost within $1 tolerance.
// Uses header-aware column detection to avoid false positives
// from markup and sell price columns.
function validateAnalysisMath(analysisText) {
  if (!analysisText) return { issues: [], passed: true };

  const issues = [];
  const lines = analysisText.split('\n');

  // ── Parse tables by detecting header rows and mapping columns ──
  let currentHeader = null; // { qtyCol, unitCostCol, extCostCol }
  let headerRowIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('|')) { currentHeader = null; continue; }
    if (line.match(/^[\s|:-]+$/)) continue; // separator row

    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cells.length < 3) continue;

    // ── Detect header rows by looking for column labels ──
    const upperCells = cells.map(c => c.toUpperCase().replace(/[^A-Z0-9 /]/g, ''));
    const qtyColIdx = upperCells.findIndex(c => /^QTY$/.test(c.trim()));
    const unitCostIdx = upperCells.findIndex(c => /UNIT\s*(COST|PRICE)|COST.*UNIT|RATE.*HR|RATE\/HR|DAILY.*COST|UNIT.*COST/.test(c.trim()));
    const extCostIdx = upperCells.findIndex(c => /^EXT\s*(COST)?$|EXTENDED|LABOR\s*COST|TOTAL\s*COST/.test(c.trim()));

    if (qtyColIdx >= 0 && unitCostIdx >= 0 && extCostIdx >= 0) {
      currentHeader = { qtyCol: qtyColIdx, unitCostCol: unitCostIdx, extCostCol: extCostIdx };
      headerRowIdx = i;
      continue;
    }

    // ── If no header context, skip — don't guess ──
    if (!currentHeader) continue;

    // Skip the separator row directly after header
    if (i === headerRowIdx + 1 && line.match(/[:-]{2,}/)) continue;

    // ── Skip summary/subtotal/total rows — they use different math ──
    const rowText = cells.join(' ').toLowerCase();
    if (/subtotal|grand\s*total|total|contingency/.test(rowText)) continue;

    // ── Extract values from known columns ──
    const qtyStr = cells[currentHeader.qtyCol];
    const unitStr = cells[currentHeader.unitCostCol];
    const extStr = cells[currentHeader.extCostCol];
    if (!qtyStr || !unitStr || !extStr) continue;

    // Parse qty — allow comma-formatted numbers, but skip non-numeric
    const qtyMatch = qtyStr.match(/^([\d,]+)$/);
    if (!qtyMatch) continue;
    const qty = parseInt(qtyMatch[1].replace(/,/g, ''));
    if (!qty || qty <= 0) continue;

    // Parse unit cost — extract dollar value
    const unitMatch = unitStr.match(/\$?([\d,]+(?:\.\d{1,2})?)/);
    if (!unitMatch) continue;
    const unitCost = parseFloat(unitMatch[1].replace(/,/g, ''));

    // Parse ext cost — extract dollar value
    const extMatch = extStr.match(/\$?([\d,]+(?:\.\d{1,2})?)/);
    if (!extMatch) continue;
    const extCost = parseFloat(extMatch[1].replace(/,/g, ''));

    const expected = qty * unitCost;

    // Allow $1 tolerance for rounding
    if (Math.abs(expected - extCost) > 1.0 && expected > 0) {
      issues.push({
        line: i + 1,
        content: line.substring(0, 120),
        qty,
        unitCost,
        extCost,
        expected: Math.round(expected * 100) / 100,
        difference: Math.round((extCost - expected) * 100) / 100,
      });
    }
  }

  return {
    issues,
    passed: issues.length === 0,
    total_tables_checked: lines.filter(l => l.includes('|') && l.match(/\$/)).length,
    checked_at: new Date().toISOString(),
  };
}


// ── 2. Section Completeness Check ─────────────────────────────
// Verifies that all 12 required output sections are present
function checkSectionCompleteness(analysisText) {
  if (!analysisText) return { missing: ['ALL'], complete: false, score: 0 };

  const requiredSections = [
    { key: 'code_compliance', patterns: ['CODE & STANDARDS', 'CODE COMPLIANCE'] },
    { key: 'mdf_idf', patterns: ['MDF/IDF', 'MDF/IDF/TR', 'INFRASTRUCTURE'] },
    { key: 'material_summary', patterns: ['MATERIAL SUMMARY', 'OVERALL MATERIAL', 'MATERIAL TAKEOFF', 'MATERIAL BREAKDOWN'] },
    { key: 'labor_summary', patterns: ['LABOR SUMMARY', 'LABOR COST', 'LABOR BREAKDOWN'] },
    { key: 'special_equipment', patterns: ['SPECIAL EQUIPMENT', 'EQUIPMENT & CONDITIONS', 'SUBCONTRACTOR'] },
    { key: 'schedule_of_values', patterns: ['SCHEDULE OF VALUES', 'SOV'] },
    { key: 'cost_summary', patterns: ['PRICED ESTIMATE', 'PROJECT COST', 'ESTIMATE SUMMARY', 'COST SUMMARY'] },
    { key: 'observations', patterns: ['OBSERVATIONS', 'ANALYSIS'] },
    { key: 'rfis', patterns: ['RFI'] },
  ];

  const upper = analysisText.toUpperCase();
  const found = [];
  const missing = [];

  for (const section of requiredSections) {
    const isPresent = section.patterns.some(p => upper.includes(p));
    if (isPresent) {
      found.push(section.key);
    } else {
      missing.push(section.key);
    }
  }

  return {
    found,
    missing,
    complete: missing.length === 0,
    score: Math.round((found.length / requiredSections.length) * 100),
    checked_at: new Date().toISOString(),
  };
}


// ── 3. AI Verification Pass (Second Brain Cross-Check) ────────
// After the primary analysis, sends it back for focused validation.
// Catches: miscounts, math errors, missing items, inconsistent totals.
async function runVerificationPass(primaryAnalysis, progressCallback) {
  if (!primaryAnalysis || primaryAnalysis.length < 500) return null;

  const verificationPrompt = `You are a SENIOR QUALITY ASSURANCE AUDITOR reviewing an ELV construction estimate that was just generated by an AI estimator. This estimate will be used for actual project bidding — errors could cost hundreds of thousands of dollars.

YOUR TASK: Audit the following AI-generated estimate for accuracy, completeness, and internal consistency. You are NOT regenerating the estimate — you are VERIFYING it.

CHECK THE FOLLOWING:
1. **MATH VERIFICATION**: For every table with Qty × Unit Cost = Extended Cost, verify the multiplication is correct. Flag ANY math errors.
2. **CROSS-REFERENCE TOTALS**: Verify that section subtotals add up to the grand total in the SOV / Estimate Summary.
3. **QUANTITY CONSISTENCY**: Check that device counts mentioned in the observations match the quantities in the material tables. Flag if a count says "48 cameras" but the material table shows 42.
4. **COST REASONABLENESS**: Flag any unit costs that seem unreasonable (e.g., a Cat6A cable drop priced at $5,000 or a camera at $15). Use your knowledge of typical ELV pricing.
5. **MISSING ITEMS**: Check if any standard items are missing for the systems described (e.g., access control system with readers but no controller, CCTV cameras but no NVR, structured cabling without patch panels).
6. **CODE COMPLIANCE**: Verify that the code citations are accurate — correct NFPA/NEC article numbers and requirements.
7. **LABOR HOURS**: Check if the labor hours seem reasonable for the scope described. Flag if a 200-camera project shows only 40 labor hours.
8. **MARKUP CALCULATIONS**: Verify that markup percentages were applied correctly to base costs.

RESPONSE FORMAT:
Respond ONLY in this format. Be concise — only report actual issues found.

## ⚠️ VERIFICATION AUDIT

**Audit Status**: [PASSED ✅ / ISSUES FOUND ⚠️]
**Items Checked**: [number]
**Issues Found**: [number]

### Issues:
(List each issue with severity: 🔴 CRITICAL, 🟡 WARNING, 🔵 INFO)

If no issues are found, respond with:
## ⚠️ VERIFICATION AUDIT
**Audit Status**: PASSED ✅
**Items Checked**: [number]
**Issues Found**: 0
*All calculations, quantities, and code references verified correct.*

--- BEGIN ESTIMATE TO AUDIT ---
${primaryAnalysis.substring(0, 28000)}
--- END ESTIMATE ---`;

  const requestBody = {
    contents: [{ parts: [{ text: verificationPrompt }] }],
    generationConfig: {
      temperature: 0.1, // Very low temp for precise verification
      maxOutputTokens: 4096,
    },
    _model: GEMINI_CONFIG.verificationModel,
    _brainSlot: 1,
  };

  const response = await fetchWithRetry(GEMINI_CONFIG.verificationEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    _timeout: 60000, // 60s timeout for verification
  }, 2); // Only 2 retries for verification

  if (!response.ok) {
    console.warn('[SmartPlans] Verification API returned:', response.status);
    return null;
  }

  // ── Read response (SSE streaming or JSON) ──
  const vContentType = response.headers.get('content-type') || '';
  let text = '';

  if (vContentType.includes('text/event-stream')) {
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
            const cp = chunk?.candidates?.[0]?.content?.parts || [];
            for (const p of cp) { if (p.text && !p.thought) text += p.text; }
          } catch (e) { console.warn('Silent error:', e); }
        }
      }
    }
  } else {
    const data = await response.json();
    const allParts = data?.candidates?.[0]?.content?.parts || [];
    text = allParts.filter(p => p.text && !p.thought).map(p => p.text).join("\n") || "";
  }

  if (text && text.length > 50) {
    console.log('[SmartPlans] ✓ Verification pass completed');
    return text;
  }
  return null;
}


// ═══════════════════════════════════════════════════════════════
// ANALYSIS ANIMATION + API CALL
// ═══════════════════════════════════════════════════════════════

function renderAnalysis(container) {
  // Build brain dashboard HTML
  const brainRows = Object.entries(SmartBrains.BRAINS).map(([key, brain]) => {
    const waveLabels = { 1: 'Document Intelligence', 2: 'Cost Engine', 3: 'Cross-Validation', 4: 'Report Synthesis' };
    return `<div class="brain-row" id="brain-${key}" data-wave="${brain.wave}">
      <span class="brain-emoji">${brain.emoji}</span>
      <span class="brain-name">${brain.name}</span>
      <span class="brain-status" id="brain-status-${key}">⏳ Pending</span>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="analysis-overlay">
      <div class="analysis-ring" id="analysis-ring">
        <div class="analysis-ring-inner">
          <span class="analysis-pct" id="analysis-pct">0%</span>
        </div>
      </div>
      <div class="analysis-title">🧠 27-Brain Drawing Scan Engine v5.0</div>
      <div class="analysis-stage" id="analysis-stage">Initializing 27 specialized AI brains…</div>
      <div class="analysis-bar-track"><div class="analysis-bar-fill" id="analysis-bar"></div></div>
      <div id="upload-progress-container" style="display:none;margin-top:8px;width:100%;max-width:400px;">
        <div id="upload-progress-text" style="font-size:11px;color:var(--text-muted);margin-bottom:4px;text-align:center;"></div>
        <div style="height:4px;background:rgba(0,0,0,0.06);border-radius:2px;overflow:hidden;">
          <div id="upload-progress-bar" style="height:100%;width:0%;background:var(--accent-teal);border-radius:2px;transition:width 0.3s ease;"></div>
        </div>
      </div>

      <div class="brain-dashboard" id="brain-dashboard">
        <div class="brain-wave-header">WAVE 0 — Legend Pre-Processing</div>
        ${Object.entries(SmartBrains.BRAINS).filter(([, b]) => b.wave === 0).map(([key, brain]) =>
    `<div class="brain-row" id="brain-${key}"><span class="brain-emoji">${brain.emoji}</span><span class="brain-name">${brain.name}</span><span class="brain-status" id="brain-status-${key}">⏳</span></div>`
  ).join('')}
        <div class="brain-wave-header">WAVE 1 — First Read</div>
        ${Object.entries(SmartBrains.BRAINS).filter(([, b]) => b.wave === 1).map(([key, brain]) =>
    `<div class="brain-row" id="brain-${key}"><span class="brain-emoji">${brain.emoji}</span><span class="brain-name">${brain.name}</span><span class="brain-status" id="brain-status-${key}">⏳</span></div>`
  ).join('')}
        <div class="brain-wave-header">WAVE 1.5 — Second Read (Verification)</div>
        ${Object.entries(SmartBrains.BRAINS).filter(([, b]) => b.wave === 1.5).map(([key, brain]) =>
    `<div class="brain-row" id="brain-${key}"><span class="brain-emoji">${brain.emoji}</span><span class="brain-name">${brain.name}</span><span class="brain-status" id="brain-status-${key}">⏳</span></div>`
  ).join('')}
        <div class="brain-wave-header">WAVE 1.75 — Consensus Resolution</div>
        ${Object.entries(SmartBrains.BRAINS).filter(([, b]) => b.wave === 1.75).map(([key, brain]) =>
    `<div class="brain-row" id="brain-${key}"><span class="brain-emoji">${brain.emoji}</span><span class="brain-name">${brain.name}</span><span class="brain-status" id="brain-status-${key}">⏳</span></div>`
  ).join('')}
        <div class="brain-wave-header">WAVE 2 — Cost Engine</div>
        ${Object.entries(SmartBrains.BRAINS).filter(([, b]) => b.wave === 2).map(([key, brain]) =>
    `<div class="brain-row" id="brain-${key}"><span class="brain-emoji">${brain.emoji}</span><span class="brain-name">${brain.name}</span><span class="brain-status" id="brain-status-${key}">⏳</span></div>`
  ).join('')}
        <div class="brain-wave-header">WAVE 2.5 — Reverse Verification</div>
        ${Object.entries(SmartBrains.BRAINS).filter(([, b]) => b.wave === 2.5).map(([key, brain]) =>
    `<div class="brain-row" id="brain-${key}"><span class="brain-emoji">${brain.emoji}</span><span class="brain-name">${brain.name}</span><span class="brain-status" id="brain-status-${key}">⏳</span></div>`
  ).join('')}
        <div class="brain-wave-header">WAVE 3 — Adversarial Audit</div>
        ${Object.entries(SmartBrains.BRAINS).filter(([, b]) => b.wave === 3).map(([key, brain]) =>
    `<div class="brain-row" id="brain-${key}"><span class="brain-emoji">${brain.emoji}</span><span class="brain-name">${brain.name}</span><span class="brain-status" id="brain-status-${key}">⏳</span></div>`
  ).join('')}
        <div class="brain-wave-header">WAVE 4 — Report Synthesis</div>
        ${Object.entries(SmartBrains.BRAINS).filter(([, b]) => b.wave === 4).map(([key, brain]) =>
    `<div class="brain-row" id="brain-${key}"><span class="brain-emoji">${brain.emoji}</span><span class="brain-name">${brain.name}</span><span class="brain-status" id="brain-status-${key}">⏳</span></div>`
  ).join('')}
      </div>
    </div>
  `;

  const pctEl = document.getElementById("analysis-pct");
  const stageEl = document.getElementById("analysis-stage");
  const barEl = document.getElementById("analysis-bar");
  const ringEl = document.getElementById("analysis-ring");

  function updateProgress(pct, text, brainStatus) {
    if (!pctEl || !barEl || !ringEl) return;
    const p = Math.min(Math.round(pct), 100);
    pctEl.textContent = p + "%";
    barEl.style.width = p + "%";
    ringEl.style.background = `conic-gradient(var(--accent-sky) ${pct * 3.6}deg, rgba(255,255,255,0.05) 0deg)`;
    if (text) stageEl.textContent = text;

    // Update brain dashboard
    if (brainStatus) {
      for (const [key, status] of Object.entries(brainStatus)) {
        const el = document.getElementById(`brain-status-${key}`);
        if (!el) continue;
        const row = document.getElementById(`brain-${key}`);
        if (status.status === 'done') {
          el.textContent = '✅';
          if (row) row.style.opacity = '1';
        } else if (status.status === 'failed') {
          el.textContent = '❌';
          if (row) row.style.opacity = '0.5';
        } else if (status.status === 'running' || status.status === 'active') {
          el.textContent = '🔄';
          if (row) row.style.opacity = '1';
        } else {
          el.textContent = '⏳';
          if (row) row.style.opacity = '0.5';
        }
      }
    }
  }

  // Check if we have any files with rawFile objects to send
  const hasRawFiles = [
    ...state.legendFiles, ...state.planFiles, ...state.specFiles, ...state.addendaFiles
  ].some(f => f.rawFile);

  if (hasRawFiles) {
    runGeminiAnalysis(updateProgress);
  } else {
    runSimulatedAnalysis(updateProgress);
  }

  renderFooter();
}

async function runGeminiAnalysis(updateProgress) {
  try {
    updateProgress(2, "🧠 Launching Multi-Brain Engine…", null);

    // ═══ USE MULTI-BRAIN ENGINE ═══
    const result = await SmartBrains.runFullAnalysis(state, updateProgress);

    state.aiAnalysis = result.report;
    state.aiError = null;
    state.brainResults = result.brainResults;
    state.brainStats = result.stats;

    // ─── Local Math Validation (belt and suspenders) ───
    updateProgress(99, "Running local math validation…", result.brainStatus);
    state.mathValidation = validateAnalysisMath(result.report);
    state.sectionCompleteness = checkSectionCompleteness(result.report);

    // ─── Brain Failure Notifications ───
    const failedBrains = Object.entries(result.brainStatus || {})
      .filter(([, s]) => s.status === 'failed')
      .map(([key, s]) => ({ key, name: SmartBrains.BRAINS[key]?.name || key, error: s.error }));
    state.failedBrains = failedBrains;

    if (failedBrains.length > 0) {
      const names = failedBrains.map(b => b.name).join(', ');
      console.warn(`[SmartBrains] ⚠️ ${failedBrains.length} brain(s) failed: ${names}`);
      spToast(`⚠️ ${failedBrains.length} brain(s) had errors: ${names}`, 'warning');
    }

    updateProgress(100, `🎯 Analysis complete — ${result.stats.successfulBrains}/${result.stats.totalBrains} brains succeeded!`, result.brainStatus);

    // ── Report bid to cross-device usage tracker ──
    const estCost = (result.stats.successfulBrains || 1) * 0.015; // ~$0.015 per brain call avg
    UsageStats.reportBid(state.projectName || 'Unknown', estCost);

    setTimeout(() => {
      state.analyzing = false;
      state.analysisComplete = true;
      state.completedSteps.add("review");
      // ── BOM & labor validation disabled — letting AI output run unmodified ──
      // validateAndRepairBOM() and labor hour clamping available but not called.
      // The temperature=0 and tier anchoring in ai-engine.js handle consistency at the source.
      // Populate AI crew recommendation from Labor Calculator
      const laborCalc = result.brainResults?.wave2_25?.LABOR_CALCULATOR;
      if (laborCalc) {
        const totalHrs = laborCalc.total_hours || 0;
        const crew = laborCalc.crew_recommendation || {};
        const totalTechs = (crew.journeyman || 0) + (crew.apprentice || 0) + (crew.foreman || 0);
        const durationWeeks = crew.duration_weeks || 8;
        state.travel.aiRecommendedTechs = totalTechs || 4;
        state.travel.aiRecommendedDays = durationWeeks * 5;
        state.travel.aiCrewBreakdown = crew;
        state.travel.aiReasoning = `${totalHrs} total labor hours across ${Object.entries(crew).filter(([k,v]) => k !== 'duration_weeks' && v > 0).map(([k,v]) => `${v} ${k}`).join(', ')}`;
        // Pre-fill with AI recommendation
        state.travel.techCount = state.travel.aiRecommendedTechs;
        state.travel.projectDays = state.travel.aiRecommendedDays;
      }
      state.currentStep = 6; // Go to Travel & Costs stage
      render();
      scrollContentTop();
      saveEstimate(true);
    }, 800);


  } catch (err) {
    console.error("[SmartBrains] Multi-Brain Analysis Error:", err);

    // ─── FALLBACK: Try legacy single-brain call ───
    console.warn('[SmartPlans] Falling back to legacy single-brain analysis…');
    try {
      updateProgress(10, "Fallback: single-brain analysis…", null);
      const legacyResult = await callGeminiAPI(updateProgress);
      state.aiAnalysis = legacyResult;
      state.aiError = null;
      state.mathValidation = validateAnalysisMath(legacyResult);
      state.sectionCompleteness = checkSectionCompleteness(legacyResult);

      updateProgress(100, "Analysis complete (fallback mode)", null);
      UsageStats.reportBid(state.projectName || 'Unknown', 0.02); // ~single brain cost
      setTimeout(() => {
        state.analyzing = false;
        state.analysisComplete = true;
        state.completedSteps.add("review");
        state.currentStep = 6;
        render();
        scrollContentTop();
        saveEstimate(true);
      }, 600);
    } catch (fallbackErr) {
      state.aiAnalysis = null;
      state.aiError = `Multi-Brain: ${err.message} | Fallback: ${fallbackErr.message}`;
      updateProgress(100, "Analysis complete (with errors)", null);
      setTimeout(() => {
        state.analyzing = false;
        state.analysisComplete = true;
        state.completedSteps.add("review");
        state.currentStep = 6;
        render();
        scrollContentTop();
      }, 600);
    }
  }
}

function runSimulatedAnalysis(updateProgress) {
  const stages = [
    { at: 5, text: "Scanning file formats and quality…" },
    { at: 15, text: "Reading symbol legend…" },
    { at: 25, text: "Identifying drawing scale and orientation…" },
    { at: 35, text: "Detecting symbols on floor plans…" },
    { at: 50, text: "Counting and classifying symbols by type…" },
    { at: 60, text: "Mapping device locations per sheet…" },
    { at: 70, text: "Cross-referencing with specifications…" },
    { at: 78, text: "Checking for spec-to-plan conflicts…" },
    { at: 85, text: "Reviewing addenda for scope changes…" },
    { at: 92, text: "Generating RFI recommendations…" },
    { at: 98, text: "Compiling results…" },
  ];

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 2.5 + 0.5;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      state.aiAnalysis = null;
      state.aiError = null;
      setTimeout(() => {
        state.analyzing = false;
        state.analysisComplete = true;
        state.completedSteps.add("review");
        state.currentStep = 6;
        render();
        scrollContentTop();
      }, 600);
    }

    const currentStage = [...stages].reverse().find(s => progress >= s.at);
    updateProgress(progress, currentStage?.text);
  }, 180);
}


// ═══════════════════════════════════════════════════════════════
// RFI EXPORT
// ═══════════════════════════════════════════════════════════════

function exportRFIs(format) {
  const rfis = getRelevantRFIs().filter(r => state.selectedRFIs.has(r.id));
  const projName = state.projectName || 'Untitled Project';
  const projType = state.projectType || 'Low Voltage Installation';
  const disciplines = (state.disciplines || []).join(', ') || 'Low Voltage Systems';
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const year = today.getFullYear();
  const refNum = `RFI-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  // Use ProposalGenerator branding if available, otherwise define inline
  const co = (typeof ProposalGenerator !== 'undefined' && ProposalGenerator.COMPANY) ? ProposalGenerator.COMPANY : {
    name: '3D Technology Services, Inc.', address: '11365 Sunrise Gold Circle',
    cityStateZip: 'Rancho Cordova, CA 95742', consultant: 'Justin Whitton',
    title: 'Senior Sales Consultant', email: 'jwhitton@3dtsi.com',
    phone: '(916) 267-7319', website: 'www.3Dtsi.com',
  };
  const b = { gold: '#EBB328', teal: '#3B97A1', tealDark: '#2B828B', navy: '#1B2A4A', gray: '#4A5568', lightGray: '#F4F6F8', border: '#D1D5DB' };

  const _esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Build individual RFI detail pages
  const rfiDetailPages = rfis.map((rfi, idx) => `
<div class="page-break"></div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16pt;">
  <tr><td bgcolor="${b.teal}" style="height:3pt;font-size:1pt;">&nbsp;</td></tr>
</table>

<table width="100%" cellpadding="12" cellspacing="0" border="0" style="margin-bottom:16pt;">
  <tr>
    <td bgcolor="${b.navy}" style="border:1pt solid ${b.navy};">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td><font color="#FFFFFF" style="font-size:18pt;font-weight:bold;font-family:Calibri,Arial,sans-serif;">RFI #${_esc(rfi.id)}</font></td>
          <td style="text-align:right;">
            <font color="${b.gold}" style="font-size:9pt;font-weight:bold;text-transform:uppercase;letter-spacing:2pt;">STATUS: OPEN</font>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<table width="100%" cellpadding="8" cellspacing="0" border="0" style="margin-bottom:16pt;">
  <tr>
    <td width="25%" bgcolor="${b.lightGray}" style="border:1pt solid ${b.border};font-size:8.5pt;color:${b.teal};font-weight:bold;text-transform:uppercase;letter-spacing:1pt;">Project</td>
    <td width="75%" style="border:1pt solid ${b.border};font-size:10pt;">${_esc(projName)}</td>
  </tr>
  <tr>
    <td bgcolor="${b.lightGray}" style="border:1pt solid ${b.border};font-size:8.5pt;color:${b.teal};font-weight:bold;text-transform:uppercase;letter-spacing:1pt;">Discipline</td>
    <td style="border:1pt solid ${b.border};font-size:10pt;">${_esc(rfi.discipline)}</td>
  </tr>
  <tr>
    <td bgcolor="${b.lightGray}" style="border:1pt solid ${b.border};font-size:8.5pt;color:${b.teal};font-weight:bold;text-transform:uppercase;letter-spacing:1pt;">Date Issued</td>
    <td style="border:1pt solid ${b.border};font-size:10pt;">${dateStr}</td>
  </tr>
  <tr>
    <td bgcolor="${b.lightGray}" style="border:1pt solid ${b.border};font-size:8.5pt;color:${b.teal};font-weight:bold;text-transform:uppercase;letter-spacing:1pt;">Priority</td>
    <td style="border:1pt solid ${b.border};font-size:10pt;"><b style="color:${b.navy};">Standard</b> — Response requested within 5 business days</td>
  </tr>
</table>

<p style="font-size:8.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:4pt;margin-top:20pt;">Question / Request for Information</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${b.gold}" style="height:2pt;font-size:1pt;">&nbsp;</td></tr></table>
<p style="font-size:11pt;line-height:1.65;margin-top:8pt;margin-bottom:16pt;">${_esc(rfi.q)}</p>

<p style="font-size:8.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:4pt;margin-top:20pt;">Reason / Justification</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${b.gold}" style="height:2pt;font-size:1pt;">&nbsp;</td></tr></table>
<p style="font-size:10pt;line-height:1.65;color:${b.gray};margin-top:8pt;margin-bottom:16pt;">${_esc(rfi.reason || 'Clarification required to ensure accurate estimation and proper installation per project specifications.')}</p>

<p style="font-size:8.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:4pt;margin-top:24pt;">Response (To Be Completed by Architect / Engineer)</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${b.gold}" style="height:2pt;font-size:1pt;">&nbsp;</td></tr></table>

<table width="100%" cellpadding="8" cellspacing="0" border="0" style="margin-top:8pt;margin-bottom:16pt;">
  <tr><td style="border:1pt solid ${b.border};height:80pt;vertical-align:top;font-size:10pt;color:#aaa;">Enter response here…</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24pt;">
  <tr valign="top">
    <td width="47%">
      <p style="font-size:8pt;color:${b.teal};text-transform:uppercase;letter-spacing:1.5pt;font-weight:bold;margin-bottom:8pt;">Responded By</p>
      <div style="border-bottom:1pt solid #333;height:24pt;margin-bottom:3pt;"></div>
      <p style="font-size:7.5pt;color:#888;text-transform:uppercase;letter-spacing:1pt;font-weight:bold;">Signature / Name</p>
    </td>
    <td width="6%">&nbsp;</td>
    <td width="47%">
      <p style="font-size:8pt;color:${b.teal};text-transform:uppercase;letter-spacing:1.5pt;font-weight:bold;margin-bottom:8pt;">Date of Response</p>
      <div style="border-bottom:1pt solid #333;height:24pt;margin-bottom:3pt;"></div>
      <p style="font-size:7.5pt;color:#888;text-transform:uppercase;letter-spacing:1pt;font-weight:bold;">Date</p>
    </td>
  </tr>
</table>
  `).join('');

  // Build RFI summary table rows
  const rfiTableRows = rfis.map((rfi, idx) => {
    const bgColor = idx % 2 === 0 ? '#FFFFFF' : b.lightGray;
    return `<tr>
      <td bgcolor="${bgColor}" style="padding:6pt 10pt;border:1pt solid ${b.border};font-weight:bold;color:${b.navy};">${_esc(rfi.id)}</td>
      <td bgcolor="${bgColor}" style="padding:6pt 10pt;border:1pt solid ${b.border};">${_esc(rfi.discipline)}</td>
      <td bgcolor="${bgColor}" style="padding:6pt 10pt;border:1pt solid ${b.border};">${_esc(rfi.q.length > 80 ? rfi.q.substring(0, 80) + '…' : rfi.q)}</td>
      <td bgcolor="${bgColor}" style="padding:6pt 10pt;border:1pt solid ${b.border};text-align:center;"><font color="${b.gold}"><b>OPEN</b></font></td>
      <td bgcolor="${bgColor}" style="padding:6pt 10pt;border:1pt solid ${b.border};text-align:center;">—</td>
    </tr>`;
  }).join('');

  // ─── Build Fortune 500-grade Word document ───
  const wordHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="UTF-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="SmartPlans v3.0">
<title>${_esc(projName)} — Request for Information Log | ${co.name}</title>
<style>
  @page { size: 8.5in 11in; margin: 0.7in 0.85in 0.8in 0.85in; mso-header-margin: 0.3in; mso-footer-margin: 0.4in; }
  @page Section1 { mso-footer: f1; }
  div.Section1 { page: Section1; }
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.65; color: #222; margin: 0; padding: 0; }
  .page-break { page-break-before: always; }
  h2 { font-size: 16pt; font-weight: bold; color: ${b.navy}; margin-top: 24pt; margin-bottom: 8pt; padding-bottom: 4pt; border-bottom: 3pt solid ${b.teal}; }
  h3 { font-size: 13pt; font-weight: bold; color: ${b.teal}; margin-top: 16pt; margin-bottom: 6pt; }
  p { margin-top: 0; margin-bottom: 8pt; line-height: 1.65; }
</style>
</head>
<body>

<div style="mso-element:footer" id="f1">
  <p style="text-align:center;font-size:8pt;font-weight:bold;color:${b.navy};text-transform:uppercase;letter-spacing:3pt;font-family:Calibri,Arial,sans-serif;margin:0;padding-top:4pt;border-top:1pt solid ${b.teal};">
    3D CONFIDENTIAL
  </p>
</div>

<div class="Section1">

<!-- === COVER PAGE === -->
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:-0.7in -0.85in 0 -0.85in;width:calc(100% + 1.7in);">
  <tr><td bgcolor="${b.navy}" style="height:8pt;font-size:1pt;">&nbsp;</td></tr>
  <tr><td bgcolor="${b.teal}" style="height:4pt;font-size:1pt;">&nbsp;</td></tr>
</table>

<br><br>

<p style="font-size:28pt;font-weight:bold;color:${b.navy};margin-bottom:2pt;margin-top:6pt;font-family:Calibri,Arial,sans-serif;">
  ${co.name}
</p>
<p style="font-size:10pt;color:${b.teal};font-style:italic;letter-spacing:1pt;margin-bottom:0;">Premier Low-Voltage Technology Integration</p>

<table cellpadding="0" cellspacing="0" border="0" style="margin:16pt 0 24pt 0;">
  <tr><td bgcolor="${b.gold}" style="width:60pt;height:42pt;">&nbsp;</td><td>&nbsp;</td></tr>
</table>

<p style="font-size:10pt;color:${b.teal};text-transform:uppercase;letter-spacing:5pt;font-weight:bold;margin-bottom:8pt;margin-top:-16pt;">
  Request for Information Log
</p>

<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8pt;">
  <tr>
    <td bgcolor="${b.gold}" style="width:5pt;">&nbsp;</td>
    <td style="padding-left:16pt;">
      <span style="font-size:26pt;font-weight:bold;color:${b.navy};font-family:Calibri,Arial,sans-serif;">${_esc(projName)}</span>
    </td>
  </tr>
</table>

<br><br><br>

<table width="100%" cellpadding="8" cellspacing="0" border="0" style="margin-top:20pt;">
  <tr valign="top">
    <td width="48%" style="padding-right:24pt;">
      <p style="font-size:7.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Project Type</p>
      <p style="font-size:11pt;color:#222;margin-bottom:14pt;">${_esc(projType)}</p>
      <p style="font-size:7.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Disciplines</p>
      <p style="font-size:11pt;color:#222;margin-bottom:14pt;">${_esc(disciplines)}</p>
      <p style="font-size:7.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Date Issued</p>
      <p style="font-size:11pt;color:#222;margin-bottom:14pt;">${dateStr}</p>
    </td>
    <td width="4%" style="border-left:1pt solid ${b.border};">&nbsp;</td>
    <td width="48%" style="padding-left:24pt;">
      <p style="font-size:7.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Issued By</p>
      <p style="font-size:11pt;color:#222;font-weight:bold;margin-bottom:1pt;">${co.consultant}</p>
      <p style="font-size:9.5pt;color:${b.gray};margin-bottom:14pt;">${co.title}</p>
      <p style="font-size:7.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Contact</p>
      <p style="font-size:11pt;color:#222;margin-bottom:1pt;">${co.email}</p>
      <p style="font-size:11pt;color:#222;margin-bottom:14pt;">${co.phone}</p>
      <p style="font-size:7.5pt;color:${b.teal};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:2pt;">Reference No.</p>
      <p style="font-size:11pt;color:#222;font-weight:bold;">${refNum}</p>
    </td>
  </tr>
</table>

<br><br><br>

<table width="100%" cellpadding="10" cellspacing="0" border="0" style="margin:0 -0.85in;width:calc(100% + 1.7in);">
  <tr><td bgcolor="${b.navy}" align="center" style="font-size:7.5pt;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2pt;">
    <font color="${b.gold}"><b>${co.name}</b></font>
    &nbsp;&middot;&nbsp;CONFIDENTIAL &amp; PROPRIETARY&nbsp;&middot;&nbsp;${co.website}
  </td></tr>
</table>

<!-- === RFI SUMMARY TABLE === -->
<div class="page-break"></div>

<h2>RFI Summary Log</h2>

<p style="margin-bottom:12pt;">The following Requests for Information have been identified during the AI-powered analysis of the project construction documents. Each RFI represents a gap or ambiguity that requires clarification from the Architect/Engineer of Record to ensure accurate estimation and proper installation. <b style="color:${b.navy};">Timely responses to these RFIs are critical to maintaining project schedule and budget accuracy.</b></p>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:12pt 0 20pt 0;font-size:9pt;">
  <tr>
    <td bgcolor="${b.navy}" style="color:#FFFFFF;padding:7pt 10pt;font-size:8pt;text-transform:uppercase;font-weight:bold;letter-spacing:0.5pt;border:1pt solid ${b.navy};width:12%;"><font color="#FFFFFF"><b>RFI #</b></font></td>
    <td bgcolor="${b.navy}" style="color:#FFFFFF;padding:7pt 10pt;font-size:8pt;text-transform:uppercase;font-weight:bold;letter-spacing:0.5pt;border:1pt solid ${b.navy};width:16%;"><font color="#FFFFFF"><b>Discipline</b></font></td>
    <td bgcolor="${b.navy}" style="color:#FFFFFF;padding:7pt 10pt;font-size:8pt;text-transform:uppercase;font-weight:bold;letter-spacing:0.5pt;border:1pt solid ${b.navy};width:48%;"><font color="#FFFFFF"><b>Question</b></font></td>
    <td bgcolor="${b.navy}" style="color:#FFFFFF;padding:7pt 10pt;font-size:8pt;text-transform:uppercase;font-weight:bold;letter-spacing:0.5pt;border:1pt solid ${b.navy};width:12%;text-align:center;"><font color="#FFFFFF"><b>Status</b></font></td>
    <td bgcolor="${b.navy}" style="color:#FFFFFF;padding:7pt 10pt;font-size:8pt;text-transform:uppercase;font-weight:bold;letter-spacing:0.5pt;border:1pt solid ${b.navy};width:12%;text-align:center;"><font color="#FFFFFF"><b>Response Date</b></font></td>
  </tr>
  ${rfiTableRows}
  <tr>
    <td bgcolor="${b.navy}" colspan="2" style="padding:8pt 10pt;border:1pt solid ${b.navy};"><font color="#FFFFFF"><b>Total RFIs: ${rfis.length}</b></font></td>
    <td bgcolor="${b.navy}" colspan="3" style="padding:8pt 10pt;border:1pt solid ${b.navy};text-align:right;"><font color="${b.gold}"><b>All responses requested within 5 business days</b></font></td>
  </tr>
</table>

<p style="font-size:9pt;color:${b.gray};font-style:italic;margin-top:8pt;">
  Detailed individual RFI forms with response fields follow on subsequent pages.
</p>

<!-- === INDIVIDUAL RFI DETAIL PAGES === -->
${rfiDetailPages}

<!-- === FOOTER === -->
<div class="page-break"></div>

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24pt;">
  <tr><td bgcolor="${b.teal}" style="height:3pt;font-size:1pt;">&nbsp;</td></tr>
</table>

<p style="font-size:18pt;font-weight:bold;color:${b.navy};margin-bottom:8pt;">RFI Log Summary</p>

<table width="100%" cellpadding="12" cellspacing="0" border="0" style="margin-bottom:16pt;">
  <tr>
    <td width="33%" bgcolor="${b.navy}" style="text-align:center;border:1pt solid ${b.navy};">
      <p style="font-size:28pt;font-weight:bold;color:white;margin-bottom:2pt;">${rfis.length}</p>
      <p style="font-size:8pt;color:${b.gold};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:0;">Total RFIs</p>
    </td>
    <td width="33%" bgcolor="${b.tealDark}" style="text-align:center;border:1pt solid ${b.tealDark};">
      <p style="font-size:28pt;font-weight:bold;color:white;margin-bottom:2pt;">${[...new Set(rfis.map(r => r.discipline))].length}</p>
      <p style="font-size:8pt;color:white;text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:0;">Disciplines</p>
    </td>
    <td width="33%" bgcolor="${b.gold}" style="text-align:center;border:1pt solid ${b.gold};">
      <p style="font-size:28pt;font-weight:bold;color:${b.navy};margin-bottom:2pt;">0</p>
      <p style="font-size:8pt;color:${b.navy};text-transform:uppercase;letter-spacing:2pt;font-weight:bold;margin-bottom:0;">Responses Received</p>
    </td>
  </tr>
</table>

<p style="font-size:10pt;line-height:1.65;margin-bottom:12pt;">
  This RFI log was generated as part of the comprehensive AI-powered document analysis performed by ${co.name} for the <b>${_esc(projName)}</b> project. Each RFI has been identified through systematic review of construction documents using our proprietary 21-brain AI analysis engine.
</p>

<p style="font-size:10pt;line-height:1.65;margin-bottom:20pt;">
  We respectfully request that all responses be provided in writing within <b>five (5) business days</b> of receipt. Delayed responses may impact the accuracy of our final estimate and could affect project scheduling. Please direct all responses to <b>${co.consultant}</b> at <b>${co.email}</b>.
</p>

<table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td bgcolor="${b.teal}" style="height:2pt;font-size:1pt;">&nbsp;</td></tr>
</table>
<p style="text-align:center;font-size:8.5pt;color:${b.gray};margin-top:8pt;">
  <b style="color:${b.teal};">${co.name}</b><br>
  ${co.address}, ${co.cityStateZip} &nbsp;|&nbsp; ${co.website}<br>
  ${co.consultant}, ${co.title} &nbsp;|&nbsp; ${co.email} &nbsp;|&nbsp; ${co.phone}<br>
  <span style="font-size:7pt;color:#aaa;">&copy; ${year} ${co.name}. All rights reserved.</span>
</p>

</div><!-- /Section1 -->
</body>
</html>`;

  if (format === 'pdf') {
    // Open in print window for Save as PDF
    openPrintAsPDF(wordHtml);
    if (typeof spToast === 'function') spToast('RFI report opened — use Save as PDF in the print dialog');
  } else {
    const blob = new Blob(['\ufeff' + wordHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = projName.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '_');
    a.download = `3DTSI_RFI_Log_${safeName}_${today.toISOString().split('T')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof spToast === 'function') spToast('✓ Professional RFI report downloaded — open in Microsoft Word');
  }
}

function exportAnalysis() {
  if (!state.aiAnalysis) return;

  const line = "=".repeat(64);
  let text = `SMARTPLANS AI ANALYSIS — MDF/IDF MATERIAL BREAKDOWN\n`;
  text += `${line}\n`;
  text += `Project: ${state.projectName || "Project"}\n`;
  text += `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}\n`;
  text += `Project Type: ${state.projectType}\n`;
  text += `Disciplines: ${state.disciplines.join(", ")}\n`;
  text += `${line}\n\n`;
  text += state.aiAnalysis;
  text += `\n\n${line}\n`;
  text += `Generated by SmartPlans — AI-Powered ELV Document Analysis\n`;
  text += `\n3D CONFIDENTIAL — 3D Technology Services Inc.\n`;

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Analysis_${(state.projectName || "Project").replace(/\s+/g, "_")}_MDF_IDF_Breakdown.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


// ═══════════════════════════════════════════════════════════════
// AI RESPONSE FORMATTER
// ═══════════════════════════════════════════════════════════════

function formatAIResponse(text) {
  if (!text) return "";
  // Basic markdown-to-HTML conversion for display
  let html = esc(text);

  // Horizontal rules
  html = html.replace(/^-{3,}$/gm, '<hr style="border:none;border-top:1px solid var(--border-medium);margin:16px 0;">');

  // Headers
  html = html.replace(/^#### (.+)$/gm, '<strong style="color:var(--accent-emerald);font-size:13px;display:block;margin-top:10px;">$1</strong>');
  html = html.replace(/^### (.+)$/gm, '<strong style="color:var(--accent-sky);font-size:14px;display:block;margin-top:14px;">$1</strong>');
  html = html.replace(/^## (.+)$/gm, '<div style="color:var(--accent-indigo);font-size:15px;font-weight:700;display:block;margin-top:20px;margin-bottom:4px;padding:8px 12px;background:rgba(129,140,248,0.08);border-radius:6px;border-left:3px solid var(--accent-indigo);">$1</div>');
  html = html.replace(/^# (.+)$/gm, '<div style="color:var(--text-primary);font-size:17px;font-weight:800;display:block;margin-top:24px;margin-bottom:8px;padding:10px 14px;background:rgba(56,189,248,0.06);border-radius:8px;border-left:3px solid var(--accent-sky);">$1</div>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>');

  // Tables — convert markdown table rows to HTML tables
  html = html.replace(/((?:^\|.+\|$\n?)+)/gm, function (tableBlock) {
    const rows = tableBlock.trim().split("\n").filter(r => r.trim());
    if (rows.length < 2) return tableBlock;

    let tableHtml = '<table style="width:100%;border-collapse:collapse;margin:10px 0;font-size:12.5px;">';
    rows.forEach((row, idx) => {
      const cells = row.split("|").filter(c => c.trim() !== "");
      // Skip separator row (|---|---|)
      if (cells.every(c => /^[\s\-:]+$/.test(c))) return;

      const tag = idx === 0 ? "th" : "td";
      const bgStyle = idx === 0 ? "background:rgba(56,189,248,0.08);font-weight:700;color:var(--accent-sky);" : (idx % 2 === 0 ? "background:rgba(255,255,255,0.02);" : "");
      tableHtml += "<tr>";
      cells.forEach(cell => {
        tableHtml += `<${tag} style="padding:8px 12px;border:1px solid var(--border-medium);text-align:left;${bgStyle}">${cell.trim()}</${tag}>`;
      });
      tableHtml += "</tr>";
    });
    tableHtml += "</table>";
    return tableHtml;
  });

  // Indented sub-items (lines starting with spaces + -)
  html = html.replace(/^   +[\-\*] (.+)$/gm, '<div style="padding-left:32px;color:var(--text-secondary);">◦ $1</div>');

  // Bullet points
  html = html.replace(/^[\-\*] (.+)$/gm, '<div style="padding-left:16px;">• $1</div>');

  // Numbered lists
  html = html.replace(/^(\d+)\. (.+)$/gm, '<div style="padding-left:16px;"><strong>$1.</strong> $2</div>');

  // Lettered lists (a), b), etc.)
  html = html.replace(/^   ([a-k])\) (.+)$/gm, '<div style="padding-left:24px;margin:2px 0;"><strong style="color:var(--accent-sky);">$1)</strong> $2</div>');

  return html;
}


// ═══════════════════════════════════════════════════════════════
// SAVED ESTIMATES — Cloud Persistence via D1
// ═══════════════════════════════════════════════════════════════

function spToast(msg, type = 'success') {
  const existing = document.querySelector('.sp-toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = `sp-toast sp-toast--${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// Store the current estimate's DB id
state.estimateId = null;

// ─── localStorage Fallback for Offline Resilience ───
function saveToLocalStorage(payload) {
  try {
    const key = state.estimateId || `sp_draft_${Date.now()}`;
    const saved = JSON.parse(sessionStorage.getItem('sp_offline_estimates') || '{}');
    saved[key] = { ...payload, _savedAt: new Date().toISOString(), _id: key };
    sessionStorage.setItem('sp_offline_estimates', JSON.stringify(saved));
    if (!state.estimateId) state.estimateId = key;
    return true;
  } catch (e) {
    console.error('[SmartPlans] localStorage save failed:', e);
    return false;
  }
}

function getLocalEstimates() {
  try {
    return JSON.parse(sessionStorage.getItem('sp_offline_estimates') || '{}');
  } catch { return {}; }
}

function removeLocalEstimate(id) {
  try {
    const saved = getLocalEstimates();
    delete saved[id];
    sessionStorage.setItem('sp_offline_estimates', JSON.stringify(saved));
  } catch { }
}

async function saveEstimate(showToast = true) {
  let exportPkg;
  try {
    exportPkg = SmartPlansExport.buildExportPackage(state);
  } catch (e) {
    console.error('[SmartPlans] Export package build failed:', e);
    exportPkg = { error: 'Package build failed', project: { name: state.projectName } };
  }

  const payload = {
    project_name: state.projectName || 'Untitled Estimate',
    project_type: state.projectType || null,
    project_location: state.projectLocation || null,
    disciplines: state.disciplines || [],
    pricing_tier: state.pricingTier || 'mid',
    status: state.aiAnalysis ? 'analyzed' : 'draft',
    export_data: exportPkg,
  };

  try {
    const url = state.estimateId ? `/api/estimates/${state.estimateId}` : '/api/estimates';
    const method = state.estimateId ? 'PUT' : 'POST';

    // FIX: Do NOT truncate rawMarkdown — it's the source of truth for BOM extraction.
    // Previous code truncated strings >5000 chars, destroying BOM data on reload.
    // The full AI analysis (typically 20-40KB) is well within D1 TEXT column limits.
    // Structured financials.categories is ALSO saved as a backup for corrupted loads.
    const jsonBody = JSON.stringify(payload);
    const sizeKB = (jsonBody.length / 1024).toFixed(0);
    console.log(`[SmartPlans] Saving estimate (${sizeKB}KB) via ${method} ${url}`);

    // If payload is large (>100KB), try direct fetch with long timeout first
    // to avoid issues with corporate proxies (CheckPoint) aborting large POSTs
    let res;
    if (jsonBody.length > 100000) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000);
        res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', 'X-App-Token': _appToken },
          body: jsonBody,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (directErr) {
        console.warn(`[SmartPlans] Direct save failed (${directErr.message}), trying chunked fallback...`);
        // Fallback: save without export_data first, then PUT export_data separately
        const lightPayload = { ...payload, export_data: null };
        const lightRes = await fetchWithRetry(url, {
          method,
          headers: { 'Content-Type': 'application/json', 'X-App-Token': _appToken },
          body: JSON.stringify(lightPayload),
          _timeout: 30000,
        }, 3);
        const lightData = await lightRes.json();
        if (lightData.error) throw new Error(lightData.error);
        const estId = state.estimateId || lightData.id;
        if (!state.estimateId && lightData.id) state.estimateId = lightData.id;
        // Now PUT just the export_data
        res = await fetchWithRetry(`/api/estimates/${estId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-App-Token': _appToken },
          body: JSON.stringify({ export_data: exportPkg }),
          _timeout: 120000,
        }, 3);
      }
    } else {
      res = await fetchWithRetry(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'X-App-Token': _appToken },
        body: jsonBody,
        _timeout: 60000,
      }, 3);
    }

    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (!state.estimateId && data.id) state.estimateId = data.id;
    removeLocalEstimate(state.estimateId); // Clean up any local fallback
    if (showToast) spToast('Estimate saved ✓');
  } catch (err) {
    console.error('[SmartPlans] Cloud save failed, using localStorage fallback:', err);
    const localOk = saveToLocalStorage(payload);
    if (showToast) {
      if (localOk) spToast('Saved offline — will sync when connection restores', 'info');
      else { console.error('[SmartPlans]', err); spToast('Failed to save. Please try again.', 'error'); }
    }
  }
}

async function loadEstimate(id) {
  try {
    // Check if this is a localStorage-only estimate
    const localEstimates = getLocalEstimates();
    if (localEstimates[id]) {
      const payload = localEstimates[id];
      _restoreStateFromPayload(id, payload.export_data || {}, payload);
      closeSavedPanel();
      render();
      spToast(`Loaded (offline): ${state.projectName || 'Untitled'}`, 'info');
      return;
    }

    const res = await fetchWithRetry(`/api/estimates/${id}`, { headers: { 'X-App-Token': _appToken }, _timeout: 15000 }, 3);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const est = data.estimate;
    const pkg = est.export_data;

    _restoreStateFromPayload(est.id, pkg, est);

    closeSavedPanel();
    render();
    spToast(`Loaded: ${state.projectName || 'Untitled'}`, 'info');
  } catch (err) {
    console.error('[SmartPlans] Load error:', err);
    console.error('[SmartPlans]', err); spToast('Failed to load estimate. Please try again.', 'error');
  }
}

// Shared state restoration logic for both cloud and local loads
function _restoreStateFromPayload(id, pkg, est) {
  state.estimateId = id;
  state.projectName = pkg?.project?.name || est?.project_name || '';
  state.projectType = pkg?.project?.type || est?.project_type || '';
  state.projectLocation = pkg?.project?.location || est?.project_location || '';
  state.preparedFor = pkg?.project?.preparedFor || est?.prepared_for || '';
  state.disciplines = pkg?.project?.disciplines || (est?.disciplines ? _safeParseDisciplines(est.disciplines) : []);
  state.pricingTier = pkg?.pricingConfig?.tier || est?.pricing_tier || 'mid';
  state.codeJurisdiction = pkg?.project?.codeJurisdiction || pkg?.project?.jurisdiction || '';
  state.prevailingWage = pkg?.project?.prevailingWage || '';
  state.workShift = pkg?.project?.workShift || '';
  state.floorPlateWidth = pkg?.project?.floorPlateWidth || 0;
  state.floorPlateDepth = pkg?.project?.floorPlateDepth || 0;
  state.ceilingHeight = pkg?.project?.ceilingHeight || 10;
  state.floorToFloorHeight = pkg?.project?.floorToFloorHeight || 14;

  // ── Restore file format (critical for confidence score) ──
  state.fileFormat = pkg?.project?.fileFormat || '';

  // ── Restore file metadata as placeholder objects ──
  // Actual file blobs can't be serialized, but we preserve count/names
  // so the confidence calculation and results stats are correct.
  const docs = pkg?.documents || {};
  if (docs.legendFiles && docs.legendFiles.length > 0 && state.legendFiles.length === 0) {
    state.legendFiles = docs.legendFiles.map(f => ({ name: f.name, size: f.size || 0, type: f.type || '' }));
  }
  if (docs.planFiles && docs.planFiles.length > 0 && state.planFiles.length === 0) {
    state.planFiles = docs.planFiles.map(f => ({ name: f.name, size: f.size || 0, type: f.type || '' }));
  }
  if (docs.specFiles && docs.specFiles.length > 0 && state.specFiles.length === 0) {
    state.specFiles = docs.specFiles.map(f => ({ name: f.name, size: f.size || 0, type: f.type || '' }));
  }
  if (docs.addendaFiles && docs.addendaFiles.length > 0 && state.addendaFiles.length === 0) {
    state.addendaFiles = docs.addendaFiles.map(f => ({ name: f.name, size: f.size || 0, type: f.type || '' }));
  }
  if (docs.totalSheets > 0 && state.planFiles.length === 0) {
    // Fallback: create placeholder entries if we know the count
    state.planFiles = Array.from({ length: docs.totalSheets }, (_, i) => ({ name: `Sheet ${i + 1}`, size: 0, type: '' }));
  }
  if (docs.totalSpecs > 0 && state.specFiles.length === 0) {
    state.specFiles = Array.from({ length: docs.totalSpecs }, (_, i) => ({ name: `Spec Section ${i + 1}`, size: 0, type: '' }));
  }

  // ── Restore user inputs (affect accuracy score) ──
  if (pkg?.userInputs) {
    state.specificItems = pkg.userInputs.specificItems || '';
    state.knownQuantities = pkg.userInputs.knownQuantities || '';
    state.priorEstimate = pkg.userInputs.priorEstimate || '';
    state.notes = pkg.userInputs.notes || '';
  }

  if (pkg?.pricingConfig) {
    state.regionalMultiplier = pkg.pricingConfig.region || pkg.pricingConfig.regionalMultiplier || 'national_average';
    state.includeBurden = pkg.pricingConfig.burdenIncluded !== false && pkg.pricingConfig.includeBurden !== false;
    state.burdenRate = pkg.pricingConfig.burdenRate || 35;
    if (pkg.pricingConfig.laborRates) state.laborRates = { ...state.laborRates, ...pkg.pricingConfig.laborRates };
    if (pkg.pricingConfig.markup) state.markup = { ...state.markup, ...pkg.pricingConfig.markup };
  }

  // ── Restore supplier price overrides & manual BOM edits ──
  if (pkg?.financials?.supplierOverrides && Object.keys(pkg.financials.supplierOverrides).length > 0) {
    state.supplierPriceOverrides = pkg.financials.supplierOverrides;
  }
  if (pkg?.financials?.manualBomItems && Array.isArray(pkg.financials.manualBomItems)) {
    state.manualBomItems = pkg.financials.manualBomItems;
  }
  if (pkg?.financials?.deletedBomItems && Object.keys(pkg.financials.deletedBomItems).length > 0) {
    state.deletedBomItems = pkg.financials.deletedBomItems;
  }

  if (pkg?.analysis?.rawMarkdown) {
    state.aiAnalysis = pkg.analysis.rawMarkdown;
    state.analysisComplete = true;
    state.completedSteps = new Set(['setup', 'legend', 'plans', 'specs', 'addenda', 'review', 'travel']);
    state.currentStep = 7;

    // FIX: Detect previously truncated saves and restore BOM from structured financials
    const wasTruncated = state.aiAnalysis.includes('[truncated for storage]');
    if (wasTruncated && pkg?.financials?.categories?.length > 0) {
      console.warn('[SmartPlans] Detected truncated AI analysis — restoring BOM from saved financials');
      // Rebuild the BOM markdown tables from structured financials data
      // so getFilteredBOM() produces correct numbers
      state._restoredFinancials = pkg.financials;
      if (typeof spToast === 'function') {
        setTimeout(() => spToast('⚠️ This bid was saved with an older version that truncated data. Numbers restored from backup. Re-save to fix permanently.', 'warning', 8000), 500);
      }
    }
  } else {
    state.aiAnalysis = null;
    state.analysisComplete = false;
    state.completedSteps = new Set();
    state.currentStep = 0;
  }

  state.aiError = null;
  state.analyzing = false;
}

async function deleteEstimate(id, name) {
  if (!confirm(`Delete "${name || 'this estimate'}" permanently?`)) return;
  try {
    // Check if it's a local-only estimate
    const localEstimates = getLocalEstimates();
    if (localEstimates[id]) {
      removeLocalEstimate(id);
      if (state.estimateId === id) state.estimateId = null;
      spToast('Estimate deleted');
      showSavedEstimates();
      return;
    }

    const res = await fetchWithRetry(`/api/estimates/${id}`, { method: 'DELETE', headers: { 'X-App-Token': _appToken }, _timeout: 10000 }, 3);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (state.estimateId === id) state.estimateId = null;
    spToast('Estimate deleted');
    showSavedEstimates();
  } catch (err) {
    console.error('[SmartPlans]', err); spToast('Failed to delete. Please try again.', 'error');
  }
}

function closeSavedPanel() {
  const backdrop = document.querySelector('.saved-panel-backdrop');
  const panel = document.querySelector('.saved-panel');
  if (backdrop) backdrop.remove();
  if (panel) panel.remove();
}

async function showSavedEstimates() {
  closeSavedPanel();

  const backdrop = document.createElement('div');
  backdrop.className = 'saved-panel-backdrop';
  backdrop.addEventListener('click', closeSavedPanel);
  document.body.appendChild(backdrop);

  const panel = document.createElement('div');
  panel.className = 'saved-panel';
  panel.innerHTML = `
    <div class="saved-panel-header">
      <h2><i data-lucide="folder-open" style="width:20px;height:20px;"></i> Saved Estimates</h2>
      <button class="saved-panel-close" onclick="closeSavedPanel()">✕</button>
    </div>
    <div class="saved-panel-body" id="saved-list">
      <div style="text-align:center;padding:40px;color:rgba(255,255,255,0.4);">Loading...</div>
    </div>`;
  document.body.appendChild(panel);

  // Merge cloud + local estimates
  let estimates = [];
  let cloudOk = false;
  try {
    const res = await fetchWithRetry('/api/estimates', { headers: { 'X-App-Token': _appToken }, _timeout: 10000 }, 3);
    const data = await res.json();
    if (!data.error) {
      estimates = data.estimates || [];
      cloudOk = true;
    }
  } catch (err) {
    console.warn('[SmartPlans] Cloud fetch failed, showing local only:', err.message);
  }

  // Merge in any localStorage-only estimates
  const localEstimates = getLocalEstimates();
  const cloudIds = new Set(estimates.map(e => e.id));
  for (const [lid, ldata] of Object.entries(localEstimates)) {
    if (!cloudIds.has(lid)) {
      estimates.push({
        id: lid,
        project_name: ldata.project_name || 'Untitled',
        project_type: ldata.project_type || '',
        project_location: ldata.project_location || '',
        disciplines: ldata.disciplines || [],
        pricing_tier: ldata.pricing_tier || 'mid',
        status: (ldata.status || 'draft') + ' (offline)',
        updated_at: ldata._savedAt || '',
        _isLocal: true,
      });
    }
  }

  const container = document.getElementById('saved-list');

  if (estimates.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <div style="font-size:42px;margin-bottom:14px;">📋</div>
        <div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:6px;">No Saved Estimates</div>
        <div style="font-size:13px;color:var(--text-muted);line-height:1.6;">
          Estimates are automatically saved to the cloud when you complete an AI analysis.<br>
          You can also click <strong>💾 Save</strong> at any time during setup.
          ${!cloudOk ? '<br><span style="color:var(--accent-amber);">⚠ Cloud unavailable — estimates will be saved locally until connection restores.</span>' : ''}
        </div>
      </div>`;
    return;
  }

  container.innerHTML = (!cloudOk ? '<div style="padding:8px 14px;margin-bottom:10px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:8px;font-size:12px;color:var(--accent-amber);">⚠ Cloud unavailable — showing cached and offline estimates</div>' : '') +
    estimates.map(est => {
      const discArr = est.disciplines ? _safeParseDisciplines(est.disciplines) : [];
      const dateStr = est.updated_at ? new Date(est.updated_at.endsWith('Z') ? est.updated_at : est.updated_at + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
      const isCurrent = state.estimateId === est.id;
      return `<div class="est-card" style="${isCurrent ? 'border-color:var(--accent-indigo);' : ''}${est._isLocal ? 'border-left:3px solid var(--accent-amber);' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:start;">
        <div class="est-card-name">${esc(est.project_name || 'Untitled')}${isCurrent ? ' <span style="font-size:11px;color:var(--accent-indigo);">(current)</span>' : ''}${est._isLocal ? ' <span style="font-size:11px;color:var(--accent-amber);">(offline)</span>' : ''}</div>
        <span class="est-card-status est-card-status--${esc((est.status || 'draft').split(' ')[0])}">${esc(est.status || 'draft')}</span>
      </div>
      <div class="est-card-meta">
        ${est.project_type ? '<span>' + esc(est.project_type) + '</span> · ' : ''}
        ${discArr.length ? '<span>' + esc(discArr.join(', ')) + '</span> · ' : ''}
        ${est.project_location ? '<span>📍 ' + esc(est.project_location) + '</span> · ' : ''}
        <span>${dateStr}</span>
      </div>
      <div class="est-card-actions">
        <button class="est-card-btn est-card-btn--load" data-action="load" data-est-id="${esc(est.id)}">📂 Load</button>
        <button class="est-card-btn" data-action="history" data-est-id="${esc(est.id)}" data-est-name="${esc(est.project_name || '')}" style="border-color:rgba(129,140,248,0.25);color:var(--accent-indigo);">🕐 History</button>
        ${est.status === 'analyzed' || est.status === 'exported' ? `<button class="est-card-btn" data-action="actuals" data-est-id="${esc(est.id)}" data-est-name="${esc(est.project_name || '')}" style="border-color:rgba(5,150,105,0.25);color:#059669;">📊 Actuals</button>` : ''}
        <button class="est-card-btn est-card-btn--delete" data-action="delete" data-est-id="${esc(est.id)}" data-est-name="${esc(est.project_name || '')}">🗑 Delete</button>
      </div>
    </div>`;
    }).join('');

  // Event delegation for estimate card action buttons (safe — no inline onclick)
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    e.stopPropagation();
    const action = btn.getAttribute('data-action');
    const estId = btn.getAttribute('data-est-id');
    const estName = btn.getAttribute('data-est-name') || '';
    if (action === 'load') loadEstimate(estId);
    else if (action === 'history') showRevisionHistory(estId, estName);
    else if (action === 'actuals') showActualsPanel(estId, estName);
    else if (action === 'delete') deleteEstimate(estId, estName);
  });
}


// ═══════════════════════════════════════════════════════════════
// REVISION HISTORY — Compare & revert previous estimate versions
// ═══════════════════════════════════════════════════════════════

async function showRevisionHistory(estimateId, projectName) {
  closeSavedPanel();

  const backdrop = document.createElement('div');
  backdrop.className = 'saved-panel-backdrop';
  backdrop.addEventListener('click', closeRevisionPanel);
  document.body.appendChild(backdrop);

  const panel = document.createElement('div');
  panel.className = 'saved-panel';
  panel.id = 'revision-panel';
  panel.innerHTML = `
    <div class="saved-panel-header">
      <h2>🕐 Version History — ${esc(projectName || 'Untitled')}</h2>
      <button class="saved-panel-close" onclick="closeRevisionPanel()">✕</button>
    </div>
    <div class="saved-panel-body" id="revision-list">
      <div style="text-align:center;padding:40px;color:rgba(255,255,255,0.4);">Loading revisions...</div>
    </div>`;
  document.body.appendChild(panel);

  try {
    const res = await fetchWithRetry(`/api/estimates/${estimateId}/revisions`, { headers: { 'X-App-Token': _appToken }, _timeout: 10000 }, 3);
    const data = await res.json();
    const revisions = data.revisions || [];
    const container = document.getElementById('revision-list');

    if (revisions.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:40px;">
          <div style="font-size:42px;margin-bottom:14px;">📋</div>
          <div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:6px;">No Previous Versions</div>
          <div style="font-size:13px;color:var(--text-muted);line-height:1.6;">
            Revisions are automatically saved each time you re-run an analysis on this estimate.<br>
            The previous version is preserved so you can compare or revert.
          </div>
        </div>`;
      return;
    }

    container.innerHTML = revisions.map(rev => {
      const dateStr = rev.created_at ? new Date(rev.created_at.endsWith('Z') ? rev.created_at : rev.created_at + 'Z').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
      }) : '';
      const costStr = rev.contract_value ? '$' + Number(rev.contract_value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—';
      return `<div class="est-card" style="border-left:3px solid rgba(129,140,248,0.4);">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div class="est-card-name">Revision #${rev.revision_number}</div>
          <span style="font-size:12px;color:var(--accent-indigo);font-weight:600;">${costStr}</span>
        </div>
        <div class="est-card-meta">
          <span>${dateStr}</span>
          ${rev.project_name ? ' · <span>' + esc(rev.project_name) + '</span>' : ''}
        </div>
        <div class="est-card-actions">
          <button class="est-card-btn" data-rev-action="compare" data-est-id="${esc(estimateId)}" data-rev-id="${esc(rev.id)}" style="border-color:rgba(56,189,248,0.25);color:var(--accent-sky);">🔍 Compare</button>
          <button class="est-card-btn" data-rev-action="restore" data-est-id="${esc(estimateId)}" data-rev-id="${esc(rev.id)}" data-rev-num="${rev.revision_number}" style="border-color:rgba(16,185,129,0.25);color:#10b981;">↩ Restore</button>
          <button class="est-card-btn est-card-btn--delete" data-rev-action="delete" data-est-id="${esc(estimateId)}" data-rev-id="${esc(rev.id)}" data-est-name="${esc(projectName)}">🗑</button>
        </div>
      </div>`;
    }).join('');

    // Event delegation for revision action buttons (safe — no inline onclick)
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-rev-action]');
      if (!btn) return;
      e.stopPropagation();
      const action = btn.getAttribute('data-rev-action');
      const eId = btn.getAttribute('data-est-id');
      const rId = btn.getAttribute('data-rev-id');
      if (action === 'compare') compareRevision(eId, rId);
      else if (action === 'restore') restoreRevision(eId, rId, parseInt(btn.getAttribute('data-rev-num'), 10));
      else if (action === 'delete') deleteRevision(eId, rId, btn.getAttribute('data-est-name') || '');
    });
  } catch (err) {
    console.error('[SmartPlans] Failed to load revisions:', err);
    const container = document.getElementById('revision-list');
    if (container) container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--accent-amber);">Failed to load revisions. Please try again.</div>`;
  }
}

function closeRevisionPanel() {
  const backdrop = document.querySelector('.saved-panel-backdrop');
  const panel = document.getElementById('revision-panel');
  if (backdrop) backdrop.remove();
  if (panel) panel.remove();
}

async function compareRevision(estimateId, revId) {
  closeRevisionPanel();

  // Show a loading overlay
  const backdrop = document.createElement('div');
  backdrop.className = 'saved-panel-backdrop';
  backdrop.addEventListener('click', () => { backdrop.remove(); compPanel.remove(); });
  document.body.appendChild(backdrop);

  const compPanel = document.createElement('div');
  compPanel.className = 'saved-panel';
  compPanel.style.maxWidth = '700px';
  compPanel.innerHTML = `
    <div class="saved-panel-header">
      <h2>🔍 Comparing Versions</h2>
      <button class="saved-panel-close" onclick="this.closest('.saved-panel').remove();document.querySelector('.saved-panel-backdrop')?.remove();">✕</button>
    </div>
    <div class="saved-panel-body">
      <div style="text-align:center;padding:40px;color:rgba(255,255,255,0.4);">Loading comparison...</div>
    </div>`;
  document.body.appendChild(compPanel);

  try {
    // Fetch revision data and current estimate data in parallel
    const [revRes, curRes] = await Promise.all([
      fetchWithRetry(`/api/estimates/${estimateId}/revisions/${revId}`, { headers: { 'X-App-Token': _appToken }, _timeout: 15000 }, 3),
      fetchWithRetry(`/api/estimates/${estimateId}`, { headers: { 'X-App-Token': _appToken }, _timeout: 15000 }, 3)
    ]);

    const revData = await revRes.json();
    const curData = await curRes.json();

    if (revData.error || curData.error) throw new Error(revData.error || curData.error);

    const rev = revData.revision;
    const cur = curData.estimate;

    // Parse export data
    let revExport, curExport;
    try { revExport = typeof rev.export_data === 'string' ? JSON.parse(rev.export_data) : (rev.export_data || {}); } catch { revExport = {}; }
    try { curExport = typeof cur.export_data === 'string' ? JSON.parse(cur.export_data) : (cur.export_data || {}); } catch { curExport = {}; }

    // Extract key metrics for comparison
    const revContract = rev.contract_value || revExport?.pricing?.totalContract || revExport?.pricing?.grandTotal || 0;
    const curContract = curExport?.pricing?.totalContract || curExport?.pricing?.grandTotal || 0;
    const contractDiff = curContract - revContract;

    const revItems = revExport?.analysis?.totalItems || revExport?.summary?.totalItems || 0;
    const curItems = curExport?.analysis?.totalItems || curExport?.summary?.totalItems || 0;

    const revRFIs = revExport?.rfis?.length || revExport?.analysis?.rfiCount || 0;
    const curRFIs = curExport?.rfis?.length || curExport?.analysis?.rfiCount || 0;

    const revDate = rev.created_at ? new Date(rev.created_at.endsWith('Z') ? rev.created_at : rev.created_at + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Unknown';
    const curDate = cur.updated_at ? new Date(cur.updated_at.endsWith('Z') ? cur.updated_at : cur.updated_at + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Current';

    function diffBadge(diff, prefix = '') {
      if (diff === 0) return '<span style="color:rgba(255,255,255,0.4);">—</span>';
      const color = diff > 0 ? '#10b981' : '#f43f5e';
      const sign = diff > 0 ? '+' : '';
      return `<span style="color:${color};font-weight:600;">${sign}${prefix}${typeof diff === 'number' && prefix === '$' ? Math.abs(diff).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : diff}</span>`;
    }

    function fmtCost(v) {
      return v ? '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '$0';
    }

    const body = compPanel.querySelector('.saved-panel-body');
    body.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:0;margin-bottom:20px;">
        <div style="text-align:center;padding:12px;background:rgba(129,140,248,0.06);border-radius:10px 0 0 10px;border:1px solid rgba(129,140,248,0.15);">
          <div style="font-size:11px;color:var(--accent-indigo);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Revision #${rev.revision_number}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${revDate}</div>
        </div>
        <div style="display:flex;align-items:center;padding:0 12px;font-size:18px;color:rgba(255,255,255,0.3);">vs</div>
        <div style="text-align:center;padding:12px;background:rgba(16,185,129,0.06);border-radius:0 10px 10px 0;border:1px solid rgba(16,185,129,0.15);">
          <div style="font-size:11px;color:#10b981;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Current Version</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${curDate}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
            <th style="text-align:left;padding:8px 12px;color:var(--text-muted);font-weight:600;font-size:11px;text-transform:uppercase;">Metric</th>
            <th style="text-align:right;padding:8px 12px;color:var(--accent-indigo);font-weight:600;font-size:11px;">Rev #${rev.revision_number}</th>
            <th style="text-align:right;padding:8px 12px;color:#10b981;font-weight:600;font-size:11px;">Current</th>
            <th style="text-align:right;padding:8px 12px;color:var(--text-muted);font-weight:600;font-size:11px;">Change</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
            <td style="padding:10px 12px;font-weight:600;">Contract Value</td>
            <td style="padding:10px 12px;text-align:right;">${fmtCost(revContract)}</td>
            <td style="padding:10px 12px;text-align:right;">${fmtCost(curContract)}</td>
            <td style="padding:10px 12px;text-align:right;">${diffBadge(contractDiff, '$')}</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
            <td style="padding:10px 12px;font-weight:600;">Total Items</td>
            <td style="padding:10px 12px;text-align:right;">${revItems || '—'}</td>
            <td style="padding:10px 12px;text-align:right;">${curItems || '—'}</td>
            <td style="padding:10px 12px;text-align:right;">${diffBadge(curItems - revItems)}</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
            <td style="padding:10px 12px;font-weight:600;">RFIs</td>
            <td style="padding:10px 12px;text-align:right;">${revRFIs || '—'}</td>
            <td style="padding:10px 12px;text-align:right;">${curRFIs || '—'}</td>
            <td style="padding:10px 12px;text-align:right;">${diffBadge(curRFIs - revRFIs)}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;font-weight:600;">Project Name</td>
            <td style="padding:10px 12px;text-align:right;font-size:12px;">${esc(rev.project_name || '—')}</td>
            <td style="padding:10px 12px;text-align:right;font-size:12px;">${esc(cur.project_name || '—')}</td>
            <td style="padding:10px 12px;text-align:right;">${rev.project_name !== cur.project_name ? '<span style="color:var(--accent-amber);font-size:11px;">changed</span>' : '<span style="color:rgba(255,255,255,0.4);">—</span>'}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:20px;display:flex;gap:8px;justify-content:flex-end;">
        <button onclick="restoreRevision('${esc(estimateId)}','${esc(revId)}',${rev.revision_number})" style="padding:10px 18px;border-radius:8px;border:1px solid rgba(16,185,129,0.35);background:rgba(16,185,129,0.08);color:#10b981;cursor:pointer;font-size:13px;font-weight:600;">↩ Restore This Version</button>
        <button onclick="this.closest('.saved-panel').remove();document.querySelector('.saved-panel-backdrop')?.remove();" style="padding:10px 18px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:var(--text-muted);cursor:pointer;font-size:13px;">Close</button>
      </div>
    `;
  } catch (err) {
    console.error('[SmartPlans] Compare failed:', err);
    const body = compPanel.querySelector('.saved-panel-body');
    if (body) body.innerHTML = `<div style="text-align:center;padding:40px;color:var(--accent-amber);">Failed to compare. Please try again.</div>`;
  }
}

async function restoreRevision(estimateId, revId, revNum) {
  if (!confirm(`Restore to Revision #${revNum}?\n\nThe current version will be saved as a new revision before restoring.`)) return;

  try {
    // Fetch the full revision data
    const res = await fetchWithRetry(`/api/estimates/${estimateId}/revisions/${revId}`, { headers: { 'X-App-Token': _appToken }, _timeout: 15000 }, 3);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const rev = data.revision;
    let exportData;
    try { exportData = typeof rev.export_data === 'string' ? JSON.parse(rev.export_data) : (rev.export_data || {}); } catch { exportData = {}; }

    // PUT the revision data back as the current estimate
    // (this will auto-trigger a revision save of the current data before overwriting)
    const payload = {
      project_name: rev.project_name || 'Untitled',
      export_data: exportData,
      status: 'analyzed',
    };
    if (rev.disciplines) {
      payload.disciplines = _safeParseDisciplines(rev.disciplines);
    }

    const putRes = await fetchWithRetry(`/api/estimates/${estimateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-App-Token': _appToken },
      body: JSON.stringify(payload),
      _timeout: 15000,
    }, 3);

    const putData = await putRes.json();
    if (putData.error) throw new Error(putData.error);

    // Close any open panels
    closeRevisionPanel();
    document.querySelector('.saved-panel-backdrop')?.remove();
    document.querySelector('.saved-panel')?.remove();

    // Reload the estimate into the app
    _restoreStateFromPayload(estimateId, exportData, { ...rev, id: estimateId });
    render();
    spToast(`Restored to Revision #${revNum}`, 'success');
  } catch (err) {
    console.error('[SmartPlans] Restore failed:', err);
    console.error('[SmartPlans]', err); spToast('Failed to restore revision. Please try again.', 'error');
  }
}

async function deleteRevision(estimateId, revId, projectName) {
  if (!confirm('Delete this revision? This cannot be undone.')) return;

  try {
    const res = await fetchWithRetry(`/api/estimates/${estimateId}/revisions/${revId}`, {
      method: 'DELETE',
      headers: { 'X-App-Token': _appToken },
      _timeout: 10000,
    }, 3);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    spToast('Revision deleted', 'success');
    // Re-open revision history to refresh the list
    showRevisionHistory(estimateId, projectName);
  } catch (err) {
    console.error('[SmartPlans] Delete revision failed:', err);
    console.error('[SmartPlans]', err); spToast('Failed to delete revision. Please try again.', 'error');
  }
}


// ═══════════════════════════════════════════════════════════════
// ACTUAL VS ESTIMATE FEEDBACK LOOP
// ═══════════════════════════════════════════════════════════════

function _varianceClass(pct) {
  const abs = Math.abs(pct);
  if (abs <= 10) return 'variance-green';
  if (abs <= 25) return 'variance-yellow';
  return 'variance-red';
}
function _fmtPct(v) { return (v >= 0 ? '+' : '') + v.toFixed(1) + '%'; }
function _fmtActDollar(v) { return '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

async function showActualsPanel(estimateId, projectName) {
  closeSavedPanel();
  const backdrop = document.createElement('div');
  backdrop.className = 'saved-panel-backdrop';
  backdrop.addEventListener('click', closeActualsPanel);
  document.body.appendChild(backdrop);
  const panel = document.createElement('div');
  panel.className = 'saved-panel';
  panel.id = 'actuals-panel';
  panel.style.maxWidth = '900px';
  panel.innerHTML = `<div class="saved-panel-header"><h2>📊 Record Actuals — ${esc(projectName || 'Untitled')}</h2><button class="saved-panel-close" onclick="closeActualsPanel()">✕</button></div><div class="saved-panel-body" id="actuals-body"><div style="text-align:center;padding:40px;color:var(--text-muted);">Loading estimate data...</div></div>`;
  document.body.appendChild(panel);
  try {
    const [estRes, actualsRes] = await Promise.all([
      fetchWithRetry('/api/estimates/' + estimateId, { headers: { 'X-App-Token': _appToken }, _timeout: 15000 }, 3),
      fetchWithRetry('/api/estimates/' + estimateId + '/actuals', { headers: { 'X-App-Token': _appToken }, _timeout: 15000 }, 3)
    ]);
    const estData = await estRes.json();
    const actualsData = await actualsRes.json();
    if (estData.error) throw new Error(estData.error);
    const est = estData.estimate;
    const existingActuals = actualsData.actuals || [];
    let pkg = est.export_data;
    if (typeof pkg === 'string') { try { pkg = JSON.parse(pkg); } catch { pkg = {}; } }
    const analysisText = pkg?.analysis?.rawMarkdown || '';
    if (!analysisText) {
      document.getElementById('actuals-body').innerHTML = '<div style="text-align:center;padding:40px;"><div style="font-size:42px;margin-bottom:14px;">📋</div><div style="font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:6px;">No Analysis Data</div><div style="font-size:13px;color:var(--text-muted);line-height:1.6;">This estimate does not have AI analysis data. Run an analysis first, then record actuals.</div></div>';
      return;
    }
    const bom = getFilteredBOM(analysisText, state.disciplines);
    const actualsMap = {};
    existingActuals.forEach(a => { actualsMap[(a.category || '') + '::' + (a.item_name || '')] = a; });
    _renderActualsTable(estimateId, projectName, bom, actualsMap);
  } catch (err) {
    console.error('[SmartPlans] Failed to load actuals panel:', err);
    const body = document.getElementById('actuals-body');
    if (body) body.innerHTML = '<div style="text-align:center;padding:40px;color:var(--accent-rose);">Failed to load. Please try again.</div>';
  }
}

function _renderActualsTable(estimateId, projectName, bom, actualsMap) {
  const container = document.getElementById('actuals-body');
  if (!container) return;
  let totalEstCost = 0, totalActCost = 0, totalEstLabor = 0, totalActLabor = 0, rowIdx = 0;
  let rows = '';
  bom.categories.forEach((cat, ci) => {
    rows += '<tr style="background:rgba(13,148,136,0.08);"><td colspan="10" style="padding:10px 12px;font-weight:700;font-size:13px;color:var(--accent-teal);border-bottom:1px solid rgba(13,148,136,0.12);">' + esc(cat.name) + '</td></tr>';
    cat.items.forEach((item, ii) => {
      rowIdx++;
      const existing = actualsMap[(cat.name || '') + '::' + (item.name || '')] || {};
      const estQty = item.qty || 0, estUC = item.unitCost || 0, estExt = estQty * estUC, estLab = item.laborHours || 0;
      const actQty = existing.actual_qty ?? estQty, actUC = existing.actual_unit_cost ?? estUC;
      const actLab = existing.actual_labor_hours ?? estLab, actExt = actQty * actUC;
      const vPct = estExt > 0 ? ((actExt - estExt) / estExt) * 100 : 0;
      totalEstCost += estExt; totalActCost += actExt; totalEstLabor += estLab; totalActLabor += actLab;
      rows += '<tr style="border-bottom:1px solid var(--border-subtle);" data-actuals-row="' + ci + '-' + ii + '">' +
        '<td style="padding:6px 8px;font-size:11px;color:var(--text-muted);text-align:center;">' + rowIdx + '</td>' +
        '<td style="padding:6px 8px;font-size:12px;color:var(--text-primary);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + esc(item.name) + '">' + esc(item.name) + '</td>' +
        '<td style="padding:6px 8px;font-size:12px;color:var(--text-muted);text-align:center;">' + estQty + '</td>' +
        '<td style="padding:6px 4px;text-align:center;"><input type="number" class="actuals-input actuals-qty" data-key="' + ci + '-' + ii + '" value="' + actQty + '" min="0" step="1" /></td>' +
        '<td style="padding:6px 8px;font-size:12px;color:var(--text-muted);text-align:right;">' + _fmtActDollar(estUC) + '</td>' +
        '<td style="padding:6px 4px;text-align:right;"><input type="number" class="actuals-input actuals-cost" data-key="' + ci + '-' + ii + '" value="' + actUC.toFixed(2) + '" min="0" step="0.01" /></td>' +
        '<td style="padding:6px 4px;text-align:center;"><input type="number" class="actuals-input actuals-labor" data-key="' + ci + '-' + ii + '" value="' + actLab + '" min="0" step="0.5" style="width:60px;" /></td>' +
        '<td style="padding:6px 8px;font-size:12px;text-align:right;" class="actuals-ext" data-key="' + ci + '-' + ii + '">' + _fmtActDollar(actExt) + '</td>' +
        '<td style="padding:6px 8px;text-align:center;" class="actuals-var-cell" data-key="' + ci + '-' + ii + '"><span class="variance-badge ' + _varianceClass(vPct) + '">' + _fmtPct(vPct) + '</span></td>' +
        '</tr>';
    });
  });
  const overallVar = totalEstCost > 0 ? ((totalActCost - totalEstCost) / totalEstCost) * 100 : 0;
  container.innerHTML = '<div style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:16px;">Enter actual quantities, unit costs, and labor hours. Variance is calculated automatically.</div>' +
    '<div style="overflow-x:auto;border:1px solid var(--border-subtle);"><table style="width:100%;border-collapse:collapse;font-size:12px;" id="actuals-table"><thead><tr style="background:var(--bg-surface-2);">' +
    '<th style="padding:8px;text-align:center;font-size:11px;color:var(--text-muted);font-weight:700;border-bottom:2px solid var(--border-medium);width:35px;">#</th>' +
    '<th style="padding:8px;text-align:left;font-size:11px;color:var(--text-muted);font-weight:700;border-bottom:2px solid var(--border-medium);">Item</th>' +
    '<th style="padding:8px;text-align:center;font-size:11px;color:var(--text-muted);font-weight:700;border-bottom:2px solid var(--border-medium);">Est Qty</th>' +
    '<th style="padding:8px;text-align:center;font-size:11px;color:var(--accent-teal);font-weight:700;border-bottom:2px solid var(--border-medium);">Act Qty</th>' +
    '<th style="padding:8px;text-align:right;font-size:11px;color:var(--text-muted);font-weight:700;border-bottom:2px solid var(--border-medium);">Est $/Unit</th>' +
    '<th style="padding:8px;text-align:right;font-size:11px;color:var(--accent-teal);font-weight:700;border-bottom:2px solid var(--border-medium);">Act $/Unit</th>' +
    '<th style="padding:8px;text-align:center;font-size:11px;color:var(--accent-teal);font-weight:700;border-bottom:2px solid var(--border-medium);">Act Labor Hrs</th>' +
    '<th style="padding:8px;text-align:right;font-size:11px;color:var(--text-muted);font-weight:700;border-bottom:2px solid var(--border-medium);">Act Ext Cost</th>' +
    '<th style="padding:8px;text-align:center;font-size:11px;color:var(--text-muted);font-weight:700;border-bottom:2px solid var(--border-medium);">Variance</th>' +
    '</tr></thead><tbody>' + rows +
    '<tr class="actuals-summary-row"><td colspan="2" style="text-align:right;font-weight:700;">TOTALS</td><td style="text-align:center;">—</td><td style="text-align:center;">—</td>' +
    '<td style="text-align:right;" id="actuals-total-est-cost">' + _fmtActDollar(totalEstCost) + '</td>' +
    '<td style="text-align:right;" id="actuals-total-act-cost">' + _fmtActDollar(totalActCost) + '</td>' +
    '<td style="text-align:center;" id="actuals-total-act-labor">' + totalActLabor.toFixed(1) + '</td>' +
    '<td style="text-align:right;" id="actuals-total-ext">' + _fmtActDollar(totalActCost) + '</td>' +
    '<td style="text-align:center;" id="actuals-total-var"><span class="variance-badge ' + _varianceClass(overallVar) + '">' + _fmtPct(overallVar) + '</span></td>' +
    '</tr></tbody></table></div>' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;flex-wrap:wrap;gap:10px;">' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
    '<div style="font-size:12px;padding:8px 14px;border:1px solid var(--border-subtle);background:var(--bg-surface-2);">Estimated: <strong>' + _fmtActDollar(totalEstCost) + '</strong></div>' +
    '<div style="font-size:12px;padding:8px 14px;border:1px solid var(--border-subtle);background:var(--bg-surface-2);">Actual: <strong id="actuals-summary-actual">' + _fmtActDollar(totalActCost) + '</strong></div>' +
    '<div style="font-size:12px;padding:8px 14px;border:1px solid var(--border-subtle);" id="actuals-summary-overall">Variance: <strong class="' + _varianceClass(overallVar) + '">' + _fmtPct(overallVar) + '</strong></div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;">' +
    '<button id="btn-save-actuals" style="padding:10px 20px;border:1px solid rgba(5,150,105,0.3);background:rgba(5,150,105,0.08);color:#059669;font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-sans);">Save Actuals</button>' +
    '<button id="btn-update-benchmarks" style="padding:10px 20px;border:1px solid rgba(13,148,136,0.3);background:rgba(13,148,136,0.08);color:var(--accent-teal);font-size:13px;font-weight:600;cursor:pointer;font-family:var(--font-sans);">Update Benchmarks</button>' +
    '</div></div>' +
    '<div style="margin-top:10px;font-size:11px;color:var(--text-muted);display:flex;gap:16px;">' +
    '<span><span class="variance-badge variance-green" style="padding:1px 6px;">Green</span> Within 10%</span>' +
    '<span><span class="variance-badge variance-yellow" style="padding:1px 6px;">Yellow</span> 10-25% off</span>' +
    '<span><span class="variance-badge variance-red" style="padding:1px 6px;">Red</span> &gt;25% off</span></div>';

  var table = document.getElementById('actuals-table');
  if (table) {
    var _actDebounce = null;
    table.addEventListener('input', function(e) {
      if (!e.target.classList.contains('actuals-input')) return;
      clearTimeout(_actDebounce);
      _actDebounce = setTimeout(function() { _recalcActuals(bom); }, 200);
    });
  }
  var saveBtn = document.getElementById('btn-save-actuals');
  if (saveBtn) {
    saveBtn.addEventListener('click', async function() {
      saveBtn.disabled = true; saveBtn.textContent = 'Saving...';
      try {
        var items = _collectActualsItems(bom, projectName);
        var res = await fetchWithRetry('/api/estimates/' + estimateId + '/actuals', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-App-Token': _appToken }, body: JSON.stringify({ items: items }), _timeout: 15000 }, 3);
        var data = await res.json();
        if (data.error) throw new Error(data.error);
        spToast('Actuals saved — ' + data.inserted + ' items recorded', 'success');
      } catch (err) { console.error('[SmartPlans]', err); spToast('Failed to save actuals. Please try again.', 'error'); }
      finally { saveBtn.disabled = false; saveBtn.textContent = 'Save Actuals'; }
    });
  }
  var benchBtn = document.getElementById('btn-update-benchmarks');
  if (benchBtn) {
    benchBtn.addEventListener('click', async function() {
      benchBtn.disabled = true; benchBtn.textContent = 'Recalculating...';
      try {
        var res = await fetchWithRetry('/api/benchmarks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', _timeout: 20000 }, 3);
        var data = await res.json();
        if (data.error) throw new Error(data.error);
        spToast('Benchmarks updated — ' + (data.updated || 0) + ' items aggregated', 'success');
      } catch (err) { console.error('[SmartPlans]', err); spToast('Failed to update benchmarks. Please try again.', 'error'); }
      finally { benchBtn.disabled = false; benchBtn.textContent = 'Update Benchmarks'; }
    });
  }
}

function _recalcActuals(bom) {
  var totalEstCost = 0, totalActCost = 0, totalActLabor = 0;
  bom.categories.forEach(function(cat, ci) {
    cat.items.forEach(function(item, ii) {
      var row = document.querySelector('[data-actuals-row="' + ci + '-' + ii + '"]');
      if (!row) return;
      var estExt = (item.qty || 0) * (item.unitCost || 0);
      totalEstCost += estExt;
      var actQty = parseFloat(row.querySelector('.actuals-qty').value) || 0;
      var actUC = parseFloat(row.querySelector('.actuals-cost').value) || 0;
      var actLab = parseFloat(row.querySelector('.actuals-labor').value) || 0;
      var actExt = actQty * actUC;
      totalActCost += actExt; totalActLabor += actLab;
      var vPct = estExt > 0 ? ((actExt - estExt) / estExt) * 100 : 0;
      var extCell = row.querySelector('.actuals-ext');
      if (extCell) extCell.textContent = _fmtActDollar(actExt);
      var varCell = row.querySelector('.actuals-var-cell');
      if (varCell) varCell.innerHTML = '<span class="variance-badge ' + _varianceClass(vPct) + '">' + _fmtPct(vPct) + '</span>';
    });
  });
  var overallVar = totalEstCost > 0 ? ((totalActCost - totalEstCost) / totalEstCost) * 100 : 0;
  var el = function(id) { return document.getElementById(id); };
  if (el('actuals-total-act-cost')) el('actuals-total-act-cost').textContent = _fmtActDollar(totalActCost);
  if (el('actuals-total-ext')) el('actuals-total-ext').textContent = _fmtActDollar(totalActCost);
  if (el('actuals-total-act-labor')) el('actuals-total-act-labor').textContent = totalActLabor.toFixed(1);
  if (el('actuals-total-var')) el('actuals-total-var').innerHTML = '<span class="variance-badge ' + _varianceClass(overallVar) + '">' + _fmtPct(overallVar) + '</span>';
  if (el('actuals-summary-actual')) el('actuals-summary-actual').textContent = _fmtActDollar(totalActCost);
  if (el('actuals-summary-overall')) el('actuals-summary-overall').innerHTML = 'Variance: <strong class="' + _varianceClass(overallVar) + '">' + _fmtPct(overallVar) + '</strong>';
}

function _collectActualsItems(bom, projectName) {
  var items = [];
  bom.categories.forEach(function(cat, ci) {
    cat.items.forEach(function(item, ii) {
      var row = document.querySelector('[data-actuals-row="' + ci + '-' + ii + '"]');
      if (!row) return;
      items.push({
        project_name: projectName || '', category: cat.name || 'General', item_name: item.name || '',
        estimated_qty: item.qty || 0, actual_qty: parseFloat(row.querySelector('.actuals-qty').value) || 0,
        estimated_unit_cost: item.unitCost || 0, actual_unit_cost: parseFloat(row.querySelector('.actuals-cost').value) || 0,
        estimated_labor_hours: item.laborHours || 0, actual_labor_hours: parseFloat(row.querySelector('.actuals-labor').value) || 0,
      });
    });
  });
  return items;
}

function closeActualsPanel() {
  var backdrop = document.querySelector('.saved-panel-backdrop');
  var panel = document.getElementById('actuals-panel');
  if (backdrop) backdrop.remove();
  if (panel) panel.remove();
}

// ═══════════════════════════════════════════════════════════════
// BENCHMARK INTEGRATION
// ═══════════════════════════════════════════════════════════════

var _benchmarkCache = null;
var _benchmarkCacheTime = 0;
var BENCHMARK_CACHE_TTL = 5 * 60 * 1000;

async function _loadBenchmarks() {
  var now = Date.now();
  if (_benchmarkCache && (now - _benchmarkCacheTime) < BENCHMARK_CACHE_TTL) return _benchmarkCache;
  try {
    var res = await fetchWithRetry('/api/benchmarks', { _timeout: 30000 }, 2);
    var data = await res.json();
    if (!data.error && data.benchmarks) {
      _benchmarkCache = {};
      data.benchmarks.forEach(function(b) { _benchmarkCache[b.item_name.toLowerCase()] = b; });
      _benchmarkCacheTime = now;
    }
  } catch (err) { console.warn('[SmartPlans] Failed to load benchmarks:', err.message); }
  return _benchmarkCache || {};
}

function _getBenchmarkHTML(itemName) {
  if (!_benchmarkCache) return '';
  var b = _benchmarkCache[(itemName || '').toLowerCase()];
  if (!b || b.sample_count < 1) return '';
  var avg = _fmtActDollar(b.avg_unit_cost), mn = _fmtActDollar(b.min_unit_cost), mx = _fmtActDollar(b.max_unit_cost);
  var tip = 'Based on ' + b.sample_count + ' project' + (b.sample_count > 1 ? 's' : '') + ': avg ' + avg + '/unit (range ' + mn + '–' + mx + ')';
  return '<span class="benchmark-indicator" title="' + tip + '">📊 Benchmark<span class="benchmark-tooltip">' + tip + '</span></span>';
}

async function _injectBenchmarksIntoBOM() {
  var benchmarks = await _loadBenchmarks();
  if (!benchmarks || Object.keys(benchmarks).length === 0) return;
  var table = document.getElementById('bom-editable-table');
  if (!table) return;
  table.querySelectorAll('tbody tr[data-bom-item]').forEach(function(row) {
    var nameCell = row.querySelectorAll('td')[1];
    if (!nameCell) return;
    var itemName = nameCell.getAttribute('title') || nameCell.textContent.trim();
    var html = _getBenchmarkHTML(itemName);
    if (html) {
      nameCell.style.position = 'relative';
      var span = document.createElement('span');
      span.innerHTML = html; span.style.marginLeft = '6px';
      nameCell.appendChild(span);
    }
  });
  if (!document.getElementById('btn-apply-benchmarks')) {
    var bomToggle = document.getElementById('bom-table-toggle');
    if (bomToggle) {
      var btn = document.createElement('button');
      btn.id = 'btn-apply-benchmarks';
      btn.style.cssText = 'margin-left:auto;margin-right:8px;padding:5px 12px;border:1px solid rgba(13,148,136,0.3);background:rgba(13,148,136,0.06);color:var(--accent-teal);font-size:11px;font-weight:600;cursor:pointer;font-family:var(--font-sans);';
      btn.textContent = '📊 Apply Benchmarks';
      btn.addEventListener('click', function(e) { e.stopPropagation(); _applyBenchmarksToBOM(); });
      bomToggle.insertBefore(btn, bomToggle.querySelector('#bom-toggle-icon'));
    }
  }
}

function _applyBenchmarksToBOM() {
  if (!_benchmarkCache) return;
  var table = document.getElementById('bom-editable-table');
  if (!table) return;
  var applied = 0;
  table.querySelectorAll('.bom-edit-cost').forEach(function(input) {
    var row = input.closest('tr');
    if (!row) return;
    var nameCell = row.querySelectorAll('td')[1];
    if (!nameCell) return;
    var itemName = (nameCell.getAttribute('title') || nameCell.textContent.trim()).toLowerCase();
    var b = _benchmarkCache[itemName];
    if (b && b.avg_unit_cost > 0) {
      input.value = b.avg_unit_cost.toFixed(2);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      applied++;
    }
  });
  spToast(applied > 0 ? 'Applied benchmark pricing to ' + applied + ' items' : 'No matching benchmarks found', applied > 0 ? 'success' : 'info');
}


// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════

// BID STRATEGY CARD STUB
if (typeof buildBidStrategyCard === 'undefined') { var buildBidStrategyCard = function() { return ''; }; }

// ═══════════════════════════════════════════════════════════════
// CABLE PATHWAY SUMMARY CARD — Results page
// ═══════════════════════════════════════════════════════════════

function buildCablePathwayCard(st) {
  if (!st.aiAnalysis) return '';
  const cable = st.brainResults?.wave1?.CABLE_PATHWAY;
  if (!cable) {
    const cableFailed = st.brainResults?.wave1 && !st.brainResults.wave1.CABLE_PATHWAY;
    if (cableFailed) {
      return `
      <div class="info-card" style="border:1px solid rgba(245,158,11,0.25);background:rgba(245,158,11,0.04);margin-top:18px;">
        <div class="info-card-title" style="color:var(--accent-amber);">
          <i data-lucide="cable" style="width:18px;height:18px;"></i> Cable Pathway Analysis
        </div>
        <div class="info-card-body" style="font-size:13px;line-height:1.7;color:var(--text-muted);">
          ⚠️ The Cable Pathway brain did not complete successfully during this analysis run.
          <strong>Re-run the analysis</strong> to attempt cable pathway scanning again. When successful, you'll see cable run distances, conduit requirements, and TIA violation flags.
        </div>
      </div>`;
    }
    return '';
  }

  const pathway = computePathwayDistances();
  const { results, grandTotalFt, grandTotalCost, tiaViolations, hasSpatialZones, hasDimensions, bldgW, bldgD } = pathway;
  if (results.length === 0) return '';

  const fmt  = n => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtFt = n => (n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' ft';
  const open = st._cablePathwayOpen;

  // Per-sheet scale info
  const spatial = st.brainResults?.wave0?.SPATIAL_LAYOUT || {};
  const sheetScales = (spatial.sheets || []).filter(s => s.scale);
  const scaleInfoParts = sheetScales.length > 0
    ? sheetScales.map(s => {
        const method = s.scale.scale_method === 'door_reference' ? '🚪 door ref'
          : s.scale.scale_method === 'title_block' ? '📋 title block'
          : s.scale.scale_method === 'scale_bar' ? '📏 scale bar'
          : s.scale.scale_method === 'dimension_line' ? '📐 dim line'
          : '⚠️ estimated';
        return `<strong>${s.sheet_id || '?'}</strong>: ${s.scale.labeled || s.scale.ft_per_inch + ' ft/in'} (${method})`;
      }).join(' · ')
    : 'No per-sheet scale data — using AI zone estimates';
  const scaleInfo = sheetScales.length > 0
    ? `Detected ${sheetScales.length} sheet scale${sheetScales.length > 1 ? 's' : ''}: ${scaleInfoParts}`
    : scaleInfoParts;

  // Mode badge
  const modeBadge = hasDimensions
    ? `<span style="background:rgba(13,148,136,0.12);color:var(--accent-teal);font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">📐 Spatially Calculated</span>`
    : hasSpatialZones
      ? `<span style="background:rgba(99,102,241,0.12);color:var(--accent-indigo);font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">🏢 Zone Estimated</span>`
      : `<span style="background:rgba(107,114,128,0.12);color:var(--text-muted);font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">~ Average Estimate</span>`;

  // Scale detection info
  const scaleInfoBanner = `
    <div style="margin-bottom:12px;padding:8px 12px;background:rgba(99,102,241,0.04);border:1px solid rgba(99,102,241,0.12);border-radius:8px;font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:8px;">
      <span style="font-size:14px;">📐</span>
      <span>${scaleInfo}${hasDimensions ? ` — Floor plate: ${bldgW} × ${bldgD} ft` : ''}</span>
    </div>`;

  // TIA warning banner
  const tiaWarning = tiaViolations.length > 0 ? `
    <div style="margin-bottom:14px;padding:10px 14px;background:rgba(220,38,38,0.06);border:1px solid rgba(220,38,38,0.2);border-radius:8px;display:flex;align-items:flex-start;gap:10px;">
      <span style="font-size:18px;flex-shrink:0;">🚨</span>
      <div>
        <div style="font-size:12px;font-weight:700;color:#DC2626;margin-bottom:4px;">TIA-568 Horizontal Cable Limit Exceeded (295 ft max)</div>
        <div style="font-size:11px;color:var(--text-muted);">${tiaViolations.length} zone${tiaViolations.length > 1 ? 's exceed' : ' exceeds'} the 295 ft limit: ${tiaViolations.map(z => `${z.zone} (${z.runFt} ft)`).join(', ')}. Consider adding an IDF or relocating the telecom room — this is a potential change order.</div>
      </div>
    </div>` : '';

  // Summary stats bar
  const statsBar = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:16px;">
      <div style="background:rgba(13,148,136,0.06);border:1px solid rgba(13,148,136,0.12);border-radius:8px;padding:10px 12px;text-align:center;">
        <div style="font-size:18px;font-weight:800;color:var(--accent-teal);">${fmtFt(grandTotalFt)}</div>
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Total Cable (w/ 12% waste)</div>
      </div>
      <div style="background:rgba(13,148,136,0.06);border:1px solid rgba(13,148,136,0.12);border-radius:8px;padding:10px 12px;text-align:center;">
        <div style="font-size:18px;font-weight:800;color:var(--accent-teal);">${fmt(grandTotalCost)}</div>
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Cable Material Cost</div>
      </div>
      ${hasDimensions ? `
      <div style="background:rgba(13,148,136,0.06);border:1px solid rgba(13,148,136,0.12);border-radius:8px;padding:10px 12px;text-align:center;">
        <div style="font-size:18px;font-weight:800;color:var(--accent-teal);">${bldgW}×${bldgD}</div>
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Floor Plate (ft)</div>
      </div>` : ''}
      ${tiaViolations.length > 0 ? `
      <div style="background:rgba(220,38,38,0.06);border:1px solid rgba(220,38,38,0.15);border-radius:8px;padding:10px 12px;text-align:center;">
        <div style="font-size:18px;font-weight:800;color:#DC2626;">${tiaViolations.length}</div>
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">TIA-568 Violations</div>
      </div>` : `
      <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.12);border-radius:8px;padding:10px 12px;text-align:center;">
        <div style="font-size:18px;font-weight:800;color:#10B981;">✓</div>
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">TIA-568 Compliant</div>
      </div>`}
    </div>`;

  // Zone breakdown tables by cable type
  const tables = results.map(r => {
    const rows = r.zones.map(z => `
      <tr style="border-bottom:1px solid rgba(0,0,0,0.04);">
        <td style="padding:7px 10px;font-size:12px;color:var(--text-primary);">${z.zone || '—'}</td>
        <td style="padding:7px 10px;font-size:12px;color:var(--text-muted);">${z.idf || '—'}</td>
        <td style="padding:7px 10px;font-size:12px;text-align:center;">${z.deviceCount}</td>
        <td style="padding:7px 10px;font-size:12px;text-align:center;">
          <span style="font-weight:600;color:${z.tiaFlag ? '#DC2626' : z.runFt < 100 ? '#10B981' : 'var(--text-primary)'};">${z.runFt} ft</span>
          ${z.tiaFlag ? ' 🚨' : z.runFt < 100 ? ' ✓' : ''}
        </td>
        <td style="padding:7px 10px;font-size:12px;text-align:right;font-weight:600;">${fmtFt(z.totalFt)}</td>
        <td style="padding:7px 10px;font-size:12px;text-align:right;color:var(--accent-teal);">${fmt(z.cost)}</td>
        <td style="padding:7px 10px;font-size:10px;color:var(--text-muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${z.basis}">${z.basis}</td>
      </tr>`).join('');

    const typeTotalFt = r.zones.reduce((s, z) => s + z.totalFt, 0);
    const typeTotalCost = r.zones.reduce((s, z) => s + z.cost, 0);
    const modeLabel = r.mode === 'spatial' ? '📐 Coordinate math' : r.mode === 'zone-estimate' ? '🏢 AI zone estimate' : '~ Flat average';

    return `
      <div style="margin-bottom:20px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="font-size:13px;font-weight:700;color:var(--text-primary);">
            ${r.cableType.toUpperCase().replace(/_/g,' ')} ${r.rating ? '(' + r.rating + ')' : ''}
          </div>
          <div style="font-size:11px;color:var(--text-muted);">${modeLabel} &nbsp;|&nbsp; $${r.ratePerFt.toFixed(2)}/ft</div>
        </div>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:rgba(13,148,136,0.06);">
                <th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--accent-teal);font-weight:700;border-bottom:2px solid rgba(13,148,136,0.12);white-space:nowrap;">Zone / Area</th>
                <th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--accent-teal);font-weight:700;border-bottom:2px solid rgba(13,148,136,0.12);">IDF Served By</th>
                <th style="padding:8px 10px;text-align:center;font-size:10px;color:var(--accent-teal);font-weight:700;border-bottom:2px solid rgba(13,148,136,0.12);">Devices</th>
                <th style="padding:8px 10px;text-align:center;font-size:10px;color:var(--accent-teal);font-weight:700;border-bottom:2px solid rgba(13,148,136,0.12);">Run Length</th>
                <th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--accent-teal);font-weight:700;border-bottom:2px solid rgba(13,148,136,0.12);">Total Cable</th>
                <th style="padding:8px 10px;text-align:right;font-size:10px;color:var(--accent-teal);font-weight:700;border-bottom:2px solid rgba(13,148,136,0.12);">Est. Cost</th>
                <th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--accent-teal);font-weight:700;border-bottom:2px solid rgba(13,148,136,0.12);">Basis</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr style="background:rgba(13,148,136,0.04);">
                <td colspan="4" style="padding:8px 10px;font-size:12px;font-weight:700;color:var(--text-primary);">Subtotal</td>
                <td style="padding:8px 10px;font-size:12px;font-weight:700;text-align:right;">${fmtFt(typeTotalFt)}</td>
                <td style="padding:8px 10px;font-size:12px;font-weight:700;color:var(--accent-teal);text-align:right;">${fmt(typeTotalCost)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>`;
  }).join('');

  // Backbone cables summary (from CABLE_PATHWAY + RISER_DIAGRAM_ANALYZER)
  // Merge backbone data from both sources, prefer CABLE_PATHWAY (has avg_length_ft schema)
  const riserBackbones = state.brainResults?.wave1?.RISER_DIAGRAM_ANALYZER?.backbone_cables || [];
  let backbones = (cable.backbone_cables || []);
  if (backbones.length === 0 && riserBackbones.length > 0) {
    backbones = riserBackbones;
  }
  // Fill in missing avg_length_ft from building dimensions or riser data
  const _floorH = state.floorToFloorHeight || 14;
  const _bldgW = state.floorPlateWidth || 0;
  const _bldgD = state.floorPlateDepth || 0;
  const _mdfIdf = state.brainResults?.wave1?.MDF_IDF_ANALYZER || {};
  const _roomCount = (_mdfIdf.rooms || _mdfIdf.idf_rooms || []).length + (_mdfIdf.mdf_room ? 1 : 0);
  backbones.forEach(b => {
    if (!b.avg_length_ft && b.total_length_ft && b.runs > 0) {
      b.avg_length_ft = Math.round(b.total_length_ft / b.runs);
      b._lengthBasis = 'calculated from total_length_ft ÷ runs';
    }
    if (!b.avg_length_ft) {
      // Estimate: avg backbone run = building diagonal/2 + floor-to-floor + 30ft slack
      const diag = (_bldgW > 0 && _bldgD > 0) ? Math.sqrt(_bldgW * _bldgW + _bldgD * _bldgD) : 200;
      b.avg_length_ft = Math.round(diag / 2 + _floorH + 30);
      b._lengthBasis = 'estimated (building diagonal/2 + floor height + slack)';
    }
  });
  const backboneHtml = backbones.length > 0 ? `
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(0,0,0,0.06);">
      <div style="font-size:13px;font-weight:700;color:var(--text-primary);margin-bottom:8px;">Backbone / Riser Cables</div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:rgba(99,102,241,0.06);">
              <th style="padding:7px 10px;text-align:left;font-size:10px;color:var(--accent-indigo);font-weight:700;border-bottom:2px solid rgba(99,102,241,0.12);">Type</th>
              <th style="padding:7px 10px;text-align:center;font-size:10px;color:var(--accent-indigo);font-weight:700;border-bottom:2px solid rgba(99,102,241,0.12);">Strands/Pairs</th>
              <th style="padding:7px 10px;text-align:center;font-size:10px;color:var(--accent-indigo);font-weight:700;border-bottom:2px solid rgba(99,102,241,0.12);">Runs</th>
              <th style="padding:7px 10px;text-align:right;font-size:10px;color:var(--accent-indigo);font-weight:700;border-bottom:2px solid rgba(99,102,241,0.12);">Avg Length</th>
            </tr>
          </thead>
          <tbody>
            ${backbones.map(b => `
              <tr style="border-bottom:1px solid rgba(0,0,0,0.04);">
                <td style="padding:7px 10px;font-size:12px;">${(b.type||'').toUpperCase().replace(/_/g,' ')}</td>
                <td style="padding:7px 10px;font-size:12px;text-align:center;">${b.strand_count || b.pairs || '—'}</td>
                <td style="padding:7px 10px;font-size:12px;text-align:center;">${b.runs || '—'}</td>
                <td style="padding:7px 10px;font-size:12px;text-align:right;" title="${b._lengthBasis || 'from drawings'}">${b.avg_length_ft ? b.avg_length_ft + ' ft' + (b._lengthBasis ? ' *' : '') : '—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : '';

  return `
    <div style="border-top:1px solid rgba(0,0,0,0.06);margin:24px 0;"></div>
    <div class="info-card" style="margin-bottom:22px;border:1px solid rgba(13,148,136,0.15);background:#FFFFFF;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding-left:8px;cursor:pointer;" id="cable-pathway-toggle">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="info-card-title" style="margin-bottom:0;">
            <i data-lucide="cable" style="width:16px;height:16px;"></i> Cable Pathway Analysis
          </div>
          ${modeBadge}
        </div>
        <span id="cable-pathway-toggle-icon" style="font-size:14px;color:var(--text-muted);transition:transform 0.2s;padding:8px;">${open ? '▼' : '▶'}</span>
      </div>
      <div id="cable-pathway-collapsible" style="display:${open ? 'block' : 'none'};margin-top:12px;">
        <div class="info-card-body" style="margin-bottom:12px;">
          Per-zone cable run lengths calculated from floor plan geometry and IDF locations.
          ${hasDimensions ? `Building: <strong>${bldgW} ft × ${bldgD} ft</strong>. ` : ''}
          Includes 12% waste factor. Run lengths color-coded: <span style="color:#10B981;font-weight:600;">green &lt; 100 ft</span> · <span style="color:var(--text-primary);font-weight:600;">neutral 100–295 ft</span> · <span style="color:#DC2626;font-weight:600;">red &gt; 295 ft (TIA-568 violation)</span>.
        </div>
        ${scaleInfoBanner}
        ${tiaWarning}
        ${statsBar}
        ${tables}
        ${backboneHtml}
        ${!hasDimensions ? `
        <div style="margin-top:12px;padding:10px 14px;background:rgba(99,102,241,0.04);border:1px solid rgba(99,102,241,0.12);border-radius:8px;font-size:11px;color:var(--text-muted);">
          💡 <strong>Improve accuracy:</strong> Enter your building's floor plate dimensions in Stage 1 (Setup) to switch from AI zone estimates to precise coordinate-based calculations.
        </div>` : ''}
      </div>
    </div>`;
}

function bindCablePathwayEvents(container) {
  const toggle = document.getElementById('cable-pathway-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      state._cablePathwayOpen = !state._cablePathwayOpen;
      const body = document.getElementById('cable-pathway-collapsible');
      const icon = document.getElementById('cable-pathway-toggle-icon');
      if (body) body.style.display = state._cablePathwayOpen ? 'block' : 'none';
      if (icon) icon.textContent = state._cablePathwayOpen ? '▼' : '▶';
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// SYMBOL INVENTORY AUDIT — Per-sheet/per-location device verification
// Extracts device_inventory from SYMBOL_SCANNER brain results
// and cross-references sheets to detect potential duplicate counts
// ═══════════════════════════════════════════════════════════════

/**
 * Extract, normalize, and enrich the raw device inventory from SYMBOL_SCANNER.
 * Returns { items[], duplicates[], deviceTypes[], sheetIds[], stats }.
 */
function getSymbolInventoryData(st) {
  const scanner = st.brainResults?.wave1?.SYMBOL_SCANNER;
  if (!scanner) return null;

  // Gather items from device_inventory (preferred) or sheets[].symbols[].device_locations
  let rawItems = [];

  if (Array.isArray(scanner.device_inventory) && scanner.device_inventory.length > 0) {
    rawItems = scanner.device_inventory.map((d, i) => ({
      _idx: i,
      type: String(d.type || 'unknown').toLowerCase().trim(),
      subtype: (d.subtype || '').toLowerCase().trim(),
      room: String(d.room || d.location || 'Unspecified').trim(),
      floor: String(d.floor || 'Unknown Floor').trim(),
      sheet: String(d.sheet || d.sheet_id || 'N/A').trim(),
      qty: parseInt(d.qty || d.count || 1) || 1,
      confidence: d.confidence || null,
    }));
  } else if (Array.isArray(scanner.sheets)) {
    // Fallback: reconstruct from sheets[].symbols[].device_locations
    scanner.sheets.forEach(sh => {
      const sheetId = sh.sheet_id || sh.sheet_name || 'N/A';
      (sh.symbols || []).forEach(sym => {
        if (Array.isArray(sym.device_locations)) {
          sym.device_locations.forEach(dl => {
            rawItems.push({
              _idx: rawItems.length,
              type: String(sym.type || 'unknown').toLowerCase().trim(),
              subtype: (sym.subtype || '').toLowerCase().trim(),
              room: String(dl.room || dl.area || 'Unspecified').trim(),
              floor: '',
              sheet: String(sheetId).trim(),
              qty: parseInt(dl.qty || dl.count || 1) || 1,
              confidence: sym.confidence || null,
            });
          });
        } else {
          // No per-location breakdown — one aggregate row per symbol per sheet
          rawItems.push({
            _idx: rawItems.length,
            type: String(sym.type || 'unknown').toLowerCase().trim(),
            subtype: (sym.subtype || '').toLowerCase().trim(),
            room: Array.isArray(sym.locations) ? sym.locations.join(', ') : 'Various',
            floor: '',
            sheet: String(sheetId).trim(),
            qty: parseInt(sym.count || 1) || 1,
            confidence: sym.confidence || null,
          });
        }
      });
    });
  }

  if (rawItems.length === 0) return null;

  // Enrich floor data from PER_FLOOR_ANALYZER if available
  const floorData = st.brainResults?.wave1_5?.PER_FLOOR_ANALYZER?.floor_breakdown || [];
  if (floorData.length > 0) {
    const sheetToFloor = {};
    floorData.forEach(fb => {
      (fb.sheets || []).forEach(s => { sheetToFloor[s] = fb.floor; });
    });
    rawItems.forEach(item => {
      if ((!item.floor || item.floor === 'Unknown Floor') && sheetToFloor[item.sheet]) {
        item.floor = sheetToFloor[item.sheet];
      }
    });
  }

  // Collect unique device types and sheet IDs
  const deviceTypes = [...new Set(rawItems.map(d => d.type))].sort();
  const sheetIds = [...new Set(rawItems.map(d => d.sheet))].sort((a, b) => {
    // Natural sort: E1.01 before E2.01 before ED1.01
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });

  // Duplicate detection: same (type + subtype + room) appearing on different sheets
  const locationMap = {};
  rawItems.forEach(item => {
    const key = `${item.type}|${item.subtype}|${item.room.toLowerCase()}`;
    if (!locationMap[key]) locationMap[key] = [];
    locationMap[key].push(item);
  });

  const duplicates = [];
  for (const [key, items] of Object.entries(locationMap)) {
    const uniqueSheets = [...new Set(items.map(i => i.sheet))];
    if (uniqueSheets.length > 1) {
      const [type, subtype, room] = key.split('|');
      const totalQty = items.reduce((s, i) => s + i.qty, 0);
      duplicates.push({
        type, subtype, room,
        sheets: uniqueSheets,
        items,
        totalQty,
        label: `${type}${subtype ? ' – ' + subtype : ''} in "${room}"`,
      });
    }
  }

  // Stats
  const totalSymbols = rawItems.reduce((s, i) => s + i.qty, 0);
  const uniqueLocations = new Set(rawItems.map(i => `${i.room}|${i.floor}`)).size;

  return {
    items: rawItems,
    duplicates,
    deviceTypes,
    sheetIds,
    stats: {
      totalSymbols,
      totalRows: rawItems.length,
      uniqueLocations,
      sheetsScanned: sheetIds.length,
      duplicateGroups: duplicates.length,
      duplicateQty: duplicates.reduce((s, d) => s + d.totalQty, 0),
    },
  };
}

function buildSymbolInventoryCard(st) {
  if (!st.aiAnalysis) return '';
  const data = getSymbolInventoryData(st);
  if (!data) {
    // Show placeholder so users know the feature exists but needs successful brain data
    const scannerFailed = st.brainResults?.wave1 && !st.brainResults.wave1.SYMBOL_SCANNER;
    if (scannerFailed) {
      return `
      <div class="info-card" style="border:1px solid rgba(245,158,11,0.25);background:rgba(245,158,11,0.04);margin-top:18px;">
        <div class="info-card-title" style="color:var(--accent-amber);">
          <i data-lucide="scan-line" style="width:18px;height:18px;"></i> Symbol Inventory Audit
        </div>
        <div class="info-card-body" style="font-size:13px;line-height:1.7;color:var(--text-muted);">
          ⚠️ The Symbol Scanner brain did not complete successfully during this analysis run. This can happen when the AI service is overloaded (524/503 errors).
          <strong>Re-run the analysis</strong> to attempt symbol scanning again. When successful, you'll see a full inventory of every device symbol found on your drawings, organized by sheet, room, and type.
        </div>
      </div>`;
    }
    return '';
  }

  const open = st._symbolInventoryOpen;
  const { items, duplicates, deviceTypes, sheetIds, stats } = data;
  const sortBy = st._symbolInventorySort || 'sheet';
  const filterType = st._symbolInventoryFilter || '';

  // Sort items
  const sorted = [...items];
  sorted.sort((a, b) => {
    if (sortBy === 'sheet') return a.sheet.localeCompare(b.sheet, undefined, { numeric: true }) || a.room.localeCompare(b.room) || a.type.localeCompare(b.type);
    if (sortBy === 'type') return a.type.localeCompare(b.type) || a.subtype.localeCompare(b.subtype) || a.sheet.localeCompare(b.sheet, undefined, { numeric: true });
    if (sortBy === 'room') return a.room.localeCompare(b.room) || a.sheet.localeCompare(b.sheet, undefined, { numeric: true });
    if (sortBy === 'floor') return a.floor.localeCompare(b.floor) || a.sheet.localeCompare(b.sheet, undefined, { numeric: true }) || a.room.localeCompare(b.room);
    return 0;
  });

  // Apply type filter
  const filtered = filterType ? sorted.filter(i => i.type === filterType) : sorted;
  const filteredTotal = filtered.reduce((s, i) => s + i.qty, 0);

  // Build rows for visible items (capped at 500 for performance)
  const displayItems = filtered.slice(0, 500);
  const truncated = filtered.length > 500;

  // Identify which items are part of duplicate groups for highlighting
  const dupItemIdxs = new Set();
  duplicates.forEach(d => d.items.forEach(i => dupItemIdxs.add(i._idx)));

  const rows = displayItems.map(item => {
    const isDup = dupItemIdxs.has(item._idx);
    const rowBg = isDup ? 'background:rgba(245,158,11,0.06);' : '';
    const typeLabel = item.type.replace(/_/g, ' ');
    const subtypeLabel = item.subtype ? item.subtype.replace(/_/g, ' ') : '';
    const confBadge = item.confidence != null
      ? `<span style="font-size:9px;padding:1px 5px;border-radius:10px;${item.confidence >= 90 ? 'background:rgba(16,185,129,0.1);color:#10B981;' : item.confidence >= 70 ? 'background:rgba(245,158,11,0.1);color:#D97706;' : 'background:rgba(220,38,38,0.1);color:#DC2626;'}">${item.confidence}%</span>`
      : '';
    return `<tr style="border-bottom:1px solid rgba(0,0,0,0.04);${rowBg}">
      <td style="padding:6px 10px;font-size:12px;font-weight:600;color:var(--accent-indigo);white-space:nowrap;">${esc(item.sheet)}</td>
      <td style="padding:6px 10px;font-size:12px;color:var(--text-muted);">${esc(item.floor)}</td>
      <td style="padding:6px 10px;font-size:12px;color:var(--text-primary);">${esc(item.room)}</td>
      <td style="padding:6px 10px;font-size:12px;color:var(--text-primary);text-transform:capitalize;">${esc(typeLabel)}</td>
      <td style="padding:6px 10px;font-size:11px;color:var(--text-muted);text-transform:capitalize;">${esc(subtypeLabel)}</td>
      <td style="padding:6px 10px;font-size:12px;text-align:center;font-weight:700;">${item.qty}</td>
      <td style="padding:6px 10px;text-align:center;">${confBadge}${isDup ? ' <span title="Appears on multiple sheets — possible duplicate" style="cursor:help;">⚠️</span>' : ''}</td>
    </tr>`;
  }).join('');

  // Filter dropdown
  const filterOptions = deviceTypes.map(t =>
    `<option value="${esc(t)}"${filterType === t ? ' selected' : ''}>${t.replace(/_/g, ' ')}</option>`
  ).join('');

  // Sort buttons
  const sortBtn = (key, label) =>
    `<button data-sort="${key}" class="sym-inv-sort" style="padding:3px 10px;font-size:10px;font-weight:${sortBy === key ? '700' : '500'};border:1px solid ${sortBy === key ? 'rgba(99,102,241,0.3)' : 'rgba(0,0,0,0.1)'};border-radius:4px;background:${sortBy === key ? 'rgba(99,102,241,0.08)' : 'transparent'};color:${sortBy === key ? 'var(--accent-indigo)' : 'var(--text-muted)'};cursor:pointer;text-transform:uppercase;letter-spacing:0.5px;">${label}</button>`;

  // Stats bar
  const statsBar = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:16px;">
      <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.12);border-radius:8px;padding:10px 12px;text-align:center;">
        <div style="font-size:18px;font-weight:800;color:var(--accent-indigo);">${stats.totalSymbols.toLocaleString()}</div>
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Total Counted</div>
      </div>
      <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.12);border-radius:8px;padding:10px 12px;text-align:center;">
        <div style="font-size:18px;font-weight:800;color:var(--accent-indigo);">${stats.uniqueLocations}</div>
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Unique Locations</div>
      </div>
      <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.12);border-radius:8px;padding:10px 12px;text-align:center;">
        <div style="font-size:18px;font-weight:800;color:var(--accent-indigo);">${stats.sheetsScanned}</div>
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Sheets Scanned</div>
      </div>
      ${stats.duplicateGroups > 0 ? `
      <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.15);border-radius:8px;padding:10px 12px;text-align:center;">
        <div style="font-size:18px;font-weight:800;color:#D97706;">⚠️ ${stats.duplicateGroups}</div>
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Potential Duplicates</div>
      </div>` : `
      <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.12);border-radius:8px;padding:10px 12px;text-align:center;">
        <div style="font-size:18px;font-weight:800;color:#10B981;">✓</div>
        <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">No Duplicates Found</div>
      </div>`}
    </div>`;

  // Duplicate alert panel
  const dupPanel = duplicates.length > 0 ? `
    <div style="margin-bottom:16px;padding:12px 14px;background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.2);border-radius:8px;">
      <div style="font-size:12px;font-weight:700;color:#D97706;margin-bottom:8px;">⚠️ Potential Duplicate Counts (${duplicates.length} group${duplicates.length > 1 ? 's' : ''})</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">The following devices appear at the same location on multiple sheets. This may indicate enlarged details or partial plans that overlap — verify these are not double-counted.</div>
      ${duplicates.slice(0, 20).map(d => `
        <div style="padding:6px 0;border-bottom:1px solid rgba(245,158,11,0.1);display:flex;align-items:flex-start;gap:8px;">
          <span style="font-size:14px;flex-shrink:0;">⚠️</span>
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--text-primary);text-transform:capitalize;">${esc(d.label)}</div>
            <div style="font-size:11px;color:var(--text-muted);">Sheets: <strong>${d.sheets.map(s => esc(s)).join(', ')}</strong> &mdash; total qty across sheets: <strong>${d.totalQty}</strong></div>
          </div>
        </div>`).join('')}
      ${duplicates.length > 20 ? `<div style="font-size:11px;color:var(--text-muted);margin-top:8px;">...and ${duplicates.length - 20} more groups</div>` : ''}
    </div>` : '';

  return `
    <div id="sym-inv-wrapper">
    <div style="border-top:1px solid rgba(0,0,0,0.06);margin:24px 0;"></div>
    <div class="info-card" style="margin-bottom:22px;border:1px solid rgba(99,102,241,0.15);background:#FFFFFF;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding-left:8px;cursor:pointer;" id="sym-inv-toggle">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="info-card-title" style="margin-bottom:0;">
            <i data-lucide="scan-search" style="width:16px;height:16px;"></i> Symbol Inventory Audit
          </div>
          <span style="background:rgba(99,102,241,0.12);color:var(--accent-indigo);font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">${stats.totalSymbols.toLocaleString()} symbols on ${stats.sheetsScanned} sheets</span>
          ${stats.duplicateGroups > 0 ? `<span style="background:rgba(245,158,11,0.12);color:#D97706;font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;">⚠️ ${stats.duplicateGroups} duplicate${stats.duplicateGroups > 1 ? 's' : ''}</span>` : ''}
        </div>
        <span id="sym-inv-toggle-icon" style="font-size:14px;color:var(--text-muted);transition:transform 0.2s;padding:8px;">${open ? '▼' : '▶'}</span>
      </div>
      <div id="sym-inv-collapsible" style="display:${open ? 'block' : 'none'};margin-top:12px;">
        <div class="info-card-body" style="margin-bottom:12px;">
          Every symbol counted by the AI, organized by sheet. Use this to verify counts and identify duplicates where the same device at the same location was counted on multiple sheets (enlarged details, partial plans, etc.).
        </div>
        ${statsBar}
        ${dupPanel}
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
          <span style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Sort:</span>
          ${sortBtn('sheet', 'Sheet #')}
          ${sortBtn('floor', 'Floor')}
          ${sortBtn('room', 'Room')}
          ${sortBtn('type', 'Device Type')}
          <span style="margin-left:auto;display:flex;align-items:center;gap:6px;">
            <span style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Filter:</span>
            <select id="sym-inv-type-filter" style="padding:3px 8px;font-size:11px;border:1px solid rgba(0,0,0,0.12);border-radius:4px;background:white;color:var(--text-primary);">
              <option value="">All Types (${stats.totalSymbols.toLocaleString()})</option>
              ${filterOptions}
            </select>
          </span>
        </div>
        <div style="overflow-x:auto;max-height:600px;overflow-y:auto;border:1px solid rgba(0,0,0,0.06);border-radius:8px;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead style="position:sticky;top:0;z-index:1;">
              <tr style="background:rgba(99,102,241,0.06);">
                <th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--accent-indigo);font-weight:700;border-bottom:2px solid rgba(99,102,241,0.12);white-space:nowrap;">Sheet</th>
                <th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--accent-indigo);font-weight:700;border-bottom:2px solid rgba(99,102,241,0.12);">Floor</th>
                <th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--accent-indigo);font-weight:700;border-bottom:2px solid rgba(99,102,241,0.12);">Room / Area</th>
                <th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--accent-indigo);font-weight:700;border-bottom:2px solid rgba(99,102,241,0.12);">Device Type</th>
                <th style="padding:8px 10px;text-align:left;font-size:10px;color:var(--accent-indigo);font-weight:700;border-bottom:2px solid rgba(99,102,241,0.12);">Subtype</th>
                <th style="padding:8px 10px;text-align:center;font-size:10px;color:var(--accent-indigo);font-weight:700;border-bottom:2px solid rgba(99,102,241,0.12);">Qty</th>
                <th style="padding:8px 10px;text-align:center;font-size:10px;color:var(--accent-indigo);font-weight:700;border-bottom:2px solid rgba(99,102,241,0.12);">Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
            <tfoot>
              <tr style="background:rgba(99,102,241,0.04);">
                <td colspan="5" style="padding:8px 10px;font-size:12px;font-weight:700;color:var(--text-primary);">Total${filterType ? ' (' + filterType.replace(/_/g, ' ') + ')' : ''}</td>
                <td style="padding:8px 10px;font-size:12px;font-weight:700;text-align:center;color:var(--accent-indigo);">${filteredTotal.toLocaleString()}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        ${truncated ? `<div style="margin-top:8px;font-size:11px;color:var(--text-muted);">Showing first 500 of ${filtered.length.toLocaleString()} rows. Use the filter to narrow results.</div>` : ''}
        <div style="display:flex;gap:8px;margin-top:14px;">
          ${(st.planFiles && st.planFiles.length > 0 && st.planFiles.some(f => f.rawFile)) ? `<button id="sym-inv-viewmap-btn" style="padding:6px 14px;border:1px solid rgba(16,185,129,0.4);border-radius:6px;background:rgba(16,185,129,0.1);color:#059669;font-size:11px;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:0.5px;">🗺️ View on Plans</button>` : ''}
          <button id="sym-inv-copy-btn" style="padding:6px 14px;border:1px solid rgba(99,102,241,0.3);border-radius:6px;background:rgba(99,102,241,0.08);color:var(--accent-indigo);font-size:11px;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:0.5px;">📋 Copy Table</button>
          <button id="sym-inv-csv-btn" style="padding:6px 14px;border:1px solid rgba(99,102,241,0.3);border-radius:6px;background:rgba(99,102,241,0.08);color:var(--accent-indigo);font-size:11px;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:0.5px;">📥 Export CSV</button>
          ${duplicates.length > 0 ? `<button id="sym-inv-dups-btn" style="padding:6px 14px;border:1px solid rgba(245,158,11,0.3);border-radius:6px;background:rgba(245,158,11,0.08);color:#D97706;font-size:11px;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:0.5px;">⚠️ Copy Duplicates</button>` : ''}
        </div>
      </div>
    </div>
    </div>`;
}

function _reRenderSymbolInventory(container) {
  const wrapper = document.getElementById('sym-inv-wrapper');
  if (!wrapper) return;
  state._symbolInventoryOpen = true;
  const newHtml = buildSymbolInventoryCard(state);
  const temp = document.createElement('div');
  temp.innerHTML = newHtml;
  const newWrapper = temp.querySelector('#sym-inv-wrapper');
  if (newWrapper) {
    wrapper.replaceWith(newWrapper);
    bindSymbolInventoryEvents(container);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function bindSymbolInventoryEvents(container) {
  // Toggle expand/collapse
  const toggle = document.getElementById('sym-inv-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      state._symbolInventoryOpen = !state._symbolInventoryOpen;
      const body = document.getElementById('sym-inv-collapsible');
      const icon = document.getElementById('sym-inv-toggle-icon');
      if (body) body.style.display = state._symbolInventoryOpen ? 'block' : 'none';
      if (icon) icon.textContent = state._symbolInventoryOpen ? '▼' : '▶';
    });
  }

  // Sort buttons — re-render via wrapper replacement
  container.querySelectorAll('.sym-inv-sort').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state._symbolInventorySort = btn.dataset.sort;
      _reRenderSymbolInventory(container);
    });
  });

  // Type filter dropdown
  const filterSelect = document.getElementById('sym-inv-type-filter');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      e.stopPropagation();
      state._symbolInventoryFilter = filterSelect.value;
      _reRenderSymbolInventory(container);
    });
  }

  // Copy to clipboard button
  const copyBtn = document.getElementById('sym-inv-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const data = getSymbolInventoryData(state);
      if (!data) return;
      const filterType = state._symbolInventoryFilter || '';
      const items = filterType ? data.items.filter(i => i.type === filterType) : data.items;
      // Sort by sheet
      items.sort((a, b) => a.sheet.localeCompare(b.sheet, undefined, { numeric: true }) || a.room.localeCompare(b.room));
      const lines = ['Sheet\tFloor\tRoom\tDevice Type\tSubtype\tQty'];
      items.forEach(i => {
        lines.push(`${i.sheet}\t${i.floor}\t${i.room}\t${i.type.replace(/_/g, ' ')}\t${i.subtype.replace(/_/g, ' ')}\t${i.qty}`);
      });
      lines.push(`\nTotal:\t\t\t\t\t${items.reduce((s, i) => s + i.qty, 0)}`);
      if (data.duplicates.length > 0) {
        lines.push('\n--- POTENTIAL DUPLICATES ---');
        data.duplicates.forEach(d => {
          lines.push(`${d.label} — Sheets: ${d.sheets.join(', ')} — Total qty: ${d.totalQty}`);
        });
      }
      navigator.clipboard.writeText(lines.join('\n')).then(() => {
        if (typeof spToast === 'function') spToast('Inventory copied to clipboard', 'success');
      });
    });
  }

  // Export CSV button
  const csvBtn = document.getElementById('sym-inv-csv-btn');
  if (csvBtn) {
    csvBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const data = getSymbolInventoryData(state);
      if (!data) return;
      const filterType = state._symbolInventoryFilter || '';
      const items = filterType ? data.items.filter(i => i.type === filterType) : data.items;
      items.sort((a, b) => a.sheet.localeCompare(b.sheet, undefined, { numeric: true }) || a.room.localeCompare(b.room));
      const csvEsc = v => `"${String(v).replace(/"/g, '""')}"`;
      const lines = ['Sheet,Floor,Room,Device Type,Subtype,Qty,Confidence,Duplicate Flag'];
      const dupIdxs = new Set();
      data.duplicates.forEach(d => d.items.forEach(i => dupIdxs.add(i._idx)));
      items.forEach(i => {
        lines.push([
          csvEsc(i.sheet), csvEsc(i.floor), csvEsc(i.room),
          csvEsc(i.type.replace(/_/g, ' ')), csvEsc(i.subtype.replace(/_/g, ' ')),
          i.qty, i.confidence || '', dupIdxs.has(i._idx) ? 'POTENTIAL DUPLICATE' : ''
        ].join(','));
      });
      lines.push('');
      lines.push('"3D CONFIDENTIAL — 3D Technology Services Inc."');
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `symbol_inventory_${state.projectName || 'export'}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      if (typeof spToast === 'function') spToast('CSV exported', 'success');
    });
  }

  // Copy duplicates button
  const dupsBtn = document.getElementById('sym-inv-dups-btn');
  if (dupsBtn) {
    dupsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const data = getSymbolInventoryData(state);
      if (!data || data.duplicates.length === 0) return;
      const lines = ['=== POTENTIAL DUPLICATE COUNTS ===', ''];
      data.duplicates.forEach((d, i) => {
        lines.push(`${i + 1}. ${d.label}`);
        lines.push(`   Sheets: ${d.sheets.join(', ')}`);
        lines.push(`   Total qty across all sheets: ${d.totalQty}`);
        d.items.forEach(item => {
          lines.push(`     - Sheet ${item.sheet}: ${item.qty} × ${item.type}${item.subtype ? ' (' + item.subtype + ')' : ''} in ${item.room}`);
        });
        lines.push('');
      });
      lines.push(`Total groups: ${data.duplicates.length}`);
      lines.push(`Total items in duplicate groups: ${data.duplicates.reduce((s, d) => s + d.totalQty, 0)}`);
      navigator.clipboard.writeText(lines.join('\n')).then(() => {
        if (typeof spToast === 'function') spToast('Duplicate report copied', 'success');
      });
    });
  }

  // View on Plans button — launch the visual symbol map
  const viewMapBtn = document.getElementById('sym-inv-viewmap-btn');
  if (viewMapBtn) {
    viewMapBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSymbolMapViewer();
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// VISUAL SYMBOL MAP — PDF viewer with zone-level device markers
// Renders floor plan pages from the original PDFs and overlays
// device count badges at SPATIAL_LAYOUT zone coordinates.
// ═══════════════════════════════════════════════════════════════

const _symMap = {
  modal: null,
  currentPage: 1,
  totalPages: 0,
  pdfDocs: [],       // Array of { pdf: PDFDocumentProxy, fileName: string, startPage: number }
  rendering: false,
  zoneDeviceMap: null, // Precomputed zone → device mapping
  activePopup: null,
};

// Device type → color + emoji mapping for markers
const _deviceColors = {
  camera: { bg: 'rgba(220,38,38,0.85)', border: '#DC2626', emoji: '📷', label: 'Camera' },
  data_outlet: { bg: 'rgba(99,102,241,0.85)', border: '#6366F1', emoji: '🔌', label: 'Data' },
  card_reader: { bg: 'rgba(245,158,11,0.85)', border: '#F59E0B', emoji: '🔒', label: 'Access' },
  access_control: { bg: 'rgba(245,158,11,0.85)', border: '#F59E0B', emoji: '🔒', label: 'Access' },
  motion_detector: { bg: 'rgba(168,85,247,0.85)', border: '#A855F7', emoji: '📡', label: 'Motion' },
  intrusion: { bg: 'rgba(168,85,247,0.85)', border: '#A855F7', emoji: '🚨', label: 'Intrusion' },
  fire_alarm: { bg: 'rgba(239,68,68,0.85)', border: '#EF4444', emoji: '🔥', label: 'Fire' },
  speaker: { bg: 'rgba(34,197,94,0.85)', border: '#22C55E', emoji: '🔊', label: 'Speaker' },
  wap: { bg: 'rgba(59,130,246,0.85)', border: '#3B82F6', emoji: '📶', label: 'WAP' },
  wireless_ap: { bg: 'rgba(59,130,246,0.85)', border: '#3B82F6', emoji: '📶', label: 'WAP' },
  display: { bg: 'rgba(236,72,153,0.85)', border: '#EC4899', emoji: '📺', label: 'Display' },
  intercom: { bg: 'rgba(20,184,166,0.85)', border: '#14B8A6', emoji: '📞', label: 'Intercom' },
  _default: { bg: 'rgba(107,114,128,0.85)', border: '#6B7280', emoji: '📍', label: 'Device' },
};

function _getDeviceColor(type) {
  const t = (type || '').toLowerCase().replace(/\s+/g, '_');
  for (const [key, val] of Object.entries(_deviceColors)) {
    if (key === '_default') continue;
    if (t.includes(key)) return val;
  }
  return _deviceColors._default;
}

/**
 * Build zone → device mapping by cross-referencing SPATIAL_LAYOUT zones with SYMBOL_SCANNER inventory.
 * Returns Map<floorNumber, Array<{ zone, x_pct, y_pct, devices[], totalCount, isIdf }>>
 */
function _buildZoneDeviceMap() {
  const spatial = state.brainResults?.wave0?.SPATIAL_LAYOUT;
  const scanner = state.brainResults?.wave1?.SYMBOL_SCANNER;
  if (!spatial?.floors || !scanner) return null;

  const inventory = getSymbolInventoryData(state);
  if (!inventory) return null;

  const floorMap = new Map(); // floorIndex → zones[]

  spatial.floors.forEach((floor, floorIdx) => {
    const zones = [];
    const floorLabel = floor.floor_label || `Floor ${floor.floor || floorIdx + 1}`;

    // Add IDF markers
    (floor.idf_locations || []).forEach(idf => {
      zones.push({
        zone: idf.label || idf.room_name || 'IDF',
        x_pct: idf.approx_x_pct || 50,
        y_pct: idf.approx_y_pct || 50,
        isIdf: true,
        roomName: idf.room_name || idf.label,
        description: idf.description || '',
        devices: [],
        totalCount: 0,
      });
    });

    // Add device zone markers
    (floor.device_zones || []).forEach(dz => {
      const zoneName = dz.zone || 'Unknown Zone';
      // Match devices to this zone by fuzzy room name matching
      const matchedDevices = [];
      inventory.items.forEach(item => {
        // Match if room name is contained in zone name or vice versa
        const roomLc = item.room.toLowerCase();
        const zoneLc = zoneName.toLowerCase();
        const floorLc = (item.floor || '').toLowerCase();
        const floorLabelLc = floorLabel.toLowerCase();

        // Must match floor (if we have floor data)
        const floorMatch = !item.floor || item.floor === 'Unknown Floor' ||
          floorLabelLc.includes(String(floor.floor)) ||
          floorLc.includes(String(floor.floor)) ||
          floorLc.includes(floorLabelLc) ||
          floorLabelLc.includes(floorLc);

        if (!floorMatch) return;

        // Room-to-zone matching: fuzzy containment
        const roomWords = roomLc.split(/[\s\/,&-]+/).filter(w => w.length > 2);
        const zoneWords = zoneLc.split(/[\s\/,&-]+/).filter(w => w.length > 2);
        const hasOverlap = roomWords.some(rw => zoneWords.some(zw => rw.includes(zw) || zw.includes(rw)));
        const directMatch = roomLc.includes(zoneLc) || zoneLc.includes(roomLc);

        if (directMatch || hasOverlap) {
          matchedDevices.push(item);
        }
      });

      zones.push({
        zone: zoneName,
        x_pct: dz.approx_x_pct || 50,
        y_pct: dz.approx_y_pct || 50,
        isIdf: false,
        nearestIdf: dz.nearest_idf || '',
        devices: matchedDevices,
        totalCount: matchedDevices.reduce((s, d) => s + d.qty, 0),
      });
    });

    // Collect unmatched devices for this floor and place them in a fallback cluster
    const matchedItemIdxs = new Set();
    zones.forEach(z => z.devices.forEach(d => matchedItemIdxs.add(d._idx)));

    const unmatched = inventory.items.filter(item => {
      if (matchedItemIdxs.has(item._idx)) return false;
      const floorLc = (item.floor || '').toLowerCase();
      const floorLabelLc = floorLabel.toLowerCase();
      return !item.floor || item.floor === 'Unknown Floor' ||
        floorLabelLc.includes(String(floor.floor)) || floorLc.includes(String(floor.floor));
    });

    if (unmatched.length > 0) {
      zones.push({
        zone: 'Other / Unmatched',
        x_pct: 50,
        y_pct: 95,
        isIdf: false,
        devices: unmatched,
        totalCount: unmatched.reduce((s, d) => s + d.qty, 0),
      });
    }

    floorMap.set(floorIdx, { floorLabel, zones, sheetIds: floor.sheet_ids || [] });
  });

  return floorMap;
}

/**
 * Open the Visual Symbol Map modal viewer.
 */
async function openSymbolMapViewer() {
  if (typeof pdfjsLib === 'undefined') {
    if (typeof spToast === 'function') spToast('PDF.js not loaded — cannot render plans', 'warning');
    return;
  }

  const planFiles = (state.planFiles || []).filter(f => f.rawFile && f.type === 'application/pdf');
  if (planFiles.length === 0) {
    if (typeof spToast === 'function') spToast('No PDF plan files available in this session', 'warning');
    return;
  }

  // Build zone-device mapping
  _symMap.zoneDeviceMap = _buildZoneDeviceMap();

  // Show loading modal immediately
  _createSymbolMapModal();
  _showMapLoading('Loading floor plans...');

  // Load all PDF documents
  _symMap.pdfDocs = [];
  _symMap.totalPages = 0;

  try {
    for (const pf of planFiles) {
      const ab = await pf.rawFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
      _symMap.pdfDocs.push({ pdf, fileName: pf.name, startPage: _symMap.totalPages + 1 });
      _symMap.totalPages += pdf.numPages;
    }
  } catch (err) {
    console.error('[SymbolMap] PDF load error:', err);
    _showMapLoading('Failed to load PDF files. Please try again.');
    return;
  }

  _symMap.currentPage = 1;
  await _renderMapPage(_symMap.currentPage);
}

function _createSymbolMapModal() {
  // Remove existing modal if present
  if (_symMap.modal) _symMap.modal.remove();

  const modal = document.createElement('div');
  modal.id = 'symbol-map-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.92);z-index:10000;display:flex;flex-direction:column;';
  modal.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:rgba(0,0,0,0.6);border-bottom:1px solid rgba(255,255,255,0.1);flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:18px;">🗺️</span>
        <span style="font-size:15px;font-weight:700;color:#fff;">Visual Symbol Map</span>
        <span id="smap-page-info" style="font-size:12px;color:rgba(255,255,255,0.6);"></span>
        <span id="smap-file-info" style="font-size:11px;color:rgba(255,255,255,0.4);font-style:italic;"></span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button id="smap-prev" style="padding:6px 14px;border:1px solid rgba(255,255,255,0.2);border-radius:6px;background:rgba(255,255,255,0.08);color:#fff;font-size:12px;font-weight:600;cursor:pointer;" title="Previous page">◀ Prev</button>
        <button id="smap-next" style="padding:6px 14px;border:1px solid rgba(255,255,255,0.2);border-radius:6px;background:rgba(255,255,255,0.08);color:#fff;font-size:12px;font-weight:600;cursor:pointer;" title="Next page">Next ▶</button>
        <span style="width:1px;height:24px;background:rgba(255,255,255,0.15);margin:0 4px;"></span>
        <button id="smap-zoom-in" style="padding:6px 10px;border:1px solid rgba(255,255,255,0.2);border-radius:6px;background:rgba(255,255,255,0.08);color:#fff;font-size:14px;cursor:pointer;" title="Zoom in">+</button>
        <button id="smap-zoom-out" style="padding:6px 10px;border:1px solid rgba(255,255,255,0.2);border-radius:6px;background:rgba(255,255,255,0.08);color:#fff;font-size:14px;cursor:pointer;" title="Zoom out">−</button>
        <span id="smap-zoom-level" style="font-size:11px;color:rgba(255,255,255,0.5);min-width:40px;text-align:center;">100%</span>
        <span style="width:1px;height:24px;background:rgba(255,255,255,0.15);margin:0 4px;"></span>
        <button id="smap-close" style="padding:6px 14px;border:1px solid rgba(239,68,68,0.4);border-radius:6px;background:rgba(239,68,68,0.15);color:#FCA5A5;font-size:12px;font-weight:700;cursor:pointer;text-transform:uppercase;letter-spacing:0.5px;">✕ Close</button>
      </div>
    </div>
    <div style="display:flex;flex:1;overflow:hidden;">
      <div id="smap-canvas-area" style="flex:1;overflow:auto;position:relative;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);">
        <div id="smap-canvas-wrapper" style="position:relative;display:inline-block;">
          <canvas id="smap-canvas" style="display:block;"></canvas>
          <div id="smap-markers" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;"></div>
        </div>
        <div id="smap-loading" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-size:14px;text-align:center;"></div>
      </div>
      <div id="smap-sidebar" style="width:320px;background:rgba(15,15,20,0.95);border-left:1px solid rgba(255,255,255,0.08);overflow-y:auto;flex-shrink:0;padding:16px;">
        <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:12px;">📋 Devices on This Page</div>
        <div id="smap-device-list" style="font-size:12px;color:rgba(255,255,255,0.7);"></div>
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08);">
          <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;">Legend</div>
          <div id="smap-legend" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
        </div>
      </div>
    </div>`;

  document.body.appendChild(modal);
  _symMap.modal = modal;
  _symMap._zoomScale = 1.0;

  // Bind controls
  document.getElementById('smap-close').addEventListener('click', _closeSymbolMapViewer);
  document.getElementById('smap-prev').addEventListener('click', () => _navigateMapPage(-1));
  document.getElementById('smap-next').addEventListener('click', () => _navigateMapPage(1));
  document.getElementById('smap-zoom-in').addEventListener('click', () => _zoomMap(0.25));
  document.getElementById('smap-zoom-out').addEventListener('click', () => _zoomMap(-0.25));

  // Keyboard navigation
  modal._keyHandler = (e) => {
    if (e.key === 'Escape') _closeSymbolMapViewer();
    if (e.key === 'ArrowLeft') _navigateMapPage(-1);
    if (e.key === 'ArrowRight') _navigateMapPage(1);
    if (e.key === '+' || e.key === '=') _zoomMap(0.25);
    if (e.key === '-') _zoomMap(-0.25);
  };
  document.addEventListener('keydown', modal._keyHandler);

  // Build legend
  const legendEl = document.getElementById('smap-legend');
  if (legendEl) {
    const usedTypes = new Set();
    const inv = getSymbolInventoryData(state);
    if (inv) inv.items.forEach(i => usedTypes.add(i.type));
    usedTypes.forEach(type => {
      const c = _getDeviceColor(type);
      legendEl.innerHTML += `<div style="display:flex;align-items:center;gap:4px;padding:3px 8px;background:rgba(255,255,255,0.04);border-radius:4px;">
        <span style="width:10px;height:10px;border-radius:50%;background:${c.bg};border:1px solid ${c.border};flex-shrink:0;"></span>
        <span style="font-size:10px;color:rgba(255,255,255,0.6);text-transform:capitalize;">${esc(type.replace(/_/g, ' '))}</span>
      </div>`;
    });
    // IDF marker
    legendEl.innerHTML += `<div style="display:flex;align-items:center;gap:4px;padding:3px 8px;background:rgba(255,255,255,0.04);border-radius:4px;">
      <span style="width:10px;height:10px;border-radius:2px;background:rgba(16,185,129,0.9);border:1px solid #10B981;flex-shrink:0;"></span>
      <span style="font-size:10px;color:rgba(255,255,255,0.6);">IDF / MDF Room</span>
    </div>`;
  }
}

function _showMapLoading(msg) {
  const el = document.getElementById('smap-loading');
  if (el) el.innerHTML = `<div style="font-size:24px;margin-bottom:8px;">⏳</div>${esc(msg)}`;
}

function _closeSymbolMapViewer() {
  if (_symMap.modal) {
    if (_symMap.modal._keyHandler) document.removeEventListener('keydown', _symMap.modal._keyHandler);
    _symMap.modal.remove();
    _symMap.modal = null;
  }
  _symMap.pdfDocs = [];
  _symMap.totalPages = 0;
}

function _navigateMapPage(delta) {
  const newPage = _symMap.currentPage + delta;
  if (newPage < 1 || newPage > _symMap.totalPages) return;
  _symMap.currentPage = newPage;
  _renderMapPage(newPage);
}

function _zoomMap(delta) {
  _symMap._zoomScale = Math.max(0.25, Math.min(3.0, (_symMap._zoomScale || 1) + delta));
  const zoomLabel = document.getElementById('smap-zoom-level');
  if (zoomLabel) zoomLabel.textContent = Math.round(_symMap._zoomScale * 100) + '%';
  // Re-render at new zoom
  _renderMapPage(_symMap.currentPage);
}

/**
 * Render a specific page with markers overlaid.
 */
async function _renderMapPage(globalPageNum) {
  if (_symMap.rendering) return;
  _symMap.rendering = true;

  const loadingEl = document.getElementById('smap-loading');
  if (loadingEl) loadingEl.style.display = 'block';

  try {
    // Find which PDF doc and which page within it
    let pdfEntry = null;
    let localPage = globalPageNum;
    for (const entry of _symMap.pdfDocs) {
      const pagesInDoc = entry.pdf.numPages;
      if (localPage <= pagesInDoc) {
        pdfEntry = entry;
        break;
      }
      localPage -= pagesInDoc;
    }

    if (!pdfEntry) { _symMap.rendering = false; return; }

    const page = await pdfEntry.pdf.getPage(localPage);

    // Calculate scale to fit viewport while respecting zoom
    const canvasArea = document.getElementById('smap-canvas-area');
    const areaW = canvasArea.clientWidth - 40;
    const areaH = canvasArea.clientHeight - 40;
    const viewport0 = page.getViewport({ scale: 1.0 });
    const fitScale = Math.min(areaW / viewport0.width, areaH / viewport0.height);
    const renderScale = fitScale * (_symMap._zoomScale || 1);
    const viewport = page.getViewport({ scale: renderScale });

    // Render PDF page to canvas
    const canvas = document.getElementById('smap-canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Update page info
    const pageInfo = document.getElementById('smap-page-info');
    if (pageInfo) pageInfo.textContent = `Page ${globalPageNum} of ${_symMap.totalPages}`;
    const fileInfo = document.getElementById('smap-file-info');
    if (fileInfo) fileInfo.textContent = pdfEntry.fileName + (pdfEntry.pdf.numPages > 1 ? ` (pg ${localPage})` : '');

    // Update markers
    _drawMapMarkers(canvas.width, canvas.height, globalPageNum);

    // Update sidebar device list
    _updateMapSidebar(globalPageNum);

    if (loadingEl) loadingEl.style.display = 'none';
  } catch (err) {
    console.error('[SymbolMap] Render error:', err);
    if (loadingEl) loadingEl.innerHTML = `<div style="color:#FCA5A5;">Render error. Please try again.</div>`;
  }

  _symMap.rendering = false;
}

/**
 * Draw zone markers on the overlay layer.
 */
function _drawMapMarkers(canvasW, canvasH, globalPageNum) {
  const markersEl = document.getElementById('smap-markers');
  if (!markersEl) return;
  markersEl.innerHTML = '';
  markersEl.style.width = canvasW + 'px';
  markersEl.style.height = canvasH + 'px';

  const zoneMap = _symMap.zoneDeviceMap;
  if (!zoneMap) {
    // No spatial data — show message
    markersEl.innerHTML = `<div style="position:absolute;bottom:16px;left:16px;background:rgba(0,0,0,0.7);color:rgba(255,255,255,0.7);padding:8px 14px;border-radius:8px;font-size:11px;pointer-events:auto;">
      ℹ️ No SPATIAL_LAYOUT data — zone coordinates unavailable. Devices listed in sidebar.
    </div>`;
    return;
  }

  // Determine which floor this page corresponds to
  // Heuristic: page order matches floor order (floor 0 → page 1, floor 1 → page 2, etc.)
  // For multi-page-per-floor plans, distribute evenly
  const numFloors = zoneMap.size;
  let floorIdx;
  if (numFloors === 0) return;
  if (_symMap.totalPages <= numFloors) {
    floorIdx = globalPageNum - 1;
  } else {
    // Multiple pages per floor — distribute pages across floors proportionally
    floorIdx = Math.min(Math.floor((globalPageNum - 1) * numFloors / _symMap.totalPages), numFloors - 1);
  }

  const floorData = zoneMap.get(floorIdx);
  if (!floorData) return;

  // Place markers
  floorData.zones.forEach((zone, zIdx) => {
    const x = (zone.x_pct / 100) * canvasW;
    const y = (zone.y_pct / 100) * canvasH;

    if (zone.isIdf) {
      // IDF marker — green square
      const marker = document.createElement('div');
      marker.style.cssText = `position:absolute;left:${x - 14}px;top:${y - 14}px;width:28px;height:28px;background:rgba(16,185,129,0.9);border:2px solid #10B981;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;pointer-events:auto;box-shadow:0 2px 8px rgba(0,0,0,0.4);z-index:10;`;
      marker.title = `${zone.zone} — ${zone.roomName || ''}`;
      marker.textContent = '🏢';
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        _showMapPopup(x, y, `<div style="font-weight:700;margin-bottom:4px;">🏢 ${esc(zone.zone)}</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.6);">${esc(zone.roomName || '')} ${esc(zone.description || '')}</div>`);
      });
      markersEl.appendChild(marker);
      // Label
      const label = document.createElement('div');
      label.style.cssText = `position:absolute;left:${x + 18}px;top:${y - 8}px;font-size:10px;font-weight:700;color:#10B981;text-shadow:0 1px 3px rgba(0,0,0,0.8);white-space:nowrap;pointer-events:none;`;
      label.textContent = zone.zone;
      markersEl.appendChild(label);
    } else if (zone.totalCount > 0) {
      // Device zone marker — colored circle with count
      // Aggregate by device type for multi-color ring
      const typeCounts = {};
      zone.devices.forEach(d => {
        const key = d.type;
        if (!typeCounts[key]) typeCounts[key] = 0;
        typeCounts[key] += d.qty;
      });

      const typeEntries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
      const primaryType = typeEntries[0]?.[0] || '';
      const primaryColor = _getDeviceColor(primaryType);
      const size = Math.min(48, Math.max(30, 20 + zone.totalCount * 0.5));
      const halfSize = size / 2;

      const marker = document.createElement('div');
      marker.style.cssText = `position:absolute;left:${x - halfSize}px;top:${y - halfSize}px;width:${size}px;height:${size}px;background:${primaryColor.bg};border:2px solid ${primaryColor.border};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${zone.totalCount > 99 ? 10 : 12}px;font-weight:800;color:#fff;cursor:pointer;pointer-events:auto;box-shadow:0 2px 10px rgba(0,0,0,0.5);z-index:${10 + zone.totalCount};transition:transform 0.15s;`;
      marker.textContent = zone.totalCount;
      marker.title = `${zone.zone}: ${zone.totalCount} devices`;

      marker.addEventListener('mouseenter', () => { marker.style.transform = 'scale(1.2)'; });
      marker.addEventListener('mouseleave', () => { marker.style.transform = 'scale(1)'; });
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        let popupHtml = `<div style="font-weight:700;margin-bottom:6px;font-size:13px;">${esc(zone.zone)}</div>`;
        popupHtml += `<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:8px;">${zone.totalCount} device${zone.totalCount !== 1 ? 's' : ''} in this zone</div>`;
        typeEntries.forEach(([type, count]) => {
          const c = _getDeviceColor(type);
          popupHtml += `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;">
            <span style="width:8px;height:8px;border-radius:50%;background:${c.bg};flex-shrink:0;"></span>
            <span style="flex:1;text-transform:capitalize;">${esc(type.replace(/_/g, ' '))}</span>
            <span style="font-weight:700;">${count}</span>
          </div>`;
        });
        // Show rooms
        const rooms = [...new Set(zone.devices.map(d => d.room))];
        if (rooms.length > 0) {
          popupHtml += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.1);font-size:10px;color:rgba(255,255,255,0.4);">Rooms: ${rooms.map(r => esc(r)).join(', ')}</div>`;
        }
        _showMapPopup(x, y, popupHtml);
      });

      markersEl.appendChild(marker);

      // Zone label below marker
      const label = document.createElement('div');
      label.style.cssText = `position:absolute;left:${x}px;top:${y + halfSize + 4}px;transform:translateX(-50%);font-size:10px;font-weight:600;color:rgba(255,255,255,0.8);text-shadow:0 1px 4px rgba(0,0,0,0.9);white-space:nowrap;pointer-events:none;max-width:120px;overflow:hidden;text-overflow:ellipsis;text-align:center;`;
      label.textContent = zone.zone;
      markersEl.appendChild(label);

      // If multiple device types, add small secondary badges
      if (typeEntries.length > 1) {
        typeEntries.slice(1, 3).forEach(([ type2, count2 ], i) => {
          const c2 = _getDeviceColor(type2);
          const badge = document.createElement('div');
          const bx = x + halfSize + 2 + (i * 18);
          const by = y - halfSize - 2;
          badge.style.cssText = `position:absolute;left:${bx}px;top:${by}px;width:18px;height:18px;background:${c2.bg};border:1.5px solid ${c2.border};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#fff;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,0.4);`;
          badge.textContent = count2;
          markersEl.appendChild(badge);
        });
      }
    }
  });

  // Page floor label
  const floorBadge = document.createElement('div');
  floorBadge.style.cssText = 'position:absolute;top:12px;left:12px;background:rgba(0,0,0,0.7);color:#fff;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:700;pointer-events:none;';
  floorBadge.textContent = floorData.floorLabel;
  markersEl.appendChild(floorBadge);

  // Count badge
  const totalOnPage = floorData.zones.reduce((s, z) => s + z.totalCount, 0);
  if (totalOnPage > 0) {
    const countBadge = document.createElement('div');
    countBadge.style.cssText = 'position:absolute;top:12px;right:12px;background:rgba(99,102,241,0.85);color:#fff;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:700;pointer-events:none;';
    countBadge.textContent = `${totalOnPage} devices mapped`;
    markersEl.appendChild(countBadge);
  }
}

function _showMapPopup(x, y, html) {
  // Remove any existing popup
  if (_symMap.activePopup) _symMap.activePopup.remove();

  const popup = document.createElement('div');
  popup.style.cssText = `position:absolute;left:${x + 20}px;top:${y - 10}px;background:rgba(20,20,30,0.95);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:12px 16px;font-size:12px;color:#fff;pointer-events:auto;z-index:100;box-shadow:0 8px 24px rgba(0,0,0,0.6);min-width:180px;max-width:280px;`;
  popup.innerHTML = html + `<div style="margin-top:8px;text-align:right;"><button onclick="this.closest('div[style]').remove()" style="padding:2px 10px;border:1px solid rgba(255,255,255,0.2);border-radius:4px;background:transparent;color:rgba(255,255,255,0.5);font-size:10px;cursor:pointer;">Close</button></div>`;

  const markersEl = document.getElementById('smap-markers');
  if (markersEl) markersEl.appendChild(popup);
  _symMap.activePopup = popup;

  // Close when clicking outside
  setTimeout(() => {
    const handler = (e) => {
      if (!popup.contains(e.target)) {
        popup.remove();
        document.removeEventListener('click', handler);
        if (_symMap.activePopup === popup) _symMap.activePopup = null;
      }
    };
    document.addEventListener('click', handler);
  }, 100);
}

function _updateMapSidebar(globalPageNum) {
  const listEl = document.getElementById('smap-device-list');
  if (!listEl) return;

  const zoneMap = _symMap.zoneDeviceMap;
  if (!zoneMap) {
    // Fallback: show full inventory
    const inv = getSymbolInventoryData(state);
    if (!inv) { listEl.innerHTML = '<div style="color:rgba(255,255,255,0.4);">No device data available.</div>'; return; }
    listEl.innerHTML = inv.items.slice(0, 50).map(i => `
      <div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:6px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${_getDeviceColor(i.type).bg};flex-shrink:0;"></span>
        <span style="flex:1;text-transform:capitalize;font-size:11px;">${esc(i.type.replace(/_/g, ' '))}${i.subtype ? ' (' + esc(i.subtype) + ')' : ''}</span>
        <span style="font-weight:700;font-size:12px;">${i.qty}</span>
        <span style="font-size:10px;color:rgba(255,255,255,0.3);">${esc(i.room)}</span>
      </div>`).join('');
    return;
  }

  // Get floor for this page
  const numFloors = zoneMap.size;
  let floorIdx;
  if (_symMap.totalPages <= numFloors) {
    floorIdx = globalPageNum - 1;
  } else {
    floorIdx = Math.min(Math.floor((globalPageNum - 1) * numFloors / _symMap.totalPages), numFloors - 1);
  }

  const floorData = zoneMap.get(floorIdx);
  if (!floorData) { listEl.innerHTML = '<div style="color:rgba(255,255,255,0.4);">No data for this page.</div>'; return; }

  let html = '';
  floorData.zones.forEach(zone => {
    if (zone.isIdf) {
      html += `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:12px;font-weight:700;color:#10B981;">🏢 ${esc(zone.zone)}</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.4);">${esc(zone.roomName || '')} ${esc(zone.description || '')}</div>
      </div>`;
    } else if (zone.totalCount > 0) {
      // Aggregate by type
      const typeCounts = {};
      zone.devices.forEach(d => { typeCounts[d.type] = (typeCounts[d.type] || 0) + d.qty; });
      html += `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:12px;font-weight:600;color:#fff;margin-bottom:4px;">${esc(zone.zone)} <span style="font-weight:400;color:rgba(255,255,255,0.4);">(${zone.totalCount})</span></div>
        ${Object.entries(typeCounts).map(([type, count]) => {
          const c = _getDeviceColor(type);
          return `<div style="display:flex;align-items:center;gap:6px;padding:2px 0 2px 8px;">
            <span style="width:7px;height:7px;border-radius:50%;background:${c.bg};flex-shrink:0;"></span>
            <span style="flex:1;text-transform:capitalize;font-size:11px;color:rgba(255,255,255,0.7);">${esc(type.replace(/_/g, ' '))}</span>
            <span style="font-weight:700;font-size:11px;color:#fff;">×${count}</span>
          </div>`;
        }).join('')}
      </div>`;
    }
  });

  const totalOnPage = floorData.zones.reduce((s, z) => s + z.totalCount, 0);
  listEl.innerHTML = html || '<div style="color:rgba(255,255,255,0.4);">No devices mapped to this page.</div>';
  if (totalOnPage > 0) {
    listEl.innerHTML += `<div style="margin-top:12px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;font-weight:700;color:rgba(255,255,255,0.8);">Total: ${totalOnPage} devices</div>`;
  }
}

// ═══════════════════════════════════════════════════════════════
// POTENTIAL CHANGE ORDERS — Extract from existing brain data
// ═══════════════════════════════════════════════════════════════

function extractPotentialChangeOrders(st) {
  const cos = [];
  let id = 1;
  const br = st.brainResults || {};

  // Parse "$5,000-$8,000" or "$5000" or "5000" into numeric midpoint
  function parseImpact(str) {
    if (!str) return 0;
    const s = String(str).replace(/[,$]/g, '');
    const range = s.match(/([\d.]+)\s*[-–to]+\s*([\d.]+)/);
    if (range) return Math.round((parseFloat(range[1]) + parseFloat(range[2])) / 2);
    const single = s.match(/([\d.]+)/);
    return single ? Math.round(parseFloat(single[1])) : 0;
  }

  // 1. Devil's Advocate challenges
  const da = br.wave3?.DEVILS_ADVOCATE;
  if (da?.challenges) {
    da.challenges.forEach(c => {
      cos.push({
        id: `CO-${String(id++).padStart(3, '0')}`,
        description: c.description || c.issue || 'Unspecified challenge',
        category: c.category || 'scope_gap',
        estimatedCost: parseImpact(c.estimated_impact),
        severity: c.severity || 'medium',
        source: "Devil's Advocate",
        recommendation: c.recommendation || '',
      });
    });
  }

  // 2. Devil's Advocate missed_items (if separate from challenges)
  if (da?.missed_items && Array.isArray(da.missed_items)) {
    da.missed_items.forEach(item => {
      const desc = typeof item === 'string' ? item : (item.description || item.item || JSON.stringify(item));
      const cost = typeof item === 'object' ? parseImpact(item.estimated_cost || item.estimated_impact) : 0;
      // Avoid duplicates with challenges
      if (!cos.some(c => c.description === desc)) {
        cos.push({
          id: `CO-${String(id++).padStart(3, '0')}`,
          description: desc,
          category: 'missing_item',
          estimatedCost: cost,
          severity: 'high',
          source: "Devil's Advocate",
          recommendation: typeof item === 'object' ? (item.recommendation || '') : '',
        });
      }
    });
  }

  // 3. Cross Validator issues
  const cv = br.wave3?.CROSS_VALIDATOR;
  if (cv?.issues && Array.isArray(cv.issues)) {
    cv.issues.forEach(issue => {
      const desc = typeof issue === 'string' ? issue : (issue.description || issue.issue || '');
      if (desc && !cos.some(c => c.description === desc)) {
        cos.push({
          id: `CO-${String(id++).padStart(3, '0')}`,
          description: desc,
          category: typeof issue === 'object' ? (issue.category || 'scope_gap') : 'scope_gap',
          estimatedCost: typeof issue === 'object' ? parseImpact(issue.estimated_impact) : 0,
          severity: typeof issue === 'object' ? (issue.severity || 'medium') : 'medium',
          source: 'Cross Validator',
          recommendation: typeof issue === 'object' ? (issue.recommendation || '') : '',
        });
      }
    });
  }

  // 4. Special Conditions — flag items that may not be in BOM
  const sc = br.wave1?.SPECIAL_CONDITIONS;
  if (sc) {
    const flagSections = [
      { key: 'permits', label: 'Permit / Inspection', sev: 'medium' },
      { key: 'site_conditions', label: 'Site Condition', sev: 'medium' },
    ];
    flagSections.forEach(({ key, label, sev }) => {
      const items = sc[key];
      if (Array.isArray(items)) {
        items.forEach(item => {
          const desc = typeof item === 'string' ? item : (item.description || item.item || item.name || '');
          const cost = typeof item === 'object' ? parseImpact(item.cost || item.estimated_cost) : 0;
          if (desc && !cos.some(c => c.description === desc)) {
            cos.push({
              id: `CO-${String(id++).padStart(3, '0')}`,
              description: `${label}: ${desc}`,
              category: key,
              estimatedCost: cost,
              severity: sev,
              source: 'Special Conditions',
              recommendation: '',
            });
          }
        });
      }
    });
  }

  // Sort by severity (critical > high > medium > low), then by cost descending
  const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  cos.sort((a, b) => (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3) || (b.estimatedCost - a.estimatedCost));

  return cos;
}

function buildChangeOrderCard(st) {
  const cos = extractPotentialChangeOrders(st);
  if (cos.length === 0) return '';

  const fmt = n => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const sevBadge = s => {
    const colors = { critical: '#DC2626', high: '#EA580C', medium: '#D97706', low: '#65A30D' };
    return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:white;background:${colors[s] || colors.medium};">${esc(s)}</span>`;
  };

  const included = cos.filter(c => !st._excludedCOs.has(c.id));
  const totalValue = included.reduce((s, c) => s + c.estimatedCost, 0);
  const bySev = {};
  included.forEach(c => { bySev[c.severity] = (bySev[c.severity] || 0) + 1; });

  let rows = '';
  cos.forEach(c => {
    const excluded = st._excludedCOs.has(c.id);
    rows += `<tr style="border-bottom:1px solid rgba(0,0,0,0.04);${excluded ? 'opacity:0.4;' : ''}">
      <td style="padding:8px 10px;text-align:center;">
        <input type="checkbox" class="co-include-cb" data-co-id="${esc(c.id)}" ${excluded ? '' : 'checked'} style="width:14px;height:14px;accent-color:#0D9488;">
      </td>
      <td style="padding:8px 10px;font-size:11px;font-weight:600;color:var(--text-muted);white-space:nowrap;">${esc(c.id)}</td>
      <td style="padding:8px 10px;font-size:12px;color:var(--text-primary);max-width:300px;">
        ${esc(c.description)}
        ${c.recommendation ? `<div style="font-size:10px;color:var(--text-muted);margin-top:2px;font-style:italic;">${esc(c.recommendation)}</div>` : ''}
      </td>
      <td style="padding:8px 10px;text-align:center;">${sevBadge(c.severity)}</td>
      <td style="padding:8px 10px;font-size:12px;font-weight:600;text-align:right;color:var(--text-primary);">${c.estimatedCost > 0 ? fmt(c.estimatedCost) : '<span style="color:var(--text-muted);font-weight:400;">TBD</span>'}</td>
      <td style="padding:8px 10px;font-size:10px;color:var(--text-muted);white-space:nowrap;">${esc(c.source)}</td>
    </tr>`;
  });

  return `
    <div style="border-top:1px solid rgba(0,0,0,0.06);margin:24px 0;"></div>
    <div class="info-card" id="change-orders-card" style="border-left:3px solid #EA580C;">
      <div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;" id="co-toggle">
        <h3 class="info-card-title" style="margin:0;">
          <i data-lucide="alert-triangle" style="width:16px;height:16px;"></i>
          POTENTIAL CHANGE ORDERS
          <span style="font-size:11px;font-weight:400;color:rgba(0,0,0,0.4);margin-left:8px;">(${cos.length} items | ${fmt(totalValue)} estimated)</span>
        </h3>
        <span id="co-toggle-icon" style="font-size:14px;color:var(--text-muted);transition:transform 0.2s;padding:8px;">${st._changeOrdersOpen ? '▼' : '▶'}</span>
      </div>
      <div id="co-collapsible" style="display:${st._changeOrdersOpen ? 'block' : 'none'};margin-top:12px;">
        <p style="color:rgba(0,0,0,0.5);font-size:12px;margin-bottom:16px;">
          Items identified by the AI that may result in change orders during construction. These are scope gaps, missing items, or conditions not fully captured in the base bid. Use this to prepare your client or build contingency.
        </p>

        <!-- Severity Summary -->
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
          ${Object.entries(bySev).map(([sev, count]) => `
            <div style="display:flex;align-items:center;gap:4px;">${sevBadge(sev)} <span style="font-size:12px;font-weight:600;">×${count}</span></div>
          `).join('')}
          <div style="margin-left:auto;font-size:14px;font-weight:700;color:#EA580C;">Total: ${fmt(totalValue)}</div>
        </div>

        <!-- Table -->
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:rgba(234,88,12,0.06);">
                <th style="padding:8px 10px;width:36px;border-bottom:2px solid rgba(234,88,12,0.15);"></th>
                <th style="padding:8px 10px;text-align:left;font-size:10px;color:#EA580C;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid rgba(234,88,12,0.15);">CO#</th>
                <th style="padding:8px 10px;text-align:left;font-size:10px;color:#EA580C;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid rgba(234,88,12,0.15);">Description</th>
                <th style="padding:8px 10px;text-align:center;font-size:10px;color:#EA580C;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid rgba(234,88,12,0.15);">Severity</th>
                <th style="padding:8px 10px;text-align:right;font-size:10px;color:#EA580C;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid rgba(234,88,12,0.15);">Est. Impact</th>
                <th style="padding:8px 10px;text-align:left;font-size:10px;color:#EA580C;font-weight:700;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid rgba(234,88,12,0.15);">Source</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>

        <!-- Actions -->
        <div style="display:flex;gap:8px;margin-top:16px;align-items:center;">
          <button id="co-copy-btn" style="padding:8px 16px;border:1px solid rgba(234,88,12,0.3);background:rgba(234,88,12,0.06);color:#EA580C;cursor:pointer;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
            📋 Copy to Clipboard
          </button>
          <button id="co-pdf-btn" style="padding:8px 16px;border:1px solid rgba(234,88,12,0.3);background:rgba(234,88,12,0.06);color:#EA580C;cursor:pointer;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
            📄 Save as PDF
          </button>
          <span id="co-copy-status" style="font-size:11px;color:var(--accent-emerald);display:none;">Copied!</span>
        </div>
      </div>
    </div>`;
}

function bindChangeOrderEvents(container) {
  const toggle = document.getElementById('co-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      state._changeOrdersOpen = !state._changeOrdersOpen;
      const body = document.getElementById('co-collapsible');
      const icon = document.getElementById('co-toggle-icon');
      if (body) body.style.display = state._changeOrdersOpen ? 'block' : 'none';
      if (icon) icon.textContent = state._changeOrdersOpen ? '▼' : '▶';
    });
  }

  document.querySelectorAll('.co-include-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const coId = cb.dataset.coId;
      if (cb.checked) state._excludedCOs.delete(coId);
      else state._excludedCOs.add(coId);
      renderStep7(container);
    });
  });

  const copyBtn = document.getElementById('co-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const cos = extractPotentialChangeOrders(state).filter(c => !state._excludedCOs.has(c.id));
      const fmt = n => '$' + (n || 0).toLocaleString('en-US');
      let text = `POTENTIAL CHANGE ORDERS — ${state.projectName || 'Project'}\n`;
      text += '─'.repeat(80) + '\n';
      text += 'CO#\tSeverity\tEst. Impact\tDescription\n';
      text += '─'.repeat(80) + '\n';
      cos.forEach(c => {
        text += `${c.id}\t${c.severity.toUpperCase()}\t${c.estimatedCost > 0 ? fmt(c.estimatedCost) : 'TBD'}\t${c.description}\n`;
      });
      const total = cos.reduce((s, c) => s + c.estimatedCost, 0);
      text += '─'.repeat(80) + '\n';
      text += `TOTAL ESTIMATED IMPACT: ${fmt(total)} (${cos.length} items)\n`;

      navigator.clipboard.writeText(text).then(() => {
        const status = document.getElementById('co-copy-status');
        if (status) { status.style.display = 'inline'; setTimeout(() => { status.style.display = 'none'; }, 2000); }
      });
    });
  }

  // PDF Export
  const pdfBtn = document.getElementById('co-pdf-btn');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', () => {
      const cos = extractPotentialChangeOrders(state).filter(c => !state._excludedCOs.has(c.id));
      const fmt = n => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      const total = cos.reduce((s, c) => s + c.estimatedCost, 0);
      const sevColors = { critical: '#DC2626', high: '#EA580C', medium: '#D97706', low: '#65A30D' };
      const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      const rows = cos.map(c => `
        <tr>
          <td style="padding:8px 10px;border:1px solid #ddd;font-weight:600;font-size:11px;">${c.id}</td>
          <td style="padding:8px 10px;border:1px solid #ddd;font-size:12px;">${c.description}${c.recommendation ? '<br><em style="font-size:10px;color:#666;">' + c.recommendation + '</em>' : ''}</td>
          <td style="padding:8px 10px;border:1px solid #ddd;text-align:center;">
            <span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;color:white;background:${sevColors[c.severity] || '#D97706'};">${c.severity.toUpperCase()}</span>
          </td>
          <td style="padding:8px 10px;border:1px solid #ddd;text-align:right;font-weight:600;">${c.estimatedCost > 0 ? fmt(c.estimatedCost) : 'TBD'}</td>
          <td style="padding:8px 10px;border:1px solid #ddd;font-size:10px;color:#666;">${c.source}</td>
        </tr>`).join('');

      const html = `<!DOCTYPE html><html><head><title>Potential Change Orders — ${state.projectName || 'Project'}</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:Arial,Helvetica,sans-serif;color:#1a1a2e;padding:40px;max-width:1000px;margin:0 auto}
          @media print{body{padding:20px}}
        </style></head><body>
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #EA580C;padding-bottom:16px;margin-bottom:24px;">
          <div>
            <h1 style="font-size:22px;color:#EA580C;margin-bottom:4px;">Potential Change Orders</h1>
            <div style="font-size:14px;font-weight:600;">${state.projectName || 'Project'}</div>
            <div style="font-size:12px;color:#666;">${state.preparedFor ? 'Prepared for: ' + state.preparedFor + ' | ' : ''}${date}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:24px;font-weight:800;color:#EA580C;">${fmt(total)}</div>
            <div style="font-size:11px;color:#666;">${cos.length} items identified</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#EA580C;color:white;">
              <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;border:1px solid #EA580C;">CO#</th>
              <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;border:1px solid #EA580C;">DESCRIPTION</th>
              <th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;border:1px solid #EA580C;">SEVERITY</th>
              <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;border:1px solid #EA580C;">EST. IMPACT</th>
              <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;border:1px solid #EA580C;">SOURCE</th>
            </tr>
          </thead>
          <tbody>${rows}
            <tr style="background:#FFF7ED;">
              <td colspan="3" style="padding:10px;border:1px solid #ddd;font-weight:700;text-align:right;font-size:13px;">TOTAL ESTIMATED IMPACT</td>
              <td style="padding:10px;border:1px solid #ddd;text-align:right;font-weight:800;font-size:14px;color:#EA580C;">${fmt(total)}</td>
              <td style="border:1px solid #ddd;"></td>
            </tr>
          </tbody>
        </table>
        <div style="margin-top:24px;font-size:10px;color:#999;text-align:center;">
          Generated by SmartPlans AI — 3D Technology Services Inc. | 3D CONFIDENTIAL
        </div>
        <script>window.onload=function(){window.print();}</script>
      </body></html>`;

      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); }
    });
  }
}

// BID PHASES / ALTERNATES
function getBidPhaseBOM() { if (!state.aiAnalysis) return { categories: [], grandTotal: 0 }; const bom = getFilteredBOM(state.aiAnalysis, state.disciplines); const overrides = state.supplierPriceOverrides || {}; for (const [key, ov] of Object.entries(overrides)) { const [ci, ii] = key.split('-').map(Number); if (bom.categories[ci] && bom.categories[ci].items[ii]) { const it = bom.categories[ci].items[ii]; if (ov.qty != null) it.qty = ov.qty; it.unitCost = ov.unitCost; it.extCost = Math.round(it.qty * ov.unitCost * 100) / 100; } } if (Object.keys(overrides).length > 0) { bom.grandTotal = 0; for (const cat of bom.categories) { cat.subtotal = cat.items.reduce((s, it) => s + it.extCost, 0); cat.subtotal = Math.round(cat.subtotal * 100) / 100; bom.grandTotal += cat.subtotal; } bom.grandTotal = Math.round(bom.grandTotal * 100) / 100; } return bom; }
function getPhaseTotal(phase, bom) { if (phase.type === 'base') { const ae = new Set(); state.bidPhases.forEach(p => { if (p.id !== 'base') p.categoryIndices.forEach(ci => ae.add(ci)); }); let t = 0; bom.categories.forEach((cat, ci) => { if (!ae.has(ci)) t += cat.subtotal; }); return Math.round(t * 100) / 100; } let t = 0; phase.categoryIndices.forEach(ci => { if (bom.categories[ci]) t += bom.categories[ci].subtotal; }); return Math.round(t * 100) / 100; }
function getBaseBidCategoryIndices(bom) { const ae = new Set(); state.bidPhases.forEach(p => { if (p.id !== 'base') p.categoryIndices.forEach(ci => ae.add(ci)); }); const idx = []; bom.categories.forEach((_, ci) => { if (!ae.has(ci)) idx.push(ci); }); return idx; }
function buildBidPhasesCard(st) { if (!st.aiAnalysis) return ''; const bom = getBidPhaseBOM(); if (bom.categories.length === 0) return ''; const _fmt = (v) => { const abs = Math.abs(v); const str = '$' + abs.toLocaleString('en-US', {minimumFractionDigits:0,maximumFractionDigits:0}); return v < 0 ? '(' + str + ')' : str; }; const ptm = { base: {label:'Base Bid',bc:'bid-phase-badge--base'}, add: {label:'Add Alternate',bc:'bid-phase-badge--add'}, deduct: {label:'Deduct Alt',bc:'bid-phase-badge--deduct'}, optional: {label:'Optional',bc:'bid-phase-badge--optional'} }; let pr='',sr='',rt=0; st.bidPhases.forEach((phase, pi) => { const m = ptm[phase.type]||ptm.optional; const tot = getPhaseTotal(phase,bom); const dt = phase.type==='deduct' ? -Math.abs(tot) : tot; if (phase.includeInProposal) rt += dt; let ac = phase.type==='base' ? getBaseBidCategoryIndices(bom) : phase.categoryIndices; const cn = ac.map(ci => bom.categories[ci] ? esc(bom.categories[ci].name) : '').filter(Boolean); let cah=''; if (phase.type!=='base') { const avail=[]; bom.categories.forEach((cat,ci) => { const at = st.bidPhases.find(p => p.id!=='base' && p.id!==phase.id && p.categoryIndices.includes(ci)); if (!at) avail.push({ci,name:cat.name,chk:phase.categoryIndices.includes(ci)}); else if (phase.categoryIndices.includes(ci)) avail.push({ci,name:cat.name,chk:true}); }); cah = '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">' + avail.map(a => '<label class="bid-phase-cat-chip' + (a.chk?' bid-phase-cat-chip--active':'') + '" style="cursor:pointer;"><input type="checkbox" ' + (a.chk?'checked ':'') + 'style="display:none;" data-bid-phase-cat="' + phase.id + '" data-cat-idx="' + a.ci + '">' + esc(a.name) + '</label>').join('') + (avail.length===0?'<span style="font-size:11px;color:var(--text-muted);font-style:italic;">All categories assigned to other phases</span>':'') + '</div>'; } pr += '<div class="bid-phase-row" data-phase-idx="'+pi+'" style="padding:14px 16px;border:1px solid rgba(0,0,0,0.06);margin-bottom:8px;background:var(--bg-surface-2);"><div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;"><div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;"><span class="bid-phase-badge '+m.bc+'">'+m.label+'</span>' + (phase.type==='base' ? '<span style="font-weight:600;font-size:13px;color:var(--text-primary);">'+esc(phase.name)+'</span>' : '<input type="text" class="bid-phase-name-input" data-phase-id="'+phase.id+'" value="'+esc(phase.name)+'" style="flex:1;padding:4px 8px;border:1px solid rgba(0,0,0,0.08);background:transparent;font-size:13px;font-weight:600;color:var(--text-primary);min-width:120px;outline:none;font-family:var(--font-sans);" />') + '</div><div style="display:flex;align-items:center;gap:8px;"><span style="font-size:14px;font-weight:700;color:'+(phase.type==='deduct'?'#D97706':'var(--accent-teal)')+';">'+_fmt(dt)+'</span><label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;color:var(--text-muted);" title="Include in Proposal"><input type="checkbox" '+(phase.includeInProposal?'checked ':'')+' data-bid-phase-proposal="'+phase.id+'" style="accent-color:#0D9488;">Proposal</label>' + (phase.type!=='base' ? '<button data-bid-phase-remove="'+phase.id+'" title="Remove phase" style="background:none;border:1px solid rgba(225,29,72,0.2);color:#E11D48;cursor:pointer;font-size:12px;padding:2px 6px;line-height:1;">x</button>' : '') + '</div></div><div style="margin-top:6px;font-size:11px;color:var(--text-muted);">' + (cn.length>0 ? cn.join(', ') : '<em>No categories assigned</em>') + '</div>' + cah + '</div>'; sr += '<tr style="border-bottom:1px solid rgba(0,0,0,0.04);"><td style="padding:6px 10px;font-size:12px;color:var(--text-primary);">'+esc(phase.name)+'</td><td style="padding:6px 10px;font-size:11px;"><span class="bid-phase-badge '+m.bc+'" style="font-size:10px;padding:2px 6px;">'+m.label+'</span></td><td style="padding:6px 10px;font-size:12px;color:var(--text-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+(cn.join(', ')||'—')+'</td><td style="padding:6px 10px;font-size:13px;font-weight:600;text-align:right;color:'+(phase.type==='deduct'?'#D97706':'var(--text-primary)')+';">'+_fmt(dt)+'</td><td style="padding:6px 10px;text-align:center;font-size:12px;">'+(phase.includeInProposal?'✓':'—')+'</td></tr>'; }); const st2 = '<div style="margin-top:16px;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:rgba(13,148,136,0.06);"><th style="padding:8px 10px;text-align:left;font-size:11px;color:var(--accent-teal);font-weight:700;border-bottom:2px solid rgba(13,148,136,0.15);">Phase</th><th style="padding:8px 10px;text-align:left;font-size:11px;color:var(--accent-teal);font-weight:700;border-bottom:2px solid rgba(13,148,136,0.15);">Type</th><th style="padding:8px 10px;text-align:left;font-size:11px;color:var(--accent-teal);font-weight:700;border-bottom:2px solid rgba(13,148,136,0.15);">Categories</th><th style="padding:8px 10px;text-align:right;font-size:11px;color:var(--accent-teal);font-weight:700;border-bottom:2px solid rgba(13,148,136,0.15);">Amount</th><th style="padding:8px 10px;text-align:center;font-size:11px;color:var(--accent-teal);font-weight:700;border-bottom:2px solid rgba(13,148,136,0.15);">Proposal</th></tr></thead><tbody>'+sr+'<tr style="background:rgba(13,148,136,0.08);"><td colspan="3" style="padding:8px 10px;font-size:13px;font-weight:700;color:var(--text-primary);text-align:right;">Total if all accepted</td><td style="padding:8px 10px;font-size:14px;font-weight:700;color:var(--accent-teal);text-align:right;">'+_fmt(rt)+'</td><td></td></tr></tbody></table></div>'; return '<div style="border-top:1px solid rgba(0,0,0,0.06);margin:24px 0;"></div><div class="info-card" style="margin-bottom:22px;border:1px solid rgba(13,148,136,0.15);background:#FFFFFF;"><div style="display:flex;align-items:center;justify-content:space-between;padding-left:8px;cursor:pointer;" id="bid-phases-toggle"><div class="info-card-title" style="margin-bottom:0;"><i data-lucide="layers" style="width:16px;height:16px;"></i> Bid Phases &amp; Alternates</div><span id="bid-phases-toggle-icon" style="font-size:14px;color:var(--text-muted);transition:transform 0.2s;padding:8px;">'+(st._bidPhasesOpen?'▼':'▶')+'</span></div><div id="bid-phases-collapsible" style="display:'+(st._bidPhasesOpen?'block':'none')+';margin-top:12px;"><div class="info-card-body" style="margin-bottom:12px;">Structure your bid with base and alternate pricing. Assign BOM categories to each phase — unassigned categories stay in the Base Bid.</div>'+pr+'<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;"><button id="bid-phase-add-add" style="padding:6px 14px;border:1px solid rgba(16,185,129,0.3);background:rgba(16,185,129,0.04);color:#059669;cursor:pointer;font-size:12px;font-weight:600;font-family:var(--font-sans);">+ Add Alternate</button><button id="bid-phase-add-deduct" style="padding:6px 14px;border:1px solid rgba(217,119,6,0.3);background:rgba(217,119,6,0.04);color:#D97706;cursor:pointer;font-size:12px;font-weight:600;font-family:var(--font-sans);">+ Deduct Alternate</button><button id="bid-phase-add-optional" style="padding:6px 14px;border:1px solid rgba(0,0,0,0.1);background:rgba(0,0,0,0.02);color:var(--text-muted);cursor:pointer;font-size:12px;font-weight:600;font-family:var(--font-sans);">+ Optional Phase</button></div>'+st2+'</div></div>'; }
function bindBidPhasesEvents(container) { const toggle = document.getElementById('bid-phases-toggle'); if (toggle) { toggle.addEventListener('click', () => { state._bidPhasesOpen = !state._bidPhasesOpen; const body = document.getElementById('bid-phases-collapsible'); const icon = document.getElementById('bid-phases-toggle-icon'); if (body) body.style.display = state._bidPhasesOpen ? 'block' : 'none'; if (icon) icon.textContent = state._bidPhasesOpen ? '▼' : '▶'; }); } const ah = {'bid-phase-add-add':'add','bid-phase-add-deduct':'deduct','bid-phase-add-optional':'optional'}; for (const [bi,ty] of Object.entries(ah)) { const btn = document.getElementById(bi); if (btn) btn.addEventListener('click', () => { state._bidPhaseCounter++; const n = state.bidPhases.filter(p=>p.type===ty).length+1; const lb = {add:`Add Alternate #${n}`,deduct:`Deduct Alternate #${n}`,optional:`Optional Phase #${n}`}; state.bidPhases.push({id:`phase-${Date.now()}-${state._bidPhaseCounter}`,name:lb[ty],type:ty,categoryIndices:[],includeInProposal:ty!=='optional'}); state._bidPhasesOpen=true; renderStep7(container); }); } document.querySelectorAll('[data-bid-phase-remove]').forEach(b => { b.addEventListener('click', e => { e.stopPropagation(); state.bidPhases = state.bidPhases.filter(p => p.id !== b.dataset.bidPhaseRemove); renderStep7(container); }); }); document.querySelectorAll('.bid-phase-name-input').forEach(inp => { inp.addEventListener('change', () => { const ph = state.bidPhases.find(p => p.id === inp.dataset.phaseId); if (ph) ph.name = inp.value.trim() || ph.name; }); }); document.querySelectorAll('[data-bid-phase-proposal]').forEach(cb => { cb.addEventListener('change', () => { const ph = state.bidPhases.find(p => p.id === cb.dataset.bidPhaseProposal); if (ph) { ph.includeInProposal = cb.checked; renderStep7(container); } }); }); document.querySelectorAll('[data-bid-phase-cat]').forEach(cb => { cb.addEventListener('change', () => { const pid = cb.dataset.bidPhaseCat; const ci = parseInt(cb.dataset.catIdx); const ph = state.bidPhases.find(p => p.id === pid); if (!ph) return; if (cb.checked) { state.bidPhases.forEach(p => { if (p.id!=='base' && p.id!==pid) p.categoryIndices = p.categoryIndices.filter(c=>c!==ci); }); if (!ph.categoryIndices.includes(ci)) ph.categoryIndices.push(ci); } else { ph.categoryIndices = ph.categoryIndices.filter(c=>c!==ci); } renderStep7(container); }); }); }

// Warn before leaving page if user has unsaved work
window.addEventListener("beforeunload", e => {
  const hasWork = state.projectName.trim().length > 0 || state.planFiles.length > 0;
  if (hasWork) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// ═══════════════════════════════════════════════════════════════
// ERROR MONITORING — Log unhandled errors to /api/health
// ═══════════════════════════════════════════════════════════════

window.addEventListener('error', (event) => {
  try {
    fetch('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'js_error',
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        col: event.colno,
        stack: event.error?.stack?.substring(0, 1000),
        url: location.href,
        timestamp: new Date().toISOString(),
      }),
    }).catch((fetchErr) => { console.warn('Error reporting fetch failed:', fetchErr); }); // Best-effort, don't recurse
  } catch (e) { console.warn('Error handler failed:', e); }
});

window.addEventListener('unhandledrejection', (event) => {
  try {
    fetch('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'promise_rejection',
        message: String(event.reason),
        stack: event.reason?.stack?.substring(0, 1000),
        url: location.href,
        timestamp: new Date().toISOString(),
      }),
    }).catch((fetchErr) => { console.warn('Rejection reporting fetch failed:', fetchErr); });
  } catch (e) { console.warn('Rejection handler failed:', e); }
});

document.addEventListener("DOMContentLoaded", () => {
  // Initialize app token if not already set
  if (!sessionStorage.getItem('sp_app_token')) {
    sessionStorage.setItem('sp_app_token', crypto.randomUUID());
  }
  _appToken = sessionStorage.getItem('sp_app_token');

  render();
  // Start API quota monitoring — warns users before they hit limits
  QuotaMonitor.start();
  // Start usage stats — cross-device bid counter & cost tracker
  UsageStats.start();

  // Online/offline detection — only attach once
  if (!window._spListenersAttached) {
    window._spListenersAttached = true;
    window.addEventListener('offline', () => {
      spToast('You are offline. Changes will not be saved.', 'error');
      document.body.classList.add('is-offline');
    });
    window.addEventListener('online', () => {
      spToast('Back online!', 'success');
      document.body.classList.remove('is-offline');
    });

    // Unsaved changes warning — prevent accidental navigation loss
    window.addEventListener('beforeunload', (e) => {
      const hasWork = state.projectName.trim() ||
        state.planFiles.length > 0 ||
        state.legendFiles.length > 0 ||
        state.analyzing;
      if (hasWork && !state.analysisComplete) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }
});
