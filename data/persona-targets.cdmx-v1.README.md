# persona-targets.cdmx-v1 — README (doc interno)

Entrada del **generador de personas** de la Simulación de Pulse (Workstream B,
§5.3 de `CC_BUILD_CONTEXT.md`). Este archivo NO genera personas por sí mismo:
es el conjunto de **celdas objetivo** que `scripts/generate-personas.ts`
consumirá más adelante. Aquí solo vive el scaffold de datos.

## Qué es

- Set de personas: **`cdmx-v1` = 150 personas** → **100 Cuauhtémoc + 50 Miguel
  Hidalgo**.
- Cada celda usa exactamente el esquema de §5.3:
  `{ alcaldia, count, age_range, gender, education, income_band }`.
- Archivo: `data/persona-targets.cdmx-v1.json`.
  - `_meta`: versión, totales, fuentes, instrucciones, esquema, dimensiones y
    marginales de escolaridad.
  - `cells`: **96 celdas** = por alcaldía, cruce `age_range` (4) × `income_band`
    (6) × `gender` (2) = 48 celdas/alcaldía.

## Cómo lo llena el dueño

1. **`count` = PESO, no conteo final**: cada celda lleva un entero que es la
   **estimación de población adulta** del dueño para esa celda (un peso
   proporcional), NO el número final de personas.
   - Los `count` **no** tienen que sumar 100/50/150. La normalización al set
     `cdmx-v1` (100 Cuauhtémoc + 50 Miguel Hidalgo = 150) la hace el generador
     con un **asignador determinista de mayor-residuo (Hamilton)**, por
     alcaldía. Esa correctitud vive en **código probado**, no en este archivo:
     - Módulo: [`lib/simulation/persona-allocation.ts`](../../lib/simulation/persona-allocation.ts)
       (`allocatePersonaCounts`).
     - Tests: [`lib/simulation/persona-allocation.test.ts`](../../lib/simulation/persona-allocation.test.ts)
       — incluyen un test de contrato contra este JSON que verifica 100/50/150.
   - Cada distribución **marginal** (edad, sexo, ingreso AMAI) debe quedar
     dentro de **<5%** respecto a las fuentes para esa alcaldía. Esto sí lo
     cuida el dueño al elegir los pesos.
2. **Escolaridad (marginal)**: no se fija por celda (`education: null`). Llena
   `_meta.education_marginals[alcaldia]` (los `"TODO"` por nivel: primaria,
   secundaria, prepa, licenciatura, posgrado). El generador reparte la
   escolaridad dentro de cada celda para respetar esa marginal con delta <5%.
3. **Género "otro"** (opcional): ver `_meta.gender_note`. Puedes reservar una
   cuota pequeña sin romper el total de 150.

## Fuentes (para llenar, no inventar)

- **INEGI Censo de Población y Vivienda 2020** — edad, sexo, escolaridad, hogar
  por alcaldía.
- **INEGI ENIGH** — textura de ingreso del hogar.
- **AMAI (Regla NSE)** — bandas A/B, C+, C, C-, D+, D/E.

## Regla dura

El agente **nunca** inventa marginales demográficas reales. Los `count` (pesos
poblacionales) y la escolaridad marginal los rellena el dueño desde las fuentes
citadas. La normalización al set de 150 (100/50) no es un dato demográfico:
es determinista y vive en el asignador probado
(`lib/simulation/persona-allocation.ts`).
