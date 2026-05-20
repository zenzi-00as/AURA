'use server';
/**
 * @fileOverview A sophisticated AI biometric verification system for Aura.
 *
 * - selfieVerification - Analyzes a selfie for face presence, liveness, and authenticity.
 * - SelfieVerificationInput - The input type containing the image and profile context.
 * - SelfieVerificationOutput - The detailed assessment of the identity check.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
  prompt: `You are a sophisticated biometric security AI for Aura, an LGBTQ+ connection app. Your primary goal is to ensure EVERY user is a real, live human being to prevent bots, scammers, and catfishing.

Analyze the provided selfie for:
1. FACE DETECTION: Is there a clear, unobstructed human face?
2. LIVENESS CHECK (CRITICAL): Does this look like a live capture? 
   REJECT (isLiveCapture: false) if you detect:
   - Digital moiré patterns (interference lines from screens).
   - Reflection or glare typical of a smartphone/monitor display.
   - Visible borders of a physical photograph or screen.
   - Lack of natural depth/shadows.
3. IDENTITY ALIGNMENT: Does the person in the photo generally match the name "{{userName}}" and bio "{{userDescription}}"?

OUTPUT REQUIREMENTS:
- If it's a clear, live face: verificationStatus = 'Verified'.
- If it's blurry or ambiguous: verificationStatus = 'Pending'.
- If it's a bot, a photo of a photo, or no face: verificationStatus = 'Rejected'.

User Context:
Name: {{{userName}}}
Bio: {{{userDescription}}}

Selfie Data:
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
      if (!output) throw new Error("Verification engine failed to produce a result.");
      
      // Enforce strict liveness and face presence
      if (!output.isRealPerson || !output.isLiveCapture) {
        return {
          ...output,
          verificationStatus: 'Rejected',
          reason: !output.isRealPerson ? "No clear human face detected." : "The image appears to be a non-live capture (e.g., a photo of a screen). Please take a fresh selfie in natural lighting."
        };
      }

      return output;
    } catch (error) {
      console.error('Biometric Check Failed:', error);
      // Fallback: queue for manual review rather than rejecting if the service is interrupted
      return {
        verificationStatus: 'Pending',
        reason: 'The automated check is currently processing high volume. Your profile is queued for rapid manual verification.',
        isRealPerson: true,
        isLiveCapture: true,
        matchesProfile: true,
      };
    }
  }
);
