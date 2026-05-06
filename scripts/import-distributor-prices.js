#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// SmartPlans — Distributor Price JSONL Importer
//
// Reads a JSONL file of real distributor quotes (Graybar, Anixter,
// Genetec, etc.) and POSTs them in batches to the SmartPlans
// /api/distributor-prices endpoint. Deduplicates by (manufacturer +
// part_number + distributor) — keeps the most recent quote when
// duplicates exist.
//
// Usage:
//   node scripts/import-distributor-prices.js <path-to-jsonl> [--api-url=URL] [--token=TOKEN]
//
// Defaults:
//   --api-url  https://smartplans-4g5.pages.dev
//   --token    reads from SMARTPLANS_TOKEN env var or prompts
//
// The JSONL schema supports two formats:
//   Format A (Amtrak early lines): description as item name, no item_name field
//   Format B (Procore extract):    item_name field present, description is longer
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

// ── Parse CLI args ──────────────────────────────────────────
const args = process.argv.slice(2);
const jsonlPath = args.find(a => !a.startsWith('--'));
if (!jsonlPath) {
  console.error('Usage: node import-distributor-prices.js <path-to-jsonl> [--api-url=URL] [--token=TOKEN]');
  process.exit(1);
}

const apiUrl = (args.find(a => a.startsWith('--api-url=')) || '').replace('--api-url=', '') || 'https://smartplans-4g5.pages.dev';
const token = (args.find(a => a.startsWith('--token=')) || '').replace('--token=', '') || process.env.SMARTPLANS_TOKEN || '';

if (!token) {
  console.error('ERROR: No auth token. Set SMARTPLANS_TOKEN env var or pass --token=...');
  console.error('       Get your token from SmartPlans → Settings → Session Token');
  process.exit(1);
}

// ── Service line → category mapping ─────────────────────────
const CATEGORY_MAP = {
  'cctv': 'CCTV',
  'access_control': 'Access Control',
  'structured_cabling': 'Structured Cabling',
  'fire_alarm': 'Fire Alarm',
  'intrusion': 'Intrusion Detection',
  'audio_visual': 'Audio Visual',
  'nurse_call': 'Nurse Call',
  'das': 'DAS',
  'network_infra': 'Network Infrastructure',
  'power': 'Power & UPS',
  'enclosures': 'Enclosures & Racks',
  'general': 'General',
};

// ── Supplier normalization ──────────────────────────────────
function normalizeSupplier(raw) {
  if (!raw) return 'Unknown';
  const s = raw.toLowerCase();
  if (s.includes('graybar')) return 'Graybar';
  if (s.includes('anixter') || s.includes('wesco')) return 'Anixter/WESCO';
  if (s.includes('genetec')) return 'Genetec';
  if (s.includes('adi')) return 'ADI';
  if (s.includes('tri-ed')) return 'Tri-Ed';
  return raw.substring(0, 100);
}

// ── Read and parse JSONL ────────────────────────────────────
console.log(`Reading: ${jsonlPath}`);
const raw = fs.readFileSync(path.resolve(jsonlPath), 'utf-8');
const lines = raw.split('\n').filter(l => l.trim().length > 0);
console.log(`Parsed ${lines.length} lines from JSONL`);

// Parse each line and build deduplicated price records
const seen = new Map(); // key: "MFG|PART|SUPPLIER" → record (keep newest)

let parseErrors = 0;
for (let i = 0; i < lines.length; i++) {
  let row;
  try {
    row = JSON.parse(lines[i]);
  } catch (e) {
    parseErrors++;
    continue;
  }

  const mfg = (row.manufacturer || '').trim();
  const part = (row.part_number || '').trim();
  const supplier = normalizeSupplier(row.supplier);
  const unitCost = parseFloat(row.unit_cost);
  if (!unitCost || unitCost <= 0) continue; // skip zero-cost junk

  // Build item_name: prefer item_name field, then description, then mfg + part
  let itemName = (row.item_name || '').trim();
  if (!itemName) itemName = (row.description || '').trim();
  if (!itemName) itemName = `${mfg} ${part}`.trim();
  if (!itemName) continue; // can't use a record with no name

  // Map service_line → category
  const category = CATEGORY_MAP[row.service_line] || row.service_line || 'General';

  // Quote expiry: default to 6 months after quote_date if not specified
  let expiresAt = null;
  if (row.quote_date) {
    try {
      const qd = new Date(row.quote_date);
      if (!isNaN(qd.getTime())) {
        const exp = new Date(qd.getTime() + 180 * 24 * 60 * 60 * 1000); // 6 months
        expiresAt = exp.toISOString().split('T')[0];
      }
    } catch (e) { /* ignore bad dates */ }
  }

  // Notes: include project context for traceability
  const notesParts = [];
  if (row.procore_project_name) notesParts.push(`Project: ${row.procore_project_name}`);
  if (row.supplier_quote_number) notesParts.push(`Quote#: ${row.supplier_quote_number}`);
  if (row.mfr_catalog) notesParts.push(`Catalog: ${row.mfr_catalog}`);

  const record = {
    item_name: itemName.substring(0, 300),
    manufacturer: mfg.substring(0, 200) || null,
    part_number: part.substring(0, 100) || null,
    distributor: supplier,
    unit_cost: unitCost,
    unit: (row.unit || 'EA').toUpperCase(),
    list_price: row.mfr_list_price ? parseFloat(row.mfr_list_price) : null,
    discount_pct: row.discount_pct ? parseFloat(row.discount_pct) : null,
    category,
    quote_number: (row.supplier_quote_number || '').substring(0, 50) || null,
    quote_date: row.quote_date || null,
    expires_at: expiresAt,
    notes: notesParts.join(' | ').substring(0, 500) || null,
  };

  // Dedup: keep the NEWEST quote (by quote_date) for each mfg+part+supplier combo
  const dedupeKey = `${mfg.toUpperCase()}|${part.toUpperCase()}|${supplier.toUpperCase()}`;
  const existing = seen.get(dedupeKey);
  if (existing) {
    // Keep the one with the newer quote_date
    const existDate = existing.quote_date ? new Date(existing.quote_date) : new Date(0);
    const newDate = record.quote_date ? new Date(record.quote_date) : new Date(0);
    if (newDate > existDate) {
      seen.set(dedupeKey, record);
    }
  } else {
    seen.set(dedupeKey, record);
  }
}

const records = Array.from(seen.values());
console.log(`${records.length} unique prices after dedup (${parseErrors} parse errors, ${lines.length - records.length - parseErrors} duplicates removed)`);

// ── Summary by category ─────────────────────────────────────
const byCat = {};
for (const r of records) {
  const cat = r.category || 'Other';
  if (!byCat[cat]) byCat[cat] = 0;
  byCat[cat]++;
}
console.log('\nBy category:');
for (const [cat, count] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat}: ${count} items`);
}

// ── Summary by supplier ─────────────────────────────────────
const bySup = {};
for (const r of records) {
  const sup = r.distributor || 'Other';
  if (!bySup[sup]) bySup[sup] = 0;
  bySup[sup]++;
}
console.log('\nBy supplier:');
for (const [sup, count] of Object.entries(bySup).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${sup}: ${count} items`);
}

// ── Upload in batches ───────────────────────────────────────
const BATCH_SIZE = 50;

async function uploadBatch(batch, batchNum, totalBatches) {
  const resp = await fetch(`${apiUrl}/api/distributor-prices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': token,
    },
    body: JSON.stringify({ items: batch }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error(`  Batch ${batchNum}/${totalBatches} FAILED (${resp.status}): ${text}`);
    return { saved: 0, errors: batch.length };
  }

  const result = await resp.json();
  console.log(`  Batch ${batchNum}/${totalBatches}: ${result.saved} saved, ${result.errors || 0} errors`);
  return result;
}

async function main() {
  console.log(`\nUploading ${records.length} prices to ${apiUrl}/api/distributor-prices ...`);

  let totalSaved = 0;
  let totalErrors = 0;
  const totalBatches = Math.ceil(records.length / BATCH_SIZE);

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const result = await uploadBatch(batch, batchNum, totalBatches);
    totalSaved += result.saved || 0;
    totalErrors += result.errors || 0;
  }

  console.log(`\n════════════════════════════════════════`);
  console.log(`COMPLETE: ${totalSaved} saved, ${totalErrors} errors`);
  console.log(`Material Pricer will now use these prices on the next bid.`);
  console.log(`════════════════════════════════════════`);
}

main().catch(err => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
