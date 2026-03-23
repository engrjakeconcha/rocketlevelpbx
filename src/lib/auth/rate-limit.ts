type Entry = {
  count: number;
  resetAt: number;
};

export class MemoryRateLimiter {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly limit: number, private readonly windowMs: number) {}

  check(key: string) {
    const now = Date.now();
    const current = this.entries.get(key);

    if (!current || current.resetAt < now) {
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.limit - 1 };
    }

    if (current.count >= this.limit) {
      return { allowed: false, remaining: 0 };
    }

    current.count += 1;
    this.entries.set(key, current);
    return { allowed: true, remaining: this.limit - current.count };
  }
}

export const authRateLimiter = new MemoryRateLimiter(10, 10 * 60 * 1000);
