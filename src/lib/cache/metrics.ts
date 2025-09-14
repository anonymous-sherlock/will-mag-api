// File: metrics.ts
// Create new file
import { Counter } from "prom-client";

export const cacheHits = new Counter({
  name: "cache_hits_total",
  help: "Total number of cache hits",
});

export const cacheMisses = new Counter({
  name: "cache_misses_total",
  help: "Total number of cache misses",
});

export const cacheFallbacks = new Counter({
  name: "cache_fallback_invoked_total",
  help: "Total number of fallback invocations",
});

export function emitMetric(name: string, labels: Record<string, string> = {}): void {
  if (name === "cache.fallback.invoked") {
    cacheFallbacks.inc(labels);
  }
}
