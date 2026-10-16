import { untilAborted } from "#abort.ts";

interface Entry<V> {
  value: Promise<V>;
  expires: number;
}

export class Memo<V> {
  readonly #entries = new Map<string, Entry<V>>();
  readonly #ttl: number;

  constructor(ttl: number) {
    this.#ttl = ttl;
  }

  get(key: string, load: () => Promise<V>, signal: AbortSignal): Promise<V> {
    const now = Date.now();
    const cached = this.#entries.get(key);
    const entry = cached !== undefined && cached.expires > now ? cached : this.#load(key, load, now);
    return untilAborted(entry.value, signal);
  }

  #load(key: string, load: () => Promise<V>, now: number): Entry<V> {
    const entry = { value: load(), expires: now + this.#ttl };
    this.#entries.set(key, entry);
    entry.value.catch(() => {
      if (this.#entries.get(key) === entry) this.#entries.delete(key);
    });
    return entry;
  }
}
