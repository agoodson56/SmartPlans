// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Health Check & Error Logging Endpoint
// GET  /api/health  → returns app health status (public, no auth)
// POST /api/health  → logs client-side errors to D1 error_log table
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin } from '../_shared/cors.js';

// ── GET: Health check ──────────────────────────────────────────
// H2 fix (audit 2026-04-27): per-component breakdown so the response is
// actionable. Pre-fix the endpoint returned an opaque 503 with no clue
// whether D1 was unbound, in a bad state, AI keys missing, or something
// else. Now each subsystem is checked independently and reported with
// its own status. Overall status is:
//   - 'ok' if every component reports ok
//   - 'degraded' if at least one optional check failed but D1 read works
//   - 'error' only if the critical D1 read fails
// SEC: Component values stay boolean / labels — no key counts, no internal
// details that would help an attacker probe the infrastructure.
export async function onRequestGet(context) {
  const { env } = context;
  const components = {};
  let overall = 'ok';

  // 1. D1 read (critical — if this fails the app is unusable)
  try {
    await env.DB.prepare('SELECT 1').first();
    components.d1_read = 'ok';
  } catch (err) {
    components.d1_read = 'error';
    overall = 'error';
  }

  // 2. D1 write capability (catches read-only / quota states that pass SELECT)
  if (components.d1_read === 'ok') {
    try {
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS _health_probe (id INTEGER PRIMARY KEY, ts TEXT)`).run();
      const probeId = Date.now();
      await env.DB.prepare(`INSERT INTO _health_probe (id, ts) VALUES (?, ?)`).bind(probeId, new Date().toISOString()).run();
      await env.DB.prepare(`DELETE FROM _health_probe WHERE id = ?`).bind(probeId).run();
      components.d1_write = 'ok';
    } catch (err) {
      components.d1_write = 'error';
      if (overall === 'ok') overall = 'degraded';
    }
  } else {
    components.d1_write = 'unknown';
  }

  // 3. AI proxy — at least one non-empty key bound (don't expose the actual count)
  const hasGeminiKey = Object.keys(env || {}).some(k => /^GEMINI_KEY/i.test(k) && env[k]);
  const hasClaudeKey = Object.keys(env || {}).some(k => /^(CLAUDE|ANTHROPIC)/i.test(k) && env[k]);
  components.ai_keys = (hasGeminiKey || hasClaudeKey) ? 'ok' : 'missing';
  if (components.ai_keys === 'missing' && overall === 'ok') overall = 'degraded';

  // 4. R2 binding (optional)
  components.r2 = env && env.R2_BUCKET ? 'ok' : 'unbound';

  const result = {
    status: overall,
    components,
    timestamp: new Date().toISOString(),
  };
  // H13 fix (audit-2 2026-04-27): return 503 for both 'error' and 'degraded'
  // so monitoring tools (Pingdom, UptimeRobot, Datadog) treat them as alerts.
  // Pre-fix returned 200 + body.status='degraded' which most monitoring
  // dashboards reported as healthy, masking real partial outages. The body
  // still carries the granular component breakdown so dashboards can drill in.
  const statusCode = (overall === 'error' || overall === 'degraded') ? 503 : 200;
  return Response.json(result, { status: statusCode });
}

// ── POST: Client-side error logging ────────────────────────────
export async function onRequestPost(context) {
  const { request, env } = context;

  // SEC: Validate origin to prevent external log-flooding
  const origin = request.headers.get('Origin');
  if (origin && !isAllowedOrigin(origin)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // SEC: Check Content-Length BEFORE parsing body to avoid consuming memory on oversized payloads
    const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
    if (contentLength > 10000) {
      return Response.json({ error: 'Payload too large' }, { status: 413 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.type || !body.message) {
      return Response.json({ error: 'Missing type or message' }, { status: 400 });
    }

    // Ensure error_log table exists
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS error_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        message TEXT,
        filename TEXT,
        line INTEGER,
        col INTEGER,
        stack TEXT,
        url TEXT,
        user_agent TEXT,
        ip TEXT,
        logged_at TEXT DEFAULT (datetime('now'))
      )
    `).run();

    // Insert error record
    await env.DB.prepare(`
      INSERT INTO error_log (type, message, filename, line, col, stack, url, user_agent, ip, logged_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      String(body.type).substring(0, 50),
      String(body.message).substring(0, 2000),
      body.filename ? String(body.filename).substring(0, 500) : null,
      body.line ?? null,
      body.col ?? null,
      body.stack ? String(body.stack).substring(0, 2000) : null,
      body.url ? String(body.url).substring(0, 500) : null,
      request.headers.get('User-Agent')?.substring(0, 500) || null,
      request.headers.get('CF-Connecting-IP') || null,
      new Date().toISOString(), // SEC: Always use server time, never trust client timestamp
    ).run();

    return Response.json({ logged: true }, { status: 201 });
  } catch (err) {
    console.error('Error logging failed:', err);
    return Response.json({ error: 'Failed to log error' }, { status: 500 });
  }
}
