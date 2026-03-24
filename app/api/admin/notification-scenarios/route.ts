import { NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/tenant/access";
import { notificationScenarioConfigSchema } from "@/lib/validators/notification-scenario";
import { NotificationService } from "@/services/notification-service";

export async function GET() {
  const access = await requireAdminAccess();
  const scenarios = await new NotificationService().listScenarios(access);
  return NextResponse.json(scenarios);
}

export async function PUT(request: Request) {
  const access = await requireAdminAccess();
  const payload = await request.json();
  const parsed = notificationScenarioConfigSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const scenario = await new NotificationService().updateScenarioConfig(access, parsed.data);
  return NextResponse.json(scenario);
}
