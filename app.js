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
  "Architectural",
  "Electrical",
  "Mechanical / HVAC",
  "Plumbing",
  "Fire Protection",
  "Structural",
  "Site / Civil",
  "Low Voltage / Technology",
];

const PROJECT_TYPES = [
  "New Construction",
  "Renovation / Remodel",
  "Tenant Improvement",
  "Addition",
  "Demolition Only",
];

const FILE_FORMATS = [
  { label: "Vector PDF (from CAD)", quality: "best", color: "#10b981" },
  { label: "DWG / DXF (AutoCAD)", quality: "best", color: "#10b981" },
  { label: "IFC / Revit BIM", quality: "best", color: "#10b981" },
  { label: "High-res scan (300+ DPI)", quality: "ok", color: "#f59e0b" },
  { label: "Low-res PDF / JPEG", quality: "poor", color: "#f43f5e" },
];

const RFI_TEMPLATES = {
  Architectural: [
    { id: "A-001", q: "The symbol legend does not include a symbol that appears repeatedly on the plans. Please clarify what this symbol represents and provide the correct quantity.", reason: "Unknown symbols cannot be counted or priced." },
    { id: "A-002", q: "Multiple sheets appear to have overlapping coverage areas. Please confirm which sheet governs and whether items on both should be counted once or twice.", reason: "Prevents double-counting." },
    { id: "A-003", q: "Plans show existing and new work without clear differentiation. Please confirm which items are existing-to-remain, demo, and new.", reason: "Phasing confusion causes scope errors." },
    { id: "A-004", q: "The drawing scale does not appear consistent with dimensions shown. Please confirm correct scale and provide a graphic scale bar.", reason: "Incorrect scale invalidates all measurements." },
    { id: "A-005", q: "The door schedule count does not match doors shown on plans. Please reconcile.", reason: "Schedule vs. plan discrepancy is one of the most common CD errors." },
    { id: "A-006", q: "Several rooms lack finish schedules or room tags. Please provide finish designations.", reason: "Missing finishes prevent accurate material quantification." },
  ],
  Electrical: [
    { id: "E-001", q: "Receptacle symbols vary in appearance. Please confirm whether these represent standard duplex, GFI, dedicated circuits, or other configurations.", reason: "Similar symbols with different meanings cause miscounts." },
    { id: "E-002", q: "The panel schedule shows fewer circuits than devices on the floor plan can accommodate. Please confirm panel sizing.", reason: "Panel capacity must match device count." },
    { id: "E-003", q: "Home run designations are missing for several branch circuits. Please provide circuit routing.", reason: "Without home runs, wire quantities cannot be calculated." },
    { id: "E-004", q: "Lighting fixture schedule references types not on the reflected ceiling plan. Please confirm locations.", reason: "Schedule/plan mismatch affects procurement." },
    { id: "E-005", q: "Conduit sizes and types are not indicated for branch circuit runs. Please specify.", reason: "Conduit type significantly impacts cost." },
  ],
  "Mechanical / HVAC": [
    { id: "M-001", q: "Ductwork sizes are missing for several runs. Please provide sizing or confirm contractor designs per criteria.", reason: "Duct sizing drives sheet metal and insulation quantities." },
    { id: "M-002", q: "Diffuser/grille schedule count doesn't match the floor plan. Please reconcile.", reason: "Counts must match for air balancing estimates." },
    { id: "M-003", q: "Plans show thermostats but specs reference a BAS system. Please confirm which to price.", reason: "BAS vs. standalone has dramatically different costs." },
  ],
  Plumbing: [
    { id: "P-001", q: "Fixture schedule references discontinued models. Please provide substitutes.", reason: "Discontinued fixtures require pricing adjustments." },
    { id: "P-002", q: "Pipe sizes not shown for domestic water distribution. Please provide or confirm contractor sizes per code.", reason: "Pipe sizing determines material and insulation costs." },
    { id: "P-003", q: "Floor drains on architectural plans don't appear on plumbing plans. Please confirm requirements.", reason: "Cross-discipline discrepancies are common." },
  ],
  "Fire Protection": [
    { id: "FP-001", q: "Sprinkler head locations not shown. Please confirm if this is design-build and provide performance criteria.", reason: "Design-build vs. fully designed have different bid requirements." },
    { id: "FP-002", q: "Fire extinguisher types and sizes not specified. Please provide schedule.", reason: "Different types for different hazards affect pricing." },
    { id: "FP-003", q: "Fire alarm NAC circuit wiring paths not shown. Please provide conduit routing.", reason: "Wiring paths drive conduit and cable quantities." },
  ],
  Structural: [
    { id: "S-001", q: "Connection details referenced on structural plans are not in the drawing set. Please provide.", reason: "Connection details drive fabrication costs." },
    { id: "S-002", q: "Foundation plan shows different footing sizes than the structural schedule. Please reconcile.", reason: "Affects concrete, rebar, and excavation quantities." },
  ],
  "Site / Civil": [
    { id: "SW-001", q: "Utility connections lack invert elevations and pipe materials. Please provide.", reason: "Determines excavation depth and pipe cost." },
    { id: "SW-002", q: "Pavement sections reference a soils report not included in the bid documents. Please provide.", reason: "Soil conditions dictate base course and subgrade preparation." },
  ],
  "Low Voltage / Technology": [
    { id: "LV-001", q: "Data outlet symbols are inconsistent across sheets. Please confirm symbol definitions and counts.", reason: "Inconsistent symbols cause cable and faceplate miscounts." },
    { id: "LV-002", q: "MDF/IDF locations are shown but room size and HVAC requirements are not specified. Please provide.", reason: "Telecom room build-out is a significant cost driver." },
    { id: "LV-003", q: "Cable pathways (conduit/J-hooks/cable tray) are not shown for horizontal runs. Please specify.", reason: "Pathway type dramatically affects labor and material cost." },
    { id: "LV-004", q: "Camera, access control, and intercom locations lack Schedule of Values or riser diagrams. Please provide.", reason: "Without SOV, device quantities and specs are ambiguous." },
    { id: "LV-005", q: "AV system equipment list and connection diagrams not provided. Please furnish.", reason: "AV integration scope is impossible to price from floor plans alone." },
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
        <div class="info-card-title">🤖 Gemini AI Analysis</div>
        <div class="info-card-body ai-analysis-content" style="white-space:pre-wrap; line-height:1.75;">${formatAIResponse(state.aiAnalysis)}</div>
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
  let prompt = `You are a senior construction estimator and document analyst for the project: "${state.projectName}".

Project Type: ${state.projectType}
Disciplines to focus on: ${state.disciplines.join(", ")}
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
1. Analyze the uploaded construction documents (symbol legends, floor plans, specifications, addenda).
2. Identify and count all symbols relevant to the selected disciplines: ${state.disciplines.join(", ")}.
3. Cross-reference floor plan symbols against the legend to verify correct identification.
4. Check for discrepancies between plans, specs, and any addenda.
5. Provide a detailed analysis summary including:
   - Symbol counts by type and sheet
   - Any discrepancies found between drawings and specifications
   - Missing information that would require RFIs
   - Scope gaps or ambiguities
   - Confidence level for each count
6. List specific, actionable RFI questions based on gaps found in these actual documents.
7. If known quantities were provided, compare your counts and flag deviations over 10%.

Format your response with clear sections using markdown headers. Be specific and reference sheet numbers where applicable.`;

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
      maxOutputTokens: 8192,
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


// ═══════════════════════════════════════════════════════════════
// AI RESPONSE FORMATTER
// ═══════════════════════════════════════════════════════════════

function formatAIResponse(text) {
  if (!text) return "";
  // Basic markdown-to-HTML conversion for display
  let html = esc(text);
  // Headers
  html = html.replace(/^### (.+)$/gm, '<strong style="color:var(--accent-sky);font-size:14px;display:block;margin-top:14px;">$1</strong>');
  html = html.replace(/^## (.+)$/gm, '<strong style="color:var(--accent-indigo);font-size:15px;display:block;margin-top:18px;margin-bottom:4px;">$1</strong>');
  html = html.replace(/^# (.+)$/gm, '<strong style="color:var(--text-primary);font-size:16px;display:block;margin-top:20px;margin-bottom:6px;">$1</strong>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>');
  // Bullet points
  html = html.replace(/^[\-\*] (.+)$/gm, '<div style="padding-left:16px;">• $1</div>');
  // Numbered lists
  html = html.replace(/^(\d+)\. (.+)$/gm, '<div style="padding-left:16px;"><strong>$1.</strong> $2</div>');
  return html;
}


// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  render();
});
