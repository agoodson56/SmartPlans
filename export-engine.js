// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — EXPORT ENGINE
// Produces structured export packages for PM App import
// Formats: JSON (structured data), Excel (.xlsx), Markdown (.md)
// ═══════════════════════════════════════════════════════════════

const SmartPlansExport = {

    // ─── Build structured data package ─────────────────────────
    buildExportPackage(state) {
        const now = new Date();
        const regionKey = state.regionalMultiplier || "national_average";
        const regionMult = PRICING_DB.regionalMultipliers[regionKey] || 1.0;
        const burdenMult = state.includeBurden ? (1 + state.burdenRate / 100) : 1.0;

        // Pre-extract BOM for financials section
        const bom = this._extractBOMFromAnalysis(state.aiAnalysis);

        return {
            _meta: {
                format: "smartplans-export",
                version: "3.0",
                generatedAt: now.toISOString(),
                generatedBy: "SmartPlans — AI-Powered ELV Estimation",
                appVersion: PRICING_DB.version,
            },

            project: {
                name: state.projectName || "Untitled Project",
                preparedFor: state.preparedFor || "",
                type: state.projectType || "",
                location: state.projectLocation || "",
                jurisdiction: state.codeJurisdiction || "",
                disciplines: [...state.disciplines],
                fileFormat: state.fileFormat || "",
                prevailingWage: state.prevailingWage || "",
                workShift: state.workShift || "",
            },

            documents: {
                legendFiles: state.legendFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
                planFiles: state.planFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
                specFiles: state.specFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
                addendaFiles: state.addendaFiles.map(f => ({ name: f.name, size: f.size, type: f.type })),
                totalSheets: state.planFiles.length,
                totalSpecs: state.specFiles.length,
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
                    Object.entries(state.laborRates).map(([k, v]) => [k, +(v * burdenMult).toFixed(2)])
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
            financials: {
                grandTotal: bom.grandTotal,
                markup: { ...state.markup },
                categories: bom.categories.map(cat => ({
                    name: cat.name,
                    subtotal: cat.subtotal,
                    items: cat.items.map(item => ({
                        name: item.item,
                        qty: item.qty,
                        unit: item.unit,
                        unitCost: item.unitCost,
                        extCost: item.extCost,
                        category: item.category || 'other',
                    })),
                })),
                totalLineItems: bom.categories.reduce((s, c) => s + c.items.length, 0),
            },

            rfis: this._extractRFIs(state),

            // Structured MDF/IDF data for SmartPM Infrastructure module
            // AI-generated budgets — locked from field manipulation
            infrastructure: this._extractInfrastructure(state),

            // Work Breakdown Structure — auto-generated from bid data
            // Produces a hierarchical task tree for PM tracking
            workBreakdown: this._buildWorkBreakdown(state),
        };
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
                /#{1,3}\s*(?:MDF\/IDF|MDF\/IDF\/TR)[^\n]*/i,
                /#{1,3}\s*(?:INFRASTRUCTURE|TELECOM|CLOSET|ROOM)[^\n]*(?:MATERIAL|BREAKDOWN|EQUIPMENT)[^\n]*/i,
                /\*\*(?:MDF\/IDF|MDF\/IDF\/TR)[^*]*\*\*/i,
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
                unit_cost: Math.round(unitCost * 100) / 100,
                budgeted_cost: Math.round(extCost * 100) / 100,
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
                        budgeted_cost: Math.round(qty * unitCost * 100) / 100,
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
                budgeted_material: Math.round(projectTotalMaterial * phase.materialPct * 100) / 100,
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
                    budgeted_material: Math.round(locMatBudget * 100) / 100,
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
                        budgeted_material: Math.round((locMatBudget / taskCount) * 100) / 100,
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
                project_material_budget: Math.round(projectTotalMaterial * 100) / 100,
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
        if (!aiAnalysis) return { categories: [], grandTotal: 0 };

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
                const isCategory = /material|cost|pricing|equipment|cabling|cctv|camera|access|fire|alarm|intrusion|audio|visual|av\b|structured|backbone|infrastructure|mdf|idf|misc|general|conduit|pathway|rack|panel|device|summary|breakdown|bill|bom/i.test(heading);
                const isNonCategory = /confidence|methodology|timeline|schedule|rfi|risk|note|assumption|disclaimer|verification|validation|labor|phase|rough|trim|programming|testing|commissioning|what to do|next step/i.test(heading);

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

                    currentCategory.items.push({
                        item: cleanName,
                        qty: qty,
                        unit: unit,
                        unitCost: Math.round(unitCost * 100) / 100,
                        extCost: Math.round(extCost * 100) / 100,
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

        // Calculate subtotals & grand total
        let grandTotal = 0;
        for (const cat of categories) {
            if (cat.subtotal === 0) {
                cat.subtotal = cat.items.reduce((sum, item) => sum + (item.extCost || 0), 0);
            }
            grandTotal += cat.subtotal;
        }

        return { categories, grandTotal: Math.round(grandTotal * 100) / 100 };
    },

    /**
     * Export a detailed Bill of Materials as an Excel workbook.
     * Sheets: 1) Project Info, 2) Full BOM, 3) Category Summary
     */
    exportBOM(state) {
        const bom = this._extractBOMFromAnalysis(state.aiAnalysis);

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
                ["Category", "Item / Description", "Qty", "Unit", "Unit Cost ($)", "Extended Cost ($)"],
            ];

            let runningTotal = 0;
            let totalLineItems = 0;
            let totalQuantity = 0;

            for (const cat of bom.categories) {
                // Category header row
                bomData.push([]);
                bomData.push([cat.name.toUpperCase(), "", "", "", "", ""]);

                for (const item of cat.items) {
                    bomData.push([
                        "",
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
                bomData.push(["", `SUBTOTAL — ${cat.name}`, "", "", "", cat.subtotal]);
                runningTotal += cat.subtotal;
            }

            // Grand total section
            bomData.push([]);
            bomData.push(["", "", "", "", "", ""]);
            bomData.push(["", "MATERIAL GRAND TOTAL", "", "", "", runningTotal]);
            if (state.markup && state.markup.material > 0) {
                const markupAmt = runningTotal * (state.markup.material / 100);
                bomData.push(["", `MARKUP (${state.markup.material}%)`, "", "", "", Math.round(markupAmt * 100) / 100]);
                bomData.push(["", "TOTAL WITH MARKUP", "", "", "", Math.round((runningTotal + markupAmt) * 100) / 100]);
            }
            bomData.push([]);
            bomData.push(["", `Total Line Items: ${totalLineItems}`, `Total Qty: ${totalQuantity}`, "", "", ""]);

            const ws2 = XLSX.utils.aoa_to_sheet(bomData);
            ws2["!cols"] = [{ wch: 24 }, { wch: 50 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 16 }];
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

            const csv = rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
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
                summaryData.push([label, rate, `${(burdenMult * 100 - 100).toFixed(0)}%`, +(rate * burdenMult).toFixed(2)]);
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
                                +(item[tier] * regionMult).toFixed(2),
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
            const csv = rows.map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
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
            md += `| ${label} | $${rate.toFixed(2)}/hr | ${(burdenMult * 100 - 100).toFixed(0)}% | $${(rate * burdenMult).toFixed(2)}/hr |\n`;
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
            md += state.aiAnalysis;
        } else {
            md += `*No AI analysis has been generated yet.*\n`;
        }
        md += `\n\n`;

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
        md += `\n\n---\n\n`;
        md += `*Generated by SmartPlans — AI-Powered ELV Document Analysis & Estimation*\n`;
        md += `*${now.toISOString()}*\n`;

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
};

// Make available globally
if (typeof window !== "undefined") {
    window.SmartPlansExport = SmartPlansExport;
}
