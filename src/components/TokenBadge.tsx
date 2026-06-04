"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function TokenBadge() {
  const [balance, setBalance] = useState<number | null>(null);
  const [unlimited, setUnlimited] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/token", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setBalance(data.balance);
          setUnlimited(Boolean(data.unlimited));
        }
      } catch {
        /* ignore */
      }
    };
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const onUpdate = () => load();
    window.addEventListener("tokens:update", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("tokens:update", onUpdate);
    };
  }, []);

  return (
    <Link
      href="/shop"
      className="badge hover:bg-accent2 hover:text-ink"
      title={unlimited ? "테스트 모드 — 무제한" : "토큰 충전"}
    >
      <span aria-hidden>◆</span>
      <span className="tabular-nums">
        {unlimited ? "∞" : (balance ?? "—")}
      </span>
    </Link>
  );
}
