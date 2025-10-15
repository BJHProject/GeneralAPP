import { ImageDetailClient } from "./image-detail-client"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ImageDetailPage(props: PageProps) {
  const params = await props.params
  const { id } = params
  return <ImageDetailClient imageId={id} />
}
