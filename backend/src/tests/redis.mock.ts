/**
 * Lightweight in-memory mock that mirrors every ioredis method the app uses.
 * Import this in tests and inject it via the module mock below.
 */

type Store = {
  strings: Map<string, string>;
  hashes: Map<string, Map<string, string>>;
  lists: Map<string, string[]>;
  sets: Map<string, Set<string>>;
};

function makeStore(): Store {
  return {
    strings: new Map(),
    hashes: new Map(),
    lists: new Map(),
    sets: new Map(),
  };
}

class PipelineMock {
  private ops: Array<() => void> = [];
  private results: Array<[null, unknown]> = [];

  constructor(private store: Store) {}

  set(key: string, value: string) {
    this.ops.push(() => {
      this.store.strings.set(key, value);
      this.results.push([null, "OK"]);
    });
    return this;
  }

  get(key: string) {
    this.ops.push(() => {
      this.results.push([null, this.store.strings.get(key) ?? null]);
    });
    return this;
  }

  del(...keys: string[]) {
    this.ops.push(() => {
      let count = 0;
      for (const k of keys) {
        if (
          this.store.strings.delete(k) ||
          this.store.hashes.delete(k) ||
          this.store.lists.delete(k) ||
          this.store.sets.delete(k)
        ) count++;
      }
      this.results.push([null, count]);
    });
    return this;
  }

  hset(key: string, fields: Record<string, string>) {
    this.ops.push(() => {
      if (!this.store.hashes.has(key)) this.store.hashes.set(key, new Map());
      const h = this.store.hashes.get(key)!;
      for (const [f, v] of Object.entries(fields)) h.set(f, v);
      this.results.push([null, Object.keys(fields).length]);
    });
    return this;
  }

  hgetall(key: string) {
    this.ops.push(() => {
      const h = this.store.hashes.get(key);
      const result = h ? Object.fromEntries(h.entries()) : null;
      this.results.push([null, result]);
    });
    return this;
  }

  sadd(key: string, ...members: string[]) {
    this.ops.push(() => {
      if (!this.store.sets.has(key)) this.store.sets.set(key, new Set());
      members.forEach((m) => this.store.sets.get(key)!.add(m));
      this.results.push([null, members.length]);
    });
    return this;
  }

  srem(key: string, ...members: string[]) {
    this.ops.push(() => {
      const s = this.store.sets.get(key);
      members.forEach((m) => s?.delete(m));
      this.results.push([null, members.length]);
    });
    return this;
  }

  incr(key: string) {
    this.ops.push(() => {
      const v = parseInt(this.store.strings.get(key) ?? "0", 10) + 1;
      this.store.strings.set(key, String(v));
      this.results.push([null, v]);
    });
    return this;
  }

  lpush(key: string, ...values: string[]) {
    this.ops.push(() => {
      if (!this.store.lists.has(key)) this.store.lists.set(key, []);
      const list = this.store.lists.get(key)!;
      list.unshift(...values.reverse());
      this.results.push([null, list.length]);
    });
    return this;
  }

  ltrim(key: string, start: number, stop: number) {
    this.ops.push(() => {
      const list = this.store.lists.get(key);
      if (list) this.store.lists.set(key, list.slice(start, stop + 1));
      this.results.push([null, "OK"]);
    });
    return this;
  }

  async exec(): Promise<Array<[null, unknown]>> {
    this.ops.forEach((op) => op());
    return this.results;
  }
}

export class RedisMock {
  public store: Store = makeStore();

  async connect() {}
  async ping() { return "PONG"; }

  async get(key: string) {
    return this.store.strings.get(key) ?? null;
  }

  async set(key: string, value: string) {
    this.store.strings.set(key, value);
    return "OK" as const;
  }

  async del(...keys: string[]) {
    let count = 0;
    for (const k of keys) {
      if (
        this.store.strings.delete(k) ||
        this.store.hashes.delete(k) ||
        this.store.lists.delete(k) ||
        this.store.sets.delete(k)
      ) count++;
    }
    return count;
  }

  async hget(key: string, field: string) {
    return this.store.hashes.get(key)?.get(field) ?? null;
  }

  async hset(key: string, fields: Record<string, string>) {
    if (!this.store.hashes.has(key)) this.store.hashes.set(key, new Map());
    const h = this.store.hashes.get(key)!;
    for (const [f, v] of Object.entries(fields)) h.set(f, v);
    return Object.keys(fields).length;
  }

  async hgetall(key: string) {
    const h = this.store.hashes.get(key);
    return h ? Object.fromEntries(h.entries()) : {};
  }

  async sadd(key: string, ...members: string[]) {
    if (!this.store.sets.has(key)) this.store.sets.set(key, new Set());
    members.forEach((m) => this.store.sets.get(key)!.add(m));
    return members.length;
  }

  async srem(key: string, ...members: string[]) {
    const s = this.store.sets.get(key);
    members.forEach((m) => s?.delete(m));
    return members.length;
  }

  async smembers(key: string) {
    return Array.from(this.store.sets.get(key) ?? []);
  }

  async incr(key: string) {
    const v = parseInt(this.store.strings.get(key) ?? "0", 10) + 1;
    this.store.strings.set(key, String(v));
    return v;
  }

  async lpush(key: string, ...values: string[]) {
    if (!this.store.lists.has(key)) this.store.lists.set(key, []);
    const list = this.store.lists.get(key)!;
    list.unshift(...[...values].reverse());
    return list.length;
  }

  async ltrim(key: string, start: number, stop: number) {
    const list = this.store.lists.get(key);
    if (list) this.store.lists.set(key, list.slice(start, stop + 1));
    return "OK" as const;
  }

  async lrange(key: string, start: number, stop: number) {
    const list = this.store.lists.get(key) ?? [];
    return stop === -1 ? list.slice(start) : list.slice(start, stop + 1);
  }

  pipeline() {
    return new PipelineMock(this.store);
  }

  /** Reset all data between tests */
  flush() {
    this.store = makeStore();
  }

  on(_event: string, _cb: (...args: unknown[]) => void) {
    return this;
  }
}

export const redisMock = new RedisMock();
