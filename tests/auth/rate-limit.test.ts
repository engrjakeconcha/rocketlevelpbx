import { describe, expect, it } from "vitest";
import { MemoryRateLimiter } from "@/lib/auth/rate-limit";

describe("MemoryRateLimiter", () => {
  it("blocks requests after the configured limit", () => {
    const limiter = new MemoryRateLimiter(2, 60_000);

    expect(limiter.check("login:test").allowed).toBe(true);
    expect(limiter.check("login:test").allowed).toBe(true);
    expect(limiter.check("login:test").allowed).toBe(false);
  });
});
