import { operationStats } from "./cache-var";
import { CacheMetrics, CacheStats } from "./types";

export const MAX_HISTORY = 9999;

export class CacheStatsManager {
  /**
   * Method to store hit statistics
   * @param operation operation identifier
   * @param time time spent generating this hit, usually in milliseconds
   */
  public static hit(operation: string, time: number): void {
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

  /**
   * Method to store miss statistics
   * @param operation operation identifier
   * @param time time spent generating this miss, usually in milliseconds
   */
  public static miss(operation: string, time: number): void {
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

  public static getOperationData(operation: string): CacheStats | undefined {
    return operationStats.get(operation);
  }

  public static getOperationStats(
    operation: string,
    source?: Map<string, CacheStats>
  ): CacheMetrics | undefined {
    const stats = source
      ? source.get(operation)
      : operationStats.get(operation);

    if (stats) {
      const total = stats.hits + stats.misses;
      let value = stats.hits * (stats.averageMissTime - stats.averageHitTime);
      if (value < 0) {
        value = 0;
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
        processingRatio: value / divider,
        timeSavedRatio:
          stats.averageMissTime === 0 || stats.hits + stats.misses === 0
            ? 0
            : (stats.hits * (stats.averageMissTime - stats.averageHitTime)) /
              (stats.averageMissTime * (stats.hits + stats.misses)),
      };
    }
  }

  public static getOperations(): string[] {
    const output: string[] = [];

    operationStats.forEach((_values: CacheStats, key: string) => {
      output.push(key);
    });

    return output;
  }

  /**
   * Returns a printable string with operation information
   * @param operation operation identifier
   * @param source an optional alternative source of data
   * @returns string with operation information if found or empty string
   */
  public static operationStatsString(
    operation: string,
    source?: Map<string, CacheStats>
  ): string {
    const output: string[] = [];
    const stats = CacheStatsManager.getOperationStats(operation, source);

    if (!stats) {
      return "";
    }

    output.push(
      `Operation ${operation} Cache Metrics:\n\tHit Ratio:        ${stats.hitRatio}\n\tPerformance Gain: x${stats.performanceGain}\n\tProcessing Ratio: ${stats.processingRatio}\n\tTime Saved Ratio: ${stats.timeSavedRatio}`
    );

    return output.join("\n");
  }
}
