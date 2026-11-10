export type DataColumn<T> = {
  key: string
  header: string
  cell: (row: T) => React.ReactNode
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  caption,
}: {
  columns: DataColumn<T>[]
  rows: T[]
  caption?: string
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="cic-table">
        {caption ? <caption className="cic-muted" style={{ textAlign: 'left', paddingBottom: 8 }}>{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((c) => (
                <td key={c.key} data-label={c.header}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
