"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PixelPreview from "@/components/PixelPreview";
import { WishlistSkeleton } from "@/components/Skeleton";
import { IconDownload, IconDelete, IconSave, IconClose, IconEdit } from "@/components/icons";
import Select from "@/components/Select";
import type { WishlistItem, WishlistFolder } from "@/types/api";

type SizeTab = 16 | 32;
// "all" = 전체, null = 폴더 없음, string = 폴더 id
type FolderFilter = "all" | null | string;

export default function WishlistClient() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [folders, setFolders] = useState<WishlistFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [building, setBuilding] = useState(false);
  const [tab, setTab] = useState<SizeTab>(16);
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const [newFolderName, setNewFolderName] = useState("");
  const [renameTarget, setRenameTarget] = useState<WishlistFolder | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const refresh = useCallback(async () => {
    const [wishRes, foldRes] = await Promise.all([
      fetch("/api/wishlist", { cache: "no-store" }),
      fetch("/api/wishlist/folders", { cache: "no-store" })
    ]);
    if (wishRes.ok) {
      const data = await wishRes.json();
      const next: WishlistItem[] = data.items ?? [];
      setItems(next);
      setSelected((prev) => {
        // 새 아이템은 자동 선택, 사라진 건 제거.
        const ids = new Set(next.map((a) => a.id));
        const merged = new Set<string>();
        prev.forEach((id) => {
          if (ids.has(id)) merged.add(id);
        });
        next.forEach((a) => {
          if (!prev.has(a.id)) merged.add(a.id);
        });
        return merged.size === 0 ? new Set(next.map((a) => a.id)) : merged;
      });
    }
    if (foldRes.ok) {
      const data = await foldRes.json();
      setFolders(data.folders ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = async (a: WishlistItem) => {
    const res = await fetch(`/api/wishlist/${a.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((x) => x.id !== a.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(a.id);
        return next;
      });
    }
  };

  const moveToFolder = async (artworkId: string, folderId: string | null) => {
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artworkId, folderId })
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((x) => (x.id === artworkId ? { ...x, folder_id: folderId } : x))
      );
    }
  };

  const createFolder = async () => {
    if (creatingFolder) return;
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingFolder(true);
    try {
      const res = await fetch("/api/wishlist/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        const data = await res.json();
        setFolders((prev) => [...prev, data.folder]);
        setNewFolderName("");
      }
    } finally {
      setCreatingFolder(false);
    }
  };

  const openRename = (folder: WishlistFolder) => {
    setRenameTarget(folder);
    setRenameDraft(folder.name);
  };

  const closeRename = () => {
    if (renameSaving) return;
    setRenameTarget(null);
    setRenameDraft("");
  };

  const submitRename = async () => {
    if (!renameTarget) return;
    const next = renameDraft.trim();
    if (!next || next === renameTarget.name) {
      closeRename();
      return;
    }
    setRenameSaving(true);
    try {
      const res = await fetch(`/api/wishlist/folders/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: next })
      });
      if (res.ok) {
        setFolders((prev) =>
          prev.map((f) => (f.id === renameTarget.id ? { ...f, name: next } : f))
        );
        setRenameTarget(null);
        setRenameDraft("");
      }
    } finally {
      setRenameSaving(false);
    }
  };

  const deleteFolder = async (folder: WishlistFolder) => {
    if (!confirm(`"${folder.name}" 폴더를 삭제할까요? 안에 있던 작품은 기본(폴더 없음)으로 이동합니다.`))
      return;
    const res = await fetch(`/api/wishlist/folders/${folder.id}`, { method: "DELETE" });
    if (res.ok) {
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
      setItems((prev) =>
        prev.map((x) => (x.folder_id === folder.id ? { ...x, folder_id: null } : x))
      );
      if (folderFilter === folder.id) setFolderFilter("all");
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tabItems = useMemo(() => items.filter((a) => a.size === tab), [items, tab]);

  const filteredItems = useMemo(() => {
    if (folderFilter === "all") return tabItems;
    if (folderFilter === null) return tabItems.filter((a) => a.folder_id === null);
    return tabItems.filter((a) => a.folder_id === folderFilter);
  }, [tabItems, folderFilter]);

  const selectedItems = useMemo(
    () => filteredItems.filter((a) => selected.has(a.id)),
    [filteredItems, selected]
  );

  const counts = useMemo(() => {
    let c16 = 0;
    let c32 = 0;
    for (const a of items) {
      if (a.size === 16) c16++;
      else if (a.size === 32) c32++;
    }
    return { 16: c16, 32: c32 };
  }, [items]);

  const folderCountsInTab = useMemo(() => {
    const map = new Map<string | null, number>();
    map.set(null, 0);
    for (const f of folders) map.set(f.id, 0);
    for (const a of tabItems) {
      map.set(a.folder_id, (map.get(a.folder_id) ?? 0) + 1);
    }
    return map;
  }, [tabItems, folders]);

  const selectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      filteredItems.forEach((a) => next.add(a.id));
      return next;
    });
  };

  const clearAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      filteredItems.forEach((a) => next.delete(a.id));
      return next;
    });
  };

  const buildSprite = async () => {
    if (selectedItems.length === 0 || building) return;
    setBuilding(true);
    try {
      const cell = tab;
      const cols = Math.ceil(Math.sqrt(selectedItems.length));
      const rows = Math.ceil(selectedItems.length / cols);

      const canvas = document.createElement("canvas");
      canvas.width = cell * cols;
      canvas.height = cell * rows;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      selectedItems.forEach((art, idx) => {
        const cx = (idx % cols) * cell;
        const cy = Math.floor(idx / cols) * cell;
        for (let y = 0; y < art.size; y++) {
          const row = art.pixel_data[y] ?? [];
          for (let x = 0; x < art.size; x++) {
            const c = row[x];
            if (!c || c === "transparent") continue;
            ctx.fillStyle = c;
            ctx.fillRect(cx + x, cy + y, 1, 1);
          }
        }
      });

      const link = document.createElement("a");
      link.download = `pixelai-sprite-${cell}px-${cols}x${rows}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setBuilding(false);
    }
  };

  if (loading) {
    return <WishlistSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="card text-center text-sm text-gray-600">
        위시리스트가 비어 있습니다. 갤러리나 마이페이지에서 별을 눌러 작품을 추가해보세요.
      </div>
    );
  }

  const cols = Math.ceil(Math.sqrt(selectedItems.length || 1));
  const rows = Math.ceil((selectedItems.length || 1) / cols);

  const sizeBtn = (active: boolean) =>
    "btn text-xs " + (active ? "bg-ink text-paper" : "");

  const folderBtn = (active: boolean) =>
    "btn w-full justify-between px-2 py-1.5 text-xs " +
    (active ? "bg-ink text-paper" : "");

  return (
    <div className="space-y-4">
      <header className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">위시리스트</h1>
            <p className="text-xs text-gray-600">
              {tab}×{tab} 탭 · 선택 {selectedItems.length}개 / 보이는 항목 {filteredItems.length}개
              · 스프라이트 격자 {cols}×{rows}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={selectAllVisible} className="btn text-xs">전체 선택</button>
            <button onClick={clearAllVisible} className="btn text-xs">전체 해제</button>
            <button
              onClick={buildSprite}
              disabled={selectedItems.length === 0 || building}
              className="btn-accent inline-flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <IconDownload /> {building ? "생성 중…" : "스프라이트 시트 다운로드"}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab(16)} className={sizeBtn(tab === 16)}>
            16×16 ({counts[16]})
          </button>
          <button onClick={() => setTab(32)} className={sizeBtn(tab === 32)}>
            32×32 ({counts[32]})
          </button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        {/* 폴더 사이드바 */}
        <aside className="card space-y-2">
          <p className="text-xs font-bold uppercase text-gray-500">폴더</p>
          <button
            onClick={() => setFolderFilter("all")}
            className={folderBtn(folderFilter === "all")}
          >
            <span>전체</span>
            <span className="text-[10px] opacity-70">{tabItems.length}</span>
          </button>
          <button
            onClick={() => setFolderFilter(null)}
            className={folderBtn(folderFilter === null)}
          >
            <span>기본 (없음)</span>
            <span className="text-[10px] opacity-70">{folderCountsInTab.get(null) ?? 0}</span>
          </button>
          {folders.map((f) => {
            const active = folderFilter === f.id;
            return (
              <div key={f.id} className="group relative">
                <button
                  onClick={() => setFolderFilter(f.id)}
                  className={folderBtn(active)}
                >
                  <span className="truncate">{f.name}</span>
                  <span className="ml-1 text-[10px] opacity-70">
                    {folderCountsInTab.get(f.id) ?? 0}
                  </span>
                </button>
                <div
                  className="pointer-events-none absolute right-full top-0 bottom-0 z-10 flex items-stretch gap-1 pr-1 translate-x-3 opacity-0 transition-all duration-300 ease-out group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openRename(f);
                    }}
                    className="btn inline-flex items-center px-1.5 py-0.5 text-[10px]"
                    title="이름 변경"
                    aria-label="폴더 이름 변경"
                  >
                    <IconEdit />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFolder(f);
                    }}
                    className="btn inline-flex items-center px-1.5 py-0.5 text-[10px]"
                    title="삭제"
                    aria-label="폴더 삭제"
                  >
                    <IconClose />
                  </button>
                </div>
              </div>
            );
          })}
          <div className="flex gap-1 pt-1">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="새 폴더"
              maxLength={40}
              onKeyDown={(e) => {
                if (e.key === "Enter") createFolder();
              }}
              className="input flex-1 px-2 py-1 text-xs"
            />
            <button
              onClick={createFolder}
              disabled={creatingFolder || !newFolderName.trim()}
              className="btn px-2 py-1 text-xs disabled:opacity-50"
            >
              +
            </button>
          </div>
        </aside>

        {/* 작품 그리드 */}
        <main>
          {filteredItems.length === 0 ? (
            <div className="card text-center text-sm text-gray-600">
              이 폴더 / 사이즈에 해당하는 작품이 없습니다.
            </div>
          ) : (
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4">
              {filteredItems.map((a) => {
                const isSelected = selected.has(a.id);
                const folderName =
                  a.folder_id === null
                    ? "기본"
                    : folders.find((f) => f.id === a.folder_id)?.name ?? "—";
                return (
                  <article
                    key={a.id}
                    className={
                      "card cursor-pointer transition-all " +
                      (isSelected ? "ring-4 ring-accent" : "hover:ring-2 hover:ring-ink/30")
                    }
                    onClick={() => toggleSelect(a.id)}
                  >
                    <div className="relative">
                      <PixelPreview pixels={a.pixel_data} size={a.size} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-gray-700">{a.prompt}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="text-gray-400">{a.size}×{a.size}</span>
                      <span className="truncate text-gray-500" title={folderName}>
                        {folderName}
                      </span>
                    </div>
                    <div
                      className="mt-2 flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Select
                        className="flex-1"
                        value={a.folder_id ?? ""}
                        onChange={(v) => moveToFolder(a.id, v === "" ? null : v)}
                        options={[
                          { value: "", label: "기본 (없음)" },
                          ...folders.map((f) => ({ value: f.id, label: f.name }))
                        ]}
                      />
                      <button
                        onClick={() => remove(a)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-md border-2 border-ink bg-paper px-2 py-1 text-[11px] shadow-pixel"
                      >
                        <IconDelete /> 제거
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </main>
      </div>

      {renameTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={closeRename}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="card w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-bold">폴더 이름 변경</h3>
              <p className="text-xs text-gray-500">
                현재 이름: <span className="font-medium">{renameTarget.name}</span>
              </p>
            </div>
            <input
              type="text"
              autoFocus
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename();
                else if (e.key === "Escape") closeRename();
              }}
              maxLength={40}
              className="input"
              placeholder="새 폴더 이름"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={closeRename}
                disabled={renameSaving}
                className="btn text-xs"
              >
                취소
              </button>
              <button
                onClick={submitRename}
                disabled={
                  renameSaving ||
                  !renameDraft.trim() ||
                  renameDraft.trim() === renameTarget.name
                }
                className="btn-accent inline-flex items-center gap-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconSave /> {renameSaving ? "저장 중…" : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
