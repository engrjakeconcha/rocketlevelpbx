import { NextResponse } from "next/server";
import { requireAccessContext } from "@/lib/tenant/access";
import { coverageMutationSchema } from "@/lib/validators/coverage";
import { CoverageService } from "@/services/coverage-service";
import { getRequestId } from "@/lib/utils/request";

export async function GET() {
  const access = await requireAccessContext();
  const service = new CoverageService();
  const coverage = await service.getCoverage(access, access.domainId!);
  return NextResponse.json(coverage);
}

export async function PUT(request: Request) {
  const access = await requireAccessContext();
  const service = new CoverageService();
  const payload = await request.json();
  const parsed = coverageMutationSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const coverage = await service.updateCoverage(access, access.domainId!, parsed.data, await getRequestId());
  return NextResponse.json(coverage);
}
