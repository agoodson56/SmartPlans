-- v5.128.1 migration — adds labor_standards table for BICSI-style
-- activity-level labor units sourced from prior 3D bids.

CREATE TABLE IF NOT EXISTS labor_standards (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    activity TEXT NOT NULL,
    discipline TEXT,
    role TEXT,
    unit TEXT DEFAULT 'EA',
    unit_minutes REAL,
    unit_hours REAL,
    source_standard TEXT DEFAULT 'won-bid',
    source_bid TEXT,
    sample_count INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_labor_std_activity ON labor_standards(activity);
CREATE INDEX IF NOT EXISTS idx_labor_std_discipline ON labor_standards(discipline);
CREATE INDEX IF NOT EXISTS idx_labor_std_role ON labor_standards(role);
