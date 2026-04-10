// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — 3D TECHNOLOGY SERVICES COMPANY PRICING PROFILE
// Calibrated from 18 historical bids (2022–2026)
// Updates: Drop new bid spreadsheets into the Bid Import tool
//
// ⚠️  THIS FILE DOES NOT CONTAIN LABOR RATES, BURDEN, PW, OR TAX
//     Those are ALWAYS location/project-driven and set per estimate.
// ═══════════════════════════════════════════════════════════════

const COMPANY_PROFILE = {

    // ─── META ──────────────────────────────────────────────────
    version: "2026-Q2",
    company: "3D Technology Services",
    lastUpdated: "2026-04-10",
    bidCount: 25,  // 18 non-Amtrak + 7 Amtrak/railroad bids
    notes: "Material costs are actual distributor pricing. Overhead percentages are consistent across bids. Labor rates, burden, PW/Davis-Bacon, and tax are NEVER included — those are always project-specific. Includes transit/Amtrak calibration from Emeryville, Martinez, and Sacramento bids.",

    // ─── MATERIAL COSTS ───────────────────────────────────────
    // Actual distributor pricing from winning bids
    // These override PRICING_DB tier pricing when available
    materials: {
        cable: {
            cat6_cmp:               { cost: 0.242, unit: "per ft", mfg: "Berk Tek", partNumber: "10136226", source: "500 Capitol Mall, 1515 S Street" },
            cat6_cmr:               { cost: 0.300, unit: "per ft", mfg: "Various", source: "Auburn Indians" },
            cat6_pvc:               { cost: 0.260, unit: "per ft", mfg: "Berk Tek", source: "CHP North Sac, CHP Dublin" },
            cat6_osp:               { cost: 0.922, unit: "per ft", mfg: "Various", source: "Emeryville Amtrak" },
            cat6a_cmp_white:        { cost: 0.494, unit: "per ft", mfg: "Superior Essex", partNumber: "6B-246-4B", source: "Sam Brennan" },
            cat6a_cmp:              { cost: 0.600, unit: "per ft", mfg: "Berk Tek", source: "SAC Juvenile Court" },
            cat6a_riser:            { cost: 0.396, unit: "per ft", mfg: "Leviton", source: "San Joaquin Juvenile" },
            cat6a_plenum:           { cost: 0.731, unit: "per ft", mfg: "Leviton", source: "San Joaquin Juvenile, Lovelock" },
            cat6a_osp_shielded:     { cost: 1.300, unit: "per ft", mfg: "Paige Electric", source: "San Joaquin Juvenile" },
            cat6a_io:               { cost: 0.869, unit: "per ft", mfg: "Superior Essex", source: "Sam Brennan" },
            cat6a_osp:              { cost: 0.523, unit: "per ft", mfg: "Superior Essex", source: "Sam Brennan" },
            rg6_quad:               { cost: 0.500, unit: "per ft", mfg: "Primus", source: "500 Capitol Mall" },
            fiber_sm_6_armored:     { cost: 1.100, unit: "per ft", source: "1515 S Street" },
            fiber_sm_12_armored:    { cost: 1.540, unit: "per ft", mfg: "Corning", partNumber: "012E88", source: "500 Capitol Mall" },
            fiber_sm_12_cmr:        { cost: 1.360, unit: "per ft", source: "1515 S Street" },
            fiber_sm_24_nonarmored: { cost: 1.533, unit: "per ft", mfg: "Panduit", partNumber: "FSDR924Y", source: "San Joaquin Juvenile" },
            fiber_sm_24_armored:    { cost: 3.850, unit: "per ft", mfg: "Panduit", partNumber: "FSPP924Y", source: "San Joaquin Juvenile" },
            fiber_mm_6_armored:     { cost: 1.800, unit: "per ft", source: "1515 S Street" },
            fiber_mm_12_armored:    { cost: 2.300, unit: "per ft", source: "1515 S Street" },
            composite_ac:           { cost: 0.850, unit: "per ft", source: "Auburn Indians" },
            copper_25pair:          { cost: 1.850, unit: "per ft", source: "1515 S Street" },
            copper_50pair:          { cost: 2.100, unit: "per ft", source: "1515 S Street" },
            copper_100pair:         { cost: 3.500, unit: "per ft", source: "1515 S Street" },
            // Security / alarm cables
            security_22_6_shielded: { cost: 0.182, unit: "per ft", source: "POA-Sac, 760 Sheriffs" },
            security_22_4_unshielded: { cost: 0.106, unit: "per ft", source: "POA-Sac, 760 Sheriffs" },
            security_18_2_unshielded: { cost: 0.111, unit: "per ft", source: "POA-Sac, 760 Sheriffs" },
            security_18_4_unshielded: { cost: 0.213, unit: "per ft", source: "POA-Sac, 760 Sheriffs" },
            security_16_2_unshielded: { cost: 0.174, unit: "per ft", source: "POA-Sac, 760 Sheriffs" },
            // Fire alarm cables
            fa_14_2_jacketed:       { cost: 0.240, unit: "per ft", source: "VA Spinal Cord" },
            fa_16_2_jacketed:       { cost: 0.260, unit: "per ft", source: "VA Spinal Cord" },
            fa_12_2_jacketed:       { cost: 0.345, unit: "per ft", source: "VA Spinal Cord" },
            fa_18_4_jacketed:       { cost: 0.255, unit: "per ft", source: "VA Spinal Cord" },
            // Perimeter / sensor
            fo_sensor_cable:        { cost: 3.950, unit: "per ft", mfg: "Senstar", source: "Ethos Energy" },
            // Transit/Amtrak composite cables (from Sacramento bids)
            fiber_6strand_os2_w_18_2: { cost: 2.00, unit: "per ft", description: "6-strand OS2 + 18-2 copper composite", source: "Sacramento V1" },
            os2_36strand:           { cost: 1.46, unit: "per ft", description: "36-strand OS2 singlemode", source: "Sacramento V1" },
        },
        connectivity: {
            cat6_jack_leviton:      { cost: 5.50,  unit: "each", mfg: "Leviton", partNumber: "61110-RL6", source: "500 Capitol Mall, 1515 S Street" },
            cat6_jack_ortronics:    { cost: 4.00,  unit: "each", mfg: "Ortronics", partNumber: "KT2J6-36", source: "POA-Sac, 760 Sheriffs" },
            cat6a_jack_legrand:     { cost: 6.29,  unit: "each", mfg: "Legrand", partNumber: "KT2J6A-88", source: "Sam Brennan" },
            cat6a_jack_leviton:     { cost: 8.85,  unit: "each", mfg: "Leviton", source: "San Joaquin Juvenile, Lovelock" },
            cat6_jack_purple:       { cost: 9.53,  unit: "each", source: "Auburn Indians" },
            faceplate_2port:        { cost: 2.35,  unit: "each", mfg: "Leviton", source: "500 Capitol Mall" },
            faceplate_4port:        { cost: 1.44,  unit: "each", mfg: "Legrand", source: "Sam Brennan" },
            furniture_plate:        { cost: 3.60,  unit: "each", mfg: "Leviton", partNumber: "49910-SE4", source: "1515 S Street" },
            smb_2port:              { cost: 3.74,  unit: "each", mfg: "Legrand", source: "Sam Brennan" },
            patch_panel_24:         { cost: 40.00, unit: "each", mfg: "Leviton", source: "500 Capitol Mall" },
            patch_panel_48:         { cost: 70.00, unit: "each", mfg: "Leviton", source: "500 Capitol Mall" },
            patch_panel_48_panduit: { cost: 75.00, unit: "each", mfg: "Panduit", source: "Lovelock" },
            patch_panel_48_legrand: { cost: 41.00, unit: "each", mfg: "Legrand", source: "Sam Brennan" },
            patch_panel_24_legrand: { cost: 31.00, unit: "each", mfg: "Legrand", source: "Sam Brennan" },
            patch_panel_48_ortronics: { cost: 182.00, unit: "each", mfg: "Ortronics", partNumber: "SP6U48", source: "760 Sheriffs" },
            patch_cord_cat6_3ft:    { cost: 3.90,  unit: "each", mfg: "Leviton", source: "CHP North Sac" },
            patch_cord_cat6_10ft:   { cost: 9.43,  unit: "each", mfg: "Leviton", partNumber: "6D460-10L", source: "1515 S Street" },
            patch_cord_cat6_15ft:   { cost: 9.25,  unit: "each", mfg: "Leviton", partNumber: "6D460-15L", source: "1515 S Street" },
            patch_cord_cat6a_7ft:   { cost: 10.00, unit: "each", mfg: "Legrand", source: "Sam Brennan" },
            patch_cord_cat6a_15ft:  { cost: 18.00, unit: "each", mfg: "Legrand", source: "Sam Brennan" },
            patch_cord_cat6a_leviton: { cost: 11.95, unit: "each", mfg: "Leviton", source: "San Joaquin Juvenile, Lovelock" },
            fiber_patch_sm_3m:      { cost: 19.00, unit: "each", mfg: "Corning", source: "500 Capitol Mall" },
            fiber_patch_sm_panduit: { cost: 43.00, unit: "each", mfg: "Panduit", source: "San Joaquin Juvenile" },
            fiber_jumper_lc_duplex: { cost: 28.00, unit: "each", mfg: "Corning", source: "Lovelock" },
            relief_bar:             { cost: 38.00, unit: "each", mfg: "Legrand", source: "Sam Brennan" },
        },
        pathway: {
            jhook_4in:              { cost: 6.30,  unit: "each", mfg: "B-Line", source: "500 Capitol Mall, 1515 S Street" },
            jhook_4in_bline:        { cost: 7.65,  unit: "each", mfg: "B-Line", partNumber: "BCH64-W2", source: "SAC Juvenile Court" },
            jhook_2in:              { cost: 4.50,  unit: "each", source: "500 Capitol Mall" },
            jhook_2in_alt:          { cost: 2.53,  unit: "each", source: "Sam Brennan" },
            jhook_half:             { cost: 2.56,  unit: "each", source: "500 Capitol Mall" },
            jhook_half_alt:         { cost: 2.10,  unit: "each", source: "Sam Brennan" },
            ceiling_wire:           { cost: 0.73,  unit: "each", source: "Sam Brennan, 500 Capitol Mall" },
            threaded_rod_3ft:       { cost: 3.65,  unit: "each", source: "SAC Juvenile Court" },
            single_gang_box:        { cost: 6.50,  unit: "each", source: "500 Capitol Mall" },
            firestop_bucket:        { cost: 250.00, unit: "each", source: "Multiple" },
            firestop_pad:           { cost: 6.50,  unit: "each", source: "SAC Juvenile Court" },
            firestop_sleeve_4hr:    { cost: 108.00, unit: "each", source: "San Joaquin Juvenile" },
            firestop_ezpath:        { cost: 60.00, unit: "each", mfg: "EZ Path", partNumber: "EZD22", source: "Lovelock" },
            conduit_emt_075:        { cost: 1.00,  unit: "per ft", source: "CHP Dublin, Lovelock" },
            conduit_rigid_075:      { cost: 4.00,  unit: "per ft", source: "Lovelock" },
            conduit_strap:          { cost: 3.80,  unit: "each", source: "Lovelock" },
            innerduct_125:          { cost: 2.24,  unit: "per ft", source: "San Joaquin Juvenile" },
            maxcell_4in_3cell:      { cost: 4.20,  unit: "per ft", source: "San Joaquin Juvenile" },
            maxcell_2in_3cell:      { cost: 2.80,  unit: "per ft", source: "San Joaquin Juvenile" },
        },
        racks: {
            rack_2post:             { cost: 200.00, unit: "each", mfg: "CPI", partNumber: "55053-703", source: "500 Capitol Mall" },
            rack_2post_panduit:     { cost: 534.00, unit: "each", mfg: "Panduit", partNumber: "R2P6S", source: "San Joaquin Juvenile" },
            rack_shelf:             { cost: 93.00,  unit: "each", mfg: "CPI", source: "500 Capitol Mall" },
            power_strip:            { cost: 105.00, unit: "each", mfg: "Tripp Lite", source: "500 Capitol Mall" },
            vertical_wire_mgr:      { cost: 366.00, unit: "each", mfg: "Panduit", partNumber: "WMPV45E", source: "500 Capitol Mall" },
            horiz_cable_mgr_2ru:    { cost: 60.00,  unit: "each", mfg: "Ortronics", partNumber: "DHMC2RU", source: "POA-Sac" },
            ladder_rack_12in:       { cost: 125.00, unit: "each", mfg: "CPI", source: "500 Capitol Mall" },
            seismic_gusset:         { cost: 208.88, unit: "each", mfg: "CPI", source: "500 Capitol Mall" },
            wall_mount_enclosure:   { cost: 550.00, unit: "each", source: "Lovelock" },
            server_rack:            { cost: 750.00, unit: "each", source: "Lovelock" },
            rack_fan_kit:           { cost: 550.00, unit: "each", source: "Lovelock" },
            ground_wire_6awg:       { cost: 3.00,  unit: "per ft", mfg: "CPI", source: "500 Capitol Mall" },
            ground_wire_4awg:       { cost: 1.60,  unit: "per ft", source: "San Joaquin Juvenile" },
        },
        fiber: {
            housing_1ru:            { cost: 179.21, unit: "each", mfg: "Corning", partNumber: "CCH-01U", source: "500 Capitol Mall" },
            housing_2ru:            { cost: 376.00, unit: "each", mfg: "Panduit", partNumber: "FRME2U", source: "San Joaquin Juvenile" },
            housing_4ru:            { cost: 500.00, unit: "each", source: "San Joaquin Juvenile" },
            housing_wall:           { cost: 100.00, unit: "each", mfg: "Corning", partNumber: "WIC-02P", source: "500 Capitol Mall" },
            adapter_panel:          { cost: 113.00, unit: "each", mfg: "Corning", partNumber: "CCH-CP12-A9", source: "500 Capitol Mall" },
            cassette_24strand_os2:  { cost: 202.00, unit: "each", mfg: "Panduit", partNumber: "FAP12WBUDLCZ", source: "San Joaquin Juvenile" },
            pigtail:                { cost: 110.00, unit: "each", mfg: "Panduit", source: "San Joaquin Juvenile" },
            connector:              { cost: 40.00,  unit: "each", mfg: "Corning", source: "500 Capitol Mall" },
            storage_ring:           { cost: 70.00,  unit: "each", mfg: "Leviton", source: "500 Capitol Mall" },
            sfp_10g_lr:             { cost: 560.00, unit: "each", source: "San Joaquin Juvenile" },
        },
    },

    // ─── EQUIPMENT PRICING ────────────────────────────────────
    // Actual cost from distributor quotes in winning bids
    equipment: {
        // ── AXIS Cameras ──
        axis_m4216_lv:          { cost: 370.61,  mfg: "Axis", description: "M4216-LV varifocal 4MP dome" },
        axis_p3265_lv:          { cost: 456.30,  mfg: "Axis", description: "P3265-LV 2MP dome w/IR indoor" },
        axis_p3265_lve:         { cost: 546.77,  mfg: "Axis", description: "P3265-LVE 2MP dome w/IR outdoor" },
        axis_p3267_lv:          { cost: 570.55,  mfg: "Axis", description: "P3267-LV 2MP dome w/IR indoor" },
        axis_p3267_lve:         { cost: 677.67,  mfg: "Axis", description: "P3267-LVE 2MP dome w/IR outdoor" },
        axis_p3268_lv:          { cost: 692.77,  mfg: "Axis", description: "P3268-LV 8MP dome w/IR" },
        axis_p4705_plve:        { cost: 707.37,  mfg: "Axis", description: "P4705-PLVE dual sensor 360" },
        axis_p1387_le:          { cost: 714.83,  mfg: "Axis", description: "P1387-LE fixed box outdoor" },
        axis_p1467_le:          { cost: 727.48,  mfg: "Axis", description: "P1467-LE bullet 5MP" },
        axis_q9216_slv:         { cost: 784.47,  mfg: "Axis", description: "Q9216-SLV vandal steel (correctional)" },
        axis_p4708_plve:        { cost: 927.60,  mfg: "Axis", description: "P4708-PLVE panoramic ERA" },
        axis_p3827_pve:         { cost: 949.08,  mfg: "Axis", description: "P3827-PVE 180° 7MP panoramic" },
        axis_p3737_ple:         { cost: 1075.72, mfg: "Axis", description: "P3737-PLE 360° 20MP" },
        axis_p5654_e_mkii:      { cost: 1075.72, mfg: "Axis", description: "P5654-E MK II PTZ" },
        axis_q9307_lv:          { cost: 1094.27, mfg: "Axis", description: "Q9307-LV 5MP dome" },
        axis_p3738_ple:         { cost: 1213.24, mfg: "Axis", description: "P3738-PLE 32MP 4x8MP panoramic" },
        axis_m4308_ple:         { cost: 1213.24, mfg: "Axis", description: "M4308-PLE panoramic dome" },
        axis_p3818_pve:         { cost: 1384.62, mfg: "Axis", description: "P3818-PVE 180° 13MP fixed dome" },
        axis_q6300_e:           { cost: 1714.14, mfg: "Axis", description: "Q6300-E 5MP 360 multidirectional" },
        // ── Axis Cameras — Amtrak distributor pricing (from Emeryville/Martinez bids) ──
        axis_p3267_lme_amtrak:  { cost: 729.36,  mfg: "Axis", description: "P3267-LME fixed dome (Amtrak Emeryville)", source: "Emeryville" },
        axis_p3268_lve_amtrak:  { cost: 778.97,  mfg: "Axis", description: "P3268-LVE 8MP dome (Amtrak Emeryville)", source: "Emeryville" },
        axis_p3738_ple_amtrak:  { cost: 1416.91, mfg: "Axis", description: "P3738-PLE 32MP panoramic (Amtrak Emeryville)", source: "Emeryville" },
        axis_p4708_plve_amtrak: { cost: 977.44,  mfg: "Axis", description: "P4708-PLVE panoramic ERA (Amtrak Emeryville)", source: "Emeryville" },
        // ── Avigilon Cameras ──
        avigilon_3x8mp_multisensor: { cost: 1530.96, mfg: "Avigilon", description: "3x8MP WDR 270° multisensor" },
        avigilon_h6a_4mp:       { cost: 1828.37, mfg: "Avigilon", description: "H6A 4MP outdoor IR dome" },
        // ── Camera Mounts ──
        axis_t94n01d:           { cost: 72.27,   mfg: "Axis", description: "T94N01D pendant kit" },
        axis_t91d61:            { cost: 72.27,   mfg: "Axis", description: "T91D61 wall mount" },
        axis_t91a64:            { cost: 63.55,   mfg: "Axis", description: "T91A64 corner bracket" },
        axis_tp3204e:           { cost: 92.12,   mfg: "Axis", description: "TP3204-E recessed mount" },
        axis_tq5301e:           { cost: 239.99,  mfg: "Axis", description: "TQ5301-E corner mount" },
        wall_mount_arm:         { cost: 70.06,   unit: "each", source: "Marysville USD" },
        corner_mount_adapter:   { cost: 83.74,   unit: "each", source: "Marysville USD" },
        pole_mount_large:       { cost: 66.42,   unit: "each", source: "Marysville USD" },
        pendant_mount_outdoor:  { cost: 115.08,  unit: "each", source: "Marysville USD" },
        // ── Servers & Recording ──
        axis_s1232_32tb:        { cost: 6058.27, mfg: "Axis", description: "S1232 rack server 32TB" },
        axis_s1264_64tb:        { cost: 10353.54, mfg: "Axis", description: "S1264 rack server 64TB" },
        axis_s9301_ws:          { cost: 1167.27, mfg: "Axis", description: "S9301 workstation" },
        gcon_dcs_456tb:         { cost: 27326.02, mfg: "GCon", description: "DCS server 456TB" },
        gcon_ws:                { cost: 3702.25, mfg: "GCon", description: "Workstation" },
        lenovo_ws:              { cost: 3249.66, mfg: "Lenovo", description: "Workstation" },
        exacq_ip08_240t:        { cost: 29915.96, mfg: "ExacqVision", description: "IP08-240T-R2XW server" },
        // ── VMS Licensing ──
        axis_cs_core_license:   { cost: 64.97,   mfg: "Axis", description: "Camera Station v5.0 Core license" },
        unity_enterprise_ch:    { cost: 174.08,  mfg: "Avigilon", description: "Unity Enterprise channel license" },
        unity_enterprise_adv:   { cost: 64.94,   mfg: "Avigilon", description: "Unity Enterprise advantage license" },
        milestone_expert:       { cost: 230.31,  mfg: "Milestone", description: "Xprotect Expert camera license" },
        milestone_3yr_support:  { cost: 126.00,  mfg: "Milestone", description: "3-year support per camera" },
        exacq_cam_license:      { cost: 185.45,  mfg: "ExacqVision", description: "Camera license 1-yr" },
        exacq_ssa_6yr:          { cost: 369.78,  mfg: "ExacqVision", description: "SSA 6-year support" },
        // ── Networking ──
        axis_t8516_poe:         { cost: 546.77,  mfg: "Axis", description: "T8516 PoE+ 16-port switch" },
        sigmanax_24p_gig_poe:   { cost: 654.91,  description: "24-port gigabit PoE+ switch" },
        poe_injector_30w:       { cost: 57.21,   unit: "each", source: "Marysville USD" },
        axis_t8154_midspan:     { cost: 159.25,  mfg: "Axis", description: "T8154 60W SFP midspan" },
        // ── Monitors ──
        lg_50in:                { cost: 750.00,  mfg: "LG", description: "50\" monitor" },
        lg_32in:                { cost: 500.00,  mfg: "LG", description: "32\" monitor" },
        samsung_qm55c:          { cost: 1138.94, mfg: "Samsung", description: "QM55C 55\" commercial" },
        samsung_qm43c:          { cost: 781.94,  mfg: "Samsung", description: "QM43C 43\" commercial" },
        sony_65in_led_4k:       { cost: 850.00,  mfg: "Sony", description: "65\" LED 4K" },
        monitor_wall_mount:     { cost: 75.00,   description: "Wall mount bracket" },
        monitor_bracket:        { cost: 180.00,  description: "Mounting bracket (heavy duty)" },
        kvm_rack_17in:          { cost: 1200.00, mfg: "Tripp Lite", description: "17\" 1U rackmount KVM" },
        // ── Access Control ──
        schlage_ad400:          { cost: 1567.00, mfg: "Schlage", description: "AD400 electronic lockset" },
        schlage_pim400:         { cost: 1299.00, mfg: "Schlage", description: "PIM400-1501 16-lock controller" },
        hid_signo_40:           { cost: 241.00,  mfg: "HID", description: "Signo 40 card reader" },
        hes_8500:               { cost: 368.00,  mfg: "HES", description: "8500 electric strike" },
        bosch_ds160:            { cost: 55.99,   mfg: "Bosch", description: "DS160 REX sensor" },
        gri_door_switch:        { cost: 12.71,   mfg: "GRI", description: "Door recessed contact switch" },
        s2_netbox_extreme:      { cost: 2134.00, mfg: "S2", description: "Netbox Extreme 16-portal wall" },
        s2_netbox_nbk8:         { cost: 3770.00, mfg: "S2", description: "Netbox Extreme NBK-8 16-portal" },
        s2_susp_tier1:          { cost: 330.00,  mfg: "S2", description: "SUSP plan tier 1 (1-32 readers)" },
        s2_dual_reader_ctrl:    { cost: 1631.00, mfg: "S2", description: "LNL-NB-M2220 dual reader controller" },
        s2_single_door_ctrl:    { cost: 774.00,  mfg: "S2", description: "LNL-NB-M2210 single door PoE" },
        s2_output_ctrl:         { cost: 647.00,  mfg: "S2", description: "LNL-NB-1200-S3 output controller" },
        lsp_4dr_panel:          { cost: 487.00,  description: "LSP-4DR-E4M panel" },
        electronic_pushbar:     { cost: 1500.00, description: "Electronic push bar / exit device" },
        schlage_nd80pdel:       { cost: 681.50,  mfg: "Schlage", description: "ND80PDEL lock" },
        door_contact_generic:   { cost: 15.00,   description: "Generic door contact" },
        rex_generic:            { cost: 85.00,   description: "Generic REX sensor" },
        // ── UPS ──
        ups_1500va_rack:        { cost: 1169.00, mfg: "N1C", description: "1500VA rack mount UPS" },
        ups_2000va_rack:        { cost: 3079.00, mfg: "N1C", description: "2000VA rack mount UPS" },
        ups_network_card:       { cost: 1297.00, mfg: "N1C", description: "Network management card" },
        apc_smtl2200:           { cost: 3237.00, mfg: "APC", partNumber: "SMTL2K2RM2UCL", description: "Smart-UPS 2200VA rack" },
        apc_smtl3000:           { cost: 4200.00, mfg: "APC", partNumber: "SMTL3KRM2UCLNC", description: "Smart-UPS 3000VA rack" },
        eaton_9px2000rt:        { cost: 2583.40, mfg: "Eaton", description: "9PX2000RT-L UPS" },
        eaton_9px1500rt:        { cost: 2337.79, mfg: "Eaton", description: "9PX1500RT-L UPS" },
        eaton_9px10k:           { cost: 8000.34, mfg: "Eaton", description: "9PX10KSP UPS" },
        eaton_5px3000rtng2:     { cost: 2554.00, mfg: "Eaton", description: "5PX3000RTNG2 3kVA UPS (Sacramento Amtrak)", source: "Sacramento V1" },
        // ── Transit/Amtrak Station-Scale Equipment (from Emeryville/Martinez bids) ──
        ups_station_system:     { cost: 34943.00, description: "Station-scale UPS system (Amtrak)", source: "Emeryville" },
        ups_battery_system:     { cost: 98477.00, description: "Station battery backup system (Amtrak)", source: "Emeryville" },
        ups_inverter_large:     { cost: 187550.00, description: "UPS/Inverter system — large station (Amtrak)", source: "Martinez" },
        // ── Transit Access Control (from Martinez bid) ──
        access_ctrl_door_transit: { cost: 7500.00, description: "Access control per door — transit station", source: "Martinez" },
        access_ctrl_panel_transit: { cost: 9500.00, description: "Access control panel — transit station", source: "Martinez" },
        power_circuit_dedicated: { cost: 33989.00, description: "Dedicated power circuit — transit station", source: "Martinez" },
        // ── Misc Transit ──
        sd_card_128gb:          { cost: 250.00, description: "128GB SD card for edge storage", source: "Emeryville" },
        blast_film_per_window:  { cost: 350.00, description: "Blast/security window film per window (Martinez)", source: "Martinez" },
        fluted_glazing_per_sf:  { cost: 200.00, description: "Fluted glazing replacement per SF", source: "Martinez" },
        // ── Networking (Enterprise) ──
        cisco_c9500_24y4c:      { cost: 15791.00, mfg: "Cisco", partNumber: "C9500-24Y4C-A", description: "Catalyst 9500 24x1G" },
        cisco_c9300x_24hx:      { cost: 4583.00, mfg: "Cisco", partNumber: "C9300X-24HX-A", description: "Catalyst 9300 24-port" },
        cisco_c9300_10ge_mod:   { cost: 1600.00, mfg: "Cisco", description: "Catalyst 9300 8x10GE module" },
        cisco_1900w_psu:        { cost: 1845.00, mfg: "Cisco", description: "1900W AC power supply" },
        cisco_phone_wallmount:  { cost: 70.00,   mfg: "Cisco", partNumber: "DP-9800-WMK", description: "Phone wall mount" },
        // ── Perimeter Detection ──
        senstar_fp1150:         { cost: 52702.50, mfg: "Senstar", description: "FP1150 fiber optic fence sensor" },
        senstar_pml_license:    { cost: 16.50,   unit: "per meter", mfg: "Senstar", description: "Per-meter activation license" },
        senstar_splice_encl:    { cost: 491.25,  mfg: "Senstar", description: "Field splice enclosure" },
        senstar_gate_kit:       { cost: 101.25,  mfg: "Senstar", description: "Gate cable management kit" },
        senstar_nms_gateway:    { cost: 3750.00, mfg: "Senstar", description: "NMS-GSC Genetec gateway" },
        ultrawave_txrx:         { cost: 2163.75, description: "UltraWave TX/RX microwave pair" },
        sniu_interface:         { cost: 2430.00, description: "Silver Network Interface Unit" },
    },

    // ─── OVERHEAD PERCENTAGES ─────────────────────────────────
    // Consistent across all 18 bids — these are your standard rates
    overhead: {
        pm_pct:                 { min: 6, max: 10, default: 6, description: "Project Manager % of total labor hours" },
        admin_pct:              { min: 4, max: 6, default: 4, description: "Admin/Engineering/CAD % of total labor hours" },
        npt_pct:                { min: 5, max: 20, default: 8, description: "Non-Productive Time % (scales with distance/complexity)" },
        material_support_pct:   { min: 1, max: 5, default: 2, description: "Material handling/support %" },
        shipping_pct:           { min: 1, max: 2, default: 1, description: "Shipping/freight %" },
        warranty_1yr_pct:       1,
        warranty_2yr_pct:       2,
        warranty_5yr_pct:       1,
        precon_gen_conditions_pct: 3,
        commission_pct:         { min: 1, max: 4, default: 3, description: "Sales commission %" },
        safety_meeting_pct:     { min: 2, max: 6, default: 2, description: "Daily safety meetings %" },
    },

    // ─── MARGIN TARGETS BY PROJECT TYPE ───────────────────────
    // Gross margin targets from actual winning bids
    marginTargets: {
        small_cabling:          { gm: 50, description: "Small cabling/LV jobs (<$30K)", source: "POA-Sac, 760 Sheriffs, Superior Equipment" },
        cctv_small:             { gm: 27, description: "Small CCTV (6-8 cameras)", source: "CHP North Sac, CHP Dublin" },
        cctv_large:             { gm: 35, description: "Large CCTV school/campus (30+ cameras)", source: "Marysville USD" },
        teledata_pw:            { gm: 31, description: "Teledata — prevailing wage", source: "SAC Juvenile Court, Sam Brennan, 1515 S Street" },
        teledata_non_pw:        { gm: 35, description: "Teledata — non-prevailing wage (per Frank Pedersen 1/13/26)", source: "500 Capitol Mall" },
        multi_system:           { gm: 38, description: "Multi-system large projects", source: "Lovelock, San Joaquin Juvenile" },
        correctional:           { gm: 40, description: "Correctional/detention facilities", source: "Lovelock, San Joaquin Juvenile" },
        perimeter_detection:    { gm: 63, description: "Perimeter fence detection systems", source: "Ethos Energy" },
        demo:                   { gm: 31, description: "Demolition / cable removal", source: "Sam Brennan, 1515 S Street" },
        intercom:               { gm: 25, description: "Intercom (subcontractor-heavy)", source: "Sam Brennan" },
        transit_railroad:       { gm: 45, description: "Transit/Railroad (Amtrak, BART, UP) — target 45-50% per '3× cost' rule", source: "Sacramento V1/V2, Emeryville, Martinez" },
    },

    // ─── PER-UNIT BENCHMARK RANGES ────────────────────────────
    // Sanity-check data — if AI estimate is outside these ranges, flag it
    benchmarks: {
        camera_installed_small:       { min: 4600, max: 5300, avg: 4950, unit: "$/camera", description: "Small CCTV job (6-8 cameras)", source: "CHP North Sac, CHP Dublin" },
        camera_installed_large:       { min: 3500, max: 4200, avg: 3850, unit: "$/camera", description: "Large CCTV (30+ cameras)", source: "Marysville USD" },
        camera_installed_correctional: { min: 7000, max: 8000, avg: 7500, unit: "$/camera", description: "Correctional with networking", source: "Lovelock, San Joaquin Juvenile" },
        cable_drop_non_pw:            { min: 345, max: 690, avg: 500, unit: "$/drop", description: "Cable drop — non-prevailing wage", source: "500 Capitol Mall, POA-Sac" },
        cable_drop_pw:                { min: 488, max: 1225, avg: 800, unit: "$/drop", description: "Cable drop — prevailing wage", source: "SAC Juvenile Court, Sam Brennan" },
        access_door_wired:            { min: 5000, max: 6000, avg: 5500, unit: "$/door", description: "Wired access control per door", source: "Auburn Indians" },
        access_door_rfid:             { min: 5000, max: 5800, avg: 5400, unit: "$/door", description: "RFID wireless lock per door", source: "Auburn Indians" },
        card_reader_unit:             { min: 2600, max: 3200, avg: 2900, unit: "$/reader", description: "Card reader installed", source: "Auburn Indians, 1515 S Street" },
        wap_indoor:                   { min: 2000, max: 2000, avg: 2000, unit: "$/WAP", description: "Indoor wireless AP installed", source: "1515 S Street" },
        wap_outdoor:                  { min: 2300, max: 2300, avg: 2300, unit: "$/WAP", description: "Outdoor wireless AP installed", source: "1515 S Street" },
        // Transit/Amtrak benchmarks
        camera_amtrak_per_unit:       { min: 6150, max: 6965, avg: 6400, unit: "$/camera", description: "Amtrak per-camera all-in (camera + cable + labor)", source: "Emeryville, Martinez" },
        camera_amtrak_per_total:      { min: 21346, max: 29497, avg: 25000, unit: "$/camera", description: "Amtrak total ÷ camera count (includes civil, GC, everything)", source: "Emeryville ($21K), Martinez ($29K)" },
        trench_transit_per_lf:        { min: 85, max: 281, avg: 175, unit: "$/LF", description: "Transit trenching — SITE SPECIFIC (Emeryville $85, Martinez $281)", source: "Emeryville, Martinez" },
        ups_station_range:            { min: 2554, max: 187550, avg: 50000, unit: "$/system", description: "Station UPS system — varies wildly by station size", source: "Sacramento, Emeryville, Martinez" },
    },

    // ─── CAMERA INSTALL HOURS ─────────────────────────────────
    // Hours per camera by install type (from actual bids)
    installHours: {
        camera_rr_indoor:       { hours: 4, description: "Remove & replace indoor camera", source: "Marysville USD, CHP North Sac" },
        camera_rr_outdoor:      { hours: 8, description: "Remove & replace outdoor camera", source: "Auburn Indians" },
        camera_new_indoor:      { hours: 6, description: "New indoor camera install", source: "Auburn Indians, Lovelock" },
        camera_new_outdoor:     { hours: 8, description: "New outdoor camera install", source: "Marysville USD, Lovelock" },
        camera_move:            { hours: 6, description: "Move existing camera", source: "Marysville USD" },
        cable_pull_per_drop:    { hours: 1.4, description: "Pull + terminate per cable drop", source: "Sam Brennan, 1515 S Street" },
        head_end_small:         { hours: 8, description: "Head-end install (server + workstation + monitor)", source: "CHP North Sac, CHP Dublin" },
        head_end_large:         { hours: 16, description: "Head-end install (large MDF/IDF)", source: "Auburn Indians, San Joaquin Juvenile" },
        access_door_wired:      { hours: 8, description: "Wired access control per door", source: "Auburn Indians" },
        access_door_rfid:       { hours: 4, description: "RFID wireless lock per door", source: "Auburn Indians" },
        mobilization:           { hours: 8, description: "Standard mobilization", source: "Multiple" },
        training:               { hours: 4, description: "Standard end-user training", source: "Multiple" },
        // Transit/Amtrak install hours (restricted work windows increase duration)
        camera_transit_outdoor: { hours: 12, description: "Transit outdoor camera (includes RWIC wait, safety briefing)", source: "Emeryville, Martinez" },
        camera_transit_pole:    { hours: 16, description: "Transit pole-mount camera (includes civil, pole, foundation)", source: "Emeryville" },
        access_door_transit:    { hours: 12, description: "Transit access control door install", source: "Martinez" },
    },

    // ─── SOURCE BIDS ──────────────────────────────────────────
    // Provenance tracking — which bids contributed to this profile
    sourceBids: [
        { id: "54043", name: "CHP North Sac", type: "CCTV", total: 36863, date: "2025-02-03", pw: false },
        { id: "54838", name: "Auburn Indians", type: "Multi (AC+CCTV+Telecom)", total: 141129, date: "2025-10-30", pw: false },
        { id: "54914", name: "Marysville Joint USD", type: "CCTV", total: 237139, date: "2026-04-07", pw: false },
        { id: "55201", name: "Ethos Energy Fence", type: "Perimeter Detection", total: 290883, date: "2026-03-23", pw: false },
        { id: "Indians-V1", name: "Auburn Indians Booking", type: "Multi-scope booking", total: 11000, date: "2025-10-27", pw: false },
        { id: "POA", name: "POA-Sac Office", type: "Cabling", total: 17669, date: "2025-02-26", pw: false },
        { id: "53520", name: "SAC Juvenile Court V2", type: "Teledata", total: 41975, date: "2024-08-19", pw: true },
        { id: "54612", name: "Sam Brennan Telecenter", type: "Multi (Teledata+Demo+Intercom)", total: 835224, date: "2025-09-11", pw: true },
        { id: "SUP", name: "Superior Equipment", type: "Cabling", total: 22798, date: "2025-02-17", pw: false },
        { id: "VA", name: "VA Spinal Cord Injury", type: "Multi (FA+Security+AV)", total: 483758, date: "2022-01-09", pw: true, davisBacon: true },
        { id: "500-V1", name: "500 Capitol Mall V1", type: "Data Cabling + Backbone", total: 35059, date: "2026-03-16", pw: false },
        { id: "500-V2", name: "500 Capitol Mall V2", type: "Data Cabling + Backbone + WiFi", total: 39054, date: "2026-03-25", pw: false },
        { id: "760", name: "760 Sheriffs", type: "Cabling", total: 25085, date: "2025-01-27", pw: false },
        { id: "760-HDMI", name: "760 Sheriffs HDMI", type: "HDMI add-on", total: 818, date: "2025-03-24", pw: false },
        { id: "1515", name: "1515 S Street", type: "Multi (Teledata+Demo)", total: 433439, date: "2025-05-21", pw: true },
        { id: "53854", name: "San Joaquin Juvenile", type: "Cabling + CCTV", total: 1010877, date: "2026-04-07", pw: true },
        { id: "53855", name: "Lovelock NV", type: "CCTV (correctional)", total: 2121145, date: "2026-04-07", pw: true },
        { id: "54008", name: "CHP Dublin", type: "CCTV", total: 48397, date: "2025-04-08", pw: false },
        // Amtrak / Railroad bids
        { id: "AMT-EMV", name: "Amtrak Emeryville Original", type: "Transit CCTV", total: 1302128, date: "2024-06-15", pw: true, transit: true },
        { id: "AMT-EMV-VE", name: "Amtrak Emeryville VE", type: "Transit CCTV (Value Eng)", total: 1033760, date: "2024-06-15", pw: true, transit: true },
        { id: "AMT-MTZ", name: "Amtrak Martinez Original", type: "Transit CCTV+Access", total: 2035277, date: "2024-08-20", pw: true, transit: true },
        { id: "AMT-MTZ-VE", name: "Amtrak Martinez VE", type: "Transit CCTV+Access (Value Eng)", total: 1731418, date: "2024-08-20", pw: true, transit: true },
        { id: "AMT-SAC-V1", name: "Amtrak Sacramento V1", type: "Transit Backbone+Racks", total: 244293, date: "2024-04-10", pw: true, transit: true },
        { id: "AMT-SAC-V2", name: "Amtrak Sacramento V2", type: "Transit Backbone+Racks", total: 244293, date: "2024-05-01", pw: true, transit: true },
        { id: "AMT-SAC-CCTV", name: "Amtrak Sacramento CCTV", type: "Transit CCTV (placeholder)", total: 0, date: "2024-05-01", pw: true, transit: true },
    ],
};

// ─── FREEZE (prevent runtime tampering) ───────────────────
(function deepFreeze(obj) {
    Object.freeze(obj);
    Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Object.isFrozen(obj[key])) {
            deepFreeze(obj[key]);
        }
    });
})(COMPANY_PROFILE);

if (typeof window !== "undefined") {
    window.COMPANY_PROFILE = COMPANY_PROFILE;
}
