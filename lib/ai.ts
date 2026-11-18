import { createGoogleGenerativeAI } from '@ai-sdk/google';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINIAI_API_KEY;

if (!apiKey) {
  console.warn('Neither GOOGLE_GENERATIVE_AI_API_KEY nor GEMINIAI_API_KEY is defined in environment variables.');
}

export const CHAT_MODEL_ID = 'gemini-3.8-flash' as const;
export const EMBEDDING_MODEL_ID = 'gemini-embedding-2' as const;
export const EMBEDDING_DIMENSIONS = 768 as const;

export const google = createGoogleGenerativeAI({ apiKey });
export const chatModel = google(CHAT_MODEL_ID);
export const embeddingModel = google.embeddingModel(EMBEDDING_MODEL_ID);
