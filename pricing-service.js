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

        // California has full county-level granularity via CA_PREVAILING_WAGES
        if ((stateU === 'CA' || stateU === 'CALIFORNIA') && typeof CA_PREVAILING_WAGES !== 'undefined' && countyTrimmed) {
            const rates = CA_PREVAILING_WAGES.getRates(countyTrimmed, wageType);
            const blended = CA_PREVAILING_WAGES.getBlendedRate(countyTrimmed, wageType);
            const zoneLabel = CA_PREVAILING_WAGES.getZoneLabel(countyTrimmed);
            if (rates && blended) {
                return { blended: blended.blended, tables: rates, zoneLabel, source: 'CA_PREVAILING_WAGES', state: 'CA', county: countyTrimmed };
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
