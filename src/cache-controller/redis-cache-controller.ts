import Redis from "ioredis";
import { delay } from "ts-timeframe";
import { OperationRegistry } from "../race";
import { CacheStats } from "../metrics/types";
import { logHandle, LogLevel } from "../logging";
import { ICacheStorage } from "../storage/storage-interface";
import { CacheStatsManager, CombineStatsManager } from "../metrics";
import {
  BroadcastCacheKeyRequest,
  CollectDataReply,
  CollectDataRequest,
  EvictionKeyRequest,
  ICacheController,
  Operation,
  OperationEndRequest,
  Operations,
  OperationStartRequest,
} from "./controller-interface";

export class RedisCacheController implements ICacheController {
  private streamId: string;
  private pub: Redis;
  private sub: Redis;
  private combinedStats: CombineStatsManager | undefined;
  private storage: ICacheStorage | undefined;
  private closing: boolean;
  private log: logHandle;
  private operationRegistries: Map<string, OperationRegistry>;
  private unlocks: Map<string, Promise<void>>;

  constructor({
    streamId,
    redis,
    check,
    storage,
    log = () => {
      return;
    },
  }: {
    streamId: string;
    redis: Redis;
    check: () => boolean;
    storage?: ICacheStorage;
    log?: logHandle;
  }) {
    this.streamId = streamId;
    this.pub = redis; // make a new independent connection for publisher connection
    this.sub = redis.duplicate(); // make a new independent connection for subscriber connection
    this.storage = storage;
    this.closing = false;
    this.log = log;
    this.operationRegistries = new Map();
    this.unlocks = new Map();

    this.listenForMessage(check);
  }

  async evictCacheKey(key: string): Promise<void> {
    if (this.storage) {
      this.log(LogLevel.Debug, `Evicting key ${key}`);

      // pass instruction for storage removal
      await this.storage.evict(key);
    }
  }

  async storeCacheKey(
    key: string,
    ttlMilliseconds: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    value: any
  ): Promise<void> {
    if (this.storage) {
      this.log(LogLevel.Debug, `Storing key ${key} for ${ttlMilliseconds}ms`);

      // pass instruction for storage
      await this.storage.set(key, ttlMilliseconds, value);
    }
  }

  async sendCacheStats(requester: string): Promise<void> {
    const operations = CacheStatsManager.getOperations();

    this.log(LogLevel.Debug, `Sending cache stats for requester ${requester}`);

    for (const operation of operations) {
      const payload: CollectDataReply = {
        type: Operation.ReplyStats,
        requester,
        data: {
          operation,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          stats: CacheStatsManager.getOperationData(operation)!,
        },
      };

      await this.pub.xadd(this.streamId, "*", "data", JSON.stringify(payload));
    }
  }

  async requestCacheStats(timeoutMs = 3000): Promise<Map<string, CacheStats>> {
    if (this.combinedStats !== undefined) {
      throw new Error("Can't start a new request until previous ends.");
    }

    this.combinedStats = new CombineStatsManager();

    const message: CollectDataRequest = {
      requester: CombineStatsManager.getInstanceKey(),
      type: Operation.CollectStats,
    };

    await this.pub.xadd(this.streamId, "*", "data", JSON.stringify(message));

    // wait for responses to come in
    await delay(timeoutMs);

    // finalize data
    const output = this.combinedStats.finalizeCombinedStats();

    // cleanup for next request
    delete this.combinedStats;

    return output;
  }

  async listenForMessage(repeat: () => boolean): Promise<void> {
    let lastId = "$";

    do {
      try {
        if (!this.closing) {
          const results = await this.sub.xread(
            "BLOCK",
            100,
            "STREAMS",
            this.streamId,
            lastId
          );

          if (results) {
            const [key, messages] = results[0];

            for (const message of messages) {
              const [id, data] = message;

              if (key === this.streamId) {
                await this.processMessage(JSON.parse(data[1]));
              }

              // update stream position
              lastId = id;
            }
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        this.log(LogLevel.Error, `Failed to process message`, e);
      }
    } while (repeat() && !this.closing);

    this.log(LogLevel.Debug, `Ending`);
  }

  async processMessage(message: Operations): Promise<void> {
    switch (message.type) {
      case Operation.CollectStats:
        await this.sendCacheStats(message.requester);
        break;
      case Operation.ReplyStats:
        if (
          message.requester === CombineStatsManager.getInstanceKey() &&
          this.combinedStats
        ) {
          const { operation, stats } = message.data;

          this.log(
            LogLevel.Debug,
            `Received stats message: ${JSON.stringify(message)}`
          );
          this.combinedStats.combineStats(operation, stats);
        }
        break;
      case Operation.EvictKey:
        // we only accept other's eviction calls
        if (message.requester !== CombineStatsManager.getInstanceKey()) {
          this.log(
            LogLevel.Debug,
            `Received eviction request for key: ${message.data.key}`
          );

          await this.evictCacheKey(message.data.key);
        }
        break;
      case Operation.BroadcastKey:
        this.log(
          LogLevel.Debug,
          `Received content for key: ${message.data.key} for ${message.data.ttlMilliseconds}ms`
        );
        await this.storeCacheKey(
          message.data.key,
          message.data.ttlMilliseconds,
          message.data.value
        );
        break;
      case Operation.OperationStart:
        {
          this.log(
            LogLevel.Debug,
            `Operation ${message.data.operation} started for key: ${message.data.key} initiator ${message.requester}`
          );

          const operationRegistry = this.operationRegistries.get(
            message.data.operation
          );

          if (operationRegistry) {
            // if operation registry exists for this operation initialize table to mark operation is ongoing
            operationRegistry.isExecuting(message.data.key);
          }
        }
        break;
      case Operation.OperationEnd:
        {
          this.log(
            LogLevel.Debug,
            `Operation ${message.data.operation} end for key: ${message.data.key} initiator ${message.requester}`
          );

          const operationRegistry = this.operationRegistries.get(
            message.data.operation
          );

          if (operationRegistry) {
            if (message.data.error === false) {
              // resolves all pending promises
              operationRegistry.triggerAwaitingResolves(
                message.data.key,
                message.data.value
              );
            } else {
              // throws all pending promises
              operationRegistry.triggerAwaitingRejects(
                message.data.key,
                message.data.value // TODO deserializeError(message.data.value),
              );
            }
          }

          // get some time for eventloop (and give some time for other instances to process message too)
          await delay(0);

          // if this was the instance that executed then trigger the unlock
          const key = `${message.data.operation}#${message.data.key}`;
          const unlockPromise = this.unlocks.get(key);

          if (unlockPromise) {
            this.log(LogLevel.Debug, `Unlocking key ${key}`);
            this.unlocks.delete(key);
            await unlockPromise;
          }
        }
        break;
    }
  }

  async requestCacheKeyEviction(key: string): Promise<void> {
    const message: EvictionKeyRequest = {
      type: Operation.EvictKey,
      data: { key },
      requester: CombineStatsManager.getInstanceKey(),
    };

    try {
      await this.pub.xadd(this.streamId, "*", "data", JSON.stringify(message));
    } catch (e) {
      this.log(
        LogLevel.Error,
        `Failed to send cache eviction request for key: ${key}`,
        e
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async broadcastCacheKey(
    key: string,
    ttlMilliseconds: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: Awaited<any>
  ): Promise<void> {
    const message: BroadcastCacheKeyRequest = {
      type: Operation.BroadcastKey,
      data: { key, ttlMilliseconds, value },
    };

    try {
      await this.pub.xadd(this.streamId, "*", "data", JSON.stringify(message));
    } catch (e) {
      this.log(
        LogLevel.Error,
        `Failed to send cache broadcast request for key: ${key}`,
        e
      );
    }
  }

  async requestOperationStart(operation: string, key: string): Promise<void> {
    const message: OperationStartRequest = {
      type: Operation.OperationStart,
      data: { operation, key },
      requester: CombineStatsManager.getInstanceKey(),
    };

    try {
      await this.pub.xadd(this.streamId, "*", "data", JSON.stringify(message));
    } catch (e) {
      this.log(
        LogLevel.Error,
        `Failed to send operation start request for operation: ${operation} key: ${key}`,
        e
      );
    }
  }

  async requestOperationEnd(
    operation: string,
    key: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    data: any,
    error: boolean,
    unlock: Promise<void>
  ): Promise<void> {
    // store unlock for operation and key
    this.unlocks.set(`${operation}#${key}`, unlock);

    const message: OperationEndRequest = {
      type: Operation.OperationEnd,
      data: {
        operation,
        key,
        value: data, // TODO error ? serializeError(data) : data,
        error,
      },
      requester: CombineStatsManager.getInstanceKey(),
    };

    try {
      await this.pub.xadd(this.streamId, "*", "data", JSON.stringify(message));
    } catch (e) {
      this.log(
        LogLevel.Error,
        `Failed to send operation end request for operation: ${operation} key: ${key}`,
        e
      );
    }
  }

  async lock(
    key: string,
    lockTtlMs: number
  ): Promise<{ lockResult: boolean; unlockFunction: Promise<void> | null }> {
    const result = await this.pub.incr(key);

    const lockResult = result === 1;
    console.log(key, result, lockResult, lockTtlMs);

    if (lockResult) {
      // set expire ttl
      await this.pub.pexpire(key, lockTtlMs, "NX");

      const before = Date.now() + lockTtlMs;
      const unlockFunction = new Promise<void>((resolve) => {
        if (Date.now() < before) {
          this.pub
            .del(key) // we try to remove lock
            .then(() => resolve())
            .catch(() => resolve()); // we don't care if any error occurs because its close to timeout
        }
      });

      return { lockResult, unlockFunction };
    }

    return { lockResult, unlockFunction: null };
  }

  async unlock(key: string): Promise<void> {
    await this.pub.del(key);
  }

  setRegistry(operation: string, operationRegistry: OperationRegistry): void {
    this.operationRegistries.set(operation, operationRegistry);
  }

  getOperationPromise<T>(
    operation: string,
    key: string
  ): Promise<T> | undefined {
    const operationRegistry = this.operationRegistries.get(operation);

    if (operationRegistry && operationRegistry.existsKey(key)) {
      return operationRegistry.isExecuting<T>(key);
    }
  }

  async close(): Promise<void> {
    this.log(LogLevel.Debug, `Controller is closing`);

    this.closing = true;

    this.pub.disconnect();
    this.sub.disconnect();
  }
}
