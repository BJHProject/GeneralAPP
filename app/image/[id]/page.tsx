import { ImageDetailClient } from "./image-detail-client"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ImageDetailPage({ params }: PageProps) {
  const { id } = await params
  return <ImageDetailClient imageId={id} />
}
