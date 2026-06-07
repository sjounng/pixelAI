"use client";

import { useEffect, useState } from "react";
import { IconSave, IconDelete } from "@/components/icons";
import { ProviderDot } from "@/components/ProviderTag";
import { PROVIDERS, Provider } from "@/lib/ai";

interface PromptItem {
  provider: Provider;
  default_prompt: string;
  override: {
    system_prompt: string;
    updated_at: string;
  } | null;
}

interface ProviderState {
  draft: string;
  saving: boolean;
  status: string | null;
}

const initialState: ProviderState = { draft: "", saving: false, status: null };

export default function AdminPromptsClient() {
  const [items, setItems] = useState<PromptItem[] | null>(null);
  const [states, setStates] = useState<Record<Provider, ProviderState>>({
    claude: { ...initialState },
    openai: { ...initialState },
    gemini: { ...initialState }
  });
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    const res = await fetch("/api/admin/prompts", { cache: "no-store" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setError("권한 없음 (admin 전용)");
      } else {
        setError(`불러오기 실패 [${res.status}] ${body.error ?? ""} ${body.detail ?? ""}`.trim());
      }
      return;
    }
    const data = await res.json();
    const list: PromptItem[] = data.items;
    setItems(list);
    setStates((prev) => {
      const next = { ...prev };
      for (const it of list) {
        next[it.provider] = {
          ...prev[it.provider],
          draft: it.override?.system_prompt ?? it.default_prompt
        };
      }
      return next;
    });
  };

  useEffect(() => {
    reload();
  }, []);

  const updateDraft = (p: Provider, value: string) => {
    setStates((prev) => ({
      ...prev,
      [p]: { ...prev[p], draft: value, status: null }
    }));
  };

  const save = async (p: Provider) => {
    const draft = states[p].draft;
    if (!draft.trim()) return;
    setStates((prev) => ({ ...prev, [p]: { ...prev[p], saving: true, status: null } }));
    const res = await fetch(`/api/admin/prompts/${p}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_prompt: draft })
    });
    if (res.ok) {
      setStates((prev) => ({ ...prev, [p]: { ...prev[p], saving: false, status: "저장됨" } }));
      reload();
    } else {
      const d = await res.json().catch(() => ({}));
      setStates((prev) => ({
        ...prev,
        [p]: { ...prev[p], saving: false, status: d.error || "저장 실패" }
      }));
    }
  };

  const resetToDefault = async (p: Provider) => {
    if (!confirm(`${p} 프롬프트를 코드 기본값으로 되돌릴까요? (내 오버라이드 삭제)`)) return;
    setStates((prev) => ({ ...prev, [p]: { ...prev[p], saving: true, status: null } }));
    const res = await fetch(`/api/admin/prompts/${p}`, { method: "DELETE" });
    if (res.ok) {
      setStates((prev) => ({ ...prev, [p]: { ...prev[p], saving: false, status: "기본값 복원" } }));
      reload();
    } else {
      setStates((prev) => ({ ...prev, [p]: { ...prev[p], saving: false, status: "삭제 실패" } }));
    }
  };

  const fillFromDefault = (p: Provider) => {
    const item = items?.find((i) => i.provider === p);
    if (!item) return;
    updateDraft(p, item.default_prompt);
  };

  if (error) {
    return <p className="text-sm text-accent">{error}</p>;
  }
  if (!items) {
    return <p className="text-sm text-gray-500">불러오는 중…</p>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold">프롬프트 관리</h1>
        <p className="mt-1 text-sm text-gray-600">
          여기서 저장한 프롬프트는 <b>본인 계정의 생성 호출에만</b> 적용됩니다 (다른 admin과 격리). 비워두면 코드 기본값이 사용됩니다.
        </p>
      </header>

      {items.map((it) => {
        const meta = PROVIDERS.find((p) => p.id === it.provider);
        const st = states[it.provider];
        const isOverridden = Boolean(it.override);
        const dirty = st.draft !== (it.override?.system_prompt ?? it.default_prompt);
        return (
          <section key={it.provider} className="card space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="inline-flex items-center gap-1.5 text-xl font-bold">
                {meta && <ProviderDot color={meta.color} />}
                {meta?.label ?? it.provider}
              </h2>
              <div className="text-xs text-gray-500">
                {isOverridden ? (
                  <>
                    <span className="rounded bg-amber-200 px-2 py-0.5 font-semibold text-amber-900">
                      내 오버라이드 사용 중
                    </span>{" "}
                    <span>({new Date(it.override!.updated_at).toLocaleString("ko-KR")})</span>
                  </>
                ) : (
                  <span className="rounded bg-gray-200 px-2 py-0.5 font-semibold text-gray-700">
                    코드 기본값 사용 중
                  </span>
                )}
              </div>
            </div>

            <textarea
              value={st.draft}
              onChange={(e) => updateDraft(it.provider, e.target.value)}
              spellCheck={false}
              className="input min-h-[400px] w-full font-mono text-xs leading-relaxed"
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => save(it.provider)}
                disabled={st.saving || !dirty || !st.draft.trim()}
                className="btn-accent inline-flex items-center gap-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconSave /> {st.saving ? "저장 중…" : "저장"}
              </button>
              <button
                onClick={() => fillFromDefault(it.provider)}
                disabled={st.saving}
                className="btn"
              >
                코드 기본값 불러오기
              </button>
              <button
                onClick={() => resetToDefault(it.provider)}
                disabled={st.saving || !isOverridden}
                className="btn inline-flex items-center gap-1 text-accent disabled:opacity-30"
              >
                <IconDelete /> 오버라이드 삭제
              </button>
              {st.status && <span className="text-xs text-gray-600">{st.status}</span>}
              <span className="ml-auto text-xs text-gray-400">
                {st.draft.length.toLocaleString()} chars
              </span>
            </div>
          </section>
        );
      })}
    </div>
  );
}
