import { z } from "zod";

const optionalBooleanEnvSchema = z
  .union([z.boolean(), z.string()])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value === "boolean") {
      return value;
    }

    return value === "true";
  });

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  APP_URL: z.string().url(),
  ROUTING_API_BASE_URL: z.string().url(),
  ROUTING_API_TOKEN: z.string().optional().or(z.literal("")),
  ROUTING_API_CLIENT_ID: z.string().optional().or(z.literal("")),
  ROUTING_API_CLIENT_SECRET: z.string().optional().or(z.literal("")),
  ROUTING_API_USERNAME: z.string().optional().or(z.literal("")),
  ROUTING_API_PASSWORD: z.string().optional().or(z.literal("")),
  MAKE_API_BASE_URL: z.string().url().optional().or(z.literal("")),
  MAKE_API_TOKEN: z.string().optional().or(z.literal("")),
  MAKE_API_TEAM_ID: z.string().optional().or(z.literal("")),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_SECURE: optionalBooleanEnvSchema,
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().min(1),
  REDIS_URL: z.string().url().optional().or(z.literal(""))
}).superRefine((value, ctx) => {
  const hasStaticToken = Boolean(value.ROUTING_API_TOKEN);
  const hasCredentialSet =
    Boolean(value.ROUTING_API_CLIENT_ID) &&
    Boolean(value.ROUTING_API_CLIENT_SECRET) &&
    Boolean(value.ROUTING_API_USERNAME) &&
    Boolean(value.ROUTING_API_PASSWORD);

  if (!hasStaticToken && !hasCredentialSet) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ROUTING_API_TOKEN"],
      message: "Provide either ROUTING_API_TOKEN or the full ROUTING_API_CLIENT_* and ROUTING_API_USERNAME/PASSWORD set."
    });
  }
});

export function getEnv() {
  return envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    APP_URL: process.env.APP_URL,
    ROUTING_API_BASE_URL: process.env.ROUTING_API_BASE_URL,
    ROUTING_API_TOKEN: process.env.ROUTING_API_TOKEN,
    ROUTING_API_CLIENT_ID: process.env.ROUTING_API_CLIENT_ID,
    ROUTING_API_CLIENT_SECRET: process.env.ROUTING_API_CLIENT_SECRET,
    ROUTING_API_USERNAME: process.env.ROUTING_API_USERNAME,
    ROUTING_API_PASSWORD: process.env.ROUTING_API_PASSWORD,
    MAKE_API_BASE_URL: process.env.MAKE_API_BASE_URL,
    MAKE_API_TOKEN: process.env.MAKE_API_TOKEN,
    MAKE_API_TEAM_ID: process.env.MAKE_API_TEAM_ID,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
    REDIS_URL: process.env.REDIS_URL
  });
}
