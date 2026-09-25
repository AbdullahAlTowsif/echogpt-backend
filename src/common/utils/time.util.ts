import { Temporal } from 'temporal-polyfill';

const UNIT_MS: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

export function parseDurationMs(expiry: string): number {
  const match = /^(\d+)([smhd])$/.exec(expiry);
  if (!match) return 7 * UNIT_MS.d;
  return Number(match[1]) * UNIT_MS[match[2]];
}

export function instantAfterMs(ms: number): Temporal.Instant {
  return Temporal.Now.instant().add({ milliseconds: ms });
}
