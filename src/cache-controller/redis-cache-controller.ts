import Redis from "ioredis";
import { delay } from "ts-timeframe";
import { CacheStatsManager, CombineStatsManager } from "../metrics";
import { CacheStats } from "../metrics/types";
import {
  CollectDataReply,
  CollectDataRequest,
  ICacheController,
  Operation,
  Operations,
} from "./controller-interface";

export class RedisCacheController implements ICacheController {
  private streamId;
  private pub;
  private sub;
  private combinedStats: CombineStatsManager | undefined;

  /**
   *
   * @param streamId Redis stream name
   * @param redis A Redis instance, properly configured for your infrastructure
   * @param check A function that returns true while instance is running
   */
  constructor(streamId: string, redis: Redis, check: () => boolean) {
    this.streamId = streamId;
    this.pub = redis;
    this.sub = redis.duplicate(); // make a new independent connection for subscriber connection

    this.listenForMessage(check);
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

    this.pub.xadd(this.streamId, "*", "data", JSON.stringify(message));

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
    } while (repeat());
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
    }
  }
}
