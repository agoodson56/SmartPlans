-- SmartPlans Full Migration — Run on D1 Console
-- Creates all tables needed for SmartPlans features

-- Core estimates table
CREATE TABLE IF NOT EXISTS estimates (
    id TEXT PRIMARY KEY,
    project_name TEXT NOT NULL DEFAULT 'Untitled',
    project_type TEXT,
    project_location TEXT,
    disciplines TEXT,
    pricing_tier TEXT DEFAULT 'mid',
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    export_data TEXT
);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_created ON estimates(created_at DESC);

-- v5.52: Add ownership tracking — bids stay in creator's folder even when edited by others
ALTER TABLE estimates ADD COLUMN created_by TEXT;
ALTER TABLE estimates ADD COLUMN created_by_name TEXT;
CREATE INDEX IF NOT EXISTS idx_estimates_created_by ON estimates(created_by);

-- Estimate revisions (version history)
CREATE TABLE IF NOT EXISTS estimate_revisions (
    id TEXT PRIMARY KEY,
    estimate_id TEXT NOT NULL,
    revision_number INTEGER NOT NULL,
    project_name TEXT,
    disciplines TEXT,
    contract_value REAL,
    analysis_summary TEXT,
    export_data TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(estimate_id, revision_number)
);
CREATE INDEX IF NOT EXISTS idx_revisions_estimate ON estimate_revisions(estimate_id);

-- Supplier quotes
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

-- Exclusions & assumptions
CREATE TABLE IF NOT EXISTS estimate_exclusions (
    id TEXT PRIMARY KEY,
    estimate_id TEXT NOT NULL,
    type TEXT NOT NULL,
    text TEXT NOT NULL,
    category TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_exclusions_estimate ON estimate_exclusions(estimate_id);

-- Rate library (custom pricing)
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

-- Project actuals (feedback loop)
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

-- Cost benchmarks (aggregated from actuals)
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

-- Error log (health monitoring)
CREATE TABLE IF NOT EXISTS error_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    error_type TEXT,
    error_message TEXT,
    error_stack TEXT,
    url TEXT,
    user_agent TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Usage stats
CREATE TABLE IF NOT EXISTS usage_stats (
    id TEXT PRIMARY KEY DEFAULT 'global',
    bid_count INTEGER DEFAULT 0,
    total_cost REAL DEFAULT 0,
    last_bid_at TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO usage_stats (id) VALUES ('global');

-- Rate limits (IP-based brute-force protection for /api/pm/verify-password)
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 1,
    expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires ON rate_limits(expires_at);

-- SmartPM — Daily Progress Logs (required for SmartPM time tracking features)
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

-- SmartPM — App Settings (key-value config store)
CREATE TABLE IF NOT EXISTS pm_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- v5.115: Edit audit trail — track who modified a bid so original estimator is notified
ALTER TABLE estimates ADD COLUMN modified_by TEXT;
ALTER TABLE estimates ADD COLUMN modified_by_name TEXT;
ALTER TABLE estimate_revisions ADD COLUMN modified_by TEXT;
ALTER TABLE estimate_revisions ADD COLUMN modified_by_name TEXT;

-- v5.115: Salespeople table — persistent salesperson directory (D1, not localStorage)
CREATE TABLE IF NOT EXISTS salespeople (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    title TEXT DEFAULT 'Sales Consultant',
    phone TEXT,
    email TEXT NOT NULL,
    office TEXT,
    created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_salespeople_email ON salespeople(email);
CREATE INDEX IF NOT EXISTS idx_salespeople_name ON salespeople(last_name, first_name);

-- User accounts table (for auth system)
CREATE TABLE IF NOT EXISTS user_accounts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    role TEXT DEFAULT 'estimator',
    is_admin INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    last_login TEXT
);

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);

-- v5.119: Distributor price cache (for future Graybar/Anixter/WESCO API integration)
CREATE TABLE IF NOT EXISTS distributor_prices (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    item_name TEXT NOT NULL,
    manufacturer TEXT,
    part_number TEXT,
    distributor TEXT NOT NULL,
    unit_cost REAL NOT NULL,
    unit TEXT DEFAULT 'ea',
    list_price REAL,
    discount_pct REAL DEFAULT 0,
    category TEXT,
    quote_number TEXT,
    quote_date TEXT,
    expires_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dist_prices_item ON distributor_prices(item_name);
CREATE INDEX IF NOT EXISTS idx_dist_prices_part ON distributor_prices(part_number);
CREATE INDEX IF NOT EXISTS idx_dist_prices_distributor ON distributor_prices(distributor);

-- v5.120: Winning Proposals — Past proposal excerpts for tone/strategy learning
CREATE TABLE IF NOT EXISTS winning_proposals (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_name TEXT NOT NULL,
    project_type TEXT,
    contract_value REAL,
    win_margin_pct REAL,
    executive_summary TEXT,
    scope_narrative TEXT,
    value_propositions TEXT,
    exclusions_text TEXT,
    strategy_notes TEXT,
    outcome TEXT DEFAULT 'won',
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_proposals_type ON winning_proposals(project_type);

-- v5.120: Company Strengths — Competitive positioning data
CREATE TABLE IF NOT EXISTS company_strengths (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    category TEXT NOT NULL,
    strength TEXT NOT NULL,
    detail TEXT,
    win_impact TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- v5.120: Bid Decisions — Estimator adjustment patterns
CREATE TABLE IF NOT EXISTS bid_decisions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    estimate_id TEXT,
    project_name TEXT,
    project_type TEXT,
    category TEXT NOT NULL,
    original_value REAL,
    adjusted_value REAL,
    adjustment_pct REAL,
    reason TEXT,
    outcome TEXT,
    decided_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bid_decisions_category ON bid_decisions(category);
CREATE INDEX IF NOT EXISTS idx_bid_decisions_type ON bid_decisions(project_type);

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_estimates_updated ON estimates(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_revisions_created ON estimate_revisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_created ON supplier_quotes(created_at DESC);
