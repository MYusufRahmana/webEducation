import { createRateSim, type Account, type RateAction, type RateSim } from "./model";

/**
 * Six scenes. Each builds its own state, so every replay shows the same events. Scenes with the limiter
 * stay inside one 10-second window, except scene 6, which shows the window ending and starting again.
 */
export type RatePartKey = "users" | "limiter" | "counters" | "server" | "db" | "window";

export interface RateStepConfig {
  key: string;
  highlight: RatePartKey[];
  build: () => RateSim;
  holdAt: number;
}

const press = (who: Account, ...at: number[]): RateAction[] => at.map((t) => ({ at: t, kind: "check" as const, who }));

export const RATE_STEPS: RateStepConfig[] = [
  { key: "cek-kursi", highlight: ["users", "server"], build: () => createRateSim({ limiterOn: false, script: press("Andi", 0.4) }), holdAt: 6.4 },
  {
    key: "terlalu-cepat",
    highlight: ["server", "users"],
    build: () => createRateSim({ limiterOn: false, script: [...press("Andi", 0.4, 0.75, 1.1, 1.45, 1.8, 2.15, 2.5), ...press("Budi", 2.0)] }),
    holdAt: 13.4,
  },
  { key: "pasang-pemeriksa", highlight: ["limiter", "counters", "window"], build: () => createRateSim({ script: press("Andi", 1.0) }), holdAt: 7.0 },
  { key: "jatah-habis", highlight: ["limiter", "counters"], build: () => createRateSim({ script: press("Andi", 0.4, 1.0, 1.6, 2.2, 2.8, 3.4) }), holdAt: 9.6 },
  { key: "budi-tetap-bisa", highlight: ["counters", "users"], build: () => createRateSim({ counts: { Andi: 5 }, script: [...press("Andi", 0.6), ...press("Budi", 1.4)] }), holdAt: 7.0 },
  { key: "coba-lagi", highlight: ["window", "counters"], build: () => createRateSim({ t: 6.6, counts: { Andi: 5, Budi: 1 }, script: [...press("Andi", 7.0), ...press("Andi", 10.6)] }), holdAt: 16.4 },
];
