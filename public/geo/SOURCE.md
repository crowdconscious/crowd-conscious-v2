# AGEB geodata source — Cuauhtémoc + Miguel Hidalgo

Verified official geography for the sim-viewer Mapa mode (Task 4a).  
**Do not replace this file with approximated, traced, or LLM-generated shapes.**

## Source

| Field | Value |
| --- | --- |
| Product | **Marco Geoestadístico, Censo de Población y Vivienda 2020** |
| Publisher | Instituto Nacional de Estadística y Geografía (INEGI) |
| UPC / product id | `889463807469` |
| State package | Ciudad de México (`09_ciudaddemexico.zip`) |
| Layer used | `conjunto_de_datos/09a.*` — AGEB urbanas (`eea`) |
| Filter | `CVE_ENT=09`, `CVE_MUN IN ('015','016')` (Cuauhtémoc, Miguel Hidalgo) |
| Download URL | https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/geografia/marcogeo/889463807469/09_ciudaddemexico.zip |
| Product / topic page | https://www.inegi.org.mx/temas/mg/ |
| Retrieval date | 2026-09-29 |
| Archive file name | `09_ciudaddemexico.zip` |
| sha256 | `685b912f5458138a70726cff41aff828473e14264c43289d3b21f86a9df00320` |
| Native CRS | Mexico ITRF2008 Lambert Conformal Conic (see `.prj`) |
| Output CRS | WGS84 / EPSG:4326 |

The 2020 census-aligned edition is intentional: simulation personas are grounded in INEGI 2020 AGEB marginals. A later MG edition (Diciembre 2021, UPC `889463849568`) was also reachable from INEGI and sha256-checked during prep, but was **not** used for the committed GeoJSON.

## License / attribution

INEGI terms: https://www.inegi.org.mx/inegi/terminos.html

Required attribution (Spanish, as INEGI asks when redistributing their information):

> Fuente: INEGI. Marco Geoestadístico, Censo de Población y Vivienda 2020.

English equivalent for bilingual UI copy:

> Source: INEGI. Marco Geoestadístico, Census of Population and Housing 2020.

## Output

| Artifact | Path |
| --- | --- |
| FeatureCollection | `public/geo/ageb-cuauhtemoc-mh.geojson` |
| Preview | `public/geo/preview.png` |

Feature properties (and nothing else):

- `ageb_code` — full 13-char INEGI `CVEGEO` (same value as `cvegeo`; the format production personas should store)
- `cvegeo` — full INEGI `CVEGEO` (e.g. `0901500010019`)
- `alcaldia` — `"Cuauhtémoc"` \| `"Miguel Hidalgo"`
- `centroid_lat` / `centroid_lng` — point-on-surface from the **unsimplified** polygon, rounded to 5 decimals

### Feature counts

| Alcaldía | Urban AGEBs |
| --- | --- |
| Cuauhtémoc (015) | 153 |
| Miguel Hidalgo (016) | 130 |
| **Total** | **283** |

GeoJSON size after simplify + 5-decimal rounding: **~127 KB** (under the 400 KB city-scale budget).

## Processing commands

From the repo root (requires `curl`, `unzip`, `sha256sum`, `python3` + GDAL Python bindings / `osgeo`, Pillow):

```bash
./scripts/geo/build-ageb-geojson.sh
# or, if the verified archive is already cached:
AGEB_WORK_DIR=/tmp/inegi-ageb-build ./scripts/geo/build-ageb-geojson.sh --skip-download
```

What the script does:

1. Downloads the official zip from the URL above.
2. Verifies `sha256 == 685b912f5458138a70726cff41aff828473e14264c43289d3b21f86a9df00320` (aborts on mismatch).
3. Extracts `09a.*` only.
4. Runs `scripts/geo/build_ageb_geojson.py`: filter → reproject to EPSG:4326 → point-on-surface centroids from unsimplified geometry → `SimplifyPreserveTopology(0.0001°)` → round coords to 5 decimals → write FeatureCollection.
5. Runs `scripts/geo/render_preview.py` → `public/geo/preview.png`.

The raw INEGI archive is **not** committed.

## Persona AGEB matching

See `scripts/geo/check-ageb-match.ts`.

```bash
node --experimental-strip-types scripts/geo/check-ageb-match.ts
# optional READ-ONLY prod:
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node --experimental-strip-types scripts/geo/check-ageb-match.ts --prod
```

**Repo status (Task 4a):** personas in-repo do **not** carry real INEGI AGEB codes. Viewer fixtures use `FIX-*` prefixes; an older fixture file uses synthetic six-digit codes (`091xxx`); `data/personas.cdmx-v1.generated.json` is colonia-based with no `ageb_code`. The GeoJSON therefore defines `ageb_code = CVEGEO` as the canonical format for when real AGEB-grounded personas are loaded — it does not invent fixture codes to force a match.
