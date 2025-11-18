import Redis from "ioredis";
import { SignManager } from "../sign";
import { SIGNATURE_SEPARATOR, StorageWrapper, deepFreeze } from ".";
import { ICacheStorage } from "./storage-interface";

/**
 * Redis cache storage (implements cache signatures)
 * All items are stored in redis and are immutable after retrieval
 * because they might be shared between threads to prevent data corruption
 */
export class RedisStorage implements ICacheStorage {
  private cache: Redis;

  /**
   * Create a wrapper class for ioredis package
   * @param redisInstance ioredis instance
   */
  constructor(redisInstance: Redis) {
    this.cache = redisInstance;
  }

  /**
   * Retrieves cache key
   * @param key
   * @returns
   */
  async get<T>(key: string, immutable?: boolean): Promise<T | undefined> {
    let cachedContent: string | null = await this.cache.get(key);

    if (cachedContent) {
      const signingKey = SignManager.obtainKey(key);

      if (signingKey) {
        const separatorPosition = cachedContent.indexOf(SIGNATURE_SEPARATOR);
        const content = cachedContent.substring(separatorPosition + 1);
        const signature = cachedContent.substring(0, separatorPosition);

        if (!SignManager.verifySignedContent(content, signingKey, signature)) {
          // treat as cache miss
          return;
        }

        // remove signature from content
        cachedContent = content;
      }

      try {
        const wrapper: StorageWrapper<T> | undefined = (JSON.parse(
          cachedContent
        ) as unknown) as StorageWrapper<T>;

        // this forces in memory object not to be changed between instances
        if (immutable) {
          deepFreeze(wrapper);
        }

        return wrapper?.value;
      } catch (e) {
        // treat JSON parse error as cache miss
        return undefined;
      }
    }
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
    immutable?: boolean
  ): Promise<void> {
    if (immutable) {
      throw new Error(
        "Immutability should be set during cache get for external caches"
      );
    }

    const wrapper: StorageWrapper<T> = {
      value,
    };

    const signingKey = SignManager.obtainKey(key);
    let content = JSON.stringify(wrapper);

    if (signingKey) {
      const signature = SignManager.signContent(content, signingKey);
      // append signature to content
      content = signature + SIGNATURE_SEPARATOR + content;
    }

    // this forces in memory object not to be changed
    await this.cache.set(key, content, "PX", ttlMilliseconds);
  }

  /**
   *
   * @param key
   * @returnsv Promise<void>
   */
  async evict(key: string): Promise<void> {
    await this.cache.del(key);
  }
}
