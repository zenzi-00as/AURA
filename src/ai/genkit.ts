/**
 * @fileOverview Central Genkit AI configuration node for Aura.
 * Hardened for Gemini Auth key migration compliance and high-fidelity interaction.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// DEFINTIVE SECRET RETRIEVAL: Prioritize the new GEMINI_API_KEY (Auth Key)
// Fallback to legacy names only for transitional compatibility
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;

// SERVER-SIDE SECURITY GUARD
if (!apiKey) {
  if (process.env.NODE_ENV === 'development') {
    console.warn("[AURA AI WARNING] Gemini API Key is missing. AI flows will fail. Ensure GEMINI_API_KEY is set in .env.local");
  }
}

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey
    })
  ],
  // Standardized model for Aura identity and safety checks
  model: 'googleai/gemini-1.5-flash',
});
