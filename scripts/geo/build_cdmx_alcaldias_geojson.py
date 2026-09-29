#!/usr/bin/env python3
"""
Build public/geo/cdmx-alcaldias.geojson from official INEGI MG municipal layer.

Reads the already-extracted 09mun shapefile (Marco Geoestadístico CPV 2020),
keeps all 16 CDMX alcaldías, reprojects to EPSG:4326, simplifies, and writes
a compact FeatureCollection with properties {cvegeo, nombre}.

Never fabricates coordinates. Source polygons come only from the INEGI archive.

Requires: pyshp, pyproj, shapely (pip). Prefer the same GDAL-based toolchain as
build_ageb_geojson.py when available; this pure-Python path is the agent-friendly
fallback that still consumes only official geometry.
"""

from __future__ import annotations

import argparse
import json
import sys
import warnings
from pathlib import Path

import shapefile
from pyproj import CRS, Transformer
from shapely.geometry import mapping, shape
from shapely.ops import transform as shp_transform

# Douglas-Peucker tolerance in degrees. Municipal outlines are coarser than
# AGEBs; ~0.0003° (~33 m) keeps shapes recognizable and the file well under
# the ~150 KB web budget.
SIMPLIFY_TOLERANCE_DEG = 0.0003
COORD_DECIMALS = 5

# Mexico ITRF2008 Lambert Conformal Conic — matches 09mun.prj exactly.
SRC_CRS_WKT = (
    'PROJCS["MEXICO_ITRF_2008_LCC",'
    'GEOGCS["MEXICO_ITRF_2008",'
    'DATUM["D_ITRF_2008",SPHEROID["GRS_1980",6378137.0,298.257222101]],'
    'PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],'
    'PROJECTION["Lambert_Conformal_Conic"],'
    'PARAMETER["False_Easting",2500000.0],'
    'PARAMETER["False_Northing",0.0],'
    'PARAMETER["Central_Meridian",-102.0],'
    'PARAMETER["Standard_Parallel_1",17.5],'
    'PARAMETER["Standard_Parallel_2",29.5],'
    'PARAMETER["Latitude_Of_Origin",12.0],'
    'UNIT["Meter",1.0]]'
)


def round_coords(obj, decimals: int):
    if isinstance(obj, (list, tuple)):
        if obj and isinstance(obj[0], (int, float)):
            return [round(float(obj[0]), decimals), round(float(obj[1]), decimals)]
        return [round_coords(x, decimals) for x in obj]
    return obj


def build(src_shp: Path, out_geojson: Path, simplify_tol: float) -> dict:
    # .cpg says "ISO 88591" which pyshp does not recognise; latin-1 is correct.
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        reader = shapefile.Reader(str(src_shp), encoding="latin-1")

    field_names = [f[0] for f in reader.fields[1:]]
    transformer = Transformer.from_crs(
        CRS.from_wkt(SRC_CRS_WKT),
        CRS.from_epsg(4326),
        always_xy=True,
    )

    def project_xy(x, y, z=None):
        lng, lat = transformer.transform(x, y)
        return (lng, lat) if z is None else (lng, lat, z)

    features_out: list[dict] = []
    disappeared = 0

    for rec, shp in zip(reader.iterRecords(), reader.iterShapes()):
        props = dict(zip(field_names, rec))
        cve_ent = str(props.get("CVE_ENT", "")).strip()
        if cve_ent != "09":
            continue

        cvegeo = str(props["CVEGEO"]).strip()
        nombre = str(props["NOMGEO"]).strip()
        if not cvegeo or not nombre:
            raise SystemExit(f"Missing CVEGEO/NOMGEO for record {props}")

        geom = shape(shp.__geo_interface__)
        if geom.is_empty:
            raise SystemExit(f"Empty geometry for CVEGEO={cvegeo}")

        geom_wgs = shp_transform(project_xy, geom)
        # Label anchor from unsimplified geometry (point-on-surface).
        pos = geom_wgs.representative_point()
        label_lng = round(pos.x, COORD_DECIMALS)
        label_lat = round(pos.y, COORD_DECIMALS)

        simplified = geom_wgs.simplify(simplify_tol, preserve_topology=True)
        if simplified is None or simplified.is_empty:
            simplified = geom_wgs
            disappeared += 1
        if not simplified.is_valid:
            simplified = simplified.buffer(0)

        gj = mapping(simplified)
        gj["coordinates"] = round_coords(gj["coordinates"], COORD_DECIMALS)

        features_out.append(
            {
                "type": "Feature",
                "properties": {
                    "cvegeo": cvegeo,
                    "nombre": nombre,
                    "label_lat": label_lat,
                    "label_lng": label_lng,
                },
                "geometry": gj,
            }
        )

    features_out.sort(key=lambda f: f["properties"]["cvegeo"])

    if len(features_out) != 16:
        raise SystemExit(
            f"Expected 16 CDMX alcaldías, got {len(features_out)} — aborting"
        )

    collection = {"type": "FeatureCollection", "features": features_out}
    out_geojson.parent.mkdir(parents=True, exist_ok=True)
    out_geojson.write_text(
        json.dumps(collection, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    size_bytes = out_geojson.stat().st_size
    return {
        "feature_count": len(features_out),
        "nombres": [f["properties"]["nombre"] for f in features_out],
        "size_bytes": size_bytes,
        "size_kb": round(size_bytes / 1024, 1),
        "simplify_tolerance_deg": simplify_tol,
        "disappeared_fallback": disappeared,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--src",
        type=Path,
        required=True,
        help="Path to 09mun.shp (INEGI municipal layer for entidad 09)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("public/geo/cdmx-alcaldias.geojson"),
        help="Output GeoJSON path",
    )
    parser.add_argument(
        "--simplify",
        type=float,
        default=SIMPLIFY_TOLERANCE_DEG,
        help="Douglas-Peucker tolerance in degrees (default 0.0003 ≈ 33 m)",
    )
    args = parser.parse_args()

    if not args.src.exists():
        raise SystemExit(f"Source shapefile not found: {args.src}")

    summary = build(args.src, args.out, args.simplify)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if summary["size_bytes"] > 150 * 1024:
        print(
            f"WARNING: output is {summary['size_kb']} KB (target <150 KB). "
            "Re-run with a larger --simplify tolerance.",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
