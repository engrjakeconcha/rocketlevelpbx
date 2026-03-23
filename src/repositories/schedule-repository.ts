import { prisma } from "@/lib/db/prisma";
import type { ScheduleMutationInput } from "@/lib/validators/schedule";

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

  async updateTemplate(templateId: string, input: ScheduleMutationInput) {
    return prisma.$transaction(async (tx) => {
      await tx.weeklyScheduleRule.deleteMany({ where: { scheduleTemplateId: templateId } });
      await tx.holidayClosure.deleteMany({ where: { scheduleTemplateId: templateId } });
      await tx.scheduleOverride.deleteMany({ where: { scheduleTemplateId: templateId } });

      return tx.scheduleTemplate.update({
        where: { id: templateId },
        data: {
          timezone: input.timezone,
          syncStatus: "PENDING",
          weeklyRules: {
            create: input.weeklyRules.map((rule) => ({
              dayOfWeek: rule.dayOfWeek,
              isOpen: rule.isOpen,
              startTime: rule.startTime ?? null,
              endTime: rule.endTime ?? null
            }))
          },
          holidayClosures: {
            create: input.holidayClosures.map((closure) => ({
              name: closure.name,
              startsAt: new Date(closure.startsAt),
              endsAt: new Date(closure.endsAt)
            }))
          },
          overrides: {
            create: input.overrides.map((override) => ({
              label: override.label,
              mode: override.mode,
              startsAt: new Date(override.startsAt),
              endsAt: new Date(override.endsAt),
              targetNumber: override.targetNumber ?? null
            }))
          }
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
