import { Suspense } from "react";
import SignInClient from "./SignInClient";
import { isGoogleAuthConfigured } from "@/lib/env";

export const metadata = { title: "로그인 · PixelAI" };

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInClient googleEnabled={isGoogleAuthConfigured()} />
    </Suspense>
  );
}
