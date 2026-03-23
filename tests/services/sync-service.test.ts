import { describe, expect, it, vi } from "vitest";
import { SyncService } from "@/services/sync-service";

describe("SyncService", () => {
  it("marks a schedule sync as successful", async () => {
    const client = {
      updateSchedule: vi.fn().mockResolvedValue({ ok: true }),
      updateCoverage: vi.fn()
    };
    const db = {
      syncJob: {
        create: vi.fn().mockResolvedValue({ id: "job_1" }),
        update: vi.fn().mockResolvedValue({})
      },
      scheduleTemplate: {
        update: vi.fn().mockResolvedValue({})
      },
      coverageGroup: {
        update: vi.fn().mockResolvedValue({})
      }
    };

    const service = new SyncService(client as never, db as never);
    const result = await service.syncSchedule({
      domainId: "domain_1",
      scheduleTemplateId: "schedule_1",
      externalRef: "external_1",
      metadata: { domain: "rocketlevel" },
      payload: { foo: "bar" },
      requestedByUserId: "user_1"
    });

    expect(result.status).toBe("SUCCESS");
    expect(client.updateSchedule).toHaveBeenCalledWith("external_1", { foo: "bar" }, { domain: "rocketlevel" });
    expect(db.scheduleTemplate.update).toHaveBeenCalled();
    expect(db.syncJob.update).toHaveBeenCalled();
  });

  it("marks a coverage sync as failed when the client throws", async () => {
    const client = {
      updateSchedule: vi.fn(),
      updateCoverage: vi.fn().mockRejectedValue(new Error("engine unavailable"))
    };
    const db = {
      syncJob: {
        create: vi.fn().mockResolvedValue({ id: "job_2" }),
        update: vi.fn().mockResolvedValue({})
      },
      scheduleTemplate: {
        update: vi.fn().mockResolvedValue({})
      },
      coverageGroup: {
        update: vi.fn().mockResolvedValue({})
      }
    };

    const service = new SyncService(client as never, db as never);
    const result = await service.syncCoverage({
      domainId: "domain_1",
      coverageGroupId: "coverage_1",
      externalRef: "external_2",
      metadata: { domain: "rocketlevel", callqueue: "6000" },
      payload: { order: [] }
    });

    expect(result.status).toBe("FAILED");
    expect(db.coverageGroup.update).toHaveBeenCalled();
    expect(db.syncJob.update).toHaveBeenCalled();
  });
});
