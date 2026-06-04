import SignUpClient from "./SignUpClient";
import { isGoogleAuthConfigured } from "@/lib/env";

export const metadata = { title: "회원가입 · PixelAI" };

export default function SignUpPage() {
  return <SignUpClient googleEnabled={isGoogleAuthConfigured()} />;
}
