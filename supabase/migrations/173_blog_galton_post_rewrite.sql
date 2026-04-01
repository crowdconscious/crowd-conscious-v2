-- Rewrite Galton / collective intelligence post: readable markdown, no leaderboard names, single market CTA.
UPDATE public.blog_posts
SET
  content = $es$
# ¿Puede una multitud predecir mejor que un experto?

En 1907, el científico Francis Galton descubrió algo sorprendente en una feria de ganado en Plymouth. Un grupo de 800 personas — granjeros, carniceros, curiosos sin experiencia — intentaron adivinar el peso de un buey.

El resultado: **el promedio de todas las respuestas acertó con solo 0.8% de error**. Mejor que cualquier experto individual. La multitud, en conjunto, sabía más que el más experimentado.

## Hoy en CDMX, estamos probando lo mismo

¿Qué pasa cuando le preguntas a decenas de personas en la Ciudad de México cuál debería ser la prioridad número uno para el Mundial 2026?

No es una encuesta cualquiera. Cada persona no solo elige una opción — también dice **qué tan segura está** de su respuesta, en una escala del 1 al 10.

Los resultados son reveladores.

## La certeza cambia todo

**Hospitalidad y turismo** lidera en votos con 38%. Tiene sentido: el Mundial traerá millones de visitantes y la ciudad necesita estar lista.

Pero aquí viene lo interesante: **Seguridad ciudadana** tiene menos votos (28%), pero sus votantes están **más seguros** de su elección. Certeza promedio de 8.5 contra 8.1 de Hospitalidad.

¿Qué significa? Que quienes piden más seguridad no lo dicen por decir — lo sienten con convicción.

Y **Vivienda accesible**, a pesar de las protestas activas en Condesa y Roma, tiene la certeza más baja de todas: 5.2/10. La gente la pide, pero no está segura de que sea lo más urgente para el Mundial.

## ¿Tú qué opinas?

La pregunta sigue abierta. Cada voto mueve los números y agrega inteligencia colectiva.

---

**¿Y tú qué opinas?**

Vota en el mercado: ¿Cuál debería ser la prioridad #1 de CDMX para el Mundial 2026?
→ https://www.crowdconscious.app/predictions/markets/365628d5-58bd-4792-8157-d45f18d63344
$es$,
  content_en = $en$
# Can a crowd predict better than an expert?

In 1907, scientist Francis Galton discovered something surprising at a livestock fair in Plymouth. A group of 800 people — farmers, butchers, curious bystanders — tried to guess the weight of an ox.

The result: **the average of all guesses was accurate to within 0.8% error**. Better than any individual expert. The crowd, collectively, knew more than the most experienced.

## Today in CDMX, we're testing the same thing

What happens when you ask dozens of people in Mexico City what should be the number one priority for the 2026 World Cup?

This isn't a regular survey. Each person doesn't just choose an option — they also say **how confident they are** in their answer, on a scale from 1 to 10.

The results are revealing.

## Certainty changes everything

**Hospitality and tourism** leads in votes at 38%. Makes sense: the World Cup will bring millions of visitors and the city needs to be ready.

But here's the interesting part: **Public safety** has fewer votes (28%), but its voters are **more confident** in their choice. Average certainty of 8.5 versus 8.1 for Hospitality.

What does this mean? Those who want better security aren't saying it casually — they feel it with conviction.

And **Affordable housing**, despite active gentrification protests in Condesa and Roma, has the lowest certainty of all: 5.2/10. People ask for it, but aren't sure it's the most urgent thing for the World Cup.

## What do you think?

The question is still open. Every vote moves the numbers and adds collective intelligence.

---

**What do you think?**

Vote on the market: What should be CDMX's #1 priority for the 2026 World Cup?
→ https://www.crowdconscious.app/predictions/markets/365628d5-58bd-4792-8157-d45f18d63344
$en$,
  excerpt = $ex$
La multitud de Galton acertó con 0.8% de error. Hoy en CDMX, la certeza por seguridad supera a la de hospitalidad — aunque tiene menos votos. ¿Qué revela esto?
$ex$,
  excerpt_en = $exe$
Galton's crowd was accurate within 0.8%. Today in CDMX, certainty for safety exceeds hospitality — despite fewer votes. What does this reveal?
$exe$,
  related_market_ids = ARRAY['365628d5-58bd-4792-8157-d45f18d63344'::uuid]
WHERE slug ILIKE '%galton%'
   OR slug ILIKE '%buey%'
   OR title ILIKE '%galton%';
