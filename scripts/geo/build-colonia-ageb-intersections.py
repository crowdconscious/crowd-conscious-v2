#!/usr/bin/env python3
"""
Build colonia↔AGEB candidate index with metric intersection areas (Task 4a.2 fix).

- Project to UTM 14N (EPSG:32614)
- Drop slivers: intersection < 10% of AGEB area AND < 10% of colonia (union) area
- Record intersection GeoJSON (WGS84) + point-on-surface for placement
- Uses committed GeoJSON (unsimplified AGEB archive not available in this env)

Output: public/geo/colonia-ageb-candidates.json
"""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

from pyproj import Transformer
from shapely.geometry import mapping, shape
from shapely.ops import transform, unary_union

ROOT = Path(__file__).resolve().parents[2]
AGEB_PATH = ROOT / "public/geo/ageb-cuauhtemoc-mh.geojson"
COLONIAS_PATH = ROOT / "public/geo/colonias-cuau-mh.geojson"
OUT_PATH = ROOT / "public/geo/colonia-ageb-candidates.json"

SLIVER = 0.10
TO_UTM = Transformer.from_crs("EPSG:4326", "EPSG:32614", always_xy=True)
TO_WGS = Transformer.from_crs("EPSG:32614", "EPSG:4326", always_xy=True)


def to_utm(geom):
    return transform(lambda x, y: TO_UTM.transform(x, y), geom)


def to_wgs(geom):
    return transform(lambda x, y: TO_WGS.transform(x, y), geom)


def strip_accents(s: str) -> str:
    repl = str.maketrans("áéíóúüñÁÉÍÓÚÜÑ", "aeiouunAEIOUUN")
    return s.translate(repl)


def normalize_colonia(raw: str) -> str:
    s = strip_accents(raw or "").lower().strip()
    s = re.sub(r"\bcol(?:onia)?\.?\s+", " ", s)
    s = re.sub(r"\bampl\.\s*", "ampliacion ", s)
    s = s.replace("ª", "a").replace("º", "o")
    s = re.sub(r"\bseccion\b", "seccion", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


SECTION_RE = re.compile(
    r"^(.+?)\s+((?:i{1,3}|iv|v|vi{0,3}|ix|x|\d+))\s+seccion$"
)


def match_official(persona_colonia: str, alcaldia: str, official: list[dict]) -> list[dict]:
    pn = normalize_colonia(persona_colonia)
    out = []
    for o in official:
        if o["properties"]["alc"] != alcaldia:
            continue
        on = normalize_colonia(o["properties"]["colonia"])
        if on == pn:
            out.append(o)
            continue
        m = SECTION_RE.match(on)
        if m and m.group(1).strip() == pn:
            out.append(o)
    return out


def geom_area_and_intersection(col_utm, ageb_utm):
    if col_utm.is_empty or ageb_utm.is_empty:
        return 0.0, 0.0, 0.0, None
    inter = col_utm.intersection(ageb_utm)
    if inter.is_empty:
        return float(col_utm.area), float(ageb_utm.area), 0.0, None
    # Keep polygonal parts only
    if inter.geom_type == "GeometryCollection":
        polys = [g for g in inter.geoms if g.geom_type in ("Polygon", "MultiPolygon") and not g.is_empty]
        if not polys:
            return float(col_utm.area), float(ageb_utm.area), 0.0, None
        inter = unary_union(polys)
    if inter.geom_type in ("LineString", "MultiLineString", "Point", "MultiPoint"):
        return float(col_utm.area), float(ageb_utm.area), 0.0, None
    return float(col_utm.area), float(ageb_utm.area), float(inter.area), inter


def main() -> int:
    ageb_fc = json.loads(AGEB_PATH.read_text(encoding="utf-8"))
    col_fc = json.loads(COLONIAS_PATH.read_text(encoding="utf-8"))

    # Optional: persona CSV path to discover colonia keys; else all official names.
    persona_keys: set[tuple[str, str]] = set()
    if len(sys.argv) > 1:
        import csv

        with open(sys.argv[1], newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                persona_keys.add((row["alcaldia"], row["colonia"]))
    else:
        for feat in col_fc["features"]:
            persona_keys.add((feat["properties"]["alc"], feat["properties"]["colonia"]))

    agebs_by_alc: dict[str, list] = defaultdict(list)
    ageb_utm_cache = {}
    for f in ageb_fc["features"]:
        agebs_by_alc[f["properties"]["alcaldia"]].append(f)
        g = shape(f["geometry"])
        ageb_utm_cache[f["properties"]["ageb_code"]] = (g, to_utm(g))

    official = col_fc["features"]

    out: dict = {
        "crs_metric": "EPSG:32614",
        "sliver_threshold": SLIVER,
        "source_ageb": "public/geo/ageb-cuauhtemoc-mh.geojson",
        "source_colonias": "public/geo/colonias-cuau-mh.geojson",
        "note": "Unsimplified INEGI AGEB archive was not available; used committed GeoJSON.",
        "entries": {},
    }

    for alcaldia, colonia in sorted(persona_keys):
        matched = match_official(colonia, alcaldia, official)
        key = f"{alcaldia}||{colonia}"
        if not matched:
            out["entries"][key] = {
                "alcaldia": alcaldia,
                "persona_colonia": colonia,
                "official_names": [],
                "candidates_before": 0,
                "candidates_after": 0,
                "candidates": [],
            }
            print(f"{key}: no official match")
            continue

        col_shapes = [shape(m["geometry"]) for m in matched]
        col_union = unary_union(col_shapes)
        col_utm = to_utm(col_union)
        col_area = float(col_utm.area)

        before = []
        kept = []
        for af in agebs_by_alc[alcaldia]:
            code = af["properties"]["ageb_code"]
            _ageb_wgs, ageb_utm = ageb_utm_cache[code]
            c_area, a_area, i_area, inter_utm = geom_area_and_intersection(col_utm, ageb_utm)
            if i_area <= 0 or inter_utm is None:
                continue
            frac_ageb = i_area / a_area if a_area > 0 else 0.0
            frac_col = i_area / c_area if c_area > 0 else 0.0
            rec = {
                "ageb_code": code,
                "ageb_area_m2": round(a_area, 2),
                "colonia_area_m2": round(c_area, 2),
                "intersection_area_m2": round(i_area, 2),
                "frac_of_ageb": round(frac_ageb, 6),
                "frac_of_colonia": round(frac_col, 6),
            }
            before.append(rec)
            # Sliver rule: drop if BOTH fractions are < 10%
            if frac_ageb < SLIVER and frac_col < SLIVER:
                continue
            inter_wgs = to_wgs(inter_utm)
            # Fix geometry orientation / validity
            if not inter_wgs.is_valid:
                inter_wgs = inter_wgs.buffer(0)
            pos = inter_wgs.representative_point()
            kept.append(
                {
                    **rec,
                    "point_on_surface": {
                        "lat": round(pos.y, 6),
                        "lng": round(pos.x, 6),
                    },
                    "intersection": mapping(inter_wgs),
                }
            )

        kept.sort(key=lambda r: r["ageb_code"])
        out["entries"][key] = {
            "alcaldia": alcaldia,
            "persona_colonia": colonia,
            "official_names": [m["properties"]["colonia"] for m in matched],
            "candidates_before": len(before),
            "candidates_after": len(kept),
            "dropped_slivers": sorted(
                set(b["ageb_code"] for b in before) - set(k["ageb_code"] for k in kept)
            ),
            "candidates": kept,
        }
        print(
            f"{key}: before={len(before)} after={len(kept)} "
            f"dropped={len(before) - len(kept)} official={out['entries'][key]['official_names']}"
        )

    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT_PATH} ({OUT_PATH.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
