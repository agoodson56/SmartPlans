// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — PRICING SERVICE (Wave 7, v5.128.4)
//
// Single entry point for item pricing. Resolves each material item by
// consulting the price sources in priority order:
//
//   1. User override               — explicit price set by the estimator
//                                    during BOM review (highest trust)
//   2. Distributor quote cache     — fresh quotes from Graybar/Anixter/
//                                    ADI via /api/distributor-prices
//   3. Rate library                — company-validated prices from
//                                    past bids via /api/rate-library
//   4. Static pricing-database.js  — hardcoded budget/mid/premium tiers
//                                    (always present, never fails)
//
// Every resolved price carries a `source` tag so Material Pricer output
// and the Master Report can show the estimator where the number came
// from and how fresh it is. A post-processor on the Material Pricer
// brain output walks each BOM line and calls resolveItemPrice() to
// upgrade AI-generated prices to real prices whenever possible.
//
// Pure module — no imports, no DOM. Just global PRICING_DB + fetch.
// Exposes `window.SmartPlansPricing`.
// ═══════════════════════════════════════════════════════════════

const SmartPlansPricing = {
    VERSION: '1.0.0',

    // In-memory caches populated once per analysis so we don't hit the
    // network 200× in a tight loop. Keys are normalized item names.
    _distributorCache: null,
    _rateLibraryCache: null,
    _cacheLoadedAt: 0,
    _cacheTTLMs: 5 * 60 * 1000, // 5 min — fresh enough for one bid

    /**
     * Normalize an item name for fuzzy matching across sources.
     *    "Axis P3265-LVE Camera" → "axis p3265-lve camera"
     * Strips extra whitespace, lowercases, removes punctuation noise.
     */
    _normalize(s) {
        if (!s) return '';
        return String(s)
            .toLowerCase()
            .replace(/[""''`]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    },

    /**
     * Simple token-overlap score: fraction of the query's tokens that
     * appear in the candidate. Used to fuzzy-match an AI-generated item
     * name against a distributor/rate-library entry.
     * Returns 0..1.
     */
    _tokenOverlap(query, candidate) {
        const q = this._normalize(query).split(/\s+/).filter(w => w.length > 2);
        const c = this._normalize(candidate);
        if (q.length === 0) return 0;
        let hits = 0;
        for (const tok of q) if (c.includes(tok)) hits++;
        return hits / q.length;
    },

    /**
     * Load distributor + rate-library caches. Safe to call repeatedly —
     * respects TTL. Call once at the start of every analysis.
     */
    async primeCaches(authHeaders = {}) {
        const now = Date.now();
        if (this._distributorCache && this._rateLibraryCache && (now - this._cacheLoadedAt) < this._cacheTTLMs) {
            return { cached: true };
        }
        const headers = { ...authHeaders };
        try {
            const [distResp, rateResp] = await Promise.all([
                fetch('/api/distributor-prices', { headers }).catch(() => null),
                fetch('/api/rate-library', { headers }).catch(() => null),
            ]);
            this._distributorCache = [];
            this._rateLibraryCache = [];
            if (distResp && distResp.ok) {
                const data = await distResp.json().catch(() => ({}));
                this._distributorCache = Array.isArray(data.prices) ? data.prices : [];
            }
            if (rateResp && rateResp.ok) {
                const data = await rateResp.json().catch(() => ({}));
                // rate-library response: { rates: [...] } OR { items: [...] }
                this._rateLibraryCache = Array.isArray(data.rates) ? data.rates
                    : Array.isArray(data.items) ? data.items
                    : [];
            }
            this._cacheLoadedAt = now;
            return {
                cached: false,
                distributorCount: this._distributorCache.length,
                rateLibraryCount: this._rateLibraryCache.length,
            };
        } catch (err) {
            // Non-fatal — pricing falls through to static DB
            this._distributorCache = this._distributorCache || [];
            this._rateLibraryCache = this._rateLibraryCache || [];
            return { cached: false, error: err.message };
        }
    },

    /**
     * Find the single best match in an array of price records for the
     * given item name. Returns null if no candidate scores >= minScore.
     *
     * Scoring: normalized token overlap on item_name, plus boost if the
     * part_number appears in the query.
     */
    _bestMatch(records, itemName, minScore = 0.60) {
        if (!Array.isArray(records) || records.length === 0 || !itemName) return null;
        const query = this._normalize(itemName);
        let best = null;
        let bestScore = 0;
        for (const r of records) {
            const candidate = r.item_name || r.name || r.description || '';
            if (!candidate) continue;
            let score = this._tokenOverlap(itemName, candidate);
            // Boost if the distributor part_number appears anywhere in the AI item name.
            // Part numbers are strong identifiers — if the AI wrote the exact part
            // number the estimator quoted, we should trust the match even when token
            // overlap is moderate.
            if (r.part_number && query.includes(this._normalize(r.part_number))) {
                score = Math.min(1, score + 0.35);
            }
            if (score > bestScore) {
                bestScore = score;
                best = r;
            }
        }
        return bestScore >= minScore ? { record: best, score: bestScore } : null;
    },

    /**
     * Resolve a single item to a unit price. Synchronous — caches must be
     * primed via primeCaches() first (otherwise falls through to static DB).
     *
     * Options:
     *   tier       — 'budget' | 'mid' | 'premium' (for static fallback)
     *   regionKey  — regionalMultipliers lookup key (default 'national_average')
     *   aiPrice    — the price the AI Material Pricer generated, used as
     *                the final fallback if no other source has the item
     *   userOverride — explicit price from bid-review edits (wins over everything)
     *
     * Returns:
     *   { unitCost, source, confidence, matched? }
     * where `source` is one of:
     *   'user_override' | 'distributor' | 'rate_library' | 'static_db' | 'ai_fallback'
     */
    resolveItemPrice(itemName, opts = {}) {
        const { tier = 'mid', regionKey = 'national_average', aiPrice = null, userOverride = null } = opts;

        // Priority 1: explicit user override
        if (Number.isFinite(Number(userOverride)) && Number(userOverride) > 0) {
            return { unitCost: Number(userOverride), source: 'user_override', confidence: 1.0 };
        }

        // Priority 2: distributor quote cache
        const distHit = this._bestMatch(this._distributorCache, itemName, 0.60);
        if (distHit && Number.isFinite(Number(distHit.record.unit_cost)) && Number(distHit.record.unit_cost) > 0) {
            return {
                unitCost: Number(distHit.record.unit_cost),
                source: 'distributor',
                confidence: distHit.score,
                matched: distHit.record.item_name,
                distributor: distHit.record.distributor,
                partNumber: distHit.record.part_number,
                quoteDate: distHit.record.quote_date || distHit.record.updated_at,
            };
        }

        // Priority 3: rate library
        const rateHit = this._bestMatch(this._rateLibraryCache, itemName, 0.60);
        if (rateHit && Number.isFinite(Number(rateHit.record.unit_cost)) && Number(rateHit.record.unit_cost) > 0) {
            return {
                unitCost: Number(rateHit.record.unit_cost),
                source: 'rate_library',
                confidence: rateHit.score,
                matched: rateHit.record.item_name,
                laborHours: rateHit.record.labor_hours || null,
                lastUsed: rateHit.record.last_used || null,
            };
        }

        // Priority 4: static pricing-database.js (will be AI's price if DB lookup fails)
        const staticHit = this._staticDbLookup(itemName, tier, regionKey);
        if (staticHit && Number.isFinite(staticHit.unitCost) && staticHit.unitCost > 0) {
            return { unitCost: staticHit.unitCost, source: 'static_db', confidence: staticHit.confidence };
        }

        // Final fallback: the AI's own price (or 0 if nothing)
        if (Number.isFinite(Number(aiPrice)) && Number(aiPrice) > 0) {
            return { unitCost: Number(aiPrice), source: 'ai_fallback', confidence: 0.40 };
        }
        return { unitCost: 0, source: 'unresolved', confidence: 0 };
    },

    /**
     * Search the global PRICING_DB for a token-matching item. PRICING_DB has
     * a nested structure (category → subcategory → item) so we flatten
     * on-demand. The AI already prices most items; this static fallback
     * exists for the small category of items where distributor/rate-library
     * is empty (which will be most items on day one of Wave 7).
     */
    _staticDbLookup(itemName, tier, regionKey) {
        if (typeof PRICING_DB === 'undefined' || !PRICING_DB) return null;
        if (!this._flatStaticCache) this._flatStaticCache = this._flattenStaticDb();
        const hit = this._bestMatch(this._flatStaticCache, itemName, 0.55);
        if (!hit) return null;
        const item = hit.record;
        const tierPrice = item[tier] || item.mid || item.budget || item.premium;
        if (!Number.isFinite(Number(tierPrice)) || Number(tierPrice) <= 0) return null;
        const regionMult = PRICING_DB.regionalMultipliers?.[regionKey] || 1.0;
        return {
            unitCost: Number(tierPrice) * regionMult,
            confidence: hit.score,
        };
    },

    _flattenStaticDb() {
        const flat = [];
        if (typeof PRICING_DB === 'undefined' || !PRICING_DB) return flat;
        const walk = (node, pathSegments = []) => {
            if (!node || typeof node !== 'object') return;
            // Item leaf: has numeric budget/mid/premium keys
            const looksLikeItem = ('budget' in node || 'mid' in node || 'premium' in node) && (Number.isFinite(node.budget) || Number.isFinite(node.mid) || Number.isFinite(node.premium));
            if (looksLikeItem) {
                flat.push({
                    item_name: pathSegments.slice(-2).join(' '),
                    description: node.description || '',
                    budget: node.budget,
                    mid: node.mid,
                    premium: node.premium,
                    unit: node.unit || 'ea',
                });
                return;
            }
            for (const [k, v] of Object.entries(node)) {
                if (v && typeof v === 'object') walk(v, [...pathSegments, k]);
            }
        };
        // Skip non-item roots
        const skipKeys = new Set(['regionalMultipliers', 'laborRates', 'amtrakBenchmarks', 'pricingTiers']);
        for (const [k, v] of Object.entries(PRICING_DB)) {
            if (skipKeys.has(k)) continue;
            walk(v, [k]);
        }
        return flat;
    },

    /**
     * Post-process a Material Pricer brain output: walk every BOM line
     * item, resolve each through the priority chain, and overwrite
     * unit_cost with the resolved price + stamp the source tag.
     *
     * Returns a stats object so the analysis summary can show
     * "347 items priced — 12 from distributor quotes, 45 from rate
     * library, 290 from static DB, 0 AI-generated".
     */
    rePriceMaterialPricerOutput(materialPricerResult, opts = {}) {
        const stats = { total: 0, distributor: 0, rate_library: 0, static_db: 0, user_override: 0, ai_fallback: 0, unresolved: 0, deltaTotal: 0 };
        if (!materialPricerResult || typeof materialPricerResult !== 'object') return stats;
        const { tier = 'mid', regionKey = 'national_average', userOverrides = {} } = opts;

        const walk = (categories) => {
            if (!Array.isArray(categories)) return;
            for (const cat of categories) {
                const items = cat.items || cat.line_items || [];
                for (const item of items) {
                    if (!item || typeof item !== 'object') continue;
                    stats.total++;
                    const name = item.item || item.name || item.description || '';
                    const qty = Number(item.qty || item.quantity || 1);
                    const aiPrice = Number(item.unit_cost || item.unitCost || 0);
                    const resolution = this.resolveItemPrice(name, {
                        tier,
                        regionKey,
                        aiPrice,
                        userOverride: userOverrides[name],
                    });
                    const newUnitCost = resolution.unitCost;
                    if (newUnitCost > 0 && Number.isFinite(newUnitCost)) {
                        const oldExt = (aiPrice || 0) * qty;
                        const newExt = newUnitCost * qty;
                        stats.deltaTotal += (newExt - oldExt);
                        item.unit_cost = newUnitCost;
                        item.unitCost = newUnitCost;
                        item.ext_cost = Math.round(newExt * 100) / 100;
                        item.extCost = item.ext_cost;
                    }
                    item._priceSource = resolution.source;
                    item._priceConfidence = resolution.confidence;
                    if (resolution.matched) item._priceMatchedName = resolution.matched;
                    if (resolution.distributor) item._priceDistributor = resolution.distributor;
                    if (resolution.partNumber) item._pricePartNumber = resolution.partNumber;
                    stats[resolution.source] = (stats[resolution.source] || 0) + 1;
                }
                // Recalculate category subtotal from line items
                if (items.length > 0) {
                    cat.subtotal = items.reduce((s, it) => s + (Number(it.ext_cost || it.extCost) || 0), 0);
                }
            }
        };

        walk(materialPricerResult.categories || materialPricerResult.material_categories);
        // Recalculate overall total if present
        if (materialPricerResult.grand_total !== undefined || materialPricerResult.total !== undefined) {
            const cats = materialPricerResult.categories || materialPricerResult.material_categories || [];
            const total = cats.reduce((s, c) => s + (Number(c.subtotal) || 0), 0);
            if (materialPricerResult.grand_total !== undefined) materialPricerResult.grand_total = total;
            if (materialPricerResult.total !== undefined) materialPricerResult.total = total;
        }
        return stats;
    },

    // ═══════════════════════════════════════════════════════════
    // WAVE 9 (v5.128.6) — DETERMINISTIC LABOR HOURS
    //
    // NECA-standard install labor hours per device, by discipline.
    // The LLM Labor Calculator historically did this math itself and
    // drifted ~1-2% per bid. Wave 9 shifts labor hours into the same
    // deterministic model Wave 4 applied to counts:
    //
    //   1. If project_actuals has enough samples (n >= 5) for this
    //      device type, use the historical rolling average (ground truth).
    //   2. Else fall back to the NECA standard in the table below.
    //   3. Else trust the AI's number and stamp _laborHoursSource=ai.
    //
    // Every hour written back to the BOM carries a _laborHoursSource
    // tag so the estimator can audit provenance.
    // ═══════════════════════════════════════════════════════════

    // Keyed by the classifier's `device` tag (same taxonomy as the vector
    // extractor's DEVICE_PREFIX_MAP in ai-engine.js). Hours are install +
    // terminate + test. Foreman/PM coordination lives in Labor Calculator's
    // percentage overhead, not here.
    NECA_LABOR_HOURS: {
        // CCTV
        'camera':              { install: 1.8, terminate: 0.8, test: 0.4 }, // 3.0 hrs baseline IP fixed dome
        'fixed_dome':          { install: 1.8, terminate: 0.8, test: 0.4 },
        'ptz_camera':          { install: 2.5, terminate: 1.0, test: 0.6 },
        'nvr':                 { install: 3.0, terminate: 2.0, test: 2.0 },
        // Access Control
        'card_reader':         { install: 1.2, terminate: 0.6, test: 0.3 }, // 2.1 hrs baseline
        'electric_strike':     { install: 0.8, terminate: 0.4, test: 0.3 },
        'maglock':             { install: 1.0, terminate: 0.5, test: 0.3 },
        'electric_lock':       { install: 1.0, terminate: 0.5, test: 0.3 },
        'door_position_switch':{ install: 0.4, terminate: 0.2, test: 0.1 },
        'request_to_exit':     { install: 0.6, terminate: 0.3, test: 0.2 },
        'intercom':            { install: 1.5, terminate: 0.8, test: 0.4 },
        // Structured Cabling
        'data_outlet':         { install: 0.4, terminate: 0.3, test: 0.15 }, // 0.85 hrs per drop
        'voice_outlet':        { install: 0.4, terminate: 0.3, test: 0.15 },
        'wireless_ap':         { install: 1.3, terminate: 0.5, test: 0.4 },
        // Fire Alarm
        'smoke_detector':      { install: 0.8, terminate: 0.3, test: 0.2 },
        'heat_detector':       { install: 0.8, terminate: 0.3, test: 0.2 },
        'duct_detector':       { install: 1.2, terminate: 0.4, test: 0.3 },
        'pull_station':        { install: 0.6, terminate: 0.3, test: 0.1 },
        'horn_strobe':         { install: 0.7, terminate: 0.3, test: 0.3 },
        'strobe':              { install: 0.6, terminate: 0.25, test: 0.25 },
        'facp':                { install: 6.0, terminate: 4.0, test: 4.0 },
        // Audio Visual
        'speaker':             { install: 0.8, terminate: 0.4, test: 0.2 },
        'dsp':                 { install: 2.5, terminate: 1.5, test: 1.5 },
        // Nurse Call
        'nurse_call_station':  { install: 1.0, terminate: 0.5, test: 0.3 },
        'master_station':      { install: 3.0, terminate: 1.5, test: 1.5 },
        // Intrusion
        'motion_detector':     { install: 0.7, terminate: 0.3, test: 0.2 },
        'glass_break':         { install: 0.5, terminate: 0.25, test: 0.15 },
    },

    /**
     * Sum of install + terminate + test hours for a device. Returns
     * 0 for unknown device types (never NaN).
     */
    necaStandardHours(deviceKey) {
        const row = this.NECA_LABOR_HOURS[deviceKey];
        if (!row) return 0;
        return Math.round(((row.install || 0) + (row.terminate || 0) + (row.test || 0)) * 100) / 100;
    },

    /**
     * Resolve the authoritative labor-hours-per-unit for a device.
     * Order of preference:
     *   1. Rolling actuals average if n >= 5 samples (ground truth)
     *   2. NECA standard table
     *   3. AI fallback from the opts.aiHours parameter
     *
     * Returns { hoursPerUnit, source, confidence, sampleCount? }.
     */
    resolveLaborHours(deviceKey, opts = {}) {
        const { aiHours = null, benchmarks = null } = opts;
        // 1. Actuals-based benchmark (cost_benchmarks row has avg_labor_hours)
        if (benchmarks && Array.isArray(benchmarks)) {
            const hit = benchmarks.find(b =>
                this._normalize(b.item_name || '').includes(this._normalize(deviceKey).replace(/_/g, ' '))
                && Number(b.sample_count) >= 5
                && Number(b.avg_labor_hours) > 0);
            if (hit) {
                return {
                    hoursPerUnit: Number(hit.avg_labor_hours),
                    source: 'actuals_rolling_avg',
                    confidence: Math.min(1, Number(hit.sample_count) / 20),
                    sampleCount: Number(hit.sample_count),
                };
            }
        }
        // 2. NECA standard
        const neca = this.necaStandardHours(deviceKey);
        if (neca > 0) {
            return { hoursPerUnit: neca, source: 'neca_standard', confidence: 0.85 };
        }
        // 3. AI fallback
        if (Number.isFinite(Number(aiHours)) && Number(aiHours) > 0) {
            return { hoursPerUnit: Number(aiHours), source: 'ai_fallback', confidence: 0.40 };
        }
        return { hoursPerUnit: 0, source: 'unresolved', confidence: 0 };
    },

    /**
     * Post-process LABOR_CALCULATOR brain output. For each line/phase
     * that carries a device identifier, compute the deterministic hour
     * figure and compare against the AI number. If the absolute delta
     * exceeds `tolerance`, override with deterministic + flag.
     *
     * Returns stats { total, overridden, agreed, disagreements: [...] }.
     */
    reconcileLaborHours(laborResult, opts = {}) {
        const stats = { total: 0, overridden: 0, agreed: 0, disagreements: [] };
        if (!laborResult || typeof laborResult !== 'object') return stats;
        const { benchmarks = null, tolerance = 0.25 } = opts;
        const phases = laborResult.phases || laborResult.breakdown || [];
        if (!Array.isArray(phases)) return stats;
        for (const phase of phases) {
            const items = phase.items || phase.line_items || [];
            if (!Array.isArray(items)) continue;
            for (const item of items) {
                if (!item || typeof item !== 'object') continue;
                stats.total++;
                const deviceKey = item.device_key || item.device || this._guessDeviceKey(item.item || item.name || '');
                if (!deviceKey) continue;
                const aiHours = Number(item.hours_per_unit || item.hoursPerUnit || item.hours || 0);
                const resolution = this.resolveLaborHours(deviceKey, { aiHours, benchmarks });
                if (resolution.source === 'ai_fallback' || resolution.source === 'unresolved') continue;
                const det = resolution.hoursPerUnit;
                if (aiHours > 0 && det > 0) {
                    const diff = Math.abs(aiHours - det) / Math.max(aiHours, det);
                    if (diff > tolerance) {
                        stats.overridden++;
                        stats.disagreements.push({ device: deviceKey, ai: aiHours, deterministic: det, source: resolution.source, diffPct: Math.round(diff * 1000) / 10 });
                        item.hours_per_unit = det;
                        item.hoursPerUnit = det;
                        // Recompute total hours for the item if qty is present
                        const qty = Number(item.qty || item.quantity || 0);
                        if (qty > 0) {
                            const newTotal = Math.round(det * qty * 100) / 100;
                            item.total_hours = newTotal;
                            item.totalHours = newTotal;
                        }
                    } else {
                        stats.agreed++;
                    }
                }
                item._laborHoursSource = resolution.source;
                item._laborHoursConfidence = resolution.confidence;
                if (resolution.sampleCount) item._laborHoursSampleCount = resolution.sampleCount;
            }
        }
        return stats;
    },

    // Best-effort guess of a device_key from a free-form item name.
    _guessDeviceKey(name) {
        const n = this._normalize(name);
        if (!n) return null;
        if (/\b(camera|dome|bullet|ptz|fisheye|panoram|turret)\b/i.test(n)) return 'camera';
        if (/\bnvr\b|network.?video.?recorder/i.test(n)) return 'nvr';
        if (/\bcard.?reader\b|\breader\b/i.test(n)) return 'card_reader';
        if (/electric.?strike/i.test(n)) return 'electric_strike';
        if (/maglock|magnetic.?lock/i.test(n)) return 'maglock';
        if (/smoke.?detector/i.test(n)) return 'smoke_detector';
        if (/heat.?detector/i.test(n)) return 'heat_detector';
        if (/duct.?(smoke.?)?detector/i.test(n)) return 'duct_detector';
        if (/pull.?station/i.test(n)) return 'pull_station';
        if (/horn.?strobe|strobe.?horn/i.test(n)) return 'horn_strobe';
        if (/\bstrobe\b/i.test(n)) return 'strobe';
        if (/\bfacp\b|fire.?alarm.?control/i.test(n)) return 'facp';
        if (/\bwap\b|wireless.?access.?point/i.test(n)) return 'wireless_ap';
        if (/data.?outlet|rj.?45.?outlet|cat.?6/i.test(n)) return 'data_outlet';
        if (/voice.?outlet/i.test(n)) return 'voice_outlet';
        if (/motion.?detect/i.test(n)) return 'motion_detector';
        if (/glass.?break/i.test(n)) return 'glass_break';
        if (/nurse.?call/i.test(n)) return 'nurse_call_station';
        if (/\bspeaker\b/i.test(n)) return 'speaker';
        return null;
    },

    /**
     * Select the correct prevailing-wage rate table based on
     * project location (state/county). Wave 7 adds the wiring so
     * non-CA projects no longer silently use CA rates.
     *
     * Returns: { blended, tables, source } where tables is the full
     * rate object so per-classification math can still run, and source
     * identifies which data file served the rates.
     */
    resolveWageRates(opts = {}) {
        const { state = '', county = '', wageType = 'davis-bacon' } = opts;
        const stateU = String(state || '').trim().toUpperCase();
        const countyTrimmed = String(county || '').trim();

        // Wave 10 C6 (v5.128.7): CA + missing county now returns an
        // explicit `incomplete: true` result instead of silently falling
        // through to the national table (which has no CA entries) and
        // returning null. Pre-fix the estimator saw no warning, silently
        // got zero prevailing-wage uplift, and could under-bid Davis-Bacon
        // jobs by $60-100k. Callers MUST check `.incomplete` before using.
        if ((stateU === 'CA' || stateU === 'CALIFORNIA')) {
            if (!countyTrimmed) {
                return {
                    incomplete: true,
                    reason: 'CA_COUNTY_REQUIRED',
                    message: 'California requires a county selection — prevailing wage rates vary by IBEW zone. Pick a county on Step 0 before running analysis.',
                    state: 'CA',
                };
            }
            if (typeof CA_PREVAILING_WAGES !== 'undefined') {
                const rates = CA_PREVAILING_WAGES.getRates(countyTrimmed, wageType);
                const blended = CA_PREVAILING_WAGES.getBlendedRate(countyTrimmed, wageType);
                const zoneLabel = CA_PREVAILING_WAGES.getZoneLabel(countyTrimmed);
                if (rates && blended) {
                    return { blended: blended.blended, tables: rates, zoneLabel, source: 'CA_PREVAILING_WAGES', state: 'CA', county: countyTrimmed };
                }
                // Valid CA but unknown county — also incomplete, not silent null
                return {
                    incomplete: true,
                    reason: 'CA_COUNTY_UNKNOWN',
                    message: `County "${countyTrimmed}" is not in CA_PREVAILING_WAGES. Check spelling or pick another county.`,
                    state: 'CA',
                    county: countyTrimmed,
                };
            }
        }

        // Non-CA states fall through to NATIONAL_PREVAILING_WAGES metro zones
        if (typeof NATIONAL_PREVAILING_WAGES !== 'undefined' && stateU) {
            const metros = NATIONAL_PREVAILING_WAGES.getMetrosForState(stateU);
            if (metros.length > 0) {
                // Prefer the first metro; future work could pick by city proximity
                const zoneKey = metros[0].key;
                const rates = NATIONAL_PREVAILING_WAGES.getRates(zoneKey);
                const blended = NATIONAL_PREVAILING_WAGES.getBlendedRate(zoneKey);
                if (rates && blended) {
                    return { blended: blended.blended, tables: rates, zoneLabel: metros[0].label, source: 'NATIONAL_PREVAILING_WAGES', state: stateU, zoneKey };
                }
            }
        }

        return null;
    },
};

if (typeof window !== 'undefined') window.SmartPlansPricing = SmartPlansPricing;
if (typeof module !== 'undefined' && module.exports) module.exports = { SmartPlansPricing };
