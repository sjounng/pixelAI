


import Stripe from "stripe";
import { env } from "@/lib/env";

let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  if (_stripe) return _stripe;
  _stripe = new Stripe(env.stripeSecretKey(), {
    apiVersion: "2025-02-24.acacia"
  });
  return _stripe;
}

export interface TokenPackage {
  id: string;
  label: string;
  tokens: number;
  priceKrw: number;
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  { id: "starter",  label: "스타터",  tokens: 100,   priceKrw: 1900 },
  { id: "basic",    label: "베이직",  tokens: 500,   priceKrw: 7900 },
  { id: "pro",      label: "프로",    tokens: 2000,  priceKrw: 24900 },
  { id: "studio",   label: "스튜디오", tokens: 10000, priceKrw: 99000 }
];

export function getPackage(id: string): TokenPackage | undefined {
  return TOKEN_PACKAGES.find((p) => p.id === id);
}
