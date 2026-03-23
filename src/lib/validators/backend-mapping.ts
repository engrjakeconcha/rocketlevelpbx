import { z } from "zod";

export const backendMappingSchema = z.object({
  domainId: z.string().min(1),
  mappingType: z.enum(["DOMAIN", "SCHEDULE_TEMPLATE", "COVERAGE_GROUP", "COVERAGE_MEMBER", "OVERRIDE"]),
  internalKey: z.string().min(1),
  externalRef: z.string().min(1),
  metadataJson: z.record(z.any()).optional()
});
