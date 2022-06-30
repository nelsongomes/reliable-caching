import { getDeltaMilliseconds, now } from "ts-timeframe";
import { CacheStatsManager, delay } from "../../../src";

async function testCacheMetrics() {
  // let's simulate a miss
  const startMiss = now();
  await delay(5); // do some time costly processing
  CacheStatsManager.miss(
    "get-customer",
    getDeltaMilliseconds(startMiss, now())
  );

  // let's simulate a hit
  const startHit = now();
  await delay(1);
  CacheStatsManager.hit("get-customer", getDeltaMilliseconds(startHit, now()));

  const operationStats = CacheStatsManager.operationStatsString("get-customer");
  console.log(operationStats);
}

testCacheMetrics();

/* outputs:
Operation get-customer Cache Metrics:
	Hit Ratio:        0.5
	Performance Gain: x5.172733007436766
	Processing Ratio: 0.6759944099978977
	Time Saved Ratio: 0.4033392987263876
*/
