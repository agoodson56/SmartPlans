// ═══════════════════════════════════════════════════════════════
// NATIONAL PREVAILING WAGE DATABASE — v1.0
// Federal Davis-Bacon rates for major metro areas outside California
// Low Voltage / Communications trade classifications
// Rate effective dates: 2024-2025
// ═══════════════════════════════════════════════════════════════
//
// These are representative Davis-Bacon rates for the largest ELV markets.
// Rates vary by county — these use the primary metro area rate.
// For exact rates, consult sam.gov Wage Determinations.
//
// Classifications (same as CA database):
//   comm_installer — Communications System Installer
//   comm_tech      — Communications System Technician
//   electrician    — Inside Wireman / Electrician
//   foreman_pct    — Foreman premium (% above technician)
//   apprentice_pct — Apprentice ratio (% of installer)
// ═══════════════════════════════════════════════════════════════

const NATIONAL_PREVAILING_WAGES = {

  zones: {

    // ── TEXAS ──────────────────────────────────────────────────
    tx_dallas: {
      label: 'Texas — Dallas/Fort Worth',
      davis_bacon: {
        comm_installer: { base: 28.50, fringe: 12.85, total: 41.35 },
        comm_tech:      { base: 33.75, fringe: 14.20, total: 47.95 },
        electrician:    { base: 38.90, fringe: 17.45, total: 56.35 },
        foreman_pct: 10, apprentice_pct: 50,
      },
    },
    tx_houston: {
      label: 'Texas — Houston',
      davis_bacon: {
        comm_installer: { base: 27.80, fringe: 12.60, total: 40.40 },
        comm_tech:      { base: 32.90, fringe: 13.95, total: 46.85 },
        electrician:    { base: 37.50, fringe: 17.10, total: 54.60 },
        foreman_pct: 10, apprentice_pct: 50,
      },
    },
    tx_austin: {
      label: 'Texas — Austin/San Antonio',
      davis_bacon: {
        comm_installer: { base: 26.40, fringe: 11.90, total: 38.30 },
        comm_tech:      { base: 31.20, fringe: 13.50, total: 44.70 },
        electrician:    { base: 36.00, fringe: 16.40, total: 52.40 },
        foreman_pct: 10, apprentice_pct: 50,
      },
    },

    // ── FLORIDA ────────────────────────────────────────────────
    fl_miami: {
      label: 'Florida — Miami/Fort Lauderdale',
      davis_bacon: {
        comm_installer: { base: 26.80, fringe: 12.40, total: 39.20 },
        comm_tech:      { base: 31.50, fringe: 13.80, total: 45.30 },
        electrician:    { base: 36.75, fringe: 16.90, total: 53.65 },
        foreman_pct: 10, apprentice_pct: 50,
      },
    },
    fl_orlando: {
      label: 'Florida — Orlando/Tampa',
      davis_bacon: {
        comm_installer: { base: 24.90, fringe: 11.40, total: 36.30 },
        comm_tech:      { base: 29.50, fringe: 12.80, total: 42.30 },
        electrician:    { base: 34.20, fringe: 15.60, total: 49.80 },
        foreman_pct: 10, apprentice_pct: 50,
      },
    },
    fl_jacksonville: {
      label: 'Florida — Jacksonville',
      davis_bacon: {
        comm_installer: { base: 24.10, fringe: 11.00, total: 35.10 },
        comm_tech:      { base: 28.60, fringe: 12.40, total: 41.00 },
        electrician:    { base: 33.25, fringe: 15.20, total: 48.45 },
        foreman_pct: 10, apprentice_pct: 50,
      },
    },

    // ── NEW YORK ───────────────────────────────────────────────
    ny_nyc: {
      label: 'New York — NYC Metro (IBEW 3)',
      davis_bacon: {
        comm_installer: { base: 62.50, fringe: 42.30, total: 104.80 },
        comm_tech:      { base: 68.90, fringe: 44.60, total: 113.50 },
        electrician:    { base: 82.75, fringe: 52.40, total: 135.15 },
        foreman_pct: 15, apprentice_pct: 50,
      },
    },
    ny_upstate: {
      label: 'New York — Upstate (Albany/Buffalo/Syracuse)',
      davis_bacon: {
        comm_installer: { base: 38.20, fringe: 22.50, total: 60.70 },
        comm_tech:      { base: 43.80, fringe: 24.10, total: 67.90 },
        electrician:    { base: 52.40, fringe: 30.15, total: 82.55 },
        foreman_pct: 10, apprentice_pct: 50,
      },
    },

    // ── ILLINOIS ───────────────────────────────────────────────
    il_chicago: {
      label: 'Illinois — Chicago Metro (IBEW 134)',
      davis_bacon: {
        comm_installer: { base: 48.50, fringe: 32.80, total: 81.30 },
        comm_tech:      { base: 54.20, fringe: 35.10, total: 89.30 },
        electrician:    { base: 64.75, fringe: 40.25, total: 105.00 },
        foreman_pct: 15, apprentice_pct: 50,
      },
    },

    // ── WASHINGTON STATE ───────────────────────────────────────
    wa_seattle: {
      label: 'Washington — Seattle/Puget Sound',
      davis_bacon: {
        comm_installer: { base: 45.20, fringe: 28.90, total: 74.10 },
        comm_tech:      { base: 50.80, fringe: 31.40, total: 82.20 },
        electrician:    { base: 60.50, fringe: 37.60, total: 98.10 },
        foreman_pct: 10, apprentice_pct: 55,
      },
    },

    // ── COLORADO ───────────────────────────────────────────────
    co_denver: {
      label: 'Colorado — Denver Metro',
      davis_bacon: {
        comm_installer: { base: 32.40, fringe: 16.80, total: 49.20 },
        comm_tech:      { base: 37.60, fringe: 18.90, total: 56.50 },
        electrician:    { base: 44.20, fringe: 23.50, total: 67.70 },
        foreman_pct: 10, apprentice_pct: 50,
      },
    },

    // ── GEORGIA ────────────────────────────────────────────────
    ga_atlanta: {
      label: 'Georgia — Atlanta Metro',
      davis_bacon: {
        comm_installer: { base: 26.20, fringe: 12.10, total: 38.30 },
        comm_tech:      { base: 31.00, fringe: 13.60, total: 44.60 },
        electrician:    { base: 36.40, fringe: 16.70, total: 53.10 },
        foreman_pct: 10, apprentice_pct: 50,
      },
    },

    // ── ARIZONA ────────────────────────────────────────────────
    az_phoenix: {
      label: 'Arizona — Phoenix Metro',
      davis_bacon: {
        comm_installer: { base: 27.80, fringe: 13.20, total: 41.00 },
        comm_tech:      { base: 32.50, fringe: 14.80, total: 47.30 },
        electrician:    { base: 38.10, fringe: 18.20, total: 56.30 },
        foreman_pct: 10, apprentice_pct: 50,
      },
    },

    // ── NEVADA ─────────────────────────────────────────────────
    nv_vegas: {
      label: 'Nevada — Las Vegas',
      davis_bacon: {
        comm_installer: { base: 35.60, fringe: 18.90, total: 54.50 },
        comm_tech:      { base: 40.80, fringe: 21.20, total: 62.00 },
        electrician:    { base: 48.50, fringe: 26.40, total: 74.90 },
        foreman_pct: 10, apprentice_pct: 50,
      },
    },

    // ── MASSACHUSETTS ──────────────────────────────────────────
    ma_boston: {
      label: 'Massachusetts — Boston Metro (IBEW 103)',
      davis_bacon: {
        comm_installer: { base: 52.40, fringe: 35.80, total: 88.20 },
        comm_tech:      { base: 58.20, fringe: 38.50, total: 96.70 },
        electrician:    { base: 69.80, fringe: 44.20, total: 114.00 },
        foreman_pct: 10, apprentice_pct: 50,
      },
    },

    // ── NEW JERSEY ─────────────────────────────────────────────
    nj_north: {
      label: 'New Jersey — Northern (NYC Metro)',
      davis_bacon: {
        comm_installer: { base: 55.80, fringe: 38.40, total: 94.20 },
        comm_tech:      { base: 61.50, fringe: 40.80, total: 102.30 },
        electrician:    { base: 74.20, fringe: 48.60, total: 122.80 },
        foreman_pct: 15, apprentice_pct: 50,
      },
    },

    // ── PENNSYLVANIA ───────────────────────────────────────────
    pa_philly: {
      label: 'Pennsylvania — Philadelphia (IBEW 98)',
      davis_bacon: {
        comm_installer: { base: 45.80, fringe: 30.20, total: 76.00 },
        comm_tech:      { base: 51.40, fringe: 33.10, total: 84.50 },
        electrician:    { base: 61.20, fringe: 39.80, total: 101.00 },
        foreman_pct: 10, apprentice_pct: 50,
      },
    },

    // ── VIRGINIA / DC ──────────────────────────────────────────
    dc_metro: {
      label: 'DC Metro — Washington DC/Northern Virginia',
      davis_bacon: {
        comm_installer: { base: 38.60, fringe: 20.40, total: 59.00 },
        comm_tech:      { base: 44.20, fringe: 22.80, total: 67.00 },
        electrician:    { base: 52.80, fringe: 28.40, total: 81.20 },
        foreman_pct: 10, apprentice_pct: 50,
      },
    },

    // ── NORTH CAROLINA ─────────────────────────────────────────
    nc_charlotte: {
      label: 'North Carolina — Charlotte/Raleigh',
      davis_bacon: {
        comm_installer: { base: 23.80, fringe: 10.60, total: 34.40 },
        comm_tech:      { base: 28.20, fringe: 12.10, total: 40.30 },
        electrician:    { base: 32.50, fringe: 14.80, total: 47.30 },
        foreman_pct: 10, apprentice_pct: 50,
      },
    },

    // ── OHIO ───────────────────────────────────────────────────
    oh_columbus: {
      label: 'Ohio — Columbus/Cleveland/Cincinnati',
      davis_bacon: {
        comm_installer: { base: 32.80, fringe: 18.40, total: 51.20 },
        comm_tech:      { base: 37.90, fringe: 20.60, total: 58.50 },
        electrician:    { base: 44.80, fringe: 25.20, total: 70.00 },
        foreman_pct: 10, apprentice_pct: 50,
      },
    },

    // ── MICHIGAN ───────────────────────────────────────────────
    mi_detroit: {
      label: 'Michigan — Detroit Metro (IBEW 58)',
      davis_bacon: {
        comm_installer: { base: 36.40, fringe: 22.80, total: 59.20 },
        comm_tech:      { base: 41.60, fringe: 25.10, total: 66.70 },
        electrician:    { base: 50.20, fringe: 31.40, total: 81.60 },
        foreman_pct: 10, apprentice_pct: 50,
      },
    },

    // ── OREGON ─────────────────────────────────────────────────
    or_portland: {
      label: 'Oregon — Portland Metro',
      davis_bacon: {
        comm_installer: { base: 42.80, fringe: 26.40, total: 69.20 },
        comm_tech:      { base: 48.50, fringe: 29.10, total: 77.60 },
        electrician:    { base: 57.80, fringe: 35.20, total: 93.00 },
        foreman_pct: 10, apprentice_pct: 55,
      },
    },
  },

  // ─── State → Metro Zone Mapping ────────────────────────────
  // Maps state abbreviations to their primary metro zone
  stateMap: {
    'TX': ['tx_dallas', 'tx_houston', 'tx_austin'],
    'FL': ['fl_miami', 'fl_orlando', 'fl_jacksonville'],
    'NY': ['ny_nyc', 'ny_upstate'],
    'IL': ['il_chicago'],
    'WA': ['wa_seattle'],
    'CO': ['co_denver'],
    'GA': ['ga_atlanta'],
    'AZ': ['az_phoenix'],
    'NV': ['nv_vegas'],
    'MA': ['ma_boston'],
    'NJ': ['nj_north'],
    'PA': ['pa_philly'],
    'VA': ['dc_metro'],
    'DC': ['dc_metro'],
    'MD': ['dc_metro'],
    'NC': ['nc_charlotte'],
    'OH': ['oh_columbus'],
    'MI': ['mi_detroit'],
    'OR': ['or_portland'],
  },

  // ─── Helper Methods ────────────────────────────────────────

  getStates() {
    return Object.keys(this.stateMap).sort();
  },

  getMetrosForState(stateAbbr) {
    const zones = this.stateMap[stateAbbr.toUpperCase()] || [];
    return zones.map(z => ({ key: z, label: this.zones[z]?.label || z }));
  },

  getRates(zoneKey) {
    const zone = this.zones[zoneKey];
    return zone ? zone.davis_bacon : null;
  },

  getZoneLabel(zoneKey) {
    return this.zones[zoneKey]?.label || zoneKey;
  },

  getBlendedRate(zoneKey) {
    const rates = this.getRates(zoneKey);
    if (!rates) return null;

    const installerTotal = rates.comm_installer.total;
    const techTotal = rates.comm_tech.total;
    // Foreman = technician rate + foreman premium (10%)
    // Based on higher classification (tech) since foreman has technical oversight role
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

  // Find best zone match from a location string like "Austin, TX" or "Miami, FL"
  findZoneFromLocation(locationStr) {
    if (!locationStr) return null;
    const upper = locationStr.toUpperCase();

    // Try state abbreviation match
    for (const [state, zones] of Object.entries(this.stateMap)) {
      if (upper.includes(state) || upper.includes(this._stateNames[state] || '')) {
        // If multiple zones, try to match city name
        if (zones.length > 1) {
          for (const z of zones) {
            const label = (this.zones[z]?.label || '').toUpperCase();
            // Check if any city from the label appears in the location
            const cities = label.split(/[—\/]/)[1]?.trim().split(/[\/,]/) || [];
            for (const city of cities) {
              if (city.trim() && upper.includes(city.trim())) return z;
            }
          }
        }
        return zones[0]; // Default to first zone in state
      }
    }
    return null;
  },

  _stateNames: {
    'TX': 'TEXAS', 'FL': 'FLORIDA', 'NY': 'NEW YORK', 'IL': 'ILLINOIS',
    'WA': 'WASHINGTON', 'CO': 'COLORADO', 'GA': 'GEORGIA', 'AZ': 'ARIZONA',
    'NV': 'NEVADA', 'MA': 'MASSACHUSETTS', 'NJ': 'NEW JERSEY', 'PA': 'PENNSYLVANIA',
    'VA': 'VIRGINIA', 'DC': 'DISTRICT OF COLUMBIA', 'MD': 'MARYLAND',
    'NC': 'NORTH CAROLINA', 'OH': 'OHIO', 'MI': 'MICHIGAN', 'OR': 'OREGON',
  },
};
