import { redirect } from "next/navigation";
import GenerateClient from "./GenerateClient";
import { auth } from "@/auth";
import { isProviderConfigured, isAdminEmail, env } from "@/lib/env";
import { PROVIDERS, Provider } from "@/lib/ai";

export const metadata = { title: "생성기 · PixelAI" };

export default async function GeneratePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/generate");
  }
  const available: Provider[] = PROVIDERS.map((p) => p.id).filter((id) =>
    isProviderConfigured(id)
  );
  const isAdmin = isAdminEmail(session.user.email);
  return (
    <GenerateClient
      available={available}
      isAdmin={isAdmin}
      webSearchAvailable={env.webSearchEnabled()}
    />
  );
}
