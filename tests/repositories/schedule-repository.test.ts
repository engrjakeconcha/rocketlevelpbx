import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  weeklyScheduleRule: {
    findMany: vi.fn(),
    update: vi.fn()
  },
  holidayClosure: {
    findMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn()
  },
  scheduleOverride: {
    findMany: vi.fn(),
    update: vi.fn()
  },
  scheduleTemplate: {
    update: vi.fn()
  }
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) => callback(tx))
  }
}));

import { scheduleRepository } from "@/repositories/schedule-repository";

describe("scheduleRepository.updateTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    tx.weeklyScheduleRule.findMany.mockResolvedValue(
      Array.from({ length: 7 }, (_, dayOfWeek) => ({
        id: `rule_${dayOfWeek}`,
        dayOfWeek
      }))
    );
    tx.holidayClosure.findMany.mockResolvedValue([
      {
        id: "holiday_1"
      }
    ]);
    tx.scheduleOverride.findMany.mockResolvedValue([
      {
        id: "override_1"
      }
    ]);
    tx.scheduleTemplate.update.mockResolvedValue({
      id: "template_1",
      weeklyRules: [],
      holidayClosures: [],
      overrides: []
    });
  });

  it("updates existing schedule records in place while allowing new holidays", async () => {
    await scheduleRepository.updateTemplate("template_1", {
      timezone: "America/New_York",
      weeklyRules: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        id: `rule_${dayOfWeek}`,
        dayOfWeek,
        isOpen: dayOfWeek > 0 && dayOfWeek < 6,
        startTime: dayOfWeek > 0 && dayOfWeek < 6 ? "08:00" : null,
        endTime: dayOfWeek > 0 && dayOfWeek < 6 ? "17:00" : null
      })),
      holidayClosures: [
        {
          id: "holiday_1",
          name: "Memorial Day",
          startsAt: "2026-05-25T00:00:00.000Z",
          endsAt: "2026-05-25T23:59:59.000Z"
        },
        {
          name: "Independence Day",
          startsAt: "2026-07-04T00:00:00.000Z",
          endsAt: "2026-07-04T23:59:59.000Z"
        }
      ],
      overrides: [
        {
          id: "override_1",
          label: "Team Retreat",
          mode: "FORCE_CLOSED",
          startsAt: "2026-04-10T14:00:00.000Z",
          endsAt: "2026-04-10T22:00:00.000Z",
          targetNumber: null
        }
      ]
    });

    expect(tx.weeklyScheduleRule.update).toHaveBeenCalledTimes(7);
    expect(tx.holidayClosure.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "holiday_1" }
      })
    );
    expect(tx.holidayClosure.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scheduleTemplateId: "template_1",
          name: "Independence Day"
        })
      })
    );
    expect(tx.scheduleOverride.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "override_1" }
      })
    );
  });
});
