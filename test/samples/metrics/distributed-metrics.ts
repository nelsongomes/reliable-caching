import { CacheStats } from "../../../src/metrics/types";
import { CacheStatsManager, CombineStatsManager } from "../../../src";

async function testDistributedMetrics() {
  // let's simulate metrics of 2 operations on an instance
  const instance1GetCustomer: CacheStats = {
    hits: 10,
    misses: 3,
    averageHitTime: 1.5,
    averageMissTime: 10,
  };

  const instance1CustomerSettings: CacheStats = {
    hits: 62,
    misses: 27,
    averageHitTime: 4.5,
    averageMissTime: 160,
  };

  // let's simulate metrics of 1 operation on a second instance
  const instance2CustomerSettings: CacheStats = {
    hits: 99,
    misses: 15,
    averageHitTime: 5.5,
    averageMissTime: 90,
  };

  // push all stats from the 2 instances to combine them
  const manager = new CombineStatsManager();

  manager.combineStats("get-customer", instance1GetCustomer);
  manager.combineStats("settings", instance1CustomerSettings);

  manager.combineStats("settings", instance2CustomerSettings);

  // now we finalize math and cleanup
  const combinedStats = manager.finalizeCombinedStats();

  console.log(combinedStats);
  combinedStats.forEach((_value: CacheStats, key: string) => {
    console.log(CacheStatsManager.operationStatsString(key, combinedStats));
  });
}

testDistributedMetrics();

/* outputs:
Map(2) {
  'get-customer' => {
    hits: 10,
    misses: 3,
    averageHitTime: 0.15,
    averageMissTime: 3.3333333333333335
  },
  'settings' => {
    hits: 161,
    misses: 42,
    averageHitTime: 3.409937888198758,
    averageMissTime: 35.95238095238095
  }
}
Operation get-customer Cache Metrics:
	Hit Ratio:        0.7692307692307693
	Performance Gain: x22.222222222222225
	Time-saved Ratio: 0.7346153846153847
Operation settings Cache Metrics:
	Hit Ratio:        0.7931034482758621
	Performance Gain: x10.543412264723738
	Time-saved Ratio: 0.7178807947019867
*/
