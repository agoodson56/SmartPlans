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
