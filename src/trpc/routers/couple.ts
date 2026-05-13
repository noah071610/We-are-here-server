import { getDb } from "../../db"
import { getProfileByUserId } from "../../services/profile"
import { findCoupleRowForUser } from "../../services/couple"
import { protectedProcedure, router } from "../trpc"

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
})
