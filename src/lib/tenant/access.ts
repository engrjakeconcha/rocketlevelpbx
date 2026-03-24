import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import type { AccessContext } from "@/types/access";
export { assertDomainAccess } from "@/lib/tenant/guards";

export async function requireAccessContext(): Promise<AccessContext> {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      memberships: {
        include: {
          domain: true
        }
      },
      notificationScenario: true
    }
  });

  if (!user) {
    redirect("/login");
  }

  const membership = user.memberships[0] ?? null;
  const isAdmin = user.role === UserRole.ADMIN;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    membership,
    isAdmin,
    domainId: isAdmin ? null : membership?.domainId ?? null,
    domainSlug: isAdmin ? null : membership?.domain.slug ?? null,
    notificationScenarioId: isAdmin ? null : user.notificationScenarioId ?? null,
    notificationScenarioName: isAdmin ? null : user.notificationScenario?.name ?? null
  };
}

export async function requireAdminAccess() {
  const context = await requireAccessContext();

  if (!context.isAdmin) {
    redirect("/overview");
  }

  return context;
}
