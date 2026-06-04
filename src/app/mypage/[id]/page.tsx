import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ArtworkDetailClient from "./ArtworkDetailClient";

export const metadata = { title: "작품 상세 · PixelAI" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ArtworkDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) {
    const { id } = await params;
    redirect(`/sign-in?callbackUrl=/mypage/${id}`);
  }
  const { id } = await params;
  return <ArtworkDetailClient artworkId={id} />;
}
