import { Ficha } from '../../_components/Ficha'

export default async function FichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <Ficha id={id} />
}
