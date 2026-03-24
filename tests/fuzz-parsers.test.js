import { describe, it, expect, beforeEach } from 'vitest';
import { loadExportEngine } from './helpers/load-module.js';

// ═══════════════════════════════════════════════════════════════
// SmartPlans Parser Fuzz Tests
// Ensures _extractBOMFromAnalysis and _parseAnalysisSections
// never throw unhandled exceptions regardless of input.
// ═══════════════════════════════════════════════════════════════

let engine;

beforeEach(() => {
  engine = loadExportEngine();
});

// ── Helper: wraps a call so we can assert "does not throw" ──
function safeExtractBOM(input) {
  return engine._extractBOMFromAnalysis(input);
}

function safeParseSections(input) {
  return engine._parseAnalysisSections(input);
}

// Helper to build a standard BOM table inside a category heading
function buildTable(categoryName, rows) {
  let md = `## ${categoryName}\n\n`;
  md += '| Item | Qty | Unit Cost | Ext Cost |\n';
  md += '|------|-----|-----------|----------|\n';
  for (const [item, qty, unitCost, extCost] of rows) {
    md += `| ${item} | ${qty} | ${unitCost} | ${extCost} |\n`;
  }
  return md;
}

// ═══════════════════════════════════════════════════════════════
// _extractBOMFromAnalysis — Fuzz Tests
// ═══════════════════════════════════════════════════════════════

describe('_extractBOMFromAnalysis fuzz tests', () => {

  // ── Extremely long input ──
  it('handles extremely long input (100,000+ chars) without throwing', () => {
    const longText = '## Material Costs\n\n| Item | Qty | Unit Cost | Ext Cost |\n|------|-----|-----------|----------|\n' +
      '| Widget | 1 | $10.00 | $10.00 |\n'.repeat(500) +
      'x'.repeat(100000);
    expect(() => safeExtractBOM(longText)).not.toThrow();
    const result = safeExtractBOM(longText);
    expect(result).toHaveProperty('categories');
    expect(result).toHaveProperty('grandTotal');
  });

  // ── Only pipe characters ──
  it('handles input with only pipe characters', () => {
    const input = '||||||||||||||||||||||||||||||||';
    expect(() => safeExtractBOM(input)).not.toThrow();
    const result = safeExtractBOM(input);
    expect(result).toHaveProperty('categories');
  });

  it('handles many rows of only pipes', () => {
    const input = ('||||||||||\n').repeat(200);
    expect(() => safeExtractBOM(input)).not.toThrow();
  });

  // ── Unicode and emoji in table cells ──
  it('handles unicode and emoji in table cells', () => {
    const md = buildTable('Equipment Costs', [
      ['\u{1F4F7} Camera HD \u2014 \u00E9l\u00E8ve', '5', '$\u00A51,200.00', '$6,000.00'],
      ['\u{1F50C} \u00DC\u00F1\u00EE\u00E7\u00F6\u00F0\u00E8 Cable \u2603', '100', '$25.00', '$2,500.00'],
      ['\u4E2D\u6587\u8BBE\u5907 \u0410\u0411\u0412', '3', '$500.00', '$1,500.00'],
    ]);
    expect(() => safeExtractBOM(md)).not.toThrow();
    const result = safeExtractBOM(md);
    expect(result).toHaveProperty('categories');
    expect(result).toHaveProperty('grandTotal');
  });

  it('handles emoji-only item names', () => {
    const md = buildTable('Material Costs', [
      ['\u{1F4F7}\u{1F4F7}\u{1F4F7}', '1', '$100.00', '$100.00'],
      ['\u{1F525}\u{1F4A5}\u{2728}', '2', '$50.00', '$100.00'],
    ]);
    expect(() => safeExtractBOM(md)).not.toThrow();
  });

  // ── Nested markdown: tables inside code blocks ──
  it('handles tables inside code blocks (nested markdown)', () => {
    const md = '## Material Costs\n\n```\n| Item | Qty | Cost |\n|------|-----|------|\n| Cable | 10 | $100 |\n```\n\n' +
      '| Item | Qty | Unit Cost | Ext Cost |\n|------|-----|-----------|----------|\n| Real Cable | 10 | $100.00 | $1,000.00 |\n';
    expect(() => safeExtractBOM(md)).not.toThrow();
  });

  it('handles triple backtick blocks with table-like content', () => {
    const md = '```markdown\n## Equipment Costs\n| Item | Qty | Cost |\n|---|---|---|\n| Test | 1 | $5 |\n```';
    expect(() => safeExtractBOM(md)).not.toThrow();
  });

  // ── HTML injection attempts ──
  it('handles HTML injection in item names', () => {
    const md = buildTable('CCTV Camera Costs', [
      ['<script>alert(1)</script>', '5', '$1,200.00', '$6,000.00'],
      ['<img src=x onerror=alert(1)>', '10', '$50.00', '$500.00'],
      ['<iframe src="evil.com"></iframe>', '1', '$999.00', '$999.00'],
      ['<div onmouseover="steal()">Camera</div>', '3', '$200.00', '$600.00'],
    ]);
    expect(() => safeExtractBOM(md)).not.toThrow();
    const result = safeExtractBOM(md);
    expect(result).toHaveProperty('categories');
    // Ensure the HTML is preserved as-is in item names (not executed)
    if (result.categories.length > 0 && result.categories[0].items.length > 0) {
      expect(typeof result.categories[0].items[0].item).toBe('string');
    }
  });

  // ── SQL injection attempts ──
  it('handles SQL injection attempts in values', () => {
    const md = buildTable('Access Control Costs', [
      ["'; DROP TABLE items; --", '5', '$100.00', '$500.00'],
      ['1 OR 1=1', '10', '$50.00', '$500.00'],
      ["Robert'); DROP TABLE Students;--", '1', '$200.00', '$200.00'],
      ['UNION SELECT * FROM passwords', '2', "'; DELETE FROM costs;--", '$400.00'],
    ]);
    expect(() => safeExtractBOM(md)).not.toThrow();
    const result = safeExtractBOM(md);
    expect(result).toHaveProperty('categories');
  });

  // ── Null bytes and control characters ──
  it('handles null bytes in input', () => {
    const md = '## Material Costs\n\0\0\0\n| Item | Qty | Unit Cost | Ext Cost |\n|------|-----|-----------|----------|\n| Cable\0Wire | 10 | $100.00 | $1,000.00 |\n';
    expect(() => safeExtractBOM(md)).not.toThrow();
  });

  it('handles control characters throughout', () => {
    const controlChars = '\x01\x02\x03\x04\x05\x06\x07\x08\x0B\x0C\x0E\x0F\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1F';
    const md = `## Equipment ${controlChars} Costs\n\n| Item | Qty | Unit Cost | Ext Cost |\n|------|-----|-----------|----------|\n| Widget${controlChars} | 5 | $100.00 | $500.00 |\n`;
    expect(() => safeExtractBOM(md)).not.toThrow();
  });

  it('handles DEL character and backspace', () => {
    const md = '## Material\x7F Costs\n\n| Item\x08 | Qty | Cost |\n|---|---|---|\n| Cab\x7Fle | 1 | $10 |\n';
    expect(() => safeExtractBOM(md)).not.toThrow();
  });

  // ── Only headers, no data rows ──
  it('handles tables with only headers and no data rows', () => {
    const md = '## Structured Cabling Costs\n\n| Item | Qty | Unit Cost | Ext Cost |\n|------|-----|-----------|----------|\n';
    expect(() => safeExtractBOM(md)).not.toThrow();
    const result = safeExtractBOM(md);
    expect(result.grandTotal).toBe(0);
  });

  it('handles multiple tables all with only headers', () => {
    const md = '## Material Costs\n\n| Item | Qty | Cost |\n|---|---|---|\n\n## Equipment Costs\n\n| Description | Qty | Price |\n|---|---|---|\n';
    expect(() => safeExtractBOM(md)).not.toThrow();
  });

  // ── 1000+ table rows stress test ──
  it('handles 1000+ table rows (stress test)', () => {
    let md = '## Bill of Materials\n\n| Item | Qty | Unit Cost | Ext Cost |\n|------|-----|-----------|----------|\n';
    for (let i = 0; i < 1500; i++) {
      md += `| Item ${i} Model XYZ-${i} | ${i + 1} | $${(i * 1.5 + 0.99).toFixed(2)} | $${((i + 1) * (i * 1.5 + 0.99)).toFixed(2)} |\n`;
    }
    expect(() => safeExtractBOM(md)).not.toThrow();
    const result = safeExtractBOM(md);
    expect(result.categories.length).toBeGreaterThan(0);
    expect(result.categories[0].items.length).toBeGreaterThan(100);
  });

  // ── Every cell is a number ──
  it('handles table where every cell is a number (no item names)', () => {
    const md = buildTable('Device Costs', [
      ['12345', '10', '$100.00', '$1,000.00'],
      ['67890', '5', '$200.00', '$1,000.00'],
      ['99999', '1', '$500.00', '$500.00'],
      ['0', '0', '$0.00', '$0.00'],
    ]);
    expect(() => safeExtractBOM(md)).not.toThrow();
  });

  // ── Negative costs and quantities ──
  it('handles negative costs and quantities', () => {
    const md = buildTable('Material Costs', [
      ['Credit for returned cable', '-50', '$25.00', '-$1,250.00'],
      ['Refund item', '10', '-$100.00', '-$1,000.00'],
      ['Normal item', '5', '$200.00', '$1,000.00'],
    ]);
    expect(() => safeExtractBOM(md)).not.toThrow();
    const result = safeExtractBOM(md);
    expect(result).toHaveProperty('grandTotal');
    expect(typeof result.grandTotal).toBe('number');
  });

  // ── Scientific notation costs ──
  it('handles scientific notation costs (1.5e6)', () => {
    const md = buildTable('Infrastructure Costs', [
      ['Mega Cable Run', '1', '1.5e6', '1.5e6'],
      ['Fiber Backbone', '10', '2.5E4', '2.5E5'],
      ['Normal Item', '5', '$100.00', '$500.00'],
    ]);
    expect(() => safeExtractBOM(md)).not.toThrow();
  });

  // ── Extremely large numbers ──
  it('handles extremely large dollar amounts ($999,999,999,999.99)', () => {
    const md = buildTable('Equipment Costs', [
      ['Mega Server Farm', '1', '$999,999,999,999.99', '$999,999,999,999.99'],
      ['Quantum Computer', '1', '$1,000,000,000,000.00', '$1,000,000,000,000.00'],
    ]);
    expect(() => safeExtractBOM(md)).not.toThrow();
    const result = safeExtractBOM(md);
    expect(typeof result.grandTotal).toBe('number');
    expect(Number.isFinite(result.grandTotal)).toBe(true);
  });

  // ── Mixed encoding: UTF-8 BOM and Windows line endings ──
  it('handles UTF-8 BOM prefix', () => {
    const bom = '\uFEFF';
    const md = bom + buildTable('Material Costs', [
      ['Cat6a Cable', '50', '$250.00', '$12,500.00'],
    ]);
    expect(() => safeExtractBOM(md)).not.toThrow();
  });

  it('handles Windows-style \\r\\n line endings', () => {
    const md = '## Equipment Costs\r\n\r\n| Item | Qty | Unit Cost | Ext Cost |\r\n|------|-----|-----------|----------|\r\n| Camera | 10 | $500.00 | $5,000.00 |\r\n| Cable | 100 | $25.00 | $2,500.00 |\r\n';
    expect(() => safeExtractBOM(md)).not.toThrow();
  });

  it('handles mixed line endings (\\n, \\r\\n, \\r)', () => {
    const md = '## Material Costs\r\n\n| Item | Qty | Cost |\r|---|---|---|\n| Widget | 1 | $10.00 |\r\n';
    expect(() => safeExtractBOM(md)).not.toThrow();
  });

  // ── Valid JSON instead of markdown ──
  it('handles valid JSON instead of markdown', () => {
    const json = JSON.stringify({
      categories: [{ name: 'Test', items: [{ item: 'Cable', qty: 10, cost: 100 }] }],
      grandTotal: 100,
    });
    expect(() => safeExtractBOM(json)).not.toThrow();
    const result = safeExtractBOM(json);
    expect(result).toHaveProperty('categories');
  });

  it('handles JSON array input', () => {
    const json = JSON.stringify([1, 2, 3, { nested: true }]);
    expect(() => safeExtractBOM(json)).not.toThrow();
  });

  // ── Additional edge cases ──
  it('handles undefined input', () => {
    expect(() => safeExtractBOM(undefined)).not.toThrow();
  });

  it('handles boolean input', () => {
    expect(() => safeExtractBOM(true)).not.toThrow();
    expect(() => safeExtractBOM(false)).not.toThrow();
  });

  it('handles numeric input', () => {
    expect(() => safeExtractBOM(42)).not.toThrow();
    expect(() => safeExtractBOM(0)).not.toThrow();
    expect(() => safeExtractBOM(-1)).not.toThrow();
    expect(() => safeExtractBOM(NaN)).not.toThrow();
    expect(() => safeExtractBOM(Infinity)).not.toThrow();
  });

  it('handles repeated separator lines', () => {
    const md = '## Material Costs\n\n' + '|---|---|---|---|\n'.repeat(500);
    expect(() => safeExtractBOM(md)).not.toThrow();
  });

  it('handles massive single line (no newlines)', () => {
    const line = '| ' + 'x'.repeat(50000) + ' | 1 | $100.00 | $100.00 |';
    const md = '## Equipment Costs\n\n| Item | Qty | Unit Cost | Ext Cost |\n|---|---|---|---|\n' + line;
    expect(() => safeExtractBOM(md)).not.toThrow();
  });

  it('handles deeply nested markdown headings', () => {
    let md = '';
    for (let i = 1; i <= 200; i++) {
      md += '#'.repeat(Math.min(i, 6)) + ` Material Section ${i}\n\n`;
      md += '| Item | Qty | Cost |\n|---|---|---|\n| Widget | 1 | $10 |\n\n';
    }
    expect(() => safeExtractBOM(md)).not.toThrow();
  });

  it('handles table with thousands of columns', () => {
    const header = '| ' + Array.from({ length: 500 }, (_, i) => `Col${i}`).join(' | ') + ' |';
    const sep = '| ' + Array.from({ length: 500 }, () => '---').join(' | ') + ' |';
    const row = '| ' + Array.from({ length: 500 }, (_, i) => `val${i}`).join(' | ') + ' |';
    const md = '## Equipment Costs\n\n' + header + '\n' + sep + '\n' + row + '\n';
    expect(() => safeExtractBOM(md)).not.toThrow();
  });

  it('handles regex-adversarial input (catastrophic backtracking patterns)', () => {
    // Patterns that could cause ReDoS if regexes aren't careful
    const input1 = '## ' + 'a'.repeat(50000) + ' Costs';
    const input2 = '**' + 'A'.repeat(50000) + '**';
    const input3 = '$' + ','.repeat(10000) + '999.99';
    expect(() => safeExtractBOM(input1)).not.toThrow();
    expect(() => safeExtractBOM(input2)).not.toThrow();
    expect(() => safeExtractBOM(input3)).not.toThrow();
  });

  it('handles input that looks like a markdown table but has mismatched pipes', () => {
    const md = '## Material Costs\n\n| Item | Qty |\n|---|---|\n| Cable | 5 | extra | more | even more |\n| Only one cell\n|||\n';
    expect(() => safeExtractBOM(md)).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════
// _parseAnalysisSections — Fuzz Tests
// ═══════════════════════════════════════════════════════════════

describe('_parseAnalysisSections fuzz tests', () => {

  // ── Extremely long input ──
  it('handles extremely long input (100,000+ chars)', () => {
    const longText = '## Section One\n' + 'Lorem ipsum '.repeat(10000) + '\n## Section Two\n' + 'Dolor sit amet '.repeat(10000);
    expect(() => safeParseSections(longText)).not.toThrow();
    const result = safeParseSections(longText);
    expect(typeof result).toBe('object');
  });

  // ── Only pipe characters ──
  it('handles input with only pipe characters', () => {
    expect(() => safeParseSections('||||||||||||||||')).not.toThrow();
    const result = safeParseSections('||||||||||||||||');
    expect(typeof result).toBe('object');
  });

  // ── Unicode and emoji ──
  it('handles unicode and emoji in section headers', () => {
    const md = '## \u{1F4F7} Camera \u00DC\u00F1\u00EE\u00E7\u00F6\u00F0\u00E8 Section\n\nSome content\n\n## \u4E2D\u6587\u6807\u9898\n\nMore content';
    expect(() => safeParseSections(md)).not.toThrow();
    const result = safeParseSections(md);
    expect(typeof result).toBe('object');
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });

  // ── Nested markdown ──
  it('handles code blocks that contain markdown headers', () => {
    const md = '## Real Section\n\nContent here\n\n```\n## Fake Section Inside Code\n\nNot real\n```\n\n## Another Real Section\n\nMore content';
    expect(() => safeParseSections(md)).not.toThrow();
  });

  // ── HTML injection ──
  it('handles HTML injection in headers', () => {
    const md = '## <script>alert("xss")</script>\n\nContent\n\n## <img src=x onerror=alert(1)>\n\nMore content';
    expect(() => safeParseSections(md)).not.toThrow();
    const result = safeParseSections(md);
    expect(typeof result).toBe('object');
  });

  // ── SQL injection ──
  it('handles SQL injection in headers', () => {
    const md = "## '; DROP TABLE sections; --\n\nContent\n\n## 1 OR 1=1\n\nMore content";
    expect(() => safeParseSections(md)).not.toThrow();
  });

  // ── Null bytes and control characters ──
  it('handles null bytes and control characters', () => {
    const md = '## Section\0One\n\nContent with \x01\x02\x03 control chars\n\n## Section\x1FTwo\n\nMore\x00stuff';
    expect(() => safeParseSections(md)).not.toThrow();
  });

  // ── Only headers, no content ──
  it('handles many consecutive headers with no content between them', () => {
    let md = '';
    for (let i = 0; i < 500; i++) {
      md += `## Header ${i}\n`;
    }
    expect(() => safeParseSections(md)).not.toThrow();
    const result = safeParseSections(md);
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });

  // ── 1000+ sections stress test ──
  it('handles 1000+ sections', () => {
    let md = '';
    for (let i = 0; i < 1200; i++) {
      md += `## Section ${i}\n\nContent for section ${i}.\n\n`;
    }
    expect(() => safeParseSections(md)).not.toThrow();
  });

  // ── Negative / scientific / large numbers in headings ──
  it('handles numbers and special values in headings', () => {
    const md = '## -999,999.99\n\nContent\n\n## 1.5e6\n\nMore\n\n## $999,999,999,999.99\n\nEnd';
    expect(() => safeParseSections(md)).not.toThrow();
  });

  // ── UTF-8 BOM and Windows line endings ──
  it('handles UTF-8 BOM prefix', () => {
    const md = '\uFEFF## Section One\n\nContent\n\n## Section Two\n\nMore content';
    expect(() => safeParseSections(md)).not.toThrow();
  });

  it('handles Windows \\r\\n line endings', () => {
    const md = '## Section One\r\n\r\nContent\r\n\r\n## Section Two\r\n\r\nMore content';
    expect(() => safeParseSections(md)).not.toThrow();
  });

  // ── JSON instead of markdown ──
  it('handles valid JSON string input', () => {
    const json = JSON.stringify({ sections: [{ title: 'Test', content: 'Hello' }] });
    expect(() => safeParseSections(json)).not.toThrow();
    const result = safeParseSections(json);
    expect(typeof result).toBe('object');
  });

  // ── Falsy and non-string values ──
  it('handles null input', () => {
    expect(() => safeParseSections(null)).not.toThrow();
    expect(safeParseSections(null)).toEqual({});
  });

  it('handles undefined input', () => {
    expect(() => safeParseSections(undefined)).not.toThrow();
    expect(safeParseSections(undefined)).toEqual({});
  });

  it('handles empty string', () => {
    expect(() => safeParseSections('')).not.toThrow();
    expect(safeParseSections('')).toEqual({});
  });

  it('handles numeric input', () => {
    expect(() => safeParseSections(42)).not.toThrow();
  });

  // ── Catastrophic regex patterns ──
  it('handles regex-adversarial header patterns', () => {
    const md = '## ' + '#'.repeat(50000) + '\n\nContent';
    expect(() => safeParseSections(md)).not.toThrow();
  });

  it('handles extremely long header text', () => {
    const md = '## ' + 'A'.repeat(100000) + '\n\nContent\n\n## Short\n\nMore';
    expect(() => safeParseSections(md)).not.toThrow();
  });

  // ── Bold-text fallback headers ──
  it('handles bold-text headers with special characters', () => {
    const md = '**Section <script>alert(1)</script>**\n\nContent\n\n**SQL\'; DROP TABLE--**\n\nMore';
    expect(() => safeParseSections(md)).not.toThrow();
  });

  it('handles malformed bold markers', () => {
    const md = '****\n\n**\n\n***Triple Bold***\n\n** **\n\n**   **';
    expect(() => safeParseSections(md)).not.toThrow();
  });

  // ── Only whitespace ──
  it('handles whitespace-only input', () => {
    expect(() => safeParseSections('   \n\n\t\t\n   ')).not.toThrow();
  });

  it('handles newline-only input', () => {
    expect(() => safeParseSections('\n'.repeat(10000))).not.toThrow();
  });
});
