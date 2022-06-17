import Redis from "ioredis";
import {
  CacheStatsManager,
  CollectDataReply,
  CollectDataRequest,
  CombineStatsManager,
  Operation,
  RedisCacheController,
} from "../../../src";

jest.mock("ioredis");

describe("RedisCacheController", () => {
  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Redis as any).mockClear();
  });

  it("Should duplicate redis instance and start listening for messages", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });

    new RedisCacheController("stream", redis, () => false);

    // we duplicate redis instance to have one connection reading messages and another publishing
    expect(redis.duplicate).toBeCalled();
    // and put it listening for messages
    expect(redis.xread).toBeCalled();
  });

  it("Should throw an error because there is a request already ongoing", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });

    const cacheController = new RedisCacheController(
      "stream",
      redis,
      () => false
    );

    // storing promise, putting it running in bg
    const requestPromise = cacheController.requestCacheStats(1); // no await on purpose, for not blocking

    await expect(async () => {
      // we do second request to trigger error
      return cacheController.requestCacheStats(0);
    }).rejects.toThrowErrorMatchingSnapshot();

    // finish promise for no open handles
    await requestPromise;
  });

  it("Should call for other instances data", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });

    const cacheController = new RedisCacheController(
      "stream",
      redis,
      () => false
    );

    const second = await cacheController.requestCacheStats(0);

    expect(second).toStrictEqual(new Map());
    expect(redis.xadd).toBeCalledTimes(1);
  });

  it("Should send all data", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.xread = jest.fn(() => {
      const request: CollectDataRequest = {
        requester: "123",
        type: Operation.CollectStats,
      };

      return [["stream", [["id", ["?", JSON.stringify(request)]]]]];
    }) as any;

    // generate some data
    CacheStatsManager.miss("operation1", 10);
    CacheStatsManager.miss("operation2", 10);

    const cacheController = new RedisCacheController(
      "stream",
      redis,
      () => false
    );

    await cacheController.listenForMessage(() => false);

    // it calls 4 times because constructor already calls listenForMessage
    expect(redis.xadd).toBeCalledTimes(4);
  });

  it("Should receive data if ID matches", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.xread = jest.fn(() => {
      const request: CollectDataReply = {
        requester: CombineStatsManager.getInstanceKey(),
        type: Operation.ReplyStats,
        data: {
          operation: "test",
          stats: {
            averageHitTime: 10,
            averageMissTime: 10,
            hits: 1,
            misses: 1,
          },
        },
      };

      return [["stream", [["id", ["?", JSON.stringify(request)]]]]];
    }) as any;

    const cacheController = new RedisCacheController(
      "stream",
      redis,
      () => false
    );

    // this initializes combine manager
    await cacheController.requestCacheStats();

    await cacheController.listenForMessage(() => false);

    // it calls 2 times because constructor already calls listenForMessage
    expect(redis.xread).toBeCalledTimes(2);
  });
});
