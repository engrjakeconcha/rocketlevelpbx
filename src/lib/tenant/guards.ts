import type { AccessContext } from "@/types/access";

export function assertDomainAccess(context: AccessContext, domainId: string) {
  if (context.isAdmin) {
    return;
  }

  if (context.domainId !== domainId) {
    throw new Error("Access denied for the requested domain");
  }
}
