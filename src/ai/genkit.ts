/**
 * @fileOverview Central Genkit AI configuration node for Aura.
 * Hardened for Gemini Auth key migration compliance and high-fidelity interaction.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Definitively check for server-side credentials before initialization
const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey && process.env.NODE_ENV === 'development') {
  console.warn("[AURA AI WARNING] Gemini API Key is missing. AI flows will fail.");
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey
    })
  ],
  model: 'googleai/gemini-1.5-flash',
});
