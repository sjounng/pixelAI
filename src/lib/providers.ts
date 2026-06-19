export type Provider = "claude";

export const PROVIDERS: { id: Provider; label: string; color: string }[] = [
  { id: "claude", label: "Claude", color: "#d97757" }
];

export function isProvider(value: unknown): value is Provider {
  return value === "claude";
}
