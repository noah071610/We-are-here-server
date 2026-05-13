/// <reference path="../../worker-configuration.d.ts" />
/** `src/env.d.ts`가 `namespace Cloudflare { interface Env }`를 병합 — Wrangler 생성 타입 + 커스텀 env 한 타입 */
export type Env = Cloudflare.Env
