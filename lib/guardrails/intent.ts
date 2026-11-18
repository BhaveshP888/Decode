import { experimental_decide as decide, generateText, Output } from 'ai';
import {
  DECISION_GUARDRAIL_MODEL_ID,
  fallbackChatModel,
  guardrailModel,
  hasAiGatewayAuth,
} from '@/lib/ai';
import { HealthGuruIntentSchema, type HealthGuruIntent } from '@/lib/schemas';

export const OUT_OF_DOMAIN_REFUSAL =
  'I specialize exclusively in human health, nutrition, dietary habits, food ingredients, and medications. I cannot assist with programming, mathematics, or general non-health topics.';

export const DECISION_PERMIT_THRESHOLD = 0.45;

export interface HealthDomainValidationResult {
  isPermitted: boolean;
  reason?: string;
  responseMessage?: string;
}

export type HealthDomainClassifier = (
  input: string
) => Promise<HealthGuruIntent>;

export interface ValidateHealthDomainOptions {
  recentContext?: string;
  classifier?: HealthDomainClassifier;
}

export const GUARDRAIL_CLASSIFIER_INSTRUCTION = `You are a strict semantic domain classifier for Decode Health Guru, an assistant dedicated exclusively to human health, medicine, food, and nutrition.

Decide whether the user's latest message is IN-SCOPE (isPermitted = true) or OUT-OF-SCOPE (isPermitted = false):

IN-SCOPE (isPermitted = true):
- Any question about human health, physical or mental wellness, medical symptoms, conditions, diseases, allergies, sleep, fitness, or prevention.
- Any medication, pharmaceutical, OTC remedy, regional/international drug brand name (e.g. Sinarest, Dolo, Crocin, Tylenol, Pan-D, Advil), dosage safety, side effects, excipients, or food-drug / drug-drug interactions.
- Any food, beverage, regional dish, culinary ingredient, nutrition question, diet, supplement, vitamin, herb, food additive, preservative, or food safety/storage question.
- Any genuine follow-up question referencing a health/food/medicine topic already in the recent conversation context.
- Be tolerant of spelling mistakes, slang, brand names, and non-English or transliterated food/medicine names.

OUT-OF-SCOPE (isPermitted = false):
- Programming, software engineering, debugging, algorithms, or code generation.
- Mathematics, calculations, homework, physics, or non-biological sciences.
- General trivia, geography, history, politics, sports, movies, music, creative writing, jokes, or standalone casual greetings/chit-chat with no health/food/medicine question.

Return JSON matching the schema with isPermitted (boolean) and a concise <=12-word reason.`;

export function buildGuardrailClassifierPrompt(
  prompt: string,
  recentContext?: string
): string {
  const trimmedContext = recentContext?.trim();
  if (trimmedContext) {
    return `<recent_conversation>\n${trimmedContext}\n</recent_conversation>\n\n<latest_user_message>\n${prompt}\n</latest_user_message>`;
  }
  return `<latest_user_message>\n${prompt}\n</latest_user_message>`;
}

export function evaluateDecisionProbability(
  probability: number,
  threshold: number = DECISION_PERMIT_THRESHOLD
): HealthGuruIntent {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(probability) ? probability : 0));
  const isPermitted = clamped >= threshold;
  return {
    isPermitted,
    reason: `Decision model (${DECISION_GUARDRAIL_MODEL_ID}) p=${clamped.toFixed(2)}`,
  };
}

async function classifyWithDecisionModel(input: string): Promise<HealthGuruIntent> {
  const result = await decide({
    model: DECISION_GUARDRAIL_MODEL_ID,
    state: input,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(5_000),
    questions: {
      inHealthScope: {
        type: 'boolean',
        instructions:
          'Is the latest user message (considering any recent conversation context) a genuine question or follow-up about human health, wellness, medical symptoms, conditions, allergies, food, diets, nutrition, supplements, ingredients/additives, or any medication/drug (including global or regional brand names, OTC remedies, and typos)?',
        criteria: {
          true: 'The message asks about human health, symptoms, conditions, allergies, fitness, sleep, food, regional dishes, nutrition, supplements, ingredients, or any medicine/drug brand (including regional brands like Sinarest, Dolo, Crocin, Pan-D, or follow-ups to a prior health question).',
          false: 'The message asks about programming, code, mathematics, trivia, geography, history, sports, politics, entertainment, creative writing, or standalone casual greetings with no health, food, or medicine question.',
        },
      },
    },
  });

  return evaluateDecisionProbability(result.answers.inHealthScope.probability);
}

async function classifyWithGeminiModel(
  model: typeof guardrailModel,
  input: string
): Promise<HealthGuruIntent> {
  const { output } = await generateText({
    model,
    output: Output.object({ schema: HealthGuruIntentSchema }),
    instructions: GUARDRAIL_CLASSIFIER_INSTRUCTION,
    prompt: input,
    maxOutputTokens: 80,
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(8_000),
    providerOptions: {
      google: {
        thinkingConfig: {
          thinkingLevel: 'minimal',
        },
      },
    },
  });
  return output;
}

async function defaultLlmClassifier(input: string): Promise<HealthGuruIntent> {
  // Primary: Baseten Mammoth-1 decision model via Vercel AI Gateway (auto-authenticated on Vercel via VERCEL_OIDC_TOKEN or AI_GATEWAY_API_KEY)
  if (hasAiGatewayAuth()) {
    try {
      return await classifyWithDecisionModel(input);
    } catch (decisionError: unknown) {
      console.warn(
        `Decision model ${DECISION_GUARDRAIL_MODEL_ID} failed; falling back to Gemini classifier:`,
        decisionError instanceof Error ? decisionError.message : String(decisionError)
      );
    }
  }

  // Fallback 1 -> 2: Gemini Flash-Lite structured classifiers
  try {
    return await classifyWithGeminiModel(guardrailModel, input);
  } catch (primaryError: unknown) {
    console.warn(
      'Primary Gemini guardrail classifier failed; retrying with fallback model:',
      primaryError instanceof Error ? primaryError.message : String(primaryError)
    );
    return await classifyWithGeminiModel(fallbackChatModel, input);
  }
}

export async function validateHealthDomain(
  prompt: string,
  options: ValidateHealthDomainOptions = {}
): Promise<HealthDomainValidationResult> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return {
      isPermitted: false,
      reason: 'Empty prompt',
      responseMessage: OUT_OF_DOMAIN_REFUSAL,
    };
  }

  const classify = options.classifier ?? defaultLlmClassifier;
  const classifierInput = buildGuardrailClassifierPrompt(trimmed, options.recentContext);

  try {
    const decision = await classify(classifierInput);
    if (decision.isPermitted) {
      return {
        isPermitted: true,
        reason: decision.reason,
      };
    }

    return {
      isPermitted: false,
      reason: decision.reason ?? 'Out of health, food, and medicine scope',
      responseMessage: OUT_OF_DOMAIN_REFUSAL,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown classifier error';
    console.error('Health domain guardrail failed (failing closed):', message);
    return {
      isPermitted: false,
      reason: 'Domain verification failed',
      responseMessage:
        'Unable to verify your question right now due to temporary AI service load. Please try again in a moment.',
    };
  }
}
