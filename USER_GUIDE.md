# SmartPlans — Estimator's User Guide
## AI-Powered ELV Construction Estimation
### For the Estimating Department

**Version:** 3.0 — Triple-Read Consensus Engine  
**Last Updated:** February 19, 2026  
**Application URL:** https://smartplans-4g5.pages.dev

---

## Table of Contents

1. [Overview](#1-overview)
2. [Getting Started](#2-getting-started)
3. [Step 1: Project Setup — Field-by-Field Guide](#3-step-1-project-setup)
4. [Step 2: Symbol Legend](#4-step-2-symbol-legend)
5. [Step 3: Floor Plans](#5-step-3-floor-plans)
6. [Step 4: Specifications](#6-step-4-specifications)
7. [Step 5: Addenda](#7-step-5-addenda)
8. [Step 6: Review & Analyze](#8-step-6-review--analyze)
9. [Step 7: Results & Export](#9-step-7-results--export)
10. [Understanding the AI Engine](#10-understanding-the-ai-engine)
11. [Reading the AI Report](#11-reading-the-ai-report)
12. [Accuracy — What Affects It & How to Maximize It](#12-accuracy)
13. [Export Options](#13-export-options)
14. [Saved Estimates](#14-saved-estimates)
15. [SmartPM Integration](#15-smartpm-integration)
16. [Common Estimating Workflow](#16-common-estimating-workflow)
17. [Tips & Best Practices](#17-tips--best-practices)
18. [Troubleshooting](#18-troubleshooting)

---

## 1. Overview

SmartPlans is an AI-powered estimation tool built specifically for **ELV (Extra-Low Voltage) construction projects**. You upload your construction documents — floor plans, symbol legends, specifications, and addenda — and the AI produces a comprehensive estimate including device counts, material takeoffs, labor hours, cable schedules, MDF/IDF breakdowns, and auto-generated RFIs.

### What SmartPlans Does For You

| Task | Without SmartPlans | With SmartPlans |
|---|---|---|
| Count devices on plans | 2-4 hours per floor, manual | **2-3 minutes, automated** |
| Material takeoff | Half a day, spreadsheets | **Included in AI analysis** |
| Labor estimate | Experience-based guesswork | **Task-by-task calculation** |
| MDF/IDF material list | Manual room-by-room | **Auto-generated per room** |
| RFI identification | Rely on memory | **AI flags gaps automatically** |
| Code compliance check | Look it up yourself | **AI cites NFPA/NEC/TIA** |

### Supported ELV Disciplines

- **Structured Cabling** — Data/voice outlets, cable runs, patch panels, racks
- **CCTV** — Cameras, NVR/DVR, monitor stations
- **Access Control** — Card readers, controllers, door hardware, credentials
- **Audio Visual** — Projectors, displays, speakers, control systems
- **Intrusion Detection** — Motion sensors, panels, keypads, contacts
- **Fire Alarm** — Smoke/heat detectors, pull stations, NAC circuits, FACP

---

## 2. Getting Started

### How to Access SmartPlans

1. Open any web browser (Chrome, Edge, Safari, Firefox)
2. Go to: **https://smartplans-4g5.pages.dev**
3. The wizard loads instantly — **no login required**
4. Works on desktop, laptop, iPad, and phone

### What to Gather Before You Start

Before creating an estimate, pull together these documents from the bid package:

| Document | Required? | Why It Matters | Accuracy Impact |
|---|---|---|---|
| **Symbol Legend** | Strongly recommended | Tells AI what each symbol means | **+5%** |
| **Floor Plans** | **YES — Required** | The drawings to be counted | Base accuracy |
| **Specifications** | Recommended | Tells AI cable types, testing standards, equipment models | **+3%** |
| **Addenda** | If they exist | Scope changes after original issue | **+1%** |

> **🎯 Golden Rule:** The more you give SmartPlans, the more accurate it gets. A Vector PDF with legend + specs can hit **97-99% accuracy**. A low-res scan with nothing else might only hit 60%.

---

## 3. Step 1: Project Setup

This is the most important step — your inputs here **calibrate the entire AI engine**. Take 2 minutes to fill this out carefully. It directly affects accuracy.

### Field-by-Field Guide

---

#### 📌 Project Name *(Required)*

**What to enter:** A clear, descriptive name for this estimate.

**Why it matters:** This becomes the name on your saved estimate, your exported files, and the SmartPM project if you import it.

| ❌ Bad Example | ✅ Good Example |
|---|---|
| "Project 1" | "Sunrise Medical Center Phase 2 — Low Voltage" |
| "Test" | "City Hall Renovation — CCTV & Access Control" |
| "123" | "Amazon Warehouse DFW4 — Structured Cabling" |

---

#### 📌 Project Type *(Required)*

**What to select:** The type of construction project.

**Why it matters:** This tells the AI how to interpret the drawings. For example, in a **Renovation**, existing devices shown on plans should NOT be counted as new work. In **New Construction**, everything shown is new.

| Option | When to Select | What AI Does Differently |
|---|---|---|
| **New Construction** | Ground-up build, nothing exists yet | Counts ALL devices as new scope |
| **Renovation** | Reworking an existing occupied building | Distinguishes "existing to remain" from "new" |
| **Tenant Improvement** | Build-out of shell space for a new tenant | Focuses on tenant spaces, not core/shell |
| **Addition** | New wing added to existing building | Counts new section + tie-ins to existing |
| **Design-Build** | You're designing AND building | Includes design contingency allowances |
| **Service / Retrofit** | Small upgrade or equipment replacement | Focuses on specific devices being changed |

> **💡 When in doubt:** Select "New Construction" — this gives the most complete count.

---

#### 📌 Disciplines *(Required — select at least one)*

**What to do:** Click each discipline that applies to your project. Selected disciplines glow blue with a ✓.

**Why it matters:** This is CRITICAL for accuracy. The AI uses this to:
- Know which symbols to look for (a camera symbol vs. a smoke detector look similar!)
- Activate the correct pricing database
- Generate discipline-specific RFIs
- Focus the Discipline Deep-Dive brain (v2.0) on your primary trade

| If the project has... | Select... |
|---|---|
| Data/voice drops, patch panels | **Structured Cabling** |
| Security cameras | **CCTV** |
| Card readers, door hardware | **Access Control** |
| Speakers, displays, AV rooms | **Audio Visual** |
| Motion sensors, alarm panels | **Intrusion Detection** |
| Smoke detectors, pull stations | **Fire Alarm** |

> **⚠️ Common mistake:** Don't select disciplines that aren't in YOUR scope. If you're bidding only structured cabling, don't select Fire Alarm — it will cause false counts of fire alarm devices.

---

#### 📌 File Format

**What to select:** The format/quality of your floor plan files.

**Why it matters:** This dramatically affects accuracy. The AI adjusts its confidence based on document quality.

| Format | Accuracy Boost | When to Select |
|---|---|---|
| **Vector PDF (from CAD)** | 🟢 +28% over baseline | PDF exported directly from AutoCAD, Revit, or Bluebeam |
| **DWG / DXF (AutoCAD)** | 🟢 +28% | Native CAD files |
| **IFC / Revit BIM** | 🟢 +28% | Building Information Model files |
| **High-res scan (300+ DPI)** | 🟡 +12% | Paper plans scanned at high resolution |
| **Standard scan** | 🟡 +0% | Normal quality scans |
| **Low-res or photos** | 🔴 -0% | Phone photos, screenshots, low-quality scans |

> **💡 How to tell:** If you can click on text in the PDF and it selects → it's a **Vector PDF**. If clicking does nothing → it's a **scan**.

---

#### 📌 Specific Items to Count *(Optional but powerful)*

**What to enter:** Describe specific devices or areas you want the AI to focus on.

**Why it matters:** Targeted requests are **much more accurate** than "count everything." The AI gives these items extra attention during all three reads.

**Good examples:**
- *"Count all WAPs (wireless access points) on floors 2 and 3"*
- *"Verify camera count in parking garage on sheet S-101"*
- *"Make sure to count the card readers on both sides of mantrap doors"*
- *"Count all duplex receptacles and dedicated circuits on sheets E-101 through E-105"*

**Bad examples:**
- *"Count stuff"* — too vague
- *"Everything"* — doesn't help the AI focus

---

#### 📌 Known Quantities *(Optional but improves accuracy)*

**What to enter:** Any counts you already have from a manual takeoff, a prior bid, or the engineer's notes.

**Why it matters:** The AI uses these as **validation checkpoints**. If its count differs significantly from your known quantity, it flags a discrepancy. This catches AI errors AND your manual counting errors.

**Good examples:**
- *"200 data drops per the spec, 47 cameras on the camera schedule"*
- *"Architect's notes say approximately 120 access points building-wide"*
- *"Prior bid was based on 85 fire alarm devices per floor"*

---

#### 📌 Building Code Jurisdiction *(Optional)*

**What to enter:** The applicable building codes for this project.

**Why it matters:** The AI checks the design against code requirements and flags potential violations. Different jurisdictions have different requirements (e.g., California requires seismic bracing for all cable trays).

**Good examples:**
- *"NEC 2023, NFPA 72 2022"*
- *"California CBC, Title 24"*
- *"NYC Building Code 2022"*
- *"IBC 2021, ADA 2010"*

---

#### 📌 Project Location *(Optional)*

**What to enter:** City and state of the project site.

**Why it matters:** Two things:
1. **Regional pricing** — Material and labor costs vary by region (NYC is ~35% higher than national average)
2. **Travel expenses** — If the project is 100+ miles from your office, travel costs (hotel, meals, vehicle, airfare) are automatically calculated

**Examples:** *"Houston, TX"* or *"Miami, FL"* or *"New York, NY"*

---

#### 📌 Prevailing Wage / Davis-Bacon

**What to select:** Whether this project requires prevailing wage rates.

| Option | When to Select |
|---|---|
| **Not applicable — standard rates** | Private/commercial projects with no government funding |
| **Davis-Bacon (federal project)** | Federally funded projects (VA hospitals, military, federal courts) |
| **State prevailing wage** | State-funded projects (public schools, state buildings) |
| **Project Labor Agreement (PLA)** | Projects with union labor agreements |

> **⚠️ This is important!** Prevailing wage can increase labor costs by **40-80%**. Selecting the wrong option will make your bid wildly inaccurate.

---

#### 📌 Work Shift / Schedule

**What to select:** The primary working hours for this project.

| Option | Labor Impact |
|---|---|
| **1st Shift — Standard (7AM-3:30PM)** | Normal rates — no premium |
| **2nd Shift (3PM-11:30PM)** | 10-15% shift differential |
| **3rd Shift / Overnight** | 15-20% premium, reduced productivity |
| **Weekends Only** | 1.5× overtime rate |
| **Split Shift** | Working around occupants — reduced productivity |
| **Mixed** | Varies by phase |
| **4/10s** | 4 days × 10 hours |

---

#### 📌 Prior Estimate *(Optional)*

**What to enter:** Paste or describe any prior estimate or bid numbers you want to compare against.

**Why it matters:** The AI will look for significant discrepancies between its analysis and your prior numbers, helping you understand what changed.

**Example:** *"Prior bid from 2024: $1.2M total, 200 data drops, 48 cameras. New addendum added 3rd floor."*

---

#### 💲 Pricing & Rate Configuration *(Expandable Section)*

Click the **💲 Pricing & Rate Configuration** bar at the bottom of Step 1 to expand the advanced pricing panel. Most estimators can leave these at defaults.

| Setting | Default | What It Controls |
|---|---|---|
| **Pricing Tier** | Mid | Budget / Mid / Premium material costs |
| **Regional Multiplier** | National Average | Geographic cost adjustment |
| **Labor Rates** | $22-65/hr by role | Hourly rates per classification |
| **Burden Rate** | 35% | Benefits, taxes, insurance on top of base rate |
| **Material Markup** | 25% | Your company's material markup |
| **Labor Markup** | 30% | Your company's labor markup |
| **Equipment Markup** | 15% | Rental equipment markup |
| **Subcontractor Markup** | 10% | Sub costs markup |

---

## 4. Step 2: Symbol Legend

### What to Upload

The **symbol legend** (also called "symbol key" or "symbol schedule") is typically the first sheet in the drawing set. It shows every symbol used on the plans and what they represent.

### How to Upload

1. Click the upload area or drag & drop files into it
2. You can upload multiple legend pages
3. Accepted formats: **PDF, PNG, JPG, TIFF, DWG, DXF**
4. Each uploaded file appears in a list below with its name and size
5. Click **× Remove** to delete a file

### Why This Matters SO Much

> **Without a legend:** The AI has to *guess* what symbols mean. A small circle could be a camera, a smoke detector, or a sprinkler head. Accuracy drops 5-10%.
>
> **With a legend:** The AI's new **Legend Decoder brain** builds a structured dictionary BEFORE any counting begins. Every brain in the system uses this dictionary. This is the #1 accuracy driver.

### Can I Skip This?

Yes, you can proceed without a legend. But your estimate accuracy will be lower. The AI does its best to identify common industry-standard symbols, but project-specific symbols will be missed.

---

## 5. Step 3: Floor Plans

### What to Upload

Upload **ALL floor plan sheets** that contain devices in your scope. For a multi-floor building, upload every floor.

### Tips for Best Results

- **Upload all floors** — Even if they're typical/similar. The AI counts each sheet independently.
- **Include enlarged plans** — If the set includes enlarged detail sheets (like MDF room layouts), upload those too.
- **Include reflected ceiling plans** — If speaker locations or CCTV cameras are shown on RCPs.
- **Name matters** — File names like "E1.01-First Floor Power.pdf" help the AI understand what it's looking at.

### File Size Limits

- Individual file: **20MB max**
- Total payload: There's a combined limit, so extremely large drawing sets may need to be split.

---

## 6. Step 4: Specifications

### What to Upload

Upload specification sections relevant to your disciplines:

| Your Discipline | Upload These Spec Sections |
|---|---|
| Structured Cabling | Division 27 10 00, 27 13 00, 27 15 00 |
| CCTV | Division 28 23 00 |
| Access Control | Division 28 13 00 |
| Fire Alarm | Division 28 31 00 |
| Audio Visual | Division 27 41 00 |
| Intrusion Detection | Division 28 16 00 |

### Why Specs Matter

Specifications tell the AI the **exact requirements** that floor plans can't show:
- Cable category (Cat 5e vs Cat 6 vs Cat 6A)
- Testing standards (require full channel testing?)
- Product requirements (specific manufacturer?)
- Labor standards (BICSI RCDD supervision required?)

> **💡 Pro Tip:** SmartPlans uses "dual-channel" analysis on specification PDFs — it reads both the visual layout AND extracts the text directly. This means even scan-quality spec PDFs produce good results.

---

## 7. Step 5: Addenda

### What to Do

1. **Answer the question:** "Are there addenda for this project?"
   - **Yes** → Upload addenda documents
   - **No** → Click No and proceed
   - **Unsure** → Click Unsure and proceed (better safe — upload if you have them)

2. If you selected Yes, upload addenda PDFs the same way you uploaded plans.

### Why Addenda Matter

Addenda modify the original scope. The AI specifically looks for:
- Added or removed devices
- Changed specifications
- Modified room layouts
- Added or removed floors

> **⚠️ Missing addenda = wrong estimate.** If addendum #2 Added 15 cameras and you didn't upload it, your count will be 15 short.

---

## 8. Step 6: Review & Analyze

### The Review Screen

Before analysis begins, you'll see a summary showing:
- Project name, type, and location
- File counts (how many legends, plans, specs, addenda)
- Selected disciplines
- **Accuracy Confidence Score** — a percentage estimate of expected accuracy

### The Accuracy Confidence Score

This score updates dynamically based on what you've provided:

| Factor | Accuracy Boost |
|---|---|
| Vector PDF / DWG / BIM format | +28% over baseline |
| Symbol legend uploaded | +5% |
| Specifications uploaded | +3% |
| Known quantities provided | +2% |
| Specific items described | +2% |
| Code jurisdiction specified | +1% |
| Prior estimate for comparison | +1% |
| **Maximum possible** | **97%** |

### The Traffic Light

| Color | Score | Meaning |
|---|---|---|
| 🟢 GREEN | 85%+ | High confidence — trust the numbers |
| 🟡 YELLOW | 70-84% | Moderate confidence — verify key counts manually |
| 🔴 RED | Below 70% | Low confidence — use as a starting point only |

### Running the Analysis

Click **🔍 Begin Analysis** to start.

**What you'll see during analysis:**
- A circular progress ring with percentage
- A progress bar filling as brains complete their work
- A **Brain Dashboard** showing all 18 AI brains organized by wave
- Each brain shows ⏳ (pending), 🔄 (running), ✅ (done), or ❌ (failed)

**⏱ How long does it take?**
- Simple project (1-2 sheets): ~45 seconds
- Medium project (5-10 sheets): ~2-3 minutes
- Large project (20+ sheets): ~3-5 minutes

The analysis takes longer than v1.0 because the AI now reads your plans **three times** using different methodologies. This is what gets you to 99% accuracy.

---

## 9. Step 7: Results & Export

### What You'll See

After analysis, the Results page shows:

1. **AI Analysis Report** — The full formatted estimate in markdown
2. **Verification Appendices** — New in v2.0:
   - 🎯 **Triple-Read Consensus Report** — How many items all 3 reads agreed on
   - ⚠️ **Verification Audit** — Cross-validator findings
   - 😈 **Devil's Advocate Challenge** — What could go wrong with this estimate
   - 🔄 **Reverse Verification** — BOQ line items verified against the plans
3. **RFI Recommendations** — Questions to send to the GC/engineer
4. **Export Panel** — Download buttons for JSON, Excel, and Markdown

### What to Do With the Results

1. **Read the Executive Summary** — Quick project overview and key findings
2. **Check device counts** — Compare against your own count or known quantities
3. **Review the MDF/IDF breakdown** — Each room gets its own equipment table
4. **Look at the cost summary** — Material + Labor + Equipment + Markup = Total
5. **Read the Devil's Advocate section** — What risks might you be missing?
6. **Select applicable RFIs** — Check the ones you want to send to the GC
7. **Export** — Download in your preferred format(s)

---

## 10. Understanding the AI Engine

### The Triple-Read Consensus Engine (v2.0)

SmartPlans doesn't just read your plans once. It reads them **three times** using completely different methodologies, then builds **consensus** on every count. This is how senior estimators work — and now your AI does it too.

### The 18 Brains × 7 Waves

| Wave | Brains | What Happens | Model |
|---|---|---|---|
| **Wave 0** | 📖 Legend Decoder | Builds a symbol dictionary before any counting starts | Pro |
| **Wave 1** | 🔍 Symbol Scanner, 📋 Code Compliance, 🏗️ MDF/IDF Analyzer, 🔌 Cable & Pathway, ⚠️ Special Conditions | **First Read** — systematic left-to-right scan of every sheet | Pro + Flash |
| **Wave 1.5** | 👁️ Shadow Scanner, 🎯 Discipline Deep-Dive, 📐 Quadrant Scanner | **Second Read** — completely independent count using room-by-room and zone-based methods | Pro |
| **Wave 1.75** | ⚖️ Consensus Arbitrator, 🔬 Targeted Re-Scanner | Compares all 3 reads. If they disagree on any item, a **Third Read** is triggered on just that item | Pro |
| **Wave 2** | 💰 Material Pricer, 👷 Labor Calculator, 📊 Financial Engine | Builds the cost estimate from the consensus counts | Flash |
| **Wave 2.5** | 🔄 Reverse Verifier | Counts BACKWARDS — takes the material list and verifies each item exists on the plans | Pro |
| **Wave 3** | ✅ Cross Validator, 😈 Devil's Advocate | Audits the entire estimate + actively tries to find everything wrong with it | Pro |
| **Wave 4** | 📝 Report Synthesizer | Writes the final formatted report | Flash |

### Why Three Reads Matter

**Read 1 (Wave 1):** Left-to-right systematic scan. Good at finding obvious devices, but can miss items in dense clusters or near edges.

**Read 2 (Wave 1.5):** Three independent brains re-count:
- **Shadow Scanner** counts room-by-room (catches devices the first scan missed between room boundaries)
- **Discipline Deep-Dive** focuses ONLY on your primary discipline (catches specialty items)
- **Quadrant Scanner** divides each sheet into 4 zones (catches devices at edges and in undefined spaces)

**Read 3 (Wave 1.75 — Conditional):** Only fires if the first two reads disagree on specific items. The Targeted Re-Scanner zooms in on just the disputed area and counts with forensic precision.

> **Result:** Where all 3 reads agree = **99%+ confidence**. Where they disagree = the AI resolves it with a targeted 3rd read.

---

## 11. Reading the AI Report

### Report Sections Explained

The AI report contains these sections (in order):

| Section | What It Contains | What to Look For |
|---|---|---|
| **Executive Summary** | Project overview, scope assumptions | Make sure the AI understood the project correctly |
| **Device Count Summary** | Symbol counts by type per floor/sheet | Compare against your manual count |
| **Cable Schedule** | Cable types, quantities, avg run lengths | Verify cable category matches spec |
| **Material Takeoff** | Line items with Qty × Unit Cost = Extended | Check that math is correct |
| **Labor Estimate** | Hours by task category | Does the total feel reasonable for this size project? |
| **MDF/IDF Breakdown** | Per-room equipment tables | Verify room assignments match plans |
| **Special Equipment** | Lifts, permits, testing, rental equipment | These are easy to miss in manual estimates |
| **Schedule of Values** | SOV breakdown for AIA billing | Should align with your contract structure |
| **Priced Estimate Summary** | Material + Labor + Equipment + Sub + Markup | The bottom line number |
| **Code Compliance** | Code citations (NFPA, NEC, TIA) | Flag any 🔴 CRITICAL items |
| **Observations & Analysis** | AI's notes on what it found interesting | Read this — often catches things you'd miss |
| **RFIs** | Questions for the GC/engineer | Select the ones relevant to your bid |

### Verification Appendices (New in v2.0)

At the bottom of the report, you'll find 4 new sections:

#### 🎯 Triple-Read Consensus Report
Shows how many device types were counted and how many all 3 reads agreed on. Higher agreement = higher confidence.

#### ⚠️ Verification Audit
The Cross Validator checked all math, quantities, code references, and pricing. Issues are tagged:
- 🔴 **CRITICAL** — Fix before submitting bid
- 🟡 **WARNING** — Review carefully
- 🔵 **INFO** — Minor note

#### 😈 Devil's Advocate Challenge
This brain tried to find EVERYTHING wrong with the estimate. It checks for:
- Missing items (e.g., "No UPS listed for MDF room")
- Suspicious pricing (too cheap or too expensive)
- Labor gaps (not enough hours for scope)
- Phantom items (materials listed that don't match plans)

**Risk Score:** 0-100 scale. Under 20 = low risk. Over 50 = review carefully.

#### 🔄 Reverse Verification
The Reverse Verifier counted backwards — starting from the Bill of Quantities and confirming each item exists on the plans. Discrepancies are listed with the specific location.

---

## 12. Accuracy

### What Drives Accuracy

| Factor | Impact | Your Control |
|---|---|---|
| **Document quality** | Biggest factor | Upload vector PDFs whenever possible |
| **Symbol legend** | +5% accuracy | Always upload the legend sheet |
| **Specifications** | +3% accuracy | Upload relevant spec sections |
| **Discipline selection** | Major impact | Select ONLY your trades |
| **Specific items** | +2% accuracy | Describe what to focus on |
| **Known quantities** | +2% accuracy | Provide any counts you already have |
| **Number of sheets** | More = better | Upload all floors, not just typical |

### Expected Accuracy by Scenario

| Scenario | v1.0 (10 brains) | v2.0 (18 brains, Triple-Read) |
|---|---|---|
| Vector PDF + legend + specs + all context | 93-95% | **97-99%** |
| Vector PDF + legend only | 85-90% | **92-96%** |
| High-res scan + legend | 75-82% | **84-90%** |
| Standard scan, no legend | 58-65% | **68-75%** |

---

## 13. Export Options

After analysis, the Export panel offers:

| Button | Format | Best For |
|---|---|---|
| 🔗 **JSON — PM App Import** | .json | Importing into SmartPM for project tracking |
| 📊 **Excel — Spreadsheet** | .xlsx | Internal review, manual editing, client proposals |
| 📄 **Markdown — Proposal Report** | .md | Formatted report for clients or internal review |
| 📦 **Export All Formats** | All 3 | Download everything at once |

---

## 14. Saved Estimates

### Auto-Save

When the AI analysis completes, SmartPlans **automatically saves** the estimate to the cloud. You'll see: *"Estimate saved ✓"*

### Manual Save

Click **💾 Save** in the footer at any time to save a draft (even before running analysis).

### Accessing Saved Estimates

1. Click **📂 Saved Estimates** in the top-right header
2. Each estimate card shows: name, status (Draft / Analyzed / Exported), type, disciplines, and last updated date
3. Click **📂 Load** to restore any estimate
4. Click **🗑 Delete** to permanently remove one

### Starting Fresh

Click **🔄 Start New Analysis** to clear the wizard. Your previously saved estimate stays in the database — it's not deleted.

---

## 15. SmartPM Integration

### The Pipeline

```
SmartPlans (Estimating) → JSON Export → SmartPM Import (Operations)
```

### How to Hand Off to Ops

1. Complete your analysis in SmartPlans
2. Export the **JSON** file
3. Give the file to your Operations team
4. In SmartPM, they click **📦 Import from SmartPlans**
5. A new project is created with everything pre-populated

### What Gets Imported

- Project metadata (name, type, location, disciplines)
- Pricing configuration and markup settings
- Schedule of Values line items
- Selected RFIs
- MDF/IDF infrastructure budgets (🔒 AI-locked — only Admins can modify)

---

## 16. Common Estimating Workflow

Here's the recommended workflow for using SmartPlans on a typical bid:

```
1. Receive bid documents from GC
         ↓
2. Open SmartPlans → Enter project details
         ↓
3. Upload: Legend → Plans → Specs → Addenda
         ↓
4. Adjust pricing tier and region if needed
         ↓
5. Click "Begin Analysis" — wait 2-3 minutes
         ↓
6. Review AI estimate for reasonableness
         ↓
7. Check the Devil's Advocate section for risks
         ↓
8. Select applicable RFIs
         ↓
9. Export: JSON (for SmartPM) + Excel (for review) + Markdown (for proposal)
         ↓
10. Submit bid / hand off to Operations
```

---

## 17. Tips & Best Practices

### For Maximum Accuracy

1. **Always upload the symbol legend** — This is the single biggest accuracy driver
2. **Use Vector PDFs** — Request them from the architect if you only have scans
3. **Select the right disciplines** — Don't check boxes for trades you're NOT bidding
4. **Fill in known quantities** — Even approximate counts help the AI self-check
5. **Describe specific items** — "Count all WAPs on floor 3" beats "count everything"
6. **Upload all sheets** — Don't skip "typical" floors
7. **Include addenda** — Missing an addendum = wrong scope

### For Workflow Efficiency

1. **Name projects clearly** — You'll thank yourself when loading saved estimates
2. **Save drafts** — Click 💾 before running analysis to preserve your uploads
3. **Use Export All** — Download all 3 formats at once
4. **Review the Devil's Advocate** — It catches things you'd miss
5. **Check the Reverse Verification** — If it flags discrepancies, investigate before bidding

### Red Flags to Watch For

- **Accuracy below 70%** → Your documents may be too low-quality. Request better files.
- **Many failed brains** → Network issue. Wait 30 seconds and retry.
- **Devil's Advocate risk score > 50** → Significant concerns. Review carefully before bidding.
- **Reverse Verification score < 80%** → Material list doesn't match plans well. Manual review needed.

---

## 18. Troubleshooting

### Analysis Issues

| Problem | Cause | Solution |
|---|---|---|
| Analysis fails completely | API rate limit or network timeout | Wait 30 seconds and try again |
| Very low confidence | Low-quality documents | Re-scan at 300+ DPI or request vector PDFs |
| Missing device counts | No symbol legend provided | Go back and upload the legend sheet |
| Wrong device types | Wrong disciplines selected | Verify you selected only your trades |
| Math errors in tables | AI calculation error | The Cross Validator usually catches these. If not, correct manually in Excel export |

### Upload Issues

| Problem | Solution |
|---|---|
| File won't upload | Check format — PDF, PNG, JPG, TIFF, DWG, DXF, IFC only |
| File too large | Split large CAD files into individual sheets (max 20MB per file) |
| Upload appears stuck | Refresh the page and re-upload |

### Saved Estimate Issues

| Problem | Solution |
|---|---|
| Can't see saved estimates | Check internet connection — estimates are stored in the cloud |
| Estimate won't save | Make sure you've entered a project name in Step 1 |
| "Saved offline" message | Cloud save failed — your data is stored locally. It will sync when connection restores |

### Getting Help

For technical issues with SmartPlans, contact your IT administrator or the development team.

---

*SmartPlans v3.0 — Triple-Read Consensus Engine*  
*18 Specialized AI Brains × 7 Processing Waves*  
*3D Technology Services, Inc. — Built for the Estimating Department*
