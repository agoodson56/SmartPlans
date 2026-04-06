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
            fiber_patch_sm: { unit: "each", budget: 8.00, mid: 15.00, premium: 28.00, description: "SM LC-LC duplex fiber patch 3m", mfg: { budget: "Cleerline", mid: "Corning", premium: "Corning" }, partNumber: { budget: "SSFD9-LC-LC-3M", mid: "37-024-0F200003M", premium: "002U58-31121-03" } },
            fiber_patch_mm: { unit: "each", budget: 7.00, mid: 12.00, premium: 22.00, description: "MM LC-LC duplex fiber patch 3m", mfg: { budget: "Cleerline", mid: "Corning", premium: "Corning" }, partNumber: { budget: "SSFD5-LC-LC-3M", mid: "37-024-DF200003M", premium: "002A58-31121-03" } },
            fiber_enclosure_wall: { unit: "each", budget: 35.00, mid: 65.00, premium: 120.00, description: "Wall-mount fiber enclosure", mfg: { budget: "ICC", mid: "Corning", premium: "Corning" }, partNumber: { budget: "ICFOD104WM", mid: "WCH-02P", premium: "WCH-04P" } },
            fiber_enclosure_rack: { unit: "each", budget: 45.00, mid: 85.00, premium: 150.00, description: "Rack-mount fiber enclosure 1RU", mfg: { budget: "ICC", mid: "Corning", premium: "Corning" }, partNumber: { budget: "ICFORS1RM6", mid: "SPH-01P", premium: "CCH-01U" } },
            fiber_adapter_panel: { unit: "each", budget: 15.00, mid: 28.00, premium: 48.00, description: "LC adapter panel 6-pack", mfg: { budget: "ICC", mid: "Corning", premium: "Corning" }, partNumber: { budget: "ICFOPL16BK", mid: "CCH-CP06-A9", premium: "CCH-CP12-A9" } },
        },
        racks: {
            rack_2post: { unit: "each", budget: 120.00, mid: 220.00, premium: 380.00, description: "2-post relay rack 7ft 45RU" },
            rack_4post: { unit: "each", budget: 280.00, mid: 480.00, premium: 850.00, description: "4-post equipment rack 42RU" },
            rack_4post_enclosed: { unit: "each", budget: 450.00, mid: 750.00, premium: 1400.00, description: "4-post enclosed cabinet 42RU w/ fans" },
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
            fixed_indoor_dome: { unit: "each", budget: 120.00, mid: 280.00, premium: 520.00, description: "Fixed indoor dome camera 2-4MP", mfg: { budget: "Dahua", mid: "Axis", premium: "Axis" }, partNumber: { budget: "N44BJ52", mid: "M3106-L Mk II", premium: "P3268-LV" } },
            fixed_indoor_bullet: { unit: "each", budget: 110.00, mid: 260.00, premium: 480.00, description: "Fixed indoor bullet camera 2-4MP", mfg: { budget: "Dahua", mid: "Axis", premium: "Axis" }, partNumber: { budget: "N42BD62", mid: "M2036-LE Mk II", premium: "P1468-LE" } },
            fixed_outdoor_dome: { unit: "each", budget: 180.00, mid: 380.00, premium: 720.00, description: "Fixed outdoor dome camera 4-8MP IP67", mfg: { budget: "Dahua", mid: "Axis", premium: "Axis" }, partNumber: { budget: "N45EJ52", mid: "P3265-LVE", premium: "Q3538-LVE" } },
            fixed_outdoor_bullet: { unit: "each", budget: 160.00, mid: 350.00, premium: 680.00, description: "Fixed outdoor bullet camera 4-8MP IP67", mfg: { budget: "Dahua", mid: "Axis", premium: "Axis" }, partNumber: { budget: "N45EF52", mid: "P1465-LE", premium: "Q1786-LE" } },
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
            vms_license: { unit: "per camera", budget: 0.00, mid: 45.00, premium: 150.00, description: "VMS software license per camera" },
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
            poe_switch_24: { unit: "each", budget: 280.00, mid: 520.00, premium: 950.00, description: "PoE+ switch 24-port managed" },
            poe_switch_48: { unit: "each", budget: 420.00, mid: 800.00, premium: 1500.00, description: "PoE+ switch 48-port managed" },
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
            mobile_license: { unit: "per user", budget: 0.00, mid: 2.00, premium: 5.00, description: "Mobile credential license (annual)" },
        },
        software: {
            ac_software_base: { unit: "each", budget: 0.00, mid: 500.00, premium: 2500.00, description: "Access control software base license" },
            ac_door_license: { unit: "per door", budget: 0.00, mid: 45.00, premium: 150.00, description: "Per-door software license" },
            visitor_mgmt: { unit: "each", budget: 0.00, mid: 500.00, premium: 2000.00, description: "Visitor management module" },
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
            pull_station: { unit: "each", budget: 25.00, mid: 48.00, premium: 85.00, description: "Manual pull station (addressable)" },
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
            signage_license: { unit: "per display/yr", budget: 0.00, mid: 150.00, premium: 400.00, description: "Digital signage CMS license" },
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
    // DEFAULT LABOR RATES (user-configurable)
    // ═══════════════════════════════════════════════════════════
    laborRates: {
        standard: {
            journeyman: { rate: 37.31, description: "Journeyman Tech III (primary worker)" },
            lead: { rate: 43.38, description: "Lead Tech / Cable Installer" },
            foreman: { rate: 37.40, description: "Foreman" },
            tech_ii: { rate: 32.95, description: "Tech II" },
            apprentice: { rate: 32.66, description: "Tech I / Apprentice" },
            pm: { rate: 50.49, description: "Project Manager (on-site)" },
            programmer: { rate: 40.11, description: "Engineer / Commissioning Tech" },
            cad: { rate: 38.00, description: "CAD Drafter" },
            warehouse: { rate: 28.00, description: "Warehouse / Staging" },
            admin: { rate: 32.31, description: "Administration / Coordination" },
        },
        burden: {
            rate: 35, // percentage on top of base rate
            components: {
                fica: 7.65,
                futa: 0.60,
                suta: 3.50,
                workers_comp: 8.00,
                general_liability: 5.00,
                health_insurance: 6.25,
                retirement: 2.00,
                other: 2.00,
            },
        },
        markup: {
            material: 50, // percentage markup (observed range: 30-69%, avg 50%)
            labor: 50,    // percentage markup (observed GM: 30-40%)
            equipment: 15,
            subcontractor: 10,
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
        "san_francisco": 1.45,
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
            equipment_multiplier: 2.5,   // Transit-rated cameras, vandal-proof, IK10/IP67
            labor_multiplier: 1.8,       // Restricted work windows, flagmen waits, safety protocols
            min_camera_cost: 1500,       // Minimum cost per camera (transit-rated IK10 dome minimum)
            min_nvr_cost: 3000,          // Minimum cost per NVR (enterprise-grade with RAID)
            min_switch_cost: 800,        // Minimum cost per managed switch
            // Transit projects have higher markups due to complexity, insurance, and compliance
            markup_overrides: {
                material: 65,        // 65% — transit-rated equipment costs more to source, handle, store
                labor: 65,           // 65% — restricted windows, RWIC waits, safety protocols
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
    // AMTRAK STATION SECURITY BENCHMARKS
    // Based on REAL 3D Technology bids: Emeryville ($1.3M, 61 cam),
    // Sacramento ($1.7M, 100 cam), Martinez ($2.0M, 69 cam)
    // These are ACTUAL winning bid numbers — use as sanity checks
    // ═══════════════════════════════════════════════════════════
    amtrakBenchmarks: {
        // ── Labor Rates (prevailing wage, Northern California) ──
        laborRates: {
            technician:        80,    // Field tech — install, pull, terminate
            electricalTech:    95,    // Electrical tech — conduit, circuits, panels
            projectManager:    85,    // PM — 8% of productive tech hours
            adminEngineer:     65,    // Eng/coordination/as-builts — 4% of productive tech hours
        },
        // ── Labor Structure (% of productive tech hours) ──
        laborStructure: {
            npt_pct:            8,   // Non-Productive Time (travel to site, breaks, safety meetings)
            pm_pct:             8,   // Project Manager hours as % of tech hours
            admin_eng_pct:      4,   // Engineering/coordination/as-builts as % of tech hours
            // Camera labor breakdown (from Emeryville internal takeoff)
            camera_full_install_hrs: 8,  // Camera w/ cable pull + mount + terminate (complex/building run)
            camera_simple_install_hrs: 4, // Camera mount + terminate only (short run/pre-wired)
            camera_avg_install_hrs: 6.8, // Weighted average across both types
            pole_camera_cable_hrs: 20,   // Re-pull cable per pole camera (long exterior runs)
            pole_idf_install_hrs:  8,    // IDF-on-pole install per pole
            // Conduit labor (electrical tech @ $95/hr)
            conduit_per_camera_hrs: 8,   // Conduit install per camera location
            // Infrastructure labor
            mdf_headend_hrs:    16,  // Head-end rack build per MDF
            idf_install_hrs:    16,  // Per IDF enclosure (build, terminate, test)
            testing_prog_hrs:   16,  // System testing and programming (per bid item)
            training_hrs:       8,   // Owner/operator training (per bid item)
            mobilization_hrs:   8,   // Per mobilization event
        },
        // ── Material Extras (added to every bid item) ──
        materialExtras: {
            material_support_pct: 2,  // Material support / consumables
            shipping_pct:         1,  // Freight / shipping
        },
        // ── Overhead (added to every bid item) ──
        overhead: {
            warranty_pct:        2,   // 2-year performance warranty
            gen_conditions_pct:  3,   // General conditions / commissioning
        },
        // ── Travel & Per Diem ──
        travel: {
            per_diem_daily:    38,    // Per worker per day (meals/incidentals)
            mileage_rate:      0.65,  // Per mile (IRS rate)
            mileage_base_mi:   40,    // Deduct first 40 miles (local commute)
            home_base:         "Rancho Cordova, CA",
        },
        // ── Overall Markup (Cost → Sell Price) ──
        markup: {
            cost_to_price_multiplier: 1.485,  // 48.5% overall markup on cost
            material_ext_to_price:    1.515,  // 51.5% markup on material extended cost
        },
        // ── Per-Camera ALL-IN Unit Prices (for pricing schedule) ──
        // These include: camera + mount + conduit + CAT6 + license + labor + markup
        cameraUnitPrices: {
            indoor_fixed_8m_mic:     { low: 5050, mid: 6150, high: 6795, description: "Indoor Fixed 8MP w/mic" },
            indoor_fixed_8m:         { low: 4700, mid: 5978, high: 6650, description: "Indoor Fixed 8MP" },
            indoor_360_4lens:        { low: 5580, mid: 6080, high: 6965, description: "Indoor 360 4-lens" },
            indoor_fisheye:          { low: 5580, mid: 5978, high: 6150, description: "Indoor Fisheye 360" },
            indoor_2lens_8m:         { low: 5010, mid: 5978, high: 6150, description: "Indoor 2-lens 8MP" },
            outdoor_fixed_8m:        { low: 5010, mid: 5978, high: 6650, description: "Outdoor Fixed 8MP" },
            outdoor_2lens_8m:        { low: 4700, mid: 5978, high: 6200, description: "Outdoor 2-lens 8MP" },
            outdoor_360_4lens:       { low: 5580, mid: 6080, high: 6965, description: "Outdoor 360 4-lens" },
            pole_fixed_8m:           { low: 4700, mid: 5978, high: 6150, description: "Pole-mount Fixed 8MP" },
            pole_2lens_8m:           { low: 4700, mid: 5978, high: 6200, description: "Pole-mount 2-lens 8MP" },
            pole_360_4lens:          { low: 5010, mid: 6080, high: 6965, description: "Pole-mount 360 4-lens" },
        },
        // ── Amtrak-Specific Line Item Benchmarks ──
        lineItemBenchmarks: {
            cat6a_upgrade_per_camera: { low: 1045, mid: 1185, high: 1300, description: "CAT6A upgrade per camera (cable + jacks + testing)" },
            access_control_per_door:  { low: 6270, mid: 7500, high: 8175, description: "Door with card reader + access control" },
            access_control_panel:     { low: 8580, mid: 8775, high: 11478, description: "Lenel/access control panel" },
            camera_server:            { low: 16920, mid: 17210, high: 23231, description: "Genetec/BCD video management server + storage" },
            station_rack_mdf:         { low: 17500, mid: 18400, high: 19267, description: "Station network enclosure (rack + MDF equipment)" },
            remote_enclosure_idf:     { low: 9387, mid: 9607, high: 13350, description: "Remote network enclosure (IDF)" },
            remote_mini_rack_ups:     { low: 12150, mid: 12490, high: 13216, description: "Remote mini rack with UPS" },
            managed_pdu:              { low: 350, mid: 1495, high: 1800, description: "Managed PDU" },
            kvm_console:              { low: 3250, mid: 3500, high: 4800, description: "Network rack console KVM" },
            patch_panels_per_rack:    { low: 350, mid: 1400, high: 2500, description: "Patch panels (copper/fiber/cords) per rack" },
            viewing_station_50:       { low: 1489, mid: 1740, high: 3475, description: "Security viewing station 50+" },
            fiber_backbone_per_ft:    { low: 30, mid: 37.59, high: 45, description: "New fiber backbone (12-strand SMFO) all-in per LF" },
            misc_network:             { low: 6500, mid: 14780, high: 26812, description: "Misc network / systems interface" },
            cisco_switch_labor:       { low: 448, mid: 725, high: 758, description: "Cisco switch install (provided by Amtrak — labor only)" },
            // ── Electrical / Civil ──
            trenching_sawcut_per_ft:  { low: 95, mid: 151, high: 281, description: "Saw cut / trench for conduit per LF" },
            power_circuit_each:       { low: 2400, mid: 3500, high: 33989, description: "Power circuit (cable + panel + conduit)" },
            station_ups_inverter:     { low: 160103, mid: 186320, high: 187550, description: "Station-sized UPS/Inverter system" },
            new_panelboard:           { low: 3000, mid: 3000, high: 3000, description: "New electrical panelboard" },
            new_pole_foundation:      { low: 25847, mid: 25847, high: 25847, description: "New pole and foundation" },
            new_handhole:             { low: 1680, mid: 1680, high: 1680, description: "New handhole" },
            enclosure_foundation:     { low: 3500, mid: 3500, high: 3500, description: "Foundation for remote network enclosure" },
            // ── Other Divisions ──
            bollard_m30_each:         { low: 3250, mid: 13650, high: 13717, description: "M30-rated vehicular bollard" },
            window_film_each:         { low: 350, mid: 590, high: 5644, description: "Blast mitigation / hardening film per opening" },
            door_hardware:            { low: 775, mid: 850, high: 13745, description: "Electric strike + position switch + latchset per door" },
            signage_per_door:         { low: 1220, mid: 2145, high: 2192, description: "Signage at secured doors" },
            mini_split_hvac:          { low: 16000, mid: 16000, high: 16000, description: "Mini-split HVAC unit for telecom room" },
            // ── General Conditions ──
            mob_demob:                { low: 17920, mid: 18282, high: 22400, description: "Mobilization / Demobilization" },
            insurance_excl_rrpli:     { low: 9750, mid: 14746, high: 20493, description: "All insurance excluding RRPLI" },
            rrpli:                    { low: 1828, mid: 36570, high: 61479, description: "Railroad Protective Liability Insurance" },
            bonds_perf_payment:       { low: 21740, mid: 36570, high: 40986, description: "Performance & Payment Bonds" },
            div1_other_requirements:  { low: 5000, mid: 18282, high: 20493, description: "All other Division 1 requirements" },
            construction_survey:      { low: 20000, mid: 20000, high: 20000, description: "Construction Survey (allowance)" },
            utility_location:         { low: 9999, mid: 10000, high: 10000, description: "Utility location (allowance)" },
        },
        // ── Internal Material Costs (3D buy price, before markup) ──
        internalCosts: {
            genetec_omnicast_license:  210,     // Per camera connection
            genetec_advantage_1yr:     25.44,   // Per camera maintenance/year
            bcd_video_server_224tb:    14135,   // Video management server
            axis_p3267_lme_mic:        729.36,  // 8MP fixed w/mic
            axis_p3268_lve_outdoor:    778.97,  // 8MP outdoor dome
            axis_p3738_ple_panoramic:  1416.91, // 32MP 4x4K panoramic
            axis_p4708_plve_era:       977.44,  // Panoramic ERA
            sd_card_128gb:             250,     // Surveillance SD card
            nema4x_ss_enclosure:       1000,    // NEMA 4X stainless (IDF)
            ethernet_surge_8port:      239.52,  // 8-port surge protector
            din_rail_48vdc_psu:        210,     // 48VDC DIN rail power supply
            tripplite_kvm_console:     2937.73, // Rack mount KVM console
            cat6a_48port_patch:        710.70,  // 48-port Cat6A patch panel
            managed_pdu:               508.95,  // Managed 1RU horizontal PDU
            ups_1kva_rack:             950,     // 1kVA rack-mount UPS
            sfp_smfo:                  500,     // SFP module single-mode fiber
            fiber_sm_12strand_ft:      0.44,    // 12-strand SM fiber per ft
            cat6_cmr_1000ft:           300.48,  // Cat6 CMR 1000ft box
            cat6_osp_1000ft:           921.58,  // Cat6 OSP (outdoor) 1000ft
            cat6a_jack:                9.53,    // Cat6A keystone jack
            cat6a_patch_3ft:           15,      // Cat6A patch cord 3ft
            ups_station_unit:          34943,   // Station-sized UPS (unit only)
            ups_station_battery:       98477,   // Station-sized UPS battery bank
            bollard_material:          350,     // Bollard material cost
            bollard_foundation:        650,     // Bollard foundation cost
            concrete_cut_per_lf:       85,      // Concrete sawcut/resurface per LF
            handhole_each:             650,     // Handhole each
            trench_per_lf:             90,      // Trench 12"x36" per LF
        },
        // ── Actual Bid Totals (for AI sanity checking) ──
        // ALL revisions from all 3 stations — use for calibration
        actualBids: {
            // Per-camera sell price is computed dynamically as total/cameras in calibration code
            // DO NOT add avg_per_camera — it was previously wrong by 200-376%
            emeryville_original:     { cameras: 61,  total: 1302128, cost: 876945, year: 2025, type: "original" },
            emeryville_ve:           { cameras: 61,  total: 1033760, cost: 829696, year: 2025, type: "value_engineering" },
            sacramento_rev2:         { cameras: 100, total: 1734097, year: 2025, type: "revision" },
            sacramento_sv_rev1:      { cameras: 100, total: 1810020, year: 2025, type: "revision" },
            martinez_original:       { cameras: 69,  total: 2035277, year: 2025, type: "original" },
            martinez_ve:             { cameras: 69,  total: 1731418, year: 2025, type: "value_engineering" },
            martinez_bafo:           { cameras: 69,  total: 1966150, year: 2025, type: "bafo" },
        },
        // ── Div 1 General Conditions as % of Total ──
        // Emeryville: 5.1%, Martinez: 6.4-7.9%, Sacramento: 4.0-5.0%
        div1_pct_range: { low: 4.0, mid: 5.5, high: 7.9 },
    },

    // ═══════════════════════════════════════════════════════════
    // COMMERCIAL BID BENCHMARKS (non-Amtrak/non-railroad)
    // Based on 15 REAL 3D Technology commercial bids (2022-2026)
    // CHP, Auburn Indians, Ethos Energy, POA, Sheriff, Sam Brennan,
    // 1515 S Street, 500 Capitol Mall, Superior Equipment, etc.
    // ═══════════════════════════════════════════════════════════
    commercialBenchmarks: {
        // ── Markup Structure (varies by PW status) ──
        markup: {
            prevailing_wage: {
                material_markup_pct:     { low: 32, mid: 47, high: 64, description: "Material markup % for PW projects" },
                labor_markup_pct:        { low: 33, mid: 46, high: 55, description: "Labor markup % for PW projects" },
                overall_multiplier:      { low: 1.26, mid: 1.49, high: 1.63, description: "Overall cost-to-sell multiplier (PW)" },
                target_gross_margin_pct: { low: 27, mid: 35, high: 41, description: "Gross margin % (PW projects)" },
            },
            non_prevailing_wage: {
                material_markup_pct:     { low: 30, mid: 40, high: 43, description: "Material markup % for non-PW projects" },
                labor_markup_pct:        { low: 50, mid: 100, high: 100, description: "Labor markup % for non-PW (typically 100% = 2x)" },
                overall_multiplier:      { low: 2.0, mid: 2.37, high: 2.92, description: "Overall cost-to-sell multiplier (non-PW)" },
                target_gross_margin_pct: { low: 50, mid: 55, high: 67, description: "Gross margin % (non-PW projects)" },
            },
            configured_margins: {
                material:       30,  // Estimate template: material margin %
                labor:          50,  // Estimate template: labor margin %
                subcontractor:  15,  // Subcontractor margin %
                special_matl:   40,  // Specialty/proprietary materials
                other:          20,  // Miscellaneous
                commission:      3,  // Sales commission (full bid format only)
            },
        },
        // ── Labor Rates (cost / sell per hour) ──
        laborRates: {
            prevailing_wage: {
                pm:              { cost: 76, sell: 112, description: "Project Manager (PW)" },
                foreman:         { cost: 97, sell: 135, description: "Foreman (PW)" },
                cable_installer: { cost: 83, sell: 121, description: "Cable Installer / Tech (PW)" },
                engineer:        { cost: 62, sell: 90,  description: "Engineer/CAD (PW)" },
            },
            non_prevailing_wage: {
                pm:              { cost: 60, sell: 120, description: "Project Manager (non-PW)" },
                foreman:         { cost: 55, sell: 110, description: "Foreman (non-PW)" },
                tech:            { cost: 45, sell: 90,  description: "Field Technician (non-PW)" },
                engineer:        { cost: 50, sell: 100, description: "Application Engineer (non-PW)" },
                drafter:         { cost: 59, sell: 85,  description: "CAD/Drafter (non-PW)" },
                warehouse:       { cost: 45, sell: 65,  description: "Warehouse (non-PW)" },
                admin:           { cost: 47, sell: 70,  description: "Administration (non-PW)" },
            },
        },
        // ── Overhead Percentages ──
        overhead: {
            material_support_pct: { low: 1, mid: 2, high: 5, description: "Material support / consumables" },
            shipping_pct:         { low: 1, mid: 1, high: 2, description: "Freight / shipping" },
            npt_travel_pct:       { low: 8, mid: 10, high: 12, description: "Non-Productive Time / travel" },
            pm_pct:               { low: 6, mid: 6, high: 10, description: "PM overhead (% of labor)" },
            admin_eng_pct:        { low: 4, mid: 4, high: 6, description: "Admin/engineering overhead" },
            warranty_pct:         { low: 1, mid: 2, high: 5, description: "Warranty reserve" },
            gen_conditions_pct:   3,   // General conditions / commissioning
            safety_training_pct:  6,   // Safety training (specialized projects only)
            commission_pct:       3,   // Sales commission
        },
        // ── Per-Device Sell Prices (from bid workbooks — all-in installed) ──
        deviceUnitPrices: {
            camera_installed:       { low: 2300, mid: 3500, high: 5200, description: "Camera installed (standard commercial)" },
            card_reader_installed:  { low: 2000, mid: 2600, high: 3500, description: "Card reader installed" },
            data_drop:              { low: 250, mid: 350, high: 500, description: "Data drop (cable + jack + terminate + test)" },
            wap_indoor:             { low: 1500, mid: 2000, high: 2500, description: "Wireless AP indoor (installed)" },
            wap_outdoor:            { low: 2000, mid: 2300, high: 3000, description: "Wireless AP outdoor (installed)" },
            rfid_lock:              { low: 750, mid: 825, high: 900, description: "RFID lock (installed)" },
            intercom_station:       { low: 1500, mid: 2000, high: 2500, description: "Intercom station (installed)" },
            speaker:                { low: 300, mid: 500, high: 800, description: "Speaker/paging (installed)" },
        },
        // ── Actual Commercial Bid Totals (for sanity checking) ──
        actualBids: {
            chp_dublin:      { type: "CCTV", cameras: 8, drops: 12, total: 48397, pw: true, multiplier: 1.455 },
            chp_north_sac:   { type: "CCTV", cameras: 8, drops: 16, total: 36863, pw: true, multiplier: 1.453 },
            auburn_indians:  { type: "Access+CCTV", cameras: 14, doors: 10, drops: 88, total: 141129, pw: true, multiplier: 1.512 },
            ethos_energy:    { type: "Fence Detection", total: 290883, pw: true, multiplier: 1.629 },
            poa_sac:         { type: "Cabling+AC", total: 17412, pw: false, multiplier: 2.003 },
            superior:        { type: "Equipment", total: 22761, pw: false, multiplier: 2.199 },
            sheriffs_760:    { type: "Cabling+AC", total: 24341, pw: false, multiplier: 2.919 },
            sam_brennan:     { type: "Multi-scope", total: 835224, pw: true, multiplier: 1.263 },
            s_street_1515:   { type: "Multi-scope", total: 433439, pw: true, multiplier: 1.489 },
            capitol_mall:    { type: "Data Cabling", total: 35059, pw: true, multiplier: 1.603 },
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
            rwic_flagman_daily: 1750,          // Per day, per flagman (updated Q2 2026)
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
    // BID FIT SCORING CONFIG
    // Based on 22 real 3D Technology bids (2022-2026)
    // Used by computeBidFitScore() to rate project fit
    // ═══════════════════════════════════════════════════════════
    bidFitConfig: {
        // Known clients we've worked with (for relationship scoring)
        knownClients: ['amtrak', 'caltrans', 'chp', 'california highway patrol', 'bart', 'sacramento',
                       'auburn', 'ethos', 'sam brennan', 'capitol mall', '1515 s street', 'superior equipment',
                       'sheriff', 'poa', 'caltrain', 'union pacific', 'bnsf'],
        // Camera count sweet spot from actual wins
        sweetSpotCameras: { min: 8, max: 100 },
        // Project size ranges from actual wins
        sweetSpotTotal: {
            transit: { ideal_min: 1000000, ideal_max: 2100000, ok_min: 500000, ok_max: 3000000 },
            commercial: { ideal_min: 15000, ideal_max: 850000, ok_min: 5000, ok_max: 1500000 },
        },
        // Core strengths ranked by win rate
        coreStrengths: ['cctv', 'access_control', 'structured_cabling'],
        // 3D Technology office locations (lat/lng for distance calc)
        offices: [
            { name: 'Rancho Cordova HQ', lat: 38.5949, lng: -121.2908, address: '11365 Sunrise Gold Circle, Rancho Cordova, CA 95742' },
            { name: 'Livermore', lat: 37.6819, lng: -121.7680, address: '7616 Las Positas Road, Livermore, CA 94551' },
            { name: 'Sparks NV', lat: 39.5349, lng: -119.7527, address: '1430 Greg Street, Suite 511, Sparks, NV 89431' },
            { name: 'McCall ID', lat: 44.7310, lng: -116.0990, address: '411 Deinhard Lane, McCall, ID 83638' },
        ],
        // Max distance from nearest office (miles) — exception: Amtrak anywhere
        maxDistanceMiles: 100,
        // Cities within ~100 miles of offices (for text-based matching when no lat/lng)
        withinRange: ['sacramento', 'rancho cordova', 'elk grove', 'roseville', 'folsom', 'davis',
                      'stockton', 'modesto', 'oakland', 'san francisco', 'san jose', 'martinez',
                      'emeryville', 'richmond', 'berkeley', 'hayward', 'fremont', 'concord',
                      'walnut creek', 'pleasanton', 'livermore', 'dublin', 'fairfield', 'vacaville',
                      'vallejo', 'napa', 'santa rosa', 'auburn', 'grass valley', 'placerville',
                      'lodi', 'manteca', 'tracy', 'antioch', 'pittsburg', 'brentwood',
                      'reno', 'sparks', 'carson city', 'tahoe', 'truckee', 'minden', 'gardnerville',
                      'boise', 'nampa', 'meridian', 'caldwell', 'mccall', 'cascade',
                      'fresno', 'merced', 'turlock', 'los banos', 'gilroy', 'santa cruz', 'monterey'],
        // Outside range but still possible with travel
        extendedRange: ['los angeles', 'san diego', 'bakersfield', 'riverside', 'long beach',
                         'anaheim', 'irvine', 'santa barbara', 'portland', 'seattle',
                         'phoenix', 'tucson', 'salt lake city', 'las vegas', 'denver'],
    },

    // ═══════════════════════════════════════════════════════════════
    // HISTORICAL BID INTELLIGENCE — Extracted from 13 real 3D bids
    // Used by AI brains and export engine for validation/calibration
    // DO NOT EDIT — Generated from bid analysis 2026-04-06
    // ═══════════════════════════════════════════════════════════════
    historicalBidIntelligence: {
        source: "13 historical bids, 3D Technology Services, 2022-2026",

        // ── Labor rates observed across all bids (Sacramento region) ──
        laborRatesObserved: {
            project_manager:    { base_avg: 50.49, burdened_avg: 75.54, sell_avg: 111.42, gm_pct: 32.2 },
            foreman:            { base_avg: 37.40, burdened_avg: 55.76, sell_avg: 84.38,  gm_pct: 33.9 },
            cable_installer:    { base_avg: 43.38, burdened_avg: 55.79, sell_avg: 86.81,  gm_pct: 35.7 },
            tech_iii:           { base_avg: 37.31, burdened_avg: 57.21, sell_avg: 83.74,  gm_pct: 31.7 },
            tech_ii:            { base_avg: 32.95, burdened_avg: 50.13, sell_avg: 83.88,  gm_pct: 40.2 },
            tech_i:             { base_avg: 32.66, burdened_avg: 50.25, sell_avg: 83.74,  gm_pct: 40.0 },
            cad_drafter:        { base_avg: 38.00, burdened_avg: 58.90, sell_avg: 85.00,  gm_pct: 30.7 },
            engineer_estimator: { base_avg: 40.11, burdened_avg: 61.36, sell_avg: 89.89,  gm_pct: 31.7 },
            warehouse:          { base_avg: 28.00, burdened_avg: 44.52, sell_avg: 65.00,  gm_pct: 31.5 },
            administration:     { base_avg: 32.31, burdened_avg: 48.09, sell_avg: 70.75,  gm_pct: 32.0 },
        },

        // ── Task productivity rates (minutes per unit) ──
        // Extracted from detailed task breakdowns in TELEDATA/CCTV/AC sheets
        taskProductivity: {
            pull_cat6_cable:        { min_per_unit: 16.6, hours_per_100: 27.7, observations: 22, notes: "Per cable run, includes routing" },
            terminate_cable:        { min_per_unit: 5.9,  hours_per_100: 9.9,  observations: 17, notes: "Per termination (jack or patch panel)" },
            test_cable:             { min_per_unit: 5.1,  hours_per_100: 8.5,  observations: 18, notes: "Per cable, Fluke certification" },
            install_faceplate:      { min_per_unit: 5.6,  hours_per_100: 9.4,  observations: 8,  notes: "Includes labeling" },
            install_ceiling_support:{ min_per_unit: 3.8,  hours_per_100: 6.4,  observations: 9,  notes: "J-hook or bridle ring" },
            fire_stopping:          { min_per_unit: 4.7,  hours_per_100: 7.8,  observations: 6,  notes: "Per penetration" },
            install_sleeve:         { min_per_unit: 7.5,  hours_per_100: 12.5, observations: 4,  notes: "Core + sleeve install" },
            install_wap:            { min_per_unit: 28.3, hours_per_100: 47.2, observations: 3,  notes: "Mount + cable + config" },
            install_device:         { min_per_unit: 55.0, hours_per_100: 91.7, observations: 3,  notes: "Speaker, clock, intercom station" },
            build_mdf_idf:          { min_per_unit: 110.6,hours_per_100: 184.3,observations: 9,  notes: "Per room, rack + patch + ground" },
            install_raceway:        { min_per_unit: 15.0, hours_per_100: 25.0, observations: 3,  notes: "Per stick (5ft section)" },
            install_camera:         { min_per_unit: 80.0, hours_per_100: 133.3,observations: 2,  notes: "Mount + cable + aim + config" },
            install_access_lock:    { min_per_unit: 240.0,hours_per_100: 400.0,observations: 2,  notes: "RFID lock: wire, mount, program" },
            install_phone:          { min_per_unit: 15.0, hours_per_100: 25.0, observations: 1,  notes: "Wall mount + connect" },
            grounding:              { min_per_unit: 75.0, hours_per_100: 125.0,observations: 4,  notes: "Per TGB/ground point" },
            dress_cables:           { min_per_unit: 60.0, hours_per_100: 100.0,observations: 5,  notes: "Per bundle/tray section" },
            fish_cable_wall:        { min_per_unit: 5.0,  hours_per_100: 8.3,  observations: 1,  notes: "Per cable, existing wall" },
            install_switch:         { min_per_unit: 30.0, hours_per_100: 50.0, observations: 1,  notes: "Network switch, rack mount + patch" },
            demo_scs:               { min_per_unit: 480.0,hours_per_100: 800.0,observations: 2,  notes: "Per room, full structured cabling demo" },
        },

        // ── Labor hour allocation percentages (observed averages) ──
        laborHourDistribution: {
            tech_iii:           24.6,   // Primary worker — carries the most hours
            cable_installer:    22.5,
            tech_ii:            18.0,
            foreman:            7.1,
            project_manager:    5.6,    // Overhead — typically 2.6-6.2% of field hours
            cad_drafter:        4.2,
            tech_iv:            3.6,
            administration:     2.8,
            engineer_estimator: 1.5,
            warehouse:          1.2,
        },

        // ── Markup patterns observed ──
        markupPatterns: {
            material_large_bid_avg: 43.5,   // 30-54% range on template bids
            material_small_bid_avg: 54.5,   // 30-69% range on takeoff bids
            material_small_bid_median: 56.6,
            labor_margin_target: 50,         // Standard labor margin (sell rate)
            gm_target_standard: 35,          // Frank Pedersen directive: 35% GM
            gm_target_pw: 47.5,              // PW projects: 45-50% margin target
        },

        // ── Estimating rules (heuristics from real estimators) ──
        estimatingRules: {
            cable_pull_rate_ft_per_manhour: 200,
            cables_per_day_field_team: 30,
            npt_pct: 12,                        // Non-productive time as % of labor
            mobilization_min_hours: 8,
            material_support_pct: 2,            // % of material cost for misc support
            shipping_pct: 1,                    // % of material cost for shipping
            commission_pct: 3.5,                // % of total sell
            head_end_install_hours: 8,          // Per server/workstation setup
            camera_install_hours: 1.33,         // Per camera (mount + cable + aim)
            rfid_lock_install_hours: 4,         // Per electronic lock
            mdf_idf_build_hours: 2,             // Per room
            testing_hours_per_cable: 0.085,     // ~5.1 min per cable
            pm_pct_of_field_hours: 4.7,         // Average PM overhead
        },

        // ── Material unit costs from real bids (contractor cost, not sell) ──
        materialCostsObserved: {
            camera_avg: 652,          // Axis mid-range dome/bullet average
            camera_range: [64, 1714], // From recessed mount to panoramic
            vms_server_avg: 3142,     // Camera Station rack server
            vms_license_avg: 64,      // Per-camera VMS license
            monitor_avg: 442,         // 32-50" display
            cat6_jack_avg: 5.54,      // Leviton Extreme Quickport
            cat6_cable_per_1000ft: 260,// Berktek CMR
            cat6a_cable_per_1000ft: 300,
            patch_cord_3ft: 3.90,
            access_panel_avg: 1874,   // S2 Netbox/controller
            access_reader_avg: 517,   // HID/S2 readers
            electronic_lock_avg: 1267,// Schlage AD400 series
            conduit_emt_half_per_ft: 1.00,
        },

        // ── Risk flags for bid validation ──
        riskFlags: [
            { id: "RF01", flag: "PW projects need 35-59% PT&I burden on base rates", impact: "high" },
            { id: "RF02", flag: "After-hours (2nd shift) adds 30-50% to labor", impact: "high" },
            { id: "RF03", flag: "Large intercom/nurse call systems are extremely labor-intensive", impact: "high" },
            { id: "RF04", flag: "Demo scope can equal or exceed new install labor hours", impact: "medium" },
            { id: "RF05", flag: "Camera systems with 8+ device types need per-unit cost validation", impact: "medium" },
            { id: "RF06", flag: "Fence detection systems carry 60-69% material markups", impact: "medium" },
            { id: "RF07", flag: "35% GM floor per company directive", impact: "high" },
            { id: "RF08", flag: "45-50% GM target for prevailing wage projects", impact: "high" },
        ],
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
