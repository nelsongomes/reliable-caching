import Redis from "ioredis";
import {
  BroadcastCacheKeyRequest,
  CacheStatsManager,
  CollectDataReply,
  CollectDataRequest,
  CombineStatsManager,
  EvictionKeyRequest,
  LruInMemoryStorage,
  Operation,
  OperationEndRequest,
  OperationRegistry,
  OperationStartRequest,
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

    new RedisCacheController({ streamId: "stream", redis, check: () => false });

    // we duplicate redis instance to have one connection reading messages and another publishing
    expect(redis.duplicate).toBeCalled();
    // and put it listening for messages
    expect(redis.xread).toBeCalled();
  });

  it("Should throw an error because there is a request already ongoing (local)", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });

    const cacheController = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
    });

    // storing promise, putting it running in bg
    const requestPromise = cacheController.requestCacheStats(1); // no await on purpose, for not blocking

    await expect(async () => {
      // we do second request to trigger error
      return cacheController.requestCacheStats(0);
    }).rejects.toThrowErrorMatchingSnapshot();

    // finish promise for no open handles
    await requestPromise;
  });

  it("Should call for other instances data (local)", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });

    const cacheController = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
    });

    const second = await cacheController.requestCacheStats(0);

    expect(second).toStrictEqual(new Map());
    expect(redis.xadd).toBeCalledTimes(1);
  });

  it("Should send all data (remote)", async () => {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    // generate some data
    CacheStatsManager.miss("operation1", 10);
    CacheStatsManager.miss("operation2", 10);

    const cacheController = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
    });

    await cacheController.listenForMessage(() => false);

    // it calls 4 times because constructor already calls listenForMessage
    expect(redis.xadd).toBeCalledTimes(4);
  });

  it("Should receive data if ID matches (remote)", async () => {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    const cacheController = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
    });

    // this initializes combine manager
    await cacheController.requestCacheStats(3000);

    await cacheController.listenForMessage(() => false);

    // it calls 2 times because constructor already calls listenForMessage
    expect(redis.xread).toBeCalledTimes(2);
  });

  it("Should receive and drop a key on request, but not call storage because storage is not defined (remote)", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.xread = jest.fn(() => {
      const request: EvictionKeyRequest = {
        type: Operation.EvictKey,
        data: {
          key: "dropme",
        },
        requester: CombineStatsManager.getInstanceKey(),
      };

      return [["stream", [["id", ["?", JSON.stringify(request)]]]]];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    const cacheController = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
    });

    await cacheController.listenForMessage(() => false);

    // it calls 2 times because constructor already calls listenForMessage
    expect(redis.xread).toBeCalledTimes(2);
  });

  it("Should receive and drop a key on request, but call storage eviction (remote)", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.xread = jest.fn(() => {
      const request: EvictionKeyRequest = {
        type: Operation.EvictKey,
        data: {
          key: "dropme",
        },
        requester: "12345", // must be different from current instance id
      };

      return [["stream", [["id", ["?", JSON.stringify(request)]]]]];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    const storage = new LruInMemoryStorage({ max: 50 });
    const cacheController = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
      storage,
    });

    await cacheController.listenForMessage(() => false);

    // it calls 2 times because constructor already calls listenForMessage
    expect(redis.xread).toBeCalledTimes(2);
  });

  it("Should send cache key storage request (local)", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });

    const cacheController = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
    });

    await cacheController.broadcastCacheKey("evictme", 100, { value: 123 });

    expect(redis.xadd).toBeCalledWith(
      "stream",
      "*",
      "data",
      '{"type":"set-key","data":{"key":"evictme","ttlMilliseconds":100,"value":{"value":123}}}'
    );
  });

  it("Should fail gracefully if broadcast key fails (local)", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.xadd = jest.fn(async () => {
      throw new Error("fail");
    });

    const cacheController = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
    });

    await cacheController.broadcastCacheKey("evictme", 100, { value: 123 });

    expect(redis.xadd).toBeCalledWith(
      "stream",
      "*",
      "data",
      '{"type":"set-key","data":{"key":"evictme","ttlMilliseconds":100,"value":{"value":123}}}'
    );
  });

  it("Should receive cache key storage request, but not call storage because storage is not defined (remote)", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.xread = jest.fn(() => {
      const request: BroadcastCacheKeyRequest = {
        type: Operation.BroadcastKey,
        data: {
          key: "storeme",
          ttlMilliseconds: 100,
          value: "value",
        },
      };

      return [["stream", [["id", ["?", JSON.stringify(request)]]]]];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    const storage = new LruInMemoryStorage({ max: 50 });
    const cacheController = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
      storage,
    });

    await cacheController.listenForMessage(() => false);

    // it calls 2 times because constructor already calls listenForMessage
    expect(redis.xread).toBeCalledTimes(2);
  });

  it("Should receive request start message request, for distributed race prevention and do nothing because operation was not declared yet (remote)", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.xread = jest.fn(() => {
      const request: OperationStartRequest = {
        type: Operation.OperationStart,
        requester: "requester",
        data: {
          key: "storeme",
          operation: "operation",
        },
      };

      return [["stream", [["id", ["?", JSON.stringify(request)]]]]];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    const storage = new LruInMemoryStorage({ max: 50 });
    const cacheController = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
      storage,
    });

    await cacheController.listenForMessage(() => false);

    // it calls 2 times because constructor already calls listenForMessage
    expect(redis.xread).toBeCalledTimes(2);
  });

  it("Should receive request start message request, for distributed race prevention and init operation registry (remote)", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.xread = jest.fn(() => {
      const request: OperationStartRequest = {
        type: Operation.OperationStart,
        requester: "requester",
        data: {
          key: "storeme",
          operation: "operation",
        },
      };

      return [["stream", [["id", ["?", JSON.stringify(request)]]]]];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    const storage = new LruInMemoryStorage({ max: 50 });
    const cacheController = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
      storage,
    });

    const operationRegistry = new OperationRegistry("operation");
    cacheController.setRegistry("operation", operationRegistry);

    await cacheController.listenForMessage(() => false);

    // it calls 2 times because constructor already calls listenForMessage
    expect(redis.xread).toBeCalledTimes(2);
    expect(operationRegistry.existsKey("storeme")).toBe(true);
  });

  it("Should receive request end message request, for distributed race prevention and do nothing because start operation was not received (remote)", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.xread = jest.fn(() => {
      const request: OperationEndRequest = {
        type: Operation.OperationEnd,
        requester: "requester",
        data: {
          key: "storeme",
          operation: "operation",
          error: false,
          value: JSON.stringify({}),
        },
      };

      return [["stream", [["id", ["?", JSON.stringify(request)]]]]];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    const storage = new LruInMemoryStorage({ max: 50 });
    const cacheController = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
      storage,
    });

    await cacheController.listenForMessage(() => false);

    // it calls 2 times because constructor already calls listenForMessage
    expect(redis.xread).toBeCalledTimes(2);
  });

  it("Should receive request end message request, for distributed race prevention, call pending promises and unlock operation (remote)", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.xread = jest.fn(() => {
      const request: OperationEndRequest = {
        type: Operation.OperationEnd,
        requester: "requester",
        data: {
          key: "storeme",
          operation: "operation",
          error: false,
          value: JSON.stringify({}),
        },
      };

      return [["stream", [["id", ["?", JSON.stringify(request)]]]]];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    const storage = new LruInMemoryStorage({ max: 50 });
    const cacheController = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
      storage,
    });
    const unlockCalling = jest.fn() as any;

    // create an artificial lock (this instance is executing the operation)
    await cacheController.requestOperationEnd(
      "operation",
      "storeme",
      {},
      false,
      unlockCalling
    );

    const operationRegistry = new OperationRegistry("operation");
    cacheController.setRegistry("operation", operationRegistry);

    await cacheController.listenForMessage(() => false);

    // it calls 2 times because constructor already calls listenForMessage
    expect(redis.xread).toBeCalledTimes(2);
    expect(redis.xadd).toBeCalledTimes(1); // lock
  });

  it("Should receive request end message request, for distributed race prevention, call pending rejects and unlock operation (remote)", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.xread = jest.fn(() => {
      const request: OperationEndRequest = {
        type: Operation.OperationEnd,
        requester: "requester",
        data: {
          key: "storeme",
          operation: "operation",
          error: true,
          value: JSON.stringify({}),
        },
      };

      return [["stream", [["id", ["?", JSON.stringify(request)]]]]];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    const storage = new LruInMemoryStorage({ max: 50 });
    const cacheController = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
      storage,
    });

    const operationRegistry = new OperationRegistry("operation");
    cacheController.setRegistry("operation", operationRegistry);

    await cacheController.listenForMessage(() => false);

    // it calls 2 times because constructor already calls listenForMessage
    expect(redis.xread).toBeCalledTimes(2);
  });

  it("Should request remote cache key eviction (local)", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });

    const cacheController = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
    });

    await cacheController.requestCacheKeyEviction("evictme");

    expect(redis.xadd).toBeCalledWith(
      "stream",
      "*",
      "data",
      expect.stringMatching(
        '{"type":"evict-key","data":{"key":"evictme"},"requester":"[a-f0-9-]+"}'
      )
    );
  });

  it("Should fail gracefully if eviction request fails (local)", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.xadd = jest.fn(async () => {
      throw new Error("fail");
    });

    const cacheController = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
    });

    await cacheController.requestCacheKeyEviction("evictme");

    expect(redis.xadd).toBeCalledWith(
      "stream",
      "*",
      "data",
      expect.stringMatching(
        '{"type":"evict-key","data":{"key":"evictme"},"requester":"[a-f0-9-]+"}'
      )
    );
  });

  it("Should call redis on close (local)", async () => {
    const redis = new Redis();
    redis.duplicate = jest.fn(() => {
      return redis;
    });
    redis.disconnect = jest.fn();

    const cacheController = new RedisCacheController({
      streamId: "stream",
      redis,
      check: () => false,
    });

    await cacheController.close();

    expect(redis.disconnect).toBeCalledTimes(2);
  });
});
