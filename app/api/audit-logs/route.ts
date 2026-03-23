import { NextResponse } from "next/server";
import { requireAccessContext } from "@/lib/tenant/access";
import { auditRepository } from "@/repositories/audit-repository";

export async function GET() {
  const access = await requireAccessContext();
  const rows = access.isAdmin ? await auditRepository.listAll() : await auditRepository.listForDomain(access.domainId!);
  return NextResponse.json(rows);
}
