import { z } from "zod"
import { getDb } from "../../db"
import { findCoupleRowForUser } from "../../services/couple"
import { listCoupleTimelineEvents } from "../../services/analytics"
import { listCoupleContentPlayOverview } from "../../services/couple-content-analytics"
import { protectedProcedure, router } from "../trpc"

const listInputSchema = z
  .object({
    limit: z.number().int().min(1).max(200).optional(),
  })
  .optional()

export const analyticsRouter = router({
  coupleTimeline: protectedProcedure.input(listInputSchema).query(async ({ ctx, input }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const coupleRow = await findCoupleRowForUser(db, ctx.user.id)
    if (!coupleRow) return []
    const limit = input?.limit ?? 80
    return listCoupleTimelineEvents(db, coupleRow.id, limit)
  }),

  /** Published contents + latest play session per member (for Analytics tab list). */
  coupleContentOverview: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const coupleRow = await findCoupleRowForUser(db, ctx.user.id)
    if (!coupleRow) return { couple: null, rows: [] }
    const rows = await listCoupleContentPlayOverview(
      db,
      coupleRow.id,
      coupleRow.memberOneUserId,
      coupleRow.memberTwoUserId,
    )
    return { couple: { id: coupleRow.id }, rows }
  }),
})
