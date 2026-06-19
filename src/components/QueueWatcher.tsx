"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconClose } from "@/components/icons";

interface QueueItem {
  id: string;
  prompt: string;
  status: "pending" | "completed" | "failed";
}

/**
 * 화면 우측에 떠서 진행 중인 생성 대기열을 실시간으로 보여주는 패널.
 * 단일 SSE 구독으로 동작하며, 펜딩 개수를 "queue:status" 이벤트로 브로드캐스트해
 * 네비게이션의 대기열(N) 카운트와 공유한다.
 * 다른 곳(생성기)에서 "queue:poke"를 쏘면 즉시 갱신 + 패널을 다시 띄운다.
 */
export default function QueueWatcher() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [keepUntil, setKeepUntil] = useState(0);
  const prevPendingRef = useRef(0);

  const applyQueue = useCallback((data: { items?: unknown[] }) => {
    const list: QueueItem[] = (data.items ?? []).map(
      (i) => {
        const item = i as { id: string; prompt: string; status: QueueItem["status"] };
        return {
          id: item.id,
          prompt: item.prompt,
          status: item.status
        };
      }
    );
    setItems(list);
    const pending = list.filter((i) => i.status === "pending").length;
    window.dispatchEvent(new CustomEvent("queue:status", { detail: { pending } }));
    // 펜딩이 막 0이 되면 완료 결과를 잠깐 더 보여준다.
    if (prevPendingRef.current > 0 && pending === 0) {
      setKeepUntil(Date.now() + 5000);
    }
    prevPendingRef.current = pending;
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/generate/queue", { cache: "no-store" });
      if (!res.ok) {
        setItems([]);
        window.dispatchEvent(new CustomEvent("queue:status", { detail: { pending: 0 } }));
        return;
      }
      const data = await res.json();
      applyQueue(data);
    } catch {
      // EventSource 재연결 또는 다음 사용자 액션에서 복구.
    }
  }, [applyQueue]);

  useEffect(() => {
    void fetchQueue();
    const events = new EventSource("/api/generate/events");
    events.addEventListener("queue", (event) => {
      try {
        applyQueue(JSON.parse(event.data));
      } catch {
        // 손상된 이벤트는 무시하고 연결을 유지.
      }
    });
    events.onerror = () => {
      if (!document.hidden) void fetchQueue();
    };
    const onPoke = () => {
      setDismissed(false);
      void fetchQueue();
    };
    window.addEventListener("queue:poke", onPoke);
    return () => {
      events.close();
      window.removeEventListener("queue:poke", onPoke);
    };
  }, [applyQueue, fetchQueue]);

  const pending = items.filter((i) => i.status === "pending").length;
  const keep = keepUntil > Date.now();
  const visible = (pending > 0 || keep) && !dismissed;

  if (!visible) return null;

  const shown = items.slice(0, 6);

  return (
    <div className="anim-slide-right fixed right-4 top-20 z-40 w-72 max-w-[calc(100vw-2rem)] rounded-md border-2 border-ink bg-paper shadow-pixel">
      <div className="flex items-center justify-between border-b-2 border-ink px-3 py-2">
        <p className="text-sm font-bold">
          대기열 {pending > 0 ? `· ${pending}개 제작 중` : "· 완료"}
        </p>
        <button onClick={() => setDismissed(true)} aria-label="닫기" className="hover:text-accent">
          <IconClose />
        </button>
      </div>

      <ul className="max-h-72 overflow-y-auto">
        {shown.map((it) => (
          <li key={it.id} className="flex items-center gap-2 border-b border-ink/10 px-3 py-2 text-xs">
            <StatusDot status={it.status} />
            <span className="line-clamp-1 flex-1" title={it.prompt}>
              {it.prompt}
            </span>
            <span className="shrink-0 text-gray-500">{label(it.status)}</span>
          </li>
        ))}
      </ul>

      <Link
        href="/queue"
        className="block border-t-2 border-ink px-3 py-2 text-center text-xs font-semibold hover:bg-ink/5"
      >
        전체 보기 →
      </Link>
    </div>
  );
}

function label(s: QueueItem["status"]): string {
  return s === "pending" ? "제작 중" : s === "completed" ? "완료" : "실패";
}

function StatusDot({ status }: { status: QueueItem["status"] }) {
  const color =
    status === "completed" ? "bg-emerald-500" : status === "failed" ? "bg-accent" : "bg-amber-400";
  return (
    <span
      className={
        "h-2.5 w-2.5 shrink-0 rounded-full border border-ink " +
        color +
        (status === "pending" ? " animate-pulse" : "")
      }
    />
  );
}
