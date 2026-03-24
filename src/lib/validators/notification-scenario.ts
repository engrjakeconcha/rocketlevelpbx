import { z } from "zod";

export const notificationContactInputSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1).max(120),
  channel: z.enum(["EMAIL", "SMS"]),
  destination: z.string().min(3).max(200),
  sortOrder: z.number().int().min(1).max(100),
  isActive: z.boolean()
}).superRefine((value, context) => {
  if (value.channel === "EMAIL") {
    const emailResult = z.string().email().safeParse(value.destination);

    if (!emailResult.success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email contacts must use a valid email address",
        path: ["destination"]
      });
    }
  }

  if (value.channel === "SMS" && !/^\+?[0-9()\-\s]{7,20}$/.test(value.destination)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "SMS contacts must use a valid phone number",
      path: ["destination"]
    });
  }
});

export const notificationScenarioMutationSchema = z.object({
  contacts: z.array(notificationContactInputSchema).max(25)
});

export type NotificationScenarioMutationInput = z.infer<typeof notificationScenarioMutationSchema>;

export const notificationScenarioConfigSchema = z.object({
  id: z.string().min(1),
  makeScenarioId: z.string().min(1).max(160),
  makeWebhookUrl: z.string().url().optional().nullable().or(z.literal("")),
  makeAuthHeaderName: z.string().min(1).max(120).optional().nullable().or(z.literal("")),
  makeAuthHeaderValue: z.string().min(1).max(500).optional().nullable().or(z.literal(""))
}).superRefine((value, context) => {
  if (value.makeAuthHeaderValue && !value.makeAuthHeaderName) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "An auth header name is required when an auth header value is set",
      path: ["makeAuthHeaderName"]
    });
  }
});

export type NotificationScenarioConfigInput = z.infer<typeof notificationScenarioConfigSchema>;
