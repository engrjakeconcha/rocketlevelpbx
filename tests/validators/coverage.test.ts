import { describe, expect, it } from "vitest";
import { coverageMutationSchema } from "@/lib/validators/coverage";

describe("coverageMutationSchema", () => {
  it("accepts a valid ordered coverage payload", () => {
    const result = coverageMutationSchema.safeParse({
      coverageGroupId: "grp_123",
      members: [
        {
          displayLabel: "Front Desk",
          destinationNumber: "+15555550111",
          memberType: "USER",
          enabled: true,
          temporaryStatus: "ACTIVE",
          sortOrder: 1
        },
        {
          displayLabel: "Overflow",
          destinationNumber: "+15555550112",
          memberType: "EXTERNAL_NUMBER",
          enabled: true,
          temporaryStatus: "ACTIVE",
          sortOrder: 2
        }
      ]
    });

    expect(result.success).toBe(true);
  });
});
