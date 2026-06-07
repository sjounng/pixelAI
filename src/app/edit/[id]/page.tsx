import { redirect } from "next/navigation";
import EditClient from "./EditClient";
import { auth } from "@/auth";

export const metadata = { title: "수정 · PixelAI" };

export default async function EditPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/mypage");
  }
  const { id } = await params;
  return <EditClient artworkId={id} />;
}
