import os
import xlrd
import psycopg2
import logging
from datetime import datetime
from dotenv import load_dotenv

# ─── Setup ───────────────────────────────────────────────────
# Use paths relative to this script file
SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PIPELINE_DIR = os.path.join(SCRIPT_DIR, "..")
OUTPUT_DIR   = os.path.join(PIPELINE_DIR, "output")
DATASET_DIR  = os.path.join(PIPELINE_DIR, "..", "dataset")
BACKEND_DIR  = os.path.join(PIPELINE_DIR, "..", "backend")
BATCH_SIZE   = 5000   # insert villages in chunks of 5000 rows

# Load .env from backend folder (single source of truth)
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

os.makedirs(OUTPUT_DIR, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(OUTPUT_DIR, f"import_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log")),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

# ─── DB Connection ────────────────────────────────────────────
def get_connection():
    return psycopg2.connect(os.environ["DATABASE_URL"])

# ─── Read a single XLS file ──────────────────────────────────
def read_xls(filepath):
    """Read XLS file, skip header row, skip summary rows (village_code == '000000')"""
    rows = []
    try:
        wb = xlrd.open_workbook(filepath)
        sh = wb.sheet_by_index(0)
        for i in range(1, sh.nrows):          # skip row 0 (header)
            row = sh.row_values(i)
            if len(row) < 8:
                log.warning(f"Skipping short row {i} in {os.path.basename(filepath)}: {row}")
                continue
            state_code      = str(row[0]).strip().split(".")[0]   # remove .0 float artifact
            state_name      = str(row[1]).strip()
            district_code   = str(row[2]).strip().split(".")[0]
            district_name   = str(row[3]).strip()
            subdt_code      = str(row[4]).strip().split(".")[0]
            subdt_name      = str(row[5]).strip()
            village_code    = str(row[6]).strip().split(".")[0]
            village_name    = str(row[7]).strip()

            # Skip summary/aggregation rows
            if village_code == "0" or village_code == "000000" or village_code == "":
                continue
            # Skip rows with missing critical data
            if not state_code or not district_code or not village_name:
                log.warning(f"Skipping incomplete row {i} in {os.path.basename(filepath)}")
                continue

            rows.append({
                "state_code":    state_code,
                "state_name":    state_name,
                "district_code": district_code,
                "district_name": district_name,
                "subdt_code":    subdt_code,
                "subdt_name":    subdt_name,
                "village_code":  village_code,
                "village_name":  village_name,
            })
    except Exception as e:
        log.error(f"Failed to read {filepath}: {e}")
    return rows

# ─── Read ODS file (Uttar Pradesh) - FAST XML PARSER ──────────
def read_ods(filepath):
    import zipfile
    from xml.etree.ElementTree import iterparse
    
    rows = []
    try:
        ns = {
            "table": "{urn:oasis:names:tc:opendocument:xmlns:table:1.0}",
            "text": "{urn:oasis:names:tc:opendocument:xmlns:text:1.0}"
        }
        
        parsed_xml_rows = []
        with zipfile.ZipFile(filepath, 'r') as zf:
            with zf.open('content.xml') as f:
                context = iterparse(f, events=('start', 'end'))
                current_row_cells = []
                in_row = False
                current_cell_text = ""
                repeated = 1
                
                for event, elem in context:
                    if event == 'start' and elem.tag == f"{ns['table']}table-row":
                        in_row = True
                        current_row_cells = []
                    elif event == 'start' and elem.tag == f"{ns['table']}table-cell":
                        current_cell_text = ""
                        rep = elem.attrib.get(f"{ns['table']}number-columns-repeated")
                        repeated = int(rep) if rep else 1
                    elif event == 'end' and elem.tag == f"{ns['text']}p":
                        if elem.text:
                            current_cell_text += elem.text + " "
                    elif event == 'end' and elem.tag == f"{ns['table']}table-cell":
                        current_row_cells.extend([current_cell_text.strip()] * repeated)
                    elif event == 'end' and elem.tag == f"{ns['table']}table-row":
                        if current_row_cells and any(current_row_cells):
                            parsed_xml_rows.append(current_row_cells)
                        in_row = False
                        elem.clear() # memory saving
                    elif event == 'end':
                        elem.clear()
        
        for i, vals in enumerate(parsed_xml_rows):
            if i == 0 or len(vals) < 8:
                continue
            try:
                state_code, state_name   = str(vals[0]).split(".")[0].strip(), vals[1].strip()
                district_code, dist_name = str(vals[2]).split(".")[0].strip(), vals[3].strip()
                subdt_code, subdt_name   = str(vals[4]).split(".")[0].strip(), vals[5].strip()
                village_code, vill_name  = str(vals[6]).split(".")[0].strip(), vals[7].strip()

                if village_code in ("0", "000000", ""):
                    continue
                if not state_code or not vill_name:
                    continue

                rows.append({
                    "state_code": state_code, "state_name": state_name,
                    "district_code": district_code, "district_name": dist_name,
                    "subdt_code": subdt_code, "subdt_name": subdt_name,
                    "village_code": village_code, "village_name": vill_name,
                })
            except Exception:
                pass
    except Exception as e:
        log.error(f"Failed to read fast ODS {filepath}: {e}")
    return rows


# ─── Phase 1: Upsert Country ─────────────────────────────────
def upsert_country(cur):
    cur.execute("""
        INSERT INTO "Country" (name, code, "createdAt")
        VALUES ('India', 'IN', NOW())
        ON CONFLICT (code) DO NOTHING
        RETURNING id
    """)
    row = cur.fetchone()
    if row:
        return row[0]
    cur.execute('SELECT id FROM "Country" WHERE code = %s', ('IN',))
    return cur.fetchone()[0]


# ─── Phase 2: Upsert States ──────────────────────────────────
def upsert_states(cur, all_rows, country_id):
    """Deduplicate and insert all unique states"""
    seen = {}
    for r in all_rows:
        code = r["state_code"]
        if code not in seen:
            seen[code] = r["state_name"]

    state_id_map = {}
    for code, name in seen.items():
        cur.execute("""
            INSERT INTO "State" ("stateCode", name, "countryId", "createdAt")
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT ("stateCode", "countryId") DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        """, (code, name, country_id))
        state_id_map[code] = cur.fetchone()[0]

    log.info(f"  ✅ Upserted {len(state_id_map)} states")
    return state_id_map


# ─── Phase 3: Upsert Districts ───────────────────────────────
def upsert_districts(cur, all_rows, state_id_map):
    seen = {}
    for r in all_rows:
        key = (r["district_code"], r["state_code"])
        if key not in seen:
            seen[key] = r["district_name"]

    district_id_map = {}
    for (dist_code, state_code), name in seen.items():
        state_id = state_id_map.get(state_code)
        if not state_id:
            continue
        cur.execute("""
            INSERT INTO "District" ("districtCode", name, "stateId", "createdAt")
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT ("districtCode", "stateId") DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        """, (dist_code, name, state_id))
        district_id_map[(dist_code, state_code)] = cur.fetchone()[0]

    log.info(f"  ✅ Upserted {len(district_id_map)} districts")
    return district_id_map


# ─── Phase 4: Upsert SubDistricts ────────────────────────────
def upsert_subdistricts(cur, all_rows, district_id_map, state_id_map):
    seen = {}
    for r in all_rows:
        key = (r["subdt_code"], r["district_code"], r["state_code"])
        if key not in seen:
            seen[key] = r["subdt_name"]

    subdt_id_map = {}
    for (subdt_code, dist_code, state_code), name in seen.items():
        district_id = district_id_map.get((dist_code, state_code))
        if not district_id:
            continue
        cur.execute("""
            INSERT INTO "SubDistrict" ("subDistrictCode", name, "districtId", "createdAt")
            VALUES (%s, %s, %s, NOW())
            ON CONFLICT ("subDistrictCode", "districtId") DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        """, (subdt_code, name, district_id))
        subdt_id_map[(subdt_code, dist_code, state_code)] = cur.fetchone()[0]

    log.info(f"  ✅ Upserted {len(subdt_id_map)} sub-districts")
    return subdt_id_map


# ─── Phase 5: Batch Insert Villages ──────────────────────────
def insert_villages(cur, all_rows, subdt_id_map, state_id_map, district_id_map):
    batch, total, skipped = [], 0, 0

    def flush(batch):
        if not batch:
            return
        args = b",".join(
            cur.mogrify("(%s,%s,%s,NOW())", v) for v in batch
        )
        cur.execute(b"""
            INSERT INTO "Village" ("villageCode", name, "subDistrictId", "createdAt")
            VALUES """ + args + b"""
            ON CONFLICT ("villageCode", "subDistrictId") DO NOTHING
        """)

    for r in all_rows:
        key = (r["subdt_code"], r["district_code"], r["state_code"])
        subdt_id = subdt_id_map.get(key)
        if not subdt_id:
            skipped += 1
            continue
        batch.append((r["village_code"], r["village_name"], subdt_id))
        if len(batch) >= BATCH_SIZE:
            flush(batch)
            total += len(batch)
            batch = []

    flush(batch)
    total += len(batch)
    log.info(f"  ✅ Inserted {total} villages | Skipped {skipped}")
    return total


# ─── Verification ────────────────────────────────────────────
def verify(cur):
    log.info("\n" + "=" * 50)
    log.info("📊 VERIFICATION REPORT")
    log.info("=" * 50)
    for table in ["Country", "State", "District", "SubDistrict", "Village"]:
        cur.execute(f'SELECT COUNT(*) FROM "{table}"')
        count = cur.fetchone()[0]
        log.info(f"  {table:<15}: {count:>8,} rows")
    log.info("=" * 50)


# ─── Main Entry Point ────────────────────────────────────────
def main():
    log.info("🚀 Starting MDDS Data Import Pipeline")
    log.info(f"   Dataset directory: {DATASET_DIR}")

    # Collect all rows from all files
    all_rows    = []
    file_errors = []
    files       = sorted(os.listdir(DATASET_DIR))
    total_files = len([f for f in files if f.endswith((".xls", ".ods"))])
    processed   = 0

    for fname in files:
        fpath = os.path.join(DATASET_DIR, fname)
        if fname.endswith(".xls"):
            rows = read_xls(fpath)
        elif fname.endswith(".ods"):
            rows = read_ods(fpath)
        else:
            continue

        processed += 1
        log.info(f"  [{processed}/{total_files}] {fname}: {len(rows):,} village rows read")

        if not rows:
            if "MADHYA_PRADESH" in fname:
                log.warning(f"  [EXPECTED] {fname} contains only summary data, no villages. Skipping.")
            else:
                file_errors.append(fname)
        all_rows.extend(rows)

    log.info(f"\n📁 Total rows collected: {len(all_rows):,}")
    if file_errors:
        log.warning(f"⚠️  Files with unexpected errors/no data: {file_errors}")

    # Connect and import
    conn = get_connection()
    try:
        cur = conn.cursor()

        log.info("\n─── Phase 1: Country ───────────────────────")
        country_id = upsert_country(cur)
        log.info(f"  ✅ Country 'India' → id={country_id}")

        log.info("\n─── Phase 2: States ────────────────────────")
        state_id_map = upsert_states(cur, all_rows, country_id)

        log.info("\n─── Phase 3: Districts ─────────────────────")
        district_id_map = upsert_districts(cur, all_rows, state_id_map)

        log.info("\n─── Phase 4: Sub-Districts ─────────────────")
        subdt_id_map = upsert_subdistricts(cur, all_rows, district_id_map, state_id_map)

        log.info("\n─── Phase 5: Villages ──────────────────────")
        insert_villages(cur, all_rows, subdt_id_map, state_id_map, district_id_map)

        conn.commit()
        log.info("\n✅ All data committed to database!")

        log.info("\n─── Phase 6: Verification ──────────────────")
        verify(cur)

        cur.close()
    except Exception as e:
        conn.rollback()
        log.error(f"❌ FATAL ERROR: {e}")
        raise
    finally:
        conn.close()
        log.info("\n🏁 Import pipeline finished.")

if __name__ == "__main__":
    main()
