import LRU from "lru-cache";
import { ICacheStorage } from "./storage-interface";

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
  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get(key);
  }

  /**
   * Sets cache key
   * @param key key to be set
   * @param ttlMilliseconds milliseconds to keep in cache
   * @param value value to store
   */
  async set<T>(key: string, ttlMilliseconds: number, value: T): Promise<void> {
    this.cache.set(key, value, { ttl: ttlMilliseconds });
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
