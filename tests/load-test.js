#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// SmartPlans Load Test Script
// Usage: node tests/load-test.js [base-url] [app-token]
// Example: node tests/load-test.js https://smartplans.pages.dev mytoken123
//
// Requires Node 18+ (built-in fetch).
// Tests concurrent load across health, usage stats, estimates,
// large payloads, and AI quota checks.
// ═══════════════════════════════════════════════════════════════

// Shared utilities (also maintained in SmartPM/tests/helpers/load-test-utils.js)
const path = require('path');
const utils = require(path.resolve(__dirname, 'helpers', 'load-test-utils'));

const { concurrent, runTest, headers: makeHeaders, generatePayload } = utils;

const BASE_URL = process.argv[2] || 'http://localhost:8788';
const APP_TOKEN = process.argv[3] || '';

// ── Helpers ───────────────────────────────────────────────────

function hdrs() {
    const h = { 'Content-Type': 'application/json' };
    if (APP_TOKEN) h['X-App-Token'] = APP_TOKEN;
    return h;
}

function get(path) {
    return fetch(`${BASE_URL}${path}`, { headers: hdrs() });
}

function post(path, body) {
    return fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify(body),
    });
}

// ── Test Data ─────────────────────────────────────────────────

function makeEstimate(index) {
    return {
        project_name: `Load Test Estimate ${index} - Office Renovation`,
        project_type: ['commercial', 'residential', 'industrial', 'healthcare'][index % 4],
        project_location: ['Los Angeles, CA', 'New York, NY', 'Chicago, IL', 'Houston, TX'][index % 4],
        disciplines: JSON.stringify(['fire_alarm', 'cctv', 'structured_cabling'].slice(0, (index % 3) + 1)),
        pricing_tier: ['economy', 'mid', 'premium'][index % 3],
        status: 'draft',
        export_data: {
            version: '1.0',
            timestamp: new Date().toISOString(),
            items: Array.from({ length: 20 }, (_, i) => ({
                id: `item-${index}-${i}`,
                name: `Load Test Line Item ${i}`,
                category: 'fire_alarm',
                quantity: 10 + i,
                unit: 'ea',
                unit_cost: 100 + i * 25,
                extended_cost: (10 + i) * (100 + i * 25),
            })),
            laborSummary: {
                totalHours: 480,
                journeymanHours: 320,
                apprenticeHours: 160,
                journeymanRate: 95,
                apprenticeRate: 55,
            },
            projectSummary: {
                materialsCost: 125000,
                laborCost: 39200,
                markup: 0.25,
                totalCost: 205250,
            },
        },
    };
}

// ── Tests ─────────────────────────────────────────────────────

async function testConcurrentHealth() {
    await concurrent('Health checks', 100, () =>
        get('/api/health')
    );
    return '100 simultaneous GET /api/health';
}

async function testConcurrentUsageStats() {
    await concurrent('Usage stats', 50, () =>
        get('/api/usage-stats')
    );
    return '50 simultaneous GET /api/usage-stats';
}

async function testConcurrentEstimateSaves() {
    const results = await concurrent('Estimate saves', 10, (i) =>
        post('/api/estimates', makeEstimate(i))
    );
    return `10 simultaneous POST /api/estimates — ${results.successes} created`;
}

async function testLargePayloads() {
    // 500KB payload
    const payload500k = generatePayload(500 * 1024);
    payload500k.project_name = 'Load Test - 500KB Payload';
    payload500k.project_type = 'commercial';
    payload500k.pricing_tier = 'mid';
    payload500k.status = 'draft';
    payload500k.export_data = { items: payload500k.items };
    delete payload500k.items;

    const res500k = await post('/api/estimates', payload500k);
    const size500k = JSON.stringify(payload500k).length;
    console.log(`  500KB payload (${Math.round(size500k / 1024)}KB actual): ${res500k.status}`);

    // 1MB payload — should be rejected (900KB limit on export_data)
    const payload1m = generatePayload(1024 * 1024);
    payload1m.project_name = 'Load Test - 1MB Payload';
    payload1m.project_type = 'commercial';
    payload1m.pricing_tier = 'mid';
    payload1m.status = 'draft';
    payload1m.export_data = { items: payload1m.items };
    delete payload1m.items;

    const res1m = await post('/api/estimates', payload1m);
    const size1m = JSON.stringify(payload1m).length;
    console.log(`  1MB payload (${Math.round(size1m / 1024)}KB actual): ${res1m.status}${res1m.status === 413 ? ' (correctly rejected)' : ''}`);

    if (res1m.status === 413) {
        return 'Large payloads handled correctly (1MB rejected at 900KB limit)';
    } else if (res1m.status >= 400) {
        return `Large payloads: 500KB=${res500k.status}, 1MB=${res1m.status}`;
    }
    return `Large payloads: 500KB=${res500k.status}, 1MB=${res1m.status} (expected 413 for 1MB)`;
}

async function testQuotaCheckBurst() {
    const results = await concurrent('AI quota checks', 30, () =>
        get('/api/ai/quota-check')
    );
    return `30 simultaneous GET /api/ai/quota-check — ${results.successes} ok, ${results.rateLimited} rate-limited`;
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(' SmartPlans Load Test');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Target:  ${BASE_URL}`);
    console.log(`Token:   ${APP_TOKEN ? APP_TOKEN.substring(0, 20) + '...' : '(none)'}`);
    console.log(`Time:    ${new Date().toISOString()}`);
    console.log('');

    // Verify connectivity
    try {
        const res = await get('/api/health');
        if (!res.ok) {
            console.log(`⚠ Health check returned ${res.status} — tests may fail if server is down.`);
        } else {
            console.log(`✓ Server reachable (health: ${res.status})`);
        }
    } catch (err) {
        console.log(`✕ Cannot reach ${BASE_URL} — ${err.message}`);
        console.log('  Make sure the server is running and the URL is correct.');
        process.exit(1);
    }

    const results = [];

    results.push(await runTest('1. Concurrent Health Checks (100)', testConcurrentHealth));
    results.push(await runTest('2. Concurrent Usage Stats (50)', testConcurrentUsageStats));
    results.push(await runTest('3. Concurrent Estimate Saves (10)', testConcurrentEstimateSaves));
    results.push(await runTest('4. Large Payload Handling (500KB + 1MB)', testLargePayloads));
    results.push(await runTest('5. AI Quota Check Burst (30)', testQuotaCheckBurst));

    // Summary
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const totalMs = results.reduce((sum, r) => sum + r.ms, 0);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(` Results: ${passed} passed, ${failed} failed, total ${totalMs}ms`);
    console.log('═══════════════════════════════════════════════════════════');

    if (failed > 0) process.exit(1);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
