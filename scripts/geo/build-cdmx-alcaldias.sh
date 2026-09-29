#!/usr/bin/env bash
# scripts/geo/build-cdmx-alcaldias.sh
#
# Download official INEGI Marco Geoestadístico (Censo 2020) municipal layer for
# Ciudad de México (09mun — 16 alcaldías), reproject to WGS84, simplify, and
# write public/geo/cdmx-alcaldias.geojson.
#
# HARD RULE: never fabricate coordinates. If the official download fails or the
# sha256 does not match the recorded digest, this script exits non-zero.
#
# Usage (from repo root):
#   ./scripts/geo/build-cdmx-alcaldias.sh
#   ./scripts/geo/build-cdmx-alcaldias.sh --skip-download   # reuse cached archive
#
# Requires: curl, unzip, sha256sum, python3 + pyshp + pyproj + shapely.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# Official INEGI product: Marco Geoestadístico, Censo de Población y Vivienda 2020
# Same archive as scripts/geo/build-ageb-geojson.sh (AGEB layer uses 09a.*).
SOURCE_URL="https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/geografia/marcogeo/889463807469/09_ciudaddemexico.zip"
SOURCE_EDITION="Marco Geoestadístico, Censo de Población y Vivienda 2020"
SOURCE_FILE="09_ciudaddemexico.zip"
EXPECTED_SHA256="685b912f5458138a70726cff41aff828473e14264c43289d3b21f86a9df00320"

WORK_DIR="${AGEB_WORK_DIR:-/tmp/inegi-ageb-build}"
ARCHIVE="$WORK_DIR/$SOURCE_FILE"
EXTRACT_DIR="$WORK_DIR/extracted-mun"
SHP="$EXTRACT_DIR/conjunto_de_datos/09mun.shp"
OUT_GEOJSON="$ROOT/public/geo/cdmx-alcaldias.geojson"

SKIP_DOWNLOAD=0
for arg in "$@"; do
  case "$arg" in
    --skip-download) SKIP_DOWNLOAD=1 ;;
    -h|--help)
      sed -n '1,20p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

mkdir -p "$WORK_DIR" "$ROOT/public/geo"

if [[ "$SKIP_DOWNLOAD" -eq 0 || ! -f "$ARCHIVE" ]]; then
  echo "Downloading $SOURCE_URL"
  curl -fL --retry 3 --retry-delay 2 -o "$ARCHIVE" "$SOURCE_URL"
fi

ACTUAL_SHA256="$(sha256sum "$ARCHIVE" | awk '{print $1}')"
echo "sha256: $ACTUAL_SHA256"
if [[ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]]; then
  echo "ERROR: sha256 mismatch for $SOURCE_FILE" >&2
  echo "  expected: $EXPECTED_SHA256" >&2
  echo "  actual:   $ACTUAL_SHA256" >&2
  echo "Refusing to process — do not invent geometry. Update EXPECTED_SHA256 only after verifying the new official archive." >&2
  exit 1
fi

echo "Extracting municipal layer (09mun.*)…"
rm -rf "$EXTRACT_DIR"
mkdir -p "$EXTRACT_DIR"
unzip -q -o "$ARCHIVE" \
  "conjunto_de_datos/09mun.*" \
  -d "$EXTRACT_DIR"

if [[ ! -f "$SHP" ]]; then
  echo "ERROR: expected shapefile missing after extract: $SHP" >&2
  exit 1
fi

echo "Building GeoJSON…"
python3 "$ROOT/scripts/geo/build_cdmx_alcaldias_geojson.py" --src "$SHP" --out "$OUT_GEOJSON"

echo "Done."
echo "  GeoJSON: $OUT_GEOJSON ($(wc -c < "$OUT_GEOJSON") bytes)"
echo "  Source:  $SOURCE_EDITION"
echo "  Layer:   conjunto_de_datos/09mun.*"
echo "  URL:     $SOURCE_URL"
echo "  sha256:  $ACTUAL_SHA256"
