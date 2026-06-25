import Redis from "ioredis";
import { delay } from "ts-timeframe";
import {
  ConcurrencyControl,
  DataOwner,
  GenericManager,
  KeyGenerator,
  RedisCacheController,
  RedisStorage,
} from "../../../src";
import { LogLevel } from "../../../src/logging";

// you can test it using:
// docker run --name redis -p 6379:6379 -d redis
// npx ts-node test/samples/management/redis-distributed-concurrency

// Create Redis instances that we'll need to close later
const storageRedis = new Redis();
const controllerRedis = new Redis();

// our storage is local in memory based on lru-cache package
const storage = new RedisStorage(storageRedis);

let running = true;

// our cache controller mechanism is based on Redis Streams
const controller = new RedisCacheController({
  streamId: "stream",
  redis: controllerRedis,
  // sync it with your application healthcheck this is used to
  // stop listening for messages when application is going down
  check: () => running,
  storage,
  log: (logLevel: LogLevel, message: string, error?: unknown) => {
    console.log(`${logLevel} ${message} ${error || ""}`);
  },
});

// our cache manager broadcasts all evitions or new cache content
// to other instances and does not check for any keys being generated concurrently
const redisManager = new GenericManager(controller, storage, {
  broadcast: false, // no broadcast is needed when using Redis
  concurrency: ConcurrencyControl.Local,
});

// our data fetching function
async function costlyFunction(a: number, b: number): Promise<number> {
  await delay(500);
  console.log(`GENERATED a=${a}, b=${b}`);

  // randomly throw an Exception every 5 calls
  if (Math.random() < 0.2) {
    throw new Error("Random error to simulate failure");
  }

  return a * b;
}

const operation = "costlyFunction";

// let's create a wrapped function
const {
  cacheRetrieval: costlyCachedFunction,
} = redisManager.getWrapperFunctions<
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
    try {
      const result = await Promise.all([
        costlyCachedFunction(key, 3, 5),
        costlyCachedFunction(key, 3, 5),
      ]);

      console.log(`${i} ${result}`);
    } catch (error) {
      console.log(error);
    }

    await delay(100);
  }

  running = false;
  await redisManager.close();

  // Disconnect both Redis instances to ensure clean exit
  storageRedis.disconnect();
  controllerRedis.disconnect();
  console.log("All connections closed");
}

main();
