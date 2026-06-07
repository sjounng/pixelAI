"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck } from "@/components/icons";

interface Folder {
  id: string;
  name: string;
}

interface Props {
  artworkId: string;
  // 현재 위시에 있을 경우 폴더 id (없으면 null). 위시 아니면 undefined.
  initialFolderId?: string | null | undefined;
  className?: string;
}

// 모든 별표 컴포넌트가 폴더 목록을 공유하도록 모듈 레벨 캐시.
let foldersCache: Folder[] | null = null;
let foldersPromise: Promise<Folder[]> | null = null;
const subscribers = new Set<(f: Folder[]) => void>();

function notifyAll(folders: Folder[]) {
  foldersCache = folders;
  subscribers.forEach((cb) => cb(folders));
}

async function fetchFolders(): Promise<Folder[]> {
  if (foldersCache) return foldersCache;
  if (!foldersPromise) {
    foldersPromise = fetch("/api/wishlist/folders", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { folders: [] }))
      .then((d) => (d.folders as Folder[]) ?? [])
      .finally(() => {
        foldersPromise = null;
      });
  }
  const result = await foldersPromise;
  foldersCache = result;
  return result;
}

export default function WishlistStar({ artworkId, initialFolderId, className }: Props) {
  const [folderId, setFolderId] = useState<string | null | undefined>(initialFolderId);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>(foldersCache ?? []);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  const active = folderId !== undefined;

  // 폴더 캐시 구독.
  useEffect(() => {
    const cb = (f: Folder[]) => setFolders(f);
    subscribers.add(cb);
    return () => {
      subscribers.delete(cb);
    };
  }, []);

  // 팝오버 외부 클릭 시 닫기.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const openMenu = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen((v) => !v);
    if (!foldersCache) {
      const list = await fetchFolders();
      setFolders(list);
    }
  };

  const assignFolder = async (target: string | null) => {
    if (pending) return;
    setPending(true);
    const prev = folderId;
    setFolderId(target); // optimistic
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artworkId, folderId: target })
      });
      if (!res.ok) setFolderId(prev);
    } catch {
      setFolderId(prev);
    } finally {
      setPending(false);
      setOpen(false);
    }
  };

  const removeWish = async () => {
    if (pending) return;
    setPending(true);
    const prev = folderId;
    setFolderId(undefined); // optimistic
    try {
      const res = await fetch(`/api/wishlist/${artworkId}`, { method: "DELETE" });
      if (!res.ok) setFolderId(prev);
    } catch {
      setFolderId(prev);
    } finally {
      setPending(false);
      setOpen(false);
    }
  };

  const createAndAssign = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/wishlist/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (!res.ok) return;
      const data = await res.json();
      const folder: Folder = data.folder;
      const nextList = [...folders, folder];
      notifyAll(nextList);
      setNewName("");
      await assignFolder(folder.id);
    } finally {
      setCreating(false);
    }
  };

  const currentFolderName =
    folderId === null
      ? "기본 (폴더 없음)"
      : folders.find((f) => f.id === folderId)?.name ?? null;

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={openMenu}
        aria-label={active ? "위시 폴더 변경" : "위시에 추가"}
        title={
          active
            ? `위시 폴더: ${currentFolderName ?? "기본"}`
            : "위시에 추가"
        }
        style={{
          // 블러 없는 1px 검정 외곽선 — 픽셀/레트로 테두리 톤과 통일.
          textShadow:
            "1px 1px 0 #1a1a1a, -1px 1px 0 #1a1a1a, 1px -1px 0 #1a1a1a, -1px -1px 0 #1a1a1a"
        }}
        className={
          "text-lg leading-none transition-transform hover:scale-110 " +
          (active ? "text-amber-400" : "text-paper hover:text-amber-200") +
          (className ? " " + className : "")
        }
      >
        {active ? "★" : "☆"}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-1 w-56 rounded-md border-2 border-ink bg-paper p-2 text-xs shadow-pixel"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-1 font-semibold text-gray-700">
            {active ? "폴더 변경" : "폴더에 추가"}
          </p>
          <ul className="max-h-40 space-y-1 overflow-y-auto">
            <li>
              <button
                onClick={() => assignFolder(null)}
                disabled={pending}
                className={
                  "flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-ink/5 " +
                  (folderId === null ? "bg-amber-100 font-semibold" : "")
                }
              >
                <span>기본 (폴더 없음)</span>
                {folderId === null && <IconCheck />}
              </button>
            </li>
            {folders.map((f) => (
              <li key={f.id}>
                <button
                  onClick={() => assignFolder(f.id)}
                  disabled={pending}
                  className={
                    "flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-ink/5 " +
                    (folderId === f.id ? "bg-amber-100 font-semibold" : "")
                  }
                >
                  <span className="truncate">{f.name}</span>
                  {folderId === f.id && <IconCheck />}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-1 border-t border-dashed border-ink pt-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="새 폴더 이름"
              maxLength={40}
              className="input flex-1 px-2 py-1 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") createAndAssign();
              }}
            />
            <button
              onClick={createAndAssign}
              disabled={!newName.trim() || creating}
              className="btn px-2 py-1 text-xs disabled:opacity-50"
            >
              {creating ? "…" : "+추가"}
            </button>
          </div>
          {active && (
            <button
              onClick={removeWish}
              disabled={pending}
              className="mt-2 w-full rounded px-2 py-1 text-xs text-accent hover:bg-accent/10"
            >
              위시에서 제거
            </button>
          )}
        </div>
      )}
    </div>
  );
}
