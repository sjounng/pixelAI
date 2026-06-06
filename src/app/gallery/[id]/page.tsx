import GalleryDetailClient from "./GalleryDetailClient";

export const metadata = { title: "작품 상세 · 갤러리 · PixelAI" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GalleryDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <GalleryDetailClient artworkId={id} />;
}
