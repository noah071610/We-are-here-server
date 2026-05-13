import { z } from "zod"

export const profileCreateInputSchema = z.object({
  nickname: z.string().min(1).max(64),
  countryCode: z.string().min(2).max(8).nullable().optional(),
  userId: z.string(),
})

export type ProfileCreateInput = z.infer<typeof profileCreateInputSchema>

export const profileUpdateInputSchema = z
  .object({
    nickname: z.string().min(1).max(64).optional(),
    countryCode: z.string().min(2).max(8).nullable().optional(),
  })
  .refine((v) => v.nickname !== undefined || v.countryCode !== undefined, {
    message: "at least one of nickname, countryCode is required",
  })

export type ProfileUpdateInput = z.infer<typeof profileUpdateInputSchema>
