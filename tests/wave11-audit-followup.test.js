// ═══════════════════════════════════════════════════════════════
// WAVE 11 REGRESSION TESTS (v5.128.8)
// Pins the audit-driven fixes to Wave 10's code:
//   • C1+C2: Claude cross-check skips when fileData refs or >25MB inline
//   • C3:    ZOOM_SCANNER schema now requires grand_totals
//   • C4:    Role alternation enforced by final-pass loop (not pair-wise)
//   • C5:    Clarification ack key uses UUID, not 'current' fallback
//   • C6:    CA wage incomplete BLOCKS export (hard gate)
//   • C7:    Labor feedback filter tightened — no junk matches
//   • H1:    Labor Calculator reads _unrePricedMaterialPricer clean copy
//   • H2:    Unverified NECA rows skip override (trust AI)
//   • M1-M15: Sanitization, normalization, state cleanup, etc.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadAiEngine } from './helpers/load-ai-engine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AI_ENGINE_SRC = readFileSync(join(__dirname, '..', 'ai-engine.js'), 'utf-8');
const APP_JS_SRC = readFileSync(join(__dirname, '..', 'app.js'), 'utf-8');
const CLAUDE_PROXY_SRC = readFileSync(join(__dirname, '..', 'functions', 'api', 'ai', 'claude-invoke.js'), 'utf-8');
const PRICING_SERVICE_SRC = readFileSync(join(__dirname, '..', 'pricing-service.js'), 'utf-8');
// proposal-generator-v2.js was removed in the Fortune 500 cleanup — V1 is the
// only proposal generator now (powers both Full + Executive proposal buttons).
const PROPOSAL_V1_SRC = readFileSync(join(__dirname, '..', 'proposal-generator.js'), 'utf-8');
const FORMULA_3D_SRC = readFileSync(join(__dirname, '..', 'formula-engine-3d.js'), 'utf-8');

let SmartBrains, SmartPlansPricing;
beforeAll(() => {
    SmartBrains = loadAiEngine();
    const caSrc = readFileSync(join(__dirname, '..', 'prevailing-wages-ca.js'), 'utf-8');
    const natSrc = readFileSync(join(__dirname, '..', 'prevailing-wages-national.js'), 'utf-8');
    const pricingSrc = readFileSync(join(__dirname, '..', 'pricing-service.js'), 'utf-8');
    const PRICING_DB = { regionalMultipliers: { national_average: 1.0 } };
    const fn = new Function('window', 'PRICING_DB',
        caSrc + '\n' + natSrc + '\n' + pricingSrc +
        '\nreturn SmartPlansPricing;');
    SmartPlansPricing = fn({}, PRICING_DB);
});

describe('Wave 11 C1 + C2 — Claude cross-check feasibility guards', () => {
    it('skips cross-check when fileData refs present (Claude cannot resolve them)', () => {
        expect(AI_ENGINE_SRC).toMatch(/Cross-check feasibility guards/);
        expect(AI_ENGINE_SRC).toMatch(/fileDataCount = fileParts\.filter/);
        expect(AI_ENGINE_SRC).toMatch(/fileData-refs-not-resolvable-by-secondary/);
    });

    it('skips cross-check when inline payload exceeds 25 MB', () => {
        expect(AI_ENGINE_SRC).toMatch(/CROSS_CHECK_MAX_INLINE_BYTES/);
        expect(AI_ENGINE_SRC).toMatch(/25 \* 1024 \* 1024/);
        expect(AI_ENGINE_SRC).toMatch(/inline-payload-.*MB-exceeds/);
    });

    it('stamps _crossCheckSkipped with skip reason on parsed result', () => {
        expect(AI_ENGINE_SRC).toMatch(/parsed\._crossCheckSkipped/);
    });
});

describe('Wave 11 C3 — ZOOM_SCANNER schema requires grand_totals', () => {
    it('ZOOM_SCANNER schema includes grand_totals for Wave 4 cascade target', () => {
        expect(AI_ENGINE_SRC).toMatch(/ZOOM_SCANNER:\s*\['quadrant_counts',\s*'zoom_findings',\s*'grand_totals'\]/);
    });
});

describe('Wave 11 C4 — Role alternation final-pass loop', () => {
    it('claude-invoke uses a final-pass loop (not pair-wise) for alternation', () => {
        expect(CLAUDE_PROXY_SRC).toMatch(/Final-pass alternation enforcement/);
        expect(CLAUDE_PROXY_SRC).toMatch(/const alternated = \[\]/);
        expect(CLAUDE_PROXY_SRC).toMatch(/for \(const msg of messages\)/);
    });

    it('enforces first message is role=user', () => {
        expect(CLAUDE_PROXY_SRC).toMatch(/alternated\[0\]\.role !== 'user'/);
    });

    it('handles 3+ consecutive same-role turns (not just pairs)', () => {
        // Verified by structure: final-pass iterates EVERY adjacency, not pair-wise
        expect(CLAUDE_PROXY_SRC).toMatch(/prev && prev\.role === msg\.role/);
    });
});

describe('Wave 11 C5 — UUID-based clarification ack key', () => {
    it('app.js generates UUID bid key instead of falling back to "current"', () => {
        expect(APP_JS_SRC).toMatch(/state\._clarificationAckBidId/);
        expect(APP_JS_SRC).toMatch(/crypto\.randomUUID/);
    });

    it('bid key never defaults to the shared "current" value', () => {
        // Pre-Wave-11: ${estimateId} fell back to 'current' shared across bids
        // Wave 11: the 'current' literal is GONE
        expect(APP_JS_SRC).not.toMatch(/\|\| 'current';\s*\n\s*const ackKey/);
    });
});

describe('Wave 11 C6 — CA wage incomplete hard export gate', () => {
    it('_canExportProposal blocks when _wageResolutionIncomplete is set', () => {
        // Post-Fortune-500-removal: the gate lives in _canExportProposal() which
        // both Full Proposal + Executive Proposal buttons call before rendering.
        expect(APP_JS_SRC).toMatch(/Prevailing-wage completeness gate/);
        expect(APP_JS_SRC).toMatch(/state\._wageResolutionIncomplete/);
        expect(APP_JS_SRC).toMatch(/EXPORT BLOCKED.*Prevailing wage/);
        expect(APP_JS_SRC).toMatch(/_canExportProposal/);
    });

    it('gate message explains the $60-100k underbid risk', () => {
        expect(APP_JS_SRC).toMatch(/\$60-100k\+/);
    });
});

describe('Wave 11 C7 — Labor feedback filter tightened', () => {
    it('filter no longer uses loose /hour/i regex', () => {
        // Pre-Wave-11: `c.field_changed === 'hours_per_unit' || c.field_changed === 'labor_hours' || /hour/i.test(...)`
        // Wave 11: tighter match only, no /hour/i regex
        const block = AI_ENGINE_SRC.match(/Labor-hour feedback block is DORMANT[\s\S]{0,800}/);
        expect(block).toBeTruthy();
        expect(block[0]).not.toMatch(/\/hour\/i\.test/);
    });

    it('dormancy comment explains the condition for activation', () => {
        // Regex with /s flag or [\s\S] for multiline match across a comment that wraps
        expect(AI_ENGINE_SRC).toMatch(/DORMANT until[\s\S]{0,100}BOM-edit UI/);
    });
});

describe('Wave 11 H1 — Labor Calculator reads clean MATERIAL_PRICER copy', () => {
    it('Labor Calculator prompt references context.wave2._unrePricedMaterialPricer', () => {
        expect(AI_ENGINE_SRC).toMatch(/context\.wave2\?\._unrePricedMaterialPricer/);
    });

    it('Wave 7 post-process writes clean copy to context (not just wave2Results)', () => {
        expect(AI_ENGINE_SRC).toMatch(/context\.wave2\._unrePricedMaterialPricer = cleanOriginal/);
    });
});

describe('Wave 11 H2 — Unverified NECA rows skip override', () => {
    it('NECA rows card_reader, wireless_ap, facp have verified:false', () => {
        expect(PRICING_SERVICE_SRC).toMatch(/'card_reader':\s*\{[^}]*verified:\s*false/);
        expect(PRICING_SERVICE_SRC).toMatch(/'wireless_ap':\s*\{[^}]*verified:\s*false/);
        expect(PRICING_SERVICE_SRC).toMatch(/'facp':\s*\{[^}]*verified:\s*false/);
    });

    it('resolveLaborHours surfaces verified flag', () => {
        expect(PRICING_SERVICE_SRC).toMatch(/verified,?\s*\n?\s*\}/);
        const r = SmartPlansPricing.resolveLaborHours('card_reader');
        expect(r.source).toBe('neca_standard');
        expect(r.verified).toBe(false);
    });

    it('reconcileLaborHours does NOT override AI when source is unverified NECA', () => {
        // card_reader NECA = 2.1, simulate AI saying 3.5 (reality) with 25% tolerance
        const laborResult = {
            phases: [{ items: [{ item: 'Card Reader', qty: 50, hours_per_unit: 3.5 }] }],
        };
        const stats = SmartPlansPricing.reconcileLaborHours(laborResult, { tolerance: 0.25 });
        // AI value preserved (3.5), NOT overridden down to 2.1
        expect(laborResult.phases[0].items[0].hours_per_unit).toBe(3.5);
        expect(stats.overridden).toBe(0);
        expect(stats.unverifiedSkipped).toBeGreaterThan(0);
    });

    it('reconcileLaborHours DOES override AI when source is verified NECA', () => {
        // smoke_detector is verified (no verified:false flag) → should override
        const laborResult = {
            phases: [{ items: [{ item: 'Smoke Detector', qty: 20, hours_per_unit: 5.0 }] }],
        };
        const stats = SmartPlansPricing.reconcileLaborHours(laborResult, { tolerance: 0.25 });
        // NECA smoke_detector = 1.3, diff = (5-1.3)/5 = 74% > 25% → override
        expect(laborResult.phases[0].items[0].hours_per_unit).toBeCloseTo(1.3, 2);
        expect(stats.overridden).toBe(1);
    });

    it('labor items get _laborHoursUnverified flag when source is unverified NECA', () => {
        const laborResult = {
            phases: [{ items: [{ item: 'Card Reader', qty: 50, hours_per_unit: 3.5 }] }],
        };
        SmartPlansPricing.reconcileLaborHours(laborResult);
        expect(laborResult.phases[0].items[0]._laborHoursUnverified).toBe(true);
    });
});

describe('Wave 11 M3 — provider override try/finally', () => {
    it('app.js wraps runFullAnalysis in try/finally for provider override cleanup', () => {
        expect(APP_JS_SRC).toMatch(/try\/finally ensures the provider override/);
        expect(APP_JS_SRC).toMatch(/SmartBrains\._providerOverride = null/);
    });
});

describe('Wave 11 M6 — draft + claude failover flags sync', () => {
    it('claude failover branch also sets _draftModeActive', () => {
        const block = AI_ENGINE_SRC.match(/FAILING OVER to Claude[\s\S]{0,500}/);
        expect(block).toBeTruthy();
        expect(block[0]).toMatch(/state\._draftModeActive = true/);
    });
});

describe('Wave 11 M9 — clarification fingerprint covers PDF-extracted punctuation', () => {
    it('normalizes smart quotes, ellipsis, middle dot, NBSP', () => {
        expect(APP_JS_SRC).toMatch(/\\u00A0/);
        expect(APP_JS_SRC).toMatch(/\\u2018\\u2019\\u201C\\u201D/);
        expect(APP_JS_SRC).toMatch(/\\u2026\\u00B7/);
    });
});

describe('Wave 11 M1 + M2 + M11 — expanded prompt sanitization', () => {
    it('strips markdown-injection characters + newlines + smart quotes', () => {
        expect(AI_ENGINE_SRC).toMatch(/Wave 11 M1 \+ M2 \+ M11/);
        expect(AI_ENGINE_SRC).toMatch(/\\r\\n\\t/);
    });

    it('skips the bullet entirely when sanitized name is empty', () => {
        expect(AI_ENGINE_SRC).toMatch(/if \(!itemClean\) return ''/);
        expect(AI_ENGINE_SRC).toMatch(/\.filter\(Boolean\)\.join/);
    });
});

describe('Wave 11 M14 — Wave 10 state fields cleared on new bid', () => {
    it('startNewBid clears all Wave 10-added state flags', () => {
        expect(APP_JS_SRC).toMatch(/Wave 11 M14.*clear Wave 10 state fields/);
        expect(APP_JS_SRC).toMatch(/state\._draftModeActive = false/);
        expect(APP_JS_SRC).toMatch(/state\._claudeFailoverActive = false/);
        expect(APP_JS_SRC).toMatch(/state\._livePricingStats = null/);
        expect(APP_JS_SRC).toMatch(/state\._wageResolutionIncomplete = false/);
        expect(APP_JS_SRC).toMatch(/state\._clarificationAckBidId = null/);
    });
});

describe('Wave 11 M15 — calibration flags always initialized at result construction', () => {
    it('formula-engine-3d.js result literal includes _calibrated + _calibrationRejected', () => {
        expect(FORMULA_3D_SRC).toMatch(/_calibrated:\s*false,\s*\n\s*_calibrationRejected:\s*false/);
    });
});

describe('Wave 11 M7 + M8 — L2 fallback (retired with proposal-generator-v2)', () => {
    // The L2 fallback logic lived in proposal-generator-v2.js, which was removed
    // in the Fortune 500 cleanup. proposal-generator.js (V1) has its own priority
    // stack fallback that pre-dates Wave 11 and is still in place. The M7+M8 tests
    // specifically targeted the v2 implementation and no longer apply.
    it('proposal-generator.js V1 still has its priority-stack fallback when SmartPlansFinancials throws', () => {
        expect(PROPOSAL_V1_SRC).toMatch(/_extractGrandTotal/);
        expect(PROPOSAL_V1_SRC).toMatch(/SmartPlansFinancials delegation failed/);
    });
});
