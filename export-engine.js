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

    // ─── Build structured data package ─────────────────────────
    buildExportPackage(state) {
        const now = new Date();
        const regionKey = state.regionalMultiplier || "national_average";
        const regionMult = PRICING_DB.regionalMultipliers[regionKey] || 1.0;
        const burdenMult = state.includeBurden ? (1 + state.burdenRate / 100) : 1.0;

        // Pre-extract BOM for financials section
        const bom = this._extractBOMFromAnalysis(state.aiAnalysis);
        const bomWarning = bom._warning || null;

        // Apply supplier price overrides if present
        const overrides = state.supplierPriceOverrides || {};
        if (Object.keys(overrides).length > 0) {
            for (const [key, override] of Object.entries(overrides)) {
                const [catIdx, itemIdx] = key.split('-').map(Number);
                if (bom.categories[catIdx] && bom.categories[catIdx].items[itemIdx]) {
                    const item = bom.categories[catIdx].items[itemIdx];
                    if (override.qty != null) item.qty = override.qty;
                    item.unitCost = override.unitCost;
                    item.extCost = this._round(item.qty * override.unitCost);
                    if (override.mfg) item.mfg = override.mfg;
                    if (override.partNumber) item.partNumber = override.partNumber;
                    if (override.isSubstitute) item._isSubstitute = true;
                }
            }
            // Recalculate category subtotals and grand total
            bom.grandTotal = 0;
            for (const cat of bom.categories) {
                cat.subtotal = cat.items.reduce((s, it) => s + it.extCost, 0);
                cat.subtotal = this._round(cat.subtotal);
                bom.grandTotal += cat.subtotal;
            }
            bom.grandTotal = this._round(bom.grandTotal);
        }

        // Filter BOM to only include categories for selected disciplines
        const filteredBom = this._filterBOMByDisciplines(bom, state.disciplines);

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
                workShift: state.workShift || "",
                isTransitRailroad: state.isTransitRailroad || false,
                floorPlateWidth: state.floorPlateWidth || 0,
                floorPlateDepth: state.floorPlateDepth || 0,
                ceilingHeight: state.ceilingHeight || 10,
                floorToFloorHeight: state.floorToFloorHeight || 14,
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
            financials: {
                grandTotal: this._getFullyLoadedTotal(state, filteredBom),
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
        };
    },

    // ─── Classify BOM categories into material/equipment/subs/labor ──
    _classifyBOM(bom) {
        let materials = 0, equipment = 0, subs = 0, labor = 0, travel = 0;
        for (const cat of (bom?.categories || [])) {
            const n = (cat.name || '').toLowerCase();
            if (/travel|per\s*diem|incidental|lodging|hotel|mileage|flight/i.test(n)) {
                // Travel is pass-through — NO markup, not counted as materials
                travel += (cat.subtotal || 0);
                console.log(`[Export] BOM category "${cat.name}" classified as TRAVEL (pass-through) — $${(cat.subtotal || 0).toLocaleString()}`);
            } else if (/subcontract|civil|traffic|insurance|parking/i.test(n)) {
                subs += (cat.subtotal || 0);
            } else if (/equipment|air.?condition|hvac.?condition|scissor|boom|excavat|tugger|drill|saw|scanner|ups|generator|battery.?backup|power.?supply/i.test(n)) {
                equipment += (cat.subtotal || 0);
            } else if (/labor|install|rough.?in|trim|commission|program|test|mobiliz|phase\s*\d/i.test(n)) {
                // Labor categories that leaked past the BOM parser filter —
                // segregate them so they don't inflate the material total
                labor += (cat.subtotal || 0);
                console.warn(`[Export] BOM category "${cat.name}" classified as LABOR (not material) — $${(cat.subtotal || 0).toLocaleString()}`);
            } else {
                materials += (cat.subtotal || 0);
            }
        }
        return { materials, equipment, subs, labor, travel };
    },

    // ─── Compute full bid price breakdown with all markups ──
    // SINGLE SOURCE OF TRUTH: Every output reads from this.
    _computeFullBreakdown(state, bom) {
        const { materials, equipment, subs, labor: bomLabor, travel: bomTravel } = this._classifyBOM(bom);
        const cfg = state.pricingConfig?.markup || state.markup || {};
        const matPct = (cfg.material ?? 50) / 100;
        const labPct = (cfg.labor ?? 50) / 100;
        const eqPct = (cfg.equipment ?? 15) / 100;
        const subPct = (cfg.subcontractor ?? 10) / 100;
        const rawBurden = state.pricingConfig?.burdenRate ?? 35;
        const burdenRate = rawBurden > 1 ? rawBurden / 100 : rawBurden;
        const includeBurden = state.pricingConfig?.includeBurden !== false;
        const contingencyPct = 0.10;

        console.log(`[Export] _classifyBOM: materials=$${materials.toLocaleString()}, equipment=$${equipment.toLocaleString()}, subs=$${subs.toLocaleString()}, bomLabor=$${bomLabor.toLocaleString()}, bomTravel=$${bomTravel.toLocaleString()}`);

        // ── Labor: use REAL data from Labor Calculator brain when available ──
        // Previously this always used materials × 1.0 which doubled labor when
        // the AI already calculated it via NECA standards.
        const laborCalc = state.brainResults?.wave2_25?.LABOR_CALCULATOR;
        let laborBase;
        if (laborCalc?.total_base_cost > 0) {
            // Real NECA-based labor from the Labor Calculator brain
            laborBase = this._round(laborCalc.total_base_cost);
            console.log(`[Export] Labor from LABOR_CALCULATOR: $${laborBase.toLocaleString()} (${laborCalc.total_hours || 0} hrs)`);
        } else if (bomLabor > 0) {
            // Labor categories leaked into BOM — use those directly (already costed)
            laborBase = this._round(bomLabor);
            console.log(`[Export] Labor from BOM categories: $${laborBase.toLocaleString()}`);
        } else {
            // No labor data at all — estimate from material cost (legacy fallback)
            laborBase = this._round(materials * 1.0);
            console.warn(`[Export] No labor data available — estimating as 100% of materials: $${laborBase.toLocaleString()}`);
        }

        const matSell = this._round(materials * (1 + matPct));
        const labSell = this._round(laborBase * (1 + labPct));
        const eqSell = this._round(equipment * (1 + eqPct));
        const subSell = this._round(subs * (1 + subPct));
        const burden = includeBurden ? this._round(laborBase * burdenRate) : 0;
        // Travel: use Stage 6 deterministic travel if configured, otherwise BOM travel
        // Travel is PASS-THROUGH — no markup applied (it's already at cost)
        const stage6Travel = (state.travel?.enabled && typeof computeTravelIncidentals === 'function')
            ? this._round(computeTravelIncidentals().grandTotal || 0) : 0;
        const travel = stage6Travel > 0 ? stage6Travel : this._round(bomTravel);
        if (bomTravel > 0 && stage6Travel > 0) {
            console.log(`[Export] Travel: Stage 6 $${stage6Travel.toLocaleString()} (BOM had $${bomTravel.toLocaleString()} — using Stage 6, BOM travel excluded from materials)`);
        } else if (bomTravel > 0) {
            console.log(`[Export] Travel: BOM pass-through $${bomTravel.toLocaleString()} (no Stage 6 configured)`);
        }

        let subtotal = this._round(matSell + labSell + eqSell + subSell + burden + travel);
        let contingency = this._round(subtotal * contingencyPct);
        let grandTotal = this._round(subtotal + contingency);

        // ═══ TRANSIT/RAILROAD BENCHMARK CALIBRATION ═══
        // The AI Material Pricer consistently produces raw material costs 2-3x too high
        // because it prices at near-sell levels, then our formula adds markups on top.
        // Instead of capping the output, we CALIBRATE the material input using actual
        // bid data and the known 1.485x cost-to-sell multiplier.
        //
        // How it works:
        // 1. Find closest Amtrak bid by camera count
        // 2. Compute target grand total from that benchmark
        // 3. If our formula's output exceeds target by >15%, scale materials to hit target
        //
        // This is based on REAL winning bid data, not guesses.
        if (state.isTransitRailroad && typeof PRICING_DB !== 'undefined' && PRICING_DB.amtrakBenchmarks?.actualBids) {
            const bids = PRICING_DB.amtrakBenchmarks.actualBids;
            const consensus = state.brainResults?.wave1_75?.CONSENSUS_ARBITRATOR?.consensus_counts;
            const finalRecon = state.brainResults?.wave3_75?.FINAL_RECONCILIATION?.final_counts;

            // Get camera count — CONSENSUS is the primary source (6-read engine designed for counting).
            // BOM count is unreliable because it matches accessories (licenses, mounts, SD cards).
            const camRegex = /camera|dome|bullet|ptz|fisheye|panoram|turret|lpr/i;
            const camAccessoryExclude = /mount|bracket|license|sd\s*card|memory|cable|adapter|mic|audio|housing|heater|sunshield|pendant|pole|arm|power|surge|injector|midspan|splitter|software|warranty|maintenance|accessori/i;

            let consensusCount = 0;
            const countSource = finalRecon || consensus;
            if (countSource) {
                for (const [key, val] of Object.entries(countSource)) {
                    if (camRegex.test(key) && !camAccessoryExclude.test(key)) {
                        consensusCount += (typeof val === 'number' ? val : val?.count || val?.qty || 0);
                    }
                }
            }

            // BOM count as fallback only — with strict accessory exclusion
            let bomCamCount = 0;
            for (const cat of (bom?.categories || [])) {
                if (/cctv|camera|surveillance/i.test(cat.name || '')) {
                    for (const item of (cat.items || [])) {
                        const itemName = item.item || item.name || '';
                        if (camRegex.test(itemName) && !camAccessoryExclude.test(itemName)) {
                            bomCamCount += (item.qty || 0);
                        }
                    }
                }
            }

            // Use CONSENSUS as primary (designed for counting). BOM only if consensus unavailable.
            let cameraCount = consensusCount >= 5 ? consensusCount : bomCamCount;
            console.log(`[Export]   Camera counts — Consensus: ${consensusCount}, BOM (filtered): ${bomCamCount}, Using: ${cameraCount}`);

            // Check if project is infrastructure-heavy (subs dominate the BOM)
            // Per-camera calibration is unreliable when subs > 40% of raw BOM because
            // the project cost is driven by civil/electrical work, not camera count.
            // Example: Sacramento — 32 cameras but $721K subs (77% of BOM) = infrastructure project
            const rawBomTotal = bom?.categories?.reduce((sum, c) => sum + (c.subtotal || 0), 0) || 0;
            const subPctOfBom = rawBomTotal > 0 ? (subs / rawBomTotal) : 0;
            if (subPctOfBom > 0.40) {
                console.log(`[Export] ⚠️ SKIPPING per-camera calibration — subs are ${(subPctOfBom * 100).toFixed(0)}% of BOM ($${subs.toLocaleString()} / $${rawBomTotal.toLocaleString()})`);
                console.log(`[Export]   Infrastructure-heavy project — formula total $${grandTotal.toLocaleString()} is more reliable than per-camera benchmark`);
                // Skip calibration — fall through to the non-calibrated return
            } else if (cameraCount >= 5) {
                // Find closest bid by camera count
                const bidArray = Object.entries(bids)
                    .map(([k, v]) => ({ key: k, ...v }))
                    .filter(b => b.cameras > 0 && b.total > 0);

                let closest = null;
                let closestDiff = Infinity;
                for (const b of bidArray) {
                    const diff = Math.abs(b.cameras - cameraCount);
                    if (diff < closestDiff) { closestDiff = diff; closest = b; }
                }

                // If we have BAFO bids, prefer those over original/VE for same camera count
                const sameCamBids = bidArray.filter(b => b.cameras === closest.cameras);
                const bafo = sameCamBids.find(b => b.type === 'bafo');
                const original = sameCamBids.find(b => b.type === 'original');
                const benchmark = bafo || original || closest;

                // Compute per-camera sell price from benchmark and scale to our camera count
                const perCameraSell = benchmark.total / benchmark.cameras;
                const targetGrandTotal = this._round(cameraCount * perCameraSell);

                console.log(`[Export] ═══ TRANSIT CALIBRATION ═══`);
                console.log(`[Export]   Camera count: ${cameraCount} (from ${finalRecon ? 'Final Reconciliation' : consensus ? 'Consensus' : 'BOM'})`);
                console.log(`[Export]   Benchmark: ${benchmark.key} — ${benchmark.cameras} cameras, $${benchmark.total.toLocaleString()} (${benchmark.type})`);
                console.log(`[Export]   Per-camera sell: $${Math.round(perCameraSell).toLocaleString()}`);
                console.log(`[Export]   Target grand total: $${targetGrandTotal.toLocaleString()}`);
                console.log(`[Export]   Formula grand total: $${grandTotal.toLocaleString()}`);

                const deviation = grandTotal / targetGrandTotal;
                // Calibrate if formula output is >8% ABOVE or >8% BELOW benchmark
                // The AI is wildly inconsistent ($1.5M one run, $3M the next).
                // Benchmark data from actual winning bids is the anchor.
                const needsCalibration = deviation > 1.08 || deviation < 0.92;
                if (needsCalibration) {
                    const direction = deviation > 1 ? 'OVER' : 'UNDER';
                    const pctOff = Math.round(Math.abs(deviation - 1) * 100);
                    // For BAFO bids target the exact price; for originals add 2% buffer
                    const targetMultiplier = benchmark.type === 'bafo' ? 1.00 : 1.02;
                    const calibratedTarget = this._round(targetGrandTotal * targetMultiplier);
                    const scaleFactor = calibratedTarget / grandTotal;

                    console.warn(`[Export] ⚠️ CALIBRATING ${direction}: formula is ${pctOff}% ${direction.toLowerCase()} benchmark`);
                    console.warn(`[Export]   Scale factor: ${(scaleFactor * 100).toFixed(1)}% → target $${calibratedTarget.toLocaleString()}`);

                    // Scale all raw costs proportionally
                    const sMat = this._round(materials * scaleFactor);
                    const sLab = this._round(laborBase * scaleFactor);
                    const sEq = this._round(equipment * scaleFactor);
                    const sSub = this._round(subs * scaleFactor);

                    const sMatSell = this._round(sMat * (1 + matPct));
                    const sLabSell = this._round(sLab * (1 + labPct));
                    const sEqSell = this._round(sEq * (1 + eqPct));
                    const sSubSell = this._round(sSub * (1 + subPct));
                    const sBurden = includeBurden ? this._round(sLab * burdenRate) : 0;

                    subtotal = this._round(sMatSell + sLabSell + sEqSell + sSubSell + sBurden + travel);
                    contingency = this._round(subtotal * contingencyPct);
                    grandTotal = this._round(subtotal + contingency);

                    console.warn(`[Export]   Calibrated grand total: $${grandTotal.toLocaleString()} (target was $${calibratedTarget.toLocaleString()})`);
                    const cCommPct = (state.commissionPct || 0) / 100;
                    const cTaxPct = (state.salesTaxPct || 0) / 100;
                    const cEscPct = (state.escalationPct || 0) / 100;
                    const cComm = this._round(grandTotal * cCommPct);
                    const cTax = this._round(sMat * cTaxPct);
                    const cEsc = this._round(sMat * cEscPct);
                    const cFinal = this._round(grandTotal + cComm + cTax + cEsc);
                    return {
                        materials: sMat, equipment: sEq, subs: sSub, laborBase: sLab,
                        matPct, labPct, eqPct, subPct,
                        matSell: sMatSell, labSell: sLabSell, eqSell: sEqSell, subSell: sSubSell,
                        burden: sBurden, burdenRate: includeBurden ? burdenRate : 0,
                        travel, subtotal, contingency, contingencyPct, grandTotal,
                        commission: cComm, commissionPct: cCommPct, salesTax: cTax, salesTaxPct: cTaxPct,
                        escalation: cEsc, escalationPct: cEscPct, finalTotal: cFinal,
                        _benchmarkCalibrated: true, _scaleFactor: scaleFactor,
                        _calibrationDirection: direction,
                        _cameraCount: cameraCount, _benchmarkKey: benchmark.key,
                        _targetGrandTotal: calibratedTarget
                    };
                } else {
                    console.log(`[Export]   ✅ Within ±8% of benchmark — no calibration needed`);
                }
            }
        }

        // ═══ Commission, Sales Tax & Escalation ═══
        const commissionPct = (state.commissionPct || 0) / 100;
        const salesTaxPct = (state.salesTaxPct || 0) / 100;
        const escalationPct = (state.escalationPct || 0) / 100;
        const commission = this._round(grandTotal * commissionPct);
        const salesTax = this._round(materials * salesTaxPct); // Tax on materials only
        const escalation = this._round(materials * escalationPct); // Escalation on materials
        const finalTotal = this._round(grandTotal + commission + salesTax + escalation);

        return {
            materials, equipment, subs, laborBase,
            matPct, labPct, eqPct, subPct,
            matSell, labSell, eqSell, subSell,
            burden, burdenRate: includeBurden ? burdenRate : 0,
            travel, subtotal, contingency, contingencyPct, grandTotal,
            commission, commissionPct, salesTax, salesTaxPct,
            escalation, escalationPct, finalTotal
        };
    },

    // ─── Get fully loaded bid total ──
    _getFullyLoadedTotal(state, bom) {
        // ═══ UNIFIED GRAND TOTAL — Single Source of Truth ═══
        // _computeFullBreakdown() is the ONLY formula used for the grand total.
        // This ensures Master Report, BOM Export, JSON Export, and Proposals
        // all show the SAME number using the SAME deterministic formula:
        //   Materials × markup + Labor × markup + Equipment × markup +
        //   Subs × markup + Burden (35% of labor) + Travel + Contingency (10%)
        //
        // The Financial Engine AI provides raw cost COMPONENTS (materials, labor,
        // equipment, subs) but does NOT compute the grand total — that's our job.

        console.log(`[Export] brainResults available: ${!!state.brainResults}`);

        // Priority 1: Deterministic breakdown (ALWAYS preferred)
        if (bom?.categories?.length > 0) {
            const breakdown = this._computeFullBreakdown(state, bom);
            if (breakdown.grandTotal > 1000) {
                // Use finalTotal if commission/tax/escalation were applied
                const displayTotal = (breakdown.finalTotal > breakdown.grandTotal) ? breakdown.finalTotal : breakdown.grandTotal;
                console.log(`[Export] ✅ Grand total from deterministic breakdown: $${displayTotal.toLocaleString()}${breakdown._benchmarkCalibrated ? ` (transit calibrated from ${breakdown._benchmarkKey}, ${breakdown._cameraCount} cams)` : ''}${breakdown.finalTotal > breakdown.grandTotal ? ` (incl. commission/tax/escalation from base $${breakdown.grandTotal.toLocaleString()})` : ''}`);
                return displayTotal;
            }
        }

        // Priority 2: Bid strategy if user applied one
        if (state.bidStrategy?.applied) {
            const result = this.applyBidStrategy?.(state);
            if (result?.grandTotalWithStrategy > 1000) {
                console.log(`[Export] Grand total from Bid Strategy: $${result.grandTotalWithStrategy.toLocaleString()}`);
                return this._round(result.grandTotalWithStrategy);
            }
        }

        // Priority 3: Financial Engine AI total (legacy fallback only)
        const finEngine = state.brainResults?.wave2_5_fin?.FINANCIAL_ENGINE;
        if (finEngine?.project_summary?.grand_total > 1000) {
            let val = this._round(finEngine.project_summary.grand_total);
            // Replace AI-computed travel with deterministic Stage 6 travel
            let stage6Travel = 0;
            if (state.travel?.enabled && typeof computeTravelIncidentals === 'function') {
                const tCosts = computeTravelIncidentals();
                stage6Travel = this._round(tCosts.grandTotal || 0);
            }
            if (stage6Travel > 0) {
                const aiTravel = this._round(finEngine.project_summary.total_travel || 0);
                val = this._round(val - aiTravel + stage6Travel);
            }
            console.log(`[Export] ⚠️ Fallback to Financial Engine AI total: $${val.toLocaleString()}`);
            return val;
        }

        // Priority 4: Raw BOM with 10% buffer (last resort)
        const rawTotal = bom?.grandTotal || 0;
        console.warn(`[Export] ⚠️ Last resort: raw BOM $${rawTotal} + 10%`);
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
                    selected: state.selectedRFIs.has(r.id),
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
            if (cells[0].includes('continue') || cells[0].includes('...') || cells[0].toLowerCase() === 'total' || cells[0].toLowerCase() === 'subtotal') continue;

            let qty = 1, unit = 'ea', unitCost = 0, extCost = 0;

            if (cells.length >= 5) {
                qty = parseInt(cells[1]) || 1;
                unit = cells[2].toLowerCase() || 'ea';
                const ucMatch = cells[3].match(/\$?([\d,.]+)/);
                const ecMatch = cells[4].match(/\$?([\d,.]+)/);
                unitCost = ucMatch ? parseFloat(ucMatch[1].replace(/,/g, '')) : 0;
                extCost = ecMatch ? parseFloat(ecMatch[1].replace(/,/g, '')) : (qty * unitCost);
            } else if (cells.length >= 4) {
                // 4-column: Item | Qty | Unit Cost | Total
                qty = parseInt(cells[1]) || 1;
                const ucMatch = cells[2].match(/\$?([\d,.]+)/);
                const ecMatch = cells[3].match(/\$?([\d,.]+)/);
                unitCost = ucMatch ? parseFloat(ucMatch[1].replace(/,/g, '')) : 0;
                extCost = ecMatch ? parseFloat(ecMatch[1].replace(/,/g, '')) : (qty * unitCost);
            } else if (cells.length >= 3) {
                const qtyMatch = cells.find(c => c.match(/^\d+$/));
                const costMatch = cells.find(c => c.match(/\$[\d,]+/));
                qty = qtyMatch ? parseInt(qtyMatch) : 1;
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
                    const qty = parseInt(bm[1]) || 1;
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
                        budgeted_qty: parseInt(nm[2]) || 1,
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
                    budgeted_qty: parseInt(m[1]),
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
                const boldMatch = !h2Match && line.match(/^\*\*([^*]{3,80})\*\*\s*$/);
                const heading = h2Match ? h2Match[1].replace(/\*+/g, '').trim() : (boldMatch ? boldMatch[1].trim() : null);

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
                            else if (cl.includes('unit cost') || cl.includes('unit price') || cl.includes('rate') || cl.includes('unit$')) colMap.unitCost = idx;
                            else if (cl.includes('ext') || cl.includes('total') || cl.includes('amount') || cl.includes('cost')) {
                                if (colMap.extCost === undefined) colMap.extCost = idx;
                            }
                            else if (cl === 'unit' || cl === 'uom') colMap.unit = idx;
                            else if (cl.includes('mfg') || cl.includes('manufacturer') || cl.includes('brand') || cl.includes('make')) colMap.mfg = idx;
                            else if (cl.includes('part') || cl.includes('model') || cl.includes('sku') || cl.includes('p/n')) colMap.partNumber = idx;
                        });
                        inTable = true;
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
                            qty = parseFloat(qv) || parseInt(qv) || 1;
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
                        if (qty === 1 && unitCost === 0 && extCost === 0 && cells.length >= 3) {
                            for (let ci = 1; ci < cells.length; ci++) {
                                const val = cells[ci].replace(/[,\s$]/g, '');
                                const num = parseFloat(val);
                                if (!isNaN(num)) {
                                    if (qty === 1 && num === Math.floor(num) && num < 100000 && ci < cells.length - 1) { qty = num; }
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
                    // Non-table line — reset table state if we were in one
                    if (inTable && headersParsed) {
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
            // subtotals as if they were real line items (often at half price). This DOUBLE-COUNTS
            // hundreds of thousands of dollars. Filter them out BEFORE calculating totals.
            const summaryPatterns = /subtotal|summary|recap|rollup|total.*table/i;
            const realCategories = categories.filter(cat => {
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

            // ═══ DEDUPLICATION & MISCLASSIFICATION FIX ═══
            // The AI ignores prompt instructions and puts items in wrong categories.
            // This code ENFORCES correct classification regardless of what the AI does.

            // 1. HIGH-VALUE ITEMS — only keep first occurrence across all categories
            const seenItems = new Map();
            const highValueDupPatterns = /ups|inverter|video.*server|vms.*server|surveillance.*server|security\s*center|genetec.*server|bcd.*server|network.*enclosure|remote.*enclosure|idf.*enclosure|nema.*enclosure|kvm|console.*kvm|pdu|managed.*pdu|patch\s*panel|fiber\s*panel/i;

            // 2. TRAVEL — remove from ANY non-travel category (catches all formats)
            const travelDupPatterns = /hotel|per\s*diem|lodging|mileage|rental.*car|travel.*home|tolls.*parking|workers?\s*[x×]\s*\d+\s*days?\s*@|crew\s*[x×]\s*\d+\s*days?\s*@|\d+\s*night|\d+\s*day.*\$\d+/i;

            // 3. MISCLASSIFIED ITEMS — items that should NOT be in certain categories
            const notCCTV = /bollard|m30|window.*film|blast.*film|(?<!\bin)door(?!.*cam)|electric\s*strike|latch|signage|paint|ceiling|masonry|concrete|hvac|mini.?split|trench|saw\s*cut|power\s*circuit|panel\s*board|conduit.*install/i;
            const isCameraItem = /camera|dome|bullet|ptz|fisheye|panoram|varifocal|8mp|5mp|4mp|lpr|turret|nvr|vms|genetec|axis|hikvision|dahua|milestone/i;
            const notStructCabling = /ups|inverter|station.*power|battery.*bank|video.*server|surveillance.*server|security\s*center|bollard/i;

            realCategories.forEach((cat, ci) => {
                const catName = (cat.name || '').toLowerCase();
                const isCCTV = /cctv|camera|video|surveillance/i.test(cat.name);
                const isCabling = /cabling|structured|cable\s*mat/i.test(cat.name);
                const isTravel = /travel|per\s*diem|incidental/i.test(cat.name);
                const isSub = /subcontract|sub\s*cost/i.test(cat.name);

                cat.items = cat.items.filter((item, ii) => {
                    const name = (item.item || item.name || '').trim();
                    const nameLower = name.toLowerCase();
                    const ext = item.extCost || 0;
                    if (!name || ext <= 0) return true;

                    // Remove travel from non-travel categories
                    if (travelDupPatterns.test(nameLower) && !isTravel) {
                        console.warn(`[Dedup] REMOVED travel from "${cat.name}": "${name}" ($${ext.toLocaleString()})`);
                        return false;
                    }

                    // Remove misclassified items from CCTV (but NEVER remove actual camera items)
                    if (isCCTV && notCCTV.test(nameLower) && !isCameraItem.test(nameLower)) {
                        console.warn(`[Dedup] REMOVED non-camera item from CCTV: "${name}" ($${ext.toLocaleString()})`);
                        return false;
                    }

                    // Remove misclassified items from Structured Cabling
                    if (isCabling && notStructCabling.test(nameLower)) {
                        console.warn(`[Dedup] REMOVED misclassified item from Cabling: "${name}" ($${ext.toLocaleString()})`);
                        return false;
                    }

                    // Deduplicate high-value items across categories (first occurrence wins)
                    if (highValueDupPatterns.test(nameLower) && ext >= 1000) {
                        // Normalize key: remove special chars, take first 30 chars
                        const key = nameLower.replace(/[^a-z0-9]/g, '').substring(0, 30);
                        // Also check by cost — same item at same price in different category = duplicate
                        const costKey = `${key}_${Math.round(ext)}`;
                        if (seenItems.has(key) || seenItems.has(costKey)) {
                            const prev = seenItems.get(key) || seenItems.get(costKey);
                            console.warn(`[Dedup] REMOVED duplicate: "${name}" ($${ext.toLocaleString()}) in "${cat.name}" — already in "${prev.catName}"`);
                            return false;
                        }
                        seenItems.set(key, { catIdx: ci, catName: cat.name, ext });
                        seenItems.set(costKey, { catIdx: ci, catName: cat.name, ext });
                    }

                    // Deduplicate by EXACT COST — if two items in different categories have
                    // the exact same extCost > $10K AND similar names, they're likely duplicates.
                    // FIX: Require name similarity — NVR ($10K) and Server ($10K) are NOT duplicates.
                    if (ext >= 10000) {
                        const priceKey = `price_${Math.round(ext)}`;
                        if (seenItems.has(priceKey)) {
                            const prev = seenItems.get(priceKey);
                            // Only dedup if different category AND names are similar (first 8 alpha chars match)
                            const curNorm = name.toLowerCase().replace(/[^a-z]/g, '').substring(0, 8);
                            const prevNorm = (prev.itemName || '').toLowerCase().replace(/[^a-z]/g, '').substring(0, 8);
                            const namesSimilar = curNorm === prevNorm || curNorm.includes(prevNorm) || prevNorm.includes(curNorm);
                            if (prev.catIdx !== ci && namesSimilar) {
                                console.warn(`[Dedup] REMOVED likely duplicate (same cost $${ext.toLocaleString()}, similar name): "${name}" in "${cat.name}" — matches "${prev.itemName}" in "${prev.catName}"`);
                                return false;
                            }
                        }
                        seenItems.set(priceKey, { catIdx: ci, catName: cat.name, ext, itemName: name });
                    }

                    return true;
                });
                cat.subtotal = cat.items.reduce((s, i) => s + (i.extCost || 0), 0);
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
                            items: loc.items.map(item => ({
                                item: item.item_name,
                                qty: item.budgeted_qty || 1,
                                unit: item.unit || 'ea',
                                unitCost: item.unit_cost || 0,
                                extCost: item.budgeted_cost || 0,
                                category: item.category || 'other',
                            })),
                            subtotal: loc.items.reduce((s, it) => s + (it.budgeted_cost || 0), 0),
                        });
                    }
                }
                bom.grandTotal = bom.categories.reduce((s, c) => s + c.subtotal, 0);
            }
        }

        // Filter BOM to only include categories for selected disciplines
        // (travel & incidentals are injected automatically by _filterBOMByDisciplines)
        bom = this._filterBOMByDisciplines(bom, state.disciplines);

        if (bom.categories.length === 0) {
            alert('No material data found in the AI analysis. Please run the analysis first.');
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
            const bomData = [
                ["DETAILED BILL OF MATERIALS"],
                [`${state.projectName || 'Project'} — ${now.toLocaleDateString()}`],
                [],
                ["Category", "MFG", "Part #", "Item / Description", "Qty", "Unit", "Unit Cost ($)", "Extended Cost ($)"],
            ];

            let runningTotal = 0;
            let totalLineItems = 0;
            let totalQuantity = 0;

            for (const cat of bom.categories) {
                // Category header row
                bomData.push([]);
                bomData.push([cat.name.toUpperCase(), "", "", "", "", "", "", ""]);

                for (const item of cat.items) {
                    bomData.push([
                        "",
                        item.mfg || "",
                        item.partNumber || "",
                        item.item,
                        item.qty,
                        item.unit,
                        item.unitCost,
                        item.extCost,
                    ]);
                    totalLineItems++;
                    totalQuantity += item.qty;
                }

                // Category subtotal row
                bomData.push(["", "", "", `SUBTOTAL — ${cat.name}`, "", "", "", cat.subtotal]);
                runningTotal += cat.subtotal;
            }

            // Grand total section
            // SINGLE SOURCE OF TRUTH: The sum of all BOM category subtotals
            // No AI text extraction, no markup addition — just the actual sum.
            bomData.push([]);
            bomData.push(["", "", "", "", "", "", "", ""]);
            bomData.push(["", "", "", "MATERIAL & EQUIPMENT SUBTOTAL", "", "", "", runningTotal]);
            bomData.push([]);

            // Calculate fully-loaded bid price
            const bidTotal = this._getFullyLoadedTotal(state, bom);
            const matMarkupPct = state.markup?.material ?? 50;
            const labMarkupPct = state.markup?.labor ?? 50;
            if (bidTotal > runningTotal) {
                bomData.push(["", "", "", "PRICING SUMMARY", "", "", "", ""]);
                bomData.push(["", "", "", `  Material/Equipment (raw cost)`, "", "", "", runningTotal]);
                bomData.push(["", "", "", `  Material Markup (${matMarkupPct}%)`, "", "", "", ""]);
                bomData.push(["", "", "", `  Labor Markup (${labMarkupPct}%)`, "", "", "", ""]);
                bomData.push(["", "", "", `  G&A Overhead, Profit, Contingency`, "", "", "", ""]);
                bomData.push([]);
                bomData.push(["", "", "", "BID PRICE (GRAND TOTAL)", "", "", "", bidTotal]);
            } else {
                bomData.push(["", "", "", "GRAND TOTAL", "", "", "", runningTotal]);
            }
            bomData.push([]);
            bomData.push(["", "", "", `Total Line Items: ${totalLineItems}`, `Total Qty: ${totalQuantity}`, "", "", ""]);

            const ws2 = XLSX.utils.aoa_to_sheet(bomData);
            ws2["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 24 }, { wch: 50 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 16 }];
            XLSX.utils.book_append_sheet(wb, ws2, "Bill of Materials");

            // ── Sheet 3: Category Summary ──
            const summaryData = [
                ["CATEGORY SUMMARY"],
                [],
                ["Category", "Line Items", "Total Quantity", "Subtotal ($)", "% of Total"],
            ];
            for (const cat of bom.categories) {
                const itemCount = cat.items.length;
                const catQty = cat.items.reduce((s, it) => s + it.qty, 0);
                const pctOfTotal = runningTotal > 0 ? ((cat.subtotal / runningTotal) * 100).toFixed(1) + '%' : '0%';
                summaryData.push([cat.name, itemCount, catQty, cat.subtotal, pctOfTotal]);
            }
            summaryData.push([]);
            summaryData.push(["TOTAL", totalLineItems, totalQuantity, runningTotal, "100%"]);

            const ws3 = XLSX.utils.aoa_to_sheet(summaryData);
            ws3["!cols"] = [{ wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 12 }];
            XLSX.utils.book_append_sheet(wb, ws3, "Category Summary");

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
    // CABLE SCHEDULE EXPORT
    // ═══════════════════════════════════════════════════════════
    exportCableSchedule(state) {
        if (typeof CableAnalyzer === 'undefined') {
            alert('Cable Analyzer not loaded.');
            return;
        }

        const schedule = CableAnalyzer.buildCableSchedule(state, state.cableAssumptions || {});
        if (!schedule || schedule.assignments.length === 0) {
            alert('No cable schedule data available. Run an analysis first.');
            return;
        }

        try {
            if (typeof XLSX === 'undefined') {
                // CSV fallback
                const rows = [['Device ID','Type','Room','Floor','IDF','Cable Type','Run (ft)','Qty','Total w/ Waste (ft)','Cost/ft','Total Cost','TIA Flag','Basis']];
                schedule.assignments.forEach(a => {
                    rows.push([a.deviceId, a.deviceType, a.room, a.floor, a.idfAssigned, a.cableTypeLabel, a.runFt, a.qty, a.totalFtWithWaste, a.costPerFt, a.totalCost, a.tiaViolation ? 'YES' : '', a.basis]);
                });
                const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
                this._download(csv, `SmartPlans_Cable_Schedule_${this._safeName(state)}.csv`, 'text/csv');
                return;
            }

            const wb = XLSX.utils.book_new();
            const t = schedule.totals;
            const cfg = schedule.config;

            // ── Sheet 1: Summary ──
            const summaryData = [
                ['CABLE SCHEDULE SUMMARY'],
                ['Project', state.projectName || 'Unknown'],
                ['Generated', new Date().toLocaleString()],
                ['Mode', schedule.mode],
                [],
                ['TOTALS'],
                ['Total Devices', t.totalDevices],
                ['Total Cable (ft)', t.totalFt],
                ['Total Cable Cost', t.totalCost],
                ['Average Run (ft)', t.avgRunFt],
                ['Max Run (ft)', t.maxRunFt],
                ['Min Run (ft)', t.minRunFt],
                ['TIA Violations', t.tiaViolationCount],
                ['IDF/MDF Count', schedule.idfCount],
                [],
                ['ASSUMPTIONS'],
                ['Slack / Termination (ft)', cfg.slackFt],
                ['Waste Factor (%)', cfg.wastePct],
                ['Ceiling Height (ft)', cfg.ceilingHeightFt],
                ['Floor-to-Floor (ft)', cfg.floorToFloorFt],
                ['Stub-Up Height (ft)', cfg.stubUpFt],
                ['TIA Max (ft)', cfg.tiaMaxFt],
                [],
                ['CABLE TOTALS BY TYPE'],
            ];
            Object.entries(schedule.byCableType).forEach(([type, data]) => {
                summaryData.push([CableAnalyzer._cableLabel(type), `${data.totalFt} ft`, `${data.deviceCount} devices`, `$${data.totalCost.toFixed(2)}`]);
            });
            summaryData.push([], ['3D CONFIDENTIAL']);
            const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
            ws1['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 16 }];
            XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

            // ── Sheet 2: Full Cable Schedule ──
            const schedData = [['Device ID', 'Type', 'Subtype', 'Room', 'Floor', 'Sheet', 'IDF Assigned', 'Cable Type', 'Run (ft)', 'Horizontal (ft)', 'Vertical (ft)', 'Slack (ft)', 'Qty', 'Total w/ Waste (ft)', 'Cost/ft', 'Total Cost', 'TIA Violation', 'Basis']];
            schedule.assignments.forEach(a => {
                schedData.push([a.deviceId, a.deviceType, a.deviceSubtype, a.room, a.floor, a.sheetId, a.idfAssigned, a.cableTypeLabel, a.runFt, a.horizontal, a.vertical, a.slack, a.qty, a.totalFtWithWaste, a.costPerFt, a.totalCost, a.tiaViolation ? 'YES' : '', a.basis]);
            });
            const ws2 = XLSX.utils.aoa_to_sheet(schedData);
            ws2['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 20 }, { wch: 6 }, { wch: 10 }, { wch: 16 }, { wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 6 }, { wch: 14 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(wb, ws2, 'Cable Schedule');

            // ── Sheet 3: By IDF Summary ──
            const idfData = [['IDF / MDF', 'Device Count', 'Total Cable (ft)', 'Total Cost']];
            Object.entries(schedule.byIdf).forEach(([label, data]) => {
                idfData.push([label, data.deviceCount, data.totalFt, data.totalCost]);
            });
            idfData.push([], ['TOTAL', t.totalDevices, t.totalFt, t.totalCost]);
            const ws3 = XLSX.utils.aoa_to_sheet(idfData);
            ws3['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 18 }, { wch: 14 }];
            XLSX.utils.book_append_sheet(wb, ws3, 'By IDF');

            // ── Sheet 4: TIA Violations ──
            const tiaData = [['Device ID', 'Type', 'Room', 'Floor', 'IDF', 'Cable', 'Run (ft)', 'TIA Limit (ft)', 'Over By (ft)']];
            schedule.tiaViolations.forEach(a => {
                tiaData.push([a.deviceId, a.deviceType, a.room, a.floor, a.idfAssigned, a.cableTypeLabel, a.runFt, cfg.tiaMaxFt, a.runFt - cfg.tiaMaxFt]);
            });
            if (schedule.tiaViolations.length === 0) {
                tiaData.push(['No TIA violations detected']);
            }
            const ws4 = XLSX.utils.aoa_to_sheet(tiaData);
            ws4['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 6 }, { wch: 16 }, { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 10 }];
            XLSX.utils.book_append_sheet(wb, ws4, 'TIA Violations');

            // Write and download
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            this._download(blob, `SmartPlans_Cable_Schedule_${this._safeName(state)}.xlsx`);
        } catch (err) {
            console.error('[SmartPlans] Cable schedule export failed:', err);
            alert('Cable schedule export failed: ' + err.message);
        }
    },

    // ═══════════════════════════════════════════════════════════
    // AMTRAK PRICING SCHEDULE EXPORT — CSI Division Format
    // ═══════════════════════════════════════════════════════════
    exportAmtrakPricingSchedule(state) {
        if (typeof XLSX === 'undefined') { alert('SheetJS library not loaded.'); return; }

        const bom = this._extractBOMFromAnalysis(state.aiAnalysis);
        if (!bom?.categories?.length) { alert('No BOM data available. Run analysis first.'); return; }

        const ab = (typeof PRICING_DB !== 'undefined') ? PRICING_DB.amtrakBenchmarks : null;
        const rows = this._mapBOMToCSIDivisions(state, bom, ab);
        const grandTotal = rows.reduce((s, r) => s + (r.extPrice || 0), 0);

        // Build Excel
        const wb = XLSX.utils.book_new();
        const data = [
            [`Station Security Enhancements — ${state.projectName || 'Project'}`],
            ['Construction Services - Pricing Schedule'],
            [`RFP #: ${state.rfpNumber || '_______________'}`],
            [` Contractor Name: 3D Technology Services, Inc.`, '', 'Percentage of Work to be Completed by Prime:', 'Contractor Planned Subcontracting Percentage:'],
            [` Authorized Signature: _____________________________________________`, '', '25% Minimum', ''],
            ['***Enter cost in orange highlighted cells ONLY. Additional Notes may be entered in last column as necessary.***'],
            ['Pricing Schedule'],
            ['Division', 'Division Title', 'Title', 'Qty', 'Unit', 'Unit Cost', 'Ext Price', 'Notes'],
        ];

        let currentDiv = '';
        rows.forEach(r => {
            data.push([
                r.division !== currentDiv ? `DIVISION ${r.division}` : '',
                r.division !== currentDiv ? r.divisionTitle : '',
                r.title,
                r.qty || '',
                r.unit || '',
                r.unitCost || '',
                r.extPrice || '',
                r.notes || ''
            ]);
            currentDiv = r.division;
        });

        // Total row
        data.push([]);
        data.push(['', '', '', 'Total ->', '', '', grandTotal, '']);
        data.push([]);
        data.push([' - Offeror shall provide a full and detailed breakdown of any rate or lump sum value if requested by Amtrak']);
        data.push([' - All amounts indicated on this pricing schedule shall include all necessary items to accomplish the work.']);
        data.push([' - Spreadsheet user is responsible for accuracy of all formulas and calculations.']);
        data.push([]);
        data.push(['Generated by SmartPlans AI — 3D Technology Services Inc. | 3D CONFIDENTIAL']);

        const ws = XLSX.utils.aoa_to_sheet(data);
        ws['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 55 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Summary');

        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        this._download(blob, `SmartPlans_Amtrak_Pricing_Schedule_${this._safeName(state)}.xlsx`);
    },

    _mapBOMToCSIDivisions(state, bom, ab) {
        const items = [];

        // CSI division keyword map — order matters (first match wins)
        const CSI = [
            { div: 1,  title: 'GENERAL CONDITIONS',            kw: /mobiliz|demob|insurance|bond|rrpli|rpl|general\s*req|general\s*cond|div.*1/i },
            { div: 2,  title: 'Existing Conditions',           kw: /survey|utility\s*locat|saw\s*cut.*pavement|exist.*cond/i },
            { div: 3,  title: 'Concrete',                      kw: /bollard.*concrete|concrete.*foundation|concrete.*dispos|reinforc/i },
            { div: 4,  title: 'Masonry',                       kw: /masonry|infill/i },
            { div: 8,  title: 'Openings',                      kw: /door(?!.*access)|blast.*mitigation|hardening.*film|window.*film|electric\s*strike|latch|glazing/i },
            { div: 9,  title: 'Finishes',                      kw: /paint|ceiling\s*tile|gypsum|drywall|stucco|touchup|finish/i },
            { div: 10, title: 'Specialties',                   kw: /signage|sign.*door/i },
            { div: 23, title: 'HVAC',                          kw: /hvac|mini.?split|air\s*condition/i },
            { div: 26, title: 'Electrical',                    kw: /ups|inverter|power\s*circuit|panel\s*board|panelboard|new\s*pole|handhole|foundation.*enclosure|electrical|saw\s*cut.*conduit|trench.*conduit|conduit.*trench|misc.*electr/i },
            { div: 27, title: 'Communications',                kw: /network|rack|mdf|pdu|kvm|patch\s*panel|cisco|switch.*poe|switch.*fiber|server|fiber|cat6a|viewing\s*station|remote.*enclosure|enclosure.*network/i },
            { div: 28, title: 'Electronic Safety and Security', kw: /camera|cam|dome|ptz|bullet|fisheye|360|panoram|access\s*control|card\s*reader|door.*cr|lenel|control\s*panel.*access/i },
            { div: 31, title: 'Earthwork',                     kw: /earthwork|excavat|backfill|soil.*reloc/i },
            { div: 32, title: 'Exterior Improvements',         kw: /exterior\s*improv|landscape|concrete\s*pav|misc.*concrete/i },
            { div: 34, title: 'Transportation',                kw: /bollard(?!.*concrete)|vehicular|traffic.*barricad/i },
        ];

        // Classify each BOM item into a division
        const classified = new Map(); // div -> items[]

        (bom.categories || []).forEach(cat => {
            (cat.items || []).forEach(item => {
                const name = item.item || item.name || cat.name || '';
                let matched = false;
                for (const d of CSI) {
                    if (d.kw.test(name) || d.kw.test(cat.name || '')) {
                        if (!classified.has(d.div)) classified.set(d.div, { title: d.title, items: [] });
                        classified.get(d.div).items.push({
                            title: name,
                            qty: item.qty || 1,
                            unit: item.unit || 'EA',
                            unitCost: item.unitCost || 0,
                            extPrice: item.extCost || (item.qty || 1) * (item.unitCost || 0),
                            notes: '',
                        });
                        matched = true;
                        break;
                    }
                }
                // Unmatched → put in Div 27 (Communications) as catch-all for ELV
                if (!matched && (item.extCost || 0) > 0) {
                    if (!classified.has(27)) classified.set(27, { title: 'Communications', items: [] });
                    classified.get(27).items.push({
                        title: name,
                        qty: item.qty || 1,
                        unit: item.unit || 'EA',
                        unitCost: item.unitCost || 0,
                        extPrice: item.extCost || 0,
                        notes: 'Auto-classified',
                    });
                }
            });
        });

        // Add mandatory Div 1 items from benchmarks if missing
        if (ab && state.isTransitRailroad) {
            const ensure = (div, title, label, benchmark, unit) => {
                if (!classified.has(div)) classified.set(div, { title, items: [] });
                const divItems = classified.get(div).items;
                const exists = divItems.some(i => new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').substring(0, 15), 'i').test(i.title));
                if (!exists && benchmark) {
                    divItems.push({ title: label, qty: 1, unit: unit || 'LS', unitCost: benchmark.mid || 0, extPrice: benchmark.mid || 0, notes: 'From Amtrak benchmark' });
                }
            };
            const lb = ab.lineItemBenchmarks;
            if (lb) {
                ensure(1, 'GENERAL CONDITIONS', 'Mobilization/Demobilization', lb.mob_demob, 'LS');
                ensure(1, 'GENERAL CONDITIONS', 'All insurance Requirements (excluding RRPLI)', lb.insurance_excl_rrpli, 'LS');
                ensure(1, 'GENERAL CONDITIONS', 'Railroad Protective Liability Insurance (RRPLI)', lb.rrpli, 'LS');
                ensure(1, 'GENERAL CONDITIONS', 'Bonds (performance & payment)', lb.bonds_perf_payment, 'LS');
                ensure(1, 'GENERAL CONDITIONS', 'All other requirements for Division 1', lb.div1_other_requirements, 'LS');
                ensure(2, 'Existing Conditions', 'Construction Survey', lb.construction_survey, 'Allowance');
                ensure(2, 'Existing Conditions', 'Utility location', lb.utility_location, 'Allowance');
            }
        }

        // Convert to flat sorted array
        const sortedDivs = [...classified.entries()].sort((a, b) => a[0] - b[0]);
        sortedDivs.forEach(([div, data]) => {
            data.items.forEach(item => {
                items.push({
                    division: div,
                    divisionTitle: data.title,
                    title: item.title,
                    qty: item.qty,
                    unit: item.unit,
                    unitCost: item.unitCost,
                    extPrice: item.extPrice,
                    notes: item.notes,
                });
            });
        });

        return items;
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
            const burdenMult = state.includeBurden ? (1 + state.burdenRate / 100) : 1.0;
            const tier = state.pricingTier;

            // ── Sheet 1: Project Summary ──
            const summaryData = [
                ["SMARTPLANS — PROJECT ESTIMATE SUMMARY"],
                [],
                ["Generated", new Date().toLocaleString()],
                ["Project Name", state.projectName || ""],
                ["Project Type", state.projectType || ""],
                ["Location", state.projectLocation || ""],
                ["Jurisdiction", state.codeJurisdiction || ""],
                ["Disciplines", state.disciplines.join(", ")],
                ["Prevailing Wage", state.prevailingWage || "N/A"],
                ["Work Shift", state.workShift || "Standard"],
                [],
                ["PRICING CONFIGURATION"],
                ["Pricing Tier", tier.toUpperCase()],
                ["Regional Multiplier", `${regionKey.replace(/_/g, " ")} (${regionMult}×)`],
                ["Labor Burden", state.includeBurden ? `${state.burdenRate}%` : "Not applied"],
                ["Material Markup", `${state.markup.material}%`],
                ["Labor Markup", `${state.markup.labor}%`],
                ["Equipment Markup", `${state.markup.equipment}%`],
                ["Subcontractor Markup", `${state.markup.subcontractor}%`],
                [],
                ["LABOR RATES"],
                ["Classification", "Base Rate", "Burden", "Loaded Rate"],
            ];

            Object.entries(state.laborRates).forEach(([key, rate]) => {
                const label = key === "pm" ? "Project Manager" : key === "journeyman" ? "Journeyman Tech" : key === "lead" ? "Lead Tech" : key === "foreman" ? "Foreman" : key === "apprentice" ? "Apprentice" : "Programmer";
                summaryData.push([label, rate, `${(burdenMult * 100 - 100).toFixed(0)}%`, this._round(rate * burdenMult)]);
            });

            const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
            ws1["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 14 }, { wch: 14 }];
            XLSX.utils.book_append_sheet(wb, ws1, "Project Summary");

            // ── Sheet 2: Material Pricing Database ──
            const matData = [
                ["MATERIAL PRICING DATABASE"],
                [`Tier: ${tier.toUpperCase()} | Region: ${regionKey.replace(/_/g, " ")} (${regionMult}×)`],
                [],
                ["Category", "Item", "Description", "Unit", "Unit Price", "Adjusted Price"],
            ];

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
                            matData.push([
                                catName,
                                key,
                                item.description,
                                item.unit,
                                item[tier],
                                this._round(item[tier] * regionMult),
                            ]);
                        }
                    }
                }
            }

            const ws2 = XLSX.utils.aoa_to_sheet(matData);
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
                        state.selectedRFIs.has(r.id) ? "YES" : "",
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
                "Symbol Legend": state.legendFiles,
                "Floor Plans": state.planFiles,
                "Specifications": state.specFiles,
                "Addenda": state.addendaFiles,
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
        const burdenMult = state.includeBurden ? (1 + state.burdenRate / 100) : 1.0;
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
        const bidPhasesData = this._buildBidPhasesExport(state, this._filterBOMByDisciplines(this._extractBOMFromAnalysis(state.aiAnalysis || ""), state.disciplines));
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
                md += `| RFI-${String(i + 1).padStart(3, "0")} | ${r.question} | ${state.selectedRFIs.has(r.id) ? "✅" : ""} |\n`;
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
        const bom = this._filterBOMByDisciplines(this._extractBOMFromAnalysis(state.aiAnalysis), state.disciplines);
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
        const bom = this._filterBOMByDisciplines(this._extractBOMFromAnalysis(state.aiAnalysis), state.disciplines);
        const rowMap = this.generateSupplierRowMap(state);
        const now = new Date();
        const projectName = state.projectName || 'Untitled Project';
        const estimateId = state.estimateId || state.projectId || '';

        if (bom.categories.length === 0) {
            alert('No material data found in the AI analysis. Please run the analysis first.');
            return;
        }

        // Build array-of-arrays data
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

        const dataRows = [];
        let rowIdx = 0;
        let grandTotal = 0;

        for (const cat of bom.categories) {
            // Category section header
            dataRows.push([cat.name.toUpperCase(), '', '', '', '', '', '', '', '']);

            for (const item of cat.items) {
                rowIdx++;
                dataRows.push([
                    rowIdx,
                    '',
                    item.mfg || '',
                    item.partNumber || '',
                    item.item,
                    item.qty,
                    item.unit,
                    '',  // Supplier fills in unit cost
                    '',  // Supplier fills in extended cost
                ]);
            }

            grandTotal += (cat.subtotal || 0);

            // Category subtotal row (no pricing shown)
            dataRows.push(['', '', '', '', `SUBTOTAL — ${cat.name}`, '', '', '', '']);
            dataRows.push([]);
        }

        // Grand total row (no pricing — supplier calculates their own)
        dataRows.push([]);
        dataRows.push(['', '', '', '', 'TOTAL', '', '', '', '']);

        const allRows = [...headerRows, ...dataRows];

        if (format === 'csv' || typeof XLSX === 'undefined') {
            // CSV export
            allRows.push([]);
            allRows.push(['3D CONFIDENTIAL — 3D Technology Services Inc.']);
            const csv = allRows.map(r =>
                r.map(c => `"${this._csvSafe(c).replace(/"/g, '""')}"`).join(',')
            ).join('\n');
            this._download(csv, `SmartPlans_SupplierBOM_${this._safeName(state)}.csv`, 'text/csv');
        } else {
            // Excel export via SheetJS
            try {
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.aoa_to_sheet(allRows);
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
                            const rowNum = parseInt(String(rawRowNum).replace(/[^\d]/g, ''));
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
                    const bom = this._filterBOMByDisciplines(this._extractBOMFromAnalysis(state.aiAnalysis), state.disciplines);
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
        const bom = this._filterBOMByDisciplines(this._extractBOMFromAnalysis(state.aiAnalysis), state.disciplines);
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
                    const headerKeywords = ['item', 'description', 'title', 'qty', 'quantity', 'unit cost', 'unit price', 'total', 'amount', 'extended', 'ext cost', 'ext price'];

                    // Column mapping keyword sets
                    const nameKeys = ['item/description', 'item', 'description', 'desc', 'title', 'name', 'material', 'product', 'scope', 'line item'];
                    const qtyKeys = ['qty', 'quantity', 'count', 'units'];
                    const unitCostKeys = ['unit cost', 'unit price', 'price', 'rate', '$/unit', 'cost/ea'];
                    const extKeys = ['ext cost', 'ext price', 'ext.cost', 'ext. cost', 'total cost', 'total price', 'extended cost', 'extended price', 'line total', 'total', 'amount', 'extended', 'ext'];
                    const categoryKeys = ['category', 'section', 'division', 'group', 'csi', 'division title'];

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
        const bom = this._filterBOMByDisciplines(this._extractBOMFromAnalysis(state.aiAnalysis), state.disciplines);

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

        const bom = this._filterBOMByDisciplines(this._extractBOMFromAnalysis(state.aiAnalysis), state.disciplines);
        const overrides = state.supplierPriceOverrides || {};
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
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    // ─── Apply Bid Strategy — per-category markups & contingency ───
    applyBidStrategy(state) {
        const bom = this._filterBOMByDisciplines(this._extractBOMFromAnalysis(state.aiAnalysis), state.disciplines);
        if (!bom || !bom.categories || bom.categories.length === 0) {
            return { grandTotalWithStrategy: 0, categories: [], totalMaterial: 0, totalLabor: 0, totalMarkup: 0, totalContingency: 0 };
        }

        const bs = state.bidStrategy;
        const isLaborCat = (name) => /labor|install|rough.?in|trim|commission|program|test|mobiliz|phase\s*\d/i.test(name);

        let totalMaterial = 0, totalLabor = 0, totalMarkup = 0, totalContingency = 0;
        const categoryBreakdown = [];

        for (const cat of bom.categories) {
            const catName = cat.name;
            const isLabor = isLaborCat(catName);
            const cm = bs.categoryMarkups[catName] || {
                materialMarkup: bs.defaultMaterialMarkup,
                laborMarkup: bs.defaultLaborMarkup,
                confidence: 'medium'
            };

            const materialCost = isLabor ? 0 : cat.subtotal;
            const laborCost = isLabor ? cat.subtotal : 0;
            const matPct = cm.materialMarkup;
            const labPct = cm.laborMarkup;
            const confidence = cm.confidence;
            const contingencyPct = bs.contingencyByConfidence[confidence] || 10;

            const matWithMarkup = materialCost * (1 + matPct / 100);
            const labWithMarkup = laborCost * (1 + labPct / 100);
            const subtotalWithMarkup = matWithMarkup + labWithMarkup;
            const contingencyAmt = this._round(subtotalWithMarkup * (contingencyPct / 100));
            const finalPrice = this._round(subtotalWithMarkup + contingencyAmt);

            totalMaterial += materialCost;
            totalLabor += laborCost;
            totalMarkup += (matWithMarkup - materialCost) + (labWithMarkup - laborCost);
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

        const grandTotalWithStrategy = this._round(totalMaterial + totalLabor + totalMarkup + totalContingency);

        return {
            grandTotalWithStrategy,
            categories: categoryBreakdown,
            totalMaterial: this._round(totalMaterial),
            totalLabor: this._round(totalLabor),
            totalMarkup: this._round(totalMarkup),
            totalContingency: this._round(totalContingency),
        };
    },
};

// Make available globally
if (typeof window !== "undefined") {
    window.SmartPlansExport = SmartPlansExport;
}
