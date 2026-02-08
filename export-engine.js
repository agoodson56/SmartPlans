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

        return {
            _meta: {
                format: "smartplans-export",
                version: "2.0",
                generatedAt: now.toISOString(),
                generatedBy: "SmartPlans — AI-Powered ELV Estimation",
                appVersion: PRICING_DB.version,
            },

            project: {
                name: state.projectName || "Untitled Project",
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

            rfis: this._extractRFIs(state),

            // Structured MDF/IDF data for SmartPM Infrastructure module
            // AI-generated budgets — locked from field manipulation
            infrastructure: this._extractInfrastructure(state),
        };
    },

    // ─── Parse AI analysis into structured sections ────────────
    _parseAnalysisSections(markdown) {
        if (!markdown) return {};
        const sections = {};
        const headerRegex = /^#{1,3}\s+(.+)$/gm;
        let match;
        const headers = [];

        while ((match = headerRegex.exec(markdown)) !== null) {
            headers.push({ title: match[1].trim(), index: match.index, end: 0 });
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
    // Parses the "MDF/IDF MATERIAL BREAKDOWN" section into structured
    // location data that SmartPM imports as locked AI budgets
    _extractInfrastructure(state) {
        const md = state.aiAnalysis || "";
        if (!md) return { locations: [], source: 'none' };

        // Find the MDF/IDF section
        const sectionRegex = /#{1,3}\s*MDF\/IDF[^\n]*/i;
        const match = sectionRegex.exec(md);
        if (!match) return { locations: [], source: 'not_found' };

        // Extract content until next major section (## heading)
        const start = match.index;
        const nextSection = md.substring(start + match[0].length).search(/\n#{1,2}\s+[A-Z]/);
        const sectionContent = nextSection > -1
            ? md.substring(start, start + match[0].length + nextSection)
            : md.substring(start);

        // Split into individual room sections (### sub-headers or bold room names)
        const roomSplits = sectionContent.split(/(?=###\s+|\*\*(?:MDF|IDF|TR|Telecom Room)[^*]*\*\*)/i);
        const locations = [];

        for (const roomBlock of roomSplits) {
            if (!roomBlock.trim()) continue;
            // Try to extract room name from header or bold text
            const nameMatch = roomBlock.match(/(?:###\s*|\*\*)([^*\n]+)/);
            if (!nameMatch) continue;
            const rawName = nameMatch[1].replace(/\*+/g, '').trim();
            if (!rawName || rawName.toLowerCase().includes('material breakdown')) continue;

            // Determine type
            const lower = rawName.toLowerCase();
            let type = 'idf';
            if (lower.includes('mdf') || lower.includes('main distribution')) type = 'mdf';
            else if (lower.includes('tr') || lower.includes('telecom room')) type = 'tr';

            // Extract floor/room from name or content
            const floorMatch = roomBlock.match(/(?:floor|level)\s*[:#]?\s*([\w\d-]+)/i);
            const roomMatch = roomBlock.match(/(?:room|rm)\s*[:#]?\s*([\w\d-]+)/i);

            // Extract equipment items from tables or lists
            const items = [];
            // Match table rows: | item | qty | cost | etc
            const tableRows = roomBlock.match(/\|[^|\n]+\|[^|\n]+\|[^\n]*/g) || [];
            for (const row of tableRows) {
                const cells = row.split('|').map(c => c.trim()).filter(Boolean);
                if (cells.length < 2) continue;
                // Skip header rows
                if (cells[0].match(/^[-:]+$/) || cells[0].toLowerCase() === 'item') continue;
                const qtyMatch = cells.find(c => c.match(/^\d+$/));
                const costMatch = cells.find(c => c.match(/\$[\d,]+/));
                items.push({
                    item_name: cells[0],
                    category: this._guessCategory(cells[0]),
                    budgeted_qty: qtyMatch ? parseInt(qtyMatch) : 1,
                    budgeted_cost: costMatch ? parseFloat(costMatch.replace(/[\$,]/g, '')) : 0,
                });
            }

            // Extract cable quantities from mentions like "150 Cat 6A drops" or "12-strand fiber"
            const cableRuns = [];
            const cablePatterns = [
                { regex: /(\d+)\s*(?:Cat\s*6A?|CAT6A?)\s*(?:drops?|runs?|cables?)/gi, type: 'cat6a' },
                { regex: /(\d+)\s*(?:Cat\s*6|CAT6)(?!A)\s*(?:drops?|runs?|cables?)/gi, type: 'cat6' },
                { regex: /(\d+)[-\s]*(?:strand|fiber|SM|OS2)\s*(?:fiber|cable|backbone)/gi, type: 'fiber_sm' },
                { regex: /(\d+)[-\s]*(?:strand|fiber|MM|OM[34])\s*(?:fiber|cable|backbone)/gi, type: 'fiber_mm' },
            ];
            for (const { regex, type: cableType } of cablePatterns) {
                let m;
                while ((m = regex.exec(roomBlock)) !== null) {
                    cableRuns.push({ cable_type: cableType, budgeted_qty: parseInt(m[1]) });
                }
            }

            locations.push({
                name: rawName,
                type,
                floor: floorMatch ? floorMatch[1] : null,
                room_number: roomMatch ? roomMatch[1] : null,
                items: items.filter(i => i.item_name && !i.item_name.match(/^[-:]+$/)),
                cable_runs: cableRuns,
                raw_content: roomBlock.substring(0, 2000), // Keep raw for reference
            });
        }

        return {
            locations,
            source: 'ai_analysis',
            extracted_at: new Date().toISOString(),
        };
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
            alert("Excel library not loaded. Please check your internet connection and refresh.");
            return;
        }

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
        this.exportJSON(state);
        setTimeout(() => this.exportExcel(state), 300);
        setTimeout(() => this.exportMarkdown(state), 600);
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
