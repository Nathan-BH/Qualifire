/**
 * virgin-cycle23: the feed mounts a few live maps at once and a 'plain' card
 * draws the ride's own fixes — one JSONL read per card. This module paces
 * those reads (at most `concurrency` in flight, FIFO), dedupes a read already
 * in flight, decimates through trailModel's appendTrailPoint (same rule as
 * RideDetailScreen) and keeps the last `capacity` trails in an LRU so a
 * scroll back, or a remount after BACK from the detail page, redraws from
 * memory. Pure: the reader is injected; the app wires readRideFixes in
 * activityCard.tsx (brief 02).
 */
import { appendTrailPoint, type TrailPoint } from './trailModel.ts';

export class LruCache<V> {
  private map = new Map<string, V>();
  readonly capacity: number;
  constructor(capacity: number) { this.capacity = capacity; }
  get(key: string): V | undefined {        // refreshes recency
    const v = this.map.get(key);
    if (v === undefined) return undefined;
    this.map.delete(key); this.map.set(key, v);
    return v;
  }
  has(key: string): boolean { return this.map.has(key); }
  set(key: string, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value as string;
      this.map.delete(oldest);
    }
  }
  get size(): number { return this.map.size; }
  keys(): string[] { return [...this.map.keys()]; }
}

export type FixReader = (rideId: string) => Promise<readonly { lat: number; lon: number }[] | null>;

export interface TrailLoader {
  /** resolves to the decimated trail (cached afterwards), or null when the file is missing/unreadable (null is cached too, so a missing file is read once) */
  load(rideId: string): Promise<readonly TrailPoint[] | null>;
  /** synchronous cache probe: undefined = not loaded yet */
  peek(rideId: string): readonly TrailPoint[] | null | undefined;
  /** test hook */
  inFlight(): number;
}

export function decimateFixes(raw: readonly { lat: number; lon: number }[]): readonly TrailPoint[] {
  let trail: readonly TrailPoint[] = [];
  for (const f of raw) trail = appendTrailPoint(trail, f.lat, f.lon);
  return trail;
}

export function createTrailLoader(read: FixReader, capacity: number, concurrency: number): TrailLoader {
  const cache = new LruCache<readonly TrailPoint[] | null>(capacity);
  const pending = new Map<string, Promise<readonly TrailPoint[] | null>>();
  const queue: (() => void)[] = [];
  let running = 0;
  const next = () => { while (running < concurrency && queue.length > 0) { running++; queue.shift()!(); } };
  return {
    peek: (id) => (cache.has(id) ? cache.get(id) : undefined),
    inFlight: () => running,
    load(id) {
      if (cache.has(id)) return Promise.resolve(cache.get(id) as readonly TrailPoint[] | null);
      const p = pending.get(id);
      if (p) return p;
      const job = new Promise<readonly TrailPoint[] | null>((resolve) => {
        queue.push(() => {
          new Promise<readonly { lat: number; lon: number }[] | null>((res) => res(read(id))).then((raw) => (raw === null ? null : decimateFixes(raw))).catch(() => null).then((trail) => {
            cache.set(id, trail);
            pending.delete(id);
            running--;
            resolve(trail);
            next();
          });
        });
      });
      pending.set(id, job);
      next();
      return job;
    },
  };
}
