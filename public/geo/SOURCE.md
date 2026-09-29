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
| FeatureCollection (AGEB) | `public/geo/ageb-cuauhtemoc-mh.geojson` |
| FeatureCollection (alcaldías) | `public/geo/cdmx-alcaldias.geojson` |
| Preview | `public/geo/preview.png` |

## CDMX alcaldías context layer (Task 4c)

| Field | Value |
| --- | --- |
| Same archive | `09_ciudaddemexico.zip` (sha256 above) |
| Layer used | `conjunto_de_datos/09mun.*` — municipal / alcaldía outlines |
| Filter | `CVE_ENT=09` (all 16 CDMX municipios) |
| Properties | `cvegeo`, `nombre` (official `NOMGEO` with accents), plus derived `label_lat` / `label_lng` (point-on-surface of the unsimplified polygon) |
| Simplify | `0.0003°` (~33 m) Douglas-Peucker, coords rounded to 5 decimals |
| Output size | ~35 KB (target well under ~150 KB) |
| Builder | `./scripts/geo/build-cdmx-alcaldias.sh` → `scripts/geo/build_cdmx_alcaldias_geojson.py` |

```bash
./scripts/geo/build-cdmx-alcaldias.sh
# or, if the verified archive is already cached:
AGEB_WORK_DIR=/tmp/inegi-ageb-build ./scripts/geo/build-cdmx-alcaldias.sh --skip-download
```

Requires `python3` + `pyshp` + `pyproj` + `shapely` (same official geometry; pure-Python path when GDAL bindings are unavailable).

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

See `scripts/geo/check-ageb-match.ts` and Task 4a.2 assigner `scripts/geo/assign-persona-agebs.ts`.

```bash
node --experimental-strip-types scripts/geo/assign-persona-agebs.ts --from-generated
node --experimental-strip-types scripts/geo/check-ageb-match.ts --assignments
# optional READ-ONLY prod:
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node --experimental-strip-types scripts/geo/check-ageb-match.ts --prod
```

**Repo status (Task 4a.2):** `public/geo/persona-ageb-assignments.json` holds deterministic assignments validated against this GeoJSON (full CVEGEO). Production `UPDATE` SQL still requires the owner CSV of persona UUIDs — see `public/geo/PERSONA-AGEB-REPORT.md` and `supabase/sql-manual/`. Fixture `FIX-*` / synthetic six-digit codes remain unmatched by design.


## Colonia geometry (Task 4a.2)

| Field | Value |
| --- | --- |
| Product | Catálogo de Colonias CDMX (ADIP / Sistema Ajolote) |
| Publisher | Agencia Digital de Innovación Pública (ADIP), Ciudad de México |
| Hosted layer | `Catalogo_Colonias_CDMX` FeatureServer (SGIRPC atlas) |
| Download / query URL | https://serviciosatlas.sgirpc.cdmx.gob.mx/arcgis/rest/services/Hosted/Catalogo_Colonias_CDMX/FeatureServer/0 |
| Portal dataset (TLS unreachable from agent) | https://datos.cdmx.gob.mx/dataset/catalogo-de-colonias-datos-abiertos |
| Filter | `cve_alc IN ('015','016')` (Cuauhtémoc, Miguel Hidalgo) |
| Retrieval date | 2026-09-29 |
| Output | `public/geo/colonias-cuau-mh.geojson` (119 features) |
| sha256 | `7cac73a58018c44d2d8c4812d06445900f1477111867424e0b66c2cd9155743c` |
| Native CRS served | WGS84 / EPSG:4326 (`outSR=4326`) |

**Note:** `datos.cdmx.gob.mx` TLS handshakes timed out from the cloud agent. The FeatureServer above is the official CDMX-hosted Catálogo de Colonias layer (same catalog). IECM 2019 colonias on the same portal were not separately fetched for the same reason.

## AGEB population weights (Task 4a.2)

| Field | Value |
| --- | --- |
| Product | Principales resultados por AGEB y manzana urbana — Censo de Población y Vivienda 2020 |
| Publisher | INEGI |
| State package | Ciudad de México (`ageb_mza_urbana_09_cpv2020_csv.zip`) |
| Download URL | https://www.inegi.org.mx/contenidos/programas/ccpv/2020/datosabiertos/ageb_manzana/ageb_mza_urbana_09_cpv2020_csv.zip |
| Rows used | `MUN IN ('015','016')`, `MZA = '000'`, `NOM_LOC` contains `Total AGEB urbana` |
| Weight field | `P_18YMAS` (fallback `POBTOT` if P_18YMAS missing/zero) |
| Retrieval date | 2026-09-29 |
| Archive sha256 | `1f5f123b8e9a50991d1847271b5a2bf321e813e924e5bcf958cab612311c765a` |
| Derived JSON | `public/geo/ageb-population-cuau-mh.json` |
| Derived sha256 | `b4528064aa93d81a7e6ceb56b63ea5f5bc6ba50f4267114266ba1e46d1dbb840` |

## Colonia∩AGEB candidates (Task 4a.2 sliver filter)

| Field | Value |
| --- | --- |
| Builder | `scripts/geo/build-colonia-ageb-intersections.py` |
| Metric CRS | EPSG:32614 (UTM 14N) |
| Sliver rule | Drop if intersection &lt; 10% of AGEB area **and** &lt; 10% of colonia area |
| Weight | `P_18YMAS × (intersection / AGEB area)` |
| Placement | Point-on-surface of intersection + seeded jitter inside intersection |
| Output | `public/geo/colonia-ageb-candidates.json` |
| Preview | `public/geo/persona-placement-preview.png` |
