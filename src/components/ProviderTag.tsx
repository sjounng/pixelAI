import { PROVIDERS } from "@/lib/ai";

export function ProviderDot({ color, className = "" }: { color: string; className?: string }) {
  return (
    <span
      className={"inline-block h-3 w-3 shrink-0 rounded-full border border-ink align-middle " + className}
      style={{ backgroundColor: color }}
    />
  );
}

/** 색 도트 + 프로바이더 이름. provider="human"은 도트 없이 "사람 제작". */
export default function ProviderTag({
  provider,
  className = ""
}: {
  provider: string;
  className?: string;
}) {
  if (provider === "human") {
    return <span className={className}>사람 제작</span>;
  }
  const p = PROVIDERS.find((x) => x.id === provider);
  return (
    <span className={"inline-flex items-center gap-1 " + className}>
      {p && <ProviderDot color={p.color} />}
      {p?.label ?? provider}
    </span>
  );
}
