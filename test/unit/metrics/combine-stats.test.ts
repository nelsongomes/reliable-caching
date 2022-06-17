import { CombineStatsManager } from "../../../src";

describe("CombineStatsManager", () => {
  it("Should work with a single operation metric", async () => {
    const operation = "query-a";
    const manager = new CombineStatsManager();

    manager.combineStats(operation, {
      averageHitTime: 1,
      averageMissTime: 10,
      hits: 1,
      misses: 1,
    });

    expect(manager.finalizeCombinedStats()).toStrictEqual(
      new Map([
        [
          operation,
          { averageHitTime: 1, averageMissTime: 10, hits: 1, misses: 1 },
        ],
      ])
    );
  });

  it("Should work with multiple operation metric", async () => {
    const operation = "query-a";
    const manager = new CombineStatsManager();

    manager.combineStats(operation, {
      averageHitTime: 1,
      averageMissTime: 10,
      hits: 1,
      misses: 1,
    });

    manager.combineStats(operation, {
      averageHitTime: 10,
      averageMissTime: 100,
      hits: 10,
      misses: 10,
    });

    expect(manager.finalizeCombinedStats()).toStrictEqual(
      new Map([
        [
          operation,
          {
            averageHitTime: 9.181818181818182,
            averageMissTime: 91.81818181818181,
            hits: 11,
            misses: 11,
          },
        ],
      ])
    );
  });

  it("Should return correct math if no misses exist", async () => {
    const operation = "query-a";
    const manager = new CombineStatsManager();

    manager.combineStats(operation, {
      averageHitTime: 0,
      averageMissTime: 0,
      hits: 0,
      misses: 0,
    });

    expect(manager.finalizeCombinedStats()).toStrictEqual(
      new Map([
        [
          operation,
          {
            averageHitTime: 0,
            averageMissTime: 0,
            hits: 0,
            misses: 0,
          },
        ],
      ])
    );
  });

  it("Should return this instance ID", async () => {
    expect(CombineStatsManager.getInstanceKey()).toEqual(expect.any(String));
  });
});
