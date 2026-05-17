
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
  reason: z.string().describe("Explanation for the verification status, especially if 'Pending' or 'Rejected'."),
  isRealPerson: z.boolean().describe("True if the AI believes the image is of a real person and not a fake or bot."),
  matchesProfile: z.boolean().describe("True if the AI believes the person in the photo is consistent with the provided profile name and description."),
});
export type SelfieVerificationOutput = z.infer<typeof SelfieVerificationOutputSchema>;

export async function selfieVerification(input: SelfieVerificationInput): Promise<SelfieVerificationOutput> {
  return selfieVerificationFlow(input);
}

const selfieVerificationPrompt = ai.definePrompt({
  name: 'selfieVerificationPrompt',
  input: { schema: SelfieVerificationInputSchema },
  output: { schema: SelfieVerificationOutputSchema },
  model: 'googleai/gemini-1.5-flash', // Use a stable model for vision-based verification
  prompt: `You are an expert identity verification system for a minimalist LGBTQ+ social app named Aura. Your primary goal is to ensure authenticity and prevent bots or fake profiles.

Analyze the provided live selfie and compare it against the user's profile information.

Perform the following checks:
1. **Authenticity Check (isRealPerson):** Does the image appear to be a genuine live capture of a human face? Look for signs of artificiality, deepfakes, re-photographed images, or non-human entities. If it looks like a bot or a fake image, set 'isRealPerson' to false.
2. **Profile Consistency Check (matchesProfile):** Does the person in the selfie seem consistent with the provided profile name and description? While you cannot confirm exact identity, assess for general consistency in age, gender presentation (if mentioned), or other descriptive elements. Flag obvious inconsistencies.

Based on these checks, determine the 'verificationStatus' and provide a 'reason'.

**Verification Status Guidelines:**
- 'Verified': Both 'isRealPerson' is true AND 'matchesProfile' is true, with no significant concerns.
- 'Rejected': If 'isRealPerson' is false (e.g., bot, fake image) OR if there are severe inconsistencies with 'matchesProfile'. Provide a clear reason.
- 'Pending': If 'isRealPerson' is true but there are minor or ambiguous inconsistencies with 'matchesProfile', or if further human review seems necessary. Provide a reason for the pending status.

User Profile:
- Name: {{{userName}}}
- Bio/Description: {{{userDescription}}}

Selfie Photo:
{{media url=photoDataUri}}`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE',
      },
    ],
  },
});

const selfieVerificationFlow = ai.defineFlow(
  {
    name: 'selfieVerificationFlow',
    inputSchema: SelfieVerificationInputSchema,
    outputSchema: SelfieVerificationOutputSchema,
  },
  async (input) => {
    const { output } = await selfieVerificationPrompt(input);
    return output!;
  }
);
