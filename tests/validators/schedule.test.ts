import { describe, expect, it } from "vitest";
import { scheduleMutationSchema } from "@/lib/validators/schedule";

describe("scheduleMutationSchema", () => {
  it("accepts a valid weekly schedule and overrides", () => {
    const result = scheduleMutationSchema.safeParse({
      timezone: "America/New_York",
      weeklyRules: [
        { dayOfWeek: 0, isOpen: false },
        { dayOfWeek: 1, isOpen: true, startTime: "08:00", endTime: "17:00" },
        { dayOfWeek: 2, isOpen: true, startTime: "08:00", endTime: "17:00" },
        { dayOfWeek: 3, isOpen: true, startTime: "08:00", endTime: "17:00" },
        { dayOfWeek: 4, isOpen: true, startTime: "08:00", endTime: "17:00" },
        { dayOfWeek: 5, isOpen: true, startTime: "08:00", endTime: "15:00" },
        { dayOfWeek: 6, isOpen: false }
      ],
      holidayClosures: [
        {
          name: "Independence Day",
          startsAt: "2026-07-04T00:00:00.000Z",
          endsAt: "2026-07-04T23:59:59.000Z"
        }
      ],
      overrides: [
        {
          label: "Vacation Mode",
          mode: "VACATION",
          startsAt: "2026-06-01T12:00:00.000Z",
          endsAt: "2026-06-02T12:00:00.000Z",
          targetNumber: null
        }
      ]
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid time windows", () => {
    const result = scheduleMutationSchema.safeParse({
      timezone: "America/New_York",
      weeklyRules: [
        { dayOfWeek: 0, isOpen: false },
        { dayOfWeek: 1, isOpen: true, startTime: "17:00", endTime: "08:00" },
        { dayOfWeek: 2, isOpen: false },
        { dayOfWeek: 3, isOpen: false },
        { dayOfWeek: 4, isOpen: false },
        { dayOfWeek: 5, isOpen: false },
        { dayOfWeek: 6, isOpen: false }
      ],
      holidayClosures: [],
      overrides: []
    });

    expect(result.success).toBe(false);
  });
});
