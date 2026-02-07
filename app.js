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
  projectLocation: "",
  prevailingWage: "",
  workShift: "",
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
      <label class="form-label" for="project-location">Project Location <span style="color:var(--text-muted);font-weight:400">(for travel estimate)</span></label>
      <p class="form-hint">City and state of the project site. If the project is 100+ miles from your office, travel expenses (hotel, meals, airfare, vehicle) will be calculated.</p>
      <input class="form-input" type="text" id="project-location" value="${esc(state.projectLocation)}" placeholder="e.g., Austin, TX or Miami, FL">
    </div>

    <div class="form-group">
      <label class="form-label" for="prevailing-wage">Prevailing Wage / Davis-Bacon</label>
      <p class="form-hint">For government, public, or federally funded projects. Determines labor rate classifications and certified payroll requirements.</p>
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
        Labor costs will be calculated using DOL wage determinations. The analysis will include:<br>
        <div>• Correct wage classifications per ELV trade</div>
        <div>• Base hourly rate + fringe benefits = loaded rate</div>
        <div>• Certified payroll requirements</div>
        <div>• Apprentice ratio guidelines</div>
        <div style="margin-top:6px;color:var(--accent-amber);font-weight:600;">💡 Tip: Enter the project location above so the correct county/locality wage rates can be applied.</div>
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
  document.getElementById("project-location").addEventListener("input", e => { state.projectLocation = e.target.value; });

  const pwSelect = document.getElementById("prevailing-wage");
  pwSelect.value = state.prevailingWage;
  pwSelect.addEventListener("change", () => { state.prevailingWage = pwSelect.value; renderStep0(container); renderFooter(); });

  const shiftSelect = document.getElementById("work-shift");
  shiftSelect.value = state.workShift;
  shiftSelect.addEventListener("change", () => { state.workShift = shiftSelect.value; renderStep0(container); renderFooter(); });

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
Project Location: ${state.projectLocation || "Not specified"}
ELV Disciplines to analyze: ${state.disciplines.join(", ")}
File Format: ${state.fileFormat || "Not specified"}
Code Jurisdiction: ${state.codeJurisdiction || "Not specified"}
Prevailing Wage: ${state.prevailingWage === "davis-bacon" ? "Davis-Bacon Act (Federal)" : state.prevailingWage === "state-prevailing" ? "State Prevailing Wage" : state.prevailingWage === "pla" ? "Project Labor Agreement (PLA)" : "Not applicable — standard rates"}
Work Shift: ${state.workShift === "2nd-shift" ? "2nd Shift (3PM-11:30PM)" : state.workShift === "3rd-shift" ? "3rd Shift / Overnight (11PM-7:30AM)" : state.workShift === "weekends" ? "Weekends Only" : state.workShift === "split" ? "Split Shift (around occupants)" : state.workShift === "mixed" ? "Mixed — varies by phase" : state.workShift === "4-10" ? "4/10s (4 days × 10 hours)" : "1st Shift — Standard (7AM-3:30PM)"}
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
   - Bucket truck — pole-mounted cameras, aerial cable runs, exterior building mounts
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
   |----------------|-------|-------------|------------|
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

13. **CODE COMPLIANCE SUMMARY** — Dedicated summary section:
   - Total issues found: 🔴 Critical / 🟡 Warning / 🔵 Info
   - Each issue with code reference, location, and recommended action
   - Items requiring AHJ approval or inspection
   - Permits likely required (fire alarm, low voltage, electrical)

14. Analysis observations:
   - Device counts by type, per sheet/floor
   - Cable/conduit pathway observations
   - Spec-to-plan conflicts
   - Missing info requiring RFIs
   - Scope gaps or ambiguities
   - Confidence level for each count

15. Specific, actionable RFI questions with code references where applicable.
16. If known quantities provided, compare and flag deviations over 10%.

FORMAT REQUIREMENTS:
- Use markdown headers (##) to organize each major section
- Follow this exact section order:
  1. ## CODE & STANDARDS COMPLIANCE REVIEW
  2. ## MDF/IDF MATERIAL BREAKDOWN (per room)
  3. ## OVERALL MATERIAL SUMMARY
  4. ## LABOR SUMMARY (hours by discipline, by phase, crew recommendation, shift comparison if applicable)
  5. ## PREVAILING WAGE DETERMINATION (if applicable — classifications, rates, labor cost)
  6. ## SPECIAL EQUIPMENT & CONDITIONS (⚠️ flags and cost impact)
  7. ## TRAVEL & PER DIEM ESTIMATE (cost table by phase)
  8. ## SCHEDULE OF VALUES (SOV) — AIA G703 format
  9. ## CODE COMPLIANCE SUMMARY (issue count table)
  10. ## OBSERVATIONS & ANALYSIS
  11. ## RFIs
- Use tables where possible for readability
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
      maxOutputTokens: 32768,
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
