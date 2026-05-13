import { eq } from "drizzle-orm"
import type { getDb } from "../db"
import { profile } from "../db/schema"

type Db = ReturnType<typeof getDb>

export async function getProfileByUserId(db: Db, userId: string) {
  return db.query.profile.findFirst({ where: eq(profile.userId, userId) })
}

export async function createProfile(db: Db, input: { userId: string; nickname: string; countryCode?: string | null }) {
  const [row] = await db
    .insert(profile)
    .values({
      userId: input.userId,
      nickname: input.nickname,
      countryCode: input.countryCode ?? null,
    })
    .returning()
  return row
}

export async function updateProfile(db: Db, userId: string, patch: { nickname?: string; countryCode?: string | null }) {
  const [row] = await db
    .update(profile)
    .set({
      ...(patch.nickname !== undefined ? { nickname: patch.nickname } : {}),
      ...(patch.countryCode !== undefined ? { countryCode: patch.countryCode } : {}),
      updatedAt: new Date(),
    })
    .where(eq(profile.userId, userId))
    .returning()
  return row
}

export async function deleteProfile(db: Db, userId: string) {
  await db.delete(profile).where(eq(profile.userId, userId))
}
