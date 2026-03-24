import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/tenant/access";
import { AdminDomainSyncService } from "@/services/admin-domain-sync-service";

export async function POST() {
  const access = await requireAdminAccess();

  try {
    const result = await new AdminDomainSyncService().syncAccessibleDomains(access, crypto.randomUUID());
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sync accessible domains" },
      { status: 400 }
    );
  }
}
