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
            cat5e_plenum: { unit: "per ft", budget: 0.12, mid: 0.18, premium: 0.25, description: "Cat 5e Plenum (CMP) 1000ft box" },
            cat5e_riser: { unit: "per ft", budget: 0.08, mid: 0.12, premium: 0.18, description: "Cat 5e Riser (CMR) 1000ft box" },
            cat6_plenum: { unit: "per ft", budget: 0.16, mid: 0.24, premium: 0.35, description: "Cat 6 Plenum (CMP) 1000ft box" },
            cat6_riser: { unit: "per ft", budget: 0.11, mid: 0.17, premium: 0.26, description: "Cat 6 Riser (CMR) 1000ft box" },
            cat6a_plenum: { unit: "per ft", budget: 0.22, mid: 0.32, premium: 0.48, description: "Cat 6A Plenum (CMP) 1000ft box" },
            cat6a_riser: { unit: "per ft", budget: 0.16, mid: 0.24, premium: 0.38, description: "Cat 6A Riser (CMR) 1000ft box" },
            cat6a_shielded: { unit: "per ft", budget: 0.30, mid: 0.42, premium: 0.58, description: "Cat 6A Shielded (F/UTP) Plenum" },
            fiber_sm_6: { unit: "per ft", budget: 0.28, mid: 0.42, premium: 0.65, description: "Single-mode OS2 6-strand indoor/outdoor" },
            fiber_sm_12: { unit: "per ft", budget: 0.38, mid: 0.58, premium: 0.85, description: "Single-mode OS2 12-strand indoor/outdoor" },
            fiber_sm_24: { unit: "per ft", budget: 0.55, mid: 0.82, premium: 1.20, description: "Single-mode OS2 24-strand indoor/outdoor" },
            fiber_mm_6: { unit: "per ft", budget: 0.32, mid: 0.48, premium: 0.72, description: "Multi-mode OM3/OM4 6-strand" },
            fiber_mm_12: { unit: "per ft", budget: 0.45, mid: 0.68, premium: 0.95, description: "Multi-mode OM3/OM4 12-strand" },
            coax_rg6: { unit: "per ft", budget: 0.10, mid: 0.16, premium: 0.24, description: "RG6 Plenum coax" },
            coax_rg59: { unit: "per ft", budget: 0.08, mid: 0.12, premium: 0.18, description: "RG59 Plenum coax" },
        },
        connectivity: {
            jack_cat6: { unit: "each", budget: 4.50, mid: 8.00, premium: 14.00, description: "Cat 6 keystone jack" },
            jack_cat6a: { unit: "each", budget: 8.00, mid: 14.00, premium: 22.00, description: "Cat 6A keystone jack" },
            faceplate_1port: { unit: "each", budget: 1.50, mid: 3.00, premium: 5.50, description: "1-port faceplate" },
            faceplate_2port: { unit: "each", budget: 1.75, mid: 3.50, premium: 6.00, description: "2-port faceplate" },
            faceplate_4port: { unit: "each", budget: 2.25, mid: 4.50, premium: 7.50, description: "4-port faceplate" },
            surface_box_1: { unit: "each", budget: 2.00, mid: 4.00, premium: 7.00, description: "Surface mount box 1-port" },
            surface_box_2: { unit: "each", budget: 2.50, mid: 5.00, premium: 8.50, description: "Surface mount box 2-port" },
            patch_panel_24: { unit: "each", budget: 45.00, mid: 85.00, premium: 145.00, description: "24-port Cat 6/6A patch panel" },
            patch_panel_48: { unit: "each", budget: 80.00, mid: 150.00, premium: 260.00, description: "48-port Cat 6/6A patch panel" },
            patch_cord_3ft: { unit: "each", budget: 1.50, mid: 3.00, premium: 5.50, description: "Cat 6 patch cord 3ft" },
            patch_cord_5ft: { unit: "each", budget: 2.00, mid: 3.50, premium: 6.50, description: "Cat 6 patch cord 5ft" },
            patch_cord_7ft: { unit: "each", budget: 2.50, mid: 4.50, premium: 7.50, description: "Cat 6 patch cord 7ft" },
            patch_cord_10ft: { unit: "each", budget: 3.50, mid: 5.50, premium: 9.00, description: "Cat 6 patch cord 10ft" },
            fiber_patch_sm: { unit: "each", budget: 8.00, mid: 15.00, premium: 28.00, description: "SM LC-LC duplex fiber patch 3m" },
            fiber_patch_mm: { unit: "each", budget: 7.00, mid: 12.00, premium: 22.00, description: "MM LC-LC duplex fiber patch 3m" },
            fiber_enclosure_wall: { unit: "each", budget: 35.00, mid: 65.00, premium: 120.00, description: "Wall-mount fiber enclosure" },
            fiber_enclosure_rack: { unit: "each", budget: 45.00, mid: 85.00, premium: 150.00, description: "Rack-mount fiber enclosure 1RU" },
            fiber_adapter_panel: { unit: "each", budget: 15.00, mid: 28.00, premium: 48.00, description: "LC adapter panel 6-pack" },
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
            fixed_indoor_dome: { unit: "each", budget: 120.00, mid: 280.00, premium: 520.00, description: "Fixed indoor dome camera 2-4MP" },
            fixed_indoor_bullet: { unit: "each", budget: 110.00, mid: 260.00, premium: 480.00, description: "Fixed indoor bullet camera 2-4MP" },
            fixed_outdoor_dome: { unit: "each", budget: 180.00, mid: 380.00, premium: 720.00, description: "Fixed outdoor dome camera 4-8MP IP67" },
            fixed_outdoor_bullet: { unit: "each", budget: 160.00, mid: 350.00, premium: 680.00, description: "Fixed outdoor bullet camera 4-8MP IP67" },
            ptz_indoor: { unit: "each", budget: 350.00, mid: 850.00, premium: 2200.00, description: "PTZ camera indoor 2MP 30x" },
            ptz_outdoor: { unit: "each", budget: 480.00, mid: 1200.00, premium: 3500.00, description: "PTZ camera outdoor 4MP 30x IP66" },
            multisensor_180: { unit: "each", budget: 700.00, mid: 1400.00, premium: 2800.00, description: "Multi-sensor 180° panoramic 4x4MP" },
            multisensor_360: { unit: "each", budget: 900.00, mid: 1800.00, premium: 3500.00, description: "Multi-sensor 360° fisheye 12MP" },
            lpr_camera: { unit: "each", budget: 650.00, mid: 1500.00, premium: 3200.00, description: "LPR/ANPR camera with analytics" },
            thermal_camera: { unit: "each", budget: 1200.00, mid: 2800.00, premium: 6500.00, description: "Thermal camera (perimeter detection)" },
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
            prox_reader: { unit: "each", budget: 45.00, mid: 95.00, premium: 180.00, description: "Proximity card reader (HID compatible)" },
            smart_reader: { unit: "each", budget: 85.00, mid: 180.00, premium: 350.00, description: "Smart card reader (iCLASS/SEOS/OSDP)" },
            multi_tech: { unit: "each", budget: 120.00, mid: 250.00, premium: 480.00, description: "Multi-tech reader (mobile + card)" },
            biometric: { unit: "each", budget: 350.00, mid: 750.00, premium: 1500.00, description: "Biometric reader (fingerprint/face)" },
            keypad_reader: { unit: "each", budget: 65.00, mid: 140.00, premium: 280.00, description: "Keypad + card reader combo" },
            long_range: { unit: "each", budget: 280.00, mid: 550.00, premium: 1100.00, description: "Long-range reader (vehicle gate)" },
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
            journeyman: { rate: 38.00, description: "Journeyman Technician" },
            lead: { rate: 45.00, description: "Lead Technician" },
            foreman: { rate: 52.00, description: "Foreman" },
            apprentice: { rate: 22.00, description: "Apprentice" },
            pm: { rate: 65.00, description: "Project Manager (on-site)" },
            programmer: { rate: 55.00, description: "Programmer / Commissioning Tech" },
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
            material: 25, // percentage markup
            labor: 30,
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
};

// Make available for import in app.js (loaded via <script> tag)
if (typeof window !== "undefined") {
    window.PRICING_DB = PRICING_DB;
}
