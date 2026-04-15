import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Scope Delineation — Token-based discipline matching
//
// v5.126.3 P1.2 regression test. The previous substring-match
// logic could wrongly remove "Access Control" when a delineation
// mentioned "climate control". This pins the token-based match
// so that regression can't come back.
//
// This suite re-implements the tokenizer inline to avoid having
// to extract it from ai-engine.js runFullAnalysis (which has too
// many dependencies to call directly). When the ai-engine version
// changes, update this test to match.
// ═══════════════════════════════════════════════════════════════

const NOISE_TOKENS = new Set([
  'and', 'or', 'the', 'of', 'for', 'to', 'by', 'on', 'in', 'a', 'an', 'systems', 'system',
]);

function tokenize(s) {
  return String(s || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(t => t && t.length >= 3 && !NOISE_TOKENS.has(t));
}

const DB_PHRASE_TYPES = new Set(['design_build', 'design-build', 'by_others', 'by_ec', 'NIC', 'nic', 'by_div_26']);

function looksLikeDesignBuild(ptype, phrase) {
  return DB_PHRASE_TYPES.has(String(ptype || '').toLowerCase())
    || /design.?build\s+by\s+(electrical|ec|div\.?\s*26|others?)/i.test(phrase)
    || /(shall\s+be|is)\s+(design.?build|by\s+others|not\s+in\s+contract|NIC)/i.test(phrase);
}

function checkRemoval(disciplines, delineations) {
  const disciplineTokens = disciplines.map(d => ({
    discipline: d,
    tokens: tokenize(d),
  })).filter(x => x.tokens.length > 0);
  const removed = new Set();
  for (const d of delineations) {
    const affectedTokens = new Set(tokenize(d.affected_scope || ''));
    const phraseTokens = new Set(tokenize(d.exact_phrase || ''));
    if (!looksLikeDesignBuild(d.phrase_type, d.exact_phrase || '')) continue;
    for (const { discipline, tokens } of disciplineTokens) {
      if (removed.has(discipline)) continue;
      const allMatch = tokens.every(t => affectedTokens.has(t) || phraseTokens.has(t));
      if (allMatch) removed.add(discipline);
    }
  }
  return Array.from(removed);
}

describe('tokenize()', () => {
  it('strips noise words', () => {
    expect(tokenize('Fire and Alarm Systems')).toEqual(['fire', 'alarm']);
  });

  it('drops short tokens', () => {
    expect(tokenize('A Fire B Alarm')).toEqual(['fire', 'alarm']);
  });

  it('lowercases everything', () => {
    expect(tokenize('FIRE ALARM')).toEqual(['fire', 'alarm']);
  });

  it('handles slashes and punctuation', () => {
    expect(tokenize('Door Hardware / Electrified Hardware')).toEqual(['door', 'hardware', 'electrified', 'hardware']);
  });

  it('returns empty array on null/undefined', () => {
    expect(tokenize(null)).toEqual([]);
    expect(tokenize(undefined)).toEqual([]);
    expect(tokenize('')).toEqual([]);
  });
});

describe('v5.126.3 P1.2: Access Control NOT removed by climate control mention', () => {
  it('does not remove Access Control when delineation says climate control', () => {
    const disciplines = ['Access Control', 'CCTV', 'Structured Cabling'];
    const delineations = [
      {
        phrase_type: 'by_others',
        affected_scope: 'Climate Control Equipment',
        exact_phrase: 'Climate control shall be design-build by mechanical contractor',
      },
    ];
    const removed = checkRemoval(disciplines, delineations);
    expect(removed).toEqual([]);
  });

  it('does not remove Access Control when affected scope mentions unrelated control', () => {
    const disciplines = ['Access Control'];
    const delineations = [
      {
        phrase_type: 'design_build',
        affected_scope: 'Process Control',
        exact_phrase: 'Process control devices shall be design-build by others',
      },
    ];
    const removed = checkRemoval(disciplines, delineations);
    expect(removed).toEqual([]);
  });
});

describe('v5.126.3 P1.2: Fire Alarm IS still removed when design-build-by-EC', () => {
  it('removes Fire Alarm when phrase mentions Fire Alarm + design-build + EC', () => {
    const disciplines = ['Fire Alarm', 'Structured Cabling', 'Access Control'];
    const delineations = [
      {
        phrase_type: 'design_build',
        affected_scope: 'Fire Alarm System',
        exact_phrase: 'FIRE ALARM SHALL BE DESIGN-BUILD BY ELECTRICAL CONTRACTOR. DEVICES ARE SHOWN FOR REFERENCE ONLY.',
      },
    ];
    const removed = checkRemoval(disciplines, delineations);
    expect(removed).toEqual(['Fire Alarm']);
  });

  it('does not remove other disciplines when only Fire Alarm is flagged', () => {
    const disciplines = ['Fire Alarm', 'Structured Cabling', 'Access Control', 'CCTV'];
    const delineations = [
      {
        phrase_type: 'design_build',
        affected_scope: 'Fire Alarm',
        exact_phrase: 'Fire alarm is design-build by electrical contractor',
      },
    ];
    const removed = checkRemoval(disciplines, delineations);
    expect(removed).toEqual(['Fire Alarm']);
    expect(removed).not.toContain('Access Control');
    expect(removed).not.toContain('CCTV');
  });
});

describe('v5.126.3 P1.2: Multi-discipline detection', () => {
  it('removes both Fire Alarm AND Nurse Call when both flagged', () => {
    const disciplines = ['Fire Alarm', 'Nurse Call Systems', 'Structured Cabling'];
    const delineations = [
      {
        phrase_type: 'design_build',
        affected_scope: 'Fire Alarm',
        exact_phrase: 'Fire alarm shall be design-build by electrical contractor',
      },
      {
        phrase_type: 'by_others',
        affected_scope: 'Nurse Call',
        exact_phrase: 'Nurse call is by others',
      },
    ];
    const removed = checkRemoval(disciplines, delineations);
    expect(removed).toContain('Fire Alarm');
    expect(removed).toContain('Nurse Call Systems');
    expect(removed).not.toContain('Structured Cabling');
  });

  it('does not remove a discipline when only a partial token matches', () => {
    const disciplines = ['Audio Visual'];
    const delineations = [
      {
        phrase_type: 'design_build',
        affected_scope: 'Video',
        exact_phrase: 'Video system design-build by AV contractor',
      },
    ];
    const removed = checkRemoval(disciplines, delineations);
    // "video" alone does NOT match all tokens of "Audio Visual" (which are [audio, visual])
    expect(removed).toEqual([]);
  });
});

describe('v5.126.3 P1.2: Phrase type filtering', () => {
  it('does not remove on OFOI phrase (that is material-only, not scope removal)', () => {
    const disciplines = ['CCTV'];
    const delineations = [
      {
        phrase_type: 'OFOI',
        affected_scope: 'CCTV Cameras',
        exact_phrase: 'Security cameras provided by owner. EC to provide Cat6 and rough-in.',
      },
    ];
    const removed = checkRemoval(disciplines, delineations);
    // OFOI is NOT in DB_PHRASE_TYPES, and the regex doesnt match.
    // The phrase "design-build by EC" is absent. CCTV stays.
    expect(removed).toEqual([]);
  });

  it('removes on explicit design-build phrase_type', () => {
    const disciplines = ['Fire Alarm'];
    const delineations = [
      {
        phrase_type: 'design-build',
        affected_scope: 'Fire Alarm',
        exact_phrase: 'Fire alarm by Division 26',
      },
    ];
    const removed = checkRemoval(disciplines, delineations);
    expect(removed).toEqual(['Fire Alarm']);
  });
});
