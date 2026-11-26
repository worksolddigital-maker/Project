import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { buildExplainPrompt, EXPLAIN_SYSTEM, explanationSchema, finalizeExplanation, type ExplanationResult } from "@/lib/market/explain";
import type { MarketSnapshot } from "@/lib/market/types";
import { ApiError } from "@/server/http";
import { cached } from "./cache";
import { isAiConfigured } from "./service";

const MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ timeout: 90_000, maxRetries: 1 }));

async function generate(snapshot: MarketSnapshot, focus: string | null): Promise<ExplanationResult> {
  const { prompt, headlines } = buildExplainPrompt(snapshot, focus);
  if (!headlines.length) throw new ApiError(422, "Ainda não há manchetes suficientes para explicar o mercado. Tente de novo em alguns minutos.");
  try {
    const response = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // If the model declines, the API retries on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(explanationSchema) },
      system: EXPLAIN_SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") throw new ApiError(502, "A IA não conseguiu gerar a explicação para estas manchetes.");
    if (response.stop_reason === "max_tokens" || !response.parsed_output) throw new ApiError(502, "A explicação veio incompleta. Tente novamente.");
    return finalizeExplanation(response.parsed_output, headlines, `Claude (${response.model})`);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      throw new ApiError(503, "A chave da API da Anthropic configurada no servidor não foi aceita.");
    }
    if (err instanceof Anthropic.RateLimitError) throw new ApiError(429, "Limite de uso da IA atingido. Tente novamente em instantes.");
    if (err instanceof Anthropic.APIConnectionError) throw new ApiError(503, "Não foi possível falar com a IA agora.");
    if (err instanceof Anthropic.APIError) throw new ApiError(502, "A IA respondeu com erro. Tente novamente.");
    throw err;
  }
}

/**
 * Explanation for the current snapshot. The same question about the same
 * minute-window is answered once for everyone (10 min cache).
 */
export async function explainMarket(snapshot: MarketSnapshot, focus: string | null): Promise<ExplanationResult> {
  if (!isAiConfigured()) throw new ApiError(503, "A explicação com IA não está configurada neste servidor (ANTHROPIC_API_KEY).");
  const window = Math.floor(Date.parse(snapshot.fetchedAt) / 600_000);
  const key = `ai:${focus ?? "geral"}:${window}`;
  let failure: unknown = null;
  const r = await cached(key, 600_000, () =>
    generate(snapshot, focus).catch((err: unknown) => {
      failure = err;
      throw err;
    }),
  );
  if (r.value) return r.value;
  if (failure) throw failure;
  throw new ApiError(502, r.error ?? "Não foi possível gerar a explicação.");
}
