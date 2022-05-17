import { operationStats } from "./cache-var";
import { CacheMetrics, CacheStats } from "./types";

export const MAX_HISTORY = 99999999;

export class CacheStatsManager {
  public static hit(operation: string, time: number) {
    let stats = operationStats.get(operation);

    if (!stats) {
      stats = {
        hits: 0,
        misses: 0,
        averageHitTime: 0,
        averageMissTime: 0,
      };
      operationStats.set(operation, stats);
    }

    CacheStatsManager.updateHits(stats, time);
  }

  public static miss(operation: string, time: number) {
    let stats = operationStats.get(operation);

    if (!stats) {
      stats = {
        hits: 0,
        misses: 0,
        averageHitTime: 0,
        averageMissTime: 0,
      };
      operationStats.set(operation, stats);
    }

    CacheStatsManager.updateMisses(stats, time);
  }

  private static updateHits(stats: CacheStats, time: number) {
    const histCount = stats.hits > MAX_HISTORY ? MAX_HISTORY : stats.hits;

    stats.averageHitTime =
      (stats.averageHitTime * histCount + time) / (histCount + 1);
    stats.hits++;
  }

  private static updateMisses(stats: CacheStats, time: number) {
    const histCount = stats.misses > MAX_HISTORY ? MAX_HISTORY : stats.misses;

    stats.averageMissTime =
      (stats.averageMissTime * histCount + time) / (histCount + 1);
    stats.misses++;
  }

  public static getOperationStats(operation: string): CacheMetrics | undefined {
    let stats = operationStats.get(operation);

    if (stats) {
      const total = stats.hits + stats.misses;
      let averageTimeSaved =
        stats.averageMissTime -
        stats.averageMissTime * (stats.misses / total) -
        stats.averageHitTime * (stats.hits / total);

      if (averageTimeSaved < 0) {
        averageTimeSaved = 0;
      }

      const divider =
        stats.averageMissTime * stats.misses +
        stats.averageHitTime * stats.hits;

      return {
        operation: operation,
        hitRatio: stats.hits / total,
        performanceGain:
          stats.averageHitTime === 0
            ? 0
            : stats.averageMissTime / stats.averageHitTime,
        timeSavedRatio: (total * averageTimeSaved) / divider,
      };
    }
  }
}
