import { randomUUID } from "crypto";
import { CacheStats } from "./types";

const instanceKey = randomUUID();

export class CombineStatsManager {
  private combinedStats: Map<string, CacheStats>;

  constructor() {
    this.combinedStats = new Map();
  }

  public static getInstanceKey(): string {
    return instanceKey;
  }

  public combineStats(operation: string, value: CacheStats): void {
    const stats = this.combinedStats.get(operation);

    if (!stats) {
      this.combinedStats.set(operation, value);
      return;
    }

    stats.hits += value.hits;
    stats.misses += value.misses;
    stats.averageHitTime += value.averageHitTime * value.hits;
    stats.averageMissTime += value.averageMissTime * value.misses;
  }

  public finalizeCombinedStats(): Map<string, CacheStats> {
    const finalStats = this.combinedStats;
    this.combinedStats = new Map();

    finalStats.forEach((stats: CacheStats) => {
      stats.averageHitTime = stats.averageHitTime / stats.hits;
      stats.averageMissTime = stats.averageMissTime / stats.misses;
    });

    return finalStats;
  }
}
