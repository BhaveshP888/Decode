import { createGoogleGenerativeAI } from '@ai-sdk/google';

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINIAI_API_KEY;

if (!apiKey) {
  console.warn('Neither GOOGLE_GENERATIVE_AI_API_KEY nor GEMINIAI_API_KEY is defined in environment variables.');
}

export const google = createGoogleGenerativeAI({ apiKey });
export const chatModel = google('gemini-2.5-flash');
export const embeddingModel = google.textEmbeddingModel('text-embedding-004');
