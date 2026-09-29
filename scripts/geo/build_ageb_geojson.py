#!/usr/bin/env python3
"""
Build public/geo/ageb-cuauhtemoc-mh.geojson from official INEGI MG AGEB urbanas.

Reads the already-extracted 09a shapefile (Marco Geoestadístico CPV 2020),
filters CVE_ENT=09 + CVE_MUN in {015,016}, reprojects to EPSG:4326, computes
point-on-surface centroids from the UNSIMPLIFIED geometry, then simplifies
and rounds coordinates for city-scale map rendering.

Never fabricates coordinates. Source polygons come only from the INEGI archive.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from osgeo import ogr, osr

ALCALDIA = {
    "015": "Cuauhtémoc",
    "016": "Miguel Hidalgo",
}

# Douglas-Peucker tolerance in degrees (~11 m at CDMX latitude). Tuned so the
# output stays under ~400 KB while keeping every AGEB polygon.
SIMPLIFY_TOLERANCE_DEG = 0.0001
COORD_DECIMALS = 5


def round_coords(geom: ogr.Geometry, decimals: int) -> ogr.Geometry:
    """Round all vertex coordinates in-place via GeoJSON round-trip."""
    gj = json.loads(geom.ExportToJson())

    def _round(obj):
        if isinstance(obj, list):
            if obj and isinstance(obj[0], (int, float)):
                return [round(float(obj[0]), decimals), round(float(obj[1]), decimals)]
            return [_round(x) for x in obj]
        return obj

    gj["coordinates"] = _round(gj["coordinates"])
    return ogr.CreateGeometryFromJson(json.dumps(gj))


def point_on_surface(geom: ogr.Geometry) -> tuple[float, float]:
    """Return (lng, lat) guaranteed inside the polygon (PointOnSurface)."""
    pt = geom.PointOnSurface()
    if pt is None or pt.IsEmpty():
        # Fallback: centroid, then if that fails the envelope center.
        pt = geom.Centroid()
    if pt is None or pt.IsEmpty():
        env = geom.GetEnvelope()  # minX, maxX, minY, maxY
        return (env[0] + env[1]) / 2.0, (env[2] + env[3]) / 2.0
    return pt.GetX(), pt.GetY()


def build(src_shp: Path, out_geojson: Path, simplify_tol: float) -> dict:
    ds = ogr.Open(str(src_shp))
    if ds is None:
        raise SystemExit(f"Could not open shapefile: {src_shp}")
    layer = ds.GetLayer(0)

    src_srs = layer.GetSpatialRef()
    if src_srs is None:
        raise SystemExit("Source shapefile has no .prj / spatial reference")
    dst_srs = osr.SpatialReference()
    dst_srs.ImportFromEPSG(4326)
    dst_srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    transform = osr.CoordinateTransformation(src_srs, dst_srs)

    layer.SetAttributeFilter("CVE_ENT = '09' AND CVE_MUN IN ('015','016')")

    features_out: list[dict] = []
    counts = {"Cuauhtémoc": 0, "Miguel Hidalgo": 0}
    disappeared = 0
    invalid_after = 0

    for feat in layer:
        cve_mun = feat.GetField("CVE_MUN")
        cvegeo = feat.GetField("CVEGEO")
        alcaldia = ALCALDIA.get(cve_mun)
        if alcaldia is None:
            continue

        geom = feat.GetGeometryRef()
        if geom is None or geom.IsEmpty():
            raise SystemExit(f"Empty geometry for CVEGEO={cvegeo}")

        geom = geom.Clone()
        geom.Transform(transform)

        # Centroid / point-on-surface from UNSIMPLIFIED geometry.
        lng, lat = point_on_surface(geom)

        simplified = geom.SimplifyPreserveTopology(simplify_tol)
        if simplified is None or simplified.IsEmpty():
            # keep-shapes: fall back to unsimplified if simplify erased it
            simplified = geom.Clone()
            disappeared += 1

        if not simplified.IsValid():
            # Buffer(0) is the standard fix for minor topology issues after simplify
            fixed = simplified.Buffer(0)
            if fixed is not None and not fixed.IsEmpty():
                simplified = fixed
            else:
                invalid_after += 1

        simplified = round_coords(simplified, COORD_DECIMALS)
        # Re-round the interior point too (still must fall inside; checked later).
        lat_r = round(lat, COORD_DECIMALS)
        lng_r = round(lng, COORD_DECIMALS)

        geom_json = json.loads(simplified.ExportToJson())
        features_out.append(
            {
                "type": "Feature",
                "properties": {
                    # Personas will eventually store the full 13-char CVEGEO.
                    # Repo fixtures currently use FIX-* / synthetic codes only.
                    "ageb_code": cvegeo,
                    "cvegeo": cvegeo,
                    "alcaldia": alcaldia,
                    "centroid_lat": lat_r,
                    "centroid_lng": lng_r,
                },
                "geometry": geom_json,
            }
        )
        counts[alcaldia] += 1

    features_out.sort(key=lambda f: f["properties"]["cvegeo"])

    # Verify every rounded interior point still falls inside its (simplified) polygon.
    outside = 0
    for f in features_out:
        g = ogr.CreateGeometryFromJson(json.dumps(f["geometry"]))
        pt = ogr.Geometry(ogr.wkbPoint)
        pt.AddPoint(f["properties"]["centroid_lng"], f["properties"]["centroid_lat"])
        if not g.Contains(pt) and not g.Intersects(pt):
            # Recompute from simplified geom if rounding nudged it out.
            lng2, lat2 = point_on_surface(g)
            f["properties"]["centroid_lng"] = round(lng2, COORD_DECIMALS)
            f["properties"]["centroid_lat"] = round(lat2, COORD_DECIMALS)
            pt2 = ogr.Geometry(ogr.wkbPoint)
            pt2.AddPoint(f["properties"]["centroid_lng"], f["properties"]["centroid_lat"])
            if not g.Contains(pt2) and not g.Intersects(pt2):
                outside += 1

    collection = {"type": "FeatureCollection", "features": features_out}
    out_geojson.parent.mkdir(parents=True, exist_ok=True)
    # Compact JSON (no indent) keeps size down for city-scale map tiles.
    out_geojson.write_text(json.dumps(collection, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    size_bytes = out_geojson.stat().st_size
    summary = {
        "feature_count": len(features_out),
        "counts": counts,
        "size_bytes": size_bytes,
        "size_kb": round(size_bytes / 1024, 1),
        "simplify_tolerance_deg": simplify_tol,
        "disappeared_fallback": disappeared,
        "invalid_after_simplify": invalid_after,
        "centroid_outside_after_round": outside,
    }
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--src",
        type=Path,
        required=True,
        help="Path to 09a.shp (INEGI urban AGEB layer for entidad 09)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("public/geo/ageb-cuauhtemoc-mh.geojson"),
        help="Output GeoJSON path",
    )
    parser.add_argument(
        "--simplify",
        type=float,
        default=SIMPLIFY_TOLERANCE_DEG,
        help="Douglas-Peucker tolerance in degrees (default 0.0001 ≈ 11 m)",
    )
    args = parser.parse_args()

    if not args.src.exists():
        raise SystemExit(f"Source shapefile not found: {args.src}")

    summary = build(args.src, args.out, args.simplify)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if summary["feature_count"] == 0:
        raise SystemExit("No features produced — aborting")
    if summary["size_bytes"] > 400 * 1024:
        print(
            f"WARNING: output is {summary['size_kb']} KB (target <400 KB). "
            "Re-run with a larger --simplify tolerance.",
            file=sys.stderr,
        )
    if summary["centroid_outside_after_round"]:
        raise SystemExit(
            f"{summary['centroid_outside_after_round']} centroids fell outside "
            "their polygons after rounding — aborting"
        )


if __name__ == "__main__":
    main()
