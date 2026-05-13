import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

import type { ContentData } from "../trpc/validation/content-data"

export const userRole = ["USER", "ADMIN"] as const

export const user = sqliteTable("user", {
  // Supabase Auth의 user_id(UUID)를 저장하기 위해 text 타입 사용
  id: text("id").primaryKey().notNull(),

  // 익명 로그인 상태를 고려하여 Nullable 허용
  email: text("email"),
  name: text("name"),
  role: text("role", { enum: userRole }).default(userRole[0]).notNull(),

  // SQLite는 boolean을 네이티브로 지원하지 않으므로 integer의 boolean 모드 사용 (0 또는 1로 저장됨)
  isAnonymous: integer("is_anonymous", { mode: "boolean" }).default(true).notNull(),

  // 날짜 관리는 Drizzle의 내장 함수를 사용하여 클린하고 일관성 있게 처리
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),

  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()) // 업데이트 발생 시 자동으로 현재 시간 갱신
    .notNull(),
})

/** Supabase auth user id(= user.id)당 1행. 로그인 후 닉네임·국가 등 최소 프로필. */
export const profile = sqliteTable("profile", {
  userId: text("user_id")
    .primaryKey()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  nickname: text("nickname").notNull(),
  /** ISO 3166-1 alpha-2 등 서비스에서 쓰는 짧은 코드만 저장해도 됨 */
  countryCode: text("country_code"),
  avatarUrl: text("avatar_url"),

  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date())
    .notNull(),
})

/**
 * 커플 1쌍. 멤버 테이블 없이 두 user id만 저장.
 * 기능 게이트는 “내 user id가 memberOne 또는 memberTwo인 couple 존재”로 조회.
 */
export const couple = sqliteTable("couple", {
  id: text("id").primaryKey().notNull(),

  memberOneUserId: text("member_one_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  memberTwoUserId: text("member_two_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
})

/**
 * 초대 코드 1건. 수락 시 redeemedByUserId + coupleId 채움.
 * 상태·만료는 서비스에서 처리 (만료 행은 status로만 구분해도 됨).
 */
export const invitation = sqliteTable("invitation", {
  id: text("id").primaryKey().notNull(),

  /** 상대에게 공유하는 비밀 코드 (랜덤, 충분한 엔트로피 — 생성은 서비스 레이어) */
  code: text("code").notNull().unique(),

  inviterUserId: text("inviter_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  /** pending | accepted | cancelled */
  status: text("status").notNull().default("pending"),

  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),

  redeemedByUserId: text("redeemed_by_user_id").references(() => user.id, {
    onDelete: "set null",
  }),

  coupleId: text("couple_id").references(() => couple.id, {
    onDelete: "set null",
  }),

  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
})

/**
 * Content (운영자용) — 태그와 다대다 관계
 */
export const content = sqliteTable("content", {
  id: text("id").primaryKey().notNull(),

  title: text("title").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  content: text("content", { mode: "json" }).$type<ContentData>().notNull(),
  isPublished: integer("is_published", { mode: "boolean" }).default(false).notNull(),
  publishedAt: integer("published_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date())
    .notNull(),
})

/**
 * Tag (운영자용)
 */
export const tag = sqliteTable("tag", {
  id: text("id").primaryKey().notNull(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
})

/**
 * Content - Tag 다대다 릴레이션
 */
export const contentTag = sqliteTable("content_tag", {
  id: text("id").primaryKey().notNull(),

  contentId: text("content_id")
    .notNull()
    .references(() => content.id, { onDelete: "cascade" }),
  tagId: text("tag_id")
    .notNull()
    .references(() => tag.id, { onDelete: "cascade" }),
})

export const analyticsEventType = [
  "COUPLE_MATCHED",
  "CONTENT_OPENED",
  "CONTENT_ABANDONED",
  "CONTENT_COMPLETED",
  "CONTENT_COMPLETED_BOTH",
] as const

export const CONTENT_PLAY_SESSION_STATUS = ["IN_PROGRESS", "ABANDONED", "COMPLETED"] as const

export const analyticsEvent = sqliteTable("analytics_event", {
  id: text("id").primaryKey().notNull(),
  eventType: text("event_type", { enum: analyticsEventType }).default(analyticsEventType[0]).notNull(),

  coupleId: text("couple_id").references(() => couple.id, { onDelete: "cascade" }),
  actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
  contentId: text("content_id").references(() => content.id, { onDelete: "set null" }),
  sessionId: text("session_id"),

  /**
   * 이벤트 확장 필드:
   * - questionId
   * - selectedOptionId
   * - dwellSeconds
   * - summaryText
   * 등 필요한 값 저장
   */
  payload: text("payload", { mode: "json" }),

  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
})

/**
 * 콘텐츠 플레이 1회(입장~이탈/완료) 단위 세션.
 */
export const contentPlaySession = sqliteTable("content_play_session", {
  id: text("id").primaryKey().notNull(),

  coupleId: text("couple_id")
    .notNull()
    .references(() => couple.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  contentId: text("content_id")
    .notNull()
    .references(() => content.id, { onDelete: "cascade" }),

  /** in_progress | abandoned | completed */
  status: text("status", { enum: CONTENT_PLAY_SESSION_STATUS }).default(CONTENT_PLAY_SESSION_STATUS[0]).notNull(),

  lastQuestionId: text("last_question_id"),
  progressPercent: integer("progress_percent").notNull().default(0),
  /**
   * 문항 응답 배열(JSON)
   * 예) [{ questionId, selectedOptionId, selectedOptionLabel, answeredAt, payload }]
   */
  responses: text("responses", { mode: "json" }).notNull().default("[]"),
  result: text("result", { mode: "json" }),
  score: integer("score"),

  startedAt: integer("started_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  endedAt: integer("ended_at", { mode: "timestamp" }),
  abandonedAt: integer("abandoned_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),

  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date())
    .notNull(),
})

/**
 * 완료된 세션 기반 분석 결과.
 * 애널리틱스 탭/리포트 화면의 원천 데이터로 사용.
 */
export const contentAnalysisResult = sqliteTable("content_analysis_result", {
  id: text("id").primaryKey().notNull(),

  coupleId: text("couple_id")
    .notNull()
    .references(() => couple.id, { onDelete: "cascade" }),
  contentId: text("content_id")
    .notNull()
    .references(() => content.id, { onDelete: "cascade" }),

  summary: text("summary"),
  result: text("result", { mode: "json" }).notNull(),

  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
})
