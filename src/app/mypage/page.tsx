import { redirect } from "next/navigation";
import MyPageClient from "./MyPageClient";
import { auth } from "@/auth";

export const metadata = { title: "마이페이지 · PixelAI" };

export default async function MyPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/mypage");
  }
  return <MyPageClient />;
}
