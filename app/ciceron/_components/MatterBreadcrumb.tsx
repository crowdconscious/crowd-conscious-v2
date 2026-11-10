export function MatterBreadcrumb({ client, matter }: { client: string; matter: string }) {
  return (
    <p className="cic-breadcrumb">
      {client} <span aria-hidden> / </span> <strong>{matter}</strong>
    </p>
  )
}
