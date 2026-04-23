// ═══════════════════════════════════════════════════════════════
// ACCURACY-FLOOR TESTS (Wave 3 + 4 + 4.5, v5.128.3)
// Pins the three features that together deliver the 96%+-every-time
// guarantee on clean vector PDFs:
//   • Wave 3 — auto-detect legend + notes sheets in uploaded plans
//   • Wave 4 — deterministic symbol counting (pdf.js wins if AI disagrees)
//   • Wave 4.5 — Pro model-health pre-flight (block bid on Flash-only)
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadAiEngine } from './helpers/load-ai-engine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AI_ENGINE_SRC = readFileSync(join(__dirname, '..', 'ai-engine.js'), 'utf-8');
const APP_JS_SRC = readFileSync(join(__dirname, '..', 'app.js'), 'utf-8');

let SmartBrains;
beforeAll(() => { SmartBrains = loadAiEngine(); });

// ───────────────────────────────────────────────────────────────
// Wave 3 — Legend + Notes auto-detection
// ───────────────────────────────────────────────────────────────

describe('Wave 3 — config defaults', () => {
    it('autoDetectLegendSheets defaults to true', () => {
        expect(SmartBrains.config.autoDetectLegendSheets).toBe(true);
    });
    it('autoDetectNotesSheets defaults to true', () => {
        expect(SmartBrains.config.autoDetectNotesSheets).toBe(true);
    });
});

describe('Wave 3 — _detectLegendAndNotesSheets pure function', () => {
    it('returns empty result for null/empty input', () => {
        expect(SmartBrains._detectLegendAndNotesSheets(null)).toEqual({ legendPages: [], notesPages: [] });
        expect(SmartBrains._detectLegendAndNotesSheets([])).toEqual({ legendPages: [], notesPages: [] });
        expect(SmartBrains._detectLegendAndNotesSheets(undefined)).toEqual({ legendPages: [], notesPages: [] });
    });

    it('detects a "SYMBOL LEGEND" page by title text', () => {
        const pages = [{
            pageNum: 1,
            sheetId: 'T-001',
            textItems: [
                { str: 'SYMBOL LEGEND' },
                { str: 'CAMERA' },
                { str: 'CR' },
            ],
        }];
        const result = SmartBrains._detectLegendAndNotesSheets(pages);
        expect(result.legendPages).toHaveLength(1);
        expect(result.legendPages[0].sheetId).toBe('T-001');
        expect(result.legendPages[0].confidence).toBeGreaterThan(0);
    });

    it('detects a "GENERAL NOTES" page', () => {
        const pages = [{
            pageNum: 2,
            sheetId: 'G-002',
            textItems: [
                { str: 'GENERAL NOTES' },
                { str: 'All conduit to be EMT unless otherwise noted in the drawings and specifications.' },
            ],
        }];
        const result = SmartBrains._detectLegendAndNotesSheets(pages);
        expect(result.notesPages).toHaveLength(1);
        expect(result.notesPages[0].sheetId).toBe('G-002');
    });

    it('detects alternate spellings: SYMBOL SCHEDULE, DEVICE SCHEDULE, KEYED NOTES', () => {
        const pages = [
            { pageNum: 1, sheetId: 'T-001', textItems: [{ str: 'SYMBOL SCHEDULE' }] },
            { pageNum: 2, sheetId: 'T-002', textItems: [{ str: 'DEVICE SCHEDULE' }] },
            { pageNum: 3, sheetId: 'T-003', textItems: [{ str: 'KEYED NOTES' }] },
        ];
        const result = SmartBrains._detectLegendAndNotesSheets(pages);
        expect(result.legendPages.map(p => p.sheetId).sort()).toEqual(['T-001', 'T-002']);
        expect(result.notesPages.map(p => p.sheetId)).toEqual(['T-003']);
    });

    it('does NOT flag a pure floor-plan page with no legend/notes keywords', () => {
        const pages = [{
            pageNum: 5,
            sheetId: 'T-005',
            textItems: [
                { str: 'CR-1' }, { str: 'CR-2' }, { str: 'CR-3' },
                { str: 'Room 101' }, { str: 'Room 102' },
            ],
        }];
        const result = SmartBrains._detectLegendAndNotesSheets(pages);
        expect(result.legendPages).toHaveLength(0);
        expect(result.notesPages).toHaveLength(0);
    });

    it('sorts output highest-confidence first (Wave 10 H7: single weak "LEGEND" no longer flags on its own)', () => {
        const pages = [
            // Wave 10 H7: a lone "LEGEND" keyword is too weak — would false-positive on marketing copy
            { pageNum: 1, sheetId: 'A', textItems: [{ str: 'LEGEND' }] },
            // Strong match — compound "SYMBOL LEGEND" + weak "ABBREVIATIONS" boost
            { pageNum: 2, sheetId: 'B', textItems: [{ str: 'SYMBOL LEGEND' }, { str: 'ABBREVIATIONS' }] },
            // Two weak signals clustered on same page ARE enough
            { pageNum: 3, sheetId: 'C', textItems: [{ str: 'LEGEND' }, { str: 'ABBREVIATIONS' }] },
        ];
        const result = SmartBrains._detectLegendAndNotesSheets(pages);
        // B wins — strongest score
        expect(result.legendPages[0].sheetId).toBe('B');
        // A (lone weak) is filtered out
        expect(result.legendPages.find(p => p.sheetId === 'A')).toBeUndefined();
        // C (clustered weak) is flagged
        expect(result.legendPages.find(p => p.sheetId === 'C')).toBeTruthy();
        // Sort order: B first, C second
        expect(result.legendPages[0].confidence).toBeGreaterThanOrEqual(result.legendPages[1].confidence);
    });

    it('boosts confidence on short-label pages (legend is symbol-heavy)', () => {
        const shortItems = Array.from({ length: 30 }, (_, i) => ({ str: `S${i}` }));
        const pages = [{
            pageNum: 1,
            sheetId: 'T-001',
            textItems: [{ str: 'SYMBOL LEGEND' }, ...shortItems],
        }];
        const result = SmartBrains._detectLegendAndNotesSheets(pages);
        expect(result.legendPages[0].matchedPatterns).toBeGreaterThanOrEqual(1.5);
    });

    it('survives malformed textItems gracefully', () => {
        const pages = [
            { pageNum: 1, sheetId: 'T-001', textItems: [null, undefined, {}, { str: null }, { str: 'SYMBOL LEGEND' }] },
        ];
        const result = SmartBrains._detectLegendAndNotesSheets(pages);
        expect(result.legendPages).toHaveLength(1);
    });
});

describe('Wave 3 — pipeline wiring', () => {
    it('ai-engine calls _detectLegendAndNotesSheets after vector aggregation', () => {
        expect(AI_ENGINE_SRC).toMatch(/_detectLegendAndNotesSheets\(allVectorPages\)/);
    });

    it('detected pages are stored on context AND state for UI access', () => {
        expect(AI_ENGINE_SRC).toMatch(/context\._detectedLegendPages = detected\.legendPages/);
        expect(AI_ENGINE_SRC).toMatch(/state\._detectedLegendPages = detected\.legendPages/);
        expect(AI_ENGINE_SRC).toMatch(/context\._detectedNotesPages = detected\.notesPages/);
    });

    it('app.js renders the detected-sheets banner on Step 2', () => {
        expect(APP_JS_SRC).toMatch(/_renderDetectedLegendNotesBanner/);
        expect(APP_JS_SRC).toMatch(/Auto-detected inside your plans/);
        expect(APP_JS_SRC).toMatch(/state\._detectedLegendPages/);
        expect(APP_JS_SRC).toMatch(/state\._detectedNotesPages/);
    });
});

// ───────────────────────────────────────────────────────────────
// Wave 4 — Deterministic symbol counting
// ───────────────────────────────────────────────────────────────

describe('Wave 4 — config defaults', () => {
    it('deterministicCountingEnabled defaults to true', () => {
        expect(SmartBrains.config.deterministicCountingEnabled).toBe(true);
    });
    it('deterministicCountTolerance defaults to 0.10 (10%)', () => {
        expect(SmartBrains.config.deterministicCountTolerance).toBeCloseTo(0.10, 6);
    });
});

describe('Wave 4 — _deterministicCountFromVectorData', () => {
    it('returns empty result for null/empty input', () => {
        expect(SmartBrains._deterministicCountFromVectorData(null)).toEqual({ perDevice: {}, perDeviceByPage: {}, totalLabels: 0 });
        expect(SmartBrains._deterministicCountFromVectorData({})).toEqual({ perDevice: {}, perDeviceByPage: {}, totalLabels: 0 });
    });

    it('counts device_label entries grouped by device type', () => {
        const vectorData = {
            pages: [
                { pageNum: 1, sheetId: 'T-001', deviceCandidates: [
                    { str: 'CR-1', device: 'card_reader' },
                    { str: 'CR-2', device: 'card_reader' },
                    { str: 'C-1', device: 'camera' },
                ]},
                { pageNum: 2, sheetId: 'T-002', deviceCandidates: [
                    { str: 'CR-3', device: 'card_reader' },
                    { str: 'C-2', device: 'camera' },
                    { str: 'C-3', device: 'camera' },
                ]},
            ],
        };
        const result = SmartBrains._deterministicCountFromVectorData(vectorData);
        expect(result.totalLabels).toBe(6);
        expect(result.perDevice.card_reader).toBe(3);
        expect(result.perDevice.camera).toBe(3);
    });

    it('produces per-page breakdown with sheet IDs', () => {
        const vectorData = {
            pages: [{ pageNum: 1, sheetId: 'T-001', deviceCandidates: [
                { device: 'camera' }, { device: 'camera' }, { device: 'card_reader' },
            ]}],
        };
        const result = SmartBrains._deterministicCountFromVectorData(vectorData);
        expect(result.perDeviceByPage.camera).toEqual([{ pageNum: 1, sheetId: 'T-001', count: 2 }]);
        expect(result.perDeviceByPage.card_reader).toEqual([{ pageNum: 1, sheetId: 'T-001', count: 1 }]);
    });

    it('ignores candidates without a device tag (unknown symbols)', () => {
        const vectorData = {
            pages: [{ deviceCandidates: [
                { str: 'CR-1', device: 'card_reader' },
                { str: 'XYZ' }, // no device classification
                { str: 'ABC-5', device: null },
            ]}],
        };
        const result = SmartBrains._deterministicCountFromVectorData(vectorData);
        expect(result.totalLabels).toBe(1);
        expect(result.perDevice).toEqual({ card_reader: 1 });
    });
});

describe('Wave 4 — _reconcileSymbolCounts', () => {
    it('finds no disagreement when AI and deterministic match exactly', () => {
        const out = SmartBrains._reconcileSymbolCounts({ camera: 10, card_reader: 5 }, { camera: 10, card_reader: 5 });
        expect(out).toHaveLength(0);
    });

    it('finds no disagreement when diff is below tolerance', () => {
        const out = SmartBrains._reconcileSymbolCounts({ camera: 10 }, { camera: 11 }, 0.10);
        // diff = 1/11 = 9.1% < 10%
        expect(out).toHaveLength(0);
    });

    it('flags a disagreement above tolerance and sets action=deterministic_wins', () => {
        const out = SmartBrains._reconcileSymbolCounts({ camera: 10 }, { camera: 15 }, 0.10);
        // diff = 5/15 = 33.3% > 10%
        expect(out).toHaveLength(1);
        expect(out[0].device).toBe('camera');
        expect(out[0].ai).toBe(10);
        expect(out[0].deterministic).toBe(15);
        expect(out[0].action).toBe('deterministic_wins');
        expect(out[0].diffPct).toBeGreaterThan(33);
    });

    it('flags disagreement even when AI has a device the extractor did not find', () => {
        const out = SmartBrains._reconcileSymbolCounts({ camera: 0, card_reader: 5 }, { card_reader: 0 });
        expect(out.find(d => d.device === 'card_reader')).toBeTruthy();
    });

    it('skips devices where both counts are zero', () => {
        const out = SmartBrains._reconcileSymbolCounts({ missing: 0 }, { missing: 0 });
        expect(out).toHaveLength(0);
    });

    it('reason text explicitly says deterministic is ground truth', () => {
        const out = SmartBrains._reconcileSymbolCounts({ camera: 10 }, { camera: 20 });
        expect(out[0].reason).toMatch(/ground truth/i);
    });
});

describe('Wave 4 — pipeline wiring', () => {
    it('ai-engine reconciles Symbol Scanner after Wave 1 Complete', () => {
        expect(AI_ENGINE_SRC).toMatch(/WAVE 4 .*RECONCILE SYMBOL SCANNER/i);
        expect(AI_ENGINE_SRC).toMatch(/_reconcileSymbolCounts\(/);
    });

    it('deterministic overrides Symbol Scanner totals downstream', () => {
        expect(AI_ENGINE_SRC).toMatch(/wave1Results\.SYMBOL_SCANNER\.totals\[d\.device\] = d\.deterministic/);
        expect(AI_ENGINE_SRC).toMatch(/_deterministicOverrides/);
    });

    it('each disagreement becomes a HITL clarification question (source=WAVE_4_RECONCILE)', () => {
        expect(AI_ENGINE_SRC).toMatch(/source: 'WAVE_4_RECONCILE'/);
        expect(AI_ENGINE_SRC).toMatch(/Count Reconciliation/);
        expect(AI_ENGINE_SRC).toMatch(/_pendingWave4Escalations/);
    });

    it('Wave 4 escalations get merged into the main clarificationQuestions array', () => {
        expect(AI_ENGINE_SRC).toMatch(/for \(const esc of context\._pendingWave4Escalations\)/);
    });

    it('>25% disagreement is CRITICAL severity (bid-blocking)', () => {
        expect(AI_ENGINE_SRC).toMatch(/d\.diffPct > 25 \? 'critical' : 'high'/);
    });
});

describe('Wave 10 C4 — Detected legend/notes pages actually consumed by AI', () => {
    it('LEGEND_DECODER prompt lists auto-detected legend pages when present', () => {
        expect(AI_ENGINE_SRC).toMatch(/AUTO-DETECTED LEGEND PAGES \(look here first\)/);
        expect(AI_ENGINE_SRC).toMatch(/context\._detectedLegendPages/);
    });

    it('KEYNOTE_EXTRACTOR prompt lists auto-detected notes pages when present', () => {
        expect(AI_ENGINE_SRC).toMatch(/AUTO-DETECTED NOTES PAGES \(prioritize these\)/);
        expect(AI_ENGINE_SRC).toMatch(/context\._detectedNotesPages/);
    });
});

describe('Wave 10 H7 + M15 — Legend detection regex tightened (was flooding on ABBREVIATIONS title blocks)', () => {
    it('WEAK_LEGEND_PATTERNS require a supporting signal to count', () => {
        expect(AI_ENGINE_SRC).toMatch(/WEAK_LEGEND_PATTERNS/);
        expect(AI_ENGINE_SRC).toMatch(/weakLegendHits >= 2/);
    });

    it('strong patterns require compound anchors (symbol/device/drawing abbreviations, not plain abbreviations)', () => {
        expect(AI_ENGINE_SRC).toMatch(/\\b\(symbol\|device\|drawing\|sheet\)\\s\+abbreviations\?\\b/);
    });
});

describe('Wave 10 M11 — Vector extraction warns on 60+ page truncation', () => {
    it('logs a warning when plan set exceeds pageLimit', () => {
        expect(AI_ENGINE_SRC).toMatch(/Plan set has \$\{totalPages\} pages; extracting only first/);
        expect(AI_ENGINE_SRC).toMatch(/will NOT be auto-detected/);
    });
});

describe('Wave 10 C3 — Deterministic override cascade (was outvoted by AI consensus)', () => {
    it('Override cascades to SHADOW_SCANNER / QUADRANT_SCANNER / ZOOM_SCANNER / PER_FLOOR_ANALYZER after Wave 1.5', () => {
        expect(AI_ENGINE_SRC).toMatch(/CASCADE DETERMINISTIC OVERRIDES TO WAVE 1\.5 SCANNERS/);
        expect(AI_ENGINE_SRC).toMatch(/\['SHADOW_SCANNER', 'totals'\]/);
        expect(AI_ENGINE_SRC).toMatch(/\['QUADRANT_SCANNER', 'totals'\]/);
        expect(AI_ENGINE_SRC).toMatch(/\['ZOOM_SCANNER', 'grand_totals'\]/);
        expect(AI_ENGINE_SRC).toMatch(/\['PER_FLOOR_ANALYZER', 'totals'\]/);
    });

    it('CONSENSUS_ARBITRATOR prompt carries a DETERMINISTIC GROUND TRUTH block when overrides exist', () => {
        expect(AI_ENGINE_SRC).toMatch(/DETERMINISTIC GROUND TRUTH \(Wave 4 pdf\.js extraction — AUTHORITATIVE\)/);
        expect(AI_ENGINE_SRC).toMatch(/do NOT average against the/);
    });

    it('Cascade uses symbolOverrides from Wave 4 reconcile output, not a separate source', () => {
        expect(AI_ENGINE_SRC).toMatch(/wave1Results\.SYMBOL_SCANNER\?\._deterministicOverrides/);
    });

    it('Cascade is wrapped in try/catch so a single scanner with bad shape does not blow up analysis', () => {
        expect(AI_ENGINE_SRC).toMatch(/Wave 10 C3 cascade errored non-fatally/);
    });
});

// ───────────────────────────────────────────────────────────────
// Wave 4.5 — Pro model-health pre-flight gate
// ───────────────────────────────────────────────────────────────

describe('Wave 4.5 — config defaults', () => {
    it('proDegradedBlockThreshold defaults to 30%', () => {
        expect(SmartBrains.config.proDegradedBlockThreshold).toBe(30);
    });
});

describe('Wave 4.5 — _checkProModelHealth severity classification', () => {
    async function mockHealth(payload) {
        // Load a fresh SmartBrains with an injected fetch so the sandboxed
        // module sees our mock instead of the default one.
        const mockFetch = () => Promise.resolve({
            ok: true, status: 200, json: async () => payload,
        });
        const engine = loadAiEngine({ fetch: mockFetch });
        return engine._checkProModelHealth();
    }

    it('classifies 100% available as healthy', async () => {
        const h = await mockHealth({ testedKeys: 10, availableKeys: 10, message: 'All keys ok' });
        expect(h.severity).toBe('healthy');
        expect(h.unavailablePct).toBe(0);
    });

    it('classifies 20% unavailable as warning (below 30% threshold)', async () => {
        const h = await mockHealth({ testedKeys: 10, availableKeys: 8 });
        expect(h.severity).toBe('warning');
        expect(h.unavailablePct).toBe(20);
    });

    it('classifies 40% unavailable as critical (above 30% threshold)', async () => {
        const h = await mockHealth({ testedKeys: 10, availableKeys: 6 });
        expect(h.severity).toBe('critical');
        expect(h.unavailablePct).toBe(40);
    });

    it('classifies 100% unavailable as block (no keys)', async () => {
        const h = await mockHealth({ testedKeys: 10, availableKeys: 0 });
        expect(h.severity).toBe('block');
    });

    it('returns model name in the health report', async () => {
        const h = await mockHealth({ testedKeys: 10, availableKeys: 10 });
        expect(h.model).toBe(SmartBrains.config.proModel);
    });
});

describe('Wave 4.5 — pipeline wiring (runFullAnalysis gate)', () => {
    it('runFullAnalysis calls _checkProModelHealth before any brains run', () => {
        expect(AI_ENGINE_SRC).toMatch(/MODEL-HEALTH PRE-FLIGHT/);
        expect(AI_ENGINE_SRC).toMatch(/await this\._checkProModelHealth\(\)/);
    });

    it('runFullAnalysis throws MODEL_HEALTH_GATE when critical and not in draft mode', () => {
        expect(AI_ENGINE_SRC).toMatch(/ACCURACY_GATE: Pro model degraded/);
        expect(AI_ENGINE_SRC).toMatch(/err\.code = 'MODEL_HEALTH_GATE'/);
    });

    it('draft mode ack lets the analysis proceed and sets _draftModeActive', () => {
        expect(AI_ENGINE_SRC).toMatch(/state\._draftModeAcknowledged === true/);
        expect(AI_ENGINE_SRC).toMatch(/state\._draftModeActive = true/);
    });

    it('app.js catches MODEL_HEALTH_GATE and presents the draft-mode confirm()', () => {
        expect(APP_JS_SRC).toMatch(/err\.code === 'MODEL_HEALTH_GATE'/);
        expect(APP_JS_SRC).toMatch(/DRAFT MODE/);
        expect(APP_JS_SRC).toMatch(/state\._draftModeAcknowledged = true/);
    });
});
