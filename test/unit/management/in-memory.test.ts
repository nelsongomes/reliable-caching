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

  it("Should generate a miss and generate new cache content and return it, with local concurrency control", async () => {
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

  it("Should generate a miss and generate new cache content and return it, with no concurrency control", async () => {
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
      concurrency: ConcurrencyControl.None,
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
    expect(redis.xadd).toBeCalledTimes(2); // all calls are made
    inMemoryManager.close();
  });

  it("Should generate a miss and throw exception to all threads if content generation fails, with local concurrency control", async () => {
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

  it("Should generate a miss and throw exception to all threads if content generation fails, with no concurrency control", async () => {
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
      concurrency: ConcurrencyControl.None,
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

  it("Should handle storage.get errors gracefully in noConcurrencyFlow", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.xadd = jest.fn();

    const storage = new LruInMemoryStorage({ max: 50 });
    storage.get = jest.fn(() => {
      throw new Error("Storage error");
    });

    const controller = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
      storage,
    });

    const inMemoryManager = new GenericManager(controller, storage, {
      concurrency: ConcurrencyControl.None,
    });

    const operation = "costlyFunction";

    const { cacheRetrieval } = inMemoryManager.getWrapperFunctions<
      Parameters<typeof costlyFunction>,
      ReturnType<typeof costlyFunction>
    >(operation, 500, costlyFunction);

    // Should still work despite storage.get error
    const result = await cacheRetrieval("127", 3, 4);
    expect(result).toBe(12);

    inMemoryManager.close();
  });

  it("Should handle storage.get errors gracefully in localConcurrencyFlow", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.xadd = jest.fn();

    const storage = new LruInMemoryStorage({ max: 50 });
    storage.get = jest.fn(() => {
      throw new Error("Storage error");
    });

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

    const { cacheRetrieval } = inMemoryManager.getWrapperFunctions<
      Parameters<typeof costlyFunction>,
      ReturnType<typeof costlyFunction>
    >(operation, 500, costlyFunction);

    // Should still work despite storage.get error
    const result = await cacheRetrieval("128", 3, 5);
    expect(result).toBe(15);

    inMemoryManager.close();
  });

  it("Should handle storage.set errors gracefully and continue", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.xadd = jest.fn();

    const storage = new LruInMemoryStorage({ max: 50 });
    storage.set = jest.fn(() => {
      throw new Error("Storage set error");
    });

    const controller = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
      storage,
    });

    let logCalled = false;
    const inMemoryManager = new GenericManager(controller, storage, {
      concurrency: ConcurrencyControl.None,
      log: () => {
        logCalled = true;
      },
    });

    const operation = "costlyFunction";

    const { cacheRetrieval } = inMemoryManager.getWrapperFunctions<
      Parameters<typeof costlyFunction>,
      ReturnType<typeof costlyFunction>
    >(operation, 500, costlyFunction);

    // Should return value even if storage.set fails
    const result = await cacheRetrieval("130", 5, 6);
    expect(result).toBe(30);
    expect(logCalled).toBe(true);

    inMemoryManager.close();
  });

  it("Should handle broadcast errors gracefully", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.xadd = jest.fn(() => {
      throw new Error("Broadcast error");
    });

    const storage = new LruInMemoryStorage({ max: 50 });

    const controller = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
      storage,
    });

    let logCalled = false;
    const inMemoryManager = new GenericManager(controller, storage, {
      concurrency: ConcurrencyControl.None,
      broadcast: true,
      log: () => {
        logCalled = true;
      },
    });

    const operation = "costlyFunction";

    const { cacheRetrieval } = inMemoryManager.getWrapperFunctions<
      Parameters<typeof costlyFunction>,
      ReturnType<typeof costlyFunction>
    >(operation, 500, costlyFunction);

    // Should return value even if broadcast fails
    const result = await cacheRetrieval("131", 6, 7);
    expect(result).toBe(42);
    expect(logCalled).toBe(true);

    inMemoryManager.close();
  });

  it("Should not broadcast when broadcast option is false", async () => {
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
      concurrency: ConcurrencyControl.None,
      broadcast: false,
    });

    const operation = "costlyFunction";

    const { cacheRetrieval } = inMemoryManager.getWrapperFunctions<
      Parameters<typeof costlyFunction>,
      ReturnType<typeof costlyFunction>
    >(operation, 500, costlyFunction);

    const result = await cacheRetrieval("132", 7, 8);
    expect(result).toBe(56);
    expect(redis.xadd).not.toHaveBeenCalled();

    inMemoryManager.close();
  });
});
