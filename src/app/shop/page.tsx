import { redirect } from "next/navigation";
import ShopClient from "./ShopClient";
import { TOKEN_PACKAGES } from "@/lib/stripe";
import { auth } from "@/auth";

export const metadata = { title: "토큰 충전 · PixelAI" };

export default async function ShopPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/shop");
  }
  return <ShopClient packages={TOKEN_PACKAGES} />;
}
