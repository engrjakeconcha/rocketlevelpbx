import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/tenant/access";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  await requireAdminAccess();
  const { jobId } = (await request.json()) as { jobId?: string };

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const updated = await prisma.syncJob.update({
    where: { id: jobId },
    data: {
      status: "PENDING",
      retryCount: { increment: 1 },
      lastError: null
    }
  });

  return NextResponse.json(updated);
}
