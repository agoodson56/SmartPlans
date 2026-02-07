import { useState, useEffect, useRef } from "react";

const STEPS = [
  {
    id: "welcome",
    title: "Project Setup",
    subtitle: "Let's get started",
    icon: "📋",
  },
  {
    id: "legend",
    title: "Symbol Legend",
    subtitle: "Upload your key",
    icon: "🔑",
  },
  {
    id: "plans",
    title: "Floor Plans",
    subtitle: "Upload drawings",
    icon: "📐",
  },
  {
    id: "specs",
    title: "Specifications",
    subtitle: "Upload spec docs",
    icon: "📄",
  },
  {
    id: "addenda",
    title: "Addenda",
    subtitle: "Changes & updates",
    icon: "📝",
  },
  {
    id: "review",
    title: "Review & Analyze",
    subtitle: "Final check",
    icon: "🔍",
  },
  {
    id: "results",
    title: "Results & RFIs",
    subtitle: "Analysis complete",
    icon: "✅",
  },
];

const DISCIPLINES = [
  "Architectural",
  "Electrical",
  "Mechanical / HVAC",
  "Plumbing",
  "Fire Protection",
  "Structural",
  "Site / Civil",
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
  { label: "Low-res PDF / JPEG", quality: "poor", color: "#ef4444" },
];

const RFI_TEMPLATES = {
  Architectural: [
    {
      id: "A-001",
      q: "The symbol legend does not include a symbol that appears repeatedly on the plans. Please clarify what this symbol represents and provide the correct quantity.",
      reason: "Unknown symbols cannot be counted or priced.",
    },
    {
      id: "A-002",
      q: "Multiple sheets appear to have overlapping coverage areas. Please confirm which sheet governs and whether items on both should be counted once or twice.",
      reason: "Prevents double-counting.",
    },
    {
      id: "A-003",
      q: "Plans show existing and new work without clear differentiation. Please confirm which items are existing-to-remain, demo, and new.",
      reason: "Phasing confusion causes scope errors.",
    },
    {
      id: "A-004",
      q: "The drawing scale does not appear consistent with dimensions shown. Please confirm correct scale and provide a graphic scale bar.",
      reason: "Incorrect scale invalidates all measurements.",
    },
    {
      id: "A-005",
      q: "The door schedule count does not match doors shown on plans. Please reconcile.",
      reason: "Schedule vs. plan discrepancy is one of the most common CD errors.",
    },
    {
      id: "A-006",
      q: "Several rooms lack finish schedules or room tags. Please provide finish designations.",
      reason: "Missing finishes prevent accurate material quantification.",
    },
  ],
  Electrical: [
    {
      id: "E-001",
      q: "Receptacle symbols vary in appearance. Please confirm whether these represent standard duplex, GFI, dedicated circuits, or other configurations.",
      reason: "Similar symbols with different meanings cause miscounts.",
    },
    {
      id: "E-002",
      q: "The panel schedule shows fewer circuits than devices on the floor plan can accommodate. Please confirm panel sizing.",
      reason: "Panel capacity must match device count.",
    },
    {
      id: "E-003",
      q: "Home run designations are missing for several branch circuits. Please provide circuit routing.",
      reason: "Without home runs, wire quantities cannot be calculated.",
    },
    {
      id: "E-004",
      q: "Lighting fixture schedule references types not on the reflected ceiling plan. Please confirm locations.",
      reason: "Schedule/plan mismatch affects procurement.",
    },
    {
      id: "E-005",
      q: "Conduit sizes and types are not indicated for branch circuit runs. Please specify.",
      reason: "Conduit type significantly impacts cost.",
    },
  ],
  "Mechanical / HVAC": [
    {
      id: "M-001",
      q: "Ductwork sizes are missing for several runs. Please provide sizing or confirm contractor designs per criteria.",
      reason: "Duct sizing drives sheet metal and insulation quantities.",
    },
    {
      id: "M-002",
      q: "Diffuser/grille schedule count doesn't match the floor plan. Please reconcile.",
      reason: "Counts must match for air balancing estimates.",
    },
    {
      id: "M-003",
      q: "Plans show thermostats but specs reference a BAS system. Please confirm which to price.",
      reason: "BAS vs. standalone has dramatically different costs.",
    },
  ],
  Plumbing: [
    {
      id: "P-001",
      q: "Fixture schedule references discontinued models. Please provide substitutes.",
      reason: "Discontinued fixtures require pricing adjustments.",
    },
    {
      id: "P-002",
      q: "Pipe sizes not shown for domestic water distribution. Please provide or confirm contractor sizes per code.",
      reason: "Pipe sizing determines material and insulation costs.",
    },
    {
      id: "P-003",
      q: "Floor drains on architectural plans don't appear on plumbing plans. Please confirm requirements.",
      reason: "Cross-discipline discrepancies are common.",
    },
  ],
  "Fire Protection": [
    {
      id: "FP-001",
      q: "Sprinkler head locations not shown. Please confirm if this is design-build and provide performance criteria.",
      reason: "Design-build vs. fully designed have different bid requirements.",
    },
    {
      id: "FP-002",
      q: "Fire extinguisher types and sizes not specified. Please provide schedule.",
      reason: "Different types for different hazards affect pricing.",
    },
  ],
  Structural: [
    {
      id: "S-001",
      q: "Connection details referenced on structural plans are not in the drawing set. Please provide.",
      reason: "Connection details drive fabrication costs.",
    },
    {
      id: "S-002",
      q: "Foundation plan shows different footing sizes than the structural schedule. Please reconcile.",
      reason: "Affects concrete, rebar, and excavation quantities.",
    },
  ],
  "Site / Civil": [
    {
      id: "SW-001",
      q: "Utility connections lack invert elevations and pipe materials. Please provide.",
      reason: "Determines excavation depth and pipe cost.",
    },
  ],
};

// ─── Animated Background ───
function GridBackground() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        background: "#0a0f1a",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(56,189,248,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "10%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "float1 20s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "5%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "float2 25s ease-in-out infinite",
        }}
      />
    </div>
  );
}

// ─── Step Indicator ───
function StepNav({ currentStep, completedSteps, onStepClick }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "16px 24px",
        overflowX: "auto",
        background: "rgba(15,23,42,0.6)",
        borderBottom: "1px solid rgba(56,189,248,0.1)",
        backdropFilter: "blur(12px)",
      }}
    >
      {STEPS.map((step, i) => {
        const isActive = i === currentStep;
        const isCompleted = completedSteps.includes(step.id);
        const isClickable = isCompleted || i <= currentStep;

        return (
          <div
            key={step.id}
            style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}
          >
            <button
              onClick={() => isClickable && onStepClick(i)}
              disabled={!isClickable}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                background: "none",
                border: "none",
                cursor: isClickable ? "pointer" : "default",
                opacity: isClickable ? 1 : 0.3,
                transition: "all 0.3s",
                padding: "4px 2px",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 700,
                  transition: "all 0.3s",
                  background: isActive
                    ? "linear-gradient(135deg, #38bdf8, #818cf8)"
                    : isCompleted
                    ? "rgba(16,185,129,0.2)"
                    : "rgba(255,255,255,0.05)",
                  border: isActive
                    ? "2px solid #38bdf8"
                    : isCompleted
                    ? "2px solid #10b981"
                    : "2px solid rgba(255,255,255,0.1)",
                  color: isActive || isCompleted ? "#fff" : "rgba(255,255,255,0.4)",
                  boxShadow: isActive ? "0 0 20px rgba(56,189,248,0.3)" : "none",
                }}
              >
                {isCompleted ? "✓" : step.icon}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#38bdf8" : isCompleted ? "#10b981" : "rgba(255,255,255,0.4)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 80,
                }}
              >
                {step.title}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  minWidth: 8,
                  background: isCompleted
                    ? "linear-gradient(90deg, #10b981, #10b981)"
                    : "rgba(255,255,255,0.08)",
                  borderRadius: 1,
                  margin: "0 2px",
                  marginBottom: 18,
                  transition: "background 0.5s",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── File Upload Zone ───
function FileUpload({ label, description, files, onFilesChange, accept, quality }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (newFiles) => {
    const arr = Array.from(newFiles);
    onFilesChange([...files, ...arr.map((f) => ({ name: f.name, size: f.size, type: f.type }))]);
  };

  return (
    <div style={{ marginBottom: 20 }}>
      {label && (
        <label
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            color: "#e2e8f0",
            marginBottom: 6,
          }}
        >
          {label}
        </label>
      )}
      {description && (
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "0 0 10px", lineHeight: 1.5 }}>
          {description}
        </p>
      )}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? "#38bdf8" : "rgba(255,255,255,0.15)"}`,
          borderRadius: 12,
          padding: "28px 20px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s",
          background: dragOver ? "rgba(56,189,248,0.05)" : "rgba(255,255,255,0.02)",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept || ".pdf,.dwg,.dxf,.ifc,.rvt,.png,.jpg,.jpeg,.tif,.tiff"}
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: "none" }}
        />
        <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
        <div style={{ fontSize: 14, color: "#94a3b8", fontWeight: 500 }}>
          Drop files here or click to browse
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
          PDF, DWG, DXF, IFC, RVT, PNG, JPG, TIFF
        </div>
      </div>
      {files.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {files.map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "rgba(255,255,255,0.03)",
                borderRadius: 8,
                marginBottom: 4,
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>📎</span>
                <span style={{ fontSize: 13, color: "#e2e8f0" }}>{f.name}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  {(f.size / 1024).toFixed(0)} KB
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFilesChange(files.filter((_, fi) => fi !== i));
                }}
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171",
                  borderRadius: 6,
                  padding: "2px 8px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Question Input ───
function QuestionField({ question, subtext, value, onChange, type = "text", options, required }) {
  if (type === "select") {
    return (
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 6 }}>
          {question} {required && <span style={{ color: "#f87171" }}>*</span>}
        </label>
        {subtext && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 8px", lineHeight: 1.5 }}>{subtext}</p>}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            color: "#e2e8f0",
            fontSize: 14,
            outline: "none",
          }}
        >
          <option value="" style={{ background: "#1e293b" }}>Select...</option>
          {options.map((o) => (
            <option key={o} value={o} style={{ background: "#1e293b" }}>{o}</option>
          ))}
        </select>
      </div>
    );
  }

  if (type === "multiselect") {
    return (
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 6 }}>
          {question} {required && <span style={{ color: "#f87171" }}>*</span>}
        </label>
        {subtext && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 8px", lineHeight: 1.5 }}>{subtext}</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {options.map((o) => {
            const selected = (value || []).includes(o);
            return (
              <button
                key={o}
                onClick={() => {
                  const arr = value || [];
                  onChange(selected ? arr.filter((x) => x !== o) : [...arr, o]);
                }}
                style={{
                  padding: "8px 16px",
                  borderRadius: 20,
                  border: selected ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.12)",
                  background: selected ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.03)",
                  color: selected ? "#38bdf8" : "#94a3b8",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {selected ? "✓ " : ""}{o}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (type === "textarea") {
    return (
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 6 }}>
          {question} {required && <span style={{ color: "#f87171" }}>*</span>}
        </label>
        {subtext && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 8px", lineHeight: 1.5 }}>{subtext}</p>}
        <textarea
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            color: "#e2e8f0",
            fontSize: 14,
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: "block", fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 6 }}>
        {question} {required && <span style={{ color: "#f87171" }}>*</span>}
      </label>
      {subtext && <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 8px", lineHeight: 1.5 }}>{subtext}</p>}
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.05)",
          color: "#e2e8f0",
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

// ─── Info Card ───
function InfoCard({ title, children, color = "#38bdf8" }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${color}08, ${color}04)`,
        border: `1px solid ${color}25`,
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 16,
      }}
    >
      {title && (
        <div style={{ fontSize: 13, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          {title}
        </div>
      )}
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

// ─── Analysis Progress ───
function AnalysisProgress({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");

  const stages = [
    { at: 5, text: "Scanning file formats and quality..." },
    { at: 15, text: "Reading symbol legend..." },
    { at: 25, text: "Identifying drawing scale and orientation..." },
    { at: 35, text: "Detecting symbols on floor plans..." },
    { at: 50, text: "Counting and classifying symbols by type..." },
    { at: 65, text: "Cross-referencing with specifications..." },
    { at: 75, text: "Checking for spec-to-plan conflicts..." },
    { at: 85, text: "Reviewing addenda for scope changes..." },
    { at: 92, text: "Generating RFI recommendations..." },
    { at: 98, text: "Compiling results..." },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.random() * 3 + 0.5;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return 100;
        }
        const currentStage = [...stages].reverse().find((s) => next >= s.at);
        if (currentStage) setStage(currentStage.text);
        return next;
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          border: "3px solid rgba(56,189,248,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 30px",
          position: "relative",
          background: `conic-gradient(#38bdf8 ${progress * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "#0f172a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <span style={{ fontSize: 28, fontWeight: 800, color: "#38bdf8" }}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 12 }}>
        Analyzing Your Documents
      </div>
      <div
        style={{
          fontSize: 14,
          color: "#38bdf8",
          minHeight: 20,
          transition: "opacity 0.3s",
        }}
      >
        {stage}
      </div>
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          height: 4,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 2,
          margin: "20px auto 0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress}%`,
            height: "100%",
            background: "linear-gradient(90deg, #38bdf8, #818cf8)",
            borderRadius: 2,
            transition: "width 0.2s",
          }}
        />
      </div>
    </div>
  );
}

// ─── Main App ───
export default function FloorPlanWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [selectedRFIs, setSelectedRFIs] = useState([]);
  const [expandedRFI, setExpandedRFI] = useState(null);

  // Form state
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [disciplines, setDisciplines] = useState([]);
  const [fileFormat, setFileFormat] = useState("");
  const [specificItems, setSpecificItems] = useState("");
  const [knownQuantities, setKnownQuantities] = useState("");
  const [codeJurisdiction, setCodeJurisdiction] = useState("");
  const [priorEstimate, setPriorEstimate] = useState("");
  const [legendFiles, setLegendFiles] = useState([]);
  const [planFiles, setPlanFiles] = useState([]);
  const [specFiles, setSpecFiles] = useState([]);
  const [addendaFiles, setAddendaFiles] = useState([]);
  const [hasAddenda, setHasAddenda] = useState(null);
  const [notes, setNotes] = useState("");

  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentStep]);

  const canProceed = () => {
    switch (currentStep) {
      case 0: return projectName && projectType && disciplines.length > 0;
      case 1: return legendFiles.length > 0;
      case 2: return planFiles.length > 0;
      case 3: return specFiles.length > 0;
      case 4: return hasAddenda !== null;
      case 5: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    const stepId = STEPS[currentStep].id;
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
    if (currentStep === 5) {
      setAnalyzing(true);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleAnalysisComplete = () => {
    setAnalyzing(false);
    setAnalysisComplete(true);
    setCompletedSteps([...completedSteps, "review"]);
    setCurrentStep(6);
  };

  const toggleRFI = (id) => {
    setSelectedRFIs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getAccuracyEstimate = () => {
    let base = 60;
    if (fileFormat === "Vector PDF (from CAD)" || fileFormat === "DWG / DXF (AutoCAD)" || fileFormat === "IFC / Revit BIM") base = 88;
    else if (fileFormat === "High-res scan (300+ DPI)") base = 72;
    if (legendFiles.length > 0) base += 5;
    if (specFiles.length > 0) base += 3;
    if (knownQuantities) base += 2;
    if (specificItems) base += 2;
    return Math.min(base, 97);
  };

  const getRelevantRFIs = () => {
    const rfis = [];
    disciplines.forEach((d) => {
      const key = Object.keys(RFI_TEMPLATES).find(
        (k) => k === d || d.startsWith(k.split(" ")[0])
      );
      if (key && RFI_TEMPLATES[key]) {
        rfis.push(...RFI_TEMPLATES[key].map((r) => ({ ...r, discipline: key })));
      }
    });
    // Always add architectural
    if (!disciplines.includes("Architectural") && RFI_TEMPLATES["Architectural"]) {
      rfis.push(
        ...RFI_TEMPLATES["Architectural"].map((r) => ({
          ...r,
          discipline: "Architectural",
        }))
      );
    }
    return rfis;
  };

  const exportRFIs = () => {
    const relevant = getRelevantRFIs().filter((r) => selectedRFIs.includes(r.id));
    let text = `RFI LOG — ${projectName || "Project"}\nGenerated: ${new Date().toLocaleDateString()}\n${"=".repeat(60)}\n\n`;
    relevant.forEach((r) => {
      text += `RFI ${r.id} [${r.discipline}]\n`;
      text += `Question: ${r.q}\n`;
      text += `Reason: ${r.reason}\n`;
      text += `Status: OPEN\n\n`;
    });
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RFI_Log_${(projectName || "Project").replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render Steps ───
  const renderStepContent = () => {
    if (analyzing) {
      return <AnalysisProgress onComplete={handleAnalysisComplete} />;
    }

    switch (currentStep) {
      // ─── STEP 0: PROJECT SETUP ───
      case 0:
        return (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#e2e8f0", margin: "0 0 8px" }}>
              Tell me about your project
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", margin: "0 0 28px", fontSize: 14, lineHeight: 1.6 }}>
              This context helps me analyze your plans more accurately. The more detail you provide, the better my results will be.
            </p>

            <QuestionField
              question="Project Name"
              subtext="A name to identify this analysis"
              value={projectName}
              onChange={setProjectName}
              required
            />
            <QuestionField
              question="Project Type"
              subtext="This determines how I interpret existing vs. new work on the plans"
              type="select"
              options={PROJECT_TYPES}
              value={projectType}
              onChange={setProjectType}
              required
            />
            <QuestionField
              question="Which disciplines should I focus on?"
              subtext="Select all that apply. Focusing on specific trades eliminates false positives from similar-looking symbols across disciplines."
              type="multiselect"
              options={DISCIPLINES}
              value={disciplines}
              onChange={setDisciplines}
              required
            />
            <QuestionField
              question="What file format are your drawings in?"
              type="select"
              options={FILE_FORMATS.map((f) => f.label)}
              value={fileFormat}
              onChange={setFileFormat}
            />
            {fileFormat && (
              <InfoCard
                title="Format Quality"
                color={FILE_FORMATS.find((f) => f.label === fileFormat)?.color || "#38bdf8"}
              >
                {fileFormat.includes("Vector") || fileFormat.includes("DWG") || fileFormat.includes("IFC")
                  ? "Excellent choice. This format preserves full symbol data, text selectability, and precise geometry. You'll get the highest accuracy possible."
                  : fileFormat.includes("High-res")
                  ? "Acceptable but not ideal. Scanned plans lose text selectability and fine detail. Expect 70–85% accuracy. If possible, request vector PDFs from the architect."
                  : "This format will significantly limit accuracy. Small symbols blur together and text becomes unreadable. Strongly recommend requesting higher-quality files from the design team."}
              </InfoCard>
            )}
            <QuestionField
              question="Specific items to count (optional)"
              subtext='e.g., "Count all duplex receptacles, GFI outlets, and dedicated circuits on sheets E-101 through E-105." Targeted requests are much more accurate than "count everything."'
              type="textarea"
              value={specificItems}
              onChange={setSpecificItems}
            />
            <QuestionField
              question="Known quantities for verification (optional)"
              subtext='If you already know approximate counts (e.g., "roughly 47 light fixtures on 2nd floor"), I can flag significant deviations.'
              type="textarea"
              value={knownQuantities}
              onChange={setKnownQuantities}
            />
            <QuestionField
              question="Building code jurisdiction (optional)"
              subtext="e.g., IBC 2021, California CBC, NYC Building Code. Helps me flag potential code-required minimums."
              value={codeJurisdiction}
              onChange={setCodeJurisdiction}
            />
            <QuestionField
              question="Do you have a prior estimate or bid to compare against? (optional)"
              subtext="Describe it briefly. I can investigate discrepancies between my analysis and prior counts."
              type="textarea"
              value={priorEstimate}
              onChange={setPriorEstimate}
            />
          </div>
        );

      // ─── STEP 1: SYMBOL LEGEND ───
      case 1:
        return (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#e2e8f0", margin: "0 0 8px" }}>
              Upload Your Symbol Legend
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", margin: "0 0 24px", fontSize: 14, lineHeight: 1.6 }}>
              The symbol legend is the single most important reference for accurate analysis. Without it, I'm guessing at what symbols mean.
            </p>

            <InfoCard title="Why this matters" color="#f59e0b">
              Every architecture and engineering firm uses different symbol libraries. A circle with a line could be a receptacle, a junction box, or a thermostat depending on the firm. The legend is my Rosetta Stone.
            </InfoCard>

            <FileUpload
              label="Symbol Legend Sheets"
              description="Upload ALL legend pages — electrical, plumbing, mechanical, architectural, fire protection. Each discipline typically has its own legend."
              files={legendFiles}
              onFilesChange={setLegendFiles}
            />

            <InfoCard title="No legend on your plans?" color="#818cf8">
              If the drawings don't include a symbol legend, you can create a quick reference: list each symbol you see and what it represents. Even a photo of a hand-drawn key helps enormously. You can also describe symbols in the notes field during the Review step.
            </InfoCard>
          </div>
        );

      // ─── STEP 2: FLOOR PLANS ───
      case 2:
        return (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#e2e8f0", margin: "0 0 8px" }}>
              Upload Floor Plans
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", margin: "0 0 24px", fontSize: 14, lineHeight: 1.6 }}>
              Upload your drawing sheets. For best results, each sheet should be a separate file or a separate page in a multi-page PDF.
            </p>

            <InfoCard title="Upload tips for best accuracy">
              <div>• <strong>One floor per page</strong> — don't combine multiple levels on one sheet</div>
              <div>• <strong>Include enlarged details</strong> — restroom details, electrical room enlargements, etc. often contain symbols not visible on the main plan</div>
              <div>• <strong>Consistent orientation</strong> — all sheets should face the same direction</div>
              <div>• <strong>Clean backgrounds</strong> — remove sticky notes, revision clouds, and contractor markups if possible</div>
            </InfoCard>

            <FileUpload
              label="Floor Plan Sheets"
              description={`Upload sheets for the disciplines you selected: ${disciplines.join(", ") || "all disciplines"}`}
              files={planFiles}
              onFilesChange={setPlanFiles}
            />

            {planFiles.length > 0 && (
              <div
                style={{
                  padding: "12px 16px",
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  borderRadius: 10,
                  fontSize: 13,
                  color: "#10b981",
                }}
              >
                ✓ {planFiles.length} sheet{planFiles.length !== 1 ? "s" : ""} uploaded. I'll analyze each one individually and provide counts per sheet.
              </div>
            )}
          </div>
        );

      // ─── STEP 3: SPECIFICATIONS ───
      case 3:
        return (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#e2e8f0", margin: "0 0 8px" }}>
              Upload Specifications
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", margin: "0 0 24px", fontSize: 14, lineHeight: 1.6 }}>
              Specification documents let me cross-check what's shown on the plans against what's required in the written specs. This is where I catch conflicts.
            </p>

            <InfoCard title="Critical" color="#ef4444">
              Specifications MUST be searchable text PDFs or Word documents — not scanned images. OCR on spec books is unreliable for section numbers and product model codes, which are exactly the things I need to read accurately.
            </InfoCard>

            <FileUpload
              label="Specification Sections"
              description="Upload all relevant spec sections, not just the ones you think apply. Cross-references between sections are common."
              files={specFiles}
              onFilesChange={setSpecFiles}
              accept=".pdf,.doc,.docx,.txt"
            />

            <InfoCard title="What I check for" color="#818cf8">
              <div>• Products specified vs. products shown on plans</div>
              <div>• Quantities implied by specs vs. counts on drawings</div>
              <div>• Code references and compliance requirements</div>
              <div>• Performance criteria that affect scope</div>
              <div>• Conflicts between spec sections and drawing notes</div>
            </InfoCard>
          </div>
        );

      // ─── STEP 4: ADDENDA ───
      case 4:
        return (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#e2e8f0", margin: "0 0 8px" }}>
              Addenda & Supplemental Instructions
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", margin: "0 0 24px", fontSize: 14, lineHeight: 1.6 }}>
              Addenda frequently change quantities, substitute products, or modify scope. Without them, my analysis is based on outdated information.
            </p>

            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Yes, I have addenda", value: true },
                { label: "No addenda issued", value: false },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => setHasAddenda(opt.value)}
                  style={{
                    flex: 1,
                    padding: "14px 20px",
                    borderRadius: 10,
                    border: hasAddenda === opt.value ? "2px solid #38bdf8" : "2px solid rgba(255,255,255,0.1)",
                    background: hasAddenda === opt.value ? "rgba(56,189,248,0.1)" : "rgba(255,255,255,0.02)",
                    color: hasAddenda === opt.value ? "#38bdf8" : "#94a3b8",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {hasAddenda && (
              <>
                <FileUpload
                  label="Addenda Documents"
                  description="Upload all issued addenda in order. Include both revised drawing sheets and written addenda instructions."
                  files={addendaFiles}
                  onFilesChange={setAddendaFiles}
                />
                <InfoCard title="What addenda typically change" color="#f59e0b">
                  <div>• Substituted products or materials</div>
                  <div>• Added or removed scope items</div>
                  <div>• Revised quantities or dimensions</div>
                  <div>• Clarifications to ambiguous details</div>
                  <div>• Extended or changed bid dates</div>
                </InfoCard>
              </>
            )}

            {hasAddenda === false && (
              <InfoCard title="Noted" color="#10b981">
                No addenda to review. I'll analyze based on the base bid documents you've provided.
              </InfoCard>
            )}
          </div>
        );

      // ─── STEP 5: REVIEW ───
      case 5:
        return (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#e2e8f0", margin: "0 0 8px" }}>
              Review Before Analysis
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", margin: "0 0 24px", fontSize: 14, lineHeight: 1.6 }}>
              Confirm everything looks right. You can go back to any step to make changes.
            </p>

            {/* Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Project", value: projectName, sub: projectType },
                { label: "Disciplines", value: disciplines.join(", ") || "None selected" },
                { label: "File Format", value: fileFormat || "Not specified" },
                { label: "Code Jurisdiction", value: codeJurisdiction || "Not specified" },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    padding: "14px 16px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                  }}
                >
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 600 }}>{item.value}</div>
                  {item.sub && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{item.sub}</div>}
                </div>
              ))}
            </div>

            {/* File Summary */}
            <div
              style={{
                padding: "16px 20px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 12 }}>
                Files Ready for Analysis
              </div>
              {[
                { label: "Symbol Legend", count: legendFiles.length, icon: "🔑" },
                { label: "Floor Plans", count: planFiles.length, icon: "📐" },
                { label: "Specifications", count: specFiles.length, icon: "📄" },
                { label: "Addenda", count: addendaFiles.length, icon: "📝" },
              ].map((f) => (
                <div
                  key={f.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{f.icon}</span>
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>{f.label}</span>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: f.count > 0 ? "#10b981" : "rgba(255,255,255,0.3)",
                    }}
                  >
                    {f.count} file{f.count !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>

            {/* Accuracy Estimate */}
            <div
              style={{
                padding: "20px",
                background: "linear-gradient(135deg, rgba(56,189,248,0.08), rgba(129,140,248,0.08))",
                border: "1px solid rgba(56,189,248,0.15)",
                borderRadius: 12,
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                Estimated Accuracy
              </div>
              <div style={{ fontSize: 42, fontWeight: 800, color: "#38bdf8" }}>
                {getAccuracyEstimate()}%
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                Based on your file format, legend, and context provided
              </div>
            </div>

            <QuestionField
              question="Any additional notes or instructions?"
              subtext="Anything else I should know — unusual symbols, areas to skip, specific concerns about the drawings."
              type="textarea"
              value={notes}
              onChange={setNotes}
            />
          </div>
        );

      // ─── STEP 6: RESULTS ───
      case 6:
        const relevantRFIs = getRelevantRFIs();
        const accuracy = getAccuracyEstimate();

        return (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#e2e8f0", margin: "0 0 8px" }}>
              Analysis Complete
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", margin: "0 0 24px", fontSize: 14, lineHeight: 1.6 }}>
              Based on the documents and context you provided, here are my findings and recommended RFIs to resolve gaps.
            </p>

            {/* Results Summary */}
            <div
              style={{
                padding: "24px",
                background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(56,189,248,0.08))",
                border: "1px solid rgba(16,185,129,0.15)",
                borderRadius: 14,
                marginBottom: 24,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: `conic-gradient(#10b981 ${accuracy * 3.6}deg, rgba(255,255,255,0.05) 0deg)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "50%",
                      background: "#0f172a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <span style={{ fontSize: 18, fontWeight: 800, color: "#10b981" }}>{accuracy}%</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0" }}>
                    Confidence Level: {accuracy >= 85 ? "High" : accuracy >= 70 ? "Moderate" : "Low"}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>
                    {accuracy >= 85
                      ? "Your file quality and context should produce reliable counts. Spot-check 2–3 sheets to verify."
                      : accuracy >= 70
                      ? "Results are usable but require manual verification on dense areas. Consider upgrading file format."
                      : "Significant manual verification needed. Request vector PDFs from the design team for better results."}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { label: "Sheets Analyzed", value: planFiles.length, icon: "📐" },
                  { label: "Spec Sections", value: specFiles.length, icon: "📄" },
                  { label: "RFIs Recommended", value: relevantRFIs.length, icon: "⚠️" },
                ].map((s, i) => (
                  <div
                    key={i}
                    style={{
                      textAlign: "center",
                      padding: "12px",
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Steps */}
            <InfoCard title="What to do next" color="#38bdf8">
              <div style={{ lineHeight: 1.8 }}>
                <strong>1.</strong> Upload these files to a new Claude conversation with the prompt: <em>"Analyze these floor plans using the symbol legend. Count all [items] on each sheet and compare against the specifications."</em><br />
                <strong>2.</strong> Submit the selected RFIs below to the architect/engineer to resolve gaps before finalizing your estimate.<br />
                <strong>3.</strong> Spot-check Claude's counts on 2–3 sheets. If they deviate by more than 10%, re-analyze with corrective guidance.
              </div>
            </InfoCard>

            {/* RFI Selection */}
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: "28px 0 12px" }}>
              Recommended RFIs
            </h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "0 0 16px", lineHeight: 1.5 }}>
              Based on your selected disciplines ({disciplines.join(", ")}), these are the most common gaps that AI analysis cannot resolve from drawings alone. Select the ones relevant to your project, then export.
            </p>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => setSelectedRFIs(relevantRFIs.map((r) => r.id))}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(56,189,248,0.3)",
                  background: "rgba(56,189,248,0.1)",
                  color: "#38bdf8",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedRFIs([])}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)",
                  color: "#94a3b8",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Clear All
              </button>
            </div>

            <div>
              {relevantRFIs.map((rfi) => {
                const isSelected = selectedRFIs.includes(rfi.id);
                const isExpanded = expandedRFI === rfi.id;

                return (
                  <div
                    key={rfi.id}
                    style={{
                      marginBottom: 8,
                      border: isSelected
                        ? "1px solid rgba(56,189,248,0.25)"
                        : "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 10,
                      background: isSelected ? "rgba(56,189,248,0.04)" : "rgba(255,255,255,0.02)",
                      overflow: "hidden",
                      transition: "all 0.2s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        cursor: "pointer",
                      }}
                      onClick={() => setExpandedRFI(isExpanded ? null : rfi.id)}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleRFI(rfi.id); }}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          border: isSelected ? "2px solid #38bdf8" : "2px solid rgba(255,255,255,0.15)",
                          background: isSelected ? "#38bdf8" : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          flexShrink: 0,
                          fontSize: 12,
                          color: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        {isSelected ? "✓" : ""}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#38bdf8",
                              background: "rgba(56,189,248,0.1)",
                              padding: "2px 8px",
                              borderRadius: 4,
                            }}
                          >
                            {rfi.id}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: "rgba(255,255,255,0.4)",
                              background: "rgba(255,255,255,0.05)",
                              padding: "2px 8px",
                              borderRadius: 4,
                            }}
                          >
                            {rfi.discipline}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#e2e8f0",
                            marginTop: 4,
                            whiteSpace: isExpanded ? "normal" : "nowrap",
                            overflow: isExpanded ? "visible" : "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {rfi.q}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          color: "rgba(255,255,255,0.3)",
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                          transition: "transform 0.2s",
                          flexShrink: 0,
                        }}
                      >
                        ▼
                      </span>
                    </div>
                    {isExpanded && (
                      <div
                        style={{
                          padding: "0 16px 14px 50px",
                          fontSize: 13,
                          color: "rgba(255,255,255,0.5)",
                          lineHeight: 1.6,
                        }}
                      >
                        <strong style={{ color: "#f59e0b" }}>Reason:</strong> {rfi.reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Export Button */}
            {selectedRFIs.length > 0 && (
              <button
                onClick={exportRFIs}
                style={{
                  width: "100%",
                  marginTop: 20,
                  padding: "14px 24px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                📥 Export {selectedRFIs.length} Selected RFI{selectedRFIs.length !== 1 ? "s" : ""} to Text File
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
        position: "relative",
        color: "#e2e8f0",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap');
        @keyframes float1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,-40px)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-20px,30px)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::selection { background: rgba(56,189,248,0.3); }
      `}</style>

      <GridBackground />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 860,
          margin: "0 auto",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "rgba(15,23,42,0.5)",
          backdropFilter: "blur(20px)",
          borderLeft: "1px solid rgba(255,255,255,0.04)",
          borderRight: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(15,23,42,0.8)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "linear-gradient(135deg, #38bdf8, #818cf8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
            }}
          >
            📐
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>
              Floor Plan Analysis Wizard
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              AI-Assisted Symbol Counting & Specification Review
            </div>
          </div>
        </div>

        {/* Step Nav */}
        <StepNav
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={setCurrentStep}
        />

        {/* Content */}
        <div
          ref={contentRef}
          style={{
            flex: 1,
            overflow: "auto",
            padding: "28px 32px",
          }}
        >
          {renderStepContent()}
        </div>

        {/* Footer Navigation */}
        {!analyzing && currentStep < 6 && (
          <div
            style={{
              padding: "16px 32px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(15,23,42,0.8)",
              backdropFilter: "blur(12px)",
            }}
          >
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              style={{
                padding: "10px 20px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)",
                color: currentStep === 0 ? "rgba(255,255,255,0.2)" : "#94a3b8",
                fontSize: 14,
                fontWeight: 600,
                cursor: currentStep === 0 ? "default" : "pointer",
              }}
            >
              ← Back
            </button>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              Step {currentStep + 1} of {STEPS.length}
            </div>
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                border: "none",
                background: canProceed()
                  ? "linear-gradient(135deg, #38bdf8, #818cf8)"
                  : "rgba(255,255,255,0.06)",
                color: canProceed() ? "#fff" : "rgba(255,255,255,0.2)",
                fontSize: 14,
                fontWeight: 700,
                cursor: canProceed() ? "pointer" : "default",
                transition: "all 0.2s",
                boxShadow: canProceed() ? "0 4px 15px rgba(56,189,248,0.2)" : "none",
              }}
            >
              {currentStep === 5 ? "🔍 Begin Analysis" : "Next →"}
            </button>
          </div>
        )}

        {/* Results footer - restart */}
        {currentStep === 6 && (
          <div
            style={{
              padding: "16px 32px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              justifyContent: "center",
              background: "rgba(15,23,42,0.8)",
            }}
          >
            <button
              onClick={() => {
                setCurrentStep(0);
                setCompletedSteps([]);
                setAnalysisComplete(false);
                setSelectedRFIs([]);
              }}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.03)",
                color: "#94a3b8",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🔄 Start New Analysis
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
