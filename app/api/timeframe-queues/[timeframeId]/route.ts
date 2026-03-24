import { NextResponse } from "next/server";
import { requireAccessContext } from "@/lib/tenant/access";
import { getRequestId } from "@/lib/utils/request";
import { timeframeQueueMutationSchema } from "@/lib/validators/timeframe-queue";
import { TimeframeQueueService } from "@/services/timeframe-queue-service";

export async function PUT(request: Request, context: { params: Promise<{ timeframeId: string }> }) {
  const access = await requireAccessContext();
  const params = await context.params;
  const payload = await request.json();
  const parsed = timeframeQueueMutationSchema.safeParse({
    ...payload,
    timeframeId: params.timeframeId
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const timeframe = await new TimeframeQueueService().updateLinkedQueue(
    access,
    access.domainId!,
    parsed.data,
    await getRequestId()
  );

  return NextResponse.json(timeframe);
}
