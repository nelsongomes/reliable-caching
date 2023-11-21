import { OperationRegistry } from "../race";
import { CacheStatsManager } from "../metrics";
import { logHandle, LogLevel } from "../logging";
import { ICacheController } from "../cache-controller";
import { ICacheStorage } from "../storage/storage-interface";
import { delay, getDeltaMilliseconds, now } from "ts-timeframe";
import {
  ConcurrencyControl,
  IManagement,
  ManagementOptions,
} from "./management-interface";

const DEFAULTS: ManagementOptions = {
  broadcast: true,
  concurrency: ConcurrencyControl.Local,
  lockTimeoutMs: 30000,
  log: () => {
    return;
  },
};

export class GenericManager implements IManagement {
  private controller: ICacheController;
  private storage: ICacheStorage;
  private options: ManagementOptions;

  constructor(
    controller: ICacheController,
    storage: ICacheStorage,
    options?: Partial<ManagementOptions>
  ) {
    this.controller = controller;
    this.storage = storage;
    this.options = { ...DEFAULTS, ...options };
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

    if (this.options.concurrency === ConcurrencyControl.Distributed) {
      // this declares to controller which operation registry to use by this operation (done once)
      this.controller.setRegistry(operation, operationRegistry);
    }

    const cacheRetrieval = async (
      key: string,
      ...innerArgs: P
    ): Promise<Awaited<R>> => {
      this.options.log(
        LogLevel.Info,
        `Using ${ConcurrencyControl.Distributed} mode`
      );

      switch (this.options.concurrency) {
        case ConcurrencyControl.Distributed:
          return await this.distributedConcurrencyFlow<R, P>(
            {
              operation,
              key,
              ttlMilliseconds,
              fn,
              log: this.options.log,
            },
            ...innerArgs
          );
        case ConcurrencyControl.Local:
          return await this.localConcurrencyFlow<R, P>(
            {
              operation,
              key,
              ttlMilliseconds,
              fn,
              log: this.options.log,
              operationRegistry,
            },
            ...innerArgs
          );
        case ConcurrencyControl.None:
          return await this.noConcurrencyFlow<R, P>(
            {
              operation,
              key,
              ttlMilliseconds,
              fn,
              log: this.options.log,
            },
            ...innerArgs
          );
        default:
          throw new Error("should not happen");
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
      this.options.log(
        LogLevel.Error,
        `Failed to store key ${key} into cache`,
        e
      );
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
      this.options.log(LogLevel.Error, `Failed to broadcast key ${key}`, e);
    }

    return cacheContent;
  }

  async close(): Promise<void> {
    return this.controller.close();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async noConcurrencyFlow<R, P extends any[]>(
    {
      operation,
      key,
      ttlMilliseconds,
      fn,
      log,
    }: {
      operation: string;
      key: string;
      ttlMilliseconds: number;
      fn: (...args: P) => Promise<Awaited<R>>;
      log: logHandle;
    },
    ...innerArgs: P
  ): Promise<Awaited<R>> {
    try {
      const startHit = now();
      const cacheContent = await this.storage.get<R>(key);

      if (cacheContent) {
        CacheStatsManager.hit(operation, getDeltaMilliseconds(startHit, now()));

        return cacheContent;
      }
    } catch (e) {
      log(LogLevel.Debug, `Failed to get key ${key} from cache`, e);
    }

    const value = await this.fetchAndStore<P, R>(
      key,
      operation,
      ttlMilliseconds,
      fn,
      innerArgs
    );

    // and return value for our initial promise
    return value;
  }

  async localConcurrencyFlow<R, P extends any[]>(
    {
      operation,
      key,
      ttlMilliseconds,
      fn,
      log,
      operationRegistry,
    }: {
      operation: string;
      key: string;
      ttlMilliseconds: number;
      fn: (...args: P) => Promise<Awaited<R>>;
      log: logHandle;
      operationRegistry: OperationRegistry;
    },
    ...innerArgs: P
  ): Promise<Awaited<R>> {
    try {
      const startHit = now();
      const cacheContent = await this.storage.get<R>(key);

      if (cacheContent) {
        CacheStatsManager.hit(operation, getDeltaMilliseconds(startHit, now()));

        return cacheContent;
      }
    } catch (e) {
      log(LogLevel.Debug, `Failed to get key ${key} from cache`, e);
    }

    const alreadyExecutingPromise = operationRegistry.isExecuting<Awaited<R>>(
      key
    );

    if (alreadyExecutingPromise) {
      return alreadyExecutingPromise;
    }

    try {
      const value = await this.fetchAndStore<P, R>(
        key,
        operation,
        ttlMilliseconds,
        fn,
        innerArgs
      );

      // if we succeeded to get the value, we send it to all awaiting promises
      operationRegistry.triggerAwaitingResolves<R>(key, value);

      // and return value for our initial promise
      return value;
    } catch (e) {
      // if fails we send error to all waiting rejects
      operationRegistry.triggerAwaitingRejects<unknown>(key, e);

      // and throw error for our initial promise
      throw e;
    }
  }

  async distributedConcurrencyFlow<R, P extends any[]>(
    {
      operation,
      key,
      ttlMilliseconds,
      fn,
      log,
    }: {
      operation: string;
      key: string;
      ttlMilliseconds: number;
      fn: (...args: P) => Promise<Awaited<R>>;
      log: logHandle;
    },
    ...innerArgs: P
  ): Promise<Awaited<R>> {
    try {
      const startHit = now();
      const cacheContent = await this.storage.get<R>(key);

      if (cacheContent) {
        CacheStatsManager.hit(operation, getDeltaMilliseconds(startHit, now()));
        log(LogLevel.Debug, "content found in cache");

        return cacheContent;
      }
    } catch (e) {
      log(LogLevel.Info, `Failed to get key ${key} from cache`, e);
    }

    // if we reach this point it means either an exception occurred or we don't have any content in cache
    let functionState: Promise<void> | null = null;
    let lockState = false;

    while (!lockState) {
      // try to obtain lock
      const { lockResult, unlockFunction } = await this.controller.lock(
        `${operation}#${key}`,
        this.options.lockTimeoutMs as number
      );
      functionState = unlockFunction;
      lockState = lockResult;

      if (lockState === false) {
        // give time for eventloop (operation start message to get in)
        await delay(5);

        // or get a promise for result, if controller has received information that someone else is executing it already
        const otherOngoingPromise = this.controller.getOperationPromise<
          Awaited<R>
        >(operation, key);

        if (otherOngoingPromise) {
          log(
            LogLevel.Debug,
            "GOT A PROMISE!! Hurrah, this operation is already ongoing"
          );
          return otherOngoingPromise;
        } else {
          log(LogLevel.Debug, "failed to get promise retrying");
        }
      } else {
        log(LogLevel.Info, "got lock, going to execute function");
      }
    }

    // initializes remote operation registry tables
    await this.controller.requestOperationStart(operation, key);

    try {
      const value = await this.fetchAndStore<P, R>(
        key,
        operation,
        ttlMilliseconds,
        fn,
        innerArgs
      );

      if (lockState) {
        // send operation result to all awaiting for result
        await this.controller.requestOperationEnd(
          operation,
          key,
          value,
          false,
          functionState as Promise<void> // unlock is triggered by processing end operation
        );
      }

      // and return value for our initial promise
      return value;
    } catch (e) {
      if (lockState) {
        console.log("throwed exception"); // TODO

        // send operation result to all awaiting for result
        await this.controller.requestOperationEnd(
          operation,
          key,
          e,
          true, // < is error
          functionState as Promise<void> // unlock is triggered by processing end operation
        );
      }

      // and throw error for our initial promise
      throw e;
    }
  }
}
