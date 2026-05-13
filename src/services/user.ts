import { eq } from "drizzle-orm"
import type { getDb } from "../db"
import { user } from "../db/schema"
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt"
import { getRefreshToken, setRefreshToken } from "../lib/redis"
import type { Env } from "../trpc/env"

type Db = ReturnType<typeof getDb>

export async function getUserById(db: Db, id: string) {
  return db.query.user.findFirst({ where: eq(user.id, id) })
}

async function issueTokenPair(env: Env, userId: string) {
  const accessToken = await signAccessToken(env, userId)
  const refreshToken = await signRefreshToken(env, userId)
  await setRefreshToken(env, userId, refreshToken)
  return { accessToken, refreshToken } as const
}

export async function createUser(db: Db, env: Env, input: { deviceId: string }) {
  const existing = await getUserById(db, input.deviceId)
  if (existing) {
    const tokens = await issueTokenPair(env, existing.id)
    return { id: existing.id, ...tokens }
  }
  const [row] = await db
    .insert(user)
    .values({
      id: input.deviceId,
      isAnonymous: true,
    })
    .returning({ id: user.id })
  const tokens = await issueTokenPair(env, row.id)
  return { id: row.id, ...tokens }
}

/** 유효한 access JWT 컨텍스트에서 새 access·refresh 쌍 발급 */
export async function loginUser(db: Db, env: Env, userId: string) {
  const row = await getUserById(db, userId)
  if (!row) {
    throw new Error("USER_NOT_FOUND")
  }
  return issueTokenPair(env, row.id)
}

/** refresh JWT 검증 후 Redis에 저장된 토큰과 일치하면 새 쌍 발급(회전) */
export async function refreshUser(env: Env, db: Db, refreshToken: string) {
  const { payload } = await verifyRefreshToken(env, refreshToken)
  const sub = payload.sub
  if (typeof sub !== "string" || !sub) {
    throw new Error("INVALID_REFRESH")
  }
  const row = await getUserById(db, sub)
  if (!row) {
    throw new Error("INVALID_REFRESH")
  }
  const stored = await getRefreshToken(env, sub)
  if (stored !== null && stored !== refreshToken) {
    throw new Error("INVALID_REFRESH")
  }
  return issueTokenPair(env, row.id)
}
