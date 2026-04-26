// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — EXPORT ENGINE
// Produces structured export packages for PM App import
// Formats: JSON (structured data), Excel (.xlsx), Markdown (.md)
// ═══════════════════════════════════════════════════════════════

const SmartPlansExport = {

    _round(val) { return Math.round((val || 0) * 100) / 100; },

    _csvSafe(val) {
        const s = String(val ?? '');
        if (/^[=+\-@\t\r]/.test(s)) return "'" + s;
        return s;
    },

    // ─── Excel Formula Helpers ────────────────────────────────
    // SheetJS cell address utility: col index → letter (0=A, 1=B, ..., 25=Z, 26=AA)
    _colLetter(c) {
        let s = '';
        c++;
        while (c > 0) { c--; s = String.fromCharCode(65 + (c % 26)) + s; c = Math.floor(c / 26); }
        return s;
    },

    // Set a formula on a worksheet cell. row/col are 0-based.
    // Preserves the static value as the cached result so non-formula viewers still show data.
    _setCellFormula(ws, row, col, formula, cachedValue) {
        const addr = XLSX.utils.encode_cell({ r: row, c: col });
        ws[addr] = { t: 'n', f: formula, v: cachedValue || 0, z: '$#,##0.00' };
    },

    // Set currency format on an existing cell (no formula)
    _setCellCurrency(ws, row, col) {
        const addr = XLSX.utils.encode_cell({ r: row, c: col });
        if (ws[addr] && typeof ws[addr].v === 'number') {
            ws[addr].z = '$#,##0.00';
        }
    },

    // ─── Fail-Closed Gate (v5.129.3 — 2026-04-25) ──────────────
    // Collect all blocking warnings the analysis pipeline produced, in one
    // structured place. Returns array of:
    //   { severity: 'block'|'warn', code, message, details, dollarsAtRisk? }
    //
    // The system already DETECTS these issues (cost-buildup divergence, anomaly
    // detector, missing sheets, coverage gaps). What it didn't do was ENFORCE
    // them — warnings logged to console while exports proceeded. This collector
    // surfaces them on the export object so the UI can hard-block 'block'
    // severity and require explicit acknowledgment.
    //
    // Validated against Sacramento bid (won at $1,734K): the cost-buildup
    // divergence (-24.6%) was logging "investigate before shipping" while the
    // export shipped anyway. With this gate, that bid would have halted at
    // export until reviewed.
    _collectBlockingWarnings(state, bom) {
        const warnings = [];
        if (!state) return warnings;

        // 1. Cost-buildup divergence (3D engine vs deterministic disagree)
        // 'block' at >15% (post-v5.129.2 should rarely fire because calibrated
        // 3D is now bid-of-record on transit). 'warn' at 5-15%.
        const div = state._pathDivergenceWarning;
        if (div && Number.isFinite(div.deltaPct)) {
            const absPct = Math.abs(div.deltaPct);
            if (absPct > 5) {
                warnings.push({
                    severity: absPct > 15 ? 'block' : 'warn',
                    code: 'cost_buildup_divergence',
                    message: `Two cost-buildup paths disagree by ${div.deltaPct.toFixed(1)}% — review _computeFullBreakdown vs FormulaEngine3D before shipping`,
                    details: { computedTotal: div.computedTotal, engine3DTotal: div.engine3DTotal, deltaPct: div.deltaPct },
                    dollarsAtRisk: Math.abs((div.engine3DTotal || 0) - (div.computedTotal || 0)),
                });
            }
        }

        // 2. Per-discipline coverage gaps — selected discipline has no device counts
        const coverageGaps = state._perDisciplineCoverageGaps || [];
        if (Array.isArray(coverageGaps) && coverageGaps.length > 0) {
            warnings.push({
                severity: 'block',
                code: 'discipline_coverage_gap',
                message: `${coverageGaps.length} selected discipline(s) have no device counts: ${coverageGaps.map(g => g.discipline || g).join(', ')}`,
                details: coverageGaps,
            });
        }

        // 3. Quantity anomalies — Material Pricer flagged outliers
        const anomalies = state._quantityAnomalies || [];
        const blockingAnomalies = (Array.isArray(anomalies) ? anomalies : []).filter(a => a.severity === 'warning');
        if (blockingAnomalies.length > 0) {
            warnings.push({
                severity: 'warn',
                code: 'quantity_anomalies',
                message: `${blockingAnomalies.length} quantity anomaly/anomalies detected — verify pricing/quantities before shipping`,
                details: blockingAnomalies.slice(0, 10),
            });
        }

        // 4. Sheet inventory missing sheets — kept as 'warn' (false-positive prone)
        const sig = state.brainResults?.wave0_5?.SHEET_INVENTORY_GUARD;
        if (sig && Array.isArray(sig.missing_sheets) && sig.missing_sheets.length > 0) {
            warnings.push({
                severity: 'warn',
                code: 'missing_sheets',
                message: `Sheet Inventory Guard flagged ${sig.missing_sheets.length} sheet(s) as missing — verify they're not actually in the set (this guard has known false-positive issues)`,
                details: sig.missing_sheets.slice(0, 10),
            });
        }

        // 5. Cost per SF outside benchmark range
        const grandTotal = Number(state._lockedBidTotal || 0);
        const profile = state._buildingProfile || {};
        const sf = Number(profile.total_sf || profile.totalSF || 0);
        if (grandTotal > 1000 && sf >= 100) {
            const costPerSF = grandTotal / sf;
            const projectType = String(profile.building_type || 'mixed_use').toLowerCase().replace(/[\s-]/g, '_');
            const ranges = {
                mixed_use:    { min: 5,  max: 35 },
                office:       { min: 4,  max: 25 },
                healthcare:   { min: 12, max: 60 },
                education:    { min: 5,  max: 30 },
                retail:       { min: 3,  max: 20 },
                warehouse:    { min: 2,  max: 12 },
                transit:      { min: 15, max: 80 },
                data_center:  { min: 20, max: 120 },
            };
            const range = ranges[projectType] || ranges.mixed_use;
            if (costPerSF < range.min || costPerSF > range.max) {
                warnings.push({
                    severity: 'warn',
                    code: 'cost_per_sf_outlier',
                    message: `Cost per SF $${costPerSF.toFixed(2)} outside ${range.min}-${range.max} range for ${projectType}`,
                    details: { costPerSF: this._round(costPerSF), projectType, range, grandTotal, sf },
                });
            }
        }

        // 6. Brain failures requiring review
        const failed = [];
        for (const wave of Object.values(state.brainResults || {})) {
            if (typeof wave === 'object' && wave) {
                for (const [bk, result] of Object.entries(wave)) {
                    if (result?._failed === true) failed.push(bk);
                }
            }
        }
        if (failed.length > 0) {
            warnings.push({
                severity: 'warn',
                code: 'brain_failures',
                message: `${failed.length} brain(s) failed and were skipped: ${failed.join(', ')}`,
                details: failed,
            });
        }

        // 7. Commercial benchmark sanity check (v5.129.5)
        // FormulaEngine3D stamps result._commercialBenchmarkWarning when a non-
        // transit bid is >2.5× or <0.4× the median of comparable real bids
        // from PRICING_DB.commercialBenchmarks.actualBids. Surface it as a
        // 'warn' (not 'block') because commercial scope varies enough that a
        // 3× outlier might be a legitimate large project rather than a bug.
        const commWarn = state._engine3DResult?._commercialBenchmarkWarning;
        if (commWarn && Number.isFinite(commWarn.ratio)) {
            const direction = commWarn.ratio > 1 ? 'high' : 'low';
            warnings.push({
                severity: 'warn',
                code: 'commercial_benchmark_outlier',
                message: `Bid total is ${commWarn.ratio.toFixed(2)}× the median of ${commWarn.sampleSize} comparable ${commWarn.ptSlug || 'commercial'} ${commWarn.wageSlug} bids (median $${commWarn.median.toLocaleString()}, range $${commWarn.lo.toLocaleString()}–$${commWarn.hi.toLocaleString()}) — verify scope before shipping`,
                details: commWarn,
            });
        }

        return warnings;
    },

    _hasBlockingWarnings(state, bom) {
        return this._collectBlockingWarnings(state, bom).some(w => w.severity === 'block');
    },

    // ─── Build structured data package ─────────────────────────
    buildExportPackage(state) {
        const now = new Date();
        const regionKey = state.regionalMultiplier || "national_average";
        const regionMult = PRICING_DB.regionalMultipliers[regionKey] || 1.0;
        const burdenMult = state.includeBurden ? (1 + ((state.burdenRate ?? 35) >= 1 ? (state.burdenRate ?? 35) / 100 : (state.burdenRate ?? 35))) : 1.0;

        // Pre-extract BOM for financials section
        let bom = this._extractBOMFromAnalysis(state.aiAnalysis);
        const bomWarning = bom._warning || null;

        // Apply ALL user BOM edits: overrides, deletions, manual items
        // FIX: Previously only applied overrides — deleted items were still in the
        // export BOM, inflating financials.grandTotal with items the user removed.
        if (bom && typeof this._applyUserBOMEdits === 'function') {
            bom = this._applyUserBOMEdits(bom, state);
        }

        // Apply transit station-grade pricing adjustments
        if (bom && typeof this._applyTransitAdjustments === 'function') {
            this._applyTransitAdjustments(bom, state);
        }

        // Filter BOM to only include categories for selected disciplines
        const filteredBom = this._filterBOMByDisciplines(bom, state.disciplines);

        // v5.129.3: Pre-compute grandTotal so state._lockedBidTotal is set BEFORE
        // _collectBlockingWarnings runs (the cost-per-SF check reads it).
        // Without this, _blockingWarnings evaluates before financials in object-
        // literal source order and sees a stale/missing total.
        const grandTotalForGate = this._getFullyLoadedTotal(state, filteredBom);

        return {
            _meta: {
                format: "smartplans-export",
                version: "5.0",
                generatedAt: now.toISOString(),
                generatedBy: "SmartPlans — AI-Powered ELV Estimation",
                appVersion: PRICING_DB.version,
                classification: "3D CONFIDENTIAL — 3D Technology Services Inc.",
            },

            project: {
                name: state.projectName || "Untitled Project",
                preparedFor: state.preparedFor || "",
                type: state.projectType || "",
                location: state.projectLocation || "",
                jurisdiction: state.codeJurisdiction || "",
                disciplines: [...(state.disciplines || [])],
                fileFormat: state.fileFormat || "",
                prevailingWage: state.prevailingWage || "",
                pwCounty: state._pwCounty || "",
                pwState: state._pwState || "",
                pwMetro: state._pwMetro || "",
                workShift: state.workShift || "",
                isTransitRailroad: state.isTransitRailroad || false,
                floorPlateWidth: state.floorPlateWidth || 0,
                floorPlateDepth: state.floorPlateDepth || 0,
                planSheetSize: state.planSheetSize || '',
                ceilingHeight: state.ceilingHeight || 10,
                floorToFloorHeight: state.floorToFloorHeight || 14,
                salesperson: state.salesperson || null,
                // CRITICAL: Save text layer page texts so saved bids get the same
                // deterministic corrections on reload. Without this, _ocrPageTexts
                // is empty on reload and ALL text layer corrections are skipped.
                _ocrPageTexts: state._ocrPageTexts || null,
            },

            documents: {
                legendFiles: (state.legendFiles || []).map(f => ({ name: f.name, size: f.size, type: f.type })),
                planFiles: (state.planFiles || []).map(f => ({ name: f.name, size: f.size, type: f.type })),
                specFiles: (state.specFiles || []).map(f => ({ name: f.name, size: f.size, type: f.type })),
                addendaFiles: (state.addendaFiles || []).map(f => ({ name: f.name, size: f.size, type: f.type })),
                totalSheets: (state.planFiles || []).length,
                totalSpecs: (state.specFiles || []).length,
            },

            pricingConfig: {
                tier: state.pricingTier,
                regionalMultiplier: regionKey,
                regionalMultiplierValue: regionMult,
                laborRates: { ...state.laborRates },
                burdenRate: state.burdenRate,
                includeBurden: state.includeBurden,
                burdenMultiplier: burdenMult,
                loadedRates: Object.fromEntries(
                    Object.entries(state.laborRates).map(([k, v]) => [k, this._round(v * burdenMult)])
                ),
                markup: { ...state.markup },
            },

            userInputs: {
                specificItems: state.specificItems || "",
                knownQuantities: state.knownQuantities || "",
                priorEstimate: state.priorEstimate || "",
                notes: state.notes || "",
            },

            analysis: {
                rawMarkdown: state.aiAnalysis || "",
                sections: this._parseAnalysisSections(state.aiAnalysis || ""),
                error: state.aiError || null,
            },

            // ── Pre-structured financial data for SmartPM SOV import ──
            // Each category becomes an SOV line item with material & labor costs.
            // Every individual item has qty, unit cost, and extended cost for tracking.
            //
            // TWO TOTALS:
            //   bomRawTotal  = sum of raw BOM line items (no markups — for supplier quotes)
            //   grandTotal   = fully loaded bid price from Financial Engine
            //                  (includes markups, G&A, profit, contingency)
            //                  Falls back to markup calculation if Financial Engine unavailable.
            // v5.129.3: fail-closed warnings collected after grand total is locked.
            // UI consumers should refuse to send the bid if any warning has severity='block'.
            // Stamped on _meta so downstream tools (proposal generator, BOM exporter)
            // can also see them without needing to re-run the collector.
            _blockingWarnings: (() => {
                // grandTotal computation above will set state._lockedBidTotal via
                // _getFullyLoadedTotal. Run the collector AFTER that so cost-per-SF
                // and divergence checks see the locked total.
                const ws = this._collectBlockingWarnings(state, filteredBom);
                if (ws.length > 0) {
                    const blockCount = ws.filter(w => w.severity === 'block').length;
                    const warnCount = ws.filter(w => w.severity === 'warn').length;
                    console.log(`[Export] 🛡️ Fail-closed gate: ${blockCount} blocking + ${warnCount} warning issue(s) collected`);
                    for (const w of ws) {
                        console.log(`[Export]   ${w.severity === 'block' ? '🛑' : '⚠️ '} [${w.code}] ${w.message}`);
                    }
                }
                return ws;
            })(),

            financials: {
                grandTotal: grandTotalForGate,
                bomRawTotal: filteredBom.grandTotal,
                ...(bomWarning ? { _warning: bomWarning } : {}),
                markup: { ...state.markup },
                categories: filteredBom.categories.map(cat => ({
                    name: cat.name,
                    subtotal: cat.subtotal,
                    items: cat.items.map(item => ({
                        name: item.item,
                        qty: item.qty,
                        unit: item.unit,
                        unitCost: item.unitCost,
                        extCost: item.extCost,
                        mfg: item.mfg || '',
                        partNumber: item.partNumber || '',
                        category: item.category || 'other',
                    })),
                })),
                totalLineItems: filteredBom.categories.reduce((s, c) => s + c.items.length, 0),
                supplierOverrides: state.supplierPriceOverrides || {},
                manualBomItems: state.manualBomItems || [],
                deletedBomItems: state.deletedBomItems || {},
                // Phase assignment per category for SmartPM SOV
                phaseAssignments: this._buildPhaseAssignments(state, filteredBom),
            },

            // Bid Phases / Alternates for multi-phase option pricing
            bidPhases: this._buildBidPhasesExport(state, filteredBom),

            // Symbol Inventory Audit — per-sheet/per-location device breakdown for count verification
            symbolInventory: typeof getSymbolInventoryData === 'function' ? (() => {
                const inv = getSymbolInventoryData(state);
                if (!inv) return null;
                return {
                    items: inv.items.map(i => ({ sheet: i.sheet, floor: i.floor, room: i.room, type: i.type, subtype: i.subtype, qty: i.qty, confidence: i.confidence })),
                    duplicates: inv.duplicates.map(d => ({ label: d.label, sheets: d.sheets, totalQty: d.totalQty })),
                    stats: inv.stats,
                };
            })() : null,

            rfis: this._extractRFIs(state),

            // Exclusions & Assumptions — legal protection lists for proposals
            exclusions: (state.exclusions || []).filter(e => e.type === 'exclusion').map(e => ({ text: e.text, category: e.category })),
            assumptions: (state.exclusions || []).filter(e => e.type === 'assumption').map(e => ({ text: e.text, category: e.category })),
            clarifications: (state.exclusions || []).filter(e => e.type === 'clarification').map(e => ({ text: e.text, category: e.category })),

            // Potential Change Orders — scope gaps identified by AI
            potentialChangeOrders: typeof extractPotentialChangeOrders === 'function'
                ? extractPotentialChangeOrders(state).filter(c => !(state._excludedCOs || new Set()).has(c.id))
                    .map(c => ({ id: c.id, description: c.description, category: c.category, estimatedCost: c.estimatedCost, severity: c.severity, source: c.source }))
                : [],

            // Proposal Narrative — AI-generated persuasive proposal draft (Wave 4.1)
            proposalNarrative: state._proposalNarrative || null,

            // Building Profile — Inferred building characteristics from Wave 0.35
            buildingProfile: state._buildingProfile || null,

            // Spec Compliance — Specification vs BOM gap analysis from Wave 3.25
            specCompliance: state._specCompliance ? {
                compliance_score: state._specCompliance.compliance_score,
                requirements_checked: state._specCompliance.spec_requirements_checked,
                requirements_met: state._specCompliance.requirements_met,
                requirements_missing: state._specCompliance.requirements_missing,
                gaps: (state._specCompliance.gaps || []).filter(g => g.status === 'missing').map(g => ({
                    section: g.spec_section, requirement: g.requirement, severity: g.severity, estimatedCost: g.estimated_cost_if_missing
                })),
            } : null,

            // Quantity Anomalies — Statistical outlier flags
            quantityAnomalies: (state._quantityAnomalies || []).map(a => ({
                item: a.item, category: a.category, type: a.type, severity: a.severity, detail: a.detail, suggestion: a.suggestion
            })),

            // Cost-Per-SF Benchmark — Industry comparison
            costPerSF: state._costPerSF || null,

            // Per-Item Confidence Scoring — Grade distribution
            confidenceScoring: state._confidenceScoring || null,

            // Estimator Review Checklist — checked items (so reopened bids remember progress)
            checklistChecked: state._checklistChecked || {},

            // 3D Formula Engine breakdown — deterministic bid using 3D Technology Services formulas
            engine3D: (typeof FormulaEngine3D !== 'undefined' && state._engine3DResult)
                ? {
                    engine: state._engine3DResult._engine,
                    isTransit: state._engine3DResult._isTransit,
                    isPW: state._engine3DResult._isPW,
                    rateTable: state._engine3DResult._rateTable,
                    systems: state._engine3DResult.systems,
                    grandTotalSELL: state._engine3DResult.grandTotalSELL,
                    grandTotalCOS: state._engine3DResult.grandTotalCOS,
                    grossMargin: state._engine3DResult.grossMargin,
                    grossMarginPct: state._engine3DResult.grossMarginPct,
                    bonds: state._engine3DResult.bonds,
                    transitCosts: state._engine3DResult.transitCosts,
                }
                : null,

            // Structured MDF/IDF data for SmartPM Infrastructure module
            // AI-generated budgets — locked from field manipulation
            infrastructure: this._extractInfrastructure(state),

            // Work Breakdown Structure — auto-generated from bid data
            // Produces a hierarchical task tree for PM tracking
            workBreakdown: this._buildWorkBreakdown(state),

            // Travel & Incidentals configuration — MUST be saved per bid
            // Without this, loading a bid keeps the PREVIOUS bid's per diem/travel values
            travelConfig: {
                enabled: state.travel?.enabled || false,
                calcMode: state.travel?.calcMode || 'byTechs',
                techCount: state.travel?.techCount || 4,
                projectDays: state.travel?.projectDays || 30,
                hoursPerDay: state.travel?.hoursPerDay || 8,
                numTrips: state.travel?.numTrips || 1,
                hotelPerNight: state.travel?.hotelPerNight || 175,
                hotelNightsPerWeek: state.travel?.hotelNightsPerWeek || 4,
                perDiemPerDay: state.travel?.perDiemPerDay || 79,
                mileageRoundTrip: state.travel?.mileageRoundTrip || 0,
                mileageRate: state.travel?.mileageRate || 0.70,
                airfarePerPerson: state.travel?.airfarePerPerson || 0,
                rentalCarPerDay: state.travel?.rentalCarPerDay || 85,
                parkingPerDay: state.travel?.parkingPerDay || 25,
                tollsPerTrip: state.travel?.tollsPerTrip || 0,
            },
            incidentalsConfig: {
                permits: state.incidentals?.permits || 0,
                insurance: state.incidentals?.insurance || 0,
                bonding: state.incidentals?.bonding || 0,
                equipmentRental: state.incidentals?.equipmentRental || 0,
                fuelTransit: state.incidentals?.fuelTransit || 0,
                unexpectedBufferPct: state.incidentals?.unexpectedBufferPct || 5,
            },
            travelAIRecommendations: {
                aiRecommendedTechs: state.travel?.aiRecommendedTechs || null,
                aiRecommendedDays: state.travel?.aiRecommendedDays || null,
                aiCrewBreakdown: state.travel?.aiCrewBreakdown || null,
                aiReasoning: state.travel?.aiReasoning || null,
            },

            // ── Brain Results & Strategy (CRITICAL for reload — labor hours, financial engine, consensus) ──
            brainResults: state.brainResults || null,
            bidStrategy: state.bidStrategy || null,
            brainStats: state.brainStats || null,
            failedBrains: state.failedBrains || null,

            // ── Exclusions raw array (restore needs full array with type field) ──
            exclusionsRaw: state.exclusions || [],
            // ── Bid Phases raw (user-created alternates) ──
            bidPhasesRaw: state.bidPhases || [],
            _bidPhaseCounter: state._bidPhaseCounter || 0,
            // ── Excluded Change Orders (Set → Array for JSON serialization) ──
            excludedChangeOrders: state._excludedCOs ? [...state._excludedCOs] : [],
            // ── Selected RFIs (Set → Array for JSON serialization) ──
            selectedRFIs: state.selectedRFIs ? [...state.selectedRFIs] : [],
        };
    },

    // ─── Apply user BOM edits: price overrides, deletions, manual items ──
    // Without this, exported Excel/Supplier BOMs show original AI prices, ignoring all user changes.
    _applyUserBOMEdits(bom, state) {
        if (!bom || !bom.categories) return bom;

        // Stamp stable _origKey on each item BEFORE any modifications.
        // Keys like "catIdx-itemIdx" become invalid after deletions re-index items.
        bom.categories.forEach((cat, ci) => {
            cat.items.forEach((item, ii) => {
                if (!item._origKey) item._origKey = ci + '-' + ii;
            });
        });

        // 1. Apply supplier price overrides (using stable _origKey lookup)
        const overrides = state.supplierPriceOverrides || {};
        if (Object.keys(overrides).length > 0) {
            const itemsByKey = {};
            bom.categories.forEach((cat, ci) => {
                cat.items.forEach((item, ii) => {
                    itemsByKey[item._origKey || (ci + '-' + ii)] = item;
                });
            });
            for (const [key, override] of Object.entries(overrides)) {
                const item = itemsByKey[key];
                if (!item) continue;
                if (override.qty != null) item.qty = override.qty;
                item.unitCost = override.unitCost;
                item.extCost = this._round(item.qty * override.unitCost);
                if (override.mfg) item.mfg = override.mfg;
                if (override.partNumber) item.partNumber = override.partNumber;
                if (override.isSubstitute) item._isSubstitute = true;
            }
        }

        // 2. Remove deleted BOM items (using stable _origKey)
        const deleted = state.deletedBomItems || {};
        if (Object.keys(deleted).length > 0) {
            bom.categories.forEach((cat) => {
                cat.items = cat.items.filter((item) => !deleted[item._origKey]);
            });
            // Remove empty categories
            bom.categories = bom.categories.filter(c => c.items.length > 0);
            // Recalculate subtotals after deletions to prevent stale totals
            bom.categories.forEach(cat => {
                cat.subtotal = cat.items.reduce((s, i) => s + (i.extCost || 0), 0);
            });
        }

        // 3. Add manually added BOM items
        const manualItems = state.manualBomItems || [];
        if (manualItems.length > 0) {
            let manualCat = bom.categories.find(c => c.name === 'Manual Additions');
            if (!manualCat) {
                manualCat = { name: 'Manual Additions', items: [], subtotal: 0 };
                bom.categories.push(manualCat);
            }
            for (const mi of manualItems) {
                manualCat.items.push({
                    item: mi.item || mi.name || 'Manual Item',
                    qty: mi.qty || 1,
                    unit: mi.unit || 'ea',
                    unitCost: this._round(mi.unitCost || 0),
                    extCost: this._round((mi.qty || 1) * (mi.unitCost || 0)),
                    mfg: mi.mfg || '',
                    partNumber: mi.partNumber || '',
                    category: mi.category || 'other',
                });
            }
        }

        // 4. Recalculate subtotals and grand total
        bom.grandTotal = 0;
        for (const cat of bom.categories) {
            cat.subtotal = cat.items.reduce((s, it) => s + (it.extCost || 0), 0);
            cat.subtotal = this._round(cat.subtotal);
            bom.grandTotal += cat.subtotal;
        }
        bom.grandTotal = this._round(bom.grandTotal);

        return bom;
    },

    // ─── Apply transit/railroad pricing adjustments to BOM ──
    // For transit projects, enforce minimum costs for transit-rated equipment
    // (IK10 cameras, industrial NVR, managed switches). Without this, the AI
    // may price commodity-grade equipment that doesn't meet transit specs.
    _applyTransitAdjustments(bom, state) {
        if (!state.isTransitRailroad || !bom?.categories) return;
        const tc = PRICING_DB?.projectTypeMultipliers?.transit_railroad;
        if (!tc) return;

        let adjustments = 0;
        for (const cat of bom.categories) {
            for (const item of cat.items) {
                const n = (item.name || item.item || '').toLowerCase();
                const uc = item.unitCost || 0;

                // Enforce minimum camera cost for transit-rated IK10 domes
                if (/camera|dome|bullet|ptz|turret/i.test(n) && uc > 0 && uc < tc.min_camera_cost) {
                    console.log(`[Transit] Camera "${item.name || item.item}" $${uc} → $${tc.min_camera_cost} (transit minimum)`);
                    item.unitCost = tc.min_camera_cost;
                    item.extCost = this._round(item.qty * item.unitCost);
                    adjustments++;
                }
                // Enforce minimum NVR cost
                if (/nvr|network\s*video\s*recorder|video\s*server/i.test(n) && uc > 0 && uc < tc.min_nvr_cost) {
                    console.log(`[Transit] NVR "${item.name || item.item}" $${uc} → $${tc.min_nvr_cost} (transit minimum)`);
                    item.unitCost = tc.min_nvr_cost;
                    item.extCost = this._round(item.qty * item.unitCost);
                    adjustments++;
                }
                // Enforce minimum managed switch cost
                if (/network\s*switch|managed\s*switch|poe\s*switch/i.test(n) && uc > 0 && uc < tc.min_switch_cost) {
                    console.log(`[Transit] Switch "${item.name || item.item}" $${uc} → $${tc.min_switch_cost} (transit minimum)`);
                    item.unitCost = tc.min_switch_cost;
                    item.extCost = this._round(item.qty * item.unitCost);
                    adjustments++;
                }
            }
            // Recalculate category subtotal
            cat.subtotal = cat.items.reduce((s, it) => s + (it.extCost || 0), 0);
            cat.subtotal = this._round(cat.subtotal);
        }
        // Recalculate grand total
        bom.grandTotal = bom.categories.reduce((s, cat) => s + (cat.subtotal || 0), 0);
        bom.grandTotal = this._round(bom.grandTotal);

        if (adjustments > 0) {
            console.log(`[Transit] Applied ${adjustments} transit minimum price adjustments. New BOM total: $${bom.grandTotal.toLocaleString()}`);
        }
    },

    // ─── Classify BOM categories into material/equipment/subs/labor ──
    _classifyBOM(bom) {
        let materials = 0, equipment = 0, subs = 0, labor = 0, bomTravel = 0;
        for (const cat of (bom?.categories || [])) {
            const n = (cat.name || '').toLowerCase();
            if (/travel|per\s*diem|lodging|hotel|mileage|fuel|incidental/i.test(n)) {
                // Travel/incidentals injected into BOM — track separately to avoid double-counting
                bomTravel += (cat.subtotal || 0);
            } else if (/subcontract|civil|traffic|insurance|parking/.test(n)) {
                subs += (cat.subtotal || 0);
            } else if (/equipment|air.?condition|hvac.?condition|scissor|boom|excavat|tugger|drill|saw|scanner/.test(n)) {
                equipment += (cat.subtotal || 0);
            } else if (/\blabor\b|\binstall(ation)?\b|rough[\s-]?in|trim[\s-]?out|\bcommission(ing)?\b|\bprogram(ming)?\s+(labor|service|hours)\b|\btest(ing)?\s*[&,]\s*commission|\bmobiliz/i.test(n)) {
                // Labor categories that leaked past the BOM parser filter —
                // segregate them so they don't inflate the material total.
                // NOTE: Patterns are tightened to avoid false positives:
                // - "test" alone would catch "Testing Equipment" (material)
                // - "program" alone would catch "Programming Licenses" (material)
                // - "phase N" would catch "Phase 1 - Camera Equipment" (material)
                labor += (cat.subtotal || 0);
                console.warn(`[Export] BOM category "${cat.name}" classified as LABOR (not material) — $${(cat.subtotal || 0).toLocaleString()}`);
            } else {
                materials += (cat.subtotal || 0);
            }
        }
        return { materials, equipment, subs, labor, bomTravel };
    },

    // ─── Compute full bid price breakdown with all markups ──
    // SINGLE SOURCE OF TRUTH: Every output reads from this.
    // If FormulaEngine3D produced a result, the breakdown is SCALED to match its grand total
    // so that the Master Report financial table and the grand total are always consistent.
    _computeFullBreakdown(state, bom) {
        const { materials, equipment, subs, labor: bomLabor, bomTravel } = this._classifyBOM(bom);
        const cfg = state.pricingConfig?.markup || state.markup || {};
        // AUDIT FIX C6: Guard against both empty string "" AND intentional 0% markup
        // Number("") = 0, Number(0) = 0, Number("50") = 50, Number(null) = 0
        // Use Number.isFinite() to allow explicit 0% while defaulting empty/null/undefined
        const _pct = (v, def) => { const n = Number(v); return Number.isFinite(n) && v !== '' && v !== null && v !== undefined ? n : def; };
        // Defaults mirror DEFAULT_MARKUPS_SSOT in pricing-database.js. Keep in sync.
        const matPct = _pct(cfg.material, 50) / 100;
        const labPct = _pct(cfg.labor, 50) / 100;
        const eqPct = _pct(cfg.equipment, 15) / 100;
        const subPct = _pct(cfg.subcontractor, 15) / 100;
        const rawBurden = _pct(state.pricingConfig?.burdenRate, 35);
        const burdenRate = rawBurden >= 1 ? rawBurden / 100 : rawBurden;
        const includeBurden = state.pricingConfig?.includeBurden !== false;
        // AUDIT FIX #13: Contingency configurable (default 10%)
        // FIX: Number(0) || 10 was forcing 10% when user set 0%. Use nullish check instead.
        const contingencyPct = (cfg.contingency !== undefined && cfg.contingency !== '' ? Number(cfg.contingency) : 10) / 100;

        // ── Labor: use REAL data from Labor Calculator brain when available ──
        // Cluster-1C fix (2026-04-25): track whether laborBase already includes
        // burden (LABOR_CALCULATOR's `total_base_cost` is the loaded rate ×
        // hours = WITH burden, before markup). Pre-fix we always added a
        // separate `burden = laborBase × burdenRate` line that double-counted
        // ~30-35%. Now: if labor came from LABOR_CALCULATOR, burden is already
        // baked in — skip the second application. If from BOM directly (which
        // typically holds raw rate × hours), apply burden.
        const laborCalc = state.brainResults?.wave2_25?.LABOR_CALCULATOR;
        let laborBase;
        let laborBaseAlreadyBurdened = false;
        if (laborCalc?.total_base_cost > 0) {
            laborBase = this._round(laborCalc.total_base_cost);
            laborBaseAlreadyBurdened = true;
            console.log(`[Export] Labor from LABOR_CALCULATOR: $${laborBase.toLocaleString()} (${laborCalc.total_hours || 0} hrs) — burden already included`);
        } else if (bomLabor > 0) {
            laborBase = this._round(bomLabor);
            console.log(`[Export] Labor from BOM categories: $${laborBase.toLocaleString()} (raw — burden will be applied)`);
        } else {
            laborBase = this._round(materials * 0.50);
            console.warn(`[Export] No labor data available — estimating as 50% of materials: $${laborBase.toLocaleString()}`);
        }

        const matSell = this._round(materials * (1 + matPct));
        const labSell = this._round(laborBase * (1 + labPct));
        const eqSell = this._round(equipment * (1 + eqPct));
        const subSell = this._round(subs * (1 + subPct));
        // Cluster-1C: skip burden if laborBase already includes it
        const burden = (includeBurden && !laborBaseAlreadyBurdened) ? this._round(laborBase * burdenRate) : 0;

        // Wave-15 (Cluster-7A — Option A): transit adders on RAW direct cost.
        // The deterministic path historically had NO concept of transit-station
        // overhead (RRPLI, contractor liability, mobilization, RWIC days,
        // crew compliance, per diem & mileage, multi-mob, testing, documentation).
        // The 3D Engine had all of these but stacked them on top of marked-up
        // sell totals, producing pyramid compounding (~25-40% inflation per pass).
        //
        // Slim, defensible alternative: ONE 18% adder on RAW direct cost
        // (materials + equipment + subs + laborBase, NO markup). This matches
        // the legitimate Amtrak transit cost loading on direct cost without
        // compounding through the markup chain. Calibrated against martinez_bafo
        // ($1.97M / 69 cams) — direct cost ratio is ~6.4×, of which 1.5× material
        // markup + 1.5× labor markup + bonds + contingency = ~2.5× by themselves;
        // the remaining gap is transit overhead at ~18% of direct.
        let transitAdd = 0;
        if (state.isTransitRailroad) {
            const directCost = materials + equipment + subs + laborBase;
            transitAdd = this._round(directCost * 0.18);
        }
        // Use travel from BOM if it was already injected; otherwise compute from Stage 6.
        // This prevents double-counting when injectTravelIntoBOM adds travel as a BOM category.
        let travel = 0;
        if (bomTravel > 0) {
            travel = this._round(bomTravel);
            console.log(`[Export] Travel from BOM category: $${travel.toLocaleString()} (not adding Stage 6 to avoid double-count)`);
        } else if (state.travel?.enabled && typeof computeTravelIncidentals === 'function') {
            travel = this._round(computeTravelIncidentals().grandTotal || 0);
        }

        // AUDIT FIX #7: Bond rate from pricing tier (budget=1.5%, mid=2%, premium=2.5%)
        const pricingTier = state.pricingTier || state.pricingConfig?.tier || 'mid';
        const tierBondRates = { budget: 0.015, mid: 0.02, premium: 0.025 };
        const bondsPct = tierBondRates[pricingTier] || 0.02;
        // ─── CANONICAL FORMULA (HANDOFF.md: "contingency × 10% (travel excluded)") ───
        // Travel is a pass-through: it is NOT marked up by bonds, NOT included in the
        // contingency base, and added LAST to the grand total. Pre-fix travel was rolled
        // into preBondSubtotal, causing bonds+contingency to be applied to travel — a
        // systematic ~12% overstatement of every travel dollar on every bid.
        //   profitSubtotal     = mat + lab + eq + sub + burden           (no travel)
        //   bonds              = profitSubtotal × bondsPct
        //   preContingencyBase = profitSubtotal + bonds
        //   contingency        = preContingencyBase × contingencyPct     (no travel)
        //   grandTotal         = preContingencyBase + contingency + travel
        // Wave-15: include transit adders in profitSubtotal so bonds + contingency apply.
        const profitSubtotal = this._round(matSell + labSell + eqSell + subSell + burden + transitAdd);
        const bonds = this._round(profitSubtotal * bondsPct);
        const preContingencyBase = this._round(profitSubtotal + bonds);
        const contingency = this._round(preContingencyBase * contingencyPct);
        const subtotal = preContingencyBase; // kept for output-contract compatibility
        const grandTotal = this._round(preContingencyBase + contingency + travel);

        // ── 3D Engine Reference Comparison + Cluster-7A Divergence Guard ──
        // The divergence check is meant to catch markup-stacking bugs in either
        // cost-buildup path. To do that, it MUST compare the raw cost-buildup
        // outputs of the two paths — not the post-hoc adjusted (calibrated or
        // clamped) value, which intentionally diverges from deterministic on
        // transit bids anchored to won-bid benchmarks.
        //
        // v5.129.4 fix: prefer state._engine3DResult._formulaTotalRaw when present.
        // That field captures the raw 3D engine output BEFORE the transit
        // calibration block (formula-engine-3d.js line ~836) and BEFORE the
        // det × 1.30 ref clamp (export-engine.js line ~1037). Pre-fix the
        // divergence warning compared `grandTotalSELL` (which is mutated by
        // calibration AND clamping) against deterministic, producing a
        // guaranteed false positive on every calibrated transit bid because the
        // ref-clamp ceiling is exactly det × 1.30 (= +30% by construction)
        // and the divergence threshold is 15%.
        const engine3DResult = state._engine3DResult;
        const engine3DRaw = engine3DResult?._formulaTotalRaw ?? engine3DResult?.grandTotalSELL;
        const engine3DFinal = engine3DResult?.grandTotalSELL;
        if (engine3DRaw && engine3DRaw > 1000 && grandTotal > 1000) {
            const delta = engine3DRaw - grandTotal;
            const deltaPct = grandTotal > 0 ? ((delta / grandTotal) * 100).toFixed(1) : 'N/A';
            const absPct = Math.abs(parseFloat(deltaPct));
            const isCalibrated = engine3DResult?._calibrated === true;
            const isClamped = engine3DResult?._refClamped === true;
            const adjLabel = isCalibrated || isClamped
                ? ` (3D final after ${[isCalibrated && 'calibration', isClamped && 'clamp'].filter(Boolean).join('+')}: $${engine3DFinal?.toLocaleString()})`
                : '';
            console.log(`[Export] 📊 3D Engine comparison (RAW): $${engine3DRaw.toLocaleString()} vs computed $${grandTotal.toLocaleString()} (delta: ${delta > 0 ? '+' : ''}$${delta.toLocaleString()}, ${deltaPct}%)${adjLabel}`);
            // Wave-15: tightened threshold 25% → 15%. With Cluster-7A's transit
            // adders in the deterministic path, the two formulas should agree
            // within ~10% on healthy inputs. >15% indicates a real divergence
            // worth investigating, not normal formula drift.
            if (absPct > 15) {
                console.warn(`[Export] ⚠️ COST-BUILDUP DIVERGENCE: 3D Engine RAW and deterministic breakdown disagree by ${deltaPct}% on the same BOM. One of them has a markup-stacking bug. Investigate before shipping.`);
                state._pathDivergenceWarning = {
                    engine3DTotal: engine3DRaw,
                    engine3DFinal,
                    computedTotal: grandTotal,
                    deltaPct: parseFloat(deltaPct),
                    rawComparison: true,
                    msg: `Two cost-buildup paths disagree by ${deltaPct}% (raw 3D vs deterministic) — review _computeFullBreakdown vs FormulaEngine3D`,
                    ts: new Date().toISOString(),
                };
            } else {
                delete state._pathDivergenceWarning;
            }
        }

        // AUDIT FIX #6: G&A/Overhead is embedded in markup percentages (material markup, labor markup)
        // and explicitly broken out as burden (payroll taxes, insurance, etc.). No separate G&A line needed.
        // The breakdown covers: direct costs + markup (OH+profit) + burden + travel + bonds + contingency.
        return {
            materials, equipment, subs, laborBase,
            matPct, labPct, eqPct, subPct,
            matSell, labSell, eqSell, subSell,
            burden, burdenRate: includeBurden ? burdenRate : 0,
            transitAdd,
            travel, bonds, bondsPct, subtotal, contingency, contingencyPct, grandTotal,
            gaNote: 'G&A/overhead is included in material and labor markup percentages'
        };
    },

    // v5.128.15 Stage 2: Hard guards on the bid total.
    // Runs the proposed total against a deterministic cost buildup and clamps
    // if it's absurdly off. Applied to any grand total before it's locked and
    // shipped to the BOM / proposal / UI.
    //
    //   costBuildup = _computeFullBreakdown(state, bom).grandTotal
    //                 (fully loaded: materials + markup + labor + markup
    //                  + burden + bonds + contingency + travel)
    //   floor       = costBuildup × 1.08   (minimum 8% margin)
    //   ceiling     = costBuildup × 2.0    (maximum ~50% margin)
    //
    // Records state._bidTotalGuardClamp = { raw, clamped, bound, costBuildup }
    // when a clamp fires so the UI can show a warning banner.
    //
    // Motivation: Amtrak Martinez shipped $4,500,792 when the winning bid was
    // $1,866,000 — 2.4× over. The 3D Formula Engine's transit multipliers
    // compounded a plausible cost into an absurd number. Calibration usually
    // catches this but relies on benchmark data being present and correct.
    // This guard is the last line of defense regardless of formula bugs.
    // Cluster-3A fix (2026-04-25): final per-device sanity layer.
    // Catches bids that pass _applyBidTotalGuards but are still wildly
    // over benchmark on a per-device basis. Sets state._sanityWarning
    // for UI display; does NOT auto-clamp (user must approve override).
    _finalBidSanityCheck(proposedTotal, state, bom) {
        if (!bom?.categories?.length || !proposedTotal) return { proposedTotal, violations: [] };

        // v5.128.20 (post-wave-13): the original $6K/device transit ceiling was a round-
        // number guess that had no grounding in the benchmark data. The real Amtrak
        // benchmarks are PER-CAMERA ($28,495/cam BAFO), not per-device. For a CCTV-
        // dominated transit job, cameras carry 90%+ of cost while cheap door/network
        // hardware (readers, switches, contacts) dilutes the per-device average down
        // to ~$10K — which trips $6K/device on every legitimate transit bid.
        //
        // New behavior: count cameras AND devices separately. For transit, the
        // primary check is per-camera vs the benchmark. Per-device is kept as a
        // softer secondary check at a more realistic threshold.

        const camRe = /camera|dome|bullet|ptz|fisheye|panoram|turret|lpr/i;
        const camExclude = /mount|bracket|license|sd\s*card|cable|adapter|housing|power\s*supply|surge|software|warranty|accessor/i;
        const deviceRe = /camera|reader|switch|nvr|server|sensor|panel|controller|strike|maglock|rex|monitor|station|phone/i;

        let cameraCount = 0;
        let deviceCount = 0;
        for (const cat of (bom.categories || [])) {
            for (const it of (cat.items || [])) {
                const name = String(it.item || it.name || it.description || '').toLowerCase();
                const unit = String(it.unit || '').toLowerCase();
                const qty = Number(it.qty || 0);
                if (qty <= 0) continue;
                if (unit !== 'ea' && unit !== 'each') continue;
                if (camRe.test(name) && !camExclude.test(name)) cameraCount += qty;
                if (deviceRe.test(name)) deviceCount += qty;
            }
        }

        const violations = [];

        // ─── Transit-CCTV path: per-CAMERA ceiling vs Amtrak benchmark ───
        if (state.isTransitRailroad && cameraCount >= 5 && typeof PRICING_DB !== 'undefined' && PRICING_DB.amtrakBenchmarks?.actualBids) {
            const perCam = proposedTotal / cameraCount;
            const bids = Object.values(PRICING_DB.amtrakBenchmarks.actualBids).filter(b => b.cameras > 0 && b.total > 0);
            if (bids.length > 0) {
                const perCamBenchmarks = bids.map(b => b.total / b.cameras);
                const maxBenchmark = Math.max(...perCamBenchmarks);   // worst legit Amtrak per-cam (~$29,497)
                const avgBenchmark = perCamBenchmarks.reduce((a, b) => a + b, 0) / perCamBenchmarks.length;
                // Critical if >150% of the worst legit Amtrak benchmark
                const PER_CAM_CRITICAL = maxBenchmark * 1.50;
                // Warning if >130% of the average Amtrak benchmark
                const PER_CAM_WARNING = avgBenchmark * 1.30;
                if (perCam > PER_CAM_CRITICAL) {
                    violations.push({
                        type: 'perCameraCriticalCeiling',
                        severity: 'critical',
                        msg: `$${Math.round(perCam).toLocaleString()}/camera exceeds 150% of worst Amtrak benchmark ($${Math.round(PER_CAM_CRITICAL).toLocaleString()}/cam, max benchmark $${Math.round(maxBenchmark).toLocaleString()}/cam).`,
                    });
                } else if (perCam > PER_CAM_WARNING) {
                    violations.push({
                        type: 'perCameraWarning',
                        severity: 'warning',
                        msg: `$${Math.round(perCam).toLocaleString()}/camera is ${Math.round(((perCam / avgBenchmark) - 1) * 100)}% above the average Amtrak benchmark ($${Math.round(avgBenchmark).toLocaleString()}/cam).`,
                    });
                }
            }
        }

        // ─── Non-transit path: per-device ceiling (unchanged behavior) ───
        if (!state.isTransitRailroad && deviceCount >= 5) {
            const perDevice = proposedTotal / deviceCount;
            const HARD_CEILING = 4500;
            if (perDevice > HARD_CEILING) {
                violations.push({
                    type: 'absoluteCeiling',
                    severity: 'critical',
                    msg: `$${Math.round(perDevice).toLocaleString()}/device exceeds hard ceiling $${HARD_CEILING.toLocaleString()}/device for non-transit project.`,
                });
            }
        }

        // ─── Soft secondary: per-device sanity for transit (no longer fires on every CCTV-heavy bid) ───
        if (state.isTransitRailroad && deviceCount >= 5) {
            const perDevice = proposedTotal / deviceCount;
            // Raised from $6K to $15K — cameras carry the cost, mixed-discipline transit
            // jobs settle at $8-$12K/device, $15K+ is genuinely worth flagging
            const SOFT_CEILING = 15000;
            if (perDevice > SOFT_CEILING) {
                violations.push({
                    type: 'perDeviceSoftCeiling',
                    severity: 'warning',
                    msg: `$${Math.round(perDevice).toLocaleString()}/device exceeds soft per-device ceiling ($${SOFT_CEILING.toLocaleString()}/dev) for transit. Often legitimate when cameras dominate, but worth a sanity check.`,
                });
            }
        }

        // Dummy var so the legacy `perDevice` variable name still resolves for the warning state shape below
        const perDevice = deviceCount > 0 ? proposedTotal / deviceCount : 0;

        if (violations.length > 0) {
            state._sanityWarning = {
                proposedTotal, deviceCount, perDevice: Math.round(perDevice),
                violations,
                ts: new Date().toISOString(),
            };
            console.error(`[Sanity] ⛔ FINAL BID SANITY CHECK FAILED:`);
            for (const v of violations) console.error(`[Sanity]   ${v.severity.toUpperCase()}: ${v.msg}`);
            console.error(`[Sanity]   Bid will ship at $${proposedTotal.toLocaleString()} but UI must show warning + require user approval.`);
        } else {
            // Clear any prior warning
            delete state._sanityWarning;
        }
        return { proposedTotal, violations };
    },

    _applyBidTotalGuards(proposedTotal, state, bom, sourceLabel) {
        if (!bom?.categories?.length || !proposedTotal || proposedTotal <= 1000) return proposedTotal;
        // Cluster-3B fix (2026-04-25): denominator is now RAW direct cost
        // (materials + labor + equipment + subs, NO markup), not the already-
        // marked-up grandTotal. Pre-fix: ceiling = grandTotal × 2.0 = sell × 2
        // ≈ raw × 4, which approved any plausible bid up to 4× direct cost.
        // That ceiling permitted exactly the $3.14M Martinez overshoot.
        // Now: floor = direct × 1.30 (min 30% margin), ceiling = direct ×
        // 2.80 (max ~64% margin). Industry healthy band on transit PW work
        // is 1.6× to 2.4×; we widen modestly to avoid false positives but
        // tight enough to catch bugs that 4×-pad the bid.
        let directCost = 0;
        let oldCostBuildup = 0;
        try {
            const breakdown = this._computeFullBreakdown(state, bom);
            const m = Number(breakdown?.materials || 0);
            const e = Number(breakdown?.equipment || 0);
            const s = Number(breakdown?.subs || 0);
            const l = Number(breakdown?.laborBase || 0);
            directCost = m + e + s + l;
            oldCostBuildup = Number(breakdown?.grandTotal || 0);
        } catch (e) {
            console.warn(`[Guards] Cost buildup computation failed — skipping guards:`, e?.message || e);
            return proposedTotal;
        }
        if (!directCost || directCost <= 1000) {
            // Fallback to old denominator if direct-cost extraction failed
            if (!oldCostBuildup || oldCostBuildup <= 1000) return proposedTotal;
            directCost = oldCostBuildup * 0.55;  // approximate raw cost as 55% of fully-loaded total
        }

        const floor = this._round(directCost * 1.30);
        const ceiling = this._round(directCost * 2.80);
        // Keep `costBuildup` in scope for the existing log lines below
        const costBuildup = directCost;

        if (proposedTotal < floor) {
            state._bidTotalGuardClamp = {
                raw: proposedTotal, clamped: floor, bound: 'floor',
                costBuildup, source: sourceLabel,
                reason: `Bid total $${proposedTotal.toLocaleString()} was below the 8% margin floor ($${floor.toLocaleString()}) over deterministic cost buildup ($${costBuildup.toLocaleString()}). Clamped up to protect margin.`,
            };
            return floor;
        }
        if (proposedTotal > ceiling) {
            state._bidTotalGuardClamp = {
                raw: proposedTotal, clamped: ceiling, bound: 'ceiling',
                costBuildup, source: sourceLabel,
                reason: `Bid total $${proposedTotal.toLocaleString()} exceeded 2× the deterministic cost buildup ($${costBuildup.toLocaleString()}, ceiling $${ceiling.toLocaleString()}). Clamped down to protect against formula-engine overshoot.`,
            };
            this._finalBidSanityCheck(ceiling, state, bom);
            return ceiling;
        }
        // In-range: clear any prior clamp
        delete state._bidTotalGuardClamp;
        // Cluster-3A: per-device sanity check on the in-range bid too.
        this._finalBidSanityCheck(proposedTotal, state, bom);
        return proposedTotal;
    },

    // ─── Get fully loaded bid total ──
    _getFullyLoadedTotal(state, bom) {
        // v5.128.12: Single source of truth for the bid total.
        // First successful computation locks onto state._lockedBidTotal so that
        // every subsequent export path (BOM xlsx, proposal .doc, master report,
        // JSON export, UI card) returns the SAME number.
        //
        // Before this lock, the proposal and BOM were both calling this function
        // with slightly different `bom` arguments (filtered vs. re-extracted) and
        // different state snapshots. That produced $4,500,792 on the proposal and
        // $4,160,850 on the BOM for the same bid — a $340K gap caused purely by
        // call-site race, not by any actual disagreement about the price.
        //
        // The lock is cleared by _clearBidTotalLock() whenever pricing inputs
        // change (markup edits, BOM edits, 3D engine re-run, discipline toggle).
        if (state?._lockedBidTotal && state._lockedBidTotal > 1000) {
            console.log(`[Export] 🔒 Using locked bid total: $${state._lockedBidTotal.toLocaleString()} (source: ${state._lockedBidTotalSource || 'unknown'})`);
            return state._lockedBidTotal;
        }

        // DEBUG: Log what brain results we have
        console.log(`[Export] brainResults available: ${!!state.brainResults}`);
        if (state.brainResults) {
            console.log(`[Export] wave3_85_corrected: ${!!state.brainResults.wave3_85_corrected}, corrected_grand_total: ${state.brainResults.wave3_85_corrected?.corrected_grand_total}`);
            console.log(`[Export] wave2_5_fin: ${!!state.brainResults.wave2_5_fin}, FINANCIAL_ENGINE: ${!!state.brainResults.wave2_5_fin?.FINANCIAL_ENGINE}`);
            if (state.brainResults.wave2_5_fin?.FINANCIAL_ENGINE) {
                const fe = state.brainResults.wave2_5_fin.FINANCIAL_ENGINE;
                console.log(`[Export] Financial Engine project_summary: ${JSON.stringify(fe.project_summary || 'MISSING').substring(0, 500)}`);
            }
        }

        // Compute deterministic travel/incidentals from Stage 6 (overrides AI travel)
        let stage6Travel = 0;
        if (state.travel?.enabled && typeof computeTravelIncidentals === 'function') {
            const tCosts = computeTravelIncidentals();
            stage6Travel = this._round(tCosts.grandTotal || 0);
            console.log(`[Export] Stage 6 Travel & Incidentals: $${stage6Travel.toLocaleString()}`);
        }

        // 3D Formula Engine — runs for UI card rendering and as a benchmark cross-check.
        //
        // Wave-15 (Cluster-7A — Option A + B layered):
        //   Pre-fix this block SHIPPED the 3D Engine value as the bid total for transit
        //   projects, with calibration scaling up to match Amtrak BAFO benchmarks. That
        //   produced bids that disagreed with the deterministic _computeFullBreakdown
        //   path by 30%+ on the same BOM (the live Amtrak Martinez bid: 3D shipped $2.02M,
        //   deterministic computed $1.51M — a $510K gap on identical inputs). Multiple
        //   audits confirmed the two formulas are STRUCTURALLY different, not parameter
        //   variants, so they cannot be reconciled by tuning constants.
        //
        //   Option A (PRIMARY): the deterministic _computeFullBreakdown is now the single
        //   source of truth even for transit. Cluster-7A added a slim 18% transit adder
        //   on raw direct cost so deterministic produces transit-realistic numbers
        //   without needing the 3D Engine's pyramid markup stack.
        //
        //   Option B (DEFENSE-IN-DEPTH): the 3D Engine result is still computed and
        //   stashed on state._engine3DResult so the UI can show it as a benchmark
        //   reference card. We also clamp it to deterministic × 1.30 here so even if
        //   another code path ever consumes it as the bid value, it cannot ship
        //   absurdly high.
        //
        //   Net effect: same number ships from 3D card, deterministic breakdown,
        //   proposal generator, BOM xlsx, master report — divergence eliminated.
        if (typeof FormulaEngine3D !== 'undefined' && bom?.categories?.length > 0) {
            try {
                const result3D = FormulaEngine3D.computeBid(state, bom);
                if (result3D?.grandTotalSELL > 1000) {
                    // Compute the deterministic baseline so we can clamp the 3D reference
                    // value (Option B). Doing it here AND in Priority 2 below is fine —
                    // the work is cheap and Priority 2 will use its own fresh computation
                    // for the actual ship value.
                    let detRefTotal = 0;
                    try {
                        const detRef = this._computeFullBreakdown(state, bom);
                        detRefTotal = Number(detRef?.grandTotal || 0);
                    } catch (e) { /* swallow — clamp becomes no-op */ }

                    const raw3D = this._round(result3D.grandTotalSELL);
                    if (detRefTotal > 1000) {
                        const refCeiling = this._round(detRefTotal * 1.30);
                        if (raw3D > refCeiling) {
                            console.warn(`[Export] 🛡️ 3D Engine reference clamped: $${raw3D.toLocaleString()} → $${refCeiling.toLocaleString()} (deterministic × 1.30 ceiling). Formula was ${(((raw3D / detRefTotal) - 1) * 100).toFixed(1)}% above deterministic.`);
                            result3D.grandTotalSELL = refCeiling;
                            result3D._refClamped = true;
                            result3D._refClampedFrom = raw3D;
                        }
                    }
                    state._engine3DResult = result3D;

                    if (state.isTransitRailroad) {
                        console.log(`[Export] 🚂 3D Formula Engine (TRANSIT): $${this._round(result3D.grandTotalSELL).toLocaleString()} (GM: ${result3D.grossMarginPct}%)${result3D._calibrated ? ' [CALIBRATED to Amtrak actuals]' : ''}${result3D._refClamped ? ' [CLAMPED to det×1.30]' : ''}`);
                        if (result3D._calibrated) {
                            console.log(`[Export]   Calibrated 3D Engine is the bid-of-record (anchored to ${result3D._calibrationBenchmark || 'won-bid benchmark'}). Deterministic is fallback.`);
                        } else {
                            console.log(`[Export]   3D Engine NOT calibrated (no benchmark match). Deterministic _computeFullBreakdown is the bid-of-record.`);
                        }
                    } else {
                        console.log(`[Export] 📊 3D Formula Engine (REFERENCE ONLY): $${this._round(result3D.grandTotalSELL).toLocaleString()} (GM: ${result3D.grossMarginPct}%)${result3D._calibrated ? ' [CALIBRATED]' : ''}${result3D._refClamped ? ' [CLAMPED to det×1.30]' : ''}`);
                    }
                }
            } catch (err) {
                console.warn(`[Export] 3D Formula Engine calc error: ${err.message}`);
            }
        }

        // ═══ UNIFIED GRAND TOTAL — uses SAME formula as proposal-generator ═══
        // FIX: Previously used Financial Engine AI as Priority 1, which produced a
        // DIFFERENT number than _computeFullBreakdown (used by proposals). This caused
        // the Master Report, export JSON, and Proposal to show three different totals.
        // Now: deterministic BOM computation is ALWAYS primary. AI is logged for reference only.

        // Priority 1 (HIGHEST): Bid Strategy — when user explicitly applied per-category
        // markups and confidence-based contingency, that IS the bid price.
        // FIX: Previously at Priority 2 (never reached because _computeFullBreakdown
        // always succeeds), making Apply Strategy button cosmetic-only.
        if (state.bidStrategy?.applied) {
            const result = this.applyBidStrategy?.(state);
            if (result?.grandTotalWithStrategy > 1000) {
                // Also compute base breakdown for reference logging
                if (bom?.categories?.length > 0) {
                    const baseBreakdown = this._computeFullBreakdown(state, bom);
                    const delta = result.grandTotalWithStrategy - baseBreakdown.grandTotal;
                    console.log(`[Export] 📊 Base computation reference: $${baseBreakdown.grandTotal.toLocaleString()} (strategy delta: ${delta > 0 ? '+' : ''}$${delta.toLocaleString()})`);
                }
                const rawStrategyTotal = this._round(result.grandTotalWithStrategy);
                // v5.128.15 Stage 2: guard user-applied strategies too. User
                // might have accidentally applied 200% markup or similar.
                const strategyTotal = this._applyBidTotalGuards(rawStrategyTotal, state, bom, 'Bid Strategy (user-applied)');
                if (strategyTotal !== rawStrategyTotal) {
                    console.warn(`[Export] ⚠️ Bid Strategy total GUARD-CLAMPED from $${rawStrategyTotal.toLocaleString()} to $${strategyTotal.toLocaleString()}`);
                }
                console.log(`[Export] ✅ Grand total from Bid Strategy (user-applied): $${strategyTotal.toLocaleString()}`);
                state._lockedBidTotal = strategyTotal;
                state._lockedBidTotalSource = 'bid-strategy';
                return strategyTotal;
            }
        }

        // ── Priority 1.5: Calibrated 3D Engine (transit projects with benchmark anchor) ──
        // v5.129.2 fix (2026-04-25): use the calibrated 3D engine as the bid-of-record
        // for transit projects when calibration succeeded against a real won-bid benchmark.
        //
        // EMPIRICAL VALIDATION — Amtrak Sacramento (won at $1,734,000, sacramento_rev2):
        //   - Calibrated 3D Engine:       $1,751,091  (+1.0% vs award) ✅
        //   - Deterministic computation:  $2,321,809  (+33.9% vs award) ❌ would have lost the
        //                                                                  bid by ~$590K
        //
        // The previous architecture (Wave-15 Cluster-7A) made deterministic the bid-of-record
        // because pre-calibration 3D was unreliable. With sacramento_rev2 + martinez_bafo +
        // 5 other benchmarks now seeded in pricing-database.js AND the engine's existing
        // calibration sanity gates (camera-ratio [0.4, 2.5], scale-factor [0.40, 1.50]),
        // calibrated 3D is anchored to empirical reality. Deterministic is a synthetic
        // markup chain that drifts.
        //
        // Falls through to Priority 2 (deterministic) if 3D is not calibrated — preserves
        // existing behavior for non-transit and pre-benchmark scenarios.
        if (state.isTransitRailroad &&
            state._engine3DResult?._calibrated === true &&
            state._engine3DResult.grandTotalSELL > 1000) {
            const calibrated = this._round(state._engine3DResult.grandTotalSELL);
            const benchmarkKey = state._engine3DResult._calibrationBenchmark || 'unknown';
            console.log(`[Export] 🚂 ✅ Using calibrated 3D Engine as bid-of-record: $${calibrated.toLocaleString()} (anchored to ${benchmarkKey})`);

            // Diagnostic: log deterministic for reference, but don't use it.
            // Travel is added on top of the calibrated total because the calibration
            // benchmarks are project-cost only — travel is a pass-through.
            if (bom?.categories?.length > 0) {
                try {
                    const det = this._computeFullBreakdown(state, bom);
                    if (det?.grandTotal > 1000) {
                        const delta = det.grandTotal - calibrated;
                        const deltaPct = ((delta / calibrated) * 100).toFixed(1);
                        console.log(`[Export]   Deterministic reference: $${det.grandTotal.toLocaleString()} (${delta > 0 ? '+' : ''}${deltaPct}% vs calibrated). Calibrated wins — anchored to actual won-bid data.`);
                    }
                } catch (e) { /* swallow — diagnostic only */ }
            }

            // Add travel on top (pass-through; benchmarks don't include project travel).
            const finalTotal = stage6Travel > 0 ? this._round(calibrated + stage6Travel) : calibrated;
            if (stage6Travel > 0) {
                console.log(`[Export]   + Stage 6 Travel: $${stage6Travel.toLocaleString()} → final $${finalTotal.toLocaleString()}`);
            }

            state._lockedBidTotal = finalTotal;
            state._lockedBidTotalSource = `calibrated 3D engine (${benchmarkKey})`;
            return finalTotal;
        }

        // Priority 2 (FALLBACK): Deterministic BOM computation with user-configured markups
        // Used for non-transit projects, or transit projects where 3D engine calibration
        // was rejected (camera count out of benchmark range, scale factor out of bounds).
        // This matches proposal-generator.js _extractGrandTotal exactly.
        if (bom?.categories?.length > 0) {
            const breakdown = this._computeFullBreakdown(state, bom);
            if (breakdown.grandTotal > 1000) {
                // Log Financial Engine comparison for diagnostics (never use as actual total)
                const finEngine = state.brainResults?.wave2_5_fin?.FINANCIAL_ENGINE;
                if (finEngine?.project_summary?.grand_total > 1000) {
                    const aiTotal = this._round(finEngine.project_summary.grand_total);
                    const delta = aiTotal - breakdown.grandTotal;
                    const deltaPct = ((delta / breakdown.grandTotal) * 100).toFixed(1);
                    console.log(`[Export] 📊 Financial Engine AI reference: $${aiTotal.toLocaleString()} (delta: ${delta > 0 ? '+' : ''}$${delta.toLocaleString()}, ${deltaPct}%) — using deterministic computation`);
                }
                console.log(`[Export] ✅ Grand total from deterministic BOM computation: $${breakdown.grandTotal.toLocaleString()}`);
                state._lockedBidTotal = breakdown.grandTotal;
                state._lockedBidTotalSource = 'deterministic BOM breakdown';
                return breakdown.grandTotal;
            }
        }

        // Priority 3: Financial Engine AI total (last resort — only if BOM parsing failed)
        const finEngine = state.brainResults?.wave2_5_fin?.FINANCIAL_ENGINE;
        if (finEngine?.project_summary?.grand_total > 1000) {
            let val = this._round(finEngine.project_summary.grand_total);
            if (stage6Travel > 0) {
                const aiTravel = this._round(finEngine.project_summary.total_travel || 0);
                const travelDelta = stage6Travel - aiTravel;
                const contingencyAdj = this._round(travelDelta * 0.10);
                val = this._round(val + travelDelta + contingencyAdj);
            }
            console.warn(`[Export] ⚠️ BOM parse failed — using Financial Engine AI total: $${val.toLocaleString()}`);
            return val;
        }

        // Priority 4: Raw BOM + 10% (emergency fallback)
        const rawTotal = bom?.grandTotal || 0;
        console.warn(`[Export] Grand total fallback: raw BOM $${rawTotal} + 10%`);
        return this._round(rawTotal * 1.1);
    },

    // ─── Parse AI analysis into structured sections ────────────
    _parseAnalysisSections(markdown) {
        if (!markdown) return {};
        try {
            const sections = {};
            const headerRegex = /^#{1,3}\s+(.+)$/gm;
            let match;
            const headers = [];

            while ((match = headerRegex.exec(markdown)) !== null) {
                headers.push({ title: match[1].trim(), index: match.index, end: 0 });
            }

            // Fallback: if no markdown headers found, try bold-text section headers
            if (headers.length === 0) {
                const boldRegex = /^\*\*([A-Z][^*]+)\*\*\s*$/gm;
                while ((match = boldRegex.exec(markdown)) !== null) {
                    headers.push({ title: match[1].trim(), index: match.index, end: 0 });
                }
            }

            // Final fallback: return the whole analysis as a single section
            if (headers.length === 0) {
                return { full_analysis: { title: 'Full Analysis', content: markdown } };
            }

            for (let i = 0; i < headers.length; i++) {
                const start = headers[i].index;
                const end = i + 1 < headers.length ? headers[i + 1].index : markdown.length;
                const content = markdown.substring(start, end).trim();
                const key = headers[i].title
                    .toLowerCase()
                    .replace(/[^a-z0-9\s]/g, "")
                    .replace(/\s+/g, "_")
                    .substring(0, 50);
                sections[key] = {
                    title: headers[i].title,
                    content: content,
                };
            }
            return sections;
        } catch (err) {
            console.error('[SmartPlans] Section parser error:', err);
            return { full_analysis: { title: 'Full Analysis', content: markdown } };
        }
    },

    // ─── Build phase assignments for SmartPM SOV import ─────────
    _buildPhaseAssignments(state, bom) {
        const phases = state.bidPhases || [{ id: 'base', name: 'Base Bid', type: 'base', categoryIndices: [], includeInProposal: true }];
        const assignedElsewhere = new Set();
        phases.forEach(p => { if (p.id !== 'base') (p.categoryIndices || []).forEach(ci => assignedElsewhere.add(ci)); });
        const assignments = {};
        bom.categories.forEach((cat, ci) => {
            const phase = phases.find(p => p.id !== 'base' && (p.categoryIndices || []).includes(ci));
            assignments[cat.name] = {
                phaseId: phase ? phase.id : 'base',
                phaseName: phase ? phase.name : 'Base Bid',
                phaseType: phase ? phase.type : 'base',
            };
        });
        return assignments;
    },

    // ─── Build bid phases export data ─────────────────────────────
    _buildBidPhasesExport(state, bom) {
        const phases = state.bidPhases || [{ id: 'base', name: 'Base Bid', type: 'base', categoryIndices: [], includeInProposal: true }];
        const assignedElsewhere = new Set();
        phases.forEach(p => { if (p.id !== 'base') (p.categoryIndices || []).forEach(ci => assignedElsewhere.add(ci)); });
        const result = phases.map(phase => {
            let catIndices;
            if (phase.type === 'base') {
                catIndices = [];
                bom.categories.forEach((_, ci) => { if (!assignedElsewhere.has(ci)) catIndices.push(ci); });
            } else {
                catIndices = phase.categoryIndices || [];
            }
            let total = 0;
            const categories = catIndices.map(ci => {
                if (!bom.categories[ci]) return null;
                total += bom.categories[ci].subtotal;
                return { index: ci, name: bom.categories[ci].name, subtotal: bom.categories[ci].subtotal };
            }).filter(Boolean);
            total = this._round(total);
            const displayTotal = phase.type === 'deduct' ? -Math.abs(total) : total;
            return {
                id: phase.id,
                name: phase.name,
                type: phase.type,
                categories: categories,
                total: displayTotal,
                includeInProposal: phase.includeInProposal !== false,
            };
        });
        const totalIfAllAccepted = result.filter(p => p.includeInProposal).reduce((s, p) => s + p.total, 0);
        return { phases: result, totalIfAllAccepted: this._round(totalIfAllAccepted) };
    },

    // ─── Extract RFI data ──────────────────────────────────────
    _extractRFIs(state) {
        // Get RFIs from the step 6 rendering logic (imported from app.js scope)
        const rfis = [];
        if (typeof getRFIsForDisciplines === "function") {
            const rfiData = getRFIsForDisciplines(state.disciplines);
            rfiData.forEach(r => {
                rfis.push({
                    id: r.id,
                    question: r.question,
                    detail: r.detail || "",
                    selected: state.selectedRFIs?.has(r.id),
                });
            });
        }
        return {
            total: rfis.length,
            selected: rfis.filter(r => r.selected).length,
            items: rfis,
        };
    },

    // ─── Extract MDF/IDF Infrastructure from AI analysis ────
    // Multi-strategy parser: tries standard markdown tables, relaxed tables,
    // and falls back to raw text extraction. Never returns empty silently.
    _extractInfrastructure(state) {
        const md = state.aiAnalysis || "";
        if (!md) return { locations: [], source: 'none' };

        try {
            // Strategy 1: Find the MDF/IDF section by heading
            // Matches: ## MDF/IDF MATERIAL BREAKDOWN, ### MDF/IDF/TR Material Breakdown, etc.
            let sectionContent = null;
            const sectionPatterns = [
                /#{1,3}\s*(?:\d+\.\s*)?(?:MDF\/IDF|MDF\/IDF\/TR)[^\n]*/i,
                /#{1,3}\s*(?:\d+\.\s*)?(?:INFRASTRUCTURE|TELECOM|CLOSET|ROOM)[^\n]*(?:MATERIAL|BREAKDOWN|EQUIPMENT)[^\n]*/i,
                /\*\*(?:\d+\.\s*)?(?:MDF\/IDF|MDF\/IDF\/TR)[^*]*\*\*/i,
            ];

            for (const regex of sectionPatterns) {
                const match = regex.exec(md);
                if (match) {
                    const start = match.index;
                    const rest = md.substring(start + match[0].length);
                    // Find next major section (## heading that isn't a room sub-header)
                    const nextSection = rest.search(/\n#{1,2}\s+(?!MDF|IDF|TR|Room|Closet|###)(?=[A-Z])/i);
                    sectionContent = nextSection > -1
                        ? md.substring(start, start + match[0].length + nextSection)
                        : md.substring(start);
                    break;
                }
            }

            if (!sectionContent) return { locations: [], source: 'not_found' };

            // Split into individual room sections using multiple delimiter patterns
            const roomSplitPatterns = [
                /(?=###\s+)/,
                /(?=(?:^|\n)\*\*(?:MDF|IDF|TR|Telecom|Closet|Room)[^*]*\*\*)/im,
                /(?=\n#{4}\s+)/,
            ];

            let roomSplits;
            // Try increasingly relaxed split patterns
            for (const splitPat of roomSplitPatterns) {
                roomSplits = sectionContent.split(splitPat).filter(b => b.trim());
                if (roomSplits.length > 1) break;
            }
            // If no splits found, treat the entire section as one room block
            if (!roomSplits || roomSplits.length <= 1) {
                roomSplits = [sectionContent];
            }

            const locations = [];

            for (const roomBlock of roomSplits) {
                if (!roomBlock.trim()) continue;

                // Multi-strategy room name extraction
                const namePatterns = [
                    /###\s*([^\n]+)/,                                        // ### Header
                    /####\s*([^\n]+)/,                                       // #### Header
                    /\*\*([^*]{3,60})\*\*/,                                   // **Bold text**
                    /^((?:MDF|IDF|TR|Telecom|Closet)[^\n]{0,60})/im,         // Line starting with MDF/IDF/TR
                ];

                let rawName = null;
                for (const np of namePatterns) {
                    const nameMatch = roomBlock.match(np);
                    if (nameMatch) {
                        rawName = nameMatch[1].replace(/\*+/g, '').replace(/#+/g, '').trim();
                        if (rawName && rawName.length > 2 && !rawName.toLowerCase().includes('material breakdown')) break;
                        rawName = null; // Reset if it was a section title, not a room name
                    }
                }
                if (!rawName) continue;

                // Determine type
                const lower = rawName.toLowerCase();
                let type = 'idf';
                if (lower.includes('mdf') || lower.includes('main distribution')) type = 'mdf';
                else if (lower.includes('tr') || lower.includes('telecom room')) type = 'tr';

                // Extract floor, room, building from name or content
                const floorMatch = roomBlock.match(/(?:floor|level)\s*[:#]?\s*([\w\d-]+)/i);
                const roomMatch = roomBlock.match(/(?:room|rm)\s*[:#]?\s*([\w\d-]+)/i);
                const buildingMatch = roomBlock.match(/(?:building|bldg)\s*[:#]?\s*([\w\d\s-]+?)(?:\s*[,|\n])/i);

                // ─── Multi-strategy table parsing ───
                const items = this._parseTableItems(roomBlock);

                // ─── Extract cable quantities from prose text ───
                const cableRuns = this._parseCableRuns(roomBlock, rawName);

                locations.push({
                    name: rawName,
                    type,
                    floor: floorMatch ? floorMatch[1] : null,
                    room_number: roomMatch ? roomMatch[1] : null,
                    building: buildingMatch ? buildingMatch[1].trim() : null,
                    items: items.filter(i => i.item_name && !i.item_name.match(/^[-:]+$/)),
                    cable_runs: cableRuns,
                    raw_content: roomBlock.substring(0, 2000),
                });
            }

            return {
                locations,
                source: 'ai_analysis',
                extracted_at: new Date().toISOString(),
                stats: {
                    total_locations: locations.length,
                    total_items: locations.reduce((s, l) => s + l.items.length, 0),
                    total_cable_runs: locations.reduce((s, l) => s + l.cable_runs.length, 0),
                },
            };
        } catch (err) {
            console.error('[SmartPlans] Infrastructure parser error:', err);
            return {
                locations: [],
                source: 'parse_error',
                error: err.message,
                raw_preview: md.substring(0, 500),
            };
        }
    },

    // ─── Parse equipment table rows with multiple format support ───
    _parseTableItems(roomBlock) {
        const items = [];

        // Strategy 1: Standard pipe-delimited markdown tables
        const tableRows = roomBlock.match(/\|[^|\n]+\|[^|\n]+\|[^\n]*/g) || [];
        let isHeaderRow = true;

        for (const row of tableRows) {
            const cells = row.split('|').map(c => c.trim()).filter(Boolean);
            if (cells.length < 2) continue;
            if (cells[0].match(/^[-:]+$/) || cells.every(c => c.match(/^[-:]+$/))) { isHeaderRow = false; continue; }
            if (isHeaderRow && (cells[0].toLowerCase() === 'item' || cells[0].toLowerCase() === 'equipment' || cells[0].toLowerCase() === 'description')) { isHeaderRow = false; continue; }
            // Skip total/subtotal rows — these re-state category sums and would double-count
            const firstCellLower = cells[0].toLowerCase().replace(/\*+/g, '').trim();
            if (cells[0].includes('continue') || cells[0].includes('...') || /^(total|subtotal|grand\s*total|sum|sub-total)/.test(firstCellLower)) continue;

            let qty = 1, unit = 'ea', unitCost = 0, extCost = 0;

            if (cells.length >= 5) {
                qty = parseFloat(cells[1].replace(/,/g, '')) || 1;
                unit = cells[2].toLowerCase() || 'ea';
                const ucMatch = cells[3].match(/\$?([\d,.]+)/);
                const ecMatch = cells[4].match(/\$?([\d,.]+)/);
                unitCost = ucMatch ? parseFloat(ucMatch[1].replace(/,/g, '')) : 0;
                extCost = ecMatch ? parseFloat(ecMatch[1].replace(/,/g, '')) : (qty * unitCost);
            } else if (cells.length >= 4) {
                // 4-column: Item | Qty | Unit Cost | Total
                qty = parseFloat(cells[1].replace(/,/g, '')) || 1;
                const ucMatch = cells[2].match(/\$?([\d,.]+)/);
                const ecMatch = cells[3].match(/\$?([\d,.]+)/);
                unitCost = ucMatch ? parseFloat(ucMatch[1].replace(/,/g, '')) : 0;
                extCost = ecMatch ? parseFloat(ecMatch[1].replace(/,/g, '')) : (qty * unitCost);
            } else if (cells.length >= 3) {
                const qtyMatch = cells.find(c => c.match(/^[\d.]+$/));
                const costMatch = cells.find(c => c.match(/\$[\d,]+/));
                qty = qtyMatch ? parseFloat(qtyMatch.replace(/,/g, '')) : 1;
                extCost = costMatch ? parseFloat(costMatch.replace(/[\$,]/g, '')) : 0;
                unitCost = qty > 0 ? extCost / qty : 0;
            }

            items.push({
                item_name: cells[0],
                category: this._guessCategory(cells[0]),
                budgeted_qty: qty,
                unit: unit,
                unit_cost: this._round(unitCost),
                budgeted_cost: this._round(extCost),
            });
        }

        // Strategy 2: If no table items found, try bullet-list item extraction
        if (items.length === 0) {
            const bulletItems = roomBlock.match(/^\s*[-*•]\s+(\d+)\s*x?\s+(.+?)(?:\s+@\s*\$?([\d,.]+))?\s*$/gm) || [];
            for (const bi of bulletItems) {
                const bm = bi.match(/[-*•]\s+(\d+)\s*x?\s+(.+?)(?:\s+@\s*\$?([\d,.]+))?\s*$/);
                if (bm) {
                    const qty = parseFloat(bm[1]) || 1;
                    const unitCost = bm[3] ? parseFloat(bm[3].replace(/,/g, '')) : 0;
                    items.push({
                        item_name: bm[2].trim(),
                        category: this._guessCategory(bm[2]),
                        budgeted_qty: qty,
                        unit: 'ea',
                        unit_cost: unitCost,
                        budgeted_cost: this._round(qty * unitCost),
                    });
                }
            }
        }

        // Strategy 3: If still nothing, try numbered list: "1. 48-Port Patch Panel (2)"
        if (items.length === 0) {
            const numberedItems = roomBlock.match(/^\s*\d+\.\s+(.+?)\s*\((\d+)\)\s*$/gm) || [];
            for (const ni of numberedItems) {
                const nm = ni.match(/\d+\.\s+(.+?)\s*\((\d+)\)/);
                if (nm) {
                    items.push({
                        item_name: nm[1].trim(),
                        category: this._guessCategory(nm[1]),
                        budgeted_qty: parseFloat(nm[2]) || 1,
                        unit: 'ea',
                        unit_cost: 0,
                        budgeted_cost: 0,
                    });
                }
            }
        }

        return items;
    },

    // ─── Extract cable run quantities from prose text ───
    _parseCableRuns(roomBlock, roomName) {
        const cableRuns = [];
        const cablePatterns = [
            { regex: /(\d+)\s*(?:Cat\s*6A|CAT6A)\s*(?:drops?|runs?|cables?)/gi, type: 'cat6a' },
            { regex: /(\d+)\s*(?:Cat\s*6|CAT6)(?!A)\s*(?:drops?|runs?|cables?)/gi, type: 'cat6' },
            { regex: /(\d+)\s*(?:Cat\s*5e?|CAT5E?)\s*(?:drops?|runs?|cables?)/gi, type: 'cat5e' },
            { regex: /(\d+)[-\s]*(?:strand|fiber|SM|OS2)\s*(?:fiber|cable|backbone)\s*(?:SM|single[- ]?mode)?/gi, type: 'fiber_sm' },
            { regex: /(\d+)[-\s]*(?:strand|fiber|MM|OM[34])\s*(?:fiber|cable|backbone)\s*(?:MM|multi[- ]?mode)?/gi, type: 'fiber_mm' },
            { regex: /(\d+)\s*(?:RG[- ]?6|coax)\s*(?:cables?|runs?|drops?)/gi, type: 'coax_rg6' },
        ];
        for (const { regex, type: cableType } of cablePatterns) {
            let m;
            while ((m = regex.exec(roomBlock)) !== null) {
                cableRuns.push({
                    cable_type: cableType,
                    budgeted_qty: parseInt(m[1], 10),
                    destination: roomName + ' drops',
                });
            }
        }
        return cableRuns;
    },

    _guessCategory(itemName) {
        const n = itemName.toLowerCase();
        if (n.includes('rack') || n.includes('cabinet')) return 'rack';
        if (n.includes('switch') || n.includes('poe')) return 'switch';
        if (n.includes('patch panel') || n.includes('patch_panel')) return 'patch_panel';
        if (n.includes('fiber panel') || n.includes('fiber enclosure')) return 'fiber_panel';
        if (n.includes('ups') || n.includes('battery')) return 'ups';
        if (n.includes('pdu') || n.includes('power')) return 'pdu';
        if (n.includes('cable management') || n.includes('cable manager')) return 'cable_management';
        if (n.includes('grounding') || n.includes('tgb') || n.includes('tmgb')) return 'grounding';
        if (n.includes('conduit')) return 'conduit';
        if (n.includes('camera') || n.includes('nvr') || n.includes('vms')) return 'cctv';
        if (n.includes('reader') || n.includes('access') || n.includes('credential')) return 'access_control';
        if (n.includes('speaker') || n.includes('display') || n.includes('projector')) return 'av';
        if (n.includes('detector') || n.includes('pull station') || n.includes('strobe')) return 'fire_alarm';
        return 'other';
    },

    // ═══════════════════════════════════════════════════════════
    // WORK BREAKDOWN STRUCTURE GENERATOR
    // Produces a hierarchical WBS from infrastructure data for PM tracking
    // ═══════════════════════════════════════════════════════════
    _buildWorkBreakdown(state) {
        const infra = this._extractInfrastructure(state);
        if (!infra.locations || infra.locations.length === 0) {
            return { phases: [], source: 'none' };
        }

        // Standard ELV construction phases with labor/material split ratios
        const phaseTemplates = [
            {
                code: '1',
                name: 'Rough-In',
                description: 'Pathway installation, cable tray, conduit, backboards, and cable pulling',
                materialPct: 0.15,  // 15% of material budget for pathways/hardware
                laborPct: 0.40,     // 40% of labor budget — most labor-intensive phase
                tasks: ['pathway_install', 'backboard_mount', 'cable_pull', 'firestop']
            },
            {
                code: '2',
                name: 'Trim-Out',
                description: 'Equipment mounting, rack builds, device installation',
                materialPct: 0.60,  // 60% of material budget — equipment and devices
                laborPct: 0.25,     // 25% of labor budget
                tasks: ['rack_build', 'equipment_mount', 'device_install']
            },
            {
                code: '3',
                name: 'Termination & Testing',
                description: 'Cable terminations, patching, testing, and certification',
                materialPct: 0.15,  // 15% — patch cords, connectors, labels
                laborPct: 0.25,     // 25% — skilled termination/testing work
                tasks: ['termination', 'testing', 'certification']
            },
            {
                code: '4',
                name: 'Closeout',
                description: 'Labeling, as-builts, documentation, and owner training',
                materialPct: 0.10,  // 10% — labels, documentation supplies
                laborPct: 0.10,     // 10% — documentation and training
                tasks: ['labeling', 'as_builts', 'documentation', 'training']
            }
        ];

        const taskLabels = {
            pathway_install: 'Pathway & Conduit Installation',
            backboard_mount: 'Backboard / Wall Mount Installation',
            cable_pull: 'Cable Pulling',
            firestop: 'Firestopping',
            rack_build: 'Rack / Cabinet Build',
            equipment_mount: 'Equipment Mounting',
            device_install: 'End Device Installation',
            termination: 'Cable Terminations',
            testing: 'Testing & Certification',
            certification: 'Fluke Test Reports',
            labeling: 'Cable & Port Labeling',
            as_builts: 'As-Built Documentation',
            documentation: 'O&M Manuals',
            training: 'Owner / End-User Training',
        };

        // Calculate per-location budgets from equipment items + cable runs
        const locationBudgets = infra.locations.map(loc => {
            const matTotal = (loc.items || []).reduce((s, i) => s + (i.budgeted_cost || 0), 0);
            const cableQty = (loc.cable_runs || []).reduce((s, r) => s + (r.budgeted_qty || 0), 0);
            // Estimate labor: 0.15 hrs per cable drop + 0.5 hrs per equipment item
            const equipCount = (loc.items || []).length;
            const laborHrs = (cableQty * 0.15) + (equipCount * 0.5);
            return {
                ...loc,
                totalMaterial: matTotal,
                totalCableQty: cableQty,
                totalEquipCount: equipCount,
                estimatedLaborHrs: laborHrs,
            };
        });

        const projectTotalMaterial = locationBudgets.reduce((s, l) => s + l.totalMaterial, 0);
        const projectTotalLabor = locationBudgets.reduce((s, l) => s + l.estimatedLaborHrs, 0);

        // Build hierarchical WBS
        const phases = phaseTemplates.map((phase, phaseIdx) => {
            const phaseWBS = {
                code: phase.code,
                name: phase.name,
                description: phase.description,
                phase: phase.name.toLowerCase().replace(/[-\s]+/g, '_').replace(/[^a-z0-9_]/g, '').replace(/_+/g, '_'),
                task_type: 'phase',
                budgeted_material: this._round(projectTotalMaterial * phase.materialPct),
                budgeted_labor_hrs: Math.round(projectTotalLabor * phase.laborPct * 10) / 10,
                children: [],
            };

            // Create per-location tasks within each phase
            locationBudgets.forEach((loc, locIdx) => {
                const locCode = `${phase.code}.${locIdx + 1}`;
                const locMatBudget = loc.totalMaterial * phase.materialPct;
                const locLaborBudget = loc.estimatedLaborHrs * phase.laborPct;

                const locTask = {
                    code: locCode,
                    name: `${loc.name} — ${phase.name}`,
                    description: `${phase.description} for ${loc.name}`,
                    location_name: loc.name,
                    location_type: loc.type,
                    floor: loc.floor,
                    room_number: loc.room_number,
                    building: loc.building,
                    task_type: 'location_task',
                    phase: phaseWBS.phase,
                    budgeted_material: this._round(locMatBudget),
                    budgeted_labor_hrs: Math.round(locLaborBudget * 10) / 10,
                    children: [],
                };

                // Create individual task items within each location-phase
                phase.tasks.forEach((taskKey, taskIdx) => {
                    const taskCode = `${locCode}.${taskIdx + 1}`;
                    const taskCount = phase.tasks.length;
                    locTask.children.push({
                        code: taskCode,
                        name: taskLabels[taskKey] || taskKey,
                        task_type: 'task',
                        phase: phaseWBS.phase,
                        budgeted_material: this._round(locMatBudget / taskCount),
                        budgeted_labor_hrs: Math.round((locLaborBudget / taskCount) * 10) / 10,
                    });
                });

                phaseWBS.children.push(locTask);
            });

            return phaseWBS;
        });

        return {
            phases,
            source: 'auto_generated',
            generated_at: new Date().toISOString(),
            stats: {
                total_phases: phases.length,
                total_locations: locationBudgets.length,
                total_tasks: phases.reduce((s, p) =>
                    s + p.children.reduce((s2, loc) => s2 + loc.children.length, 0) + p.children.length, 0) + phases.length,
                project_material_budget: this._round(projectTotalMaterial),
                project_labor_hrs: Math.round(projectTotalLabor * 10) / 10,
            },
        };
    },


    // ═══════════════════════════════════════════════════════════
    // BILL OF MATERIALS (BOM) EXPORT — Detailed Excel/CSV
    // ═══════════════════════════════════════════════════════════

    /**
     * Extract all material line items from the AI analysis markdown.
     * Parses tables organized by category/discipline headings and
     * returns structured BOM data.
     */
    _extractBOMFromAnalysis(aiAnalysis) {
        const emptyResult = { categories: [], grandTotal: 0, _warning: 'No BOM data could be extracted from AI analysis' };
        if (!aiAnalysis) return emptyResult;

        try {
            const categories = [];
            let currentCategory = null;

            // Split analysis into lines for processing
            const lines = aiAnalysis.split('\n');
            let inTable = false;
            let headersParsed = false;
            let colMap = {}; // maps column purposes to indices

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Detect category headings (## or ### or **BOLD**)
                const h2Match = line.match(/^#{1,3}\s+(.+)/);
                // AUDIT FIX #8: Also match numbered headings like "1. Structured Cabling" and location-prefixed like "Building A — Cabling"
                const boldMatch = !h2Match && line.match(/^\*\*([^*]{3,80})\*\*\s*$/);
                const numberedMatch = !h2Match && !boldMatch && line.match(/^\d+[\.\)]\s+(.{3,80})$/);
                const heading = h2Match ? h2Match[1].replace(/\*+/g, '').trim()
                    : (boldMatch ? boldMatch[1].trim()
                    : (numberedMatch ? numberedMatch[1].trim() : null));

                if (heading) {
                    // Check if this heading looks like a material/cost category
                    const isCategory = /material|cost|pricing|equipment|cabling|cctv|camera|access|fire|alarm|intrusion|audio|visual|av\b|structured|backbone|infrastructure|mdf|idf|misc|general|conduit|pathway|rack|panel|device|breakdown|bill|bom/i.test(heading);
                    // Exclude summary/rollup sections that re-state subtotals (causes double-counting)
                    const isNonCategory = /confidence|methodology|timeline|schedule|rfi|risk|note|assumption|disclaimer|verification|validation|labor|phase\s*\d|rough.?in|trim|programming|testing|commissioning|mobilization|demobilization|install\s*labor|crew|man.?hours|what to do|next step|project cost summary|cost summary|investment summary|financial summary|budget summary|schedule of values|sov\b|project management|engineering|submittal|closeout|punch.?list|warranty/i.test(heading);

                    if (isCategory && !isNonCategory) {
                        // Save previous category if it has items
                        if (currentCategory && currentCategory.items.length > 0) {
                            categories.push(currentCategory);
                        }
                        currentCategory = { name: heading, items: [], subtotal: 0 };
                        inTable = false;
                        headersParsed = false;
                        colMap = {};
                    } else if (isNonCategory) {
                        // Close and save current category
                        if (currentCategory && currentCategory.items.length > 0) {
                            categories.push(currentCategory);
                        }
                        currentCategory = null;
                        inTable = false;
                    }
                    continue;
                }

                // Detect markdown table rows (pipe-delimited)
                if (line.startsWith('|') && line.includes('|')) {
                    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
                    if (cells.length < 2) continue;

                    // Skip separator rows like |---|---|
                    if (cells.every(c => /^[-:]+$/.test(c))) {
                        headersParsed = true; // Next rows are data
                        continue;
                    }

                    // Detect header row
                    if (!headersParsed && !inTable) {
                        // Map column headers to roles
                        colMap = {};
                        cells.forEach((cell, idx) => {
                            const cl = cell.toLowerCase();
                            if (cl.includes('item') || cl.includes('description') || cl.includes('material') || cl.includes('equipment') || cl.includes('component') || cl.includes('product')) colMap.item = idx;
                            else if (cl === 'qty' || cl === 'quantity' || cl.includes('qty')) colMap.qty = idx;
                            else if (cl.includes('unit cost') || cl.includes('unit price') || cl.includes('rate') || cl.includes('unit$') || (cl === 'cost' && colMap.unitCost === undefined)) colMap.unitCost = idx;
                            else if (cl.includes('ext') || cl.includes('total') || cl.includes('amount')) {
                                if (colMap.extCost === undefined) colMap.extCost = idx;
                            }
                            else if (cl === 'unit' || cl === 'uom') colMap.unit = idx;
                            else if (cl.includes('mfg') || cl.includes('manufacturer') || cl.includes('brand') || cl.includes('make')) colMap.mfg = idx;
                            else if (cl.includes('part') || cl.includes('model') || cl.includes('sku') || cl.includes('p/n')) colMap.partNumber = idx;
                        });
                        inTable = true;
                        headersParsed = true; // Allow data rows even without separator (some AI outputs omit |---|)
                        continue;
                    }

                    // Data row
                    if (inTable && headersParsed && currentCategory) {
                        // Skip total/subtotal rows
                        const firstCell = cells[0] || '';
                        if (/^(total|subtotal|grand total|sum|markup|margin|tax)/i.test(firstCell.replace(/\*+/g, '').trim())) {
                            // Try to capture subtotal value
                            const lastCell = cells[cells.length - 1];
                            const subtMatch = lastCell.match(/\$?([\d,]+\.?\d*)/);
                            if (subtMatch) {
                                currentCategory.subtotal = parseFloat(subtMatch[1].replace(/,/g, ''));
                            }
                            continue;
                        }
                        if (firstCell.includes('continue') || firstCell.includes('...') || firstCell.replace(/\*+/g, '').trim() === '') continue;

                        // Extract values based on column mapping
                        const itemName = cells[colMap.item !== undefined ? colMap.item : 0] || '';
                        let qty = 1, unit = 'ea', unitCost = 0, extCost = 0;

                        // Try to extract quantity
                        if (colMap.qty !== undefined && cells[colMap.qty]) {
                            const qv = cells[colMap.qty].replace(/[,\s]/g, '');
                            qty = parseFloat(qv) || 1;
                        }

                        // Try to extract unit
                        if (colMap.unit !== undefined && cells[colMap.unit]) {
                            unit = cells[colMap.unit].toLowerCase().trim() || 'ea';
                        }

                        // Try to extract unit cost
                        if (colMap.unitCost !== undefined && cells[colMap.unitCost]) {
                            const ucMatch = cells[colMap.unitCost].match(/\$?([\d,]+\.?\d*)/);
                            if (ucMatch) unitCost = parseFloat(ucMatch[1].replace(/,/g, ''));
                        }

                        // Try to extract extended cost
                        if (colMap.extCost !== undefined && cells[colMap.extCost]) {
                            const ecMatch = cells[colMap.extCost].match(/\$?([\d,]+\.?\d*)/);
                            if (ecMatch) extCost = parseFloat(ecMatch[1].replace(/,/g, ''));
                        }

                        // Calculate missing values
                        if (extCost === 0 && unitCost > 0 && qty > 0) extCost = qty * unitCost;
                        if (unitCost === 0 && extCost > 0 && qty > 0) unitCost = extCost / qty;

                        // Fallback: try parsing cells positionally if column mapping missed
                        // AUDIT FIX H10: Context-aware classification — large numbers for
                        // unit-based items (ft, LF, m, meters) are quantities, not costs
                        if (qty === 1 && unitCost === 0 && extCost === 0 && cells.length >= 3) {
                            const unitHint = (cells[colMap.unit] || itemName || '').toLowerCase();
                            const isLinearUnit = /\b(ft|lf|feet|foot|meter|m\b|cable|wire|conduit|duct|fiber)\b/i.test(unitHint);
                            for (let ci = 1; ci < cells.length; ci++) {
                                const val = cells[ci].replace(/[,\s$]/g, '');
                                const num = parseFloat(val);
                                if (!isNaN(num)) {
                                    // For linear units, treat large integers as quantity (e.g., 150000 ft of cable)
                                    const qtyThreshold = isLinearUnit ? 10000000 : 100000;
                                    if (qty === 1 && num === Math.floor(num) && num < qtyThreshold && ci < cells.length - 1) { qty = num; }
                                    else if (unitCost === 0 && num > 0) { unitCost = num; }
                                    else if (extCost === 0 && num > 0) { extCost = num; break; }
                                }
                            }
                            if (extCost === 0 && unitCost > 0) extCost = qty * unitCost;
                        }

                        // Clean item name — remove markdown bold markers
                        const cleanName = itemName.replace(/\*+/g, '').trim();
                        if (cleanName.length < 2 || /^[-:]+$/.test(cleanName)) continue;

                        // Extract MFG and Part Number if columns exist
                        let mfg = '';
                        let partNumber = '';
                        if (colMap.mfg !== undefined && cells[colMap.mfg]) {
                            mfg = cells[colMap.mfg].replace(/\*+/g, '').trim();
                        }
                        if (colMap.partNumber !== undefined && cells[colMap.partNumber]) {
                            partNumber = cells[colMap.partNumber].replace(/\*+/g, '').trim();
                        }

                        currentCategory.items.push({
                            item: cleanName,
                            qty: qty,
                            unit: unit,
                            unitCost: this._round(unitCost),
                            extCost: this._round(extCost),
                            mfg: mfg,
                            partNumber: partNumber,
                            category: this._guessCategory(cleanName),
                        });
                    }
                } else {
                    // AUDIT FIX #21: Don't break table parsing on blank lines — AI often inserts
                    // blank lines between table rows. Only reset if this is a non-empty, non-table line.
                    if (inTable && headersParsed && line.length > 0) {
                        inTable = false;
                        headersParsed = false;
                    }
                }
            }

            // Push the last category
            if (currentCategory && currentCategory.items.length > 0) {
                categories.push(currentCategory);
            }

            // Fallback: if no table items were found, try to extract cost data from
            // inline dollar amounts like "$12,500" or "Total: $45,000" in the markdown
            if (categories.length === 0 || categories.every(c => c.items.length === 0)) {
                const fallbackItems = [];
                const costLineRegex = /^(.{3,80}?)[\s:]*\$\s?([\d,]+(?:\.\d{1,2})?)\s*$/;
                const standaloneCostRegex = /\$\s?([\d,]+(?:\.\d{1,2})?)/g;

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    // Skip table rows, headings, and separator lines
                    if (trimmed.startsWith('|') || trimmed.startsWith('#') || /^[-=*]{3,}$/.test(trimmed)) continue;
                    // Skip total/summary lines — we want individual items
                    if (/^(grand\s*total|total\s*project|total\s*with|overall\s*total)/i.test(trimmed.replace(/[*_]/g, ''))) continue;

                    const lineMatch = trimmed.replace(/\*+/g, '').match(costLineRegex);
                    if (lineMatch) {
                        const label = lineMatch[1].replace(/^[-*•]\s*/, '').trim();
                        const amount = parseFloat(lineMatch[2].replace(/,/g, ''));
                        if (label.length >= 3 && amount > 0) {
                            fallbackItems.push({
                                item: label,
                                qty: 1,
                                unit: 'ls',
                                unitCost: this._round(amount),
                                extCost: this._round(amount),
                                mfg: '',
                                partNumber: '',
                                category: this._guessCategory(label),
                            });
                        }
                    }
                }

                if (fallbackItems.length > 0) {
                    categories.length = 0; // clear any empty categories
                    categories.push({
                        name: 'Extracted Cost Items (fallback)',
                        items: fallbackItems,
                        subtotal: 0,
                    });
                }
            }

            // ═══ CRITICAL FIX: Remove AI-generated summary/subtotal categories ═══
            // The AI sometimes creates a "Material Subtotals Table" that re-lists category
            // AUDIT FIX H12: Merge duplicate category names — AI sometimes returns
            // "Structured Cabling Materials" twice. Without merging, both sections
            // are added as separate categories and items are double-counted.
            const mergedCategories = [];
            const catNameMap = new Map();
            for (const cat of categories) {
                const normName = (cat.name || '').trim().toLowerCase();
                if (catNameMap.has(normName)) {
                    const existing = catNameMap.get(normName);
                    // Merge items, avoiding exact duplicates (same name + same qty + same cost)
                    for (const item of cat.items) {
                        const isDupe = existing.items.some(e =>
                            (e.item || e.name || '') === (item.item || item.name || '') &&
                            (e.qty || 0) === (item.qty || 0) &&
                            Math.abs((e.extCost || 0) - (item.extCost || 0)) < 0.01
                        );
                        if (!isDupe) existing.items.push(item);
                    }
                    console.log(`[SmartPlans Export] MERGED duplicate category: "${cat.name}" (${cat.items.length} items) into existing "${existing.name}"`);
                } else {
                    catNameMap.set(normName, cat);
                    mergedCategories.push(cat);
                }
            }

            // subtotals as if they were real line items (often at half price). This DOUBLE-COUNTS
            // hundreds of thousands of dollars. Filter them out BEFORE calculating totals.
            const summaryPatterns = /subtotal|summary|recap|rollup|total.*table/i;
            const realCategories = mergedCategories.filter(cat => {
                if (summaryPatterns.test(cat.name)) {
                    console.warn(`[SmartPlans Export] REMOVED duplicate summary category: "${cat.name}" ($${cat.items.reduce((s, i) => s + (i.extCost || 0), 0).toFixed(2)}) — this was double-counting real items`);
                    return false;
                }
                // Also remove categories where item names are just dollar amounts (e.g., "$15,373.52")
                const dollarNameItems = cat.items.filter(i => /^\$[\d,]+\.?\d*$/.test((i.item || i.name || '').trim()));
                if (dollarNameItems.length > 0 && dollarNameItems.length === cat.items.length) {
                    console.warn(`[SmartPlans Export] REMOVED dollar-amount category: "${cat.name}" — all items are summary values, not real materials`);
                    return false;
                }
                return true;
            });

            // Also remove "Not in Scope" placeholder categories with $0 totals
            const activeCategories = realCategories.filter(cat => {
                const hasRealItems = cat.items.some(i => (i.extCost || 0) > 0 || (i.qty || 0) > 0);
                if (!hasRealItems) {
                    console.log(`[SmartPlans Export] Skipped empty/not-in-scope category: "${cat.name}"`);
                }
                return hasRealItems;
            });

            // Calculate subtotals & grand total from REAL categories only
            // FIX: ALWAYS compute subtotals from actual line item extCosts.
            let grandTotal = 0;
            for (const cat of activeCategories) {
                cat.subtotal = cat.items.reduce((sum, item) => sum + (item.extCost || 0), 0);
                grandTotal += cat.subtotal;
            }

            // Validation: warn if BOM is empty or has $0 grand total
            const totalItems = activeCategories.reduce((s, c) => s + c.items.length, 0);
            if (totalItems === 0 || grandTotal === 0) {
                console.warn('[SmartPlans Export] BOM extraction produced ' + totalItems + ' items with $' + grandTotal + ' grand total — AI analysis may not contain parseable cost data.');
                return emptyResult;
            }

            console.log(`[SmartPlans Export] BOM: ${activeCategories.length} categories, ${totalItems} items, $${this._round(grandTotal)} raw total`);
            return { categories: activeCategories, grandTotal: this._round(grandTotal) };

        } catch (err) {
            console.error('[SmartPlans Export] BOM extraction failed:', err);
            return emptyResult;
        }
    },

    // ─── Discipline-to-BOM category mapping ──────────────────────
    // Maps each user-facing discipline name to regex patterns that match
    // BOM category names generated by the AI analysis.
    _DISCIPLINE_CATEGORY_MAP: {
        "CCTV":                /cctv|camera|surveillance|video/i,
        "Access Control":      /access\s*control|card\s*reader|credential|door\s*hardware/i,
        "Fire Alarm":          /fire\s*alarm|fire\s*detection|notification\s*appliance|duct\s*detector/i,
        "Audio Visual":        /audio\s*visual|av\s|a\/v|display|speaker|projector|sound/i,
        "Intrusion Detection": /intrusion|burglar|motion\s*sensor|glass\s*break/i,
        "Structured Cabling":  /cabling|structured|network\s*room|telecom|mdf|idf|mpoe|backbone|horizontal|cat\s*6|fiber|patch\s*panel|cable\s*tray|j-hook|pathway|conduit|raceway/i,
    },

    // Patterns for categories that are ALWAYS included regardless of discipline selection
    // (infrastructure, equipment, general conditions, subcontractors, etc.)
    // v5.128.20 (post-wave-13): removed `opening|door\s*hardware|electrified|gate\s*operator`.
    // Those tokens describe Access Control sub-scopes — they should be filtered by the
    // discipline filter when AC is out of scope. Keeping them in the always-include
    // pattern caused AC hardware to leak into the BOM even after Wave 1's auto-removal,
    // so the user saw $K of reader/strike/REX line items in a bid where AC was supposed
    // to be wire-and-terminate-only. The discipline-category map (line 1786) already
    // routes these tokens to "Access Control" — let it own them exclusively.
    _ALWAYS_INCLUDE_PATTERN: /equipment|subcontract|special\s*condition|general\s*condition|network\s*room|telecom\s*closet|mdf|idf|mpoe|tunnel|mobiliz|bond|insurance|permit|overhead|profit|contingency|travel|per\s*diem|lift|rental|tool|safety|incidental/i,

    // ─── Filter BOM categories by selected disciplines ───────────
    // Removes categories for disciplines the user did NOT select.
    // Structured Cabling is ALWAYS included (cabling supports every system).
    // Infrastructure/equipment/general categories are ALWAYS included.
    // If disciplines array is empty/undefined, returns bom unchanged (backward compat).
    _filterBOMByDisciplines(bom, disciplines) {
        if (!bom || !bom.categories || bom.categories.length === 0) return bom;
        if (!disciplines || !Array.isArray(disciplines) || disciplines.length === 0) return bom;

        // Structured Cabling is always implicitly selected
        const effectiveDisciplines = [...disciplines];
        if (!effectiveDisciplines.includes("Structured Cabling")) {
            effectiveDisciplines.push("Structured Cabling");
        }

        // Build a combined regex from all selected disciplines
        const selectedPatterns = effectiveDisciplines
            .map(d => this._DISCIPLINE_CATEGORY_MAP[d])
            .filter(Boolean);

        const filteredCategories = bom.categories.filter(cat => {
            const name = cat.name || '';

            // Always include infrastructure/equipment/general categories
            if (this._ALWAYS_INCLUDE_PATTERN.test(name)) {
                return true;
            }

            // Check if category matches ANY selected discipline
            for (const pattern of selectedPatterns) {
                if (pattern.test(name)) return true;
            }

            // Check if category does NOT match any known discipline at all
            // (e.g., "Miscellaneous Materials" — include it since it's not discipline-specific)
            let matchesAnyDiscipline = false;
            for (const pattern of Object.values(this._DISCIPLINE_CATEGORY_MAP)) {
                if (pattern.test(name)) {
                    matchesAnyDiscipline = true;
                    break;
                }
            }

            // If it doesn't match any known discipline pattern, include it (generic category)
            if (!matchesAnyDiscipline) return true;

            // Category matches an unselected discipline — filter it out
            console.log(`[SmartPlans Export] Skipped unselected discipline category: "${name}" (discipline not in selection: ${disciplines.join(', ')})`);
            return false;
        });

        // Recalculate grand total from filtered categories
        let grandTotal = 0;
        for (const cat of filteredCategories) {
            grandTotal += cat.subtotal || cat.items.reduce((sum, item) => sum + (item.extCost || 0), 0);
        }

        let result = { categories: filteredCategories, grandTotal: this._round(grandTotal) };

        // v5.128.12: cross-category dedup pass. AI brains emit the same physical
        // item under multiple categories — e.g. Video Surveillance Server shows
        // up once in "MDF — IT Room 107" ($16,250) and once in "CCTV Materials"
        // ($16,250) on the Amtrak Martinez bid. Same noun, same unit cost, same
        // qty → double-billed $16,250. Removes the duplicate in the generic
        // rack-room category and keeps the one in the discipline-specific one.
        result = this._deduplicateCrossCategoryItems(result);

        // Inject travel & incidentals from Stage 7 (if available)
        if (typeof injectTravelIntoBOM === 'function') {
            result = injectTravelIntoBOM(result);
        }

        // Replace AI cable estimates with spatially-calculated run lengths (if zone data exists)
        if (typeof injectCalculatedCableQuantities === 'function') {
            result = injectCalculatedCableQuantities(result);
        }

        return result;
    },

    // ─── Cross-category line-item dedup ─────────────────────────────
    // Matches duplicates on (normalized core noun, unit cost, qty). When found
    // between a generic rack-room category (MDF / IT Room / Telecom Room / Main
    // Distribution) and a discipline-specific category (CCTV, Access Control,
    // Audio Visual, etc.), removes the copy in the rack-room category because
    // the discipline-specific one carries the real part number and MFG.
    _deduplicateCrossCategoryItems(bom) {
        if (!bom?.categories?.length) return bom;

        const RACK_ROOM_PATTERN = /\b(mdf|idf|it\s*room|telecom\s*room|main\s*distribution|server\s*room|equipment\s*room)\b/i;
        const STOPWORDS = new Set(['the','a','an','and','or','for','to','of','in','on','with','rack','mount','rackmount','rack-mount','port','ru','1ru','2ru','4ru','42u','44u','48u','inch','foot','ft','kvm','pdu','ups']);
        const normalize = (s) => (s || '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !STOPWORDS.has(w))
            .sort()
            .join(' ');
        const coreNoun = (s) => {
            // Extract a distinctive token — prefer the longest non-stopword
            const words = (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOPWORDS.has(w));
            return words.sort((a, b) => b.length - a.length)[0] || '';
        };

        // Build an index of every item, bucketed by (coreNoun, unitCost, qty)
        const index = new Map();
        for (let ci = 0; ci < bom.categories.length; ci++) {
            const cat = bom.categories[ci];
            if (!cat?.items?.length) continue;
            const isRackRoom = RACK_ROOM_PATTERN.test(cat.name || '');
            for (let ii = 0; ii < cat.items.length; ii++) {
                const item = cat.items[ii];
                const noun = coreNoun(item.item || item.name || '');
                if (!noun) continue;
                const key = `${noun}|${item.unitCost || 0}|${item.qty || 0}`;
                if (!index.has(key)) index.set(key, []);
                index.get(key).push({ ci, ii, cat, item, isRackRoom, normDesc: normalize(item.item || item.name || '') });
            }
        }

        const removalsByCategory = new Map(); // ci -> Set of ii to remove
        let removedCount = 0;
        let removedValue = 0;
        for (const [, matches] of index) {
            if (matches.length < 2) continue;
            // Require at least one rack-room copy AND at least one discipline-specific copy
            const rackRoomCopies = matches.filter(m => m.isRackRoom);
            const specificCopies = matches.filter(m => !m.isRackRoom);
            if (rackRoomCopies.length === 0 || specificCopies.length === 0) continue;
            // Require normalized descriptions to actually overlap (avoid false positives
            // on generic nouns). At least one word in common after normalization.
            const descOverlap = (a, b) => {
                const wa = new Set(a.split(' ').filter(Boolean));
                for (const w of b.split(' ')) if (wa.has(w)) return true;
                return false;
            };
            const canonical = specificCopies[0];
            for (const dup of rackRoomCopies) {
                if (!descOverlap(dup.normDesc, canonical.normDesc)) continue;
                if (!removalsByCategory.has(dup.ci)) removalsByCategory.set(dup.ci, new Set());
                removalsByCategory.get(dup.ci).add(dup.ii);
                removedCount++;
                removedValue += (dup.item.extCost || (dup.item.qty * dup.item.unitCost) || 0);
                console.log(`[SmartPlans Export] Dedup: removed "${dup.item.item}" ($${dup.item.unitCost}) from "${dup.cat.name}" (duplicate of "${canonical.item.item}" in "${canonical.cat.name}")`);
            }
        }

        if (removedCount === 0) return bom;

        // Apply removals + recompute subtotals + grand total
        for (const [ci, indices] of removalsByCategory) {
            const cat = bom.categories[ci];
            cat.items = cat.items.filter((_, ii) => !indices.has(ii));
            cat.subtotal = this._round(cat.items.reduce((s, it) => s + (it.extCost || 0), 0));
        }
        bom.grandTotal = this._round(bom.categories.reduce((s, c) => s + (c.subtotal || 0), 0));
        console.log(`[SmartPlans Export] Dedup: removed ${removedCount} duplicate line item(s), $${this._round(removedValue).toLocaleString()} value`);
        return bom;
    },

    // ─── Extract AI's actual grand total from analysis text ─────
    // Uses the same regex strategy as ProposalGenerator._extractGrandTotal
    // This is the SELL PRICE the AI calculated — the single source of truth.
    _extractAIGrandTotal(aiAnalysis) {
        if (!aiAnalysis) return 0;
        const patterns = [
            /GRAND\s*TOTAL[^\$]*\$([\d,]+\.?\d*)/i,
            /Grand\s*Total[^\n]*\$([\d,]+\.?\d*)/i,
            /TOTAL\s*PROJECT\s*(?:INVESTMENT|COST)[^\$]*\$([\d,]+\.?\d*)/i,
            /total\s*with\s*markup[^\$]*\$([\d,]+\.?\d*)/i,
            /\|\s*\*?\*?(?:grand\s*)?total\*?\*?\s*\|[^|]*\|\s*\$?\s*([\d,]+(?:\.\d{1,2})?)\s*\|/i,
        ];
        for (const pattern of patterns) {
            const match = aiAnalysis.match(pattern);
            if (match) {
                const num = parseFloat(match[1].replace(/,/g, ''));
                if (num > 1000) return num;
            }
        }
        return 0;
    },

    /**
     * Export a detailed Bill of Materials as an Excel workbook.
     * Sheets: 1) Project Info, 2) Full BOM, 3) Category Summary
     */
    exportBOM(state) {
        let bom = this._extractBOMFromAnalysis(state.aiAnalysis);

        if (bom.categories.length === 0) {
            // Fallback: try infrastructure data
            const infra = this._extractInfrastructure(state);
            if (infra.locations && infra.locations.length > 0) {
                for (const loc of infra.locations) {
                    if (loc.items && loc.items.length > 0) {
                        bom.categories.push({
                            name: loc.name || 'Infrastructure',
                            items: loc.items.map(item => {
                                // Extract MFG and Part# from description (e.g., "Chatsworth 55053-703 7ft 45RU")
                                const desc = item.item_name || '';
                                let mfg = '', partNumber = '', cleanDesc = desc;
                                // Known MFG prefixes in telecom/infrastructure
                                const mfgPatterns = /\b(Chatsworth|CPI|Panduit|APC|Corning|CommScope|Leviton|B-Line|Cablofil|Hubbell|Ortronics|Belden|Legrand|Allied|Eaton|Harger|STI|Hilti|Fluke|Brady|Avigilon|Mercury|HID|Bosch|Notifier|System Sensor|Rauland|Aiphone|Honeywell|Atlas IED|QSC|Chief|LG|Extron|Bogen|Jeron|HES|Schlage|Altronix|West Penn|Genesis|Windy City|Great Lakes|Middle Atlantic|Tripp Lite|ICC|Siemon|Oberon|Falcon|Wiremold)\b/i;
                                const mfgMatch = desc.match(mfgPatterns);
                                if (mfgMatch) {
                                    mfg = mfgMatch[1];
                                    const afterMfg = desc.substring(desc.indexOf(mfg) + mfg.length).trim();
                                    // Strategy 1: Parenthetical PN anywhere: "Chatsworth 7ft Rack (55053-703)"
                                    const parenPN = desc.match(/\(([A-Z0-9][\w-]{2,})\)/i);
                                    if (parenPN) {
                                        partNumber = parenPN[1];
                                        cleanDesc = desc.replace(mfgMatch[0], '').replace(parenPN[0], '').trim();
                                    } else {
                                        // Strategy 2: next token after MFG is part number
                                        const pnMatch = afterMfg.match(/^([\w][\w-]{2,}[\w])\s+(.+)/);
                                        if (pnMatch) {
                                            partNumber = pnMatch[1];
                                            cleanDesc = pnMatch[2].trim();
                                        } else {
                                            cleanDesc = afterMfg;
                                        }
                                    }
                                    // Strategy 3: Common PN formats anywhere: "55053-703", "40250-719"
                                    if (!partNumber) {
                                        const pnAny = desc.match(/\b(\d{3,6}[-]\d{2,4})\b/) ||
                                            desc.match(/\b([A-Z]{1,4}[-]\d{2,5}[-]\d{2,4})\b/i);
                                        if (pnAny) partNumber = pnAny[1];
                                    }
                                }
                                return {
                                    item: cleanDesc || desc,
                                    name: cleanDesc || desc,
                                    qty: item.budgeted_qty || 1,
                                    unit: item.unit || 'ea',
                                    unitCost: item.unit_cost || 0,
                                    extCost: item.budgeted_cost || 0,
                                    category: item.category || 'other',
                                    mfg, partNumber,
                                };
                            }),
                            subtotal: loc.items.reduce((s, it) => s + (it.budgeted_cost || 0), 0),
                        });
                    }
                }
                bom.grandTotal = bom.categories.reduce((s, c) => s + c.subtotal, 0);
            }
        }

        // ── Apply user BOM edits (price overrides, deletions, manual items) ──
        bom = this._applyUserBOMEdits(bom, state);

        // Filter BOM to only include categories for selected disciplines
        // (travel & incidentals are injected automatically by _filterBOMByDisciplines)
        bom = this._filterBOMByDisciplines(bom, state.disciplines);

        if (bom.categories.length === 0) {
            alert('No material data found in the AI analysis. Please run the analysis first.');
            return;
        }

        // AUDIT FIX H14: Block $0 BOM exports — prevents submitting empty/broken bids
        if (bom.grandTotal <= 0) {
            alert('⚠️ BOM total is $0 — cannot export an empty bid. Please verify the analysis produced valid pricing data.');
            console.error('[Export] Blocked $0 BOM export. Categories:', bom.categories.map(c => `${c.name}: $${c.subtotal}`));
            return;
        }

        if (typeof XLSX === "undefined") {
            this._exportBOMCSVFallback(state, bom);
            return;
        }

        try {
            const wb = XLSX.utils.book_new();
            const now = new Date();
            const regionKey = state.regionalMultiplier || "national_average";
            const regionMult = PRICING_DB.regionalMultipliers[regionKey] || 1.0;

            // ── Sheet 1: Project Info ──
            const infoData = [
                ["BILL OF MATERIALS — DETAILED REPORT"],
                [],
                ["3D Technology Services, Inc."],
                [],
                ["Generated", now.toLocaleString()],
                ["Project Name", state.projectName || "Untitled Project"],
                ["Project Type", state.projectType || ""],
                ["Location", state.projectLocation || "Not specified"],
                ["Disciplines", (state.disciplines || []).join(", ")],
                ["Pricing Tier", (state.pricingTier || "mid").toUpperCase()],
                ["Regional Multiplier", `${regionKey.replace(/_/g, " ")} (${regionMult}×)`],
                ["Material Markup", `${state.markup.material}%`],
                [],
                ["IMPORTANT: Quantities are derived from AI analysis of construction documents."],
                ["Verify all quantities against original drawings before procurement."],
            ];
            const ws1 = XLSX.utils.aoa_to_sheet(infoData);
            ws1["!cols"] = [{ wch: 24 }, { wch: 50 }];
            XLSX.utils.book_append_sheet(wb, ws1, "Project Info");

            // ── Sheet 2: Full BOM (all items, organized by category) ──
            // LIVE FORMULAS: Extended Cost = Qty × Unit Cost, Subtotals = SUM, Grand Total = SUM
            const bomData = [
                ["DETAILED BILL OF MATERIALS"],
                [`${state.projectName || 'Project'} — ${now.toLocaleDateString()}`],
                [],
                ["Category", "MFG", "Part #", "Item / Description", "Qty", "Unit", "Unit Cost ($)", "Extended Cost ($)"],
            ];

            let runningTotal = 0;
            let totalLineItems = 0;
            let totalQuantity = 0;

            // Track row indices for formula injection after sheet creation
            // bomData starts at row 0; header row with column names is index 3 (row 4 in Excel, 0-based row 3)
            const formulaCells = [];       // { row, col, formula, cached } — injected after aoa_to_sheet
            const catSubtotalRows = [];    // 0-based row indices of category subtotal cells (col H=7)
            const itemRowRanges = [];      // per-category: { firstRow, lastRow } of item rows for SUM

            for (const cat of bom.categories) {
                // Category header row (blank + name)
                bomData.push([]);
                bomData.push([cat.name.toUpperCase(), "", "", "", "", "", "", ""]);

                const catFirstItemRow = bomData.length; // 0-based row of first item in this category

                for (const item of cat.items) {
                    // Use name OR item property — injection code uses 'name:', BOM parser uses 'item:'
                    const itemDesc = item.item || item.name || '';
                    // Skip blank/empty description items (ghost items from old injection bug)
                    if (!itemDesc || itemDesc.trim().length < 2) continue;

                    // ── Extract MFG and Part# from description if not already set ──
                    let _mfg = item.mfg || '';
                    let _pn = item.partNumber || '';
                    if (!_mfg || !_pn) {
                        const _mfgRx = /\b(Chatsworth|CPI|Panduit|APC|Corning|CommScope|Leviton|B-Line|Cablofil|Hubbell|Ortronics|Belden|Legrand|Allied|Eaton|Harger|STI|Hilti|Fluke|Brady|Avigilon|Mercury|HID|Bosch|Notifier|System Sensor|Rauland|Aiphone|Honeywell|Atlas IED|QSC|Chief|LG|Extron|Bogen|Jeron|HES|Schlage|Altronix|West Penn|Genesis|Windy City|Great Lakes|Middle Atlantic|Tripp Lite|ICC|Siemon|Oberon|Falcon|Wiremold)\b/i;
                        const _mm = itemDesc.match(_mfgRx);
                        if (_mm && !_mfg) _mfg = _mm[1];
                        // Try parenthetical PN: "Chatsworth 7ft Rack (55053-703)"
                        if (!_pn) {
                            // Strategy 1: Parenthetical PN anywhere: "Rack (55053-703)" or "(CPI-40250-719)"
                            const _ppn = itemDesc.match(/\(([A-Z0-9][\w-]{2,})\)/i);
                            if (_ppn) { _pn = _ppn[1]; }
                            // Strategy 2: "MFG PartNum Description" — PN is token after manufacturer
                            else if (_mm) {
                                const _after = itemDesc.substring(itemDesc.indexOf(_mm[1]) + _mm[1].length).trim();
                                const _tk = _after.match(/^([A-Z0-9][\w-]{2,}[\w])\b/i);
                                if (_tk) _pn = _tk[1];
                            }
                            // Strategy 3: Common PN formats anywhere in string: "55053-703", "40250-719", "CS-48-150"
                            if (!_pn) {
                                const _pnAny = itemDesc.match(/\b(\d{3,6}[-]\d{2,4})\b/) ||  // 55053-703
                                    itemDesc.match(/\b([A-Z]{1,4}[-]\d{2,5}[-]\d{2,4})\b/i) ||  // CS-48-150
                                    itemDesc.match(/\b([A-Z]{2,5}\d{3,6})\b/i);  // CPI40250
                                if (_pnAny) _pn = _pnAny[1];
                            }
                        }
                    }

                    const curRow = bomData.length; // 0-based row index
                    bomData.push([
                        "",
                        _mfg,
                        _pn,
                        itemDesc,
                        item.qty,
                        item.unit,
                        item.unitCost,
                        item.extCost, // static fallback value — formula overwrites
                    ]);
                    // Formula: H{row} = E{row} * G{row}  (Qty × Unit Cost)
                    // Excel rows are 1-based, so curRow+1
                    const excelRow = curRow + 1;
                    formulaCells.push({ row: curRow, col: 7, formula: `E${excelRow}*G${excelRow}`, cached: item.extCost });
                    totalLineItems++;
                    totalQuantity += item.qty;
                }

                const catLastItemRow = bomData.length - 1; // 0-based row of last item

                // Category subtotal row — formula: SUM of extended costs for this category's items
                const subtotalRow = bomData.length;
                bomData.push(["", "", "", `SUBTOTAL — ${cat.name}`, "", "", "", cat.subtotal]);
                const excelFirst = catFirstItemRow + 1;
                const excelLast = catLastItemRow + 1;
                formulaCells.push({ row: subtotalRow, col: 7, formula: `SUM(H${excelFirst}:H${excelLast})`, cached: cat.subtotal });
                catSubtotalRows.push(subtotalRow);
                itemRowRanges.push({ firstRow: catFirstItemRow, lastRow: catLastItemRow });

                runningTotal += cat.subtotal;
            }

            // Grand total section — formula: SUM of all category subtotals
            bomData.push([]);
            bomData.push(["", "", "", "", "", "", "", ""]);
            const matSubtotalRow = bomData.length;
            bomData.push(["", "", "", "MATERIAL & EQUIPMENT SUBTOTAL", "", "", "", runningTotal]);
            // Build SUM formula referencing each category subtotal cell
            const subtotalRefs = catSubtotalRows.map(r => `H${r + 1}`).join(',');
            formulaCells.push({ row: matSubtotalRow, col: 7, formula: `SUM(${subtotalRefs})`, cached: runningTotal });
            bomData.push([]);

            // Calculate fully-loaded bid price with itemized breakdown
            const bidTotal = this._getFullyLoadedTotal(state, bom);
            const breakdown = this._computeFullBreakdown(state, bom);
            const matMarkupPct = state.markup?.material ?? 50;
            const labMarkupPct = state.markup?.labor ?? 50;
            const eqMarkupPct = state.markup?.equipment ?? 15;
            const subMarkupPct = state.markup?.subcontractor ?? 15;
            const matRaw = breakdown.materials;
            const eqRaw = breakdown.equipment;
            const subRaw = breakdown.subs;
            const matMarkupAmt = this._round(breakdown.matSell - breakdown.materials);
            const eqMarkupAmt = this._round(breakdown.eqSell - breakdown.equipment);
            const subMarkupAmt = this._round(breakdown.subSell - breakdown.subs);
            const laborBaseAmt = breakdown.laborBase;
            const labMarkupAmt = this._round(breakdown.labSell - breakdown.laborBase);
            const burdenAmt = breakdown.burden;
            const bondsAmt = breakdown.bonds;
            const contingencyAmt = breakdown.contingency;
            const travelAmt = breakdown.travel;
            // v5.128.12: Split the old "G&A Overhead, Bonds & Contingency" lump into
            // separate lines and show every cost component (material, equipment, subs,
            // labor, burden, bonds, contingency, travel). Previously the Pricing Summary
            // showed an $X total where the displayed lines summed to <$X — e.g. Amtrak
            // Martinez 2026-04-23 showed lines summing to $1.38M under a "BID PRICE" of
            // $4.16M, with $2.78M invisible. When the 3D Engine calibration moves the
            // bid total away from the cost buildup, an explicit "Market Calibration"
            // reconciliation line is emitted so the summary always sums to the total.
            if (bidTotal > runningTotal) {
                bomData.push(["", "", "", "PRICING SUMMARY", "", "", "", ""]);
                const componentRows = [];
                const pushRow = (label, amt, formulaFn) => {
                    if (amt === 0 && !formulaFn) return null;
                    const r = bomData.length;
                    bomData.push(["", "", "", label, "", "", "", amt]);
                    if (formulaFn) formulaCells.push({ row: r, col: 7, formula: formulaFn(r), cached: amt });
                    componentRows.push(r);
                    return r;
                };

                // Chain material raw cost to the BOM subtotal so it stays live.
                const matRawRow = pushRow(`  Material (raw cost)`, matRaw, () => `H${matSubtotalRow + 1}-${eqRaw}-${subRaw}`);
                pushRow(`  Material Markup (${matMarkupPct}%)`, matMarkupAmt, (r) => `H${matRawRow + 1}*${matMarkupPct/100}`);
                if (eqRaw > 0) {
                    const eqRawRow = pushRow(`  Equipment (raw cost)`, eqRaw);
                    pushRow(`  Equipment Markup (${eqMarkupPct}%)`, eqMarkupAmt, (r) => `H${eqRawRow + 1}*${eqMarkupPct/100}`);
                }
                if (subRaw > 0) {
                    const subRawRow = pushRow(`  Subcontractors (raw cost)`, subRaw);
                    pushRow(`  Subcontractor Markup (${subMarkupPct}%)`, subMarkupAmt, (r) => `H${subRawRow + 1}*${subMarkupPct/100}`);
                }
                const laborRow = pushRow(`  Labor (base cost)`, laborBaseAmt);
                pushRow(`  Labor Markup (${labMarkupPct}%)`, labMarkupAmt, (r) => `H${laborRow + 1}*${labMarkupPct/100}`);
                if (burdenAmt > 0) pushRow(`  Labor Burden (payroll tax, insurance)`, burdenAmt);
                if (bondsAmt > 0) pushRow(`  Bonds`, bondsAmt);
                if (contingencyAmt > 0) pushRow(`  Contingency`, contingencyAmt);
                if (travelAmt > 0) pushRow(`  Travel & Per Diem`, travelAmt);

                // Sum the component lines — this is what the displayed buildup produces.
                const componentSum = this._round(
                    matRaw + matMarkupAmt + eqRaw + eqMarkupAmt + subRaw + subMarkupAmt +
                    laborBaseAmt + labMarkupAmt + burdenAmt + bondsAmt + contingencyAmt + travelAmt
                );

                // If the 3D Engine's calibrated total differs from the cost buildup,
                // show the reconciliation so the summary always sums to the Grand Total.
                const calibrationDelta = this._round(bidTotal - componentSum);
                if (Math.abs(calibrationDelta) >= 1) {
                    const label = calibrationDelta > 0
                        ? `  Market Calibration & Margin Adjustment`
                        : `  Market Calibration Reduction`;
                    pushRow(label, calibrationDelta);
                }

                bomData.push([]);
                const grandTotalRow = bomData.length;
                bomData.push(["", "", "", "BID PRICE (GRAND TOTAL)", "", "", "", bidTotal]);
                const sumRefs = componentRows.map(r => `H${r + 1}`).join('+');
                formulaCells.push({ row: grandTotalRow, col: 7, formula: sumRefs, cached: bidTotal });
            } else {
                bomData.push(["", "", "", "GRAND TOTAL", "", "", "", runningTotal]);
                formulaCells.push({ row: bomData.length - 1, col: 7, formula: `H${matSubtotalRow + 1}`, cached: runningTotal });
            }
            bomData.push([]);
            bomData.push(["", "", "", `Total Line Items: ${totalLineItems}`, `Total Qty: ${totalQuantity}`, "", "", ""]);

            const ws2 = XLSX.utils.aoa_to_sheet(bomData);

            // Inject live formulas into the worksheet
            for (const fc of formulaCells) {
                this._setCellFormula(ws2, fc.row, fc.col, fc.formula, fc.cached);
            }
            // Apply currency format to Unit Cost column (col G=6) for all item rows
            for (const range of itemRowRanges) {
                for (let r = range.firstRow; r <= range.lastRow; r++) {
                    this._setCellCurrency(ws2, r, 6);
                }
            }

            ws2["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 24 }, { wch: 50 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 16 }];
            XLSX.utils.book_append_sheet(wb, ws2, "Bill of Materials");

            // ── Sheet 3: Category Summary ──
            // LIVE FORMULAS: Subtotals reference BOM sheet, % of Total = subtotal/grand total
            const summaryData = [
                ["CATEGORY SUMMARY"],
                [],
                ["Category", "Line Items", "Total Quantity", "Subtotal ($)", "% of Total"],
            ];
            const summaryFormulas = [];
            const summaryFirstDataRow = summaryData.length; // 0-based row of first category
            for (let ci = 0; ci < bom.categories.length; ci++) {
                const cat = bom.categories[ci];
                const itemCount = cat.items.length;
                const catQty = cat.items.reduce((s, it) => s + it.qty, 0);
                const pctVal = runningTotal > 0 ? (cat.subtotal / runningTotal) : 0;
                const curRow = summaryData.length;
                summaryData.push([cat.name, itemCount, catQty, cat.subtotal, pctVal]);
                // Reference the category subtotal from BOM sheet
                const bomSubRef = catSubtotalRows[ci];
                if (bomSubRef !== undefined) {
                    summaryFormulas.push({ row: curRow, col: 3, formula: `'Bill of Materials'!H${bomSubRef + 1}`, cached: cat.subtotal });
                }
            }
            const summaryLastDataRow = summaryData.length - 1;
            summaryData.push([]);
            const summaryTotalRow = summaryData.length;
            summaryData.push(["TOTAL", totalLineItems, totalQuantity, runningTotal, 1]);

            // Total row: SUM of subtotals
            const sumFirst = summaryFirstDataRow + 1; // Excel 1-based
            const sumLast = summaryLastDataRow + 1;
            summaryFormulas.push({ row: summaryTotalRow, col: 3, formula: `SUM(D${sumFirst}:D${sumLast})`, cached: runningTotal });

            // % of Total formulas for each category row
            for (let ci = 0; ci < bom.categories.length; ci++) {
                const dataRow = summaryFirstDataRow + ci;
                const excelTotalRow = summaryTotalRow + 1;
                summaryFormulas.push({ row: dataRow, col: 4, formula: `IF(D$${excelTotalRow}=0,0,D${dataRow + 1}/D$${excelTotalRow})`, cached: runningTotal > 0 ? bom.categories[ci].subtotal / runningTotal : 0 });
            }
            // Total row % = 100%
            summaryFormulas.push({ row: summaryTotalRow, col: 4, formula: `IF(D${summaryTotalRow + 1}=0,0,1)`, cached: 1 });

            const ws3 = XLSX.utils.aoa_to_sheet(summaryData);
            for (const sf of summaryFormulas) {
                this._setCellFormula(ws3, sf.row, sf.col, sf.formula, sf.cached);
            }
            // Format % column as percentage
            for (let r = summaryFirstDataRow; r <= summaryLastDataRow; r++) {
                const addr = XLSX.utils.encode_cell({ r, c: 4 });
                if (ws3[addr]) ws3[addr].z = '0.0%';
            }
            const totalPctAddr = XLSX.utils.encode_cell({ r: summaryTotalRow, c: 4 });
            if (ws3[totalPctAddr]) ws3[totalPctAddr].z = '0%';
            // Format subtotal column as currency
            for (let r = summaryFirstDataRow; r <= summaryTotalRow; r++) {
                const addr = XLSX.utils.encode_cell({ r, c: 3 });
                if (ws3[addr]) ws3[addr].z = '$#,##0.00';
            }

            ws3["!cols"] = [{ wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, ws3, "Category Summary");

            // ── Sheet 4: Exclusions & Assumptions ──
            // CRITICAL for proposals — documents what is NOT included, assumptions made,
            // and clarifications. Required for legal protection on every bid.
            const exclItems = state.exclusions || [];
            // If no user-entered items, auto-generate defaults for this project
            let exclForExport = exclItems;
            if (exclForExport.length === 0 && typeof getDefaultExclusions === 'function') {
                exclForExport = getDefaultExclusions(state.disciplines || []);
            }

            if (exclForExport.length > 0) {
                const exclData = [
                    ["EXCLUSIONS, ASSUMPTIONS & CLARIFICATIONS"],
                    [`${state.projectName || 'Project'} — ${now.toLocaleDateString()}`],
                    [],
                ];

                // Group by type
                const types = [
                    { key: 'exclusion', label: 'EXCLUSIONS', desc: 'The following items are specifically EXCLUDED from this estimate:' },
                    { key: 'assumption', label: 'ASSUMPTIONS', desc: 'This estimate is based on the following assumptions:' },
                    { key: 'clarification', label: 'CLARIFICATIONS', desc: 'The following clarifications apply to this estimate:' },
                ];

                for (const { key, label, desc } of types) {
                    const items = exclForExport.filter(e => e.type === key).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
                    if (items.length === 0) continue;
                    exclData.push([label]);
                    exclData.push([desc]);
                    exclData.push(["#", "Item", "Category"]);
                    items.forEach((item, i) => {
                        exclData.push([i + 1, item.text || '', item.category || 'General']);
                    });
                    exclData.push([]); // spacer between sections
                }

                // Add print instructions
                exclData.push([]);
                exclData.push(["NOTE: This sheet should be included with every proposal and bid submission."]);
                exclData.push(["Items listed as exclusions are NOT included in the bid price."]);
                exclData.push(["Verify all items against project specifications before submission."]);

                const ws4 = XLSX.utils.aoa_to_sheet(exclData);
                ws4["!cols"] = [{ wch: 6 }, { wch: 80 }, { wch: 24 }];
                XLSX.utils.book_append_sheet(wb, ws4, "Exclusions & Assumptions");
            }

            // Add confidential footer row to each sheet
            for (const sheetName of wb.SheetNames) {
                const ws = wb.Sheets[sheetName];
                const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
                const footerRow = range.e.r + 2;
                ws[XLSX.utils.encode_cell({ r: footerRow, c: 0 })] = { v: '3D CONFIDENTIAL — 3D Technology Services Inc.', t: 's' };
                range.e.r = footerRow;
                ws['!ref'] = XLSX.utils.encode_range(range);
            }

            // Write and download
            const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            this._download(blob, `SmartPlans_BOM_${this._safeName(state)}.xlsx`);

            if (typeof spToast === 'function') spToast(`Bill of Materials exported — ${totalLineItems} items ✓`);

        } catch (err) {
            console.error('[SmartPlans] BOM Excel export failed:', err);
            this._exportBOMCSVFallback(state, bom);
        }
    },

    // CSV fallback for BOM export
    _exportBOMCSVFallback(state, bom) {
        try {
            const rows = [
                ['BILL OF MATERIALS — ' + (state.projectName || 'Project')],
                ['Generated', new Date().toLocaleString()],
                [],
                ['Category', 'Item', 'Qty', 'Unit', 'Unit Cost', 'Extended Cost'],
            ];
            for (const cat of bom.categories) {
                rows.push([cat.name]);
                for (const item of cat.items) {
                    rows.push(['', item.item, item.qty, item.unit, item.unitCost, item.extCost]);
                }
                rows.push(['', `Subtotal — ${cat.name}`, '', '', '', cat.subtotal]);
                rows.push([]);
            }
            rows.push(['', 'GRAND TOTAL', '', '', '', bom.grandTotal]);
            rows.push([]);
            rows.push(['3D CONFIDENTIAL — 3D Technology Services Inc.']);

            const csv = rows.map(r => r.map(c => `"${this._csvSafe(c).replace(/"/g, '""')}"`).join(',')).join('\n');
            this._download(csv, `SmartPlans_BOM_${this._safeName(state)}.csv`, 'text/csv');
        } catch (err) {
            console.error('[SmartPlans] BOM CSV fallback failed:', err);
            alert('BOM export failed. Please try the Excel or JSON export instead.');
        }
    },


    // ═══════════════════════════════════════════════════════════
    // JSON EXPORT
    // ═══════════════════════════════════════════════════════════
    exportJSON(state) {
        const pkg = this.buildExportPackage(state);
        const json = JSON.stringify(pkg, null, 2);
        this._download(json, `SmartPlans_${this._safeName(state)}.json`, "application/json");
    },


    // ═══════════════════════════════════════════════════════════
    // EXCEL EXPORT (using SheetJS)
    // ═══════════════════════════════════════════════════════════
    exportExcel(state) {
        if (typeof XLSX === "undefined") {
            console.warn('[SmartPlans] SheetJS not available — falling back to CSV export');
            this._exportCSVFallback(state);
            return;
        }

        try {
            const wb = XLSX.utils.book_new();
            const regionKey = state.regionalMultiplier || "national_average";
            const regionMult = PRICING_DB.regionalMultipliers[regionKey] || 1.0;
            const burdenMult = state.includeBurden ? (1 + ((state.burdenRate ?? 35) >= 1 ? (state.burdenRate ?? 35) / 100 : (state.burdenRate ?? 35))) : 1.0;
            const tier = state.pricingTier;

            // ── Sheet 1: Project Summary ──
            // LIVE FORMULAS: Loaded Rate = Base Rate × (1 + Burden%)
            const summaryData = [
                ["SMARTPLANS — PROJECT ESTIMATE SUMMARY"],
                [],
                ["Generated", new Date().toLocaleString()],
                ["Project Name", state.projectName || ""],
                ["Project Type", state.projectType || ""],
                ["Location", state.projectLocation || ""],
                ["Jurisdiction", state.codeJurisdiction || ""],
                ["Disciplines", (state.disciplines || []).join(", ")],
                ["Prevailing Wage", state.prevailingWage || "N/A"],
                ["Work Shift", state.workShift || "Standard"],
                [],
                ["PRICING CONFIGURATION"],
                ["Pricing Tier", tier.toUpperCase()],
                ["Regional Multiplier", `${regionKey.replace(/_/g, " ")} (${regionMult}×)`],
                ["Labor Burden", state.includeBurden ? ((state.burdenRate ?? 35) / 100) : 0],
                ["Material Markup", `${state.markup.material}%`],
                ["Labor Markup", `${state.markup.labor}%`],
                ["Equipment Markup", `${state.markup.equipment}%`],
                ["Subcontractor Markup", `${state.markup.subcontractor}%`],
                [],
                ["LABOR RATES"],
                ["Classification", "Base Rate ($)", "Burden %", "Loaded Rate ($)"],
            ];

            // Row index where "Labor Burden" value sits (for formula reference)
            const burdenValueRow = 14; // 0-based row 14 = "Labor Burden" row, col B
            const laborHeaderRow = summaryData.length - 1; // row with column headers
            const laborFormulas = [];
            const laborRateEntries = Object.entries(state.laborRates);
            laborRateEntries.forEach(([key, rate]) => {
                const label = key === "pm" ? "Project Manager" : key === "journeyman" ? "Journeyman Tech" : key === "lead" ? "Lead Tech" : key === "foreman" ? "Foreman" : key === "apprentice" ? "Apprentice" : "Programmer";
                const curRow = summaryData.length;
                const burdenPct = state.includeBurden ? (state.burdenRate / 100) : 0;
                summaryData.push([label, rate, burdenPct, this._round(rate * burdenMult)]);
                // Formula: D{row} = B{row} * (1 + C{row})   (Loaded Rate = Base × (1 + Burden%))
                const excelRow = curRow + 1;
                laborFormulas.push({ row: curRow, col: 3, formula: `B${excelRow}*(1+C${excelRow})`, cached: this._round(rate * burdenMult) });
            });

            const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
            // Inject labor rate formulas
            for (const lf of laborFormulas) {
                this._setCellFormula(ws1, lf.row, lf.col, lf.formula, lf.cached);
            }
            // Format burden column as percentage, base/loaded as currency
            for (let i = 0; i < laborRateEntries.length; i++) {
                const r = laborHeaderRow + 1 + i;
                const burdenAddr = XLSX.utils.encode_cell({ r, c: 2 });
                if (ws1[burdenAddr]) ws1[burdenAddr].z = '0%';
                this._setCellCurrency(ws1, r, 1);
            }
            // Format the Labor Burden config cell as percentage too
            const burdenCfgAddr = XLSX.utils.encode_cell({ r: burdenValueRow, c: 1 });
            if (ws1[burdenCfgAddr] && typeof ws1[burdenCfgAddr].v === 'number') {
                ws1[burdenCfgAddr].z = '0%';
            }
            ws1["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 14 }, { wch: 14 }];
            XLSX.utils.book_append_sheet(wb, ws1, "Project Summary");

            // ── Sheet 2: Material Pricing Database ──
            // LIVE FORMULAS: Adjusted Price = Unit Price × Regional Multiplier
            const matData = [
                ["MATERIAL PRICING DATABASE"],
                [`Tier: ${tier.toUpperCase()} | Region: ${regionKey.replace(/_/g, " ")} (${regionMult}×)`],
                ["Regional Multiplier", regionMult],
                ["Category", "Item", "Description", "Unit", "Unit Price ($)", "Adjusted Price ($)"],
            ];

            const matFormulas = [];
            const matRegionCell = 'B3'; // row 2 (0-based), col 1 — holds the regionMult value

            const categories = {
                "Structured Cabling": PRICING_DB.structuredCabling,
                "CCTV": PRICING_DB.cctv,
                "Access Control": PRICING_DB.accessControl,
                "Fire Alarm": PRICING_DB.fireAlarm,
                "Intrusion Detection": PRICING_DB.intrusionDetection,
                "Audio Visual": PRICING_DB.audioVisual,
            };

            for (const [catName, catData] of Object.entries(categories)) {
                for (const [subCat, items] of Object.entries(catData)) {
                    for (const [key, item] of Object.entries(items)) {
                        if (typeof item === "object" && item[tier] !== undefined) {
                            const curRow = matData.length;
                            matData.push([
                                catName,
                                key,
                                item.description,
                                item.unit,
                                item[tier],
                                this._round(item[tier] * regionMult), // static fallback
                            ]);
                            // Formula: F{row} = E{row} * $B$3  (Unit Price × Regional Multiplier)
                            const excelRow = curRow + 1;
                            matFormulas.push({ row: curRow, col: 5, formula: `E${excelRow}*$B$3`, cached: this._round(item[tier] * regionMult) });
                        }
                    }
                }
            }

            const ws2 = XLSX.utils.aoa_to_sheet(matData);
            // Inject material pricing formulas
            for (const mf of matFormulas) {
                this._setCellFormula(ws2, mf.row, mf.col, mf.formula, mf.cached);
            }
            // Apply currency format to unit price and adjusted price columns
            for (const mf of matFormulas) {
                this._setCellCurrency(ws2, mf.row, 4); // Unit Price
            }
            ws2["!cols"] = [{ wch: 20 }, { wch: 24 }, { wch: 45 }, { wch: 12 }, { wch: 12 }, { wch: 14 }];
            XLSX.utils.book_append_sheet(wb, ws2, "Material Pricing");

            // ── Sheet 3: AI Analysis (raw text in cells) ──
            if (state.aiAnalysis) {
                const lines = state.aiAnalysis.split("\n");
                const analysisData = [["SMARTPLANS AI ANALYSIS"], []];
                lines.forEach(line => analysisData.push([line]));
                const ws3 = XLSX.utils.aoa_to_sheet(analysisData);
                ws3["!cols"] = [{ wch: 120 }];
                XLSX.utils.book_append_sheet(wb, ws3, "AI Analysis");
            }

            // ── Sheet 4: RFIs ──
            const rfiData = [
                ["RFI LOG"],
                [],
                ["RFI #", "Question", "Detail", "Selected"],
            ];
            if (typeof getRFIsForDisciplines === "function") {
                const rfis = getRFIsForDisciplines(state.disciplines);
                rfis.forEach((r, i) => {
                    rfiData.push([
                        `RFI-${String(i + 1).padStart(3, "0")}`,
                        r.question,
                        r.detail || "",
                        state.selectedRFIs?.has(r.id) ? "YES" : "",
                    ]);
                });
            }
            const ws4 = XLSX.utils.aoa_to_sheet(rfiData);
            ws4["!cols"] = [{ wch: 10 }, { wch: 60 }, { wch: 60 }, { wch: 10 }];
            XLSX.utils.book_append_sheet(wb, ws4, "RFIs");

            // ── Sheet 5: Documents Uploaded ──
            const docData = [
                ["DOCUMENTS ANALYZED"],
                [],
                ["Category", "Filename", "Size (KB)", "Type"],
            ];
            const fileCategories = {
                "Symbol Legend": state.legendFiles || [],
                "Floor Plans": state.planFiles || [],
                "Specifications": state.specFiles || [],
                "Addenda": state.addendaFiles || [],
            };
            for (const [cat, files] of Object.entries(fileCategories)) {
                files.forEach(f => docData.push([cat, f.name, Math.round(f.size / 1024), f.type]));
            }
            const ws5 = XLSX.utils.aoa_to_sheet(docData);
            ws5["!cols"] = [{ wch: 18 }, { wch: 50 }, { wch: 12 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(wb, ws5, "Documents");

            // Add confidential footer row to each sheet
            for (const sheetName of wb.SheetNames) {
                const ws = wb.Sheets[sheetName];
                const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
                const footerRow = range.e.r + 2;
                ws[XLSX.utils.encode_cell({ r: footerRow, c: 0 })] = { v: '3D CONFIDENTIAL — 3D Technology Services Inc.', t: 's' };
                range.e.r = footerRow;
                ws['!ref'] = XLSX.utils.encode_range(range);
            }

            // Write and download
            const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            this._download(blob, `SmartPlans_${this._safeName(state)}.xlsx`);
        } catch (err) {
            console.error('[SmartPlans] Excel export failed, falling back to CSV:', err);
            this._exportCSVFallback(state);
        }
    },

    // ─── CSV Fallback when SheetJS is unavailable or crashes ───
    _exportCSVFallback(state) {
        try {
            const rows = [
                ['SMARTPLANS ESTIMATE EXPORT (CSV Fallback)'],
                ['Generated', new Date().toLocaleString()],
                ['Project', state.projectName || 'Untitled'],
                ['Type', state.projectType || ''],
                ['Location', state.projectLocation || ''],
                ['Disciplines', (state.disciplines || []).join('; ')],
                ['Pricing Tier', state.pricingTier || 'mid'],
                [],
            ];
            if (state.aiAnalysis) {
                rows.push(['AI ANALYSIS']);
                state.aiAnalysis.split('\n').forEach(line => rows.push([line]));
            }
            rows.push([]);
            rows.push(['3D CONFIDENTIAL — 3D Technology Services Inc.']);
            const csv = rows.map(r => r.map(c => `"${this._csvSafe(c).replace(/"/g, '""')}"`).join(',')).join('\n');
            this._download(csv, `SmartPlans_${this._safeName(state)}.csv`, 'text/csv');
        } catch (csvErr) {
            console.error('[SmartPlans] CSV fallback also failed:', csvErr);
            alert('Export failed. Please try the JSON or Markdown option instead.');
        }
    },


    // ═══════════════════════════════════════════════════════════
    // MARKDOWN EXPORT (formatted proposal document)
    // ═══════════════════════════════════════════════════════════
    exportMarkdown(state) {
        const regionKey = state.regionalMultiplier || "national_average";
        const regionMult = PRICING_DB.regionalMultipliers[regionKey] || 1.0;
        const burdenMult = state.includeBurden ? (1 + ((state.burdenRate ?? 35) >= 1 ? (state.burdenRate ?? 35) / 100 : (state.burdenRate ?? 35))) : 1.0;
        const now = new Date();

        let md = "";

        // ── Title Page ──
        md += `# SmartPlans Estimate Report\n\n`;
        md += `---\n\n`;
        md += `| | |\n|---|---|\n`;
        md += `| **Project** | ${state.projectName || "Untitled"} |\n`;
        md += `| **Type** | ${state.projectType || "—"} |\n`;
        md += `| **Location** | ${state.projectLocation || "Not specified"} |\n`;
        md += `| **Jurisdiction** | ${state.codeJurisdiction || "Not specified"} |\n`;
        md += `| **Disciplines** | ${state.disciplines.join(", ") || "—"} |\n`;
        md += `| **Prevailing Wage** | ${state.prevailingWage || "N/A"} |\n`;
        md += `| **Work Shift** | ${state.workShift || "Standard"} |\n`;
        md += `| **Date Generated** | ${now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} |\n`;
        md += `| **Generated By** | SmartPlans AI Estimation Engine |\n`;
        md += `\n---\n\n`;

        // ── Pricing Configuration ──
        md += `## Pricing Configuration\n\n`;
        md += `| Parameter | Value |\n|---|---|\n`;
        md += `| Material Tier | ${state.pricingTier.toUpperCase()} |\n`;
        md += `| Regional Multiplier | ${regionKey.replace(/_/g, " ")} (${regionMult}×) |\n`;
        md += `| Labor Burden | ${state.includeBurden ? state.burdenRate + "%" : "Not applied"} |\n`;
        md += `| Material Markup | ${state.markup.material}% |\n`;
        md += `| Labor Markup | ${state.markup.labor}% |\n`;
        md += `| Equipment Markup | ${state.markup.equipment}% |\n`;
        md += `| Subcontractor Markup | ${state.markup.subcontractor}% |\n\n`;

        // ── Labor Rates ──
        md += `### Labor Rates\n\n`;
        md += `| Classification | Base Rate | Burden | Loaded Rate |\n|---|---|---|---|\n`;
        Object.entries(state.laborRates).forEach(([key, rate]) => {
            const label = key === "pm" ? "Project Manager" : key === "journeyman" ? "Journeyman Tech" : key === "lead" ? "Lead Tech" : key === "foreman" ? "Foreman" : key === "apprentice" ? "Apprentice" : "Programmer";
            md += `| ${label} | $${rate.toFixed(2)}/hr | ${(burdenMult * 100 - 100).toFixed(0)}% | $${this._round(rate * burdenMult).toFixed(2)}/hr |\n`;
        });
        md += `\n`;

        // ── Documents Analyzed ──
        md += `## Documents Analyzed\n\n`;
        md += `| Category | Count |\n|---|---|\n`;
        md += `| Symbol Legends | ${state.legendFiles.length} |\n`;
        md += `| Floor Plans | ${state.planFiles.length} |\n`;
        md += `| Specifications | ${state.specFiles.length} |\n`;
        md += `| Addenda | ${state.addendaFiles.length} |\n\n`;

        // ── User Notes ──
        if (state.specificItems || state.knownQuantities || state.priorEstimate || state.notes) {
            md += `## Additional Project Notes\n\n`;
            if (state.specificItems) md += `### Specific Items\n${state.specificItems}\n\n`;
            if (state.knownQuantities) md += `### Known Quantities\n${state.knownQuantities}\n\n`;
            if (state.priorEstimate) md += `### Prior Estimate\n${state.priorEstimate}\n\n`;
            if (state.notes) md += `### Notes\n${state.notes}\n\n`;
        }

        // ── Full AI Analysis ──
        md += `---\n\n`;
        md += `## AI Analysis & Estimate\n\n`;
        if (state.aiAnalysis) {
            // Strip potential markdown-based XSS (javascript: links, data: links)
            const safeAnalysis = (state.aiAnalysis || '').replace(/\[([^\]]*)\]\((javascript|vbscript|data):[^)]*\)/gi, '[$1](removed)');
            md += safeAnalysis;
        } else {
            md += `*No AI analysis has been generated yet.*\n`;
        }
        md += `\n\n`;

        // ── Bid Summary (if phases configured) ──
        const bidPhasesData = this._buildBidPhasesExport(state, this._filterBOMByDisciplines(this._applyUserBOMEdits(this._extractBOMFromAnalysis(state.aiAnalysis || ""), state), state.disciplines));
        if (bidPhasesData.phases.length > 1 || (bidPhasesData.phases.length === 1 && bidPhasesData.phases[0].categories.length > 0)) {
            md += `---\n\n`;
            md += `## Bid Summary\n\n`;
            md += `| Phase | Description | Amount |\n|-------|------------|--------|\n`;
            const fmtAmt = (v) => { const abs = Math.abs(v); const s = '$' + abs.toLocaleString('en-US', {minimumFractionDigits:0,maximumFractionDigits:0}); return v < 0 ? '(' + s + ')' : s; };
            bidPhasesData.phases.forEach(p => {
                if (p.includeInProposal) {
                    const desc = p.categories.map(c => c.name).join(', ') || '—';
                    md += `| ${p.name} | ${desc} | ${fmtAmt(p.total)} |\n`;
                }
            });
            md += `| **Total if all accepted** | | **${fmtAmt(bidPhasesData.totalIfAllAccepted)}** |\n\n`;
        }

        // ── RFIs ──
        md += `---\n\n`;
        md += `## Request for Information (RFI) Log\n\n`;
        if (typeof getRFIsForDisciplines === "function") {
            const rfis = getRFIsForDisciplines(state.disciplines);
            md += `| # | Question | Selected |\n|---|---|---|\n`;
            rfis.forEach((r, i) => {
                md += `| RFI-${String(i + 1).padStart(3, "0")} | ${r.question} | ${state.selectedRFIs?.has(r.id) ? "✅" : ""} |\n`;
            });
        }
        // ── Exclusions & Assumptions ──
        const exclItems = (state.exclusions || []);
        const exclusions = exclItems.filter(e => e.type === 'exclusion');
        const assumptions = exclItems.filter(e => e.type === 'assumption');
        const clarifications = exclItems.filter(e => e.type === 'clarification');

        if (exclusions.length > 0) {
            md += `\n\n---\n\n`;
            md += `## Exclusions\n\n`;
            md += `The following items are specifically **excluded** from this estimate:\n\n`;
            exclusions.forEach((e, i) => {
                md += `${i + 1}. ${e.text}${e.category && e.category !== 'General' ? ` *(${e.category})*` : ''}\n`;
            });
            md += `\n`;
        }

        if (assumptions.length > 0) {
            md += `\n---\n\n`;
            md += `## Assumptions\n\n`;
            md += `This estimate is based on the following **assumptions**:\n\n`;
            assumptions.forEach((e, i) => {
                md += `${i + 1}. ${e.text}${e.category && e.category !== 'General' ? ` *(${e.category})*` : ''}\n`;
            });
            md += `\n`;
        }

        if (clarifications.length > 0) {
            md += `\n---\n\n`;
            md += `## Clarifications\n\n`;
            clarifications.forEach((e, i) => {
                md += `${i + 1}. ${e.text}${e.category && e.category !== 'General' ? ` *(${e.category})*` : ''}\n`;
            });
            md += `\n`;
        }

        md += `\n\n---\n\n`;
        md += `*Generated by SmartPlans — AI-Powered ELV Document Analysis & Estimation*\n`;
        md += `*${now.toISOString()}*\n\n`;
        md += `**3D CONFIDENTIAL — 3D Technology Services Inc.**\n`;

        this._download(md, `SmartPlans_${this._safeName(state)}_Report.md`, "text/markdown");
    },


    // ═══════════════════════════════════════════════════════════
    // FULL EXPORT (all three formats at once)
    // ═══════════════════════════════════════════════════════════
    exportAll(state) {
        const results = { json: false, excel: false, markdown: false };
        try { this.exportJSON(state); results.json = true; } catch (e) { console.error('[SmartPlans] JSON export failed:', e); }
        setTimeout(() => {
            try { this.exportExcel(state); results.excel = true; } catch (e) { console.error('[SmartPlans] Excel export failed:', e); }
        }, 300);
        setTimeout(() => {
            try { this.exportMarkdown(state); results.markdown = true; } catch (e) { console.error('[SmartPlans] Markdown export failed:', e); }
            // Report status after all exports attempted
            setTimeout(() => {
                const passed = Object.entries(results).filter(([, v]) => v).map(([k]) => k);
                const failed = Object.entries(results).filter(([, v]) => !v).map(([k]) => k);
                if (failed.length === 0) {
                    if (typeof spToast === 'function') spToast('All exports downloaded ✓');
                } else {
                    if (typeof spToast === 'function') spToast(`Exported: ${passed.join(', ')}. Failed: ${failed.join(', ')}`, 'error');
                }
            }, 200);
        }, 600);
    },


    // ═══════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════
    _safeName(state) {
        return (state.projectName || "Project")
            .replace(/[^a-zA-Z0-9\s-]/g, "")
            .replace(/\s+/g, "_")
            .substring(0, 40);
    },

    // ═══════════════════════════════════════════════════════════
    // SUPPLIER BOM — Row Map, Export & Import
    // ═══════════════════════════════════════════════════════════

    /**
     * Assign sequential Row# to every BOM item across all categories.
     * Returns a flat array of row-map entries for supplier workflows.
     */
    generateSupplierRowMap(state) {
        const rawBom = this._applyUserBOMEdits(this._extractBOMFromAnalysis(state.aiAnalysis), state);
        const bom = this._filterBOMByDisciplines(rawBom, state.disciplines);
        const rowMap = [];
        let rowNum = 1;

        for (let catIndex = 0; catIndex < bom.categories.length; catIndex++) {
            const cat = bom.categories[catIndex];
            for (let itemIndex = 0; itemIndex < cat.items.length; itemIndex++) {
                const item = cat.items[itemIndex];
                rowMap.push({
                    rowNum: rowNum++,
                    catIndex: catIndex,
                    itemIndex: itemIndex,
                    category: cat.name,
                    name: item.item,
                    partNumber: item.partNumber || '',
                    mfg: item.mfg || '',
                    qty: item.qty,
                    unit: item.unit,
                    unitCost: item.unitCost,
                });
            }
        }

        return rowMap;
    },

    /**
     * Export a Supplier BOM spreadsheet (Excel or CSV) for a named supplier.
     * The "Supplier Unit Cost" column is left blank for the supplier to fill in.
     * Returns { bom, rowMap, itemCount, grandTotal } so the caller can create
     * a supplier_quote record.
     */
    exportSupplierBOM(state, supplierName, format) {
        const rawBom = this._applyUserBOMEdits(this._extractBOMFromAnalysis(state.aiAnalysis), state);
        const bom = this._filterBOMByDisciplines(rawBom, state.disciplines);
        const rowMap = this.generateSupplierRowMap(state);
        const now = new Date();
        const projectName = state.projectName || 'Untitled Project';
        const estimateId = state.estimateId || state.projectId || '';

        if (bom.categories.length === 0) {
            alert('No material data found in the AI analysis. Please run the analysis first.');
            return;
        }

        // Build array-of-arrays data
        // LIVE FORMULAS: Supplier Extended Cost = Qty × Supplier Unit Cost
        // Supplier only needs to fill in unit cost — extended and totals auto-calculate
        const headerRows = [
            ['SUPPLIER BOM — PRICING REQUEST'],
            [],
            ['Project Name', projectName],
            ['Supplier', supplierName || 'TBD'],
            ['Date', now.toLocaleDateString()],
            ['Estimate ID', estimateId],
            [],
            ['Row#', 'Category', 'MFG', 'Part Number', 'Item Description', 'Qty', 'Unit', 'Supplier Unit Cost', 'Supplier Extended Cost'],
        ];
        const headerLen = headerRows.length; // rows before data starts (0-based offset)

        const dataRows = [];
        let rowIdx = 0;
        let grandTotal = 0;

        // Track formula injection points for Excel export
        const supplierFormulas = [];   // { row, col, formula, cached }
        const catSubtotalRows = [];    // 0-based absolute row indices for subtotal cells

        for (const cat of bom.categories) {
            // Category section header
            dataRows.push([cat.name.toUpperCase(), '', '', '', '', '', '', '', '']);

            const catFirstItemAbsRow = headerLen + dataRows.length; // absolute row of first item

            for (const item of cat.items) {
                rowIdx++;
                const absRow = headerLen + dataRows.length; // absolute 0-based row
                dataRows.push([
                    rowIdx,
                    '',
                    item.mfg || '',
                    item.partNumber || '',
                    item.item,
                    item.qty,
                    item.unit,
                    '',  // Supplier fills in unit cost (col H, index 7)
                    '',  // Formula: Qty × Unit Cost (col I, index 8)
                ]);
                // Formula: I{row} = F{row} * H{row}  (Qty × Supplier Unit Cost)
                const excelRow = absRow + 1; // Excel is 1-based
                supplierFormulas.push({ row: absRow, col: 8, formula: `F${excelRow}*H${excelRow}`, cached: 0 });
            }

            const catLastItemAbsRow = headerLen + dataRows.length - 1;

            grandTotal += (cat.subtotal || 0);

            // Category subtotal row — formula: SUM of extended costs for this category
            const subtotalAbsRow = headerLen + dataRows.length;
            dataRows.push(['', '', '', '', `SUBTOTAL — ${cat.name}`, '', '', '', '']);
            const excelFirst = catFirstItemAbsRow + 1;
            const excelLast = catLastItemAbsRow + 1;
            supplierFormulas.push({ row: subtotalAbsRow, col: 8, formula: `SUM(I${excelFirst}:I${excelLast})`, cached: 0 });
            // Also add SUM for unit cost column so supplier sees their subtotal
            supplierFormulas.push({ row: subtotalAbsRow, col: 7, formula: `SUM(H${excelFirst}:H${excelLast})`, cached: 0 });
            catSubtotalRows.push(subtotalAbsRow);
            dataRows.push([]);
        }

        // Grand total row — formula: SUM of all category subtotals
        dataRows.push([]);
        const totalAbsRow = headerLen + dataRows.length;
        dataRows.push(['', '', '', '', 'TOTAL', '', '', '', '']);
        const subtotalExtRefs = catSubtotalRows.map(r => `I${r + 1}`).join(',');
        const subtotalUnitRefs = catSubtotalRows.map(r => `H${r + 1}`).join(',');
        supplierFormulas.push({ row: totalAbsRow, col: 8, formula: `SUM(${subtotalExtRefs})`, cached: 0 });
        supplierFormulas.push({ row: totalAbsRow, col: 7, formula: `SUM(${subtotalUnitRefs})`, cached: 0 });

        const allRows = [...headerRows, ...dataRows];

        if (format === 'csv' || typeof XLSX === 'undefined') {
            // CSV export (no formulas — static values only)
            allRows.push([]);
            allRows.push(['3D CONFIDENTIAL — 3D Technology Services Inc.']);
            const csv = allRows.map(r =>
                r.map(c => `"${this._csvSafe(c).replace(/"/g, '""')}"`).join(',')
            ).join('\n');
            this._download(csv, `SmartPlans_SupplierBOM_${this._safeName(state)}.csv`, 'text/csv');
        } else {
            // Excel export via SheetJS — with LIVE FORMULAS
            try {
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.aoa_to_sheet(allRows);

                // Inject live formulas
                for (const sf of supplierFormulas) {
                    this._setCellFormula(ws, sf.row, sf.col, sf.formula, sf.cached);
                }
                // Apply currency format to supplier cost columns
                for (const sf of supplierFormulas) {
                    const addr = XLSX.utils.encode_cell({ r: sf.row, c: sf.col });
                    if (ws[addr]) ws[addr].z = '$#,##0.00';
                }

                ws['!cols'] = [
                    { wch: 8 },   // Row#
                    { wch: 24 },  // Category
                    { wch: 16 },  // MFG
                    { wch: 24 },  // Part Number
                    { wch: 50 },  // Item Description
                    { wch: 8 },   // Qty
                    { wch: 8 },   // Unit
                    { wch: 20 },  // Supplier Unit Cost
                    { wch: 24 },  // Supplier Extended Cost
                ];
                XLSX.utils.book_append_sheet(wb, ws, 'Supplier BOM');

                // Add 3D CONFIDENTIAL footer to sheet
                const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
                const footerRow = range.e.r + 2;
                ws[XLSX.utils.encode_cell({ r: footerRow, c: 0 })] = { v: '3D CONFIDENTIAL — 3D Technology Services Inc.', t: 's' };
                range.e.r = footerRow;
                ws['!ref'] = XLSX.utils.encode_range(range);

                const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                this._download(blob, `SmartPlans_SupplierBOM_${this._safeName(state)}.xlsx`);
            } catch (err) {
                console.error('[SmartPlans] Supplier BOM Excel export failed:', err);
                // Fallback to CSV
                allRows.push([]);
                allRows.push(['3D CONFIDENTIAL — 3D Technology Services Inc.']);
                const csv = allRows.map(r =>
                    r.map(c => `"${this._csvSafe(c).replace(/"/g, '""')}"`).join(',')
                ).join('\n');
                this._download(csv, `SmartPlans_SupplierBOM_${this._safeName(state)}.csv`, 'text/csv');
            }
        }

        if (typeof spToast === 'function') spToast(`Supplier BOM exported for ${supplierName || 'supplier'} — ${rowMap.length} items`);

        return {
            bom: bom,
            rowMap: rowMap,
            itemCount: rowMap.length,
            grandTotal: grandTotal,
        };
    },

    /**
     * Import supplier pricing from an uploaded file (Excel or CSV).
     * Reads the file, matches rows by Row# (primary) or partNumber+name (fallback),
     * and returns a summary with overrides map ready to store in state.
     */
    importSupplierPricing(file, state) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onerror = () => reject(new Error('Failed to read file: ' + (reader.error || 'Unknown error')));

            reader.onload = () => {
                try {
                    const data = new Uint8Array(reader.result);
                    let rows;

                    // Parse file based on extension
                    const ext = (file.name || '').split('.').pop().toLowerCase();
                    if (ext === 'csv') {
                        // Parse CSV via SheetJS if available, otherwise manual parse
                        if (typeof XLSX !== 'undefined') {
                            const wb = XLSX.read(data, { type: 'array' });
                            const ws = wb.Sheets[wb.SheetNames[0]];
                            rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
                        } else {
                            // Manual CSV parse fallback
                            const text = new TextDecoder().decode(data);
                            rows = text.split('\n').map(line => {
                                const cells = [];
                                let current = '';
                                let inQuotes = false;
                                for (let i = 0; i < line.length; i++) {
                                    const ch = line[i];
                                    if (ch === '"') { inQuotes = !inQuotes; continue; }
                                    if (ch === ',' && !inQuotes) { cells.push(current.trim()); current = ''; continue; }
                                    current += ch;
                                }
                                cells.push(current.trim());
                                return cells;
                            });
                        }
                    } else {
                        // Excel file
                        if (typeof XLSX === 'undefined') {
                            reject(new Error('SheetJS (XLSX) library is required to read Excel files.'));
                            return;
                        }
                        const wb = XLSX.read(data, { type: 'array' });
                        const ws = wb.Sheets[wb.SheetNames[0]];
                        rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
                    }

                    if (!rows || rows.length < 2) {
                        reject(new Error('File appears to be empty or has no data rows.'));
                        return;
                    }

                    // Find header row by scanning for row containing "Row" and "Supplier" (case-insensitive)
                    let headerRowIdx = -1;
                    let colRowNum = -1;
                    let colSupplierCost = -1;
                    let colPartNumber = -1;
                    let colName = -1;

                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row || !Array.isArray(row)) continue;

                        const cellTexts = row.map(c => String(c || '').toLowerCase());
                        const hasRow = cellTexts.some(c => c.includes('row'));
                        const hasSupplier = cellTexts.some(c => c.includes('supplier'));

                        if (hasRow && hasSupplier) {
                            headerRowIdx = i;
                            // Map columns
                            cellTexts.forEach((c, idx) => {
                                if (c.includes('row') && c.match(/row\s*#?$/i)) colRowNum = idx;
                                else if (c.includes('row')) colRowNum = colRowNum === -1 ? idx : colRowNum;
                                if (c.includes('supplier') && c.includes('cost')) colSupplierCost = idx;
                                else if (c.includes('supplier') && c.includes('unit')) colSupplierCost = colSupplierCost === -1 ? idx : colSupplierCost;
                                if (c.includes('part') && (c.includes('number') || c.includes('#'))) colPartNumber = idx;
                                if (c.includes('description') || c.includes('item desc')) colName = idx;
                            });
                            break;
                        }
                    }

                    if (headerRowIdx === -1 || colSupplierCost === -1) {
                        reject(new Error('Could not find header row with "Row" and "Supplier" columns. Ensure the spreadsheet has the expected column headers.'));
                        return;
                    }

                    // Try to extract supplier name from header area
                    let supplierName = 'Unknown';
                    for (let i = 0; i < headerRowIdx; i++) {
                        const row = rows[i];
                        if (!row) continue;
                        for (let ci = 0; ci < row.length; ci++) {
                            const cellStr = String(row[ci] || '').toLowerCase();
                            if (cellStr === 'supplier' && row[ci + 1]) {
                                supplierName = String(row[ci + 1]).trim();
                                break;
                            }
                        }
                        if (supplierName !== 'Unknown') break;
                    }

                    // Generate current row map for matching
                    const rowMap = this.generateSupplierRowMap(state);

                    // Build lookup maps for fallback matching
                    const rowNumToEntry = {};
                    const partNameToEntry = {};
                    for (const entry of rowMap) {
                        rowNumToEntry[entry.rowNum] = entry;
                        const key = (entry.partNumber + '||' + entry.name).toLowerCase();
                        partNameToEntry[key] = entry;
                    }

                    // Extract supplier prices from data rows
                    const overrides = {};
                    let itemsUpdated = 0;
                    let itemsUnchanged = 0;

                    for (let i = headerRowIdx + 1; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row || !Array.isArray(row)) continue;

                        // Read supplier cost
                        const rawCost = row[colSupplierCost];
                        if (rawCost == null || rawCost === '') continue;
                        const costStr = String(rawCost).replace(/[$,\s]/g, '');
                        const supplierPrice = parseFloat(costStr);
                        if (isNaN(supplierPrice) || supplierPrice <= 0) continue;

                        // Try Row# match first
                        let matched = null;
                        if (colRowNum !== -1) {
                            const rawRowNum = row[colRowNum];
                            const rowNum = parseInt(String(rawRowNum).replace(/[^\d]/g, ''), 10);
                            if (!isNaN(rowNum) && rowNumToEntry[rowNum]) {
                                matched = rowNumToEntry[rowNum];
                            }
                        }

                        // Fallback: partNumber + name matching
                        if (!matched) {
                            const pn = colPartNumber !== -1 ? String(row[colPartNumber] || '').trim() : '';
                            const nm = colName !== -1 ? String(row[colName] || '').trim() : '';
                            if (pn || nm) {
                                const key = (pn + '||' + nm).toLowerCase();
                                if (partNameToEntry[key]) {
                                    matched = partNameToEntry[key];
                                }
                            }
                        }

                        if (matched) {
                            const overrideKey = `${matched.catIndex}-${matched.itemIndex}`;
                            overrides[overrideKey] = {
                                unitCost: supplierPrice,
                                supplierName: supplierName,
                            };
                            itemsUpdated++;
                        } else {
                            itemsUnchanged++;
                        }
                    }

                    // Recalculate totals with overrides applied
                    // Must apply user edits first so indices match the rowMap used for matching
                    const bom = this._filterBOMByDisciplines(this._applyUserBOMEdits(this._extractBOMFromAnalysis(state.aiAnalysis), state), state.disciplines);
                    const oldTotal = bom.grandTotal;
                    let newTotal = 0;

                    for (let catIndex = 0; catIndex < bom.categories.length; catIndex++) {
                        const cat = bom.categories[catIndex];
                        let catSubtotal = 0;
                        for (let itemIndex = 0; itemIndex < cat.items.length; itemIndex++) {
                            const item = cat.items[itemIndex];
                            const key = `${catIndex}-${itemIndex}`;
                            if (overrides[key]) {
                                item.unitCost = overrides[key].unitCost;
                                item.extCost = this._round(item.qty * overrides[key].unitCost);
                            }
                            catSubtotal += item.extCost;
                        }
                        cat.subtotal = this._round(catSubtotal);
                        newTotal += cat.subtotal;
                    }
                    newTotal = this._round(newTotal);

                    const delta = this._round(newTotal - oldTotal);
                    const deltaPercent = oldTotal > 0 ? Math.round((delta / oldTotal) * 10000) / 100 : 0;

                    resolve({
                        itemsUpdated: itemsUpdated,
                        itemsUnchanged: itemsUnchanged,
                        itemsTotal: rowMap.length,
                        oldTotal: oldTotal,
                        newTotal: newTotal,
                        delta: delta,
                        deltaPercent: deltaPercent,
                        overrides: overrides,
                        supplierName: supplierName,
                    });

                } catch (err) {
                    console.error('[SmartPlans] Supplier pricing import failed:', err);
                    reject(new Error('Failed to parse supplier pricing file: ' + err.message));
                }
            };

            reader.readAsArrayBuffer(file);
        });
    },

    // ─── AI-Powered Supplier PDF Import ─────────────────────────
    // Uses Gemini to extract pricing from any supplier PDF quote
    // Handles any format — tables, line items, quotes, proposals
    async importSupplierPDF(file, state) {
        // Step 1: Convert PDF to base64
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const bytes = new Uint8Array(reader.result);
                let binary = '';
                for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                resolve(btoa(binary));
            };
            reader.onerror = () => reject(new Error('Failed to read PDF'));
            reader.readAsArrayBuffer(file);
        });

        // Step 2: Build our BOM item list for Gemini to match against
        // Must apply user edits first so indices match the actual displayed BOM
        const bom = this._filterBOMByDisciplines(this._applyUserBOMEdits(this._extractBOMFromAnalysis(state.aiAnalysis), state), state.disciplines);
        const bomItems = [];
        for (let ci = 0; ci < bom.categories.length; ci++) {
            const cat = bom.categories[ci];
            for (let ii = 0; ii < cat.items.length; ii++) {
                const it = cat.items[ii];
                bomItems.push({
                    catIndex: ci,
                    itemIndex: ii,
                    name: it.item || it.name,
                    mfg: it.mfg || '',
                    partNumber: it.partNumber || '',
                    qty: it.qty,
                    unit: it.unit,
                    currentUnitCost: it.unitCost,
                });
            }
        }

        // Step 3: Send PDF + BOM list to Gemini for extraction and matching
        const prompt = `You are a construction material pricing expert. I'm uploading a supplier PDF quote/proposal.

TASK: Extract every priced line item from this PDF and match it to my BOM items below.

MY BOM ITEMS (match the supplier's items to these):
${bomItems.map((b, i) => `[${i}] ${b.name} | MFG: ${b.mfg} | Part#: ${b.partNumber} | Qty: ${b.qty} ${b.unit} | Current: $${b.currentUnitCost}`).join('\n')}

INSTRUCTIONS:
1. Read the entire PDF and find ALL priced items
2. For each priced item, find the BEST matching item from my BOM list above
3. Match by: manufacturer + part number (best), item description similarity (good), or function (acceptable)
4. Extract the UNIT COST from the supplier (not extended/total — divide by qty if needed)
5. Items in the PDF may be in completely different order than my BOM
6. The supplier may use different names for the same products
7. If a supplier item clearly doesn't match any BOM item, skip it

IMPORTANT: Suppliers often provide SUBSTITUTE products (different manufacturer, different part number) when the originally specified item is discontinued, unavailable, or they have a better deal. Extract the supplier's ACTUAL manufacturer and part number — these may differ from what's in my BOM.

Return ONLY valid JSON array (no markdown, no explanation):
[
  { "bomIndex": 0, "supplierItem": "Their item name", "supplierMfg": "Their manufacturer", "supplierPartNumber": "Their part#", "supplierUnitCost": 123.45, "confidence": "high", "isSubstitute": false },
  { "bomIndex": 3, "supplierItem": "Their item name", "supplierMfg": "Alternate MFG", "supplierPartNumber": "ALT-123", "supplierUnitCost": 67.89, "confidence": "medium", "isSubstitute": true }
]

confidence: "high" = exact part# or MFG match, "medium" = description match, "low" = functional match
isSubstitute: true if the supplier is offering a different MFG/model than what we specified

Return ONLY the JSON array. No other text.`;

        // Step 4: Call Gemini with the PDF
        const apiKeys = [];
        for (let k = 0; k <= 17; k++) {
            const keyName = `GEMINI_KEY_${k}`;
            apiKeys.push(keyName);
        }

        const requestBody = {
            contents: [{
                parts: [
                    { text: prompt },
                    { inlineData: { mimeType: 'application/pdf', data: base64 } }
                ]
            }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 8192,
            },
            _model: 'gemini-3.1-pro-preview',
            _brainSlot: Math.floor(Math.random() * 18),
        };

        const response = await fetch('/api/ai/invoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        // Step 5: Parse SSE response
        let fullText = '';
        const reader2 = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader2.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
                if (!line.startsWith('data: ')) continue;
                try {
                    const parsed = JSON.parse(line.substring(6));
                    if (parsed._proxyError) throw new Error('AI service error: ' + parsed.message);
                    const parts = parsed?.candidates?.[0]?.content?.parts || [];
                    for (const p of parts) {
                        if (p.text && !p.thought) fullText += p.text;
                    }
                } catch (e) { /* skip unparseable lines */ }
            }
        }

        // Step 6: Parse Gemini's JSON response
        const jsonMatch = fullText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('AI could not extract pricing from this PDF. Try an Excel file instead.');

        let matches;
        try {
            matches = JSON.parse(jsonMatch[0]);
        } catch (e) {
            throw new Error('AI returned malformed pricing data. Try again or use an Excel file.');
        }

        // Step 7: Build overrides from AI matches
        const overrides = {};
        let itemsUpdated = 0;
        let itemsSkipped = 0;
        const matchDetails = [];

        for (const match of matches) {
            if (match.bomIndex == null || match.supplierUnitCost == null) continue;
            if (match.supplierUnitCost <= 0) continue;

            const bomItem = bomItems[match.bomIndex];
            if (!bomItem) { itemsSkipped++; continue; }

            const overrideKey = `${bomItem.catIndex}-${bomItem.itemIndex}`;
            overrides[overrideKey] = {
                unitCost: match.supplierUnitCost,
                mfg: match.supplierMfg || null,
                partNumber: match.supplierPartNumber || null,
                supplierItem: match.supplierItem || null,
                isSubstitute: match.isSubstitute || false,
            };
            itemsUpdated++;

            matchDetails.push({
                ourItem: bomItem.name,
                ourMfg: bomItem.mfg,
                ourPartNumber: bomItem.partNumber,
                theirItem: match.supplierItem || 'Unknown',
                theirMfg: match.supplierMfg || '',
                theirPartNumber: match.supplierPartNumber || '',
                oldCost: bomItem.currentUnitCost,
                newCost: match.supplierUnitCost,
                confidence: match.confidence || 'medium',
                isSubstitute: match.isSubstitute || false,
            });
        }

        // Step 8: Calculate totals with new pricing
        const oldTotal = bom.grandTotal;
        let newTotal = 0;
        for (let ci = 0; ci < bom.categories.length; ci++) {
            const cat = bom.categories[ci];
            let catSub = 0;
            for (let ii = 0; ii < cat.items.length; ii++) {
                const item = cat.items[ii];
                const key = `${ci}-${ii}`;
                if (overrides[key]) {
                    item.unitCost = overrides[key].unitCost;
                    item.extCost = this._round(item.qty * overrides[key].unitCost);
                }
                catSub += item.extCost;
            }
            cat.subtotal = this._round(catSub);
            newTotal += cat.subtotal;
        }
        newTotal = this._round(newTotal);

        const supplierName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');

        return {
            itemsUpdated,
            itemsSkipped,
            itemsTotal: bomItems.length,
            oldTotal,
            newTotal,
            delta: this._round(newTotal - oldTotal),
            deltaPercent: oldTotal > 0 ? Math.round(((newTotal - oldTotal) / oldTotal) * 10000) / 100 : 0,
            overrides,
            supplierName,
            matchDetails,
        };
    },

    // ─── Competitor Bid Import & Comparison ────────────────────
    // Imports a competitor bid from an uploaded Excel or CSV file.
    // Auto-detects header row, maps columns flexibly, and extracts line items.
    // Returns { competitorName, items, grandTotal, lineItemCount }.
    importCompetitorBid(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onerror = () => reject(new Error('Failed to read file: ' + (reader.error || 'Unknown error')));

            reader.onload = () => {
                try {
                    const data = new Uint8Array(reader.result);
                    let rows;

                    // Parse file based on extension
                    const ext = (file.name || '').split('.').pop().toLowerCase();
                    if (ext === 'csv') {
                        if (typeof XLSX !== 'undefined') {
                            const wb = XLSX.read(data, { type: 'array' });
                            const ws = wb.Sheets[wb.SheetNames[0]];
                            rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
                        } else {
                            const text = new TextDecoder().decode(data);
                            rows = text.split('\n').map(line => {
                                const cells = [];
                                let current = '';
                                let inQuotes = false;
                                for (let i = 0; i < line.length; i++) {
                                    const ch = line[i];
                                    if (ch === '"') { inQuotes = !inQuotes; continue; }
                                    if (ch === ',' && !inQuotes) { cells.push(current.trim()); current = ''; continue; }
                                    current += ch;
                                }
                                cells.push(current.trim());
                                return cells;
                            });
                        }
                    } else {
                        if (typeof XLSX === 'undefined') {
                            reject(new Error('SheetJS (XLSX) library is required to read Excel files.'));
                            return;
                        }
                        const wb = XLSX.read(data, { type: 'array' });
                        const ws = wb.Sheets[wb.SheetNames[0]];
                        rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
                    }

                    if (!rows || rows.length < 2) {
                        reject(new Error('File appears to be empty or has no data rows.'));
                        return;
                    }

                    // Header detection keywords
                    const headerKeywords = ['item', 'description', 'qty', 'quantity', 'unit cost', 'unit price', 'total', 'amount', 'extended', 'ext cost'];

                    // Column mapping keyword sets
                    const nameKeys = ['item', 'description', 'desc', 'name', 'material', 'product'];
                    const qtyKeys = ['qty', 'quantity', 'count', 'units'];
                    const unitCostKeys = ['unit cost', 'unit price', 'price', 'rate', '$/unit', 'cost/ea'];
                    const extKeys = ['total', 'amount', 'extended', 'ext cost', 'ext', 'line total', 'extended cost'];
                    const categoryKeys = ['category', 'section', 'division', 'group', 'csi'];

                    // Auto-detect header row
                    let headerRowIdx = -1;
                    for (let i = 0; i < Math.min(rows.length, 20); i++) {
                        const row = rows[i];
                        if (!row || !Array.isArray(row)) continue;
                        const cellTexts = row.map(c => String(c || '').toLowerCase().trim());
                        const matchCount = cellTexts.filter(c => headerKeywords.some(kw => c.includes(kw))).length;
                        if (matchCount >= 2) {
                            headerRowIdx = i;
                            break;
                        }
                    }

                    if (headerRowIdx === -1) {
                        reject(new Error('Could not detect a header row. Ensure the spreadsheet has recognizable column headers (e.g. Item, Qty, Unit Cost, Total).'));
                        return;
                    }

                    // Map columns
                    const headerCells = rows[headerRowIdx].map(c => String(c || '').toLowerCase().trim());
                    let colName = -1, colQty = -1, colUnitCost = -1, colExt = -1, colCategory = -1;

                    const findCol = (keys) => {
                        for (const kw of keys) {
                            const idx = headerCells.findIndex(c => c.includes(kw));
                            if (idx !== -1) return idx;
                        }
                        return -1;
                    };

                    colName = findCol(nameKeys);
                    colQty = findCol(qtyKeys);
                    colUnitCost = findCol(unitCostKeys);
                    colExt = findCol(extKeys);
                    colCategory = findCol(categoryKeys);

                    if (colName === -1) {
                        reject(new Error('Could not find an Item/Description column in the header row.'));
                        return;
                    }

                    // Extract competitor name from rows above the header
                    let competitorName = '';
                    const companyLabels = ['company', 'contractor', 'bidder', 'from', 'vendor'];
                    for (let i = 0; i < headerRowIdx; i++) {
                        const row = rows[i];
                        if (!row) continue;
                        for (let ci = 0; ci < row.length; ci++) {
                            const cellStr = String(row[ci] || '').toLowerCase().trim();
                            if (companyLabels.some(lbl => cellStr.includes(lbl)) && row[ci + 1]) {
                                competitorName = String(row[ci + 1]).trim();
                                break;
                            }
                        }
                        if (competitorName) break;
                    }
                    // Fallback to filename
                    if (!competitorName) {
                        competitorName = (file.name || 'Competitor').replace(/\.[^.]+$/, '').trim();
                    }

                    // Skip keywords for subtotal/total rows
                    const skipKeywords = /^(subtotal|total|grand total|sum|net total|overall|tax|markup|margin|overhead|contingency)\b/i;

                    // Parse number helper
                    const parseNum = (val) => {
                        if (val == null || val === '') return NaN;
                        const str = String(val).replace(/[$,\s()]/g, '');
                        return parseFloat(str);
                    };

                    // Extract items
                    const items = [];
                    let grandTotal = 0;

                    for (let i = headerRowIdx + 1; i < rows.length; i++) {
                        const row = rows[i];
                        if (!row || !Array.isArray(row)) continue;

                        const name = colName !== -1 ? String(row[colName] || '').trim() : '';
                        if (!name) continue;

                        // Skip subtotal/total rows
                        if (skipKeywords.test(name)) continue;

                        let qty = colQty !== -1 ? parseNum(row[colQty]) : NaN;
                        let unitCost = colUnitCost !== -1 ? parseNum(row[colUnitCost]) : NaN;
                        let extCost = colExt !== -1 ? parseNum(row[colExt]) : NaN;
                        const category = colCategory !== -1 ? String(row[colCategory] || '').trim() : '';

                        // Calculate missing fields if possible
                        if (isNaN(unitCost) && !isNaN(qty) && !isNaN(extCost) && qty !== 0) {
                            unitCost = this._round(extCost / qty);
                        }
                        if (isNaN(qty) && !isNaN(unitCost) && !isNaN(extCost) && unitCost !== 0) {
                            qty = this._round(extCost / unitCost);
                        }
                        if (isNaN(extCost) && !isNaN(qty) && !isNaN(unitCost)) {
                            extCost = this._round(qty * unitCost);
                        }

                        // Must have at least a name and some cost data
                        if (isNaN(extCost) && isNaN(unitCost)) continue;

                        items.push({
                            name: name,
                            qty: isNaN(qty) ? 0 : qty,
                            unitCost: isNaN(unitCost) ? 0 : unitCost,
                            extCost: isNaN(extCost) ? 0 : extCost,
                            category: category,
                        });

                        grandTotal += isNaN(extCost) ? 0 : extCost;
                    }

                    grandTotal = this._round(grandTotal);

                    resolve({
                        competitorName: competitorName,
                        items: items,
                        grandTotal: grandTotal,
                        lineItemCount: items.length,
                    });

                } catch (err) {
                    console.error('[SmartPlans] Competitor bid import failed:', err);
                    reject(new Error('Failed to parse competitor bid file: ' + err.message));
                }
            };

            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * Compare our BOM against an imported competitor bid.
     * Uses flexible name matching (exact, substring, word overlap).
     * Returns { matched, onlyOurs, onlyTheirs, summary }.
     */
    compareWithCompetitorBid(state, competitorData) {
        const bom = this._filterBOMByDisciplines(this._applyUserBOMEdits(this._extractBOMFromAnalysis(state.aiAnalysis), state), state.disciplines);

        // Flatten our BOM into items
        const ourItems = [];
        for (let catIndex = 0; catIndex < bom.categories.length; catIndex++) {
            const cat = bom.categories[catIndex];
            for (let itemIndex = 0; itemIndex < cat.items.length; itemIndex++) {
                const item = cat.items[itemIndex];
                ourItems.push({
                    catIndex: catIndex,
                    itemIndex: itemIndex,
                    name: (item.item || item.name || '').trim(),
                    qty: item.qty || 0,
                    unitCost: item.unitCost || 0,
                    extCost: item.extCost || 0,
                    category: cat.name || '',
                });
            }
        }

        // Word-overlap scoring helper
        const getWords = (str) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 1);

        const wordOverlapScore = (a, b) => {
            const wordsA = getWords(a);
            const wordsB = getWords(b);
            if (wordsA.length === 0 || wordsB.length === 0) return 0;
            const setB = new Set(wordsB);
            const shared = wordsA.filter(w => setB.has(w)).length;
            const maxLen = Math.max(wordsA.length, wordsB.length);
            return shared / maxLen;
        };

        // Track which of our items have been matched
        const ourMatched = new Set();
        const matched = [];

        // For each competitor item, find the best match in our BOM
        const theirUnmatched = [];

        for (const theirItem of competitorData.items) {
            const theirNameLower = (theirItem.name || '').toLowerCase().trim();
            let bestIdx = -1;
            let bestScore = 0; // 3 = exact, 2 = substring, 1+ = word overlap > 0.5

            for (let oi = 0; oi < ourItems.length; oi++) {
                if (ourMatched.has(oi)) continue;
                const ourNameLower = ourItems[oi].name.toLowerCase().trim();

                // Exact match
                if (theirNameLower === ourNameLower) {
                    bestIdx = oi;
                    bestScore = 3;
                    break; // Can't do better than exact
                }

                // Substring match
                if (theirNameLower.includes(ourNameLower) || ourNameLower.includes(theirNameLower)) {
                    if (2 > bestScore) {
                        bestIdx = oi;
                        bestScore = 2;
                    }
                    continue;
                }

                // Word overlap
                const overlap = wordOverlapScore(theirItem.name, ourItems[oi].name);
                if (overlap > 0.5 && (1 + overlap) > bestScore) {
                    bestIdx = oi;
                    bestScore = 1 + overlap;
                }
            }

            if (bestIdx !== -1) {
                ourMatched.add(bestIdx);
                const ours = ourItems[bestIdx];
                const qtyDelta = theirItem.qty - ours.qty;
                const costDelta = theirItem.unitCost - ours.unitCost;
                const extDelta = theirItem.extCost - ours.extCost;
                const pctDelta = ours.extCost !== 0
                    ? ((theirItem.extCost - ours.extCost) / ours.extCost * 100).toFixed(1)
                    : '0.0';

                matched.push({
                    ourItem: ours,
                    theirItem: theirItem,
                    qtyDelta: qtyDelta,
                    costDelta: costDelta,
                    extDelta: extDelta,
                    pctDelta: pctDelta,
                });
            } else {
                theirUnmatched.push(theirItem);
            }
        }

        // Collect our unmatched items
        const onlyOurs = ourItems.filter((_, idx) => !ourMatched.has(idx));

        // Calculate summary
        const ourTotal = ourItems.reduce((sum, item) => sum + item.extCost, 0);
        const theirTotal = competitorData.grandTotal || competitorData.items.reduce((sum, item) => sum + item.extCost, 0);
        const delta = theirTotal - ourTotal;
        const deltaPercent = ourTotal !== 0 ? (delta / ourTotal * 100).toFixed(1) : '0.0';

        let weAreHigherCount = 0;
        let weAreLowerCount = 0;
        let weAreHigherTotal = 0;
        let weAreLowerTotal = 0;

        for (const m of matched) {
            if (m.extDelta < 0) {
                // Their ext is less than ours — we are higher
                weAreHigherCount++;
                weAreHigherTotal += m.extDelta; // negative value
            } else if (m.extDelta > 0) {
                // Their ext is more than ours — we are lower
                weAreLowerCount++;
                weAreLowerTotal += m.extDelta; // positive value
            }
        }

        weAreHigherTotal = this._round(weAreHigherTotal);
        weAreLowerTotal = this._round(weAreLowerTotal);

        return {
            matched: matched,
            onlyOurs: onlyOurs,
            onlyTheirs: theirUnmatched,
            summary: {
                ourTotal: this._round(ourTotal),
                theirTotal: this._round(theirTotal),
                delta: this._round(delta),
                deltaPercent: deltaPercent,
                weAreHigherCount: weAreHigherCount,
                weAreLowerCount: weAreLowerCount,
                weAreHigherTotal: weAreHigherTotal,
                weAreLowerTotal: weAreLowerTotal,
            },
        };
    },

    // ─── Rate Library Integration ─────────────────────────────
    // Applies saved rates from the Rate Library to the current BOM.
    // Uses case-insensitive substring matching on item names.
    // Returns a summary of what was matched and the pricing delta.
    applyRateLibrary(state, rates) {
        if (!state.aiAnalysis || !rates || rates.length === 0) {
            return { itemsMatched: 0, itemsUnmatched: 0, oldTotal: 0, newTotal: 0, delta: 0 };
        }

        const rawBom = this._applyUserBOMEdits(this._extractBOMFromAnalysis(state.aiAnalysis), state);
        const bom = this._filterBOMByDisciplines(rawBom, state.disciplines);
        const overrides = {};  // Start fresh — rate library replaces existing overrides
        let itemsMatched = 0;
        let itemsUnmatched = 0;
        const oldTotal = bom.grandTotal || 0;

        for (let catIdx = 0; catIdx < bom.categories.length; catIdx++) {
            const cat = bom.categories[catIdx];
            for (let itemIdx = 0; itemIdx < cat.items.length; itemIdx++) {
                const item = cat.items[itemIdx];
                const itemNameLower = (item.item || '').toLowerCase();

                // Find best matching rate — prefer longest matching name (most specific)
                let bestMatch = null;
                let bestLen = 0;
                for (const rate of rates) {
                    const rateName = (rate.item_name || '').toLowerCase();
                    if (rateName && itemNameLower.includes(rateName) && rateName.length > bestLen) {
                        bestMatch = rate;
                        bestLen = rateName.length;
                    }
                }

                if (bestMatch) {
                    const key = `${catIdx}-${itemIdx}`;
                    overrides[key] = {
                        unitCost: bestMatch.unit_cost,
                        qty: item.qty,
                        _rateLibraryId: bestMatch.id,
                    };
                    itemsMatched++;
                } else {
                    itemsUnmatched++;
                }
            }
        }

        // Write overrides back to state
        state.supplierPriceOverrides = overrides;

        // Recalculate totals with overrides applied
        let newTotal = 0;
        for (let catIdx = 0; catIdx < bom.categories.length; catIdx++) {
            const cat = bom.categories[catIdx];
            let catSubtotal = 0;
            for (let itemIdx = 0; itemIdx < cat.items.length; itemIdx++) {
                const item = cat.items[itemIdx];
                const key = `${catIdx}-${itemIdx}`;
                if (overrides[key]) {
                    catSubtotal += this._round(overrides[key].qty * overrides[key].unitCost);
                } else {
                    catSubtotal += item.extCost || 0;
                }
            }
            newTotal += catSubtotal;
        }
        newTotal = this._round(newTotal);

        return {
            itemsMatched,
            itemsUnmatched,
            oldTotal,
            newTotal,
            delta: this._round(newTotal - oldTotal),
        };
    },

    _download(content, filename, mimeType) {
        const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType || "application/octet-stream" });
        // v5.129.6 — ZIP EVERYTHING capture mode. When this._capturedFiles is
        // an array, every export pushes its blob+filename here instead of
        // triggering a separate browser download. zipEverything() then
        // bundles them into one .zip and ships that single file.
        if (Array.isArray(this._capturedFiles)) {
            this._capturedFiles.push({ filename, blob });
            return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    // ═══════════════════════════════════════════════════════════
    // ZIP EVERYTHING (v5.129.6) — bundle every printable artifact
    // into a single archive named after the bid
    // ═══════════════════════════════════════════════════════════
    // Captures: JSON, Excel, Markdown, BOM xlsx, Master Report HTML,
    // Full Proposal HTML+Word, Executive Proposal HTML+Word, BOM PDF
    // HTML, plus a README.txt that explains what each file is.
    //
    // Files only appear in the zip when they exist — Master Report
    // requires a successful generateMasterReport() run first; Full
    // Proposal requires a successful renderAndDownload() run; etc.
    // The zip is a SNAPSHOT of whatever is cached at click time,
    // matching the user's mental model of "everything I've already
    // generated, in one bundle."
    async zipEverything(state) {
        if (typeof JSZip === 'undefined') {
            const msg = 'ZIP library not loaded. Reload the page and try again.';
            console.error('[ZipEverything]', msg);
            if (typeof spToast === 'function') spToast(msg, 'error');
            return;
        }
        if (!state) {
            if (typeof spToast === 'function') spToast('No project state available', 'error');
            return;
        }

        const safeName = this._safeName(state) || 'SmartPlans_Bid';
        const zipName = `${safeName}.zip`;
        const startedAt = new Date();

        // Reset capture buffer and turn on capture mode
        this._capturedFiles = [];

        const errors = [];
        const _safeRun = (label, fn) => {
            try { fn(); }
            catch (e) {
                console.error(`[ZipEverything] ${label} failed:`, e);
                errors.push(`${label}: ${e.message || e}`);
            }
        };

        // ── 1. Run every standard export through capture mode ──
        _safeRun('JSON',     () => this.exportJSON(state));
        _safeRun('Excel',    () => this.exportExcel(state));
        _safeRun('Markdown', () => this.exportMarkdown(state));
        _safeRun('BOM',      () => this.exportBOM(state));

        // ── 2. Pull cached HTMLs from generators ──
        // Master Report — generateMasterReport() in app.js caches the HTML
        // on window._lastMasterReportHTML so this captures it without
        // re-rendering. If the user hasn't generated one yet, the file
        // is omitted (with a note in the README).
        const lastMaster = (typeof window !== 'undefined') ? window._lastMasterReportHTML : null;
        if (lastMaster && typeof lastMaster === 'string' && lastMaster.length > 200) {
            this._capturedFiles.push({
                filename: `${safeName}_MasterReport.html`,
                blob: new Blob([lastMaster], { type: 'text/html;charset=utf-8' }),
            });
        }

        // Full Proposal (Word + HTML)
        const PG = (typeof ProposalGenerator !== 'undefined') ? ProposalGenerator : null;
        if (PG && PG._lastFullProposalHTML) {
            const html = PG._lastFullProposalHTML;
            this._capturedFiles.push({
                filename: `${safeName}_FullProposal.html`,
                blob: new Blob([html], { type: 'text/html;charset=utf-8' }),
            });
            this._capturedFiles.push({
                filename: `${safeName}_FullProposal.doc`,
                blob: new Blob(['﻿' + html], { type: 'application/msword' }),
            });
        }

        // Executive Proposal (Word + HTML)
        if (PG && PG._lastExecProposalHTML) {
            const html = PG._lastExecProposalHTML;
            this._capturedFiles.push({
                filename: `${safeName}_ExecutiveProposal.html`,
                blob: new Blob([html], { type: 'text/html;charset=utf-8' }),
            });
            this._capturedFiles.push({
                filename: `${safeName}_ExecutiveProposal.doc`,
                blob: new Blob(['﻿' + html], { type: 'application/msword' }),
            });
        }

        // BOM PDF HTML — cached on window._lastBOMPdfHTML by the PDF button
        const lastBomPdf = (typeof window !== 'undefined') ? window._lastBOMPdfHTML : null;
        if (lastBomPdf && typeof lastBomPdf === 'string' && lastBomPdf.length > 200) {
            this._capturedFiles.push({
                filename: `${safeName}_BOM_Print.html`,
                blob: new Blob([lastBomPdf], { type: 'text/html;charset=utf-8' }),
            });
        }

        // ── 3. Generate the README ──
        const captured = this._capturedFiles.slice();
        const lines = [
            `SmartPlans Bid Package — ${state.projectName || 'Project'}`,
            `Generated: ${startedAt.toLocaleString()}`,
            `Bid Total: ${state._lockedBidTotal ? '$' + Number(state._lockedBidTotal).toLocaleString() : 'see exports'}`,
            ``,
            `Files in this archive (${captured.length}):`,
            ...captured.map(f => `  - ${f.filename}`),
            ``,
            `What each one is:`,
            `  *.json   Structured bid data — import into project-management app`,
            `  *.xlsx   Excel workbook — multi-sheet (BOM, summary, financials)`,
            `  *.md     Markdown proposal report — human-readable text`,
            `  *.doc    Microsoft Word proposal — open in Word, edit, print`,
            `  *.html   Self-contained HTML — open in browser, then print to PDF`,
            ``,
            `To get a PDF: open any *.html in your browser, press Ctrl+P (or`,
            `Cmd+P), and choose "Save as PDF" as the destination printer.`,
            ``,
            `Missing files? Some artifacts are only included if they were`,
            `generated during this session:`,
            `  - Master Report → click "Generate Master Report" first`,
            `  - Full Proposal → click "Generate Full Proposal" first`,
            `  - Executive Proposal → click "Generate Executive Proposal" first`,
            `  - BOM Print HTML → click the BOM "PDF" button first`,
            ``,
        ];
        if (errors.length > 0) {
            lines.push(`Issues encountered during bundling:`);
            for (const e of errors) lines.push(`  - ${e}`);
            lines.push('');
        }
        this._capturedFiles.push({
            filename: 'README.txt',
            blob: new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }),
        });

        // ── 4. Build the ZIP ──
        let zipBlob;
        try {
            const zip = new JSZip();
            for (const f of this._capturedFiles) {
                zip.file(f.filename, f.blob);
            }
            zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        } catch (zipErr) {
            console.error('[ZipEverything] JSZip generateAsync failed:', zipErr);
            this._capturedFiles = null;
            if (typeof spToast === 'function') spToast(`ZIP build failed: ${zipErr.message || zipErr}`, 'error');
            return;
        }

        // ── 5. Disable capture mode BEFORE the final download ──
        this._capturedFiles = null;
        this._download(zipBlob, zipName, 'application/zip');

        const fileCount = captured.length;
        const sizeKB = Math.round(zipBlob.size / 1024);
        console.log(`[ZipEverything] Bundled ${fileCount} files (${sizeKB} KB) → ${zipName}`);
        if (typeof spToast === 'function') {
            spToast(`📦 Bundled ${fileCount} files → ${zipName} (${sizeKB} KB)`);
        }
    },

    // ─── Apply Bid Strategy — per-category markups & contingency ───
    applyBidStrategy(state) {
        // Apply user BOM edits BEFORE filtering so override indices match correctly
        let rawBom = this._extractBOMFromAnalysis(state.aiAnalysis);
        if (rawBom && typeof this._applyUserBOMEdits === 'function') {
            rawBom = this._applyUserBOMEdits(rawBom, state);
        }
        let bom = this._filterBOMByDisciplines(rawBom, state.disciplines);
        if (!bom || !bom.categories || bom.categories.length === 0) {
            return { grandTotalWithStrategy: 0, categories: [], totalMaterial: 0, totalLabor: 0, totalMarkup: 0, totalContingency: 0 };
        }

        const bs = state.bidStrategy;
        const isLaborCat = (name) => /\blabor\b|\binstall(ation)?\b|rough[\s-]?in|trim[\s-]?out|\bcommission(ing)?\b|\bprogram(ming)?\s+(labor|service|hours)\b|\btest(ing)?\s*[&,]\s*commission|\bmobiliz/i.test(name);
        // AUDIT FIX C7: Detect equipment and subcontractor categories for correct markup rates
        const isEquipmentCat = (name) => /\bequipment\b|\brental\b|\blift\b|\bscaffold/i.test(name);
        const isSubCat = (name) => /\bsubcontract/i.test(name);
        // AUDIT FIX C8: Detect travel categories to prevent double-counting with computeTravelIncidentals
        const isTravelCat = (name) => /\btravel\b|\bper\s*diem\b|\bhotel\b|\blodging\b|\bmileage\b/i.test(name);

        let totalMaterial = 0, totalLabor = 0, totalMarkup = 0, totalContingency = 0;
        const categoryBreakdown = [];

        for (const cat of bom.categories) {
            const catName = cat.name;
            const isLabor = isLaborCat(catName);
            const isEquip = isEquipmentCat(catName);
            const isSub = isSubCat(catName);
            const isTravel = isTravelCat(catName);
            const cm = bs.categoryMarkups[catName] || {
                materialMarkup: bs.defaultMaterialMarkup,
                laborMarkup: bs.defaultLaborMarkup,
                confidence: 'medium'
            };

            // AUDIT FIX C7: Equipment gets 15% markup, subs get 10% — not material 50%
            const materialCost = (isLabor || isEquip || isSub || isTravel) ? 0 : cat.subtotal;
            const laborCost = isLabor ? cat.subtotal : 0;
            const equipCost = isEquip ? cat.subtotal : 0;
            const subCost = isSub ? cat.subtotal : 0;
            const travelCost = isTravel ? cat.subtotal : 0;
            const matPct = cm.materialMarkup;
            const labPct = cm.laborMarkup;
            const confidence = cm.confidence;
            const contingencyPct = bs.contingencyByConfidence[confidence] || 10;

            const matWithMarkup = materialCost * (1 + matPct / 100);
            const labWithMarkup = laborCost * (1 + labPct / 100);
            // AUDIT FIX C7: Equipment 15%, subs 15%, travel 0% (pass-through)
            // Defaults mirror DEFAULT_MARKUPS_SSOT in pricing-database.js.
            const eqWithMarkup = equipCost * (1 + (bs.equipmentMarkup || 15) / 100);
            const subWithMarkup = subCost * (1 + (bs.subcontractorMarkup || 15) / 100);
            const subtotalWithMarkup = matWithMarkup + labWithMarkup + eqWithMarkup + subWithMarkup + travelCost;
            const contingencyAmt = this._round(subtotalWithMarkup * (contingencyPct / 100));
            const finalPrice = this._round(subtotalWithMarkup + contingencyAmt);

            totalMaterial += materialCost + equipCost + subCost;
            totalLabor += laborCost;
            totalMarkup += (matWithMarkup - materialCost) + (labWithMarkup - laborCost) + (eqWithMarkup - equipCost) + (subWithMarkup - subCost);
            totalContingency += contingencyAmt;

            categoryBreakdown.push({
                name: catName,
                materialCost: this._round(materialCost),
                laborCost: this._round(laborCost),
                materialMarkup: matPct,
                laborMarkup: labPct,
                confidence: confidence,
                contingencyPct: contingencyPct,
                contingencyAmt: contingencyAmt,
                finalPrice: finalPrice,
            });
        }

        // AUDIT FIX #2: Add burden, travel, and bonds — previously missing ~10% on large projects
        const cfg = state.pricingConfig || {};
        const rawBurden = Number(cfg.burdenRate) || 35;
        const burdenRate = rawBurden >= 1 ? rawBurden / 100 : rawBurden;
        const includeBurden = cfg.includeBurden !== false;
        const burden = includeBurden ? this._round(totalLabor * burdenRate) : 0;

        // AUDIT FIX C8: Only add deterministic travel if BOM didn't already include travel categories
        // Check if any BOM category was flagged as travel (prevents double-counting)
        const hasBOMTravel = categoryBreakdown.some(c => isTravelCat(c.name));
        let travel = 0;
        if (!hasBOMTravel && state.travel?.enabled && typeof computeTravelIncidentals === 'function') {
            travel = this._round(computeTravelIncidentals().grandTotal || 0);
        }

        // Bonds based on pricing tier
        const pricingTier = state.pricingTier || cfg.tier || 'mid';
        const tierBondRates = { budget: 0.015, mid: 0.02, premium: 0.025 };
        const bondsPct = tierBondRates[pricingTier] || 0.02;
        const preBondSubtotal = this._round(totalMaterial + totalLabor + totalMarkup + totalContingency + burden + travel);
        const bonds = this._round(preBondSubtotal * bondsPct);

        const grandTotalWithStrategy = this._round(preBondSubtotal + bonds);

        return {
            grandTotalWithStrategy,
            categories: categoryBreakdown,
            totalMaterial: this._round(totalMaterial),
            totalLabor: this._round(totalLabor),
            totalMarkup: this._round(totalMarkup),
            totalContingency: this._round(totalContingency),
            burden, travel, bonds, bondsPct,
        };
    },
};

// Make available globally
if (typeof window !== "undefined") {
    window.SmartPlansExport = SmartPlansExport;
}

// ═══════════════════════════════════════════════════════════════
// UNIFIED GRAND-TOTAL ENTRY POINT — SmartPlansFinancials
// Every consumer (Export engine, Proposal generator, Results UI card,
// JSON export) MUST call SmartPlansFinancials.grandTotal(state, bom).
// This wraps _getFullyLoadedTotal and returns structured output so
// callers can render the source ("transit calibrated", "BOM formula",
// etc.) in the UI — no more three-paths-three-answers problem.
// ═══════════════════════════════════════════════════════════════
const SmartPlansFinancials = {
    /**
     * Clear the bid-total lock so the next grandTotal() call recomputes.
     * Call this whenever pricing inputs change (markup, disciplines, BOM edits,
     * 3D engine rerun, bid strategy toggle). Without this, changes wouldn't
     * flow through to exports — the first computed value would be frozen.
     */
    clearLock(state) {
        if (!state) return;
        state._lockedBidTotal = null;
        state._lockedBidTotalSource = null;
    },

    /**
     * Compute the authoritative grand total for a bid.
     * @param {object} state - application state
     * @param {object} bom   - parsed BOM (may be null/empty)
     * @returns {{ total: number, source: string, breakdown?: object, calibration?: object }}
     */
    grandTotal(state, bom) {
        const total = SmartPlansExport._getFullyLoadedTotal(state, bom) || 0;
        // Determine source in priority order (matches _getFullyLoadedTotal)
        let source = 'unknown';
        let breakdown = null;
        let calibration = null;

        // Wave 10 C1-new (v5.128.7): source tag now includes live-pricing
        // provenance (Wave 7) and draft-mode flag (Wave 9). Two things
        // the old tag hid from the estimator:
        //   • _livePricingStats  → how many BOM items priced from
        //                          distributor quotes / rate library vs static DB
        //   • _draftModeActive / _claudeFailoverActive → whether Gemini Pro
        //                          degraded and the bid ran on Claude
        // Both affect how much confidence the estimator should have, and
        // whether the proposal should carry a "draft — do not submit" watermark.
        const lpStats = state?._livePricingStats;
        const liveCount = lpStats ? ((lpStats.distributor || 0) + (lpStats.rate_library || 0) + (lpStats.user_override || 0)) : 0;
        const totalItems = lpStats?.total || 0;
        const livePricingSuffix = totalItems > 0
            ? ` + live pricing (${liveCount}/${totalItems} from distributor/rate-lib)`
            : '';
        const draftSuffix = (state?._draftModeActive || state?._claudeFailoverActive)
            ? ' [DRAFT — Claude fallback or model-health override]'
            : '';

        if (state?.bidStrategy?.applied) {
            source = `bid-strategy (user-applied per-category markups)${livePricingSuffix}${draftSuffix}`;
        } else if (state?.isTransitRailroad && state?._engine3DResult?.grandTotalSELL > 1000) {
            const e3d = state._engine3DResult;
            const base = e3d._calibrated
                ? `FormulaEngine3D (transit, calibrated to ${e3d._calibrationBenchmark})`
                : e3d._calibrationRejected
                    ? `FormulaEngine3D (transit, calibration REJECTED: ${e3d._calibrationRejectionReason})`
                    : 'FormulaEngine3D (transit, within ±6% of benchmark)';
            source = base + livePricingSuffix + draftSuffix;
            if (e3d._calibrated || e3d._calibrationRejected) {
                calibration = {
                    applied: !!e3d._calibrated,
                    rejected: !!e3d._calibrationRejected,
                    rejectionReason: e3d._calibrationRejectionReason || null,
                    benchmark: e3d._calibrationBenchmark || null,
                    target: e3d._calibrationTarget || e3d._calibrationAttemptedTarget || null,
                    scaleFactor: e3d._calibrationScaleFactor || null,
                };
            }
        } else if (bom?.categories?.length > 0) {
            source = `deterministic BOM breakdown (canonical formula)${livePricingSuffix}${draftSuffix}`;
            try { breakdown = SmartPlansExport._computeFullBreakdown(state, bom); } catch (e) { /* non-fatal */ }
        } else {
            source = `Financial Engine AI fallback or raw BOM (no breakdown available)${draftSuffix}`;
        }
        return {
            total,
            source,
            breakdown,
            calibration,
            livePricing: lpStats || null,
            draftMode: !!(state?._draftModeActive || state?._claudeFailoverActive),
        };
    },
};
if (typeof window !== 'undefined') {
    window.SmartPlansFinancials = SmartPlansFinancials;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports.SmartPlansFinancials = SmartPlansFinancials;
}
