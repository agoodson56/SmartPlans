// ═══════════════════════════════════════════════════════════════
// LEARNING-LOOP REGRESSION TESTS (Wave 8, v5.128.5)
// Pins:
//   • Actuals POST auto-rolls cost_benchmarks (feedback loop on insert)
//   • Material Pricer prompt carries _priorBidCorrections + _priorBenchmarks
//   • Prior corrections block appears when corrections array has items
//   • Drift alert banner only fires when rolling line_count >= 5 + |signed| >= 10%
//   • Accuracy dashboard renders empty state + populated state
//   • /api/accuracy-dashboard endpoint exists with expected shape
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AI_ENGINE_SRC = readFileSync(join(__dirname, '..', 'ai-engine.js'), 'utf-8');
const APP_JS_SRC = readFileSync(join(__dirname, '..', 'app.js'), 'utf-8');
const ACTUALS_API_SRC = readFileSync(join(__dirname, '..', 'functions', 'api', 'estimates', '[id]', 'actuals.js'), 'utf-8');
const DASHBOARD_API_SRC = readFileSync(join(__dirname, '..', 'functions', 'api', 'accuracy-dashboard.js'), 'utf-8');

describe('Wave 8 — Actuals POST auto-rolls cost_benchmarks', () => {
    it('actuals POST handler references cost_benchmarks rollup query', () => {
        expect(ACTUALS_API_SRC).toMatch(/auto-aggregate actuals into cost_benchmarks/i);
        expect(ACTUALS_API_SRC).toMatch(/FROM project_actuals/);
        expect(ACTUALS_API_SRC).toMatch(/INSERT INTO cost_benchmarks/);
    });

    it('rollup is wrapped in try/catch so failure does not block actuals save', () => {
        expect(ACTUALS_API_SRC).toMatch(/Auto-aggregate into cost_benchmarks failed/);
    });

    it('response body includes benchmarksRefreshed count', () => {
        expect(ACTUALS_API_SRC).toMatch(/benchmarksRefreshed/);
    });

    it('aggregation is atomic (DELETE + all INSERTs in one batch)', () => {
        expect(ACTUALS_API_SRC).toMatch(/DELETE FROM cost_benchmarks/);
        expect(ACTUALS_API_SRC).toMatch(/env\.DB\.batch\(stmts\)/);
    });

    it('aggregation uses AVG/MIN/MAX per (item_name, category)', () => {
        expect(ACTUALS_API_SRC).toMatch(/AVG\(actual_unit_cost\)/);
        expect(ACTUALS_API_SRC).toMatch(/MIN\(actual_unit_cost\)/);
        expect(ACTUALS_API_SRC).toMatch(/MAX\(actual_unit_cost\)/);
        expect(ACTUALS_API_SRC).toMatch(/GROUP BY LOWER\(item_name\), category/);
    });
});

describe('Wave 8 — /api/accuracy-dashboard endpoint', () => {
    it('has GET + OPTIONS handlers with CORS + auth', () => {
        expect(DASHBOARD_API_SRC).toMatch(/export async function onRequestGet/);
        expect(DASHBOARD_API_SRC).toMatch(/export async function onRequestOptions/);
        expect(DASHBOARD_API_SRC).toMatch(/authorize\(request, env\)/);
    });

    it('returns rolling stats with line_count, accuracy_pct, variance fields', () => {
        expect(DASHBOARD_API_SRC).toMatch(/accuracy_pct/);
        expect(DASHBOARD_API_SRC).toMatch(/overall_variance_pct/);
        expect(DASHBOARD_API_SRC).toMatch(/avg_abs_variance_pct/);
        expect(DASHBOARD_API_SRC).toMatch(/avg_signed_variance_pct/);
    });

    it('returns perProject rollup with variance_pct per estimate', () => {
        expect(DASHBOARD_API_SRC).toMatch(/perProject/);
        expect(DASHBOARD_API_SRC).toMatch(/estimate_id/);
    });

    it('returns worstCategories with HAVING COUNT >= 3 filter', () => {
        expect(DASHBOARD_API_SRC).toMatch(/worstCategories/);
        expect(DASHBOARD_API_SRC).toMatch(/HAVING COUNT\(\*\) >= 3/);
    });

    it('returns winRate from bid_decisions (overall + per-project-type)', () => {
        expect(DASHBOARD_API_SRC).toMatch(/winRate/);
        expect(DASHBOARD_API_SRC).toMatch(/winRateProjectType/);
        expect(DASHBOARD_API_SRC).toMatch(/FROM bid_decisions/);
    });

    it('uses prepared statements (no SQL injection)', () => {
        expect(DASHBOARD_API_SRC).toMatch(/\.prepare\([\s\S]*?\)\.bind\(/);
    });

    it('bid_decisions query is wrapped in try/catch (table may not exist)', () => {
        expect(DASHBOARD_API_SRC).toMatch(/try \{[\s\S]*?FROM bid_decisions[\s\S]*?\} catch/);
    });

    it('accuracy_pct is clamped to [0, 100]', () => {
        expect(DASHBOARD_API_SRC).toMatch(/Math\.max\(0,\s*Math\.min\(100/);
    });
});

describe('Wave 8 — ai-engine preloads feedback-loop data', () => {
    it('runFullAnalysis fetches /api/bid-corrections at analysis start', () => {
        expect(AI_ENGINE_SRC).toMatch(/ESTIMATOR FEEDBACK LOOP PRELOAD/);
        expect(AI_ENGINE_SRC).toMatch(/\/api\/bid-corrections\?project_type=/);
    });

    it('runFullAnalysis fetches /api/benchmarks at analysis start', () => {
        expect(AI_ENGINE_SRC).toMatch(/\/api\/benchmarks/);
    });

    it('preloaded data lands on state._priorBidCorrections + state._priorBenchmarks', () => {
        expect(AI_ENGINE_SRC).toMatch(/state\._priorBidCorrections/);
        expect(AI_ENGINE_SRC).toMatch(/state\._priorBenchmarks/);
    });

    it('preload data gets copied into context so prompts can read it', () => {
        expect(AI_ENGINE_SRC).toMatch(/_priorBidCorrections: state\._priorBidCorrections/);
        expect(AI_ENGINE_SRC).toMatch(/_priorBenchmarks: state\._priorBenchmarks/);
    });

    it('preload is capped at 150 corrections + 200 benchmarks', () => {
        expect(AI_ENGINE_SRC).toMatch(/\.slice\(0, 150\)/);
        expect(AI_ENGINE_SRC).toMatch(/\.slice\(0, 200\)/);
    });
});

describe('Wave 8 — Material Pricer prompt injects the feedback blocks', () => {
    it('prompt references LEARNED FROM PAST ESTIMATOR EDITS block when corrections exist', () => {
        expect(AI_ENGINE_SRC).toMatch(/LEARNED FROM PAST ESTIMATOR EDITS/);
        expect(AI_ENGINE_SRC).toMatch(/priorCorrections\.slice\(0, 30\)/);
    });

    it('prompt references HISTORICAL UNIT-COST BENCHMARKS block when benchmarks exist', () => {
        expect(AI_ENGINE_SRC).toMatch(/HISTORICAL UNIT-COST BENCHMARKS/);
        expect(AI_ENGINE_SRC).toMatch(/benchmarks\.slice\(0, 20\)/);
    });

    it('corrections block shows field_changed (qty vs unit cost) and direction', () => {
        expect(AI_ENGINE_SRC).toMatch(/field_changed === 'qty' \? 'qty' : 'unit cost'/);
        expect(AI_ENGINE_SRC).toMatch(/'RAISED' : 'LOWERED'/);
    });

    it('benchmarks block requires "benchmark_divergence_note" on >25% deviation', () => {
        expect(AI_ENGINE_SRC).toMatch(/benchmark_divergence_note/);
        expect(AI_ENGINE_SRC).toMatch(/outside ±25%/);
    });

    it('prompt asks AI to start from CORRECTED values, not its default', () => {
        expect(AI_ENGINE_SRC).toMatch(/start at the CORRECTED values/);
    });
});

describe('Wave 8 — Drift alert + Accuracy dashboard on Results page', () => {
    it('Step 7 reserves two divs for async-loaded Wave 8 panels', () => {
        expect(APP_JS_SRC).toMatch(/id="wave8-drift-alert"/);
        expect(APP_JS_SRC).toMatch(/id="wave8-accuracy-dashboard"/);
    });

    it('_loadWave8Panels hits /api/accuracy-dashboard', () => {
        expect(APP_JS_SRC).toMatch(/_loadWave8Panels/);
        expect(APP_JS_SRC).toMatch(/\/api\/accuracy-dashboard/);
    });

    it('drift alert only fires when line_count >= 5 and |signed| >= threshold', () => {
        expect(APP_JS_SRC).toMatch(/rolling\.line_count < 5/);
        // Wave 10 L3: threshold is now configurable via state.driftAlertThresholdPct
        expect(APP_JS_SRC).toMatch(/if \(abs < threshold\) return ''/);
    });

    it('drift alert distinguishes OVER-BID vs UNDER-BID direction (Wave 10 C5: signs corrected)', () => {
        expect(APP_JS_SRC).toMatch(/OVER-BID/);
        expect(APP_JS_SRC).toMatch(/UNDER-BID/);
    });

    it('Wave 10 C5: positive signed variance → UNDER-BID label (actuals ran higher than bid = we under-bid)', () => {
        // This pins the sign fix. signed > 0 → UNDER-BID (used to say OVER-BID, which was catastrophically wrong)
        expect(APP_JS_SRC).toMatch(/const direction = signed > 0 \? 'UNDER-BID' : 'OVER-BID'/);
    });

    it('Wave 10 C5: advice text tells estimator to ADD buffer (not trim) when under-bidding historically', () => {
        // Under-bid → need to ADD money to protect margin
        expect(APP_JS_SRC).toMatch(/ADDING.*buffer to protect margin/);
        // Over-bid → need to TRIM to stay competitive
        expect(APP_JS_SRC).toMatch(/TRIMMING.*stay competitive/);
    });

    it('Wave 10 L3: drift threshold is configurable via state.driftAlertThresholdPct', () => {
        expect(APP_JS_SRC).toMatch(/state\.driftAlertThresholdPct/);
    });

    it('dashboard renders empty state when no actuals yet', () => {
        expect(APP_JS_SRC).toMatch(/no data yet/i);
        expect(APP_JS_SRC).toMatch(/Accuracy Dashboard/);
    });

    it('dashboard shows rolling accuracy %, overall variance, win rate', () => {
        expect(APP_JS_SRC).toMatch(/Rolling accuracy/);
        expect(APP_JS_SRC).toMatch(/Overall variance/);
        expect(APP_JS_SRC).toMatch(/Win rate/);
    });

    it('dashboard shows worst-drift categories pill list', () => {
        expect(APP_JS_SRC).toMatch(/Worst-drift categories/);
    });

    it('accuracy color codes: green >=96, yellow >=90, red below', () => {
        expect(APP_JS_SRC).toMatch(/acc >= 96.*'#22c55e'/);
        expect(APP_JS_SRC).toMatch(/acc >= 90.*'#eab308'/);
    });
});

describe('Wave 8 — Client-side bid-corrections capture (v5.127.1, still in place)', () => {
    it('_logBidCorrection POSTs to /api/bid-corrections', () => {
        expect(APP_JS_SRC).toMatch(/_logBidCorrection/);
        expect(APP_JS_SRC).toMatch(/\/api\/bid-corrections/);
    });

    it('_logBidCorrection captures both qty and unit_cost changes', () => {
        expect(APP_JS_SRC).toMatch(/field_changed: 'qty'/);
        expect(APP_JS_SRC).toMatch(/field_changed: 'unit_cost'/);
    });

    it('_logBidCorrection is fire-and-forget (queueMicrotask + no await)', () => {
        expect(APP_JS_SRC).toMatch(/queueMicrotask\(\(\) =>/);
    });

    it('_logBidCorrection logs project_type + discipline for Material Pricer lookup', () => {
        expect(APP_JS_SRC).toMatch(/project_type:/);
        expect(APP_JS_SRC).toMatch(/discipline,/);
    });
});
