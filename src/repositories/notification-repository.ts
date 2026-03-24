import type { NotificationScenarioMutationInput } from "@/lib/validators/notification-scenario";
import { prisma } from "@/lib/db/prisma";

export const notificationRepository = {
  listScenarios() {
    return prisma.notificationScenario.findMany({
      include: {
        domain: true,
        contacts: {
          orderBy: { sortOrder: "asc" }
        }
      },
      orderBy: [{ domain: { description: "asc" } }, { name: "asc" }]
    });
  },

  getAssignedScenarioForUser(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        notificationScenario: {
          include: {
            domain: true,
            contacts: {
              orderBy: { sortOrder: "asc" }
            }
          }
        }
      }
    });
  },

  updateScenarioConfig(data: {
    id: string;
    makeScenarioId: string;
    makeWebhookUrl: string | null;
    makeAuthHeaderName: string | null;
    makeAuthHeaderValue: string | null;
  }) {
    return prisma.notificationScenario.update({
      where: { id: data.id },
      data: {
        makeScenarioId: data.makeScenarioId,
        makeWebhookUrl: data.makeWebhookUrl,
        makeAuthHeaderName: data.makeAuthHeaderName,
        makeAuthHeaderValue: data.makeAuthHeaderValue
      },
      include: {
        domain: true,
        contacts: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });
  },

  updateScenarioContacts(notificationScenarioId: string, input: NotificationScenarioMutationInput) {
    return prisma.$transaction(async (tx) => {
      const scenario = await tx.notificationScenario.findUnique({
        where: { id: notificationScenarioId },
        include: {
          domain: true,
          contacts: {
            orderBy: { sortOrder: "asc" }
          }
        }
      });

      if (!scenario) {
        throw new Error("Notification scenario not found");
      }

      const existingIds = new Set(scenario.contacts.map((contact) => contact.id));
      const submittedIds = new Set(input.contacts.map((contact) => contact.id).filter(Boolean) as string[]);

      for (const contact of input.contacts) {
        if (contact.id && !existingIds.has(contact.id)) {
          throw new Error("Notification contacts must reference existing records");
        }
      }

      for (const existing of scenario.contacts) {
        if (!submittedIds.has(existing.id)) {
          await tx.notificationContact.delete({
            where: { id: existing.id }
          });
        }
      }

      for (const contact of input.contacts) {
        if (contact.id) {
          await tx.notificationContact.update({
            where: { id: contact.id },
            data: {
              label: contact.label,
              channel: contact.channel,
              destination: contact.destination,
              sortOrder: contact.sortOrder,
              isActive: contact.isActive
            }
          });
          continue;
        }

        await tx.notificationContact.create({
          data: {
            notificationScenarioId,
            label: contact.label,
            channel: contact.channel,
            destination: contact.destination,
            sortOrder: contact.sortOrder,
            isActive: contact.isActive
          }
        });
      }

      return tx.notificationScenario.findUniqueOrThrow({
        where: { id: notificationScenarioId },
        include: {
          domain: true,
          contacts: {
            orderBy: { sortOrder: "asc" }
          }
        }
      });
    });
  }
};
