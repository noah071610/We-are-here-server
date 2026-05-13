import { Redis } from "@upstash/redis/cloudflare"
import { Env } from "../trpc/env"

const REFRESH_PREFIX = "auth:refresh:"

export function getRedis(env: Env): Redis | null {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) return null
  return new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
}

export async function setRefreshToken(env: Env, userHash: string, refreshToken: string, exSeconds = 7 * 24 * 3600) {
  const r = getRedis(env)
  if (!r) return
  await r.set(REFRESH_PREFIX + userHash, refreshToken, { ex: exSeconds })
}

export async function getRefreshToken(env: Env, userHash: string): Promise<string | null> {
  const r = getRedis(env)
  if (!r) return null
  return (await r.get<string>(REFRESH_PREFIX + userHash)) ?? null
}

export async function clearRefreshToken(env: Env, userHash: string) {
  const r = getRedis(env)
  if (!r) return
  await r.del(REFRESH_PREFIX + userHash)
}

const OAUTH_STATE_PREFIX = "cafe24:oauth:state:"

type OAuthStatePayload = {
  callbackUrl: string
  marketingEmailAgree: boolean
}

export function oauthStateKey(state: string) {
  return OAUTH_STATE_PREFIX + encodeURIComponent(state)
}

export async function saveOAuthState(env: Env, state: string, payload: OAuthStatePayload, exSeconds = 20 * 60) {
  const r = getRedis(env)
  if (!r) throw new Error("Redis is not configured (UPSTASH_*)")
  await r.set(oauthStateKey(state), JSON.stringify(payload), { ex: exSeconds })
}

export async function getOAuthState(env: Env, state: string): Promise<OAuthStatePayload | null> {
  const r = getRedis(env)
  if (!r) return null
  const raw = await r.get<string>(oauthStateKey(state))
  if (!raw) return null
  try {
    return JSON.parse(raw) as OAuthStatePayload
  } catch {
    return null
  }
}

export async function clearOAuthState(env: Env, state: string) {
  const r = getRedis(env)
  if (!r) return
  await r.del(oauthStateKey(state))
}
