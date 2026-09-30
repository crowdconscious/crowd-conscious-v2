# Map fonts

The simulation map SVG embeds a Latin/Spanish subset of DejaVu Sans as a
base64 module — see `lib/sim-report/map-font.ts`. Do not rely on files in this
folder at runtime (Vercel serverless has no guaranteed font path).
