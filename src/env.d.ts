/** wrangler `Env` 에 필드 병합 — `wrangler types` 재생성 후에도 유지 */
declare namespace Cloudflare {
  interface Env {
    /** Supabase Auth JWT(세션 access token) 서명 검증용 프로젝트 JWT secret */
    SUPABASE_JWT_SECRET?: string
  }
}
