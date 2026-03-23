import { WeeklyHoursEditor } from "@/components/schedule/weekly-hours-editor";
import { HolidayManager } from "@/components/schedule/holiday-manager";
import { OverrideForm } from "@/components/schedule/override-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAccessContext } from "@/lib/tenant/access";
import { scheduleRepository } from "@/repositories/schedule-repository";

export default async function SchedulePage() {
  const access = await requireAccessContext();
  const schedule = await scheduleRepository.getPrimaryTemplate(access.domainId!);

  if (!schedule) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No schedule configured</CardTitle>
        </CardHeader>
        <CardContent>Onboarding must create the initial schedule before customers can manage it.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <WeeklyHoursEditor
        timezone={schedule.timezone}
        rules={schedule.weeklyRules.map((rule) => ({ ...rule, id: rule.id }))}
        holidayClosures={schedule.holidayClosures.map((holiday) => ({
          id: holiday.id,
          name: holiday.name,
          startsAt: holiday.startsAt.toISOString(),
          endsAt: holiday.endsAt.toISOString()
        }))}
        overrides={schedule.overrides.map((override) => ({
          id: override.id,
          label: override.label,
          mode: override.mode,
          startsAt: override.startsAt.toISOString(),
          endsAt: override.endsAt.toISOString(),
          targetNumber: override.targetNumber
        }))}
      />
      <HolidayManager holidays={schedule.holidayClosures} />
      <OverrideForm overrides={schedule.overrides} />
    </div>
  );
}
