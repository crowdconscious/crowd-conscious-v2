#!/usr/bin/env bash
# scripts/geo/fetch-persona-ageb-sources.sh
# Download + verify official sources used by assign-persona-agebs.ts (Task 4a.2).
# Does not invent data. Aborts on sha256 mismatch for the INEGI census zip.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="${AGEB_ASSIGN_WORK_DIR:-/tmp/persona-ageb-sources}"
mkdir -p "$WORK"

CENSUS_URL='https://www.inegi.org.mx/contenidos/programas/ccpv/2020/datosabiertos/ageb_manzana/ageb_mza_urbana_09_cpv2020_csv.zip'
CENSUS_SHA='1f5f123b8e9a50991d1847271b5a2bf321e813e924e5bcf958cab612311c765a'
COLONIAS_URL='https://serviciosatlas.sgirpc.cdmx.gob.mx/arcgis/rest/services/Hosted/Catalogo_Colonias_CDMX/FeatureServer/0/query'

echo "== Censo 2020 AGEB CSV (entidad 09) =="
CENSUS_ZIP="$WORK/ageb_mza_urbana_09_cpv2020_csv.zip"
if [[ ! -f "$CENSUS_ZIP" ]]; then
  curl -fsSL -o "$CENSUS_ZIP" "$CENSUS_URL"
fi
GOT="$(sha256sum "$CENSUS_ZIP" | awk '{print $1}')"
if [[ "$GOT" != "$CENSUS_SHA" ]]; then
  echo "FATAL: census zip sha256 mismatch. expected $CENSUS_SHA got $GOT" >&2
  exit 1
fi
echo "census zip ok sha256=$GOT"
rm -rf "$WORK/census09"
unzip -q -o "$CENSUS_ZIP" -d "$WORK/census09"

echo "== Build ageb-population-cuau-mh.json =="
python3 - <<'PY' "$WORK" "$ROOT"
import csv, json, sys
work, root = sys.argv[1], sys.argv[2]
path = f"{work}/census09/ageb_mza_urbana_09_cpv2020/conjunto_de_datos/conjunto_de_datos_ageb_urbana_09_cpv2020.csv"
geo = json.load(open(f"{root}/public/geo/ageb-cuauhtemoc-mh.geojson"))
codes = {f["properties"]["ageb_code"] for f in geo["features"]}
out = {}
with open(path, newline="", encoding="utf-8-sig") as f:
    for row in csv.DictReader(f):
        if row["MUN"] not in ("015", "016"):
            continue
        if row["MZA"] != "000":
            continue
        if "Total AGEB" not in (row.get("NOM_LOC") or ""):
            continue
        ent = row["ENTIDAD"].zfill(2)
        cve = f"{ent}{row['MUN'].zfill(3)}{row['LOC'].zfill(4)}{row['AGEB']}"
        if cve not in codes:
            continue
        def num(x):
            x = (x or "").strip()
            if x in ("", "*", "N/D", "N/A"):
                return None
            try:
                return int(float(x))
            except ValueError:
                return None
        out[cve] = {"POBTOT": num(row["POBTOT"]), "P_18YMAS": num(row["P_18YMAS"])}
missing = codes - set(out)
if missing:
    raise SystemExit(f"census missing {len(missing)} geojson codes e.g. {list(missing)[:5]}")
path_out = f"{root}/public/geo/ageb-population-cuau-mh.json"
json.dump({k: out[k] for k in sorted(out)}, open(path_out, "w"), indent=2)
print(f"wrote {path_out} ({len(out)} AGEBs)")
PY

echo "== Colonias Cuau/MH from CDMX Catalogo FeatureServer =="
python3 - <<'PY' "$ROOT"
import json, urllib.request, time, sys
root = sys.argv[1]
base = "https://serviciosatlas.sgirpc.cdmx.gob.mx/arcgis/rest/services/Hosted/Catalogo_Colonias_CDMX/FeatureServer/0/query"
features = []
offset = 0
page = 1000
while True:
    params = (
        "where=cve_alc%3D%27015%27%20OR%20cve_alc%3D%27016%27"
        "&outFields=colonia,alc,cve_alc,cve_col,clasif,entidad,cve_ent"
        "&returnGeometry=true&outSR=4326&f=geojson"
        f"&resultOffset={offset}&resultRecordCount={page}"
    )
    with urllib.request.urlopen(f"{base}?{params}", timeout=120) as r:
        data = json.load(r)
    batch = data.get("features") or []
    features.extend(batch)
    if not batch or not data.get("exceededTransferLimit"):
        break
    offset += len(batch)
    time.sleep(0.2)
if len(features) < 50:
    raise SystemExit(f"unexpectedly few colonias: {len(features)}")
path = f"{root}/public/geo/colonias-cuau-mh.geojson"
json.dump({"type": "FeatureCollection", "features": features}, open(path, "w"), ensure_ascii=False, separators=(",", ":"))
print(f"wrote {path} ({len(features)} features)")
PY

echo "Done. Re-run: node --experimental-strip-types scripts/geo/assign-persona-agebs.ts --from-generated"
