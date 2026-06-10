# Share Cards v2 — Thumbnails, Channels, QR Decision

**Date:** 2026-06-09
**Status:** Proposal (no code written)
**Scope:** Web (`crowd-conscious-v2`) + Mobile (`crowd-conscious-mobile`), shared Supabase backend
**Related:** [`CONSCIOUS-CREATORS-STRATEGY-2026-06-09.md`](CONSCIOUS-CREATORS-STRATEGY-2026-06-09.md) §5 (creator share cards build on this system)

---

## 1. Problem statement

The mobile share cards (Pulse / Signal / Blog) are well-built technically — branded
gradient, wordmark, QR, clean typography — but they are **text-only**. The Pulse
detail screen shows a rich cover image (e.g. the digitized-eye artwork); the share
card throws it away. A dark card with a title is not something people post to their
story. The content's visual identity is the single most shareworthy asset we have,
and it never reaches the card.

Second problem: every card spends ~25% of its bottom real estate on a QR code whose
primary audience — a story viewer holding the phone the story is on — cannot scan it
without a second device.

Third: the share **text** is generic ("Title + URL"). It reads like a forward, not
like a person saying "I did this."

---

## 2. Current state audit

Every share surface across both repos, as the code stands today:

| Surface | Repo | Produces today | Thumbnail? | OG preview quality | Copy quality |
|---|---|---|---|---|---|
| Pulse share (mobile) | mobile | 1080×1920 PNG via `PulseShareCard` + link in message | **No** | n/a (PNG) / link uses web OG | Generic: `{title}\n\n{url}` |
| Signal share (mobile) | mobile | 1080×1920 PNG via `SignalShareCard` + link | **No** | see signals web row | Generic |
| Blog share (mobile) | mobile | 1080×1920 PNG via `BlogShareCard` + link | **No** | good (blog OG) | Generic |
| Location share (mobile) | mobile | **Link-only** (`shareContent`, no card exists) | n/a | good (location OG) | Generic |
| `/pulse/[id]` link (web) | web | OG = uploaded `cover_image_url` raw, else `/api/og/market/[id]` | **Yes when cover uploaded** (raw image, not a composed card) | Good with cover; fallback card is chart-only | n/a |
| `/predictions/markets/[id]` link | web | `/api/og/market/[id]` 1200×630 | **No** — chart/percentages only | OK but no imagery | Twitter/WA copy in `share-utils` is EN-leaning ("Make your prediction") |
| `/api/og/market/[id]?format=story` | web | 1080×1920 story PNG | **No** | n/a (download/share artifact) | n/a |
| `/locations/[slug]` link | web | `/api/og/location/[slug]` 1200×630 | **Yes** — cover fetched as base64, left column | **Best in class** — copy this pattern | Good ("¿Es X un Lugar Consciente? Vota aquí") |
| `/blog/[slug]` link | web | `/api/og/blog/[slug]` | **Yes** — cover-as-background layout (when post has cover) | Good | n/a |
| `/causes/[slug]` link | web | `/api/og/cause/[slug]` | **Yes** — cover/image fetched | Good | n/a |
| `/signals/[slug]` link | web | `generateMetadata` sets openGraph title/description but **no `images` field** | **No OG image route exists** | **Worst in class** — WhatsApp shows tiny/no preview | n/a |
| `PostVoteShare` (web) | web | WhatsApp-first text + link | n/a | inherits page OG | Good, first-person-adjacent |
| Creators (planned) | both | Nothing yet | — | — | Defined in creators doc §5; must follow this doc's anatomy |

Summary of gaps:

1. **Mobile cards: zero imagery** (all four content types; locations has no card at all).
2. **Web market/Pulse OG: no imagery** in the composed card (the `/pulse/[id]` raw-cover
   shortcut works, but the story format and `/predictions/markets/` card never show the cover).
3. **Web signals: no OG image route at all.**
4. **Copy is third-person and generic** everywhere except `PostVoteShare`.

---

## 3. Channel strategy: link where links work, PNG where they don't

The core insight: **WhatsApp renders OG previews — the OG image already IS a
clickable card.** Sending a PNG into WhatsApp is strictly worse than sending a link:
the PNG isn't tappable, while the OG preview is a large branded image *plus* a
working link. Meanwhile Instagram/TikTok stories can't carry links from a share
sheet at all — there the PNG is the only vehicle.

| Channel | Artifact | Why |
|---|---|---|
| **WhatsApp** (and iMessage/Telegram) | Short first-person text + link (`withShareUtm` / `utm_medium=whatsapp`) | OG preview renders as a large tappable card. One tap → page. This is the proven money channel. |
| **Instagram / TikTok stories** | 9:16 PNG with thumbnail hero (view-shot on mobile, `?format=story` OG on web) | Stories can't carry tappable links from the sheet. The image must be beautiful enough to post; the URL/handle on the card is the recall mechanism. |
| **Generic / everything else** | Native share sheet with text + link (current behavior) | Let the OS route it. |

### Mobile share sheet UX

Replace the current single flow (always capture PNG → `Alert` with Share/Save) with
a **channel chooser** as the first step:

```
[ Compartir ]
  → Compartir en WhatsApp        (text + link; opens wa.me/Linking, NO capture)
  → Compartir historia            (capture PNG with thumbnail → share sheet)
  → Guardar imagen                (capture → save to gallery)
  → Copiar enlace                 (clipboard)
  → Cancelar
```

- WhatsApp option uses `Linking.openURL("whatsapp://send?text=...")` with fallback
  to `https://wa.me/?text=` — no view-shot involved, instant.
- "Compartir historia" keeps the existing lazy `*ShareCapture` pipeline.
- This also fixes a real Android defect in the current flow: RN `Share.share` on
  Android drops the image when a message is present (already documented in
  `shareCard.ts` comments), so "share card" on Android effectively sends text only.
  Splitting channels makes each path do one thing well.
- Implementation: a `presentShareOptions()` in `src/lib/shareCard.ts` (or a small
  bottom-sheet component if `Alert` gets crowded). Keep `Alert.alert` for v1 —
  four options fit fine.

### Web

`PostVoteShare` already does WhatsApp-first correctly. The change is on the story
side: `shareStoryImage` / `downloadCard` should produce a story PNG **with the
cover image** (see §6 web plan), and Pulse pages should expose both options the same
way the mobile sheet does.

---

## 4. The QR decision: demote, don't delete

Honest assessment of when a QR on a share card actually gets scanned:

| Context | Can viewer scan? | Verdict |
|---|---|---|
| IG/TikTok story viewed on the viewer's own phone | Not directly. iOS lets you screenshot → long-press the screenshot to detect QR, but that's 3 steps nobody does for casual content | QR is ~dead weight |
| WhatsApp | Irrelevant — the link in the message is one tap | QR is dead weight |
| Card printed / projected / shown on someone else's screen (events, a café counter, a talk) | Yes — this is the native QR use case | QR earns its place |
| Saved to gallery and shown in person ("scan my card") | Yes | QR earns its place |

Conclusion: the QR's value is real but **situational**, and the situations are a
minority of shares. It does not deserve 72pt + white container + a full text row
("Escanea para votar") on every card — that's the most valuable bottom-third real
estate, which the thumbnail-era card needs for the CTA and URL.

**Recommendation: keep the QR, shrunk and footered.**

- Shrink to ~44pt, no white card container (white QR modules on the dark footer
  work fine at story resolution — 44pt logical × 3 = 132px, comfortably scannable),
  placed at the far right of the brand footer row.
- Drop the "Escanea para..." text row entirely. The footer becomes:
  `[logo] crowdconscious.app/...        [small QR]`.
- The human-readable URL gets the visual weight the QR used to have — that's what
  story viewers actually use (they type it or remember the brand).
- Do **not** drop it entirely: locations/creators cards specifically get printed
  and shown in person (a café printing "¿Somos conscientes? Vota" is a real,
  observed pattern with locations, and "vota por mí" creator cards will be shown
  screen-to-screen). One small footer QR keeps every card print-ready at zero
  marginal cost — we already ship `react-native-qrcode-svg`.
- Caption guidance ("link en bio", IG link stickers) belongs in the share *text*
  and creator onboarding copy, not on the card.

---

## 5. New card anatomy (all features, both repos)

Keep the brand system: dark canvas `#0a0d0f`, emerald `#10b981`, teal glow,
`BrandShareBackground`, wordmark. The change is structural: the top ~45% becomes a
thumbnail hero.

```
┌──────────────────────────────┐ 360×640 logical (×3 capture)
│  THUMBNAIL HERO     ~45%     │ cover image, objectFit cover
│  (gradient scrim from        │ bottom 40% fades to canvas color
│   transparent → #0a0d0f)     │ wordmark pill overlaid top-left
│                              │ feature badge pill top-right
├──────────────────────────────┤
│  [category/severity pills]   │
│  Title (bold, 26–30pt,       │ tighter than today: hero takes room
│   numberOfLines 3–4)         │
│  Stat row (votes/cosigns/    │ existing surface-card style
│   score) — social proof      │
├──────────────────────────────┤
│  First-person line (NEW)     │ "Yo ya voté." — the human voice
│  CTA block (existing style)  │ "Vota en Crowd Conscious →"
├──────────────────────────────┤
│  footer: logo · URL ·  [QR]  │ QR 44pt, far right, no container
└──────────────────────────────┘
```

Rules:

- **Scrim is mandatory** over the hero: `LinearGradient` transparent →
  `#0a0d0f` (mobile) / CSS gradient (OG). Never place text on raw image.
- **No-image fallback:** keep today's layout (full `BrandShareBackground`, larger
  title, more breathing room). Do not render a grey placeholder box — a confident
  text card beats a broken-looking image card. Web location OG's initial-letter
  fallback is acceptable for OG; on mobile prefer the pure text layout.
- **Aspect handling:** hero is a fixed-height window (~288pt of 640), image is
  center-cropped (`resizeMode="cover"`). Portrait and landscape sources both work;
  no aspect math needed.
- **Story-format OG (web)** adopts the same anatomy at 1080×1920 so web-downloaded
  stories and app-generated stories look like siblings.

Per-feature hero sources:

| Feature | Image source | Notes |
|---|---|---|
| Pulse | `prediction_markets.cover_image_url` | Already selected by `usePulse` (mobile) and pulse page (web) |
| Signal | First evidence image via `useSignalCoverImages` (signed URL) | Signed URLs expire — mint fresh before capture; many signals have none → fallback layout |
| Blog | `blog_posts.cover_image_url` | Already fetched |
| Location | `conscious_locations.cover_image_url` | Mobile card doesn't exist yet — build it with this anatomy from day one |
| Creator | avatar (circular, centered on hero) + optional `cover_image_url` | See creators doc §5; avatar-forward variant of the same scaffold |

---

## 6. Per-feature copy matrix

Two layers per feature: the **share text** (goes in the WhatsApp/share-sheet
message, first person, ends with the link) and the **on-card line** (short,
first person, printed on the PNG above the CTA). Natural Mexican Spanish first;
EN secondary. No emojis (repo convention).

| Feature / moment | ES share text | EN share text | ES on-card line | EN on-card line |
|---|---|---|---|---|
| Pulse (after voting) | "Yo ya voté en este Pulse. ¿Tú qué opinas? {url}" | "I just voted on this Pulse. What do you think? {url}" | "Yo ya voté." | "I already voted." |
| Pulse (not voted / generic) | "Mira este Pulse en Crowd Conscious: {title} {url}" | "Check out this Pulse on Crowd Conscious: {title} {url}" | "La conversación está abierta." | "The conversation is open." |
| Signal (co-signed) | "Apoyé esta señal ciudadana. Súmate: {url}" | "I backed this citizen signal. Join in: {url}" | "Yo la apoyo." | "I support this." |
| Signal (generic) | "Esta señal necesita más voces: {title} {url}" | "This signal needs more voices: {title} {url}" | "Esto está pasando." | "This is happening." |
| Blog | "Vale la pena leer esto: {title} {url}" | "This is worth a read: {title} {url}" | "Lo acabo de leer." | "Just read this." |
| Location (voted) | "Ya voté: ¿es {name} un Lugar Consciente? Vota tú también: {url}" | "I voted: is {name} a Conscious Location? Cast yours: {url}" | "Yo ya voté. ¿Es consciente?" | "I voted. Is it conscious?" |
| Location (recommend / "es consciente") | "Este lugar es consciente: {name}. Conócelo: {url}" | "This place is conscious: {name}. Check it out: {url}" | "Este lugar es consciente." | "This place is conscious." |
| Creator card (self-share) | "Esta es mi tarjeta de creador en Crowd Conscious: {url}" | "This is my creator card on Crowd Conscious: {url}" | "Creador en Crowd Conscious" | "Creator on Crowd Conscious" |
| Creator verified moment | "Ya soy Creador Consciente verificado. La comunidad votó: {url}" | "I'm now a verified Conscious Creator. The community voted: {url}" | "Verificado por la comunidad" | "Community-verified" |
| Creator "vota por mí" | "¿Soy un creador consciente? Vota y ayúdame a verificarme: {url}" | "Am I a conscious creator? Vote and help me get verified: {url}" | "Vota por mí" | "Vote for me" |

Notes:

- The post-vote variants require the share entry point to know the user's vote
  state — both repos already have it on the detail screens (mobile: vote state in
  pulse/signal hooks; web: `PostVoteShare` only renders post-vote). Default to the
  generic variant when unknown.
- Mobile i18n: these become new keys under `strings.share.*` in `src/lib/i18n/es.ts`
  / `en.ts` (e.g. `share.pulseCard.firstPersonVoted`, `share.messages.pulseVoted`).
  Web: extend the copy in `lib/share-utils.ts` and `PostVoteShare` — and fix the
  existing EN-leaning market copy ("Make your prediction") with proper ES defaults.
- Creator rows depend on the creators feature shipping; copy lives here so both
  docs reference one matrix.

---

## 7. Implementation plan

### Phase M1 — Mobile thumbnails (highest impact, smallest scope)

| File | Change |
|---|---|
| `src/components/pulses/PulseShareCard.tsx` | Add `coverImageUrl?: string \| null` prop; hero block + scrim; shrink QR per §4; add first-person line prop |
| `src/components/signals/SignalShareCard.tsx` | Same; hero from evidence image |
| `src/components/blog/BlogShareCard.tsx` | Same; hero from blog cover |
| `src/components/shared/BrandShareBackground.tsx` | Unchanged (still the no-image fallback backdrop) |
| `src/components/pulses/PulseShareCapture.tsx` (+ Signal/Blog Captures) | Pass image URL through; **gate `captureRef` on image load** (see risks §9): render hero `Image` with `onLoad`/`onError` resolving a promise, race against a ~2.5s timeout, then `waitForPaint` → capture. On timeout/error, capture the no-image layout |
| `src/lib/shareCard.ts` | Add image-load helper + extend `presentShareCardActions` → `presentShareOptions` with the four-option sheet (§3) |
| `src/lib/share.ts` | Add `shareToWhatsApp(kind, idOrSlug, message)` via `Linking`; extend analytics props (§8) |
| `app/(drawer)/(tabs)/pulses/[id].tsx`, `signals/[slug].tsx`, `blog/[slug].tsx` | Pass cover URL + vote state into the capture input |
| `src/lib/i18n/es.ts`, `en.ts` | New `share` keys: channel labels ("Compartir en WhatsApp", "Compartir historia", "Copiar enlace"), first-person lines, per-feature messages (§6) |

### Phase M2 — Locations card (mobile)

| File | Change |
|---|---|
| `src/components/locations/LocationShareCard.tsx` + `LocationShareCapture.tsx` | **New** — only justified new files; follow the refactored anatomy. Hero = `cover_image_url`, stat row = votes/score, on-card line per §6 |
| `app/(drawer)/(tabs)/locations/[slug].tsx` | Replace link-only `shareContent` with the channel sheet |

Refactor note: after M1 the three cards will share ~80% structure. Extracting a
`ShareCardScaffold` (hero + scrim + content slots + footer) is warranted **during
M2**, when the fourth card would otherwise be the fourth copy — not before. Honors
"edit existing files" while preventing a fifth copy for creators.

### Phase W1 — Web OG imagery gaps

| File | Change |
|---|---|
| `app/api/og/market/[id]/route.tsx` | Select `cover_image_url`; fetch → base64 (copy the location route's pattern exactly, including silent fallback); hero band in **both** 1200×630 and `?format=story` layouts with gradient scrim |
| `app/api/og/signal/[slug]/route.tsx` | **New route** — signals have no OG image today. Severity/stage pills + cosign count; hero from first evidence image if cheap to mint server-side, else branded text card (still a massive upgrade over nothing) |
| `app/signals/[slug]/page.tsx` | Add `images: [/api/og/signal/{slug}]` to `generateMetadata` |
| `app/pulse/[id]/page.tsx` | No change to the raw-cover og:image branch (it works and avoids the WhatsApp small-image downgrade) — but once the market OG route has the hero, consider pointing at the composed card for the stats overlay. Decide with real WhatsApp render tests; do not break this page (CLAUDE.md rule 1) |

### Phase W2 — Web copy + channel UX

| File | Change |
|---|---|
| `lib/share-utils.ts` | First-person ES-default copy per §6 (`shareToWhatsApp`, `shareToTwitter`); add `format` to tracking (§8) |
| `components/sharing/PostVoteShare.tsx` | Adopt §6 voted-variant copy; add "Compartir historia" button calling `shareStoryImage` (which now produces the thumbnail story via W1) |

### Phase C — Creators cards

Blocked on the creators feature (data model + surfaces) — see
[`CONSCIOUS-CREATORS-STRATEGY-2026-06-09.md`](CONSCIOUS-CREATORS-STRATEGY-2026-06-09.md)
§5 and §8. When built, creator cards must use the M2 scaffold and §6 copy rows;
the "verified moment" and "vota por mí" variants are the launch artifacts.

Suggested order: **M1 → W1 → W2 → M2 → C.** M1 is the founder's visible ask; W1
makes every WhatsApp link benefit (biggest reach per hour of work).

---

## 8. Analytics: make the channel hypothesis measurable

The whole §3 strategy is a hypothesis ("links convert on WhatsApp, PNGs spread on
stories"). Instrument it:

- **`share_events` (web):** add nullable `format` column (`link` | `png`). `channel`
  already exists. Update `POST /api/share/track` + `trackShare()` signature.
- **Mobile PostHog:** extend `content_shared` / `content_saved` props from
  `{kind, id}` to `{kind, id, channel: "whatsapp" | "story" | "native" | "copy",
  format: "link" | "png"}`. Optionally POST to `/api/share/track` too so web and
  mobile shares land in one table.
- **Existing UTM plumbing** (`withShareUtm`) already attributes inbound clicks per
  channel; the new props attribute outbound share actions. Together they give
  share→click conversion per channel — the number that settles the QR/PNG/link
  debate with data.

---

## 9. Technical risks found in the code

1. **view-shot + remote images (the big one).** `waitForPaint(3)` waits three
   animation frames — enough for gradients and local assets, **not** for a remote
   `cover_image_url`. Without gating on `Image.onLoad`, the capture races the
   download and ships a card with an empty hero. The plan gates capture on
   onLoad/onError with a timeout fallback to the no-image layout (§7 M1). Test on
   slow networks and Android specifically.
2. **Signal evidence images are signed URLs** (`useSignalCoverImages` mints them).
   They expire — mint immediately before capture, and never persist them into
   share text. Server-side (OG route) needs its own signing via admin client.
3. **Android `Share.share` drops the image when `message` is set** (documented in
   `shareCard.ts`). Today's "share card" on Android is effectively text-only. The
   channel-split sheet fixes this honestly: story path shares the file alone
   (`expo-sharing`), WhatsApp path shares text alone.
4. **WhatsApp downgrades small og:images to favicon-style previews** (documented
   in `app/pulse/[id]/page.tsx`). Any new OG imagery must stay large (full 1200×630
   with the hero band); never emit a small logo as the primary image.
5. **OG base64 fetch cost.** The location route's fetch-to-base64 pattern runs
   per-render with only 60s/300s cache headers. Acceptable today; if Pulse share
   volume spikes during Mundial, raise `s-maxage` on the market OG route (vote
   counts on it tolerate 5–10 min staleness).
6. **OG URL caching / cache-busting.** WhatsApp caches previews ~7 days per exact
   URL; `withShareUtm` already busts this for outbound shares. Mobile's
   `buildWebShareUrl` does **not** add UTM params — adding them in M1 both
   attributes mobile shares and re-scrapes pages whose OG just improved.
7. **Capture memory.** 1080×1920 PNG capture plus a full-res hero bitmap on
   low-end Android is a plausible OOM. Request a display-sized image where the
   CDN supports transforms (Supabase storage render endpoint) rather than the
   original upload.
8. **Signals are env-gated** (`SIGNALS_ENABLED !== 'true'` → metadata empty). The
   new signal OG route must respect the same gate.
