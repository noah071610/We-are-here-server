import { z } from "zod"

/** 다국어 텍스트: 단일 문자열 또는 locale → 문자열 맵 */
export const i18nTextSchema = z.union([z.string(), z.record(z.string(), z.string())])

export const scoreMapSchema = z.record(z.string(), z.number())

export const contentOptionSchema = z.object({
  label: i18nTextSchema,
  value: z.string(),
  imageUrl: z.string().optional(),
  scores: scoreMapSchema.optional(),
  isCorrect: z.boolean().optional(),
  explanation: i18nTextSchema.optional(),
  nextId: z.string().optional(),
})

export const scaleConfigSchema = z.object({
  min: z.number(),
  max: z.number(),
  step: z.number(),
  minLabel: i18nTextSchema.optional(),
  maxLabel: i18nTextSchema.optional(),
  scoreMultipliers: scoreMapSchema.optional(),
  correctValue: z.number().optional(),
  correctRange: z.object({ min: z.number(), max: z.number() }).optional(),
})

export const questionSchema = z.object({
  id: z.string().min(1),
  title: i18nTextSchema,
  description: i18nTextSchema.optional(),
  optionDisplayType: z.enum(["SELECT", "IMAGE", "SCALE", "CHECKBOX", "BLANK", "SUBJECTIVE"]),
  options: z.array(contentOptionSchema).optional(),
  scale: scaleConfigSchema.optional(),
  minSelect: z.number().optional(),
  maxSelect: z.number().optional(),
  correctAnswers: z.array(z.string()).optional(),
  nextId: z.string().optional(),
})

export const contentResultSchema = z.object({
  key: z.string().min(1),
  label: i18nTextSchema,
  title: i18nTextSchema,
  thumbnail: z.string().optional(),
  content: i18nTextSchema,
})

export const contentConfigSchema = z.object({
  allowBack: z.boolean().optional(),
  timer: z
    .object({
      type: z.enum(["GLOBAL", "PER_QUESTION"]),
      durationSec: z.number().nonnegative(),
    })
    .optional(),
})

export const contentDataSchema = z.object({
  type: z.enum(["PSYCHOLOGY", "QUIZ"]),
  config: contentConfigSchema.optional(),
  questions: z.array(questionSchema).min(1),
  results: z.array(contentResultSchema).min(1),
})

export type ContentData = z.infer<typeof contentDataSchema>
export type I18nText = z.infer<typeof i18nTextSchema>
export type ContentType = ContentData["type"]
export type OptionDisplayType = z.infer<typeof questionSchema>["optionDisplayType"]
export type ContentOption = z.infer<typeof contentOptionSchema>
export type ScaleConfig = z.infer<typeof scaleConfigSchema>
export type Question = z.infer<typeof questionSchema>
export type ContentResult = z.infer<typeof contentResultSchema>
export type ContentConfig = z.infer<typeof contentConfigSchema>
