import { TRPCError } from "@trpc/server"
import { getDb } from "../../db"
import { createProfile, deleteProfile, getProfileByUserId, updateProfile } from "../../services/profile"
import { protectedProcedure, publicProcedure, router } from "../trpc"
import { profileCreateInputSchema, profileUpdateInputSchema } from "../validation/profile"

export const profileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const profile = await getProfileByUserId(db, ctx.user.id)
    return profile || null
  }),

  create: publicProcedure.input(profileCreateInputSchema).mutation(async ({ ctx, input }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const existing = await getProfileByUserId(db, input.userId)
    if (existing) {
      throw new TRPCError({ code: "CONFLICT", message: "profile already exists" })
    }

    const row = await createProfile(db, {
      userId: input.userId,
      nickname: input.nickname,
      countryCode: input.countryCode,
    })
    return row
  }),

  update: protectedProcedure.input(profileUpdateInputSchema).mutation(async ({ ctx, input }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const existing = await getProfileByUserId(db, ctx.user.id)
    if (!existing) {
      throw new TRPCError({ code: "NOT_FOUND", message: "profile not found" })
    }
    const row = await updateProfile(db, ctx.user.id, input)
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "profile not found" })
    return row
  }),

  delete: protectedProcedure.mutation(async ({ ctx }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    await deleteProfile(db, ctx.user.id)
    return { ok: true as const }
  }),
})
