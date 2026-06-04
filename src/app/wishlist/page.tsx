import { redirect } from "next/navigation";
import WishlistClient from "./WishlistClient";
import { auth } from "@/auth";

export const metadata = { title: "위시리스트 · PixelAI" };

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/wishlist");
  }
  return <WishlistClient />;
}
