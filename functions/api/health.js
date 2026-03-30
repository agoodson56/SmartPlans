// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Health Check & Error Logging Endpoint
// GET  /api/health  → returns app health status (public, no auth)
// POST /api/health  → logs client-side errors to D1 error_log table
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin } from '../_shared/cors.js';

// ── GET: Health check ──────────────────────────────────────────
export async function onRequestGet(context) {
  const { env } = context;
  const result = {
    status: 'ok',
    app: 'smartplans',
    version: '5.0.0',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'ok',
      gemini_keys: 0,
    },
  };

  // Check D1 database connectivity
  try {
    await env.DB.prepare('SELECT 1').first();
  } catch (err) {
    result.status = 'error';
    result.checks.database = 'error';
  }

  // Count configured GEMINI_KEY_* secrets (0 through 17)
  let keyCount = 0;
  for (let i = 0; i <= 17; i++) {
    if (env[`GEMINI_KEY_${i}`]) {
      keyCount++;
    }
  }
  result.checks.gemini_keys = keyCount;

  const statusCode = result.status === 'ok' ? 200 : 503;
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
    const body = await request.json();

    // Reject oversized payloads
    const contentLength = parseInt(request.headers.get('Content-Length') || '0', 10);
    if (contentLength > 10000) {
      return Response.json({ error: 'Payload too large' }, { status: 413 });
    }

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
