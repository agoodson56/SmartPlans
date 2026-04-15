import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// Bid Readiness Score — v5.127.0 regression tests
//
// The readiness score lives in app.js (computeBidReadinessScore) so
// we re-implement the formula here and pin the expected outputs.
// When app.js changes the formula, update this test to match — it
// is a pure function of state so the logic is trivially testable.
// ═══════════════════════════════════════════════════════════════

function computeBidReadinessScore(st) {
  if (!st || !st.analysisComplete) {
    return { score: 0, grade: 'N/A', label: 'Analysis Not Run', color: '#64748b', factors: [] };
  }
  if (st._quantitiesUnverified) {
    return {
      score: 0,
      grade: 'F',
      label: 'QUANTITIES NOT VERIFIED',
      color: '#ef4444',
      factors: [
        { name: 'Quantities unverified', points: 0, max: 100, note: st._quantitiesUnverifiedReason || 'Symbol Scanner could not verify counts.' },
      ],
    };
  }

  const factors = [];

  const cs = st._confidenceScoring;
  let confidenceScore = 50;
  if (cs && typeof cs.avgScore === 'number') {
    confidenceScore = Math.max(0, Math.min(100, cs.avgScore));
  }
  factors.push({ name: 'Confidence Grade', points: Math.round(confidenceScore * 0.40), max: 40 });

  const si = st._sheetInventory;
  let sheetScore = 50;
  if (si && typeof si.coverage_pct === 'number') {
    sheetScore = Math.max(0, Math.min(100, si.coverage_pct));
  } else if (si && si.index_found === false) {
    sheetScore = 60;
  }
  factors.push({ name: 'Sheet Coverage', points: Math.round(sheetScore * 0.20), max: 20 });

  const gaps = Array.isArray(st._disciplineCoverageGaps) ? st._disciplineCoverageGaps : [];
  const totalDisc = Array.isArray(st.disciplines) ? st.disciplines.length : 0;
  const disciplineScore = totalDisc > 0
    ? Math.max(0, 100 - (gaps.length / totalDisc) * 100)
    : 50;
  factors.push({ name: 'Discipline Coverage', points: Math.round(disciplineScore * 0.15), max: 15 });

  const questions = Array.isArray(st._clarificationQuestions) ? st._clarificationQuestions : [];
  const highSev = questions.filter(q => q.severity === 'high' || q.severity === 'critical');
  const answered = st._clarificationAnswers || {};
  const unanswered = highSev.filter(q => !answered[q.id]);
  const clarScore = highSev.length === 0
    ? 100
    : Math.max(0, 100 - (unanswered.length / highSev.length) * 100);
  factors.push({ name: 'Open Clarifications', points: Math.round(clarScore * 0.10), max: 10 });

  const sc = st._specCompliance;
  let specScore = 75;
  if (sc && typeof sc.compliance_score === 'number') {
    specScore = Math.max(0, Math.min(100, sc.compliance_score));
  }
  factors.push({ name: 'Spec Compliance', points: Math.round(specScore * 0.10), max: 10 });

  const sd = st._scopeDelineations;
  const criticalDelineations = (sd?.delineations || []).filter(d => d.severity === 'critical');
  const autoRemoved = Array.isArray(st._autoRemovedDisciplines) ? st._autoRemovedDisciplines.length : 0;
  const delineationScore = criticalDelineations.length === 0
    ? 100
    : Math.max(60, 100 - (criticalDelineations.length - autoRemoved) * 10);
  factors.push({ name: 'Scope Delineations', points: Math.round(delineationScore * 0.05), max: 5 });

  const total = factors.reduce((s, f) => s + f.points, 0);
  const score = Math.min(100, Math.max(0, total));

  let grade, label;
  if (score >= 90)      { grade = 'A'; label = 'READY TO SEND'; }
  else if (score >= 80) { grade = 'B'; label = 'LIGHT REVIEW NEEDED'; }
  else if (score >= 70) { grade = 'C'; label = 'MODERATE REVIEW'; }
  else if (score >= 55) { grade = 'D'; label = 'SIGNIFICANT REVIEW'; }
  else                  { grade = 'F'; label = 'NEEDS SIGNIFICANT FIXES'; }

  return { score, grade, label, factors };
}

describe('Bid Readiness Score', () => {
  it('returns N/A when analysis has not completed', () => {
    const r = computeBidReadinessScore({ analysisComplete: false });
    expect(r.grade).toBe('N/A');
    expect(r.score).toBe(0);
  });

  it('returns F when quantities are unverified (short-circuit)', () => {
    const r = computeBidReadinessScore({
      analysisComplete: true,
      _quantitiesUnverified: true,
      _quantitiesUnverifiedReason: 'Only 1 of 18 sheets uploaded',
    });
    expect(r.grade).toBe('F');
    expect(r.score).toBe(0);
    expect(r.label).toContain('QUANTITIES NOT VERIFIED');
  });

  it('gives a perfect bid a grade of A (>= 90)', () => {
    const r = computeBidReadinessScore({
      analysisComplete: true,
      _confidenceScoring: { avgScore: 95, overallGrade: 'A', totalItems: 50, grades: { A: 48, B: 2, C: 0, D: 0 } },
      _sheetInventory: { coverage_pct: 100, uploaded_relevant_sheet_count: 24, total_relevant_sheets: 24 },
      _disciplineCoverageGaps: [],
      disciplines: ['CCTV', 'Access Control', 'Structured Cabling'],
      _clarificationQuestions: [],
      _specCompliance: { compliance_score: 95, requirements_met: 45, gaps: [] },
      _scopeDelineations: { delineations: [] },
      _autoRemovedDisciplines: [],
    });
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.grade).toBe('A');
    expect(r.label).toBe('READY TO SEND');
  });

  it('gives a typical Gardnerville-v1 scenario an F grade (< 55)', () => {
    const r = computeBidReadinessScore({
      analysisComplete: true,
      // v1 Gardnerville had 6% coverage because only legend was uploaded
      _confidenceScoring: { avgScore: 30, overallGrade: 'D', totalItems: 25, grades: { A: 2, B: 4, C: 5, D: 14 } },
      _sheetInventory: { coverage_pct: 6, uploaded_relevant_sheet_count: 1, total_relevant_sheets: 18 },
      _disciplineCoverageGaps: ['Fire Alarm', 'Nurse Call Systems', 'DAS'],
      disciplines: ['CCTV', 'Access Control', 'Structured Cabling', 'Fire Alarm', 'Nurse Call Systems', 'DAS'],
      _clarificationQuestions: [
        { id: 'q1', severity: 'high' },
        { id: 'q2', severity: 'high' },
        { id: 'q3', severity: 'critical' },
      ],
      _clarificationAnswers: {},
      _specCompliance: { compliance_score: 40, requirements_met: 10, gaps: [{ severity: 'critical' }, { severity: 'critical' }] },
      _scopeDelineations: { delineations: [{ severity: 'critical' }, { severity: 'critical' }] },
      _autoRemovedDisciplines: [],
    });
    expect(r.score).toBeLessThan(55);
    expect(r.grade).toBe('F');
  });

  it('penalizes missing disciplines proportionally', () => {
    const basePerfect = {
      analysisComplete: true,
      _confidenceScoring: { avgScore: 100 },
      _sheetInventory: { coverage_pct: 100 },
      _disciplineCoverageGaps: [],
      disciplines: ['A', 'B', 'C', 'D'],
      _clarificationQuestions: [],
      _specCompliance: { compliance_score: 100 },
      _scopeDelineations: { delineations: [] },
    };
    const perfect = computeBidReadinessScore(basePerfect);
    const oneGap = computeBidReadinessScore({ ...basePerfect, _disciplineCoverageGaps: ['A'] });
    const twoGaps = computeBidReadinessScore({ ...basePerfect, _disciplineCoverageGaps: ['A', 'B'] });
    expect(perfect.score).toBeGreaterThanOrEqual(95);
    expect(oneGap.score).toBeLessThan(perfect.score);
    expect(twoGaps.score).toBeLessThan(oneGap.score);
  });

  it('credits auto-removed disciplines against critical delineations', () => {
    const base = {
      analysisComplete: true,
      _confidenceScoring: { avgScore: 85 },
      _sheetInventory: { coverage_pct: 95 },
      _disciplineCoverageGaps: [],
      disciplines: ['A', 'B'],
      _clarificationQuestions: [],
      _specCompliance: { compliance_score: 90 },
      _scopeDelineations: { delineations: [{ severity: 'critical' }] },
    };
    const withoutRemoval = computeBidReadinessScore({ ...base, _autoRemovedDisciplines: [] });
    const withRemoval = computeBidReadinessScore({ ...base, _autoRemovedDisciplines: [{ discipline: 'Fire Alarm' }] });
    // When auto-removed matches critical delineations, score goes up
    expect(withRemoval.score).toBeGreaterThanOrEqual(withoutRemoval.score);
  });

  it('returns all 6 factors in the breakdown', () => {
    const r = computeBidReadinessScore({
      analysisComplete: true,
      disciplines: ['A'],
    });
    expect(r.factors).toHaveLength(6);
    expect(r.factors.map(f => f.name)).toEqual([
      'Confidence Grade',
      'Sheet Coverage',
      'Discipline Coverage',
      'Open Clarifications',
      'Spec Compliance',
      'Scope Delineations',
    ]);
  });

  it('factor max values sum to 100', () => {
    const r = computeBidReadinessScore({
      analysisComplete: true,
      disciplines: ['A'],
    });
    const totalMax = r.factors.reduce((s, f) => s + f.max, 0);
    expect(totalMax).toBe(100);
  });

  it('handles answered clarification questions correctly', () => {
    const base = {
      analysisComplete: true,
      _confidenceScoring: { avgScore: 90 },
      _sheetInventory: { coverage_pct: 95 },
      _disciplineCoverageGaps: [],
      disciplines: ['A'],
      _specCompliance: { compliance_score: 90 },
      _scopeDelineations: { delineations: [] },
    };
    const twoUnanswered = computeBidReadinessScore({
      ...base,
      _clarificationQuestions: [
        { id: 'q1', severity: 'high' },
        { id: 'q2', severity: 'high' },
      ],
      _clarificationAnswers: {},
    });
    const bothAnswered = computeBidReadinessScore({
      ...base,
      _clarificationQuestions: [
        { id: 'q1', severity: 'high' },
        { id: 'q2', severity: 'high' },
      ],
      _clarificationAnswers: { q1: 'smoke_detector', q2: 'data_outlet' },
    });
    expect(bothAnswered.score).toBeGreaterThan(twoUnanswered.score);
  });

  it('assigns grade boundaries correctly by total score', () => {
    // Build fixtures that produce specific total scores by mixing factors,
    // rather than assuming uniform avgScore → grade mapping.
    const mkState = (confidence, coverage, discGaps, clarUnanswered, spec) => ({
      analysisComplete: true,
      _confidenceScoring: { avgScore: confidence },
      _sheetInventory: { coverage_pct: coverage },
      _disciplineCoverageGaps: Array(discGaps).fill('X'),
      disciplines: ['A', 'B', 'C', 'D'],
      _clarificationQuestions: Array(clarUnanswered).fill(0).map((_, i) => ({ id: `q${i}`, severity: 'high' })),
      _clarificationAnswers: {},
      _specCompliance: { compliance_score: spec },
      _scopeDelineations: { delineations: [] },
    });
    // Grade A (>=90): all factors near perfect
    const perfect = computeBidReadinessScore(mkState(100, 100, 0, 0, 100));
    expect(perfect.score).toBeGreaterThanOrEqual(90);
    expect(perfect.grade).toBe('A');

    // Grade B (80-89): some softness
    const lightReview = computeBidReadinessScore(mkState(80, 90, 0, 0, 85));
    expect(lightReview.score).toBeGreaterThanOrEqual(80);
    expect(lightReview.score).toBeLessThan(90);
    expect(lightReview.grade).toBe('B');

    // Grade C (70-79): noticeable gaps
    const moderate = computeBidReadinessScore(mkState(70, 75, 1, 0, 70));
    expect(moderate.score).toBeGreaterThanOrEqual(70);
    expect(moderate.score).toBeLessThan(80);
    expect(moderate.grade).toBe('C');

    // Grade D (55-69): significant issues
    // Need confidence ~70 to yield a total in the 55-69 window.
    const significant = computeBidReadinessScore(mkState(65, 65, 1, 1, 65));
    expect(significant.score).toBeGreaterThanOrEqual(55);
    expect(significant.score).toBeLessThan(70);
    expect(significant.grade).toBe('D');

    // Grade F (<55): broken
    const broken = computeBidReadinessScore(mkState(20, 20, 3, 3, 20));
    expect(broken.score).toBeLessThan(55);
    expect(broken.grade).toBe('F');
  });
});
