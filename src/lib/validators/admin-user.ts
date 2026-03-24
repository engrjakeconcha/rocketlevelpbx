import { z } from "zod";

export const adminUserSchema = z
  .object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    role: z.enum(["ADMIN", "CUSTOMER"]),
    domainId: z.string().optional().nullable()
  })
  .superRefine((value, context) => {
    if (value.role === "CUSTOMER" && !value.domainId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Customers must be assigned to an existing domain",
        path: ["domainId"]
      });
    }

    if (value.role === "ADMIN" && value.domainId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Admins cannot be assigned to a single customer domain at creation time",
        path: ["domainId"]
      });
    }
  });

export type AdminUserInput = z.infer<typeof adminUserSchema>;
