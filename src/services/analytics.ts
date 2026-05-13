import { desc, eq } from "drizzle-orm"
import type { getDb } from "../db"
import { analyticsEvent, analyticsEventType, profile, user } from "../db/schema"

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

export async function listCoupleTimelineEvents(db: Db, coupleId: string, limit: number): Promise<CoupleTimelineEvent[]> {
  const rows = await db
    .select({
      id: analyticsEvent.id,
      eventType: analyticsEvent.eventType,
      contentId: analyticsEvent.contentId,
      createdAt: analyticsEvent.createdAt,
      actorUserId: analyticsEvent.actorUserId,
      userName: user.name,
      userAvatarUrl: user.avatarUrl,
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
