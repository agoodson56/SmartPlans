#!/usr/bin/env python3
"""
Scan all 15 sample bid spreadsheets and extract calibration anchors.

Two 3D-Technology Services bid formats:
1. BOOKING format — "BOOKING" sheet has "SCOPES BID FOR THIS PROJECT" table
   in cols 12-14 with discipline rollups + TOTAL row.
2. Estimate format — Sage-style "Bid Item Totals" / "Phase Totals" /
   "Job Totals" / "Grand Totals" hierarchy with sell in last column.
3. VA format — per-system tabs (FIRE LABOR, FIRE MATERIALS, ...) requiring
   summation across sheets.

Output: per-bid summary JSON + ready-to-paste commercialBenchmarks block.
"""
import json
import re
import sys
from pathlib import Path

import openpyxl
import xlrd

BIDS_DIR = Path(r"F:\Amtrak Files\Other Bids\Fw_ Sample Bids")

# (filename, key, project_type, jurisdiction, wage_class)
BID_FILES = [
    ("54838-Auburn_Indians_Est.xlsx",                       "auburn_indians_est",      "tribal_office",   "Auburn",       "npw"),
    ("Indians_Bid_(V.1)_10-27-25.xlsx",                     "indians_bid_v1",          "tribal_office",   "Auburn",       "npw"),
    ("55201-Ethos Energy Fence Detection EST.xlsx",         "ethos_energy_fence",      "industrial",      "private",      "npw"),
    ("POA-Sac Office Estimate 02262025.xlsx",               "poa_sac_office",          "office",          "Sacramento",   "npw"),
    ("SAC Juvenile Court Bid (V.2) 8-19-24.xlsx",           "sac_juvenile_court",      "court",           "Sacramento",   "pw"),
    ("Sam Brennan Telecenter Bid (TSTPETE REVIEW) 9-11-25.xlsx", "sam_brennan_telecenter", "telecenter",   "Sacramento",   "pw"),
    ("Superior Equipment Estimate 02172025.xlsx",           "superior_equipment",      "industrial",      "Sacramento",   "npw"),
    ("VA Spinal Cord Injury Building Systems ESTIMATE 1-9-22.xls", "va_spinal_cord",   "healthcare_va",   "federal",      "davis_bacon"),
    ("500_Capitol_Mall_Data_Cabling_Bid_(V.1)_3-16-26.xlsx", "capitol_mall_500_v1",    "office",          "Sacramento",   "pw"),
    ("500_Capitol_Mall_Data_Cabling_Bid_(V.2)_3-25-26.xlsx", "capitol_mall_500_v2",    "office",          "Sacramento",   "pw"),
    ("760_Sheriffs_Estimate_01272025.xlsx",                 "sheriffs_760",            "law_enforcement", "Sacramento",   "pw"),
    ("760_Sheriffs_HDMI_Estimate_03242025.xlsx",            "sheriffs_760_hdmi",       "law_enforcement", "Sacramento",   "pw"),
    ("1515_S_Street_Bid_(V.1)_5-21-25.xlsx",                "s_street_1515",           "state_office",    "Sacramento",   "pw"),
    ("54008-CHP Dublin Estimate.xlsx",                      "chp_dublin",              "law_enforcement", "Dublin",       "pw"),
    ("54043-CHP North Sac Estimate.xlsx",                   "chp_north_sac",           "law_enforcement", "Sacramento",   "pw"),
]

DISCIPLINE_ROW_LABELS = {
    "TELECOMMUNICATIONS": "telecom",
    "TELECOMM": "telecom",
    "BACKBONE": "backbone",
    "FIBER BACKBONE": "backbone",
    "WIFI": "wifi",
    "WIRELESS ACCESS": "wifi",
    "AUDIO VISUAL": "audio_visual",
    "AV": "audio_visual",
    "SOUND MASKING": "sound_masking",
    "ERRCS": "errcs",
    "CELLULAR DAS": "das",
    "DAS": "das",
    "FIRE ALARM": "fire_alarm",
    "2-WAY": "two_way",
    "INTERCOM": "intercom",
    "CARD ACCESS": "card_access",
    "ACCESS CONTROL": "card_access",
    "CCTV": "cctv",
    "POINT-TO-POINT": "point_to_point",
    "NURSE CALL": "nurse_call",
    "INTRUSION": "intrusion",
    "RFID RESIDENT LOCKS": "rfid",
    "CLOCK SYSTEM": "clock",
    "TELE/DATA": "telecom",
}


def _safe_float(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        try:
            return float(v)
        except Exception:
            return None
    s = str(v).strip().replace("$", "").replace(",", "")
    try:
        return float(s)
    except Exception:
        return None


def _norm(s):
    return str(s).strip().upper() if s is not None else ""


def open_book(path: Path):
    if path.suffix.lower() == ".xls":
        wb = xlrd.open_workbook(str(path))
        for sh in wb.sheets():
            rows = []
            for r in range(sh.nrows):
                rows.append([sh.cell_value(r, c) for c in range(sh.ncols)])
            yield sh.name, rows
    else:
        wb = openpyxl.load_workbook(str(path), data_only=True, read_only=True)
        for ws in wb.worksheets:
            rows = []
            for row in ws.iter_rows(values_only=True):
                rows.append(list(row) if row else [])
            yield ws.title, rows


# ─── Format A: BOOKING sheet (col 12 = label, col 13 = sell) ────
def find_booking_total(rows):
    discipline_totals = {}
    grand_total = None
    for row in rows:
        if not row or len(row) < 14:
            continue
        label = _norm(row[12]) if len(row) > 12 else ""
        if not label:
            continue
        val = _safe_float(row[13]) if len(row) > 13 else None
        if val is None:
            continue
        if 70 < val < 80:  # the $73-$74 placeholder rows
            continue
        if label == "TOTAL":
            grand_total = val
            continue
        if label in DISCIPLINE_ROW_LABELS:
            slug = DISCIPLINE_ROW_LABELS[label]
            discipline_totals[slug] = (discipline_totals.get(slug, 0)) + val
    return grand_total, discipline_totals


# ─── Format B: Estimate (Bid Item / Phase / Job / Grand Totals) ─
def find_estimate_total(rows):
    """Look for 'Grand Totals:' label and the last numeric cell in that row."""
    grand = None
    job = None
    phase = None
    bid_items = []
    for row in rows:
        if not row:
            continue
        # Search the row for the Total label (anywhere)
        for ci, cell in enumerate(row):
            if not cell:
                continue
            s = _norm(cell)
            if s in ("GRAND TOTALS:", "GRAND TOTAL:"):
                # Last numeric cell in this row is the sell price
                for cj in range(len(row) - 1, ci, -1):
                    v = _safe_float(row[cj])
                    if v and v > 100:
                        grand = v
                        break
                break
            if s in ("JOB TOTALS:", "JOB TOTAL:"):
                for cj in range(len(row) - 1, ci, -1):
                    v = _safe_float(row[cj])
                    if v and v > 100:
                        job = v
                        break
                break
            if s in ("PHASE TOTALS:", "PHASE TOTAL:"):
                for cj in range(len(row) - 1, ci, -1):
                    v = _safe_float(row[cj])
                    if v and v > 100:
                        phase = v
                        break
                break
            if s in ("BID ITEM TOTALS:", "BID ITEM TOTAL:"):
                for cj in range(len(row) - 1, ci, -1):
                    v = _safe_float(row[cj])
                    if v and v > 100:
                        bid_items.append(v)
                        break
                break
    # Prefer Grand → Job → Phase → sum(bid items)
    if grand is not None:
        return grand
    if job is not None:
        return job
    if phase is not None:
        return phase
    if bid_items:
        return sum(bid_items)
    return None


# ─── Format C: VA per-system tabs ──────────────────────────────
def find_va_total(rows_per_sheet):
    """VA Spinal Cord has 'ALL SHEETS SUMMARY' tab with consolidated total
    in row labelled 'TOTAL BID AMOUNT' and the dollar value 1-2 cells over.
    Falls back to summing per-system 'TOTAL SELL' rows."""
    if "ALL SHEETS SUMMARY" in rows_per_sheet:
        rows = rows_per_sheet["ALL SHEETS SUMMARY"]
        # Look for "TOTAL BID AMOUNT" — the value is on the SAME row, last money cell,
        # OR on the row immediately above/below
        for r_idx, row in enumerate(rows):
            if not row:
                continue
            for ci, cell in enumerate(row):
                if cell and isinstance(cell, str) and _norm(cell) == "TOTAL BID AMOUNT":
                    # Search neighborhood (this row + 3 rows around) for largest money value
                    candidates = []
                    for dr in (-2, -1, 0, 1, 2):
                        nr = r_idx + dr
                        if 0 <= nr < len(rows) and rows[nr]:
                            for c in rows[nr]:
                                v = _safe_float(c)
                                if v and v > 50000:
                                    candidates.append(v)
                    if candidates:
                        return max(candidates)
        # Fallback: largest sell-price-like value in summary sheet
        biggest = 0
        for row in rows:
            if not row:
                continue
            for ci, cell in enumerate(row):
                if not cell:
                    continue
                s = _norm(cell)
                if s in ("TOTAL SELL", "TOTAL BID", "GRAND TOTAL", "PROJECT TOTAL"):
                    for cj in range(len(row) - 1, ci, -1):
                        v = _safe_float(row[cj])
                        if v and v > biggest:
                            biggest = v
                            break
                    break
        if biggest > 0:
            return biggest

    # Per-tab summation as last resort
    grand = 0.0
    found = False
    for sheet_name, rows in rows_per_sheet.items():
        sn = _norm(sheet_name)
        if not any(k in sn for k in ("LABOR", "MATERIAL", "MATERIALS")):
            continue
        sheet_total = 0.0
        for row in rows:
            if not row:
                continue
            for ci, cell in enumerate(row):
                if not cell:
                    continue
                s = _norm(cell)
                if s in ("TOTAL", "SELL PRICE", "GRAND TOTAL", "TOTAL SELL"):
                    for cj in range(len(row) - 1, ci, -1):
                        v = _safe_float(row[cj])
                        if v and v > sheet_total:
                            sheet_total = v
                            break
                    break
        if sheet_total > 0:
            grand += sheet_total
            found = True
    return grand if found else None


# ─── Format D: tiny "Estimate"/"Cust Copy" 2-tab bid ────────────
def find_simple_estimate_total(rows_per_sheet):
    """Look for 'GRAND TOTAL:' / 'Total Price:' / 'TOTAL WITH TAX:' label."""
    candidates = []
    for sheet_name, rows in rows_per_sheet.items():
        for row in rows:
            if not row:
                continue
            for ci, cell in enumerate(row):
                if not cell:
                    continue
                s = _norm(cell).rstrip(":").strip()
                if s in ("GRAND TOTAL", "TOTAL PRICE", "TOTAL WITH TAX", "TOTAL", "PROJECT TOTAL"):
                    # Take the next numeric cell to the right
                    for cj in range(ci + 1, min(len(row), ci + 6)):
                        v = _safe_float(row[cj])
                        if v and v > 100:
                            candidates.append((v, s, sheet_name))
                            break
                    break
    if not candidates:
        return None
    candidates.sort(key=lambda x: -x[0])
    return candidates[0][0]


# ─── Generic device counts ─────────────────────────────────────
def count_devices_in_book(rows_per_sheet):
    cam = drop = rdr = 0
    cam_excl = re.compile(
        r"mount|bracket|housing|cable\b|adapter|surge|software|warranty|license|sd[\s-]?card|power|accessor|jack",
        re.I,
    )
    cam_pat = re.compile(r"\b(camera|axis\s*[pqmf]\d|axis\s*q\d{4}|fixed\s*dome|outdoor\s*camera|indoor\s*camera|panoramic\s*camera|fisheye|ptz)\b", re.I)
    drop_pat = re.compile(r"\b(data|voice|cat\s*6a?|cat6a?|network|communication|rj.?45)\s*(drop|outlet|jack|port)", re.I)
    rdr_pat = re.compile(r"\b(card\s*reader|prox\s*reader|electric\s*strike|mag\s*lock)\b", re.I)
    rdr_excl = re.compile(r"reader.*board|board.*reader|reader.*module|cable", re.I)

    for sheet_name, rows in rows_per_sheet.items():
        sn = _norm(sheet_name)
        # Skip rate/budget tabs that have boilerplate "default" qty values
        if sn in ("PW", "LIFT RATES", "LIFT", "RATES", "BOOKING", "BUDGET", "SAGE BUDGET", "SAGE"):
            continue
        for row in rows:
            if not row:
                continue
            # Find the description (first long string) and the qty (first int 1-2000)
            label = ""
            qty = None
            for cell in row:
                if cell is None:
                    continue
                if isinstance(cell, str) and len(cell.strip()) >= 6 and not label:
                    label = cell.strip()
                elif isinstance(cell, (int, float)) and qty is None:
                    if 0 < cell <= 2000 and cell == int(cell):
                        qty = int(cell)
            if not label or qty is None:
                continue
            if cam_pat.search(label) and not cam_excl.search(label):
                cam += qty
            elif drop_pat.search(label):
                drop += qty
            elif rdr_pat.search(label) and not rdr_excl.search(label):
                rdr += qty
    return cam, drop, rdr


def scan(path: Path, key, ptype, jur, wc):
    out = {
        "file": path.name,
        "key": key,
        "project_type": ptype,
        "jurisdiction": jur,
        "wage_class": wc,
    }
    rows_per_sheet = {}
    sheet_names = []
    try:
        for sheet_name, rows in open_book(path):
            sheet_names.append(sheet_name)
            rows_per_sheet[sheet_name] = rows
    except Exception as e:
        out["error"] = str(e)
        return out
    out["sheets"] = sheet_names

    total = None
    src = None
    discs = {}

    # 1. Try BOOKING format
    if "BOOKING" in rows_per_sheet:
        gt, disc = find_booking_total(rows_per_sheet["BOOKING"])
        if gt and gt > 1000:
            total = gt
            discs = disc
            src = "BOOKING/SCOPES BID"

    # 2. Try Estimate format on every sheet (look for Grand Totals: hierarchy)
    if total is None:
        for sheet_name, rows in rows_per_sheet.items():
            t = find_estimate_total(rows)
            if t and t > 1000:
                total = t
                src = f"Estimate / {sheet_name}"
                break

    # 3. Try VA per-tab summation
    if total is None and any("LABOR" in _norm(s) for s in sheet_names):
        t = find_va_total(rows_per_sheet)
        if t and t > 1000:
            total = t
            src = "per-system tabs (VA)"

    # 4. Try simple Estimate / Cust Copy two-tab format
    if total is None:
        t = find_simple_estimate_total(rows_per_sheet)
        if t and t > 100:
            total = t
            src = "simple Estimate"

    out["total"] = total
    out["source"] = src or "FAILED"
    out["disciplines"] = discs
    cam, drop, rdr = count_devices_in_book(rows_per_sheet)
    out["cameras"] = cam
    out["drops"] = drop
    out["readers"] = rdr
    return out


def main():
    results = []
    for fname, key, ptype, jur, wc in BID_FILES:
        p = BIDS_DIR / fname
        if not p.exists():
            print(f"MISSING: {fname}", file=sys.stderr)
            continue
        print(f"Scanning {fname}...", file=sys.stderr)
        results.append(scan(p, key, ptype, jur, wc))
    print(json.dumps(results, indent=2, default=str))


if __name__ == "__main__":
    main()
