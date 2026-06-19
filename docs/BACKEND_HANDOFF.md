# PixelAI 백엔드 분리 — 구축 핸드오프 문서

> 이 문서는 **별도 백엔드(API 서버 + 자체 호스팅 DB)** 를 구축하기 위한 작업 지시서입니다.
> 실행 주체(예: Codex)가 이 문서만 보고 작업할 수 있도록, **왜(배경)** 와 **어떻게(단계·계약)** 를 모두 담았습니다.
> 구현 언어/스택은 **Node.js + TypeScript (NestJS)** 로 고정합니다.

---

## 0. 작업자에게 (TL;DR)

- 현재 PixelAI는 **Next.js 15 단일 앱**(프론트 + API Route + Prisma)으로 동작한다. AI 호출이 무거워 **서버리스 실행시간 제한(maxDuration 60초)** 에 걸린다.
- 목표: **NestJS 백엔드 + 자체 호스팅 Postgres(pgvector)** 를 별도 인스턴스에 세우고, 생성/변환 같은 무거운 작업을 **비동기 잡 모델**로 옮긴다. Next.js는 프론트 + 인증만 유지하고 나머지는 백엔드로 프록시한다.
- **기존 프론트엔드가 깨지지 않도록** 아래 6장 "API 계약"을 그대로 구현하는 것이 최우선 제약이다.
- DB는 Supabase에서 **자체 Postgres로 이전**한다(스키마는 7장 그대로).
- 향후 RAG(pgvector 검색)와 PromptComposer(프롬프트 레이어링)를 얹을 수 있도록 확장 지점을 비워둔다(13장).

---

## 1. 왜 백엔드를 분리하는가 (배경)

1. **실행시간 한계.** 픽셀 생성/변환은 Claude 호출(수~수십 초) + 경우에 따라 웹 검색까지 더해진다. Next API Route(서버리스)는 `maxDuration = 60`으로 묶여 있어 길어지면 끊긴다. 상시 실행 프로세스(백엔드)면 이 제약이 사라진다.
2. **비동기 처리 필요.** 사용자가 여러 건을 동시에 돌리거나 탭을 옮겨도 작업이 유지돼야 한다. 현재는 "탭이 열려 있는 동안만" 살아 있는 임시 구조다. 정식 워커/큐가 필요하다.
3. **자체 인프라 통제.** RAG를 위해 **pgvector**를 직접 설치해야 하고, Supabase 의존을 걷어내 비용/제어를 직접 관리한다.
4. **로직 중앙화.** 토큰 차감, 프롬프트 조립, 생성/변환, 어드민 등 도메인 로직을 한 서비스에 모아 유지보수성을 높인다.

---

## 2. 현재 시스템 개요 (작업 전 반드시 숙지)

### 2.1 스택
- **프론트/현행 백엔드:** Next.js 15 (App Router), React 19, Tailwind.
- **DB/ORM:** PostgreSQL + Prisma 6 (현재 **Supabase**; pooled `DATABASE_URL` + `DIRECT_URL` 이원화).
- **인증:** NextAuth v5(beta), **JWT 세션 전략**. 세션 `user.id`는 JWT `token.sub`에 저장된다. Google OAuth + 이메일/비밀번호(Credentials, bcrypt).
- **AI:** **Claude 단일 모델** (`@anthropic-ai/sdk`). (과거 GPT/Gemini는 제거됨.)
- **결제:** Stripe (체크아웃 + 웹훅, 토큰 충전).

### 2.2 도메인 기능
- **생성기**(`/generate`): 프롬프트→픽셀아트 JSON 생성. 16×16 / 32×32.
- **변환기**(`/convert`): 고해상도 픽셀 이미지를 **클라이언트 canvas로 1차 변환**(그리드 점유색 + 로우컬러 + 벡터라이즈) → 서버에서 **AI 보정**(변환 전용 프롬프트). 알고리즘 결과를 `basePixels`로 전달.
- **대기열**(`/queue`) + 우측 실시간 패널: 최근 작업을 pending/completed/failed로 폴링 표시.
- **마이페이지/갤러리**: 작품 목록(커서·페이지 페이지네이션), 제목 검색(`q`, ILIKE), 공개/비공개, 다운로드, 수정(수동 픽셀 에디터→사람수정 표시), 재생성(기존 벡터를 AI에 주입).
- **위시리스트**: 폴더 분류, 스프라이트 시트 다운로드.
- **어드민 프롬프트**(`/admin/prompts`): 시스템 프롬프트 오버라이드(키: `claude`, `convert`).

### 2.3 반드시 유지해야 할 핵심 패턴
- **아웃박스 + reaper.** 생성 시작 시 한 트랜잭션에서 (1) 토큰 차감 (2) `Artwork`를 `status="pending"`으로 생성한다. AI 성공 시 `completed`로 갱신, 실패 시 `failed` + 토큰 환불. 함수가 중간에 죽으면 pending 행이 남고, **reaper**가 90초 경과 pending을 `failed`로 정리하며 환불한다.
- **토큰 정책**(`src/lib/tokens.ts`): `TOKEN_COST` 16=10 / 32=25. **AI 검색 사용 시 `SEARCH_SURCHARGE`(+10)** 추가. `UNLIMITED_TOKEN_EMAILS`는 차감 면제, `ADMIN_EMAILS`는 어드민/프롬프트 한도 1000자.
- **웹 검색(생성 전 조사).** `ANTHROPIC_WEB_SEARCH`(마스터) + 사용자 토글이 켜졌고 참조 이미지가 없을 때, 생성 전에 Claude `web_search_20260209`(동적 필터링; `code_execution` 자동 주입)로 대상을 조사해 프롬프트에 주입한다. `ANTHROPIC_WEB_SEARCH_FORCE`면 첫 호출 `tool_choice`로 검색 강제. 실패/미설정 시 조용히 폴백.
- **프롬프트 오버라이드.** `PromptOverride(provider, userId)` 행이 있으면 해당 사용자 호출에만 적용. 키는 `claude`(생성), `convert`(변환). 기본값은 코드 상수.
- **basePixels 주입.** 재생성·변환에서 기존/1차 픽셀 그리드(JSON)를 유저 프롬프트에 그대로 넣어 모델이 그걸 출발점으로 다듬게 한다.

---

## 3. 목표 아키텍처

```
[브라우저]
   │  (정적 + 인증 UI)
[Next.js]  ──프록시──►  [NestJS 백엔드]  ──►  [Claude API]
   │                         │
   └─ NextAuth(JWT)          ├─ 비동기 잡 워커
                             └─ Postgres + pgvector (자체 호스팅, 같은/인접 인스턴스)
```

- **Next.js**: 페이지 렌더링 + NextAuth 세션 발급만. 데이터/생성 호출은 백엔드로 프록시(또는 클라이언트가 백엔드 직접 호출 + JWT 첨부).
- **NestJS 백엔드**: 모든 도메인 로직(생성/변환/토큰/작품/위시/어드민/결제 웹훅) + 비동기 잡.
- **DB**: 자체 Postgres(pgvector 설치). Supabase 제거, 단일 `DATABASE_URL`.

---

## 4. 기술 스택 & 인프라 결정 (확정)

| 항목 | 결정 |
|------|------|
| 백엔드 프레임워크 | **NestJS** (Node 20+, TypeScript) |
| ORM | **Prisma**(기존 스키마 재사용) |
| DB | **자체 호스팅 PostgreSQL 16** + **pgvector** (`CREATE EXTENSION vector`) |
| 호스팅 | 백엔드 + DB **자체 인스턴스**(VM/VPS) 자체 호스팅 |
| 비동기 큐 | 1차: **DB 기반 잡 테이블 + 워커**(기존 pending/reaper 승격). 확장: **BullMQ + Redis** |
| 인스턴스 사양(시작) | 4 vCPU / 8GB RAM / 80~160GB SSD (I/O 바운드 워크로드) |
| 인증 공유 | NextAuth가 발급한 **JWT를 백엔드에서 검증**(공유 `AUTH_SECRET`) |

---

## 5. 단계별 구축 작업

### Phase 1 — 인스턴스 프로비저닝
- VM에 Node 20+, PostgreSQL 16 설치. `CREATE EXTENSION IF NOT EXISTS vector;`
- 방화벽(앱 포트만 노출, DB는 내부/로컬), TLS(리버스 프록시: Caddy/Nginx), 프로세스 매니저(systemd 또는 pm2).
- 자동 백업(pg_dump 일일) + 기본 모니터링/로그 적재.

### Phase 2 — DB 마이그레이션 (Supabase → 자체 Postgres)
- `prisma/schema.prisma`에서 Supabase 전용 `directUrl`/pooler 분리 제거 → **단일 `DATABASE_URL`**.
- Supabase 데이터 `pg_dump` → 자체 DB `pg_restore`(또는 `prisma db push` 후 데이터 이관).
- 정합성 검증(행 수, FK).

### Phase 3 — NestJS 스캐폴딩 & Prisma 연결
- NestJS 프로젝트 생성, Prisma 모듈/서비스 연결(기존 스키마 그대로 `prisma generate`).
- 모듈 분리: `auth`(JWT 검증), `generation`, `convert`, `artworks`, `tokens`, `wishlist`, `admin-prompts`, `payments`, `jobs`.

### Phase 4 — 도메인 로직 이관
- 기존 Next API Route 로직을 NestJS 서비스로 이관(아래 6장 계약 유지).
- 핵심: 아웃박스 트랜잭션(토큰 차감 + pending 생성), Claude 호출(`lib/ai/*` 이식), 토큰 정책(`tokens.ts`), 프롬프트 오버라이드(`resolver`), 웹 검색 조사 단계, 변환 보정.

### Phase 5 — 비동기 잡 모델 (핵심)
- 생성/변환 요청을 **즉시 `jobId`(=artworkId)** 로 받고 200 반환 → 워커가 처리 → 클라이언트가 폴링(또는 SSE)로 결과 수신.
- 기존 `pending Artwork + reaper`를 정식 워커로 승격: 워커가 pending 행을 집어 Claude 호출 후 completed/failed 갱신. 동시성 제어(행 잠금 또는 큐).
- 1차는 DB 잡으로 충분, 부하 증가 시 BullMQ로 전환.

### Phase 6 — 프론트 연동 전환
- Next.js가 데이터/생성 호출을 백엔드로 프록시(또는 클라이언트 직접 호출).
- CORS, JWT 전달, 에러 코드/응답 스키마 100% 일치 유지.
- 대기열/패널/토스트 등 프론트는 그대로(폴링 엔드포인트만 백엔드로).

---

## 6. API 계약 (프론트 호환 — 반드시 동일하게 구현)

> 모든 인증 필요 엔드포인트는 401 `unauthorized`, 그리고 JWT의 user가 DB에 없으면 401 `session_invalid`를 반환한다.

### 생성 — `POST /api/generate`
- body: `{ prompt: string, size: 16|32, provider?: "claude", referenceImage?: dataURL, webSearch?: boolean, basePixels?: string[][] }`
- 200: `{ id, pixels: string[][], size, token_used: number, token_balance: number|null, unlimited: boolean }`
- 에러: 400 `prompt_required` / `prompt_too_long {limit}` / `invalid_image_format` / `image_too_large` / `provider_not_configured {provider}`; 409 `insufficient_tokens {balance, cost}`; 502 `generation_failed {detail}`(실패 시 환불); 500 `spend_failed`.
- 규칙: prompt 한도 200(어드민 1000). 참조 이미지 7MB 이하, `data:image/(png|jpeg|webp|gif);base64,`. **검색 활성 시 비용 = 기본 + SEARCH_SURCHARGE.**

### 변환 — `POST /api/convert`
- body: `{ basePixels: string[][], size: 16|32, prompt?: string }`
- 200: `{ id, pixels, size, token_used, token_balance, unlimited }`
- 에러: 400 `pixels_required` / `prompt_too_long {limit}`; 401 `session_invalid`; 409 `insufficient_tokens`.
- 규칙: AI 보정 실패/키 없음 시 `basePixels`를 그대로 최종본으로 저장(결과 항상 제공, 환불 없음).

### 진행 상태
- `GET /api/generate/active` → `{ active: {id,prompt,size,provider,status,pixels|null,failureReason,token_cost,created_at}|null, token_balance }`
- `GET /api/generate/queue` → `{ items: [{id,prompt,size,provider,status,pixels|null,failureReason,token_cost,is_public,created_at}], token_balance }` (최근 60분, reaper 선실행)

### 작품/히스토리
- `GET /api/history?public=&cursor=&limit=&page=&q=` → 커서: `{items, nextCursor, wishlistMap}` / 페이지: `{items, total, page, wishlistMap}`. 완료 작품만. `q`는 prompt ILIKE.
- `GET /api/artworks/:id` → 상세(소유자 한정). `PATCH {is_public}` / `DELETE`.
- `POST /api/artworks` (사람 수정 저장) → body `{prompt,size,pixels}` → `{id}` (provider="human", editedByHuman=true, tokenCost 0).

### 토큰/결제/인증
- `GET /api/token` → `{ balance, transactions: [...] }`
- `POST /api/payment/checkout` → Stripe 세션 URL. `POST /api/payment/webhook`(서명 검증, `checkout.session.completed`, `stripeSessionId` 멱등).
- `POST /api/auth/signup` {email,password,name?}. NextAuth `[...nextauth]`.

### 위시리스트 / 어드민
- `GET/POST /api/wishlist`, `DELETE /api/wishlist/:id`, `GET/POST /api/wishlist/folders`, `PATCH/DELETE /api/wishlist/folders/:id`.
- `GET /api/admin/prompts` → `{items:[{provider,default_prompt,override}]}` (provider ∈ {claude, convert}). `PUT/DELETE /api/admin/prompts/:provider` {system_prompt} (어드민 한정).

---

## 7. 데이터 모델 (Prisma, 그대로 이관)

- **User** (id, email, passwordHash?, tokenBalance 기본 100, image, name …) — NextAuth 관계(Account/Session/VerificationToken).
- **Artwork** (id, userId, prompt, size, provider, pixelData[JSON 문자열], status `pending|completed|failed`, failureReason?, isPublic, tokenCost, editedByHuman, createdAt). 인덱스: userId / (isPublic, createdAt) / (status, createdAt).
- **Wishlist** (userId, artworkId, folderId?) unique(userId, artworkId).
- **WishlistFolder** (id, userId, name).
- **PromptOverride** (@@id([provider, userId]), systemPrompt) — provider는 `claude` | `convert`.
- **TokenTransaction** (userId, amount, type `charge|generate|bonus|refund`, referenceId?, stripeSessionId? unique).

> RAG용 신규 테이블은 13장 참고(이번 단계 범위 밖, 자리만 인지).

---

## 8. 비동기 잡 모델 상세

- 생성/변환 요청 처리:
  1. 트랜잭션: 잔액 확인 → 차감 → `Artwork(status=pending)` 생성 → `TokenTransaction(generate, -cost)` 기록 → `jobId=artworkId` 반환(즉시 200).
  2. 워커: pending 행을 잠금/클레임 → Claude 호출 → 성공 시 `pixelData`+`completed`, 실패 시 `failed`+환불(`refund`).
  3. reaper: 90초 초과 pending → `failed` + 환불(중복 방지: 트랜잭션 내 재확인).
- 클라이언트는 `/api/generate/queue`(목록) 또는 `/api/generate/active`(단건) 폴링으로 상태 수신. SSE는 선택.
- 동시성: 워커 N개로 수평 확장 가능(행 클레임은 `UPDATE ... WHERE status='pending' ... RETURNING` 또는 BullMQ).

---

## 9. 인증 공유 (Next ↔ NestJS)

- NextAuth(JWT)가 세션 토큰을 발급한다. 백엔드는 **같은 `AUTH_SECRET`** 으로 JWT를 검증해 `userId(sub)`를 추출한다.
- 프록시 시 쿠키/Authorization 헤더로 토큰을 전달. 백엔드 가드(`AuthGuard`)에서 검증, 미인증 401.
- JWT의 user가 DB에 없을 수 있으므로(세션 잔존) **존재 확인 후 401 `session_invalid`** 반환(기존 동작 유지).

---

## 10. 환경 변수

- DB: `DATABASE_URL`(자체 Postgres 단일). (Supabase `DIRECT_URL` 제거.)
- 인증: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXTAUTH_URL`.
- AI: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `ANTHROPIC_WEB_SEARCH`, `ANTHROPIC_WEB_SEARCH_MAX_USES`, `ANTHROPIC_WEB_SEARCH_FORCE`.
- 결제: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
- 정책: `UNLIMITED_TOKEN_EMAILS`, `ADMIN_EMAILS`.
- 앱: `NEXT_PUBLIC_APP_URL`, 그리고 프론트가 백엔드를 가리킬 `NEXT_PUBLIC_API_BASE_URL`(신규).

---

## 11. 마이그레이션 / 롤아웃 순서

1. Phase 1~2(인스턴스 + DB 이전)를 **읽기 트래픽 없는 시점**에 수행, 정합성 검증.
2. Phase 3~5로 백엔드를 별도 도메인에 띄우고 **그림자 트래픽**으로 계약 검증(응답 스키마 동일성 테스트).
3. Phase 6에서 프론트 호출을 백엔드로 스위치(기능 플래그/환경변수). 문제 시 즉시 롤백.
4. 안정화 후 Next API Route 제거.

---

## 12. 비기능 요구

- **보안**: DB 외부 미노출, 앱 TLS, 시크릿은 환경변수/시크릿 매니저, Stripe 웹훅 서명 검증.
- **백업**: 일일 `pg_dump` 오프-인스턴스 보관(인스턴스가 단일 장애점이므로 백업·복구가 최우선).
- **모니터링**: 헬스체크, 에러/지연 로깅, 잡 처리 지표(대기/실패율).
- **장애 격리**: 백엔드+DB 동거 시 자원 경합 주의. 추후 DB 분리 가능하도록 연결 추상화.

---

## 13. 향후 확장 연결점 (이번 범위 밖, 자리만 비워둘 것)

- **RAG (트랙 C)**: `CuratedExample(prompt, size, pixelData, provider?, embedding vector(1536), createdAt)` 테이블 + pgvector 코사인 검색. 생성 시 프롬프트 임베딩 → top-k few-shot 주입. pgvector를 위해 Phase 1에서 확장 설치를 반드시 해둔다.
- **PromptComposer (프롬프트 레이어링)**: `BASE(엔진 규칙) + DESIGN(디자인 시스템) + USER(입력)` 3레이어로 시스템/유저 프롬프트 조립. 기존 `getSystemPrompt`/유저 프롬프트 빌더/`PromptOverride`를 이 컴포저로 흡수. RAG few-shot은 여기에 레이어로 삽입.
- **디자인 시스템**: `DesignSystem(name, prompt, isActive)`를 DESIGN 레이어에 주입(프롬프트 적용 방식).

---

## 14. 리스크 & 주의

- **계약 불일치**가 가장 큰 위험. 6장 응답/에러 코드를 그대로 지키지 않으면 프론트가 깨진다. 계약 테스트를 먼저 작성할 것.
- **JWT 검증 불일치**: `AUTH_SECRET`/알고리즘이 NextAuth와 정확히 일치해야 한다.
- **pgvector 미설치 상태로 RAG 진행 금지**: 확장 설치 권한을 Phase 1에서 확인.
- **토큰 이중 차감/환불 누락**: 아웃박스 트랜잭션과 reaper의 중복 방지(상태 재확인) 로직을 반드시 이식.
- **단일 인스턴스 장애점**: 백업/복구 절차를 먼저 갖춘 뒤 운영 전환.
