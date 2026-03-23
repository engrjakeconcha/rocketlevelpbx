import type { Prisma } from "@prisma/client";

export function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.JsonValue;
}
