import { CacheStats } from "../metrics/types";

export enum Operation {
  CollectStats = "stats",
  ReplyStats = "stats-reply",
  EvictKey = "evict-key",
  BroadcastKey = "set-key",
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

export type EvictionKeyRequest = {
  type: Operation.EvictKey;
  requester: string;
  data: { key: string };
};

export type BroadcastCacheKeyRequest = {
  type: Operation.BroadcastKey;
  data: { key: string; ttlMilliseconds: number; value: string };
};

export type Operations =
  | CollectDataRequest
  | CollectDataReply
  | EvictionKeyRequest
  | BroadcastCacheKeyRequest;

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

  /**
   * Removes a key from cache internally
   * @param key cache key to be removed
   */
  evictCacheKey(key: string): Promise<void>;

  /**
   * Broadcasts a key eviction request
   * @param key cache key to be removed
   */
  requestCacheKeyEviction(key: string): Promise<void>;

  /**
   * Function to broadcast a cache content key to all instances
   * @param key key broadcasted
   * @param ttlMilliseconds cache TTL milliseconds
   * @param cacheContent content to store
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  broadcastCacheKey(
    key: string,
    ttlMilliseconds: number,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cacheContent: Awaited<any>
  ): Promise<void>;

  /**
   * Method to terminate controller
   */
  close(): Promise<void>;
}
