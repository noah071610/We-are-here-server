import { z } from "zod"

export const userSyncInputSchema = z.object({
  /** Supabase Auth `session.access_token` */
  deviceId: z.string().min(1),
})

export const userCreateInputSchema = z.object({
  /** Supabase Auth `session.access_token` */
  deviceId: z.string().min(1),
})

export const userRefreshInputSchema = z.object({
  refreshToken: z.string().min(1),
})

export type UserSyncInput = z.infer<typeof userSyncInputSchema>
