import { copy } from '@/lib/ciceron/copy/es-MX'
import type { PartnerReportCourt } from '@/lib/ciceron/boletines/partner-report'

export function PartnerMorningReport({
  courts,
}: {
  courts: PartnerReportCourt[]
}) {
  if (courts.length === 0) {
    return (
      <p className="cic-muted">{copy.boletines.emptyHits}</p>
    )
  }

  return (
    <div>
      <p className="cic-muted" style={{ fontSize: '0.85rem', marginBottom: 12 }}>
        {copy.boletines.partnerLetterhead}
      </p>
      <p className="cic-bol-notice" role="note">
        {copy.boletines.informative}
      </p>
      {courts.map((court) => (
        <section key={court.courtName} className="cic-section" style={{ marginTop: 16 }}>
          <h3 className="cic-h2" style={{ fontSize: '1.05rem' }}>
            {court.courtName}
          </h3>
          <div className="cic-table-wrap">
            <table className="cic-table">
              <thead>
                <tr>
                  <th scope="col">{copy.boletines.partnerColActor}</th>
                  <th scope="col">{copy.boletines.partnerColDemandado}</th>
                  <th scope="col">{copy.boletines.partnerColExp}</th>
                  <th scope="col">{copy.boletines.partnerColJuicio}</th>
                  <th scope="col">{copy.boletines.partnerColSria}</th>
                  <th scope="col">{copy.boletines.partnerColPublicado}</th>
                  <th scope="col">{copy.boletines.partnerColActualizacion}</th>
                </tr>
              </thead>
              <tbody>
                {court.rows.map((r, i) => (
                  <tr key={`${r.expediente}-${i}`}>
                    <td>
                      {r.firmClientSide === 'actor' ? (
                        <strong title={copy.boletines.partnerClientMark}>{r.actor}</strong>
                      ) : (
                        r.actor
                      )}
                    </td>
                    <td>
                      {r.firmClientSide === 'demandado' ? (
                        <strong title={copy.boletines.partnerClientMark}>{r.demandado}</strong>
                      ) : (
                        r.demandado
                      )}
                    </td>
                    <td>{r.expediente}</td>
                    <td>{r.juicio}</td>
                    <td>{r.secretaria}</td>
                    <td>{r.publicado}</td>
                    <td>{r.actualizacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        <a className="cic-btn cic-btn-secondary" href="/api/ciceron/partner-report?format=docx">
          {copy.boletines.partnerExportDocx}
        </a>
        <a className="cic-btn cic-btn-secondary" href="/api/ciceron/partner-report?format=pdf">
          {copy.boletines.partnerExportPdf}
        </a>
      </p>
    </div>
  )
}
