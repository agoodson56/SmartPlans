/* ================================================================
   SmartPlans — Application Logic
   AI-Powered Construction Document Analysis Wizard
   ================================================================ */

// ═══════════════════════════════════════════════════════════════
// GEMINI API CONFIG
// ═══════════════════════════════════════════════════════════════

const GEMINI_CONFIG = {
  apiKey: "AIzaSyAqm-Jayt-Ty1iTJTxH2oqWuvmfcUZQDqY",
  model: "gemini-2.0-flash",
  get endpoint() {
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
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
  projectType: "",
  disciplines: [],
  fileFormat: "",
  specificItems: "",
  knownQuantities: "",
  codeJurisdiction: "",
  priorEstimate: "",

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
};


// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function canProceed() {
  switch (state.currentStep) {
    case 0: return state.projectName.trim() && state.projectType && state.disciplines.length > 0;
    case 1: return true; // legend is recommended but we allow skipping
    case 2: return state.planFiles.length > 0;
    case 3: return true; // specs optional
    case 4: return state.hasAddenda !== null;
    case 5: return true;
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
  return Math.min(base, 97);
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


// ═══════════════════════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════════════════════

function render() {
  renderStepNav();
  renderContent();
  renderFooter();
}

// ─── Step Navigation ───
function renderStepNav() {
  const nav = document.getElementById("step-nav");
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
    case 6: renderStep6(main); break;
  }
}

// ─── Footer ───
function renderFooter() {
  const footer = document.getElementById("step-footer");

  if (state.analyzing) {
    footer.innerHTML = "";
    footer.style.display = "none";
    return;
  }

  footer.style.display = "flex";

  if (state.currentStep === 6) {
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
      render();
      scrollContentTop();
    });
    return;
  }

  footer.style.justifyContent = "space-between";
  const can = canProceed();

  footer.innerHTML = `
    <button class="footer-btn footer-btn--back" id="btn-back" ${state.currentStep === 0 ? "disabled" : ""}>← Back</button>
    <span class="footer-step-indicator">Step ${state.currentStep + 1} of ${STEPS.length}</span>
    <button class="footer-btn footer-btn--next" id="btn-next" ${!can ? "disabled" : ""}>
      ${state.currentStep === 5 ? "🔍 Begin Analysis" : "Next →"}
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
    if (!canProceed()) return;
    const stepId = STEPS[state.currentStep].id;
    state.completedSteps.add(stepId);

    if (state.currentStep === 5) {
      state.analyzing = true;
      render();
    } else {
      state.currentStep++;
      render();
      scrollContentTop();
    }
  });
}

function scrollContentTop() {
  const main = document.getElementById("step-content");
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
      <label class="form-label" for="prior-estimate">Prior estimate or bid to compare against <span style="color:var(--text-muted);font-weight:400">(optional)</span></label>
      <p class="form-hint">Describe it briefly. I can investigate discrepancies between my analysis and prior counts.</p>
      <textarea class="form-textarea" id="prior-estimate" placeholder="Describe any prior estimate data…">${esc(state.priorEstimate)}</textarea>
    </div>
  `;

  // Bind events
  const nameInput = document.getElementById("project-name");
  nameInput.addEventListener("input", () => { state.projectName = nameInput.value; renderFooter(); });

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
  document.getElementById("prior-estimate").addEventListener("input", e => { state.priorEstimate = e.target.value; });
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

    <div class="accuracy-panel">
      <div class="accuracy-label">Estimated Accuracy</div>
      <div class="accuracy-value">${accuracy}%</div>
      <div class="accuracy-sub">Based on your file format, legend, and context provided</div>
    </div>

    <div class="form-group">
      <label class="form-label" for="final-notes">Any additional notes or instructions?</label>
      <p class="form-hint">Anything else I should know — unusual symbols, areas to skip, specific concerns about the drawings.</p>
      <textarea class="form-textarea" id="final-notes" placeholder="Add notes here…">${esc(state.notes)}</textarea>
    </div>
  `;

  document.getElementById("final-notes").addEventListener("input", e => { state.notes = e.target.value; });
}


// ─── Step 6: Results & RFIs ───
function renderStep6(container) {
  const rfis = getRelevantRFIs();
  const accuracy = getAccuracyEstimate();
  let confLabel, confDesc;
  if (accuracy >= 85) {
    confLabel = "High";
    confDesc = "Your file quality and context should produce reliable counts. Spot-check 2–3 sheets to verify.";
  } else if (accuracy >= 70) {
    confLabel = "Moderate";
    confDesc = "Results are usable but require manual verification on dense areas. Consider upgrading file format.";
  } else {
    confLabel = "Low";
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
    aiSection = `
      <div class="info-card info-card--emerald" style="margin-bottom:22px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding-left:8px;">
          <div class="info-card-title" style="margin-bottom:0;">📋 MDF/IDF Material Breakdown & Analysis</div>
          <button id="export-analysis-btn" style="padding:6px 16px;border-radius:8px;border:1px solid rgba(16,185,129,0.3);background:rgba(16,185,129,0.1);color:var(--accent-emerald);font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;">📥 Export Analysis</button>
        </div>
        <div class="info-card-body ai-analysis-content" style="white-space:pre-wrap; line-height:1.75; max-height:600px; overflow-y:auto;">${formatAIResponse(state.aiAnalysis)}</div>
      </div>
    `;
  }

  container.innerHTML = `
    <h2 class="step-heading">Analysis Complete</h2>
    <p class="step-subheading">Based on the documents and context you provided, here are my findings and recommended RFIs to resolve gaps.</p>

    <div class="results-hero">
      <div class="results-top">
        <div class="results-ring" style="background:conic-gradient(var(--accent-emerald) ${accuracy * 3.6}deg, rgba(255,255,255,0.05) 0deg);">
          <div class="results-ring-inner">
            <span class="results-ring-pct">${accuracy}%</span>
          </div>
        </div>
        <div>
          <div class="results-confidence-label">Confidence Level: ${confLabel}</div>
          <div class="results-confidence-desc">${confDesc}</div>
        </div>
      </div>
      <div class="results-stats">
        <div class="results-stat">
          <div class="results-stat-icon">📐</div>
          <div class="results-stat-value">${state.planFiles.length}</div>
          <div class="results-stat-label">Sheets Analyzed</div>
        </div>
        <div class="results-stat">
          <div class="results-stat-icon">📄</div>
          <div class="results-stat-value">${state.specFiles.length}</div>
          <div class="results-stat-label">Spec Sections</div>
        </div>
        <div class="results-stat">
          <div class="results-stat-icon">⚠️</div>
          <div class="results-stat-value">${rfis.length}</div>
          <div class="results-stat-label">RFIs Recommended</div>
        </div>
      </div>
    </div>

    ${aiSection}

    <div class="info-card info-card--sky">
      <div class="info-card-title">What to Do Next</div>
      <div class="info-card-body" style="line-height:1.9">
        <strong>1.</strong> Review the AI analysis above and verify symbol counts against your drawings.<br>
        <strong>2.</strong> Submit the selected RFIs below to the architect/engineer to resolve gaps before finalizing your estimate.<br>
        <strong>3.</strong> Spot-check AI counts on 2–3 sheets. If they deviate by more than 10%, re-analyze with corrective guidance.
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
      <button class="export-btn" id="export-rfis">
        📥 Export ${state.selectedRFIs.size} Selected RFI${state.selectedRFIs.size !== 1 ? "s" : ""} to Text File
      </button>
    ` : ""}
  `;

  // Bind RFI events
  document.getElementById("rfi-select-all").addEventListener("click", () => {
    rfis.forEach(r => state.selectedRFIs.add(r.id));
    renderStep6(container);
  });

  document.getElementById("rfi-clear-all").addEventListener("click", () => {
    state.selectedRFIs.clear();
    renderStep6(container);
  });

  document.querySelectorAll("[data-rfi-check]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = btn.dataset.rfiCheck;
      if (state.selectedRFIs.has(id)) state.selectedRFIs.delete(id);
      else state.selectedRFIs.add(id);
      renderStep6(container);
    });
  });

  document.querySelectorAll("[data-rfi-toggle]").forEach(row => {
    row.addEventListener("click", e => {
      if (e.target.closest("[data-rfi-check]")) return;
      const id = row.dataset.rfiToggle;
      state.expandedRFI = state.expandedRFI === id ? null : id;
      renderStep6(container);
    });
  });

  const exportBtn = document.getElementById("export-rfis");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportRFIs);
  }

  const exportAnalysisBtn = document.getElementById("export-analysis-btn");
  if (exportAnalysisBtn) {
    exportAnalysisBtn.addEventListener("click", exportAnalysis);
  }
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

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      resolve({ base64, mimeType: file.type || "application/octet-stream" });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildGeminiPrompt() {
  let prompt = `You are a senior low-voltage / ELV estimator, code compliance reviewer, and construction document analyst specializing in: Structured Cabling, CCTV, Access Control, Audio Visual, Intrusion Detection, and Fire Alarm systems.

You have expert knowledge of all applicable federal, state, local codes and industry standards. You MUST flag any code violations or non-compliant items found in the documents.

Project: "${state.projectName}"
Project Type: ${state.projectType}
ELV Disciplines to analyze: ${state.disciplines.join(", ")}
File Format: ${state.fileFormat || "Not specified"}
Code Jurisdiction: ${state.codeJurisdiction || "Not specified"}
`;

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
   a) Room Designation & Location
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

   Format each room as its own section — an install checklist for project managers.

7. **OVERALL MATERIAL SUMMARY** — Consolidated bill of materials:
   - Total cable by type (Cat 6, Cat 6A, fiber, coax, 18/2, 18/4, 22/4, etc.)
   - Total devices by type across all rooms
   - Total rack units
   - Total patch panels, switches, accessories
   - Pathway materials (cable tray, J-hooks, conduit, firestop)

8. **CODE COMPLIANCE SUMMARY** — Dedicated section:
   - Total issues: 🔴 Critical / 🟡 Warning / 🔵 Info
   - Each issue with code reference, location, and recommended action
   - Items requiring AHJ approval or inspection
   - Permits likely required (fire alarm, low voltage, electrical)

9. Analysis observations:
   - Device counts by type, per sheet/floor
   - Cable/conduit pathway observations
   - Spec-to-plan conflicts
   - Missing info requiring RFIs
   - Scope gaps or ambiguities
   - Confidence level for each count

10. Specific, actionable RFI questions with code references where applicable.
11. If known quantities provided, compare and flag deviations over 10%.

FORMAT REQUIREMENTS:
- Use markdown headers to organize sections
- Start with # CODE & STANDARDS COMPLIANCE REVIEW
- Follow with ## MDF/IDF MATERIAL BREAKDOWN per room
- Then ## OVERALL MATERIAL SUMMARY
- Then ## CODE COMPLIANCE SUMMARY table
- Then ## RFIs
- Use tables where possible
- Tag issues: 🔴 CRITICAL, 🟡 WARNING, 🔵 INFO
- Include confidence percentage for each major count
- Reference sheet numbers, room numbers, device types
- Detailed enough for PM procurement and installation planning`;


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

  progressCallback(10, "Preparing files for analysis…");

  // Convert files to base64 for Gemini inline_data
  const parts = [];

  // Add text prompt first
  parts.push({ text: buildGeminiPrompt() });

  // Convert each file to base64 and add as inline_data
  const supportedTypes = [
    "application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif",
    "image/tiff", "text/plain",
  ];

  let fileIdx = 0;
  for (const entry of filesToSend) {
    fileIdx++;
    const pct = 10 + Math.round((fileIdx / filesToSend.length) * 30);
    progressCallback(pct, `Encoding ${entry.category}: ${entry.name}…`);

    try {
      const { base64, mimeType } = await fileToBase64(entry.rawFile);

      // Check if mime type is supported, fallback for common types
      let finalMime = mimeType;
      if (entry.name.toLowerCase().endsWith(".pdf")) finalMime = "application/pdf";
      else if (entry.name.toLowerCase().endsWith(".png")) finalMime = "image/png";
      else if (entry.name.toLowerCase().endsWith(".jpg") || entry.name.toLowerCase().endsWith(".jpeg")) finalMime = "image/jpeg";
      else if (entry.name.toLowerCase().endsWith(".tif") || entry.name.toLowerCase().endsWith(".tiff")) finalMime = "image/tiff";
      else if (entry.name.toLowerCase().endsWith(".txt")) finalMime = "text/plain";

      // Add file label
      parts.push({ text: `\n--- FILE: ${entry.name} (${entry.category}) ---` });

      // Only send supported types as inline_data
      if (supportedTypes.some(t => finalMime.startsWith(t.split("/")[0])) || finalMime === "application/pdf") {
        parts.push({
          inline_data: {
            mime_type: finalMime,
            data: base64,
          },
        });
      } else {
        parts.push({ text: `[File type ${finalMime} not supported for direct analysis. Filename: ${entry.name}]` });
      }
    } catch (err) {
      parts.push({ text: `[Error reading file: ${entry.name}]` });
    }
  }

  progressCallback(45, "Sending documents to Gemini AI…");

  // Call the Gemini API
  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 16384,
    },
  };

  const response = await fetch(GEMINI_CONFIG.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  progressCallback(80, "Processing AI response…");

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  progressCallback(95, "Compiling results…");

  // Extract text from response
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("\n") || "No analysis generated.";
  return text;
}


// ═══════════════════════════════════════════════════════════════
// ANALYSIS ANIMATION + API CALL
// ═══════════════════════════════════════════════════════════════

function renderAnalysis(container) {
  container.innerHTML = `
    <div class="analysis-overlay">
      <div class="analysis-ring" id="analysis-ring">
        <div class="analysis-ring-inner">
          <span class="analysis-pct" id="analysis-pct">0%</span>
        </div>
      </div>
      <div class="analysis-title">Analyzing Your Documents</div>
      <div class="analysis-stage" id="analysis-stage">Initializing…</div>
      <div class="analysis-bar-track"><div class="analysis-bar-fill" id="analysis-bar"></div></div>
    </div>
  `;

  const pctEl = document.getElementById("analysis-pct");
  const stageEl = document.getElementById("analysis-stage");
  const barEl = document.getElementById("analysis-bar");
  const ringEl = document.getElementById("analysis-ring");

  function updateProgress(pct, text) {
    const p = Math.min(Math.round(pct), 100);
    pctEl.textContent = p + "%";
    barEl.style.width = p + "%";
    ringEl.style.background = `conic-gradient(var(--accent-sky) ${pct * 3.6}deg, rgba(255,255,255,0.05) 0deg)`;
    if (text) stageEl.textContent = text;
  }

  // Check if we have any files with rawFile objects to send
  const hasRawFiles = [
    ...state.legendFiles, ...state.planFiles, ...state.specFiles, ...state.addendaFiles
  ].some(f => f.rawFile);

  if (hasRawFiles) {
    // Real Gemini API analysis
    runGeminiAnalysis(updateProgress);
  } else {
    // Fallback: simulated analysis (no raw files available)
    runSimulatedAnalysis(updateProgress);
  }

  renderFooter(); // hides footer
}

async function runGeminiAnalysis(updateProgress) {
  try {
    updateProgress(5, "Preparing documents…");
    const result = await callGeminiAPI(updateProgress);
    state.aiAnalysis = result;
    state.aiError = null;
    updateProgress(100, "Analysis complete!");

    setTimeout(() => {
      state.analyzing = false;
      state.analysisComplete = true;
      state.completedSteps.add("review");
      state.currentStep = 6;
      render();
      scrollContentTop();
    }, 600);
  } catch (err) {
    console.error("Gemini API Error:", err);
    state.aiAnalysis = null;
    state.aiError = err.message;
    updateProgress(100, "Analysis complete (with errors)");

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

function exportRFIs() {
  const rfis = getRelevantRFIs().filter(r => state.selectedRFIs.has(r.id));
  const line = "=".repeat(64);
  let text = `RFI LOG — ${state.projectName || "Project"}\n`;
  text += `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}\n`;
  text += `Project Type: ${state.projectType}\n`;
  text += `Disciplines: ${state.disciplines.join(", ")}\n`;
  text += `${line}\n\n`;

  rfis.forEach(r => {
    text += `RFI ${r.id} [${r.discipline}]\n`;
    text += `Question: ${r.q}\n`;
    text += `Reason: ${r.reason}\n`;
    text += `Status: OPEN\n`;
    text += `Response: ____________________\n\n`;
  });

  text += `${line}\n`;
  text += `Total RFIs: ${rfis.length}\n`;
  text += `Generated by SmartPlans — AI-Powered Document Analysis\n`;

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `RFI_Log_${(state.projectName || "Project").replace(/\s+/g, "_")}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
// INIT
// ═══════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  render();
});
