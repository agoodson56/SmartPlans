import { describe, it, expect, beforeEach } from 'vitest';
import { loadAiEngine, mockState, mockContext } from './helpers/load-ai-engine.js';

// ═══════════════════════════════════════════════════════════════
// SmartPlans AI Engine — Regression Tests
//
// Every test in this file pins a specific bug I already fixed so
// it can't come back. When a test here breaks, it means a future
// edit re-introduced a bug that I already burned a commit on.
// ═══════════════════════════════════════════════════════════════

let SmartBrains;

beforeEach(() => {
  SmartBrains = loadAiEngine();
});

// ───────────────────────────────────────────────────────────────
// P0.2 — Pre-Pricer guard: shape-check
// v5.126.3 regression fix for crash on null/array consensusCounts
// ───────────────────────────────────────────────────────────────
describe('P0.2 Pre-Pricer Guard shape handling', () => {
  it('_validateBrainOutput rejects Material Pricer with corrupt items', () => {
    const corrupt = {
      categories: [
        { name: 'Cabling', items: [{ item: 'Cat6', qty: 100 /* missing unit_cost, ext_cost */ }] },
      ],
      grand_total: 0,
    };
    const r = SmartBrains._validateBrainOutput('MATERIAL_PRICER', corrupt);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/corrupt/i);
  });

  it('_validateBrainOutput accepts Material Pricer with valid items', () => {
    const good = {
      categories: [
        { name: 'Cabling', items: [{ item: 'Cat6', qty: 100, unit_cost: 0.5, ext_cost: 50 }] },
      ],
      grand_total: 50,
    };
    const r = SmartBrains._validateBrainOutput('MATERIAL_PRICER', good);
    expect(r.valid).toBe(true);
  });

  it('_validateBrainOutput exempts zero-count warning items', () => {
    const withWarning = {
      categories: [
        {
          name: 'Fire Alarm',
          items: [{
            item: 'Fire Alarm — NO DEVICE COUNT — Upload missing plan sheet',
            qty: 0, unit: 'ea', unit_cost: 0, ext_cost: 0,
            _zero_count_warning: true,
          }],
        },
      ],
      grand_total: 0,
    };
    const r = SmartBrains._validateBrainOutput('MATERIAL_PRICER', withWarning);
    expect(r.valid).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────
// P1.4 — Per-brain validators for v5.124.5 additions
// ───────────────────────────────────────────────────────────────
describe('Per-brain validators (v5.124.5 brains)', () => {
  it('SCOPE_DELINEATION_SCANNER rejects non-array delineations', () => {
    const bad = { delineations: 'not-an-array', ofoi_items: [], nic_items: [], by_others: [] };
    const r = SmartBrains._validateBrainOutput('SCOPE_DELINEATION_SCANNER', bad);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/must be an array/i);
  });

  it('SCOPE_DELINEATION_SCANNER rejects delineation missing phrase_type', () => {
    const bad = {
      delineations: [{ exact_phrase: 'test' /* missing phrase_type */ }],
      ofoi_items: [], nic_items: [], by_others: [],
    };
    const r = SmartBrains._validateBrainOutput('SCOPE_DELINEATION_SCANNER', bad);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/phrase_type/i);
  });

  it('SCOPE_DELINEATION_SCANNER accepts complete delineations', () => {
    const good = {
      delineations: [{ phrase_type: 'OFOI', exact_phrase: 'Security Camera Provided by Owner' }],
      ofoi_items: [], nic_items: [], by_others: [],
    };
    const r = SmartBrains._validateBrainOutput('SCOPE_DELINEATION_SCANNER', good);
    expect(r.valid).toBe(true);
  });

  it('PREVAILING_WAGE_DETECTOR rejects non-boolean requires_davis_bacon', () => {
    const bad = { requires_davis_bacon: 'yes', indicators: [], wage_determination: null };
    const r = SmartBrains._validateBrainOutput('PREVAILING_WAGE_DETECTOR', bad);
    expect(r.valid).toBe(false);
  });

  it('DOOR_SCHEDULE_PARSER accepts schedule_found=false without doors', () => {
    const r = SmartBrains._validateBrainOutput('DOOR_SCHEDULE_PARSER', {
      schedule_found: false, doors: [], access_control_doors: [], hardware_summary: {},
    });
    expect(r.valid).toBe(true);
  });

  it('DOOR_SCHEDULE_PARSER rejects doors not being an array when schedule_found', () => {
    const r = SmartBrains._validateBrainOutput('DOOR_SCHEDULE_PARSER', {
      schedule_found: true, doors: 'not-an-array', access_control_doors: [], hardware_summary: {},
    });
    expect(r.valid).toBe(false);
  });

  it('SHEET_INVENTORY_GUARD rejects invalid coverage_pct', () => {
    const r = SmartBrains._validateBrainOutput('SHEET_INVENTORY_GUARD', {
      index_found: true, index_sheet_list: [], uploaded_sheet_count: 0,
      missing_sheets: [], coverage_pct: 150,
    });
    expect(r.valid).toBe(false);
  });

  it('SHEET_INVENTORY_GUARD accepts index_found=false', () => {
    const r = SmartBrains._validateBrainOutput('SHEET_INVENTORY_GUARD', {
      index_found: false, index_sheet_list: [], uploaded_sheet_count: 0,
      missing_sheets: [], coverage_pct: 0,
    });
    expect(r.valid).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────
// Circuit breaker state management
// v5.126.0 Phase 1.5 + v5.126.3 P0.1 regression fix
// ───────────────────────────────────────────────────────────────
describe('Circuit breaker state', () => {
  it('starts untripped with zero consecutive 429s', () => {
    expect(SmartBrains._circuitBreaker.consecutive429s).toBe(0);
    expect(SmartBrains._circuitBreaker.isTripped()).toBe(false);
  });

  it('trips after TRIP_THRESHOLD consecutive 429s', () => {
    for (let i = 0; i < 5; i++) SmartBrains._circuitBreaker.record429();
    expect(SmartBrains._circuitBreaker.consecutive429s).toBe(5);
    expect(SmartBrains._circuitBreaker.isTripped()).toBe(true);
  });

  it('recordSuccess resets consecutive 429 counter', () => {
    for (let i = 0; i < 3; i++) SmartBrains._circuitBreaker.record429();
    SmartBrains._circuitBreaker.recordSuccess();
    expect(SmartBrains._circuitBreaker.consecutive429s).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────
// P2 — Dead slot blacklist
// v5.126.2 introduced, v5.126.3 made it reset per bid
// ───────────────────────────────────────────────────────────────
describe('Dead slot blacklist', () => {
  it('_deadSlots is a Set', () => {
    expect(SmartBrains._deadSlots).toBeInstanceOf(Set);
  });

  it('_deadSlotReasons is a Map', () => {
    expect(SmartBrains._deadSlotReasons).toBeInstanceOf(Map);
  });

  it('_deadSlots starts empty on fresh load', () => {
    expect(SmartBrains._deadSlots.size).toBe(0);
  });

  it('can add and check dead slots', () => {
    SmartBrains._deadSlots.add(6);
    SmartBrains._deadSlots.add(7);
    SmartBrains._deadSlotReasons.set(6, 'HTTP 403 PERMISSION_DENIED');
    expect(SmartBrains._deadSlots.has(6)).toBe(true);
    expect(SmartBrains._deadSlots.has(7)).toBe(true);
    expect(SmartBrains._deadSlots.has(8)).toBe(false);
    expect(SmartBrains._deadSlotReasons.get(6)).toMatch(/PERMISSION_DENIED/);
  });
});

// ───────────────────────────────────────────────────────────────
// Schema enforcement
// ───────────────────────────────────────────────────────────────
describe('_SCHEMAS coverage', () => {
  it('all v5.124.5 brains have schema entries', () => {
    const requiredSchemas = [
      'PREVAILING_WAGE_DETECTOR',
      'SHEET_INVENTORY_GUARD',
      'SCOPE_DELINEATION_SCANNER',
      'KEYNOTE_EXTRACTOR',
      'DOOR_SCHEDULE_PARSER',
    ];
    for (const key of requiredSchemas) {
      expect(SmartBrains._SCHEMAS[key]).toBeDefined();
      expect(Array.isArray(SmartBrains._SCHEMAS[key])).toBe(true);
      expect(SmartBrains._SCHEMAS[key].length).toBeGreaterThan(0);
    }
  });

  it('critical-path brains have required fields', () => {
    expect(SmartBrains._SCHEMAS.SYMBOL_SCANNER).toContain('sheets');
    expect(SmartBrains._SCHEMAS.SYMBOL_SCANNER).toContain('totals');
    expect(SmartBrains._SCHEMAS.MATERIAL_PRICER).toContain('categories');
    expect(SmartBrains._SCHEMAS.LABOR_CALCULATOR).toContain('phases');
    expect(SmartBrains._SCHEMAS.FINANCIAL_ENGINE).toContain('sov');
  });
});

// ───────────────────────────────────────────────────────────────
// P1.9 — Sensitive field registry
// v5.126.0 Phase 1.9: helpers that must exist for future wiring
// ───────────────────────────────────────────────────────────────
describe('Sensitive context field registry', () => {
  it('_SENSITIVE_CONTEXT_FIELDS includes pricing fields', () => {
    expect(SmartBrains._SENSITIVE_CONTEXT_FIELDS).toContain('laborRates');
    expect(SmartBrains._SENSITIVE_CONTEXT_FIELDS).toContain('markup');
    expect(SmartBrains._SENSITIVE_CONTEXT_FIELDS).toContain('burdenRate');
  });

  it('_FINANCIAL_BRAINS includes MATERIAL_PRICER and LABOR_CALCULATOR', () => {
    expect(SmartBrains._FINANCIAL_BRAINS).toBeInstanceOf(Set);
    expect(SmartBrains._FINANCIAL_BRAINS.has('MATERIAL_PRICER')).toBe(true);
    expect(SmartBrains._FINANCIAL_BRAINS.has('LABOR_CALCULATOR')).toBe(true);
    expect(SmartBrains._FINANCIAL_BRAINS.has('FINANCIAL_ENGINE')).toBe(true);
  });

  it('_stripSensitiveContext removes pricing for non-financial brains', () => {
    const input = { projectName: 'Test', laborRates: { ec: 85 }, markup: { labor: 50 } };
    const stripped = SmartBrains._stripSensitiveContext(input, 'SYMBOL_SCANNER');
    expect(stripped.projectName).toBe('Test');
    expect(stripped.laborRates).toBeUndefined();
    expect(stripped.markup).toBeUndefined();
  });

  it('_stripSensitiveContext preserves pricing for financial brains', () => {
    const input = { projectName: 'Test', laborRates: { ec: 85 }, markup: { labor: 50 } };
    const kept = SmartBrains._stripSensitiveContext(input, 'LABOR_CALCULATOR');
    expect(kept.laborRates).toEqual({ ec: 85 });
    expect(kept.markup).toEqual({ labor: 50 });
  });

  it('_redactForLogging masks sensitive fields', () => {
    const input = { projectName: 'Test', laborRates: { ec: 85 }, markup: { labor: 50 } };
    const redacted = SmartBrains._redactForLogging(input);
    expect(redacted.projectName).toBe('Test');
    expect(redacted.laborRates).toBe('[REDACTED]');
    expect(redacted.markup).toBe('[REDACTED]');
  });
});

// ───────────────────────────────────────────────────────────────
// Brain registry integrity
// ───────────────────────────────────────────────────────────────
describe('BRAIN registry integrity', () => {
  it('every brain has the required fields', () => {
    for (const [key, brain] of Object.entries(SmartBrains.BRAINS)) {
      expect(brain.id).toBeDefined();
      expect(brain.name).toBeDefined();
      expect(brain.wave).toBeDefined();
      expect(brain.needsFiles).toBeDefined();
      expect(Array.isArray(brain.needsFiles)).toBe(true);
    }
  });

  it('v5.124.5 new brains are registered', () => {
    const required = [
      'PREVAILING_WAGE_DETECTOR',
      'SHEET_INVENTORY_GUARD',
      'SCOPE_DELINEATION_SCANNER',
      'KEYNOTE_EXTRACTOR',
      'DOOR_SCHEDULE_PARSER',
    ];
    for (const key of required) {
      expect(SmartBrains.BRAINS[key]).toBeDefined();
      expect(SmartBrains.BRAINS[key].name).toBeDefined();
    }
  });

  it('Wave 0.3 brains run before Wave 1', () => {
    expect(SmartBrains.BRAINS.PREVAILING_WAGE_DETECTOR.wave).toBe(0.3);
    expect(SmartBrains.BRAINS.SHEET_INVENTORY_GUARD.wave).toBe(0.3);
  });
});
