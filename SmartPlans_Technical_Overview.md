# SMARTPLANS — AI-Powered ELV Construction Estimation Platform
## Complete Technical & Architecture Documentation
### Version 3.0 | February 2026 — Powered by Gemini 3.1 Pro

---

## EXECUTIVE SUMMARY

SmartPlans is a proprietary, AI-powered construction estimation platform designed specifically for **Extra-Low Voltage (ELV)** contractors and estimators. It analyzes construction blueprints, specifications, addenda, and symbol legends using an **18-brain parallel AI architecture** powered by **Google Gemini 3.1 Pro** to produce comprehensive cost estimates with **99%+ accuracy**.

The system replaces weeks of manual blueprint reading and spreadsheet work with a guided 7-step workflow that produces a complete, priced estimate — including material costs, labor hours, code compliance review, MDF/IDF infrastructure, and a formal Schedule of Values (SOV) — in minutes.

**Key Differentiators:**
- **18 Specialized AI Brains** running in parallel across 7 processing waves (Triple-Read Consensus Architecture)
- **Gemini 3.1 Pro** — Google's most advanced reasoning model (2× improvement over Gemini 3.0 Pro)
- **Industry-Standard Pricing Database** with 350+ items across 6 ELV disciplines
- **Automatic Code Compliance Review** against NEC, NFPA, TIA, IBC, and ADA standards
- **Triple-Read Consensus Engine** with independent verification scanning and dispute resolution
- **Cross-Validation Engine + Devil's Advocate** adversarial audit of all brain outputs
- **Direct Export to SmartPM** (companion project management app) for seamless estimate-to-execution handoff

---

## TABLE OF CONTENTS

1. System Architecture Overview
2. The 7-Step User Workflow
3. The 18-Brain AI Engine (Deep Dive)
4. The 7-Wave Processing Pipeline
5. Reliability & Accuracy Systems
6. The Industry Pricing Database
7. Export Engine & SmartPM Integration
8. Persistence & Saved Estimates
9. Technology Stack
10. File Structure

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

SmartPlans is built as a **Cloudflare Pages** application with a frontend-driven architecture. The AI processing happens client-side via direct Gemini API calls, with each brain using its own dedicated API key to achieve true parallel execution.

```
┌────────────────────────────────────────────────────────────────┐
│                     SMARTPLANS PLATFORM                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐      │
│  │   index.html  │  │   styles.css  │  │    app.js     │      │
│  │   (Layout &   │  │   (Premium    │  │   (7-Step     │      │
│  │    SEO)       │  │    Dark UI)   │  │    Workflow)  │      │
│  └───────────────┘  └───────────────┘  └───────┬───────┘      │
│                                                 │              │
│  ┌───────────────┐  ┌───────────────┐  ┌───────┴───────┐      │
│  │  pricing-     │  │  export-      │  │  ai-engine.js │      │
│  │  database.js  │  │  engine.js    │  │  (18 Brains)  │      │
│  │  (350+ items) │  │  (JSON/XLSX/  │  │  (7 Waves)    │      │
│  │               │  │   Markdown)   │  │               │      │
│  └───────────────┘  └───────────────┘  └───────┬───────┘      │
│                                                 │              │
│                                    ┌────────────┴────────┐     │
│                                    │  18 Gemini API Keys │     │
│                                    │  (Parallel Calls)   │     │
│                                    └─────────────────────┘     │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Cloudflare D1 Database — Saved Estimates (CRUD)        │   │
│  │  functions/api/estimates/index.js  — list, create       │   │
│  │  functions/api/estimates/[id].js   — get, update, delete│   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. THE 7-STEP USER WORKFLOW

SmartPlans guides users through a structured wizard that collects all the information needed for an accurate estimate:

### Step 0 — Project Setup
**Purpose:** Establish project identity and pricing parameters.

**Inputs collected:**
- Project name, type (New Construction, Renovation, Tenant Improvement, Data Center, Healthcare, etc.)
- Project location and code jurisdiction
- ELV disciplines to analyze (up to 6): Structured Cabling, CCTV, Access Control, Fire Alarm, Intrusion Detection, Audio Visual
- File format of the drawings (Vector PDF, DWG/DXF, BIM, High-Res Scan, Standard Scan)
- Pricing tier (Budget / Mid / Premium) — selects appropriate material price points
- Regional cost multiplier (20 US regions from San Francisco 1.45× to Southeast 0.90×)
- Labor rates per classification (Journeyman, Lead, Foreman, Apprentice, PM, Programmer)
- Labor burden rate and whether to include burden (FICA, FUTA, SUTA, Workers Comp, GL, Health, Retirement)
- Markup percentages for Material, Labor, Equipment, and Subcontractor costs
- Prevailing wage applicability and work shift (Standard, Night, Weekend)

### Step 1 — Upload Symbol Legend
**Purpose:** The legend is the "Rosetta Stone" for accurate symbol identification. Every A&E firm uses different symbol libraries. Without the legend, the AI must guess at symbol meanings.

**Accepted formats:** PDF, PNG, JPG, TIFF, DWG  
**Impact on accuracy:** +5% when legend is provided

### Step 2 — Upload Floor Plans
**Purpose:** Upload the actual construction drawings sheet by sheet.

**Best practices enforced:**
- One floor per page (don't combine multiple levels)
- Include enlarged/detail sheets
- Only upload the disciplines being analyzed (e.g., E-sheets for electrical, T-sheets for telecom)

**Accepted formats:** PDF (preferred), PNG, JPG, TIFF  
**File size limit:** 50MB per file

### Step 3 — Upload Specifications
**Purpose:** Specification books let the AI cross-check what's shown on plans against written requirements. This is where conflicts between drawings and specs are caught.

**Critical requirement:** Specs must be searchable text PDFs or Word documents — not scanned images. OCR on spec books is unreliable for section numbers and model codes.

**Impact on accuracy:** +3% when specs are provided

### Step 4 — Addenda & Supplemental Instructions
**Purpose:** Addenda frequently change quantities, substitute products, or modify scope. Without them, the analysis is based on outdated information.

**Toggle interface:** "Yes, I have addenda" / "No addenda issued"

### Step 5 — Review Before Analysis
**Purpose:** Final confirmation of all inputs before launching the AI analysis.

**Displays:**
- Project summary (name, type, disciplines, format, jurisdiction)
- Files ready for analysis with counts per category
- **Traffic Light Accuracy Indicator** 🟢🟡🔴
  - 🟢 Green (85%+): High confidence — Vector PDF + legend + specs + context
  - 🟡 Yellow (70-84%): Moderate — Good files but some gaps
  - 🔴 Red (below 70%): Low — Scanned images with minimal context
- Final notes/instructions field

**Accuracy calculation formula:**
```
Base = 58% (default scanned file)
       86% (if Vector PDF, DWG, or BIM)
       70% (if High-Res Scan 300+ DPI)
+5%  if Symbol Legend uploaded
+3%  if Specifications uploaded  
+2%  if Known Quantities provided
+2%  if Specific Items described
+1%  if Code Jurisdiction specified
+1%  if Prior Estimate reference provided
Max = 99%
```

### Step 6 — Results & RFIs
**Purpose:** Display the complete AI analysis with confidence metrics, export options, and RFI recommendations.

**Features:**
- **Confidence Ring** — Donut chart showing accuracy % in green/yellow/red
- **Traffic Light Indicators** — 🟢🟡🔴 with active dot glowing
- **AI Analysis Report** — Full markdown-formatted estimate with tables, dollar amounts, and code references
- **Math Validation Banner** — Shows whether automated math checking passed or found issues
- **Scorecard Validation Banner** — Shows if all required data sections were generated
- **RFI Checklist** — Auto-generated RFIs based on selected disciplines with select/deselect checkboxes
- **Export Panel** — Four export options:
  - 🔗 **JSON** — Structured data for SmartPM import
  - 📊 **Excel** — Multi-sheet workbook (SheetJS)
  - 📄 **Markdown** — Formatted proposal document
  - 📦 **Export All** — Download all three formats simultaneously

---

## 3. THE 18-BRAIN AI ENGINE (Deep Dive)

The heart of SmartPlans is its **Multi-Brain AI Engine** (`ai-engine.js`). Instead of making a single AI call with a massive prompt, SmartPlans employs 18 specialized "brains" — each an expert in one domain of construction estimation. Powered by **Gemini 3.1 Pro** with thinking/reasoning mode enabled.

### Why 18 Brains Instead of 1?

A single AI call trying to count symbols, check codes, price materials, calculate labor, build an SOV, and write a report simultaneously would be:
1. **Unreliable** — too many tasks competing for attention in one context
2. **Rate-limited** — hitting one API key with a massive prompt
3. **Unverifiable** — no way to cross-check the AI's own work

By splitting into specialized brains, each one focuses on one task with surgical precision. The **Triple-Read Consensus Architecture** adds three independent verification brains plus a dispute resolution system on top.

### Brain Registry

| Brain # | Name | Wave | Emoji | Model | Files Needed | Max Tokens | Purpose |
|---------|------|------|-------|-------|-------------|------------|---------|
| 0 | Legend Decoder | 0 | 📖 | gemini-3.1-pro-preview | Legends | 16,384 | Decode symbol legend into structured dictionary |
| 1 | Symbol Scanner | 1 | 🔍 | gemini-3.1-pro-preview | Legends, Plans | 16,384 | Count every device symbol on every sheet |
| 2 | Code Compliance | 1 | 📋 | gemini-3.1-pro-preview | Plans, Specs | 12,288 | Find NEC/NFPA/TIA/IBC violations |
| 3 | MDF/IDF Analyzer | 1 | 🏗️ | gemini-3.1-pro-preview | Plans, Specs | 12,288 | Detail telecom room equipment |
| 4 | Cable & Pathway | 1 | 🔌 | gemini-2.5-flash | Plans, Specs | 12,288 | Estimate cable runs and pathways |
| 5 | Special Conditions | 1 | ⚠️ | gemini-2.5-flash | Plans, Specs | 12,288 | Identify equipment, permits, risks |
| 6 | Shadow Scanner | 1.5 | 👁️ | gemini-3.1-pro-preview | Legends, Plans | 16,384 | Independent room-by-room verification count |
| 7 | Discipline Deep-Dive | 1.5 | 🎯 | gemini-3.1-pro-preview | Legends, Plans | 12,288 | Specialist counter for primary discipline |
| 8 | Quadrant Scanner | 1.5 | 📐 | gemini-3.1-pro-preview | Plans | 12,288 | Zone-based quadrant verification count |
| 9 | Consensus Arbitrator | 1.75 | ⚖️ | gemini-3.1-pro-preview | — | 16,384 | Resolve disputes between 3 independent reads |
| 10 | Targeted Re-Scanner | 1.75 | 🔬 | gemini-3.1-pro-preview | Legends, Plans | 12,288 | Forensic re-count for disputed items |
| 11 | Material Pricer | 2 | 💰 | gemini-3.1-pro-preview | — | 16,384 | Price all materials from database |
| 12 | Labor Calculator | 2 | 👷 | gemini-3.1-pro-preview | — | 16,384 | Calculate labor hours per NECA |
| 13 | Financial Engine | 2 | 📊 | gemini-3.1-pro-preview | — | 16,384 | Build SOV and project summary |
| 14 | Reverse Verifier | 2.5 | 🔄 | gemini-3.1-pro-preview | Plans | 12,288 | Count backwards from BOQ to verify plans |
| 15 | Cross Validator | 3 | ✅ | gemini-3.1-pro-preview | — | 16,384 | Audit all brain outputs |
| 16 | Devil's Advocate | 3 | 😈 | gemini-3.1-pro-preview | Plans | 16,384 | Hostile auditor finding everything wrong |
| 17 | Report Synthesizer | 4 | 📝 | gemini-2.5-pro | — | 65,536 | Write final professional report |

### Detailed Brain Descriptions

#### Brain 0: Symbol Scanner 🔍
**Mission:** Scan every sheet and count every ELV device symbol exhaustively.

**Process:**
1. Studies the symbol legend first to learn what each symbol means
2. Goes sheet by sheet systematically
3. Counts carefully, zooming into dense areas
4. Notes any unidentifiable symbols
5. Provides confidence score (0-100) for each count

**Output per sheet:** Symbol type, subtype, count, confidence, and locations where found.

**Discipline-specific counting:**
- Structured Cabling: Data outlets, voice outlets, WAPs, fiber outlets, combo outlets
- CCTV: Fixed cameras, PTZ cameras, dome cameras, bullet cameras, multi-sensor cameras
- Access Control: Card readers, keypads, door contacts, REX devices, electric strikes, maglocks
- Fire Alarm: Smoke detectors, heat detectors, pull stations, horn/strobes, duct detectors, modules
- Intrusion Detection: Motion detectors, door contacts, glass break sensors, keypads, sirens
- Audio Visual: Speakers, displays, projectors, touch panels, microphones, signal plates

#### Brain 1: Code Compliance 📋
**Mission:** Review construction documents for code violations, warnings, and compliance issues.

**Codes checked:**
- NEC (NFPA 70): Articles 725, 760, 770, 800, 300
- NFPA 72: Fire alarm device spacing, NAC calculations, pathway survivability
- TIA-568: Structured cabling distances, bend radius, EMI separation
- TIA-569: Pathway and spaces standards
- TIA-607: Grounding and bonding
- IBC/IFC: Firestopping, plenum requirements
- ADA/ABA: Mounting heights, reach ranges, visual notification

**Severity classification:**
- 🔴 CRITICAL — Code violation requiring correction
- 🟡 WARNING — Potential non-compliance, needs verification
- 🔵 INFO — Best practice recommendation

#### Brain 2: MDF/IDF Analyzer 🏗️
**Mission:** Identify and detail every telecom room (MDF, IDF, TR, Server Room, Head-End).

**Per room analysis:**
- Room identification (name, type, floor, room number, building)
- Equipment: racks, patch panels, switches, UPS, PDU, fiber panels
- Cable management: horizontal/vertical managers, ladder rack
- Grounding: TMGB, TGB, TBB with conductor lengths
- Environmental: dedicated HVAC tonnage, fire suppression
- Power: dedicated circuits, UPS sizing, generator backup
- Backbone connections between rooms with fiber/copper counts and distances

#### Brain 3: Cable & Pathway 🔌
**Mission:** Analyze all cable pathways and estimate cable quantities.

**Analysis covers:**
- Horizontal cable runs (Cat5e/6/6A): count, average length, total footage, cable rating
- Backbone/riser cables: fiber (SM/MM) strand counts, runs, distances
- Pathway types: J-hooks, cable tray (multiple widths), conduit (EMT/Rigid/PVC), innerduct
- Conduit sizing and fill calculations
- Vertical risers and sleeve sizes
- Underground/exterior pathways
- Special requirements (plenum, riser, LSZH ratings)
- Firestopping penetration counts

#### Brain 4: Special Conditions ⚠️
**Mission:** Identify all special conditions, equipment needs, subcontractors, permits, and risk factors.

**Categories analyzed:**
- **Equipment Rentals:** Scissor lifts, boom lifts, scaffolding, trenchers — with estimated duration and daily rates
- **Subcontractors:** Core drilling, trenching, electrical, firestopping, structural — with scope and cost ranges
- **Permits:** Fire alarm, low voltage, excavation, right-of-way, hot work — with costs and lead times
- **Site Conditions:** Asbestos, occupied building, high security, weather exposure — with cost impact ($/$$/$$$/$$$$)
- **Risks:** Pre-1980 buildings, seismic zones, environmental concerns — with mitigation strategies and severity ratings
- **Special Tools:** Cable certifier, fusion splicer, thermal imager, OTDR

#### Brain 5: Material Pricer 💰
**Mission:** Calculate exact material costs by matching every counted symbol to a priced item.

**Process:**
1. Receives symbol counts from Brain 0 and MDF/IDF equipment from Brain 2
2. Matches each item to the **SmartPlans Pricing Database** (exact prices, not estimates)
3. Applies regional cost multiplier (e.g., 1.45× for San Francisco)
4. Calculates: Qty × Unit Cost × Regional Multiplier = Extended Cost
5. Groups by category with subtotals
6. Applies material markup percentage
7. Includes all mounting hardware, connectors, and accessories

#### Brain 6: Labor Calculator 👷
**Mission:** Calculate labor hours and costs using NECA labor unit standards.

**NECA labor unit guidelines used:**
- Cat6A drop (install + terminate + test): 0.45-0.55 hrs/drop
- Camera install (mount + wire + aim): 2.0-3.5 hrs/camera
- Card reader (mount + wire + program): 2.5-4.0 hrs/door
- Fire alarm device: 0.5-1.5 hrs/device
- Rack build-out: 8-16 hrs/rack
- Cable tray: 0.15-0.25 hrs/ft

**Phases calculated:**
1. **Rough-In (45-50%):** Pathway, conduit, cable pulling, backboxes
2. **Trim/Termination (25-30%):** Device mounting, terminations, rack dress
3. **Programming (10-15%):** System programming, configuration
4. **Testing/Commissioning (10-15%):** Certification, verification, punch list

**Outputs:** Hours per task by labor classification, loaded rates (base × burden), labor markup, and crew recommendation with duration.

#### Brain 7: Financial Engine 📊
**Mission:** Produce Schedule of Values and final pricing with all markups applied.

**Generates:**
- **SOV in AIA G703 format** with material, labor, equipment, and total per line item
- **Travel & Per Diem** estimate (if project >100 miles, uses GSA rates)
- **Prevailing Wage Determination** (if applicable)
- **Project Cost Summary:** Total materials + labor + equipment + subcontractors + travel + contingency = Grand Total
- **Payment Terms** and **Assumptions/Exclusions** lists

#### Brain 8: Cross Validator ✅
**Mission:** Senior QA auditor cross-checking the entire estimate. Uses **Gemini 3.1 Pro** with thinking mode enabled for maximum reasoning depth.

**8-Point Verification:**
1. **Math Check:** For every Qty × Unit Cost = Extended Cost, verify multiplication
2. **Quantity Consistency:** Symbol counts must match material quantities
3. **Cost Reasonableness:** Flag unreasonable unit costs (a camera at $15 or a cable drop at $5,000)
4. **Completeness:** Every counted symbol must have a corresponding material line item
5. **Labor Reasonableness:** Hours must align with NECA standards for the described scope
6. **Markup Accuracy:** Verify markups were applied correctly
7. **SOV Balancing:** Line items must sum to grand total
8. **Room Equipment:** MDF/IDF equipment lists must be complete for room type

**Output:** Pass/fail status, confidence score (0-100), list of issues with severity and corrections, quantity cross-check table, and math error log.

#### Brain 9: Report Synthesizer 📝
**Mission:** Compile all validated data into a professional, publication-ready markdown report. Uses **Gemini 2.5 Pro** and has the highest token budget (65,536).

**Report sections (in order):**
1. Code & Standards Compliance Review
2. MDF/IDF Material Breakdown (per room with tables)
3. Overall Material Summary (with unit prices and extended costs)
4. Labor Summary (hours by discipline, by phase, with loaded rates)
5. Prevailing Wage Determination (if applicable)
6. Special Equipment & Conditions (with ⚠️ flags and cost impact)
7. Travel & Per Diem Estimate (if applicable)
8. Schedule of Values — AIA G703 format table with dollar amounts
9. Priced Estimate Summary (material + labor + equipment + sub + markup = total)
10. Code Compliance Summary (🔴 Critical / 🟡 Warning / 🔵 Info)
11. Observations & Analysis
12. RFIs

---

## 4. THE 7-WAVE PROCESSING PIPELINE

The 18 brains execute in a carefully orchestrated 7-wave pipeline. Each wave depends on the output of the previous wave.

```
TIMELINE ─────────────────────────────────────────────────────────────
0%                    55%            75%      85%           100%
│────── WAVE 1 ───────│──── WAVE 2 ──│─ W3 ──│── WAVE 4 ───│

WAVE 1: Document Intelligence (15%-55%)
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Symbol   │ │ Code     │ │ MDF/IDF  │ │ Cable &  │ │ Special  │
│ Scanner  │ │ Comply   │ │ Analyzer │ │ Pathway  │ │ Cond.    │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
     ALL 5 BRAINS RUN IN PARALLEL (each with its own API key)
                         │
                         ▼ Results feed into Wave 2
WAVE 2: Cost Engine (55%-75%)
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Material │ │ Labor    │ │ Financial│
│ Pricer   │ │ Calc     │ │ Engine   │
└──────────┘ └──────────┘ └──────────┘
     ALL 3 BRAINS RUN IN PARALLEL
                         │
                         ▼ All Wave 1+2 results feed into Wave 3
WAVE 3: Cross-Validation (75%-85%)
┌──────────────────────────────┐
│     Cross Validator          │
│  (Audits ALL brain outputs)  │
└──────────────────────────────┘
                         │
                         ▼ Everything feeds into Wave 4
WAVE 4: Report Synthesis (85%-100%)
┌──────────────────────────────┐
│     Report Synthesizer       │
│  (Professional markdown doc) │
└──────────────────────────────┘
```

### Why This Order?

1. **Wave 1** reads the actual drawings — it needs the files
2. **Wave 2** prices what Wave 1 found — it needs counts and quantities, not files
3. **Wave 3** audits Waves 1+2 — it needs all data to cross-check
4. **Wave 4** writes the report from validated data — it needs the audit results

### Parallel Execution

Within each wave, all brains run simultaneously using `Promise.allSettled()`. This means Wave 1's five brains all fire at the same time, each using a different API key to avoid rate limiting.

**10 dedicated API keys** ensure zero contention:
- Key 0: Symbol Scanner
- Key 1: Code Compliance
- Key 2: MDF/IDF Analyzer
- Key 3: Cable & Pathway
- Key 4: Special Conditions
- Key 5: Material Pricer
- Key 6: Labor Calculator
- Key 7: Financial Engine
- Key 8: Cross Validator
- Key 9: Report Synthesizer

---

## 5. RELIABILITY & ACCURACY SYSTEMS

SmartPlans implements five layers of quality assurance:

### Layer 1: Triple-Model Strategy
- **Vision & Reasoning Brains (16 of 18):** Use `gemini-3.1-pro-preview` — Google's most advanced reasoning model with 2× improvement over Gemini 3.0 Pro, with thinking mode enabled for deliberate step-by-step analysis
- **Report Writer:** Use `gemini-2.5-pro` — balanced Pro model optimized for structured synthesis with 65K token output
- **Lightweight Brains (2):** Use `gemini-2.5-flash` for Cable & Pathway and Special Conditions — where speed is prioritized

The Cross Validator and Report Synthesizer — the two most critical brains — use the premium model because accuracy matters more than speed at this stage.

### Layer 2: Response Validation Schemas
Every brain (except the Report Writer) has a defined JSON schema of required fields:

| Brain | Required Fields |
|-------|----------------|
| Symbol Scanner | sheets, totals |
| Code Compliance | issues, summary |
| MDF/IDF Analyzer | rooms |
| Cable & Pathway | horizontal_cables, pathways |
| Special Conditions | equipment_rentals, permits |
| Material Pricer | categories, grand_total |
| Labor Calculator | phases, total_hours |
| Financial Engine | sov, project_summary |
| Cross Validator | status, issues, confidence_score |

If a brain's response is missing required fields, it triggers an automatic retry.

### Layer 3: Confidence-Based Retry
For the Symbol Scanner specifically, if the average confidence score across all identified symbols drops below **70%**, the system automatically retries with an enhanced prompt. This catches cases where the AI is guessing rather than identifying symbols with certainty.

### Layer 4: Auto-Retry with Enhanced Prompts
When schema validation fails, the system:
1. Marks the brain as "retrying" in the UI
2. Prepends an enhanced instruction to the prompt: *"Your previous response was incomplete. STRICTLY follow the JSON schema. Include ALL required fields."*
3. Sends the request to the next available API key
4. If the retry passes validation, uses the retry result
5. If the retry still fails, uses the best available result rather than dropping data

### Layer 5: Exponential Backoff & Key Rotation
On API errors (429 rate limit, 403 forbidden, 500+ server errors):
1. Rotates to the next API key
2. Waits using exponential backoff: `baseDelay × 2^attempt + random(0-500ms)`
3. Retries up to 4 times per brain
4. If a brain completely fails, the wave continues (brains are fault-tolerant)
5. Only if ALL brains in a wave fail does the wave throw an error

### Layer 6: Robust JSON Parsing
AI responses often contain malformed JSON. The parser uses a 4-strategy approach:
1. Direct `JSON.parse()`
2. Extract from markdown code block (```json ... ```)
3. Find first `{` to last `}` and parse
4. Return raw text with `_parseFailed: true` flag (so no data is lost)

---

## 6. THE INDUSTRY PRICING DATABASE

SmartPlans includes a comprehensive **350+ item pricing database** (`pricing-database.js`) covering all 6 ELV disciplines. Updated Q1 2026.

### Categories Covered

| Discipline | Sub-Categories | Item Count |
|-----------|----------------|------------|
| **Structured Cabling** | Cable (14 types), Connectivity (18), Racks (14), Pathway (24), Grounding (4), WAPs (3), Testing (2) | ~79 items |
| **CCTV** | Cameras (10 types), Recording (8), Accessories (14) | ~32 items |
| **Access Control** | Readers (6), Hardware (12), Panels (9), Credentials (4), Software (3), Intercom (2) | ~36 items |
| **Fire Alarm** | Initiating Devices (10), Notification (7), Panels (11), Wire (4) | ~32 items |
| **Intrusion Detection** | Sensors (7), Panels (9), Wire (2) | ~18 items |
| **Audio Visual** | Displays (13), Audio (13), Control (5), Conferencing (6), Signage (3), Infrastructure (6) | ~46 items |

### Three-Tier Pricing
Every item has three price points:
- **Budget:** Value brands (ICC, Vertical Cable, Dahua, ZKTeco)
- **Mid:** Standard spec, name brands (Panduit, CommScope, Axis, HID, Bosch)
- **Premium:** High-end / specified brand (Corning, Leviton Enterprise, Axis Q-series, Genetec)

### Regional Cost Multipliers (20 US Regions)

| Region | Multiplier | Region | Multiplier |
|--------|-----------|--------|-----------|
| National Average | 1.00× | New York City | 1.45× |
| San Francisco | 1.45× | Hawaii | 1.40× |
| Alaska | 1.35× | Los Angeles | 1.30× |
| Boston | 1.30× | West Coast | 1.25× |
| DC Metro | 1.25× | Northeast | 1.20× |
| Seattle | 1.20× | Chicago | 1.15× |
| Miami | 1.05× | Denver | 1.05× |
| Austin | 1.00× | Midwest | 0.95× |
| Dallas/Houston | 0.95× | Mountain | 0.95× |
| Atlanta | 0.95× | Southwest | 0.95× |
| Southeast | 0.90× | | |

### Default Labor Rates (User-Configurable)

| Classification | Base Rate |
|---------------|-----------|
| Project Manager | $65.00/hr |
| Programmer/Commissioning | $55.00/hr |
| Foreman | $52.00/hr |
| Lead Technician | $45.00/hr |
| Journeyman Technician | $38.00/hr |
| Apprentice | $22.00/hr |

### Labor Burden Components (Default 35%)

| Component | Rate |
|-----------|------|
| FICA (Social Security/Medicare) | 7.65% |
| Workers Compensation | 8.00% |
| Health Insurance | 6.25% |
| General Liability Insurance | 5.00% |
| SUTA (State Unemployment) | 3.50% |
| Retirement/401k | 2.00% |
| Other Benefits | 2.00% |
| FUTA (Federal Unemployment) | 0.60% |
| **Total Burden** | **35.00%** |

---

## 7. EXPORT ENGINE & SMARTPM INTEGRATION

The Export Engine (`export-engine.js`) produces three output formats:

### JSON Export — SmartPM Import
A structured data package with the `smartplans-export` format identifier. Contains:
- `_meta` — format version, timestamp, generator info
- `project` — name, type, location, jurisdiction, disciplines
- `documents` — list of files analyzed (names, sizes, types)
- `pricingConfig` — tier, region, labor rates, burden, markups
- `userInputs` — specific items, known quantities, prior estimates, notes
- `analysis` — raw AI markdown + parsed sections
- `rfis` — all RFIs with selected/unselected status
- `infrastructure` — AI-extracted MDF/IDF locations with equipment items and cable runs

### Excel Export — Multi-Sheet Workbook
Uses SheetJS to generate a professional `.xlsx` with 5 sheets:
1. **Project Summary** — All project parameters and labor rates
2. **Material Pricing** — Complete pricing database for the selected tier/region
3. **AI Analysis** — Raw analysis text
4. **RFIs** — Complete RFI log with selected status
5. **Documents** — List of analyzed files

Falls back to CSV if SheetJS is unavailable.

### Markdown Export — Proposal Document
A formatted `.md` report suitable for client proposals, including:
- Title page with project details
- Pricing configuration table
- Labor rates with burden
- Documents analyzed
- Full AI analysis
- Complete RFI log

### SmartPM Import Pipeline
When the JSON export is imported into SmartPM, the following data auto-populates:

| SmartPM Module | Auto-Populated? | Source |
|---------------|-----------------|--------|
| SOV (Schedule of Values) | ✅ Yes | analysis.sections → SOV line items |
| Project Settings | ✅ Yes | project + pricingConfig → all settings |
| RFIs | ✅ Yes | rfis.items (selected only) → RFI records |
| Infrastructure (MDF/IDF) | ✅ Yes | infrastructure.locations → locations + equipment + cable runs |
| Contract Value | ✅ Yes | analysis.totals.grandTotal → original & current contract value |
| Billing | ❌ No | Created during construction |
| Change Orders | ❌ No | Happen during construction |
| Submittals | ❌ No | Created during project execution |
| Daily Log | ❌ No | Field entries created on-site |
| Punch List | ❌ No | Created during closeout |
| Contacts | ❌ No | Added manually per project |

### Infrastructure Parser (Multi-Strategy)
The export engine includes a sophisticated MDF/IDF parser that extracts structured data from the AI's markdown output using 3 strategies:

1. **Section detection:** Finds MDF/IDF headings using multiple regex patterns (## headers, **bold** headers, line-start matching)
2. **Room splitting:** Splits the section into individual rooms using ### headers, bold text, or #### headers
3. **Equipment table parsing:**
   - Strategy 1: Standard pipe-delimited markdown tables
   - Strategy 2: Bullet-list items (e.g., `- 2x 48-Port Patch Panel @ $150`)
   - Strategy 3: Numbered lists (e.g., `1. Patch Panel (2)`)
4. **Cable run extraction:** Regex patterns for Cat6A/Cat6/Cat5e/Fiber SM/Fiber MM/Coax quantities
5. **Equipment categorization:** Auto-classifies items (rack, switch, patch_panel, fiber_panel, ups, pdu, cable_management, grounding, cctv, access_control, av, fire_alarm)

---

## 8. PERSISTENCE & SAVED ESTIMATES

SmartPlans uses Cloudflare D1 (SQLite) for estimate persistence:

### Database Schema
```sql
CREATE TABLE estimates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data TEXT NOT NULL,        -- Full JSON state snapshot
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### API Endpoints
- `GET /api/estimates` — List all saved estimates (returns id, name, timestamps)
- `POST /api/estimates` — Save a new estimate (auto-generates UUID)
- `GET /api/estimates/:id` — Load a specific estimate
- `PUT /api/estimates/:id` — Update an existing estimate
- `DELETE /api/estimates/:id` — Delete an estimate

### Auto-Save Behavior
- Analysis results are automatically saved after AI processing completes
- Manual "Save" button available in the header
- "Saved Estimates" button provides access to all previous estimates
- Estimate ID is reset when starting a new analysis

---

## 9. TECHNOLOGY STACK

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Vanilla HTML/CSS/JS | Zero-dependency UI |
| **AI Models** | Gemini 3.1 Pro Preview + Gemini 2.5 Pro + Gemini 2.5 Flash | Deep reasoning, vision analysis & text generation |
| **API** | Direct Gemini REST API | 18 parallel keys, client-side calls |
| **Hosting** | Cloudflare Pages | Global CDN, edge deployment |
| **Database** | Cloudflare D1 (SQLite) | Saved estimates persistence |
| **Backend Functions** | Cloudflare Pages Functions | API proxy, estimate CRUD |
| **Excel Generation** | SheetJS (XLSX) | Multi-sheet workbook export |
| **Styling** | Custom CSS (Dark Theme) | Premium glassmorphism design |

---

## 10. FILE STRUCTURE

```
SmartPlans/
├── index.html              — Main HTML shell with SEO meta tags
├── styles.css              — 1,740+ lines of premium dark theme CSS
├── app.js                  — 3,200+ lines: 7-step wizard, state management, rendering
├── ai-engine.js            — 1,440+ lines: 18-brain AI engine with 7-wave Triple-Read Consensus orchestration
├── pricing-database.js     — 422 lines: 350+ ELV items with 3-tier pricing
├── export-engine.js        — 736 lines: JSON/Excel/Markdown export + MDF/IDF parser
├── functions/
│   └── api/
│       ├── ai/
│       │   └── invoke.js   — API proxy for Gemini (fallback route)
│       └── estimates/
│           ├── index.js    — List & create saved estimates
│           └── [id].js     — Get, update, delete individual estimates
├── package.json            — Cloudflare Pages config with D1 binding
└── .gitignore
```

**Total codebase:** ~7,600 lines of JavaScript + ~1,740 lines of CSS

---

## SUMMARY

SmartPlans represents a paradigm shift in ELV construction estimation. By decomposing the estimation task into 18 specialized AI domains powered by **Gemini 3.1 Pro**, executing them in a dependency-aware 7-wave pipeline with **Triple-Read Consensus Architecture**, and then cross-validating the results with both a dedicated auditor brain and a hostile Devil's Advocate, the system achieves accuracy levels that **match or exceed** human expert estimators — but in minutes instead of weeks.

The integration with SmartPM creates a complete estimate-to-execution workflow: start with blueprints in SmartPlans, get a priced estimate with SOV, export to SmartPM, and manage the entire project lifecycle from there.

---

*Document updated February 20, 2026*
*SmartPlans v3.0 — Powered by Gemini 3.1 Pro — AI-Powered ELV Construction Estimation Platform*
*© 2026 3D Technology Services, Inc.*
