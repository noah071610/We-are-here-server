import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { getDb } from "../../db"
import { createAnalyticsEvent, listCoupleTimelineEvents } from "../../services/analytics"
import {
  createContentAnalysisResult,
  createContentPlaySession,
  getOrCreateContentAnalysisDetail,
  getContentPlayAccess,
  listContentPlaySessions,
  updateContentAnalysisResult,
  updateContentPlaySession,
} from "../../services/content-play-session"
import { generateContentAiSummary } from "../../services/ai-analysis"
import { findCoupleRowForUser } from "../../services/couple"
import { listCoupleContentPlayOverview } from "../../services/couple-content-analytics"
import { protectedProcedure, router } from "../trpc"
import {
  aiGenerateSummaryInputSchema,
  analyticsEventCreateInputSchema,
  contentAnalysisDetailInputSchema,
  contentAnalysisResultCreateInputSchema,
  contentAnalysisResultUpdateInputSchema,
  contentPlaySessionCreateInputSchema,
  contentPlaySessionListInputSchema,
  contentPlaySessionUpdateInputSchema,
} from "../validation/analytics"

const listInputSchema = z
  .object({
    limit: z.number().int().min(1).max(200).optional(),
  })
  .optional()

async function requireContentPlayAccess(db: ReturnType<typeof getDb>, userId: string) {
  const access = await getContentPlayAccess(db, userId)
  if (!access) {
    throw new TRPCError({ code: "FORBIDDEN", message: "couple and profile are required" })
  }
  return access
}

export const analyticsRouter = router({
  coupleTimeline: protectedProcedure.input(listInputSchema).query(async ({ ctx, input }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const coupleRow = await findCoupleRowForUser(db, ctx.user.id)
    if (!coupleRow) return []
    const limit = input?.limit ?? 80
    return listCoupleTimelineEvents(db, coupleRow.id, limit)
  }),

  createAnalyticsEvent: protectedProcedure
    .input(analyticsEventCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = getDb(ctx.env.WE_ARE_HERE_DB)
      const access = await requireContentPlayAccess(db, ctx.user.id)
      return createAnalyticsEvent(db, access, ctx.user.id, { id: crypto.randomUUID(), ...input })
    }),

  /** Published contents + latest play session per member (for Analytics tab list). */
  coupleContentOverview: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const access = await getContentPlayAccess(db, ctx.user.id)
    if (!access) return { couple: null, rows: [] }
    const rows = await listCoupleContentPlayOverview(
      db,
      access.couple.id,
      access.couple.memberOneUserId,
      access.couple.memberTwoUserId,
    )
    return { couple: { id: access.couple.id }, rows }
  }),

  listContentPlaySessions: protectedProcedure.input(contentPlaySessionListInputSchema).query(async ({ ctx, input }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const access = await requireContentPlayAccess(db, ctx.user.id)
    return listContentPlaySessions(db, access, input)
  }),

  createContentPlaySession: protectedProcedure
    .input(contentPlaySessionCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = getDb(ctx.env.WE_ARE_HERE_DB)
      const access = await requireContentPlayAccess(db, ctx.user.id)
      return createContentPlaySession(db, access, ctx.user.id, { id: crypto.randomUUID(), ...input })
    }),

  updateContentPlaySession: protectedProcedure
    .input(contentPlaySessionUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = getDb(ctx.env.WE_ARE_HERE_DB)
      const access = await requireContentPlayAccess(db, ctx.user.id)
      const row = await updateContentPlaySession(db, access, input)
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "content play session not found" })
      return row
    }),

  createContentAnalysisResult: protectedProcedure
    .input(contentAnalysisResultCreateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = getDb(ctx.env.WE_ARE_HERE_DB)
      const access = await requireContentPlayAccess(db, ctx.user.id)
      return createContentAnalysisResult(db, access, { id: crypto.randomUUID(), ...input })
    }),

  contentAnalysisDetail: protectedProcedure.input(contentAnalysisDetailInputSchema).query(async ({ ctx, input }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const access = await requireContentPlayAccess(db, ctx.user.id)
    const detail = await getOrCreateContentAnalysisDetail(db, access, { id: crypto.randomUUID(), ...input })
    if (!detail) {
      throw new TRPCError({ code: "FORBIDDEN", message: "both members must complete this content first" })
    }
    return detail
  }),

  updateContentAnalysisResult: protectedProcedure
    .input(contentAnalysisResultUpdateInputSchema)
    .mutation(async ({ ctx, input }) => {
      const db = getDb(ctx.env.WE_ARE_HERE_DB)
      const access = await requireContentPlayAccess(db, ctx.user.id)
      const row = await updateContentAnalysisResult(db, access, input)
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "content analysis result not found" })
      return row
    }),

  aiGenerateSummary: protectedProcedure.input(aiGenerateSummaryInputSchema).mutation(async ({ ctx, input }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const access = await requireContentPlayAccess(db, ctx.user.id)
    return generateContentAiSummary(db, access, {
      id: crypto.randomUUID(),
      ...input,
      ollamaBaseUrl: ctx.env.OLLAMA_BASE_URL,
    })
  }),
})
