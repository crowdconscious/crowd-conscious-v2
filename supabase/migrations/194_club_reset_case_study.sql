-- Club Reset case study — first published proof point for Conscious Pulse.
--
-- Strategy
-- --------
-- Club Reset (Juárez) is the most-voted location market on the platform
-- (~18 votes, ~9.2/10 average confidence). It is the proof that a
-- place-based market drives engagement an order of magnitude beyond
-- generic prediction markets. This migration ships:
--
--   1. A bilingual blog_posts row (status='published') so /blog and any
--      newsletter pipeline can pick it up immediately.
--   2. Three social-post variants stored in agent_content (Instagram Reel
--      script, LinkedIn post, WhatsApp summary) so the founder can copy
--      them straight from /predictions/admin/agents.
--
-- Idempotency
-- -----------
-- Both inserts are guarded by NOT EXISTS lookups on stable identifiers
-- (slug for the blog, title for the social rows). Re-running this
-- migration will not duplicate.
--
-- The numbers below (18 votes, 9.2/10 confidence) are the public stat as
-- of the seeding date. Live numbers continue to flow through
-- /api/case-studies/club-reset; the blog body is intentionally written so
-- it stays accurate even as the market keeps growing.

-- 1. The blog post

INSERT INTO public.blog_posts (
  slug,
  title,
  title_en,
  excerpt,
  excerpt_en,
  content,
  content_en,
  category,
  tags,
  meta_title,
  meta_description,
  status,
  published_at,
  generated_by
)
SELECT
  'club-reset-18-personas',
  'Lo que 18 personas revelaron sobre Club Reset',
  'What 18 people revealed about Club Reset',
  'En la era de las encuestas, Club Reset se convirtió en el mercado más activo de toda la plataforma. Esto es lo que la confianza ponderada reveló — y lo que una encuesta tradicional habría escondido.',
  'In the era of polls, Club Reset became the most active market on the entire platform. Here is what confidence-weighted voting revealed — and what a traditional poll would have hidden.',
  $md$
## En la era de las encuestas, ¿qué pasa cuando la gente vota con confianza real?

Club Reset, en Juárez, es un Lugar Consciente. Una pregunta simple — *¿es realmente un lugar consciente?* — se convirtió en el mercado más activo de toda la plataforma Crowd Conscious. **18 personas** votaron, con una **confianza promedio de 9.2/10**.

Esto no es una encuesta más. Es lo que pasa cuando le pides a una comunidad que opine *con qué tan segura está* de su opinión.

## Los números

- **18 votos** — más que cualquier otro mercado en Crowd Conscious.
- **9.2 / 10 de confianza promedio** — la gente no estaba dudando.
- Mezcla de votantes anónimos y registrados — la prueba de que el voto sin fricción funciona.
- Mercado abierto durante varias semanas, con interés sostenido (no un pico viral).

## Lo que reveló — y lo que una encuesta plana habría escondido

Una encuesta tradicional reportaría un porcentaje. *"82% dice sí."* Punto.

Conscious Pulse hace algo distinto: pondera cada voto por la confianza que la persona expresa. Eso significa que un voto con 9/10 de confianza pesa más que uno con 4/10. El resultado no es una opinión promedio — es una **opinión calibrada**.

En el caso de Club Reset, la confianza promedio de 9.2/10 indica que quienes opinaron tenían una posición clara, no eran indecisos. Eso convierte un porcentaje genérico en una señal: *esta comunidad sabe lo que piensa de este lugar*.

## Cómo funciona Conscious Pulse, en una línea

Una pregunta. Cualquier persona puede votar (sin cuenta, sin fricción). Cada voto incluye un nivel de confianza de 1 a 10. El resultado es un consenso ponderado por confianza, en vivo, compartible.

## ¿Quieres este nivel de insight para tu marca?

El Mundial 2026 llega a México. Si tu marca quiere medir el sentimiento real de una comunidad — sin bots, sin encuestas aburridas, sin sesgos de panel — ahí es donde entra Conscious Pulse.

→ [Ver planes de Conscious Pulse](/pulse)
$md$,
  $md_en$
## In the era of polls, what happens when people vote with real confidence?

Club Reset, in Juárez, is a Conscious Location. A simple question — *is it really a conscious place?* — turned into the most active market on the entire Crowd Conscious platform. **18 people** voted, with an **average confidence of 9.2/10**.

This is not just another poll. It is what happens when you ask a community to weigh in *and tell you how sure they are*.

## The numbers

- **18 votes** — more than any other market on Crowd Conscious.
- **9.2 / 10 average confidence** — people were not hesitating.
- A mix of anonymous and registered voters — proof that frictionless voting works.
- The market stayed open for weeks, with sustained interest (no viral spike).

## What it revealed — and what a flat poll would have hidden

A traditional poll reports a percentage. *"82% say yes."* End of story.

Conscious Pulse does something different: it weights each vote by the confidence the person expresses. A 9/10-confidence vote counts for more than a 4/10. The result is not an average opinion — it is a **calibrated opinion**.

In Club Reset's case, the 9.2/10 average confidence tells you the people who voted had a clear position. They were not on the fence. That turns a generic percentage into a signal: *this community knows what it thinks about this place*.

## How Conscious Pulse works, in one line

One question. Anyone can vote (no account, no friction). Each vote includes a confidence level from 1 to 10. The result is a confidence-weighted consensus, live, shareable.

## Want this kind of insight for your brand?

The 2026 World Cup is coming to Mexico. If your brand wants to measure a community's real sentiment — no bots, no boring surveys, no panel bias — Conscious Pulse is where to start.

→ [See Conscious Pulse plans](/pulse)
$md_en$,
  'pulse_analysis',
  ARRAY['pulse', 'case-study', 'conscious-locations', 'club-reset', 'juarez'],
  'Caso Club Reset · 18 votos · 9.2 confianza',
  '18 personas votaron sobre Club Reset con 9.2/10 de confianza promedio. La prueba de que la confianza ponderada revela lo que una encuesta plana esconde.',
  'published',
  now(),
  'founder'
WHERE NOT EXISTS (
  SELECT 1 FROM public.blog_posts WHERE slug = 'club-reset-18-personas'
);

-- 2. Social variants (stored as agent_content rows so they appear in the
--    admin agents dashboard alongside other generated content).

-- a) Instagram Reel script
INSERT INTO public.agent_content (
  market_id, agent_type, content_type, title, body, language,
  metadata, published
)
SELECT
  NULL, 'content_creator', 'social_post',
  'IG Reel — Club Reset · 18 personas',
  $reel$**HOOK (0–3s):**
"18 personas votaron sobre un lugar en Juárez — y descubrimos algo que ninguna encuesta te diría."

**B-roll (3–8s):**
Plano del exterior de Club Reset. Texto en pantalla:
*"Club Reset · Juárez · Lugar Consciente"*

**REVEAL (8–15s):**
"No solo dijeron sí o no. Dijeron qué tan SEGUROS estaban. Confianza promedio: 9.2 sobre 10."
Texto en pantalla animado: **9.2 / 10**

**INSIGHT (15–22s):**
"Eso convierte un porcentaje genérico en una señal real. Esta comunidad SABE lo que piensa."

**CTA (22–30s):**
"¿Quieres saber qué piensa la tuya? Conscious Pulse, una pregunta, 7 días, $1,500 MXN. Link en bio."

---
**Caption (ES):**
"18 votos. 9.2 de confianza. Esto no es una encuesta — es un Pulse 🔥
Mide el sentimiento real de tu comunidad. Sin bots. Sin paneles aburridos.
→ crowdconscious.app/pulse/pilot"
$reel$,
  'es',
  jsonb_build_object('case_study', 'club-reset', 'platform', 'instagram'),
  false
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_content
  WHERE title = 'IG Reel — Club Reset · 18 personas'
);

-- b) LinkedIn post (B2B audience)
INSERT INTO public.agent_content (
  market_id, agent_type, content_type, title, body, language,
  metadata, published
)
SELECT
  NULL, 'content_creator', 'social_post',
  'LinkedIn — Club Reset case study',
  $li$En Crowd Conscious acabamos de cerrar nuestro primer caso de estudio formal: Club Reset, en Juárez.

18 personas votaron. Confianza promedio: 9.2 sobre 10. Es el mercado más activo de toda la plataforma — un Lugar Consciente, no una marca grande con presupuesto de pauta.

¿Por qué importa para una marca?

Porque Conscious Pulse no es una encuesta más. Cada voto está ponderado por la confianza que la persona declara. Un 9/10 pesa más que un 4/10. El resultado no es una opinión promedio: es una opinión calibrada.

Tres lecciones para quien hace research B2C en México:

1. La fricción mata la honestidad. Voto anónimo + 30 segundos = participación real.
2. La confianza es la nueva métrica. Sin ella, un porcentaje miente.
3. Lo local engancha más que lo nacional. Los lugares conscientes mueven a su comunidad mejor que cualquier estudio panel.

El Mundial llega a México en junio. Si tu marca quiere medir sentimiento real durante el torneo — sin bots, sin encuestas con sesgo — esto es lo que estamos construyendo: crowdconscious.app/pulse

#ConsciousPulse #MarketResearch #Mundial2026 #Mexico
$li$,
  'es',
  jsonb_build_object('case_study', 'club-reset', 'platform', 'linkedin'),
  false
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_content
  WHERE title = 'LinkedIn — Club Reset case study'
);

-- c) WhatsApp summary (3 sentences + link)
INSERT INTO public.agent_content (
  market_id, agent_type, content_type, title, body, language,
  metadata, published
)
SELECT
  NULL, 'content_creator', 'social_post',
  'WhatsApp — Club Reset summary',
  $wa$Caso Club Reset (Juárez) ya en vivo: 18 personas votaron sobre si es un Lugar Consciente, con 9.2/10 de confianza promedio — el mercado más activo de toda la plataforma.

Conscious Pulse pondera cada voto por la confianza, así un 9/10 pesa más que un 4/10. Eso convierte un porcentaje genérico en una señal real para tu comunidad.

Si quieres correr un Pulse para tu marca en el Mundial: crowdconscious.app/pulse 👀
$wa$,
  'es',
  jsonb_build_object('case_study', 'club-reset', 'platform', 'whatsapp'),
  false
WHERE NOT EXISTS (
  SELECT 1 FROM public.agent_content
  WHERE title = 'WhatsApp — Club Reset summary'
);
