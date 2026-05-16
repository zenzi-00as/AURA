'use server';
/**
 * @fileOverview A Genkit flow for moderating chat messages for safety.
 *
 * - chatSafetyModeration - A function that moderates a chat message.
 * - ChatSafetyModerationInput - The input type for the chatSafetyModeration function.
 * - ChatSafetyModerationOutput - The return type for the chatSafetyModeration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatSafetyModerationInputSchema = z.object({
  message: z.string().describe('The chat message content to be moderated.'),
});
export type ChatSafetyModerationInput = z.infer<typeof ChatSafetyModerationInputSchema>;

const ChatSafetyModerationOutputSchema = z.object({
  isSafe: z.boolean().describe('True if the message is deemed safe, false otherwise.'),
  flaggedCategories: z
    .array(z.string())
    .describe('A list of harm categories the message falls under if it is not safe. Possible values: HATE_SPEECH, SEXUALLY_EXPLICIT, HARASSMENT, DANGEROUS_CONTENT.'),
  reason: z.string().optional().describe('An optional brief explanation for flagging the message.'),
});
export type ChatSafetyModerationOutput = z.infer<typeof ChatSafetyModerationOutputSchema>;

export async function chatSafetyModeration(
  input: ChatSafetyModerationInput
): Promise<ChatSafetyModerationOutput> {
  return chatSafetyModerationFlow(input);
}

const chatSafetyModerationPrompt = ai.definePrompt({
  name: 'chatSafetyModerationPrompt',
  input: {schema: ChatSafetyModerationInputSchema},
  output: {schema: ChatSafetyModerationOutputSchema},
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
    ],
  },
  prompt: `You are an AI assistant designed to moderate chat messages for safety.
Your task is to analyze the user's message and determine if it contains any inappropriate, hateful, harmful, or sexually explicit content based on the following categories:
- HATE_SPEECH: Content that expresses, incites, or promotes hatred based on attributes like race, ethnicity, religion, gender, sexual orientation, disability, or nationality.
- SEXUALLY_EXPLICIT: Content that contains sexual acts, sexually suggestive material, or promotes sexual services.
- HARASSMENT: Content that is abusive, bullying, or intended to distress, annoy, or persecute another person.
- DANGEROUS_CONTENT: Content that promotes, facilitates, or enables dangerous acts, self-harm, or illegal activities.

Based on your analysis, provide a JSON object with the following fields:
1. 'isSafe': A boolean indicating whether the message is safe (true) or unsafe (false).
2. 'flaggedCategories': An array of strings listing all applicable harm categories if the message is unsafe. If the message is safe, this array should be empty.
3. 'reason': (Optional) A brief explanation if the message is flagged.

Here is the message to evaluate:
{{{message}}} `,
});

const chatSafetyModerationFlow = ai.defineFlow(
  {
    name: 'chatSafetyModerationFlow',
    inputSchema: ChatSafetyModerationInputSchema,
    outputSchema: ChatSafetyModerationOutputSchema,
  },
  async (input) => {
    const {output} = await chatSafetyModerationPrompt(input);
    if (!output) {
      return {
        isSafe: false,
        flaggedCategories: ['MODEL_ERROR'],
        reason: 'Model failed to produce a structured output or encountered an internal error.',
      };
    }
    return output;
  }
);
