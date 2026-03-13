# SmartPlans — System Limits & Specifications

## File Upload Limits

| Parameter | Limit |
|-----------|-------|
| **Max file size (per file)** | 2 GB (via Gemini File API) |
| **Max total payload (all files combined)** | 4 GB |
| **Files ≤ 15 MB** | Sent inline as base64 (fast, no upload step) |
| **Files > 15 MB** | Uploaded to Gemini File API server-side (supports up to 2 GB) |
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
| **API keys** | 18 (GEMINI_KEY_0 through GEMINI_KEY_17, stored as Cloudflare secrets) |
| **Flash model** | Gemini 2.5 Flash (lightweight brains) |
| **Pro model** | Gemini 3.1 Pro Preview (deep reasoning brains) |
| **Accuracy model** | Gemini 2.5 Pro (report writing) |
| **Flash brain timeout** | 2.5 minutes per brain |
| **Pro brain timeout** | 5 minutes per brain |
| **Legacy analysis timeout** | 2 minutes |
| **Max retries per brain** | 4 attempts |
| **Retry delay** | 1.5 sec (exponential backoff up to ~12 sec) |
| **Estimated total processing time** | 7–8 minutes for a full analysis |

---

## 6-Read Consensus Architecture

### Wave 0 — Symbol & Legend Analysis
| Brain | ID | Model | Purpose |
|-------|----|-------|---------|
| Legend Decoder | 0 | Pro | Interprets symbol legend/key |

### Wave 1 — First Read (5 brains in parallel)
| Brain | ID | Model | Purpose |
|-------|----|-------|---------|
| Symbol Scanner | 1 | Pro | Counts and categorizes symbols on plans |
| Code Compliance | 2 | Pro | Checks NEC/NFPA/BICSI code requirements |
| MDF/IDF Analyzer | 3 | Pro | Analyzes telecom rooms and infrastructure |
| Cable & Pathway | 4 | Flash | Cable quantities, pathways, and conduit |
| Special Conditions | 5 | Flash | Site-specific conditions and constraints |

### Wave 1.5 — Second Read (3 brains in parallel)
| Brain | ID | Model | Purpose |
|-------|----|-------|---------|
| Shadow Scanner | 6 | Pro | Room-by-room re-scan for missed items |
| Discipline Deep-Dive | 7 | Pro | Deep analysis per discipline |
| Quadrant Scanner | 8 | Pro | Systematic area-by-area scan |

### Wave 1.75 — Consensus & Targeted Re-Scan
| Brain | ID | Model | Purpose |
|-------|----|-------|---------|
| Consensus Arbitrator | 9 | Pro | Resolves conflicts between first and second reads |
| Targeted Re-Scanner | 10 | Pro | Focuses on areas flagged for re-scan (3rd read) |

### Wave 2 — Cost Engine (3 brains in parallel)
| Brain | ID | Model | Purpose |
|-------|----|-------|---------|
| Material Pricer | 11 | Pro | Applies current material pricing |
| Labor Calculator | 12 | Pro | Calculates labor hours and rates |
| Financial Engine | 13 | Pro | Compiles complete financial model & SOV |

### Wave 2.5 — Reverse Verification
| Brain | ID | Model | Purpose |
|-------|----|-------|---------|
| Reverse Verifier | 14 | Pro | Cross-checks BOQ against plans (backward validation) |

### Wave 3 — Adversarial Audit (2 brains in parallel)
| Brain | ID | Model | Purpose |
|-------|----|-------|---------|
| Cross Validator | 15 | Pro | Cross-checks all brain outputs for consistency |
| Devil's Advocate | 16 | Pro | Challenges assumptions and catches errors |

### Wave 3.5 — 4th & 5th Read (2 brains in parallel)
| Brain | ID | Model | Purpose |
|-------|----|-------|---------|
| Detail Verifier | 18 | Pro | Zooms into flagged areas, counts each device twice |
| Cross-Sheet Analyzer | 19 | Pro | Compares adjacent sheets for boundary overlaps & missed items |

### Wave 3.75 — 6th Read (Final Reconciliation)
| Brain | ID | Model | Purpose |
|-------|----|-------|---------|
| Final Reconciliation | 20 | Pro | Complete sweep comparing all 5 prior reads, produces authoritative final counts |

### Wave 4 — Final Report
| Brain | ID | Model | Purpose |
|-------|----|-------|---------|
| Report Writer | 17 | Pro | Generates comprehensive bid package with material/labor tables |

---

## Output Capabilities

| Feature | Details |
|---------|---------|
| **Material Takeoff** | Itemized with unit cost, extended cost, markup %, sell price |
| **Labor Breakdown** | By phase with hours, rate, labor cost, markup %, sell price |
| **Schedule of Values** | AIA G703 format |
| **Export formats** | JSON (PM app), Excel, Markdown, Export All |
| **Professional Proposal** | Word .doc download with cover page, 8 sections, TOC, signature block |
| **Proposal company info** | 3D Technology Services Inc., Justin Whitton |
| **Proposal branding** | Gold/Teal color scheme matched to 3dtsi.com |

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
- Large file uploads (>15 MB) show progress indicator

---

## Cloudflare Infrastructure

| Component | Details |
|-----------|---------|
| **Hosting** | Cloudflare Pages |
| **Database** | Cloudflare D1 (SQLite) |
| **API Proxy** | Cloudflare Worker at `/api/ai/invoke` |
| **File Upload Proxy** | Cloudflare Worker at `/api/ai/upload` (Gemini File API) |
| **API Key Storage** | Cloudflare environment secrets (GEMINI_KEY_0 – GEMINI_KEY_17) |
| **Saved Estimates** | Stored in D1 database, accessible from any office |

---

## Security

| Feature | Details |
|---------|---------|
| **API keys** | Never in client code — stored as Cloudflare encrypted secrets |
| **Proxy architecture** | All AI calls route through server-side Cloudflare Workers |
| **File uploads** | Uploaded server-side via proxy — API keys never reach browser |
| **CORS** | Enabled for cross-origin requests |
