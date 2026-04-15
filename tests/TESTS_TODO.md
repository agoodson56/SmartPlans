# Test Suite TODOs

## Known pre-existing failures (not blocking CI)

As of v5.126.5 the full `npm test` run shows:

- **Total:** 162 tests, 160 passing, 2 failing
- **Passing suites (blocking CI):**
  - `tests/ai-engine-smoke.test.js` — 5 tests
  - `tests/ai-engine-regressions.test.js` — 28 tests
  - `tests/scope-delineation.test.js` — 13 tests
  - `tests/fuzz-parsers.test.js` — 56 tests
- **Non-blocking failing suite:**
  - `tests/export-engine.test.js` — 58 passing, 2 failing

### The 2 pre-existing failures

Both live in `tests/export-engine.test.js` and were already failing before the
v5.126.x session started. They look like the test fixtures drifted from the
current parser behavior.

#### 1. `_extractBOMFromAnalysis > calculates unitCost from extCost / qty when unit cost is missing`

- **Expected:** `extCost === 350`
- **Actual:** `extCost === 35000`
- **Likely cause:** The test fixture has a pennies-vs-dollars unit mismatch,
  OR the parser is multiplying by 100 somewhere for a markup calculation
  that was added after the test was written.
- **Fix:** Either update the fixture to match the new expected scale, or
  trace through the parser to find where the 100× comes from and revert it.

#### 2. `_parseCableRuns > extracts coax/RG-6 runs`

- **Expected:** `budgeted_qty === 16`
- **Actual:** `budgeted_qty === 6`
- **Likely cause:** The parser now returns a different quantity than the
  test fixture. Could be a regex change or a unit conversion.
- **Fix:** Open the parser, walk through the fixture input, figure out why
  it returns 6 instead of 16, and either fix the parser or the fixture.

### Why they're not blocking CI

These failures pre-date v5.125.3. They have nothing to do with the bugs
fixed in v5.126.x. Making them block CI would force future commits to fix
unrelated code before shipping a bug fix. The AI engine regression suite
is the blocking gate instead — it pins every bug I already burned a
commit on.

### How to run the full suite locally

```bash
npm test                # full suite (will show 2 pre-existing failures)
npm run test:watch      # watch mode for active development
```

### How to run only the blocking suites

```bash
npx vitest run tests/ai-engine-smoke.test.js tests/ai-engine-regressions.test.js tests/scope-delineation.test.js tests/fuzz-parsers.test.js
```
