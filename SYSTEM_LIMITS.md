# SmartPlans — System Limits & Specifications

## File Upload Limits

| Parameter | Limit |
|-----------|-------|
| **Max file size (per file)** | 200 MB |
| **Max total payload (all files combined)** | 400 MB |
| **Best format for plans** | PDF (highest accuracy) |
| **Supported plan formats** | PDF, DWG, DXF, IFC, RVT, PNG, JPG, JPEG, TIF, TIFF |
| **Supported spec formats** | PDF, DOC, DOCX, TXT |
| **Supported addenda formats** | PDF, DOC, DOCX, PNG, JPG, JPEG, TIF, TIFF |

> **Tip:** PDF files produce the best results. DWG/DXF/IFC/RVT are acceptable but not ideal — convert to PDF for maximum accuracy.

---

## AI Processing

| Parameter | Limit |
|-----------|-------|
| **AI brains (parallel processors)** | 21 |
| **Processing waves** | 10 (sequential waves, brains run in parallel within each wave) |
| **Plan reading passes** | 6 (6-Read Consensus architecture) |
| **API keys** | 18 (one per brain for true parallelism) |
| **Flash model** | Gemini 2.5 Flash (lightweight brains) |
| **Pro model** | Gemini 3.1 Pro Preview (deep reasoning brains) |
| **Accuracy model** | Gemini 2.5 Pro (report writing) |
| **Flash brain timeout** | 2.5 minutes per brain |
| **Pro brain timeout** | 5 minutes per brain |
| **Legacy analysis timeout** | 2 minutes |
| **Max retries per brain** | 4 attempts |
| **Retry delay** | 1.5 sec (exponential backoff up to ~12 sec) |

---

## AI Brain Architecture

### Wave 0 — Symbol & Legend Analysis
| Brain | Model | Purpose |
|-------|-------|---------|
| Legend Decoder | Flash | Interprets symbol legend/key |

### Wave 1 — First Read (5 brains in parallel)
| Brain | Model | Purpose |
|-------|-------|---------|
| Symbol Scanner | Flash | Counts and categorizes symbols on plans |
| Code Compliance | Flash | Checks NEC/NFPA/BICSI code requirements |
| MDF/IDF Analyzer | Pro | Analyzes telecom rooms and infrastructure |
| Cable & Pathway | Pro | Cable quantities, pathways, and conduit |
| Special Conditions | Flash | Site-specific conditions and constraints |

### Wave 1.5 — Second Read (3 brains in parallel)
| Brain | Model | Purpose |
|-------|-------|---------|
| Shadow Scanner | Flash | Catches items missed in first read |
| Discipline Deep-Dive | Flash | Deep analysis per discipline |
| Quadrant Scanner | Flash | Systematic area-by-area scan |

### Wave 1.75 — Consensus
| Brain | Model | Purpose |
|-------|-------|---------|
| Consensus Arbitrator | Pro | Resolves conflicts between first and second reads |

### Wave 2 — Targeted Analysis (3 brains in parallel)
| Brain | Model | Purpose |
|-------|-------|---------|
| Targeted Re-Scanner | Flash | Focuses on areas flagged for re-scan |
| Material Pricer | Flash | Applies current material pricing |
| Labor Calculator | Flash | Calculates labor hours and rates |

### Wave 2.5 — Financial
| Brain | Model | Purpose |
|-------|-------|---------|
| Financial Engine | Pro | Compiles complete financial model |

### Wave 3 — Adversarial Audit (2 brains in parallel)
| Brain | Model | Purpose |
|-------|-------|---------|
| Cross Validator | Pro | Cross-checks all brain outputs for consistency |
| Devil's Advocate | Pro | Challenges assumptions and catches errors |

### Wave 4 — Final Report
| Brain | Model | Purpose |
|-------|-------|---------|
| Report Writer | Pro | Generates comprehensive bid package with material/labor tables |

---

## Output Capabilities

| Feature | Details |
|---------|---------|
| **Material Takeoff** | Itemized with unit cost, extended cost, markup %, sell price |
| **Labor Breakdown** | By phase with hours, rate, labor cost, markup %, sell price |
| **Schedule of Values** | AIA G703 format |
| **Export formats** | JSON (PM app), Excel, Markdown, Export All |
| **Professional Proposal** | Word .doc download with cover page, 8 sections, signature block |
| **Proposal company info** | 3D Technology Services Inc., Justin Whitton |

---

## Markup Defaults

| Category | Default Markup |
|----------|---------------|
| Material | 15% |
| Labor | 25% |
| Equipment | 10% |
| Subcontractor | 12% |

> Markup percentages are editable in the Project Setup step before analysis.

---

## Browser Requirements

- Modern browser with JavaScript enabled (Chrome, Edge, Firefox, Safari)
- Popup blocker does **not** affect proposal download (downloads as .doc file)
- Internet connection required for AI processing
- Works on all devices — desktop, laptop, tablet

---

## Cloudflare Infrastructure

| Component | Details |
|-----------|---------|
| **Hosting** | Cloudflare Pages |
| **Database** | Cloudflare D1 (SQLite) |
| **API Proxy** | Cloudflare Worker at `/api/ai/invoke` |
| **API Key Storage** | Cloudflare environment secrets (GEMINI_KEY_0 – GEMINI_KEY_17) |
| **Saved Estimates** | Stored in D1 database, accessible from any office |
