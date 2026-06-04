# PixelAI

프롬프트 한 줄로 픽셀 아트를 생성하는 웹 앱.
**Next.js 15** + Claude / GPT / Gemini + **Prisma(SQLite)** + **NextAuth v5** + Stripe.

## 빠른 시작

```bash
npm install                          # postinstall에서 prisma generate 자동
npx prisma db push                   # dev.db 생성
# .env.local에 키 채우기 (아래 최소 조건 참고)
npm run dev                          # http://localhost:3000
```

## 최소 동작 조건

1. **`AUTH_SECRET`** (필수) — 임의 문자열:
   ```bash
   openssl rand -base64 32
   ```
2. **AI 키 1개 이상** — Claude / OpenAI / Gemini 중 무엇이든.

Google 로그인은 선택. 이메일/비밀번호 회원가입은 별도 키 없이 동작합니다.

## 외부 서비스 설정

### Google OAuth (선택)
1. https://console.cloud.google.com → 프로젝트 생성
2. **APIs & Services → Credentials → Create OAuth client ID**
3. Application type: **Web application**
4. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google` (개발)
   - `https://<도메인>/api/auth/callback/google` (운영)
5. 발급된 Client ID/Secret을 `.env.local`에 넣기:
   ```
   AUTH_GOOGLE_ID=...
   AUTH_GOOGLE_SECRET=...
   ```

키가 없으면 로그인 페이지에서 "Google로 계속하기" 버튼이 자동으로 숨겨집니다.

### AI 프로바이더 (1개 이상)
- **Anthropic**: `ANTHROPIC_API_KEY` — https://console.anthropic.com
- **OpenAI**: `OPENAI_API_KEY` — https://platform.openai.com/api-keys
- **Google AI Studio**: `GOOGLE_AI_API_KEY` — https://aistudio.google.com/app/apikey

각 모델명은 `*_MODEL` 변수로 덮어쓰기 가능.

### Stripe (결제 사용 시)
- Webhook: `POST /api/payment/webhook` — `checkout.session.completed`
- 키: `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### 데이터베이스
`.env`의 `DATABASE_URL=file:./dev.db` 로컬 SQLite. 운영 시 Postgres URL로 바꾸고
`prisma/schema.prisma`의 `provider`를 `postgresql`로 변경 → `prisma db push`.

## 디렉토리

```
src/
  auth.ts                   NextAuth 설정 (Google + Credentials)
  auth-handlers.ts          { GET, POST } re-export
  types/next-auth.d.ts      Session.user.id 타입 확장
  app/
    page.tsx                  랜딩
    sign-in/, sign-up/        자체 폼 (Google 버튼 + 이메일)
    generate/                 생성기 (Claude/GPT/Gemini 선택)
    gallery/                  공개 갤러리
    mypage/                   내 작품 + 토큰 내역
    shop/                     토큰 충전
    api/
      auth/[...nextauth]      NextAuth 핸들러
      auth/signup             이메일/비번 가입
      generate                POST  픽셀 생성
      token                   GET   잔액 + 최근 트랜잭션
      history                 GET   내 작품 / 공개 작품
      artworks/[id]           PATCH/DELETE
      payment/checkout        POST  Stripe 세션
      payment/webhook         POST  Stripe 웹훅
  lib/
    db.ts           Prisma 클라이언트 싱글톤
    env.ts          환경 변수 헬퍼
    users.ts        getBalance / spendTokens / creditTokens
    artworks.ts     공개/내 작품 목록
    stripe.ts       Stripe + 토큰 패키지
    ai/
      index.ts      라우터, 시스템 프롬프트, JSON 검증
      claude.ts
      openai.ts
      gemini.ts
  components/
    Nav.tsx           서버 컴포넌트, 세션 표시
    TokenBadge.tsx    클라이언트, /api/token 폴링
    PixelPreview.tsx
prisma/
  schema.prisma     User/Account/Session/VerificationToken + 도메인 3개
  dev.db            (db push 후 생성)
```

## 토큰 비용

| 해상도 | 토큰 |
|--------|------|
| 16×16  | 10   |
| 32×32  | 25   |

- 생성 실패 시 자동 환불 (`TokenTransaction.type = 'refund'`)
- 충전은 Stripe 웹훅에서 멱등 처리 (`stripeSessionId` UNIQUE)

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | `prisma generate` + Next 빌드 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | 스키마 변경을 dev.db에 반영 |
| `npm run db:studio` | Prisma Studio (DB GUI) |
