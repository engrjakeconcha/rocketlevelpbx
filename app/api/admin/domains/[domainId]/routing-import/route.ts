import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/tenant/access";
import { AdminRoutingImportService } from "@/services/admin-routing-import-service";

export async function POST(_request: Request, { params }: { params: Promise<{ domainId: string }> }) {
  const access = await requireAdminAccess();
  const { domainId } = await params;

  try {
    const result = await new AdminRoutingImportService().importDomainSnapshot(access, domainId, crypto.randomUUID());
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not import the live routing snapshot"
      },
      { status: 400 }
    );
  }
}
