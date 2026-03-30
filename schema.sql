-- ═══════════════════════════════════════════════════════════════
-- SmartPlans D1 Database Schema
-- Persists AI estimates so they survive page refreshes
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS estimates (
    id TEXT PRIMARY KEY,
    project_name TEXT NOT NULL DEFAULT 'Untitled',
    project_type TEXT,
    project_location TEXT,
    disciplines TEXT,            -- JSON array
    pricing_tier TEXT DEFAULT 'mid',
    status TEXT DEFAULT 'draft', -- draft, analyzed, exported
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    export_data TEXT             -- Full JSON export package (saved after analysis)
);

CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_created ON estimates(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- Estimate Revisions — Version history for re-analyzed estimates
-- Stores a snapshot of the previous version whenever an estimate
-- is overwritten, enabling compare & revert.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS estimate_revisions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    estimate_id TEXT NOT NULL,
    revision_number INTEGER NOT NULL DEFAULT 1,
    project_name TEXT,
    disciplines TEXT,
    contract_value REAL DEFAULT 0,
    analysis_summary TEXT,
    export_data TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(estimate_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_revisions_estimate ON estimate_revisions(estimate_id);

-- ═══════════════════════════════════════════════════════════════
-- Supplier Quotes — Track BOM pricing requests sent to suppliers
-- Lifecycle: sent → received → applied
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS supplier_quotes (
    id TEXT PRIMARY KEY,
    estimate_id TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    supplier_email TEXT,
    sent_at TEXT DEFAULT (datetime('now')),
    received_at TEXT,
    item_count INTEGER DEFAULT 0,
    items_quoted INTEGER DEFAULT 0,
    original_total REAL DEFAULT 0,
    quoted_total REAL,
    status TEXT DEFAULT 'sent',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_supplier_quotes_estimate ON supplier_quotes(estimate_id);

-- ═══════════════════════════════════════════════════════════════
-- Usage Statistics — Cross-device bid counter & cost tracker
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS usage_stats (
    id TEXT PRIMARY KEY DEFAULT 'global',
    total_cost REAL DEFAULT 0,
    bid_count INTEGER DEFAULT 0,
    last_bid_project TEXT,
    last_bid_at TEXT,
    last_reset_at TEXT
);

-- ═══════════════════════════════════════════════════════════════
-- SmartPM — Daily Progress Logs (server-side, no localStorage)
-- Tracks material installed and labor hours per module per day.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pm_daily_logs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL DEFAULT 'default',
    module_id TEXT NOT NULL,
    item TEXT NOT NULL,
    unit TEXT DEFAULT 'EA',
    qty_installed REAL NOT NULL DEFAULT 0,
    hours_used REAL NOT NULL DEFAULT 0,
    logged_at TEXT DEFAULT (datetime('now')),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_pm_logs_project ON pm_daily_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_pm_logs_date ON pm_daily_logs(logged_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- SmartPM — App Settings (passwords, preferences)
-- Key-value store — no localStorage needed.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pm_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════
-- Rate Library — Estimator-maintained material & labor rates
-- Stores known-good pricing from past projects for reuse in
-- future bids, replacing AI-generated defaults.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rate_library (
    id TEXT PRIMARY KEY,
    item_name TEXT NOT NULL,
    category TEXT,
    unit TEXT DEFAULT 'ea',
    unit_cost REAL NOT NULL,
    labor_hours REAL DEFAULT 0,
    supplier TEXT,
    notes TEXT,
    last_used TEXT,
    use_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rate_library_name ON rate_library(item_name);
CREATE INDEX IF NOT EXISTS idx_rate_library_category ON rate_library(category);

-- ═══════════════════════════════════════════════════════════════
-- Estimate Exclusions & Assumptions — Legal protection lists
-- Stores exclusions, assumptions, and clarifications per estimate
-- for inclusion in proposals and bid documents.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS estimate_exclusions (
    id TEXT PRIMARY KEY,
    estimate_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('exclusion', 'assumption', 'clarification')),
    text TEXT NOT NULL,
    category TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_exclusions_estimate ON estimate_exclusions(estimate_id);

-- ═══════════════════════════════════════════════════════════════
-- Project Actuals — Record actual costs after project completion
-- Enables comparison against original estimates for feedback loop.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS project_actuals (
    id TEXT PRIMARY KEY,
    estimate_id TEXT NOT NULL,
    project_name TEXT,
    category TEXT NOT NULL,
    item_name TEXT NOT NULL,
    estimated_qty REAL,
    actual_qty REAL,
    estimated_unit_cost REAL,
    actual_unit_cost REAL,
    estimated_labor_hours REAL,
    actual_labor_hours REAL,
    variance_pct REAL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_actuals_estimate ON project_actuals(estimate_id);
CREATE INDEX IF NOT EXISTS idx_actuals_item ON project_actuals(item_name);

-- ═══════════════════════════════════════════════════════════════
-- Cost Benchmarks — Aggregated historical pricing from actuals
-- Used to validate and improve future AI-generated estimates.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cost_benchmarks (
    id TEXT PRIMARY KEY,
    item_name TEXT NOT NULL,
    category TEXT,
    avg_unit_cost REAL,
    min_unit_cost REAL,
    max_unit_cost REAL,
    avg_labor_hours REAL,
    sample_count INTEGER DEFAULT 0,
    last_updated TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_name ON cost_benchmarks(item_name);

-- ═══════════════════════════════════════════════════════════════
-- Rate Limits — IP-based brute-force protection for password endpoints
-- key: e.g. "pw_fail:<ip>", expires_at: Unix timestamp
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 1,
    expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits(expires_at);
