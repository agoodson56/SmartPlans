#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// SMARTPLANS LOCAL HARNESS — Amtrak Martinez Bid Reproduction
//
// Runs the FormulaEngine3D + SmartPlansExport cost-buildup chain
// against a canned Martinez BOM with NO API calls. Each run is $0.
//
// Goal: reproduce the live $3.14M overshoot deterministically, then
// fix bugs cluster-by-cluster while watching this number drop toward
// the $1,966,150 BAFO benchmark.
//
// Run with:  node tests/martinez-harness.mjs
// ═══════════════════════════════════════════════════════════════

import { loadFinancialsStack, buildTestState } from './helpers/load-financials.js';

const { SmartPlansExport, SmartPlansFinancials, FormulaEngine3D, PRICING_DB, warnings, errors } = loadFinancialsStack();

// ───────────────────────────────────────────────────────────────
// MARTINEZ CANNED BOM
// Matches the production console log: 46 sheets, ~68 cameras,
// 14 access-controlled doors, ~500 cable drops, 588 devices total.
// Subcontracted civil (~$180K) included to mimic infrastructure-heavy
// transit job that triggers the calibration skip-gate.
// ───────────────────────────────────────────────────────────────

const martinezBOM = {
    categories: [
        {
            name: 'CCTV — Cameras',
            items: [
                { item: 'Indoor Dome Camera (Axis P3265)',     qty: 22, unit: 'ea', unitCost: 380 },
                { item: 'Outdoor Bullet Camera (Axis P1465)',  qty: 38, unit: 'ea', unitCost: 350 },
                { item: 'PTZ Pole-mount Camera',                qty: 8,  unit: 'ea', unitCost: 2200 },
                { item: 'Camera Mount — Pendant',               qty: 22, unit: 'ea', unitCost: 65 },
                { item: 'Camera Mount — Pole Bracket',          qty: 8,  unit: 'ea', unitCost: 240 },
                { item: 'Surge Suppressor (PoE)',               qty: 92, unit: 'ea', unitCost: 95 },
            ],
        },
        {
            name: 'Access Control',
            items: [
                { item: 'Card Reader (HID multiCLASS)',         qty: 14, unit: 'ea', unitCost: 320 },
                { item: 'Electric Strike',                      qty: 14, unit: 'ea', unitCost: 180 },
                { item: 'Door Position Switch',                 qty: 14, unit: 'ea', unitCost: 45 },
                { item: 'Request-to-Exit (REX) PIR',            qty: 14, unit: 'ea', unitCost: 85 },
                { item: 'Access Control Panel (Mercury)',       qty: 2,  unit: 'ea', unitCost: 1800 },
                { item: 'Power Supply 12VDC 10A',               qty: 4,  unit: 'ea', unitCost: 220 },
            ],
        },
        {
            name: 'Structured Cabling',
            items: [
                { item: 'CAT6A Plenum Cable',                   qty: 80000, unit: 'ft', unitCost: 0.32 },
                { item: 'CAT6A RJ45 Jack',                      qty: 500,   unit: 'ea', unitCost: 8 },
                { item: 'Patch Panel 24-port CAT6A',            qty: 18,    unit: 'ea', unitCost: 85 },
                { item: 'Network Switch 48-port PoE+',          qty: 4,     unit: 'ea', unitCost: 800 },
                { item: 'Network Switch 24-port PoE+',          qty: 6,     unit: 'ea', unitCost: 520 },
                { item: 'Fiber 24-strand SM',                   qty: 1500,  unit: 'ft', unitCost: 1.85 },
                { item: 'Fiber Patch Cord LC-LC SM',            qty: 24,    unit: 'ea', unitCost: 28 },
                { item: 'Equipment Rack 42RU 4-post',           qty: 2,     unit: 'ea', unitCost: 480 },
                { item: 'UPS 10kVA Rack-mount',                 qty: 1,     unit: 'ea', unitCost: 7500 },
                { item: 'Cable Manager Horizontal 2RU',         qty: 6,     unit: 'ea', unitCost: 75 },
            ],
        },
        {
            name: 'Conduit & Pathway',
            items: [
                { item: 'EMT 3/4" Conduit',                     qty: 2400, unit: 'ft', unitCost: 1.20 },
                { item: 'PVC-coated RMC 1"',                    qty: 800,  unit: 'ft', unitCost: 18.00 },
                { item: 'Cable Tray 12" Wire Basket',           qty: 200,  unit: 'ft', unitCost: 22 },
                { item: 'Junction Box 4"sq Deep',               qty: 95,   unit: 'ea', unitCost: 12 },
                { item: 'Conduit Body LB 3/4"',                 qty: 30,   unit: 'ea', unitCost: 18 },
                { item: 'Strut Channel + Hardware',             qty: 200,  unit: 'lf', unitCost: 14 },
            ],
        },
        {
            name: 'Subcontractor — Civil / Trenching',
            items: [
                { item: 'Trench & Backfill 24"D',               qty: 600, unit: 'lf', unitCost: 75 },
                { item: 'Concrete Bollard + Handhole',          qty: 12,  unit: 'ea', unitCost: 8500 },
                { item: 'Saw-cut & Patch (asphalt)',            qty: 200, unit: 'lf', unitCost: 95 },
            ],
        },
    ],
    grandTotal: 0,
};

// Compute extCost and subtotals, then grandTotal
for (const cat of martinezBOM.categories) {
    let sub = 0;
    for (const it of cat.items) {
        if (it.extCost == null) it.extCost = Math.round(it.qty * it.unitCost * 100) / 100;
        sub += it.extCost;
    }
    cat.subtotal = Math.round(sub);
}
martinezBOM.grandTotal = martinezBOM.categories.reduce((s, c) => s + c.subtotal, 0);

// ───────────────────────────────────────────────────────────────
// MARTINEZ STATE
// transit_railroad ON (Davis-Bacon 1.8x), West Coast region (1.25x),
// disciplines = SC + CCTV + AC, mid pricing tier
// ───────────────────────────────────────────────────────────────

const martinezState = buildTestState({
    projectName: 'Amtrak Martinez Station',
    projectType: 'transit_railroad',
    projectLocation: 'Martinez, CA',
    disciplines: ['Structured Cabling', 'CCTV', 'Access Control'],
    isTransitRailroad: true,
    prevailingWage: 'davis-bacon',
    pricingTier: 'mid',
    travel: { enabled: false },
});
martinezState._pwState = 'CA';
martinezState._pwCounty = 'contra_costa';
martinezState.regionalMultiplier = 'west_coast';
// Camera count for calibration (matches device counts above: 22+38+8 = 68)
martinezState.cameraCount = 68;
martinezState.consensusCounts = {
    camera: { consensus: 68 },
    card_reader: { consensus: 14 },
    network_switch: { consensus: 10 },
};

// ───────────────────────────────────────────────────────────────
// PRINT HELPERS
// ───────────────────────────────────────────────────────────────

const fmt = (n) => '$' + (Math.round(Number(n) || 0)).toLocaleString();
const pad = (s, n) => String(s).padEnd(n);
const padR = (s, n) => String(s).padStart(n);
const hr = (ch = '─') => console.log(ch.repeat(67));
const hh = () => console.log('═'.repeat(67));

// ───────────────────────────────────────────────────────────────
// PRINT INPUT BOM
// ───────────────────────────────────────────────────────────────

console.log('');
hh();
console.log(' SMARTPLANS LOCAL HARNESS — Amtrak Martinez Reproduction');
hh();
console.log('');
console.log(' Input BOM (raw cost, no markup yet):');
hr();
for (const cat of martinezBOM.categories) {
    console.log(`   ${pad(cat.name, 45)} ${padR(fmt(cat.subtotal), 14)}`);
}
hr();
console.log(`   ${pad('Direct cost subtotal', 45)} ${padR(fmt(martinezBOM.grandTotal), 14)}`);
console.log('');
console.log(`   Devices counted: 68 cameras, 14 access-controlled doors, ~500 drops`);
console.log(`   Project: Davis-Bacon (1.8x), West Coast region, transit_railroad ON`);
console.log('');

// ───────────────────────────────────────────────────────────────
// 1. FORMULA ENGINE 3D — primary path for transit
// ───────────────────────────────────────────────────────────────

hh();
console.log(' [1] FormulaEngine3D.computeBid (transit primary path)');
hh();

let result3D;
try {
    result3D = FormulaEngine3D.computeBid(martinezState, martinezBOM);
} catch (e) {
    console.log(' ⚠ FormulaEngine3D threw:', e.message);
    console.log(e.stack);
}

if (result3D) {
    console.log('');
    console.log(`   totalMaterialCost     ${padR(fmt(result3D.totalMaterialCost), 14)}`);
    console.log(`   totalFieldHours       ${padR((result3D.totalFieldHours || 0).toLocaleString() + ' hrs', 14)}`);
    console.log(`   subcontractorCost     ${padR(fmt(result3D.subcontractorCost), 14)}`);
    console.log(`   bonds                 ${padR(fmt(result3D.bonds), 14)}`);
    console.log(`   grandTotalCOS         ${padR(fmt(result3D.grandTotalCOS), 14)}`);
    console.log(`   grandTotalSELL        ${padR(fmt(result3D.grandTotalSELL), 14)}    ← 3D engine final`);
    console.log(`   grossMarginPct        ${padR((result3D.grossMarginPct || 0) + '%', 14)}`);
    console.log('');
    console.log(`   _calibrated:          ${!!result3D._calibrated}`);
    console.log(`   _calibrationRejected: ${!!result3D._calibrationRejected}`);
    console.log(`   _calibrationSource:   ${result3D._calibrationSource || '(none)'}`);
    console.log(`   _scaleFactor:         ${result3D._scaleFactor != null ? result3D._scaleFactor.toFixed(3) : '(none)'}`);

    if (result3D.systems) {
        console.log('');
        console.log('   Per-system breakdown:');
        hr();
        console.log(`   ${pad('System', 18)} ${padR('matSELL', 11)} ${padR('laborSELL', 11)} ${padR('sysSELL', 11)} ${padR('hrs', 7)}`);
        for (const [sysType, sys] of Object.entries(result3D.systems)) {
            console.log(`   ${pad(sysType, 18)} ${padR(fmt(sys.materialsPlusSELL || sys.matSELL), 11)} ${padR(fmt(sys.laborSELL), 11)} ${padR(fmt(sys.systemSell || sys.sysSELL), 11)} ${padR((sys.fieldHours || 0).toLocaleString(), 7)}`);
        }
    }

    if (result3D._transit) {
        console.log('');
        console.log('   Transit adders applied:');
        hr();
        for (const [k, v] of Object.entries(result3D._transit)) {
            if (typeof v === 'number' && v !== 0) {
                console.log(`   ${pad(k, 30)} ${padR(fmt(v), 14)}`);
            }
        }
    }
}
console.log('');

// ───────────────────────────────────────────────────────────────
// 2. SMARTPLANS EXPORT — _computeFullBreakdown (parallel path)
// ───────────────────────────────────────────────────────────────

hh();
console.log(' [2] SmartPlansExport._computeFullBreakdown (parallel non-transit path)');
hh();
console.log('');

try {
    const bd = SmartPlansExport._computeFullBreakdown(martinezState, martinezBOM);
    for (const [k, v] of Object.entries(bd)) {
        if (typeof v === 'number') {
            console.log(`   ${pad(k, 30)} ${padR(fmt(v), 14)}`);
        }
    }
} catch (e) {
    console.log(' ⚠ _computeFullBreakdown threw:', e.message);
}
console.log('');

// ───────────────────────────────────────────────────────────────
// 3. AUTHORITATIVE — _getFullyLoadedTotal (what UI actually shows)
// ───────────────────────────────────────────────────────────────

hh();
console.log(' [3] SmartPlansExport._getFullyLoadedTotal (UI authoritative)');
hh();
console.log('');

try {
    const final = SmartPlansExport._getFullyLoadedTotal(martinezState, martinezBOM);
    if (typeof final === 'number') {
        console.log(`   Final bid total:      ${padR(fmt(final), 14)}    ← THIS is what ships`);
    } else if (final && typeof final === 'object') {
        for (const [k, v] of Object.entries(final)) {
            if (typeof v === 'number') {
                console.log(`   ${pad(k, 30)} ${padR(fmt(v), 14)}`);
            }
        }
    }
} catch (e) {
    console.log(' ⚠ _getFullyLoadedTotal threw:', e.message);
}
console.log('');

// ───────────────────────────────────────────────────────────────
// VERDICT
// ───────────────────────────────────────────────────────────────

hh();
console.log(' VERDICT');
hh();
console.log('');
console.log(`   TARGET (martinez_bafo):       ${padR(fmt(1966150), 14)}    ← $28,495/cam × 69 cam`);
console.log(`   ACCEPTABLE BAND (97%-103%):   ${padR(fmt(1907166) + ' – ' + fmt(2025135), 28)}`);
console.log(`   LIVE BID OBSERVED (Apr 24):   ${padR(fmt(3140000), 14)}    ← +60% overshoot`);
console.log('');
console.log(' Diff from target:');
if (result3D) {
    const diff3D = (result3D.grandTotalSELL || 0) - 1966150;
    const pct3D = ((result3D.grandTotalSELL || 0) / 1966150 - 1) * 100;
    console.log(`   FormulaEngine3D:        ${padR(fmt(diff3D), 14)}    (${pct3D.toFixed(1)}%)`);
}
console.log('');

if (warnings.length) {
    console.log(`   ${warnings.length} warning(s) suppressed during load.`);
}
if (errors.length) {
    console.log(`   ${errors.length} ERROR(s) during load — first 3:`);
    errors.slice(0, 3).forEach(e => console.log(`     ${e}`));
}
console.log('');
