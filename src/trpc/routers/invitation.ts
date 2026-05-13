import { TRPCError } from "@trpc/server"
import { getDb } from "../../db"
import {
  createInvitationForInviter,
  deleteInvitationOwned,
  getPendingInvitationForInviter,
  redeemInvitationByCode,
} from "../../services/invitation"
import { protectedProcedure, router } from "../trpc"
import {
  invitationCreateInputSchema,
  invitationDeleteInputSchema,
  invitationRedeemInputSchema,
} from "../validation/invitation"

const redeemErrorCode: Record<string, TRPCError["code"]> = {
  not_found: "NOT_FOUND",
  not_pending: "BAD_REQUEST",
  expired: "BAD_REQUEST",
  self_invite: "BAD_REQUEST",
  already_paired: "CONFLICT",
}

export const invitationRouter = router({
  myPending: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const invitation = await getPendingInvitationForInviter(db, ctx.user.id)
    return invitation || null
  }),

  redeem: protectedProcedure.input(invitationRedeemInputSchema).mutation(async ({ ctx, input }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const result = await redeemInvitationByCode(db, ctx.user.id, input.code)
    if (!result.ok) {
      throw new TRPCError({
        code: redeemErrorCode[result.reason] ?? "BAD_REQUEST",
        message: result.reason,
      })
    }
    return { ok: true as const, coupleId: result.coupleId }
  }),

  create: protectedProcedure.input(invitationCreateInputSchema).mutation(async ({ ctx, input }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    try {
      const row = await createInvitationForInviter(db, ctx.user.id, {
        expiresAtMs: input.expiresAtMs,
      })
      return row
    } catch (e) {
      const msg = e instanceof Error ? e.message : "invitation create failed"
      if (msg === "already in couple") {
        throw new TRPCError({ code: "CONFLICT", message: msg })
      }
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: msg })
    }
  }),

  delete: protectedProcedure.input(invitationDeleteInputSchema).mutation(async ({ ctx, input }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const ok = await deleteInvitationOwned(db, input.id, ctx.user.id)
    if (!ok) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "invitation not found or cannot be deleted",
      })
    }
    return { ok: true as const }
  }),
})
