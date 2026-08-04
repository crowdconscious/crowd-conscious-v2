# alcaldia-meta.cdmx — README (doc interno)

Scaffold de **datos** para `ALCALDIA_META` (§2 de `CC_BUILD_CONTEXT.md`), usado
por **Señal Express** (§7.1) para el destinatario del oficio formal.

## Por qué es un scaffold de datos (y no el módulo)

`ALCALDIA_META` vivirá en `lib/geo/cdmx.ts`, pero ese módulo y sus funciones
(`resolveAlcaldia`, `resolveColonia`, `COLONIA_ADJACENCY`) se construyen después,
con **Workstream D (Señal Express)**. Para no pre-empt-ar el diseño de ese
módulo, aquí solo alojamos los datos. Cuando D arranque, importará
`data/alcaldia-meta.cdmx.json` hacia `ALCALDIA_META` en `lib/geo/cdmx.ts`.

## Alcance

Solo las **dos alcaldías de lanzamiento**: **Cuauhtémoc** y **Miguel Hidalgo**.

## Esquema por entrada

`{ alcaldia, destinatario_titulo, dependencia, direccion, email, notas }`

- `destinatario_titulo` — rol genérico seguro (p. ej. "Alcaldesa/Alcalde de
  Cuauhtémoc"). No es un nombre propio.
- `dependencia` — nombre institucional (p. ej. "Alcaldía Cuauhtémoc").
- `direccion`, `email` — **`TODO_FILL_FROM_OFFICIAL_SOURCE`**.
- `notas` — notas internas para el dueño.

## Cómo lo llena el dueño

Rellena `direccion`, `email` y cualquier campo de nombre oficial desde **fuentes
oficiales de la alcaldía** y la **correspondencia existente**. El agente **nunca**
inventa direcciones, correos ni nombres de funcionarios (§2): son exactamente los
campos marcados `TODO_FILL_FROM_OFFICIAL_SOURCE`.

## Siguiente paso

Workstream D importa este JSON a `lib/geo/cdmx.ts` como `ALCALDIA_META`. No
edites el módulo desde aquí; edita este archivo de datos.
