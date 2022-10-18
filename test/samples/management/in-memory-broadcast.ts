import Redis from "ioredis";
import { delay } from "ts-timeframe";
import {
  ConcurrencyControl,
  DataOwner,
  GenericManager,
  KeyGenerator,
  LruInMemoryStorage,
  RedisCacheController,
} from "../../../src";

// our storage is local in memory based on lru-cache package
const storage = new LruInMemoryStorage({ max: 50 });

// our cache controller mechanism is based on Redis Streams
const controller = new RedisCacheController({
  streamId: "stream",
  redis: new Redis(),
  check: () => true, // sync it with your application healthcheck
  storage,
});

// our cache manager does not broadcast any evitions or new cache content
// to other instances and does not check for any keys being generated concurrently
const inMemoryManager = new GenericManager(controller, storage, {
  broadcast: true,
  concurrency: ConcurrencyControl.Local,
});

// our data fetching function
async function costlyFunction(a: number, b: number): Promise<number> {
  await delay(200);
  console.log("generated");

  return a * b;
}

const operation = "costlyFunction";

// let's create a wrapped function
const {
  cacheRetrieval: costlyCachedFunction,
  cacheEvict: costlyCacheEviction,
} = inMemoryManager.getWrapperFunctions<
  Parameters<typeof costlyFunction>,
  ReturnType<typeof costlyFunction>
>(operation, 500, costlyFunction);

const createCostlyFunctionKey = KeyGenerator.keyFactory<{
  a: number;
  b: number;
}>({
  operation,
  dataOwner: DataOwner.PublicData,
});

async function main() {
  const key = createCostlyFunctionKey({ a: 3, b: 5 });

  for (let i = 0; i < 50; i++) {
    console.log(
      await Promise.all([
        costlyCachedFunction(key, 3, 5),
        costlyCachedFunction(key, 3, 5),
        costlyCachedFunction(key, 3, 5),
      ])
    );

    await delay(100 + Math.random() * 400);

    if (Math.random() >= 0.9) {
      await costlyCacheEviction(key);
    }
  }

  await inMemoryManager.close();
}

main();
