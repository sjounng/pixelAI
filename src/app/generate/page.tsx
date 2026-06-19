import { redirect } from "next/navigation";
import GenerateClient from "./GenerateClient";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/env";
import { PROVIDERS, Provider } from "@/lib/providers";

export const metadata = { title: "생성기 · PixelAI" };

export default async function GeneratePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/generate");
  }
  const available: Provider[] = PROVIDERS.map((p) => p.id);
  const isAdmin = isAdminEmail(session.user.email);
  const webSearchAvailable = /^(1|true|yes|on)$/i.test(
    process.env.NEXT_PUBLIC_ANTHROPIC_WEB_SEARCH ?? process.env.ANTHROPIC_WEB_SEARCH ?? ""
  );
  return (
    <GenerateClient
      available={available}
      isAdmin={isAdmin}
      webSearchAvailable={webSearchAvailable}
    />
  );
}
