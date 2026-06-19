// 토큰 비용 정책 (클라이언트·서버 공유).

export const TOKEN_COST: Record<16 | 32, number> = { 16: 10, 32: 25 };

// AI 검색(web search)을 켜고 생성할 때 추가로 차감하는 토큰.
export const SEARCH_SURCHARGE = 10;
