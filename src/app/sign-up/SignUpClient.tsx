"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

interface Props {
  googleEnabled: boolean;
}

export default function SignUpClient({ googleEnabled }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const map: Record<string, string> = {
          invalid_email: "올바른 이메일을 입력해 주세요.",
          password_too_short: "비밀번호는 6자 이상이어야 합니다.",
          email_taken: "이미 사용 중인 이메일입니다."
        };
        setError(map[data.error] ?? "회원가입에 실패했습니다.");
        return;
      }
      // 자동 로그인
      const login = await signIn("credentials", {
        email,
        password,
        redirect: false
      });
      if (login?.ok) {
        window.location.href = "/generate";
      } else {
        setError("가입은 됐지만 자동 로그인에 실패했습니다. 로그인 페이지로 이동하세요.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm py-10">
      <div className="card space-y-4">
        <header>
          <h1 className="text-2xl font-extrabold">회원가입</h1>
          <p className="mt-1 text-xs text-gray-500">
            이미 계정이 있나요?{" "}
            <Link href="/sign-in" className="underline">로그인</Link>
          </p>
        </header>

        {googleEnabled && (
          <>
            <button
              onClick={() => signIn("google", { callbackUrl: "/generate" })}
              className="btn inline-flex w-full items-center justify-center gap-2"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-ink text-[10px] font-bold">
                G
              </span>
              Google로 계속하기
            </button>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="h-px flex-1 bg-gray-300" />
              또는
              <span className="h-px flex-1 bg-gray-300" />
            </div>
          </>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-bold">이름 (선택)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input mt-1"
              autoComplete="name"
            />
          </div>
          <div>
            <label className="text-xs font-bold">이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-1"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-bold">비밀번호 (6자 이상)</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mt-1"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-xs text-accent">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-accent w-full disabled:opacity-50"
          >
            {loading ? "가입 중…" : "회원가입"}
          </button>
        </form>
      </div>
    </div>
  );
}
