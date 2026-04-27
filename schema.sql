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
    created_by TEXT,
    created_by_name TEXT,
    modified_by TEXT,            -- User ID of last modifier (NULL = original estimator)
    modified_by_name TEXT,       -- Cached name of last modifier
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
    modified_by TEXT,            -- Who triggered this revision (user ID)
    modified_by_name TEXT,       -- Cached name of who made the change
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(estimate_id, revision_number),
    -- M11 fix (audit 2026-04-27): cascade so deleting an estimate cleans
    -- up its revision history. Existing prod databases need scripts/migrate-cascade-fks.sql.
    FOREIGN KEY(estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
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
    created_at TEXT DEFAULT (datetime('now')),
    -- M11 fix (audit 2026-04-27): cascade-delete with parent estimate.
    FOREIGN KEY(estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
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
    created_at TEXT DEFAULT (datetime('now')),
    -- M11 fix (audit 2026-04-27): cascade-delete with parent estimate.
    FOREIGN KEY(estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
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
    created_at TEXT DEFAULT (datetime('now')),
    -- M11 fix (audit 2026-04-27): cascade-delete with parent estimate.
    FOREIGN KEY(estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
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

-- ═══════════════════════════════════════════════════════════════
-- Salespeople — Persistent salesperson/estimator directory
-- Follows the program (D1), not the PC (no localStorage).
-- Only admins can delete; any authenticated user can add/view.
-- ═══════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════
-- Distributor Price Cache — Cached pricing from distributors
-- Populated manually, from quote imports, or future API integration
-- (Graybar, Anixter/WESCO, ADI, etc.)
-- Used by Material Pricer as a pricing source between rate library
-- (project-specific) and generic PRICING_DB (fallback).
-- ═══════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════
-- Winning Proposals — Past proposal excerpts for tone/strategy learning
-- Stores key sections from winning bids so Report Writer can match
-- the company's voice and winning approach.
-- ═══════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════
-- Company Strengths — Competitive positioning data
-- What makes this company win: capabilities, certifications,
-- equipment, relationships, regional strengths, win rates.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS company_strengths (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    category TEXT NOT NULL,
    strength TEXT NOT NULL,
    detail TEXT,
    win_impact TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════════════
-- Bid Decisions — Estimator adjustment patterns
-- Records bid-day tweaks: where estimators sharpen/pad numbers,
-- which categories get adjusted, and why. Trains bid strategy AI.
-- ═══════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════
-- v5.127.1 — Estimator Feedback Loop: Bid Corrections
-- Item-level (not category-level) corrections made by estimators
-- during BOM review. Aggregated across all past bids and fed back
-- into Material Pricer on the next run of the same project type +
-- discipline so the AI learns from every manual edit.
--
-- This is the trophy feedback loop: every time an estimator fixes
-- a number, SmartPlans gets smarter for the next bid.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bid_corrections (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    estimate_id TEXT,
    project_name TEXT,
    project_type TEXT,           -- Hospital, Transit, Office, VA, School, etc.
    discipline TEXT,             -- CCTV, Access Control, Structured Cabling, etc.
    category TEXT,               -- Line item category name from BOM
    item_name TEXT NOT NULL,     -- The item whose value was corrected
    field_changed TEXT NOT NULL, -- 'qty' or 'unit_cost'
    original_value REAL,         -- What Material Pricer output
    corrected_value REAL,        -- What the estimator changed it to
    delta_pct REAL,              -- (corrected - original) / original * 100
    region TEXT,                 -- Regional multiplier key (optional)
    corrected_by TEXT,           -- User id / name (optional)
    created_at TEXT DEFAULT (datetime('now')),
    -- M11 fix (audit 2026-04-27): SET NULL (not CASCADE) — corrections are
    -- training data we keep even if the parent estimate is purged.
    FOREIGN KEY(estimate_id) REFERENCES estimates(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bid_corrections_type ON bid_corrections(project_type);
CREATE INDEX IF NOT EXISTS idx_bid_corrections_disc ON bid_corrections(discipline);
CREATE INDEX IF NOT EXISTS idx_bid_corrections_item ON bid_corrections(item_name);
CREATE INDEX IF NOT EXISTS idx_bid_corrections_created ON bid_corrections(created_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- Labor Standards — BICSI-style activity-level labor units
-- Per-task minutes/hours from prior bids and reference standards.
-- Used by Labor Calculator brain to ground hour calculations on
-- real production rates rather than AI-generated guesses.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS labor_standards (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    activity TEXT NOT NULL,           -- e.g. "PULL CAT6 CABLE", "TERMINATE C6 WS/PP"
    discipline TEXT,                  -- CCTV | ACCESS_CONTROL | STRUCTURED_CABLING | ...
    role TEXT,                        -- CABLE_INSTALLER | DATA_TECH_II | PROJECT_MANAGER | ...
    unit TEXT DEFAULT 'EA',           -- EA | LF | FT | DROP
    unit_minutes REAL,                -- Minutes per unit
    unit_hours REAL,                  -- Hours per unit (computed: unit_minutes/60 if not set)
    source_standard TEXT DEFAULT 'won-bid',
    source_bid TEXT,                  -- Which prior bid this row came from
    sample_count INTEGER DEFAULT 1,   -- How many bids confirmed this rate
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_labor_std_activity ON labor_standards(activity);
CREATE INDEX IF NOT EXISTS idx_labor_std_discipline ON labor_standards(discipline);
CREATE INDEX IF NOT EXISTS idx_labor_std_role ON labor_standards(role);

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_estimates_updated ON estimates(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_revisions_created ON estimate_revisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_created ON supplier_quotes(created_at DESC);
