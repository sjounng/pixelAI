"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IconCharge } from "@/components/icons";
import type { TokenPackage } from "@/lib/token-packages";

interface Props {
  packages: TokenPackage[];
}

export default function ShopClient({ packages }: Props) {
  const search = useSearchParams();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/token", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setBalance(d.balance))
      .catch(() => undefined);
  }, []);

  const status = search.get("status");

  const buy = async (id: string) => {
    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch("/api/payment/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: id })
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "결제 세션을 생성할 수 없습니다.");
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold">토큰 충전</h1>
        <p className="mt-1 text-sm text-gray-600">
          현재 잔액: <span className="font-bold tabular-nums">◆ {balance ?? "—"}</span>
        </p>
      </header>

      {status === "success" && (
        <div className="card border-emerald-500 bg-emerald-50">
          <p className="font-semibold">결제가 완료되었습니다!</p>
          <p className="text-sm text-gray-600">
            웹훅으로 토큰이 지급되며 잠시 후 잔액에 반영됩니다.
          </p>
        </div>
      )}
      {status === "cancel" && (
        <div className="card border-amber-500 bg-amber-50">
          <p className="text-sm">결제가 취소되었습니다.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {packages.map((p) => (
          <div key={p.id} className="card flex flex-col">
            <p className="text-sm font-bold uppercase text-gray-500">{p.label}</p>
            <p className="mt-2 text-3xl font-extrabold">◆ {p.tokens.toLocaleString()}</p>
            <p className="mt-1 text-sm text-gray-600">
              ₩{p.priceKrw.toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] text-gray-500">
              ≈ {Math.round((p.priceKrw / p.tokens) * 10) / 10}원/토큰
            </p>
            <button
              onClick={() => buy(p.id)}
              disabled={loadingId === p.id}
              className="btn-primary mt-3 inline-flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <IconCharge /> {loadingId === p.id ? "준비 중…" : "구매하기"}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-accent">{error}</p>
      )}

      <footer className="card text-xs text-gray-600">
        <p className="font-bold">결제 안내</p>
        <ul className="ml-4 mt-1 list-disc">
          <li>Stripe Checkout으로 안전하게 결제됩니다.</li>
          <li>결제 완료 후 토큰은 자동 지급됩니다.</li>
          <li>1픽셀 = 16×16 기준 10토큰 / 32×32 기준 25토큰입니다.</li>
        </ul>
      </footer>
    </div>
  );
}
