import { NextResponse } from "next/server";
import { requireAccessContext } from "@/lib/tenant/access";
import { scheduleMutationSchema } from "@/lib/validators/schedule";
import { ScheduleService } from "@/services/schedule-service";
import { getRequestId } from "@/lib/utils/request";

export async function GET() {
  const access = await requireAccessContext();
  const service = new ScheduleService();
  const schedule = await service.getSchedule(access, access.domainId!);
  return NextResponse.json(schedule);
}

export async function PUT(request: Request) {
  const access = await requireAccessContext();
  const service = new ScheduleService();
  const payload = await request.json();
  const parsed = scheduleMutationSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const schedule = await service.updateSchedule(access, access.domainId!, parsed.data, await getRequestId());
  return NextResponse.json(schedule);
}
