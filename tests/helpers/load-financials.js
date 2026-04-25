import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load the full pricing stack for formula-level tests:
 *   - pricing-database.js (real, not stubbed — Amtrak benchmarks + markup SSOT)
 *   - export-engine.js    (SmartPlansExport + SmartPlansFinancials)
 *   - formula-engine-3d.js (transit calibration)
 *
 * Returns { SmartPlansExport, SmartPlansFinancials, FormulaEngine3D, PRICING_DB, warnings, errors }.
 */
export function loadFinancialsStack() {
    const warnings = [];
    const errors = [];
    const quietConsole = {
        ...console,
        warn: (...args) => { warnings.push(args.join(' ')); },
        error: (...args) => { errors.push(args.join(' ')); },
        log: () => {},
    };

    // 1) Load real pricing database (needed for Amtrak benchmarks + markup defaults)
    const pdbCode = readFileSync(join(__dirname, '../../pricing-database.js'), 'utf-8');
    const pdbFn = new Function('console', pdbCode + '\nreturn PRICING_DB;');
    const PRICING_DB = pdbFn(quietConsole);

    // 2) Load formula-engine-3d FIRST (transit calibration — depends only on PRICING_DB)
    //    Order matters: export-engine references `typeof FormulaEngine3D !== 'undefined'`
    //    in _getFullyLoadedTotal:783 — without FormulaEngine3D in its scope the harness
    //    silently bypasses the entire transit primary path and ships the deterministic
    //    number, masking real production behavior. Wave-13 was developed against this
    //    broken harness — fixing it is prerequisite to validating any other fix.
    const feCode = readFileSync(join(__dirname, '../../formula-engine-3d.js'), 'utf-8');
    const feFn = new Function('PRICING_DB', 'console', feCode + '\nreturn FormulaEngine3D;');
    const FormulaEngine3D = feFn(PRICING_DB, quietConsole);

    // 3) Load export-engine WITH FormulaEngine3D injected so the transit branch is reachable
    const getRFIsForDisciplines = () => [];
    const computeTravelIncidentals = () => ({ grandTotal: 0 });
    const exportCode = readFileSync(join(__dirname, '../../export-engine.js'), 'utf-8');
    const exportFn = new Function(
        'PRICING_DB',
        'FormulaEngine3D',
        'getRFIsForDisciplines',
        'computeTravelIncidentals',
        'console',
        exportCode + '\nreturn { SmartPlansExport, SmartPlansFinancials };'
    );
    const { SmartPlansExport, SmartPlansFinancials } = exportFn(
        PRICING_DB,
        FormulaEngine3D,
        getRFIsForDisciplines,
        computeTravelIncidentals,
        quietConsole
    );

    return { SmartPlansExport, SmartPlansFinancials, FormulaEngine3D, PRICING_DB, warnings, errors };
}

/**
 * Build a minimal state object with predictable markup + burden config.
 * Caller can override markup/tier/travel via opts.
 */
export function buildTestState(opts = {}) {
    return {
        projectName: opts.projectName || 'Test Bid',
        projectType: opts.projectType || 'generic',
        disciplines: opts.disciplines || ['Structured Cabling'],
        markup: {
            material: 50,
            labor: 50,
            equipment: 15,
            subcontractor: 15,
            ...(opts.markup || {}),
        },
        burdenRate: opts.burdenRate !== undefined ? opts.burdenRate : 35,
        includeBurden: opts.includeBurden !== false,
        pricingConfig: {
            markup: {
                material: 50,
                labor: 50,
                equipment: 15,
                subcontractor: 15,
                contingency: opts.contingency !== undefined ? opts.contingency : 10,
                ...(opts.pricingConfig?.markup || {}),
            },
            burdenRate: opts.pricingConfig?.burdenRate !== undefined ? opts.pricingConfig.burdenRate : 35,
            includeBurden: opts.pricingConfig?.includeBurden !== false,
            tier: opts.pricingTier || 'mid',
        },
        pricingTier: opts.pricingTier || 'mid',
        travel: opts.travel || { enabled: false },
        isTransitRailroad: opts.isTransitRailroad || false,
        brainResults: opts.brainResults || (opts.laborBaseOverride !== undefined ? {
            wave2_25: { LABOR_CALCULATOR: { total_base_cost: opts.laborBaseOverride, total_hours: 0 } },
        } : null),
    };
}

/**
 * Build a minimal BOM shaped like what _extractBOMFromAnalysis produces.
 * @param {object} amounts { materials, labor, equipment, subs, travel }
 */
export function buildTestBOM({ materials = 0, labor = 0, equipment = 0, subs = 0, travel = 0 } = {}) {
    const cats = [];
    if (materials) cats.push({ name: 'Materials', subtotal: materials, items: [] });
    if (labor) cats.push({ name: 'Labor', subtotal: labor, items: [] });
    if (equipment) cats.push({ name: 'Equipment', subtotal: equipment, items: [] });
    if (subs) cats.push({ name: 'Subcontractors', subtotal: subs, items: [] });
    if (travel) cats.push({ name: 'Travel', subtotal: travel, items: [] });
    return {
        categories: cats,
        grandTotal: materials + labor + equipment + subs + travel,
    };
}
