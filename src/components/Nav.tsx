import Link from "next/link";
import { auth, signOut } from "@/auth";
import TokenBadge from "@/components/TokenBadge";
import Logo from "@/components/Logo";
import { isAdminEmail } from "@/lib/env";

export default async function Nav() {
  const session = await auth();
  const user = session?.user;
  const isAdmin = isAdminEmail(user?.email);

  return (
    <header className="border-b-2 border-ink bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-extrabold tracking-tight">
          <Logo size={32} className="rounded-sm border-2 border-ink shadow-pixel" />
          PixelAI
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium md:flex">
          <Link href="/generate" className="hover:text-accent">생성기</Link>
          {user && (
            <Link href="/queue" className="hover:text-accent">대기열</Link>
          )}
          <Link href="/gallery"  className="hover:text-accent">갤러리</Link>
          <Link href="/shop"     className="hover:text-accent">토큰 충전</Link>
          <Link href="/mypage"   className="hover:text-accent">마이페이지</Link>
          {user && (
            <Link href="/wishlist" className="hover:text-accent">위시리스트</Link>
          )}
          {isAdmin && (
            <Link
              href="/admin/prompts"
              className="rounded-sm border-2 border-ink bg-amber-200 px-2 py-0.5 text-xs font-bold hover:bg-amber-300"
              title="admin 전용 — 프롬프트 편집"
            >
              ⚙ 프롬프트
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <TokenBadge />
              <span className="hidden text-xs text-gray-600 sm:inline">
                {user.name ?? user.email}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="btn text-xs" type="submit">로그아웃</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="btn text-xs">로그인</Link>
              <Link href="/sign-up" className="btn-primary text-xs">회원가입</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
