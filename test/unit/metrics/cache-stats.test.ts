import { CacheStatsManager, MAX_HISTORY } from "../../../src";
import { operationStats } from "../../../src/metrics/cache-var";
import { CacheMetrics, CacheStats } from "../../../src/metrics/types";

describe("CacheStatsManager", () => {
  it("Stats should not throw an error case there is a hit but not misses", async () => {
    const operation = "query-a";
    CacheStatsManager.hit(operation, 1);

    expect(CacheStatsManager.getOperationStats(operation)).toStrictEqual({
      operation,
      hitRatio: 1,
      performanceGain: 0,
      timeSavedRatio: 0,
    });
  });

  it("Stats should not throw an error case there is a miss but not hits", async () => {
    const operation = "query-b";
    CacheStatsManager.miss(operation, 1);

    expect(CacheStatsManager.getOperationStats(operation)).toStrictEqual({
      operation,
      hitRatio: 0,
      performanceGain: 0,
      timeSavedRatio: 0,
    });
  });

  it("Stats should not throw an error case there is no hits and misses", async () => {
    const operation = "query-c";
    CacheStatsManager.miss(operation, 1);

    expect(CacheStatsManager.getOperationStats(operation)).toStrictEqual({
      operation,
      hitRatio: 0,
      performanceGain: 0,
      timeSavedRatio: 0,
    });
  });

  it("We should avoid have too much history to avoid overflow", async () => {
    const operation = "overflow-hit";

    const currentState = {
      averageHitTime: 1,
      averageMissTime: 60000,
      hits: MAX_HISTORY + 1,
      misses: MAX_HISTORY + 1,
    };

    operationStats.clear();
    operationStats.set(operation, currentState);

    CacheStatsManager.miss(operation, 1500);
    CacheStatsManager.hit(operation, 5);

    expect(CacheStatsManager.getOperationStats(operation)).toStrictEqual({
      operation,
      hitRatio: 0.5,
      performanceGain: 59970.161935225915,
      timeSavedRatio: 0.4999916625204291,
    });
    expect(CacheStatsManager.getOperations()).toStrictEqual([operation]);
    expect(CacheStatsManager.operationStatsString(operation)).toMatchSnapshot();
    expect(CacheStatsManager.getOperationData(operation)).toStrictEqual({
      averageHitTime: 1.0004,
      averageMissTime: 59994.15,
      hits: 10001,
      misses: 10001,
    });
    expect(CacheStatsManager.operationStatsString("nonexistent")).toBe("");
  });

  it("Should match manually calculated math", async () => {
    const operation = "query-f";
    const testList: [CacheStats, CacheMetrics][] = [
      [
        {
          averageHitTime: 5,
          averageMissTime: 1500,
          hits: 1,
          misses: 1,
        },
        {
          operation,
          hitRatio: 0.5,
          performanceGain: 300,
          timeSavedRatio: 0.49833333333333335,
        },
      ],
      [
        {
          averageHitTime: 25,
          averageMissTime: 50,
          hits: 950000,
          misses: 50000,
        },
        {
          operation,
          hitRatio: 0.95,
          performanceGain: 2,
          timeSavedRatio: 0.475,
        },
      ],
      [
        {
          averageHitTime: 5,
          averageMissTime: 10,
          hits: 40,
          misses: 10,
        },
        {
          operation,
          hitRatio: 0.8,
          performanceGain: 2,
          timeSavedRatio: 0.4,
        },
      ],
      [
        {
          averageHitTime: 25,
          averageMissTime: 150,
          hits: 950000,
          misses: 50000,
        },
        {
          operation,
          hitRatio: 0.95,
          performanceGain: 6,
          timeSavedRatio: 0.7916666666666666,
        },
      ],
    ];

    testList.forEach((test) => {
      const [input, outcome] = test;

      operationStats.clear();
      operationStats.set(operation, input);

      expect(CacheStatsManager.getOperationStats(operation)).toStrictEqual(
        outcome
      );
    });
  });

  it("Should work with other sources of data", async () => {
    const operation = "query-f";

    expect(
      CacheStatsManager.operationStatsString(
        operation,
        new Map([
          [
            operation,
            { averageHitTime: 1, averageMissTime: 1, hits: 1, misses: 1 },
          ],
        ])
      )
    ).toMatchSnapshot();
  });
});
