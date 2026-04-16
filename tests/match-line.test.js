import { describe, it, expect, beforeAll } from 'vitest';
import { loadAiEngine } from './helpers/load-ai-engine.js';

// ═══════════════════════════════════════════════════════════════
// v5.127.4 Match-Line Detection — regression tests
//
// Pins the deterministic match-line parser that finds "MATCH LINE —
// SEE SHEET X" / "M.L. X" callouts in the vector text layer so the
// Cross-Sheet Analyzer knows which pages are adjacent.
// ═══════════════════════════════════════════════════════════════

let engine;
beforeAll(() => {
  engine = loadAiEngine();
});

// Helper: build a vector-data page with a textItems array
const pageWithText = (sheetId, strs) => ({
  sheetId,
  textItems: strs.map((s, i) => ({ str: s, x: i * 100, y: 500 })),
});

describe('Match-Line Extraction — _extractMatchLinesFromPage', () => {
  it('returns empty array for pages without text items', () => {
    expect(engine._extractMatchLinesFromPage(null)).toEqual([]);
    expect(engine._extractMatchLinesFromPage({})).toEqual([]);
    expect(engine._extractMatchLinesFromPage({ sheetId: 'T-101' })).toEqual([]);
  });

  it('detects "MATCH LINE — SEE SHEET T-102"', () => {
    const r = engine._extractMatchLinesFromPage(
      pageWithText('T-101', ['MATCH LINE — SEE SHEET T-102'])
    );
    expect(r).toHaveLength(1);
    expect(r[0].referencedSheet).toBe('T-102');
  });

  it('detects split-across-fragments "MATCH LINE" ... "SEE SHEET T-103"', () => {
    const r = engine._extractMatchLinesFromPage(
      pageWithText('T-101', ['MATCH LINE', 'SEE SHEET', 'T-103'])
    );
    expect(r).toHaveLength(1);
    expect(r[0].referencedSheet).toBe('T-103');
  });

  it('detects "MATCHLINE TO T-1.03" (no space, variant keyword)', () => {
    const r = engine._extractMatchLinesFromPage(
      pageWithText('T-101', ['MATCHLINE TO', 'T-1.03'])
    );
    expect(r).toHaveLength(1);
    expect(r[0].referencedSheet).toBe('T-1.03');
  });

  it('detects "M.L. T-201" (abbreviated form near MATCH keyword)', () => {
    const r = engine._extractMatchLinesFromPage(
      pageWithText('T-101', ['MATCH', 'M.L.', 'T-201'])
    );
    expect(r.length).toBeGreaterThanOrEqual(1);
    expect(r[0].referencedSheet).toBe('T-201');
  });

  it('ignores "MATCH" text without a sheet reference', () => {
    const r = engine._extractMatchLinesFromPage(
      pageWithText('T-101', ['MATCH DIMENSIONS TO EXISTING'])
    );
    expect(r).toEqual([]);
  });

  it('de-duplicates multiple references to the same sheet', () => {
    const r = engine._extractMatchLinesFromPage(
      pageWithText('T-101', [
        'MATCH LINE — SEE SHEET T-102',
        'MATCH LINE — SEE SHEET T-102',
      ])
    );
    expect(r).toHaveLength(1);
  });

  it('captures multiple distinct references on the same page', () => {
    const r = engine._extractMatchLinesFromPage(
      pageWithText('T-101', [
        'MATCH LINE — SEE SHEET T-102',
        'some other text',
        'MATCH LINE — SEE SHEET T-105',
      ])
    );
    expect(r).toHaveLength(2);
    expect(r.map(h => h.referencedSheet).sort()).toEqual(['T-102', 'T-105']);
  });

  it('is case-insensitive', () => {
    const r = engine._extractMatchLinesFromPage(
      pageWithText('T-101', ['match line see sheet t-102'])
    );
    expect(r).toHaveLength(1);
    expect(r[0].referencedSheet).toBe('T-102');
  });
});

describe('Match-Line Extraction — _buildMatchLinePairs', () => {
  it('returns empty result for null/empty input', () => {
    expect(engine._buildMatchLinePairs(null).pairCount).toBe(0);
    expect(engine._buildMatchLinePairs({ pages: [] }).pairCount).toBe(0);
  });

  it('builds pairs from a multi-page vector dataset', () => {
    const vectorData = {
      pages: [
        pageWithText('T-101', ['MATCH LINE — SEE SHEET T-102']),
        pageWithText('T-102', ['MATCH LINE — SEE SHEET T-101', 'MATCH LINE — SEE SHEET T-103']),
        pageWithText('T-103', ['MATCH LINE — SEE SHEET T-102']),
      ],
    };
    const r = engine._buildMatchLinePairs(vectorData);
    expect(r.sheetCount).toBe(3);
    expect(r.pairCount).toBeGreaterThanOrEqual(3);
    const routes = r.pairs.map(p => `${p.from}→${p.to}`);
    expect(routes).toContain('T-101→T-102');
    expect(routes).toContain('T-102→T-103');
  });

  it('skips pages without a sheetId', () => {
    const vectorData = {
      pages: [
        { textItems: [{ str: 'MATCH LINE — SEE SHEET T-102', x: 0, y: 0 }] }, // no sheetId
        pageWithText('T-102', ['MATCH LINE — SEE SHEET T-101']),
      ],
    };
    const r = engine._buildMatchLinePairs(vectorData);
    expect(r.sheetCount).toBe(1);
    expect(r.pairs.every(p => p.from === 'T-102')).toBe(true);
  });

  it('preserves the raw match-line text in the "via" field', () => {
    const vectorData = {
      pages: [pageWithText('T-101', ['MATCH LINE — SEE SHEET T-102'])],
    };
    const r = engine._buildMatchLinePairs(vectorData);
    expect(r.pairs[0].via.toUpperCase()).toContain('MATCH');
    expect(r.pairs[0].via.toUpperCase()).toContain('T-102');
  });
});

describe('Match-Line Extraction — _formatMatchLinesForPrompt', () => {
  it('returns sentinel message for empty pair map', () => {
    const s = engine._formatMatchLinesForPrompt({ pairs: [] });
    expect(s).toMatch(/no match-line/i);
  });

  it('returns sentinel message for null input', () => {
    const s = engine._formatMatchLinesForPrompt(null);
    expect(s).toMatch(/no match-line/i);
  });

  it('includes each pair in the formatted output', () => {
    const s = engine._formatMatchLinesForPrompt({
      pairs: [
        { from: 'T-101', to: 'T-102', via: 'MATCH LINE — SEE SHEET T-102' },
        { from: 'T-102', to: 'T-103', via: 'MATCH LINE — SEE SHEET T-103' },
      ],
      sheetCount: 3,
      pairCount: 2,
    });
    expect(s).toContain('T-101');
    expect(s).toContain('T-102');
    expect(s).toContain('T-103');
    expect(s).toContain('2 pair');
  });

  it('caps output length at ~2000 chars', () => {
    const pairs = [];
    for (let i = 0; i < 200; i++) {
      pairs.push({ from: `T-${i}`, to: `T-${i+1}`, via: 'MATCH LINE — SEE SHEET T-...' });
    }
    const s = engine._formatMatchLinesForPrompt({ pairs, sheetCount: 201, pairCount: 200 });
    expect(s.length).toBeLessThanOrEqual(2000);
  });
});
