import { describe, it, expect, beforeAll } from 'vitest';
import { loadAiEngine } from './helpers/load-ai-engine.js';

// ═══════════════════════════════════════════════════════════════
// v5.127.2 Vector Extraction Pre-Processing — pure helper tests
//
// The pdf.js-dependent method `_extractVectorStructure` needs a real
// PDF to test against, so we exercise the three PURE helpers instead:
//   1. _classifyVectorTextItem  — text string → classification
//   2. _extractSheetIdFromText  — title-block blob → sheet id
//   3. _summarizeVectorPaths    — operator list → line/rect/curve counts
//
// Plus _formatVectorSummaryForPrompt which is also pure.
// ═══════════════════════════════════════════════════════════════

let engine;
beforeAll(() => {
  engine = loadAiEngine();
});

describe('Vector Extractor — _classifyVectorTextItem', () => {
  it('returns "other" for empty / non-string / whitespace-only input', () => {
    expect(engine._classifyVectorTextItem(null).type).toBe('other');
    expect(engine._classifyVectorTextItem(undefined).type).toBe('other');
    expect(engine._classifyVectorTextItem('').type).toBe('other');
    expect(engine._classifyVectorTextItem('   ').type).toBe('other');
    expect(engine._classifyVectorTextItem(42).type).toBe('other');
  });

  it('classifies a scale string as scale_text', () => {
    const r = engine._classifyVectorTextItem('1/8" = 1\'-0"');
    expect(r.type).toBe('scale_text');
    expect(r.confidence).toBeGreaterThan(0.9);
  });

  it('classifies "SCALE: 1:96" as scale_text', () => {
    const r = engine._classifyVectorTextItem('SCALE: 1:96');
    expect(r.type).toBe('scale_text');
  });

  it('classifies "T-101" as sheet_id (T = Telecom prefix)', () => {
    const r = engine._classifyVectorTextItem('T-101');
    expect(r.type).toBe('sheet_id');
    expect(r.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('classifies "FA-2.01" as sheet_id (Fire Alarm prefix)', () => {
    const r = engine._classifyVectorTextItem('FA-2.01');
    expect(r.type).toBe('sheet_id');
  });

  it('classifies "CR-12" as device_label for Access Control', () => {
    const r = engine._classifyVectorTextItem('CR-12');
    expect(r.type).toBe('device_label');
    expect(r.discipline).toBe('Access Control');
    expect(r.device).toBe('card_reader');
    expect(r.deviceCode).toBe('CR');
  });

  it('classifies "SD-101" as Fire Alarm smoke detector', () => {
    const r = engine._classifyVectorTextItem('SD-101');
    expect(r.type).toBe('device_label');
    expect(r.discipline).toBe('Fire Alarm');
    expect(r.device).toBe('smoke_detector');
  });

  it('classifies "WAP-5" as Structured Cabling wireless AP', () => {
    const r = engine._classifyVectorTextItem('WAP-5');
    expect(r.type).toBe('device_label');
    expect(r.discipline).toBe('Structured Cabling');
    expect(r.device).toBe('wireless_ap');
  });

  it('classifies "PTZ-3" as CCTV ptz camera', () => {
    const r = engine._classifyVectorTextItem('PTZ-3');
    expect(r.type).toBe('device_label');
    expect(r.discipline).toBe('CCTV');
    expect(r.device).toBe('ptz_camera');
  });

  it('classifies unknown-prefix labels as low-confidence device_label', () => {
    const r = engine._classifyVectorTextItem('ZZ-5');
    expect(r.type).toBe('device_label');
    expect(r.deviceCode).toBe('ZZ');
    expect(r.confidence).toBeLessThan(0.5);
  });

  it('classifies "101" as a room_number', () => {
    const r = engine._classifyVectorTextItem('101');
    expect(r.type).toBe('room_number');
  });

  it('classifies "12" as a keynote callout', () => {
    const r = engine._classifyVectorTextItem('12');
    expect(r.type).toBe('keynote');
  });

  it('classifies "12\'-6\\"" as a dimension', () => {
    const r = engine._classifyVectorTextItem('12\'-6"');
    expect(r.type).toBe('dimension');
  });

  it('classifies "TYP" as an annotation', () => {
    const r = engine._classifyVectorTextItem('TYP');
    expect(r.type).toBe('annotation');
  });

  it('classifies "N.T.S." as an annotation', () => {
    const r = engine._classifyVectorTextItem('N.T.S.');
    expect(r.type).toBe('annotation');
  });

  it('classifies "OFCI" as an annotation', () => {
    const r = engine._classifyVectorTextItem('OFCI');
    expect(r.type).toBe('annotation');
  });

  it('classifies "FIRE ALARM FLOOR PLAN" as a title_block line', () => {
    const r = engine._classifyVectorTextItem('FIRE ALARM FLOOR PLAN');
    expect(r.type).toBe('title_block');
  });

  it('falls through to "other" for random text', () => {
    const r = engine._classifyVectorTextItem('Hello World!');
    expect(r.type).toBe('other');
  });
});

describe('Vector Extractor — _extractSheetIdFromText', () => {
  it('returns null for empty / non-string input', () => {
    expect(engine._extractSheetIdFromText(null)).toBeNull();
    expect(engine._extractSheetIdFromText('')).toBeNull();
    expect(engine._extractSheetIdFromText(42)).toBeNull();
  });

  it('extracts "T-101" from a blob of title-block text', () => {
    const blob = 'SHEET T-101 FLOOR PLAN TELECOM 01/15/2026';
    expect(engine._extractSheetIdFromText(blob)).toBe('T-101');
  });

  it('extracts "FA-2.01" (with dotted variant)', () => {
    const blob = 'FIRE ALARM FA-2.01 FIRST FLOOR PLAN';
    expect(engine._extractSheetIdFromText(blob)).toBe('FA-2.01');
  });

  it('extracts "E101" (no dash)', () => {
    const blob = 'SHEET E101 ELECTRICAL';
    expect(engine._extractSheetIdFromText(blob)).toBe('E101');
  });

  it('returns null when nothing matches', () => {
    expect(engine._extractSheetIdFromText('just a floor plan')).toBeNull();
  });

  it('returns the first matching sheet id (typical blob has one)', () => {
    const blob = 'DRAWING T-101 REVISION 2';
    expect(engine._extractSheetIdFromText(blob)).toBe('T-101');
  });
});

describe('Vector Extractor — _summarizeVectorPaths', () => {
  // Mock OPS codes
  const FAKE_OPS = {
    moveTo: 13,
    lineTo: 14,
    curveTo: 15,
    curveTo2: 16,
    curveTo3: 17,
    closePath: 18,
    rectangle: 19,
    stroke: 20,
    fill: 22,
    constructPath: 91,
    showText: 44,
    showSpacedText: 45,
    nextLineShowText: 46,
    nextLineSetSpacingShowText: 47,
  };

  it('returns zero counts for null / malformed input', () => {
    const r = engine._summarizeVectorPaths(null, FAKE_OPS);
    expect(r.lineCount).toBe(0);
    expect(r.rectCount).toBe(0);
    expect(r.curveCount).toBe(0);
  });

  it('counts legacy per-op lineTo/rectangle/curveTo operators', () => {
    const opList = {
      fnArray: [FAKE_OPS.lineTo, FAKE_OPS.lineTo, FAKE_OPS.rectangle, FAKE_OPS.curveTo],
      argsArray: [[], [], [], []],
    };
    const r = engine._summarizeVectorPaths(opList, FAKE_OPS);
    expect(r.lineCount).toBe(2);
    expect(r.rectCount).toBe(1);
    expect(r.curveCount).toBe(1);
  });

  it('counts sub-ops inside constructPath (modern pdf.js)', () => {
    const opList = {
      fnArray: [FAKE_OPS.constructPath, FAKE_OPS.constructPath],
      argsArray: [
        [[FAKE_OPS.moveTo, FAKE_OPS.lineTo, FAKE_OPS.lineTo, FAKE_OPS.lineTo, FAKE_OPS.closePath]],
        [[FAKE_OPS.moveTo, FAKE_OPS.curveTo, FAKE_OPS.curveTo]],
      ],
    };
    const r = engine._summarizeVectorPaths(opList, FAKE_OPS);
    expect(r.lineCount).toBe(3);
    expect(r.curveCount).toBe(2);
    expect(r.pathCount).toBe(2);
  });

  it('counts rectangle sub-ops inside constructPath', () => {
    const opList = {
      fnArray: [FAKE_OPS.constructPath],
      argsArray: [[[FAKE_OPS.rectangle, FAKE_OPS.rectangle, FAKE_OPS.rectangle]]],
    };
    const r = engine._summarizeVectorPaths(opList, FAKE_OPS);
    expect(r.rectCount).toBe(3);
  });

  it('counts text-show operators separately', () => {
    const opList = {
      fnArray: [FAKE_OPS.showText, FAKE_OPS.showSpacedText, FAKE_OPS.nextLineShowText, FAKE_OPS.lineTo],
      argsArray: [[], [], [], []],
    };
    const r = engine._summarizeVectorPaths(opList, FAKE_OPS);
    expect(r.textShowCount).toBe(3);
    expect(r.lineCount).toBe(1);
  });

  it('handles a dense operator list without NaN/undefined', () => {
    // Simulate 500 line segments + 100 curves + 50 rects
    const fnArray = [];
    const argsArray = [];
    for (let i = 0; i < 500; i++) { fnArray.push(FAKE_OPS.lineTo); argsArray.push([]); }
    for (let i = 0; i < 100; i++) { fnArray.push(FAKE_OPS.curveTo); argsArray.push([]); }
    for (let i = 0; i < 50; i++) { fnArray.push(FAKE_OPS.rectangle); argsArray.push([]); }
    const r = engine._summarizeVectorPaths({ fnArray, argsArray }, FAKE_OPS);
    expect(r.lineCount).toBe(500);
    expect(r.curveCount).toBe(100);
    expect(r.rectCount).toBe(50);
  });

  it('does not crash when opsMap is missing (best-effort)', () => {
    const r = engine._summarizeVectorPaths({ fnArray: [1, 2, 3], argsArray: [[], [], []] }, null);
    // With no ops map nothing can be classified but the function should
    // still return zero counts instead of throwing.
    expect(r.lineCount).toBe(0);
    expect(r.curveCount).toBe(0);
  });
});

describe('Vector Extractor — _formatVectorSummaryForPrompt', () => {
  it('returns a "no vector data" sentinel for null input', () => {
    const s = engine._formatVectorSummaryForPrompt(null);
    expect(s).toMatch(/no vector data/i);
  });

  it('returns a sentinel for an empty pages array', () => {
    const s = engine._formatVectorSummaryForPrompt({ pages: [] });
    expect(s).toMatch(/no vector data/i);
  });

  it('summarizes a realistic single-page plan', () => {
    const summary = engine._formatVectorSummaryForPrompt({
      pages: [{
        pageNum: 1,
        sheetId: 'T-101',
        textItemCount: 125,
        deviceCandidates: [
          { str: 'CR-1', code: 'CR', discipline: 'Access Control', device: 'card_reader' },
          { str: 'CR-2', code: 'CR', discipline: 'Access Control', device: 'card_reader' },
          { str: 'C-FD-1', code: 'FD', discipline: 'CCTV', device: 'fixed_dome' },
        ],
        pathStats: { lineCount: 342, rectCount: 18, curveCount: 56, pathCount: 12, textShowCount: 125 },
      }],
      totalPages: 1,
    });
    expect(summary).toMatch(/1 page\(s\)/i);
    expect(summary).toMatch(/CR:\s*2 instance/i);
    expect(summary).toMatch(/T-101/);
    expect(summary).toMatch(/342 lines/);
  });

  it('caps output length at ~3000 chars', () => {
    // Build a big dataset with 50 pages
    const pages = [];
    for (let i = 1; i <= 50; i++) {
      pages.push({
        pageNum: i,
        sheetId: `T-${i}`,
        textItemCount: 100,
        deviceCandidates: Array(20).fill(0).map((_, k) => ({
          str: `CR-${k}`, code: 'CR', discipline: 'Access Control', device: 'card_reader',
        })),
        pathStats: { lineCount: 500, rectCount: 50, curveCount: 100, pathCount: 20, textShowCount: 100 },
      });
    }
    const summary = engine._formatVectorSummaryForPrompt({ pages, totalPages: 50 });
    expect(summary.length).toBeLessThanOrEqual(3000);
  });

  it('aggregates device counts across multiple pages', () => {
    const summary = engine._formatVectorSummaryForPrompt({
      pages: [
        {
          pageNum: 1, sheetId: 'T-101',
          deviceCandidates: [
            { str: 'CR-1', code: 'CR', discipline: 'Access Control' },
            { str: 'CR-2', code: 'CR', discipline: 'Access Control' },
          ],
          pathStats: {},
        },
        {
          pageNum: 2, sheetId: 'T-102',
          deviceCandidates: [
            { str: 'CR-3', code: 'CR', discipline: 'Access Control' },
          ],
          pathStats: {},
        },
      ],
      totalPages: 2,
    });
    // 2 + 1 = 3 total CR instances
    expect(summary).toMatch(/CR:\s*3 instance/i);
  });
});
