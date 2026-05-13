import { TRPCError } from "@trpc/server"
import { getDb } from "../../db"
import { createUser, loginUser, refreshUser } from "../../services/user"
import { protectedProcedure, publicProcedure, router } from "../trpc"
import { userCreateInputSchema, userRefreshInputSchema } from "../validation/user"

export const userRouter = router({
  /**
   * D1 `user` 행을 deviceId 기준으로 맞춘 뒤 앱용 access·refresh JWT 발급.
   */
  create: publicProcedure.input(userCreateInputSchema).mutation(async ({ ctx, input }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const row = await createUser(db, ctx.env, input)
    return row
  }),

  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.user
  }),

  /** Bearer access JWT가 유효할 때 새 토큰 쌍 발급 */
  login: protectedProcedure.mutation(async ({ ctx }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    try {
      return await loginUser(db, ctx.env, ctx.user.id)
    } catch {
      throw new TRPCError({ code: "UNAUTHORIZED" })
    }
  }),

  /** refresh JWT로 새 access·refresh 발급 */
  refresh: publicProcedure.input(userRefreshInputSchema).mutation(async ({ ctx, input }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    try {
      return await refreshUser(ctx.env, db, input.refreshToken)
    } catch {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired refresh token" })
    }
  }),
})
