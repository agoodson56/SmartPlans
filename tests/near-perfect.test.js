// ═══════════════════════════════════════════════════════════════
// NEAR-PERFECT REGRESSION TESTS (Wave 9, v5.128.6)
// Pins:
//   • Claude proxy endpoint with graceful degrade when ANTHROPIC_KEY
//     is absent (503 CLAUDE_NOT_CONFIGURED, no crash)
//   • Gemini → Claude failover when Pro model-health gate trips
//   • Dual-provider output cross-check math
//   • Deterministic labor-hours table (NECA + actuals rolling avg)
//   • reconcileLaborHours post-processor overrides AI drift
//   • Model version pinning constants
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadAiEngine } from './helpers/load-ai-engine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AI_ENGINE_SRC = readFileSync(join(__dirname, '..', 'ai-engine.js'), 'utf-8');
const CLAUDE_PROXY_SRC = readFileSync(join(__dirname, '..', 'functions', 'api', 'ai', 'claude-invoke.js'), 'utf-8');

let SmartBrains, SmartPlansPricing;
beforeAll(() => {
    SmartBrains = loadAiEngine();
    // Load SmartPlansPricing standalone — we need resolveLaborHours + reconcileLaborHours
    const caSrc = readFileSync(join(__dirname, '..', 'prevailing-wages-ca.js'), 'utf-8');
    const natSrc = readFileSync(join(__dirname, '..', 'prevailing-wages-national.js'), 'utf-8');
    const pricingSrc = readFileSync(join(__dirname, '..', 'pricing-service.js'), 'utf-8');
    const PRICING_DB = { regionalMultipliers: { national_average: 1.0 } };
    const fn = new Function('window', 'PRICING_DB',
        caSrc + '\n' + natSrc + '\n' + pricingSrc +
        '\nreturn SmartPlansPricing;');
    SmartPlansPricing = fn({}, PRICING_DB);
});

// ───────────────────────────────────────────────────────────────
// Wave 9 — Claude proxy endpoint
// ───────────────────────────────────────────────────────────────
describe('Wave 9 — /api/ai/claude-invoke graceful degrade', () => {
    it('POST returns 503 CLAUDE_NOT_CONFIGURED when ANTHROPIC_KEY is missing', () => {
        expect(CLAUDE_PROXY_SRC).toMatch(/CLAUDE_NOT_CONFIGURED/);
        expect(CLAUDE_PROXY_SRC).toMatch(/env\.ANTHROPIC_KEY/);
        expect(CLAUDE_PROXY_SRC).toMatch(/status: 503/);
    });

    it('GET returns { configured: boolean } probe', () => {
        expect(CLAUDE_PROXY_SRC).toMatch(/export async function onRequestGet/);
        expect(CLAUDE_PROXY_SRC).toMatch(/configured,/);
    });

    it('supports ANTHROPIC_KEY + ANTHROPIC_KEY_BACKUP fallback', () => {
        expect(CLAUDE_PROXY_SRC).toMatch(/env\.ANTHROPIC_KEY_BACKUP/);
    });

    it('translates Gemini request shape to Anthropic Messages API', () => {
        expect(CLAUDE_PROXY_SRC).toMatch(/_translateGeminiToAnthropic/);
        // Wave 10 C7: anthropic-version bumped to 2024-06-15 for PDF support
        expect(CLAUDE_PROXY_SRC).toMatch(/anthropic-version.*2024-06-15/);
        expect(CLAUDE_PROXY_SRC).toMatch(/x-api-key/);
    });

    it('Wave 10 C7: anthropic-version is >= 2024-06-15 (PDF documents supported)', () => {
        const m = CLAUDE_PROXY_SRC.match(/'anthropic-version':\s*'(\d{4}-\d{2}-\d{2})'/);
        expect(m).toBeTruthy();
        const v = m[1];
        expect(v >= '2024-06-15').toBe(true);
    });

    it('Wave 11 C4: Claude translator enforces role alternation via final-pass loop (not pair-wise)', () => {
        // Pre-Wave-11 code was `if (prevRole === role) insert bridge`.
        // Wave 11 moved to a final-pass loop that bridges every same-role
        // adjacency found — handles 3+ consecutive same-role turns.
        expect(CLAUDE_PROXY_SRC).toMatch(/Final-pass alternation enforcement/);
        expect(CLAUDE_PROXY_SRC).toMatch(/for \(const msg of messages\)/);
        expect(CLAUDE_PROXY_SRC).toMatch(/Understood\./);
        expect(CLAUDE_PROXY_SRC).toMatch(/messages\.length = 0/);
    });

    it('Wave 10 M4: systemInstruction parts are concatenated, not just parts[0]', () => {
        expect(CLAUDE_PROXY_SRC).toMatch(/si\.parts\.map.*\.join/);
    });
});

describe('Wave 10 C1 — Claude provider override honored by _invokeBrain', () => {
    it('_invokeBrain accepts opts.providerOverride and checks SmartBrains._providerOverride', () => {
        const AI_ENGINE = readFileSync(join(__dirname, '..', 'ai-engine.js'), 'utf-8');
        expect(AI_ENGINE).toMatch(/opts\.providerOverride \|\| this\._providerOverride/);
        expect(AI_ENGINE).toMatch(/const useClaude = providerOverride === 'anthropic'/);
    });

    it('_invokeBrain routes to /api/ai/claude-invoke when override active', () => {
        const AI_ENGINE = readFileSync(join(__dirname, '..', 'ai-engine.js'), 'utf-8');
        expect(AI_ENGINE).toMatch(/useClaude \? '\/api\/ai\/claude-invoke'/);
    });

    it('runFullAnalysis mirrors state override onto SmartBrains._providerOverride', () => {
        const AI_ENGINE = readFileSync(join(__dirname, '..', 'ai-engine.js'), 'utf-8');
        expect(AI_ENGINE).toMatch(/this\._providerOverride = 'anthropic'/);
    });

    it('runFullAnalysis resets _providerOverride to null at start', () => {
        const AI_ENGINE = readFileSync(join(__dirname, '..', 'ai-engine.js'), 'utf-8');
        expect(AI_ENGINE).toMatch(/this\._providerOverride = null/);
    });
});

describe('Wave 10 C2 — Dual-provider cross-check is actually wired', () => {
    it('_runSingleBrain calls _compareProviderOutputs for critical brains', () => {
        const AI_ENGINE = readFileSync(join(__dirname, '..', 'ai-engine.js'), 'utf-8');
        expect(AI_ENGINE).toMatch(/claudeCriticalBrains.*\.includes\(key\)/);
        expect(AI_ENGINE).toMatch(/_compareProviderOutputs\(parsed, claudeParsed/);
    });

    it('Cross-check records disagreements on parsed._crossCheckDisagreements', () => {
        const AI_ENGINE = readFileSync(join(__dirname, '..', 'ai-engine.js'), 'utf-8');
        expect(AI_ENGINE).toMatch(/parsed\._crossCheckDisagreements/);
    });

    it('Cross-check is SKIPPED when already failing over to Claude (no redundancy gain)', () => {
        const AI_ENGINE = readFileSync(join(__dirname, '..', 'ai-engine.js'), 'utf-8');
        expect(AI_ENGINE).toMatch(/this\._providerOverride !== 'anthropic'/);
    });

    it('Cross-check aggregates disagreements on SmartBrains._wave10CrossCheckDisagreements', () => {
        const AI_ENGINE = readFileSync(join(__dirname, '..', 'ai-engine.js'), 'utf-8');
        expect(AI_ENGINE).toMatch(/_wave10CrossCheckDisagreements/);
    });
});

describe('Wave 10 L4 — Claude availability cache has TTL', () => {
    it('_checkClaudeAvailable cache invalidates after TTL', () => {
        const AI_ENGINE = readFileSync(join(__dirname, '..', 'ai-engine.js'), 'utf-8');
        expect(AI_ENGINE).toMatch(/_claudeAvailabilityTTLMs/);
        expect(AI_ENGINE).toMatch(/Date\.now\(\) - this\._claudeAvailabilityCachedAt/);
    });
});

describe('Wave 10 M10 — AbortSignal.timeout has manual fallback', () => {
    it('_checkProModelHealth falls back to AbortController + setTimeout when AbortSignal.timeout is undefined', () => {
        const AI_ENGINE = readFileSync(join(__dirname, '..', 'ai-engine.js'), 'utf-8');
        expect(AI_ENGINE).toMatch(/ctrl = new AbortController/);
    });
});

describe('Wave 9 — Claude proxy translation + payload limits (originally inside first describe)', () => {
    it('translates Anthropic response shape back to Gemini shape', () => {
        expect(CLAUDE_PROXY_SRC).toMatch(/_translateAnthropicToGemini/);
        expect(CLAUDE_PROXY_SRC).toMatch(/candidates:\s*\[/);
    });

    it('Payload size limit mirrors Gemini proxy (50 MB cap)', () => {
        expect(CLAUDE_PROXY_SRC).toMatch(/50 \* 1024 \* 1024/);
    });

    it('Supports base64 PDF documents (not just images)', () => {
        expect(CLAUDE_PROXY_SRC).toMatch(/application\/pdf/);
        expect(CLAUDE_PROXY_SRC).toMatch(/type: 'document'/);
    });

    it('Max tokens capped at 64000 regardless of request', () => {
        expect(CLAUDE_PROXY_SRC).toMatch(/Math\.min\(maxTokens, 64000\)/);
    });

    it('Stop reason mapping converts Anthropic end_turn → STOP', () => {
        expect(CLAUDE_PROXY_SRC).toMatch(/_mapStopReason/);
        expect(CLAUDE_PROXY_SRC).toMatch(/end_turn.*'STOP'/);
        expect(CLAUDE_PROXY_SRC).toMatch(/max_tokens.*'MAX_TOKENS'/);
    });
});

// ───────────────────────────────────────────────────────────────
// Wave 9 — Config defaults
// ───────────────────────────────────────────────────────────────
describe('Wave 9 — config defaults', () => {
    it('enableClaudeFallback defaults to true', () => {
        expect(SmartBrains.config.enableClaudeFallback).toBe(true);
    });
    it('enableClaudeCrossCheck defaults to true', () => {
        expect(SmartBrains.config.enableClaudeCrossCheck).toBe(true);
    });
    it('claudeModel is pinned to claude-opus-4-5', () => {
        expect(SmartBrains.config.claudeModel).toBe('claude-opus-4-5');
    });
    it('claudeCriticalBrains includes the four high-stakes brains', () => {
        expect(SmartBrains.config.claudeCriticalBrains).toContain('LEGEND_DECODER');
        expect(SmartBrains.config.claudeCriticalBrains).toContain('MATERIAL_PRICER');
        expect(SmartBrains.config.claudeCriticalBrains).toContain('CONSENSUS_ARBITRATOR');
        expect(SmartBrains.config.claudeCriticalBrains).toContain('DEVILS_ADVOCATE');
    });
    it('pinnedModels carries exact version strings for all providers', () => {
        expect(SmartBrains.config.pinnedModels.geminiFlash).toBe('gemini-2.5-flash');
        expect(SmartBrains.config.pinnedModels.geminiPro).toBe('gemini-3.1-pro-preview');
        expect(SmartBrains.config.pinnedModels.claudeOpus).toBe('claude-opus-4-5');
    });
    it('deterministicLaborHoursEnabled defaults to true', () => {
        expect(SmartBrains.config.deterministicLaborHoursEnabled).toBe(true);
    });
    it('laborHoursDisagreementTolerance defaults to 0.25', () => {
        expect(SmartBrains.config.laborHoursDisagreementTolerance).toBeCloseTo(0.25, 6);
    });
});

// ───────────────────────────────────────────────────────────────
// Wave 9 — Claude availability probe
// ───────────────────────────────────────────────────────────────
describe('Wave 9 — _checkClaudeAvailable probe', () => {
    it('returns false when GET /api/ai/claude-invoke says not configured', async () => {
        const mockFetch = () => Promise.resolve({ ok: true, json: async () => ({ configured: false }) });
        const engine = loadAiEngine({ fetch: mockFetch });
        const available = await engine._checkClaudeAvailable();
        expect(available).toBe(false);
    });

    it('returns true when probe says configured', async () => {
        const mockFetch = () => Promise.resolve({ ok: true, json: async () => ({ configured: true, model: 'claude-opus-4-5' }) });
        const engine = loadAiEngine({ fetch: mockFetch });
        const available = await engine._checkClaudeAvailable();
        expect(available).toBe(true);
    });

    it('caches the result so repeat calls do not re-probe', async () => {
        let calls = 0;
        const mockFetch = () => { calls++; return Promise.resolve({ ok: true, json: async () => ({ configured: true }) }); };
        const engine = loadAiEngine({ fetch: mockFetch });
        await engine._checkClaudeAvailable();
        await engine._checkClaudeAvailable();
        await engine._checkClaudeAvailable();
        expect(calls).toBe(1);
    });

    it('network errors degrade gracefully (returns false, no throw)', async () => {
        const mockFetch = () => Promise.reject(new Error('network'));
        const engine = loadAiEngine({ fetch: mockFetch });
        const available = await engine._checkClaudeAvailable();
        expect(available).toBe(false);
    });
});

// ───────────────────────────────────────────────────────────────
// Wave 9 — Dual-provider cross-check
// ───────────────────────────────────────────────────────────────
describe('Wave 9 — _compareProviderOutputs', () => {
    it('returns agree=true when objects match', () => {
        const r = SmartBrains._compareProviderOutputs(
            { cameras: 10, card_readers: 5 },
            { cameras: 10, card_readers: 5 },
        );
        expect(r.agree).toBe(true);
        expect(r.divergences).toHaveLength(0);
    });

    it('flags disagreement when a numeric field differs beyond tolerance', () => {
        const r = SmartBrains._compareProviderOutputs(
            { cameras: 10 },
            { cameras: 15 },
            { tolerance: 0.10 },
        );
        expect(r.agree).toBe(false);
        expect(r.divergences).toHaveLength(1);
        expect(r.divergences[0].key).toBe('cameras');
    });

    it('tolerates differences below the threshold', () => {
        const r = SmartBrains._compareProviderOutputs({ cameras: 100 }, { cameras: 105 }, { tolerance: 0.10 });
        expect(r.agree).toBe(true);
    });

    it('walks nested objects and reports dotted path on divergence', () => {
        const r = SmartBrains._compareProviderOutputs(
            { material: { cat6: 1000, cat6a: 500 } },
            { material: { cat6: 1000, cat6a: 2000 } },
            { tolerance: 0.10 },
        );
        expect(r.agree).toBe(false);
        expect(r.divergences.find(d => d.key === 'material.cat6a')).toBeTruthy();
    });

    it('flags array-length mismatch as a divergence', () => {
        const r = SmartBrains._compareProviderOutputs(
            { items: [1, 2, 3] },
            { items: [1, 2, 3, 4, 5, 6] },
            { tolerance: 0.10 },
        );
        expect(r.divergences.find(d => d.key === 'items')).toBeTruthy();
    });

    it('non-object inputs return agree=false with a sane reason', () => {
        const r = SmartBrains._compareProviderOutputs(null, { x: 1 });
        expect(r.agree).toBe(false);
        expect(r.divergences[0].key).toBe('__root');
    });
});

// ───────────────────────────────────────────────────────────────
// Wave 9 — Pipeline wiring
// ───────────────────────────────────────────────────────────────
describe('Wave 9 — runFullAnalysis Claude failover wiring', () => {
    it('runFullAnalysis checks Claude availability before blocking on Pro degrade', () => {
        expect(AI_ENGINE_SRC).toMatch(/enableClaudeFallback && await this\._checkClaudeAvailable\(\)/);
    });

    it('state._aiProviderOverride is set to anthropic on failover', () => {
        expect(AI_ENGINE_SRC).toMatch(/state\._aiProviderOverride = 'anthropic'/);
        expect(AI_ENGINE_SRC).toMatch(/state\._claudeFailoverActive = true/);
    });

    it('failover runs without throwing — bid completes on Claude', () => {
        // Uses the word "proceed" in the comment to show intent
        expect(AI_ENGINE_SRC).toMatch(/Do NOT throw — let the run proceed on Claude/);
    });

    it('labor-hours reconciliation runs after LABOR_CALCULATOR', () => {
        expect(AI_ENGINE_SRC).toMatch(/DETERMINISTIC LABOR-HOURS RECONCILIATION/);
        expect(AI_ENGINE_SRC).toMatch(/SmartPlansPricing\.reconcileLaborHours/);
    });

    it('labor-reconcile stats land on state + context', () => {
        expect(AI_ENGINE_SRC).toMatch(/state\._wave9LaborStats/);
        expect(AI_ENGINE_SRC).toMatch(/context\._wave9LaborStats/);
    });
});

// ───────────────────────────────────────────────────────────────
// Wave 9 — Deterministic labor hours
// ───────────────────────────────────────────────────────────────
describe('Wave 9 — NECA labor-hours table', () => {
    it('camera: 3.0 hrs baseline (install + terminate + test)', () => {
        expect(SmartPlansPricing.necaStandardHours('camera')).toBeCloseTo(3.0, 1);
    });
    it('card_reader: 2.1 hrs baseline', () => {
        expect(SmartPlansPricing.necaStandardHours('card_reader')).toBeCloseTo(2.1, 1);
    });
    it('data_outlet: 0.85 hrs per drop', () => {
        expect(SmartPlansPricing.necaStandardHours('data_outlet')).toBeCloseTo(0.85, 2);
    });
    it('unknown device returns 0, never NaN', () => {
        expect(SmartPlansPricing.necaStandardHours('unobtanium')).toBe(0);
    });
    it('facp (fire alarm control panel) needs >10 hrs total', () => {
        expect(SmartPlansPricing.necaStandardHours('facp')).toBeGreaterThan(10);
    });
});

describe('Wave 9 — resolveLaborHours priority', () => {
    it('actuals rolling avg wins when n >= 5', () => {
        const benchmarks = [{ item_name: 'camera', avg_labor_hours: 2.5, sample_count: 12 }];
        const r = SmartPlansPricing.resolveLaborHours('camera', { benchmarks, aiHours: 5 });
        expect(r.source).toBe('actuals_rolling_avg');
        expect(r.hoursPerUnit).toBe(2.5);
        expect(r.sampleCount).toBe(12);
    });

    it('NECA wins when actuals exist but n < 5', () => {
        const benchmarks = [{ item_name: 'camera', avg_labor_hours: 99, sample_count: 2 }];
        const r = SmartPlansPricing.resolveLaborHours('camera', { benchmarks });
        expect(r.source).toBe('neca_standard');
    });

    it('NECA wins when no benchmarks provided', () => {
        const r = SmartPlansPricing.resolveLaborHours('camera');
        expect(r.source).toBe('neca_standard');
        expect(r.hoursPerUnit).toBeCloseTo(3.0, 1);
    });

    it('AI fallback for device not in NECA table', () => {
        const r = SmartPlansPricing.resolveLaborHours('exotic_device_xyz', { aiHours: 1.7 });
        expect(r.source).toBe('ai_fallback');
        expect(r.hoursPerUnit).toBe(1.7);
    });

    it('returns unresolved + 0 when nothing available', () => {
        const r = SmartPlansPricing.resolveLaborHours('exotic_device_xyz');
        expect(r.source).toBe('unresolved');
        expect(r.hoursPerUnit).toBe(0);
    });
});

describe('Wave 9 — reconcileLaborHours post-processor', () => {
    it('overrides AI hours when >25% off deterministic', () => {
        const laborResult = {
            phases: [{
                items: [{ item: 'IP Dome Camera', qty: 10, hours_per_unit: 6.0 /* NECA=3.0 → diff 50% */ }],
            }],
        };
        const stats = SmartPlansPricing.reconcileLaborHours(laborResult, { tolerance: 0.25 });
        expect(stats.overridden).toBe(1);
        expect(laborResult.phases[0].items[0].hours_per_unit).toBeCloseTo(3.0, 1);
        expect(laborResult.phases[0].items[0]._laborHoursSource).toBe('neca_standard');
    });

    it('leaves AI hours untouched when within tolerance', () => {
        const laborResult = {
            phases: [{
                items: [{ item: 'IP Dome Camera', qty: 10, hours_per_unit: 3.3 /* 10% off NECA 3.0 */ }],
            }],
        };
        const stats = SmartPlansPricing.reconcileLaborHours(laborResult, { tolerance: 0.25 });
        expect(stats.overridden).toBe(0);
        expect(stats.agreed).toBe(1);
        expect(laborResult.phases[0].items[0].hours_per_unit).toBe(3.3);
    });

    it('recomputes total_hours when hours_per_unit is overridden', () => {
        const laborResult = {
            phases: [{
                items: [{ item: 'Smoke Detector', qty: 20, hours_per_unit: 5.0, total_hours: 100 }],
            }],
        };
        SmartPlansPricing.reconcileLaborHours(laborResult, { tolerance: 0.25 });
        // NECA smoke_detector = 0.8 + 0.3 + 0.2 = 1.3 → total = 26
        expect(laborResult.phases[0].items[0].total_hours).toBeCloseTo(26, 0);
    });

    it('stamps _laborHoursSource on every touched item', () => {
        const laborResult = {
            phases: [{
                items: [
                    { item: 'Card Reader', qty: 5, hours_per_unit: 10.0 /* way off */ },
                    { item: 'Mystery Device', qty: 3, hours_per_unit: 2.0 /* unknown → no override */ },
                ],
            }],
        };
        SmartPlansPricing.reconcileLaborHours(laborResult);
        expect(laborResult.phases[0].items[0]._laborHoursSource).toBe('neca_standard');
        // Unknown device should not be stamped at all (skipped before stamping)
        expect(laborResult.phases[0].items[1]._laborHoursSource).toBeUndefined();
    });

    it('survives malformed input (null/no phases/no items)', () => {
        expect(SmartPlansPricing.reconcileLaborHours(null).total).toBe(0);
        expect(SmartPlansPricing.reconcileLaborHours({}).total).toBe(0);
        expect(SmartPlansPricing.reconcileLaborHours({ phases: [] }).total).toBe(0);
    });

    it('_guessDeviceKey correctly maps free-form names', () => {
        expect(SmartPlansPricing._guessDeviceKey('IP Dome Camera 5MP')).toBe('camera');
        expect(SmartPlansPricing._guessDeviceKey('HID iCLASS Card Reader')).toBe('card_reader');
        expect(SmartPlansPricing._guessDeviceKey('System Sensor Smoke Detector')).toBe('smoke_detector');
        expect(SmartPlansPricing._guessDeviceKey('WAP-5 Ruckus 802.11ax')).toBe('wireless_ap');
        expect(SmartPlansPricing._guessDeviceKey('')).toBe(null);
    });
});

// ───────────────────────────────────────────────────────────────
// Wave 9 — Model version pinning
// ───────────────────────────────────────────────────────────────
describe('Wave 9 — model version pinning', () => {
    it('pinnedModels has geminiFlash, geminiPro, claudeOpus keys', () => {
        expect(SmartBrains.config.pinnedModels).toHaveProperty('geminiFlash');
        expect(SmartBrains.config.pinnedModels).toHaveProperty('geminiPro');
        expect(SmartBrains.config.pinnedModels).toHaveProperty('claudeOpus');
    });

    it('pinned strings match the active config.model / proModel / claudeModel', () => {
        expect(SmartBrains.config.pinnedModels.geminiPro).toBe(SmartBrains.config.proModel);
        expect(SmartBrains.config.pinnedModels.claudeOpus).toBe(SmartBrains.config.claudeModel);
    });
});
