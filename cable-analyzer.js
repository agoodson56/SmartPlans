// ═══════════════════════════════════════════════════════════════════════
// CABLE ANALYZER — Per-device cable run calculator for SmartPlans
// Assigns each detected device to its nearest IDF/MDF and calculates
// cable run lengths using spatial data from the DEVICE_LOCATOR brain.
// Falls back to zone-level estimates when per-device positions unavailable.
// ═══════════════════════════════════════════════════════════════════════

const CableAnalyzer = {

  // ── Default assumptions (user-configurable via Phase 4 UI) ──
  defaults: {
    slackFt:          15,    // Termination + dressing + slack loops (both ends)
    wastePct:         12,    // Cable waste percentage
    ceilingHeightFt:  10,    // Typical finished ceiling height
    floorToFloorFt:   14,    // Slab-to-slab height for riser runs
    stubUpFt:         10,    // Vertical stub-up from device to plenum
    tiaMaxFt:         295,   // TIA-568 horizontal cable distance limit (100m)
    defaultRunFt:     150,   // Fallback when no spatial data available
    jHookSpacingFt:   4.5,   // J-hook every 4.5 ft of horizontal run
  },

  // ── Config schema for UI rendering (Phase 4) ──
  configSchema: {
    slackFt:         { label: 'Slack / Termination (ft)',  min: 5,   max: 50,  step: 1   },
    wastePct:        { label: 'Waste Factor (%)',          min: 0,   max: 30,  step: 1   },
    ceilingHeightFt: { label: 'Ceiling Height (ft)',       min: 8,   max: 30,  step: 0.5 },
    floorToFloorFt:  { label: 'Floor-to-Floor (ft)',       min: 10,  max: 25,  step: 0.5 },
    stubUpFt:        { label: 'Stub-Up Height (ft)',       min: 0,   max: 20,  step: 1   },
    tiaMaxFt:        { label: 'TIA-568 Max (ft)',          min: 200, max: 328, step: 1   },
    defaultRunFt:    { label: 'Default Avg Run (ft)',      min: 50,  max: 300, step: 10  },
    jHookSpacingFt:  { label: 'J-Hook Spacing (ft)',       min: 3,   max: 6,   step: 0.5 },
  },

  // ── Cable type mapping by device category ──
  _cableTypeMap: {
    // CCTV
    dome_camera:      'cat6a_plenum',
    bullet_camera:    'cat6a_plenum',
    ptz_camera:       'cat6a_plenum',
    panoramic_camera: 'cat6a_plenum',
    lpr_camera:       'cat6a_plenum',
    fisheye_camera:   'cat6a_plenum',
    camera:           'cat6a_plenum',
    // Structured Cabling
    data_outlet:      'cat6a_plenum',
    voice_outlet:     'cat6a_plenum',
    wap:              'cat6a_plenum',
    wireless_ap:      'cat6a_plenum',
    // Access Control
    card_reader:      '22/6_18/4_composite',
    keypad:           '22/6_18/4_composite',
    rex_button:       '22/4',
    door_contact:     '22/4',
    electric_strike:  '18/2',
    mag_lock:         '18/2',
    // Fire Alarm
    pull_station:     '18/2_fplr_shielded',
    smoke_detector:   '18/2_fplr_shielded',
    heat_detector:    '18/2_fplr_shielded',
    horn_strobe:      '18/2_fplr_shielded',
    speaker_strobe:   '18/2_fplr_shielded',
    duct_detector:    '18/2_fplr_shielded',
    // AV / Paging
    speaker:          '18/2_plenum',
    amplifier:        '18/2_plenum',
    display:          'cat6a_plenum',
    projector:        'cat6a_plenum',
    // Infrastructure (no cable — these are home-run points)
    idf:              null,
    mdf:              null,
    telecom_room:     null,
    facp:             null,
    access_panel:     null,
  },

  // ── Cable cost rates (per ft) by cable type ──
  _cableRates: {
    'cat6a_plenum':          0.38,
    'cat6a_riser':           0.30,
    'cat6_plenum':           0.22,
    'cat6_riser':            0.18,
    'cat5e_plenum':          0.15,
    '22/6_18/4_composite':   0.35,
    '22/4':                  0.12,
    '18/2':                  0.10,
    '18/2_fplr_shielded':    0.28,
    '18/2_plenum':           0.14,
    'fiber_sm':              0.45,
    'fiber_mm':              0.40,
  },

  // ═══════════════════════════════════════════════════════════════
  // MAIN ENTRY POINT
  // ═══════════════════════════════════════════════════════════════
  buildCableSchedule(state, overrides) {
    const cfg = { ...this.defaults, ...(overrides || {}) };
    const wasteMult = 1 + (cfg.wastePct / 100);

    const deviceLocator = state.brainResults?.wave1?.DEVICE_LOCATOR;
    const spatial       = state.brainResults?.wave0?.SPATIAL_LAYOUT || {};
    const cablePathway  = state.brainResults?.wave1?.CABLE_PATHWAY || {};
    const mdfIdf        = state.brainResults?.wave1?.MDF_IDF_ANALYZER || {};

    // Build IDF/MDF position map
    const idfMap = this._buildIdfMap(spatial, mdfIdf, deviceLocator);
    const sheetDims = this._buildSheetDims(spatial);
    const bldgW = spatial.building_dimensions?.overall_width_ft || state.floorPlateWidth || 0;
    const bldgD = spatial.building_dimensions?.overall_depth_ft || state.floorPlateDepth || 0;

    let assignments = [];
    let mode = 'fallback';

    if (deviceLocator?.devices?.length > 0) {
      // ── DEVICE-LEVEL MODE: per-device positions from DEVICE_LOCATOR ──
      mode = 'device-level';
      assignments = this._assignFromDeviceLocator(deviceLocator.devices, idfMap, sheetDims, bldgW, bldgD, cfg, wasteMult);
    } else if (cablePathway?.horizontal_cables?.length > 0) {
      // ── ZONE-LEVEL MODE: fall back to CABLE_PATHWAY zone data ──
      mode = 'zone-level';
      assignments = this._assignFromZones(cablePathway, idfMap, sheetDims, bldgW, bldgD, cfg, wasteMult);
    }

    if (assignments.length === 0) return null;

    // Build grouped views
    const byIdf       = this._groupBy(assignments, 'idfAssigned');
    const byFloor     = this._groupBy(assignments, 'floor');
    const byCableType = this._groupBy(assignments, 'cableType');

    // Totals
    const totalDevices  = assignments.reduce((s, a) => s + a.qty, 0);
    const totalFt       = assignments.reduce((s, a) => s + a.totalFtWithWaste, 0);
    const totalCost     = assignments.reduce((s, a) => s + a.totalCost, 0);
    const runs          = assignments.filter(a => a.runFt > 0);
    const avgRunFt      = runs.length > 0 ? Math.round(runs.reduce((s, a) => s + a.runFt, 0) / runs.length) : 0;
    const maxRunFt      = runs.length > 0 ? Math.max(...runs.map(a => a.runFt)) : 0;
    const minRunFt      = runs.length > 0 ? Math.min(...runs.map(a => a.runFt)) : 0;
    const tiaViolations = assignments.filter(a => a.tiaViolation);

    // Pathway materials estimate
    const totalHorizontalFt = assignments.reduce((s, a) => s + (a.horizontal || 0) * a.qty, 0);
    const pathwayMaterials = {
      jHooks: Math.ceil(totalHorizontalFt / cfg.jHookSpacingFt),
      fireStopPenetrations: Object.keys(byFloor).length > 1 ? Object.keys(byIdf).length * (Object.keys(byFloor).length - 1) : 0,
    };

    return {
      assignments,
      byIdf,
      byFloor,
      byCableType,
      totals: { totalDevices, totalFt, totalCost, avgRunFt, maxRunFt, minRunFt, tiaViolationCount: tiaViolations.length },
      tiaViolations,
      pathwayMaterials,
      config: cfg,
      mode,
      idfCount: Object.keys(idfMap).length,
      generatedAt: new Date().toISOString(),
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // DEVICE-LEVEL ASSIGNMENT (from DEVICE_LOCATOR brain)
  // ═══════════════════════════════════════════════════════════════
  _assignFromDeviceLocator(devices, idfMap, sheetDims, bldgW, bldgD, cfg, wasteMult) {
    const assignments = [];
    let devIdx = 0;

    // Separate home-run points and endpoint devices
    const homeRunDevices = devices.filter(d => d.is_home_run);
    const endpointDevices = devices.filter(d => !d.is_home_run);

    // Add home-run points to IDF map if not already there
    homeRunDevices.forEach(d => {
      const label = d.room || d.type || `HRP-${d.id}`;
      if (!idfMap[label]) {
        idfMap[label] = {
          x: d.x_pct || 50,
          y: d.y_pct || 50,
          floor: parseInt(d.floor) || 1,
          sheet: d.sheet_id,
          type: d.type,
        };
      }
    });

    endpointDevices.forEach(d => {
      const cableType = this._getCableType(d.type, d.subtype);
      if (!cableType) return; // skip infrastructure devices

      const qty = d.qty || 1;
      const idfResult = this._findNearestIdf(d, idfMap, sheetDims, bldgW, bldgD);
      const runCalc = this._calcRunLength(d, idfResult.idf, idfResult.dims, cfg);
      const totalFtWithWaste = Math.round(qty * runCalc.totalFt * wasteMult);
      const costPerFt = this._cableRates[cableType] || 0.32;
      const totalCost = Math.round(totalFtWithWaste * costPerFt * 100) / 100;

      assignments.push({
        deviceId: d.id || `DEV-${String(++devIdx).padStart(3, '0')}`,
        deviceType: d.type || 'unknown',
        deviceSubtype: d.subtype || '',
        room: d.room || 'Unknown',
        floor: String(d.floor || '1'),
        sheetId: d.sheet_id || 'N/A',
        idfAssigned: idfResult.label,
        cableType,
        cableTypeLabel: this._cableLabel(cableType),
        runFt: runCalc.totalFt,
        horizontal: runCalc.horizontal,
        vertical: runCalc.vertical,
        slack: runCalc.slack,
        qty,
        totalFtWithWaste,
        costPerFt,
        totalCost,
        tiaViolation: runCalc.totalFt > cfg.tiaMaxFt,
        basis: runCalc.basis,
        notes: d.notes || '',
      });
    });

    return assignments;
  },

  // ═══════════════════════════════════════════════════════════════
  // ZONE-LEVEL FALLBACK (from CABLE_PATHWAY brain)
  // ═══════════════════════════════════════════════════════════════
  _assignFromZones(cablePathway, idfMap, sheetDims, bldgW, bldgD, cfg, wasteMult) {
    const assignments = [];
    let devIdx = 0;

    (cablePathway.horizontal_cables || []).forEach(hc => {
      const cableType = this._normalizeCableType(hc.type, hc.rating);
      const zones = hc.zones || [];

      if (zones.length > 0) {
        zones.forEach(z => {
          const qty = z.device_count || 0;
          if (qty === 0) return;

          let runFt = cfg.defaultRunFt;
          let basis = 'default average';
          const idf = idfMap[z.idf_serving];

          if (idf && (Object.keys(sheetDims).length > 0 || (bldgW > 0 && bldgD > 0))) {
            const dims = (z.sheet_id && sheetDims[z.sheet_id]) || { w: bldgW, d: bldgD };
            const dx = Math.abs((z.approx_x_pct || 50) - idf.x) / 100 * (dims.w || 200);
            const dy = Math.abs((z.approx_y_pct || 50) - idf.y) / 100 * (dims.d || 200);
            const floorsApart = Math.abs((z.floor || 1) - (idf.floor || 1));
            const vert = floorsApart > 0 ? floorsApart * cfg.floorToFloorFt : cfg.ceilingHeightFt;
            runFt = Math.round(dx + dy + vert + cfg.slackFt);
            basis = 'zone spatial calc';
          } else if (z.est_run_ft) {
            runFt = z.est_run_ft;
            basis = 'AI zone estimate';
          }

          const totalFtWithWaste = Math.round(qty * runFt * wasteMult);
          const costPerFt = this._cableRates[cableType] || 0.32;
          const totalCost = Math.round(totalFtWithWaste * costPerFt * 100) / 100;

          assignments.push({
            deviceId: `ZONE-${String(++devIdx).padStart(3, '0')}`,
            deviceType: z.zone_name || z.zone || 'Zone',
            deviceSubtype: hc.type || '',
            room: z.zone_name || z.zone || 'Various',
            floor: String(z.floor || '1'),
            sheetId: z.sheet_id || 'N/A',
            idfAssigned: z.idf_serving || 'Unknown',
            cableType,
            cableTypeLabel: this._cableLabel(cableType),
            runFt,
            horizontal: runFt - cfg.slackFt - cfg.ceilingHeightFt,
            vertical: cfg.ceilingHeightFt,
            slack: cfg.slackFt,
            qty,
            totalFtWithWaste,
            costPerFt,
            totalCost,
            tiaViolation: runFt > cfg.tiaMaxFt,
            basis,
            notes: '',
          });
        });
      } else {
        // Flat fallback — single average
        const qty = hc.count || 0;
        if (qty === 0) return;
        const runFt = hc.avg_length_ft || cfg.defaultRunFt;
        const totalFtWithWaste = Math.round(qty * runFt * wasteMult);
        const costPerFt = this._cableRates[cableType] || 0.32;
        const totalCost = Math.round(totalFtWithWaste * costPerFt * 100) / 100;

        assignments.push({
          deviceId: `AVG-${String(++devIdx).padStart(3, '0')}`,
          deviceType: hc.type || 'Cable',
          deviceSubtype: hc.rating || '',
          room: 'All areas',
          floor: '1',
          sheetId: 'N/A',
          idfAssigned: 'Various',
          cableType,
          cableTypeLabel: this._cableLabel(cableType),
          runFt,
          horizontal: runFt - cfg.slackFt - cfg.ceilingHeightFt,
          vertical: cfg.ceilingHeightFt,
          slack: cfg.slackFt,
          qty,
          totalFtWithWaste,
          costPerFt,
          totalCost,
          tiaViolation: runFt > cfg.tiaMaxFt,
          basis: `${qty} drops x ${runFt} ft avg`,
          notes: 'No zone or device position data',
        });
      }
    });

    return assignments;
  },

  // ═══════════════════════════════════════════════════════════════
  // HELPER: Build IDF position map from multiple data sources
  // ═══════════════════════════════════════════════════════════════
  _buildIdfMap(spatial, mdfIdf, deviceLocator) {
    const map = {};

    // Source 1: SPATIAL_LAYOUT floors → idf_locations
    (spatial.floors || []).forEach(fl => {
      (fl.idf_locations || []).forEach(idf => {
        map[idf.label || idf.name] = {
          x: idf.approx_x_pct || 50,
          y: idf.approx_y_pct || 50,
          floor: parseInt(fl.floor) || 1,
          sheet: null,
          type: idf.type || 'idf',
        };
      });
    });

    // Source 2: MDF_IDF_ANALYZER rooms
    (mdfIdf.rooms || []).forEach(r => {
      const label = r.name || r.room_number || `${r.type}-${r.floor}`;
      if (!map[label]) {
        map[label] = {
          x: 50, y: 50, // no position data from this brain
          floor: parseInt(r.floor) || 1,
          sheet: null,
          type: r.type || 'idf',
        };
      }
    });

    // Source 3: DEVICE_LOCATOR home-run devices (highest accuracy)
    if (deviceLocator?.devices) {
      deviceLocator.devices.filter(d => d.is_home_run).forEach(d => {
        const label = d.room || d.type || d.id;
        map[label] = {
          x: d.x_pct || 50,
          y: d.y_pct || 50,
          floor: parseInt(d.floor) || 1,
          sheet: d.sheet_id,
          type: d.type || 'idf',
        };
      });
    }

    return map;
  },

  // ═══════════════════════════════════════════════════════════════
  // HELPER: Build per-sheet dimension map
  // ═══════════════════════════════════════════════════════════════
  _buildSheetDims(spatial) {
    const dims = {};
    (spatial.sheets || []).forEach(sh => {
      if (sh.sheet_id && sh.sheet_area_width_ft > 0 && sh.sheet_area_depth_ft > 0) {
        dims[sh.sheet_id] = { w: sh.sheet_area_width_ft, d: sh.sheet_area_depth_ft };
      }
    });
    return dims;
  },

  // ═══════════════════════════════════════════════════════════════
  // HELPER: Find nearest IDF for a device
  // ═══════════════════════════════════════════════════════════════
  _findNearestIdf(device, idfMap, sheetDims, bldgW, bldgD) {
    const labels = Object.keys(idfMap);
    if (labels.length === 0) {
      return { label: 'Unknown IDF', idf: { x: 50, y: 50, floor: 1 }, dims: { w: bldgW || 200, d: bldgD || 200 } };
    }

    const devFloor = parseInt(device.floor) || 1;
    let bestLabel = labels[0];
    let bestDist = Infinity;

    labels.forEach(label => {
      const idf = idfMap[label];
      const dims = (device.sheet_id && sheetDims[device.sheet_id]) || { w: bldgW || 200, d: bldgD || 200 };
      const dx = Math.abs((device.x_pct || 50) - idf.x) / 100 * dims.w;
      const dy = Math.abs((device.y_pct || 50) - idf.y) / 100 * dims.d;
      const floorsApart = Math.abs(devFloor - (idf.floor || 1));
      // Penalize cross-floor routing heavily (prefer same-floor IDF)
      const floorPenalty = floorsApart * 100;
      const dist = dx + dy + floorPenalty;

      if (dist < bestDist) {
        bestDist = dist;
        bestLabel = label;
      }
    });

    const dims = (device.sheet_id && sheetDims[device.sheet_id]) || { w: bldgW || 200, d: bldgD || 200 };
    return { label: bestLabel, idf: idfMap[bestLabel], dims };
  },

  // ═══════════════════════════════════════════════════════════════
  // HELPER: Calculate cable run length
  // ═══════════════════════════════════════════════════════════════
  _calcRunLength(device, idf, dims, cfg) {
    const dx = Math.abs((device.x_pct || 50) - (idf?.x || 50)) / 100 * (dims?.w || 200);
    const dy = Math.abs((device.y_pct || 50) - (idf?.y || 50)) / 100 * (dims?.d || 200);
    const horizontal = Math.round(dx + dy);

    const devFloor = parseInt(device.floor) || 1;
    const idfFloor = idf?.floor || 1;
    const floorsApart = Math.abs(devFloor - idfFloor);
    const vertical = floorsApart > 0
      ? floorsApart * cfg.floorToFloorFt + cfg.stubUpFt
      : cfg.stubUpFt;

    const totalFt = Math.round(horizontal + vertical + cfg.slackFt);

    return {
      horizontal,
      vertical: Math.round(vertical),
      slack: cfg.slackFt,
      totalFt,
      basis: dims?.w > 0 ? 'spatial calculation' : 'estimated',
    };
  },

  // ═══════════════════════════════════════════════════════════════
  // HELPER: Group assignments by a field
  // ═══════════════════════════════════════════════════════════════
  _groupBy(assignments, field) {
    const groups = {};
    assignments.forEach(a => {
      const key = a[field] || 'Unknown';
      if (!groups[key]) {
        groups[key] = { label: key, devices: [], totalFt: 0, totalCost: 0, deviceCount: 0 };
      }
      groups[key].devices.push(a);
      groups[key].totalFt += a.totalFtWithWaste;
      groups[key].totalCost += a.totalCost;
      groups[key].deviceCount += a.qty;
    });
    return groups;
  },

  // ═══════════════════════════════════════════════════════════════
  // HELPER: Get cable type for a device type
  // ═══════════════════════════════════════════════════════════════
  _getCableType(type, subtype) {
    const t = (type || '').toLowerCase().replace(/[\s-]/g, '_');
    // Direct match
    if (this._cableTypeMap[t] !== undefined) return this._cableTypeMap[t];
    // Partial match
    if (t.includes('camera') || t.includes('cam')) return 'cat6a_plenum';
    if (t.includes('reader') || t.includes('keypad')) return '22/6_18/4_composite';
    if (t.includes('data') || t.includes('outlet') || t.includes('wap') || t.includes('wireless')) return 'cat6a_plenum';
    if (t.includes('smoke') || t.includes('heat') || t.includes('pull') || t.includes('strobe') || t.includes('horn') || t.includes('duct')) return '18/2_fplr_shielded';
    if (t.includes('speaker') || t.includes('paging')) return '18/2_plenum';
    if (t.includes('display') || t.includes('projector') || t.includes('monitor')) return 'cat6a_plenum';
    if (t.includes('rex') || t.includes('contact') || t.includes('sensor')) return '22/4';
    if (t.includes('lock') || t.includes('strike') || t.includes('latch')) return '18/2';
    // Default — if it's infrastructure, no cable
    if (t.includes('idf') || t.includes('mdf') || t.includes('panel') || t.includes('facp') || t.includes('telecom')) return null;
    return 'cat6a_plenum'; // safe default for unknown endpoint devices
  },

  // ═══════════════════════════════════════════════════════════════
  // HELPER: Normalize cable type string from CABLE_PATHWAY data
  // ═══════════════════════════════════════════════════════════════
  _normalizeCableType(type, rating) {
    const t = (type || '').toLowerCase();
    const r = (rating || '').toLowerCase();
    if (t.includes('6a') || t.includes('cat6a')) return r.includes('riser') ? 'cat6a_riser' : 'cat6a_plenum';
    if (t.includes('cat6') || t === 'cat6') return r.includes('riser') ? 'cat6_riser' : 'cat6_plenum';
    if (t.includes('5e') || t.includes('cat5')) return r.includes('riser') ? 'cat5e_riser' : 'cat5e_plenum';
    if (t.includes('fiber') && t.includes('sm')) return 'fiber_sm';
    if (t.includes('fiber') && t.includes('mm')) return 'fiber_mm';
    if (t.includes('fplr') || t.includes('fire')) return '18/2_fplr_shielded';
    if (t.includes('22/6') || t.includes('composite')) return '22/6_18/4_composite';
    if (t.includes('18/2')) return '18/2';
    if (t.includes('22/4')) return '22/4';
    return 'cat6a_plenum';
  },

  // ═══════════════════════════════════════════════════════════════
  // HELPER: Human-readable cable type label
  // ═══════════════════════════════════════════════════════════════
  _cableLabel(type) {
    const labels = {
      'cat6a_plenum':         'Cat6A Plenum',
      'cat6a_riser':          'Cat6A Riser',
      'cat6_plenum':          'Cat6 Plenum',
      'cat6_riser':           'Cat6 Riser',
      'cat5e_plenum':         'Cat5e Plenum',
      'cat5e_riser':          'Cat5e Riser',
      '22/6_18/4_composite':  '22/6+18/4 Composite',
      '22/4':                 '22/4 Shielded',
      '18/2':                 '18/2',
      '18/2_fplr_shielded':   '18/2 FPLR Shielded',
      '18/2_plenum':          '18/2 Plenum',
      'fiber_sm':             'SM Fiber',
      'fiber_mm':             'MM Fiber',
    };
    return labels[type] || type || 'Unknown';
  },

  // ═══════════════════════════════════════════════════════════════
  // FORMAT HELPERS for UI
  // ═══════════════════════════════════════════════════════════════
  fmtFt(n)   { return (n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 }); },
  fmtCost(n) { return '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); },
};

// Make available globally (loaded via <script> tag)
if (typeof window !== 'undefined') window.CableAnalyzer = CableAnalyzer;
