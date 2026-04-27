-- ═══════════════════════════════════════════════════════════════════════
-- M11 fix (audit 2026-04-27) — Cascade-delete foreign keys on child tables
-- ═══════════════════════════════════════════════════════════════════════
--
-- Purpose: Add ON DELETE CASCADE foreign keys so deleting an estimate
-- automatically cleans up its child rows (revisions, supplier quotes,
-- exclusions, project actuals, bid corrections). Pre-fix the parent
-- estimate could be deleted while orphaned children remained, growing
-- the DB unboundedly.
--
-- WHY THIS IS A SCRIPT, NOT AUTO-APPLIED:
-- D1 (SQLite) does NOT support `ALTER TABLE ... ADD CONSTRAINT FOREIGN KEY`
-- on an existing table. The standard pattern is rename → recreate → copy →
-- drop. This is destructive — running it on a production DB without a
-- backup risks data loss if the copy fails mid-migration.
--
-- ── PRE-FLIGHT CHECKLIST ──
-- 1. BACKUP: `wrangler d1 export <DB_NAME> --output backup-pre-cascade.sql`
-- 2. DRY RUN: apply this on a local SQLite copy first.
--    `sqlite3 backup-pre-cascade.sql .read scripts/migrate-cascade-fks.sql`
-- 3. SCHEDULE: run during low-traffic window (no live bids in flight).
-- 4. APPLY: `wrangler d1 execute <DB_NAME> --file scripts/migrate-cascade-fks.sql`
-- 5. VERIFY: spot-check that child rows still resolve to parent estimate.
--
-- Idempotent: if the constraint is already present (the new tables already
-- have the right FK), running this is a no-op because we use CREATE TABLE
-- IF NOT EXISTS for the new tables and DROP IF EXISTS for the old.
-- However, applying TWICE in a row before checking constraints WILL drop
-- and recreate. Read the script before running.
-- ═══════════════════════════════════════════════════════════════════════

PRAGMA foreign_keys=OFF;

BEGIN TRANSACTION;

-- ─── estimate_revisions ─────────────────────────────────────────────
DROP TABLE IF EXISTS estimate_revisions__new;
CREATE TABLE estimate_revisions__new (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    estimate_id TEXT NOT NULL,
    revision_number INTEGER NOT NULL DEFAULT 1,
    project_name TEXT,
    disciplines TEXT,
    contract_value REAL DEFAULT 0,
    analysis_summary TEXT,
    export_data TEXT,
    modified_by TEXT,
    modified_by_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(estimate_id, revision_number),
    FOREIGN KEY(estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
);
INSERT INTO estimate_revisions__new
    SELECT id, estimate_id, revision_number, project_name, disciplines,
           contract_value, analysis_summary, export_data, modified_by,
           modified_by_name, created_at
    FROM estimate_revisions
    WHERE estimate_id IN (SELECT id FROM estimates);  -- drop pre-existing orphans
DROP TABLE estimate_revisions;
ALTER TABLE estimate_revisions__new RENAME TO estimate_revisions;
CREATE INDEX IF NOT EXISTS idx_revisions_estimate ON estimate_revisions(estimate_id);
CREATE INDEX IF NOT EXISTS idx_revisions_created ON estimate_revisions(created_at DESC);

-- ─── supplier_quotes ────────────────────────────────────────────────
DROP TABLE IF EXISTS supplier_quotes__new;
CREATE TABLE supplier_quotes__new (
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
    FOREIGN KEY(estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
);
INSERT INTO supplier_quotes__new
    SELECT id, estimate_id, supplier_name, supplier_email, sent_at,
           received_at, item_count, items_quoted, original_total,
           quoted_total, status, created_at
    FROM supplier_quotes
    WHERE estimate_id IN (SELECT id FROM estimates);
DROP TABLE supplier_quotes;
ALTER TABLE supplier_quotes__new RENAME TO supplier_quotes;
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_estimate ON supplier_quotes(estimate_id);
CREATE INDEX IF NOT EXISTS idx_supplier_quotes_created ON supplier_quotes(created_at DESC);

-- ─── estimate_exclusions ────────────────────────────────────────────
DROP TABLE IF EXISTS estimate_exclusions__new;
CREATE TABLE estimate_exclusions__new (
    id TEXT PRIMARY KEY,
    estimate_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('exclusion', 'assumption', 'clarification')),
    text TEXT NOT NULL,
    category TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
);
INSERT INTO estimate_exclusions__new
    SELECT id, estimate_id, type, text, category, sort_order, created_at
    FROM estimate_exclusions
    WHERE estimate_id IN (SELECT id FROM estimates);
DROP TABLE estimate_exclusions;
ALTER TABLE estimate_exclusions__new RENAME TO estimate_exclusions;
CREATE INDEX IF NOT EXISTS idx_exclusions_estimate ON estimate_exclusions(estimate_id);

-- ─── project_actuals ────────────────────────────────────────────────
DROP TABLE IF EXISTS project_actuals__new;
CREATE TABLE project_actuals__new (
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
    FOREIGN KEY(estimate_id) REFERENCES estimates(id) ON DELETE CASCADE
);
INSERT INTO project_actuals__new
    SELECT id, estimate_id, project_name, category, item_name,
           estimated_qty, actual_qty, estimated_unit_cost, actual_unit_cost,
           estimated_labor_hours, actual_labor_hours, variance_pct, notes,
           created_at
    FROM project_actuals
    WHERE estimate_id IN (SELECT id FROM estimates);
DROP TABLE project_actuals;
ALTER TABLE project_actuals__new RENAME TO project_actuals;
CREATE INDEX IF NOT EXISTS idx_actuals_estimate ON project_actuals(estimate_id);
CREATE INDEX IF NOT EXISTS idx_actuals_item ON project_actuals(item_name);

-- ─── bid_corrections (estimate_id is nullable here — SET NULL on delete) ──
DROP TABLE IF EXISTS bid_corrections__new;
CREATE TABLE bid_corrections__new (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    estimate_id TEXT,
    project_name TEXT,
    project_type TEXT,
    discipline TEXT,
    category TEXT,
    item_name TEXT NOT NULL,
    field_changed TEXT NOT NULL,
    original_value REAL,
    corrected_value REAL,
    delta_pct REAL,
    region TEXT,
    corrected_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(estimate_id) REFERENCES estimates(id) ON DELETE SET NULL
);
INSERT INTO bid_corrections__new
    SELECT id, estimate_id, project_name, project_type, discipline,
           category, item_name, field_changed, original_value,
           corrected_value, delta_pct, region, corrected_by, created_at
    FROM bid_corrections;  -- bid_corrections.estimate_id is allowed to be NULL/orphaned (training data)
DROP TABLE bid_corrections;
ALTER TABLE bid_corrections__new RENAME TO bid_corrections;
CREATE INDEX IF NOT EXISTS idx_bid_corrections_type ON bid_corrections(project_type);
CREATE INDEX IF NOT EXISTS idx_bid_corrections_disc ON bid_corrections(discipline);
CREATE INDEX IF NOT EXISTS idx_bid_corrections_item ON bid_corrections(item_name);
CREATE INDEX IF NOT EXISTS idx_bid_corrections_created ON bid_corrections(created_at DESC);

COMMIT;

PRAGMA foreign_keys=ON;

-- ─── Verification queries (run manually after migration) ────────────
-- SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%__new';
--   ↑ should return 0 rows (all temp tables dropped)
-- PRAGMA foreign_key_list(estimate_revisions);
--   ↑ should show: estimates(id) ON DELETE CASCADE
-- INSERT INTO estimates(id,project_name) VALUES('test-fk-cascade','test');
-- INSERT INTO estimate_revisions(estimate_id,revision_number) VALUES('test-fk-cascade',1);
-- DELETE FROM estimates WHERE id='test-fk-cascade';
-- SELECT * FROM estimate_revisions WHERE estimate_id='test-fk-cascade';
--   ↑ should return 0 rows (cascade worked)
