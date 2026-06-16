import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINIAI_API_KEY;

if (!apiKey) {
  console.warn("GEMINIAI_API_KEY is not defined in environment variables.");
}

export const ai = new GoogleGenAI({ apiKey });
