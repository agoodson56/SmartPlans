// ═══════════════════════════════════════════════════════════════
// CALIFORNIA PREVAILING WAGE DATABASE — v1.0
// State DIR + Federal Davis-Bacon rates by county
// Low Voltage / Communications trade classifications
// Rate effective dates: 2024-2025
// ═══════════════════════════════════════════════════════════════
//
// Classifications:
//   comm_installer — Communications System Installer (cable pull, mount, rough-in)
//   comm_tech      — Communications System Technician (terminate, program, test)
//   electrician    — Inside Wireman / Electrician (general electrical)
//   sound_comm     — Sound & Communication Installer (legacy classification)
//   apprentice     — Apprentice ratio (% of journeyman)
//   foreman        — Foreman premium (% above journeyman)
//
// Each rate includes: base hourly + fringes = total loaded rate
// ═══════════════════════════════════════════════════════════════

const CA_PREVAILING_WAGES = {

  // ─── Rate Zones ─────────────────────────────────────────────
  // Counties grouped by IBEW local jurisdiction

  zones: {

    // ── Bay Area North (IBEW Local 6 — San Francisco) ──
    bay_area_sf: {
      label: 'Bay Area — San Francisco (IBEW 6)',
      dir: {
        comm_installer: { base: 72.36, fringe: 38.42, total: 110.78 },
        comm_tech:      { base: 78.14, fringe: 39.15, total: 117.29 },
        electrician:    { base: 91.25, fringe: 48.05, total: 139.30 },
        sound_comm:     { base: 72.36, fringe: 38.42, total: 110.78 },
        foreman_pct: 10,
        apprentice_pct: 55,
      },
      davis_bacon: {
        comm_installer: { base: 71.50, fringe: 37.85, total: 109.35 },
        comm_tech:      { base: 77.20, fringe: 38.60, total: 115.80 },
        electrician:    { base: 90.10, fringe: 47.50, total: 137.60 },
        sound_comm:     { base: 71.50, fringe: 37.85, total: 109.35 },
        foreman_pct: 10,
        apprentice_pct: 55,
      },
    },

    // ── Bay Area East (IBEW Local 595 — Oakland/East Bay) ──
    bay_area_east: {
      label: 'Bay Area — East Bay (IBEW 595)',
      dir: {
        comm_installer: { base: 69.45, fringe: 36.90, total: 106.35 },
        comm_tech:      { base: 75.80, fringe: 37.85, total: 113.65 },
        electrician:    { base: 87.50, fringe: 46.20, total: 133.70 },
        sound_comm:     { base: 69.45, fringe: 36.90, total: 106.35 },
        foreman_pct: 10,
        apprentice_pct: 55,
      },
      davis_bacon: {
        comm_installer: { base: 68.90, fringe: 36.50, total: 105.40 },
        comm_tech:      { base: 75.10, fringe: 37.40, total: 112.50 },
        electrician:    { base: 86.80, fringe: 45.80, total: 132.60 },
        sound_comm:     { base: 68.90, fringe: 36.50, total: 105.40 },
        foreman_pct: 10,
        apprentice_pct: 55,
      },
    },

    // ── Bay Area South (IBEW Local 332 — San Jose/Silicon Valley) ──
    bay_area_south: {
      label: 'Bay Area — South Bay (IBEW 332)',
      dir: {
        comm_installer: { base: 70.85, fringe: 37.60, total: 108.45 },
        comm_tech:      { base: 76.90, fringe: 38.45, total: 115.35 },
        electrician:    { base: 89.40, fringe: 47.10, total: 136.50 },
        sound_comm:     { base: 70.85, fringe: 37.60, total: 108.45 },
        foreman_pct: 10,
        apprentice_pct: 55,
      },
      davis_bacon: {
        comm_installer: { base: 70.20, fringe: 37.20, total: 107.40 },
        comm_tech:      { base: 76.30, fringe: 38.10, total: 114.40 },
        electrician:    { base: 88.70, fringe: 46.70, total: 135.40 },
        sound_comm:     { base: 70.20, fringe: 37.20, total: 107.40 },
        foreman_pct: 10,
        apprentice_pct: 55,
      },
    },

    // ── North Bay (IBEW Local 180 — Napa/Solano/Marin) ──
    north_bay: {
      label: 'North Bay (IBEW 180)',
      dir: {
        comm_installer: { base: 65.20, fringe: 35.10, total: 100.30 },
        comm_tech:      { base: 71.40, fringe: 36.20, total: 107.60 },
        electrician:    { base: 82.50, fringe: 43.80, total: 126.30 },
        sound_comm:     { base: 65.20, fringe: 35.10, total: 100.30 },
        foreman_pct: 10,
        apprentice_pct: 55,
      },
      davis_bacon: {
        comm_installer: { base: 64.80, fringe: 34.80, total: 99.60 },
        comm_tech:      { base: 70.90, fringe: 35.90, total: 106.80 },
        electrician:    { base: 81.90, fringe: 43.40, total: 125.30 },
        sound_comm:     { base: 64.80, fringe: 34.80, total: 99.60 },
        foreman_pct: 10,
        apprentice_pct: 55,
      },
    },

    // ── Sacramento Area (IBEW Local 340) ──
    sacramento: {
      label: 'Sacramento Area (IBEW 340)',
      dir: {
        comm_installer: { base: 55.40, fringe: 31.25, total: 86.65 },
        comm_tech:      { base: 61.80, fringe: 32.40, total: 94.20 },
        electrician:    { base: 72.60, fringe: 38.50, total: 111.10 },
        sound_comm:     { base: 55.40, fringe: 31.25, total: 86.65 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
      davis_bacon: {
        comm_installer: { base: 54.90, fringe: 30.95, total: 85.85 },
        comm_tech:      { base: 61.20, fringe: 32.10, total: 93.30 },
        electrician:    { base: 71.90, fringe: 38.10, total: 110.00 },
        sound_comm:     { base: 54.90, fringe: 30.95, total: 85.85 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
    },

    // ── Stockton / Central Valley North (IBEW Local 591) ──
    central_valley_north: {
      label: 'Stockton / Central Valley North (IBEW 591)',
      dir: {
        comm_installer: { base: 50.15, fringe: 29.80, total: 79.95 },
        comm_tech:      { base: 56.40, fringe: 30.60, total: 87.00 },
        electrician:    { base: 66.80, fringe: 35.40, total: 102.20 },
        sound_comm:     { base: 50.15, fringe: 29.80, total: 79.95 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
      davis_bacon: {
        comm_installer: { base: 49.80, fringe: 29.50, total: 79.30 },
        comm_tech:      { base: 55.90, fringe: 30.30, total: 86.20 },
        electrician:    { base: 66.20, fringe: 35.10, total: 101.30 },
        sound_comm:     { base: 49.80, fringe: 29.50, total: 79.30 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
    },

    // ── Fresno / Central Valley South (IBEW Local 100) ──
    central_valley_south: {
      label: 'Fresno / Central Valley South (IBEW 100)',
      dir: {
        comm_installer: { base: 45.28, fringe: 28.01, total: 73.29 },
        comm_tech:      { base: 52.07, fringe: 28.21, total: 80.28 },
        electrician:    { base: 49.00, fringe: 29.62, total: 78.62 },
        sound_comm:     { base: 45.28, fringe: 28.01, total: 73.29 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
      davis_bacon: {
        comm_installer: { base: 44.90, fringe: 27.75, total: 72.65 },
        comm_tech:      { base: 51.60, fringe: 27.95, total: 79.55 },
        electrician:    { base: 48.60, fringe: 29.35, total: 77.95 },
        sound_comm:     { base: 44.90, fringe: 27.75, total: 72.65 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
    },

    // ── Bakersfield (IBEW Local 428) ──
    bakersfield: {
      label: 'Bakersfield Area (IBEW 428)',
      dir: {
        comm_installer: { base: 43.50, fringe: 27.10, total: 70.60 },
        comm_tech:      { base: 49.80, fringe: 27.55, total: 77.35 },
        electrician:    { base: 48.20, fringe: 28.90, total: 77.10 },
        sound_comm:     { base: 43.50, fringe: 27.10, total: 70.60 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
      davis_bacon: {
        comm_installer: { base: 43.10, fringe: 26.85, total: 69.95 },
        comm_tech:      { base: 49.40, fringe: 27.30, total: 76.70 },
        electrician:    { base: 47.80, fringe: 28.65, total: 76.45 },
        sound_comm:     { base: 43.10, fringe: 26.85, total: 69.95 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
    },

    // ── Los Angeles (IBEW Local 11) ──
    los_angeles: {
      label: 'Los Angeles (IBEW 11)',
      dir: {
        comm_installer: { base: 62.80, fringe: 34.60, total: 97.40 },
        comm_tech:      { base: 68.90, fringe: 35.45, total: 104.35 },
        electrician:    { base: 78.50, fringe: 41.80, total: 120.30 },
        sound_comm:     { base: 62.80, fringe: 34.60, total: 97.40 },
        foreman_pct: 10,
        apprentice_pct: 55,
      },
      davis_bacon: {
        comm_installer: { base: 62.20, fringe: 34.25, total: 96.45 },
        comm_tech:      { base: 68.30, fringe: 35.10, total: 103.40 },
        electrician:    { base: 77.90, fringe: 41.45, total: 119.35 },
        sound_comm:     { base: 62.20, fringe: 34.25, total: 96.45 },
        foreman_pct: 10,
        apprentice_pct: 55,
      },
    },

    // ── San Diego (IBEW Local 569) ──
    san_diego: {
      label: 'San Diego (IBEW 569)',
      dir: {
        comm_installer: { base: 55.90, fringe: 31.40, total: 87.30 },
        comm_tech:      { base: 62.10, fringe: 32.50, total: 94.60 },
        electrician:    { base: 73.20, fringe: 38.80, total: 112.00 },
        sound_comm:     { base: 55.90, fringe: 31.40, total: 87.30 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
      davis_bacon: {
        comm_installer: { base: 55.40, fringe: 31.10, total: 86.50 },
        comm_tech:      { base: 61.60, fringe: 32.20, total: 93.80 },
        electrician:    { base: 72.60, fringe: 38.50, total: 111.10 },
        sound_comm:     { base: 55.40, fringe: 31.10, total: 86.50 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
    },

    // ── Inland Empire (IBEW Local 440 — Riverside/San Bernardino) ──
    inland_empire: {
      label: 'Inland Empire (IBEW 440)',
      dir: {
        comm_installer: { base: 52.40, fringe: 30.15, total: 82.55 },
        comm_tech:      { base: 58.60, fringe: 31.20, total: 89.80 },
        electrician:    { base: 68.90, fringe: 36.60, total: 105.50 },
        sound_comm:     { base: 52.40, fringe: 30.15, total: 82.55 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
      davis_bacon: {
        comm_installer: { base: 51.90, fringe: 29.85, total: 81.75 },
        comm_tech:      { base: 58.10, fringe: 30.90, total: 89.00 },
        electrician:    { base: 68.30, fringe: 36.30, total: 104.60 },
        sound_comm:     { base: 51.90, fringe: 29.85, total: 81.75 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
    },

    // ── Orange County (IBEW Local 441) ──
    orange_county: {
      label: 'Orange County (IBEW 441)',
      dir: {
        comm_installer: { base: 60.20, fringe: 33.40, total: 93.60 },
        comm_tech:      { base: 66.40, fringe: 34.50, total: 100.90 },
        electrician:    { base: 76.80, fringe: 40.80, total: 117.60 },
        sound_comm:     { base: 60.20, fringe: 33.40, total: 93.60 },
        foreman_pct: 10,
        apprentice_pct: 55,
      },
      davis_bacon: {
        comm_installer: { base: 59.70, fringe: 33.10, total: 92.80 },
        comm_tech:      { base: 65.80, fringe: 34.20, total: 100.00 },
        electrician:    { base: 76.20, fringe: 40.50, total: 116.70 },
        sound_comm:     { base: 59.70, fringe: 33.10, total: 92.80 },
        foreman_pct: 10,
        apprentice_pct: 55,
      },
    },

    // ── Santa Barbara / Ventura (IBEW Local 413) ──
    santa_barbara: {
      label: 'Santa Barbara / Ventura (IBEW 413)',
      dir: {
        comm_installer: { base: 54.60, fringe: 30.80, total: 85.40 },
        comm_tech:      { base: 60.70, fringe: 31.90, total: 92.60 },
        electrician:    { base: 71.40, fringe: 37.90, total: 109.30 },
        sound_comm:     { base: 54.60, fringe: 30.80, total: 85.40 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
      davis_bacon: {
        comm_installer: { base: 54.10, fringe: 30.50, total: 84.60 },
        comm_tech:      { base: 60.20, fringe: 31.60, total: 91.80 },
        electrician:    { base: 70.80, fringe: 37.60, total: 108.40 },
        sound_comm:     { base: 54.10, fringe: 30.50, total: 84.60 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
    },

    // ── North Coast / Redwood (IBEW Local 551 — Eureka/Humboldt) ──
    north_coast: {
      label: 'North Coast / Redwood (IBEW 551)',
      dir: {
        comm_installer: { base: 48.20, fringe: 28.40, total: 76.60 },
        comm_tech:      { base: 54.30, fringe: 29.20, total: 83.50 },
        electrician:    { base: 58.60, fringe: 31.80, total: 90.40 },
        sound_comm:     { base: 48.20, fringe: 28.40, total: 76.60 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
      davis_bacon: {
        comm_installer: { base: 47.80, fringe: 28.15, total: 75.95 },
        comm_tech:      { base: 53.80, fringe: 28.95, total: 82.75 },
        electrician:    { base: 58.10, fringe: 31.55, total: 89.65 },
        sound_comm:     { base: 47.80, fringe: 28.15, total: 75.95 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
    },

    // ── Redding / Far North (IBEW Local 1245 area) ──
    far_north: {
      label: 'Redding / Far North (IBEW 1245 area)',
      dir: {
        comm_installer: { base: 46.80, fringe: 27.60, total: 74.40 },
        comm_tech:      { base: 52.90, fringe: 28.45, total: 81.35 },
        electrician:    { base: 56.40, fringe: 30.80, total: 87.20 },
        sound_comm:     { base: 46.80, fringe: 27.60, total: 74.40 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
      davis_bacon: {
        comm_installer: { base: 46.40, fringe: 27.35, total: 73.75 },
        comm_tech:      { base: 52.40, fringe: 28.20, total: 80.60 },
        electrician:    { base: 55.90, fringe: 30.55, total: 86.45 },
        sound_comm:     { base: 46.40, fringe: 27.35, total: 73.75 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
    },

    // ── Central Coast (IBEW Local 234 — Monterey/Santa Cruz) ──
    central_coast: {
      label: 'Central Coast (IBEW 234)',
      dir: {
        comm_installer: { base: 58.40, fringe: 32.20, total: 90.60 },
        comm_tech:      { base: 64.50, fringe: 33.30, total: 97.80 },
        electrician:    { base: 74.80, fringe: 39.70, total: 114.50 },
        sound_comm:     { base: 58.40, fringe: 32.20, total: 90.60 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
      davis_bacon: {
        comm_installer: { base: 57.90, fringe: 31.90, total: 89.80 },
        comm_tech:      { base: 64.00, fringe: 33.00, total: 97.00 },
        electrician:    { base: 74.20, fringe: 39.40, total: 113.60 },
        sound_comm:     { base: 57.90, fringe: 31.90, total: 89.80 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
    },

    // ── San Luis Obispo (IBEW Local 639) ──
    san_luis_obispo: {
      label: 'San Luis Obispo (IBEW 639)',
      dir: {
        comm_installer: { base: 51.80, fringe: 29.90, total: 81.70 },
        comm_tech:      { base: 57.90, fringe: 30.95, total: 88.85 },
        electrician:    { base: 68.10, fringe: 36.20, total: 104.30 },
        sound_comm:     { base: 51.80, fringe: 29.90, total: 81.70 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
      davis_bacon: {
        comm_installer: { base: 51.30, fringe: 29.60, total: 80.90 },
        comm_tech:      { base: 57.40, fringe: 30.65, total: 88.05 },
        electrician:    { base: 67.50, fringe: 35.90, total: 103.40 },
        sound_comm:     { base: 51.30, fringe: 29.60, total: 80.90 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
    },

    // ── Eastern Sierra / Rural (IBEW Local 1245 area) ──
    eastern_sierra: {
      label: 'Eastern Sierra / Rural',
      dir: {
        comm_installer: { base: 44.60, fringe: 26.80, total: 71.40 },
        comm_tech:      { base: 50.70, fringe: 27.60, total: 78.30 },
        electrician:    { base: 54.20, fringe: 29.80, total: 84.00 },
        sound_comm:     { base: 44.60, fringe: 26.80, total: 71.40 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
      davis_bacon: {
        comm_installer: { base: 44.20, fringe: 26.55, total: 70.75 },
        comm_tech:      { base: 50.20, fringe: 27.35, total: 77.55 },
        electrician:    { base: 53.70, fringe: 29.55, total: 83.25 },
        sound_comm:     { base: 44.20, fringe: 26.55, total: 70.75 },
        foreman_pct: 10,
        apprentice_pct: 50,
      },
    },

  },

  // ─── County → Zone Mapping ──────────────────────────────────
  // All 58 California counties mapped to their rate zone

  countyMap: {
    'Alameda':          'bay_area_east',
    'Alpine':           'eastern_sierra',
    'Amador':           'sacramento',
    'Butte':            'far_north',
    'Calaveras':        'central_valley_north',
    'Colusa':           'sacramento',
    'Contra Costa':     'bay_area_east',
    'Del Norte':        'north_coast',
    'El Dorado':        'sacramento',
    'Fresno':           'central_valley_south',
    'Glenn':            'far_north',
    'Humboldt':         'north_coast',
    'Imperial':         'san_diego',
    'Inyo':             'eastern_sierra',
    'Kern':             'bakersfield',
    'Kings':            'central_valley_south',
    'Lake':             'north_coast',
    'Lassen':           'far_north',
    'Los Angeles':      'los_angeles',
    'Madera':           'central_valley_south',
    'Marin':            'north_bay',
    'Mariposa':         'central_valley_south',
    'Mendocino':        'north_coast',
    'Merced':           'central_valley_north',
    'Modoc':            'far_north',
    'Mono':             'eastern_sierra',
    'Monterey':         'central_coast',
    'Napa':             'north_bay',
    'Nevada':           'sacramento',
    'Orange':           'orange_county',
    'Placer':           'sacramento',
    'Plumas':           'far_north',
    'Riverside':        'inland_empire',
    'Sacramento':       'sacramento',
    'San Benito':       'central_coast',
    'San Bernardino':   'inland_empire',
    'San Diego':        'san_diego',
    'San Francisco':    'bay_area_sf',
    'San Joaquin':      'central_valley_north',
    'San Luis Obispo':  'san_luis_obispo',
    'San Mateo':        'bay_area_sf',
    'Santa Barbara':    'santa_barbara',
    'Santa Clara':      'bay_area_south',
    'Santa Cruz':       'central_coast',
    'Shasta':           'far_north',
    'Sierra':           'far_north',
    'Siskiyou':         'far_north',
    'Solano':           'north_bay',
    'Sonoma':           'north_bay',
    'Stanislaus':       'central_valley_north',
    'Sutter':           'sacramento',
    'Tehama':           'far_north',
    'Trinity':          'north_coast',
    'Tulare':           'central_valley_south',
    'Tuolumne':         'central_valley_north',
    'Ventura':          'santa_barbara',
    'Yolo':             'sacramento',
    'Yuba':             'sacramento',
  },

  // ─── Helper Methods ─────────────────────────────────────────

  getCounties() {
    return Object.keys(this.countyMap).sort();
  },

  getZoneForCounty(county) {
    return this.countyMap[county] || null;
  },

  getRates(county, wageType) {
    const zone = this.countyMap[county];
    if (!zone) return null;
    const zoneData = this.zones[zone];
    if (!zoneData) return null;
    // PLA rates are typically 5-10% above DIR — use DIR as base with PLA multiplier
    if (wageType === 'davis-bacon') return zoneData.davis_bacon;
    if (wageType === 'pla' && zoneData.dir) {
      // Apply PLA premium (8% above DIR) since PLA agreements include additional trust fund contributions
      const plaRates = {};
      for (const [role, rateObj] of Object.entries(zoneData.dir)) {
        plaRates[role] = { base: +(rateObj.base * 1.08).toFixed(2), fringe: +(rateObj.fringe * 1.08).toFixed(2), total: +(rateObj.total * 1.08).toFixed(2) };
      }
      return plaRates;
    }
    return zoneData.dir;
  },

  getZoneLabel(county) {
    const zone = this.countyMap[county];
    return this.zones[zone]?.label || county;
  },

  // Calculate blended rate for a typical LV crew
  // 60% installer, 25% tech, 10% foreman, 5% apprentice
  getBlendedRate(county, wageType) {
    const rates = this.getRates(county, wageType);
    if (!rates) return null;

    const installerTotal = rates.comm_installer.total;
    const techTotal = rates.comm_tech.total;
    // Foreman = technician rate + foreman premium (10%)
    // In CA IBEW, foreman is based on the HIGHER classification (tech, not installer)
    // because foreman responsibilities include technical oversight
    const foremanTotal = rates.comm_tech.total * (1 + rates.foreman_pct / 100);
    const apprenticeTotal = rates.comm_installer.total * (rates.apprentice_pct / 100);

    return {
      installer: installerTotal,
      tech: techTotal,
      foreman: foremanTotal,
      apprentice: apprenticeTotal,
      blended: (installerTotal * 0.60) + (techTotal * 0.25) + (foremanTotal * 0.10) + (apprenticeTotal * 0.05),
    };
  },
};

// Make available globally
if (typeof window !== 'undefined') window.CA_PREVAILING_WAGES = CA_PREVAILING_WAGES;
