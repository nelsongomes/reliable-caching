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
import { LogLevel } from "../../../src/logging";

// our storage is local in memory based on lru-cache package
const storage = new LruInMemoryStorage({ max: 50 });

// our cache controller mechanism is based on Redis Streams
const controller = new RedisCacheController({
  streamId: "stream",
  redis: new Redis(),
  check: () => true, // sync it with your application healthcheck
  storage,
  log: (logLevel: LogLevel, message: string, error?: unknown) => {
    console.log(`${logLevel} ${message} ${error || ""}`);
  },
});

// our cache manager does not broadcast any evitions or new cache content
// to other instances and does not check for any keys being generated concurrently
const inMemoryManager = new GenericManager(controller, storage, {
  broadcast: false,
  concurrency: ConcurrencyControl.Distributed,
  log: (logLevel: LogLevel, message: string, error?: unknown) => {
    console.log(`${logLevel} ${message} ${error || ""}`);
  },
});

// our data fetching function
async function costlyFunction(a: number, b: number): Promise<number> {
  await delay(500);
  console.log(`GENERATED a=${a}, b=${b}`);

  return a * b;
}

const operation = "costlyFunction";

// let's create a wrapped function
const {
  cacheRetrieval: costlyCachedFunction,
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

  for (let i = 0; i < 100; i++) {
    const result = await Promise.all([
      costlyCachedFunction(key, 3, 5),
      costlyCachedFunction(key, 3, 5),
    ]);

    console.log(`${i} ${result}`);

    await delay(100);
  }

  await inMemoryManager.close();
}

main();
