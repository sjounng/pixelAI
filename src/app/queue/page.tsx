import { redirect } from "next/navigation";
import QueueClient from "./QueueClient";
import { auth } from "@/auth";

export const metadata = { title: "대기열 · PixelAI" };

export default async function QueuePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/queue");
  }
  return <QueueClient />;
}
