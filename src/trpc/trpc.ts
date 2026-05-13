import { initTRPC, TRPCError } from "@trpc/server"
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch"
import { eq, InferSelectModel } from "drizzle-orm"
import type { Context } from "hono"
import { getCookie } from "hono/cookie"
import { getDb } from "../db"
import { user } from "../db/schema"
import { verifyAccessToken } from "../lib/jwt"
import type { Env } from "./env"

export type HonoTrpc = { Bindings: Env }

export type TrpcHonoContext = HonoTrpc

export type TrpcUser = InferSelectModel<typeof user>

export type TrpcContext = {
  env: Env
  request: Context<HonoTrpc>
  responseHeaders: Headers
  /** `access_token` 쿠키(JWT) 검증 후 D1에서 로드; 실패/없으면 undefined */
  user?: TrpcUser
  /** 세션 연동 시 `user.id` 와 동일 */
  userHash?: string
}

function readBearerToken(c: Context<HonoTrpc>): string | null {
  const raw = c.req.header("Authorization")
  if (!raw?.startsWith("Bearer ")) return null
  const t = raw.slice("Bearer ".length).trim()
  return t.length ? t : null
}

async function tryLoadUserFromJwtString(token: string, env: Env): Promise<{ user: TrpcUser; userHash: string } | null> {
  try {
    const { payload } = await verifyAccessToken(env, token)
    const sub = payload.sub
    if (typeof sub !== "string") return null
    const db = getDb(env.WE_ARE_HERE_DB)
    const row = await db.query.user.findFirst({
      where: eq(user.id, sub),
    })
    if (!row) return null
    return { user: row, userHash: row.id }
  } catch {
    return null
  }
}

async function tryLoadUserFromAccessCookie(
  c: Context<HonoTrpc>,
  env: Env,
): Promise<{ user: TrpcUser; userHash: string } | null> {
  const accessName = env.JWT_ACCESS_TOKEN_NAME ?? "access_token"
  const token = getCookie(c, accessName)
  if (!token) return null
  return tryLoadUserFromJwtString(token, env)
}

const t = initTRPC.context<TrpcContext>().create()

const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  const authed = ctx.user
  return next({
    ctx: {
      ...ctx,
      user: authed,
    },
  })
})

const isAuthedAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  if (ctx.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN" })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(isAuthed)
export const protectedAdminProcedure = t.procedure.use(isAuthedAdmin)

export async function createTrpcContext(opts: FetchCreateContextFnOptions, c: Context<HonoTrpc>): Promise<TrpcContext> {
  const env = c.env
  const bearer = readBearerToken(c)
  const session = bearer ? await tryLoadUserFromJwtString(bearer, env) : await tryLoadUserFromAccessCookie(c, env)

  return {
    env,
    request: c,
    responseHeaders: opts.resHeaders,
    ...(session ?? {}),
  }
}

export { t }
