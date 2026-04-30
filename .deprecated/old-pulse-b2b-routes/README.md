# Deprecated: legacy /pulse B2B routes

These three files were the original B2B-flavored Conscious Pulse pages
that lived under `/pulse/*` before the **Route Rename** in April 2026.

## What changed

The `/pulse` namespace was repurposed for the **consumer Pulse listing**
(the public list of every active Pulse — the one we link from share
cards and the global nav). The B2B landing, the pilot checkout, and the
post-Stripe welcome page moved to a dedicated `/para-marcas/*` namespace
so the two audiences (voters vs. brands buying Pulses) stop colliding.

| Old path             | New path                      |
| -------------------- | ----------------------------- |
| `/pulse` (B2B)       | `/para-marcas`                |
| `/pulse/welcome`     | `/para-marcas/welcome`        |
| `/pulse/pilot`       | `/para-marcas/pilot`          |

The redirects are 308 (permanent) in `next.config.ts` and preserve query
strings, so existing receipts, ad UTM links, and Stripe success URLs
continue to work without manual updates.

## Why we kept these files

The originals are kept here as `.txt` (so Next.js doesn't try to compile
them) for one reason only: if we ever need to roll the B2B surface back
to `/pulse`, these are the exact bytes that shipped to production.

If you're touching the live B2B pages, edit `app/para-marcas/**`, not
these files. These are frozen.

Files:
- `welcome/page.tsx.txt`     — original `app/pulse/welcome/page.tsx`
- `pilot/page.tsx.txt`       — original `app/pulse/pilot/page.tsx`
- `pilot/PilotCheckoutForm.tsx.txt` — original client component
