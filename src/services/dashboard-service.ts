import { isWithinInterval } from "date-fns";
import { domainRepository } from "@/repositories/domain-repository";
import { scheduleRepository } from "@/repositories/schedule-repository";
import { coverageRepository } from "@/repositories/coverage-repository";

function inferOpenStatus(
  timezone: string,
  weeklyRules: Array<{ dayOfWeek: number; isOpen: boolean; startTime: string | null; endTime: string | null }>,
  overrides: Array<{ startsAt: Date; endsAt: Date; enabled: boolean; mode: string }>
) {
  const now = new Date();
  const activeOverride = overrides.find(
    (entry) => entry.enabled && isWithinInterval(now, { start: entry.startsAt, end: entry.endsAt })
  );

  if (activeOverride?.mode === "FORCE_CLOSED" || activeOverride?.mode === "VACATION") {
    return { status: "Closed", source: "Temporary override" };
  }

  if (activeOverride?.mode === "FORCE_OPEN") {
    return { status: "Open", source: "Temporary override" };
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const currentTime = `${hour}:${minute}`;
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const todayRule = weeklyRules.find((rule) => rule.dayOfWeek === dayMap[weekday]);

  if (!todayRule?.isOpen || !todayRule.startTime || !todayRule.endTime) {
    return { status: "Closed", source: "Business hours" };
  }

  const isOpen = currentTime >= todayRule.startTime && currentTime < todayRule.endTime;
  return { status: isOpen ? "Open" : "Closed", source: "Business hours" };
}

export const dashboardService = {
  async getOverview(domainId: string) {
    const domain = await domainRepository.findById(domainId);

    if (!domain) {
      throw new Error("Domain not found");
    }

    const schedule = await scheduleRepository.getPrimaryTemplate(domainId);
    const coverage = await coverageRepository.getPrimaryGroup(domainId);

    const openStatus = schedule
      ? inferOpenStatus(schedule.timezone, schedule.weeklyRules, schedule.overrides)
      : { status: "Unknown", source: "No schedule configured" };

    return {
      domainName: domain.description,
      domainSlug: domain.slug,
      timezone: domain.timezone,
      activeStatus: openStatus,
      scheduleSummary: schedule?.weeklyRules ?? [],
      activeCoverageMembers: coverage?.members.filter((member) => member.enabled).length ?? 0,
      lastSyncedAt: schedule?.lastSyncedAt ?? coverage?.lastSyncedAt ?? null,
      overrideStatus: schedule?.overrides.find((item) => item.enabled) ?? null
    };
  }
};
