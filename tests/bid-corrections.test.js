import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Estimator Feedback Loop — v5.127.1 regression tests
//
// The aggregation formula lives inside the MATERIAL_PRICER prompt
// closure in ai-engine.js. We re-implement it here so we can pin
// the expected outputs. When the real aggregator changes, update
// this function to match — it's a pure function of the raw rows
// so the logic is trivially testable in isolation.
// ═══════════════════════════════════════════════════════════════

function aggregateCorrections(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const byItem = {};
  for (const c of raw) {
    if (!c || !c.item_name || !c.field_changed) continue;
    const key = (c.item_name + '|' + c.field_changed).toLowerCase();
    if (!byItem[key]) {
      byItem[key] = {
        item_name: c.item_name,
        field: c.field_changed,
        discipline: c.discipline || null,
        count: 0,
        deltaSum: 0,
        deltaAbsSum: 0,
        origSum: 0,
        corrSum: 0,
        origCount: 0,
        corrCount: 0,
      };
    }
    const agg = byItem[key];
    agg.count++;
    const d = parseFloat(c.delta_pct);
    if (!isNaN(d)) {
      agg.deltaSum += d;
      agg.deltaAbsSum += Math.abs(d);
    }
    const o = parseFloat(c.original_value);
    const v = parseFloat(c.corrected_value);
    if (!isNaN(o)) { agg.origSum += o; agg.origCount++; }
    if (!isNaN(v)) { agg.corrSum += v; agg.corrCount++; }
  }

  return Object.values(byItem)
    .map(a => ({
      ...a,
      avgDelta: a.count > 0 ? a.deltaSum / a.count : 0,
      avgAbsDelta: a.count > 0 ? a.deltaAbsSum / a.count : 0,
      avgOrig: a.origCount > 0 ? a.origSum / a.origCount : null,
      avgCorr: a.corrCount > 0 ? a.corrSum / a.corrCount : null,
    }))
    .filter(r => r.count >= 2 || Math.abs(r.avgDelta) >= 10)
    .sort((a, b) => (b.count * 10 + b.avgAbsDelta) - (a.count * 10 + a.avgAbsDelta));
}

// Pure delta calculation — must match the API's server-side formula
function deltaPct(original, corrected) {
  if (original == null || corrected == null || original === 0) return null;
  return Math.round(((corrected - original) / original) * 10000) / 100;
}

describe('Bid Corrections — delta calculation', () => {
  it('returns null when the original is zero (divide-by-zero guard)', () => {
    expect(deltaPct(0, 100)).toBeNull();
  });

  it('returns null when either side is null', () => {
    expect(deltaPct(null, 100)).toBeNull();
    expect(deltaPct(100, null)).toBeNull();
  });

  it('computes a positive delta for a markup correction', () => {
    // $100 → $120 = +20%
    expect(deltaPct(100, 120)).toBe(20);
  });

  it('computes a negative delta for a price cut', () => {
    // $100 → $80 = -20%
    expect(deltaPct(100, 80)).toBe(-20);
  });

  it('rounds to two decimal places to keep rows compact', () => {
    // 1 → 1.337 = +33.7%
    expect(deltaPct(1, 1.337)).toBe(33.7);
  });
});

describe('Bid Corrections — aggregation', () => {
  it('returns empty for empty input', () => {
    expect(aggregateCorrections([])).toEqual([]);
    expect(aggregateCorrections(null)).toEqual([]);
    expect(aggregateCorrections(undefined)).toEqual([]);
  });

  it('drops rows without item_name or field_changed', () => {
    const r = aggregateCorrections([
      { item_name: 'Valid', field_changed: 'unit_cost', delta_pct: 15 },
      { item_name: '', field_changed: 'unit_cost', delta_pct: 15 },
      { item_name: 'Valid', field_changed: '', delta_pct: 15 },
      null,
      undefined,
    ]);
    // Only the one valid row remains, but it has count=1 and |delta|=15
    // which passes the filter threshold
    expect(r).toHaveLength(1);
    expect(r[0].item_name).toBe('Valid');
  });

  it('filters out low-signal rows (1 instance, <10% delta)', () => {
    const r = aggregateCorrections([
      { item_name: 'Noise', field_changed: 'unit_cost', delta_pct: 3, original_value: 100, corrected_value: 103 },
    ]);
    expect(r).toHaveLength(0);
  });

  it('keeps rows with 2+ instances even if each delta is small', () => {
    const r = aggregateCorrections([
      { item_name: 'Repeat', field_changed: 'unit_cost', delta_pct: 3, original_value: 100, corrected_value: 103 },
      { item_name: 'Repeat', field_changed: 'unit_cost', delta_pct: 4, original_value: 100, corrected_value: 104 },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].count).toBe(2);
    expect(r[0].avgDelta).toBeCloseTo(3.5, 3);
  });

  it('groups by (item_name, field) — qty and unit_cost are separate signals', () => {
    const r = aggregateCorrections([
      { item_name: 'Camera', field_changed: 'unit_cost', delta_pct: 20, original_value: 1000, corrected_value: 1200 },
      { item_name: 'Camera', field_changed: 'qty', delta_pct: 50, original_value: 10, corrected_value: 15 },
    ]);
    expect(r).toHaveLength(2);
    const fields = r.map(x => x.field).sort();
    expect(fields).toEqual(['qty', 'unit_cost']);
  });

  it('groups case-insensitively so "Camera" and "camera" merge', () => {
    const r = aggregateCorrections([
      { item_name: 'Camera', field_changed: 'unit_cost', delta_pct: 15, original_value: 1000, corrected_value: 1150 },
      { item_name: 'camera', field_changed: 'unit_cost', delta_pct: 25, original_value: 1000, corrected_value: 1250 },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].count).toBe(2);
    expect(r[0].avgDelta).toBeCloseTo(20, 3);
  });

  it('averages original and corrected values across rows', () => {
    const r = aggregateCorrections([
      { item_name: 'X', field_changed: 'unit_cost', delta_pct: 10, original_value: 100, corrected_value: 110 },
      { item_name: 'X', field_changed: 'unit_cost', delta_pct: 30, original_value: 200, corrected_value: 260 },
    ]);
    expect(r[0].avgOrig).toBe(150);
    expect(r[0].avgCorr).toBe(185);
  });

  it('sorts most-corrected items first (count × 10 + |avg delta|)', () => {
    const r = aggregateCorrections([
      // Item A: 3 instances at +5% each → score = 3*10 + 5 = 35
      { item_name: 'A', field_changed: 'unit_cost', delta_pct: 5, original_value: 100, corrected_value: 105 },
      { item_name: 'A', field_changed: 'unit_cost', delta_pct: 5, original_value: 100, corrected_value: 105 },
      { item_name: 'A', field_changed: 'unit_cost', delta_pct: 5, original_value: 100, corrected_value: 105 },
      // Item B: 1 instance at +40% → score = 1*10 + 40 = 50 (wait — filter requires count>=2 OR |delta|>=10)
      { item_name: 'B', field_changed: 'unit_cost', delta_pct: 40, original_value: 100, corrected_value: 140 },
    ]);
    expect(r).toHaveLength(2);
    expect(r[0].item_name).toBe('B'); // B (score 50) > A (score 35)
    expect(r[1].item_name).toBe('A');
  });

  it('preserves discipline on the first row seen', () => {
    const r = aggregateCorrections([
      { item_name: 'Reader', field_changed: 'unit_cost', delta_pct: 15, discipline: 'Access Control', original_value: 400, corrected_value: 460 },
      { item_name: 'Reader', field_changed: 'unit_cost', delta_pct: 20, discipline: null, original_value: 400, corrected_value: 480 },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].discipline).toBe('Access Control');
  });

  it('handles a realistic multi-item corpus from 3 past bids', () => {
    const raw = [
      // Bid 1 (VA Clinic, CCTV)
      { item_name: 'Fixed Dome Camera', field_changed: 'unit_cost', delta_pct: 18, discipline: 'CCTV', original_value: 800, corrected_value: 944 },
      { item_name: 'PTZ Camera',        field_changed: 'unit_cost', delta_pct: 25, discipline: 'CCTV', original_value: 6000, corrected_value: 7500 },
      { item_name: 'NVR Server',        field_changed: 'qty',       delta_pct: 100, discipline: 'CCTV', original_value: 1, corrected_value: 2 },
      // Bid 2 (Hospital, CCTV)
      { item_name: 'Fixed Dome Camera', field_changed: 'unit_cost', delta_pct: 22, discipline: 'CCTV', original_value: 800, corrected_value: 976 },
      { item_name: 'Card Reader',       field_changed: 'unit_cost', delta_pct: -5, discipline: 'Access Control', original_value: 450, corrected_value: 427.5 },
      // Bid 3 (VA Clinic, CCTV)
      { item_name: 'Fixed Dome Camera', field_changed: 'unit_cost', delta_pct: 20, discipline: 'CCTV', original_value: 800, corrected_value: 960 },
    ];
    const r = aggregateCorrections(raw);

    // All entries survive the filter: Fixed Dome (3 instances), PTZ (1 @ 25%),
    // NVR Server (1 @ 100%). Card Reader (1 @ -5%) fails both thresholds.
    const items = r.map(x => x.item_name);
    expect(items).toContain('Fixed Dome Camera');
    expect(items).toContain('PTZ Camera');
    expect(items).toContain('NVR Server');
    expect(items).not.toContain('Card Reader');

    // Fixed Dome averages (18+22+20)/3 = 20
    const dome = r.find(x => x.item_name === 'Fixed Dome Camera');
    expect(dome.count).toBe(3);
    expect(dome.avgDelta).toBeCloseTo(20, 3);
    expect(dome.avgOrig).toBe(800);
    expect(dome.avgCorr).toBe(960);

    // NVR Server with +100% delta is the strongest single signal but has
    // only 1 instance. Fixed Dome (3*10 + 20 = 50) wins on the
    // (count*10 + |avgDelta|) sort vs NVR (1*10 + 100 = 110).
    // Actually NVR wins with score 110 > Dome 50. Assert the correct order.
    expect(r[0].item_name).toBe('NVR Server');
  });
});
