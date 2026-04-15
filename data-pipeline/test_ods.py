import zipfile
from xml.etree.ElementTree import iterparse

def read_ods_fast(filepath):
    ns = {
        "table": "{urn:oasis:names:tc:opendocument:xmlns:table:1.0}",
        "text": "{urn:oasis:names:tc:opendocument:xmlns:text:1.0}"
    }
    
    rows = []
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
                        rows.append(current_row_cells)
                    in_row = False
                    elem.clear() # memory saving
                elif event == 'end':
                    elem.clear()
    
    # Process rows into dicts
    dict_rows = []
    for i, vals in enumerate(rows):
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

            dict_rows.append({
                "state_code": state_code, "state_name": state_name,
                "district_code": district_code, "district_name": dist_name,
                "subdt_code": subdt_code, "subdt_name": subdt_name,
                "village_code": village_code, "village_name": vill_name,
            })
        except Exception as e:
            pass
    return dict_rows

r = read_ods_fast(r'c:\Users\shiva\OneDrive\Desktop\capestone\dataset\Rdir_2011_09_UTTAR_PRADESH.ods')
print(f"Total rows: {len(r)}")
if len(r) > 1:
    print("Row 0:", r[0])
    print("Row 1:", r[1])
