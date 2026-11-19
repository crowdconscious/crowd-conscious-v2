# Cicerón UX stacked PRs — Implementation Plan

> **For agentic workers:** Execute as eight stacked draft PRs (one task = one PR). Branch naming: `cursor/ciceron-<slug>-afa9`. Stack each PR on the previous via ManagePullRequest `stack_on`. Do not merge.

**Goal:** Make Cicerón clearly better than Lemontech CaseTracking for law-firm partners, coordinators, and pasantes — beautiful, self-explanatory Spanish UI — while keeping the coordinator Mexico map prominent.

**Architecture:** Pure UI/UX on existing demo fixtures and `loadBulletinBoard` / Hoy loaders. No DB writes, migrations, Vercel env, paid services, or emails. Reuse `CoordinatorMexicoMap`, `exceljs`/`jspdf`, and copy in `lib/ciceron/copy/es-MX.ts`.

**Tech Stack:** Next.js 15 App Router, scoped `ciceron.css`, existing d3-free SVG Mexico paths, jspdf + exceljs, client-side CSV.

## Global Constraints

- NO database writes, NO migrations, NO Vercel env changes, no new paid services, no emails sent.
- Do not merge anything. Never print secrets. Keep exploit/security details out of PR text.
- Materials say "Equipo de Cicerón", never a founder's name.
- Login for screenshots: demo access code `DESPACHO-DEMO` (do not create invites).
- Each PR: run `npm run typecheck` and `npm test` (no eslint script). Attach before/after screenshots at 1920 and 390 from preview.
- Draft PRs, stacked in order 1→8. Base of first PR is `main` @ abfe57f5+.

---

### Task 1: Readability pass (WCAG AA)

**Files:**
- Modify: `app/ciceron/_components/ciceron.css`
- Create: `lib/ciceron/ui/contrast-pure.ts`, `lib/ciceron/ui/contrast-pure.test.ts`
- Modify: copy only if needed for larger labels

**Produces:** Base text ≥16px; tiny labels ≥0.75rem; muted ink ≥4.5:1 on `--cic-bg` and `--cic-surface`; no layout regressions.

- [ ] Raise `.ciceron-root` `font-size` 15px → 16px; bump `.cic-muted`, table th, badges under 0.75rem.
- [ ] Lighten `--cic-muted` if contrast on surface fails AA; document ratios in pure helper test.
- [ ] typecheck + test; commit; draft PR.

### Task 2: Partner hero coverage map

**Files:**
- Modify: `app/ciceron/(rooms)/hoy/page.tsx`
- Create/Modify: partner map wrapper reusing `CoordinatorMexicoMap` + partner status labels `al día` / `con novedades` / `por verificar`
- Create: `lib/ciceron/boletines/partner-coverage-status-pure.ts` (+ test)
- Modify: `lib/ciceron/copy/es-MX.ts`

**Produces:** Socio Hoy top = coverage map; click state → filtered matches (`/ciceron/boletines?estado=` or hash).

### Task 3: Coordinator status cards + table toggle

**Files:**
- Modify: `app/ciceron/(rooms)/boletines/coordinador/page.tsx`
- Create: `CoordinatorBoardView.tsx` (client toggle cards/table)
- Modify: `ciceron.css`, copy

**Produces:** Default status cards per state/court; toggle keeps existing table.

### Task 4: One-click export PDF + Excel/CSV

**Files:**
- Create: `lib/ciceron/export/*-pure.ts` (+ tests), `ExportViewButton.tsx`
- Wire on matches (monitor/boletines), plazos (expedientes/hoy), client timeline
- Reuse jspdf + exceljs; no new services

### Task 5: 3-step guided setup

**Files:**
- Create: `GuidedFirmSetup.tsx` + pure skip/progress helpers (localStorage only — no DB writes)
- Steps: despacho → clientes → estados; skippable
- Modify: Hoy / invite entry to show for new demo sessions

### Task 6: Plain-language Spanish copy

**Files:**
- Modify: `lib/ciceron/copy/es-MX.ts` (+ tooltip component if needed)
- Replace jargon (RBAC/ABAC → permisos por rol/asunto already partial); keep correct legal terms with short tooltips

### Task 7: Partner KPI strip

**Files:**
- Extend Su mañana / partner strip: asuntos vigilados, novedades hoy, plazos esta semana, estados cubiertos
- Pure compute from existing loaders; tests

### Task 8: Mobile Hoy + PWA

**Files:**
- Create: `public/ciceron/manifest.webmanifest` + icons reuse
- Modify: `app/ciceron/layout.tsx` metadata manifest
- Mobile-first Hoy composition / dedicated hoy mobile section; no push

---

## Verification per PR

```bash
npm run typecheck
npm test
```

Screenshots: preview URL, login DESPACHO-DEMO, 1920 + 390 widths, before/after in PR body under `/opt/cursor/artifacts/`.
