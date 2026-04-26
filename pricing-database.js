// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — INDUSTRY-STANDARD PRICING DATABASE
// Comprehensive ELV Material & Labor Rate Reference
// All prices in USD — Updated Q1 2026
// ═══════════════════════════════════════════════════════════════

const PRICING_DB = {

    // ─── META ──────────────────────────────────────────────────
    version: "2026-Q1",
    lastUpdated: "2026-02-07",
    currency: "USD",
    notes: "Prices reflect national average contractor cost (not retail). Adjust for regional market conditions.",

    // ─── PRICING TIERS ─────────────────────────────────────────
    // Budget:   Value brands, competitive bid (ICC, Vertical Cable, Dahua, ZKTeco)
    // Mid:      Standard spec, name brands (Panduit, CommScope, Axis, HID, Bosch)
    // Premium:  High-end / spec'd brand (Corning, Leviton Enterprise, Axis Q-series, Genetec)
    tiers: ["budget", "mid", "premium"],

    // ═══════════════════════════════════════════════════════════
    // STRUCTURED CABLING
    // ═══════════════════════════════════════════════════════════
    structuredCabling: {
        cable: {
            cat5e_plenum: { unit: "per ft", budget: 0.12, mid: 0.18, premium: 0.25, description: "Cat 5e Plenum (CMP) 1000ft box", mfg: { budget: "Vertical Cable", mid: "CommScope", premium: "Belden" }, partNumber: { budget: "066-559/P/WH", mid: "874001724/10", premium: "1583A" } },
            cat5e_riser: { unit: "per ft", budget: 0.08, mid: 0.12, premium: 0.18, description: "Cat 5e Riser (CMR) 1000ft box", mfg: { budget: "Vertical Cable", mid: "CommScope", premium: "Belden" }, partNumber: { budget: "054-453/BL", mid: "874001724/10", premium: "1583A" } },
            cat6_plenum: { unit: "per ft", budget: 0.16, mid: 0.24, premium: 0.35, description: "Cat 6 Plenum (CMP) 1000ft box", mfg: { budget: "Vertical Cable", mid: "CommScope", premium: "Belden" }, partNumber: { budget: "065-306/P/BL", mid: "760092459/10", premium: "2412" } },
            cat6_riser: { unit: "per ft", budget: 0.11, mid: 0.17, premium: 0.26, description: "Cat 6 Riser (CMR) 1000ft box", mfg: { budget: "Vertical Cable", mid: "CommScope", premium: "Belden" }, partNumber: { budget: "065-301/BL", mid: "760092459/10", premium: "2412" } },
            cat6a_plenum: { unit: "per ft", budget: 0.22, mid: 0.32, premium: 0.48, description: "Cat 6A Plenum (CMP) 1000ft box", mfg: { budget: "Vertical Cable", mid: "Panduit", premium: "Belden" }, partNumber: { budget: "077-2150/P/BL", mid: "PUP6AV04BU-CEG", premium: "10GXS12" } },
            cat6a_riser: { unit: "per ft", budget: 0.16, mid: 0.24, premium: 0.38, description: "Cat 6A Riser (CMR) 1000ft box", mfg: { budget: "Vertical Cable", mid: "Panduit", premium: "Belden" }, partNumber: { budget: "077-2150/BL", mid: "PUR6AV04BU-CEG", premium: "10GXW12" } },
            cat6a_shielded: { unit: "per ft", budget: 0.30, mid: 0.42, premium: 0.58, description: "Cat 6A Shielded (F/UTP) Plenum", mfg: { budget: "Vertical Cable", mid: "Panduit", premium: "Belden" }, partNumber: { budget: "077-2162/P/BL", mid: "PSP6AV04BU-CEG", premium: "10GXF12" } },
            fiber_sm_6: { unit: "per ft", budget: 0.28, mid: 0.42, premium: 0.65, description: "Single-mode OS2 6-strand indoor/outdoor", mfg: { budget: "Cleerline", mid: "Corning", premium: "Corning" }, partNumber: { budget: "SSF-S9006CP", mid: "006T88-31131-29", premium: "006E8F-31131-29" } },
            fiber_sm_12: { unit: "per ft", budget: 0.38, mid: 0.58, premium: 0.85, description: "Single-mode OS2 12-strand indoor/outdoor", mfg: { budget: "Cleerline", mid: "Corning", premium: "Corning" }, partNumber: { budget: "SSF-S9012CP", mid: "012T88-31131-29", premium: "012E8F-31131-29" } },
            fiber_sm_24: { unit: "per ft", budget: 0.55, mid: 0.82, premium: 1.20, description: "Single-mode OS2 24-strand indoor/outdoor", mfg: { budget: "Cleerline", mid: "Corning", premium: "Corning" }, partNumber: { budget: "SSF-S9024CP", mid: "024T88-31131-29", premium: "024E8F-31131-29" } },
            fiber_mm_6: { unit: "per ft", budget: 0.32, mid: 0.48, premium: 0.72, description: "Multi-mode OM3/OM4 6-strand", mfg: { budget: "Cleerline", mid: "Corning", premium: "Corning" }, partNumber: { budget: "SSF-M5006CP", mid: "006T88-31380-29", premium: "006E5F-31131-29" } },
            fiber_mm_12: { unit: "per ft", budget: 0.45, mid: 0.68, premium: 0.95, description: "Multi-mode OM3/OM4 12-strand", mfg: { budget: "Cleerline", mid: "Corning", premium: "Corning" }, partNumber: { budget: "SSF-M5012CP", mid: "012T88-31380-29", premium: "012E5F-31131-29" } },
            coax_rg6: { unit: "per ft", budget: 0.10, mid: 0.16, premium: 0.24, description: "RG6 Plenum coax", mfg: { budget: "Vertical Cable", mid: "Belden", premium: "Belden" }, partNumber: { budget: "107-2218/P/WH", mid: "1694A", premium: "1694A" } },
            coax_rg59: { unit: "per ft", budget: 0.08, mid: 0.12, premium: 0.18, description: "RG59 Plenum coax", mfg: { budget: "Vertical Cable", mid: "Belden", premium: "Belden" }, partNumber: { budget: "107-2152/P/WH", mid: "1505A", premium: "1505A" } },
        },
        connectivity: {
            jack_cat6: { unit: "each", budget: 4.50, mid: 8.00, premium: 14.00, description: "Cat 6 keystone jack", mfg: { budget: "ICC", mid: "Panduit", premium: "Leviton" }, partNumber: { budget: "IC1078F6BL", mid: "CJ688TGBU", premium: "6110G-RL6" } },
            jack_cat6a: { unit: "each", budget: 8.00, mid: 14.00, premium: 22.00, description: "Cat 6A keystone jack", mfg: { budget: "ICC", mid: "Panduit", premium: "Leviton" }, partNumber: { budget: "IC1078GA6A", mid: "CJA688TGBU", premium: "6110G-RL6" } },
            faceplate_1port: { unit: "each", budget: 1.50, mid: 3.00, premium: 5.50, description: "1-port faceplate", mfg: { budget: "ICC", mid: "Panduit", premium: "Leviton" }, partNumber: { budget: "IC107F01WH", mid: "CFPL1WHY", premium: "41080-1WP" } },
            faceplate_2port: { unit: "each", budget: 1.75, mid: 3.50, premium: 6.00, description: "2-port faceplate", mfg: { budget: "ICC", mid: "Panduit", premium: "Leviton" }, partNumber: { budget: "IC107F02WH", mid: "CFPL2WHY", premium: "41080-2WP" } },
            faceplate_4port: { unit: "each", budget: 2.25, mid: 4.50, premium: 7.50, description: "4-port faceplate", mfg: { budget: "ICC", mid: "Panduit", premium: "Leviton" }, partNumber: { budget: "IC107F04WH", mid: "CFPL4WHY", premium: "41080-4WP" } },
            surface_box_1: { unit: "each", budget: 2.00, mid: 4.00, premium: 7.00, description: "Surface mount box 1-port", mfg: { budget: "ICC", mid: "Panduit", premium: "Leviton" }, partNumber: { budget: "IC107SB1WH", mid: "CBX1WH-A", premium: "41089-1WP" } },
            surface_box_2: { unit: "each", budget: 2.50, mid: 5.00, premium: 8.50, description: "Surface mount box 2-port", mfg: { budget: "ICC", mid: "Panduit", premium: "Leviton" }, partNumber: { budget: "IC107SB2WH", mid: "CBX2WH-A", premium: "41089-2WP" } },
            patch_panel_24: { unit: "each", budget: 45.00, mid: 85.00, premium: 145.00, description: "24-port Cat 6/6A patch panel", mfg: { budget: "ICC", mid: "Panduit", premium: "Leviton" }, partNumber: { budget: "ICMPP0245E", mid: "CP24688TBL", premium: "49014-J24" } },
            patch_panel_48: { unit: "each", budget: 80.00, mid: 150.00, premium: 260.00, description: "48-port Cat 6/6A patch panel", mfg: { budget: "ICC", mid: "Panduit", premium: "Leviton" }, partNumber: { budget: "ICMPP0486E", mid: "CP48688TBL", premium: "49014-J48" } },
            patch_cord_3ft: { unit: "each", budget: 1.50, mid: 3.00, premium: 5.50, description: "Cat 6 patch cord 3ft", mfg: { budget: "ICC", mid: "Panduit", premium: "Leviton" }, partNumber: { budget: "ICPCSK03BL", mid: "UTPSP3BUY", premium: "62460-3L" } },
            patch_cord_5ft: { unit: "each", budget: 2.00, mid: 3.50, premium: 6.50, description: "Cat 6 patch cord 5ft", mfg: { budget: "ICC", mid: "Panduit", premium: "Leviton" }, partNumber: { budget: "ICPCSK05BL", mid: "UTPSP5BUY", premium: "62460-5L" } },
            patch_cord_7ft: { unit: "each", budget: 2.50, mid: 4.50, premium: 7.50, description: "Cat 6 patch cord 7ft", mfg: { budget: "ICC", mid: "Panduit", premium: "Leviton" }, partNumber: { budget: "ICPCSK07BL", mid: "UTPSP7BUY", premium: "62460-7L" } },
            patch_cord_10ft: { unit: "each", budget: 3.50, mid: 5.50, premium: 9.00, description: "Cat 6 patch cord 10ft", mfg: { budget: "ICC", mid: "Panduit", premium: "Leviton" }, partNumber: { budget: "ICPCSK10BL", mid: "UTPSP10BUY", premium: "62460-10L" } },
            patch_cord_6a_3ft: { unit: "each", budget: 3.50, mid: 6.50, premium: 11.00, description: "Cat 6A patch cord 3ft", mfg: { budget: "ICC", mid: "Panduit", premium: "Leviton" }, partNumber: { budget: "ICPCSK03BL6A", mid: "UTP6ASD3BUY", premium: "6210G-3L" } },
            patch_cord_6a_5ft: { unit: "each", budget: 4.50, mid: 7.50, premium: 12.50, description: "Cat 6A patch cord 5ft", mfg: { budget: "ICC", mid: "Panduit", premium: "Leviton" }, partNumber: { budget: "ICPCSK05BL6A", mid: "UTP6ASD5BUY", premium: "6210G-5L" } },
            patch_cord_6a_7ft: { unit: "each", budget: 5.50, mid: 9.00, premium: 14.50, description: "Cat 6A patch cord 7ft", mfg: { budget: "ICC", mid: "Panduit", premium: "Leviton" }, partNumber: { budget: "ICPCSK07BL6A", mid: "UTP6ASD7BUY", premium: "6210G-7L" } },
            patch_cord_6a_10ft: { unit: "each", budget: 7.00, mid: 11.00, premium: 17.00, description: "Cat 6A patch cord 10ft", mfg: { budget: "ICC", mid: "Panduit", premium: "Leviton" }, partNumber: { budget: "ICPCSK10BL6A", mid: "UTP6ASD10BUY", premium: "6210G-10L" } },
            fiber_patch_sm: { unit: "each", budget: 8.00, mid: 15.00, premium: 28.00, description: "SM LC-LC duplex fiber patch 3m", mfg: { budget: "Cleerline", mid: "Corning", premium: "Corning" }, partNumber: { budget: "SSFD9-LC-LC-3M", mid: "37-024-0F200003M", premium: "002U58-31121-03" } },
            fiber_patch_mm: { unit: "each", budget: 7.00, mid: 12.00, premium: 22.00, description: "MM LC-LC duplex fiber patch 3m", mfg: { budget: "Cleerline", mid: "Corning", premium: "Corning" }, partNumber: { budget: "SSFD5-LC-LC-3M", mid: "37-024-DF200003M", premium: "002A58-31121-03" } },
            fiber_enclosure_wall: { unit: "each", budget: 35.00, mid: 65.00, premium: 120.00, description: "Wall-mount fiber enclosure", mfg: { budget: "ICC", mid: "Corning", premium: "Corning" }, partNumber: { budget: "ICFOD104WM", mid: "WCH-02P", premium: "WCH-04P" } },
            fiber_enclosure_rack: { unit: "each", budget: 45.00, mid: 85.00, premium: 150.00, description: "Rack-mount fiber enclosure 1RU", mfg: { budget: "ICC", mid: "Corning", premium: "Corning" }, partNumber: { budget: "ICFORS1RM6", mid: "SPH-01P", premium: "CCH-01U" } },
            fiber_adapter_panel: { unit: "each", budget: 15.00, mid: 28.00, premium: 48.00, description: "LC adapter panel 6-pack", mfg: { budget: "ICC", mid: "Corning", premium: "Corning" }, partNumber: { budget: "ICFOPL16BK", mid: "CCH-CP06-A9", premium: "CCH-CP12-A9" } },
            fiber_connector_lc_sm: { unit: "each", budget: 4.50, mid: 8.00, premium: 14.00, description: "LC Singlemode fiber splice-on connector (fusion)", mfg: { budget: "Corning", mid: "Corning", premium: "Corning" }, partNumber: { budget: "95-050-41", mid: "95-050-41", premium: "95-050-41" } },
            fiber_connector_lc_mm: { unit: "each", budget: 4.00, mid: 7.00, premium: 12.00, description: "LC Multimode fiber splice-on connector (fusion)", mfg: { budget: "Corning", mid: "Corning", premium: "Corning" }, partNumber: { budget: "95-050-51", mid: "95-050-51", premium: "95-050-51" } },
            fiber_splice_tray: { unit: "each", budget: 8.00, mid: 15.00, premium: 25.00, description: "Fiber splice tray (holds 12 splices)", mfg: { budget: "ICC", mid: "Corning", premium: "Corning" }, partNumber: { budget: "ICFORS12ST", mid: "FT-SPLICE-TRAY", premium: "FT-SPLICE-TRAY" } },
        },
        racks: {
            rack_2post: { unit: "each", budget: 120.00, mid: 220.00, premium: 380.00, description: "2-post relay rack 7ft 45RU" },
            rack_4post: { unit: "each", budget: 280.00, mid: 480.00, premium: 850.00, description: "4-post equipment rack 42RU" },
            rack_4post_enclosed: { unit: "each", budget: 450.00, mid: 750.00, premium: 1400.00, description: "4-post enclosed cabinet 42RU w/ fans" },
            cabinet_7ft_42u: { unit: "each", budget: 800.00, mid: 1400.00, premium: 2400.00, description: "7ft floor-mount cabinet 42RU (84\"H × 24\"W × 42\"D) w/ locking doors, fans, casters" },
            wall_cabinet_6ru: { unit: "each", budget: 85.00, mid: 160.00, premium: 280.00, description: "Wall-mount cabinet 6RU" },
            wall_cabinet_12ru: { unit: "each", budget: 120.00, mid: 240.00, premium: 420.00, description: "Wall-mount cabinet 12RU" },
            wall_cabinet_18ru: { unit: "each", budget: 165.00, mid: 320.00, premium: 550.00, description: "Wall-mount cabinet 18RU" },
            cable_mgmt_horiz: { unit: "each", budget: 15.00, mid: 28.00, premium: 48.00, description: "Horizontal cable manager 1RU" },
            cable_mgmt_vert: { unit: "each", budget: 35.00, mid: 65.00, premium: 110.00, description: "Vertical cable manager (pair)" },
            blanking_panel_1ru: { unit: "each", budget: 3.00, mid: 6.00, premium: 12.00, description: "Blanking panel 1RU" },
            shelf_rack: { unit: "each", budget: 25.00, mid: 45.00, premium: 85.00, description: "Rack shelf 1RU" },
            pdu_basic: { unit: "each", budget: 45.00, mid: 85.00, premium: 180.00, description: "PDU basic vertical 20A" },
            pdu_metered: { unit: "each", budget: 120.00, mid: 250.00, premium: 480.00, description: "PDU metered/switched vertical 30A" },
        },
        pathway: {
            conduit_emt_075: { unit: "per 10ft", budget: 8.50, mid: 12.00, premium: 18.00, description: "3/4\" EMT conduit 10ft stick" },
            conduit_emt_100: { unit: "per 10ft", budget: 12.00, mid: 17.00, premium: 25.00, description: "1\" EMT conduit 10ft stick" },
            conduit_emt_125: { unit: "per 10ft", budget: 16.00, mid: 24.00, premium: 35.00, description: "1-1/4\" EMT conduit 10ft stick" },
            conduit_emt_150: { unit: "per 10ft", budget: 22.00, mid: 32.00, premium: 45.00, description: "1-1/2\" EMT conduit 10ft stick" },
            conduit_emt_200: { unit: "per 10ft", budget: 28.00, mid: 42.00, premium: 58.00, description: "2\" EMT conduit 10ft stick" },
            conduit_pvc_075: { unit: "per 10ft", budget: 4.50, mid: 7.00, premium: 12.00, description: "3/4\" PVC Schedule 40 10ft" },
            conduit_pvc_100: { unit: "per 10ft", budget: 6.00, mid: 9.50, premium: 16.00, description: "1\" PVC Schedule 40 10ft" },
            conduit_pvc_200: { unit: "per 10ft", budget: 12.00, mid: 18.00, premium: 28.00, description: "2\" PVC Schedule 40 10ft" },
            cable_tray_6in: { unit: "per ft", budget: 4.50, mid: 7.50, premium: 12.00, description: "Cable tray 6\" basket/ladder" },
            cable_tray_12in: { unit: "per ft", budget: 6.50, mid: 10.50, premium: 16.00, description: "Cable tray 12\" basket/ladder" },
            cable_tray_18in: { unit: "per ft", budget: 8.50, mid: 14.00, premium: 22.00, description: "Cable tray 18\" basket/ladder" },
            cable_tray_24in: { unit: "per ft", budget: 11.00, mid: 18.00, premium: 28.00, description: "Cable tray 24\" basket/ladder" },
            cable_tray_fitting: { unit: "each", budget: 12.00, mid: 22.00, premium: 38.00, description: "Cable tray fitting (elbow/tee/cross)" },
            ladder_rack_12in: { unit: "per ft", budget: 8.00, mid: 14.00, premium: 22.00, description: "Ladder rack / cable runway 12\" wide" },
            ladder_rack_18in: { unit: "per ft", budget: 10.00, mid: 18.00, premium: 28.00, description: "Ladder rack / cable runway 18\" wide" },
            ladder_rack_trapeze: { unit: "each", budget: 18.00, mid: 32.00, premium: 48.00, description: "Ladder rack trapeze/support kit (crossbar bracket)" },
            ladder_rack_splice: { unit: "each", budget: 6.00, mid: 12.00, premium: 18.00, description: "Ladder rack splice plate / butt splice" },
            ladder_rack_90_elbow: { unit: "each", budget: 35.00, mid: 65.00, premium: 95.00, description: "Ladder rack 90° horizontal elbow" },
            ladder_rack_tee: { unit: "each", budget: 40.00, mid: 75.00, premium: 110.00, description: "Ladder rack tee fitting" },
            ladder_rack_wall_bracket: { unit: "each", budget: 12.00, mid: 22.00, premium: 35.00, description: "Ladder rack wall bracket / wall support" },
            rack_to_runway_kit: { unit: "each", budget: 25.00, mid: 45.00, premium: 70.00, description: "Rack-to-runway mounting kit (runway to rack top transition)" },
            ground_lug: { unit: "each", budget: 3.00, mid: 6.00, premium: 10.00, description: "Ground lug / bonding bushing for ladder rack" },
            jhook_34: { unit: "each", budget: 1.25, mid: 2.50, premium: 4.50, description: "J-hook 3/4\" with beam clamp" },
            jhook_2in: { unit: "each", budget: 1.75, mid: 3.50, premium: 6.00, description: "J-hook 2\" with beam clamp" },
            jhook_4in: { unit: "each", budget: 2.50, mid: 4.50, premium: 7.50, description: "J-hook 4\" with beam clamp" },
            threaded_rod_10ft: { unit: "each", budget: 3.50, mid: 5.50, premium: 8.00, description: "3/8\" threaded rod 10ft" },
            beam_clamp: { unit: "each", budget: 1.00, mid: 2.00, premium: 3.50, description: "Beam clamp with nut" },
            firestop_putty: { unit: "each", budget: 8.00, mid: 14.00, premium: 22.00, description: "Firestop putty pad/pillow per penetration" },
            firestop_caulk: { unit: "each", budget: 12.00, mid: 20.00, premium: 32.00, description: "Firestop caulk + collar per sleeve" },
            box_4sq: { unit: "each", budget: 2.50, mid: 4.00, premium: 6.50, description: "4\" square box with ring" },
            mud_ring_1g: { unit: "each", budget: 0.75, mid: 1.50, premium: 2.50, description: "1-gang mud ring" },
            mud_ring_2g: { unit: "each", budget: 1.25, mid: 2.50, premium: 4.00, description: "2-gang mud ring" },
        },
        grounding: {
            tmgb: { unit: "each", budget: 85.00, mid: 150.00, premium: 280.00, description: "Telecom Main Grounding Busbar" },
            tgb: { unit: "each", budget: 45.00, mid: 85.00, premium: 160.00, description: "Telecom Grounding Busbar" },
            tbb_conductor: { unit: "per ft", budget: 1.80, mid: 3.00, premium: 5.00, description: "Bonding backbone conductor #6 AWG" },
            ground_lug: { unit: "each", budget: 3.50, mid: 6.00, premium: 10.00, description: "Grounding lug / compression connector" },
        },
        wap: {
            wap_indoor: { unit: "each", budget: 180.00, mid: 380.00, premium: 680.00, description: "Wireless access point (Wi-Fi 6/6E indoor)" },
            wap_outdoor: { unit: "each", budget: 280.00, mid: 520.00, premium: 950.00, description: "Wireless access point (outdoor rated)" },
            wap_mount: { unit: "each", budget: 8.00, mid: 15.00, premium: 28.00, description: "WAP ceiling mount bracket" },
        },
        testing: {
            cable_labels: { unit: "per 100", budget: 12.00, mid: 22.00, premium: 38.00, description: "Cable labels (100 pack)" },
            velcro_roll: { unit: "each", budget: 8.00, mid: 15.00, premium: 24.00, description: "Velcro cable wrap roll 75ft" },
        },
    },

    // ═══════════════════════════════════════════════════════════
    // CCTV / VIDEO SURVEILLANCE
    // ═══════════════════════════════════════════════════════════
    cctv: {
        cameras: {
            // Cluster-6A fix (2026-04-25): camera prices updated to 2026 distributor
            // values. Pre-fix mid-tier prices were ~50% below market (e.g., Axis P3265
            // was $380 listed, actual 2026 dist ~$700). Audit confirmed via Anixter,
            // Graybar, ADI 2026 spreadsheets. Premium-tier also bumped to reflect Q3538
            // and Q1786 actual 2026 pricing.
            fixed_indoor_dome: { unit: "each", budget: 180.00, mid: 420.00, premium: 780.00, description: "Fixed indoor dome camera 2-4MP", mfg: { budget: "Dahua", mid: "Axis", premium: "Axis" }, partNumber: { budget: "N44BJ52", mid: "M3106-L Mk II", premium: "P3268-LV" } },
            fixed_indoor_bullet: { unit: "each", budget: 165.00, mid: 390.00, premium: 720.00, description: "Fixed indoor bullet camera 2-4MP", mfg: { budget: "Dahua", mid: "Axis", premium: "Axis" }, partNumber: { budget: "N42BD62", mid: "M2036-LE Mk II", premium: "P1468-LE" } },
            fixed_outdoor_dome: { unit: "each", budget: 280.00, mid: 720.00, premium: 1450.00, description: "Fixed outdoor dome camera 4-8MP IP67", mfg: { budget: "Dahua", mid: "Axis", premium: "Axis" }, partNumber: { budget: "N45EJ52", mid: "P3265-LVE", premium: "Q3538-LVE" } },
            fixed_outdoor_bullet: { unit: "each", budget: 240.00, mid: 580.00, premium: 1100.00, description: "Fixed outdoor bullet camera 4-8MP IP67", mfg: { budget: "Dahua", mid: "Axis", premium: "Axis" }, partNumber: { budget: "N45EF52", mid: "P1465-LE", premium: "Q1786-LE" } },
            ptz_indoor: { unit: "each", budget: 350.00, mid: 850.00, premium: 2200.00, description: "PTZ camera indoor 2MP 30x", mfg: { budget: "Dahua", mid: "Axis", premium: "Axis" }, partNumber: { budget: "N45BY2Z", mid: "V5938", premium: "V5938-50 Hz" } },
            ptz_outdoor: { unit: "each", budget: 480.00, mid: 1200.00, premium: 3500.00, description: "PTZ camera outdoor 4MP 30x IP66", mfg: { budget: "Dahua", mid: "Axis", premium: "Axis" }, partNumber: { budget: "N49CL5Z", mid: "Q6315-LE", premium: "Q6318-LE" } },
            multisensor_180: { unit: "each", budget: 700.00, mid: 1400.00, premium: 2800.00, description: "Multi-sensor 180° panoramic 4x4MP", mfg: { budget: "Dahua", mid: "Axis", premium: "Axis" }, partNumber: { budget: "PSD81602-A360", mid: "P3738-PLE", premium: "P3738-PLE" } },
            multisensor_360: { unit: "each", budget: 900.00, mid: 1800.00, premium: 3500.00, description: "Multi-sensor 360° fisheye 12MP", mfg: { budget: "Dahua", mid: "Axis", premium: "Axis" }, partNumber: { budget: "N48DT62", mid: "P4708-PLVE", premium: "M4308-PLE" } },
            lpr_camera: { unit: "each", budget: 650.00, mid: 1500.00, premium: 3200.00, description: "LPR/ANPR camera with analytics", mfg: { budget: "Dahua", mid: "Axis", premium: "Axis" }, partNumber: { budget: "N45EY52", mid: "P1465-LE-3", premium: "P1468-LE" } },
            thermal_camera: { unit: "each", budget: 1200.00, mid: 2800.00, premium: 6500.00, description: "Thermal camera (perimeter detection)", mfg: { budget: "Dahua", mid: "Axis", premium: "Axis" }, partNumber: { budget: "DH-TPC-BF5421-T", mid: "Q2901-E", premium: "Q8752-E" } },
        },
        recording: {
            nvr_8ch: { unit: "each", budget: 350.00, mid: 650.00, premium: 1200.00, description: "NVR 8-channel with storage" },
            nvr_16ch: { unit: "each", budget: 550.00, mid: 1100.00, premium: 2200.00, description: "NVR 16-channel with storage" },
            nvr_32ch: { unit: "each", budget: 850.00, mid: 1800.00, premium: 3800.00, description: "NVR 32-channel with storage" },
            nvr_64ch: { unit: "each", budget: 1400.00, mid: 3200.00, premium: 6500.00, description: "NVR/VMS server 64-channel" },
            vms_license: { unit: "per camera", budget: 15.00, mid: 45.00, premium: 150.00, description: "VMS software license per camera" },
            hdd_4tb: { unit: "each", budget: 85.00, mid: 120.00, premium: 180.00, description: "Surveillance HDD 4TB" },
            hdd_8tb: { unit: "each", budget: 150.00, mid: 200.00, premium: 280.00, description: "Surveillance HDD 8TB" },
            hdd_16tb: { unit: "each", budget: 280.00, mid: 380.00, premium: 520.00, description: "Surveillance HDD 16TB" },
        },
        accessories: {
            monitor_22: { unit: "each", budget: 140.00, mid: 250.00, premium: 450.00, description: "22\" surveillance monitor" },
            monitor_32: { unit: "each", budget: 280.00, mid: 450.00, premium: 750.00, description: "32\" surveillance monitor" },
            monitor_43: { unit: "each", budget: 380.00, mid: 650.00, premium: 1100.00, description: "43\" surveillance monitor" },
            monitor_55: { unit: "each", budget: 480.00, mid: 850.00, premium: 1500.00, description: "55\" video wall display" },
            video_wall_controller: { unit: "each", budget: 800.00, mid: 1800.00, premium: 4500.00, description: "Video wall controller/processor" },
            poe_switch_8: { unit: "each", budget: 85.00, mid: 180.00, premium: 380.00, description: "PoE+ switch 8-port managed" },
            poe_switch_16: { unit: "each", budget: 180.00, mid: 350.00, premium: 680.00, description: "PoE+ switch 16-port managed" },
            // Cluster-6A fix (2026-04-25): switch prices reflect 2026 enterprise
            // distributor values. Mid-tier = Aruba/Cisco SMB managed PoE+; premium =
            // Cisco Catalyst 9300-24P / 9300-48P-E (current list ~$3500/$4500 dist).
            // Pre-fix premium tier of $950/$1500 was 60% below Catalyst dist pricing
            // and would systematically under-price IT-room hardware.
            poe_switch_24: { unit: "each", budget: 380.00, mid: 750.00, premium: 3500.00, description: "PoE+ switch 24-port managed (premium = Cisco Catalyst 9300)" },
            poe_switch_48: { unit: "each", budget: 580.00, mid: 1150.00, premium: 4500.00, description: "PoE+ switch 48-port managed (premium = Cisco Catalyst 9300)" },
            pole_mount_arm: { unit: "each", budget: 65.00, mid: 120.00, premium: 220.00, description: "Camera pole/wall mount arm" },
            pole_20ft: { unit: "each", budget: 350.00, mid: 650.00, premium: 1200.00, description: "Camera pole 20ft with base" },
            junction_box: { unit: "each", budget: 15.00, mid: 28.00, premium: 48.00, description: "Camera junction/back box" },
            midspan_injector: { unit: "each", budget: 25.00, mid: 48.00, premium: 85.00, description: "PoE midspan injector 30W" },
            midspan_60w: { unit: "each", budget: 45.00, mid: 85.00, premium: 150.00, description: "PoE++ midspan injector 60W" },
        },
    },

    // ═══════════════════════════════════════════════════════════
    // ACCESS CONTROL
    // ═══════════════════════════════════════════════════════════
    accessControl: {
        readers: {
            prox_reader: { unit: "each", budget: 45.00, mid: 95.00, premium: 180.00, description: "Proximity card reader (HID compatible)", mfg: { budget: "ZKTeco", mid: "HID", premium: "HID" }, partNumber: { budget: "KR500", mid: "920NTNTEK00000", premium: "920PTNNEK0000R" } },
            smart_reader: { unit: "each", budget: 85.00, mid: 180.00, premium: 350.00, description: "Smart card reader (iCLASS/SEOS/OSDP)", mfg: { budget: "ZKTeco", mid: "HID", premium: "HID" }, partNumber: { budget: "KR600", mid: "920NTNTEK00000", premium: "920PMNTEKMA0CG" } },
            multi_tech: { unit: "each", budget: 120.00, mid: 250.00, premium: 480.00, description: "Multi-tech reader (mobile + card)", mfg: { budget: "ZKTeco", mid: "HID", premium: "HID" }, partNumber: { budget: "KR600M", mid: "921NTNTEK00000", premium: "921PMNTEKMA0CG" } },
            biometric: { unit: "each", budget: 350.00, mid: 750.00, premium: 1500.00, description: "Biometric reader (fingerprint/face)", mfg: { budget: "ZKTeco", mid: "HID", premium: "HID" }, partNumber: { budget: "SpeedFace-V5L", mid: "iCLASS SE RB25F", premium: "iCLASS SE RB25F" } },
            keypad_reader: { unit: "each", budget: 65.00, mid: 140.00, premium: 280.00, description: "Keypad + card reader combo", mfg: { budget: "ZKTeco", mid: "HID", premium: "HID" }, partNumber: { budget: "KR502M", mid: "921NTNTEK0002J", premium: "921PTNNEK0002J" } },
            long_range: { unit: "each", budget: 280.00, mid: 550.00, premium: 1100.00, description: "Long-range reader (vehicle gate)", mfg: { budget: "ZKTeco", mid: "HID", premium: "HID" }, partNumber: { budget: "UHF5-Pro", mid: "maxiProx 5375", premium: "maxiProx 5375" } },
        },
        hardware: {
            electric_strike: { unit: "each", budget: 65.00, mid: 140.00, premium: 280.00, description: "Electric strike (fail-secure/fail-safe)" },
            maglock_600: { unit: "each", budget: 55.00, mid: 120.00, premium: 220.00, description: "Magnetic lock 600lb" },
            maglock_1200: { unit: "each", budget: 75.00, mid: 160.00, premium: 320.00, description: "Magnetic lock 1200lb" },
            elr_device: { unit: "each", budget: 450.00, mid: 850.00, premium: 1500.00, description: "Electric latch retraction device" },
            auto_operator: { unit: "each", budget: 1200.00, mid: 2200.00, premium: 4500.00, description: "Automatic door operator" },
            rex_pir: { unit: "each", budget: 18.00, mid: 35.00, premium: 65.00, description: "REX motion sensor (PIR)" },
            rex_button: { unit: "each", budget: 12.00, mid: 25.00, premium: 48.00, description: "REX push button" },
            door_contact: { unit: "each", budget: 8.00, mid: 16.00, premium: 32.00, description: "Door position sensor/contact" },
            door_closer: { unit: "each", budget: 45.00, mid: 95.00, premium: 220.00, description: "Door closer (commercial)" },
            delayed_egress: { unit: "each", budget: 350.00, mid: 650.00, premium: 1200.00, description: "Delayed egress device (15/30 sec)" },
            power_transfer_hinge: { unit: "each", budget: 65.00, mid: 120.00, premium: 220.00, description: "Electrified power transfer hinge" },
            gate_operator: { unit: "each", budget: 1500.00, mid: 3500.00, premium: 7500.00, description: "Gate operator (slide/swing)" },
        },
        panels: {
            panel_2door: { unit: "each", budget: 250.00, mid: 480.00, premium: 850.00, description: "Access control panel 2-door" },
            panel_4door: { unit: "each", budget: 380.00, mid: 720.00, premium: 1300.00, description: "Access control panel 4-door" },
            panel_8door: { unit: "each", budget: 550.00, mid: 1100.00, premium: 2200.00, description: "Access control panel 8-door" },
            power_supply_2a: { unit: "each", budget: 65.00, mid: 120.00, premium: 220.00, description: "Power supply 12/24VDC 2A w/ battery" },
            power_supply_4a: { unit: "each", budget: 95.00, mid: 180.00, premium: 320.00, description: "Power supply 12/24VDC 4A w/ battery" },
            power_supply_10a: { unit: "each", budget: 150.00, mid: 280.00, premium: 480.00, description: "Power supply 12/24VDC 10A w/ battery" },
            battery_7ah: { unit: "each", budget: 18.00, mid: 28.00, premium: 42.00, description: "Backup battery 12V 7Ah" },
            battery_18ah: { unit: "each", budget: 35.00, mid: 55.00, premium: 85.00, description: "Backup battery 12V 18Ah" },
            enclosure_large: { unit: "each", budget: 45.00, mid: 85.00, premium: 150.00, description: "Panel enclosure large (30x30)" },
        },
        credentials: {
            prox_card: { unit: "each", budget: 0.85, mid: 1.50, premium: 3.00, description: "Proximity card (HID compatible)" },
            smart_card: { unit: "each", budget: 3.50, mid: 6.00, premium: 12.00, description: "Smart card (iCLASS SE / SEOS)" },
            key_fob: { unit: "each", budget: 2.50, mid: 5.00, premium: 10.00, description: "Key fob" },
            mobile_license: { unit: "per user", budget: 1.00, mid: 2.00, premium: 5.00, description: "Mobile credential license (annual)" },
        },
        software: {
            ac_software_base: { unit: "each", budget: 150.00, mid: 500.00, premium: 2500.00, description: "Access control software base license" },
            ac_door_license: { unit: "per door", budget: 10.00, mid: 45.00, premium: 150.00, description: "Per-door software license" },
            visitor_mgmt: { unit: "each", budget: 200.00, mid: 500.00, premium: 2000.00, description: "Visitor management module" },
        },
        intercom: {
            intercom_station: { unit: "each", budget: 180.00, mid: 450.00, premium: 1200.00, description: "IP intercom station (SIP)" },
            intercom_master: { unit: "each", budget: 250.00, mid: 550.00, premium: 1500.00, description: "Master intercom station (with video)" },
        },
    },

    // ═══════════════════════════════════════════════════════════
    // FIRE ALARM
    // ═══════════════════════════════════════════════════════════
    fireAlarm: {
        initiating: {
            smoke_photo: { unit: "each", budget: 28.00, mid: 55.00, premium: 95.00, description: "Photoelectric smoke detector (addressable)" },
            smoke_multi: { unit: "each", budget: 45.00, mid: 85.00, premium: 150.00, description: "Multi-criteria smoke detector (addressable)" },
            heat_fixed: { unit: "each", budget: 22.00, mid: 42.00, premium: 75.00, description: "Fixed-temp heat detector (addressable)" },
            heat_ror: { unit: "each", budget: 28.00, mid: 52.00, premium: 90.00, description: "Rate-of-rise heat detector (addressable)" },
            pull_station: { unit: "each", budget: 35.00, mid: 55.00, premium: 95.00, description: "Manual pull station (addressable)" },
            duct_detector: { unit: "each", budget: 120.00, mid: 220.00, premium: 380.00, description: "Duct smoke detector w/ housing, test/reset" },
            beam_detector: { unit: "each", budget: 450.00, mid: 850.00, premium: 1500.00, description: "Beam detector (high ceilings)" },
            waterflow: { unit: "each", budget: 85.00, mid: 150.00, premium: 250.00, description: "Waterflow switch" },
            tamper_switch: { unit: "each", budget: 35.00, mid: 65.00, premium: 110.00, description: "Tamper/supervisory switch" },
            detector_base: { unit: "each", budget: 6.00, mid: 12.00, premium: 22.00, description: "Detector base / mounting base" },
        },
        notification: {
            horn_strobe_wall: { unit: "each", budget: 28.00, mid: 55.00, premium: 95.00, description: "Horn/strobe wall mount" },
            horn_strobe_ceil: { unit: "each", budget: 32.00, mid: 62.00, premium: 105.00, description: "Horn/strobe ceiling mount" },
            strobe_only: { unit: "each", budget: 25.00, mid: 48.00, premium: 85.00, description: "Strobe only (visual notification)" },
            speaker_strobe: { unit: "each", budget: 55.00, mid: 105.00, premium: 180.00, description: "Speaker/strobe (voice evac)" },
            chime_strobe: { unit: "each", budget: 35.00, mid: 65.00, premium: 110.00, description: "Chime/strobe" },
            outdoor_horn_strobe: { unit: "each", budget: 85.00, mid: 150.00, premium: 250.00, description: "Outdoor rated horn/strobe" },
            mini_horn: { unit: "each", budget: 15.00, mid: 28.00, premium: 48.00, description: "Mini horn (above-ceiling/mechanical)" },
        },
        panels: {
            facp_small: { unit: "each", budget: 1200.00, mid: 2500.00, premium: 5000.00, description: "FACP small (125 points)" },
            facp_medium: { unit: "each", budget: 2500.00, mid: 5000.00, premium: 9500.00, description: "FACP medium (250 points)" },
            facp_large: { unit: "each", budget: 4500.00, mid: 8500.00, premium: 16000.00, description: "FACP large (500+ points, network)" },
            annunciator: { unit: "each", budget: 350.00, mid: 650.00, premium: 1200.00, description: "Remote annunciator" },
            nac_booster: { unit: "each", budget: 250.00, mid: 450.00, premium: 800.00, description: "NAC extender/booster panel" },
            monitor_module: { unit: "each", budget: 22.00, mid: 42.00, premium: 75.00, description: "Monitor module (addressable)" },
            control_module: { unit: "each", budget: 28.00, mid: 55.00, premium: 95.00, description: "Control/relay module (addressable)" },
            isolator_module: { unit: "each", budget: 25.00, mid: 48.00, premium: 85.00, description: "Isolator module (SLC)" },
            dialer_cell: { unit: "each", budget: 120.00, mid: 220.00, premium: 380.00, description: "Cellular communicator/dialer" },
            battery_facp: { unit: "each", budget: 45.00, mid: 75.00, premium: 120.00, description: "FACP battery set (2x 12V)" },
        },
        wire: {
            fa_wire_182: { unit: "per ft", budget: 0.08, mid: 0.12, premium: 0.18, description: "Fire alarm wire 18/2 FPLP" },
            fa_wire_184: { unit: "per ft", budget: 0.12, mid: 0.18, premium: 0.28, description: "Fire alarm wire 18/4 FPLP" },
            fa_wire_144: { unit: "per ft", budget: 0.14, mid: 0.22, premium: 0.32, description: "Fire alarm wire 14/4 FPLP (NAC)" },
            fa_wire_122: { unit: "per ft", budget: 0.16, mid: 0.24, premium: 0.36, description: "Fire alarm wire 12/2 FPLP (NAC)" },
        },
    },

    // ═══════════════════════════════════════════════════════════
    // INTRUSION DETECTION
    // ═══════════════════════════════════════════════════════════
    intrusionDetection: {
        sensors: {
            motion_pir: { unit: "each", budget: 22.00, mid: 45.00, premium: 85.00, description: "PIR motion detector" },
            motion_dual: { unit: "each", budget: 45.00, mid: 85.00, premium: 160.00, description: "Dual-tech motion detector (PIR+MW)" },
            door_contact: { unit: "each", budget: 6.00, mid: 12.00, premium: 22.00, description: "Surface mount door contact" },
            recessed_contact: { unit: "each", budget: 8.00, mid: 16.00, premium: 28.00, description: "Recessed door contact" },
            glass_break: { unit: "each", budget: 25.00, mid: 48.00, premium: 85.00, description: "Glass break sensor (acoustic)" },
            shock_sensor: { unit: "each", budget: 35.00, mid: 65.00, premium: 120.00, description: "Shock/vibration sensor" },
            beam_sensor: { unit: "each", budget: 180.00, mid: 350.00, premium: 650.00, description: "Photoelectric beam sensor (outdoor)" },
        },
        panels: {
            panel_8zone: { unit: "each", budget: 150.00, mid: 320.00, premium: 600.00, description: "Intrusion panel 8-zone" },
            panel_16zone: { unit: "each", budget: 250.00, mid: 480.00, premium: 900.00, description: "Intrusion panel 16-zone" },
            panel_32zone: { unit: "each", budget: 380.00, mid: 720.00, premium: 1400.00, description: "Intrusion panel 32-zone" },
            keypad_basic: { unit: "each", budget: 45.00, mid: 85.00, premium: 160.00, description: "Alphanumeric keypad" },
            keypad_touch: { unit: "each", budget: 85.00, mid: 180.00, premium: 350.00, description: "Touchscreen keypad" },
            siren_indoor: { unit: "each", budget: 12.00, mid: 25.00, premium: 48.00, description: "Indoor siren/strobe" },
            siren_outdoor: { unit: "each", budget: 35.00, mid: 65.00, premium: 120.00, description: "Outdoor siren/strobe" },
            cell_communicator: { unit: "each", budget: 80.00, mid: 150.00, premium: 280.00, description: "Cellular alarm communicator" },
            transformer: { unit: "each", budget: 8.00, mid: 15.00, premium: 25.00, description: "Plug-in transformer 16.5VAC" },
        },
        wire: {
            alarm_wire_224: { unit: "per ft", budget: 0.06, mid: 0.10, premium: 0.15, description: "Alarm wire 22/4 stranded" },
            alarm_wire_226: { unit: "per ft", budget: 0.08, mid: 0.13, premium: 0.20, description: "Alarm wire 22/6 stranded" },
            access_control_186: { unit: "per ft", budget: 0.12, mid: 0.18, premium: 0.28, description: "Access control wire 18/6 shielded" },
            access_control_182: { unit: "per ft", budget: 0.08, mid: 0.12, premium: 0.18, description: "Access control wire 18/2" },
        },
    },

    // ═══════════════════════════════════════════════════════════
    // AUDIO VISUAL
    // ═══════════════════════════════════════════════════════════
    audioVisual: {
        displays: {
            display_55: { unit: "each", budget: 450.00, mid: 850.00, premium: 1800.00, description: "55\" commercial display" },
            display_65: { unit: "each", budget: 650.00, mid: 1200.00, premium: 2500.00, description: "65\" commercial display" },
            display_75: { unit: "each", budget: 950.00, mid: 1800.00, premium: 3500.00, description: "75\" commercial display" },
            display_86: { unit: "each", budget: 1400.00, mid: 2800.00, premium: 5500.00, description: "86\" commercial display" },
            display_98: { unit: "each", budget: 3500.00, mid: 6500.00, premium: 12000.00, description: "98\" commercial display" },
            interactive_65: { unit: "each", budget: 1800.00, mid: 3500.00, premium: 6500.00, description: "65\" interactive display/whiteboard" },
            interactive_75: { unit: "each", budget: 2500.00, mid: 4500.00, premium: 8500.00, description: "75\" interactive display/whiteboard" },
            interactive_86: { unit: "each", budget: 3200.00, mid: 5500.00, premium: 10000.00, description: "86\" interactive display/whiteboard" },
            projector_std: { unit: "each", budget: 450.00, mid: 950.00, premium: 2200.00, description: "Projector standard throw 4000lm" },
            projector_short: { unit: "each", budget: 650.00, mid: 1400.00, premium: 3000.00, description: "Projector short-throw 4000lm" },
            projector_ust: { unit: "each", budget: 1200.00, mid: 2500.00, premium: 5000.00, description: "Projector ultra-short-throw" },
            projector_laser: { unit: "each", budget: 2500.00, mid: 5000.00, premium: 12000.00, description: "Projector laser 6000+ lm" },
            screen_manual: { unit: "each", budget: 120.00, mid: 250.00, premium: 500.00, description: "Projection screen manual pull-down" },
            screen_electric: { unit: "each", budget: 350.00, mid: 650.00, premium: 1400.00, description: "Projection screen motorized" },
            display_mount: { unit: "each", budget: 45.00, mid: 95.00, premium: 200.00, description: "TV/display wall mount (tilt/fixed)" },
            display_cart: { unit: "each", budget: 180.00, mid: 350.00, premium: 650.00, description: "Mobile display cart" },
            projector_mount: { unit: "each", budget: 55.00, mid: 120.00, premium: 250.00, description: "Projector ceiling mount" },
        },
        audio: {
            speaker_ceiling: { unit: "each", budget: 35.00, mid: 85.00, premium: 180.00, description: "Ceiling speaker 70V/100V" },
            speaker_wall: { unit: "each", budget: 55.00, mid: 120.00, premium: 280.00, description: "Wall-mount speaker" },
            speaker_pendant: { unit: "each", budget: 85.00, mid: 180.00, premium: 380.00, description: "Pendant speaker (open ceiling)" },
            speaker_outdoor: { unit: "each", budget: 85.00, mid: 180.00, premium: 380.00, description: "Outdoor speaker (landscape/patio)" },
            soundbar: { unit: "each", budget: 120.00, mid: 280.00, premium: 600.00, description: "Soundbar (conference/huddle)" },
            amplifier_70v: { unit: "each", budget: 180.00, mid: 380.00, premium: 750.00, description: "70V amplifier (1-zone)" },
            amplifier_multi: { unit: "each", budget: 450.00, mid: 850.00, premium: 1800.00, description: "Multi-zone amplifier (4-8 zones)" },
            dsp: { unit: "each", budget: 550.00, mid: 1200.00, premium: 3000.00, description: "DSP (digital signal processor)" },
            mixer: { unit: "each", budget: 250.00, mid: 550.00, premium: 1200.00, description: "Audio mixer" },
            mic_ceiling: { unit: "each", budget: 85.00, mid: 220.00, premium: 550.00, description: "Ceiling microphone array" },
            mic_table: { unit: "each", budget: 45.00, mid: 120.00, premium: 350.00, description: "Tabletop microphone" },
            mic_wireless: { unit: "each", budget: 180.00, mid: 450.00, premium: 1200.00, description: "Wireless microphone system" },
        },
        control: {
            touch_panel_7: { unit: "each", budget: 250.00, mid: 650.00, premium: 1500.00, description: "7\" touch panel (wall mount)" },
            touch_panel_10: { unit: "each", budget: 450.00, mid: 1100.00, premium: 2500.00, description: "10\" touch panel (wall mount)" },
            control_processor: { unit: "each", budget: 350.00, mid: 850.00, premium: 2200.00, description: "Control system processor" },
            keypad_av: { unit: "each", budget: 120.00, mid: 280.00, premium: 600.00, description: "AV keypad controller" },
            occupancy_sensor: { unit: "each", budget: 35.00, mid: 75.00, premium: 150.00, description: "Occupancy sensor (AV trigger)" },
        },
        conferencing: {
            video_bar: { unit: "each", budget: 350.00, mid: 850.00, premium: 2500.00, description: "Video conferencing bar (all-in-one)" },
            codec: { unit: "each", budget: 1500.00, mid: 3500.00, premium: 8000.00, description: "Video conferencing codec" },
            conf_camera: { unit: "each", budget: 350.00, mid: 850.00, premium: 2200.00, description: "Conference camera (USB/IP)" },
            conf_speakerphone: { unit: "each", budget: 120.00, mid: 350.00, premium: 850.00, description: "Conference speakerphone" },
            wireless_pres: { unit: "each", budget: 250.00, mid: 550.00, premium: 1200.00, description: "Wireless presentation system" },
            byod_hub: { unit: "each", budget: 150.00, mid: 350.00, premium: 750.00, description: "BYOD/HDMI table hub" },
        },
        signage: {
            signage_player: { unit: "each", budget: 120.00, mid: 280.00, premium: 600.00, description: "Digital signage media player" },
            signage_license: { unit: "per display/yr", budget: 50.00, mid: 150.00, premium: 400.00, description: "Digital signage CMS license" },
            signage_mount: { unit: "each", budget: 45.00, mid: 95.00, premium: 200.00, description: "Signage display mount" },
        },
        infrastructure: {
            av_rack: { unit: "each", budget: 280.00, mid: 550.00, premium: 1100.00, description: "AV equipment rack (credenza/closet)" },
            av_table_box: { unit: "each", budget: 85.00, mid: 180.00, premium: 380.00, description: "AV table/floor box (HDMI, power, USB)" },
            wall_plate_av: { unit: "each", budget: 15.00, mid: 35.00, premium: 75.00, description: "AV wall plate (HDMI, USB-C, etc.)" },
            hdmi_cable: { unit: "each", budget: 8.00, mid: 18.00, premium: 45.00, description: "HDMI cable (6-15ft, CL2/3 rated)" },
            hdmi_over_cat: { unit: "each", budget: 85.00, mid: 180.00, premium: 380.00, description: "HDMI over Cat extender set (TX+RX)" },
            usbc_cable: { unit: "each", budget: 12.00, mid: 25.00, premium: 55.00, description: "USB-C cable (6-15ft)" },
        },
    },

    // ═══════════════════════════════════════════════════════════
    // DIVISION 08 — OPENINGS (Electrified Door Hardware)
    // Items specific to LV contractor's scope within Div 08
    // ═══════════════════════════════════════════════════════════
    openings: {
        electrifiedHardware: {
            electric_strike_std: { unit: "each", budget: 65.00, mid: 140.00, premium: 280.00, description: "Electric strike standard (fail-secure)", mfg: { budget: "SDC", mid: "HES", premium: "Von Duprin" }, partNumber: { budget: "45-A", mid: "9600-12/24-630", premium: "6211WF" } },
            electric_strike_hd: { unit: "each", budget: 120.00, mid: 240.00, premium: 450.00, description: "Electric strike heavy-duty (storefront)", mfg: { budget: "SDC", mid: "HES", premium: "Von Duprin" }, partNumber: { budget: "55-CU", mid: "9500-12/24-630", premium: "6211AL" } },
            maglock_600lb: { unit: "each", budget: 55.00, mid: 120.00, premium: 220.00, description: "Electromagnetic lock 600lb", mfg: { budget: "SDC", mid: "Securitron", premium: "Securitron" }, partNumber: { budget: "1511S", mid: "M62B", premium: "M82BL" } },
            maglock_1200lb: { unit: "each", budget: 75.00, mid: 160.00, premium: 320.00, description: "Electromagnetic lock 1200lb", mfg: { budget: "SDC", mid: "Securitron", premium: "Securitron" }, partNumber: { budget: "1571S", mid: "M82B", premium: "M82BGL" } },
            elr_device: { unit: "each", budget: 450.00, mid: 850.00, premium: 1500.00, description: "Electric latch retraction device", mfg: { budget: "SDC", mid: "Von Duprin", premium: "Von Duprin" }, partNumber: { budget: "LR100", mid: "EL99", premium: "EL9927" } },
            auto_operator: { unit: "each", budget: 1200.00, mid: 2200.00, premium: 4500.00, description: "Automatic door operator (ADA)", mfg: { budget: "BEA", mid: "Norton", premium: "Besam/ASSA" }, partNumber: { budget: "PUSH-N-GO", mid: "5800", premium: "SW200i" } },
            power_transfer: { unit: "each", budget: 65.00, mid: 120.00, premium: 220.00, description: "Electrified power transfer hinge", mfg: { budget: "McKinney", mid: "Hager", premium: "McKinney" }, partNumber: { budget: "QC-C4400", mid: "1257", premium: "QC-12" } },
            electric_hinge: { unit: "each", budget: 85.00, mid: 165.00, premium: 300.00, description: "Electric hinge (concealed wiring)", mfg: { budget: "Hager", mid: "Hager", premium: "Stainless" }, partNumber: { budget: "1108", mid: "1168", premium: "BB1279" } },
            delayed_egress: { unit: "each", budget: 350.00, mid: 650.00, premium: 1200.00, description: "Delayed egress device (15/30 sec)", mfg: { budget: "SDC", mid: "Securitron", premium: "Von Duprin" }, partNumber: { budget: "1511SDE", mid: "EEB2", premium: "XP-1" } },
            door_closer_elec: { unit: "each", budget: 120.00, mid: 250.00, premium: 480.00, description: "Electrified door closer (hold-open)", mfg: { budget: "Yale", mid: "LCN", premium: "Norton" }, partNumber: { budget: "2721", mid: "4041DEL", premium: "7500HO" } },
            gate_operator_slide: { unit: "each", budget: 1500.00, mid: 3500.00, premium: 7500.00, description: "Gate operator — slide gate", mfg: { budget: "LiftMaster", mid: "DoorKing", premium: "HySecurity" }, partNumber: { budget: "CSL24U", mid: "9050-380", premium: "SlideSmart HD25" } },
            gate_operator_swing: { unit: "each", budget: 1800.00, mid: 4000.00, premium: 8500.00, description: "Gate operator — swing gate", mfg: { budget: "LiftMaster", mid: "DoorKing", premium: "HySecurity" }, partNumber: { budget: "RSW12U", mid: "9100-080", premium: "SwingSmart DCS" } },
            barrier_arm: { unit: "each", budget: 1200.00, mid: 2800.00, premium: 5500.00, description: "Barrier arm / vehicle gate", mfg: { budget: "LiftMaster", mid: "DoorKing", premium: "FAAC" }, partNumber: { budget: "BG770", mid: "1601-080", premium: "B680H" } },
            vehicle_loop: { unit: "each", budget: 85.00, mid: 150.00, premium: 280.00, description: "Vehicle detection loop (saw-cut)", mfg: { budget: "EMX", mid: "EMX", premium: "BEA" }, partNumber: { budget: "ULP-4x8", mid: "ULP-6x10", premium: "LOOP 10" } },
            loop_detector: { unit: "each", budget: 65.00, mid: 120.00, premium: 220.00, description: "Loop detector module (single channel)", mfg: { budget: "EMX", mid: "EMX", premium: "BEA" }, partNumber: { budget: "D-TEK", mid: "IRB-RET", premium: "MATRIX-D" } },
        },
    },

    // ═══════════════════════════════════════════════════════════
    // AUDIT FIX #9: NURSE CALL SYSTEM
    // ═══════════════════════════════════════════════════════════
    nurseCall: {
        stations: {
            master_station: { unit: "each", budget: 1200.00, mid: 2400.00, premium: 4500.00, description: "Nurse call master station (central console)", mfg: { budget: "TekTone", mid: "Rauland", premium: "Hill-Rom" } },
            patient_station: { unit: "each", budget: 85.00, mid: 180.00, premium: 350.00, description: "Patient bedside station (pillow speaker/call cord)", mfg: { budget: "TekTone", mid: "Rauland", premium: "Hill-Rom" } },
            staff_station: { unit: "each", budget: 65.00, mid: 140.00, premium: 280.00, description: "Staff duty station / staff console", mfg: { budget: "TekTone", mid: "Rauland", premium: "Hill-Rom" } },
            corridor_dome: { unit: "each", budget: 35.00, mid: 75.00, premium: 150.00, description: "Corridor dome light (LED, single/multi-color)", mfg: { budget: "TekTone", mid: "Rauland", premium: "Hill-Rom" } },
            pull_cord_station: { unit: "each", budget: 55.00, mid: 120.00, premium: 240.00, description: "Pull cord station (bathroom/shower)", mfg: { budget: "TekTone", mid: "Rauland", premium: "Hill-Rom" } },
            code_blue_station: { unit: "each", budget: 95.00, mid: 200.00, premium: 400.00, description: "Code Blue emergency station", mfg: { budget: "TekTone", mid: "Rauland", premium: "Hill-Rom" } },
            staff_wearable: { unit: "each", budget: 120.00, mid: 250.00, premium: 500.00, description: "Staff wearable badge / wireless locator", mfg: { budget: "TekTone", mid: "Rauland", premium: "Hill-Rom" } },
        },
        infrastructure: {
            controller: { unit: "each", budget: 2500.00, mid: 5000.00, premium: 9500.00, description: "Nurse call system controller / processor", mfg: { budget: "TekTone", mid: "Rauland", premium: "Hill-Rom" } },
            power_supply: { unit: "each", budget: 150.00, mid: 300.00, premium: 550.00, description: "Nurse call power supply", mfg: { budget: "TekTone", mid: "Rauland", premium: "Hill-Rom" } },
            zone_module: { unit: "each", budget: 80.00, mid: 160.00, premium: 320.00, description: "Zone/floor expansion module", mfg: { budget: "TekTone", mid: "Rauland", premium: "Hill-Rom" } },
        },
        wire: {
            nc_cable: { unit: "per ft", budget: 0.12, mid: 0.20, premium: 0.30, description: "Nurse call cable (shielded multipair)" },
        },
    },

    // ═══════════════════════════════════════════════════════════
    // AUDIT FIX #10: PAGING / MASS NOTIFICATION SYSTEM (MNS)
    // ═══════════════════════════════════════════════════════════
    pagingMNS: {
        speakers: {
            ceiling_speaker: { unit: "each", budget: 18.00, mid: 35.00, premium: 65.00, description: "Ceiling speaker 8\" 70V", mfg: { budget: "Atlas Sound", mid: "Atlas Sound", premium: "Bose" } },
            wall_baffle: { unit: "each", budget: 22.00, mid: 45.00, premium: 85.00, description: "Wall baffle speaker 70V", mfg: { budget: "Atlas Sound", mid: "Atlas Sound", premium: "Bose" } },
            horn_speaker: { unit: "each", budget: 28.00, mid: 55.00, premium: 110.00, description: "Horn/re-entrant speaker (outdoor/high-noise)", mfg: { budget: "Atlas Sound", mid: "Atlas Sound", premium: "Bose" } },
            speaker_strobe: { unit: "each", budget: 85.00, mid: 180.00, premium: 350.00, description: "Speaker/strobe combo (MNS)", mfg: { budget: "Wheelock", mid: "System Sensor", premium: "Eaton" } },
        },
        amplifiers: {
            amp_60w: { unit: "each", budget: 250.00, mid: 480.00, premium: 850.00, description: "Paging amplifier 60W 70V" },
            amp_120w: { unit: "each", budget: 380.00, mid: 720.00, premium: 1200.00, description: "Paging amplifier 120W 70V" },
            amp_240w: { unit: "each", budget: 550.00, mid: 1050.00, premium: 1800.00, description: "Paging amplifier 240W 70V" },
        },
        infrastructure: {
            paging_controller: { unit: "each", budget: 800.00, mid: 1800.00, premium: 3500.00, description: "IP paging controller/server" },
            zone_controller: { unit: "each", budget: 350.00, mid: 650.00, premium: 1200.00, description: "Zone paging controller" },
            microphone_desk: { unit: "each", budget: 65.00, mid: 140.00, premium: 280.00, description: "Desktop paging microphone" },
            volume_control: { unit: "each", budget: 12.00, mid: 25.00, premium: 48.00, description: "Volume attenuator (wall-mount)" },
        },
        wire: {
            speaker_wire_162: { unit: "per ft", budget: 0.08, mid: 0.14, premium: 0.22, description: "Speaker wire 16/2 plenum" },
            speaker_wire_142: { unit: "per ft", budget: 0.10, mid: 0.18, premium: 0.28, description: "Speaker wire 14/2 plenum" },
        },
    },

    // ═══════════════════════════════════════════════════════════
    // AUDIT FIX #18: DISTRIBUTED ANTENNA SYSTEM (DAS)
    // ═══════════════════════════════════════════════════════════
    das: {
        headEnd: {
            bda_repeater: { unit: "each", budget: 8000.00, mid: 15000.00, premium: 28000.00, description: "Bi-directional amplifier (BDA/repeater)", mfg: { budget: "SureCall", mid: "SOLiD", premium: "CommScope" } },
            signal_source: { unit: "each", budget: 2500.00, mid: 5000.00, premium: 12000.00, description: "Signal source / donor antenna system" },
            das_headend: { unit: "each", budget: 15000.00, mid: 35000.00, premium: 75000.00, description: "Active DAS head-end unit", mfg: { budget: "SureCall", mid: "SOLiD", premium: "CommScope" } },
        },
        distribution: {
            remote_unit: { unit: "each", budget: 800.00, mid: 1800.00, premium: 3500.00, description: "DAS remote unit / node" },
            indoor_antenna: { unit: "each", budget: 45.00, mid: 95.00, premium: 180.00, description: "Indoor omnidirectional antenna (ceiling)" },
            outdoor_antenna_donor: { unit: "each", budget: 120.00, mid: 280.00, premium: 550.00, description: "Outdoor donor/Yagi antenna" },
            splitter_2way: { unit: "each", budget: 25.00, mid: 48.00, premium: 85.00, description: "RF splitter 2-way" },
            splitter_4way: { unit: "each", budget: 35.00, mid: 65.00, premium: 120.00, description: "RF splitter 4-way" },
            tappers: { unit: "each", budget: 30.00, mid: 55.00, premium: 95.00, description: "Directional coupler/tapper" },
        },
        cable: {
            coax_half_inch: { unit: "per ft", budget: 1.20, mid: 2.00, premium: 3.20, description: "1/2\" plenum-rated coax (DAS backbone)" },
            coax_78_inch: { unit: "per ft", budget: 2.50, mid: 4.00, premium: 6.50, description: "7/8\" coax (DAS riser/backbone)" },
            fiber_das: { unit: "per ft", budget: 0.45, mid: 0.75, premium: 1.20, description: "Fiber for DAS (SM OS2 6-strand)" },
        },
        testing: {
            rf_survey: { unit: "each", budget: 2500.00, mid: 5000.00, premium: 10000.00, description: "RF site survey and signal analysis" },
            ibwave_design: { unit: "each", budget: 3000.00, mid: 6000.00, premium: 12000.00, description: "iBwave DAS design and modeling" },
        },
    },

    // ═══════════════════════════════════════════════════════════
    // DEFAULT LABOR RATES (user-configurable)
    // ═══════════════════════════════════════════════════════════
    laborRates: {
        standard: {
            journeyman: { rate: 38.00, description: "Journeyman Technician" },
            lead: { rate: 45.00, description: "Lead Technician" },
            foreman: { rate: 52.00, description: "Foreman" },
            apprentice: { rate: 22.00, description: "Apprentice" },
            pm: { rate: 75.00, description: "Project Manager (on-site)" },
            programmer: { rate: 65.00, description: "Programmer / Commissioning Tech" },
        },
        burden: {
            rate: 38, // percentage on top of base rate (7.65+0.6+3.5+11+5+6.25+2+2=38%)
            components: {
                fica: 7.65,
                futa: 0.60,
                suta: 3.50,
                workers_comp: 11.00,
                general_liability: 5.00,
                health_insurance: 6.25,
                retirement: 2.00,
                other: 2.00,
            },
        },
        // ═══════════════════════════════════════════════════════════
        // DEFAULT MARKUPS — SINGLE SOURCE OF TRUTH
        // Every other file that defaults markup percentages MUST mirror
        // these values. Searchable anchor: DEFAULT_MARKUPS_SSOT.
        // Changed v5.128.1: subcontractor 10 → 15 (company standard).
        // ═══════════════════════════════════════════════════════════
        markup: {
            material: 50, // percentage markup
            labor: 50,
            equipment: 15,
            subcontractor: 15,
        },
    },

    // ═══════════════════════════════════════════════════════════
    // REGIONAL COST MULTIPLIERS
    // ═══════════════════════════════════════════════════════════
    regionalMultipliers: {
        "national_average": 1.00,
        "northeast": 1.20,
        "new_york_city": 1.45,
        "boston": 1.30,
        "dc_metro": 1.25,
        "southeast": 0.90,
        "miami": 1.05,
        "atlanta": 0.95,
        "midwest": 0.95,
        "chicago": 1.15,
        "southwest": 0.95,
        "dallas_houston": 0.95,
        "austin": 1.00,
        "mountain": 0.95,
        "denver": 1.05,
        "west_coast": 1.25,
        "los_angeles": 1.30,
        "san_francisco": 1.50,
        "sacramento": 1.10,
        "seattle": 1.20,
        "hawaii": 1.40,
        "alaska": 1.35,
    },

    // ═══════════════════════════════════════════════════════════
    // PROJECT TYPE MULTIPLIERS — Equipment & labor cost factors
    // Transit/railroad equipment is vandal-rated, extreme-temp,
    // and requires specialized mounting, increasing costs 2-3×
    // ═══════════════════════════════════════════════════════════
    projectTypeMultipliers: {
        "transit_railroad": {
            label: "Transit / Railroad (Amtrak, BART, Metro, BNSF, UP)",
            // Cluster-1G fix (2026-04-25): equipment_multiplier reduced from 2.5
            // to 1.30. Transit-rated hardware (IK10/IP67/vandal) is genuinely
            // ~25-40% premium over commercial cameras, NOT 150% premium. The 2.5×
            // value was inflating bids; combined with the 50% material markup
            // and the SAGE 1.51× transit override, materials were stacking to
            // ~3.75× base. Industry norm for transit hardening: 1.3-1.6× max.
            // labor_multiplier kept at 1.8 (Davis-Bacon prevailing wage).
            equipment_multiplier: 1.30,  // (was 2.5 — see Cluster-1G fix)
            labor_multiplier: 1.8,       // Restricted work windows, flagmen waits, safety protocols
            min_camera_cost: 1500,       // Minimum cost per camera (transit-rated IK10 dome minimum)
            min_nvr_cost: 3000,          // Minimum cost per NVR (enterprise-grade with RAID)
            min_switch_cost: 800,        // Minimum cost per managed switch
            // Transit projects have higher markups due to complexity, insurance, and compliance
            markup_overrides: {
                material: 51.424,    // SAGE ERP factor 1.51424× — verified from Emeryville/Martinez transit bids
                labor: 39.24,        // SAGE ERP factor 1.39240× — verified from Sam Brennan, 500 Capitol, Indians
                equipment: 25,       // 25% — specialized rental (track-rated lifts, generators)
                subcontractor: 15,   // 15% — railroad subs command premium pricing
            },
            // Duration multiplier for restricted work windows (2-4 hr windows = ~2× duration)
            duration_multiplier: 1.75,
            // Mobilization multiplier (rail sites have severe access constraints)
            mob_demob_multiplier: 2.0,
            notes: "All equipment must be transit-rated. Labor includes RWIC wait time, safety briefings, restricted access."
        },
        "government_institutional": {
            label: "Government / Institutional (federal, state, municipal, courthouse)",
            equipment_multiplier: 1.5,
            labor_multiplier: 1.3,
            min_camera_cost: 800,
            min_nvr_cost: 2000,
            min_switch_cost: 500,
            notes: "NDAA-compliant equipment required. Background checks, security clearances add to labor."
        },
        "healthcare": {
            label: "Healthcare (hospital, clinic, medical center)",
            equipment_multiplier: 1.4,
            labor_multiplier: 1.2,
            min_camera_cost: 600,
            min_nvr_cost: 1500,
            min_switch_cost: 400,
            notes: "HIPAA considerations, infection control protocols, after-hours work requirements."
        },
        "education_k12": {
            label: "Education K-12 (school district)",
            equipment_multiplier: 1.2,
            labor_multiplier: 1.1,
            min_camera_cost: 400,
            min_nvr_cost: 1200,
            min_switch_cost: 350,
            notes: "Summer/break installation windows, CIPA compliance."
        },
        "data_center": {
            label: "Data Center / Mission Critical",
            equipment_multiplier: 1.6,
            labor_multiplier: 1.4,
            min_camera_cost: 800,
            min_nvr_cost: 4000,
            min_switch_cost: 1200,
            notes: "Hot/cold aisle considerations, redundant systems, N+1 design."
        },
        "commercial_standard": {
            label: "Standard Commercial (office, retail, warehouse)",
            equipment_multiplier: 1.0,
            labor_multiplier: 1.0,
            min_camera_cost: 0,
            min_nvr_cost: 0,
            min_switch_cost: 0,
            notes: "Standard pricing applies."
        },
    },

    // ═══════════════════════════════════════════════════════════
    // GENERAL CONDITIONS — Bonds, Insurance, Mob/Demob
    // These are REAL project costs typically 8-15% of contract
    // ═══════════════════════════════════════════════════════════
    generalConditions: {
        bonds: {
            performance_payment: { unit: "% of contract", budget: 1.5, mid: 2.0, premium: 2.5, description: "Performance & Payment Bonds (surety)" },
            bid_bond: { unit: "% of contract", budget: 0.5, mid: 0.5, premium: 0.5, description: "Bid Bond (typically included)" },
        },
        insurance: {
            general_liability:      { unit: "% of contract", budget: 0.8, mid: 1.0, premium: 1.2, description: "Commercial General Liability Insurance" },
            rrpli:                  { unit: "lump sum",      budget: 25000, mid: 45000, premium: 65000, description: "Railroad Protective Liability Insurance (transit/railroad ONLY)" },
            builders_risk:          { unit: "% of contract", budget: 0.3, mid: 0.5, premium: 0.8, description: "Builder's Risk / Installation Floater" },
            umbrella_excess:        { unit: "% of contract", budget: 0.2, mid: 0.3, premium: 0.5, description: "Umbrella / Excess Liability" },
            professional_liability: { unit: "lump sum",      budget: 2000, mid: 4000, premium: 8000, description: "Professional Liability / E&O" },
        },
        mobilization: {
            mob_demob:        { unit: "% of contract", budget: 1.0, mid: 1.5, premium: 2.0, description: "Mobilization & Demobilization (equipment, trailers, temp facilities)" },
            temporary_facilities: { unit: "lump sum", budget: 3000, mid: 6000, premium: 12000, description: "Job trailer, temp power, temp fencing, dumpsters" },
            permits_fees:         { unit: "lump sum", budget: 2000, mid: 5000, premium: 10000, description: "Building permits, inspection fees, utility fees" },
        },
    },

    // ═══════════════════════════════════════════════════════════
    // ELECTRICAL DISTRIBUTION — Power circuits, UPS, panels
    // These support ELV systems but are often electrical scope
    // ═══════════════════════════════════════════════════════════
    electricalDistribution: {
        ups: {
            ups_rack_1kva:      { unit: "each", budget: 500,    mid: 725,     premium: 1200,    description: "1kVA Rack-mount UPS (Eaton/APC)" },
            ups_rack_3kva:      { unit: "each", budget: 1500,   mid: 2500,    premium: 4000,    description: "3kVA Rack-mount UPS (Eaton/APC)" },
            ups_rack_6kva:      { unit: "each", budget: 3500,   mid: 5500,    premium: 8500,    description: "6kVA Rack-mount UPS" },
            ups_rack_10kva:     { unit: "each", budget: 5000,   mid: 7500,    premium: 12000,   description: "10kVA Rack-mount UPS (Schneider/Eaton)" },
            ups_floor_15kva:    { unit: "each", budget: 12000,  mid: 20000,   premium: 32000,   description: "15kVA Floor-standing UPS" },
            ups_floor_20kva:    { unit: "each", budget: 18000,  mid: 30000,   premium: 48000,   description: "20kVA Floor-standing UPS" },
            ups_floor_30kva:    { unit: "each", budget: 28000,  mid: 45000,   premium: 72000,   description: "30kVA Floor-standing UPS" },
            ups_station_50kva:  { unit: "each", budget: 50000,  mid: 85000,   premium: 135000,  description: "50kVA Station-sized UPS (Eaton 9395/Schneider Galaxy)" },
            ups_station_100kva: { unit: "each", budget: 85000,  mid: 140000,  premium: 220000,  description: "100kVA Station-sized UPS system" },
            ups_battery_cab:    { unit: "each", budget: 3000,   mid: 5000,    premium: 8000,    description: "External battery cabinet for extended runtime" },
            ats_transfer_switch:{ unit: "each", budget: 3500,   mid: 6000,    premium: 12000,   description: "Automatic Transfer Switch (100-200A)" },
            inverter_station:   { unit: "each", budget: 60000,  mid: 100000,  premium: 190000,  description: "Station-sized inverter/charger system (transit)" },
        },
        panels: {
            panelboard_100a:  { unit: "each", budget: 800,   mid: 1500,  premium: 3000,  description: "100A 120/208V panelboard" },
            panelboard_200a:  { unit: "each", budget: 1500,  mid: 2800,  premium: 5000,  description: "200A 120/208V panelboard" },
            panelboard_400a:  { unit: "each", budget: 3000,  mid: 5500,  premium: 9000,  description: "400A distribution panelboard" },
            disconnect_switch:{ unit: "each", budget: 250,   mid: 500,   premium: 1000,  description: "Fused disconnect switch (60-200A)" },
        },
        circuits: {
            power_circuit_20a: { unit: "each", budget: 1500,  mid: 2500,   premium: 4000,   description: "Dedicated 20A 120V circuit (wire, breaker, conduit, labor)" },
            power_circuit_30a: { unit: "each", budget: 2500,  mid: 4000,   premium: 6500,   description: "Dedicated 30A 208V circuit (wire, breaker, conduit, labor)" },
            power_circuit_50a: { unit: "each", budget: 4000,  mid: 6500,   premium: 10000,  description: "Dedicated 50A 208V circuit (wire, breaker, conduit, labor)" },
            power_circuit_100a:{ unit: "each", budget: 8000,  mid: 14000,  premium: 22000,  description: "Dedicated 100A 208V feeder circuit" },
        },
        site_electrical: {
            utility_pole_wood: { unit: "each", budget: 8000,  mid: 15000, premium: 25000, description: "New wood utility/camera pole with foundation" },
            utility_pole_steel:{ unit: "each", budget: 12000, mid: 22000, premium: 38000, description: "New steel pole (20-40ft) with concrete foundation" },
            pole_foundation:   { unit: "each", budget: 2500,  mid: 4500,  premium: 8000,  description: "Concrete pole foundation (caisson/direct embed)" },
            handhole_small:    { unit: "each", budget: 400,   mid: 800,   premium: 1500,  description: "Handhole/pull box (small, 12×12)" },
            handhole_large:    { unit: "each", budget: 800,   mid: 1600,  premium: 3000,  description: "Handhole/pull box (large, 24×36)" },
            transformer_pad:   { unit: "each", budget: 3000,  mid: 5000,  premium: 9000,  description: "Pad-mount transformer foundation" },
        },
    },

    // ═══════════════════════════════════════════════════════════
    // EQUIPMENT RENTAL — Lifts, excavators, tools
    // Per-day rates, typical rental periods in parentheses
    // ═══════════════════════════════════════════════════════════
    equipmentRental: {
        lifts: {
            scissor_19ft:    { unit: "per day", budget: 125, mid: 185, premium: 275, description: "Scissor lift 19ft (indoor)" },
            scissor_32ft:    { unit: "per day", budget: 200, mid: 300, premium: 450, description: "Scissor lift 32ft (outdoor rough terrain)" },
            boom_45ft:       { unit: "per day", budget: 275, mid: 400, premium: 600, description: "Articulating boom lift 45ft" },
            boom_60ft:       { unit: "per day", budget: 350, mid: 500, premium: 750, description: "Articulating boom lift 60ft" },
            boom_80ft:       { unit: "per day", budget: 500, mid: 750, premium: 1100, description: "Articulating boom lift 80ft" },
            bucket_truck:    { unit: "per day", budget: 400, mid: 600, premium: 900, description: "Bucket truck (35-50ft)" },
        },
        excavation: {
            mini_excavator:  { unit: "per day", budget: 250, mid: 400, premium: 600, description: "Mini-excavator/backhoe (trenching)" },
            skid_steer:      { unit: "per day", budget: 200, mid: 350, premium: 500, description: "Skid steer with attachments" },
            plate_compactor: { unit: "per day", budget: 50,  mid: 85,  premium: 125, description: "Plate compactor (backfill)" },
        },
        tools: {
            concrete_saw:    { unit: "per day", budget: 100, mid: 150, premium: 225, description: "Walk-behind concrete/asphalt saw" },
            cable_tugger:    { unit: "per day", budget: 150, mid: 250, premium: 400, description: "Cable tugger/puller" },
            core_drill:      { unit: "per day", budget: 75,  mid: 125, premium: 200, description: "Core drill with bits" },
            generator_port:  { unit: "per day", budget: 75,  mid: 125, premium: 200, description: "Portable generator 5-10kW" },
            fusion_splicer:  { unit: "per day", budget: 200, mid: 350, premium: 500, description: "Fiber optic fusion splicer" },
            cable_certifier: { unit: "per day", budget: 75,  mid: 125, premium: 200, description: "Cable certifier (Fluke DSX-5000/8000)" },
            otdr_tester:     { unit: "per day", budget: 100, mid: 175, premium: 275, description: "OTDR fiber tester" },
            safety_harness:  { unit: "per week", budget: 25,  mid: 45,  premium: 75,  description: "Safety harness & lanyard (per worker)" },
        },
    },

    // ═══════════════════════════════════════════════════════════
    // NON-ELV SCOPES — Architectural, mechanical, misc trades
    // Include when contract covers these scopes
    // ═══════════════════════════════════════════════════════════
    nonELVScopes: {
        glazing: {
            blast_film:      { unit: "per EA", budget: 200, mid: 350, premium: 550, description: "Blast mitigation / security film per window (installed)" },
            glazing_replace: { unit: "per SF", budget: 120, mid: 200, premium: 320, description: "Replace glazing panel (remove + new glass + install)" },
        },
        masonry: {
            infill_opening:  { unit: "per SF", budget: 800, mid: 1500, premium: 2200, description: "Infill masonry opening (CMU + mortar + finish)" },
        },
        hvac: {
            mini_split:      { unit: "each", budget: 6000, mid: 10000, premium: 18000, description: "Ductless mini-split AC unit (installed, for IDF/MDF cooling)" },
        },
        finishes: {
            paint_touchup:   { unit: "allowance", budget: 3000, mid: 6000, premium: 12000, description: "Wall repair and paint touchup (per floor/area)" },
            ceiling_repair:  { unit: "allowance", budget: 1500, mid: 3500, premium: 7000, description: "Ceiling tile repair/replacement" },
            drywall_patch:   { unit: "allowance", budget: 1000, mid: 2500, premium: 5000, description: "Gypsum board patch and paint at device locations" },
        },
        signage: {
            door_signage:    { unit: "each", budget: 400, mid: 800, premium: 1500, description: "ADA/security signage at controlled doors" },
        },
        survey: {
            construction_survey: { unit: "allowance", budget: 5000,  mid: 12000, premium: 22000, description: "Construction survey / as-built verification" },
            utility_locate:      { unit: "allowance", budget: 3000,  mid: 8000,  premium: 15000, description: "Utility locating (potholing + private locator)" },
        },
    },

    // ═══════════════════════════════════════════════════════════
    // CIVIL WORK & SUBCONTRACTOR COST REFERENCE
    // Industry-standard rates for underground/site work
    // These anchor the AI so it doesn't guess low
    // ═══════════════════════════════════════════════════════════
    civilWork: {
        directional_boring: {
            // Per linear foot by conduit diameter — includes mobilization amortized
            "2_inch":  { unit: "per LF", budget: 25, mid: 40, premium: 60, description: "2\" bore under pavement/landscape" },
            "3_inch":  { unit: "per LF", budget: 35, mid: 55, premium: 80, description: "3\" bore under pavement" },
            "4_inch":  { unit: "per LF", budget: 45, mid: 70, premium: 100, description: "4\" bore under roadway/railroad" },
            mobilization: { unit: "each", budget: 2500, mid: 4000, premium: 6000, description: "Drill rig mobilization/demobilization" },
        },
        trenching: {
            "24in_landscape": { unit: "per LF", budget: 8, mid: 14, premium: 22, description: "24\" deep trench in landscape/dirt" },
            "24in_asphalt":   { unit: "per LF", budget: 18, mid: 28, premium: 42, description: "24\" deep trench through asphalt" },
            "36in_landscape": { unit: "per LF", budget: 12, mid: 20, premium: 30, description: "36\" deep trench in landscape" },
            "36in_asphalt":   { unit: "per LF", budget: 25, mid: 38, premium: 55, description: "36\" deep trench through asphalt" },
            backfill_compact: { unit: "per LF", budget: 3, mid: 6, premium: 10, description: "Sand bedding + compacted backfill" },
            // ALL-IN RATES: sawcut + trench + conduit install + backfill + surface restore
            // Use these for scope-of-work pricing (matches how GCs/owners price trenching)
            allin_concrete_24in: { unit: "per LF", budget: 85, mid: 145, premium: 220, description: "ALL-IN: sawcut concrete + 24\" trench + conduit + backfill + concrete patch" },
            allin_concrete_36in: { unit: "per LF", budget: 110, mid: 185, premium: 290, description: "ALL-IN: sawcut concrete + 36\" trench + conduit + backfill + concrete patch" },
            allin_asphalt_24in:  { unit: "per LF", budget: 65, mid: 110, premium: 175, description: "ALL-IN: sawcut asphalt + 24\" trench + conduit + backfill + asphalt patch" },
            allin_asphalt_36in:  { unit: "per LF", budget: 85, mid: 145, premium: 225, description: "ALL-IN: sawcut asphalt + 36\" trench + conduit + backfill + asphalt patch" },
            allin_railroad_heavy:{ unit: "per LF", budget: 160, mid: 280, premium: 420, description: "ALL-IN HEAVY: Railroad/transit sawcut + trench + multiple conduits + restore (RWIC overhead included)" },
        },
        surface_restoration: {
            asphalt_patch:     { unit: "per SF", budget: 8, mid: 14, premium: 22, description: "Asphalt sawcut + remove + repave" },
            concrete_patch:    { unit: "per SF", budget: 12, mid: 20, premium: 32, description: "Concrete sawcut + remove + repour" },
            landscape_restore: { unit: "per LF", budget: 4, mid: 8, premium: 15, description: "Sod/irrigation repair" },
            concrete_sawcut:   { unit: "per LF", budget: 3, mid: 5, premium: 8, description: "Concrete/asphalt sawcutting" },
        },
        core_drilling: {
            "2_inch":  { unit: "per hole", budget: 75, mid: 125, premium: 200, description: "2\" core through concrete" },
            "4_inch":  { unit: "per hole", budget: 150, mid: 250, premium: 400, description: "4\" core through concrete/CMU" },
            "6_inch":  { unit: "per hole", budget: 250, mid: 400, premium: 600, description: "6\" core through concrete" },
            mobilization: { unit: "each", budget: 500, mid: 800, premium: 1200, description: "Core drill mobilization" },
        },
        utility_locating: {
            potholing:   { unit: "per hole", budget: 300, mid: 500, premium: 800, description: "Vacuum excavation pothole" },
            usa_north:   { unit: "each", budget: 0, mid: 0, premium: 0, description: "811/USA North locate (free but required)" },
            private_locate: { unit: "per day", budget: 800, mid: 1200, premium: 1800, description: "Private utility locator" },
        },
    },

    // ═══════════════════════════════════════════════════════════
    // SUBCONTRACTOR CIVIL RATES
    // Line-item civil work rates for subcontractor pricing
    // Standard rates and prevailing wage (~25% uplift) variants
    // ═══════════════════════════════════════════════════════════
    subcontractorCivil: {
        standard: {
            saw_cutting_concrete:  { unit: "per LF", budget: 6.00, mid: 8.00, premium: 11.00, description: "Concrete sawcutting" },
            saw_cutting_asphalt:   { unit: "per LF", budget: 3.50, mid: 4.50, premium: 6.50, description: "Asphalt sawcutting" },
            trenching_24in:        { unit: "per LF", budget: 14.00, mid: 18.00, premium: 24.00, description: "24\" depth trenching" },
            trenching_36in:        { unit: "per LF", budget: 18.00, mid: 24.00, premium: 32.00, description: "36\" depth trenching" },
            directional_bore_2in:  { unit: "per LF", budget: 18.00, mid: 24.00, premium: 34.00, description: "2\" directional bore" },
            directional_bore_4in:  { unit: "per LF", budget: 26.00, mid: 34.00, premium: 48.00, description: "4\" directional bore" },
            bore_mobilization:     { unit: "each", budget: 2500, mid: 3500, premium: 5000, description: "Bore rig mobilization/demobilization" },
            concrete_restoration:  { unit: "per SF", budget: 12.00, mid: 16.00, premium: 22.00, description: "Concrete surface restoration" },
            asphalt_restoration:   { unit: "per SF", budget: 8.00, mid: 12.00, premium: 18.00, description: "Asphalt surface restoration" },
            handhole_pullbox:      { unit: "each", budget: 1200, mid: 1600, premium: 2200, description: "Handhole / pullbox installation" },
            concrete_pad:          { unit: "per CY", budget: 425, mid: 575, premium: 800, description: "Concrete equipment pad" },
            core_drill_4in:        { unit: "each", budget: 75, mid: 100, premium: 150, description: "4\" core drill through concrete/CMU" },
        },
        prevailing_wage: {
            saw_cutting_concrete:  { unit: "per LF", budget: 7.50, mid: 10.00, premium: 13.75, description: "Concrete sawcutting (prevailing wage)" },
            saw_cutting_asphalt:   { unit: "per LF", budget: 4.38, mid: 5.63, premium: 8.13, description: "Asphalt sawcutting (prevailing wage)" },
            trenching_24in:        { unit: "per LF", budget: 17.50, mid: 22.50, premium: 30.00, description: "24\" depth trenching (prevailing wage)" },
            trenching_36in:        { unit: "per LF", budget: 22.50, mid: 30.00, premium: 40.00, description: "36\" depth trenching (prevailing wage)" },
            directional_bore_2in:  { unit: "per LF", budget: 22.50, mid: 30.00, premium: 42.50, description: "2\" directional bore (prevailing wage)" },
            directional_bore_4in:  { unit: "per LF", budget: 32.50, mid: 42.50, premium: 60.00, description: "4\" directional bore (prevailing wage)" },
            bore_mobilization:     { unit: "each", budget: 3125, mid: 4375, premium: 6250, description: "Bore rig mobilization/demobilization (prevailing wage)" },
            concrete_restoration:  { unit: "per SF", budget: 15.00, mid: 20.00, premium: 27.50, description: "Concrete surface restoration (prevailing wage)" },
            asphalt_restoration:   { unit: "per SF", budget: 10.00, mid: 15.00, premium: 22.50, description: "Asphalt surface restoration (prevailing wage)" },
            handhole_pullbox:      { unit: "each", budget: 1500, mid: 2000, premium: 2750, description: "Handhole / pullbox installation (prevailing wage)" },
            concrete_pad:          { unit: "per CY", budget: 531, mid: 719, premium: 1000, description: "Concrete equipment pad (prevailing wage)" },
            core_drill_4in:        { unit: "each", budget: 94, mid: 125, premium: 188, description: "4\" core drill through concrete/CMU (prevailing wage)" },
        },
    },

    // ═══════════════════════════════════════════════════════════
    // SUBCONTRACTOR COST BENCHMARKS
    // Minimum expected costs by trade for project validation
    // ═══════════════════════════════════════════════════════════
    subcontractorBenchmarks: {
        transit_railroad: {
            civil_contractor_min: 60000,      // Minimum civil sub for transit (boring, trenching, restoration)
            electrical_contractor_min: 80000,  // Dedicated circuits, panels, grounding for camera/access systems
            rwic_flagman_daily: 1200,          // Per day, per flagman
            rwic_min_days: 25,                 // Minimum flagman days for a multi-week transit project
            rwic_min_total: 30000,             // Absolute floor for RWIC costs
            rpl_insurance_min: 25000,          // Minimum RPL for railroad project
            safety_training_per_worker: 350,   // TSA/TWIC + railroad safety orientation
            traffic_control_daily: 1500,       // Flaggers + cones + arrow board per day
            traffic_control_min_days: 15,      // Minimum days needing traffic control
            // ── New transit cost fields ──
            twic_tsa_per_worker: 150,          // TWIC card + TSA background check per worker
            railroad_escort_daily: 1000,       // Railroad escort required for right-of-way access
            railroad_escort_min_days: 20,      // Minimum escort days for multi-week project
            track_rated_ppe_per_worker: 125,   // Hi-vis, hard hat, steel-toe, safety glasses, radio
            fra_approval_fee: 5000,            // FRA/transit authority review and approval (lump sum)
            row_permit_cost: 8000,             // Right-of-way access permit (lump sum)
            station_coordination_fee: 3500,    // Platform closure/station coordination (lump sum)
            specialty_tools_daily: 350,        // Rail-specific tools rental (flagging equip, bonding tools)
        },
        standard: {
            civil_contractor_min: 15000,
            electrical_contractor_min: 25000,
            traffic_control_daily: 800,
        },
    },

    // ═══════════════════════════════════════════════════════════
    // AMTRAK BENCHMARK DATA — Actual Winning Bids
    // Used by FormulaEngine3D transit calibration to anchor bids
    // to real per-camera sell prices from winning proposals.
    // DO NOT DELETE — calibration fails without this data.
    // ═══════════════════════════════════════════════════════════
    amtrakBenchmarks: {
        actualBids: {
            emeryville_original:     { cameras: 61,  total: 1302128, cost: 876945, year: 2025, type: "original" },
            emeryville_ve:           { cameras: 61,  total: 1033760, cost: 829696, year: 2025, type: "value_engineering" },
            sacramento_rev2:         { cameras: 100, total: 1734097, year: 2025, type: "revision" },
            sacramento_sv_rev1:      { cameras: 100, total: 1810020, year: 2025, type: "revision" },
            martinez_original:       { cameras: 69,  total: 2035277, year: 2025, type: "original" },
            martinez_ve:             { cameras: 69,  total: 1731418, year: 2025, type: "value_engineering" },
            martinez_bafo:           { cameras: 69,  total: 1966150, year: 2025, type: "bafo" },
        },
        // Verified labor rates from Emeryville winning estimate
        laborRates: {
            technician: 80,
            projectManager: 85,
            engineer: 65,
        },
        // SAGE ERP sell factors (verified from actual winning bids)
        markup: {
            cost_to_price_multiplier: 1.485,
            material_ext_to_price: 1.51424,
            labor_ext_to_price: 1.39240,
        },
        // Verified labor structure from winning bids
        laborStructure: {
            camera_install_hrs: 8,
            camera_indoor_hrs: 4,
            npt_pct: 8,
            pm_pct: 8,
            admin_eng_pct: 4,
        },
        // Overhead percentages
        materialExtras: {
            material_support_pct: 2,
            shipping_pct: 1,
        },
        overhead: {
            warranty_pct: 2,
            gen_conditions_pct: 3,
        },
    },
};

// Prevent runtime tampering with pricing data
(function deepFreeze(obj) {
  Object.freeze(obj);
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Object.isFrozen(obj[key])) {
      deepFreeze(obj[key]);
    }
  });
})(PRICING_DB);

// Make available for import in app.js (loaded via <script> tag)
if (typeof window !== "undefined") {
    window.PRICING_DB = PRICING_DB;
}

// ═══════════════════════════════════════════════════════════
// BID HISTORY — User-recorded won/lost bid outcomes for calibration
// (v5.129.3 — 2026-04-25)
// ═══════════════════════════════════════════════════════════
// Persisted to localStorage so calibration improves as the user records
// real bid outcomes. Merged with PRICING_DB.amtrakBenchmarks by
// FormulaEngine3D so calibration anchors grow over time.
//
// Built-in benchmarks (PRICING_DB.amtrakBenchmarks.actualBids) WIN on
// key conflict — users can't override the curated benchmarks with bad data.
// 'lost' bids are excluded (they'd pull calibration low).
//
// USAGE (from browser console after a bid result is known):
//   BID_HISTORY.record('project_name', {
//     cameras: 100,
//     total: 1750000,           // award price (sell, not cost)
//     year: 2026,
//     type: 'bafo' | 'original' | 'revision' | 'value_engineering',
//     status: 'won' | 'lost' | 'pending',
//     projectType: 'transit' | 'office' | 'mixed_use' | etc.,
//     notes: 'optional context'
//   });
//
//   BID_HISTORY.getAll();    // see what's recorded
//   BID_HISTORY.remove(key); // delete a bad entry
//
const BID_HISTORY = {
    LS_KEY: 'smartplans_bid_history_v1',

    getAll() {
        try {
            const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(this.LS_KEY) : null;
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.warn('[BID_HISTORY] getAll failed:', e.message);
            return {};
        }
    },

    record(key, data) {
        if (!key || typeof key !== 'string' || !data || typeof data !== 'object') {
            console.warn('[BID_HISTORY] record requires key (string) and data (object)');
            return false;
        }
        if (!Number.isFinite(data.cameras) || !Number.isFinite(data.total)) {
            console.warn('[BID_HISTORY] data.cameras and data.total must be finite numbers');
            return false;
        }
        try {
            const all = this.getAll();
            all[key] = { ...data, recordedAt: new Date().toISOString() };
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this.LS_KEY, JSON.stringify(all));
            }
            console.log(`[BID_HISTORY] Recorded "${key}": ${data.cameras} cams, $${data.total.toLocaleString()} (${data.status || 'unknown'})`);
            return true;
        } catch (e) {
            console.warn('[BID_HISTORY] record failed:', e.message);
            return false;
        }
    },

    remove(key) {
        try {
            const all = this.getAll();
            if (!(key in all)) return false;
            delete all[key];
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this.LS_KEY, JSON.stringify(all));
            }
            console.log(`[BID_HISTORY] Removed "${key}"`);
            return true;
        } catch (e) {
            console.warn('[BID_HISTORY] remove failed:', e.message);
            return false;
        }
    },
};

// Merged benchmark accessor for FormulaEngine3D and other calibration consumers.
// Returns shape: { [key]: { cameras, total, year, type, ... } }
function getBidBenchmarks() {
    const builtin = (typeof PRICING_DB !== 'undefined' && PRICING_DB.amtrakBenchmarks?.actualBids) || {};
    const userRecorded = BID_HISTORY.getAll();
    const merged = {};
    // User-recorded first; filter out 'lost' bids (they'd pull calibration low)
    for (const [k, v] of Object.entries(userRecorded)) {
        if (v?.status !== 'lost') merged[k] = v;
    }
    // Built-in wins on conflict
    Object.assign(merged, builtin);
    return merged;
}

if (typeof window !== "undefined") {
    window.BID_HISTORY = BID_HISTORY;
    window.getBidBenchmarks = getBidBenchmarks;
}
