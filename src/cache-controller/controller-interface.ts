import { OperationRegistry } from "../race";
import { CacheStats } from "../metrics/types";

export enum Operation {
  CollectStats = "stats",
  ReplyStats = "stats-reply",
  EvictKey = "evict-key",
  BroadcastKey = "set-key",
  OperationStart = "operation-start",
  OperationEnd = "operation-end",
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

export type OperationStartRequest = {
  type: Operation.OperationStart;
  requester: string;
  data: { operation: string; key: string };
};

export type OperationEndRequest = {
  type: Operation.OperationEnd;
  requester: string;
  data: { operation: string; key: string; value: string; error: boolean };
};

export type BroadcastCacheKeyRequest = {
  type: Operation.BroadcastKey;
  data: { key: string; ttlMilliseconds: number; value: string };
};

export type Operations =
  | CollectDataRequest
  | CollectDataReply
  | EvictionKeyRequest
  | BroadcastCacheKeyRequest
  | OperationStartRequest
  | OperationEndRequest;

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

  /**
   * Method that locks a key
   * @param key ID of the key being locked
   * @param lockTtlMs Ttl of the lock
   *
   * Returns function to unlock key
   */
  lock(
    key: string,
    lockTtlMs: number
  ): Promise<{ lockResult: boolean; unlockFunction: Promise<void> | null }>;

  /**
   * this sets operation registry to be used by an operation
   * @param operation
   * @param operationRegistry
   */
  setRegistry(operation: string, operationRegistry: OperationRegistry): void;

  /**
   * Notifies all instances that operation with a given key is being executed
   * @param operation
   * @param key
   */
  requestOperationStart(operation: string, key: string): Promise<void>;

  /**
   * Notifies all instances that operation with a given key has finished
   * @param operation
   * @param key
   * @param value
   * @param error
   */
  requestOperationEnd(
    operation: string,
    key: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any,
    error: boolean,
    unlock: Promise<void>
  ): Promise<void>;

  getOperationPromise<T>(
    operation: string,
    key: string
  ): Promise<T> | undefined;
}
