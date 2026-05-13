import { eq } from "drizzle-orm"
import type { getDb } from "../db"
import { contentPlaySession, CONTENT_PLAY_SESSION_STATUS } from "../db/schema"
import { listPublishedContent } from "./content"
import { getProfileByUserId } from "./profile"

type Db = ReturnType<typeof getDb>

export type ContentPlayStatus = (typeof CONTENT_PLAY_SESSION_STATUS)[number] | null

export type CoupleContentOverviewMember = {
  userId: string
  nickname: string
  avatarUrl: string | null
  playStatus: ContentPlayStatus
}

export type CoupleContentOverviewRow = {
  content: {
    id: string
    title: string
    description: string | null
    thumbnailUrl: string | null
  }
  memberOne: CoupleContentOverviewMember
  memberTwo: CoupleContentOverviewMember
  canAnalyze: boolean
}

function pickLatestSession<
  T extends {
    contentId: string
    userId: string
    status: (typeof CONTENT_PLAY_SESSION_STATUS)[number]
    updatedAt: Date
    createdAt: Date
  },
>(sessions: T[], contentId: string, userId: string): T | undefined {
  let best: T | undefined
  for (const row of sessions) {
    if (row.contentId !== contentId || row.userId !== userId) continue
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

export async function listCoupleContentPlayOverview(
  db: Db,
  coupleId: string,
  memberOneUserId: string,
  memberTwoUserId: string,
): Promise<CoupleContentOverviewRow[]> {
  const [contents, sessions, profileOne, profileTwo] = await Promise.all([
    listPublishedContent(db),
    db.select().from(contentPlaySession).where(eq(contentPlaySession.coupleId, coupleId)),
    getProfileByUserId(db, memberOneUserId),
    getProfileByUserId(db, memberTwoUserId),
  ])

  const nick = (p: typeof profileOne, fallback: string) => p?.nickname ?? fallback

  return contents.map((c) => {
    const s1 = pickLatestSession(sessions, c.id, memberOneUserId)
    const s2 = pickLatestSession(sessions, c.id, memberTwoUserId)
    const status1 = s1 ? s1.status : null
    const status2 = s2 ? s2.status : null
    const canAnalyze = status1 === "COMPLETED" && status2 === "COMPLETED"

    return {
      content: {
        id: c.id,
        title: c.title,
        description: c.description ?? null,
        thumbnailUrl: c.thumbnailUrl ?? null,
      },
      memberOne: {
        userId: memberOneUserId,
        nickname: nick(profileOne, "—"),
        avatarUrl: profileOne?.avatarUrl ?? null,
        playStatus: status1,
      },
      memberTwo: {
        userId: memberTwoUserId,
        nickname: nick(profileTwo, "—"),
        avatarUrl: profileTwo?.avatarUrl ?? null,
        playStatus: status2,
      },
      canAnalyze,
    }
  })
}
