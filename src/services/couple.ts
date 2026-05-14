import { eq, inArray, or } from "drizzle-orm"
import type { getDb } from "../db"
import { analyticsEvent, contentAnalysisResult, contentPlaySession, couple, profile } from "../db/schema"

type Db = ReturnType<typeof getDb>

export async function findCoupleRowForUser(db: Db, userId: string) {
  const rows = await db
    .select()
    .from(couple)
    .where(or(eq(couple.memberOneUserId, userId), eq(couple.memberTwoUserId, userId)))
    .limit(1)
  return rows[0]
}

export async function dissolveCouple(db: Db, currentUserId: string, nickname: string) {
  const coupleRow = await findCoupleRowForUser(db, currentUserId)
  if (!coupleRow) return null

  const myProfile = await db.query.profile.findFirst({ where: eq(profile.userId, currentUserId) })
  if (!myProfile || myProfile.nickname.trim() !== nickname.trim()) {
    throw new Error("NICKNAME_MISMATCH")
  }

  const memberUserIds = [coupleRow.memberOneUserId, coupleRow.memberTwoUserId]

  await db
    .delete(analyticsEvent)
    .where(or(eq(analyticsEvent.coupleId, coupleRow.id), inArray(analyticsEvent.actorUserId, memberUserIds)))
  await db.delete(contentPlaySession).where(eq(contentPlaySession.coupleId, coupleRow.id))
  await db.delete(contentAnalysisResult).where(eq(contentAnalysisResult.coupleId, coupleRow.id))
  await db.delete(profile).where(inArray(profile.userId, memberUserIds))
  await db.delete(couple).where(eq(couple.id, coupleRow.id))

  return {
    coupleId: coupleRow.id,
    deletedProfileUserIds: memberUserIds,
  }
}
