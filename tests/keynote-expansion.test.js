import { describe, it, expect, beforeAll } from 'vitest';
import { loadAiEngine } from './helpers/load-ai-engine.js';

// ═══════════════════════════════════════════════════════════════
// v5.127.3 Keynote Expansion + Sanity Rules — regression tests
//
// Pins:
//   1. _parseTypicalMultiplier — text → { multiplier, per?, scope? }
//   2. _expandKeynoteMultipliers — walks a keynote array and emits
//      structured multiplier records with device inference
//   3. _applyDeterministicSanityRules — post-pricer quantity clamps
// ═══════════════════════════════════════════════════════════════

let engine;
beforeAll(() => {
  engine = loadAiEngine();
});

describe('Keynote Expansion — _parseTypicalMultiplier', () => {
  it('returns null for empty / non-string input', () => {
    expect(engine._parseTypicalMultiplier(null)).toBeNull();
    expect(engine._parseTypicalMultiplier('')).toBeNull();
    expect(engine._parseTypicalMultiplier(42)).toBeNull();
  });

  it('parses "TYP 12"', () => {
    const r = engine._parseTypicalMultiplier('Provide smoke detector. TYP 12');
    expect(r).toBeTruthy();
    expect(r.multiplier).toBe(12);
  });

  it('parses "TYP OF 6"', () => {
    const r = engine._parseTypicalMultiplier('TYP OF 6 locations');
    expect(r).toBeTruthy();
    expect(r.multiplier).toBe(6);
  });

  it('parses "TYP (4)"', () => {
    const r = engine._parseTypicalMultiplier('Camera at corridor. TYP (4)');
    expect(r).toBeTruthy();
    expect(r.multiplier).toBe(4);
  });

  it('parses "TYP 4 PER ROOM"', () => {
    const r = engine._parseTypicalMultiplier('Data outlets TYP 4 PER ROOM');
    expect(r).toBeTruthy();
    expect(r.multiplier).toBe(4);
    expect(r.per).toBe('room');
  });

  it('parses "TYPICAL OF 8"', () => {
    const r = engine._parseTypicalMultiplier('Card reader TYPICAL OF 8');
    expect(r).toBeTruthy();
    expect(r.multiplier).toBe(8);
  });

  it('parses "6 SIMILAR LOCATIONS"', () => {
    const r = engine._parseTypicalMultiplier('Install WAP at 6 SIMILAR LOCATIONS');
    expect(r).toBeTruthy();
    expect(r.multiplier).toBe(6);
  });

  it('parses "(24 TOTAL)"', () => {
    const r = engine._parseTypicalMultiplier('Patient stations (24 TOTAL)');
    expect(r).toBeTruthy();
    expect(r.multiplier).toBe(24);
    expect(r.scope).toBe('total');
  });

  it('parses "PROVIDE 3 AT EACH LOCATION"', () => {
    const r = engine._parseTypicalMultiplier('PROVIDE 3 AT EACH LOCATION');
    expect(r).toBeTruthy();
    expect(r.multiplier).toBe(3);
    expect(r.per).toMatch(/location/);
  });

  it('parses "12 LOCATIONS"', () => {
    const r = engine._parseTypicalMultiplier('Motion sensor at 12 LOCATIONS');
    expect(r).toBeTruthy();
    expect(r.multiplier).toBe(12);
  });

  it('returns null for pure prose without a number', () => {
    expect(engine._parseTypicalMultiplier('TYP all floors')).toBeNull();
    expect(engine._parseTypicalMultiplier('Provide cameras where shown')).toBeNull();
  });

  it('is case-insensitive', () => {
    const r = engine._parseTypicalMultiplier('typ 10');
    expect(r).toBeTruthy();
    expect(r.multiplier).toBe(10);
  });
});

describe('Keynote Expansion — _expandKeynoteMultipliers', () => {
  it('returns empty array for null / missing input', () => {
    expect(engine._expandKeynoteMultipliers(null)).toEqual([]);
    expect(engine._expandKeynoteMultipliers(undefined)).toEqual([]);
    expect(engine._expandKeynoteMultipliers([])).toEqual([]);
  });

  it('infers CCTV discipline for a camera keynote', () => {
    const r = engine._expandKeynoteMultipliers([
      { note_text: 'Provide exterior camera at perimeter. TYP 8', source_sheet: 'T-101' },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].multiplier).toBe(8);
    expect(r[0].discipline).toBe('CCTV');
    expect(r[0].device).toBe('camera');
    expect(r[0].source_sheet).toBe('T-101');
  });

  it('infers Fire Alarm for a smoke detector keynote', () => {
    const r = engine._expandKeynoteMultipliers([
      { note_text: 'Smoke detector (24 TOTAL)', source_sheet: 'FA-201' },
    ]);
    expect(r[0].discipline).toBe('Fire Alarm');
    expect(r[0].device).toBe('detector');
    expect(r[0].multiplier).toBe(24);
  });

  it('infers Access Control for a card reader keynote', () => {
    const r = engine._expandKeynoteMultipliers([
      { note_text: 'Card reader TYP OF 12', source_sheet: 'SEC-2.0' },
    ]);
    expect(r[0].discipline).toBe('Access Control');
    expect(r[0].device).toBe('card_reader');
  });

  it('infers Structured Cabling for a WAP keynote', () => {
    const r = engine._expandKeynoteMultipliers([
      { note_text: 'Wireless access point TYP (6)', source_sheet: 'T-1.0' },
    ]);
    expect(r[0].discipline).toBe('Structured Cabling');
    expect(r[0].device).toBe('wap');
  });

  it('skips keynotes without a parseable multiplier', () => {
    const r = engine._expandKeynoteMultipliers([
      { note_text: 'Cameras as shown on plan', source_sheet: 'T-1' },
    ]);
    expect(r).toEqual([]);
  });

  it('skips keynotes where the multiplier is 1 or less (noise)', () => {
    const r = engine._expandKeynoteMultipliers([
      { note_text: 'Camera TYP 1', source_sheet: 'T-1' },
    ]);
    expect(r).toEqual([]);
  });

  it('leaves device unknown when no keyword matches', () => {
    const r = engine._expandKeynoteMultipliers([
      { note_text: 'Coordinate with owner TYP 4', source_sheet: 'G-001' },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].device).toBeNull();
    expect(r[0].discipline).toBeNull();
  });

  it('processes multiple notes and preserves order', () => {
    const r = engine._expandKeynoteMultipliers([
      { note_text: 'Camera TYP 8', source_sheet: 'T-101' },
      { note_text: 'Card reader (12 TOTAL)', source_sheet: 'SEC-201' },
      { note_text: 'Smoke detector 20 SIMILAR LOCATIONS', source_sheet: 'FA-101' },
    ]);
    expect(r).toHaveLength(3);
    expect(r.map(x => x.device)).toEqual(['camera', 'card_reader', 'detector']);
  });

  it('accepts notes with `text` or `quote` fields instead of `note_text`', () => {
    const r = engine._expandKeynoteMultipliers([
      { text: 'Data outlet TYP 4', sheet: 'T-1' },
      { quote: 'Pull station (6 TOTAL)', sheet: 'FA-1' },
    ]);
    expect(r).toHaveLength(2);
  });
});

describe('Deterministic Sanity Rules — _applyDeterministicSanityRules', () => {
  const makeBom = (items) => [{ name: 'Test', items }];

  it('returns input unchanged when bom is not an array', () => {
    const r = engine._applyDeterministicSanityRules(null, {});
    expect(r.adjusted).toBeNull();
    expect(r.adjustments).toEqual([]);
  });

  it('clamps J-hooks to 2× data drops', () => {
    const bom = makeBom([
      { item: 'J-Hook 2in', qty: 800, unit: 'ea', unit_cost: 2, ext_cost: 1600 },
    ]);
    const r = engine._applyDeterministicSanityRules(bom, { data_outlet: 200 });
    expect(r.adjustments).toHaveLength(1);
    expect(r.adjustments[0].rule).toBe('jhook_ceiling');
    // 200 drops × 2 = 400 max
    expect(bom[0].items[0].qty).toBeLessThanOrEqual(400);
  });

  it('does not clamp J-hooks that are already within the ceiling', () => {
    const bom = makeBom([
      { item: 'J-Hook 2in', qty: 300, unit: 'ea', unit_cost: 2, ext_cost: 600 },
    ]);
    const r = engine._applyDeterministicSanityRules(bom, { data_outlet: 200 });
    expect(r.adjustments).toEqual([]);
    expect(bom[0].items[0].qty).toBe(300);
  });

  it('clamps 48-port patch panels to CEIL(jacks / 48)', () => {
    const bom = makeBom([
      { item: '48-port Patch Panel', qty: 25, unit: 'ea', unit_cost: 300, ext_cost: 7500 },
    ]);
    // 100 jacks / 48 = CEIL(2.08) = 3 panels, allow up to 1.5× = 4.5 → 25 is way over
    const r = engine._applyDeterministicSanityRules(bom, { data_outlet: 100 });
    expect(r.adjustments).toHaveLength(1);
    expect(r.adjustments[0].rule).toBe('patch_panel_ceiling');
    expect(bom[0].items[0].qty).toBe(3);
  });

  it('flags excessive cable footage without auto-correcting', () => {
    const bom = makeBom([
      { item: 'Cat 6 Cable Plenum', qty: 50000, unit: 'ft', unit_cost: 0.5, ext_cost: 25000 },
    ]);
    // 50000 / 100 drops = 500ft/drop — way over 280ft max
    const r = engine._applyDeterministicSanityRules(bom, { data_outlet: 100 });
    expect(r.adjustments.some(a => a.rule === 'cable_footage_sanity')).toBe(true);
    // Flag-only — quantity not changed
    expect(bom[0].items[0].qty).toBe(50000);
  });

  it('flags reader/door count mismatch > 15%', () => {
    const bom = makeBom([
      { item: 'Card Reader HID', qty: 20, unit: 'ea', unit_cost: 500, ext_cost: 10000 },
    ]);
    // 20 readers vs 10 doors → 100% over
    const r = engine._applyDeterministicSanityRules(bom, { controlled_door: 10 });
    expect(r.adjustments.some(a => a.rule === 'reader_door_match')).toBe(true);
  });

  it('does not flag reader/door match when within 15%', () => {
    const bom = makeBom([
      { item: 'Card Reader HID', qty: 11, unit: 'ea', unit_cost: 500, ext_cost: 5500 },
    ]);
    const r = engine._applyDeterministicSanityRules(bom, { controlled_door: 10 });
    expect(r.adjustments.filter(a => a.rule === 'reader_door_match')).toEqual([]);
  });

  it('returns empty adjustments when consensus counts are all zero', () => {
    const bom = makeBom([
      { item: 'J-Hook 2in', qty: 100, unit: 'ea', unit_cost: 2, ext_cost: 200 },
    ]);
    const r = engine._applyDeterministicSanityRules(bom, {});
    expect(r.adjustments).toEqual([]);
  });
});
