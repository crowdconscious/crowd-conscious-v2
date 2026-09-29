#!/usr/bin/env python3
"""Render a simple preview PNG of AGEB polygons colored by alcaldía (Pillow only)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


COLORS = {
    "Cuauhtémoc": (31, 78, 121, 190),
    "Miguel Hidalgo": (196, 92, 38, 190),
}
STROKE = (26, 26, 26, 220)
BG = (247, 244, 239, 255)


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


def bounds(features: list[dict]) -> tuple[float, float, float, float]:
    xs: list[float] = []
    ys: list[float] = []

    def walk(coords):
        if coords and isinstance(coords[0], (int, float)):
            xs.append(float(coords[0]))
            ys.append(float(coords[1]))
            return
        for c in coords:
            walk(c)

    for f in features:
        walk(f["geometry"]["coordinates"])
    return min(xs), min(ys), max(xs), max(ys)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--geojson", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--width", type=int, default=1400)
    parser.add_argument("--height", type=int, default=1400)
    args = parser.parse_args()

    data = json.loads(args.geojson.read_text(encoding="utf-8"))
    features = data["features"]
    minx, miny, maxx, maxy = bounds(features)

    pad = 60
    usable_w = args.width - 2 * pad
    usable_h = args.height - 2 * pad - 40  # room for title
    span_x = maxx - minx or 1.0
    span_y = maxy - miny or 1.0
    scale = min(usable_w / span_x, usable_h / span_y)

    def project(lng: float, lat: float) -> tuple[float, float]:
        x = pad + (lng - minx) * scale
        # flip Y for image coords
        y = pad + 40 + (maxy - lat) * scale
        return x, y

    img = Image.new("RGBA", (args.width, args.height), BG)
    draw = ImageDraw.Draw(img, "RGBA")

    for feat in features:
        color = COLORS.get(feat["properties"]["alcaldia"], (102, 102, 102, 180))
        for ring in iter_rings(feat["geometry"]):
            pts = [project(p[0], p[1]) for p in ring]
            if len(pts) < 3:
                continue
            draw.polygon(pts, fill=color, outline=STROKE)

    # Title + legend
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 22)
        font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    except OSError:
        font = ImageFont.load_default()
        font_sm = font

    draw.text(
        (pad, 16),
        "AGEB urbanas — Cuauhtémoc + Miguel Hidalgo (INEGI MG CPV 2020)",
        fill=(20, 20, 20, 255),
        font=font,
    )

    legend_y = args.height - 50
    for i, (name, color) in enumerate(COLORS.items()):
        x = pad + i * 280
        draw.rectangle([x, legend_y, x + 18, legend_y + 18], fill=color, outline=STROKE)
        draw.text((x + 28, legend_y - 1), name, fill=(20, 20, 20, 255), font=font_sm)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    # Save as RGB PNG (drop alpha for broader viewers)
    img.convert("RGB").save(args.out, format="PNG", optimize=True)
    print(f"wrote {args.out} ({args.out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
