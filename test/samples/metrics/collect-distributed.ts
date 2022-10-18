import Redis from "ioredis";
import {
  CacheStatsManager,
  RedisCacheController,
  CacheStats,
} from "../../../src";

const redisController = new RedisCacheController({
  streamId: "reliable-caching",
  redis: new Redis(),
  check: () => true, // termination function, you can check if your instance is shutting down in this function
});

// this is only needed to generated some data
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
  generateRandomCacheData(); // only needed for demo

  const combinedStats = await redisController.requestCacheStats();

  combinedStats.forEach((_value: CacheStats, key: string) => {
    console.log(CacheStatsManager.operationStatsString(key, combinedStats));
  });
}, 5000); // you should not run this too frequently because all instances may do this, run it once per minute or so

// you may need to run a redis server: docker run --name collect-metrics-redis -p 6379:6379 -d redis

// outputs:
/*
Operation operation1 Cache Metrics:
	Hit Ratio:        0.7258064516129032
	Performance Gain: x23.031392063368585
	Time-saved Ratio: 0.6942926616684693
Operation operation2 Cache Metrics:
	Hit Ratio:        0.6415094339622641
	Performance Gain: x28.022145511955095
	Time-saved Ratio: 0.6186164890345256
Operation operation3 Cache Metrics:
	Hit Ratio:        0.5675675675675675
	Performance Gain: x34.91330751543888
	Time-saved Ratio: 0.5513110852129072
  */
