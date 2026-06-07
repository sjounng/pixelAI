"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * "대기열(N)" 네비 링크. QueueWatcher가 브로드캐스트하는 "queue:status"
 * 이벤트의 펜딩 개수를 받아 표시(별도 폴링 없음).
 */
export default function QueueNavLink({ className = "" }: { className?: string }) {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const onStatus = (e: Event) => {
      const detail = (e as CustomEvent).detail as { pending?: number } | undefined;
      setPending(detail?.pending ?? 0);
    };
    window.addEventListener("queue:status", onStatus);
    return () => window.removeEventListener("queue:status", onStatus);
  }, []);

  return (
    <Link href="/queue" className={className}>
      대기열{pending > 0 ? `(${pending})` : ""}
    </Link>
  );
}
