import { z } from "zod"

export const invitationCreateInputSchema = z.object({
  /** 만료 시각(ms epoch). 생략 시 서비스 기본 TTL */
  expiresAtMs: z.number().int().positive().optional(),
})

export type InvitationCreateInput = z.infer<typeof invitationCreateInputSchema>

export const invitationDeleteInputSchema = z.object({
  id: z.string().uuid(),
})

export type InvitationDeleteInput = z.infer<typeof invitationDeleteInputSchema>

export const invitationRedeemInputSchema = z.object({
  code: z.string().length(6),
})

export type InvitationRedeemInput = z.infer<typeof invitationRedeemInputSchema>
