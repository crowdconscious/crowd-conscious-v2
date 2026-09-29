#!/usr/bin/env python3
"""
Render persona placement preview for Task 4a.2.

Draws:
  - AGEB outlines (thin gray)
  - Matched official colonia outlines (colored, labeled)
  - 150 persona assignment points
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]

AGEB_STROKE = (160, 160, 160, 160)
BG = (250, 248, 245, 255)
POINT_FILL = (20, 20, 20, 230)
POINT_OUTLINE = (255, 255, 255, 255)

COLONIA_COLORS = [
    (31, 78, 121, 200),
    (196, 92, 38, 200),
    (46, 125, 50, 200),
    (123, 31, 162, 200),
    (0, 121, 107, 200),
    (183, 28, 28, 200),
    (21, 101, 192, 200),
    (255, 111, 0, 220),
    (69, 90, 100, 200),
    (136, 14, 79, 200),
    (0, 105, 92, 200),
    (93, 64, 55, 200),
    (63, 81, 181, 200),
    (0, 151, 167, 200),
    (192, 57, 43, 200),
    (39, 174, 96, 200),
]


def iter_rings(geom: dict):
    gtype = geom["type"]
    coords = geom["coordinates"]
    if gtype == "Polygon":
        yield from coords
    elif gtype == "MultiPolygon":
        for poly in coords:
            yield from poly
    else:
        raise ValueError(f"Unsupported geometry type: {gtype}")


def bounds_from_geoms(geoms: list[dict]) -> tuple[float, float, float, float]:
    xs: list[float] = []
    ys: list[float] = []

    def walk(coords):
        if coords and isinstance(coords[0], (int, float)):
            xs.append(float(coords[0]))
            ys.append(float(coords[1]))
            return
        for c in coords:
            walk(c)

    for g in geoms:
        walk(g["coordinates"])
    return min(xs), min(ys), max(xs), max(ys)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--ageb",
        type=Path,
        default=ROOT / "public/geo/ageb-cuauhtemoc-mh.geojson",
    )
    parser.add_argument(
        "--colonias",
        type=Path,
        default=ROOT / "public/geo/colonias-cuau-mh.geojson",
    )
    parser.add_argument(
        "--assignments",
        type=Path,
        default=ROOT / "public/geo/persona-ageb-assignments.json",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=ROOT / "public/geo/persona-placement-preview.png",
    )
    parser.add_argument("--width", type=int, default=1800)
    parser.add_argument("--height", type=int, default=1600)
    args = parser.parse_args()

    agebs = json.loads(args.ageb.read_text(encoding="utf-8"))["features"]
    colonias = json.loads(args.colonias.read_text(encoding="utf-8"))["features"]
    assignments = json.loads(args.assignments.read_text(encoding="utf-8"))[
        "assignments"
    ]

    # Official colonia names that were matched for any persona.
    matched_names: set[tuple[str, str]] = set()
    for a in assignments:
        for n in a.get("official_colonia_names") or []:
            matched_names.add((a["alcaldia"], n))

    matched_feats = [
        f
        for f in colonias
        if (f["properties"]["alc"], f["properties"]["colonia"]) in matched_names
    ]

    geoms = [f["geometry"] for f in agebs] + [f["geometry"] for f in matched_feats]
    minx, miny, maxx, maxy = bounds_from_geoms(geoms)

    pad = 50
    legend_h = 120
    usable_w = args.width - 2 * pad
    usable_h = args.height - 2 * pad - legend_h - 30
    span_x = maxx - minx or 1.0
    span_y = maxy - miny or 1.0
    scale = min(usable_w / span_x, usable_h / span_y)

    def project(lng: float, lat: float) -> tuple[float, float]:
        x = pad + (lng - minx) * scale
        y = pad + 30 + (maxy - lat) * scale
        return x, y

    img = Image.new("RGBA", (args.width, args.height), BG)
    draw = ImageDraw.Draw(img, "RGBA")
    try:
        font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14
        )
        font_sm = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11
        )
        font_title = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18
        )
    except OSError:
        font = ImageFont.load_default()
        font_sm = font
        font_title = font

    draw.text(
        (pad, 8),
        "Persona AGEB placement — Cuauhtémoc + Miguel Hidalgo",
        fill=(30, 30, 30, 255),
        font=font_title,
    )

    # AGEB outlines (thin)
    for feat in agebs:
        for ring in iter_rings(feat["geometry"]):
            pts = [project(p[0], p[1]) for p in ring]
            if len(pts) >= 2:
                draw.line(pts, fill=AGEB_STROKE, width=1)

    # Matched colonias
    color_by_name: dict[str, tuple[int, int, int, int]] = {}
    for i, feat in enumerate(sorted(matched_feats, key=lambda f: f["properties"]["colonia"])):
        name = feat["properties"]["colonia"]
        color = COLONIA_COLORS[i % len(COLONIA_COLORS)]
        color_by_name[name] = color
        fill = (color[0], color[1], color[2], 40)
        for ring_i, ring in enumerate(iter_rings(feat["geometry"])):
            pts = [project(p[0], p[1]) for p in ring]
            if len(pts) < 3:
                continue
            if ring_i == 0:
                draw.polygon(pts, fill=fill, outline=color)
            else:
                draw.polygon(pts, fill=(250, 248, 245, 255), outline=color)
            draw.line(pts + [pts[0]], fill=color, width=2)

        # Label at polygon representative-ish: average of outer ring
        outer = list(iter_rings(feat["geometry"]))[0]
        cx = sum(p[0] for p in outer) / len(outer)
        cy = sum(p[1] for p in outer) / len(outer)
        lx, ly = project(cx, cy)
        draw.text((lx + 2, ly + 2), name, fill=(255, 255, 255, 200), font=font_sm)
        draw.text((lx, ly), name, fill=color[:3] + (255,), font=font_sm)

    # Persona points
    for a in assignments:
        if a.get("centroid_lat") is None or a.get("centroid_lng") is None:
            continue
        x, y = project(a["centroid_lng"], a["centroid_lat"])
        r = 3
        draw.ellipse(
            (x - r, y - r, x + r, y + r),
            fill=POINT_FILL,
            outline=POINT_OUTLINE,
        )

    # Legend
    ly0 = args.height - legend_h + 10
    draw.text((pad, ly0), "Legend", fill=(30, 30, 30), font=font)
    draw.line(
        [(pad, ly0 + 28), (pad + 40, ly0 + 28)], fill=AGEB_STROKE, width=1
    )
    draw.text((pad + 48, ly0 + 20), "AGEB outline", fill=(60, 60, 60), font=font_sm)
    draw.ellipse(
        (pad + 180, ly0 + 22, pad + 186, ly0 + 28),
        fill=POINT_FILL,
        outline=POINT_OUTLINE,
    )
    draw.text(
        (pad + 194, ly0 + 20),
        f"Persona points (n={sum(1 for a in assignments if a.get('centroid_lat') is not None)})",
        fill=(60, 60, 60),
        font=font_sm,
    )
    draw.text(
        (pad, ly0 + 48),
        "Colored fills/outlines = matched official colonias (labeled)",
        fill=(60, 60, 60),
        font=font_sm,
    )
    draw.text(
        (pad, ly0 + 68),
        "Points are inside colonia∩AGEB intersection (sliver-filtered, census-weighted)",
        fill=(60, 60, 60),
        font=font_sm,
    )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(args.out, "PNG")
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
