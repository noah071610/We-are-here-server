import { TRPCError } from "@trpc/server"
import type { getDb } from "../db"
import type { AiGenerateSummaryInput, ContentAiAnalysisResult } from "../trpc/validation/analytics"
import { contentAiAnalysisResultSchema } from "../trpc/validation/analytics"
import { getPublishedContentById } from "./content"
import type { ContentPlayAccess } from "./content-play-session"
import { getOrCreateContentAnalysisDetail, updateContentAnalysisResult } from "./content-play-session"

type Db = ReturnType<typeof getDb>

type OllamaGenerateResponse = {
  response?: string
  thinking?: string
  error?: string
}

const OLLAMA_MODEL = "qwen3:4b"

function isNonEmptyResult(value: unknown) {
  if (value === null || value === undefined) return false
  if (typeof value === "object" && !Array.isArray(value)) return Object.keys(value).length > 0
  return true
}

function languageLabel(language: AiGenerateSummaryInput["language"]) {
  // if (language === "ja") return "Japanese"
  // if (language === "en") return "English"
  return "Korean"
}

function buildAnalysisPrompt(input: {
  language: AiGenerateSummaryInput["language"]
  content: {
    title: string
    description: string | null
  }
  sessions: Array<{
    userId: string
    result: unknown
    responses: unknown
  }>
}) {
  const analysisBody = {
    content: {
      title: input.content.title,
      description: input.content.description ?? "",
    },
    sessions: input.sessions.map((session, index) => ({
      label: `session_${index + 1}`,
      userId: session.userId,
      result: session.result ?? null,
      responses: session.responses ?? [],
    })),
  }

  return [
    "You are an AI relationship analyst for a couple content app.",
    `Write every string value in ${languageLabel(input.language)}.`,
    "Analyze the two completed sessions and the content context holistically.",
    "Focus on how their test contents differ, their impressions, future direction, similar points, and meaningful relationship insights.",
    "Return JSON only. Do not include markdown, code fences, comments, or reasoning.",
    "The JSON must exactly match this schema:",
    JSON.stringify({
      summary: "string",
      similarities: ["string"],
      differences: ["string"],
      impressions: ["string"],
      futureDirections: ["string"],
      relationshipInsights: ["string"],
      recommendedConversationPrompts: ["string"],
    }),
    "Input:",
    JSON.stringify(analysisBody),
  ].join("\n")
}

function extractJsonObject(raw: string) {
  const withoutThink = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim()
  const withoutFence = withoutThink.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")
  const start = withoutFence.indexOf("{")
  const end = withoutFence.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return withoutFence
  return withoutFence.slice(start, end + 1)
}

async function requestOllamaAnalysis(ollamaBaseUrl: string, prompt: string): Promise<ContentAiAnalysisResult> {
  const url = `${ollamaBaseUrl.replace(/\/$/, "")}/api/generate`

  let response: Response
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        format: "json",
        options: {
          temperature: 0.4,
        },
      }),
    })
  } catch {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: "ollama request failed to fetch",
    })
  }

  if (!response.ok) {
    throw new TRPCError({
      code: "BAD_GATEWAY",
      message: `ollama request failed: ${response.status}`,
    })
  }

  const payload = (await response.json()) as OllamaGenerateResponse

  if (payload.error) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: payload.error })
  }
  const rawResult = payload.response?.trim() || payload.thinking?.trim()
  if (!rawResult) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "ollama returned an empty response" })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonObject(rawResult))
  } catch {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "ollama returned invalid JSON" })
  }

  const result = contentAiAnalysisResultSchema.safeParse(parsed)
  if (!result.success) {
    throw new TRPCError({ code: "BAD_GATEWAY", message: "ollama JSON did not match the analysis schema" })
  }
  return result.data
}

export async function generateContentAiSummary(
  db: Db,
  access: ContentPlayAccess,
  input: AiGenerateSummaryInput & { id: string; ollamaBaseUrl?: string | null },
) {
  const [detail, contentRow] = await Promise.all([
    getOrCreateContentAnalysisDetail(db, access, { id: input.id, contentId: input.contentId }),
    getPublishedContentById(db, input.contentId),
  ])

  if (!detail) {
    throw new TRPCError({ code: "FORBIDDEN", message: "both members must complete this content first" })
  }
  if (!contentRow) {
    throw new TRPCError({ code: "NOT_FOUND", message: "content not found" })
  }
  if (isNonEmptyResult(detail.analysisResult.result)) {
    return detail.analysisResult
  }

  const prompt = buildAnalysisPrompt({
    language: input.language,
    content: {
      title: contentRow.title,
      description: contentRow.description ?? null,
    },
    sessions: detail.sessions.map((session) => ({
      userId: session.userId,
      result: session.result,
      responses: session.responses,
    })),
  })

  const result = await requestOllamaAnalysis(input.ollamaBaseUrl || "http://localhost:11434", prompt)
  const updated = await updateContentAnalysisResult(db, access, {
    id: detail.analysisResult.id,
    summary: result.summary,
    result,
  })

  if (!updated) {
    throw new TRPCError({ code: "NOT_FOUND", message: "content analysis result not found" })
  }
  return updated
}
