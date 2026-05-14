import { TRPCError } from "@trpc/server"
import { getDb } from "../../db"
import { getProfileByUserId } from "../../services/profile"
import { dissolveCouple, findCoupleRowForUser } from "../../services/couple"
import { protectedProcedure, router } from "../trpc"
import { coupleDissolveInputSchema } from "../validation/couple"

export const coupleRouter = router({
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const row = await findCoupleRowForUser(db, ctx.user.id)
    if (!row) return null
    const otherId = row.memberOneUserId === ctx.user.id ? row.memberTwoUserId : row.memberOneUserId
    const [myProfile, partnerProfile] = await Promise.all([
      getProfileByUserId(db, ctx.user.id),
      getProfileByUserId(db, otherId),
    ])
    return { couple: row, myProfile: myProfile ?? null, partnerProfile: partnerProfile ?? null }
  }),

  dissolve: protectedProcedure.input(coupleDissolveInputSchema).mutation(async ({ ctx, input }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    try {
      const result = await dissolveCouple(db, ctx.user.id, input.nickname)
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "couple not found" })
      return { ok: true as const, ...result }
    } catch (error) {
      if (error instanceof TRPCError) throw error
      if (error instanceof Error && error.message === "NICKNAME_MISMATCH") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "nickname does not match" })
      }
      throw error
    }
  }),
})
