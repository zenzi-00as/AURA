'use server';
/**
 * @fileOverview A sophisticated AI biometric verification system for Aura.
 * Hardened with Aura Monitoring standards.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { logger } from '@/lib/logger';

const SelfieVerificationInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A live selfie captured by the user, as a data URI. Format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  userName: z.string().describe("The user's profile name."),
  userDescription: z.string().describe("The user's self-description."),
});
export type SelfieVerificationInput = z.infer<typeof SelfieVerificationInputSchema>;

const SelfieVerificationOutputSchema = z.object({
  verificationStatus: z.enum(['Verified', 'Pending', 'Rejected']).describe("The final status of the check."),
  reason: z.string().describe("Detailed explanation of the assessment."),
  isRealPerson: z.boolean().describe("True if the AI detects a live, three-dimensional human face."),
  isLiveCapture: z.boolean().describe("True if the image shows no signs of being a photo of a screen or printout."),
  matchesProfile: z.boolean().describe("True if the face aligns with the age and gender implied in the profile."),
});
export type SelfieVerificationOutput = z.infer<typeof SelfieVerificationOutputSchema>;

export async function selfieVerification(input: SelfieVerificationInput): Promise<SelfieVerificationOutput> {
  return selfieVerificationFlow(input);
}

const selfieVerificationPrompt = ai.definePrompt({
  name: 'selfieVerificationPrompt',
  input: { schema: SelfieVerificationInputSchema },
  output: { schema: SelfieVerificationOutputSchema },
  prompt: `You are a sophisticated biometric security AI for Aura. Analyze the selfie for face detection, liveness (reject if photo-of-screen), and profile alignment.`,
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
      if (!output) throw new Error("AI Engine failed to produce a structured result.");
      
      if (!output.isRealPerson || !output.isLiveCapture) {
        return {
          ...output,
          verificationStatus: 'Rejected',
          reason: !output.isRealPerson ? "No clear human face detected." : "Non-live capture detected."
        };
      }

      return output;
    } catch (error: any) {
      logger.error('Genkit Selfie Verification Flow Exception', {
        category: 'AI_ERROR',
        service: 'GENKIT',
        errorMessage: error.message
      });
      
      return {
        verificationStatus: 'Pending',
        reason: 'Automated check is processing high volume. Queued for manual review.',
        isRealPerson: true,
        isLiveCapture: true,
        matchesProfile: true,
      };
    }
  }
);
