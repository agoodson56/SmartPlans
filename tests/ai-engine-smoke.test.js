import { describe, it, expect, beforeAll } from 'vitest';
import { loadAiEngine } from './helpers/load-ai-engine.js';

// ═══════════════════════════════════════════════════════════════
// Smoke test: verify the ai-engine loader actually works before
// any regression suite runs. If this fails, none of the other
// ai-engine tests can be trusted.
// ═══════════════════════════════════════════════════════════════

let SmartBrains;

beforeAll(() => {
  SmartBrains = loadAiEngine();
});

describe('ai-engine loader smoke', () => {
  it('loads the SmartBrains object', () => {
    expect(SmartBrains).toBeDefined();
    expect(typeof SmartBrains).toBe('object');
  });

  it('has 41 brains registered', () => {
    expect(SmartBrains.BRAINS).toBeDefined();
    expect(Object.keys(SmartBrains.BRAINS).length).toBeGreaterThanOrEqual(38);
  });

  it('exposes _validateBrainOutput', () => {
    expect(typeof SmartBrains._validateBrainOutput).toBe('function');
  });

  it('exposes the circuit breaker', () => {
    expect(SmartBrains._circuitBreaker).toBeDefined();
    expect(typeof SmartBrains._circuitBreaker.record429).toBe('function');
    expect(typeof SmartBrains._circuitBreaker.waitIfTripped).toBe('function');
  });

  it('exposes _deadSlots set', () => {
    expect(SmartBrains._deadSlots).toBeInstanceOf(Set);
  });
});
