import { randomUUID } from "crypto";
import { CacheStats } from "./types";

const instanceKey = randomUUID();

export class CombineStatsManager {
  private combinedStats: Map<string, CacheStats>;

  /**
   * Create a class used to combine statistics from different sources, you need to call combineStats and then finalizeCombinedStats to get final data
   */
  constructor() {
    this.combinedStats = new Map();
  }

  public static getInstanceKey(): string {
    return instanceKey;
  }

  /**
   * Method to combine data of each operation, call be called multiple times
   * @param operation operation identifier
   * @param value values for the identifier
   * @returns
   */
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

  /**
   * Method to finalize statistics math and return computed values
   * @returns Map with all operations and it's data
   */
  public finalizeCombinedStats(): Map<string, CacheStats> {
    const finalStats = this.combinedStats;
    this.combinedStats = new Map();

    finalStats.forEach((stats: CacheStats) => {
      stats.averageHitTime =
        stats.hits > 0 ? stats.averageHitTime / stats.hits : 0;
      stats.averageMissTime =
        stats.misses > 0 ? stats.averageMissTime / stats.misses : 0;
    });

    return finalStats;
  }
}
