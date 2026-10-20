import { OBS_BANNER, OBS_CALIBRATION_REFERENCES, OBS_INFLATION_12M_PCT, OBS_LEGAL_CAP_PCT, OBS_MIN_N, OBS_THRESHOLDS as T, OBS_VOLUNTARY_NOTE } from '@/lib/observatorio-rentas/config'

const S = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="obs-panel p-5"><h2 className="obs-label mb-3">{title}</h2><div className="space-y-2 text-sm leading-relaxed">{children}</div></section>
)
const pct = (x: number) => `${x.toLocaleString('es-MX')}%`

export default function Metodologia() {
  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div><p className="obs-label">Metodología</p><h1 className="obs-h text-2xl sm:text-3xl">Cómo se construyen las cifras</h1></div>
      <S title="Aviso de simulación"><p className="font-bold" style={{ color: '#F5B83D' }}>{OBS_BANNER}.</p><p>Todas las cifras de esta demostración salen de un archivo de semilla fijo (semilla determinista), por lo que se ven igual en cada presentación. No se leen ni se escriben datos reales de personas usuarias.</p></S>
      <S title="Fuentes previstas">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Rentas anunciadas</strong>: anuncios de portales inmobiliarios mediante licencia o convenio; mediana semanal y precio por m² por colonia y alcaldía.</li>
          <li><strong>Reportes anónimos de renovación</strong>: renta anterior, renta nueva, registro del contrato y nivel de certeza.</li>
          <li><strong>Pulso de propietarios</strong>: intenciones sobre renovación, precio de entrada, retiro de vivienda y renta de corto plazo, con nivel de certeza.</li>
          <li><strong>Renta de corto plazo</strong>: densidad de anuncios agregada por colonia (capa tipo Inside Airbnb), nunca por vivienda.</li>
          <li><strong>Inflación</strong>: INEGI (INPC); referencia de {pct(OBS_INFLATION_12M_PCT)} anual.</li>
        </ul>
      </S>
      <S title="Limpieza">
        <ul className="list-disc pl-5 space-y-1"><li>Deduplicación de anuncios repetidos o republicados.</li><li>Exclusión de valores atípicos (rentas fuera de rango plausible por colonia y tamaño).</li><li>Reportes: límites de envío, deduplicación por dispositivo, revisión de patrones y reporte por canal; si un canal pesa demasiado, se advierte.</li></ul>
      </S>
      <S title="Umbrales (archivo de configuración único)">
        <p>Tope legal para renovaciones 2026: <strong>{pct(OBS_LEGAL_CAP_PCT)}</strong>.</p>
        <ul className="list-none space-y-1.5">
          <li><span className="inline-block w-3 h-3 rounded-sm mr-2 align-middle" style={{ background: '#3DDC97' }} /><strong>Dentro del tope</strong>: mediana de aumento ≤ {T.withinMedianShareOfCap * 100}% del tope y menos de {T.withinMaxPctAbove}% de renovaciones por encima.</li>
          <li><span className="inline-block w-3 h-3 rounded-sm mr-2 align-middle" style={{ background: '#E8C547' }} /><strong>Cerca del límite</strong>: mediana entre {T.withinMedianShareOfCap * 100}% y 100% del tope, o entre {T.withinMaxPctAbove}% y {T.nearMaxPctAbove}% de renovaciones por encima.</li>
          <li><span className="inline-block w-3 h-3 rounded-sm mr-2 align-middle" style={{ background: '#E5604D' }} /><strong>Por encima del tope</strong>: mediana mayor al tope o más de {T.nearMaxPctAbove}% de renovaciones por encima.</li>
          <li><span className="inline-block w-3 h-3 rounded-sm mr-2 align-middle" style={{ background: '#4A555A' }} /><strong>Sin datos suficientes</strong>: menos de {OBS_MIN_N} reportes.</li>
          <li><span className="inline-block w-3 h-3 rounded-sm mr-2 align-middle" style={{ border: '2px solid #2BB3C0' }} /><strong>A vigilar</strong>: renta anunciada con alza mayor a {T.watchInflationMultiple}× la inflación en 12 meses o mayor a {T.watchChange4wPct}% en 4 semanas, sin importar el cumplimiento.</li>
        </ul>
      </S>
      <S title="Reglas de n"><p>Ninguna cifra basada en reportes se publica con menos de {OBS_MIN_N}; en su lugar se muestra «Muestra insuficiente (n&lt;25)». Cada cifra muestra su n y la leyenda «{OBS_VOLUNTARY_NOTE}». No se calcula margen de error sobre reportes voluntarios.</p></S>
      <S title="Lo que NO hacemos">
        <ul className="list-disc pl-5 space-y-1"><li>No hay registro ni lista de arrendadores.</li><li>No hay canal de quejas o denuncias contra personas.</li><li>No pedimos nombres, direcciones, teléfonos ni correos; la unidad mínima es la colonia.</li><li>No afirmamos representatividad estadística.</li><li>No usamos datos de portales en los que el equipo tenga interés comercial.</li></ul>
      </S>
      <S title="Referencias públicas usadas para calibrar la simulación"><ul className="list-disc pl-5 space-y-1">{OBS_CALIBRATION_REFERENCES.map((r) => <li key={r}>{r}</li>)}</ul><p className="obs-muted">Cuauhtémoc y Miguel Hidalgo usan el catálogo de colonias de la CDMX con polígonos; en las demás alcaldías la demostración usa un catálogo parcial de colonias.</p></S>
    </div>
  )
}
