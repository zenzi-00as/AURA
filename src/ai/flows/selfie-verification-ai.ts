
'use server';
/**
 * @fileOverview An AI-powered identity verification tool.
 *
 * - selfieVerification - A function that compares a live selfie with user data for authenticity.
 * - SelfieVerificationInput - The input type for the selfieVerification function.
 * - SelfieVerificationOutput - The return type for the selfieVerification function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SelfieVerificationInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A live selfie captured by the user, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  userName: z.string().describe("The user's name as provided in their profile."),
  userDescription: z.string().describe("The user's self-description or bio."),
});
export type SelfieVerificationInput = z.infer<typeof SelfieVerificationInputSchema>;

const SelfieVerificationOutputSchema = z.object({
  verificationStatus: z.enum(['Verified', 'Pending', 'Rejected']).describe("The AI's assessment of the verification status."),
  reason: z.string().describe("Explanation for the verification status."),
  isRealPerson: z.boolean().describe("True if the AI believes the image is of a real person."),
  matchesProfile: z.boolean().describe("True if the AI believes the person in the photo matches the profile description."),
});
export type SelfieVerificationOutput = z.infer<typeof SelfieVerificationOutputSchema>;

export async function selfieVerification(input: SelfieVerificationInput): Promise<SelfieVerificationOutput> {
  return selfieVerificationFlow(input);
}

const selfieVerificationPrompt = ai.definePrompt({
  name: 'selfieVerificationPrompt',
  input: { schema: SelfieVerificationInputSchema },
  output: { schema: SelfieVerificationOutputSchema },
  prompt: `You are an expert identity verification system for Aura. 

Analyze the provided selfie and profile data. 

Checks:
1. Real person check: Ensure it's not a bot, fake, or re-photographed image.
2. Profile match: Does the photo generally align with the name "{{userName}}" and bio "{{userDescription}}"?

Provide verificationStatus ('Verified', 'Pending', or 'Rejected') and details.

User Profile:
Name: {{{userName}}}
Bio: {{{userDescription}}}

Selfie:
{{media url=photoDataUri}}`,
});

const selfieVerificationFlow = ai.defineFlow(
  {
    name: 'selfieVerificationFlow',
    inputSchema: SelfieVerificationInputSchema,
    outputSchema: SelfieVerificationOutputSchema,
  },
  async (input) => {
    try {
      const { output } = await selfieVerificationPrompt(input);
      return output!;
    } catch (error) {
      console.error('AI Verification Error:', error);
      return {
        verificationStatus: 'Pending',
        reason: 'Automated check failed. Profile pending manual review.',
        isRealPerson: true,
        matchesProfile: true,
      };
    }
  }
);
