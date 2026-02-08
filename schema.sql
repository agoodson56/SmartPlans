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
