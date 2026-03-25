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
