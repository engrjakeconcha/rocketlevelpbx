import { z } from "zod";

const timeValueSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must use HH:MM");

export const weeklyRuleInputSchema = z
  .object({
    id: z.string().optional(),
    dayOfWeek: z.number().int().min(0).max(6),
    isOpen: z.boolean(),
    startTime: timeValueSchema.nullish(),
    endTime: timeValueSchema.nullish()
  })
  .superRefine((value, context) => {
    if (!value.isOpen) {
      return;
    }

    if (!value.startTime || !value.endTime) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Open days require start and end times"
      });
      return;
    }

    if (value.startTime >= value.endTime) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be later than start time"
      });
    }
  });

export const holidayClosureInputSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(2).max(120),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime()
  })
  .refine((value) => value.startsAt < value.endsAt, {
    message: "Holiday end must be later than start"
  });

export const scheduleOverrideInputSchema = z
  .object({
    id: z.string().optional(),
    label: z.string().min(2).max(120),
    mode: z.enum(["FORCE_OPEN", "FORCE_CLOSED", "VACATION", "AFTER_HOURS_FORWARDING"]),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    targetNumber: z.string().optional().nullable()
  })
  .refine((value) => value.startsAt < value.endsAt, {
    message: "Override end must be later than start"
  });

export const scheduleMutationSchema = z.object({
  mode: z.literal("local_schedule"),
  timezone: z.string().min(2),
  weeklyRules: z.array(weeklyRuleInputSchema).length(7),
  holidayClosures: z.array(holidayClosureInputSchema),
  overrides: z.array(scheduleOverrideInputSchema)
});

export const timeframeDateEntrySchema = z
  .object({
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime()
  })
  .refine((value) => value.startsAt < value.endsAt, {
    message: "Date entry end must be later than start"
  });

export const backendTimeframeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  scope: z.enum(["domain", "user"]),
  type: z.literal("specific-dates"),
  entries: z.array(timeframeDateEntrySchema)
});

export const backendTimeframesMutationSchema = z.object({
  mode: z.literal("backend_timeframes"),
  timeframes: z.array(backendTimeframeSchema)
});

export const scheduleMutationRequestSchema = z.discriminatedUnion("mode", [
  scheduleMutationSchema,
  backendTimeframesMutationSchema
]);

export type ScheduleMutationInput = z.infer<typeof scheduleMutationRequestSchema>;
export type LocalScheduleMutationInput = z.infer<typeof scheduleMutationSchema>;
export type BackendTimeframesMutationInput = z.infer<typeof backendTimeframesMutationSchema>;
