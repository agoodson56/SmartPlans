# SmartPlans — User Guide
## AI-Powered Construction Document Analysis
### For the Estimating Department

**Version:** 2.0 | **Last Updated:** February 8, 2026  
**Application URL:** https://smartplans-4g5.pages.dev

---

## Table of Contents

1. [Overview](#1-overview)
2. [Getting Started](#2-getting-started)
3. [The 7-Step Wizard](#3-the-7-step-wizard)
4. [AI Analysis Engine](#4-ai-analysis-engine)
5. [Export Options](#5-export-options)
6. [Saved Estimates](#6-saved-estimates)
7. [Pricing Configuration](#7-pricing-configuration)
8. [RFI Generation](#8-rfi-generation)
9. [SmartPM Integration](#9-smartpm-integration)
10. [Tips & Best Practices](#10-tips--best-practices)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Overview

SmartPlans is an AI-powered estimation tool designed specifically for ELV (Extra-Low Voltage) construction projects. It uses Google Gemini AI to analyze uploaded construction documents — floor plans, specifications, symbol legends, and addenda — and produces a comprehensive estimate including material takeoffs, labor hours, MDF/IDF infrastructure breakdowns, and auto-generated RFIs.

### What SmartPlans Does

- **Analyzes** blueprint PDFs, DWG files, and specification documents using AI vision
- **Counts** devices, cable runs, and equipment from floor plans
- **Estimates** material costs, labor hours, and total project pricing
- **Generates** RFIs (Requests for Information) for missing or unclear information
- **Creates** MDF/IDF/TR material breakdowns for infrastructure rooms
- **Exports** structured data in JSON, Excel, and Markdown formats
- **Saves** estimates to the cloud — accessible from any device, anywhere

### Supported ELV Disciplines

| Discipline | Coverage |
|---|---|
| Structured Cabling | Data/voice outlets, cable runs, patch panels, racks |
| CCTV | Camera counts, NVR/DVR, monitor stations |
| Access Control | Readers, controllers, door hardware, credentials |
| Audio Visual | Projectors, displays, speakers, control systems |
| Intrusion Detection | Sensors, panels, keypads, notification devices |
| Fire Alarm | Devices, NAC circuits, panels, monitoring |

---

## 2. Getting Started

### Accessing SmartPlans

1. Open your browser (Chrome, Safari, Firefox, or Edge)
2. Navigate to: **https://smartplans-4g5.pages.dev**
3. The wizard loads immediately — no login required

### Device Compatibility

SmartPlans is a cloud-based web application that works on:
- ✅ Desktop PC (Windows, Mac, Linux)
- ✅ Laptop
- ✅ iPad / Tablet
- ✅ iPhone / Android phone

### What You'll Need Before Starting

Before starting a new estimate, gather the following documents:

| Document Type | Required? | Best Format |
|---|---|---|
| Symbol Legend / Key | Recommended | PDF (vector preferred) |
| Floor Plans | **Required** | PDF, DWG, DXF, IFC |
| Specifications | Recommended | PDF |
| Addenda | If applicable | PDF |

> **💡 Pro Tip:** Vector PDFs (exported directly from CAD) produce the best AI results. High-resolution scans (300+ DPI) are acceptable. Low-resolution JPEGs or photos of plans will produce lower quality estimates.

---

## 3. The 7-Step Wizard

SmartPlans guides you through a 7-step workflow. Each step must be completed before advancing. The navigation bar at the top shows your progress.

### Step 1: Project Setup 📋

**Purpose:** Define the project parameters that calibrate the AI's analysis.

**Fields to complete:**

| Field | Description | Example |
|---|---|---|
| **Project Name** | Your project identifier | "City Hall Phase 2 - Low Voltage" |
| **Project Type** | Select from dropdown | New Construction, Renovation, Tenant Improvement, Addition, Design-Build, Service/Retrofit |
| **Disciplines** | Select all applicable systems | Click each discipline to highlight it |
| **File Format** | Quality of your documents | Vector PDF = best accuracy |
| **Specific Items** (optional) | Items we should be especially looking for | "Verify WAP count floor 3" |
| **Known Quantities** (optional) | Any quantities you already know | "200 data drops confirmed" |
| **Code Jurisdiction** (optional) | Local code requirements | "NEC 2023, NFPA 72" |
| **Project Location** | City/State for regional pricing | "Houston, TX" |
| **Prevailing Wage** | Yes / No / Unknown | Controls labor rate calculations |
| **Work Shift** | Standard / Overtime / Night shift | Adjusts labor multiplier |
| **Prior Estimate** (optional) | Paste prior bid numbers for comparison | "Prior bid: $1.2M" |

> **💡 Important:** The more information you provide, the more accurate the AI estimate. The Project Name and at least one discipline are required to proceed.

### Step 2: Symbol Legend 🔑

**Purpose:** Upload the drawing's symbol legend so the AI can map symbols to device types.

- Click the **upload area** or drag files into it
- Upload one or more legend sheets (typically the first sheet of the drawing set)
- Accepted formats: PDF, PNG, JPG, TIFF, DWG, DXF
- Each file shows its name and size in the list below the upload area
- Click the **× Remove** button next to any file to delete it

> **💡 Why it matters:** Without a legend, the AI has to guess what each symbol means. Providing the legend dramatically improves accuracy for device counts.

### Step 3: Floor Plans 📐

**Purpose:** Upload the actual floor plan drawings to be analyzed.

- Upload all relevant floor plan sheets
- Multi-floor buildings: upload all floors
- The AI will count devices, trace cable paths, and identify room types
- Upload as many sheets as needed — more sheets = more complete estimate

### Step 4: Specifications 📄

**Purpose:** Upload specification documents (Division 27, 28, etc.).

- Upload specification PDFs relevant to your selected disciplines
- Specs help the AI determine specific product requirements, cable categories, testing requirements, etc.
- This step is optional but highly recommended

### Step 5: Addenda 📝

**Purpose:** Upload any addenda or plan revisions.

- First, answer: **"Are there addenda for this project?"** — Yes, No, or Unsure
- If Yes, upload addenda documents
- If No or Unsure, you can proceed without uploading

### Step 6: Review & Analyze 🔍

**Purpose:** Final check before running the AI analysis.

**This screen shows a summary of everything you've provided:**
- Project details (name, type, location)
- File counts per category (legend, plans, specs, addenda)
- Confidence score showing expected accuracy based on document quality/coverage

**Review carefully, then click:**
> **🔍 Begin Analysis**

The AI analysis will start running. You'll see:
- A progress ring with percentage
- Stage descriptions (e.g., "Uploading documents…", "Analyzing floor plans…")
- Progress bar filling as the AI processes documents

**⏱ Analysis typically takes 30 seconds to 2 minutes** depending on the number of pages.

### Step 7: Results & RFIs ✅

**Purpose:** Review the complete AI estimate, select RFIs, and export the package.

This screen shows:
- **Confidence Score** — Percentage indicating estimation confidence
- **AI Analysis** — Full formatted estimate with:
  - Device counts by type and discipline
  - Material takeoff with item, quantity, unit, and costs
  - Labor hour estimates by task
  - MDF/IDF/TR material breakdowns in table format
  - Cable run calculations
  - Cost summaries with totals
- **RFI Recommendations** — AI-flagged items that need clarification
- **Export Panel** — Download in multiple formats

---

## 4. AI Analysis Engine

### How the AI Works

SmartPlans uses **Google Gemini 2.0 Flash** — a multimodal AI that can "see" and interpret construction drawings. When you click "Begin Analysis," the system:

1. **Uploads** all your documents to the Gemini API
2. **Sends** a detailed prompt that includes your project parameters, pricing database, and analysis instructions
3. **Receives** back a comprehensive estimate formatted as structured markdown
4. **Parses** the response into RFIs, MDF/IDF data, and cost summaries

### What the AI Analyzes

| Section | What It Does |
|---|---|
| **Executive Summary** | High-level project overview, scope, and assumptions |
| **Device Counts** | Symbol-by-symbol device inventory per floor |
| **Cable Schedule** | Cable types, quantities, and average run lengths |
| **Material Takeoff** | Line-item material list with quantities and pricing |
| **Labor Estimate** | Task-by-task labor hours with crew requirements |
| **MDF/IDF Breakdown** | Per-room equipment tables with unit cost and extended cost |
| **Risk Assessment** | Items that could affect pricing accuracy |
| **RFI Recommendations** | Questions to clarify with the GC or engineer |

### Pricing Database

SmartPlans includes a built-in pricing database with current material costs and labor rates for all ELV disciplines. Pricing is organized by tier:

| Tier | Use Case |
|---|---|
| **Budget** | Competitive bidding, value engineering |
| **Mid** (default) | Standard commercial projects |
| **Premium** | Healthcare, government, mission-critical |

---

## 5. Export Options

After analysis, the **Export Estimate Package** panel offers four export options:

### 🔗 JSON — PM App Import
- **What it is:** Structured data file containing the complete estimate
- **Use for:** Importing directly into SmartPM for project tracking
- **Contains:** Project info, pricing config, AI analysis, RFIs, infrastructure data
- **File name:** `SmartPlans_[ProjectName]_[Date].json`

### 📊 Excel — Spreadsheet
- **What it is:** Multi-sheet Excel workbook (.xlsx)
- **Use for:** Internal review, editing, and client proposals
- **Sheets:** Summary, Material Takeoff, Labor, Cable Schedule, RFIs, Pricing Config

### 📄 Markdown — Proposal Report
- **What it is:** Formatted markdown document
- **Use for:** Client-facing proposals, internal reports
- **Contains:** Full AI analysis in readable report format

### 📦 Export All Formats
- Downloads all three formats at once (JSON + Excel + Markdown)

---

## 6. Saved Estimates

### How Saving Works

SmartPlans saves your estimates to a **cloud database (Cloudflare D1)** so they persist permanently and are accessible from any device.

**There are two ways estimates are saved:**

1. **Auto-save:** When an AI analysis completes successfully, the estimate is automatically saved to the cloud. You'll see a green toast notification: *"Estimate saved ✓"*

2. **Manual save:** Click the **💾 Save** button in the footer at any time during steps 2–6 to save a draft before running the analysis.

### Accessing Saved Estimates

1. Click the **📂 Saved Estimates** button in the top-right of the header
2. A slide-out panel opens showing all saved estimates
3. Each estimate card shows:
   - **Project Name** — The name you entered in Step 1
   - **Status Badge:**
     - 🟡 **Draft** — Saved before analysis ran
     - 🟢 **Analyzed** — Analysis completed and saved
     - 🔵 **Exported** — Exported to a file
   - **Details:** Project type, disciplines, location, last updated date
   - **"(current)"** label if it's the estimate you're currently working on

### Loading a Saved Estimate

1. Open the **📂 Saved Estimates** panel
2. Click the **📂 Load** button on any estimate card
3. The entire estimate is restored — project setup, pricing configuration, and AI analysis results
4. If the estimate has completed analysis, you'll jump directly to the Results page
5. If it's a draft, you'll return to where you left off

### Deleting an Estimate

1. Open the **📂 Saved Estimates** panel
2. Click the **🗑 Delete** button on an estimate card
3. Confirm the deletion when prompted
4. The estimate is **permanently removed** from the database

> **⚠️ Note:** Deletion is permanent and cannot be undone. Make sure to export any estimates you want to keep before deleting.

### Starting a New Estimate

When you click **🔄 Start New Analysis** on the results page, it:
- Clears all current project data
- Resets the wizard to Step 1
- Does **NOT** delete the previously saved estimate — it stays in the database
- The next save creates a **new** estimate record

---

## 7. Pricing Configuration

SmartPlans uses a built-in pricing database that's embedded into the AI prompt. The pricing adjusts based on your settings in Step 1:

### Labor Rates (Default)

| Role | Base Rate |
|---|---|
| Journeyman | $38.00/hr |
| Lead Technician | $45.00/hr |
| Foreman | $52.00/hr |
| Apprentice | $22.00/hr |
| Project Manager | $65.00/hr |
| Programmer | $55.00/hr |

### Burden Rate
- Default: **35%** on top of base labor rates
- Toggle burden inclusion on/off in the pricing panel

### Material Markup
- Default: **25%** on material
- Default: **30%** on labor
- Default: **15%** on equipment
- Default: **10%** on subcontractor

### Regional Multiplier
- Adjusts pricing for your geographic region
- Factors in local cost of living and market rates

---

## 8. RFI Generation

### What Are RFIs?

Requests for Information (RFIs) are formal questions submitted to the general contractor or engineer of record to clarify unclear or missing information in the construction documents.

### How SmartPlans Generates RFIs

SmartPlans includes a built-in library of **industry-standard RFI templates** organized by discipline:

| Discipline | RFI Count | Coverage |
|---|---|---|
| Structured Cabling | 8 | Cable categories, pathways, grounding, testing |
| CCTV | 7 | Camera specs, storage, monitoring, conduit |
| Access Control | 7 | Hardware, integration, credentials, wiring |
| Audio Visual | 7 | Equipment lists, rack specs, DSP, commissioning |
| Intrusion Detection | 6 | Sensor types, panels, monitoring levels |
| Fire Alarm | 7 | FACP location, notification, monitoring, programming |

### RFI Workflow

1. After AI analysis, the **RFI Recommendations** section appears
2. The AI may flag additional RFIs specific to your project's gaps
3. **Click checkboxes** to select RFIs to include in your export
4. Use **"Select All"** to include every RFI
5. Selected RFIs are included in the JSON export for SmartPM import

### RFI Card Info

Each RFI card shows:
- **ID:** Reference number (e.g., SC-001)
- **Discipline:** Which system it applies to
- **Question:** The formal question text
- **Reason:** Why this RFI matters (cost impact, code requirement, etc.)

Click any RFI card to expand and see the full reason text.

---

## 9. SmartPM Integration

### The SmartPlans → SmartPM Pipeline

SmartPlans is the **estimation front-end**. SmartPM is the **project management back-end**. Together they form a seamless workflow:

```
SmartPlans (Estimating) → JSON Export → SmartPM Import (Operations)
```

### How to Send an Estimate to SmartPM

1. Complete your analysis in SmartPlans
2. Click **🔗 JSON — PM App Import** in the export panel
3. A `.json` file downloads to your computer
4. Give this file to the **Operations team**
5. In SmartPM, they click **📦 Import from SmartPlans**
6. SmartPM creates a new project with everything pre-populated:
   - Project metadata (name, type, location, disciplines)
   - Pricing configuration
   - Schedule of Values line items
   - Selected RFIs
   - **MDF/IDF infrastructure budgets (AI-locked)**

### What Gets Imported

| Data | Destination in SmartPM |
|---|---|
| Project name, type, location | Project Overview |
| Selected RFIs | RFIs module |
| SOV line items | Schedule of Values |
| MDF/IDF rooms & equipment | Infrastructure module |
| Cable runs with quantities | Infrastructure > Cable Runs |
| AI budget amounts | Locked budget fields (🔒) |
| Pricing config | Project settings |

> **🔒 Budget Lock:** AI-generated budgets imported into SmartPM are locked. Only Admins and Ops Managers can modify budget amounts. Project Managers can only track actual material/labor used against these budgets.

---

## 10. Tips & Best Practices

### For Best AI Results

1. **Use vector PDFs** — Always export PDFs directly from CAD software rather than scanning paper plans
2. **Include the legend** — The symbol legend page dramatically improves device count accuracy
3. **Upload all floors** — Don't skip floors, even if they're similar
4. **Include specs** — Specification documents help the AI know exact cable categories, testing standards, and product requirements
5. **Fill in project details** — The more context you provide, the better the estimate

### For Workflow Efficiency

1. **Save drafts** — Click 💾 Save after uploading documents but before running analysis to preserve your work
2. **Use Export All** — Download all three formats at once for flexibility
3. **Name projects clearly** — Use descriptive names like "City Hall Phase 2 - LV" instead of "Project 1"
4. **Check RFIs** — Review and select relevant RFIs before exporting — these help the Ops team during construction

### Common Estimating Workflow

1. Receive bid documents from GC
2. Open SmartPlans → Create new estimate
3. Upload legend + plans + specs + addenda
4. Review and adjust pricing tier/region as needed
5. Run AI analysis
6. Review the estimate for reasonableness
7. Select applicable RFIs
8. Export JSON for SmartPM + Excel for internal review + Markdown for proposal
9. Submit bid / hand off to Operations

---

## 11. Troubleshooting

### AI Analysis Failed

| Symptom | Cause | Fix |
|---|---|---|
| "Failed to analyze" error | API rate limit or large file size | Wait 30 seconds and try again |
| Very low confidence score | Low-resolution or blurry documents | Re-scan at 300+ DPI |
| Missing device counts | No symbol legend provided | Upload the legend sheet |
| "Network error" | Internet connection lost | Check connection and retry |

### File Upload Issues

| Symptom | Fix |
|---|---|
| File won't upload | Check format — PDF, PNG, JPG, DWG, DXF, IFC only |
| Upload stuck | Refresh the page and re-upload |
| File too large | Some very large CAD files may timeout — split into sheets |

### Saved Estimates Issues

| Symptom | Fix |
|---|---|
| Can't see saved estimates | Check internet connection — data is stored in the cloud |
| Estimate not saving | Make sure you've entered a project name in Step 1 |
| Old estimates showing | Click 🗑 Delete to remove unwanted estimates |

### Getting Help

For technical issues with SmartPlans, contact your IT administrator or the development team.

---

*SmartPlans is a 3D Technology Services, Inc. proprietary application. Built for the Estimating Department to streamline ELV construction estimation through AI-powered document analysis.*
