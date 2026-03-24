#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// SHARED LOAD TEST UTILITIES
// Used by both SmartPM and SmartPlans load test scripts
// ═══════════════════════════════════════════════════════════════

/**
 * Run N concurrent requests and report stats.
 * @param {string} name  — test label
 * @param {number} count — number of concurrent requests
 * @param {(i: number) => Promise<Response>} fn — request factory
 * @returns {{ successes, failures, rateLimited, serverErrors, p95, avg, min, max }}
 */
async function concurrent(name, count, fn) {
    const results = [];
    const promises = Array.from({ length: count }, (_, i) => {
        const t0 = Date.now();
        return fn(i)
            .then(r => {
                results.push({ ok: true, status: r.status, ms: Date.now() - t0 });
                return r;
            })
            .catch(e => {
                results.push({ ok: false, error: e.message, ms: Date.now() - t0 });
            });
    });
    await Promise.allSettled(promises);

    const successes = results.filter(r => r.ok && r.status < 400);
    const failures = results.filter(r => !r.ok);
    const rateLimited = results.filter(r => r.ok && r.status === 429);
    const serverErrors = results.filter(r => r.ok && r.status >= 500);
    const clientErrors = results.filter(r => r.ok && r.status >= 400 && r.status < 429);

    const times = results.filter(r => r.ok).map(r => r.ms).sort((a, b) => a - b);
    const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    const min = times[0] || 0;
    const max = times[times.length - 1] || 0;
    const p95 = times[Math.floor(times.length * 0.95)] || 0;

    const parts = [
        `${successes.length}/${count} ok`,
        failures.length ? `${failures.length} network-fail` : null,
        rateLimited.length ? `${rateLimited.length} rate-limited (429)` : null,
        serverErrors.length ? `${serverErrors.length} server-error (5xx)` : null,
        clientErrors.length ? `${clientErrors.length} client-error (4xx)` : null,
        `avg ${avg}ms`,
        `p95 ${p95}ms`,
        `min ${min}ms`,
        `max ${max}ms`,
    ].filter(Boolean).join(', ');

    console.log(`  ${name}: ${parts}`);

    if (serverErrors.length > 0) {
        console.log(`  ⚠ WARNING: ${serverErrors.length} requests returned 5xx errors`);
    }

    return { successes: successes.length, failures: failures.length, rateLimited: rateLimited.length, serverErrors: serverErrors.length, p95, avg, min, max };
}

/**
 * Run a named test section with timing.
 */
async function runTest(name, fn) {
    const start = Date.now();
    try {
        const result = await fn();
        const ms = Date.now() - start;
        console.log(`\n✓ ${name} — ${ms}ms${result ? ' — ' + result : ''}`);
        return { passed: true, ms };
    } catch (err) {
        const ms = Date.now() - start;
        console.log(`\n✕ ${name} — ${ms}ms — ${err.message}`);
        return { passed: false, ms, error: err.message };
    }
}

/**
 * Build standard fetch headers with auth token.
 */
function headers(token, extra = {}) {
    const h = { 'Content-Type': 'application/json', ...extra };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
}

/**
 * Generate a large JSON payload of approximately the given byte size.
 */
function generatePayload(targetBytes) {
    const item = {
        id: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
        name: 'Load Test Item with a reasonably long description for padding',
        quantity: 100,
        unit: 'ea',
        unit_cost: 1234.56,
        extended_cost: 123456.00,
        notes: 'This is filler text to bulk up the payload size for stress testing.',
    };
    const itemStr = JSON.stringify(item);
    const count = Math.ceil(targetBytes / itemStr.length);
    const items = Array.from({ length: count }, (_, i) => ({ ...item, id: `item-${i}` }));
    return { project_name: 'Load Test Payload', items };
}

/**
 * Stagger requests over a time window (ms) to simulate realistic mixed load.
 */
async function staggered(name, requests, windowMs) {
    const results = [];
    const start = Date.now();
    const promises = requests.map((req, i) => {
        const delay = Math.floor(Math.random() * windowMs);
        return new Promise(resolve => setTimeout(resolve, delay))
            .then(() => {
                const t0 = Date.now();
                return req()
                    .then(r => { results.push({ ok: true, status: r.status, ms: Date.now() - t0 }); })
                    .catch(e => { results.push({ ok: false, error: e.message, ms: Date.now() - t0 }); });
            });
    });
    await Promise.allSettled(promises);

    const wallTime = Date.now() - start;
    const successes = results.filter(r => r.ok && r.status < 400);
    const failures = results.filter(r => !r.ok);
    const rateLimited = results.filter(r => r.ok && r.status === 429);
    const serverErrors = results.filter(r => r.ok && r.status >= 500);
    const times = results.filter(r => r.ok).map(r => r.ms).sort((a, b) => a - b);
    const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    const p95 = times[Math.floor(times.length * 0.95)] || 0;

    console.log(`  ${name} (${requests.length} reqs over ${wallTime}ms): ${successes.length} ok, ${failures.length} fail, ${rateLimited.length} rate-limited, ${serverErrors.length} 5xx, avg ${avg}ms, p95 ${p95}ms`);

    return { successes: successes.length, failures: failures.length, rateLimited: rateLimited.length, serverErrors: serverErrors.length, wallTime };
}

module.exports = { concurrent, runTest, headers, generatePayload, staggered };
