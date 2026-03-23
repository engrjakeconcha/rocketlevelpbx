import { z } from "zod";

export const coverageMemberInputSchema = z.object({
  id: z.string().optional(),
  displayLabel: z.string().min(2).max(80),
  memberType: z.enum(["USER", "EXTERNAL_NUMBER"]),
  destinationNumber: z.string().min(10),
  enabled: z.boolean(),
  temporaryStatus: z.enum(["ACTIVE", "INACTIVE", "TEMPORARILY_UNAVAILABLE"]),
  sortOrder: z.number().int().positive()
});

export const coverageMutationSchema = z.object({
  coverageGroupId: z.string().min(1),
  members: z.array(coverageMemberInputSchema).min(1).max(20)
});

export type CoverageMutationInput = z.infer<typeof coverageMutationSchema>;
