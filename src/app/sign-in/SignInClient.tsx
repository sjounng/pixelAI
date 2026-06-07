"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

interface Props {
  googleEnabled: boolean;
}

export default function SignInClient({ googleEnabled }: Props) {
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl") ?? "/generate";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl
    });
    setLoading(false);
    if (res?.error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }
    if (res?.ok) {
      window.location.href = callbackUrl;
    }
  };

  return (
    <div className="mx-auto max-w-sm py-10">
      <div className="card space-y-4">
        <header>
          <h1 className="text-2xl font-extrabold">로그인</h1>
          <p className="mt-1 text-xs text-gray-500">
            계정이 없으신가요?{" "}
            <Link href="/sign-up" className="underline">회원가입</Link>
          </p>
        </header>

        {googleEnabled && (
          <>
            <button
              onClick={() => signIn("google", { callbackUrl })}
              className="btn w-full"
            >
              <span className="mr-2">🔵</span> Google로 계속하기
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
            <label className="text-xs font-bold">비밀번호</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mt-1"
              autoComplete="current-password"
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
            {loading ? "로그인 중…" : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
