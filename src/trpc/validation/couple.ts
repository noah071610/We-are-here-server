import { z } from "zod"

export const coupleDissolveInputSchema = z.object({
  nickname: z.string().min(1),
})

export type CoupleDissolveInput = z.infer<typeof coupleDissolveInputSchema>
