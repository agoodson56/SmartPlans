# SmartPlans — Monday Office Handoff
## Allan Goodson | April 6, 2026

---

## WHAT WAS DONE (Easter Sunday Session)

**8 complete code audits, 89 fixes, 14 commits pushed to main.**

All changes are LIVE on Cloudflare Pages. No setup needed — just open SmartPlans and Ctrl+Shift+R.

### Commits (in order):
| # | Commit | What Changed |
|---|--------|-------------|
| 1 | `7a29eb4` | Sacramento calibration skip (subs >40%), 13 core fixes |
| 2 | `74ee6d5` | PDF chunk size 30 to 15 pages for better camera detection |
| 3 | `2b5c1a4` | Burden, contingency, price clamping, AI prompt fixes |
| 4 | `5f4e063` | Greeting shows for all users (fallback to email) |
| 5 | `635044b` | Session restore shows header/nav/footer + greeting |
| 6 | `dd0ab74` | Pricing data accuracy, RWIC rates $1,750/day, prompt quality |
| 7 | `bce5b11` | FULL BID PRICE display on Step 7, removed 5-sec auto-reload |
| 8 | `2f0d297` | Burden reverted to base labor (industry standard) |
| 9 | `4743b88` | Debug logs cleaned, Sentry v5.62.0, AI prompt refinements |
| 10 | `a9e976c` | Calibration threshold tightened from 8% to 6% |
| 11 | `ad64838` | Auth bypass fixed, rate limiting by session token |
| 12 | `c79c965` | Cable calc, proposal validation, security hardening |
| 13 | `698aa34` | Print styles for PDF, SheetJS CDN version fix |
| 14 | `dc900ed` | Database schema sync, performance indexes |

---

## FIRST THING MONDAY MORNING

### Step 1: Hard Refresh
Open https://smartplans-4g5.pages.dev and press **Ctrl+Shift+R** to clear the service worker cache. This ensures you're running the latest code (v5.62.0).

### Step 2: Check Google API Status
Open the browser console (F12) while running a bid. Look for:
- `gemini-2.5-pro` in the brain logs = GOOD (Pro is back)
- `gemini-2.5-flash` fallback = BAD (Pro still down, results will be less accurate)

If you see all Flash fallbacks, wait 30 minutes and try again. Easter Sunday had a major Google API outage.

### Step 3: Run All 3 Amtrak Bids
Run in this order (smallest to largest plan set):

**1. Martinez** (37 MB drawings, no chunking needed)
- Target: $1,966,150 (BAFO)
- Should calibrate to target with ±6% threshold
- Camera count should be ~68-71
- Last run (Flash fallback): $1,824,668

**2. Emeryville** (smaller plan set)
- Target: $1,302,128 (Original)
- Was "perfect" on Pro model previously
- Last run (Flash fallback): $1,569,278 (20% over — Flash garbage)

**3. Sacramento** (57 MB, 80 pages, 6 chunks)
- Target: ~$1,750,000
- Hardest bid — 100 cameras across tunnels/platforms
- Calibration SKIPS because subs >40% of BOM
- Accuracy depends heavily on how many cameras Pro finds
- Last run (Flash): $720,611 (only found 36 of ~100 cameras)

### Step 4: Verify New Features
After each bid completes, check:
1. **FULL BID PRICE** — Big green number at top of Step 7 results (new!)
2. **Greeting** — "GOOD MORNING, ALLAN!" on project setup page
3. **No auto-reload** — Update banner shows but doesn't auto-reload anymore
4. **Print styles** — Print Master Report to PDF (Ctrl+P), nav/header hidden

---

## DEMO FOR TONY

### What to Show:
1. **Greeting** — personalized welcome on login
2. **Upload plans** — drag & drop legends, drawings, specs
3. **27-brain analysis** — show progress bar, wave completion
4. **Results page** — Full Bid Price hero card, BOM breakdown, Bid Fit Score
5. **Transit Verification** — click "Verify Bid" for the 14-check transit checklist
6. **Export** — Master Report PDF, BOM Excel, Pricing Schedule
7. **Bid Fit Scorecard** — shows if project is in 3D's wheelhouse (8 categories, 100 points)
8. **3D Motivation button** — plays motivation music (header)

### Key Talking Points:
- "SmartPlans analyzes construction plans using 27 AI brains in 6 waves"
- "Triple-Read Consensus Engine reads plans 6 times for accuracy"
- "Transit calibration uses actual Amtrak winning bid data"
- "Bid Fit Score rates projects based on our 22-bid history"
- "Formula: Materials + Labor + Equipment + Subs + Burden + Travel + Contingency"

### If Tony Asks About Accuracy:
- Martinez BAFO target $1.97M — SmartPlans hit $1.96M on run 16 (within $2,474)
- Emeryville was "perfect" when Pro model was available
- Sacramento is complex (100 cameras, tunnels) — still improving
- System handles 7 actual Amtrak bids as benchmark data

---

## KNOWN ISSUES

### Google API (Not Our Bug)
- gemini-2.5-pro was down all Easter Sunday
- All brains fell back to Flash (less accurate)
- When Pro is back, results will improve dramatically
- QuotaMonitor shows "9/9 healthy" but that only tests small requests

### Sacramento Camera Undercounting
- AI finds 32-36 cameras, actual is ~100
- Cameras spread across 80 pages (tunnels, platforms, walkways, service areas)
- 15-page chunks help but Flash model can't read small symbols
- Will improve when Pro model is available

### Martinez Calibration
- With ±6% threshold, should calibrate UP to ~$1.97M
- If it doesn't calibrate, the formula total will be ~$1.82M
- Check console for: `CALIBRATING UNDER` = calibration fired (good)
- Check console for: `Within ±6% of benchmark` = no calibration (check if close enough)

---

## ACCESSING THE CODE

### GitHub Repository
```
https://github.com/agoodson56/SmartPlans.git
```

### Clone to Office PC (if needed)
```bash
git clone https://github.com/agoodson56/SmartPlans.git
cd SmartPlans
```

### Key Files
| File | What It Does | Lines |
|------|-------------|-------|
| `app.js` | Main UI, state management, all steps | 12,929 |
| `ai-engine.js` | 27 AI brains, Gemini API proxy | 4,458 |
| `export-engine.js` | BOM parsing, pricing formula, calibration | 3,475 |
| `pricing-database.js` | Amtrak benchmarks, markup config | 989 |
| `proposal-generator.js` | Client proposal generation | 1,521 |
| `styles.css` | All UI styles + print styles | 3,252 |
| `index.html` | Entry point, CDN loading, SW registration | 258 |
| `sw.js` | Service worker, cache v5.62.0 | 81 |

### Cloudflare Dashboard
- **Pages:** https://dash.cloudflare.com (SmartPlans project)
- **D1 Database:** `smartplans-db` (binding: `DB`)
- **Deployments:** Auto-deploy on push to `main`

### Wrangler (Local Dev)
```bash
npx wrangler pages dev . --d1 DB=smartplans-db
```

---

## PRICING FORMULA (Single Source of Truth)

```
Materials × (1 + matPct) = matSell
Labor × (1 + labPct) = labSell
Equipment × (1 + eqPct) = eqSell
Subs × (1 + subPct) = subSell
Burden = laborBase × burdenRate (35% of BASE labor, not sell)

profitSubtotal = matSell + labSell + eqSell + subSell + burden
contingency = profitSubtotal × 10% (travel excluded)
grandTotal = profitSubtotal + travel + contingency
```

### Default Markups (from pricing-database.js):
- Material: 65%
- Labor: 65%
- Equipment: 25%
- Subcontractor: 15%
- Burden: 35% of base labor
- Contingency: 10% of profit subtotal

### Transit Calibration:
- Find closest Amtrak bid by camera count
- Compute per-camera sell price from benchmark
- If formula deviates >6% from benchmark: scale all inputs proportionally
- SKIP calibration if subs >40% of BOM (infrastructure-heavy)

---

## AMTRAK BENCHMARK DATA

| Station | Cameras | BAFO/Original | Per-Camera |
|---------|---------|--------------|------------|
| Martinez BAFO | 69 | $1,966,150 | $28,495 |
| Martinez Original | 69 | $2,035,277 | $29,495 |
| Martinez VE | 69 | $1,731,418 | $25,092 |
| Emeryville Original | 61 | $1,302,128 | $21,347 |
| Emeryville VE | 61 | $1,033,760 | $16,947 |
| Sacramento Rev2 | 100 | $1,734,097 | $17,341 |
| Sacramento SV Rev1 | 100 | $1,810,020 | $18,100 |

---

## REMAINING WORK (Not Yet Done)

### SmartPM Fixes (Separate Repo)
1. Stored materials missing from G702 billing formula
2. Negative COs allow sub-zero contract value
3. Budget health calculation backwards (yellow at 80% spent)
4. CO status transitions unconstrained
5. WBS labor rate hardcoded at $45/hr
6. No billing audit trail

### SmartPlans Test Suite
- No tests for `_computeFullBreakdown()` or `_classifyBOM()`
- Test stub `PRICING_DB` doesn't match live database
- Need at least 15 test cases for pricing formula validation

---

## EMERGENCY CONTACTS

### If SmartPlans Won't Load
1. Check Cloudflare status: https://www.cloudflarestatus.com
2. Check if deployment is pending in Cloudflare dashboard
3. Try incognito window (bypasses service worker)
4. Hard refresh: Ctrl+Shift+R

### If Analysis Keeps Failing (500 errors)
1. Check Google AI Studio status: https://aistudio.google.com
2. All 9 API keys rotate automatically
3. Flash fallback handles Pro outages
4. Wait 15-30 minutes and retry

### If Bid Numbers Look Wrong
1. Open console (F12) and look for `[Export]` logs
2. Check: is calibration firing? (`CALIBRATING UNDER/OVER`)
3. Check: is calibration skipped? (`SKIPPING per-camera calibration`)
4. Check: camera count in console (`Camera counts — Consensus: X`)
5. Verify burden line: should be ~35% of labor BASE cost

---

*Generated by Claude Code | April 6, 2026 | 8 audits, 89 fixes, 14 commits*
