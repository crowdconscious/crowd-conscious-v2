'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { copy } from '@/lib/ciceron/copy/es-MX'
import type { FirmWeekRow, MetricsDashboard } from '@/lib/ciceron/engagement/metrics-types'

function Sample({ n }: { n: number }) {
  return (
    <span className="cic-muted" style={{ fontSize: '0.75rem', marginLeft: 6 }}>
      ({copy.adminMetricas.sampleSize}={n})
    </span>
  )
}

function IndicatorTable({ rows }: { rows: FirmWeekRow[] }) {
  return (
    <div className="cic-table-wrap">
      <table className="cic-table">
        <thead>
          <tr>
            <th>{copy.adminMetricas.firm}</th>
            <th>{copy.adminMetricas.week}</th>
            <th>{copy.adminMetricas.activation}</th>
            <th>{copy.adminMetricas.habit}</th>
            <th>{copy.adminMetricas.alertPrecision}</th>
            <th>{copy.adminMetricas.reviewTurnaround}</th>
            <th>{copy.adminMetricas.valueMoments}</th>
            <th>{copy.adminMetricas.expansion}</th>
            <th>{copy.adminMetricas.cost}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.firmId}-${r.weekStart}`}>
              <td>{r.firmName}</td>
              <td>{r.weekStart}</td>
              <td>
                {r.activation.display}
                <Sample n={r.activation.sampleSize} />
              </td>
              <td>
                {r.habit.display}
                <Sample n={r.habit.sampleSize} />
              </td>
              <td>
                {r.alertPrecision.display}
                <Sample n={r.alertPrecision.sampleSize} />
              </td>
              <td>
                {r.reviewTurnaround.display}
                <Sample n={r.reviewTurnaround.sampleSize} />
              </td>
              <td>
                {r.valueMoments.display}
                <Sample n={r.valueMoments.sampleSize} />
              </td>
              <td>{r.expansion.display}</td>
              <td>
                {r.cost.display}
                <Sample n={r.cost.sampleSize} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function MetricasClient({ data }: { data: MetricsDashboard }) {
  const demoFirm = data.byFirm.filter((r) =>
    r.firmName.toLowerCase().includes('demo')
  )
  const trendSource = demoFirm.length ? demoFirm : data.byFirm
  const costTrend = [...trendSource]
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .map((r) => ({
      week: r.weekStart.slice(5),
      cost: typeof r.cost.value === 'number' ? r.cost.value : 0,
      valueMoments:
        typeof r.valueMoments.value === 'number' ? r.valueMoments.value : 0,
      habit:
        typeof r.habit.value === 'number' ? Number((r.habit.value * 100).toFixed(0)) : 0,
    }))

  return (
    <div>
      <p className="cic-muted" style={{ fontSize: '0.85rem' }}>
        {data.source === 'fixture'
          ? copy.adminMetricas.demoSource
          : copy.adminMetricas.schemaSource}
        {' · '}
        {copy.adminMetricas.dashHint}
      </p>

      <section className="cic-section" aria-labelledby="metricas-overall">
        <h2 id="metricas-overall" className="cic-h2">
          {copy.adminMetricas.overall}
        </h2>
        <IndicatorTable rows={[data.overall]} />
      </section>

      <section className="cic-section" aria-labelledby="metricas-trend">
        <h2 id="metricas-trend" className="cic-h2">
          {copy.adminMetricas.weeklyTrend}
        </h2>
        <div className="cic-metric-charts">
          <div className="cic-metric-chart">
            <h3 className="cic-h2" style={{ fontSize: '0.95rem' }}>
              {copy.adminMetricas.cost}
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={costTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="#3ecf9a"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="cic-metric-chart">
            <h3 className="cic-h2" style={{ fontSize: '0.95rem' }}>
              {copy.adminMetricas.valueMoments}
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={costTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="valueMoments" fill="#3ecf9a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="cic-section" aria-labelledby="metricas-firms">
        <h2 id="metricas-firms" className="cic-h2">
          {copy.adminMetricas.byFirm}
        </h2>
        <IndicatorTable rows={data.byFirm} />
      </section>
    </div>
  )
}
