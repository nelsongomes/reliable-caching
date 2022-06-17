import { CacheStats } from "../metrics/types";

export enum Operation {
  CollectStats = "stats",
  ReplyStats = "stats-reply",
}

export type CollectDataRequest = {
  type: Operation.CollectStats;
  requester: string;
};

export type CollectDataReply = {
  type: Operation.ReplyStats;
  requester: string;
  data: { operation: string; stats: CacheStats };
};

export type Operations = CollectDataRequest | CollectDataReply;

export interface ICacheController {
  /**
   * Send cache statistics to requester
   * @param requester Requester ID
   */
  sendCacheStats(requester: string): Promise<void>;

  /**
   * Requests all cache instances for their data.
   */
  requestCacheStats(): Promise<Map<string, CacheStats>>;
}
