import { and, desc, eq } from "drizzle-orm"
import type { getDb } from "../db"
import { contentAnalysisResult, contentPlaySession, CONTENT_PLAY_SESSION_STATUS } from "../db/schema"
import type {
  ContentAnalysisDetailInput,
  ContentAnalysisResultCreateInput,
  ContentAnalysisResultUpdateInput,
  ContentPlaySessionCreateInput,
  ContentPlaySessionListInput,
  ContentPlaySessionUpdateInput,
} from "../trpc/validation/analytics"
import { findCoupleRowForUser } from "./couple"
import { getProfileByUserId } from "./profile"

type Db = ReturnType<typeof getDb>
type ContentPlayStatus = (typeof CONTENT_PLAY_SESSION_STATUS)[number]

function pickLatestSessionForUser<
  T extends {
    userId: string
    updatedAt: Date
    createdAt: Date
  },
>(sessions: T[], userId: string): T | undefined {
  let best: T | undefined
  for (const row of sessions) {
    if (row.userId !== userId) continue
    if (!best) {
      best = row
      continue
    }
    const rowT = row.updatedAt.getTime()
    const bestT = best.updatedAt.getTime()
    if (rowT > bestT || (rowT === bestT && row.createdAt.getTime() > best.createdAt.getTime())) {
      best = row
    }
  }
  return best
}

export type ContentPlayAccess = {
  couple: NonNullable<Awaited<ReturnType<typeof findCoupleRowForUser>>>
  profile: NonNullable<Awaited<ReturnType<typeof getProfileByUserId>>>
  memberUserIds: [string, string]
}

export async function getContentPlayAccess(db: Db, userId: string): Promise<ContentPlayAccess | null> {
  const [coupleRow, profileRow] = await Promise.all([findCoupleRowForUser(db, userId), getProfileByUserId(db, userId)])
  if (!coupleRow || !profileRow) return null

  return {
    couple: coupleRow,
    profile: profileRow,
    memberUserIds: [coupleRow.memberOneUserId, coupleRow.memberTwoUserId],
  }
}

function applyStatusTimestamps(
  status: ContentPlayStatus | undefined,
  input: {
    endedAt?: Date | null
    abandonedAt?: Date | null
    completedAt?: Date | null
  },
) {
  const now = new Date()
  const isAbandoned = status === "ABANDONED"
  const isCompleted = status === "COMPLETED"

  return {
    ...(input.endedAt !== undefined ? { endedAt: input.endedAt } : {}),
    ...(input.abandonedAt !== undefined ? { abandonedAt: input.abandonedAt } : {}),
    ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
    ...(isAbandoned && input.endedAt === undefined ? { endedAt: now } : {}),
    ...(isAbandoned && input.abandonedAt === undefined ? { abandonedAt: now } : {}),
    ...(isCompleted && input.endedAt === undefined ? { endedAt: now } : {}),
    ...(isCompleted && input.completedAt === undefined ? { completedAt: now } : {}),
  }
}

export async function listContentPlaySessions(db: Db, access: ContentPlayAccess, input: ContentPlaySessionListInput) {
  const filters = [eq(contentPlaySession.coupleId, access.couple.id)]
  if (input?.contentId) filters.push(eq(contentPlaySession.contentId, input.contentId))
  if (input?.userId) {
    if (!access.memberUserIds.includes(input.userId)) return []
    filters.push(eq(contentPlaySession.userId, input.userId))
  }

  return db
    .select()
    .from(contentPlaySession)
    .where(and(...filters))
    .orderBy(desc(contentPlaySession.updatedAt), desc(contentPlaySession.createdAt))
    .limit(input?.limit ?? 100)
}

export async function createContentPlaySession(
  db: Db,
  access: ContentPlayAccess,
  userId: string,
  input: ContentPlaySessionCreateInput & { id: string },
) {
  const status = input.status ?? CONTENT_PLAY_SESSION_STATUS[0]
  const [row] = await db
    .insert(contentPlaySession)
    .values({
      id: input.id,
      coupleId: access.couple.id,
      userId,
      contentId: input.contentId,
      status,
      lastQuestionId: input.lastQuestionId ?? null,
      progressPercent: input.progressPercent ?? 0,
      responses: input.responses ?? [],
      result: input.result ?? null,
      score: input.score ?? null,
      startedAt: input.startedAt ?? new Date(),
      ...applyStatusTimestamps(status, input),
    })
    .returning()

  return row
}

export async function updateContentPlaySession(
  db: Db,
  access: ContentPlayAccess,
  input: ContentPlaySessionUpdateInput,
) {
  const [row] = await db
    .update(contentPlaySession)
    .set({
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.lastQuestionId !== undefined ? { lastQuestionId: input.lastQuestionId } : {}),
      ...(input.progressPercent !== undefined ? { progressPercent: input.progressPercent } : {}),
      ...(input.responses !== undefined ? { responses: input.responses } : {}),
      ...(input.result !== undefined ? { result: input.result } : {}),
      ...(input.score !== undefined ? { score: input.score } : {}),
      ...(input.startedAt !== undefined ? { startedAt: input.startedAt } : {}),
      ...applyStatusTimestamps(input.status, input),
      updatedAt: new Date(),
    })
    .where(and(eq(contentPlaySession.id, input.id), eq(contentPlaySession.coupleId, access.couple.id)))
    .returning()

  return row
}

export async function createContentAnalysisResult(
  db: Db,
  access: ContentPlayAccess,
  input: ContentAnalysisResultCreateInput & { id: string },
) {
  const [existing] = await db
    .select()
    .from(contentAnalysisResult)
    .where(and(eq(contentAnalysisResult.coupleId, access.couple.id), eq(contentAnalysisResult.contentId, input.contentId)))
    .limit(1)

  if (existing) return existing

  const [row] = await db
    .insert(contentAnalysisResult)
    .values({
      id: input.id,
      coupleId: access.couple.id,
      contentId: input.contentId,
      summary: input.summary ?? null,
      result: input.result,
    })
    .returning()

  return row
}

export async function updateContentAnalysisResult(
  db: Db,
  access: ContentPlayAccess,
  input: ContentAnalysisResultUpdateInput,
) {
  const [row] = await db
    .update(contentAnalysisResult)
    .set({
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
      ...(input.result !== undefined ? { result: input.result } : {}),
    })
    .where(and(eq(contentAnalysisResult.id, input.id), eq(contentAnalysisResult.coupleId, access.couple.id)))
    .returning()

  return row
}

export async function getOrCreateContentAnalysisDetail(
  db: Db,
  access: ContentPlayAccess,
  input: ContentAnalysisDetailInput & { id: string },
) {
  const sessions = await db
    .select()
    .from(contentPlaySession)
    .where(and(eq(contentPlaySession.coupleId, access.couple.id), eq(contentPlaySession.contentId, input.contentId)))
    .orderBy(desc(contentPlaySession.updatedAt), desc(contentPlaySession.createdAt))

  const memberOneSession = pickLatestSessionForUser(sessions, access.couple.memberOneUserId)
  const memberTwoSession = pickLatestSessionForUser(sessions, access.couple.memberTwoUserId)

  if (!memberOneSession || !memberTwoSession) return null
  if (memberOneSession.status !== "COMPLETED" || memberTwoSession.status !== "COMPLETED") return null

  const [existing] = await db
    .select()
    .from(contentAnalysisResult)
    .where(and(eq(contentAnalysisResult.coupleId, access.couple.id), eq(contentAnalysisResult.contentId, input.contentId)))
    .limit(1)

  if (existing) {
    return {
      analysisResult: existing,
      sessions: [memberOneSession, memberTwoSession],
    }
  }

  const [created] = await db
    .insert(contentAnalysisResult)
    .values({
      id: input.id,
      coupleId: access.couple.id,
      contentId: input.contentId,
      summary: null,
      result: {},
    })
    .returning()

  return {
    analysisResult: created,
    sessions: [memberOneSession, memberTwoSession],
  }
}
