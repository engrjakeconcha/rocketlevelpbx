import { z } from "zod";

export const timeframeQueueMemberInputSchema = z.object({
  id: z.string().optional(),
  displayLabel: z.string().min(1).max(120),
  destinationNumber: z.string().min(7).max(30),
  sortOrder: z.number().int().min(1).max(100),
  enabled: z.boolean(),
  requestConfirmationEnabled: z.boolean().default(true)
});

export const timeframeQueueMutationSchema = z.object({
  timeframeId: z.string().min(1),
  members: z.array(timeframeQueueMemberInputSchema).max(25)
});

export type TimeframeQueueMutationInput = z.infer<typeof timeframeQueueMutationSchema>;
