#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// SmartPlans — Bid Corpus Seeder
// Reads a bid_corpus.json (produced by ClaudeBids/scripts/extract_bids.py)
// plus optional proposal scope.json files, and emits a single SQL file
// of INSERT statements ready to apply to D1 via:
//
//     wrangler d1 execute smartplans-db --remote --file scripts/seed.sql
//
// Tables populated:
//   - distributor_prices    (parts pricing with manufacturer + part #)
//   - labor_standards       (BICSI activity-level labor units)
//   - winning_proposals     (per-bid scope template + voice training)
//
// The bid corpus JSON is NEVER committed — it's proprietary pricing data.
// This script lives in git; the data it reads stays on your machine.
//
// Usage:
//   node scripts/seed-bid-corpus.mjs <path-to-bid_corpus.json> [scope-template-1.json ...]
// ═══════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, basename } from 'node:path';

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Usage: node scripts/seed-bid-corpus.mjs <bid_corpus.json> [proposal.scope.json ...]');
    process.exit(1);
}

const corpusPath = resolve(args[0]);
const proposalPaths = args.slice(1).map((a) => resolve(a));

if (!existsSync(corpusPath)) {
    console.error(`Not found: ${corpusPath}`);
    process.exit(1);
}

const corpus = JSON.parse(readFileSync(corpusPath, 'utf8'));
const proposals = proposalPaths
    .filter((p) => existsSync(p))
    .map((p) => ({ path: p, content: JSON.parse(readFileSync(p, 'utf8')) }));

// ─── SQL escaping ────────────────────────────────────────────

function sq(v) {
    if (v == null) return 'NULL';
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
    return `'${String(v).replace(/'/g, "''")}'`;
}

// ─── Mapping: corpus scope -> SmartPlans discipline ──────────

const SCOPE_TO_DISCIPLINE = {
    CCTV: 'CCTV',
    ACCESS_CONTROL: 'Access Control',
    INTRUSION: 'Intrusion',
    AV: 'Audio Visual',
    FIRE_ALARM: 'Fire Alarm',
    STRUCTURED_CABLING: 'Structured Cabling',
    NURSE_CALL: 'Nurse Call',
    PAGING: 'Paging',
    ERRCS: 'ERRCS',
    RFID: 'RFID',
};

function discipline(scope) {
    return SCOPE_TO_DISCIPLINE[scope] || null;
}

// ─── Build distributor_prices INSERT ─────────────────────────

const pricingRows = [];
const seenPricing = new Set();
for (const p of corpus.pricingRefs || []) {
    if (p.unitCost == null || isNaN(p.unitCost)) continue;
    const partKey = `${(p.manufacturer || '').toUpperCase()}::${(p.partNumber || p.description || '').toUpperCase()}`;
    if (seenPricing.has(partKey)) continue;
    seenPricing.add(partKey);

    pricingRows.push([
        p.description?.slice(0, 300) || 'unknown',
        p.manufacturer?.slice(0, 200) || null,
        p.partNumber?.slice(0, 100) || null,
        '3D Historical',
        Number(p.unitCost),
        (p.unit || 'EA').slice(0, 20),
        discipline(p.scope) || 'Unknown',
        p.source?.slice(0, 50) || null,
    ]);
}

// ─── Build labor_standards INSERT ────────────────────────────

const laborRows = [];
const seenLabor = new Map();
for (const l of corpus.laborRefs || []) {
    if (!l.activityDesc) continue;
    const key = `${l.activityDesc.toUpperCase()}::${l.scope || ''}::${l.role || ''}`;
    let minutes = l.unitMinutes != null ? Number(l.unitMinutes) : null;
    if (minutes == null && l.hours != null) minutes = Number(l.hours) * 60;
    if (minutes == null || !Number.isFinite(minutes) || minutes <= 0) continue;

    const existing = seenLabor.get(key);
    if (existing) {
        existing.totalMinutes += minutes;
        existing.count += 1;
        continue;
    }
    seenLabor.set(key, { row: l, totalMinutes: minutes, count: 1 });
}

for (const { row, totalMinutes, count } of seenLabor.values()) {
    const avgMinutes = totalMinutes / count;
    laborRows.push([
        row.activityDesc.slice(0, 200),
        discipline(row.scope) || null,
        row.role?.slice(0, 80) || null,
        'EA',
        avgMinutes,
        avgMinutes / 60,
        'won-bid',
        row.source?.slice(0, 200) || null,
        count,
    ]);
}

// ─── Build winning_proposals INSERT (from scope templates) ───

const proposalRows = [];
for (const { path, content } of proposals) {
    const scopeNarrative = JSON.stringify({
        sections: content.sections,
        totals: content.totals,
        addAlts: content.addAlts,
        date: content.date,
    });
    proposalRows.push([
        content.project || basename(path, '.scope.json'),
        'Apartment Complex', // could be inferred more cleverly later
        Number(content.totalAll) || null,
        null, // win_margin_pct unknown until we link to estimate
        `Best & Final rebid baseline. Total: $${(content.totalAll || 0).toLocaleString()}.`,
        scopeNarrative.slice(0, 60000), // SQLite TEXT limit safety
        null,
        null,
        `Source: ${basename(path)}`,
        'won',
    ]);
}

// ─── Emit SQL ─────────────────────────────────────────────────

const lines = [];
lines.push(`-- Generated by scripts/seed-bid-corpus.mjs at ${new Date().toISOString()}`);
lines.push(`-- Source: ${basename(corpusPath)}`);
lines.push(`-- DO NOT COMMIT THIS FILE — it contains proprietary pricing data.`);
lines.push('');

lines.push(`-- ─── distributor_prices: ${pricingRows.length} rows ───`);
for (const r of pricingRows) {
    lines.push(
        `INSERT INTO distributor_prices (id, item_name, manufacturer, part_number, distributor, unit_cost, unit, category, notes) VALUES (lower(hex(randomblob(16))), ${r.map(sq).join(', ')});`,
    );
}
lines.push('');

lines.push(`-- ─── labor_standards: ${laborRows.length} rows ───`);
for (const r of laborRows) {
    lines.push(
        `INSERT INTO labor_standards (id, activity, discipline, role, unit, unit_minutes, unit_hours, source_standard, source_bid, sample_count) VALUES (lower(hex(randomblob(16))), ${r.map(sq).join(', ')});`,
    );
}
lines.push('');

if (proposalRows.length > 0) {
    lines.push(`-- ─── winning_proposals: ${proposalRows.length} rows ───`);
    for (const r of proposalRows) {
        lines.push(
            `INSERT INTO winning_proposals (id, project_name, project_type, contract_value, win_margin_pct, executive_summary, scope_narrative, value_propositions, exclusions_text, strategy_notes, outcome) VALUES (lower(hex(randomblob(16))), ${r.map(sq).join(', ')});`,
        );
    }
    lines.push('');
}

const outSql = resolve('scripts', 'seed.sql');
writeFileSync(outSql, lines.join('\n'), 'utf8');

console.log(`Wrote ${outSql}`);
console.log(`  distributor_prices: ${pricingRows.length}`);
console.log(`  labor_standards:    ${laborRows.length}`);
console.log(`  winning_proposals:  ${proposalRows.length}`);
console.log('');
console.log('Apply to remote D1 with:');
console.log(`  wrangler d1 execute smartplans-db --remote --file scripts/seed.sql`);
console.log('');
console.log('Note: scripts/seed.sql is .gitignored — never commit it.');
