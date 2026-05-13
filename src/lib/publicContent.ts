/** 퍼블릭 응답에서 빼는 필드 — 나중에 조정하기 쉽게 한곳에 모음 */
const CONTENT_SENSITIVE_KEYS = ["userHash", "embedCode"] as const

export function stripContentRowForPublic<T extends Record<string, unknown>>(
  row: T,
): Omit<T, (typeof CONTENT_SENSITIVE_KEYS)[number]> {
  const out = { ...row }
  for (const k of CONTENT_SENSITIVE_KEYS) {
    delete out[k]
  }
  return out as Omit<T, (typeof CONTENT_SENSITIVE_KEYS)[number]>
}
