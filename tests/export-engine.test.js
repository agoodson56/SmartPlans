import { describe, it, expect, beforeEach } from 'vitest';
import { loadExportEngine } from './helpers/load-module.js';

// ═══════════════════════════════════════════════════════════════
// SmartPlans Export Engine — Unit Tests
// ═══════════════════════════════════════════════════════════════

let engine;

beforeEach(() => {
  engine = loadExportEngine();
});

// ─── _extractBOMFromAnalysis ─────────────────────────────────

describe('_extractBOMFromAnalysis', () => {

  it('returns empty result with warning for null input', () => {
    const result = engine._extractBOMFromAnalysis(null);
    expect(result.categories).toEqual([]);
    expect(result.grandTotal).toBe(0);
    expect(result._warning).toBeTruthy();
  });

  it('returns empty result with warning for empty string', () => {
    const result = engine._extractBOMFromAnalysis('');
    expect(result.categories).toEqual([]);
    expect(result.grandTotal).toBe(0);
    expect(result._warning).toContain('No BOM data');
  });

  it('returns empty result for analysis with no parseable cost data', () => {
    const markdown = `
## Project Overview
This is a general analysis with no tables or costs.

Some text about the project scope.
`;
    const result = engine._extractBOMFromAnalysis(markdown);
    expect(result.categories).toEqual([]);
    expect(result.grandTotal).toBe(0);
    expect(result._warning).toBeTruthy();
  });

  it('parses a valid markdown table with all columns', () => {
    const markdown = `
## Structured Cabling Material Breakdown

| Item | Qty | Unit | Unit Cost | Extended Cost |
|------|-----|------|-----------|---------------|
| Cat6A Cable (1000ft box) | 10 | box | $285.00 | $2,850.00 |
| RJ45 Connectors (50-pack) | 5 | pk | $32.00 | $160.00 |
| 48-Port Patch Panel | 4 | ea | $189.00 | $756.00 |
`;
    const result = engine._extractBOMFromAnalysis(markdown);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].name).toBe('Structured Cabling Material Breakdown');
    expect(result.categories[0].items).toHaveLength(3);

    const cable = result.categories[0].items[0];
    expect(cable.item).toBe('Cat6A Cable (1000ft box)');
    expect(cable.qty).toBe(10);
    expect(cable.unitCost).toBe(285.00);
    expect(cable.extCost).toBe(2850.00);

    expect(result.grandTotal).toBe(2850 + 160 + 756);
  });

  it('parses 4-column table (no Unit column)', () => {
    const markdown = `
## CCTV Equipment Costs

| Description | Qty | Unit Cost | Total |
|-------------|-----|-----------|-------|
| 4MP IP Camera | 12 | $450.00 | $5,400.00 |
| 32-Ch NVR | 1 | $2,800.00 | $2,800.00 |
`;
    const result = engine._extractBOMFromAnalysis(markdown);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].items).toHaveLength(2);
    expect(result.categories[0].items[0].item).toBe('4MP IP Camera');
    expect(result.categories[0].items[0].qty).toBe(12);
    expect(result.categories[0].items[0].extCost).toBe(5400);
    expect(result.grandTotal).toBe(8200);
  });

  it('correctly groups items under multiple category headings', () => {
    const markdown = `
## Structured Cabling Material

| Item | Qty | Unit Cost | Total |
|------|-----|-----------|-------|
| Cat6A Cable | 5 | $280.00 | $1,400.00 |

## Access Control Equipment

| Item | Qty | Unit Cost | Total |
|------|-----|-----------|-------|
| Card Reader | 8 | $350.00 | $2,800.00 |
| Door Controller | 2 | $1,200.00 | $2,400.00 |
`;
    const result = engine._extractBOMFromAnalysis(markdown);
    expect(result.categories).toHaveLength(2);
    expect(result.categories[0].name).toBe('Structured Cabling Material');
    expect(result.categories[0].items).toHaveLength(1);
    expect(result.categories[1].name).toBe('Access Control Equipment');
    expect(result.categories[1].items).toHaveLength(2);
    expect(result.grandTotal).toBe(1400 + 2800 + 2400);
  });

  it('excludes summary/rollup sections to prevent double-counting', () => {
    const markdown = `
## Structured Cabling Material

| Item | Qty | Unit Cost | Total |
|------|-----|-----------|-------|
| Cat6A Cable | 10 | $280.00 | $2,800.00 |

## Project Cost Summary

| Category | Cost |
|----------|------|
| Structured Cabling | $2,800.00 |
| Total | $2,800.00 |
`;
    const result = engine._extractBOMFromAnalysis(markdown);
    // "Project Cost Summary" matches the isNonCategory pattern, so it should NOT
    // be included as a category — only "Structured Cabling Material" should appear
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].name).toBe('Structured Cabling Material');
    expect(result.grandTotal).toBe(2800);
  });

  it('skips subtotal/total rows within tables', () => {
    const markdown = `
## Fire Alarm Equipment

| Item | Qty | Unit Cost | Extended Cost |
|------|-----|-----------|---------------|
| Smoke Detector | 50 | $85.00 | $4,250.00 |
| Pull Station | 10 | $125.00 | $1,250.00 |
| **Subtotal** | | | $5,500.00 |
`;
    const result = engine._extractBOMFromAnalysis(markdown);
    expect(result.categories[0].items).toHaveLength(2);
    // Subtotal row should NOT become a line item
    const itemNames = result.categories[0].items.map(i => i.item);
    expect(itemNames).not.toContain('Subtotal');
  });

  it('computes subtotals from line items (not from AI subtotal rows)', () => {
    const markdown = `
## Equipment Pricing

| Item | Qty | Unit Cost | Total |
|------|-----|-----------|-------|
| Switch | 2 | $500.00 | $1,000.00 |
| Router | 1 | $800.00 | $800.00 |
| **Subtotal** | | | $2,500.00 |
`;
    // The AI subtotal says $2,500, but actual items sum to $1,800.
    // The engine should use the items sum, not the AI subtotal.
    const result = engine._extractBOMFromAnalysis(markdown);
    expect(result.categories[0].subtotal).toBe(1800);
    expect(result.grandTotal).toBe(1800);
  });

  it('grand total is sum of all category subtotals', () => {
    const markdown = `
## Cabling Material

| Item | Qty | Unit Cost | Total |
|------|-----|-----------|-------|
| Cat6A Box | 3 | $100.00 | $300.00 |

## Camera Equipment

| Item | Qty | Unit Cost | Total |
|------|-----|-----------|-------|
| Dome Camera | 5 | $200.00 | $1,000.00 |

## Audio Visual Equipment

| Item | Qty | Unit Cost | Total |
|------|-----|-----------|-------|
| Speaker | 4 | $75.00 | $300.00 |
`;
    const result = engine._extractBOMFromAnalysis(markdown);
    expect(result.grandTotal).toBe(300 + 1000 + 300);
    expect(result.categories[0].subtotal).toBe(300);
    expect(result.categories[1].subtotal).toBe(1000);
    expect(result.categories[2].subtotal).toBe(300);
  });

  it('sets _warning flag when no items are found', () => {
    const markdown = `
## Project Overview

This is just text without any tables or cost data.

## Timeline

Phase 1: Planning
Phase 2: Execution
`;
    const result = engine._extractBOMFromAnalysis(markdown);
    expect(result._warning).toBeTruthy();
    expect(result.categories).toEqual([]);
  });

  it('handles bold-text category headings (**HEADING**)', () => {
    const markdown = `
**Rack and Cabinet Equipment**

| Item | Qty | Unit Cost | Total |
|------|-----|-----------|-------|
| 42U Server Rack | 2 | $1,500.00 | $3,000.00 |
| Horizontal Cable Manager | 4 | $45.00 | $180.00 |
`;
    const result = engine._extractBOMFromAnalysis(markdown);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].name).toBe('Rack and Cabinet Equipment');
    expect(result.categories[0].items).toHaveLength(2);
  });

  it('calculates extCost from qty * unitCost when extended cost is missing', () => {
    const markdown = `
## Pathway Material

| Item | Qty | Unit Cost | Extended Cost |
|------|-----|-----------|---------------|
| 3/4" EMT Conduit (10ft) | 25 | $8.50 | |
`;
    const result = engine._extractBOMFromAnalysis(markdown);
    // With empty extCost cell, the parser should fall back to qty * unitCost
    expect(result.categories).toHaveLength(1);
    const item = result.categories[0].items[0];
    expect(item.qty).toBe(25);
    expect(item.unitCost).toBe(8.5);
    expect(item.extCost).toBe(212.5);
  });

  it('calculates unitCost from extCost / qty when unit cost is missing', () => {
    const markdown = `
## Conduit and Pathway

| Item | Qty | Unit Cost | Extended Cost |
|------|-----|-----------|---------------|
| J-Hooks | 100 | | $350.00 |
`;
    const result = engine._extractBOMFromAnalysis(markdown);
    const item = result.categories[0].items[0];
    expect(item.qty).toBe(100);
    expect(item.extCost).toBe(350);
    expect(item.unitCost).toBe(3.5);
  });

  it('uses fallback inline cost extraction when no tables exist', () => {
    const markdown = `
## Structured Cabling Cost Breakdown

- Cat6A Cabling: $15,000
- Fiber Backbone: $8,500
- Patch Panels and Accessories: $3,200
`;
    const result = engine._extractBOMFromAnalysis(markdown);
    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].name).toBe('Extracted Cost Items (fallback)');
    expect(result.categories[0].items).toHaveLength(3);
    expect(result.grandTotal).toBe(15000 + 8500 + 3200);
  });

  it('extracts manufacturer and part number columns when present', () => {
    const markdown = `
## Equipment Pricing

| Item | Qty | Manufacturer | Part # | Unit Cost | Total |
|------|-----|-------------|--------|-----------|-------|
| PoE Switch | 4 | Cisco | CBS350-48P | $1,200.00 | $4,800.00 |
`;
    const result = engine._extractBOMFromAnalysis(markdown);
    const item = result.categories[0].items[0];
    expect(item.mfg).toBe('Cisco');
    expect(item.partNumber).toBe('CBS350-48P');
  });

  it('handles tables with dollar signs and commas in costs', () => {
    const markdown = `
## Infrastructure Material

| Item | Qty | Unit Cost | Total |
|------|-----|-----------|-------|
| UPS System | 1 | $12,500.00 | $12,500.00 |
| PDU | 2 | $1,250.50 | $2,501.00 |
`;
    const result = engine._extractBOMFromAnalysis(markdown);
    expect(result.categories[0].items[0].unitCost).toBe(12500);
    expect(result.categories[0].items[0].extCost).toBe(12500);
    expect(result.categories[0].items[1].unitCost).toBe(1250.5);
    expect(result.categories[0].items[1].extCost).toBe(2501);
  });

  it('skips rows with "continue" or ellipsis markers', () => {
    const markdown = `
## Cabling Material

| Item | Qty | Unit Cost | Total |
|------|-----|-----------|-------|
| Cat6A Box | 5 | $280.00 | $1,400.00 |
| ... continued on next page ... | | | |
| Patch Panel | 2 | $189.00 | $378.00 |
`;
    const result = engine._extractBOMFromAnalysis(markdown);
    const itemNames = result.categories[0].items.map(i => i.item);
    expect(itemNames).not.toContain('... continued on next page ...');
    expect(result.categories[0].items).toHaveLength(2);
  });

  it('assigns correct category via _guessCategory for parsed items', () => {
    const markdown = `
## Equipment Breakdown

| Item | Qty | Unit Cost | Total |
|------|-----|-----------|-------|
| 42U Server Rack | 1 | $1,500.00 | $1,500.00 |
| PoE Network Switch | 2 | $900.00 | $1,800.00 |
| 48-Port Patch Panel | 4 | $189.00 | $756.00 |
| IP Dome Camera | 10 | $450.00 | $4,500.00 |
| Card Reader | 6 | $350.00 | $2,100.00 |
`;
    const result = engine._extractBOMFromAnalysis(markdown);
    const items = result.categories[0].items;
    expect(items.find(i => i.item.includes('Rack')).category).toBe('rack');
    expect(items.find(i => i.item.includes('Switch')).category).toBe('switch');
    expect(items.find(i => i.item.includes('Patch Panel')).category).toBe('patch_panel');
    expect(items.find(i => i.item.includes('Camera')).category).toBe('cctv');
    expect(items.find(i => i.item.includes('Reader')).category).toBe('access_control');
  });

  it('rounds costs to 2 decimal places', () => {
    const markdown = `
## Misc Material

| Item | Qty | Unit Cost | Total |
|------|-----|-----------|-------|
| Wire Nut | 100 | $0.33 | $33.00 |
`;
    const result = engine._extractBOMFromAnalysis(markdown);
    expect(result.categories[0].items[0].unitCost).toBe(0.33);
    expect(result.categories[0].items[0].extCost).toBe(33);
    expect(result.grandTotal).toBe(33);
  });
});


// ─── _parseAnalysisSections ──────────────────────────────────

describe('_parseAnalysisSections', () => {

  it('returns empty object for null input', () => {
    const result = engine._parseAnalysisSections(null);
    expect(result).toEqual({});
  });

  it('returns empty object for empty string', () => {
    const result = engine._parseAnalysisSections('');
    expect(result).toEqual({});
  });

  it('returns empty object for undefined input', () => {
    const result = engine._parseAnalysisSections(undefined);
    expect(result).toEqual({});
  });

  it('parses ## headings into keyed sections', () => {
    const markdown = `## Project Overview
This is the overview section.

## Cost Breakdown
Here are the costs.

## Timeline
Phase 1 starts in January.`;

    const result = engine._parseAnalysisSections(markdown);
    expect(Object.keys(result)).toHaveLength(3);
    expect(result.project_overview).toBeDefined();
    expect(result.project_overview.title).toBe('Project Overview');
    expect(result.cost_breakdown).toBeDefined();
    expect(result.timeline).toBeDefined();
  });

  it('parses ### headings the same as ## headings', () => {
    const markdown = `### Section A
Content A.

### Section B
Content B.`;

    const result = engine._parseAnalysisSections(markdown);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result.section_a).toBeDefined();
    expect(result.section_b).toBeDefined();
  });

  it('falls back to bold text headers when no markdown headings exist', () => {
    const markdown = `**MATERIAL BREAKDOWN**
Some material data here.

**LABOR ESTIMATE**
Labor details follow.`;

    const result = engine._parseAnalysisSections(markdown);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result.material_breakdown).toBeDefined();
    expect(result.material_breakdown.title).toBe('MATERIAL BREAKDOWN');
    expect(result.labor_estimate).toBeDefined();
  });

  it('returns full_analysis key when no headers or bold text found', () => {
    const markdown = `This is just plain text with no headings at all.
It has multiple lines but no structure.
Just a wall of text about the project.`;

    const result = engine._parseAnalysisSections(markdown);
    expect(Object.keys(result)).toHaveLength(1);
    expect(result.full_analysis).toBeDefined();
    expect(result.full_analysis.title).toBe('Full Analysis');
    expect(result.full_analysis.content).toBe(markdown);
  });

  it('section content includes everything between headers', () => {
    const markdown = `## First Section
Line 1 of first.
Line 2 of first.

## Second Section
Line 1 of second.`;

    const result = engine._parseAnalysisSections(markdown);
    expect(result.first_section.content).toContain('Line 1 of first');
    expect(result.first_section.content).toContain('Line 2 of first');
    expect(result.first_section.content).not.toContain('Line 1 of second');
    expect(result.second_section.content).toContain('Line 1 of second');
  });

  it('sanitizes section keys: removes special chars, lowercases, uses underscores', () => {
    const markdown = `## Cost & Material (Phase 1)
Some content.`;

    const result = engine._parseAnalysisSections(markdown);
    // Should strip &, (, ) and use underscores
    const keys = Object.keys(result);
    expect(keys).toHaveLength(1);
    const key = keys[0];
    expect(key).toMatch(/^[a-z0-9_]+$/);
    expect(key).toContain('cost');
    expect(key).toContain('material');
  });

  it('truncates long section keys to 50 characters', () => {
    const longTitle = 'A'.repeat(80) + ' Very Long Section Title That Should Be Truncated';
    const markdown = `## ${longTitle}
Content.`;

    const result = engine._parseAnalysisSections(markdown);
    const keys = Object.keys(result);
    expect(keys[0].length).toBeLessThanOrEqual(50);
  });

  it('handles mixed heading levels (# and ## and ###)', () => {
    const markdown = `# Main Title
Intro text.

## Sub Section
Details here.

### Deep Section
More details.`;

    const result = engine._parseAnalysisSections(markdown);
    // All heading levels 1-3 should be captured
    expect(Object.keys(result).length).toBe(3);
  });
});


// ─── _guessCategory ──────────────────────────────────────────

describe('_guessCategory', () => {

  it('categorizes rack-related items', () => {
    expect(engine._guessCategory('42U Server Rack')).toBe('rack');
    expect(engine._guessCategory('Wall Mount Cabinet')).toBe('rack');
  });

  it('categorizes network switches', () => {
    expect(engine._guessCategory('PoE Network Switch')).toBe('switch');
    expect(engine._guessCategory('48-Port PoE+ Switch')).toBe('switch');
  });

  it('categorizes patch panels', () => {
    expect(engine._guessCategory('48-Port Patch Panel')).toBe('patch_panel');
  });

  it('categorizes UPS and battery', () => {
    expect(engine._guessCategory('1500VA UPS')).toBe('ups');
    expect(engine._guessCategory('Battery Backup System')).toBe('ups');
  });

  it('categorizes CCTV items', () => {
    expect(engine._guessCategory('IP Dome Camera')).toBe('cctv');
    expect(engine._guessCategory('32-Channel NVR')).toBe('cctv');
  });

  it('categorizes access control items', () => {
    expect(engine._guessCategory('Proximity Card Reader')).toBe('access_control');
  });

  it('categorizes AV items', () => {
    expect(engine._guessCategory('Ceiling Speaker')).toBe('av');
    expect(engine._guessCategory('70" Display Monitor')).toBe('av');
  });

  it('categorizes fire alarm items', () => {
    expect(engine._guessCategory('Smoke Detector')).toBe('fire_alarm');
    expect(engine._guessCategory('Pull Station')).toBe('fire_alarm');
  });

  it('returns "other" for unrecognized items', () => {
    expect(engine._guessCategory('Miscellaneous Connector')).toBe('other');
    expect(engine._guessCategory('Label Maker')).toBe('other');
  });
});


// ─── _parseCableRuns ─────────────────────────────────────────

describe('_parseCableRuns', () => {

  it('extracts Cat6A cable runs', () => {
    const block = 'Install 48 Cat6A drops to workstation locations.';
    const runs = engine._parseCableRuns(block, 'IDF-1');
    expect(runs).toHaveLength(1);
    expect(runs[0].cable_type).toBe('cat6a');
    expect(runs[0].budgeted_qty).toBe(48);
  });

  it('extracts Cat6 cable runs (not Cat6A)', () => {
    const block = 'Provide 24 Cat6 runs for the conference rooms.';
    const runs = engine._parseCableRuns(block, 'IDF-2');
    expect(runs).toHaveLength(1);
    expect(runs[0].cable_type).toBe('cat6');
    expect(runs[0].budgeted_qty).toBe(24);
  });

  it('extracts fiber runs', () => {
    const block = 'Install 12-strand fiber backbone single-mode from MDF to IDF.';
    const runs = engine._parseCableRuns(block, 'MDF');
    expect(runs.length).toBeGreaterThanOrEqual(1);
    expect(runs.some(r => r.cable_type === 'fiber_sm')).toBe(true);
  });

  it('extracts coax/RG-6 runs', () => {
    const block = 'Run 16 RG-6 coax cables for CATV distribution.';
    const runs = engine._parseCableRuns(block, 'IDF-3');
    expect(runs).toHaveLength(1);
    expect(runs[0].cable_type).toBe('coax_rg6');
    expect(runs[0].budgeted_qty).toBe(16);
  });

  it('returns empty array when no cable runs mentioned', () => {
    const block = 'Install 4 access control readers at entry points.';
    const runs = engine._parseCableRuns(block, 'Lobby');
    expect(runs).toEqual([]);
  });

  it('extracts multiple cable types from the same block', () => {
    const block = `
Install 96 Cat6A drops for data outlets.
Install 12 Cat6 runs for voice.
Run 24-strand fiber backbone OM4 multi-mode.
    `;
    const runs = engine._parseCableRuns(block, 'IDF-1');
    expect(runs.length).toBeGreaterThanOrEqual(3);
    const types = runs.map(r => r.cable_type);
    expect(types).toContain('cat6a');
    expect(types).toContain('cat6');
    expect(types).toContain('fiber_mm');
  });
});


// ─── _extractAIGrandTotal ────────────────────────────────────

describe('_extractAIGrandTotal', () => {

  it('returns 0 for null input', () => {
    expect(engine._extractAIGrandTotal(null)).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(engine._extractAIGrandTotal('')).toBe(0);
  });

  it('extracts GRAND TOTAL pattern', () => {
    const text = 'Project GRAND TOTAL: $145,000.00';
    expect(engine._extractAIGrandTotal(text)).toBe(145000);
  });

  it('extracts Grand Total with mixed case', () => {
    const text = 'Grand Total (including markup): $87,500';
    expect(engine._extractAIGrandTotal(text)).toBe(87500);
  });

  it('extracts TOTAL PROJECT INVESTMENT pattern', () => {
    const text = 'TOTAL PROJECT INVESTMENT: $250,000.00';
    expect(engine._extractAIGrandTotal(text)).toBe(250000);
  });

  it('extracts total with markup pattern', () => {
    const text = 'Total with markup applied: $198,750.00';
    expect(engine._extractAIGrandTotal(text)).toBe(198750);
  });

  it('extracts grand total from markdown table row', () => {
    const text = '| **Grand Total** | | $325,000 |';
    expect(engine._extractAIGrandTotal(text)).toBe(325000);
  });

  it('returns 0 when total is below $1000 threshold', () => {
    const text = 'Grand Total: $500';
    expect(engine._extractAIGrandTotal(text)).toBe(0);
  });

  it('returns 0 when no matching pattern found', () => {
    const text = 'The project costs are reasonable.';
    expect(engine._extractAIGrandTotal(text)).toBe(0);
  });
});


// ─── _parseTableItems ────────────────────────────────────────

describe('_parseTableItems', () => {

  it('parses standard 5-column markdown table', () => {
    const block = `
| Item | Qty | Unit | Unit Cost | Total |
|------|-----|------|-----------|-------|
| 48-Port Switch | 2 | ea | $1,200.00 | $2,400.00 |
| Patch Cable | 48 | ea | $5.00 | $240.00 |
`;
    const items = engine._parseTableItems(block);
    expect(items).toHaveLength(2);
    expect(items[0].item_name).toBe('48-Port Switch');
    expect(items[0].budgeted_qty).toBe(2);
    expect(items[0].unit_cost).toBe(1200);
    expect(items[0].budgeted_cost).toBe(2400);
  });

  it('parses bullet-list format when no table exists', () => {
    const block = `
### MDF Equipment
- 2x 48-Port Patch Panel @ $189
- 4x Cable Manager @ $45
`;
    const items = engine._parseTableItems(block);
    expect(items).toHaveLength(2);
    expect(items[0].budgeted_qty).toBe(2);
    expect(items[0].item_name).toContain('Patch Panel');
    expect(items[0].unit_cost).toBe(189);
  });

  it('parses numbered list format as last fallback', () => {
    const block = `
### IDF Equipment
1. 48-Port Patch Panel (2)
2. Horizontal Cable Manager (4)
3. 1U Fiber Enclosure (1)
`;
    const items = engine._parseTableItems(block);
    expect(items).toHaveLength(3);
    expect(items[0].budgeted_qty).toBe(2);
    expect(items[1].budgeted_qty).toBe(4);
    expect(items[2].budgeted_qty).toBe(1);
  });

  it('skips total/subtotal rows in tables', () => {
    const block = `
| Item | Qty | Unit | Unit Cost | Total |
|------|-----|------|-----------|-------|
| Switch | 1 | ea | $500.00 | $500.00 |
| Total | | | | $500.00 |
`;
    const items = engine._parseTableItems(block);
    expect(items).toHaveLength(1);
    expect(items[0].item_name).toBe('Switch');
  });

  it('returns empty array for block with no parseable items', () => {
    const block = 'Just some text about the project without any items.';
    const items = engine._parseTableItems(block);
    expect(items).toEqual([]);
  });
});
