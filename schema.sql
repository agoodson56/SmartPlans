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
