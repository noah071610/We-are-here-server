import { sign, verify } from "hono/jwt"
import type { Env } from "../trpc/env"

const ACCESS_ALG = "HS256" as const

function getSecret(env: Env): string {
  const s = env.JWT_SECRET
  if (!s) throw new Error("JWT_SECRET is not set")
  return s
}

function relExpToSeconds(rel: string): number {
  const m = rel.trim().match(/^(\d+)([smhd])$/i)
  if (!m) throw new Error(`Invalid expires: ${rel}`)
  const n = Number(m[1])
  const u = m[2].toLowerCase()
  const mult: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 }
  const d = mult[u]
  if (d === undefined) throw new Error(`Invalid expires: ${rel}`)
  return n * d
}

function buildPayload(userHash: string, expiresIn: string) {
  const iat = Math.floor(Date.now() / 1000)
  return {
    sub: userHash,
    iat,
    exp: iat + relExpToSeconds(expiresIn),
  } as const
}

export async function signAccessToken(env: Env, userHash: string, expiresIn = "15m") {
  return sign(buildPayload(userHash, expiresIn), getSecret(env), ACCESS_ALG)
}

export async function signRefreshToken(env: Env, userHash: string, expiresIn = "7d") {
  return sign(buildPayload(userHash, expiresIn), getSecret(env), ACCESS_ALG)
}

export async function verifyAccessToken(env: Env, token: string) {
  const payload = await verify(token, getSecret(env), { alg: ACCESS_ALG })
  return { payload }
}

export async function verifyRefreshToken(env: Env, token: string) {
  const payload = await verify(token, getSecret(env), { alg: ACCESS_ALG })
  return { payload }
}
