/**
 * @fileOverview Central Genkit AI configuration node for Aura.
 * Hardened for Gemini Auth key migration compliance and high-fidelity interaction.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      // Definitively prioritizing the new Auth Migration key node
      // while maintaining compatibility with legacy environment variables.
      apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
    })
  ],
  model: 'googleai/gemini-1.5-flash',
});
