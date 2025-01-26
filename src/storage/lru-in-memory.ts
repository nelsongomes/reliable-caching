import LRU from "lru-cache";
import { StorageWrapper, deepFreeze } from ".";
import { ICacheStorage } from "./storage-interface";

/**
 * LRU in memory cache storage (does not implement cache signatures)
 * All items are stored in memory and are immutable
 */
export class LruInMemoryStorage implements ICacheStorage {
  private cache: LRU<unknown, unknown>;

  /**
   * Create a wrapper class for lru-cache package
   * @param options lru-cache cache options
   */
  constructor(options: LRU.Options<unknown, unknown>) {
    this.cache = new LRU(options);
  }

  /**
   * Retrieves cache key
   * @param key
   * @returns
   */
  async get<T>(key: string, immutable = false): Promise<T | undefined> {
    const wrapper: StorageWrapper<T> | undefined = this.cache.get(key);

    if (immutable) {
      throw new Error(
        "Immutability should be set during cache set for in-memory caches"
      );
    }

    return wrapper?.value;
  }

  /**
   * Sets cache key
   * @param key key to be set
   * @param ttlMilliseconds milliseconds to keep in cache
   * @param value value to store
   */
  async set<T>(
    key: string,
    ttlMilliseconds: number,
    value: T,
    immutable = false
  ): Promise<void> {
    const wrapper: StorageWrapper<T> = {
      value,
    };

    // this forces in memory object not to be changed if immutable is true
    this.cache.set(key, immutable ? deepFreeze(wrapper) : wrapper, {
      ttl: ttlMilliseconds,
    });
  }

  /**
   *
   * @param key
   * @returns
   */
  async evict(key: string): Promise<void> {
    this.cache.delete(key);
  }
}
