import { redirect } from "next/navigation";
import ConvertClient from "./ConvertClient";
import { auth } from "@/auth";

export const metadata = { title: "변환기 · PixelAI" };

export default async function ConvertPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/convert");
  }
  return <ConvertClient />;
}
