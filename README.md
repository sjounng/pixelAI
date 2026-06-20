# PixelAI

프롬프트와 이미지를 픽셀 아트로 만드는 Next.js 15 프론트엔드입니다. 도메인 API와 모든 데이터베이스 접근은 별도 NestJS 프로젝트인 `pixelAI-backend`가 담당합니다.

## 로컬 실행

백엔드를 먼저 `http://localhost:4000`에서 실행한 뒤:

```bash
cp .env.example .env.local
npm install
npm run dev
```

프론트엔드는 PostgreSQL, Anthropic, Stripe 비밀키를 사용하지 않습니다. NextAuth 세션 발급과 백엔드 API 프록시만 담당합니다.

## 환경변수

```env
AUTH_SECRET=                         # 백엔드와 같은 NextAuth JWT 시크릿
AUTH_INTERNAL_SECRET=                # 백엔드 내부 인증 API와 공유하는 별도 시크릿
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true
AUTH_GOOGLE_ID=                      # 선택
AUTH_GOOGLE_SECRET=                  # 선택
NEXT_PUBLIC_APP_URL=http://localhost:3000
BACKEND_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_ANTHROPIC_WEB_SEARCH=true
ADMIN_EMAILS=                        # 선택, 백엔드와 동일한 목록
```

`AUTH_SECRET`과 `AUTH_INTERNAL_SECRET`은 각각 `openssl rand -base64 32`로 생성합니다. 두 값은 서로 달라야 하며 프론트와 백엔드에 동일하게 설정해야 합니다.

Google OAuth의 승인된 리디렉션 URI는 로컬에서 `http://localhost:3000/api/auth/callback/google`, 운영에서 `https://<도메인>/api/auth/callback/google`입니다.

## 인증 흐름

- 이메일 로그인: NextAuth 서버가 백엔드 `/internal/auth/credentials`를 호출합니다.
- Google 로그인: NextAuth 서버가 백엔드 `/internal/auth/oauth`에서 사용자를 생성하거나 조회합니다.
- 브라우저에는 NextAuth JWT 세션 쿠키만 저장됩니다.
- 일반 `/api/*` 요청은 Next.js Route Handler가 쿠키를 유지한 채 백엔드로 프록시합니다.

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 운영 빌드 |
| `npm run start` | 운영 서버 실행 |
| `npm run typecheck` | TypeScript 검사 |
