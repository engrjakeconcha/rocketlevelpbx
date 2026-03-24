import { prisma } from "@/lib/db/prisma";
import type { LocalScheduleMutationInput } from "@/lib/validators/schedule";

export const scheduleRepository = {
  async getPrimaryTemplate(domainId: string) {
    return prisma.scheduleTemplate.findFirst({
      where: { domainId, isDefault: true },
      include: {
        weeklyRules: { orderBy: { dayOfWeek: "asc" } },
        holidayClosures: { orderBy: { startsAt: "asc" } },
        overrides: { orderBy: { startsAt: "asc" } }
      }
    });
  },

  async updateTemplate(templateId: string, input: LocalScheduleMutationInput) {
    return prisma.$transaction(async (tx) => {
      const [existingWeeklyRules, existingHolidayClosures, existingOverrides] = await Promise.all([
        tx.weeklyScheduleRule.findMany({
          where: { scheduleTemplateId: templateId },
          orderBy: { dayOfWeek: "asc" }
        }),
        tx.holidayClosure.findMany({
          where: { scheduleTemplateId: templateId }
        }),
        tx.scheduleOverride.findMany({
          where: { scheduleTemplateId: templateId }
        })
      ]);

      for (const rule of input.weeklyRules) {
        const existingRule =
          existingWeeklyRules.find((item) => item.id === rule.id) ??
          existingWeeklyRules.find((item) => item.dayOfWeek === rule.dayOfWeek);

        if (!existingRule) {
          throw new Error(`Weekly schedule rule for day ${rule.dayOfWeek} does not exist`);
        }

        await tx.weeklyScheduleRule.update({
          where: { id: existingRule.id },
          data: {
            isOpen: rule.isOpen,
            startTime: rule.startTime ?? null,
            endTime: rule.endTime ?? null
          }
        });
      }

      const incomingHolidayIds = new Set(input.holidayClosures.map((holiday) => holiday.id).filter(Boolean));
      const removableHolidayIds = existingHolidayClosures
        .filter((holiday) => holiday.id && !incomingHolidayIds.has(holiday.id))
        .map((holiday) => holiday.id);

      if (removableHolidayIds.length > 0) {
        await tx.holidayClosure.deleteMany({
          where: {
            id: { in: removableHolidayIds }
          }
        });
      }

      for (const holiday of input.holidayClosures) {
        if (holiday.id) {
          const existingHoliday = existingHolidayClosures.find((item) => item.id === holiday.id);

          if (!existingHoliday) {
            throw new Error("Holiday closure does not exist");
          }

          await tx.holidayClosure.update({
            where: { id: holiday.id },
            data: {
              name: holiday.name,
              startsAt: new Date(holiday.startsAt),
              endsAt: new Date(holiday.endsAt)
            }
          });
          continue;
        }

        await tx.holidayClosure.create({
          data: {
            scheduleTemplateId: templateId,
            name: holiday.name,
            startsAt: new Date(holiday.startsAt),
            endsAt: new Date(holiday.endsAt)
          }
        });
      }

      for (const override of input.overrides) {
        const existingOverride = override.id ? existingOverrides.find((item) => item.id === override.id) : null;

        if (!existingOverride) {
          throw new Error("Overrides must reference existing records");
        }

        await tx.scheduleOverride.update({
          where: { id: existingOverride.id },
          data: {
            label: override.label,
            mode: override.mode,
            startsAt: new Date(override.startsAt),
            endsAt: new Date(override.endsAt),
            targetNumber: override.targetNumber ?? null
          }
        });
      }

      return tx.scheduleTemplate.update({
        where: { id: templateId },
        data: {
          timezone: input.timezone,
          syncStatus: "PENDING"
        },
        include: {
          weeklyRules: { orderBy: { dayOfWeek: "asc" } },
          holidayClosures: { orderBy: { startsAt: "asc" } },
          overrides: { orderBy: { startsAt: "asc" } }
        }
      });
    });
  }
};
