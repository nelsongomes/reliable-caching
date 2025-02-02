# Cache Benchmarking (distributed)

The main cache benchmark used in caching usually is hit ratio, calculated by diving cache hits by total (hits and misses) that overall is good a simplistic metric, but doesn't provide real information about cache real effectiveness.

This example is focused on collecting data from all instances, and data provided is from last 9999 operations for metric stability of each instance. In distributed systems having good metrics is very important because sometimes distributed system behave differently than expected.

So we are using an implementation of RedisCacheController which uses Redis Streams to request and collect data from all instances.

## Table of Contents

<!-- prettier-ignore-start -->

- [Declaring hits and misses](#declaring-hits-and-misses)
- [Obtaining data from all instances](#obtaining-data-from-all-instances)
- [Metrics explained](#metrics-explained)

<!-- prettier-ignore-end -->

## Metrics explained

We provide 3 metrics:

**Hit Ratio** which declares a ratio obtained by diving hits/(hits+misses) and indicates which percentage of times a cache content was found. But it doesn't provide any information if the code was actually faster and how much or much time did we save with a cache.

**Performance Gain** which gives you a ratio of (avg miss time)/(avg hit time) indicates how much faster your application is due to to cache use.

**Time Saved Ratio** which indicates how much time have your code actually saved (avg time saved)/(avg miss time), because even if you have a 99.9% hit ratio on cache, that does mean your code is faster, it means content was found plenty of times in cache.

Read more about it here: [Drop hit ratio as cache measure, now!](https://medium.com/pipedrive-engineering/drop-hit-ratio-as-cache-measure-now-98970238dbbf).

## Declaring hits and misses

In these examples we use 'now' function from ts-timeframe package because it generates more precise measurements based on process.hrtime and getDeltaMilliseconds which gives floating point millisecond accuracy.

Notice we measure time spent with hits and misses, because even a hit spends time looking for a key and a miss takes time checking if a hit is possible, retrieving data and storing it, all these small steps consume time.

```ts
import { getDeltaMilliseconds, now } from "ts-timeframe";

const operation = "get-customer";
const start = now();

const hit = await retrieveFromCache(key); // our cache retrieve function

if (hit) {
  CacheStatsManager.hit(operation, getDeltaMilliseconds(start, now()));

  return hit;
}

// fetch something and store it, which consumes time
const content = await readContent();

await storeIntoCache(key, content);

CacheStatsManager.miss(operation, getDeltaMilliseconds(start, now()));
```

## Obtaining data from all instances

If we just want to output data to console we can do:

```ts
// for this example we are using redis streams to communicate with other instances and collect all metric data
const redisController = new RedisCacheController({
  streamId: "reliable-caching",
  redis: new Redis(),
  // a boolean function that returns true if your instance is shutting down, basically a function to know when
  // to disconnect Redis
  check: () => false,
});

// you should not run this too frequently, which generates a broadcast of messages
const combinedStats = await redisController.requestCacheStats();

combinedStats.forEach((_value: CacheStats, operation: string) => {
  console.log(CacheStatsManager.operationStatsString(operation, combinedStats));
  // if you prefer to obtain a specific metric
  // CacheStatsManager.getOperationStats(operation, combinedStats);

  /* which returns an object:
  {
    hitRatio: 0.5,
    performanceGain: 5.172733007436766,
    timeSavedRatio: 0.4033392987263876,
    operation: 'get-customer'
  }
  */
});
```

### Visit the [GitHub Repo](https://github.com/nelsongomes/reliable-caching/) tutorials, documentation, and support
