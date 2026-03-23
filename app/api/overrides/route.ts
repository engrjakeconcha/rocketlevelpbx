import { NextResponse } from "next/server";
import { requireAccessContext } from "@/lib/tenant/access";
import { scheduleRepository } from "@/repositories/schedule-repository";

export async function GET() {
  const access = await requireAccessContext();
  const schedule = await scheduleRepository.getPrimaryTemplate(access.domainId!);
  return NextResponse.json(schedule?.overrides ?? []);
}
