import { and, desc, eq } from "drizzle-orm"
import type { getDb } from "../db"
import { content } from "../db/schema"

type Db = ReturnType<typeof getDb>

export async function listAllContent(db: Db) {
  return db.query.content.findMany({
    orderBy: [desc(content.updatedAt), desc(content.createdAt)],
  })
}

export async function getContentById(db: Db, id: string) {
  return db.query.content.findFirst({ where: eq(content.id, id) })
}

export async function listPublishedContent(db: Db) {
  return db.query.content.findMany({
    where: eq(content.isPublished, true),
    orderBy: [desc(content.publishedAt), desc(content.createdAt)],
  })
}

export async function getPublishedContentById(db: Db, id: string) {
  return db.query.content.findFirst({
    where: and(eq(content.id, id), eq(content.isPublished, true)),
  })
}

export async function createContent(
  db: Db,
  input: {
    id: string
    title: string
    description?: string | null
    thumbnailUrl?: string | null
    content: unknown
    isPublished?: boolean
    publishedAt?: Date | null
  },
) {
  const isPublished = input.isPublished ?? false
  const publishedAt = input.publishedAt !== undefined ? input.publishedAt : isPublished ? new Date() : null

  const [row] = await db
    .insert(content)
    .values({
      id: input.id,
      title: input.title,
      description: input.description ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      content: input.content,
      isPublished,
      publishedAt: publishedAt ?? null,
    })
    .returning()
  return row
}

export async function updateContent(
  db: Db,
  id: string,
  patch: {
    title?: string
    description?: string | null
    thumbnailUrl?: string | null
    content?: unknown
    isPublished?: boolean
    publishedAt?: Date | null
  },
) {
  const [existing] = await db.select().from(content).where(eq(content.id, id)).limit(1)
  if (!existing) return undefined

  let publishedAt: Date | null = existing.publishedAt ?? null
  if (patch.publishedAt !== undefined) {
    publishedAt = patch.publishedAt
  }
  if (patch.isPublished === true && !existing.isPublished && patch.publishedAt === undefined) {
    publishedAt = publishedAt ?? new Date()
  }
  if (patch.isPublished === false && patch.publishedAt === undefined) {
    publishedAt = null
  }

  const [row] = await db
    .update(content)
    .set({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.thumbnailUrl !== undefined ? { thumbnailUrl: patch.thumbnailUrl } : {}),
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      ...(patch.isPublished !== undefined ? { isPublished: patch.isPublished } : {}),
      publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(content.id, id))
    .returning()
  return row
}

export async function deleteContent(db: Db, id: string) {
  const result = await db.delete(content).where(eq(content.id, id)).returning({ id: content.id })
  return result[0]
}
