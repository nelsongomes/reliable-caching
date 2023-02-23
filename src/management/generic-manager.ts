import { getDeltaMilliseconds, now } from "ts-timeframe";
import { ICacheController } from "../cache-controller";
import { logHandle, LogLevel } from "../logging";
import { CacheStatsManager } from "../metrics";
import { OperationRegistry } from "../race";
import { ICacheStorage } from "../storage/storage-interface";
import {
  ConcurrencyControl,
  IManagement,
  ManagementOptions,
} from "./management-interface";

const DEFAULTS: ManagementOptions = {
  broadcast: true,
  concurrency: ConcurrencyControl.Local,
  log: () => {
    return;
  },
};

export class GenericManager implements IManagement {
  private controller: ICacheController;
  private storage: ICacheStorage;
  private options: ManagementOptions;
  private log: logHandle = DEFAULTS.log as logHandle;

  constructor(
    controller: ICacheController,
    storage: ICacheStorage,
    options?: ManagementOptions
  ) {
    this.controller = controller;
    this.storage = storage;
    this.options = { ...DEFAULTS, ...options };

    if (this.options && this.options.log) {
      this.log = this.options.log;
    }
  }

  /**
   * Function to generate management functions to control cache plane
   * @param operation operation name
   * @param ttlMilliseconds cache time-to-live in milliseconds
   * @param fn function used to generate content
   * @returns two new functions, cacheRetrieval that tests, runs and sets content
   * and a cacheEvict function that allows to evict cache keys
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getWrapperFunctions<P extends any[], R>(
    operation: string,
    ttlMilliseconds: number,
    fn: (...args: P) => Promise<Awaited<R>>
  ): {
    cacheRetrieval: (key: string, ...innerArgs: P) => Promise<Awaited<R>>;
    cacheEvict: (key: string) => Promise<void>;
  } {
    const operationRegistry = new OperationRegistry(operation);

    const cacheRetrieval = async (
      key: string,
      ...innerArgs: P
    ): Promise<Awaited<R>> => {
      try {
        const startHit = now();
        const cacheContent = await this.storage.get<R>(key);

        if (cacheContent) {
          CacheStatsManager.hit(
            operation,
            getDeltaMilliseconds(startHit, now())
          );

          return cacheContent;
        }
      } catch (e) {
        this.log(LogLevel.Error, `Failed to get key ${key} from cache`, e);
      }

      // if we reach this point it means either an exception occurred or we don't have any content in cache
      if (this.options.concurrency !== ConcurrencyControl.None) {
        const alreadyExecutingPromise = operationRegistry.isExecuting<
          Awaited<R>
        >(key);

        if (alreadyExecutingPromise) {
          return alreadyExecutingPromise;
        }
      }

      try {
        const value = await this.fetchAndStore<P, R>(
          key,
          operation,
          ttlMilliseconds,
          fn,
          innerArgs
        );

        if (this.options.concurrency !== ConcurrencyControl.None) {
          // if we succeeded to get the value, we send it to all awaiting promises
          operationRegistry.triggerAwaitingResolves<R>(key, value);
        }

        // and return value for our initial promise
        return value;
      } catch (e) {
        if (this.options.concurrency !== ConcurrencyControl.None) {
          // if fails we send error to all waiting rejects
          operationRegistry.triggerAwaitingRejects<unknown>(key, e);
        }

        // and throw error for our initial promise
        throw e;
      }
    };

    const cacheEvict = async (key: string) => {
      // evict locally
      this.controller.evictCacheKey(key);

      // broadcast evict
      await this.controller.requestCacheKeyEviction(key);
    };

    // returns functions to abstract
    return { cacheRetrieval, cacheEvict };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async fetchAndStore<P extends any[], R>(
    key: string,
    operation: string,
    ttlMilliseconds: number,
    fn: (...args: P) => Promise<Awaited<R>>,
    args: P
  ): Promise<Awaited<R>> {
    const startMiss = now();
    const cacheContent = await fn(...args);

    CacheStatsManager.miss(operation, getDeltaMilliseconds(startMiss, now()));

    try {
      // store content locally
      await this.storage.set(key, ttlMilliseconds, cacheContent);
    } catch (e) {
      // do nothing if failed to store data
      this.log(LogLevel.Error, `Failed to store key ${key} into cache`, e);
    }

    try {
      if (this.options.broadcast) {
        // broadcast cache content
        await this.controller.broadcastCacheKey(
          key,
          ttlMilliseconds,
          cacheContent
        );
      }
    } catch (e) {
      // do nothing if failed to store data
      this.log(LogLevel.Error, `Failed to broadcast key ${key}`, e);
    }

    return cacheContent;
  }

  async close(): Promise<void> {
    await this.controller.close();
  }
}
