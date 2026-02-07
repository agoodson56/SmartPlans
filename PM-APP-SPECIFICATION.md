# 3D Project Manager — Complete Build Specification
## ELV Construction Project Management Application

---

## 📋 EXECUTIVE SUMMARY

**3D Project Manager** is a full-stack web application for managing low-voltage / ELV construction projects from award through closeout. It receives structured estimate data from **SmartPlans** (via JSON import) and provides comprehensive project tracking, progress billing, change order management, RFI tracking, and financial reporting.

**Built for**: 3D Technology Services, Inc.
**Integrates with**: SmartPlans (estimation engine), 3D Dispatch (technician scheduling)
**Deployment**: Cloudflare Pages (frontend) + Cloudflare Workers (API) + D1 (database)
**Repository**: Standalone module in the 3D Technology Services ecosystem

---

## 🏗️ ARCHITECTURE

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | HTML/CSS/Vanilla JS (single-page app) | UI, no framework overhead |
| **Backend API** | Cloudflare Workers (TypeScript) | REST API, business logic |
| **Database** | Cloudflare D1 (SQLite) | Relational data persistence |
| **Auth** | SHA-256 password hash + session tokens | Same pattern as 3D Dispatch |
| **File Storage** | Cloudflare R2 | Document/file storage (plans, photos) |
| **Email** | Resend API | Notifications, report delivery |
| **Export** | SheetJS (Excel), jsPDF (PDF) | Client-facing documents |
| **Hosting** | Cloudflare Pages | Static frontend deployment |

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    3D PROJECT MANAGER                        │
│                   (Cloudflare Pages)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │ Projects │  │ Billing  │  │  Reports │   │
│  │          │  │          │  │          │  │          │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │         │
│  ┌────┴──────────────┴──────────────┴──────────────┴────┐   │
│  │              API Service Layer (fetch)                │   │
│  └──────────────────────┬───────────────────────────────┘   │
│                         │                                    │
└─────────────────────────┼────────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────┼────────────────────────────────────┐
│              Cloudflare Worker (API)                          │
│  ┌──────────────────────┴───────────────────────────────┐   │
│  │                   Router                              │   │
│  ├─────────┬──────────┬──────────┬──────────┬───────────┤   │
│  │  Auth   │ Projects │ Billing  │  RFIs    │  Reports  │   │
│  └────┬────┴─────┬────┴─────┬────┴────┬─────┴─────┬─────┘   │
│       │          │          │         │           │           │
│  ┌────┴──────────┴──────────┴─────────┴───────────┴─────┐   │
│  │                 Cloudflare D1                         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                 Cloudflare R2                         │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘

EXTERNAL INTEGRATIONS:
  ← SmartPlans JSON Import (estimate packages)
  → 3D Dispatch (technician scheduling, via API)
  → Resend (email notifications)
```

---

## 🗄️ DATABASE SCHEMA (Cloudflare D1)

### Core Tables

```sql
-- ═══════════════════════════════════════════════════════
-- AUTHENTICATION & USERS
-- ═══════════════════════════════════════════════════════

CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'pm',  -- 'admin', 'pm', 'estimator', 'viewer'
  created_at TEXT DEFAULT (datetime('now')),
  last_login TEXT
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════
-- PROJECTS
-- ═══════════════════════════════════════════════════════

CREATE TABLE projects (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_number TEXT UNIQUE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
    -- 'bidding', 'awarded', 'active', 'on_hold', 'punch_list', 'closeout', 'complete', 'cancelled'
  type TEXT,  -- 'new_construction', 'renovation', 'tenant_improvement', 'design_build', 'service'

  -- Client/GC Info
  client_name TEXT,
  client_contact TEXT,
  client_email TEXT,
  client_phone TEXT,
  gc_name TEXT,
  gc_contact TEXT,
  gc_email TEXT,
  gc_phone TEXT,

  -- Location
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  jurisdiction TEXT,

  -- Dates
  bid_date TEXT,
  award_date TEXT,
  start_date TEXT,
  substantial_completion TEXT,
  final_completion TEXT,

  -- Financial
  original_contract_value REAL DEFAULT 0,
  current_contract_value REAL DEFAULT 0,  -- original + approved COs
  total_billed REAL DEFAULT 0,
  total_paid REAL DEFAULT 0,
  retainage_pct REAL DEFAULT 10,
  retainage_held REAL DEFAULT 0,

  -- Config from SmartPlans
  disciplines TEXT,  -- JSON array
  pricing_tier TEXT DEFAULT 'mid',
  regional_multiplier TEXT DEFAULT 'national_average',
  prevailing_wage TEXT DEFAULT '',
  work_shift TEXT DEFAULT '',

  -- Markup
  markup_material REAL DEFAULT 25,
  markup_labor REAL DEFAULT 30,
  markup_equipment REAL DEFAULT 15,
  markup_subcontractor REAL DEFAULT 10,

  -- Labor rates (JSON)
  labor_rates TEXT,  -- JSON object {journeyman: 38, lead: 45, ...}
  burden_rate REAL DEFAULT 35,
  include_burden INTEGER DEFAULT 1,

  -- Notes
  notes TEXT,
  smartplans_import_id TEXT,  -- reference to original SmartPlans export

  -- Metadata
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════
-- SCHEDULE OF VALUES (SOV)
-- ═══════════════════════════════════════════════════════

CREATE TABLE sov_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_number TEXT NOT NULL,  -- '27-001', 'SC-003', etc.
  description TEXT NOT NULL,
  division TEXT,  -- 'Division 27', 'Division 28', 'Special Conditions', 'General Conditions'
  category TEXT,  -- 'material', 'labor', 'equipment', 'subcontractor', 'general'

  -- Financial
  scheduled_value REAL DEFAULT 0,
  material_cost REAL DEFAULT 0,
  labor_cost REAL DEFAULT 0,
  equipment_cost REAL DEFAULT 0,
  sub_cost REAL DEFAULT 0,

  -- Progress tracking (updated each billing period)
  total_completed_pct REAL DEFAULT 0,
  total_completed_value REAL DEFAULT 0,
  stored_material REAL DEFAULT 0,
  retainage REAL DEFAULT 0,

  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════
-- PROGRESS BILLING (AIA G702/G703)
-- ═══════════════════════════════════════════════════════

CREATE TABLE billing_periods (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  period_number INTEGER NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',  -- 'draft', 'submitted', 'approved', 'paid'

  -- G702 Summary
  original_contract REAL DEFAULT 0,
  net_change_orders REAL DEFAULT 0,
  contract_sum_to_date REAL DEFAULT 0,
  total_completed_stored REAL DEFAULT 0,
  retainage REAL DEFAULT 0,
  total_earned_less_retainage REAL DEFAULT 0,
  less_previous_payments REAL DEFAULT 0,
  current_payment_due REAL DEFAULT 0,

  submitted_date TEXT,
  approved_date TEXT,
  paid_date TEXT,
  paid_amount REAL,

  notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE billing_line_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  billing_period_id TEXT NOT NULL REFERENCES billing_periods(id) ON DELETE CASCADE,
  sov_item_id TEXT NOT NULL REFERENCES sov_items(id) ON DELETE CASCADE,

  -- This period's work
  work_completed_this_period REAL DEFAULT 0,
  stored_material_this_period REAL DEFAULT 0,

  -- Cumulative (auto-calculated)
  total_completed_pct REAL DEFAULT 0,
  total_completed_value REAL DEFAULT 0,
  total_stored REAL DEFAULT 0,
  retainage REAL DEFAULT 0,

  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════
-- CHANGE ORDERS
-- ═══════════════════════════════════════════════════════

CREATE TABLE change_orders (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  co_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
    -- 'pending', 'submitted', 'approved', 'rejected', 'incorporated'
  type TEXT DEFAULT 'addition',  -- 'addition', 'deduction', 'no_cost'

  -- Financial
  material_cost REAL DEFAULT 0,
  labor_hours REAL DEFAULT 0,
  labor_cost REAL DEFAULT 0,
  equipment_cost REAL DEFAULT 0,
  sub_cost REAL DEFAULT 0,
  markup_pct REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,

  -- Schedule impact
  schedule_impact_days INTEGER DEFAULT 0,

  -- Tracking
  requested_by TEXT,
  requested_date TEXT,
  submitted_date TEXT,
  approved_date TEXT,
  approved_by TEXT,

  -- Reference
  rfi_reference TEXT,  -- linked RFI if applicable
  revision INTEGER DEFAULT 0,

  notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════
-- RFIs (Request for Information)
-- ═══════════════════════════════════════════════════════

CREATE TABLE rfis (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rfi_number INTEGER NOT NULL,
  subject TEXT NOT NULL,
  question TEXT NOT NULL,
  detail TEXT,
  discipline TEXT,

  status TEXT NOT NULL DEFAULT 'draft',
    -- 'draft', 'submitted', 'responded', 'closed', 'void'
  priority TEXT DEFAULT 'normal',  -- 'low', 'normal', 'high', 'critical'

  -- Tracking
  submitted_to TEXT,  -- architect/engineer name
  submitted_date TEXT,
  response TEXT,
  responded_by TEXT,
  response_date TEXT,
  due_date TEXT,

  -- Impact
  cost_impact INTEGER DEFAULT 0,  -- boolean
  schedule_impact INTEGER DEFAULT 0,  -- boolean
  change_order_id TEXT REFERENCES change_orders(id),

  -- Source
  source TEXT DEFAULT 'manual',  -- 'manual', 'smartplans', 'field'
  smartplans_rfi_id TEXT,  -- original ID from SmartPlans import

  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════
-- SUBMITTALS
-- ═══════════════════════════════════════════════════════

CREATE TABLE submittals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  submittal_number TEXT NOT NULL,
  title TEXT NOT NULL,
  spec_section TEXT,  -- '27 10 00', '28 31 00', etc.
  description TEXT,

  status TEXT NOT NULL DEFAULT 'in_preparation',
    -- 'in_preparation', 'submitted', 'approved', 'approved_as_noted', 'revise_resubmit', 'rejected'

  -- Tracking
  submitted_date TEXT,
  returned_date TEXT,
  due_date TEXT,
  revision INTEGER DEFAULT 0,

  -- Linked
  discipline TEXT,
  category TEXT,  -- 'product_data', 'shop_drawings', 'samples', 'test_reports', 'certificates'

  notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════
-- DAILY LOGS
-- ═══════════════════════════════════════════════════════

CREATE TABLE daily_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  log_date TEXT NOT NULL,

  -- Conditions
  weather TEXT,
  temperature_high REAL,
  temperature_low REAL,
  site_conditions TEXT,

  -- Labor
  crew_size INTEGER DEFAULT 0,
  hours_worked REAL DEFAULT 0,

  -- Work performed
  work_performed TEXT,  -- rich text description
  areas_worked TEXT,  -- rooms/floors

  -- Issues
  delays TEXT,
  safety_incidents TEXT,
  visitor_log TEXT,

  -- Materials
  materials_received TEXT,
  materials_installed TEXT,

  notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════
-- CONTACTS / DIRECTORY
-- ═══════════════════════════════════════════════════════

CREATE TABLE contacts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,  -- NULL = global contact
  name TEXT NOT NULL,
  company TEXT,
  role TEXT,  -- 'owner', 'architect', 'engineer', 'gc_pm', 'gc_super', 'inspector', 'subcontractor'
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════
-- DOCUMENTS / FILES
-- ═══════════════════════════════════════════════════════

CREATE TABLE documents (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
    -- 'plans', 'specifications', 'addenda', 'submittals', 'rfi_attachments',
    -- 'change_orders', 'photos', 'closeout', 'correspondence', 'other'
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  r2_key TEXT,  -- Cloudflare R2 object key
  description TEXT,
  uploaded_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════
-- PUNCH LIST
-- ═══════════════════════════════════════════════════════

CREATE TABLE punch_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  item_number INTEGER NOT NULL,
  location TEXT NOT NULL,  -- room, floor, area
  description TEXT NOT NULL,
  discipline TEXT,
  status TEXT NOT NULL DEFAULT 'open',  -- 'open', 'in_progress', 'complete', 'verified'
  priority TEXT DEFAULT 'normal',  -- 'low', 'normal', 'high'
  assigned_to TEXT,
  due_date TEXT,
  completed_date TEXT,
  verified_by TEXT,
  verified_date TEXT,
  notes TEXT,
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════
-- ACTIVITY LOG (audit trail)
-- ═══════════════════════════════════════════════════════

CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT REFERENCES projects(id),
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,  -- 'create', 'update', 'delete', 'import', 'export', 'submit', 'approve'
  entity_type TEXT NOT NULL,  -- 'project', 'sov', 'billing', 'co', 'rfi', 'submittal', 'punch'
  entity_id TEXT,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_sov_project ON sov_items(project_id);
CREATE INDEX idx_billing_project ON billing_periods(project_id);
CREATE INDEX idx_billing_lines ON billing_line_items(billing_period_id);
CREATE INDEX idx_co_project ON change_orders(project_id);
CREATE INDEX idx_rfi_project ON rfis(project_id);
CREATE INDEX idx_submittals_project ON submittals(project_id);
CREATE INDEX idx_daily_logs_project ON daily_logs(project_id, log_date);
CREATE INDEX idx_punch_project ON punch_items(project_id);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_activity_project ON activity_log(project_id);
```

---

## 🖥️ FRONTEND MODULES

### Module 1: Dashboard

**Purpose**: At-a-glance overview of all active projects and key metrics.

**Features**:
- **Active Projects Grid**: Cards showing project name, status badge, % complete, next billing date, outstanding COs/RFIs
- **Financial Summary Bar**: Total contract value across all projects, total billed, total outstanding, total retainage
- **Alerts Panel**: Overdue RFIs, pending change orders, upcoming billing periods, expiring submittals
- **Quick Actions**: New Project, Import from SmartPlans, Quick Search
- **Recent Activity Feed**: Last 20 actions across all projects

**Key Metrics Displayed**:
| Widget | Data |
|--------|------|
| Active Projects | Count with status breakdown |
| Total Contract Value | Sum of all current_contract_value |
| Outstanding Invoices | Billed but unpaid |
| Open RFIs | Count with overdue highlighted |
| Pending COs | Count with total $ pending |
| This Month's Billing | Projects due for billing this period |

---

### Module 2: Project Hub

**Purpose**: Central view for a single project. All sub-modules are accessed from here.

**Layout**: Sidebar navigation within the project context:
```
┌─────────────────────────────────────────────────┐
│  ← All Projects    PROJECT: ABC Office Tower    │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ Overview │  [Selected Module Content Area]      │
│ SOV      │                                      │
│ Billing  │                                      │
│ COs      │                                      │
│ RFIs     │                                      │
│ Submits  │                                      │
│ Daily Log│                                      │
│ Punch    │                                      │
│ Contacts │                                      │
│ Documents│                                      │
│ Settings │                                      │
│          │                                      │
└──────────┴──────────────────────────────────────┘
```

**Project Overview Panel**:
- Project info card (name, type, client, GC, address)
- Financial snapshot (contract value, billed, paid, retainage, remaining)
- Status timeline (bid → award → start → substantial → final)
- Discipline badges
- Budget health indicator (on budget / over / under)

---

### Module 3: Schedule of Values (SOV)

**Purpose**: Manage the G703 line items for progress billing.

**Features**:
- **SOV Table**: Full editable table with columns — Item #, Description, Scheduled Value, Material, Labor, Equipment, Sub
- **Import from SmartPlans**: Auto-populate SOV from imported estimate data
- **Add/Edit/Delete Line Items**: Inline editing with auto-calculation
- **Division Grouping**: Collapsible sections by CSI division (27, 28, SC, GC)
- **Balance Check**: Visual indicator showing if SOV total matches contract value
- **SOV Snapshot**: Lock SOV at each billing period (historical record)

**SOV Calculations**:
```
Total Scheduled Value = Σ(all line item scheduled values)
Must Equal = current_contract_value (original + approved COs)
Balance Status = ✅ Balanced | ⚠️ Under | 🔴 Over
```

---

### Module 4: Progress Billing (AIA G702/G703)

**Purpose**: Generate monthly payment applications.

**Features**:
- **New Billing Period**: Create from template, auto-populate from SOV
- **Line Item Progress Entry**: For each SOV item, enter:
  - Work completed this period ($)
  - Materials stored this period ($)
  - Auto-calculate cumulative % and values
- **G702 Cover Sheet**: Auto-calculated summary
- **Retainage Tracking**: Per-line or global retainage
- **Billing Status Workflow**: Draft → Submitted → Approved → Paid
- **Historical Comparison**: Side-by-side view of billing periods
- **Export**: Generate AIA G702/G703 PDF + Excel

**G702 Auto-Calculations**:
```
Line 1: Original Contract Sum
Line 2: Net Change by Change Orders (Σ approved COs)
Line 3: Contract Sum to Date (Line 1 + Line 2)
Line 4: Total Completed & Stored to Date (from G703)
Line 5: Retainage (Line 4 × retainage%)
Line 6: Total Earned Less Retainage (Line 4 - Line 5)
Line 7: Less Previous Certificates for Payment
Line 8: Current Payment Due (Line 6 - Line 7)
Line 9: Balance to Finish (Line 3 - Line 4)
```

---

### Module 5: Change Orders

**Purpose**: Track scope changes, price impacts, and approval workflow.

**Features**:
- **CO List**: Sortable/filterable table with status badges
- **New CO Form**: Description, cost breakdown (material, labor, equipment, sub), markup, schedule impact
- **CO Pricing Calculator**: Auto-apply project markup rates to cost inputs
- **Status Workflow**: Pending → Submitted → Approved/Rejected → Incorporated into SOV
- **Approval Tracking**: Who approved, when, signature reference
- **RFI Linkage**: Link CO to originating RFI
- **Financial Impact**: Running total of approved COs, effect on contract value
- **Export**: Individual CO documents, CO log summary

**CO Impact on Project**:
```
When CO approved:
  → current_contract_value += co.total_amount
  → New SOV line item added (or existing modified)
  → Billing periods updated to reflect new contract total
```

---

### Module 6: RFI Tracker

**Purpose**: Track questions to architect/engineer and their responses.

**Features**:
- **RFI List**: Filterable by status, priority, discipline, date range
- **Import from SmartPlans**: Auto-create RFIs from SmartPlans selected RFIs
- **New RFI Form**: Subject, question, detail, discipline, priority, due date, submitted to
- **Response Tracking**: Response text, responded by, response date
- **Status Workflow**: Draft → Submitted → Responded → Closed
- **Overdue Alerts**: Highlight RFIs past due date
- **Cost/Schedule Impact Flags**: Track if RFI results in CO
- **Export**: RFI log, individual RFI documents
- **Email Integration**: Send RFI directly to architect via Resend API

---

### Module 7: Submittal Log

**Purpose**: Track equipment/material submittals to architect for approval.

**Features**:
- **Submittal Register**: Sortable table with status, spec section, dates
- **New Submittal Form**: Number, title, spec section, category, description
- **Status Workflow**: In Preparation → Submitted → Approved/Approved as Noted/Revise & Resubmit/Rejected
- **Resubmission Tracking**: Revision history
- **Due Date Tracking**: Calendar integration, overdue alerts
- **Spec Section Linking**: Reference to project specifications

---

### Module 8: Daily Log

**Purpose**: Record daily field activity for each project.

**Features**:
- **Calendar View**: Navigate by date, visual indicators for logged/unlogged days
- **Log Entry Form**: Weather, temperature, crew size, hours, work performed, areas worked, delays, safety, visitors, materials
- **Photo Attachment**: Link site photos to daily log entries
- **Crew Tracking**: Number of workers by classification
- **Copy Previous**: Duplicate yesterday's log as starting template
- **Export**: Weekly/monthly log summary, individual daily reports

---

### Module 9: Punch List

**Purpose**: Track deficiency items at project closeout.

**Features**:
- **Punch Item List**: Filterable by status, location, discipline, assignee
- **New Item Form**: Location, description, discipline, priority, assigned to, due date
- **Status Workflow**: Open → In Progress → Complete → Verified
- **Batch Operations**: Select multiple items to update status
- **Completion Tracking**: Progress bar showing % complete
- **Export**: Formatted punch list document for distribution

---

### Module 10: Project Contacts

**Purpose**: Directory of all project stakeholders.

**Features**:
- **Contact List**: Grouped by role (Owner, Architect, Engineer, GC, Inspector, Subs)
- **Quick Actions**: Email, call link
- **Add/Edit Contacts**: Name, company, role, email, phone, notes
- **Project-Specific + Global**: Contacts can belong to a specific project or be available globally

---

### Module 11: Document Manager

**Purpose**: Centralized file storage for all project documents.

**Features**:
- **Category Browser**: Plans, Specifications, Addenda, Submittals, RFIs, COs, Photos, Closeout, Correspondence
- **Upload**: Drag and drop, multi-file, stored in Cloudflare R2
- **Preview**: In-browser preview for PDFs and images
- **Version Tracking**: Multiple versions of same document
- **Search**: Search by filename, category, upload date
- **Storage Usage**: Track R2 storage per project

---

### Module 12: Reports & Analytics

**Purpose**: Financial reporting and project analytics.

**Features**:
- **Project Financial Summary**: Contract value, billed, paid, retainage, remaining
- **Cost vs Budget**: Estimated (from SmartPlans) vs actual costs by category
- **Billing Aging Report**: Outstanding invoices by age (30/60/90 days)
- **Change Order Summary**: All COs with running total and approval rate
- **RFI Status Report**: Open/closed/overdue breakdown
- **Submittal Status Report**: Submission compliance rate
- **Punch List Progress**: Completion rate and aging
- **Multi-Project Dashboard**: Portfolio-level financials across all active projects
- **Export**: All reports to PDF and Excel

---

## 🔗 SMARTPLANS INTEGRATION

### Import Workflow

```
1. User clicks "Import from SmartPlans" on Dashboard or New Project
2. File picker opens, user selects .json file
3. System validates JSON structure (checks _meta.format === "smartplans-export")
4. Import preview dialog shows:
   - Project name, type, location
   - Pricing config summary
   - Number of SOV line items to create
   - Number of RFIs to import
   - Estimated contract value
5. User confirms import
6. System creates:
   - New project record with all config
   - SOV line items from AI analysis
   - RFI records from selected RFIs
   - Activity log entry
7. User is redirected to new project hub
```

### Data Mapping (SmartPlans JSON → D1)

| SmartPlans Field | PM App Table | Column |
|-----------------|--------------|--------|
| `project.name` | `projects` | `name` |
| `project.type` | `projects` | `type` |
| `project.location` | `projects` | `address` |
| `project.jurisdiction` | `projects` | `jurisdiction` |
| `project.disciplines` | `projects` | `disciplines` (JSON) |
| `pricingConfig.tier` | `projects` | `pricing_tier` |
| `pricingConfig.laborRates` | `projects` | `labor_rates` (JSON) |
| `pricingConfig.markup.*` | `projects` | `markup_*` columns |
| `analysis.sections` | `sov_items` | Parsed into line items |
| `rfis.items` (where selected) | `rfis` | Individual records |

---

## 🔌 API ENDPOINTS (Cloudflare Worker)

### Authentication
```
POST   /api/auth/login          { username, password }
POST   /api/auth/logout         { token }
GET    /api/auth/verify         Authorization: Bearer <token>
```

### Projects
```
GET    /api/projects             List all projects (with filters)
POST   /api/projects             Create new project
GET    /api/projects/:id         Get single project with summary stats
PUT    /api/projects/:id         Update project
DELETE /api/projects/:id         Soft delete project
POST   /api/projects/import      Import from SmartPlans JSON
```

### SOV
```
GET    /api/projects/:id/sov              Get all SOV items
POST   /api/projects/:id/sov              Add SOV item
PUT    /api/projects/:id/sov/:itemId      Update SOV item
DELETE /api/projects/:id/sov/:itemId      Delete SOV item
POST   /api/projects/:id/sov/reorder      Reorder SOV items
GET    /api/projects/:id/sov/balance      Check SOV vs contract balance
```

### Billing
```
GET    /api/projects/:id/billing             List billing periods
POST   /api/projects/:id/billing             Create new billing period
GET    /api/projects/:id/billing/:periodId   Get billing period with line items
PUT    /api/projects/:id/billing/:periodId   Update billing period
POST   /api/projects/:id/billing/:periodId/submit    Submit for approval
POST   /api/projects/:id/billing/:periodId/approve   Mark approved
POST   /api/projects/:id/billing/:periodId/paid      Mark paid
GET    /api/projects/:id/billing/:periodId/g702      Generate G702 data
GET    /api/projects/:id/billing/:periodId/g703      Generate G703 data
```

### Change Orders
```
GET    /api/projects/:id/cos             List change orders
POST   /api/projects/:id/cos             Create change order
GET    /api/projects/:id/cos/:coId       Get single CO
PUT    /api/projects/:id/cos/:coId       Update CO
POST   /api/projects/:id/cos/:coId/approve    Approve CO
POST   /api/projects/:id/cos/:coId/incorporate  Add CO to SOV
```

### RFIs
```
GET    /api/projects/:id/rfis            List RFIs
POST   /api/projects/:id/rfis            Create RFI
GET    /api/projects/:id/rfis/:rfiId     Get single RFI
PUT    /api/projects/:id/rfis/:rfiId     Update RFI
POST   /api/projects/:id/rfis/:rfiId/submit    Submit to architect
POST   /api/projects/:id/rfis/:rfiId/respond   Add response
POST   /api/projects/:id/rfis/:rfiId/send      Send via email (Resend)
```

### Submittals
```
GET    /api/projects/:id/submittals              List submittals
POST   /api/projects/:id/submittals              Create submittal
PUT    /api/projects/:id/submittals/:subId       Update submittal
```

### Daily Logs
```
GET    /api/projects/:id/logs                    List daily logs
POST   /api/projects/:id/logs                    Create daily log
GET    /api/projects/:id/logs/:date              Get log by date
PUT    /api/projects/:id/logs/:logId             Update daily log
```

### Punch List
```
GET    /api/projects/:id/punch                   List punch items
POST   /api/projects/:id/punch                   Create punch item
PUT    /api/projects/:id/punch/:itemId           Update punch item
POST   /api/projects/:id/punch/batch-update      Batch status update
```

### Contacts
```
GET    /api/contacts                             List global + project contacts
POST   /api/contacts                             Create contact
PUT    /api/contacts/:id                         Update contact
DELETE /api/contacts/:id                         Delete contact
```

### Documents
```
GET    /api/projects/:id/documents               List documents
POST   /api/projects/:id/documents/upload        Upload file to R2
GET    /api/projects/:id/documents/:docId/url    Get signed download URL
DELETE /api/projects/:id/documents/:docId        Delete document
```

### Reports
```
GET    /api/projects/:id/reports/financial       Project financial summary
GET    /api/projects/:id/reports/billing-aging    Billing aging report
GET    /api/reports/portfolio                    Multi-project dashboard data
```

---

## 🎨 UI/UX DESIGN STANDARDS

### Visual Identity
- **Theme**: Dark mode (matching SmartPlans and 3D Dispatch ecosystem)
- **Background**: Deep navy/charcoal (`#0f1419`)
- **Primary Accent**: Sky blue (`#38bdf8`) — consistent with SmartPlans
- **Secondary Accents**: Emerald (success), Amber (warning), Rose (critical), Indigo (info)
- **Typography**: Inter (UI), JetBrains Mono (data/numbers)
- **Cards**: Glass-morphism style with subtle borders and gradients
- **Tables**: Alternating row colors, sticky headers, inline editing

### Status Badge Colors
| Status | Color | Use |
|--------|-------|-----|
| Draft | Gray | Unpublished items |
| Active/Open | Sky Blue | In-progress items |
| Submitted | Amber | Awaiting response |
| Approved | Emerald | Approved items |
| Rejected | Rose | Rejected items |
| Complete | Emerald + check | Finished items |
| Overdue | Rose + clock | Past due date |
| On Hold | Amber + pause | Paused items |

### Responsive Design
- **Desktop (1200px+)**: Full sidebar + content area
- **Tablet (768-1199px)**: Collapsible sidebar, full content
- **Mobile (< 768px)**: Bottom navigation, stacked layouts, card-based views

---

## 📅 BUILD PHASES

### Phase 1: Foundation (Core Infrastructure)
- [ ] Project scaffolding (HTML/CSS/JS frontend)
- [ ] Cloudflare Worker setup with D1 schema
- [ ] Authentication system (login, sessions, role-based access)
- [ ] Base UI shell (header, sidebar, routing)
- [ ] Dashboard with project list

### Phase 2: Project Core
- [ ] Create/Edit Project form
- [ ] SmartPlans JSON import
- [ ] Project Hub with sidebar navigation
- [ ] Project Overview panel
- [ ] Contact management

### Phase 3: Financial Engine
- [ ] SOV management (CRUD, import from SmartPlans)
- [ ] Progress Billing (G702/G703)
- [ ] Change Order management
- [ ] Auto-calculation engine (contract value, billing, retainage)

### Phase 4: Tracking Modules
- [ ] RFI Tracker (with SmartPlans import)
- [ ] Submittal Log
- [ ] Daily Log
- [ ] Punch List

### Phase 5: Documents & Reports
- [ ] Document upload/management (R2)
- [ ] Financial reports
- [ ] PDF/Excel export for all modules
- [ ] Portfolio dashboard

### Phase 6: Integration & Polish
- [ ] 3D Dispatch integration (link technicians to projects)
- [ ] Email notifications (Resend)
- [ ] Activity log / audit trail
- [ ] PWA support (mobile installation)
- [ ] Performance optimization

---

## 🔒 SECURITY

- **Authentication**: SHA-256 password hashing with 24-hour session tokens (matches 3D Dispatch pattern)
- **Authorization**: Role-based (admin, pm, estimator, viewer)
- **CORS**: Whitelisted domains only
- **Input Validation**: Schema validation on all API inputs
- **Rate Limiting**: 100 requests/minute per IP
- **File Upload**: Type validation, size limits (50MB max per file)
- **Session Management**: Token-based, httpOnly cookies preferred
- **Audit Trail**: All mutations logged to activity_log table

---

## 📊 DEPLOYMENT

```
Repository: github.com/agoodson56/3DProjectManager
Frontend:   Cloudflare Pages (static)
Backend:    Cloudflare Workers
Database:   Cloudflare D1
Storage:    Cloudflare R2
Email:      Resend API
Domain:     pm.3dtsi.com (or similar)
```

### Cloudflare Configuration
```toml
# wrangler.toml
name = "3d-project-manager-api"
main = "worker/index.ts"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "3d-pm-db"
database_id = "<auto-generated>"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "3d-pm-files"

[vars]
RESEND_API_KEY = "<configured in dashboard>"
ALLOWED_ORIGINS = "https://pm.3dtsi.com"
```

---

*This specification is designed to be built in a single Antigravity workspace. Each phase builds on the previous, with the SmartPlans JSON import being the critical bridge between estimation and project management.*

*Generated: February 7, 2026*
*For: 3D Technology Services, Inc.*
