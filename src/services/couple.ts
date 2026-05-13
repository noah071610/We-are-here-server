import { eq, or } from "drizzle-orm"
import type { getDb } from "../db"
import { couple } from "../db/schema"

type Db = ReturnType<typeof getDb>

export async function findCoupleRowForUser(db: Db, userId: string) {
  const rows = await db
    .select()
    .from(couple)
    .where(or(eq(couple.memberOneUserId, userId), eq(couple.memberTwoUserId, userId)))
    .limit(1)
  return rows[0]
}
