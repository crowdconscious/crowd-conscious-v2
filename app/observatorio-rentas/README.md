# Observatorio de Rentas CDMX: demo para la Comisión de Vivienda

Demo autocontenida para la reunión. **Todos los datos son simulados.** No lee ni escribe datos reales de usuarios, no toca Supabase ni las tablas de Pulse, y no tiene llamadas externas en tiempo de ejecución. **No incluye precios**: los precios van sólo en la presentación y la propuesta.

Rutas: `/observatorio-rentas` (vista pública: mapa, `ficha/[id]`, `calculadora`, `reporte`, `propietarios`, `metodologia`) y `/observatorio-rentas/comision` (espacio de la Comisión, clave de demo `vivienda2026`, sólo en sessionStorage, no es control de acceso real).

## Dónde está cada cosa (para extraerla después)
| Qué | Dónde |
|---|---|
| Umbrales, tope, inflación, paleta, aviso | `lib/observatorio-rentas/config.ts` (archivo único; Metodología lo lee de ahí) |
| Clasificación y agregados | `lib/observatorio-rentas/model.ts` (+ `model.test.ts`) |
| Generador de semilla (semilla fija `20261014`) | `scripts/observatorio-rentas/seed.mjs` |
| Semilla generada | `public/observatorio-rentas/data/core.json` (columnar, ~59 KB / ~19 KB gzip, primer render) + `data/weekly-<cvegeo>.json` (series semanales, se cargan al abrir una ficha de colonia) |
| Polígonos de colonia de la demo | `public/observatorio-rentas/colonias.geojson` (~94 KB), reconstruible con `scripts/observatorio-rentas/build-colonias-geo.sh` |
| UI, mapa, recorrido, reportes PDF/XLSX/CSV/ZIP | `app/observatorio-rentas/**` |
| Geometría de alcaldías | `public/geo/cdmx-alcaldias.geojson` (mismo archivo del mapa de simulación existente) |

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

## Fuentes de geometría y licencia
- **Alcaldías**: INEGI, Marco Geoestadístico 2020 (ver `public/geo/SOURCE.md`). Términos de uso de INEGI, con atribución.
- **Colonias (Cuauhtémoc, Miguel Hidalgo, La Magdalena Contreras)**: Catálogo de Colonias de la CDMX (ADIP), en la capa oficial `Catalogo_Colonias_CDMX` de la SGIRPC: `https://serviciosatlas.sgirpc.cdmx.gob.mx/arcgis/rest/services/Hosted/Catalogo_Colonias_CDMX/FeatureServer/0`. Es el mismo catálogo que el conjunto de `datos.cdmx.gob.mx/dataset/catalogo-de-colonias-datos-abiertos`, que no fue accesible desde nuestro entorno.
  - La Magdalena Contreras (`cve_alc = '008'`): 42 colonias, consultadas el 19 de octubre de 2026 con simplificación del servidor (`maxAllowableOffset = 0.0007°`, unos 70 m) y redondeo a 5 decimales.
  - Cuauhtémoc y Miguel Hidalgo: simplificadas con mapshaper al 12% (`keep-shapes`).
  - Se restauraron acentos en los nombres de colonia (por ejemplo, «San Jeronimo Lidice» → «San Jerónimo Lídice»). «Cerro Del Judio - Av» se muestra como «Cerro del Judío».
  - **Licencia**: la capa ArcGIS no declara una licencia. El Portal de Datos Abiertos de la CDMX publica sus conjuntos bajo términos de libre uso con atribución («Fuente: Gobierno de la Ciudad de México / ADIP»). Hay que confirmar los términos exactos antes de usarlos fuera de esta demo.
- La simplificación es sólo visual: los límites no deben usarse para fines legales ni catastrales.

## Pendiente o abierto
- **Polígonos de las otras 13 alcaldías**: siguen con una lista parcial de nombres reales de colonias, sin polígonos, y se muestran como lista al acercarse. Para agregarlas, ejecuta `scripts/observatorio-rentas/build-colonias-geo.sh 002 003 ...` desde una red con acceso al servidor de la SGIRPC y vuelve a generar la semilla.
