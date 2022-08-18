import Redis from "ioredis";
import { delay } from "ts-timeframe";
import {
  LruInMemoryStorage,
  RedisCacheController,
  GenericManager,
  ConcurrencyControl,
} from "../../../src";

// our data fetching function
async function costlyFunction(a: number, b: number): Promise<number> {
  await delay(500);

  return a * b;
}

describe("InMemoryManager", () => {
  it("Should create an in memory manager, with storage in memory and managed by Redis, and return wrapper functions", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });

    const storage = new LruInMemoryStorage({ max: 50 });
    const controller = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
      storage,
    });

    const inMemoryManager = new GenericManager(controller, storage);
    const operation = "costlyFunction";

    // let's create a wrapped function
    const { cacheRetrieval, cacheEvict } = inMemoryManager.getWrapperFunctions<
      Parameters<typeof costlyFunction>,
      ReturnType<typeof costlyFunction>
    >(operation, 500, costlyFunction);

    expect(inMemoryManager).not.toBeNull();
    expect(typeof cacheRetrieval).toBe("function");
    expect(typeof cacheEvict).toBe("function");

    inMemoryManager.close();
  });

  it("Should check if content is in cache and return it", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });

    const storage = new LruInMemoryStorage({ max: 50 });
    storage.set("123", 120000, 5);

    const controller = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
      storage,
    });

    const inMemoryManager = new GenericManager(controller, storage);

    const operation = "costlyFunction";

    // let's create a wrapped function
    const { cacheRetrieval } = inMemoryManager.getWrapperFunctions<
      Parameters<typeof costlyFunction>,
      ReturnType<typeof costlyFunction>
    >(operation, 500, costlyFunction);

    const result = await cacheRetrieval("123", 1, 2);

    expect(result).toBe(5);
    inMemoryManager.close();
  });

  it("Should generate a miss and generate new cache content and return it, with local concurrency", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.xadd = jest.fn();

    const storage = new LruInMemoryStorage({ max: 50 });

    const controller = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
      storage,
    });

    const inMemoryManager = new GenericManager(controller, storage, {
      concurrency: ConcurrencyControl.Local,
    });

    const operation = "costlyFunction";

    // let's create a wrapped function
    const { cacheRetrieval } = inMemoryManager.getWrapperFunctions<
      Parameters<typeof costlyFunction>,
      ReturnType<typeof costlyFunction>
    >(operation, 500, costlyFunction);

    const result = await Promise.all([
      cacheRetrieval("123", 1, 2),
      cacheRetrieval("123", 1, 2),
    ]);

    expect(result).toStrictEqual([2, 2]);
    expect(redis.xadd).toBeCalledTimes(1);
    inMemoryManager.close();
  });

  it("Should generate a miss and throw exception to all threads if content generation fails, with local concurrency", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });

    const storage = new LruInMemoryStorage({ max: 50 });

    const controller = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
      storage,
    });

    const inMemoryManager = new GenericManager(controller, storage, {
      concurrency: ConcurrencyControl.Local,
    });

    const operation = "costlyFunction";

    // let's create a wrapped function
    const { cacheRetrieval } = inMemoryManager.getWrapperFunctions<
      Parameters<typeof costlyFunction>,
      ReturnType<typeof costlyFunction>
    >(operation, 500, async () => {
      delay(100);
      throw new Error("fail");
    });

    await expect(async () => {
      await Promise.all([
        cacheRetrieval("123", 1, 2),
        cacheRetrieval("123", 1, 2),
      ]);
    }).rejects.toThrowError("fail");

    // this gives time for eventloop to run and process setImmediate rejection in our test
    await delay(0);

    inMemoryManager.close();
  });

  it("Should create an in memory manager, and call eviction", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.xadd = jest.fn();

    const storage = new LruInMemoryStorage({ max: 50 });
    const controller = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
      storage,
    });

    const inMemoryManager = new GenericManager(controller, storage);
    const operation = "costlyFunction";

    // let's create a wrapped function
    const { cacheEvict } = inMemoryManager.getWrapperFunctions<
      Parameters<typeof costlyFunction>,
      ReturnType<typeof costlyFunction>
    >(operation, 500, costlyFunction);

    await cacheEvict("123");

    expect(redis.xadd).toHaveBeenCalledTimes(1);

    inMemoryManager.close();
  });
});
