// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — 3D FORMULA ENGINE v2.0
// Deterministic bid calculator based on 3D Technology Services
// actual estimating template workbook formulas.
// Verified against ALL sample bids (Amtrak, Commercial, Government).
//
// TWO PRICING MODELS:
//   Format A (In-house Template): SAC JC, 1515 S St, Sam Brennan, 500 Capitol, Indians
//     → Material: cost × (1 + M/U), where M/U = 0.42 standard
//     → Labor: hours × sell rate (from rate table)
//     → Commission: 3% (4% card access/CCTV)
//     → Tax: 8.75% on material cost, also marked up
//
//   SAGE ERP (Emeryville/Martinez transit bids):
//     → Material sell factor: 1.51424× cost
//     → Labor sell factor: 1.39240× cost
//     → Uniform across ALL line items
// ═══════════════════════════════════════════════════════════════

const FormulaEngine3D = {

    version: "2.0.0",

    // ─── NPW Labor Rate Table (verified across ALL Format A bids) ──
    // SAC Juvenile Court, Sam Brennan, 500 Capitol Mall, Indians — identical rates
    laborRates: {
        npw: {
            "01_project_manager":  { base: 48.00, pti: 0.59,  burdened: 76.32, sell: 112 },
            "02_foreman":          { base: 34.00, pti: 0.56,  burdened: 53.04, sell: 80 },
            "05_cable_installer":  { base: 30.00, pti: 0.57,  burdened: 47.10, sell: 80 },
            "06_data_tech_i":      { base: 30.00, pti: 0.57,  burdened: 47.10, sell: 80 },
            "07_data_tech_ii":     { base: 30.00, pti: 0.57,  burdened: 47.10, sell: 80 },
            "08_data_tech_iii":    { base: 35.00, pti: 0.56,  burdened: 54.60, sell: 80 },
            "09_data_tech_iv":     { base: 35.00, pti: 0.56,  burdened: 54.60, sell: 80 },
            "10_cad":              { base: 38.00, pti: 0.55,  burdened: 58.90, sell: 85 },
            "20_engineer":         { base: 40.00, pti: 0.55,  burdened: 62.00, sell: 90 },
            "25_warehouse":        { base: 28.00, pti: 0.59,  burdened: 44.52, sell: 65 },
            "30_admin":            { base: 30.00, pti: 0.57,  burdened: 47.10, sell: 70 },
        },
        // PW Sacramento (verified from SAC Juvenile Court + Sam Brennan TELEDATA)
        pw_sacramento: {
            "01_project_manager":  { base: 48.00, pti: 0.59,   burdened: 76.32,  sell: 112 },
            "02_foreman":          { base: 75.06, pti: 0.35,   burdened: 101.33, sell: 140 },
            "05_cable_installer":  { base: 68.39, pti: 0.356,  burdened: 92.77,  sell: 135 },
            "06_data_tech_i":      { base: 68.39, pti: 0.356,  burdened: 92.77,  sell: 135 },
            "07_data_tech_ii":     { base: 68.39, pti: 0.356,  burdened: 92.77,  sell: 135 },
            "08_data_tech_iii":    { base: 68.39, pti: 0.356,  burdened: 92.77,  sell: 135 },
            "09_data_tech_iv":     { base: 68.39, pti: 0.356,  burdened: 92.77,  sell: 135 },
            "10_cad":              { base: 38.00, pti: 0.55,   burdened: 58.90,  sell: 85 },
            "20_engineer":         { base: 40.00, pti: 0.55,   burdened: 62.00,  sell: 90 },
            "25_warehouse":        { base: 28.00, pti: 0.59,   burdened: 44.52,  sell: 65 },
            "30_admin":            { base: 30.00, pti: 0.57,   burdened: 47.10,  sell: 70 },
        },
        // PW 1515 S Street rates (slightly different jurisdiction)
        pw_1515: {
            "01_project_manager":  { base: 48.00, pti: 0.59,   burdened: 76.32,  sell: 112 },
            "02_foreman":          { base: 67.52, pti: 0.36,   burdened: 91.83,  sell: 130 },
            "05_cable_installer":  { base: 61.84, pti: 0.35,   burdened: 83.48,  sell: 121 },
            "06_data_tech_i":      { base: 61.84, pti: 0.35,   burdened: 83.48,  sell: 121 },
            "07_data_tech_ii":     { base: 61.84, pti: 0.35,   burdened: 83.48,  sell: 121 },
            "08_data_tech_iii":    { base: 61.84, pti: 0.35,   burdened: 83.48,  sell: 121 },
            "09_data_tech_iv":     { base: 61.84, pti: 0.35,   burdened: 83.48,  sell: 121 },
            "10_cad":              { base: 38.00, pti: 0.55,   burdened: 58.90,  sell: 85 },
            "20_engineer":         { base: 40.00, pti: 0.55,   burdened: 62.00,  sell: 90 },
            "25_warehouse":        { base: 28.00, pti: 0.59,   burdened: 44.52,  sell: 65 },
            "30_admin":            { base: 30.00, pti: 0.57,   burdened: 47.10,  sell: 70 },
        },
        // PW General (Stanislaus County / Modesto — higher jurisdiction rates)
        pw_general: {
            "01_project_manager":  { base: 48.00, pti: 0.59,   burdened: 76.32,  sell: 112 },
            "02_foreman":          { base: 80.80, pti: 0.35,   burdened: 109.08, sell: 150 },
            "05_cable_installer":  { base: 73.78, pti: 0.35,   burdened: 99.60,  sell: 145 },
            "06_data_tech_i":      { base: 73.78, pti: 0.35,   burdened: 99.60,  sell: 145 },
            "07_data_tech_ii":     { base: 73.78, pti: 0.35,   burdened: 99.60,  sell: 145 },
            "08_data_tech_iii":    { base: 73.78, pti: 0.35,   burdened: 99.60,  sell: 145 },
            "09_data_tech_iv":     { base: 73.78, pti: 0.35,   burdened: 99.60,  sell: 145 },
            "10_cad":              { base: 38.00, pti: 0.55,   burdened: 58.90,  sell: 85 },
            "20_engineer":         { base: 40.00, pti: 0.55,   burdened: 62.00,  sell: 90 },
            "25_warehouse":        { base: 28.00, pti: 0.59,   burdened: 44.52,  sell: 65 },
            "30_admin":            { base: 30.00, pti: 0.57,   burdened: 47.10,  sell: 70 },
        },
        // SAGE ERP sell rates (Emeryville/Martinez transit — different model)
        sage_transit: {
            // SAGE uses cost × 1.39240 for labor sell
            "field_tech":     { cost: 80.00,  sell: 111.39, factor: 1.39240 },
            "electrical_tech":{ cost: 95.00,  sell: 132.28, factor: 1.39240 },
            "project_manager":{ cost: 85.00,  sell: 118.35, factor: 1.39240 },
            "engr_admin":     { cost: 65.00,  sell: 90.51,  factor: 1.39240 },
            "per_diem":       { cost: 38.00,  sell: 52.91,  factor: 1.39240 },
            "mileage":        { cost: 0.65,   sell: 0.91,   factor: 1.39240 },
        },
    },

    // ─── Material Markup (verified from actual bids) ──
    // NPW jobs: 42% markup (SAC JC, 500 Capitol, Indians)
    // PW jobs: 51.5% markup (Modesto Library TELEDATA)
    // SAGE ERP transit: flat 1.51424× factor (Emeryville/Martinez)
    materialMarkup: {
        npw:            0.42,   // Non-Prevailing Wage markup on cost
        pw:             0.515,  // Prevailing Wage markup on cost (Modesto Library verified)
        sage_factor:    1.51424, // SAGE ERP material sell factor (Emeryville/Martinez)
        formatB_margin: 0.30,   // Format B uses 30% margin (= cost / 0.70 = 1.4286× factor)
    },

    // ─── Commission by System Type (verified across all bids) ──
    commissionRates: {
        card_access: 0.04,  // 4% — SAC JC, Sam Brennan, Modesto Library
        cctv:        0.04,  // 4% — Sam Brennan, Modesto Library
        intrusion:   0.04,  // 4% — Modesto Library confirmed
        _default:    0.03,  // 3% — everything else (teledata, backbone, fire alarm, etc.)
    },

    taxRate: 0.0875,          // 8.75% — Format A standard (Sacramento)
    taxRate_countyB: 0.1025,  // 10.25% — Format B (Sacramento County)

    laborMiscAdder: 0.05,     // 5% miscellaneous on labor hours (verified all bids)
    materialMiscPct: 0.01,    // 1% contingency on materials
    materialSlush: 50,        // $50 flat buffer per system
    warrantyFlat: { cost: 295, sell: 354 },  // Flat warranty per system (verified all bids)
    bondsPct: 0.02,           // 2% bonds (verified all bids)

    // ─── Other Cost Markups (verified from Modesto Library + all prior bids) ──
    otherCostMarkups: {
        subcontractor:   0.20,  // 20% markup on subs
        licensepermit:   0.15,  // 15% markup on licenses/permits
        lift:            0.25,  // 25% markup on lift/equipment rental
        container:       0.20,  // 20% markup on on-site container
        mileageRate:     0.63,  // $/mile
        parkingRate:     15.00, // $/day
        perDiemRate:     42.00, // $/day
    },

    // ─── Subcontracted Civil Work (ALWAYS subbed out — 3D does NOT self-perform) ──
    // California upper-mid pricing 2024-2026. Marked up 20% for bid.
    subCivilRates: {
        // ── Saw Cutting (subcontracted, CA upper-mid) ──
        sawcut_concrete_per_lf:     8.00,    // $8/LF — concrete 4" depth
        sawcut_asphalt_per_lf:      4.50,    // $4.50/LF — asphalt 3" depth
        sawcut_minimum:             350,      // $350 minimum callout

        // ── Trenching (open-cut, subcontracted, CA upper-mid) ──
        trench_24in_per_lf:         18,      // $18/LF — 24" deep, urban CA
        trench_36in_per_lf:         24,      // $24/LF — 36" deep, urban CA
        trench_pw_24in_per_lf:      22,      // $22/LF — PW projects
        trench_pw_36in_per_lf:      28,      // $28/LF — PW projects

        // ── Surface Restoration (subcontracted, CA upper-mid) ──
        concrete_patch_per_sf:      16,      // $16/SF — sawcut, remove, pour, finish
        asphalt_patch_per_sf:       12,      // $12/SF — hot-patch replacement

        // ── Directional Boring (subcontracted, CA upper-mid) ──
        bore_2in_per_lf:            24,      // $24/LF — 2" conduit bore
        bore_4in_per_lf:            34,      // $34/LF — 4" conduit bore
        bore_mobilization:          3500,    // $3,500 flat mobilization

        // ── Transit/Amtrak Civil (verified from actual Amtrak bids) ──
        trench_transit_per_lf:      95,      // $95/LF (Emeryville)
        trench_transit_heavy_per_lf: 281,    // $281/LF (Martinez — heavy scope)

        // ── Concrete & Site Work (subcontracted, CA upper-mid) ──
        concrete_pad_per_cy:        575,     // $575/CY — formed, finished pad
        core_drill_4in_per_hole:    100,     // $100/hole — 4" in concrete
        handhole_install_each:      1600,    // $1,600/ea — 24x36 polymer, installed
        duct_bank_2way_per_lf:      80,      // $80/LF — concrete encased, 2 conduits
        bollard_install_each:       1000,    // $1,000/ea — 6" steel pipe, filled, painted
        ada_truncated_dome_each:    475,     // $475/ea — surface-applied mat installed
    },

    // ─── Equipment Rental Rates (CA upper-mid, per day, NOT including operator) ──
    equipmentRates: {
        scissor_lift_per_day:       285,     // $285/day — 26-32' indoor
        boom_40_60_per_day:         425,     // $425/day — 40-60' articulating
        boom_60_80_per_day:         700,     // $700/day — 60-80'
        generator_per_day:          325,     // $325/day — portable 20-50kW diesel
        hirail_vehicle_per_day:     1000,    // $1,000/day — hi-rail truck (railroad only)
        delivery_roundtrip:         250,     // $250 delivery/pickup
    },

    // ─── Conduit Rates (rigid/RMC installed, CA upper-mid per LF) ──
    rigidConduitRates: {
        rigid_075_per_lf:           14,      // $14/LF — 3/4" GRC installed
        rigid_100_per_lf:           17,      // $17/LF — 1" GRC installed
        rigid_125_per_lf:           20,      // $20/LF — 1-1/4" GRC installed
        rigid_200_per_lf:           26,      // $26/LF — 2" GRC installed
        cable_tray_covered_per_lf:  38,      // $38/LF — aluminum w/ cover, installed
    },

    // ─── Testing & Documentation Rates (CA upper-mid) ──
    testingRates: {
        otdr_per_strand:            35,      // $35/strand — Tier 2 OTDR certification
        otdr_mobilization:          650,     // $650 minimum mobilization
        copper_cert_per_cable:      22,      // $22/cable — Fluke DSX certification
        asbuilt_per_sheet:          135,     // $135/sheet — field markup to CAD
        om_manual_per_system:       3500,    // $3,500/system — compiled O&M docs
    },

    // ─── Transit/Railroad Compliance Costs (per-person, CA 2024-2026) ──
    transitComplianceCosts: {
        twic_card_per_person:       124,     // $124 — TSA fee (includes background check)
        erailsafe_per_person:       70,      // $70 — eRailSafe screening + badge
        rwp_training_per_person:    225,     // $225 — Roadway Worker Protection cert
        drug_test_per_person:       120,     // $120 — DOT 10-panel + breath alcohol
        safety_vest_per_person:     45,      // $45 — Class 3 railroad hi-vis vest
        hardhat_per_person:         35,      // $35 — Railroad color-coded hard hat
        // Total per-person compliance cost
        get total_per_person() {
            return this.twic_card_per_person + this.erailsafe_per_person +
                   this.rwp_training_per_person + this.drug_test_per_person +
                   this.safety_vest_per_person + this.hardhat_per_person;
        },
        // RWIC / Flagman
        rwic_hourly_rate:           125,     // $125/hr billed rate (CA upper-mid)
        rwic_minimum_hours:         4,       // 4-hour minimum per day
        rwic_daily_cost:            1000,    // $1,000/day (8-hr day, typical billing)
        // Daily safety briefing cost (paid crew time)
        daily_safety_briefing_hrs:  0.5,     // 30 min per crew per day
    },

    // ─── Transit-Specific Material Premiums (over standard commercial) ──
    transitMaterialPremiums: {
        vandal_housing_each:        500,     // $500/ea — IK10 vandal-resistant housing
        blast_film_per_window:      590,     // $590/window (Emeryville verified)
        nema4x_enclosure_each:      850,     // $850/ea — NEMA 4X outdoor enclosure
        seismic_bracing_per_rack:   1150,    // $1,150/ea — rack seismic kit installed
        emergency_phone_station:    18500,   // $18,500/ea — blue light tower, installed
        tamper_proof_hardware_pct:  0.03,    // 3% adder on material for security fasteners
        rigid_conduit_premium_pct:  0.15,    // 15% premium — transit mandates rigid over EMT
        uv_cable_premium_pct:       0.08,    // 8% premium for UV-rated outdoor cable
    },

    // ─── Overhead Percentages (verified from Emeryville/Martinez/CHP) ──
    overhead: {
        materialSupport: 0.02,  // 2% of material cost (10% for pole-mount)
        shipping:        0.01,  // 1% of material cost (3% for pole-mount)
        npt:             0.08,  // 8% of field labor hours (Non-Productive Time)
        pm:              0.08,  // 8% of field labor hours
        engr_admin:      0.04,  // 4% of field labor hours
        warranty:        0.02,  // 2% of section total
        precon:          0.03,  // 3% precon/general conditions
    },

    // ─── Production Rates (minutes per unit — verified from templates) ──
    productionRates: {
        // Cable pulling
        pull_cat6a:          16,    // Was 20-21 in some tabs, 16 in others
        pull_cat6_rooms:     10,    // In rooms (short runs)
        pull_cat6_common:    25,    // Common areas (long runs)
        pull_cat6_cmr:       14,    // Average CMR cable
        pull_rg6_rooms:      10,
        pull_rg6_common:     25,
        pull_fiber_sm:       20,    // Single mode fiber
        pull_24strand:       160,   // 24-strand fiber backbone
        pull_25pair:         160,   // 25-pair copper
        pull_maxcell:        65,    // MaxCell/InnerDuct

        // Termination
        terminate_cat6a:     6,
        terminate_cat6:      5,
        terminate_rg6:       5,
        terminate_fiber_sm:  15,
        terminate_25pair:    60,

        // Testing
        test_cat6a:          5,
        test_cat6:           5,
        test_rg6:            3,
        test_fiber_sm:       12,

        // Camera installation
        install_camera_indoor:   480,   // 8 hrs
        install_camera_outdoor:  480,   // 8 hrs
        install_camera_pole:     1680,  // 28 hrs
        install_camera_complex:  960,   // 16 hrs

        // Infrastructure
        install_ceiling_wire:    4,
        install_dring:           3,
        install_faceplate:       5,
        firestopping:            3,
        grounding_per_closet:    90,
        buildout_mdf_idf:        120,
        install_media_can:       20,
        install_sleeves:         5,
        install_nail_plates:     2,

        // Access control
        install_card_reader:     40,
        install_long_range_reader: 90,
        install_rex:             30,
        install_door_contact:    30,
        install_2door_ctrl:      240,
        install_4door_ctrl:      480,
        install_8door_ctrl:      480,
        install_power_supply:    120,
        install_crash_bar:       120,
        install_locking_hw:      120,
        drill_doors:             120,
        programming:             480,   // 8 hrs

        // Fire alarm
        install_facp:            480,
        install_strobe:          25,
        install_horn_strobe:     25,
        install_smoke_detector:  25,
        install_heat_detector:   25,
        install_pull_station:    25,
        install_monitor_module:  25,
        install_nac_circuit:     30,
        install_slc_circuit:     30,

        // Overhead tasks
        customer_training:       480,
        foreman_meetings:        30,
        box_walk:                480,
        cad:                     480,
        coordination_meetings:   120,

        // Generic
        install_device_generic:  30,
    },

    // ─── Unit Pricing Benchmarks (per-device sell prices from actual bids) ──
    unitBenchmarks: {
        card_reader:     2600,   // $2,600 per reader (all-in)
        camera_indoor:   2300,   // $2,300 per camera (Format A)
        indoor_wap:      2000,   // $2,000 per WAP
        outdoor_wap:     2300,   // $2,300 per WAP
        errcs_per_sqft:  1,      // $1/sqft
        das_per_sqft:    2,      // $2/sqft
        rfid_lxi:        750,
        rfid_lxd:        900,
        // Amtrak per-camera all-in (includes civil, trench, bollards, GC)
        amtrak_per_camera_emeryville: 21346,  // $1,302,128 / 61 cameras
        amtrak_per_camera_martinez:   29497,  // $2,035,277 / 69 cameras
        amtrak_per_camera_martinez_bafo: 28495, // $1,966,150 / 69 cameras
    },

    // ─── Amtrak/Transit Pricing Schedule rates ──
    transitPricing: {
        // Per-camera unit prices submitted to Amtrak (all-in with cabling + labor)
        camera_fixed_8m:      6150,   // Standard (Emeryville/Martinez)
        camera_fixed_8m_mic:  6795,   // With microphone (Emeryville)
        camera_360_4lens:     6965,   // 360 panoramic (Emeryville)
        camera_360_martinez:  6500,   // Martinez 360 rate
        camera_bafo_standard: 5978,   // BAFO reduced rate
        camera_bafo_360:      6080,   // BAFO reduced 360 rate

        // Civil/structural
        bollard_per_unit:     3250,   // M30 vehicular bollard (sell)
        bollard_material:     350,    // Material cost
        bollard_foundation:   650,    // Foundation cost
        bollard_labor_hrs:    8,      // Hours per bollard

        // Trenching (transit — see subCivilRates for commercial rates)
        trench_emeryville_per_lf: 95,    // $95/LF (Emeryville pricing schedule)
        trench_martinez_per_lf:   281,   // $281/LF (Martinez — heavier scope)
        trench_concrete_allin:    145,   // All-in concrete trench (mid)

        // Window/blast film
        window_film_per_ea:       590,   // $590/window (Emeryville — 165 windows)

        // Infrastructure
        cat6a_per_camera:         1200,  // $1,200 per camera cabling (Emeryville)
        cat6a_per_camera_martinez: 1300, // $1,300 per camera cabling (Martinez)
        remote_enclosure:         13216, // $13,216 per remote network enclosure
        camera_server:            41057, // $41,057 (Emeryville)

        // SAGE ERP factors (Emeryville/Martinez)
        sage_material_factor: 1.51424,  // Material cost × 1.51424 = sell
        sage_labor_factor:    1.39240,  // Labor cost × 1.39240 = sell

        // General conditions
        mobilization_pct:  0.04,   // Max 4% of total contract (Emeryville)
        insurance_pct:     0.01,   // ~1% of total
        bonds_pct:         0.02,   // 2% of total
        rrpli_pct:         0.03,   // RRPLI (Martinez: $61,479 on $2M = 3%)
    },

    // ─── Utility Functions ──────────────────────────────────────
    _round(val) {
        return Math.round((val || 0) * 100) / 100;
    },

    _getRateTable(state) {
        const pwVal = (state.prevailingWage || '').toString().toLowerCase();
        const isPW = (pwVal === 'yes' || pwVal === 'true' || pwVal === 'davis-bacon' || pwVal === 'state-prevailing' || pwVal === 'pla' || pwVal === 'dir' || state.prevailingWage === true);
        if (!isPW) return this.laborRates.npw;
        // PW rate selection: Sacramento-specific jurisdictions use pw_sacramento,
        // otherwise use pw_general (higher rates = safer default for PW bids)
        const loc = (state.projectLocation || '').toLowerCase();
        if (/sacramento|rancho\s*cordova|elk\s*grove|citrus\s*heights|folsom|roseville/i.test(loc)) {
            return this.laborRates.pw_sacramento;
        }
        if (/1515\s*s\s*st/i.test(state.projectName || '')) {
            return this.laborRates.pw_1515;
        }
        return this.laborRates.pw_general;
    },

    _getMaterialMarkup(systemType, isTransit, isPW) {
        // Transit/SAGE projects use the 1.51424 factor (51.4% markup)
        if (isTransit) return this.materialMarkup.sage_factor - 1; // 0.51424
        // PW jobs use higher 51.5% markup (verified from Modesto Library)
        if (isPW) return this.materialMarkup.pw;
        // NPW jobs use 42% markup (verified from SAC JC, 500 Capitol, Indians)
        return this.materialMarkup.npw;
    },

    _getCommissionRate(systemType) {
        const key = (systemType || '').toLowerCase().replace(/[\s\/]+/g, '_');
        return this.commissionRates[key] ?? this.commissionRates._default;
    },

    // ─── Classify BOM items into system types ──────
    _classifySystemType(categoryName, itemName) {
        const text = ((categoryName || '') + ' ' + (itemName || '')).toLowerCase();
        if (/backbone|fiber.*optic|maxcell|innerduct|os2|strand|riser/i.test(text)) return 'backbone';
        if (/rack|enclosure|nema|ups|pdu|kvm|server.*rack|wall.*mount.*cab|din.*rail/i.test(text)) return 'racks';
        if (/card.*access|access.*control|reader|rex|door.*contact|controller.*door|lenel|keyscan|maglock|strike/i.test(text)) return 'card_access';
        if (/cctv|camera|surveillance|nvr|vms|genetec|axis.*cam/i.test(text)) return 'cctv';
        if (/fire.*alarm|smoke|strobe|pull.*station|notification|facp|horn/i.test(text)) return 'fire_alarm';
        if (/intercom|paging/i.test(text)) return 'intercom';
        if (/intrusion|motion.*detect|glass.*break/i.test(text)) return 'intrusion';
        if (/infrastructure|power|battery|surge/i.test(text)) return 'infrastructure';
        if (/bollard|anti.?ram|vehicle.*barrier/i.test(text)) return 'civil';
        // Trenching, saw cutting, directional boring — ALWAYS subcontracted (3D does not self-perform)
        if (/trench|sawcut|saw.?cut|conduit.*underground|boring|directional.*bore|horizontal.*bore/i.test(text)) return 'subcontractor';
        if (/window.*film|blast.*film|security.*film/i.test(text)) return 'civil';
        if (/subcontract|civil|traffic|rwic|flagman/i.test(text)) return 'subcontractor';
        return 'teledata';
    },

    // ═══════════════════════════════════════════════════════════
    // CORE: Compute 3D-style bid breakdown from BOM + state
    // ═══════════════════════════════════════════════════════════
    computeBid(state, bom) {
        const pwVal = (state.prevailingWage || '').toString().toLowerCase();
        const isPW = (pwVal === 'yes' || pwVal === 'true' || pwVal === 'davis-bacon' || pwVal === 'state-prevailing' || pwVal === 'pla' || pwVal === 'dir' || state.prevailingWage === true);
        const isTransit = state.isTransitRailroad || false;
        const rates = this._getRateTable(state);

        // ── Step 1: Classify BOM into systems and compute material costs ──
        const systems = {};
        let totalMaterialCost = 0;
        let totalLaborHours = 0;
        let subcontractorCost = 0;

        for (const cat of (bom?.categories || [])) {
            const catName = (cat.name || '');

            // Separate subcontractors
            if (/subcontract|civil|traffic/i.test(catName)) {
                subcontractorCost += (cat.subtotal || 0);
                continue;
            }
            // Skip travel (handled separately)
            if (/travel|per\s*diem|lodging|hotel|mileage/i.test(catName)) continue;
            // Skip labor categories that leaked into BOM
            if (/^labor|^install|commission|mobiliz/i.test(catName)) continue;

            for (const item of (cat.items || [])) {
                const itemName = item.item || item.description || item.name || '';
                const qty = item.qty || 0;
                const unitCost = item.unitCost || 0;
                const extCost = item.extCost || this._round(qty * unitCost);

                // OFCI items ($0 material) still need labor hours for installation
                const isOFCI = extCost <= 0;

                const sysType = this._classifySystemType(catName, itemName);

                if (!systems[sysType]) {
                    systems[sysType] = { materialCost: 0, fieldHours: 0, items: [] };
                }

                // Only add material cost for non-OFCI items
                if (!isOFCI) {
                    systems[sysType].materialCost += extCost;
                    totalMaterialCost += extCost;
                }

                // ALWAYS calculate labor hours — OFCI items need installation labor
                const hours = this._estimateItemHours(itemName, qty);
                systems[sysType].fieldHours += hours;
                totalLaborHours += hours;

                systems[sysType].items.push({
                    name: itemName, qty, unitCost, extCost, laborHours: hours, isOFCI
                });
            }
        }

        // ── Step 2: Apply 3D formula to each system ──
        let grandCOS = 0;
        let grandSELL = 0;
        const systemBreakdowns = {};

        // Overhead hours (PM, Engineer, Warehouse, Admin)
        // PM: 8% of field hours, Engr: 4% of field hours (verified from Emeryville)
        const ohHours = {
            pm:        this._round(totalLaborHours * this.overhead.pm),
            engineer:  this._round(totalLaborHours * this.overhead.engr_admin),
            warehouse: this._round(Math.max(8, totalLaborHours * 0.02)),
            admin:     this._round(Math.max(8, totalLaborHours * 0.03)),
        };

        for (const [sysType, sys] of Object.entries(systems)) {
            const markup = this._getMaterialMarkup(sysType, isTransit, isPW);
            const commRate = this._getCommissionRate(sysType);

            // Material: cost + 1% misc + $50 slush
            const matCOS = this._round(sys.materialCost * (1 + this.materialMiscPct) + this.materialSlush);
            // Material sell: cost × (1 + markup)
            const matSELL = this._round(matCOS * (1 + markup));

            // Material support & shipping (overhead on materials)
            const matSupportCOS = this._round(matCOS * this.overhead.materialSupport);
            const shippingCOS = this._round(matCOS * this.overhead.shipping);
            const matSupportSELL = this._round(matSupportCOS * (1 + markup));
            const shippingSELL = this._round(shippingCOS * (1 + markup));

            // Tax on material at respective price levels (COS on cost, SELL on sell)
            const taxCOS = this._round(matCOS * this.taxRate);
            const taxSELL = this._round(matSELL * this.taxRate);

            const materialsPlusCOS = this._round(matCOS + taxCOS + matSupportCOS + shippingCOS);
            const materialsPlusSELL = this._round(matSELL + taxSELL + matSupportSELL + shippingSELL);

            // Field labor: hours + 5% misc adder
            const fieldHours = this._round(sys.fieldHours * (1 + this.laborMiscAdder));

            // NPT: 8% of field hours
            const nptHours = this._round(sys.fieldHours * this.overhead.npt);

            // Distribute overhead proportionally
            const sysPct = totalLaborHours > 0 ? sys.fieldHours / totalLaborHours : 0;
            const sysPMHours = this._round(ohHours.pm * sysPct);
            const sysEngHours = this._round(ohHours.engineer * sysPct);
            const sysWhHours = this._round(ohHours.warehouse * sysPct);
            const sysAdminHours = this._round(ohHours.admin * sysPct);

            // Labor cost/sell using rate table
            const fieldRate = rates["07_data_tech_ii"] || rates["05_cable_installer"] || Object.values(rates).find(r => r?.burdened > 0) || { burdened: 80, sell: 120 };
            const laborCOS = this._round(
                (fieldHours + nptHours) * fieldRate.burdened +
                sysPMHours * rates["01_project_manager"].burdened +
                sysEngHours * rates["20_engineer"].burdened +
                sysWhHours * rates["25_warehouse"].burdened +
                sysAdminHours * rates["30_admin"].burdened
            );
            const laborSELL = this._round(
                (fieldHours + nptHours) * fieldRate.sell +
                sysPMHours * rates["01_project_manager"].sell +
                sysEngHours * rates["20_engineer"].sell +
                sysWhHours * rates["25_warehouse"].sell +
                sysAdminHours * rates["30_admin"].sell
            );

            // Commission on combined COS and SELL
            const commCOS = this._round((laborCOS + materialsPlusCOS) * commRate);
            const commSELL = this._round((laborSELL + materialsPlusSELL) * commRate);

            // Warranty
            const warrantyCOS = this.warrantyFlat.cost;
            const warrantySELL = this.warrantyFlat.sell;

            // System totals
            const sysCOS = this._round(laborCOS + materialsPlusCOS + commCOS + warrantyCOS);
            const sysSELL = this._round(laborSELL + materialsPlusSELL + commSELL + warrantySELL);
            const sysGM = this._round(sysSELL - sysCOS);
            const sysGMPct = sysSELL > 0 ? this._round((sysGM / sysSELL) * 100) : 0;

            systemBreakdowns[sysType] = {
                materialCost: matCOS,
                materialSell: matSELL,
                materialMarkup: markup,
                taxCOS, taxSELL,
                materialsPlusCOS, materialsPlusSELL,
                fieldHours,
                nptHours,
                overheadHours: this._round(sysPMHours + sysEngHours + sysWhHours + sysAdminHours),
                totalHours: this._round(fieldHours + nptHours + sysPMHours + sysEngHours + sysWhHours + sysAdminHours),
                laborCOS, laborSELL,
                commissionRate: commRate,
                commCOS, commSELL,
                warrantyCOS, warrantySELL,
                totalCOS: sysCOS,
                totalSELL: sysSELL,
                grossMargin: sysGM,
                grossMarginPct: sysGMPct,
                itemCount: sys.items.length,
            };

            grandCOS += sysCOS;
            grandSELL += sysSELL;
        }

        // ── Step 3: Subcontractors (20% markup — verified Format A) ──
        // Merge with any item-level subcontractor costs already classified via _classifySystemType
        if (subcontractorCost > 0 || systemBreakdowns['subcontractor']) {
            const existingSub = systemBreakdowns['subcontractor'] || { materialCost: 0, totalCOS: 0, totalSELL: 0, fieldHours: 0, nptHours: 0, overheadHours: 0, totalHours: 0, laborCOS: 0, laborSELL: 0, commCOS: 0, commSELL: 0, warrantyCOS: 0, warrantySELL: 0, itemCount: 0 };
            // Remove Step 2 full-formula values for item-level subs before replacing with flat 20%
            // Step 2 applied markup+tax+commission+warranty; subs should only get 20% markup
            if (existingSub.totalCOS) { grandCOS -= existingSub.totalCOS; }
            if (existingSub.totalSELL) { grandSELL -= existingSub.totalSELL; }
            const totalSubCost = subcontractorCost + (existingSub.materialCost || 0);
            const subSELL = this._round(totalSubCost * 1.20);
            systemBreakdowns['subcontractor'] = {
                materialCost: totalSubCost,
                materialSell: subSELL,
                materialMarkup: 0.20,
                taxCOS: 0, taxSELL: 0,
                materialsPlusCOS: totalSubCost,
                materialsPlusSELL: subSELL,
                fieldHours: existingSub.fieldHours || 0, nptHours: existingSub.nptHours || 0, overheadHours: existingSub.overheadHours || 0, totalHours: existingSub.totalHours || 0,
                laborCOS: existingSub.laborCOS || 0, laborSELL: existingSub.laborSELL || 0,
                commissionRate: 0, commCOS: existingSub.commCOS || 0, commSELL: existingSub.commSELL || 0,
                warrantyCOS: existingSub.warrantyCOS || 0, warrantySELL: existingSub.warrantySELL || 0,
                totalCOS: totalSubCost + (existingSub.laborCOS || 0),
                totalSELL: subSELL + (existingSub.laborSELL || 0),
                grossMargin: this._round(subSELL - totalSubCost),
                grossMarginPct: subSELL > 0 ? this._round(((subSELL - totalSubCost) / subSELL) * 100) : 0,
                itemCount: existingSub.itemCount || 0,
            };
            // Add combined sub costs with flat 20% markup (Step 2 values were removed above)
            grandCOS += totalSubCost + (existingSub.laborCOS || 0);
            grandSELL += subSELL + (existingSub.laborSELL || 0);
        }

        // ── Step 4: Transit/Railroad adders (comprehensive) — before bonds so bonds include transit ──
        let transitCosts = null;
        if (isTransit) {
            const tc = this.transitComplianceCosts;
            const tp = this.transitPricing;

            // Estimate crew size from labor hours (assume 8-hr days)
            const estCrewSize = Math.max(4, Math.ceil(totalLaborHours / 400));
            const estProjectDays = Math.max(10, Math.ceil(totalLaborHours / (estCrewSize * 8)));

            // 1. RRPLI Insurance (3% of contract)
            const rrpli = this._round(grandSELL * tp.rrpli_pct);

            // 2. General liability / additional insured (1% of contract)
            const insurance = this._round(grandSELL * tp.insurance_pct);

            // 3. Mobilization / demobilization (4% of contract)
            const mobilization = this._round(grandSELL * tp.mobilization_pct);

            // 4. Crew compliance (per-person certifications × crew size)
            const crewCompliance = this._round(tc.total_per_person * estCrewSize);

            // 5. RWIC / Flagman costs (1 RWIC per day, full project duration)
            const rwicCost = this._round(tc.rwic_daily_cost * estProjectDays);

            // 6. Daily safety briefings (paid crew time)
            const safetyBriefingHrs = this._round(tc.daily_safety_briefing_hrs * estCrewSize * estProjectDays);
            const avgHourlyRate = isPW ? 145 : 80;
            const safetyBriefingCost = this._round(safetyBriefingHrs * avgHourlyRate);

            // 7. Restricted work window premium (night/weekend differential — 15% labor adder)
            const workWindowPremium = this._round(totalLaborHours * avgHourlyRate * 0.15);

            // 8. Standby / escort wait time (10% of field labor)
            const standbyCost = this._round(totalLaborHours * 0.10 * avgHourlyRate);

            // 9. Material premiums (tamper-proof hardware, rigid conduit, UV cable)
            const matPrem = this.transitMaterialPremiums || {};
            const matPremiums = this._round(
                (totalMaterialCost || 0) * (matPrem.tamper_proof_hardware_pct || 0) +
                (totalMaterialCost || 0) * (matPrem.rigid_conduit_premium_pct || 0) +
                (totalMaterialCost || 0) * (matPrem.uv_cable_premium_pct || 0)
            );

            // 10. Seismic bracing (estimate 1 rack per 30 cameras/devices minimum 1)
            const estRacks = Math.max(1, Math.ceil((totalMaterialCost || 0) / 50000));
            const seismicBracing = this._round((matPrem.seismic_bracing_per_rack || 0) * estRacks);

            // 11. Hi-rail vehicle (trackside work days — estimate 40% of project days)
            const hirailDays = Math.ceil(estProjectDays * 0.40);
            const hirailCost = this._round(this.equipmentRates.hirail_vehicle_per_day * hirailDays);

            // 12. Multiple mobilizations (transit = many short work windows)
            const estMobilizations = Math.max(3, Math.ceil(estProjectDays / 5));
            const multiMobCost = this._round(estMobilizations * 1500);

            // 13. Testing premium (OTDR + copper cert minimum)
            const testingMin = this._round(this.testingRates.otdr_mobilization + 2000);

            // 14. Documentation (as-builts + O&M)
            const docsCost = this._round(this.testingRates.om_manual_per_system * 2 + this.testingRates.asbuilt_per_sheet * 15);

            // 15. Travel costs (per diem + mileage — transit sites are typically remote/distant)
            // AUDIT FIX H2: Correct property path — sageRates doesn't exist, use laborRates
            const perDiemDaily = this.laborRates?.sage_transit?.per_diem?.cost || 38;
            const mileagePerMile = this.laborRates?.sage_transit?.mileage?.cost || 0.65;
            const perDiemCost = this._round(estCrewSize * estProjectDays * perDiemDaily);
            // Mileage: estimate 100mi round-trip per crew member, first/last week only (2 trips)
            const mileageTrips = Math.max(2, Math.ceil(estProjectDays / 5));
            const mileageCost = this._round(estCrewSize * 100 * mileageTrips * mileagePerMile);

            // 16. AI-found plan-specific items (bollards, blast film, emergency phones, etc.)
            // These come from the SPECIAL_CONDITIONS brain's transit_railroad_checklist
            let aiPlanSpecificCost = 0;
            const aiPlanItems = [];
            try {
                const scBrain = state.brainResults?.wave1?.SPECIAL_CONDITIONS;
                const checklist = scBrain?.transit_railroad_checklist;
                if (checklist && checklist.applicable) {
                    // Scan all checklist subsections for items with checked=true and total > 0
                    const sections = ['crew_compliance', 'equipment', 'material_premiums', 'civil_work', 'conduit_raceway', 'testing_documentation', 'permits'];
                    sections.forEach(sectionKey => {
                        const section = checklist[sectionKey];
                        if (!section || typeof section !== 'object') return;
                        Object.entries(section).forEach(([key, item]) => {
                            if (item && typeof item === 'object' && item.checked && item.total > 0) {
                                aiPlanItems.push({ key, ...item });
                                aiPlanSpecificCost += item.total;
                            }
                        });
                    });
                    // Also check rwic_flagman directly
                    if (checklist.rwic_flagman?.checked && checklist.rwic_flagman.total > 0) {
                        aiPlanItems.push({ key: 'rwic_flagman_ai', ...checklist.rwic_flagman });
                        // Don't double-count RWIC — AI total replaces engine estimate if higher
                        if (checklist.rwic_flagman.total > rwicCost) {
                            aiPlanSpecificCost += (checklist.rwic_flagman.total - rwicCost);
                        }
                    }
                }
            } catch (e) { /* AI data not available yet — engine defaults are used */ }
            aiPlanSpecificCost = this._round(aiPlanSpecificCost);

            const transitTotal = this._round(
                rrpli + insurance + mobilization + crewCompliance + rwicCost +
                safetyBriefingCost + workWindowPremium + standbyCost + matPremiums +
                seismicBracing + hirailCost + multiMobCost + testingMin + docsCost +
                perDiemCost + mileageCost + aiPlanSpecificCost
            );

            transitCosts = {
                rrpli,
                insurance,
                mobilization,
                crewCompliance,
                crewSize: estCrewSize,
                projectDays: estProjectDays,
                rwicCost,
                safetyBriefingCost,
                workWindowPremium,
                standbyCost,
                matPremiums,
                seismicBracing,
                hirailCost,
                hirailDays,
                multiMobCost,
                mobilizations: estMobilizations,
                testingMin,
                perDiemCost,
                mileageCost,
                aiPlanSpecificCost,
                aiPlanItems,
                docsCost,
                total: transitTotal,
            };
            grandSELL += transitTotal;
            grandCOS += this._round(transitTotal * 0.58); // ~42% margin on transit adders (Sacramento "3× cost" rule → target 45% GM)
        }

        // ── Step 5: Bonds (2% of total sell — after transit so bonds include transit costs) ──
        const bonds = this._round(grandSELL * this.bondsPct);
        grandSELL += bonds;
        grandCOS += this._round(bonds * 0.70);

        // ── Final ──
        const grandMargin = this._round(grandSELL - grandCOS);
        const grandMarginPct = grandSELL > 0 ? this._round((grandMargin / grandSELL) * 100) : 0;

        const result = {
            _engine: "FormulaEngine3D v2.0",
            _isPW: isPW,
            _isTransit: isTransit,
            _rateTable: rates === this.laborRates.pw_sacramento ? "pw_sacramento" : rates === this.laborRates.pw_1515 ? "pw_1515" : rates === this.laborRates.pw_general ? "pw_general" : "npw",
            systems: systemBreakdowns,
            systemCount: Object.keys(systemBreakdowns).length,
            totalMaterialCost: this._round(totalMaterialCost),
            totalFieldHours: this._round(totalLaborHours * (1 + this.laborMiscAdder)),
            subcontractorCost: this._round(subcontractorCost),
            bonds,
            transitCosts,
            grandTotalCOS: this._round(grandCOS),
            grandTotalSELL: this._round(grandSELL),
            grossMargin: grandMargin,
            grossMarginPct: grandMarginPct,
        };

        // ── Transit Benchmark Calibration ──
        // For transit/railroad projects, anchor the bid to actual winning prices.
        // The AI Material Pricer often prices cameras at near-sell levels, then
        // FormulaEngine3D adds markup on top — producing bids 50-100% too high.
        // Calibration scales the total to match real benchmark data.
        if (isTransit && typeof PRICING_DB !== 'undefined' && PRICING_DB.amtrakBenchmarks?.actualBids) {
            const bids = PRICING_DB.amtrakBenchmarks.actualBids;
            const consensus = state.brainResults?.wave1_75?.CONSENSUS_ARBITRATOR?.consensus_counts;
            const finalRecon = state.brainResults?.wave3_75?.FINAL_RECONCILIATION?.final_counts;

            // Count cameras from consensus/recon — OR from BOM if brain results unavailable
            const camRegex = /camera|dome|bullet|ptz|fisheye|panoram|turret|lpr/i;
            const camExclude = /mount|bracket|license|sd\s*card|cable|adapter|housing|power|surge|software|warranty|accessori/i;
            let cameraCount = 0;
            const countSource = finalRecon || consensus;
            if (countSource) {
                for (const [key, val] of Object.entries(countSource)) {
                    if (camRegex.test(key) && !camExclude.test(key)) {
                        cameraCount += (typeof val === 'number' ? val : typeof val === 'string' ? (parseInt(val, 10) || 0) : val?.count || val?.qty || 0);
                    }
                }
            }

            // Fallback: count cameras directly from BOM items if no brain results
            if (cameraCount < 5 && bom?.categories) {
                for (const cat of bom.categories) {
                    if (/cctv|camera|surveillance|video/i.test(cat.name || '')) {
                        for (const item of (cat.items || [])) {
                            const iName = (item.item || item.name || '').toLowerCase();
                            if (camRegex.test(iName) && !camExclude.test(iName)) {
                                cameraCount += Number(item.qty || 0) || 0;
                            }
                        }
                    }
                }
                if (cameraCount >= 5) {
                    console.log(`[3D Engine v2]   Camera count from BOM fallback: ${cameraCount}`);
                }
            }

            if (cameraCount >= 5) {
                // Find closest benchmark by camera count
                const bidArray = Object.entries(bids)
                    .map(([k, v]) => ({ key: k, ...v }))
                    .filter(b => b.cameras > 0 && b.total > 0);
                let closest = null, closestDiff = Infinity;
                for (const b of bidArray) {
                    const diff = Math.abs(b.cameras - cameraCount);
                    if (diff < closestDiff) { closestDiff = diff; closest = b; }
                }
                if (!closest) {
                    console.warn('[3D Engine v2] No valid benchmarks found — skipping calibration');
                }
                // Prefer BAFO over original
                const sameCamBids = closest ? bidArray.filter(b => b.cameras === closest.cameras) : [];
                const benchmark = sameCamBids.find(b => b.type === 'bafo') || sameCamBids.find(b => b.type === 'original') || closest;

                if (!benchmark || !benchmark.cameras || benchmark.cameras <= 0) {
                    console.warn('[3D Engine v2] Benchmark has 0 cameras — skipping calibration');
                } else {
                const perCameraSell = benchmark.total / benchmark.cameras;
                const targetTotal = this._round(cameraCount * perCameraSell);
                const formulaTotal = result.grandTotalSELL;

                // Check if subs dominate (infrastructure-heavy → skip calibration)
                const subPctOfTotal = formulaTotal > 0 ? (subcontractorCost / formulaTotal) : 0;

                console.log(`[3D Engine v2] ═══ TRANSIT CALIBRATION CHECK ═══`);
                console.log(`[3D Engine v2]   Cameras: ${cameraCount} | Benchmark: ${benchmark.key} (${benchmark.cameras} cams, $${benchmark.total.toLocaleString()})`);
                console.log(`[3D Engine v2]   Per-camera sell: $${Math.round(perCameraSell).toLocaleString()}`);
                console.log(`[3D Engine v2]   Target: $${targetTotal.toLocaleString()} | Formula: $${formulaTotal.toLocaleString()}`);
                console.log(`[3D Engine v2]   Subs: ${(subPctOfTotal * 100).toFixed(0)}% of total`);

                if (subPctOfTotal <= 0.40 && targetTotal > 0 && formulaTotal > 0) {
                    const deviation = formulaTotal / targetTotal;
                    if (deviation > 1.06 || deviation < 0.94) {
                        const direction = deviation > 1 ? 'OVER' : 'UNDER';
                        const targetMult = benchmark.type === 'bafo' ? 1.00 : 1.02;
                        const calibratedTarget = this._round(targetTotal * targetMult);
                        const scaleFactor = calibratedTarget / formulaTotal;

                        console.warn(`[3D Engine v2] ⚠️ CALIBRATING ${direction}: formula ${Math.round(Math.abs(deviation - 1) * 100)}% ${direction.toLowerCase()}`);
                        console.warn(`[3D Engine v2]   Scaling from $${formulaTotal.toLocaleString()} → $${calibratedTarget.toLocaleString()} (factor: ${scaleFactor.toFixed(3)})`);

                        // Preserve original margin percentage (don't scale COS by SELL factor)
                        const origMarginPct = result.grandTotalSELL > 0 ? (result.grossMargin / result.grandTotalSELL) : 0.25;
                        result.grandTotalSELL = calibratedTarget;
                        result.grandTotalCOS = this._round(calibratedTarget * (1 - origMarginPct));
                        result.grossMargin = this._round(result.grandTotalSELL - result.grandTotalCOS);
                        result.grossMarginPct = result.grandTotalSELL > 0 ? this._round((result.grossMargin / result.grandTotalSELL) * 100) : 0;
                        result._calibrated = true;
                        result._calibrationTarget = calibratedTarget;
                        result._calibrationBenchmark = benchmark.key;
                        result._calibrationScaleFactor = scaleFactor;
                    } else {
                        console.log(`[3D Engine v2]   ✅ Within ±6% of benchmark — no calibration needed`);
                    }
                } else {
                    console.log(`[3D Engine v2]   ⚠️ Subs ${(subPctOfTotal * 100).toFixed(0)}% > 40% — SKIPPING calibration (infrastructure-heavy)`);
                }
                } // close cameras > 0 guard
            }
        }

        console.log(`[3D Engine v2] ═══ BID COMPLETE ═══`);
        console.log(`[3D Engine v2]   Systems: ${result.systemCount} | PW: ${isPW} | Transit: ${isTransit}`);
        console.log(`[3D Engine v2]   Material Cost: $${result.totalMaterialCost.toLocaleString()}`);
        console.log(`[3D Engine v2]   Field Hours: ${result.totalFieldHours.toFixed(1)}`);
        console.log(`[3D Engine v2]   Subs: $${result.subcontractorCost.toLocaleString()}`);
        console.log(`[3D Engine v2]   Grand Total SELL: $${result.grandTotalSELL.toLocaleString()}${result._calibrated ? ' (CALIBRATED)' : ''}`);
        console.log(`[3D Engine v2]   GM: ${result.grossMarginPct}%`);

        return result;
    },

    // ─── Estimate labor hours for a BOM line item ───────────────
    _estimateItemHours(itemName, qty) {
        if (qty <= 0) return 0;
        const name = (itemName || '').toLowerCase();
        const pr = this.productionRates;

        // ── Cable runs — pull + terminate + test ──
        if (/cat\s*6a|cat6a/i.test(name) && !/jack|panel|patch|cord|faceplate/i.test(name)) {
            return this._round(qty * (pr.pull_cat6a + pr.terminate_cat6a * 2 + pr.test_cat6a) / 60);
        }
        if (/cat\s*[56]|network.*cable|data.*cable|cmr|cmp/i.test(name) && !/jack|panel|patch|cord|faceplate/i.test(name)) {
            return this._round(qty * (pr.pull_cat6_cmr + pr.terminate_cat6 * 2 + pr.test_cat6) / 60);
        }
        if (/fiber|os2|sm.*cable|strand/i.test(name) && !/panel|tray|housing|cassette|patch/i.test(name)) {
            return this._round(qty * (pr.pull_fiber_sm + pr.terminate_fiber_sm * 2 + pr.test_fiber_sm) / 60);
        }
        if (/rg.?6|coax/i.test(name)) {
            return this._round(qty * (pr.pull_rg6_rooms + pr.terminate_rg6 * 2 + pr.test_rg6) / 60);
        }
        // Fire alarm cable (18/2 FPLR shielded) — similar pull time to cat6
        if (/18.?\/?.?2|fplr|fire.*cable|alarm.*cable/i.test(name) && !/device|detector|strobe|panel/i.test(name)) {
            return this._round(qty * (pr.pull_cat6_cmr + 4 + 3) / 60); // pull + terminate + test
        }
        // Access control composite cable (22/6 + 18/4)
        if (/22.?\/?.?[46]|composite.*cable|access.*cable/i.test(name) && !/reader|rex|contact/i.test(name)) {
            return this._round(qty * (pr.pull_cat6_cmr + 6 + 3) / 60);
        }
        // Speaker/paging wire (18/2 plenum)
        if (/speaker.*cable|paging.*cable|18.?\/?.?2.*plenum/i.test(name) && !/speaker(?!.*cable)/i.test(name)) {
            return this._round(qty * (pr.pull_cat6_rooms + 4 + 3) / 60);
        }
        // 25-pair copper backbone
        if (/25.?pair|multi.?pair/i.test(name)) {
            return this._round(qty * (pr.pull_25pair + pr.terminate_25pair * 2) / 60);
        }
        // 24-strand fiber backbone
        if (/24.?strand|48.?strand|fiber.*backbone/i.test(name)) {
            return this._round(qty * (pr.pull_24strand + pr.terminate_fiber_sm * 24) / 60);
        }

        // ── Cameras ──
        if (/pole.*cam|cam.*pole/i.test(name)) return this._round(qty * pr.install_camera_pole / 60);
        if (/outdoor.*cam|cam.*outdoor|exterior.*cam|bullet.*cam/i.test(name)) return this._round(qty * pr.install_camera_outdoor / 60);
        if (/multi.?sensor|panoram|360|fisheye/i.test(name)) return this._round(qty * pr.install_camera_complex / 60);
        if (/ptz/i.test(name) && !/license|software/i.test(name)) return this._round(qty * pr.install_camera_complex / 60);
        if (/camera|dome|turret/i.test(name) && !/mount|bracket|license|sd|memory|software|pole|vms/i.test(name)) {
            return this._round(qty * pr.install_camera_indoor / 60);
        }
        // Camera mounts/brackets — 15 min each
        if (/camera.*mount|mount.*arm|wall.*mount.*cam|pendant/i.test(name)) return this._round(qty * 0.25);

        // ── Access control ──
        if (/8.?door.*controller|controller.*8/i.test(name)) return this._round(qty * pr.install_8door_ctrl / 60);
        if (/4.?door.*controller|controller.*4/i.test(name)) return this._round(qty * pr.install_4door_ctrl / 60);
        if (/2.?door.*controller|controller.*2/i.test(name)) return this._round(qty * pr.install_2door_ctrl / 60);
        if (/single.*door.*controller|controller.*1/i.test(name)) return this._round(qty * 2); // 2 hrs
        if (/card.*reader|reader|hid|proximity|iclass/i.test(name) && !/long.*range/i.test(name)) return this._round(qty * pr.install_card_reader / 60);
        if (/long.*range.*reader/i.test(name)) return this._round(qty * pr.install_long_range_reader / 60);
        if (/rex|request.*exit/i.test(name)) return this._round(qty * pr.install_rex / 60);
        if (/door.*contact|contact.*door/i.test(name)) return this._round(qty * pr.install_door_contact / 60);
        if (/electric.*strike|strike/i.test(name) && !/bowling|baseball/i.test(name)) return this._round(qty * 1.5); // 1.5 hrs
        if (/mag.?lock|magnetic.*lock|em.*lock/i.test(name)) return this._round(qty * 2); // 2 hrs
        if (/crash.*bar|pushbar|panic/i.test(name)) return this._round(qty * pr.install_crash_bar / 60);
        if (/locking.*hardware|lock.*hw|electric.*latch/i.test(name)) return this._round(qty * pr.install_locking_hw / 60);
        if (/power.*supply|altronix|lifesafety/i.test(name) && !/ups/i.test(name)) return this._round(qty * pr.install_power_supply / 60);
        if (/auto.*operator|door.*operator/i.test(name)) return this._round(qty * 8); // 8 hrs

        // ── Fire alarm ──
        if (/facp|fire.*alarm.*panel|control.*panel.*fire/i.test(name)) return this._round(qty * pr.install_facp / 60);
        if (/horn.*strobe|strobe.*horn|speaker.*strobe/i.test(name)) return this._round(qty * pr.install_horn_strobe / 60);
        if (/strobe|visual.*notification/i.test(name)) return this._round(qty * pr.install_strobe / 60);
        if (/smoke.*detect|photo.*detect/i.test(name)) return this._round(qty * pr.install_smoke_detector / 60);
        if (/heat.*detect|thermal.*detect/i.test(name)) return this._round(qty * pr.install_heat_detector / 60);
        if (/duct.*detect/i.test(name)) return this._round(qty * 1.5); // 1.5 hrs — harder install
        if (/pull.*station/i.test(name)) return this._round(qty * pr.install_pull_station / 60);
        if (/monitor.*module|relay.*module|control.*module/i.test(name)) return this._round(qty * pr.install_monitor_module / 60);
        if (/nac.*panel|nac.*power|booster/i.test(name)) return this._round(qty * 4); // 4 hrs
        if (/annunciator|remote.*display/i.test(name)) return this._round(qty * 2); // 2 hrs

        // ── Audio/Visual ──
        if (/speaker|paging/i.test(name) && !/cable/i.test(name)) return this._round(qty * 0.75); // 45 min per speaker
        if (/amplifier|amp\b/i.test(name)) return this._round(qty * 2); // 2 hrs
        if (/display|monitor|tv|screen/i.test(name) && !/nvr|workstation|camera/i.test(name)) return this._round(qty * 1.5); // 1.5 hrs
        if (/projector/i.test(name)) return this._round(qty * 3); // 3 hrs
        if (/microphone|mic\b/i.test(name)) return this._round(qty * 0.5); // 30 min

        // ── Structured cabling termination devices ──
        if (/keystone|jack\b/i.test(name) && !/wall.*plate|faceplate/i.test(name)) return this._round(qty * pr.terminate_cat6a / 60);
        if (/patch.*panel/i.test(name)) return this._round(qty * 2); // 2 hrs per panel (mount + terminate)
        if (/patch.*cord|patch.*cable/i.test(name)) return this._round(qty * 0.05); // 3 min each — unbox and plug
        if (/fiber.*panel|fiber.*enclosure|fiber.*housing/i.test(name)) return this._round(qty * 3); // 3 hrs
        if (/fiber.*cassette|mpo|mtp/i.test(name)) return this._round(qty * 0.5); // 30 min

        // ── Wireless ──
        if (/wap|wireless.*ap|access.*point|wi.?fi/i.test(name) && !/controller/i.test(name)) return this._round(qty * 1); // 1 hr per WAP
        if (/wireless.*controller|wlc/i.test(name)) return this._round(qty * 4); // 4 hrs

        // ── Intercom / Paging ──
        if (/intercom|video.*intercom|door.*station/i.test(name)) return this._round(qty * 1.5); // 1.5 hrs
        if (/master.*station|desk.*station/i.test(name)) return this._round(qty * 1); // 1 hr
        if (/clock/i.test(name)) return this._round(qty * 0.5); // 30 min

        // ── Intrusion ──
        if (/motion.*detect|pir|motion.*sensor/i.test(name)) return this._round(qty * 0.5); // 30 min
        if (/glass.*break/i.test(name)) return this._round(qty * 0.5); // 30 min
        if (/keypad|arm.*station/i.test(name) && !/access/i.test(name)) return this._round(qty * 1); // 1 hr
        if (/intrusion.*panel|alarm.*panel/i.test(name) && !/fire/i.test(name)) return this._round(qty * 4); // 4 hrs
        if (/siren/i.test(name)) return this._round(qty * 0.5); // 30 min

        // ── Infrastructure ──
        if (/mdf|idf|telecom.*room|server.*room|tr\b/i.test(name)) return this._round(qty * pr.buildout_mdf_idf / 60);
        if (/j.?hook|ceiling.*wire|bridle.*ring/i.test(name)) return this._round(qty * pr.install_ceiling_wire / 60);
        if (/d.?ring|micro.?duct/i.test(name)) return this._round(qty * pr.install_dring / 60);
        if (/cable.*tray/i.test(name)) return this._round(qty * 0.15); // 9 min per LF
        if (/faceplate|wall.*plate/i.test(name)) return this._round(qty * pr.install_faceplate / 60);
        if (/firestop/i.test(name)) return this._round(qty * pr.firestopping / 60);
        if (/ground|tmgb|tgb|bond/i.test(name)) return this._round(qty * pr.grounding_per_closet / 60);
        if (/conduit|emt|rigid|pvc.*sch/i.test(name) && !/underground|trench|bore/i.test(name)) return this._round(qty * 0.25); // 15 min per 10ft stick
        if (/sleeve|core.*drill/i.test(name)) return this._round(qty * pr.install_sleeves / 60);
        if (/label/i.test(name)) return this._round(qty * 0.02); // 1 min per label

        // ── Major equipment (rack-mount or standalone) ──
        if (/rack\b|enclosure|cabinet/i.test(name)) return this._round(qty * 4); // 4 hrs — assemble and mount
        if (/ups\b|uninterruptible/i.test(name)) return this._round(qty * 3); // 3 hrs — heavy, wiring
        if (/pdu/i.test(name)) return this._round(qty * 1.5); // 1.5 hrs
        if (/nvr|network.*video|vms.*server/i.test(name)) return this._round(qty * 6); // 6 hrs — mount, cable, configure
        if (/server|workstation|viewing.*station/i.test(name)) return this._round(qty * 4); // 4 hrs
        if (/switch|poe.*switch|network.*switch/i.test(name) && !/transfer/i.test(name)) return this._round(qty * 2); // 2 hrs — mount + patch
        if (/head.?end|main.*distribution/i.test(name)) return this._round(qty * 8); // 8 hrs

        // ── Software / Licenses (no labor) ──
        if (/license|software|vms.*license|subscription|warranty|maintenance/i.test(name)) return 0;

        // ── Miscellaneous hardware (minimal labor) ──
        if (/mount|bracket|adapter|connector|coupler|splice/i.test(name)) return this._round(qty * 0.25);
        if (/battery|backup.*battery/i.test(name)) return this._round(qty * 0.5);
        if (/surge|spd|protector/i.test(name)) return this._round(qty * 0.5);

        // ── Catch-all for any remaining devices ──
        if (/sensor|module|device/i.test(name)) {
            return this._round(qty * pr.install_device_generic / 60);
        }

        // ── Programming / commissioning (per system) ──
        if (/program|commission|startup|test.*commission/i.test(name)) return this._round(qty * pr.programming / 60);
        if (/training/i.test(name)) return this._round(qty * pr.customer_training / 60);
        if (/as.?built|drawing/i.test(name)) return this._round(qty * pr.cad / 60);

        // Unknown item — 30 min default (better than 0)
        return this._round(qty * 0.5);
    },

};

if (typeof window !== 'undefined') window.FormulaEngine3D = FormulaEngine3D;
