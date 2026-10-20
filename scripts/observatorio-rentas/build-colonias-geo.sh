#!/usr/bin/env bash
# Rebuild public/observatorio-rentas/colonias.geojson (demo map polygons).
# Source: CDMX "Catálogo de Colonias" hosted layer (SGIRPC Atlas ArcGIS FeatureServer).
# Usage: scripts/observatorio-rentas/build-colonias-geo.sh 008 [012 ...]   (cve_alc codes to add)
# Needs network access to serviciosatlas.sgirpc.cdmx.gob.mx (may be blocked outside MX).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BASE='https://serviciosatlas.sgirpc.cdmx.gob.mx/arcgis/rest/services/Hosted/Catalogo_Colonias_CDMX/FeatureServer/0/query'
TMP="$(mktemp -d)"
for ALC in "$@"; do
  curl -fsSL "$BASE?where=cve_alc%3D%27$ALC%27&outFields=colonia,alc,cve_alc,cve_col&returnGeometry=true&outSR=4326&maxAllowableOffset=0.0007&f=geojson" -o "$TMP/$ALC.geojson"
done
# Cuauhtémoc + Miguel Hidalgo come from the repo copy, simplified to 12%.
npx -y mapshaper@0.6 -i "$ROOT/public/geo/colonias-cuau-mh.geojson" "$TMP"/*.geojson combine-files \
  -merge-layers force -simplify 12% keep-shapes -filter-fields colonia,alc,cve_alc,cve_col \
  -o precision=0.00001 "$ROOT/public/observatorio-rentas/colonias.geojson"
echo "Then: node scripts/observatorio-rentas/seed.mjs"
