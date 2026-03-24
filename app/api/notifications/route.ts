import { NextResponse } from "next/server";
import { requireAccessContext } from "@/lib/tenant/access";
import { notificationScenarioMutationSchema } from "@/lib/validators/notification-scenario";
import { NotificationService } from "@/services/notification-service";
import { getRequestId } from "@/lib/utils/request";

export async function GET() {
  const access = await requireAccessContext();
  const service = new NotificationService();
  const scenario = await service.getAssignedScenario(access);
  return NextResponse.json(scenario);
}

export async function PUT(request: Request) {
  const access = await requireAccessContext();
  const service = new NotificationService();
  const payload = await request.json();
  const parsed = notificationScenarioMutationSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const scenario = await service.updateAssignedScenario(access, parsed.data, await getRequestId());
  return NextResponse.json(scenario);
}
