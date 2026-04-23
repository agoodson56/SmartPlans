// ═══════════════════════════════════════════════════════════════
// SmartPlans — ai-engine.js test loader
// Loads ai-engine.js into a sandboxed context with stubbed globals
// so we can unit-test SmartBrains methods (validators, circuit
// breaker, disciplines guard, etc.) in isolation.
// ═══════════════════════════════════════════════════════════════

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load ai-engine.js in a sandboxed context and return the SmartBrains object.
 * Supplies stub implementations for window, fetch, localStorage, and other
 * browser globals that the module references at load time.
 */
export function loadAiEngine(options = {}) {
  const code = readFileSync(join(__dirname, '../../ai-engine.js'), 'utf-8');

  // Capture warnings/errors so tests can inspect them without noise in stdout
  const warnings = [];
  const errors = [];
  const logs = [];
  const quietConsole = {
    log: (...args) => { logs.push(args.join(' ')); },
    warn: (...args) => { warnings.push(args.join(' ')); },
    error: (...args) => { errors.push(args.join(' ')); },
    info: (...args) => { logs.push(args.join(' ')); },
    debug: () => {},
  };

  // Stub the globals that ai-engine.js references at module scope
  const stubFetch = options.fetch || (async () => ({ ok: true, status: 200, json: async () => ({}) }));
  const stubWindow = { location: { origin: 'http://localhost' }, dispatchEvent: () => {}, _sessionCost: null };
  const stubPricingDb = {
    version: '5.0',
    regionalMultipliers: { national_average: 1.0, california: 1.25 },
    tiers: { mid: {} },
  };
  const stubSelf = stubWindow;
  const stubDocument = { createElement: () => ({ textContent: '', innerHTML: '' }) };
  const stubAbortController = globalThis.AbortController || class { abort() {} signal = { aborted: false }; };
  const stubSetTimeout = globalThis.setTimeout;
  const stubClearTimeout = globalThis.clearTimeout;

  // Wrap ai-engine.js in a function that provides stub dependencies and
  // returns the top-level SmartBrains object (declared with `const`).
  const fn = new Function(
    'console', 'window', 'self', 'document', 'fetch', 'PRICING_DB',
    'AbortController', 'setTimeout', 'clearTimeout',
    `${code}\nreturn SmartBrains;`,
  );

  return fn(
    quietConsole, stubWindow, stubSelf, stubDocument, stubFetch, stubPricingDb,
    stubAbortController, stubSetTimeout, stubClearTimeout,
  );
}

/**
 * Build a minimal mock state object that has all the fields ai-engine.js
 * expects to read from. Returns a plain object (NOT a Proxy), so tests
 * can freely mutate state.disciplines without hitting the defineProperty
 * guard in app.js.
 */
export function mockState(overrides = {}) {
  return {
    projectName: 'Test Project',
    projectType: 'Test',
    projectLocation: 'Test, CA',
    disciplines: ['Structured Cabling', 'CCTV', 'Access Control', 'Fire Alarm'],
    pricingTier: 'mid',
    regionalMultiplier: 'national_average',
    markup: { material: 50, labor: 50, equipment: 15, subcontractor: 15 },
    laborRates: { electrician: 85 },
    includeBurden: true,
    burdenRate: 35,
    prevailingWage: '',
    workShift: 'Standard',
    specificItems: '',
    knownQuantities: '',
    floorPlateWidth: 0,
    floorPlateDepth: 0,
    ceilingHeight: 10,
    floorToFloorHeight: 14,
    _disciplinesUserTouched: false,
    ...overrides,
  };
}

/**
 * Build a mock context object with the shape ai-engine.js passes around.
 */
export function mockContext(overrides = {}) {
  return {
    disciplines: ['Structured Cabling', 'CCTV'],
    markup: { material: 50, labor: 50 },
    laborRates: { electrician: 85 },
    includeBurden: true,
    burdenRate: 35,
    wave0: {},
    wave0_3: {},
    wave0_35: {},
    wave1: {},
    wave1_75: {},
    wave2: {},
    wave2_25: {},
    _brainInsights: [],
    ...overrides,
  };
}
