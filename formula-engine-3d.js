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

    // ─── Format B rates (760 Sheriff, POA-Sac, Superior Equipment) ──
    formatB: {
        materialMargin: 0.30,       // 30% margin = cost / 0.70
        laborMargin: 0.50,          // 50% margin = cost / 0.50
        subMargin: 0.15,            // 15% margin
        specialMaterialMargin: 0.40, // 40% margin for specialty items
        otherMargin: 0.20,          // 20% margin
        rates: {
            pm:         { burdened: 60,  sell: 120 },
            foreman:    { burdened: 55,  sell: 110 },
            appEng:     { burdened: 40,  sell: 80 },
            startupEng: { burdened: 60,  sell: 120 },
            drafter:    { burdened: 60,  sell: 120 },
            fieldTech:  { burdened: 45,  sell: 90 },
            shopTech:   { burdened: 45,  sell: 90 },
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

    // ─── SAGE Budget Factors (verified from Sam Brennan, 500 Capitol, Indians) ──
    sageBudget: {
        active:  { materialOH: 0.40, laborOH: 0.30 },  // Active systems (Teledata, CCTV, etc.)
        default: { materialOH: 0.15, laborOH: 0.15 },   // Inactive/template systems
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
        const isPW = (state.prevailingWage === 'yes' || state.prevailingWage === true);
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
        const isPW = (state.prevailingWage === 'yes' || state.prevailingWage === true);
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
                if (extCost <= 0) continue;

                const sysType = this._classifySystemType(catName, itemName);

                if (!systems[sysType]) {
                    systems[sysType] = { materialCost: 0, fieldHours: 0, items: [] };
                }
                systems[sysType].materialCost += extCost;
                totalMaterialCost += extCost;

                const hours = this._estimateItemHours(itemName, qty);
                systems[sysType].fieldHours += hours;
                totalLaborHours += hours;

                systems[sysType].items.push({
                    name: itemName, qty, unitCost, extCost, laborHours: hours
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

            // Tax on material cost and sell
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
            const fieldRate = rates["07_data_tech_ii"] || rates["05_cable_installer"];
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
        if (subcontractorCost > 0) {
            const subSELL = this._round(subcontractorCost * 1.20);
            systemBreakdowns['subcontractor'] = {
                materialCost: subcontractorCost,
                materialSell: subSELL,
                materialMarkup: 0.20,
                taxCOS: 0, taxSELL: 0,
                materialsPlusCOS: subcontractorCost,
                materialsPlusSELL: subSELL,
                fieldHours: 0, nptHours: 0, overheadHours: 0, totalHours: 0,
                laborCOS: 0, laborSELL: 0,
                commissionRate: 0, commCOS: 0, commSELL: 0,
                warrantyCOS: 0, warrantySELL: 0,
                totalCOS: subcontractorCost,
                totalSELL: subSELL,
                grossMargin: this._round(subSELL - subcontractorCost),
                grossMarginPct: subSELL > 0 ? this._round(((subSELL - subcontractorCost) / subSELL) * 100) : 0,
                itemCount: 0,
            };
            grandCOS += subcontractorCost;
            grandSELL += subSELL;
        }

        // ── Step 4: Bonds (2% of total sell) ──
        const bonds = this._round(grandSELL * this.bondsPct);
        grandSELL += bonds;
        grandCOS += this._round(bonds * 0.70);

        // ── Step 5: Transit/Railroad adders (comprehensive) ──
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
            const matPremiums = this._round(
                totalMaterialCost * this.transitMaterialPremiums.tamper_proof_hardware_pct +
                totalMaterialCost * this.transitMaterialPremiums.rigid_conduit_premium_pct +
                totalMaterialCost * this.transitMaterialPremiums.uv_cable_premium_pct
            );

            // 10. Seismic bracing (estimate 1 rack per 30 cameras/devices minimum 1)
            const estRacks = Math.max(1, Math.ceil(totalMaterialCost / 50000));
            const seismicBracing = this._round(this.transitMaterialPremiums.seismic_bracing_per_rack * estRacks);

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

            // 15. AI-found plan-specific items (bollards, blast film, emergency phones, etc.)
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
                aiPlanSpecificCost
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
                aiPlanSpecificCost,
                aiPlanItems,
                docsCost,
                total: transitTotal,
            };
            grandSELL += transitTotal;
            grandCOS += this._round(transitTotal * 0.82); // ~18% margin on transit adders
        }

        // ── Final ──
        const grandMargin = this._round(grandSELL - grandCOS);
        const grandMarginPct = grandSELL > 0 ? this._round((grandMargin / grandSELL) * 100) : 0;

        const result = {
            _engine: "FormulaEngine3D v2.0",
            _isPW: isPW,
            _isTransit: isTransit,
            _rateTable: isPW ? "pw_sacramento" : "npw",
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

            // Count cameras from consensus/recon
            const camRegex = /camera|dome|bullet|ptz|fisheye|panoram|turret|lpr/i;
            const camExclude = /mount|bracket|license|sd\s*card|cable|adapter|housing|power|surge|software|warranty|accessori/i;
            let cameraCount = 0;
            const countSource = finalRecon || consensus;
            if (countSource) {
                for (const [key, val] of Object.entries(countSource)) {
                    if (camRegex.test(key) && !camExclude.test(key)) {
                        cameraCount += (typeof val === 'number' ? val : val?.count || val?.qty || 0);
                    }
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
                // Prefer BAFO over original
                const sameCamBids = bidArray.filter(b => b.cameras === closest.cameras);
                const benchmark = sameCamBids.find(b => b.type === 'bafo') || sameCamBids.find(b => b.type === 'original') || closest;

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

                if (subPctOfTotal <= 0.40) {
                    const deviation = formulaTotal / targetTotal;
                    if (deviation > 1.06 || deviation < 0.94) {
                        const direction = deviation > 1 ? 'OVER' : 'UNDER';
                        const targetMult = benchmark.type === 'bafo' ? 1.00 : 1.02;
                        const calibratedTarget = this._round(targetTotal * targetMult);
                        const scaleFactor = calibratedTarget / formulaTotal;

                        console.warn(`[3D Engine v2] ⚠️ CALIBRATING ${direction}: formula ${Math.round(Math.abs(deviation - 1) * 100)}% ${direction.toLowerCase()}`);
                        console.warn(`[3D Engine v2]   Scaling from $${formulaTotal.toLocaleString()} → $${calibratedTarget.toLocaleString()} (factor: ${scaleFactor.toFixed(3)})`);

                        result.grandTotalSELL = calibratedTarget;
                        result.grandTotalCOS = this._round(result.grandTotalCOS * scaleFactor);
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

        // Cable runs — pull + terminate + test
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
            return this._round(qty * (pr.pull_cat6_cmr + pr.terminate_rg6 * 2 + pr.test_rg6) / 60);
        }

        // Cameras
        if (/pole.*cam|cam.*pole/i.test(name)) return this._round(qty * pr.install_camera_pole / 60);
        if (/outdoor.*cam|cam.*outdoor|exterior.*cam/i.test(name)) return this._round(qty * pr.install_camera_outdoor / 60);
        if (/camera|dome|bullet|ptz|turret|fisheye|panoram/i.test(name) && !/mount|bracket|license|sd|memory|software/i.test(name)) {
            return this._round(qty * pr.install_camera_indoor / 60);
        }

        // Access control
        if (/8.?door.*controller|controller.*8/i.test(name)) return this._round(qty * pr.install_8door_ctrl / 60);
        if (/4.?door.*controller|controller.*4/i.test(name)) return this._round(qty * pr.install_4door_ctrl / 60);
        if (/2.?door.*controller|controller.*2/i.test(name)) return this._round(qty * pr.install_2door_ctrl / 60);
        if (/card.*reader|reader|hid|proximity/i.test(name)) return this._round(qty * pr.install_card_reader / 60);
        if (/rex|request.*exit/i.test(name)) return this._round(qty * pr.install_rex / 60);
        if (/door.*contact|contact.*door/i.test(name)) return this._round(qty * pr.install_door_contact / 60);
        if (/crash.*bar|pushbar|panic/i.test(name)) return this._round(qty * pr.install_crash_bar / 60);
        if (/locking.*hardware|lock.*hw/i.test(name)) return this._round(qty * pr.install_locking_hw / 60);

        // Fire alarm
        if (/facp|fire.*alarm.*panel/i.test(name)) return this._round(qty * pr.install_facp / 60);
        if (/strobe|horn.*strobe/i.test(name)) return this._round(qty * pr.install_strobe / 60);
        if (/smoke.*detect/i.test(name)) return this._round(qty * pr.install_smoke_detector / 60);
        if (/heat.*detect/i.test(name)) return this._round(qty * pr.install_heat_detector / 60);
        if (/pull.*station/i.test(name)) return this._round(qty * pr.install_pull_station / 60);

        // Infrastructure
        if (/mdf|idf|telecom.*room|server.*room/i.test(name)) return this._round(qty * pr.buildout_mdf_idf / 60);
        if (/j.?hook|ceiling.*wire|bridle.*ring/i.test(name)) return this._round(qty * pr.install_ceiling_wire / 60);
        if (/d.?ring|micro.?duct/i.test(name)) return this._round(qty * pr.install_dring / 60);
        if (/faceplate|wall.*plate/i.test(name)) return this._round(qty * pr.install_faceplate / 60);
        if (/firestop/i.test(name)) return this._round(qty * pr.firestopping / 60);
        if (/ground/i.test(name)) return this._round(qty * pr.grounding_per_closet / 60);

        // Generic devices
        if (/speaker|strobe|horn|detector|sensor|module|annunciator|intercom|clock/i.test(name)) {
            return this._round(qty * pr.install_device_generic / 60);
        }

        // Major equipment
        if (/rack|enclosure|cabinet|ups|pdu|switch|nvr|server|workstation/i.test(name)) {
            return this._round(qty * 4); // 4 hours per major item
        }

        return 0;
    },

    // ═══════════════════════════════════════════════════════════
    // COMPARISON: Run 3D engine alongside standard engine
    // ═══════════════════════════════════════════════════════════
    compareWithStandard(state, bom, standardBreakdown) {
        const result3D = this.computeBid(state, bom);
        const stdTotal = standardBreakdown?.grandTotal || standardBreakdown?.finalTotal || 0;
        const delta = result3D.grandTotalSELL - stdTotal;
        const deltaPct = stdTotal > 0 ? this._round((delta / stdTotal) * 100) : 0;

        console.log(`[3D Engine v2] ═══ COMPARISON ═══`);
        console.log(`[3D Engine v2]   Standard: $${stdTotal.toLocaleString()}`);
        console.log(`[3D Engine v2]   3D formula: $${result3D.grandTotalSELL.toLocaleString()}`);
        console.log(`[3D Engine v2]   Delta: $${delta.toLocaleString()} (${deltaPct > 0 ? '+' : ''}${deltaPct}%)`);

        return {
            engine3D: result3D,
            standardTotal: stdTotal,
            delta,
            deltaPct,
            recommendation: Math.abs(deltaPct) <= 10
                ? "Within 10% — both estimates are in the competitive range"
                : deltaPct > 10
                    ? "3D formula is higher — standard may be underpricing vs 3D historical"
                    : "3D formula is lower — standard may be overpricing vs 3D historical",
        };
    },
};

if (typeof window !== 'undefined') window.FormulaEngine3D = FormulaEngine3D;
