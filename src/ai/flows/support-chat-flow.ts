'use server';
/**
 * @fileOverview Aura Support AI Agent.
 *
 * - supportChat - A function that handles customer support queries.
 * - SupportChatInput - The input type for the supportChat function.
 * - SupportChatOutput - The return type for the supportChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SupportChatInputSchema = z.object({
  message: z.string().describe('The user question or issue.'),
});
export type SupportChatInput = z.infer<typeof SupportChatInputSchema>;

const SupportChatOutputSchema = z.object({
  response: z.string().describe('The AI assistant response.'),
  suggestedActions: z.array(z.string()).optional().describe('Quick actions or buttons the user might take next.'),
});
export type SupportChatOutput = z.infer<typeof SupportChatOutputSchema>;

export async function supportChat(input: SupportChatInput): Promise<SupportChatOutput> {
  return supportChatFlow(input);
}

const supportChatFlow = ai.defineFlow(
  {
    name: 'supportChatFlow',
    inputSchema: SupportChatInputSchema,
    outputSchema: SupportChatOutputSchema,
  },
  async (input) => {
    const {output} = await ai.generate({
      model: 'googleai/gemini-1.5-flash',
      system: `You are Aura Support, a helpful and minimalist AI assistant for Aura, a premium LGBTQ+ social discovery platform.
      Your tone is professional, empathetic, and slightly ethereal.
      
      Key Aura concepts:
      - Discovery Stage: Where members find each other.
      - Identity Guard: AI-powered biometric verification.
      - Elite/Elite Plus: Premium membership tiers.
      - Super Fund: Voluntary community support.
      - Stateless Connection: Privacy-focused, ephemeral data.
      
      Common help topics:
      - Verification: Users need to upload a clear selfie. AI checks for liveness and profile alignment.
      - Subscription: Managed through the Membership Hub (Razorpay).
      - Safety: Meet in public, report misconduct in chat via the "More" menu.
      - Privacy: We don't sell data. Ephemeral media is deleted definitively after the view limit.
      
      Keep responses concise and direct. If you cannot help with a specific account or payment issue, suggest contacting email support (support@aura.community).`,
      prompt: input.message,
    });

    if (!output) {
      return {
        response: "I'm experiencing a brief synchronization fault. Please try again or contact support@aura.community.",
      };
    }

    return {
      response: output.response as string,
      suggestedActions: output.suggestedActions as string[]
    };
  }
);
