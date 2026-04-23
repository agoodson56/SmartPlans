// ═══════════════════════════════════════════════════════════════
// SMARTPLANS — Accuracy Dashboard API  (Wave 8, v5.128.5)
//
// Aggregates bid-vs-actual variance data for the Results-page
// dashboard. Pulls from project_actuals, bid_decisions, and estimates
// to answer three questions every estimator + sales lead wants:
//
//   1. How accurate are our bids?                 (avg |variance| across actuals)
//   2. Where are we drifting?                     (worst-variance categories)
//   3. What do we win?                            (win rate from bid_decisions)
//
// Returns a structured JSON block that the UI renders as-is.
//
//   GET /api/accuracy-dashboard?project_type=Hospital   filter optional
//
// ═══════════════════════════════════════════════════════════════

import { isAllowedOrigin, timingSafeCompare, validateSession } from '../_shared/cors.js';

function corsHeaders(origin) {
    return {
        'Access-Control-Allow-Origin': origin || 'https://smartplans-4g5.pages.dev',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-App-Token, X-Session-Token',
        'Access-Control-Max-Age': '86400',
    };
}

async function authorize(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (origin && !isAllowedOrigin(origin)) {
        return Response.json({ error: 'Origin not allowed' }, { status: 403, headers: corsHeaders(origin) });
    }
    const envToken = env.ESTIMATES_TOKEN;
    const appToken = request.headers.get('X-App-Token') || '';
    const hasValidAppToken = envToken && timingSafeCompare(appToken, envToken);
    const sessionToken = request.headers.get('X-Session-Token') || '';
    const user = sessionToken ? await validateSession(env.DB, sessionToken) : null;
    if (!hasValidAppToken && !user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(origin) });
    }
    return { user };
}

function jsonResp(data, status, origin) {
    return Response.json(data, { status, headers: corsHeaders(origin) });
}

export async function onRequestOptions({ request }) {
    const origin = request.headers.get('Origin') || '';
    if (!isAllowedOrigin(origin, false)) return new Response(null, { status: 403 });
    return new Response(null, { headers: corsHeaders(origin) });
}

export async function onRequestGet({ request, env }) {
    const origin = request.headers.get('Origin') || '';
    const authResp = await authorize(request, env);
    if (authResp instanceof Response) return authResp;

    const url = new URL(request.url);
    const projectType = (url.searchParams.get('project_type') || '').trim().slice(0, 100);
    const limit = Math.max(1, Math.min(200, parseInt(url.searchParams.get('limit') || '50', 10)));

    try {
        // ─── 1. Per-project bid-vs-actual totals ───────────────────
        // Rolls project_actuals rows up per estimate_id so we can compute
        // "the bid was X, the actual was Y, variance Z%" for each job.
        let perProjectSql = `
            SELECT
                estimate_id,
                MAX(project_name) AS project_name,
                COUNT(*) AS line_count,
                ROUND(SUM(estimated_qty * estimated_unit_cost), 2) AS bid_total,
                ROUND(SUM(actual_qty * actual_unit_cost), 2) AS actual_total,
                ROUND(AVG(ABS(variance_pct)), 2) AS avg_abs_line_variance_pct,
                MAX(created_at) AS last_updated
            FROM project_actuals
            WHERE actual_qty > 0 AND actual_unit_cost > 0
            GROUP BY estimate_id
            ORDER BY last_updated DESC
            LIMIT ?
        `;
        const perProjectRows = (await env.DB.prepare(perProjectSql).bind(limit).all()).results || [];

        // Per-project overall variance = (actual - bid) / bid × 100
        const perProject = perProjectRows.map(row => {
            const bid = Number(row.bid_total) || 0;
            const actual = Number(row.actual_total) || 0;
            const variancePct = bid > 0 ? Math.round(((actual - bid) / bid) * 10000) / 100 : null;
            return {
                estimate_id: row.estimate_id,
                project_name: row.project_name,
                bid_total: bid,
                actual_total: actual,
                variance_pct: variancePct,
                line_count: Number(row.line_count) || 0,
                avg_abs_line_variance_pct: Number(row.avg_abs_line_variance_pct) || 0,
                last_updated: row.last_updated,
            };
        });

        // ─── 2. Rolling accuracy (abs variance across all lines) ──
        let rollingWhere = `actual_qty > 0 AND actual_unit_cost > 0`;
        const rollingBind = [];
        if (projectType) {
            // project_actuals doesn't carry project_type; join through estimates table
            rollingWhere += ` AND estimate_id IN (SELECT id FROM estimates WHERE project_type = ?)`;
            rollingBind.push(projectType);
        }
        const rollingRow = rollingBind.length > 0
            ? (await env.DB.prepare(`
                SELECT
                    COUNT(*) AS line_count,
                    ROUND(AVG(ABS(variance_pct)), 2) AS avg_abs_variance_pct,
                    ROUND(AVG(variance_pct), 2) AS avg_signed_variance_pct,
                    ROUND(SUM(estimated_qty * estimated_unit_cost), 2) AS total_bid,
                    ROUND(SUM(actual_qty * actual_unit_cost), 2) AS total_actual
                FROM project_actuals
                WHERE ${rollingWhere}
              `).bind(...rollingBind).first())
            : (await env.DB.prepare(`
                SELECT
                    COUNT(*) AS line_count,
                    ROUND(AVG(ABS(variance_pct)), 2) AS avg_abs_variance_pct,
                    ROUND(AVG(variance_pct), 2) AS avg_signed_variance_pct,
                    ROUND(SUM(estimated_qty * estimated_unit_cost), 2) AS total_bid,
                    ROUND(SUM(actual_qty * actual_unit_cost), 2) AS total_actual
                FROM project_actuals
                WHERE ${rollingWhere}
              `).first());

        const bidT = Number(rollingRow?.total_bid) || 0;
        const actT = Number(rollingRow?.total_actual) || 0;
        const rolling = {
            line_count: Number(rollingRow?.line_count) || 0,
            avg_abs_variance_pct: Number(rollingRow?.avg_abs_variance_pct) || 0,
            avg_signed_variance_pct: Number(rollingRow?.avg_signed_variance_pct) || 0,
            total_bid: bidT,
            total_actual: actT,
            overall_variance_pct: bidT > 0 ? Math.round(((actT - bidT) / bidT) * 10000) / 100 : null,
            // Accuracy = 100 - avg_abs_variance, clamped 0-100
            accuracy_pct: Math.max(0, Math.min(100, 100 - (Number(rollingRow?.avg_abs_variance_pct) || 0))),
        };

        // ─── 3. Worst-drift categories (where are we losing/winning?) ──
        const worstSql = `
            SELECT
                category,
                COUNT(*) AS sample_count,
                ROUND(AVG(ABS(variance_pct)), 2) AS avg_abs_variance_pct,
                ROUND(AVG(variance_pct), 2) AS avg_signed_variance_pct
            FROM project_actuals
            WHERE actual_qty > 0 AND actual_unit_cost > 0
            GROUP BY category
            HAVING COUNT(*) >= 3
            ORDER BY avg_abs_variance_pct DESC
            LIMIT 20
        `;
        const worstCats = (await env.DB.prepare(worstSql).all()).results || [];

        // ─── 4. Win rate from bid_decisions ─────────────────────
        // bid_decisions.outcome may be 'won' / 'lost' / null — count valid rows.
        let winRate = null;
        let winRateProjectType = null;
        try {
            const winRow = await env.DB.prepare(`
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN LOWER(outcome) = 'won' THEN 1 ELSE 0 END) AS won,
                    SUM(CASE WHEN LOWER(outcome) = 'lost' THEN 1 ELSE 0 END) AS lost
                FROM bid_decisions
                WHERE outcome IS NOT NULL
            `).first();
            const total = Number(winRow?.total) || 0;
            const won = Number(winRow?.won) || 0;
            if (total > 0) {
                winRate = Math.round((won / total) * 10000) / 100;
            }
            if (projectType) {
                const winPt = await env.DB.prepare(`
                    SELECT
                        COUNT(*) AS total,
                        SUM(CASE WHEN LOWER(outcome) = 'won' THEN 1 ELSE 0 END) AS won
                    FROM bid_decisions
                    WHERE project_type = ? AND outcome IS NOT NULL
                `).bind(projectType).first();
                const tPt = Number(winPt?.total) || 0;
                const wPt = Number(winPt?.won) || 0;
                if (tPt > 0) winRateProjectType = Math.round((wPt / tPt) * 10000) / 100;
            }
        } catch (_) { /* table might not exist on fresh DBs — non-fatal */ }

        return jsonResp({
            rolling,
            perProject,
            worstCategories: worstCats.map(c => ({
                category: c.category,
                sample_count: Number(c.sample_count) || 0,
                avg_abs_variance_pct: Number(c.avg_abs_variance_pct) || 0,
                avg_signed_variance_pct: Number(c.avg_signed_variance_pct) || 0,
            })),
            winRate,
            winRateProjectType,
            generatedAt: new Date().toISOString(),
        }, 200, origin);

    } catch (err) {
        return jsonResp({ error: 'Dashboard query failed', detail: err.message }, 500, origin);
    }
}
