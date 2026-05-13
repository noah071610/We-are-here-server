import { TRPCError } from "@trpc/server"
import { getDb } from "../../db"
import {
  createContent,
  deleteContent,
  getContentById,
  getPublishedContentById,
  listAllContent,
  listPublishedContent,
  updateContent,
} from "../../services/content"
import { protectedAdminProcedure, publicProcedure, router } from "../trpc"
import {
  contentCreateInputSchema,
  contentDeleteInputSchema,
  contentGetInputSchema,
  contentUpdateInputSchema,
} from "../validation/content"

export const contentRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    return listPublishedContent(db)
  }),

  adminList: protectedAdminProcedure.query(async ({ ctx }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    return listAllContent(db)
  }),

  adminGet: protectedAdminProcedure.input(contentGetInputSchema).query(async ({ ctx, input }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    return getContentById(db, input.id) ?? null
  }),

  get: publicProcedure.input(contentGetInputSchema).query(async ({ ctx, input }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const row = await getPublishedContentById(db, input.id)
    return row ?? null
  }),

  create: protectedAdminProcedure.input(contentCreateInputSchema).mutation(async ({ ctx, input }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const id = crypto.randomUUID()
    const row = await createContent(db, { id, ...input })
    return row
  }),

  update: protectedAdminProcedure.input(contentUpdateInputSchema).mutation(async ({ ctx, input }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const { id, ...patch } = input
    const row = await updateContent(db, id, patch)
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "content not found" })
    return row
  }),

  delete: protectedAdminProcedure.input(contentDeleteInputSchema).mutation(async ({ ctx, input }) => {
    const db = getDb(ctx.env.WE_ARE_HERE_DB)
    const row = await deleteContent(db, input.id)
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "content not found" })
    return { ok: true as const }
  }),
})
