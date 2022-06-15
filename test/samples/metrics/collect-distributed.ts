import Redis from "ioredis";
import { CacheStatsManager, RedisCacheController } from "../../../src";
import { CacheStats } from "../../../src/metrics/types";

const redisController = new RedisCacheController(
  "reliable-caching",
  new Redis()
);

function generateRandomCacheData() {
  const operations = ["operation1", "operation2", "operation3"];
  const operation = operations[Math.floor(Math.random() * 3)];

  if (operation) {
    if (Math.random() < 0.3) {
      CacheStatsManager.miss(operation, Math.random() * 200);
    } else {
      CacheStatsManager.hit(operation, Math.random() * 10);
    }
  }
}

setInterval(async () => {
  generateRandomCacheData();

  const combinedStats = await redisController.requestCacheStats();

  combinedStats.forEach((_value: CacheStats, key: string) => {
    console.log(CacheStatsManager.operationStatsString(key, combinedStats));
  });
}, 5000); // you should not run this too frequently because all instances may do this, run it once per minute or so

// docker run --name collect-metrics-redis -p 6379:6379 -d redis
