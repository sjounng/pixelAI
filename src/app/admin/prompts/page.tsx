import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/env";
import AdminPromptsClient from "./AdminPromptsClient";

export const metadata = { title: "프롬프트 관리 · PixelAI" };
export const dynamic = "force-dynamic";

export default async function AdminPromptsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/admin/prompts");
  }
  if (!isAdminEmail(session.user.email)) {
    notFound();
  }
  return <AdminPromptsClient />;
}
