// ═══════════════════════════════════════════════════════════════════════
// SMARTPLANS — SCALE CALIBRATION & DISTANCE MEASUREMENT MODULE
// Two-pass scale detection (explicit + door calibration) with manual override.
// Measures real-world distances between devices for cable run calculation.
// ═══════════════════════════════════════════════════════════════════════

const ScaleCalibration = {

  VERSION: '1.0.0',

  // ── Standard reference dimensions for calibration ──
  DOOR_WIDTHS: {
    commercial_single: 36,   // 3'-0" standard commercial
    commercial_double: 72,   // 6'-0" double door
    residential_entry: 36,   // 3'-0" front door
    residential_bedroom: 32, // 2'-8" interior
    residential_bathroom: 28,// 2'-4" bathroom
    ada_minimum: 36,         // ADA requires min 36" clear
  },

  // ── Routing multipliers (straight-line → estimated actual path) ──
  ROUTING: {
    standard:       1.15,   // Industry standard slack/routing factor
    corridor_heavy: 1.25,   // Buildings with lots of corridors (schools, hospitals)
    open_plan:      1.10,   // Open office / warehouse
    multi_floor:    1.20,   // Cross-floor penalty
    ceiling_drop:   10,     // Feet for ceiling drop (plenum to device)
    wall_mount:     4,      // Feet for wall-mount drop
    floor_mount:    2,      // Feet for floor device
  },

  // ── Round-up increment for cable ordering ──
  CABLE_ROUND_UP_FT: 5,

  // ═══════════════════════════════════════════════════════════════
  // PER-SHEET SCALE DATA STORE
  // ═══════════════════════════════════════════════════════════════
  _sheets: {},

  /**
   * Initialize or reset scale data for a sheet.
   */
  initSheet(sheetId) {
    this._sheets[sheetId] = {
      sheetId,
      // AI-detected scale (from SPATIAL_LAYOUT brain)
      aiScale: null,
      // Door-calibrated scale
      doorScale: null,
      // Manual override (user two-point click)
      manualScale: null,
      // Which scale source is active
      activeSource: null,  // 'ai' | 'door' | 'manual'
      // Resolved value
      pixelsPerFoot: null,
      confidence: 0,
      // Device positions (from DEVICE_LOCATOR brain or manual)
      devices: [],
      // Calibration reference points
      calibrationPoints: null,
    };
    return this._sheets[sheetId];
  },

  getSheet(sheetId) {
    return this._sheets[sheetId] || this.initSheet(sheetId);
  },

  // ═══════════════════════════════════════════════════════════════
  // PASS 1: EXPLICIT SCALE DETECTION (from AI brain results)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Ingest SPATIAL_LAYOUT brain results to extract per-sheet scale.
   * Call this after wave 0 completes.
   */
  ingestSpatialLayout(spatialResult) {
    if (!spatialResult?.sheets) return;

    for (const sheet of spatialResult.sheets) {
      const sid = sheet.sheet_id;
      if (!sid) continue;

      const s = this.getSheet(sid);

      // The SPATIAL_LAYOUT brain returns scale as ft_per_inch (drawing inches)
      // We need pixels_per_foot for image measurement
      // If the brain also returns image dimensions, we can compute the conversion
      if (sheet.scale?.ft_per_inch > 0) {
        s.aiScale = {
          ftPerInch: sheet.scale.ft_per_inch,
          method: sheet.scale_method || 'title_block',
          confidence: sheet.scale?.confidence || this._scaleMethodConfidence(sheet.scale_method),
          rawText: sheet.scale?.raw_text || null,
        };
      }

      // If brain provides pixel calibration reference
      if (sheet.pixel_calibration?.pixels_per_ft > 0) {
        s.aiScale = s.aiScale || {};
        s.aiScale.pixelsPerFt = sheet.pixel_calibration.pixels_per_ft;
        s.aiScale.refPoint1 = sheet.pixel_calibration.point1;
        s.aiScale.refPoint2 = sheet.pixel_calibration.point2;
        s.aiScale.refDistanceFt = sheet.pixel_calibration.distance_ft;
      }

      // Store sheet dimensions for fallback
      if (sheet.sheet_area_width_ft > 0) {
        s.sheetWidthFt = sheet.sheet_area_width_ft;
        s.sheetDepthFt = sheet.sheet_area_depth_ft;
      }

      this._resolveScale(sid);
    }

    console.log(`[ScaleCalibration] Ingested ${spatialResult.sheets.length} sheets from SPATIAL_LAYOUT`);
  },

  /**
   * Ingest DEVICE_LOCATOR results for per-device pixel positions.
   */
  ingestDeviceLocator(deviceResult) {
    if (!deviceResult?.devices) return;

    for (const dev of deviceResult.devices) {
      const sid = dev.sheet_id;
      if (!sid) continue;

      const s = this.getSheet(sid);
      s.devices.push({
        id: dev.id || dev.label || `dev-${s.devices.length}`,
        type: dev.type || 'unknown',
        xPx: dev.x_px ?? null,
        yPx: dev.y_px ?? null,
        xPct: dev.x_pct ?? null,
        yPct: dev.y_pct ?? null,
        floor: dev.floor || 1,
        isHomeRun: dev.is_home_run || false,
        homeRunId: dev.home_run_id || null,
        mountType: dev.mount_type || 'ceiling', // ceiling | wall | floor
      });
    }

    console.log(`[ScaleCalibration] Ingested ${deviceResult.devices.length} devices from DEVICE_LOCATOR`);
  },

  // ═══════════════════════════════════════════════════════════════
  // PASS 2: DOOR-OPENING CALIBRATION
  // ═══════════════════════════════════════════════════════════════

  /**
   * Process door detection results for scale calibration.
   * @param {string} sheetId
   * @param {Array} doors - [{x1, y1, x2, y2, arcRadius, type}]
   *   x1,y1 = hinge point; x2,y2 = latch edge; arcRadius = swing arc
   */
  calibrateFromDoors(sheetId, doors) {
    if (!doors || doors.length === 0) return null;

    const measurements = [];
    for (const door of doors) {
      // Measure the door leaf pixel length (hinge to latch edge)
      const leafPx = Math.sqrt(
        Math.pow(door.x2 - door.x1, 2) + Math.pow(door.y2 - door.y1, 2)
      );
      if (leafPx < 5) continue; // Skip degenerate detections

      // Determine assumed width in inches
      let widthInches = this.DOOR_WIDTHS.commercial_single; // 36"
      if (door.type === 'double') widthInches = this.DOOR_WIDTHS.commercial_double;
      else if (door.type === 'residential_bedroom') widthInches = this.DOOR_WIDTHS.residential_bedroom;
      else if (door.type === 'residential_bathroom') widthInches = this.DOOR_WIDTHS.residential_bathroom;

      const widthFt = widthInches / 12;
      const pixelsPerFt = leafPx / widthFt;

      measurements.push({ door, leafPx, widthFt, pixelsPerFt });
    }

    if (measurements.length === 0) return null;

    // Use median to filter outliers from non-standard doors
    measurements.sort((a, b) => a.pixelsPerFt - b.pixelsPerFt);
    const medianIdx = Math.floor(measurements.length / 2);
    const medianPPF = measurements.length % 2 === 1
      ? measurements[medianIdx].pixelsPerFt
      : (measurements[medianIdx - 1].pixelsPerFt + measurements[medianIdx].pixelsPerFt) / 2;

    // Filter to within 20% of median for consistency check
    const consistent = measurements.filter(m =>
      Math.abs(m.pixelsPerFt - medianPPF) / medianPPF < 0.20
    );

    const s = this.getSheet(sheetId);
    s.doorScale = {
      pixelsPerFt: medianPPF,
      doorsUsed: measurements.length,
      doorsConsistent: consistent.length,
      consistency: consistent.length / measurements.length,
      measurements,
    };

    // Cross-validate with AI scale
    if (s.aiScale?.pixelsPerFt > 0) {
      const diff = Math.abs(medianPPF - s.aiScale.pixelsPerFt) / s.aiScale.pixelsPerFt;
      s.doorScale.aiDelta = diff;
      if (diff > 0.15) {
        s.doorScale.warning = `Door calibration differs from AI scale by ${(diff * 100).toFixed(1)}% — flagged for review`;
        console.warn(`[ScaleCalibration] Sheet ${sheetId}: Door vs AI scale delta = ${(diff * 100).toFixed(1)}%`);
      }
    }

    this._resolveScale(sheetId);
    return s.doorScale;
  },

  // ═══════════════════════════════════════════════════════════════
  // MANUAL CALIBRATION (two-point click)
  // ═══════════════════════════════════════════════════════════════

  _calibrationState: { phase: 'idle', sheetId: null, point1: null, point2: null },

  /**
   * Start manual calibration for a sheet.
   * Returns the state machine phase for the UI to render.
   */
  startManualCalibration(sheetId) {
    this._calibrationState = { phase: 'awaiting_point_1', sheetId, point1: null, point2: null };
    console.log(`[ScaleCalibration] Manual calibration started for sheet ${sheetId}`);
    return this._calibrationState;
  },

  /**
   * Register a click during manual calibration.
   * @param {number} xPx - X pixel coordinate on the sheet image
   * @param {number} yPx - Y pixel coordinate on the sheet image
   * @returns {object} Updated state: { phase, sheetId, point1, point2 }
   */
  registerClick(xPx, yPx) {
    const cs = this._calibrationState;
    if (cs.phase === 'awaiting_point_1') {
      cs.point1 = { x: xPx, y: yPx };
      cs.phase = 'awaiting_point_2';
    } else if (cs.phase === 'awaiting_point_2') {
      cs.point2 = { x: xPx, y: yPx };
      cs.phase = 'awaiting_distance';
    }
    return { ...cs };
  },

  /**
   * Complete manual calibration with user-entered known distance.
   * @param {number} distanceFt - Real-world distance in feet between the two clicked points
   * @returns {object} The resolved scale data
   */
  completeManualCalibration(distanceFt) {
    const cs = this._calibrationState;
    if (cs.phase !== 'awaiting_distance' || !cs.point1 || !cs.point2 || distanceFt <= 0) {
      console.warn('[ScaleCalibration] Cannot complete calibration — invalid state');
      return null;
    }

    const pixelDist = Math.sqrt(
      Math.pow(cs.point2.x - cs.point1.x, 2) + Math.pow(cs.point2.y - cs.point1.y, 2)
    );
    const pixelsPerFt = pixelDist / distanceFt;

    const s = this.getSheet(cs.sheetId);
    s.manualScale = {
      pixelsPerFt,
      point1: { ...cs.point1 },
      point2: { ...cs.point2 },
      distanceFt,
      pixelDist,
    };

    // Manual always takes priority
    s.activeSource = 'manual';
    s.pixelsPerFoot = pixelsPerFt;
    s.confidence = 1.0;

    cs.phase = 'calibrated';
    console.log(`[ScaleCalibration] Manual calibration complete for ${cs.sheetId}: ${pixelsPerFt.toFixed(2)} px/ft (${distanceFt}' across ${pixelDist.toFixed(0)}px)`);

    return { pixelsPerFt, distanceFt, pixelDist };
  },

  cancelCalibration() {
    this._calibrationState = { phase: 'idle', sheetId: null, point1: null, point2: null };
  },

  // ═══════════════════════════════════════════════════════════════
  // SCALE RESOLUTION
  // ═══════════════════════════════════════════════════════════════

  _resolveScale(sheetId) {
    const s = this._sheets[sheetId];
    if (!s) return;

    // Priority: manual > door (if AI disagrees) > AI > door
    if (s.manualScale) {
      s.activeSource = 'manual';
      s.pixelsPerFoot = s.manualScale.pixelsPerFt;
      s.confidence = 1.0;
    } else if (s.aiScale?.pixelsPerFt > 0) {
      s.activeSource = 'ai';
      s.pixelsPerFoot = s.aiScale.pixelsPerFt;
      s.confidence = this._computeConfidence(s);
    } else if (s.doorScale?.pixelsPerFt > 0) {
      s.activeSource = 'door';
      s.pixelsPerFoot = s.doorScale.pixelsPerFt;
      s.confidence = this._computeConfidence(s);
    }
  },

  _computeConfidence(s) {
    let c = 0;
    if (s.aiScale) {
      c += 0.4; // Explicit scale found
      if (s.aiScale.method === 'graphic_bar') c += 0.3; // Graphic bar is high confidence
      else if (s.aiScale.method === 'title_block') c += 0.2;
    }
    if (s.doorScale && s.doorScale.doorsConsistent >= 2) {
      c += 0.2; // Multiple consistent doors
    }
    if (s.aiScale && s.doorScale && (!s.doorScale.aiDelta || s.doorScale.aiDelta < 0.15)) {
      c += 0.1; // AI and door agree
    }
    return Math.min(c, 1.0);
  },

  _scaleMethodConfidence(method) {
    const map = { graphic_bar: 0.9, dimension_line: 0.85, title_block: 0.7, nts: 0.2, inferred: 0.4 };
    return map[method] || 0.5;
  },

  // ═══════════════════════════════════════════════════════════════
  // DISTANCE MEASUREMENT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Measure straight-line distance between two pixel points on a sheet.
   * Returns feet (or null if no scale available).
   */
  measureDistanceFt(sheetId, x1, y1, x2, y2) {
    const s = this._sheets[sheetId];
    if (!s?.pixelsPerFoot) return null;

    const pxDist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    return pxDist / s.pixelsPerFoot;
  },

  /**
   * Estimate actual cable run length from a device to its home-run point.
   * Applies routing multiplier and vertical allowance.
   * Rounds UP to nearest 5-foot increment for cable ordering.
   */
  estimateCableRun(sheetId, device, homeRunPoint, options = {}) {
    const straightFt = this.measureDistanceFt(
      sheetId,
      device.xPx, device.yPx,
      homeRunPoint.xPx, homeRunPoint.yPx
    );
    if (straightFt === null) return null;

    const routingMult = options.routingMultiplier || this.ROUTING.standard;
    const mountType = device.mountType || 'ceiling';
    const verticalFt = mountType === 'ceiling' ? this.ROUTING.ceiling_drop
                     : mountType === 'wall' ? this.ROUTING.wall_mount
                     : this.ROUTING.floor_mount;
    const slackFt = options.slackFt || 15;

    const estimatedRun = (straightFt * routingMult) + verticalFt + slackFt;

    // Round up to nearest 5-foot increment
    const rounded = Math.ceil(estimatedRun / this.CABLE_ROUND_UP_FT) * this.CABLE_ROUND_UP_FT;

    return {
      straightLineFt: Math.round(straightFt * 10) / 10,
      routingMultiplier: routingMult,
      verticalAllowanceFt: verticalFt,
      slackFt,
      estimatedRunFt: Math.round(estimatedRun * 10) / 10,
      orderLengthFt: rounded,
      mountType,
    };
  },

  /**
   * Batch-compute cable run lengths for all devices on a sheet.
   * Returns an array compatible with CableAnalyzer assignment format.
   */
  batchComputeRuns(sheetId, options = {}) {
    const s = this._sheets[sheetId];
    if (!s?.pixelsPerFoot || s.devices.length === 0) return [];

    // Find home-run points (IDF/MDF) on this sheet
    const homeRuns = s.devices.filter(d => d.isHomeRun);
    const fieldDevices = s.devices.filter(d => !d.isHomeRun);

    if (homeRuns.length === 0 || fieldDevices.length === 0) return [];

    const results = [];
    for (const dev of fieldDevices) {
      // Find nearest home-run point
      let nearest = homeRuns[0];
      let nearestDist = Infinity;

      for (const hr of homeRuns) {
        const d = this._pixelDist(dev, hr);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = hr;
        }
      }

      const run = this.estimateCableRun(sheetId, dev, nearest, options);
      if (run) {
        results.push({
          deviceId: dev.id,
          deviceType: dev.type,
          sheetId,
          homeRunId: nearest.id || nearest.homeRunId || 'IDF-1',
          floor: dev.floor,
          ...run,
          scaleSource: s.activeSource,
          scaleConfidence: s.confidence,
        });
      }
    }

    return results;
  },

  _pixelDist(a, b) {
    const ax = a.xPx ?? (a.xPct != null ? a.xPct * 10 : 0);
    const ay = a.yPx ?? (a.yPct != null ? a.yPct * 10 : 0);
    const bx = b.xPx ?? (b.xPct != null ? b.xPct * 10 : 0);
    const by = b.yPx ?? (b.yPct != null ? b.yPct * 10 : 0);
    return Math.sqrt(Math.pow(bx - ax, 2) + Math.pow(by - ay, 2));
  },

  // ═══════════════════════════════════════════════════════════════
  // ENHANCE CABLE SCHEDULE (post-process CableAnalyzer output)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Enhance CableAnalyzer output with pixel-measured distances.
   * Replaces estimated distances with measured ones where scale data exists.
   */
  enhanceCableSchedule(schedule) {
    if (!schedule?.assignments) return schedule;

    let enhanced = 0;
    for (const assign of schedule.assignments) {
      const sid = assign.sheetId || assign.sheet_id;
      if (!sid) continue;

      const s = this._sheets[sid];
      if (!s?.pixelsPerFoot) continue;

      // Find matching device in our pixel data
      const dev = s.devices.find(d =>
        d.id === assign.deviceId || d.type === assign.deviceType
      );
      if (!dev || dev.xPx == null) continue;

      // Find matching home-run
      const hr = s.devices.find(d =>
        d.isHomeRun && (d.id === assign.homeRunId || d.id === assign.idfAssigned)
      );
      if (!hr) continue;

      const run = this.estimateCableRun(sid, dev, hr);
      if (run) {
        assign.runFt = run.orderLengthFt;
        assign.straightLineFt = run.straightLineFt;
        assign.scaleSource = s.activeSource;
        assign._pixelMeasured = true;
        enhanced++;
      }
    }

    if (enhanced > 0) {
      // Recalculate totals
      const runs = schedule.assignments.filter(a => a.runFt > 0);
      schedule.totals.totalFt = schedule.assignments.reduce((s, a) => s + (a.totalFtWithWaste || a.runFt || 0), 0);
      schedule.totals.avgRunFt = runs.length > 0 ? Math.round(runs.reduce((s, a) => s + a.runFt, 0) / runs.length) : 0;
      schedule.totals.maxRunFt = runs.length > 0 ? Math.max(...runs.map(a => a.runFt)) : 0;
      schedule.totals.minRunFt = runs.length > 0 ? Math.min(...runs.map(a => a.runFt)) : 0;
      schedule._pixelEnhancedCount = enhanced;
      console.log(`[ScaleCalibration] Enhanced ${enhanced} cable runs with pixel-measured distances`);
    }

    return schedule;
  },

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY / EXPORT
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get scale calibration summary for all sheets (for export/display).
   */
  getSummary() {
    const sheets = [];
    for (const [id, s] of Object.entries(this._sheets)) {
      sheets.push({
        sheetId: id,
        scaleSource: s.activeSource,
        pixelsPerFoot: s.pixelsPerFoot ? Math.round(s.pixelsPerFoot * 100) / 100 : null,
        confidence: Math.round((s.confidence || 0) * 100),
        deviceCount: s.devices.length,
        homeRunCount: s.devices.filter(d => d.isHomeRun).length,
        aiScale: s.aiScale ? {
          method: s.aiScale.method,
          ftPerInch: s.aiScale.ftPerInch,
        } : null,
        doorScale: s.doorScale ? {
          doorsUsed: s.doorScale.doorsUsed,
          doorsConsistent: s.doorScale.doorsConsistent,
          warning: s.doorScale.warning || null,
        } : null,
        manualScale: s.manualScale ? {
          distanceFt: s.manualScale.distanceFt,
          pixelDist: Math.round(s.manualScale.pixelDist),
        } : null,
      });
    }
    return { version: this.VERSION, sheets };
  },

  /**
   * Reset all scale data.
   */
  reset() {
    this._sheets = {};
    this._calibrationState = { phase: 'idle', sheetId: null, point1: null, point2: null };
  },
};

if (typeof window !== 'undefined') window.ScaleCalibration = ScaleCalibration;
