const active = new Map<string, number>();
const waiting = new Map<string, (() => void)[]>();

export async function withSlot<T>(host: string, limit: number, task: () => Promise<T>): Promise<T> {
  while ((active.get(host) ?? 0) >= limit) {
    await new Promise<void>((resolve) => waiting.set(host, [...(waiting.get(host) ?? []), resolve]));
  }
  active.set(host, (active.get(host) ?? 0) + 1);
  try {
    return await task();
  } finally {
    active.set(host, (active.get(host) ?? 1) - 1);
    waiting.get(host)?.shift()?.();
  }
}
