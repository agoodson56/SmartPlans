import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function loadExportEngine() {
  // Stub PRICING_DB dependency
  const PRICING_DB = {
    version: '5.0',
    regionalMultipliers: {
      national_average: 1.0,
      california: 1.25,
      new_york: 1.30,
      texas: 0.92,
    },
  };

  // Stub getRFIsForDisciplines dependency
  const getRFIsForDisciplines = () => [];

  // Stub console.warn/error so they don't pollute test output
  const originalWarn = console.warn;
  const originalError = console.error;

  const code = readFileSync(join(__dirname, '../../export-engine.js'), 'utf-8');

  // Wrap the code in a function that provides the global dependencies
  // and returns the SmartPlansExport object
  const fn = new Function(
    'PRICING_DB',
    'getRFIsForDisciplines',
    'console',
    code + '\nreturn SmartPlansExport;'
  );

  // Provide a quiet console that captures warnings for test inspection
  const warnings = [];
  const errors = [];
  const quietConsole = {
    ...console,
    warn: (...args) => { warnings.push(args.join(' ')); },
    error: (...args) => { errors.push(args.join(' ')); },
    log: console.log,
  };

  const engine = fn(PRICING_DB, getRFIsForDisciplines, quietConsole);

  // Attach captured logs for test inspection
  engine._testWarnings = warnings;
  engine._testErrors = errors;

  return engine;
}
