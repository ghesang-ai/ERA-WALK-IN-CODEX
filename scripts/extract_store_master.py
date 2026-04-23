import json
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "Nama dan No Telp Store Leader All Brand April 2026-2.xlsx"
OUTPUT = ROOT / "data" / "stores.json"


def main():
    wb = openpyxl.load_workbook(SOURCE, data_only=True, read_only=True)
    ws = wb["All Brand"]
    rows = ws.iter_rows(values_only=True)
    headers = [str(cell).strip() if cell is not None else "" for cell in next(rows)]
    index = {header: i for i, header in enumerate(headers)}

    stores = []
    seen_codes = set()
    for row in rows:
        code = str(row[index["SAP CODE"]] or "").strip().upper()
        name = str(row[index["STORE NAME"]] or "").strip()
        if not code or not name or code in seen_codes:
            continue

        seen_codes.add(code)
        stores.append(
            {
                "code": code,
                "name": name,
                "region": str(row[index["REGION"]] or "").strip(),
                "leader": str(row[index["SL (Nama KTP)"]] or "").strip(),
            }
        )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(stores, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(stores)} stores to {OUTPUT}")


if __name__ == "__main__":
    main()
