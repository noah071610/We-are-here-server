import { z } from "zod"

import { contentDataSchema } from "./content-data"

export const contentIdSchema = z.string().min(1)

export const contentGetInputSchema = z.object({
  id: contentIdSchema,
})

export const contentCreateInputSchema = z.object({
  title: z.string().min(1).max(512),
  description: z.string().max(16_000).nullable().optional(),
  thumbnailUrl: z.string().max(2048).nullable().optional(),
  content: contentDataSchema,
  isPublished: z.boolean().optional(),
  publishedAt: z.coerce.date().nullable().optional(),
})

export type ContentCreateInput = z.infer<typeof contentCreateInputSchema>

export const contentUpdateInputSchema = z
  .object({
    id: contentIdSchema,
    title: z.string().min(1).max(512).optional(),
    description: z.string().max(16_000).nullable().optional(),
    thumbnailUrl: z.string().max(2048).nullable().optional(),
    content: contentDataSchema.optional(),
    isPublished: z.boolean().optional(),
    publishedAt: z.coerce.date().nullable().optional(),
  })
  .refine(
    (v) =>
      v.title !== undefined ||
      v.description !== undefined ||
      v.thumbnailUrl !== undefined ||
      v.content !== undefined ||
      v.isPublished !== undefined ||
      v.publishedAt !== undefined,
    { message: "at least one field to update is required" },
  )

export type ContentUpdateInput = z.infer<typeof contentUpdateInputSchema>

export const contentDeleteInputSchema = z.object({
  id: contentIdSchema,
})
