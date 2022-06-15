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
  sendCacheStats(requester: string): Promise<void>;
  requestCacheStats(): Promise<Map<string, CacheStats>>;
}
