import Redis from "ioredis";
import { delay } from "ts-timeframe";
import { CacheStatsManager, CombineStatsManager } from "../metrics";
import { CacheStats } from "../metrics/types";
import { ICacheStorage } from "../storage/storage-interface";
import {
  BroadcastCacheKeyRequest,
  CollectDataReply,
  CollectDataRequest,
  EvictionKeyRequest,
  ICacheController,
  Operation,
  Operations,
} from "./controller-interface";

export class RedisCacheController implements ICacheController {
  private streamId;
  private pub;
  private sub;
  private combinedStats: CombineStatsManager | undefined;
  private storage: ICacheStorage | undefined;
  private closing: boolean;

  constructor({
    streamId,
    redis,
    check,
    storage,
  }: {
    streamId: string;
    redis: Redis;
    check: () => boolean;
    storage?: ICacheStorage;
  }) {
    this.streamId = streamId;
    this.pub = redis;
    this.sub = redis.duplicate(); // make a new independent connection for subscriber connection
    this.storage = storage;
    this.closing = false;

    this.listenForMessage(check);
  }

  async evictCacheKey(key: string): Promise<void> {
    if (this.storage) {
      // pass instruction for storage removal
      await this.storage.evict(key);
    }
  }

  async storeCacheKey(
    key: string,
    ttlMilliseconds: number,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    value: any
  ): Promise<void> {
    if (this.storage) {
      // pass instruction for storage
      await this.storage.set(key, ttlMilliseconds, value);
    }
  }

  async sendCacheStats(requester: string): Promise<void> {
    const operations = CacheStatsManager.getOperations();

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
    // console.log("Instance %s requested all cache stats", requester);
  }

  async requestCacheStats(
    timeoutSeconds = 3
  ): Promise<Map<string, CacheStats>> {
    if (this.combinedStats !== undefined) {
      throw new Error("Can't start a new request until previous ends.");
    }

    this.combinedStats = new CombineStatsManager();

    const message: CollectDataRequest = {
      requester: CombineStatsManager.getInstanceKey(),
      type: Operation.CollectStats,
    };

    await this.pub.xadd(this.streamId, "*", "data", JSON.stringify(message));

    // wait for responses to come
    await delay(timeoutSeconds * 1000);

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
        const results = await this.sub.xread(
          "BLOCK",
          0,
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
      } catch (e) {
        await delay(200);
        // console.log(e)
      }
    } while (repeat() && !this.closing);
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

          this.combinedStats.combineStats(operation, stats);
          // console.log("  --> Received %s", JSON.stringify(message));
        }
        break;
      case Operation.EvictKey:
        // we only accept other's eviction calls
        if (message.requester !== CombineStatsManager.getInstanceKey()) {
          await this.evictCacheKey(message.data.key);
        }
        break;
      case Operation.BroadcastKey:
        await this.storeCacheKey(
          message.data.key,
          message.data.ttlMilliseconds,
          message.data.value
        );
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
      // TODO
      console.log(e);
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
      // TODO
      console.log(e);
    }
  }

  async close(): Promise<void> {
    this.closing = true;
    this.pub.disconnect();
    this.sub.disconnect();
  }
}
