// ═══════════════════════════════════════════════════════════════
// HUMAN-IN-THE-LOOP REGRESSION TESTS (Wave 2B, v5.128.2)
// Pins the stop-and-ask policy:
//   • confidence threshold = 0.75
//   • skip timeout = 15 min (900000 ms)
//   • answers persist across bids
//   • export is blocked when HIGH/CRITICAL remain unanswered
// Also pins the LEGEND_DECODER schema fields the popup depends on:
//   first_seen_x_pct, first_seen_y_pct, reason_detailed, option_explanations
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
beforeAll(() => {
    SmartBrains = loadAiEngine();
});

describe('Wave 2B — configuration defaults', () => {
    it('clarificationConfidenceThreshold defaults to 0.75', () => {
        expect(SmartBrains.config.clarificationConfidenceThreshold).toBeCloseTo(0.75, 6);
    });

    it('clarificationSkipTimeoutMs defaults to 15 minutes (900000 ms)', () => {
        expect(SmartBrains.config.clarificationSkipTimeoutMs).toBe(15 * 60 * 1000);
    });

    it('clarificationPersistAnswers defaults to true', () => {
        expect(SmartBrains.config.clarificationPersistAnswers).toBe(true);
    });

    it('clarificationBlockExport defaults to true', () => {
        expect(SmartBrains.config.clarificationBlockExport).toBe(true);
    });

    it('disputeDisagreementThreshold defaults to 0.20', () => {
        expect(SmartBrains.config.disputeDisagreementThreshold).toBeCloseTo(0.20, 6);
    });
});

describe('Wave 2B — LEGEND_DECODER schema contains every human-in-the-loop field', () => {
    it('schema requires first_seen_x_pct and first_seen_y_pct', () => {
        expect(AI_ENGINE_SRC).toMatch(/first_seen_x_pct\b\s*:\s*REQUIRED/);
        expect(AI_ENGINE_SRC).toMatch(/first_seen_y_pct\b\s*:\s*REQUIRED/);
    });

    it('schema requires reason_detailed', () => {
        expect(AI_ENGINE_SRC).toMatch(/reason_detailed\b\s*:/);
    });

    it('schema requires option_explanations with per-option reasons', () => {
        expect(AI_ENGINE_SRC).toMatch(/option_explanations\b\s*:\s*OBJECT/);
    });

    it('schema mentions 75% confidence threshold', () => {
        expect(AI_ENGINE_SRC).toMatch(/Below\s+75\s+triggers/);
    });

    it('prompt example includes every new field with realistic values', () => {
        expect(AI_ENGINE_SRC).toMatch(/"first_seen_x_pct":\s*42/);
        expect(AI_ENGINE_SRC).toMatch(/"first_seen_y_pct":\s*68/);
        expect(AI_ENGINE_SRC).toMatch(/"option_explanations":/);
        expect(AI_ENGINE_SRC).toMatch(/"reason_detailed":/);
        expect(AI_ENGINE_SRC).toMatch(/"confidence":\s*62/);
    });
});

describe('Wave 2B — clarificationQuestions plumbing honors the new fields', () => {
    it('collector passes reasonDetailed through to the question object', () => {
        expect(AI_ENGINE_SRC).toMatch(/reasonDetailed:\s*a\.reason_detailed/);
    });

    it('collector passes firstSeenXPct and firstSeenYPct through', () => {
        expect(AI_ENGINE_SRC).toMatch(/firstSeenXPct:\s*Number\.isFinite/);
        expect(AI_ENGINE_SRC).toMatch(/firstSeenYPct:\s*Number\.isFinite/);
    });

    it('collector passes optionExplanations through', () => {
        expect(AI_ENGINE_SRC).toMatch(/optionExplanations:\s*\(a\.option_explanations/);
    });

    it('collector respects the 0.75 confidence threshold (skip above threshold)', () => {
        expect(AI_ENGINE_SRC).toMatch(/conf !== null && conf >= threshold/);
    });

    it('collector upgrades < 50% confidence to critical severity', () => {
        expect(AI_ENGINE_SRC).toMatch(/conf < 0\.50\).*critical.*high/s);
    });
});

describe('Wave 2B — clarification modal renders coords + detail + tooltips', () => {
    it('modal emits a coordinate pill with x% × y%', () => {
        expect(APP_JS_SRC).toMatch(/_formatCoordPill/);
        expect(APP_JS_SRC).toMatch(/📍 \$\{x\}% × \$\{y\}%/);
    });

    it('modal emits a confidence pill', () => {
        expect(APP_JS_SRC).toMatch(/_formatConfPill/);
        expect(APP_JS_SRC).toMatch(/⚖️.*conf/);
    });

    it('modal renders the "Why this is ambiguous" block when reasonDetailed is present', () => {
        expect(APP_JS_SRC).toMatch(/Why this is ambiguous/);
        expect(APP_JS_SRC).toMatch(/q\.reasonDetailed/);
    });

    it('modal renders per-option tooltip from optionExplanations', () => {
        expect(APP_JS_SRC).toMatch(/optionExplanations.*\[opt\]/);
        expect(APP_JS_SRC).toMatch(/Why each option is plausible/);
    });
});

describe('Wave 2B — 15-minute skip timeout, persistence, and pre-fill are wired', () => {
    it('app.js wraps clarificationCallback with a 15-minute setTimeout', () => {
        expect(APP_JS_SRC).toMatch(/clarificationSkipTimeoutMs/);
        expect(APP_JS_SRC).toMatch(/15 \* 60 \* 1000/);
    });

    it('app.js marks unanswered questions on state for export gating', () => {
        expect(APP_JS_SRC).toMatch(/state\._unansweredClarifications/);
        expect(APP_JS_SRC).toMatch(/state\._clarificationTimedOut/);
    });

    it('app.js persists answers to /api/clarification-answers', () => {
        expect(APP_JS_SRC).toMatch(/_persistClarificationAnswers/);
        expect(APP_JS_SRC).toMatch(/\/api\/clarification-answers/);
    });

    it('app.js pre-fills answers from prior bids before showing the modal', () => {
        expect(APP_JS_SRC).toMatch(/_lookupPriorAnswers/);
        expect(APP_JS_SRC).toMatch(/Pre-filled.*from prior bids/);
    });

    it('app.js uses a stable fingerprint (source + label + visual + category)', () => {
        expect(APP_JS_SRC).toMatch(/_clarificationFingerprint/);
        expect(APP_JS_SRC).toMatch(/`\$\{source\}\|\$\{label\}\|\$\{visual\}\|\$\{category\}`/);
    });
});

describe('Wave 2B — export is gated on unanswered HIGH/CRITICAL questions', () => {
    it('_canExportProposal checks state._unansweredClarifications before proceeding', () => {
        // Wave 11+: the v2 "generateCompleteBidPackage" path was removed.
        // The gating logic was extracted into _canExportProposal() which is
        // called from both remaining buttons (Full + Executive proposal).
        expect(APP_JS_SRC).toMatch(/_canExportProposal/);
        expect(APP_JS_SRC).toMatch(/clarificationBlockExport/);
        expect(APP_JS_SRC).toMatch(/state\._unansweredClarifications/);
    });

    it('gating requires explicit user acknowledgement via confirm() before shipping', () => {
        expect(APP_JS_SRC).toMatch(/state\._unansweredClarificationsAcknowledged/);
        expect(APP_JS_SRC).toMatch(/acknowledged .*unanswered clarification.*ship anyway/i);
    });

    it('both remaining proposal buttons call _canExportProposal() pre-flight gate', () => {
        // Full Proposal button
        expect(APP_JS_SRC).toMatch(/btn-generate-proposal[\s\S]{0,800}_canExportProposal\(\)/);
        // Executive Proposal button
        expect(APP_JS_SRC).toMatch(/btn-generate-exec-proposal[\s\S]{0,800}_canExportProposal\(\)/);
    });
});

describe('Wave 2B — Checkpoint B escalates failed dispute resolution (audit AI-4 fix)', () => {
    it('ai-engine flags disputes as unresolved and builds clarification questions for each', () => {
        expect(AI_ENGINE_SRC).toMatch(/_pendingDisputeEscalations/);
        expect(AI_ENGINE_SRC).toMatch(/Targeted Re-Scanner FAILED/);
    });

    it('ai-engine pauses at Checkpoint B and applies human answers back to consensus counts', () => {
        expect(AI_ENGINE_SRC).toMatch(/CHECKPOINT B/);
        expect(AI_ENGINE_SRC).toMatch(/human-resolved/);
        expect(AI_ENGINE_SRC).toMatch(/method = 'checkpoint-b'/);
    });
});

describe('Wave 2B — clarification-answers API exists with expected shape', () => {
    const API_SRC = readFileSync(join(__dirname, '..', 'functions', 'api', 'clarification-answers.js'), 'utf-8');

    it('has GET, POST, and OPTIONS handlers', () => {
        expect(API_SRC).toMatch(/export async function onRequestGet/);
        expect(API_SRC).toMatch(/export async function onRequestPost/);
        expect(API_SRC).toMatch(/export async function onRequestOptions/);
    });

    it('auto-creates the clarification_answers table on first call', () => {
        expect(API_SRC).toMatch(/CREATE TABLE IF NOT EXISTS clarification_answers/);
        expect(API_SRC).toMatch(/fingerprint TEXT NOT NULL/);
        expect(API_SRC).toMatch(/chosen_option TEXT NOT NULL/);
    });

    it('indexes on fingerprint for fast pre-fill lookups', () => {
        expect(API_SRC).toMatch(/CREATE INDEX IF NOT EXISTS idx_clarification_answers_fp/);
    });

    it('uses prepared statements (no SQL injection)', () => {
        expect(API_SRC).toMatch(/\.prepare\([\s\S]*?\)\.bind\(/);
    });
});
