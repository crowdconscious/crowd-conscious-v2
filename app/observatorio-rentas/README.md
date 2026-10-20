# Observatorio de Rentas CDMX: demo para la Comisión de Vivienda

Demo autocontenida para la reunión. **Todos los datos son simulados.** No lee ni escribe datos reales de usuarios, no toca Supabase ni las tablas de Pulse, y no tiene llamadas externas en tiempo de ejecución. **No incluye precios**: los precios van sólo en la presentación y la propuesta.

Rutas: `/observatorio-rentas` (vista pública: mapa, `ficha/[id]`, `calculadora`, `reporte`, `propietarios`, `metodologia`) y `/observatorio-rentas/comision` (espacio de la Comisión, clave de demo `vivienda2026`, sólo en sessionStorage, no es control de acceso real).

## Dónde está cada cosa (para extraerla después)
| Qué | Dónde |
|---|---|
| Umbrales, tope, inflación, paleta, aviso | `lib/observatorio-rentas/config.ts` (archivo único; Metodología lo lee de ahí) |
| Clasificación y agregados | `lib/observatorio-rentas/model.ts` (+ `model.test.ts`) |
| Generador de semilla (semilla fija `20261014`) | `scripts/observatorio-rentas/seed.mjs` |
| Semilla generada | `public/observatorio-rentas/seed.json` |
| UI, mapa, recorrido, reportes PDF/XLSX/CSV/ZIP | `app/observatorio-rentas/**` |
| Geometría | `public/geo/cdmx-alcaldias.geojson`, `public/geo/colonias-cuau-mh.geojson` (los mismos archivos del mapa de simulación existente) |

Dependencias externas a la carpeta: `lib/sim-viewer/map-projection.ts` y `lib/sim-viewer/cdmx-alcaldias.ts` (proyección d3-geo del mapa de simulación CDMX), más `jspdf`, `jspdf-autotable`, `exceljs` y `d3-geo`, que ya estaban en el proyecto. Para pasarla a su propio sitio, copia esas tres carpetas y esos dos archivos de geo.

## Regenerar la semilla
```
node scripts/observatorio-rentas/seed.mjs   # determinista: misma salida en cada corrida
```
Para cambiar la calibración, edita `ALCALDIAS` (renta base y presión) en el script.

## Cambiar los datos simulados por fuentes reales
- **Anuncios con licencia**: un trabajo semanal de ingesta escribe agregados por colonia y semana (`asking_rent_median`, `asking_rent_m2`, `listings_count`) con deduplicación y recorte de valores atípicos. Se excluye por escrito cualquier portal en el que el equipo tenga interés comercial.
- **Reportes de renovación y de propietarios**: tablas aisladas nuevas, solo con agregados por colonia y nunca mezcladas con los Pulses de consumo. Se agregan a la forma de `Colonia` en `model.ts`, con la regla n≥25 en la base de datos.
- **Inside Airbnb**: conteos de anuncios de corto plazo agregados por colonia (`short_term_listings`), nunca por unidad.
- **Inflación INEGI/Banxico**: reemplaza `OBS_INFLATION_12M_PCT` (y el tope anual) en `config.ts` por un valor obtenido en la compilación.
- Mientras el resultado conserve la forma de `Seed`, la UI y los reportes no cambian.

## Pendiente o abierto
- **Catálogo completo de colonias**: hay polígonos sólo para Cuauhtémoc y Miguel Hidalgo (119 colonias, catálogo oficial de la CDMX). Las otras 14 alcaldías usan una lista parcial de nombres reales de colonias (96), sin polígonos: se muestran como lista al acercarse. El portal de datos abiertos de la CDMX no respondió desde nuestro entorno de compilación. Para completarlo, ejecuta `scripts/geo/fetch-persona-ageb-sources.sh` sin el filtro `cve_alc` desde una red en México, haz commit del GeoJSON y vuelve a generar la semilla.
