import { z } from "zod"

import { analyticsEventType, CONTENT_PLAY_SESSION_STATUS } from "../../db/schema"

export const analyticsEventTypeSchema = z.enum(analyticsEventType)

export const analyticsEventCreateInputSchema = z
  .object({
    eventType: analyticsEventTypeSchema,
    contentId: z.string().min(1).nullable().optional(),
    sessionId: z.string().min(1).nullable().optional(),
    payload: z.unknown().nullable().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.eventType === "CONTENT_COMPLETED_BOTH" && !val.contentId) {
      ctx.addIssue({
        code: "custom",
        message: "contentId is required for CONTENT_COMPLETED_BOTH",
        path: ["contentId"],
      })
    }
  })

export type AnalyticsEventCreateInput = z.infer<typeof analyticsEventCreateInputSchema>

export const contentPlaySessionStatusSchema = z.enum(CONTENT_PLAY_SESSION_STATUS)

export const contentPlaySessionResponseSchema = z
  .object({
    questionId: z.string().min(1),
    selectedOptionId: z.string().min(1).nullable().optional(),
    selectedOptionLabel: z.string().nullable().optional(),
    answeredAt: z.string().min(1).optional(),
    payload: z.unknown().optional(),
  })
  .passthrough()

const sessionPatchSchema = z.object({
  status: contentPlaySessionStatusSchema.optional(),
  lastQuestionId: z.string().min(1).nullable().optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  responses: z.array(z.string()).optional(),
  result: z.json().nullable().optional(),
  score: z.number().int().nullable().optional(),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().nullable().optional(),
  abandonedAt: z.coerce.date().nullable().optional(),
  completedAt: z.coerce.date().nullable().optional(),
})

export const contentPlaySessionListInputSchema = z
  .object({
    contentId: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    limit: z.number().int().min(1).max(200).optional(),
  })
  .optional()

export type ContentPlaySessionListInput = z.infer<typeof contentPlaySessionListInputSchema>

export const contentPlaySessionCreateInputSchema = z
  .object({
    contentId: z.string().min(1),
  })
  .merge(sessionPatchSchema)

export type ContentPlaySessionCreateInput = z.infer<typeof contentPlaySessionCreateInputSchema>

export const contentPlaySessionUpdateInputSchema = z
  .object({
    id: z.string().min(1),
  })
  .merge(sessionPatchSchema)
  .refine(
    (v) =>
      v.status !== undefined ||
      v.lastQuestionId !== undefined ||
      v.progressPercent !== undefined ||
      v.responses !== undefined ||
      v.result !== undefined ||
      v.score !== undefined ||
      v.startedAt !== undefined ||
      v.endedAt !== undefined ||
      v.abandonedAt !== undefined ||
      v.completedAt !== undefined,
    { message: "at least one field to update is required" },
  )

export type ContentPlaySessionUpdateInput = z.infer<typeof contentPlaySessionUpdateInputSchema>

export const contentAnalysisResultCreateInputSchema = z
  .object({
    contentId: z.string().min(1),
    summary: z.string().nullable().optional(),
    result: z.unknown(),
  })
  .refine((v) => v.result !== undefined, {
    message: "result is required",
    path: ["result"],
  })

export type ContentAnalysisResultCreateInput = z.infer<typeof contentAnalysisResultCreateInputSchema>

export const contentAnalysisDetailInputSchema = z.object({
  contentId: z.string().min(1),
})

export type ContentAnalysisDetailInput = z.infer<typeof contentAnalysisDetailInputSchema>

export const aiAnalysisLanguageSchema = z.enum(["en", "ja", "ko"]).optional()

export const aiGenerateSummaryInputSchema = z.object({
  contentId: z.string().min(1),
  language: aiAnalysisLanguageSchema,
})

export type AiGenerateSummaryInput = z.infer<typeof aiGenerateSummaryInputSchema>

export const contentAiAnalysisResultSchema = z.object({
  summary: z.string().min(1),
  similarities: z.array(z.string().min(1)).min(1),
  differences: z.array(z.string().min(1)).min(1),
  impressions: z.array(z.string().min(1)).min(1),
  futureDirections: z.array(z.string().min(1)).min(1),
  relationshipInsights: z.array(z.string().min(1)).min(1),
  recommendedConversationPrompts: z.array(z.string().min(1)).min(1),
})

export type ContentAiAnalysisResult = z.infer<typeof contentAiAnalysisResultSchema>

export const contentAnalysisResultUpdateInputSchema = z
  .object({
    id: z.string().min(1),
    summary: z.string().nullable().optional(),
    result: z.unknown().optional(),
  })
  .refine((v) => v.summary !== undefined || v.result !== undefined, {
    message: "at least one field to update is required",
  })

export type ContentAnalysisResultUpdateInput = z.infer<typeof contentAnalysisResultUpdateInputSchema>
