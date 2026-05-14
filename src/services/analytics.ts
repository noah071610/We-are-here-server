import { and, desc, eq, sql } from "drizzle-orm"
import type { getDb } from "../db"
import { analyticsEvent, analyticsEventType, profile, user } from "../db/schema"
import type { AnalyticsEventCreateInput } from "../trpc/validation/analytics"
import type { ContentPlayAccess } from "./content-play-session"

type Db = ReturnType<typeof getDb>

export type CoupleTimelineEvent = {
  id: string
  eventType: (typeof analyticsEventType)[number]
  contentId: string | null
  createdAt: Date
  actor: {
    userId: string
    nickname: string
    name: string | null
    avatarUrl: string | null
  }
}

export async function createAnalyticsEvent(
  db: Db,
  access: ContentPlayAccess,
  actorUserId: string,
  input: AnalyticsEventCreateInput & { id: string },
) {
  const baseValues = {
    id: input.id,
    eventType: input.eventType,
    coupleId: access.couple.id,
    actorUserId,
    contentId: input.contentId ?? null,
    sessionId: input.sessionId ?? null,
    payload: input.payload ?? null,
  }

  if (input.eventType === "CONTENT_COMPLETED_BOTH") {
    const contentId = input.contentId
    if (!contentId) {
      throw new Error("contentId is required for CONTENT_COMPLETED_BOTH")
    }

    await db
      .insert(analyticsEvent)
      .values(baseValues)
      .onConflictDoNothing({
        target: [analyticsEvent.coupleId, analyticsEvent.contentId],
        where: sql`${analyticsEvent.eventType} = 'CONTENT_COMPLETED_BOTH'`,
      })

    const [row] = await db
      .select()
      .from(analyticsEvent)
      .where(
        and(
          eq(analyticsEvent.coupleId, access.couple.id),
          eq(analyticsEvent.eventType, input.eventType),
          eq(analyticsEvent.contentId, contentId),
        ),
      )
      .limit(1)

    if (!row) {
      throw new Error("expected analytics_event row for CONTENT_COMPLETED_BOTH")
    }
    return row
  }

  const [row] = await db.insert(analyticsEvent).values(baseValues).returning()

  return row
}

export async function listCoupleTimelineEvents(
  db: Db,
  coupleId: string,
  limit: number,
): Promise<CoupleTimelineEvent[]> {
  const rows = await db
    .select({
      id: analyticsEvent.id,
      eventType: analyticsEvent.eventType,
      contentId: analyticsEvent.contentId,
      createdAt: analyticsEvent.createdAt,
      actorUserId: analyticsEvent.actorUserId,
      userName: user.name,
      userAvatarUrl: profile.avatarUrl,
      profileNickname: profile.nickname,
    })
    .from(analyticsEvent)
    .innerJoin(user, eq(analyticsEvent.actorUserId, user.id))
    .innerJoin(profile, eq(profile.userId, user.id))
    .where(eq(analyticsEvent.coupleId, coupleId))
    .orderBy(desc(analyticsEvent.createdAt))
    .limit(limit)

  return rows.map((r) => ({
    id: r.id,
    eventType: r.eventType,
    contentId: r.contentId,
    createdAt: r.createdAt,
    actor: {
      userId: r.actorUserId!,
      nickname: r.profileNickname,
      name: r.userName,
      avatarUrl: r.userAvatarUrl,
    },
  }))
}
