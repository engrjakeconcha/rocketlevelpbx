import { OverrideForm } from "@/components/schedule/override-form";
import { requireAccessContext } from "@/lib/tenant/access";
import { scheduleRepository } from "@/repositories/schedule-repository";

export default async function TemporaryOverridesPage() {
  const access = await requireAccessContext();
  const schedule = await scheduleRepository.getPrimaryTemplate(access.domainId!);
  return <OverrideForm overrides={schedule?.overrides ?? []} />;
}
