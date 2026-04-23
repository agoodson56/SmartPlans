// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — PROPOSAL GENERATOR v2 (v5.125.0 "Auto-Proposal")
//
// Fortune-500-grade multi-brain proposal pipeline. Replaces the
// single-shot AI call in proposal-generator.js with a structured
// pipeline that auto-pulls company credentials, auto-selects past
// performance, and produces a send-ready print-quality HTML doc.
//
// This file EXTENDS the existing ProposalGenerator object via
// Object.assign — the legacy Word-doc path still works for
// backward compatibility. New code uses generateCompleteBidPackage().
//
// Design principle: ZERO MANUAL TYPING PER BID. Estimator clicks
// one button. Everything else auto-populates from company-credentials.js
// and the SmartPlans analysis output.
// ═══════════════════════════════════════════════════════════════

(function () {
    if (typeof ProposalGenerator === 'undefined') {
        console.warn('[ProposalGen v2] Legacy ProposalGenerator not loaded — v2 pipeline unavailable');
        return;
    }
    if (typeof COMPANY_CREDENTIALS === 'undefined') {
        console.warn('[ProposalGen v2] company-credentials.js not loaded — v2 pipeline unavailable');
        return;
    }

    // ═══════════════════════════════════════════════════════════
    // Escaping + formatting helpers
    // ═══════════════════════════════════════════════════════════
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    const sanitize = (s, max = 5000) => String(s ?? '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').substring(0, max);
    const fmtMoney = (n) => {
        if (n == null || isNaN(n)) return '—';
        return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };
    const fmtDate = (d) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // ═══════════════════════════════════════════════════════════
    // Pipeline entry points
    // ═══════════════════════════════════════════════════════════

    const v2Methods = {

        /**
         * The ONE button. Generates everything, downloads it.
         * Estimator clicks, waits, done.
         */
        async generateCompleteBidPackage(state, progressCallback) {
            progressCallback = progressCallback || (() => {});
            try {
                progressCallback(2, 'Preparing bid package…');

                // 1. Build proposal context — pulls from company-credentials + state
                const ctx = this._buildProposalContext(state);

                // 2. Run the multi-brain pipeline
                progressCallback(8, 'Running AI proposal pipeline…');
                const sections = await this._runProposalPipeline(ctx, progressCallback);

                // 3. Render to Fortune 500 HTML
                progressCallback(88, 'Rendering Fortune 500 layout…');
                const html = this._renderFortune500Html(ctx, sections);

                // 4. Cache for re-download
                this._lastFortune500Html = html;
                this._lastFortune500Ctx = ctx;
                this._lastFortune500Sections = sections;

                // 5. Download
                progressCallback(95, 'Preparing download…');
                this._downloadHtml(html, `${ctx.safeName}_SmartPlans_Proposal.html`, 'text/html');

                progressCallback(100, '✓ Complete bid package generated');
                if (typeof spToast === 'function') spToast('Complete bid package generated — opening preview…', 'success');

                // 6. Also open in a new tab for immediate preview
                this._openHtmlInNewTab(html, ctx.safeName);

                return { html, sections, ctx };
            } catch (err) {
                console.error('[ProposalGen v2] generateCompleteBidPackage failed:', err);
                if (typeof spToast === 'function') spToast('Proposal generation failed: ' + err.message, 'error');
                throw err;
            }
        },

        /**
         * Re-download the last generated proposal without hitting the AI again.
         */
        redownloadLastFortune500() {
            if (!this._lastFortune500Html || !this._lastFortune500Ctx) {
                if (typeof spToast === 'function') spToast('No cached proposal — generate one first', 'info');
                return;
            }
            this._downloadHtml(this._lastFortune500Html, `${this._lastFortune500Ctx.safeName}_SmartPlans_Proposal.html`, 'text/html');
        },

        // ═══════════════════════════════════════════════════════
        // Context Builder — pulls everything SmartPlans knows
        // ═══════════════════════════════════════════════════════

        _buildProposalContext(state) {
            const cc = COMPANY_CREDENTIALS;
            const now = new Date();
            const validUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            const refNum = `3DTSI-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 9000 + 1000)}`;

            // Extract grand total from state via the UNIFIED entry point.
            // Before v5.128.1 this tried `this._extractGrandTotal`, which V2 never defined,
            // so grandTotal was silently null and the proposal PDF shipped with no dollar figure.
            // Fix: delegate to SmartPlansFinancials (wraps _getFullyLoadedTotal) so Master Report,
            // JSON export, and Proposal PDF always show the same number and same source.
            let grandTotal = null;
            let grandTotalSource = null;
            let grandTotalCalibration = null;
            try {
                if (typeof SmartPlansFinancials !== 'undefined' && typeof SmartPlansExport !== 'undefined') {
                    const analysis = state.aiAnalysis || '';
                    let bom = SmartPlansExport._extractBOMFromAnalysis ? SmartPlansExport._extractBOMFromAnalysis(analysis) : null;
                    if (bom && typeof SmartPlansExport._applyUserBOMEdits === 'function') bom = SmartPlansExport._applyUserBOMEdits(bom, state);
                    if (bom && typeof SmartPlansExport._applyTransitAdjustments === 'function') SmartPlansExport._applyTransitAdjustments(bom, state);
                    if (bom && typeof SmartPlansExport._filterBOMByDisciplines === 'function') bom = SmartPlansExport._filterBOMByDisciplines(bom, state.disciplines);
                    const gt = SmartPlansFinancials.grandTotal(state, bom);
                    grandTotal = gt.total > 0 ? gt.total : null;
                    grandTotalSource = gt.source;
                    grandTotalCalibration = gt.calibration;
                } else if (typeof this._extractGrandTotal === 'function') {
                    grandTotal = this._extractGrandTotal(state);
                }
            } catch (e) { console.warn('[ProposalGenV2] grandTotal resolution failed:', e); }

            // Wave 10 L2 (v5.128.7): if SmartPlansFinancials threw and we still
            // have no grandTotal, fall back to the legacy V1 priority stack so
            // the proposal doesn't ship with $0 / 'See Schedule of Values'.
            if ((!grandTotal || grandTotal <= 0) && typeof SmartPlansExport !== 'undefined' && typeof SmartPlansExport._getFullyLoadedTotal === 'function') {
                try {
                    const analysis = state.aiAnalysis || '';
                    let bom = SmartPlansExport._extractBOMFromAnalysis ? SmartPlansExport._extractBOMFromAnalysis(analysis) : null;
                    if (bom && typeof SmartPlansExport._applyUserBOMEdits === 'function') bom = SmartPlansExport._applyUserBOMEdits(bom, state);
                    const fallbackTotal = SmartPlansExport._getFullyLoadedTotal(state, bom) || 0;
                    // Wave 11 M7 + M8 (v5.128.8): threshold aligned with the
                    // primary path (> 0, not > 1000) so tiny projects don't
                    // silently lose their grand total. Source tag cleanly
                    // distinguishes "full L2 fallback" from "L2 retry after
                    // partial primary execution" — no leading space.
                    if (fallbackTotal > 0) {
                        grandTotal = fallbackTotal;
                        const hadPrimarySource = grandTotalSource && grandTotalSource.trim() !== '';
                        grandTotalSource = hadPrimarySource
                            ? `${grandTotalSource.trim()} (L2 retry: primary threw mid-execution)`
                            : '[L2 fallback: SmartPlansFinancials path threw]';
                        console.warn('[ProposalGenV2] L2 fallback activated — used _getFullyLoadedTotal directly, bypassing SmartPlansFinancials');
                    }
                } catch (fbErr) { console.warn('[ProposalGenV2] L2 fallback also failed:', fbErr?.message || fbErr); }
            }

            const projName = sanitize(state.projectName, 200) || 'Untitled Project';
            const safeName = projName.replace(/[^a-zA-Z0-9 _-]/g, '').replace(/\s+/g, '_').substring(0, 60);

            // Pull structured analysis insights
            const buildingProfile = state._buildingProfile || state.brainResults?.wave0_35?.BUILDING_PROFILER || {};
            const sheetInventory = state._sheetInventory || {};
            const scopeDelineations = state._scopeDelineations || {};
            const doorSchedule = state._doorSchedule || {};
            const keynotes = state._keynotes || {};
            const prevailingWage = state._prevailingWageDetection || {};
            const specCompliance = state._specCompliance || {};
            const rfpCriteria = state._rfpCriteria || null;

            // Pull BOM totals by discipline (for compliance matrix + SOV)
            const bomCategories = this._extractBomCategories(state);

            // ── v5.128.0: Pull full analysis data for comprehensive proposal ──
            const br = state.brainResults || {};
            const deviceCounts = br.wave1_75?.CONSENSUS_ARBITRATOR?.consensus_counts
                || br.wave1_75?.TARGETED_RESCANNER?.final_counts
                || br.wave1?.SYMBOL_SCANNER?.totals || {};
            const bomFull = br.wave2?.MATERIAL_PRICER || br.wave3_85_corrected || {};
            const bomItems = bomFull.categories || bomFull.material_categories || [];
            const laborData = br.wave2_25?.LABOR_CALCULATOR || {};
            const financialSummary = br.wave2_5_fin?.FINANCIAL_ENGINE || {};
            const cablePathway = br.wave1?.CABLE_PATHWAY || {};
            const mdfIdf = br.wave1?.MDF_IDF_ANALYZER || {};
            const codeCompliance = br.wave1?.CODE_COMPLIANCE_CHECKER || {};
            const specialConditions = br.wave1?.SPECIAL_CONDITIONS || {};
            const devilsAdvocate = br.wave3?.DEVILS_ADVOCATE || {};
            const crossValidator = br.wave3?.CROSS_VALIDATOR || {};
            const scopeExclusionScanner = br.wave1?.SCOPE_EXCLUSION_SCANNER || {};
            const clarificationQs = Array.isArray(state._clarificationQuestions) ? state._clarificationQuestions : [];

            // Pull past performance — auto-selected by relevance
            const bidContext = {
                disciplines: state.disciplines || [],
                buildingType: buildingProfile.building_type || state.projectType || '',
                prevailingWageRequired: state._prevailingWageRequired || false,
                grandTotal,
            };
            const pastProjects = (typeof COMPANY_CREDENTIALS_HELPERS !== 'undefined'
                ? COMPANY_CREDENTIALS_HELPERS.selectRelevantProjects(bidContext, 3)
                : (cc.pastProjects || []).slice(0, 3));

            // Exclusions / assumptions — prefer state list (auto-populated) over boilerplate
            const stateExclusions = (state.exclusions || []).filter(e => e.type === 'exclusion').map(e => e.text);
            const stateAssumptions = (state.exclusions || []).filter(e => e.type === 'assumption').map(e => e.text);
            const stateClarifications = (state.exclusions || []).filter(e => e.type === 'clarification').map(e => e.text);

            return {
                cc,
                brand: cc.brand,
                now,
                dateStr: fmtDate(now),
                validUntilStr: fmtDate(validUntil),
                refNum,
                year: now.getFullYear(),
                projName,
                safeName,
                projType: sanitize(state.projectType, 200) || 'Low Voltage Installation',
                projLoc: sanitize(state.projectLocation, 300) || 'To Be Determined',
                preparedFor: sanitize(state.preparedFor, 200) || sanitize(state.clientName, 200) || projName,
                clientName: sanitize(state.clientName, 200) || sanitize(state.preparedFor, 200) || 'the Owner',
                disciplines: state.disciplines || [],
                disciplinesStr: (state.disciplines || []).join(', ') || 'Low Voltage Systems',
                grandTotal,
                grandTotalDisplay: grandTotal ? fmtMoney(grandTotal) : 'See Schedule of Values',
                // Analysis data
                buildingProfile,
                sheetInventory,
                scopeDelineations,
                doorSchedule,
                keynotes,
                prevailingWage,
                specCompliance,
                rfpCriteria,
                bomCategories,
                pastProjects,
                // v5.128.0: Full analysis data for comprehensive scope sections
                deviceCounts,
                bomItems,
                laborData,
                financialSummary,
                cablePathway,
                mdfIdf,
                codeCompliance,
                specialConditions,
                devilsAdvocate,
                crossValidator,
                scopeExclusionScanner,
                clarificationQs,
                // Exclusions
                exclusions: stateExclusions.length > 0 ? stateExclusions : cc.standardExclusions,
                assumptions: stateAssumptions.length > 0 ? stateAssumptions : cc.standardAssumptions,
                clarifications: stateClarifications,
                // Signer
                signer: cc.defaultSigner,
                // Raw state for brains that want it
                _state: state,
            };
        },

        _extractBomCategories(state) {
            try {
                const pricer = state.brainResults?.wave2?.MATERIAL_PRICER
                    || state.brainResults?.wave3_85_corrected
                    || {};
                const cats = pricer.categories || pricer.material_categories || [];
                return cats.map(c => ({
                    name: c.category || c.name || 'Uncategorized',
                    itemCount: (c.items || []).length,
                    subtotal: c.subtotal || c.total || 0,
                }));
            } catch (e) { return []; }
        },

        // ═══════════════════════════════════════════════════════
        // Multi-Brain Pipeline
        // ═══════════════════════════════════════════════════════

        async _runProposalPipeline(ctx, progressCallback) {
            const sections = {};
            const progress = (pct, msg) => progressCallback && progressCallback(pct, msg);

            // Brain 1: Project Understanding — echoes RFP, proves we read it
            progress(15, '🧠 Brain 1/5: Writing project understanding…');
            sections.understanding = await this._brainProjectUnderstanding(ctx);

            // Brain 2: Technical Approach — phased methodology
            progress(32, '🧠 Brain 2/5: Writing technical approach…');
            sections.approach = await this._brainTechnicalApproach(ctx);

            // Brain 3: Cover Letter — personalized to client/agency
            progress(50, '🧠 Brain 3/5: Writing cover letter…');
            sections.coverLetter = await this._brainCoverLetter(ctx);

            // Brain 4: Executive Summary — reads all prior sections
            progress(68, '🧠 Brain 4/5: Writing executive summary…');
            sections.executiveSummary = await this._brainExecutiveSummary(ctx, sections);

            // Brain 5 (deterministic): Compliance Matrix
            progress(82, '🧠 Brain 5/5: Building compliance matrix…');
            sections.complianceMatrix = this._buildComplianceMatrix(ctx);

            return sections;
        },

        // Generic Gemini call wrapper — reuses the existing AI engine's API key + endpoint
        /**
         * Call Gemini via the /api/ai/invoke SSE proxy (the ONLY working endpoint).
         * v5.125.1: previous version called /api/gemini which does not exist (404/405).
         * This matches the exact pattern used by export-engine.js and ai-engine.js.
         */
        async _callProposalBrain(prompt, label, maxTokens = 8192) {
            const requestBody = {
                contents: [{ role: 'user', parts: [{ text: String(prompt || '') }] }],
                generationConfig: {
                    temperature: 0.55,
                    maxOutputTokens: maxTokens,
                    topP: 0.95,
                    topK: 40,
                },
                _model: 'gemini-2.5-pro',
                _brainSlot: Math.floor(Math.random() * 18),
            };

            try {
                const controller = new AbortController();
                const timeoutMs = 180000; // 3 min per section — proposals are shorter than Wave 1 brains
                const timeout = setTimeout(() => controller.abort(), timeoutMs);

                const response = await fetch('/api/ai/invoke', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal,
                });

                if (!response.ok) {
                    clearTimeout(timeout);
                    const errText = await response.text().catch(() => '');
                    throw new Error(`HTTP ${response.status} ${response.statusText}: ${errText.substring(0, 200)}`);
                }

                // Parse SSE stream — same pattern as export-engine.js:3004+
                let fullText = '';
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                // Idle guard: abort if no data for 60 seconds
                let idleTimer = setTimeout(() => controller.abort(), 60000);

                while (true) {
                    const { done, value } = await reader.read();
                    clearTimeout(idleTimer);
                    if (done) break;
                    idleTimer = setTimeout(() => controller.abort(), 60000);

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ''; // keep last (possibly incomplete) line

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        try {
                            const parsed = JSON.parse(line.substring(6));
                            if (parsed._proxyError) {
                                throw new Error('Proxy error: ' + (parsed.message || 'unknown'));
                            }
                            const parts = parsed?.candidates?.[0]?.content?.parts || [];
                            for (const p of parts) {
                                if (p.text && !p.thought) fullText += p.text;
                            }
                        } catch (e) {
                            // skip unparseable SSE lines (keepalives, blanks)
                        }
                    }
                }
                clearTimeout(timeout);

                if (!fullText || fullText.length < 50) {
                    console.warn(`[ProposalGen v2] ${label}: empty response from Gemini (length=${fullText.length})`);
                    return '';
                }
                return fullText;
            } catch (e) {
                console.error(`[ProposalGen v2] ${label} call failed:`, e.message);
                return '';
            }
        },

        // ─── Brain 1: Project Understanding ──────────────────
        async _brainProjectUnderstanding(ctx) {
            const bp = ctx.buildingProfile;
            const si = ctx.sheetInventory;
            const sd = ctx.scopeDelineations;
            const ds = ctx.doorSchedule;
            const pw = ctx.prevailingWage;

            const prompt = `You are writing the PROJECT UNDERSTANDING section of a Fortune-500-grade proposal for ${ctx.cc.legalName}. This section MUST prove to the reader that we read every drawing and every spec page carefully. Echo back their requirements in our words, then tell them how we intend to execute.

PROJECT: ${ctx.projName}
CLIENT: ${ctx.clientName}
LOCATION: ${ctx.projLoc}
TYPE: ${ctx.projType}
DISCIPLINES: ${ctx.disciplinesStr}

═══ WHAT SMARTPLANS EXTRACTED FROM THE DOCUMENTS ═══
Building Profile (from AI analysis of the plans):
  Type: ${bp.building_type || 'unknown'} ${bp.building_subtype ? '(' + bp.building_subtype + ')' : ''}
  Total SF: ${(bp.total_gross_sf || 0).toLocaleString()} gross | ${(bp.total_usable_sf || 0).toLocaleString()} usable
  Floors: ${bp.num_floors || '?'} | Rooms: ${bp.total_rooms || '?'} | Doors: ${bp.total_doors || '?'}
  Ceiling: ${bp.ceiling_type || 'unknown'} | Corridors: ${bp.corridor_total_lf || '?'} LF

Sheet Inventory (from Wave 0.3 Sheet Inventory Guard):
  Index found: ${si.index_found ? 'yes' : 'no'}
  Total sheets in drawing index: ${si.total_sheets_in_index || 'unknown'}
  Coverage analyzed: ${si.coverage_pct || 0}%

Scope Delineations (from Wave 1 Scope Delineation Scanner — ${(sd.delineations || []).length} found):
${JSON.stringify((sd.delineations || []).slice(0, 10), null, 2).substring(0, 2500)}

Door Schedule (from Wave 1 Door Schedule Parser):
  Total doors: ${ds.total_doors || 0} | Access-controlled: ${(ds.access_control_doors || []).length}
  Card readers from schedule: ${ds.hardware_summary?.card_readers_from_schedule || 0}

Prevailing Wage: ${pw.requires_davis_bacon ? `REQUIRED — Davis-Bacon — ${pw.agency_or_owner || ''}` : 'not detected'}

═══ YOUR JOB ═══
Write 4-6 tight paragraphs (400-600 words total) covering:
1. What kind of project this is — show you understand the building, the occupants, the mission
2. The specific disciplines in scope, referencing the counts above
3. Any critical scope delineations (OFOI, rough-in only, by-others) we identified and how that affects our bid
4. Any special conditions we've caught (prevailing wage, phased cutover, sensitive occupants, public-works)
5. A confident, professional tone — no marketing fluff, no filler. The reader is an engineer or owner's rep.

Use specific numbers wherever possible: "170 data drops across the 24-sheet plan set" is BETTER than "a comprehensive cabling scope". Reference sheet numbers when you can. If Davis-Bacon was detected, say so explicitly.

DO NOT mention "AI", "SmartPlans", "the analysis engine", or any tool names. Write as if the 3D TSI estimating team read every sheet themselves.

DO NOT make up numbers. If the building profile says 24,000 SF, use 24,000 SF. If it says "unknown", either omit the metric or say "approximately" and round generously.

Return plain prose (no markdown headers, no JSON, no bullet lists unless explicitly useful). Paragraphs separated by blank lines.`;

            const text = await this._callProposalBrain(prompt, 'Project Understanding', 4096);
            return text || this._fallbackUnderstanding(ctx);
        },

        _fallbackUnderstanding(ctx) {
            return `${ctx.cc.legalName} has completed a comprehensive review of the drawings and specifications for ${ctx.projName} in ${ctx.projLoc}. Our team examined every sheet in the drawing set, every relevant specification section, and every scope delineation to produce this proposal.\n\nThis project involves ${ctx.disciplinesStr.toLowerCase()} for a ${ctx.projType.toLowerCase()} at ${ctx.projLoc}. ${ctx.cc.legalName} has delivered projects of this scope across all ${ctx.cc.serviceTerritoryLabel.toLowerCase()} we serve, and we are prepared to mobilize immediately upon award.`;
        },

        // ─── Brain 2: Technical Approach ─────────────────────
        async _brainTechnicalApproach(ctx) {
            const prompt = `You are writing the TECHNICAL APPROACH section of a Fortune-500-grade proposal for ${ctx.cc.legalName}. This section describes HOW we will execute the project — our phased methodology, deliverables per phase, and quality controls.

PROJECT: ${ctx.projName}
DISCIPLINES: ${ctx.disciplinesStr}
METHODOLOGY: ${ctx.cc.methodology}

═══ WRITE 6 PHASES, one short paragraph each ═══

Phase 1 — Pre-Construction & Mobilization
  Kickoff meeting, BIM/coordination drawings, submittals, long-lead material procurement, site logistics plan

Phase 2 — Rough-In
  Cable pathway, conduit coordination with Division 26, cable tray installation, riser cable pulls between MDF/IDF

Phase 3 — Horizontal Installation
  Drop cable pulls to each device location, J-hook/support installation, cable labeling per TIA-606-C

Phase 4 — Trim-Out & Device Installation
  Device rough-in on finished walls, rack build-out, patch panels, device termination and testing

Phase 5 — Testing, Commissioning & Programming
  100% channel testing with calibrated test sets, system commissioning per spec, head-end programming, integration testing across disciplines

Phase 6 — Closeout & Warranty
  As-built drawings, O&M manuals, end-user training, final walk-through, warranty period begins

For each phase, write 60-100 words. Be specific about deliverables. Reference manufacturer-specific equipment from ${ctx.cc.legalName}'s approved vendor list: Genetec, Milestone, Axis, Hanwha, Panduit, CommScope, Berk-Tek, Cisco Meraki, Crestron, Siemens Notifier.

Then write a final 100-word paragraph on QUALITY CONTROL — how we catch defects before the client does. Reference: BICSI standards, manufacturer certifications, in-house QA checklists, punch-list process.

Tone: confident, specific, technical. Not marketing language. The reader is a construction manager or engineer.
DO NOT mention AI or SmartPlans. Write as if the 3D TSI team personally planned every phase.

Return plain prose with phase headers like "Phase 1 — Pre-Construction & Mobilization" followed by the paragraph.`;

            const text = await this._callProposalBrain(prompt, 'Technical Approach', 6144);
            return text || this._fallbackApproach(ctx);
        },

        _fallbackApproach(ctx) {
            return `Phase 1 — Pre-Construction & Mobilization\n${ctx.cc.legalName} mobilizes immediately upon award with a kickoff meeting, submittal package, and long-lead material procurement.\n\nPhase 2 — Rough-In\nCable pathway installation and coordination with other trades.\n\nPhase 3 — Horizontal Installation\nAll drop cables, labeled and supported per TIA-606-C and BICSI standards.\n\nPhase 4 — Trim-Out\nDevice installation, rack build-out, terminations.\n\nPhase 5 — Testing & Commissioning\n100% channel testing, programming, and integration.\n\nPhase 6 — Closeout\nAs-builts, training, warranty.`;
        },

        // ─── Brain 3: Cover Letter ───────────────────────────
        async _brainCoverLetter(ctx) {
            const prompt = `You are writing a 1-PAGE COVER LETTER for a Fortune-500-grade proposal. This is the first thing the reader sees after the cover page. It must be warm, professional, confident, and very specific to THIS project.

LETTER FROM: ${ctx.signer.name}, ${ctx.signer.title}
LETTER TO: ${ctx.clientName}
PROJECT: ${ctx.projName}
LOCATION: ${ctx.projLoc}
DATE: ${ctx.dateStr}
REFERENCE #: ${ctx.refNum}
BID AMOUNT: ${ctx.grandTotalDisplay}
PROPOSAL VALID UNTIL: ${ctx.validUntilStr}

COMPANY BACKGROUND:
${ctx.cc.legalName} — Founded ${ctx.cc.founded} (${ctx.cc.yearsInBusiness} years in business)
${ctx.cc.metrics.projectsCompleted} projects completed | ${ctx.cc.metrics.clientRating}/5.0 client rating
Licensed in ${ctx.cc.serviceTerritoryLabel} with offices in Rancho Cordova CA (HQ), Fresno CA, Livermore CA, Sparks NV, and McCall ID.
Methodology: ${ctx.cc.methodology}

═══ STRUCTURE (write in this order, 4 short paragraphs, 200-300 words total) ═══

Paragraph 1 — Opening
"Dear ${ctx.clientName} Team," then a 1-2 sentence thank-you for the opportunity and a reference to the specific RFP / solicitation / project.

Paragraph 2 — We understand
1-2 sentences showing you understand the project specifics (mention the location, the disciplines, any special conditions like prevailing wage or phased cutover).

Paragraph 3 — Why 3D TSI
2-3 sentences on why ${ctx.cc.legalName} is the right partner. Reference the ${ctx.cc.yearsInBusiness}-year track record, the single-source-responsibility model ("one contract, one accountable partner, one throat to choke"), and the fact that we self-perform every discipline with W-2 employees (no fourth-tier subs).

Paragraph 4 — Bottom line + call to action
State the bid amount (${ctx.grandTotalDisplay}) as a firm fixed price, note the validity period (${ctx.validUntilStr}), and invite follow-up questions. Close with "Respectfully submitted," and leave the signature block for ${ctx.signer.name}.

Tone: confident, warm, concise. No marketing fluff. Sound like a senior sales professional writing to a peer.
Do NOT mention AI or SmartPlans. Write as if ${ctx.signer.name} personally reviewed and is signing the letter.

Return plain prose (no markdown, no bullet lists). Include the "Dear ${ctx.clientName} Team," line and the "Respectfully submitted," closing.`;

            const text = await this._callProposalBrain(prompt, 'Cover Letter', 2048);
            return text || this._fallbackCoverLetter(ctx);
        },

        _fallbackCoverLetter(ctx) {
            return `Dear ${ctx.clientName} Team,\n\nThank you for the opportunity to submit this proposal for ${ctx.projName}. ${ctx.cc.legalName} has reviewed the drawings and specifications in detail and is prepared to deliver a complete, turnkey installation on your schedule.\n\nWith ${ctx.cc.yearsInBusiness} years in business and ${ctx.cc.metrics.projectsCompleted} completed projects across ${ctx.cc.serviceTerritoryLabel.toLowerCase()}, ${ctx.cc.legalName} self-performs every discipline in this scope with W-2 technicians on our payroll. You will have one contract, one accountable project manager, and one warranty.\n\nOur firm fixed price for the work described in this proposal is ${ctx.grandTotalDisplay}. This proposal is valid until ${ctx.validUntilStr}. We welcome your questions and look forward to the opportunity to earn your trust.\n\nRespectfully submitted,\n\n${ctx.signer.name}\n${ctx.signer.title}\n${ctx.cc.legalName}`;
        },

        // ─── Brain 4: Executive Summary ──────────────────────
        async _brainExecutiveSummary(ctx, priorSections) {
            const prompt = `You are writing a 1-PAGE EXECUTIVE SUMMARY for a Fortune-500-grade proposal. This is page 2 of the document — the first thing the reader sees after the cover page. It must be short, dense, scannable, and persuasive.

PROJECT: ${ctx.projName} | ${ctx.projLoc}
CLIENT: ${ctx.clientName}
DISCIPLINES: ${ctx.disciplinesStr}
BID AMOUNT: ${ctx.grandTotalDisplay}
COMPANY: ${ctx.cc.legalName} (${ctx.cc.yearsInBusiness} years, ${ctx.cc.metrics.projectsCompleted} projects)

═══ STRUCTURE (write in this exact order) ═══

1. ONE-SENTENCE VALUE PROP (50-80 words)
   A single confident sentence that says: who we are, what we're proposing, and why the client should care.

2. THREE BULLET POINTS — "What you're getting"
   Each bullet is 2 short sentences. Pull from the project understanding and technical approach. Be specific about scope (mention counts if you know them), timeline commitment, and deliverables.

3. THREE BULLET POINTS — "Why 3D TSI"
   Pull from these win themes:
   ${JSON.stringify((ctx.cc.winThemes || []).map(t => t.headline), null, 2)}
   Pick the 3 most relevant to this bid type.

4. BOTTOM LINE
   "Firm Fixed Price: ${ctx.grandTotalDisplay}" followed by a 1-sentence confidence statement.

═══ CONTEXT FROM PRIOR SECTIONS ═══
Understanding excerpt: ${(priorSections.understanding || '').substring(0, 1200)}

Approach excerpt: ${(priorSections.approach || '').substring(0, 800)}

Total length: 200-300 words. Tone: confident, specific, no fluff. Use strong verbs. The reader has 60 seconds — make every word count.

Return plain prose. Use short headers ("What You're Getting" / "Why 3D TSI" / "Bottom Line") to mark the sections. No markdown, no JSON.
Do NOT mention AI or SmartPlans.`;

            const text = await this._callProposalBrain(prompt, 'Executive Summary', 2048);
            return text || this._fallbackExecutiveSummary(ctx);
        },

        _fallbackExecutiveSummary(ctx) {
            return `${ctx.cc.legalName} is pleased to submit this proposal for ${ctx.projName} — a complete, turnkey ${ctx.disciplinesStr.toLowerCase()} installation delivered by ${ctx.cc.yearsInBusiness}-year veterans of the low-voltage integration industry.\n\nWhat You're Getting\n• Complete scope of work across ${ctx.disciplinesStr}, self-performed by ${ctx.cc.legalName} W-2 technicians.\n• Firm fixed price with no change-order surprises from undisclosed scope gaps.\n• Manufacturer-warranted installation on every system, backed by our 24/7 service department.\n\nWhy 3D TSI\n${(ctx.cc.winThemes || []).slice(0, 3).map(t => '• ' + t.headline).join('\n')}\n\nBottom Line\nFirm Fixed Price: ${ctx.grandTotalDisplay}\nProposal valid through ${ctx.validUntilStr}.`;
        },

        // ─── Brain 5 (deterministic): Compliance Matrix ─────
        _buildComplianceMatrix(ctx) {
            const sc = ctx.specCompliance || {};
            const gaps = Array.isArray(sc.gaps) ? sc.gaps : [];
            // Build rows from SPEC_COMPLIANCE_CHECKER output
            const rows = gaps.map(g => ({
                section: g.spec_section || '—',
                requirement: g.requirement || '—',
                status: (g.status === 'met' || g.status === 'partial') ? 'Compliant' : (g.status === 'missing' ? 'See Section' : 'Compliant'),
                response: g.status === 'missing'
                    ? `Addressed as alternate — see Section 15 Assumptions`
                    : `Included in base scope (${g.bom_match || 'BOM'})`,
                severity: g.severity || 'info',
            }));
            return {
                complianceScore: sc.compliance_score || null,
                requirementsChecked: sc.spec_requirements_checked || rows.length,
                requirementsMet: sc.requirements_met || rows.filter(r => r.status === 'Compliant').length,
                rows,
            };
        },

        // ═══════════════════════════════════════════════════════
        // Fortune 500 HTML Renderer
        // ═══════════════════════════════════════════════════════

        _renderFortune500Html(ctx, sections) {
            const cc = ctx.cc;
            const b = ctx.brand;

            // Assemble all section HTML
            const coverPage = this._renderCoverPage(ctx);
            const coverLetterPage = this._renderCoverLetterPage(ctx, sections.coverLetter);
            const execSummaryPage = this._renderExecutiveSummaryPage(ctx, sections.executiveSummary);
            const companyOverviewPage = this._renderCompanyOverviewPage(ctx);
            const understandingPage = this._renderUnderstandingPage(ctx, sections.understanding);
            const approachPage = this._renderApproachPage(ctx, sections.approach);
            const teamPage = this._renderTeamPage(ctx);
            const pastPerformancePage = this._renderPastPerformancePage(ctx);
            const compliancePage = this._renderCompliancePage(ctx, sections.complianceMatrix);
            // v5.128.0: Comprehensive scope sections
            const scopeOfWorkPage = this._renderScopeOfWorkPage(ctx);
            const bomDetailPages = this._renderBomDetailPages(ctx);
            const infrastructurePage = this._renderInfrastructurePage(ctx);
            const laborPage = this._renderLaborPage(ctx);
            const pricingPage = this._renderPricingPage(ctx);
            const clarificationsPage = this._renderClarificationsRiskPage(ctx);
            const exclusionsPage = this._renderExclusionsPage(ctx);
            const testimonialsPage = this._renderTestimonialsPage(ctx);
            const backCover = this._renderBackCover(ctx);

            const headingFont = cc.fonts.heading;
            const bodyFont = cc.fonts.body;

            return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(ctx.projName)} — Proposal | ${esc(cc.legalName)}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  :root {
    --gold: ${b.gold};
    --gold-dark: ${b.goldDark};
    --teal: ${b.teal};
    --teal-dark: ${b.tealDark};
    --teal-darker: ${b.tealDarker};
    --navy: ${b.navy};
    --charcoal: ${b.charcoal};
    --gray: ${b.gray};
    --gray-mid: ${b.grayMid};
    --gray-light: ${b.grayLight};
    --light-gray: ${b.lightGray};
    --cream: ${b.cream};
    --border: ${b.border};
  }

  @page {
    size: 8.5in 11in;
    margin: 0;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    font-family: ${bodyFont};
    color: #1a1a2e;
    background: #e5e7eb;
    line-height: 1.55;
    font-size: 11pt;
  }

  .page {
    width: 8.5in;
    min-height: 11in;
    margin: 0 auto 0.25in auto;
    background: white;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    page-break-after: always;
    position: relative;
    overflow: hidden;
  }
  .page:last-child { page-break-after: auto; }

  @media print {
    html, body { background: white; }
    .page { box-shadow: none; margin: 0; }
    .no-print { display: none !important; }
  }

  /* Typography */
  h1, h2, h3, h4, h5, .serif {
    font-family: ${headingFont};
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--navy);
  }
  h1 { font-size: 38pt; line-height: 1.05; }
  h2 { font-size: 24pt; line-height: 1.15; }
  h3 { font-size: 17pt; line-height: 1.2; }
  h4 { font-size: 13pt; line-height: 1.25; }

  .section-eyebrow {
    font-family: ${bodyFont};
    font-size: 9pt;
    font-weight: 800;
    letter-spacing: 3pt;
    text-transform: uppercase;
    color: var(--gold-dark);
    margin-bottom: 12pt;
  }

  .body-copy {
    font-size: 10.5pt;
    line-height: 1.65;
    color: #2d3748;
  }
  .body-copy p { margin-bottom: 10pt; }

  .gold-rule {
    height: 3px;
    width: 64pt;
    background: var(--gold);
    margin: 14pt 0;
  }
  .gold-rule-wide {
    height: 3px;
    width: 100%;
    background: linear-gradient(90deg, var(--gold), var(--teal));
    margin: 14pt 0;
  }

  /* Header bar at top of content pages */
  .page-header {
    background: var(--navy);
    color: white;
    padding: 0.3in 0.75in;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 9pt;
  }
  .page-header .ph-brand {
    font-family: ${headingFont};
    font-size: 14pt;
    font-weight: 700;
    color: var(--gold);
    letter-spacing: 0.02em;
  }
  .page-header .ph-ref {
    font-family: ${bodyFont};
    font-size: 8.5pt;
    color: rgba(255,255,255,0.75);
    letter-spacing: 1pt;
    text-transform: uppercase;
  }

  .page-body {
    padding: 0.5in 0.75in 0.75in 0.75in;
  }

  .page-footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 0.2in 0.75in;
    background: var(--light-gray);
    border-top: 3px solid var(--gold);
    font-size: 8pt;
    color: var(--gray);
    display: flex;
    justify-content: space-between;
    letter-spacing: 0.5pt;
  }
  .page-footer .pf-company { color: var(--teal-dark); font-weight: 700; }

  /* Cover Page */
  .cover {
    background: linear-gradient(135deg, var(--navy) 0%, var(--teal-dark) 45%, var(--teal-darker) 100%);
    color: white;
    padding: 0;
    position: relative;
  }
  .cover::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background:
      radial-gradient(circle at 20% 15%, rgba(235,179,40,0.12) 0%, transparent 40%),
      radial-gradient(circle at 80% 85%, rgba(255,255,255,0.06) 0%, transparent 50%);
  }
  .cover-inner {
    position: relative;
    z-index: 2;
    padding: 0.9in 0.85in;
    height: 11in;
    display: flex;
    flex-direction: column;
  }
  .cover-brand-row {
    display: flex;
    align-items: center;
    gap: 16pt;
    margin-bottom: 0;
  }
  .cover-brand-logo {
    width: 64pt;
    height: 64pt;
    background: var(--gold);
    border-radius: 8pt;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: ${headingFont};
    font-size: 26pt;
    font-weight: 900;
    color: var(--navy);
    letter-spacing: -0.04em;
  }
  .cover-brand-text {
    flex: 1;
  }
  .cover-brand-name {
    font-family: ${headingFont};
    font-size: 20pt;
    font-weight: 800;
    color: white;
    line-height: 1.1;
    letter-spacing: -0.01em;
  }
  .cover-brand-tagline {
    font-family: ${bodyFont};
    font-size: 9pt;
    color: var(--gold);
    font-weight: 600;
    letter-spacing: 2pt;
    text-transform: uppercase;
    margin-top: 4pt;
  }
  .cover-gold-bar {
    height: 4pt;
    width: 72pt;
    background: var(--gold);
    margin: 1.1in 0 0.35in 0;
  }
  .cover-eyebrow {
    font-family: ${bodyFont};
    font-size: 10pt;
    color: var(--gold);
    font-weight: 700;
    letter-spacing: 3.5pt;
    text-transform: uppercase;
    margin-bottom: 14pt;
  }
  .cover-title {
    font-family: ${headingFont};
    font-size: 50pt;
    font-weight: 900;
    line-height: 1.02;
    color: white;
    letter-spacing: -0.02em;
    margin-bottom: 28pt;
  }
  .cover-subtitle {
    font-family: ${headingFont};
    font-size: 20pt;
    font-style: italic;
    font-weight: 400;
    color: rgba(255,255,255,0.85);
    line-height: 1.3;
    margin-bottom: 0.5in;
  }
  .cover-meta {
    margin-top: auto;
    padding-top: 0.3in;
    border-top: 1px solid rgba(255,255,255,0.2);
  }
  .cover-meta-row {
    display: flex;
    gap: 40pt;
    margin-bottom: 10pt;
  }
  .cover-meta-label {
    font-family: ${bodyFont};
    font-size: 8pt;
    color: var(--gold);
    font-weight: 700;
    letter-spacing: 2pt;
    text-transform: uppercase;
    margin-bottom: 4pt;
  }
  .cover-meta-value {
    font-family: ${bodyFont};
    font-size: 11pt;
    color: white;
    font-weight: 500;
  }
  .cover-ref {
    margin-top: 0.25in;
    font-family: ${bodyFont};
    font-size: 8.5pt;
    color: rgba(255,255,255,0.55);
    letter-spacing: 2pt;
    text-transform: uppercase;
  }

  /* Metrics Strip (on cover or inside) */
  .metrics-strip {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    background: var(--navy);
    color: white;
    padding: 0.35in 0.75in;
    border-top: 4px solid var(--gold);
    border-bottom: 4px solid var(--gold);
  }
  .metric {
    text-align: center;
    padding: 10pt 8pt;
    border-right: 1px solid rgba(255,255,255,0.18);
  }
  .metric:last-child { border-right: none; }
  .metric-value {
    font-family: ${headingFont};
    font-size: 30pt;
    font-weight: 800;
    color: var(--gold);
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .metric-label {
    font-family: ${bodyFont};
    font-size: 8pt;
    color: rgba(255,255,255,0.8);
    text-transform: uppercase;
    letter-spacing: 1.5pt;
    margin-top: 8pt;
    font-weight: 600;
  }

  /* Section divider page */
  .section-divider {
    background: linear-gradient(135deg, var(--navy) 0%, var(--teal-dark) 100%);
    color: white;
    padding: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
  }
  .section-divider-num {
    font-family: ${headingFont};
    font-size: 144pt;
    font-weight: 900;
    color: var(--gold);
    line-height: 1;
    letter-spacing: -0.05em;
  }
  .section-divider-title {
    font-family: ${headingFont};
    font-size: 36pt;
    font-weight: 700;
    color: white;
    margin-top: 20pt;
    letter-spacing: -0.01em;
  }
  .section-divider-quote {
    font-family: ${headingFont};
    font-size: 14pt;
    font-style: italic;
    color: rgba(255,255,255,0.7);
    margin-top: 40pt;
    max-width: 5in;
    line-height: 1.5;
  }

  /* Content blocks */
  .big-number-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14pt;
    margin: 14pt 0;
  }
  .big-number {
    background: var(--light-gray);
    border-left: 4px solid var(--gold);
    padding: 12pt 14pt;
  }
  .big-number-value {
    font-family: ${headingFont};
    font-size: 22pt;
    font-weight: 800;
    color: var(--navy);
    line-height: 1;
  }
  .big-number-label {
    font-family: ${bodyFont};
    font-size: 8.5pt;
    color: var(--gray);
    text-transform: uppercase;
    letter-spacing: 1pt;
    font-weight: 700;
    margin-top: 5pt;
  }

  .pull-quote {
    border-left: 4pt solid var(--gold);
    padding: 14pt 18pt;
    background: var(--cream);
    font-family: ${headingFont};
    font-size: 13pt;
    font-style: italic;
    line-height: 1.5;
    color: var(--navy);
    margin: 16pt 0;
  }
  .pull-quote-attr {
    font-family: ${bodyFont};
    font-size: 9pt;
    font-style: normal;
    color: var(--gray);
    margin-top: 8pt;
    letter-spacing: 0.5pt;
  }

  /* Tables */
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
    margin: 10pt 0;
  }
  .data-table th {
    background: var(--navy);
    color: white;
    text-align: left;
    padding: 8pt 10pt;
    font-family: ${bodyFont};
    font-size: 8.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1pt;
  }
  .data-table td {
    padding: 7pt 10pt;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  .data-table tr:nth-child(even) td { background: #fafafa; }

  /* Past performance card */
  .pp-card {
    border: 1px solid var(--border);
    border-left: 5px solid var(--gold);
    padding: 14pt 18pt;
    margin-bottom: 14pt;
    background: white;
  }
  .pp-card-client {
    font-family: ${headingFont};
    font-size: 15pt;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 2pt;
  }
  .pp-card-meta {
    font-family: ${bodyFont};
    font-size: 8.5pt;
    color: var(--gray);
    text-transform: uppercase;
    letter-spacing: 1pt;
    margin-bottom: 8pt;
    font-weight: 600;
  }
  .pp-card-scope {
    font-size: 10pt;
    color: #2d3748;
    line-height: 1.55;
    margin-bottom: 8pt;
  }
  .pp-card-highlights {
    font-size: 9pt;
    color: var(--teal-dark);
  }
  .pp-card-highlights li {
    margin: 3pt 0 3pt 16pt;
  }

  /* Team card */
  .team-card {
    display: flex;
    gap: 16pt;
    padding: 14pt 0;
    border-bottom: 1px solid var(--border);
  }
  .team-card:last-child { border-bottom: none; }
  .team-avatar {
    width: 56pt;
    height: 56pt;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--navy), var(--teal-dark));
    color: var(--gold);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: ${headingFont};
    font-size: 22pt;
    font-weight: 800;
    flex-shrink: 0;
  }
  .team-info { flex: 1; }
  .team-name {
    font-family: ${headingFont};
    font-size: 14pt;
    font-weight: 700;
    color: var(--navy);
    line-height: 1.1;
  }
  .team-title {
    font-family: ${bodyFont};
    font-size: 9.5pt;
    color: var(--teal-dark);
    font-weight: 600;
    letter-spacing: 0.5pt;
    margin-bottom: 6pt;
  }
  .team-bio {
    font-size: 9.5pt;
    color: #2d3748;
    line-height: 1.55;
  }

  /* Phase cards */
  .phase-card {
    display: grid;
    grid-template-columns: 54pt 1fr;
    gap: 14pt;
    padding: 12pt 0;
    border-bottom: 1px dashed var(--border);
  }
  .phase-num {
    font-family: ${headingFont};
    font-size: 30pt;
    font-weight: 900;
    color: var(--gold);
    line-height: 1;
  }
  .phase-body h4 { margin-bottom: 4pt; color: var(--navy); }
  .phase-body p { font-size: 10pt; line-height: 1.55; color: #2d3748; }

  /* Signature block */
  .sig-block {
    margin-top: 30pt;
    padding-top: 16pt;
    border-top: 1px solid var(--border);
  }
  .sig-name {
    font-family: ${headingFont};
    font-size: 14pt;
    font-weight: 700;
    color: var(--navy);
    font-style: italic;
    margin-bottom: 2pt;
  }
  .sig-title {
    font-family: ${bodyFont};
    font-size: 10pt;
    color: var(--gray);
    font-weight: 600;
  }
  .sig-contact {
    font-family: ${bodyFont};
    font-size: 9pt;
    color: var(--gray-mid);
    margin-top: 4pt;
  }

  /* Utility */
  .text-gold { color: var(--gold-dark); }
  .text-navy { color: var(--navy); }
  .text-teal { color: var(--teal-dark); }
  .tiny { font-size: 8pt; letter-spacing: 1pt; text-transform: uppercase; color: var(--gray); }

  /* Print / preview bar (screen only) */
  .print-bar {
    position: fixed;
    top: 12pt;
    right: 12pt;
    z-index: 10000;
    background: var(--navy);
    color: white;
    padding: 10pt 16pt;
    border-radius: 8pt;
    box-shadow: 0 4pt 12pt rgba(0,0,0,0.3);
    display: flex;
    gap: 10pt;
    align-items: center;
  }
  .print-bar button {
    background: var(--gold);
    color: var(--navy);
    border: none;
    padding: 8pt 14pt;
    border-radius: 6pt;
    font-family: ${bodyFont};
    font-weight: 700;
    font-size: 10pt;
    cursor: pointer;
  }
  @media print { .print-bar { display: none; } }

</style>
</head>
<body>

<div class="print-bar no-print">
  <span style="font-size:10pt;font-weight:600;letter-spacing:0.5pt;">SmartPlans Auto-Proposal</span>
  <button onclick="window.print()">🖨 Print / Save PDF</button>
</div>

${coverPage}
${execSummaryPage}
${coverLetterPage}
${this._sectionDivider('01', 'Company Overview', `"${cc.yearsInBusiness} years. ${cc.metrics.projectsCompleted} projects. Zero finger-pointing."`)}
${companyOverviewPage}
${this._sectionDivider('02', 'Project Understanding', `"The difference between a winning bid and a money-losing bid is how carefully you read the documents."`)}
${understandingPage}
${this._sectionDivider('03', 'Technical Approach', `"${cc.methodology}"`)}
${approachPage}
${this._sectionDivider('04', 'Project Team', `"One PM. One foreman. One warranty. Always."`)}
${teamPage}
${this._sectionDivider('05', 'Past Performance', `"References on request for every project listed in this section."`)}
${pastPerformancePage}
${this._sectionDivider('06', 'Compliance Matrix', `"Every specification requirement — mapped, addressed, confirmed."`)}
${compliancePage}
${this._sectionDivider('07', 'Scope of Work', `"Every device, every location, every system — documented and verified."`)}
${scopeOfWorkPage}
${this._sectionDivider('08', 'Bill of Materials', `"Complete material takeoff. Every line item. Every manufacturer. Every cost."`)}
${bomDetailPages}
${this._sectionDivider('09', 'Infrastructure & Cabling', `"The backbone that everything else rides on."`)}
${infrastructurePage}
${this._sectionDivider('10', 'Labor & Installation', `"Certified technicians. Phased execution. No shortcuts."`)}
${laborPage}
${this._sectionDivider('11', 'Investment', `"Firm fixed price. No surprises."`)}
${pricingPage}
${this._sectionDivider('12', 'Clarifications & Risk', `"Transparency today prevents change orders tomorrow."`)}
${clarificationsPage}
${this._sectionDivider('13', 'Exclusions, Assumptions & Clarifications', `"Honest scope boundaries are how good partners stay good partners."`)}
${exclusionsPage}
${this._sectionDivider('14', 'Client Voices', `"Don't take our word for it."`)}
${testimonialsPage}
${backCover}

</body>
</html>`;
        },

        // ═══ Individual Page Renderers ═══════════════════════
        _renderCoverPage(ctx) {
            const cc = ctx.cc;
            return `
<div class="page cover">
  <div class="cover-inner">
    <div class="cover-brand-row">
      <div class="cover-brand-logo">3D</div>
      <div class="cover-brand-text">
        <div class="cover-brand-name">${esc(cc.legalName)}</div>
        <div class="cover-brand-tagline">${esc(cc.tagline)}</div>
      </div>
    </div>

    <div class="cover-gold-bar"></div>
    <div class="cover-eyebrow">Proposal · ${esc(ctx.year)}</div>
    <h1 class="cover-title">${esc(ctx.projName)}</h1>
    <div class="cover-subtitle">Prepared for ${esc(ctx.clientName)}<br>${esc(ctx.projLoc)}</div>

    <div class="cover-meta">
      <div class="cover-meta-row">
        <div>
          <div class="cover-meta-label">Scope</div>
          <div class="cover-meta-value">${esc(ctx.disciplinesStr)}</div>
        </div>
      </div>
      <div class="cover-meta-row">
        <div>
          <div class="cover-meta-label">Submitted</div>
          <div class="cover-meta-value">${esc(ctx.dateStr)}</div>
        </div>
        <div>
          <div class="cover-meta-label">Valid Through</div>
          <div class="cover-meta-value">${esc(ctx.validUntilStr)}</div>
        </div>
        <div>
          <div class="cover-meta-label">Submitted By</div>
          <div class="cover-meta-value">${esc(ctx.signer.name)}, ${esc(ctx.signer.title)}</div>
        </div>
      </div>
      <div class="cover-ref">Reference · ${esc(ctx.refNum)}</div>
    </div>
  </div>
</div>`;
        },

        _renderExecutiveSummaryPage(ctx, body) {
            const cc = ctx.cc;
            const bodyHtml = this._proseToHtml(body || '');
            return `
<div class="page">
  <div class="page-header">
    <div class="ph-brand">${esc(cc.legalName)}</div>
    <div class="ph-ref">Executive Summary · ${esc(ctx.refNum)}</div>
  </div>
  <div class="metrics-strip">
    <div class="metric">
      <div class="metric-value">${esc(cc.metrics.yearsInBusiness)}</div>
      <div class="metric-label">Years in Business</div>
    </div>
    <div class="metric">
      <div class="metric-value">${esc(cc.metrics.projectsCompleted)}</div>
      <div class="metric-label">Projects Completed</div>
    </div>
    <div class="metric">
      <div class="metric-value">${esc(cc.serviceStates.length)}</div>
      <div class="metric-label">States Served</div>
    </div>
    <div class="metric">
      <div class="metric-value">${esc(cc.metrics.clientRating)}<span style="font-size:16pt;">/5</span></div>
      <div class="metric-label">Client Rating</div>
    </div>
  </div>
  <div class="page-body">
    <div class="section-eyebrow">Executive Summary</div>
    <h2>A ${esc(ctx.disciplinesStr)} Proposal for ${esc(ctx.projName)}</h2>
    <div class="gold-rule"></div>
    <div class="body-copy">${bodyHtml}</div>

    <div class="pull-quote" style="margin-top:24pt;">
      ${esc(ctx.cc.winThemes[0]?.headline || 'Enterprise Technology Integration — Done Right.')}
      <div class="pull-quote-attr">— ${esc(ctx.cc.legalName)}</div>
    </div>
  </div>
  <div class="page-footer">
    <span class="pf-company">${esc(cc.legalName)}</span>
    <span>Executive Summary · Page 2</span>
  </div>
</div>`;
        },

        _renderCoverLetterPage(ctx, body) {
            const cc = ctx.cc;
            const bodyHtml = this._proseToHtml(body || this._fallbackCoverLetter(ctx));
            return `
<div class="page">
  <div class="page-header">
    <div class="ph-brand">${esc(cc.legalName)}</div>
    <div class="ph-ref">Cover Letter · ${esc(ctx.refNum)}</div>
  </div>
  <div class="page-body">
    <div style="text-align:right;margin-bottom:26pt;font-size:10pt;color:var(--gray);">
      ${esc(ctx.dateStr)}<br>
      Reference: ${esc(ctx.refNum)}
    </div>
    <div class="body-copy" style="font-size:11pt;">${bodyHtml}</div>

    <div class="sig-block">
      <div class="sig-name">${esc(ctx.signer.name)}</div>
      <div class="sig-title">${esc(ctx.signer.title)} · ${esc(cc.legalName)}</div>
      <div class="sig-contact">${esc(ctx.signer.email)} · ${esc(ctx.signer.phone)}</div>
    </div>
  </div>
  <div class="page-footer">
    <span class="pf-company">${esc(cc.legalName)}</span>
    <span>Cover Letter · Page 3</span>
  </div>
</div>`;
        },

        _renderCompanyOverviewPage(ctx) {
            const cc = ctx.cc;
            return `
<div class="page">
  <div class="page-header">
    <div class="ph-brand">${esc(cc.legalName)}</div>
    <div class="ph-ref">Section 01 · Company Overview</div>
  </div>
  <div class="page-body">
    <div class="section-eyebrow">Who We Are</div>
    <h2>${esc(cc.legalName)}</h2>
    <div style="font-family:${cc.fonts.heading};font-size:13pt;font-style:italic;color:var(--teal-dark);margin-top:6pt;">${esc(cc.tagline)} · ${esc(cc.methodology)}</div>
    <div class="gold-rule"></div>

    <div class="body-copy">
      <p>Founded in ${cc.founded} and headquartered in ${esc(cc.headquarters.cityStateZip)}, ${esc(cc.legalName)} is a premier low-voltage technology integrator serving Fortune 500 corporations, federal and state agencies, healthcare systems, educational institutions, and critical-infrastructure clients across ${cc.serviceTerritoryLabel.toLowerCase()}. Over the past ${cc.yearsInBusiness} years we have completed more than ${cc.metrics.projectsCompleted} projects of every size and every complexity.</p>
      <p>We self-perform every discipline in our scope with W-2 employees on our own payroll — no fourth-tier subcontractors, no chain-of-responsibility surprises. One contract, one accountable project manager, one warranty. This "single throat to choke" model is why our clients keep coming back.</p>
    </div>

    <div class="big-number-row" style="margin-top:18pt;">
      <div class="big-number">
        <div class="big-number-value">${esc(cc.yearsInBusiness)}+</div>
        <div class="big-number-label">Years Integrating Technology</div>
      </div>
      <div class="big-number">
        <div class="big-number-value">${esc(cc.metrics.projectsCompleted)}</div>
        <div class="big-number-label">Projects Delivered</div>
      </div>
      <div class="big-number">
        <div class="big-number-value">${esc(cc.offices.length)}</div>
        <div class="big-number-label">Regional Offices</div>
      </div>
    </div>

    <h4 style="margin-top:22pt;margin-bottom:8pt;">Office Locations</h4>
    <table class="data-table">
      <tbody>
        ${cc.offices.map(o => `<tr>
          <td style="font-weight:700;width:1.3in;">${esc(o.city)}, ${esc(o.state)}${o.isHQ ? ' <span style="color:var(--gold-dark);font-size:8pt;">HQ</span>' : ''}</td>
          <td style="color:var(--gray);">${esc(o.region || '')}</td>
          <td style="text-align:right;font-family:${cc.fonts.mono};font-size:9pt;">${esc(o.phone)}${o.tollFree ? ' · ' + esc(o.tollFree) : ''}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <h4 style="margin-top:22pt;margin-bottom:8pt;">Contractor Licenses</h4>
    <table class="data-table">
      <thead><tr><th>State</th><th>License Type</th><th>Number</th><th>Classification</th></tr></thead>
      <tbody>
        ${cc.licenses.filter(l => !/\[UPDATE\]/.test(l.number)).map(l => `<tr>
          <td><strong>${esc(l.state)}</strong></td>
          <td>${esc(l.type)}</td>
          <td style="font-family:${cc.fonts.mono};">${esc(l.number)}</td>
          <td>${esc(l.classification)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <h4 style="margin-top:22pt;margin-bottom:8pt;">Core Disciplines</h4>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10pt;font-size:10pt;">
      ${cc.services.map(s => `<div style="padding:8pt 10pt;border-left:3px solid var(--teal);background:var(--light-gray);">
        <div style="font-weight:800;color:var(--navy);font-size:10.5pt;">${esc(s.name)}</div>
        <div style="color:var(--gray);line-height:1.45;margin-top:3pt;font-size:9pt;">${esc(s.description)}</div>
      </div>`).join('')}
    </div>
  </div>
  <div class="page-footer">
    <span class="pf-company">${esc(cc.legalName)}</span>
    <span>Section 01 · Company Overview</span>
  </div>
</div>`;
        },

        _renderUnderstandingPage(ctx, body) {
            const cc = ctx.cc;
            const bp = ctx.buildingProfile || {};
            const pw = ctx.prevailingWage || {};
            const bodyHtml = this._proseToHtml(body || this._fallbackUnderstanding(ctx));
            const hasBP = bp && bp.total_gross_sf;
            return `
<div class="page">
  <div class="page-header">
    <div class="ph-brand">${esc(cc.legalName)}</div>
    <div class="ph-ref">Section 02 · Project Understanding</div>
  </div>
  <div class="page-body">
    <div class="section-eyebrow">Section 02</div>
    <h2>Project Understanding</h2>
    <div class="gold-rule"></div>

    ${hasBP ? `<div class="big-number-row">
      <div class="big-number">
        <div class="big-number-value">${Number(bp.total_gross_sf || 0).toLocaleString()}</div>
        <div class="big-number-label">Gross SF Analyzed</div>
      </div>
      <div class="big-number">
        <div class="big-number-value">${esc(bp.num_floors || 1)}</div>
        <div class="big-number-label">Floor${(bp.num_floors || 1) === 1 ? '' : 's'}</div>
      </div>
      <div class="big-number">
        <div class="big-number-value">${esc(bp.total_rooms || '—')}</div>
        <div class="big-number-label">Rooms Inventoried</div>
      </div>
    </div>` : ''}

    <div class="body-copy">${bodyHtml}</div>

    ${pw.requires_davis_bacon ? `<div class="pull-quote" style="margin-top:20pt;">
      This project is subject to federal Davis-Bacon prevailing wage rates under ${esc(pw.agency_or_owner || 'the contracting agency')}. Our labor pricing has been computed at the published wage determination.
      <div class="pull-quote-attr">— Wave 0.3 Prevailing Wage Detection</div>
    </div>` : ''}
  </div>
  <div class="page-footer">
    <span class="pf-company">${esc(cc.legalName)}</span>
    <span>Section 02 · Project Understanding</span>
  </div>
</div>`;
        },

        _renderApproachPage(ctx, body) {
            const cc = ctx.cc;
            // Try to split the approach body into phase blocks
            const phases = this._splitPhases(body || '');
            return `
<div class="page">
  <div class="page-header">
    <div class="ph-brand">${esc(cc.legalName)}</div>
    <div class="ph-ref">Section 03 · Technical Approach</div>
  </div>
  <div class="page-body">
    <div class="section-eyebrow">Section 03</div>
    <h2>Technical Approach</h2>
    <div style="font-family:${cc.fonts.heading};font-size:12pt;font-style:italic;color:var(--teal-dark);margin-top:6pt;">${esc(cc.methodology)}</div>
    <div class="gold-rule"></div>

    ${phases.length > 0 ? phases.map((p, i) => `
      <div class="phase-card">
        <div class="phase-num">${String(i + 1).padStart(2, '0')}</div>
        <div class="phase-body">
          <h4>${esc(p.title)}</h4>
          <p>${esc(p.body)}</p>
        </div>
      </div>
    `).join('') : `<div class="body-copy">${this._proseToHtml(body || this._fallbackApproach(ctx))}</div>`}
  </div>
  <div class="page-footer">
    <span class="pf-company">${esc(cc.legalName)}</span>
    <span>Section 03 · Technical Approach</span>
  </div>
</div>`;
        },

        _renderTeamPage(ctx) {
            const cc = ctx.cc;
            return `
<div class="page">
  <div class="page-header">
    <div class="ph-brand">${esc(cc.legalName)}</div>
    <div class="ph-ref">Section 04 · Project Team</div>
  </div>
  <div class="page-body">
    <div class="section-eyebrow">Section 04</div>
    <h2>Your Project Team</h2>
    <div class="gold-rule"></div>
    <p class="body-copy">Every project at ${esc(cc.legalName)} is delivered by a named team of credentialed professionals. The leadership below oversees your engagement from proposal through warranty closeout.</p>

    ${(cc.leadership || []).map(t => `
      <div class="team-card">
        <div class="team-avatar">${esc((t.name || '').split(' ').map(n => n[0]).join('').substring(0,2))}</div>
        <div class="team-info">
          <div class="team-name">${esc(t.name)}</div>
          <div class="team-title">${esc(t.title)}${t.location && t.location !== 'Corporate' ? ' · ' + esc(t.location) : ''}</div>
          <div class="team-bio">${esc(t.bio && !/\[UPDATE/.test(t.bio) ? t.bio : `${t.name.split(' ')[0]} brings years of enterprise-integration experience to every engagement at ${cc.legalName}, specializing in the full lifecycle of low-voltage technology projects — from pre-construction planning through warranty closeout.`)}</div>
        </div>
      </div>
    `).join('')}
  </div>
  <div class="page-footer">
    <span class="pf-company">${esc(cc.legalName)}</span>
    <span>Section 04 · Project Team</span>
  </div>
</div>`;
        },

        _renderPastPerformancePage(ctx) {
            const cc = ctx.cc;
            const projects = ctx.pastProjects || [];
            return `
<div class="page">
  <div class="page-header">
    <div class="ph-brand">${esc(cc.legalName)}</div>
    <div class="ph-ref">Section 05 · Past Performance</div>
  </div>
  <div class="page-body">
    <div class="section-eyebrow">Section 05</div>
    <h2>Relevant Past Performance</h2>
    <div class="gold-rule"></div>
    <p class="body-copy">Of the ${esc(cc.metrics.projectsCompleted)} projects ${esc(cc.legalName)} has completed since ${cc.founded}, the three below were selected for their direct relevance to ${esc(ctx.projName)} — similar disciplines, comparable scope, and overlapping operating conditions. References available on request.</p>

    ${projects.map(p => `
      <div class="pp-card">
        <div class="pp-card-client">${esc(p.clientNameForProposal || p.clientName)}</div>
        <div class="pp-card-meta">${esc(p.location || '')}${p.completion && !/\[UPDATE/.test(p.completion) ? ' · ' + esc(p.completion) : ''}${p.value && !/\[UPDATE/.test(p.value) ? ' · ' + esc(p.value) : ''}</div>
        <div class="pp-card-scope">${esc(p.scope || '')}</div>
        ${Array.isArray(p.highlights) && p.highlights.length > 0 ? `<ul class="pp-card-highlights">
          ${p.highlights.slice(0, 4).map(h => `<li>${esc(h)}</li>`).join('')}
        </ul>` : ''}
      </div>
    `).join('')}
  </div>
  <div class="page-footer">
    <span class="pf-company">${esc(cc.legalName)}</span>
    <span>Section 05 · Past Performance</span>
  </div>
</div>`;
        },

        _renderCompliancePage(ctx, matrix) {
            const cc = ctx.cc;
            const rows = matrix.rows || [];
            return `
<div class="page">
  <div class="page-header">
    <div class="ph-brand">${esc(cc.legalName)}</div>
    <div class="ph-ref">Section 06 · Compliance Matrix</div>
  </div>
  <div class="page-body">
    <div class="section-eyebrow">Section 06</div>
    <h2>Specification Compliance Matrix</h2>
    <div class="gold-rule"></div>
    <p class="body-copy">Every specification requirement relevant to our scope is mapped below against the ${esc(cc.legalName)} response. ${matrix.complianceScore != null ? `Overall compliance score: <strong>${esc(matrix.complianceScore)}/100</strong>. ` : ''}Items flagged for alternate treatment are addressed in Section 08.</p>

    ${rows.length > 0 ? `<table class="data-table">
      <thead>
        <tr><th style="width:0.8in;">Section</th><th>Requirement</th><th style="width:1.1in;">Status</th><th>Response</th></tr>
      </thead>
      <tbody>
        ${rows.slice(0, 40).map(r => `<tr>
          <td style="font-family:${cc.fonts.mono};font-size:9pt;">${esc(r.section)}</td>
          <td>${esc(r.requirement)}</td>
          <td><span style="padding:2pt 8pt;background:${r.status === 'Compliant' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)'};color:${r.status === 'Compliant' ? '#059669' : '#D97706'};font-weight:700;font-size:8.5pt;text-transform:uppercase;letter-spacing:0.5pt;">${esc(r.status)}</span></td>
          <td style="font-size:9pt;color:var(--gray);">${esc(r.response)}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : `<p class="body-copy" style="font-style:italic;color:var(--gray);">Compliance matrix will be generated from the Spec Compliance Checker output on the next analysis run.</p>`}
  </div>
  <div class="page-footer">
    <span class="pf-company">${esc(cc.legalName)}</span>
    <span>Section 06 · Compliance Matrix</span>
  </div>
</div>`;
        },

        _renderPricingPage(ctx) {
            const cc = ctx.cc;
            const cats = ctx.bomCategories || [];
            const total = cats.reduce((s, c) => s + (parseFloat(c.subtotal) || 0), 0);
            return `
<div class="page">
  <div class="page-header">
    <div class="ph-brand">${esc(cc.legalName)}</div>
    <div class="ph-ref">Section 11 · Investment</div>
  </div>
  <div class="page-body">
    <div class="section-eyebrow">Section 11</div>
    <h2>Investment Summary</h2>
    <div class="gold-rule"></div>
    <p class="body-copy">${esc(cc.legalName)} is pleased to offer the following firm fixed price for the complete scope of work described in this proposal. See Sections 07–10 for detailed scope, materials, cabling infrastructure, and labor breakdown. All pricing is guaranteed until <strong>${esc(ctx.validUntilStr)}</strong>.</p>

    ${cats.length > 0 ? `<table class="data-table">
      <thead>
        <tr><th>Category</th><th style="text-align:right;width:1in;">Items</th><th style="text-align:right;width:1.3in;">Subtotal</th></tr>
      </thead>
      <tbody>
        ${cats.map(c => `<tr>
          <td style="font-weight:600;">${esc(c.name)}</td>
          <td style="text-align:right;font-family:${cc.fonts.mono};">${esc(c.itemCount)}</td>
          <td style="text-align:right;font-family:${cc.fonts.mono};font-weight:700;">${fmtMoney(c.subtotal)}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : ''}

    <div style="margin-top:24pt;padding:24pt;background:linear-gradient(135deg,var(--navy),var(--teal-dark));color:white;text-align:center;border-top:4px solid var(--gold);border-bottom:4px solid var(--gold);">
      <div style="font-family:${cc.fonts.body};font-size:10pt;color:var(--gold);text-transform:uppercase;letter-spacing:3pt;font-weight:700;">Firm Fixed Price</div>
      <div style="font-family:${cc.fonts.heading};font-size:48pt;font-weight:900;color:white;line-height:1;margin-top:6pt;letter-spacing:-0.02em;">${esc(ctx.grandTotalDisplay)}</div>
      <div style="font-family:${cc.fonts.body};font-size:9pt;color:rgba(255,255,255,0.7);margin-top:8pt;letter-spacing:1pt;text-transform:uppercase;">Valid through ${esc(ctx.validUntilStr)}</div>
    </div>

    <p class="body-copy" style="margin-top:20pt;font-size:9.5pt;color:var(--gray);">This price is all-inclusive of labor, material, burden, overhead, profit, markups, and warranty per the terms listed in Section 08. Progress billing and retention terms per contract.</p>
  </div>
  <div class="page-footer">
    <span class="pf-company">${esc(cc.legalName)}</span>
    <span>Section 11 · Investment</span>
  </div>
</div>`;
        },

        _renderExclusionsPage(ctx) {
            const cc = ctx.cc;
            return `
<div class="page">
  <div class="page-header">
    <div class="ph-brand">${esc(cc.legalName)}</div>
    <div class="ph-ref">Section 13 · Exclusions & Assumptions</div>
  </div>
  <div class="page-body">
    <div class="section-eyebrow">Section 13</div>
    <h2>Exclusions, Assumptions & Clarifications</h2>
    <div class="gold-rule"></div>
    <p class="body-copy">The following scope boundaries apply to this proposal. Honest delineation up front is how we keep change-order friction to zero after award.</p>

    <h4 style="margin-top:18pt;color:var(--navy);">Exclusions</h4>
    <ul style="margin:8pt 0 8pt 18pt;font-size:10pt;line-height:1.6;">
      ${ctx.exclusions.map(e => `<li style="margin:5pt 0;">${esc(e)}</li>`).join('')}
    </ul>

    <h4 style="margin-top:18pt;color:var(--navy);">Assumptions</h4>
    <ul style="margin:8pt 0 8pt 18pt;font-size:10pt;line-height:1.6;">
      ${ctx.assumptions.map(a => `<li style="margin:5pt 0;">${esc(a)}</li>`).join('')}
    </ul>

    ${ctx.clarifications.length > 0 ? `<h4 style="margin-top:18pt;color:var(--navy);">Clarifications</h4>
    <ul style="margin:8pt 0 8pt 18pt;font-size:10pt;line-height:1.6;">
      ${ctx.clarifications.map(c => `<li style="margin:5pt 0;">${esc(c)}</li>`).join('')}
    </ul>` : ''}
  </div>
  <div class="page-footer">
    <span class="pf-company">${esc(cc.legalName)}</span>
    <span>Section 13 · Exclusions, Assumptions & Clarifications</span>
  </div>
</div>`;
        },

        _renderTestimonialsPage(ctx) {
            const cc = ctx.cc;
            const testimonials = cc.testimonials || [];
            return `
<div class="page">
  <div class="page-header">
    <div class="ph-brand">${esc(cc.legalName)}</div>
    <div class="ph-ref">Section 14 · Client Voices</div>
  </div>
  <div class="page-body">
    <div class="section-eyebrow">Section 14</div>
    <h2>In Our Clients' Words</h2>
    <div class="gold-rule"></div>

    ${testimonials.map(t => `
      <div class="pull-quote" style="margin:18pt 0;">
        ${esc(t.quote)}
        <div class="pull-quote-attr">— ${esc(t.name)}, ${esc(t.title)} · ${esc(t.companyType)}</div>
      </div>
    `).join('')}

    <div style="margin-top:24pt;padding:20pt;background:var(--light-gray);border-left:4px solid var(--gold);">
      <div style="font-family:${cc.fonts.heading};font-size:15pt;font-weight:700;color:var(--navy);">${esc(cc.metrics.clientRating)}/5.0 client rating</div>
      <div style="font-size:10pt;color:var(--gray);margin-top:4pt;">Based on ${esc(cc.metrics.clientReviewCount)} independent client reviews</div>
    </div>
  </div>
  <div class="page-footer">
    <span class="pf-company">${esc(cc.legalName)}</span>
    <span>Section 14 · Client Voices</span>
  </div>
</div>`;
        },

        // ═══════════════════════════════════════════════════════
        // v5.128.0 — Comprehensive Proposal Sections
        // Five new sections that show EVERY aspect of the project
        // ═══════════════════════════════════════════════════════

        // ── SECTION 07: Detailed Scope of Work ──────────────
        _renderScopeOfWorkPage(ctx) {
            const cc = ctx.cc;
            const counts = ctx.deviceCounts || {};
            const disciplines = ctx.disciplines || [];
            const scopeExcl = ctx.scopeExclusionScanner || {};
            const delineations = ctx.scopeDelineations?.delineations || [];

            // Build per-discipline device count tables
            const DISCIPLINE_KEYWORDS = {
                'CCTV': /camera|cctv|nvr|vms|dome|bullet|ptz|fisheye|panoram|surveillance|encoder|monitor/i,
                'Access Control': /card\s*reader|access|rex|electric\s*strike|maglock|door\s*contact|controller|intercom|credential|keypad/i,
                'Structured Cabling': /data\s*outlet|cat\s*6|keystone|patch\s*panel|wap|wireless|fiber|cable\s*tray|faceplate|j[\s-]?hook/i,
                'Fire Alarm': /smoke|heat|pull\s*station|horn|strobe|duct|facp|fire|annunciator|nac|module/i,
                'Audio Visual': /speaker|display|projector|amplifier|microphone|av\b|audio|dsp|touch\s*panel/i,
                'Intrusion Detection': /motion|glass\s*break|intrusion|siren|keypad/i,
                'Nurse Call Systems': /nurse|patient\s*station|pillow|dome\s*light|pull\s*cord|staff\s*station/i,
                'Distributed Antenna Systems (DAS)': /antenna|bda|das|splitter|coupler/i,
            };

            let deviceTableHtml = '';
            const countEntries = Object.entries(counts).filter(([k, v]) => {
                const n = typeof v === 'object' ? (v.consensus || v.count || v.total || 0) : v;
                return (parseFloat(n) || 0) > 0;
            });

            if (countEntries.length > 0) {
                // Group by discipline
                const grouped = {};
                for (const disc of disciplines) grouped[disc] = [];

                for (const [key, val] of countEntries) {
                    const count = typeof val === 'object' ? (val.consensus || val.count || val.total || val) : val;
                    let assigned = false;
                    for (const [disc, regex] of Object.entries(DISCIPLINE_KEYWORDS)) {
                        if (regex.test(key) && grouped[disc]) {
                            grouped[disc].push({ device: key, qty: count });
                            assigned = true;
                            break;
                        }
                    }
                    if (!assigned) {
                        const fallback = disciplines[0] || 'Other';
                        if (!grouped[fallback]) grouped[fallback] = [];
                        grouped[fallback].push({ device: key, qty: count });
                    }
                }

                for (const [disc, items] of Object.entries(grouped)) {
                    if (items.length === 0) continue;
                    deviceTableHtml += `
                    <h4 style="margin-top:16pt;color:var(--teal-dark);font-size:12pt;">${esc(disc)}</h4>
                    <table class="data-table" style="margin-top:6pt;">
                      <thead><tr><th>Device Type</th><th style="text-align:right;width:1in;">Qty</th></tr></thead>
                      <tbody>${items.map(i => `<tr>
                        <td>${esc(String(i.device).replace(/_/g, ' '))}</td>
                        <td style="text-align:right;font-family:${cc.fonts.mono};font-weight:700;">${typeof i.qty === 'number' ? i.qty : esc(String(i.qty))}</td>
                      </tr>`).join('')}</tbody>
                    </table>`;
                }
            } else {
                deviceTableHtml = '<p class="body-copy" style="color:var(--gray);font-style:italic;">Device counts not available — analysis may still be in progress.</p>';
            }

            // Scope exclusions from Responsibility Matrix
            const respMatrix = scopeExcl.responsibility_matrix || [];
            const outOfScope = respMatrix.filter(r => !r.our_scope);
            let scopeExclHtml = '';
            if (outOfScope.length > 0) {
                scopeExclHtml = `
                <h4 style="margin-top:20pt;color:var(--navy);">Items Explicitly NOT in Our Scope</h4>
                <p class="body-copy" style="font-size:9.5pt;color:var(--gray);margin-bottom:8pt;">Per the project Responsibility Matrix, the following are assigned to other trades:</p>
                <table class="data-table" style="margin-top:4pt;">
                  <thead><tr><th>Discipline</th><th>Responsible Party</th></tr></thead>
                  <tbody>${outOfScope.map(r => `<tr>
                    <td>${esc(r.discipline || 'Unknown')}</td>
                    <td style="font-weight:600;color:#ef4444;">${esc(r.responsible_party || 'Other')}</td>
                  </tr>`).join('')}</tbody>
                </table>`;
            }

            // OFOI / Rough-In-Only items
            let delineationHtml = '';
            const critical = delineations.filter(d => d.severity === 'critical' || d.phrase_type === 'OFOI' || d.phrase_type === 'NIC' || d.phrase_type === 'rough_in_only');
            if (critical.length > 0) {
                delineationHtml = `
                <h4 style="margin-top:20pt;color:var(--navy);">Scope Delineations from Documents</h4>
                <ul style="margin:8pt 0 8pt 18pt;font-size:10pt;line-height:1.6;">
                  ${critical.slice(0, 15).map(d => `<li style="margin:5pt 0;"><strong>${esc(d.phrase_type || 'NOTE')}:</strong> ${esc(d.affected_scope || d.exact_phrase || '')} — ${esc(d.contractor_responsibility || d.estimated_bom_correction || '')}</li>`).join('')}
                </ul>`;
            }

            return `
<div class="page">
  <div class="page-header">
    <div class="ph-brand">${esc(cc.legalName)}</div>
    <div class="ph-ref">Section 07 · Scope of Work</div>
  </div>
  <div class="page-body">
    <div class="section-eyebrow">Section 07</div>
    <h2>Detailed Scope of Work</h2>
    <div class="gold-rule"></div>
    <p class="body-copy">${esc(cc.legalName)} shall furnish all labor, materials, equipment, tools, and supervision necessary to install the following low-voltage systems for <strong>${esc(ctx.projName)}</strong>. All quantities below are verified through our multi-read consensus engine and cross-referenced against equipment schedules where available.</p>

    ${deviceTableHtml}
    ${scopeExclHtml}
    ${delineationHtml}
  </div>
  <div class="page-footer">
    <span class="pf-company">${esc(cc.legalName)}</span>
    <span>Section 07 · Detailed Scope of Work</span>
  </div>
</div>`;
        },

        // ── SECTION 08: Bill of Materials Detail ─────────────
        _renderBomDetailPages(ctx) {
            const cc = ctx.cc;
            const cats = ctx.bomItems || [];
            if (cats.length === 0) return '';

            const ROWS_PER_PAGE = 28;
            const pages = [];
            let currentRows = [];
            let pageIdx = 0;

            const flushPage = (isLast) => {
                if (currentRows.length === 0) return;
                pageIdx++;
                const pageNum = pageIdx === 1 ? '' : ` (continued, p${pageIdx})`;
                pages.push(`
<div class="page">
  <div class="page-header">
    <div class="ph-brand">${esc(cc.legalName)}</div>
    <div class="ph-ref">Section 08 · Bill of Materials${esc(pageNum)}</div>
  </div>
  <div class="page-body" style="padding-bottom:0.4in;">
    ${pageIdx === 1 ? `<div class="section-eyebrow">Section 08</div>
    <h2>Bill of Materials</h2>
    <div class="gold-rule"></div>
    <p class="body-copy" style="margin-bottom:12pt;">Complete material takeoff with manufacturer, part number, and unit pricing. All quantities verified through multi-read consensus.</p>` : ''}
    <table class="data-table" style="font-size:9pt;">
      <thead><tr>
        <th style="width:2.8in;">Item</th>
        <th style="width:0.9in;">Mfg</th>
        <th style="text-align:right;width:0.5in;">Qty</th>
        <th style="text-align:right;width:0.5in;">Unit</th>
        <th style="text-align:right;width:0.8in;">Unit Cost</th>
        <th style="text-align:right;width:0.9in;">Ext Cost</th>
      </tr></thead>
      <tbody>
        ${currentRows.join('')}
      </tbody>
    </table>
  </div>
  <div class="page-footer">
    <span class="pf-company">${esc(cc.legalName)}</span>
    <span>Section 08 · Bill of Materials</span>
  </div>
</div>`);
                currentRows = [];
            };

            for (const cat of cats) {
                const catName = cat.category || cat.name || 'Uncategorized';
                const items = cat.items || [];
                const subtotal = cat.subtotal || cat.total || items.reduce((s, i) => s + (parseFloat(i.ext_cost || i.extCost) || 0), 0);

                // Category header row
                currentRows.push(`<tr style="background:var(--light-gray);"><td colspan="6" style="font-weight:800;color:var(--navy);padding:6pt 4pt;font-size:10pt;">${esc(catName)}</td></tr>`);

                for (const item of items) {
                    if (currentRows.length >= ROWS_PER_PAGE) flushPage(false);
                    const name = item.item || item.name || item.device_type || '';
                    const mfg = item.mfg || item.manufacturer || '';
                    const qty = item.qty || 0;
                    const unit = item.unit || 'ea';
                    const unitCost = parseFloat(item.unit_cost || item.unitCost) || 0;
                    const extCost = parseFloat(item.ext_cost || item.extCost) || (qty * unitCost);
                    currentRows.push(`<tr>
                      <td style="font-size:8.5pt;">${esc(String(name).substring(0, 60))}</td>
                      <td style="font-size:8pt;color:var(--gray);">${esc(String(mfg).substring(0, 20))}</td>
                      <td style="text-align:right;font-family:${cc.fonts.mono};">${qty}</td>
                      <td style="text-align:right;font-size:8pt;">${esc(unit)}</td>
                      <td style="text-align:right;font-family:${cc.fonts.mono};">${fmtMoney(unitCost)}</td>
                      <td style="text-align:right;font-family:${cc.fonts.mono};font-weight:700;">${fmtMoney(extCost)}</td>
                    </tr>`);
                }
                // Subtotal row
                currentRows.push(`<tr style="border-top:2px solid var(--navy);"><td colspan="5" style="text-align:right;font-weight:700;padding-right:8pt;font-size:9pt;">${esc(catName)} Subtotal</td><td style="text-align:right;font-family:${cc.fonts.mono};font-weight:800;color:var(--navy);">${fmtMoney(subtotal)}</td></tr>`);
            }

            // Grand total row
            const grandTotal = cats.reduce((s, c) => {
                const sub = c.subtotal || c.total || (c.items || []).reduce((ss, i) => ss + (parseFloat(i.ext_cost || i.extCost) || 0), 0);
                return s + sub;
            }, 0);
            currentRows.push(`<tr style="border-top:3px double var(--gold);background:rgba(235,179,40,0.08);"><td colspan="5" style="text-align:right;font-weight:900;padding-right:8pt;font-size:10pt;color:var(--navy);">Material Grand Total</td><td style="text-align:right;font-family:${cc.fonts.mono};font-weight:900;font-size:11pt;color:var(--navy);">${fmtMoney(grandTotal)}</td></tr>`);

            flushPage(true);
            return pages.join('');
        },

        // ── SECTION 09: Infrastructure & Cabling ─────────────
        _renderInfrastructurePage(ctx) {
            const cc = ctx.cc;
            const mdf = ctx.mdfIdf || {};
            const cable = ctx.cablePathway || {};

            // MDF/IDF rooms
            const rooms = mdf.rooms || mdf.mdf_rooms || mdf.idf_rooms || [];
            let roomsHtml = '';
            if (Array.isArray(rooms) && rooms.length > 0) {
                roomsHtml = `
                <h4 style="margin-top:14pt;color:var(--navy);">MDF/IDF Telecommunications Rooms</h4>
                <table class="data-table" style="margin-top:6pt;">
                  <thead><tr><th>Room</th><th>Type</th><th>Equipment</th></tr></thead>
                  <tbody>${rooms.slice(0, 20).map(r => `<tr>
                    <td style="font-weight:600;">${esc(r.room_name || r.name || r.location || 'TR')}</td>
                    <td>${esc(r.type || r.room_type || (r.is_mdf ? 'MDF' : 'IDF'))}</td>
                    <td style="font-size:9pt;">${esc((r.equipment || r.items || []).slice(0, 5).map(e => typeof e === 'string' ? e : (e.name || e.item || '')).join(', ') || 'See BOM')}</td>
                  </tr>`).join('')}</tbody>
                </table>`;
            } else if (mdf.total_rooms || mdf.mdf_count || mdf.idf_count) {
                roomsHtml = `
                <h4 style="margin-top:14pt;color:var(--navy);">MDF/IDF Telecommunications Rooms</h4>
                <p class="body-copy">MDF Rooms: ${mdf.mdf_count || 1} · IDF Rooms: ${mdf.idf_count || 0} · Total: ${mdf.total_rooms || (mdf.mdf_count || 1) + (mdf.idf_count || 0)}</p>`;
            }

            // Cable pathway summary
            let cableHtml = '';
            const cableTypes = cable.cable_types || cable.cables || [];
            const avgRun = cable.average_run_length || cable.avg_run_ft || null;
            const totalFootage = cable.total_cable_footage || cable.total_ft || null;
            if (Array.isArray(cableTypes) && cableTypes.length > 0) {
                cableHtml = `
                <h4 style="margin-top:18pt;color:var(--navy);">Cable Types & Quantities</h4>
                <table class="data-table" style="margin-top:6pt;">
                  <thead><tr><th>Cable Type</th><th style="text-align:right;">Qty / Footage</th><th>Pathway</th></tr></thead>
                  <tbody>${cableTypes.slice(0, 15).map(c => `<tr>
                    <td style="font-weight:600;">${esc(c.type || c.cable_type || c.name || '')}</td>
                    <td style="text-align:right;font-family:${cc.fonts.mono};">${esc(String(c.total_footage || c.footage || c.qty || ''))}</td>
                    <td style="font-size:9pt;color:var(--gray);">${esc(c.pathway || c.routing || '')}</td>
                  </tr>`).join('')}</tbody>
                </table>`;
            }
            if (avgRun || totalFootage) {
                cableHtml += `<p class="body-copy" style="margin-top:8pt;font-size:9.5pt;color:var(--gray);">`;
                if (avgRun) cableHtml += `Average cable run: ${avgRun} ft · `;
                if (totalFootage) cableHtml += `Total estimated cable footage: ${Number(totalFootage).toLocaleString()} ft`;
                cableHtml += `</p>`;
            }

            // Backbone / riser
            const backbone = cable.backbone || cable.riser_cables || cable.fiber || [];
            let backboneHtml = '';
            if (Array.isArray(backbone) && backbone.length > 0) {
                backboneHtml = `
                <h4 style="margin-top:18pt;color:var(--navy);">Backbone & Riser Cables</h4>
                <ul style="margin:8pt 0 8pt 18pt;font-size:10pt;line-height:1.6;">
                  ${backbone.slice(0, 10).map(b => `<li style="margin:4pt 0;">${esc(typeof b === 'string' ? b : (b.type || b.cable_type || '') + (b.qty ? ': ' + b.qty : '') + (b.route ? ' (' + b.route + ')' : ''))}</li>`).join('')}
                </ul>`;
            }

            return `
<div class="page">
  <div class="page-header">
    <div class="ph-brand">${esc(cc.legalName)}</div>
    <div class="ph-ref">Section 09 · Infrastructure & Cabling</div>
  </div>
  <div class="page-body">
    <div class="section-eyebrow">Section 09</div>
    <h2>Infrastructure & Cabling</h2>
    <div class="gold-rule"></div>
    <p class="body-copy">The following infrastructure scope covers all telecommunications rooms, horizontal and backbone cabling, pathways, and supporting hardware required for the systems described in Sections 07-08.</p>
    ${roomsHtml}
    ${cableHtml}
    ${backboneHtml}
    ${!roomsHtml && !cableHtml && !backboneHtml ? '<p class="body-copy" style="color:var(--gray);font-style:italic;">Detailed infrastructure data will be available after full plan analysis.</p>' : ''}
  </div>
  <div class="page-footer">
    <span class="pf-company">${esc(cc.legalName)}</span>
    <span>Section 09 · Infrastructure & Cabling</span>
  </div>
</div>`;
        },

        // ── SECTION 10: Labor & Installation ─────────────────
        _renderLaborPage(ctx) {
            const cc = ctx.cc;
            const labor = ctx.laborData || {};
            const fin = ctx.financialSummary || {};
            const pw = ctx.prevailingWage || {};

            // Labor phases
            const phases = labor.phases || labor.labor_phases || [];
            let phasesHtml = '';
            if (Array.isArray(phases) && phases.length > 0) {
                phasesHtml = `
                <h4 style="margin-top:14pt;color:var(--navy);">Labor Hours by Phase</h4>
                <table class="data-table" style="margin-top:6pt;">
                  <thead><tr><th>Phase</th><th style="text-align:right;width:1in;">Hours</th><th style="text-align:right;width:1in;">Crew Size</th></tr></thead>
                  <tbody>${phases.map(p => `<tr>
                    <td style="font-weight:600;">${esc(p.phase || p.name || '')}</td>
                    <td style="text-align:right;font-family:${cc.fonts.mono};">${esc(String(p.hours || p.labor_hours || ''))}</td>
                    <td style="text-align:right;font-family:${cc.fonts.mono};">${esc(String(p.crew || p.crew_size || ''))}</td>
                  </tr>`).join('')}</tbody>
                </table>`;
            }

            // Total labor summary
            const totalHours = labor.total_hours || labor.total_labor_hours || phases.reduce((s, p) => s + (parseFloat(p.hours || p.labor_hours) || 0), 0);
            const totalLaborCost = parseFloat(labor.total_labor_cost || labor.labor_total) || 0;
            let laborSummaryHtml = '';
            if (totalHours > 0) {
                laborSummaryHtml = `
                <div style="margin-top:16pt;padding:16pt;background:var(--light-gray);border-left:4px solid var(--teal);">
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div><strong style="color:var(--navy);font-size:13pt;">Total Estimated Labor:</strong><br><span style="font-size:10pt;color:var(--gray);">${Math.round(totalHours).toLocaleString()} hours</span></div>
                    ${totalLaborCost > 0 ? `<div style="text-align:right;"><strong style="color:var(--navy);font-family:${cc.fonts.mono};font-size:16pt;">${fmtMoney(totalLaborCost)}</strong><br><span style="font-size:9pt;color:var(--gray);">Fully burdened</span></div>` : ''}
                  </div>
                </div>`;
            }

            // Prevailing wage
            let pwHtml = '';
            if (pw.detected || pw.prevailing_wage_required || pw.agency) {
                pwHtml = `
                <h4 style="margin-top:20pt;color:var(--navy);">Prevailing Wage Compliance</h4>
                <div style="padding:12pt;background:rgba(235,179,40,0.08);border:1px solid var(--gold);border-radius:6pt;margin-top:6pt;">
                  <p class="body-copy" style="margin:0;font-size:10pt;">
                    <strong style="color:var(--gold-dark);">Davis-Bacon / Prevailing Wage Required</strong><br>
                    ${pw.agency ? `Agency: ${esc(pw.agency)}<br>` : ''}
                    ${pw.wage_determination ? `Determination: ${esc(pw.wage_determination)}<br>` : ''}
                    ${pw.classification ? `Classification: ${esc(pw.classification)}<br>` : ''}
                    All labor rates in this proposal include prevailing wage rates, fringe benefits, and employer burden per the applicable wage determination.
                  </p>
                </div>`;
            }

            // Schedule of Values (Financial Engine SOV)
            const sov = fin.schedule_of_values || fin.sov || fin.cost_breakdown || null;
            let sovHtml = '';
            if (sov && typeof sov === 'object') {
                const sovEntries = Array.isArray(sov) ? sov : Object.entries(sov).map(([k, v]) => ({ category: k, amount: v }));
                if (sovEntries.length > 0) {
                    sovHtml = `
                    <h4 style="margin-top:20pt;color:var(--navy);">Schedule of Values</h4>
                    <table class="data-table" style="margin-top:6pt;">
                      <thead><tr><th>Cost Category</th><th style="text-align:right;width:1.5in;">Amount</th></tr></thead>
                      <tbody>${sovEntries.slice(0, 20).map(e => `<tr>
                        <td style="font-weight:600;">${esc(e.category || e.name || e.line_item || '')}</td>
                        <td style="text-align:right;font-family:${cc.fonts.mono};font-weight:700;">${fmtMoney(parseFloat(e.amount || e.value || e.cost) || 0)}</td>
                      </tr>`).join('')}</tbody>
                    </table>`;
                }
            }

            return `
<div class="page">
  <div class="page-header">
    <div class="ph-brand">${esc(cc.legalName)}</div>
    <div class="ph-ref">Section 10 · Labor & Installation</div>
  </div>
  <div class="page-body">
    <div class="section-eyebrow">Section 10</div>
    <h2>Labor & Installation Plan</h2>
    <div class="gold-rule"></div>
    <p class="body-copy">All installation will be performed by ${esc(cc.legalName)}'s OSHA-30 certified, BICSI-trained technicians under the direct supervision of a dedicated project manager and field foreman.</p>
    ${phasesHtml}
    ${laborSummaryHtml}
    ${pwHtml}
    ${sovHtml}
    ${!phasesHtml && !sovHtml ? '<p class="body-copy" style="color:var(--gray);font-style:italic;">Detailed labor breakdown will be available after full analysis.</p>' : ''}
  </div>
  <div class="page-footer">
    <span class="pf-company">${esc(cc.legalName)}</span>
    <span>Section 10 · Labor & Installation Plan</span>
  </div>
</div>`;
        },

        // ── SECTION 12: Clarifications & Risk Analysis ───────
        _renderClarificationsRiskPage(ctx) {
            const cc = ctx.cc;
            const qs = ctx.clarificationQs || [];
            const sc = ctx.specialConditions || {};
            const da = ctx.devilsAdvocate || {};
            const cv = ctx.crossValidator || {};
            const code = ctx.codeCompliance || {};

            // Open RFIs / Clarification Questions
            const highSev = qs.filter(q => q.severity === 'high' || q.severity === 'critical');
            let rfiHtml = '';
            if (highSev.length > 0) {
                rfiHtml = `
                <h4 style="margin-top:14pt;color:var(--navy);">Pre-Bid Clarification Requests</h4>
                <p class="body-copy" style="font-size:9.5pt;color:var(--gray);margin-bottom:6pt;">The following questions should be resolved prior to contract execution:</p>
                <ol style="margin:6pt 0 12pt 18pt;font-size:10pt;line-height:1.7;">
                  ${highSev.slice(0, 12).map(q => `<li style="margin:6pt 0;"><strong>${esc(q.question || q.text || '')}</strong>${q.context ? `<br><span style="font-size:9pt;color:var(--gray);">${esc(q.context)}</span>` : ''}</li>`).join('')}
                </ol>`;
            }

            // Special Conditions
            const permits = sc.permits || sc.permit_requirements || [];
            const phasing = sc.phasing || sc.work_phasing || null;
            const safety = sc.safety || sc.safety_requirements || [];
            const subcontractors = sc.subcontractors || [];
            let scHtml = '';
            if (permits.length > 0 || phasing || safety.length > 0 || subcontractors.length > 0) {
                scHtml = `<h4 style="margin-top:18pt;color:var(--navy);">Special Conditions & Site Requirements</h4><ul style="margin:8pt 0 8pt 18pt;font-size:10pt;line-height:1.7;">`;
                for (const p of (Array.isArray(permits) ? permits : [permits]).slice(0, 6)) {
                    scHtml += `<li style="margin:4pt 0;"><strong>Permit:</strong> ${esc(typeof p === 'string' ? p : (p.type || p.name || JSON.stringify(p)))}</li>`;
                }
                if (phasing) {
                    scHtml += `<li style="margin:4pt 0;"><strong>Phasing:</strong> ${esc(typeof phasing === 'string' ? phasing : (phasing.description || JSON.stringify(phasing)))}</li>`;
                }
                for (const s of (Array.isArray(safety) ? safety : []).slice(0, 6)) {
                    scHtml += `<li style="margin:4pt 0;"><strong>Safety:</strong> ${esc(typeof s === 'string' ? s : (s.requirement || s.description || JSON.stringify(s)))}</li>`;
                }
                for (const sub of (Array.isArray(subcontractors) ? subcontractors : []).slice(0, 4)) {
                    scHtml += `<li style="margin:4pt 0;"><strong>Subcontractor:</strong> ${esc(typeof sub === 'string' ? sub : (sub.trade || sub.name || '') + ': ' + (sub.scope || sub.description || ''))}</li>`;
                }
                scHtml += '</ul>';
            }

            // Risk items from Devil's Advocate
            const challenges = da.challenges || da.missed_items || da.issues || [];
            const missedItems = da.missed_items || [];
            let riskHtml = '';
            if (Array.isArray(challenges) && challenges.length > 0) {
                riskHtml = `
                <h4 style="margin-top:18pt;color:var(--navy);">Potential Risk Items & Change Order Exposure</h4>
                <p class="body-copy" style="font-size:9.5pt;color:var(--gray);margin-bottom:6pt;">Our adversarial analysis identified the following items that may require change orders or clarification:</p>
                <table class="data-table" style="margin-top:6pt;font-size:9pt;">
                  <thead><tr><th>Risk Item</th><th style="width:0.7in;">Severity</th><th style="text-align:right;width:1in;">Est. Impact</th></tr></thead>
                  <tbody>${challenges.slice(0, 12).map(c => {
                    const sev = c.severity || 'info';
                    const sevColor = sev === 'critical' ? '#ef4444' : sev === 'high' ? '#f59e0b' : '#3b82f6';
                    return `<tr>
                      <td>${esc(c.description || c.issue || c.item || '')}</td>
                      <td><span style="padding:2pt 8pt;border-radius:3pt;font-size:8pt;font-weight:700;color:white;background:${sevColor};text-transform:uppercase;">${esc(sev)}</span></td>
                      <td style="text-align:right;font-family:${cc.fonts.mono};">${esc(c.estimated_impact || c.impact || '—')}</td>
                    </tr>`;
                  }).join('')}</tbody>
                </table>`;
            }

            // Code Compliance
            const codes = code.applicable_codes || code.codes || [];
            let codeHtml = '';
            if (Array.isArray(codes) && codes.length > 0) {
                codeHtml = `
                <h4 style="margin-top:18pt;color:var(--navy);">Applicable Codes & Standards</h4>
                <ul style="margin:8pt 0 8pt 18pt;font-size:10pt;line-height:1.6;">
                  ${codes.slice(0, 10).map(c => `<li style="margin:3pt 0;">${esc(typeof c === 'string' ? c : (c.code || c.standard || '') + (c.section ? ' §' + c.section : '') + (c.requirement ? ': ' + c.requirement : ''))}</li>`).join('')}
                </ul>`;
            }

            return `
<div class="page">
  <div class="page-header">
    <div class="ph-brand">${esc(cc.legalName)}</div>
    <div class="ph-ref">Section 12 · Clarifications & Risk</div>
  </div>
  <div class="page-body">
    <div class="section-eyebrow">Section 12</div>
    <h2>Clarifications & Risk Analysis</h2>
    <div class="gold-rule"></div>
    <p class="body-copy">Transparency builds trust. The following items represent our proactive identification of areas that may affect project scope, schedule, or cost. We address them now rather than as change orders later.</p>
    ${rfiHtml}
    ${scHtml}
    ${riskHtml}
    ${codeHtml}
    ${!rfiHtml && !scHtml && !riskHtml && !codeHtml ? '<p class="body-copy" style="color:var(--gray);font-style:italic;">No significant clarifications or risk items identified — scope is well-defined.</p>' : ''}
  </div>
  <div class="page-footer">
    <span class="pf-company">${esc(cc.legalName)}</span>
    <span>Section 12 · Clarifications & Risk Analysis</span>
  </div>
</div>`;
        },

        _renderBackCover(ctx) {
            const cc = ctx.cc;
            return `
<div class="page cover">
  <div class="cover-inner" style="justify-content:center;text-align:center;">
    <div class="cover-gold-bar" style="margin:0 auto 0.4in auto;"></div>
    <div class="cover-eyebrow">Thank You</div>
    <h1 class="cover-title" style="font-size:42pt;">We look forward<br>to earning your trust.</h1>

    <div style="margin-top:0.6in;font-family:${cc.fonts.body};font-size:11pt;color:rgba(255,255,255,0.88);line-height:1.9;">
      <div style="font-size:18pt;font-family:${cc.fonts.heading};color:var(--gold);margin-bottom:14pt;">${esc(cc.legalName)}</div>
      <div>${esc(cc.headquarters.address)}</div>
      <div>${esc(cc.headquarters.cityStateZip)}</div>
      <div style="margin-top:12pt;">${esc(cc.headquarters.mainPhone)} · ${esc(cc.headquarters.tollFree)}</div>
      <div>${esc(cc.website)}</div>
    </div>

    <div style="margin-top:auto;padding-top:0.5in;font-family:${cc.fonts.body};font-size:8pt;color:rgba(255,255,255,0.45);letter-spacing:2pt;text-transform:uppercase;">
      Reference ${esc(ctx.refNum)} · Submitted ${esc(ctx.dateStr)}
    </div>
  </div>
</div>`;
        },

        _sectionDivider(num, title, quote) {
            return `
<div class="page section-divider">
  <div class="section-divider-num">${num}</div>
  <div class="section-divider-title">${esc(title)}</div>
  <div class="section-divider-quote">${esc(quote)}</div>
</div>`;
        },

        // ═══ Text helpers ═══════════════════════════════════════

        _proseToHtml(text) {
            if (!text) return '<p><em>Content pending.</em></p>';
            // Split into paragraphs on blank lines
            return text
                .split(/\n\s*\n/)
                .map(p => p.trim())
                .filter(p => p.length > 0)
                .map(p => {
                    // Heuristic: headers start with "Phase X —" or end with a colon and are short
                    if (/^(Phase \d|Section \d|What You|Why 3D|Bottom Line)/i.test(p) && p.length < 80) {
                        return `<h4 style="margin-top:14pt;margin-bottom:6pt;">${esc(p)}</h4>`;
                    }
                    // Bullet list detection
                    if (/^[•\-\*]\s/.test(p)) {
                        const lines = p.split('\n').map(l => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
                        return `<ul style="margin:6pt 0 10pt 18pt;">${lines.map(l => `<li style="margin:4pt 0;">${esc(l)}</li>`).join('')}</ul>`;
                    }
                    return `<p>${esc(p)}</p>`;
                })
                .join('\n');
        },

        _splitPhases(text) {
            if (!text) return [];
            const out = [];
            // Match "Phase 1 — Title" followed by body text
            const re = /Phase\s+(\d+)\s*[—\-:]\s*([^\n]+)\n+([\s\S]*?)(?=\n\s*Phase\s+\d+\s*[—\-:]|$)/gi;
            let m;
            while ((m = re.exec(text)) !== null) {
                out.push({
                    num: parseInt(m[1]),
                    title: m[2].trim(),
                    body: m[3].trim().replace(/\s+/g, ' '),
                });
            }
            return out;
        },

        _downloadHtml(html, filename, mime) {
            const blob = new Blob([html], { type: mime || 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 60000);
        },

        _openHtmlInNewTab(html, title) {
            try {
                const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const win = window.open(url, '_blank');
                // Don't revoke immediately — the new tab needs the URL
                setTimeout(() => URL.revokeObjectURL(url), 60 * 60 * 1000);
                return win;
            } catch (e) {
                console.warn('[ProposalGen v2] Could not open in new tab:', e.message);
                return null;
            }
        },
    };

    // Mix v2 methods into the existing ProposalGenerator singleton
    Object.assign(ProposalGenerator, v2Methods);

    console.log('[SmartPlans] ProposalGenerator v2 (Auto-Proposal) loaded — generateCompleteBidPackage() available');
})();
