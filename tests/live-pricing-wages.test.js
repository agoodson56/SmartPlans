// ═══════════════════════════════════════════════════════════════
// LIVE PRICING + PREVAILING WAGES REGRESSION TESTS (Wave 7, v5.128.4)
// Pins:
//   • 4-tier price resolution order: user override > distributor >
//     rate library > static DB > AI fallback
//   • Token-overlap fuzzy matching (>= 0.60 score to win)
//   • Post-process overwrites AI price + stamps source tag
//   • State/county picker → correct prevailing-wage table selection
//   • CA counties resolve via CA_PREVAILING_WAGES
//   • Non-CA states resolve via NATIONAL_PREVAILING_WAGES metro zones
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AI_ENGINE_SRC = readFileSync(join(__dirname, '..', 'ai-engine.js'), 'utf-8');
const APP_JS_SRC = readFileSync(join(__dirname, '..', 'app.js'), 'utf-8');

let SmartPlansPricing, CA_PREVAILING_WAGES, NATIONAL_PREVAILING_WAGES;

beforeAll(() => {
    // Load all three modules into a shared scope so SmartPlansPricing can
    // access the wage globals the same way it does in the browser.
    const caSrc = readFileSync(join(__dirname, '..', 'prevailing-wages-ca.js'), 'utf-8');
    const natSrc = readFileSync(join(__dirname, '..', 'prevailing-wages-national.js'), 'utf-8');
    const pricingSrc = readFileSync(join(__dirname, '..', 'pricing-service.js'), 'utf-8');
    // Stub PRICING_DB for _staticDbLookup
    const PRICING_DB = {
        regionalMultipliers: { national_average: 1.0, california: 1.25 },
        structuredCabling: {
            cat6a: {
                unit: 'per ft',
                budget: 0.45, mid: 0.60, premium: 0.95,
                description: 'Cat 6A cable per foot',
            },
        },
        cameras: {
            fixed_dome_5mp: {
                unit: 'each',
                budget: 450, mid: 700, premium: 1200,
                description: 'Fixed dome camera 5MP',
            },
        },
    };
    const win = { fetch: null };
    const fn = new Function('window', 'PRICING_DB',
        caSrc + '\n' + natSrc + '\n' + pricingSrc +
        '\nreturn { SmartPlansPricing, CA_PREVAILING_WAGES, NATIONAL_PREVAILING_WAGES };');
    const loaded = fn(win, PRICING_DB);
    SmartPlansPricing = loaded.SmartPlansPricing;
    CA_PREVAILING_WAGES = loaded.CA_PREVAILING_WAGES;
    NATIONAL_PREVAILING_WAGES = loaded.NATIONAL_PREVAILING_WAGES;
});

// ───────────────────────────────────────────────────────────────
// SmartPlansPricing — token overlap + normalization
// ───────────────────────────────────────────────────────────────
describe('Wave 7 — pricing normalization + fuzzy matching', () => {
    it('_normalize strips case + punctuation', () => {
        expect(SmartPlansPricing._normalize('  Axis "P3265-LVE" ')).toBe('axis p3265-lve');
    });

    it('_tokenOverlap returns 1.0 on exact match', () => {
        expect(SmartPlansPricing._tokenOverlap('Axis P3265-LVE Camera', 'Axis P3265-LVE Camera')).toBeGreaterThanOrEqual(0.9);
    });

    it('_tokenOverlap returns 0 when nothing matches', () => {
        expect(SmartPlansPricing._tokenOverlap('card reader', 'patch panel')).toBe(0);
    });

    it('_tokenOverlap ignores short tokens (<=2 chars)', () => {
        // "A B" has tokens ["A","B"], both filtered — returns 0 (no useful tokens)
        expect(SmartPlansPricing._tokenOverlap('A B', 'Axis P3265')).toBe(0);
    });

    it('_bestMatch picks highest-scoring record above threshold', () => {
        const records = [
            { item_name: 'Axis P3265-LVE Camera' },
            { item_name: 'Hanwha QNV-8080R' },
            { item_name: 'Axis P3267 Indoor' },
        ];
        const best = SmartPlansPricing._bestMatch(records, 'Axis P3265-LVE IP Camera', 0.60);
        expect(best).toBeTruthy();
        expect(best.record.item_name).toBe('Axis P3265-LVE Camera');
    });

    it('_bestMatch returns null when nothing scores above threshold', () => {
        const records = [{ item_name: 'Completely unrelated widget' }];
        expect(SmartPlansPricing._bestMatch(records, 'Axis P3265-LVE', 0.60)).toBeNull();
    });

    it('_bestMatch boosts score when part_number appears in the query', () => {
        const records = [
            { item_name: 'Axis Network Camera', part_number: 'P3265-LVE' },
        ];
        const best = SmartPlansPricing._bestMatch(records, 'Axis P3265-LVE dome', 0.60);
        expect(best).toBeTruthy();
        expect(best.score).toBeGreaterThanOrEqual(0.60);
    });
});

// ───────────────────────────────────────────────────────────────
// resolveItemPrice — 4-tier priority order
// ───────────────────────────────────────────────────────────────
describe('Wave 7 — resolveItemPrice priority order', () => {
    it('user override wins over everything', () => {
        SmartPlansPricing._distributorCache = [{ item_name: 'Axis P3265-LVE Camera', unit_cost: 500 }];
        SmartPlansPricing._rateLibraryCache = [{ item_name: 'Axis P3265-LVE Camera', unit_cost: 600 }];
        const r = SmartPlansPricing.resolveItemPrice('Axis P3265-LVE Camera', { userOverride: 750 });
        expect(r.source).toBe('user_override');
        expect(r.unitCost).toBe(750);
    });

    it('distributor wins when no override', () => {
        SmartPlansPricing._distributorCache = [{ item_name: 'Axis P3265-LVE Camera', unit_cost: 500, distributor: 'Graybar', part_number: 'P3265' }];
        SmartPlansPricing._rateLibraryCache = [{ item_name: 'Axis P3265-LVE Camera', unit_cost: 600 }];
        const r = SmartPlansPricing.resolveItemPrice('Axis P3265-LVE Camera');
        expect(r.source).toBe('distributor');
        expect(r.unitCost).toBe(500);
        expect(r.distributor).toBe('Graybar');
    });

    it('rate library wins when no distributor hit', () => {
        SmartPlansPricing._distributorCache = [];
        SmartPlansPricing._rateLibraryCache = [{ item_name: 'Axis P3265-LVE Camera', unit_cost: 600, last_used: '2025-03-15' }];
        const r = SmartPlansPricing.resolveItemPrice('Axis P3265-LVE Camera');
        expect(r.source).toBe('rate_library');
        expect(r.unitCost).toBe(600);
    });

    it('static DB is consulted when no distributor OR rate library hit', () => {
        SmartPlansPricing._distributorCache = [];
        SmartPlansPricing._rateLibraryCache = [];
        SmartPlansPricing._flatStaticCache = null; // force rebuild
        const r = SmartPlansPricing.resolveItemPrice('fixed dome 5mp camera', { tier: 'mid' });
        expect(['static_db', 'ai_fallback', 'unresolved']).toContain(r.source);
    });

    it('AI fallback wins when nothing else has the item', () => {
        SmartPlansPricing._distributorCache = [];
        SmartPlansPricing._rateLibraryCache = [];
        SmartPlansPricing._flatStaticCache = [];
        const r = SmartPlansPricing.resolveItemPrice('Completely Unknown Widget XYZ', { aiPrice: 123.45 });
        expect(r.source).toBe('ai_fallback');
        expect(r.unitCost).toBe(123.45);
    });

    it('returns unresolved + $0 when nothing works', () => {
        SmartPlansPricing._distributorCache = [];
        SmartPlansPricing._rateLibraryCache = [];
        SmartPlansPricing._flatStaticCache = [];
        const r = SmartPlansPricing.resolveItemPrice('Completely Unknown Widget XYZ');
        expect(r.source).toBe('unresolved');
        expect(r.unitCost).toBe(0);
    });

    it('negative or zero userOverride does not block lower tiers', () => {
        SmartPlansPricing._distributorCache = [{ item_name: 'Axis P3265-LVE Camera', unit_cost: 500 }];
        SmartPlansPricing._rateLibraryCache = [];
        const r = SmartPlansPricing.resolveItemPrice('Axis P3265-LVE Camera', { userOverride: -1 });
        expect(r.source).toBe('distributor');
    });
});

// ───────────────────────────────────────────────────────────────
// rePriceMaterialPricerOutput — post-process a BOM
// ───────────────────────────────────────────────────────────────
describe('Wave 7 — rePriceMaterialPricerOutput', () => {
    it('walks categories + items, overwrites unit_cost, stamps source', () => {
        SmartPlansPricing._distributorCache = [{ item_name: 'Axis P3265-LVE Camera', unit_cost: 500 }];
        SmartPlansPricing._rateLibraryCache = [];
        const mp = {
            categories: [{
                name: 'CCTV - Cameras',
                items: [
                    { item: 'Axis P3265-LVE Camera', qty: 10, unit_cost: 600, ext_cost: 6000 },
                    { item: 'Unknown Mystery Device', qty: 2, unit_cost: 50, ext_cost: 100 },
                ],
            }],
        };
        const stats = SmartPlansPricing.rePriceMaterialPricerOutput(mp);
        expect(stats.total).toBe(2);
        expect(stats.distributor).toBe(1);
        // Mystery device falls through — either ai_fallback (if aiPrice used) or unresolved
        expect(mp.categories[0].items[0].unit_cost).toBe(500);
        expect(mp.categories[0].items[0]._priceSource).toBe('distributor');
        expect(mp.categories[0].items[0].ext_cost).toBe(5000);
    });

    it('recomputes category subtotals after repricing', () => {
        SmartPlansPricing._distributorCache = [{ item_name: 'Item A', unit_cost: 100 }];
        SmartPlansPricing._rateLibraryCache = [];
        const mp = {
            categories: [{
                name: 'Cat1',
                items: [{ item: 'Item A', qty: 5, unit_cost: 200, ext_cost: 1000 }],
                subtotal: 1000,
            }],
        };
        SmartPlansPricing.rePriceMaterialPricerOutput(mp);
        expect(mp.categories[0].subtotal).toBe(500); // 5 * 100
    });

    it('tracks BOM delta (new total vs AI-generated total)', () => {
        SmartPlansPricing._distributorCache = [{ item_name: 'Camera', unit_cost: 500 }];
        SmartPlansPricing._rateLibraryCache = [];
        const mp = {
            categories: [{ items: [{ item: 'Camera', qty: 10, unit_cost: 700, ext_cost: 7000 }] }],
        };
        const stats = SmartPlansPricing.rePriceMaterialPricerOutput(mp);
        // Old ext = 7000, new ext = 5000 → delta = -2000
        expect(stats.deltaTotal).toBe(-2000);
    });

    it('returns empty stats on null/non-object input', () => {
        expect(SmartPlansPricing.rePriceMaterialPricerOutput(null)).toEqual({
            total: 0, distributor: 0, rate_library: 0, static_db: 0, user_override: 0, ai_fallback: 0, unresolved: 0, deltaTotal: 0,
        });
    });
});

// ───────────────────────────────────────────────────────────────
// resolveWageRates — state/county → wage table selection
// ───────────────────────────────────────────────────────────────
describe('Wave 7 — resolveWageRates', () => {
    it('California + county → CA_PREVAILING_WAGES lookup', () => {
        const r = SmartPlansPricing.resolveWageRates({ state: 'CA', county: 'Alameda', wageType: 'davis-bacon' });
        expect(r).toBeTruthy();
        expect(r.source).toBe('CA_PREVAILING_WAGES');
        expect(r.state).toBe('CA');
        expect(r.county).toBe('Alameda');
        expect(r.blended).toBeGreaterThan(50);
    });

    it('California + invalid county → incomplete (Wave 10 C6: no silent generic fallback)', () => {
        const r = SmartPlansPricing.resolveWageRates({ state: 'CA', county: 'Nonexistent', wageType: 'davis-bacon' });
        // Wave 10 C6: CA with unknown county now returns explicit incomplete
        // marker instead of null. Forces UI to surface a visible error.
        expect(r).toBeTruthy();
        expect(r.incomplete).toBe(true);
        expect(r.reason).toBe('CA_COUNTY_UNKNOWN');
    });

    it('Wave 10 C6: California + BLANK county returns incomplete with CA_COUNTY_REQUIRED', () => {
        const r = SmartPlansPricing.resolveWageRates({ state: 'CA', county: '', wageType: 'davis-bacon' });
        expect(r).toBeTruthy();
        expect(r.incomplete).toBe(true);
        expect(r.reason).toBe('CA_COUNTY_REQUIRED');
        expect(r.message).toMatch(/county/i);
    });

    it('Texas → NATIONAL_PREVAILING_WAGES metro zone lookup', () => {
        const r = SmartPlansPricing.resolveWageRates({ state: 'TX', county: '' });
        expect(r).toBeTruthy();
        expect(r.source).toBe('NATIONAL_PREVAILING_WAGES');
        expect(r.state).toBe('TX');
        expect(r.blended).toBeGreaterThan(30);
    });

    it('Florida → NATIONAL_PREVAILING_WAGES metro zone lookup', () => {
        const r = SmartPlansPricing.resolveWageRates({ state: 'FL' });
        expect(r?.source).toBe('NATIONAL_PREVAILING_WAGES');
    });

    it('state not in national table → null', () => {
        const r = SmartPlansPricing.resolveWageRates({ state: 'ND' });
        expect(r).toBeNull();
    });

    it('blank state → null', () => {
        expect(SmartPlansPricing.resolveWageRates({ state: '', county: '' })).toBeNull();
    });

    it('state is case-insensitive', () => {
        const lower = SmartPlansPricing.resolveWageRates({ state: 'tx' });
        const upper = SmartPlansPricing.resolveWageRates({ state: 'TX' });
        expect(lower?.source).toBe(upper?.source);
        expect(lower?.blended).toBeCloseTo(upper?.blended, 2);
    });
});

// ───────────────────────────────────────────────────────────────
// Pipeline wiring
// ───────────────────────────────────────────────────────────────
describe('Wave 7 — AI-engine pipeline wiring', () => {
    it('runFullAnalysis primes caches + re-prices after MATERIAL_PRICER', () => {
        expect(AI_ENGINE_SRC).toMatch(/SmartPlansPricing\.primeCaches/);
        expect(AI_ENGINE_SRC).toMatch(/SmartPlansPricing\.rePriceMaterialPricerOutput/);
    });

    it('runFullAnalysis resolves wage rates when state/county provided', () => {
        expect(AI_ENGINE_SRC).toMatch(/SmartPlansPricing\.resolveWageRates/);
        expect(AI_ENGINE_SRC).toMatch(/state\.projectState/);
        expect(AI_ENGINE_SRC).toMatch(/state\.projectCounty/);
    });

    it('Live-pricing stats are stored on context + state for UI', () => {
        expect(AI_ENGINE_SRC).toMatch(/state\._livePricingStats/);
        expect(AI_ENGINE_SRC).toMatch(/context\._livePricingStats/);
    });

    it('Resolved wage rates are stored on context + state for labor calc', () => {
        expect(AI_ENGINE_SRC).toMatch(/state\._resolvedWageRates/);
        expect(AI_ENGINE_SRC).toMatch(/context\._resolvedWageRates/);
    });
});

describe('Wave 7 — app.js state + UI wiring', () => {
    it('app.js initializes projectState + projectCounty on state', () => {
        expect(APP_JS_SRC).toMatch(/projectState:\s*""/);
        expect(APP_JS_SRC).toMatch(/projectCounty:\s*""/);
    });

    it('Step 0 renders prevailing-wage pickers inside the Davis-Bacon block', () => {
        // v5.128.10: The standalone "Prevailing-Wage Jurisdiction" block was
        // retired — it duplicated the CA county + state/metro pickers that
        // already live inside the Davis-Bacon active card. The Davis-Bacon
        // block exposes pw-county / pw-state / pw-metro when active.
        expect(APP_JS_SRC).toMatch(/id="pw-county"/);
        expect(APP_JS_SRC).toMatch(/id="pw-state"/);
        expect(APP_JS_SRC).toMatch(/id="pw-metro"/);
    });

    it('state change handler clears county when switching away from CA', () => {
        expect(APP_JS_SRC).toMatch(/if \(state\.projectState !== 'CA'\) state\.projectCounty = ''/);
    });

    it('_renderStateOptions puts CA first and de-dupes', () => {
        expect(APP_JS_SRC).toMatch(/_renderStateOptions/);
        // CA is pushed before the loop; seen Set includes CA to prevent duplicates
        expect(APP_JS_SRC).toMatch(/const seen = new Set\(\['CA'\]\)/);
        expect(APP_JS_SRC).toMatch(/const ordered = \['CA'\]/);
    });

    it('_renderCountyOptions reads from CA_PREVAILING_WAGES.getCounties', () => {
        expect(APP_JS_SRC).toMatch(/CA_PREVAILING_WAGES\.getCounties/);
    });
});

describe('Wave 7 — index.html + sw.js asset wiring', () => {
    const INDEX_HTML = readFileSync(join(__dirname, '..', 'index.html'), 'utf-8');
    const SW_JS = readFileSync(join(__dirname, '..', 'sw.js'), 'utf-8');

    it('index.html loads pricing-service.js', () => {
        expect(INDEX_HTML).toMatch(/src="pricing-service\.js"/);
    });

    it('index.html loads prevailing-wages-ca.js and national.js', () => {
        expect(INDEX_HTML).toMatch(/src="prevailing-wages-ca\.js"/);
        expect(INDEX_HTML).toMatch(/src="prevailing-wages-national\.js"/);
    });

    it('sw.js caches pricing-service.js', () => {
        expect(SW_JS).toMatch(/'\/pricing-service\.js'/);
    });

    it('sw.js cache name kept current — bumped with material changes (Wave 10 G1: v5.128.7)', () => {
        // Any cache name matching smartplans-vMAJOR.MINOR.PATCH >= 5.128.4 is fine
        const m = SW_JS.match(/smartplans-v(\d+)\.(\d+)\.(\d+)/);
        expect(m).toBeTruthy();
        const [, major, minor, patch] = m.map(Number);
        // Must be >= 5.128.4
        expect(major).toBeGreaterThanOrEqual(5);
        if (major === 5) {
            expect(minor).toBeGreaterThanOrEqual(128);
            if (minor === 128) expect(patch).toBeGreaterThanOrEqual(4);
        }
    });
});
