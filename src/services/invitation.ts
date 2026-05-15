import { and, desc, eq, gt, ne } from "drizzle-orm"
import type { getDb } from "../db"
import { couple, invitation } from "../db/schema"
import { findCoupleRowForUser } from "./couple"

type Db = ReturnType<typeof getDb>

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const CODE_LEN = 6
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000

function randomInviteCode(): string {
  const bytes = new Uint8Array(CODE_LEN)
  crypto.getRandomValues(bytes)
  let s = ""
  for (let i = 0; i < CODE_LEN; i++) s += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length]!
  return s
}

export async function createInvitationForInviter(db: Db, inviterUserId: string, options?: { expiresAtMs?: number }) {
  if (await findCoupleRowForUser(db, inviterUserId)) {
    throw new Error("already in couple")
  }
  const expiresAt = new Date(options?.expiresAtMs ?? Date.now() + DEFAULT_TTL_MS)
  const id = crypto.randomUUID()

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomInviteCode()
    try {
      const [row] = await db
        .insert(invitation)
        .values({
          id,
          code,
          inviterUserId,
          status: "pending",
          expiresAt,
        })
        .returning()
      return row
    } catch {
      /* unique(code) 충돌 시 재시도 */
    }
  }
  throw new Error("could not allocate invitation code")
}

/** 초대자 본인 소유 초대 중 `accepted` 가 아닌 행만 삭제 */
export async function deleteInvitationOwned(db: Db, invitationId: string, inviterUserId: string): Promise<boolean> {
  const removed = await db
    .delete(invitation)
    .where(
      and(
        eq(invitation.id, invitationId),
        eq(invitation.inviterUserId, inviterUserId),
        ne(invitation.status, "accepted"),
      ),
    )
    .returning({ id: invitation.id })
  return removed.length > 0
}

export async function getPendingInvitationForInviter(db: Db, inviterUserId: string) {
  const rows = await db
    .select()
    .from(invitation)
    .where(
      and(
        eq(invitation.inviterUserId, inviterUserId),
        eq(invitation.status, "pending"),
        gt(invitation.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(invitation.createdAt))
    .limit(1)
  return rows[0]
}

export type RedeemInviteFailureReason =
  | "not_found"
  | "not_pending"
  | "expired"
  | "self_invite"
  | "already_paired"

export async function redeemInvitationByCode(db: Db, redeemerUserId: string, rawCode: string) {
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
  const found = await db.select().from(invitation).where(eq(invitation.code, code)).limit(1)
  const invRow = found[0]
  if (!invRow) return { ok: false as const, reason: "not_found" satisfies RedeemInviteFailureReason }
  if (invRow.status !== "pending") return { ok: false as const, reason: "not_pending" }
  if (invRow.expiresAt.getTime() <= Date.now()) return { ok: false as const, reason: "expired" }
  if (invRow.inviterUserId === redeemerUserId) return { ok: false as const, reason: "self_invite" }

  const [inviterCouple, redeemerCouple] = await Promise.all([
    findCoupleRowForUser(db, invRow.inviterUserId),
    findCoupleRowForUser(db, redeemerUserId),
  ])
  if (inviterCouple || redeemerCouple) return { ok: false as const, reason: "already_paired" }

  const coupleId = crypto.randomUUID()
  await db.transaction(async (tx) => {
    await tx.insert(couple).values({
      id: coupleId,
      memberOneUserId: invRow.inviterUserId,
      memberTwoUserId: redeemerUserId,
    })

    const deletedRows = await tx
      .delete(invitation)
      .where(eq(invitation.id, invRow.id))
      .returning({ id: invitation.id })

    // 커플 생성과 초대 코드 삭제를 한 트랜잭션으로 묶어 불일치 상태를 방지한다.
    if (deletedRows.length === 0) {
      throw new Error("invitation not found during redeem")
    }
  })

  return { ok: true as const, coupleId, invitationId: invRow.id }
}
