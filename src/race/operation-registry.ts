/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDeltaMilliseconds, now } from "ts-timeframe";
import { CacheStatsManager } from "../metrics";

export class OperationRegistry {
  private operationRegistry: Map<string, any[]>;
  private operation;

  constructor(operation: string) {
    this.operation = operation;
    this.operationRegistry = new Map<string, any[]>();
  }

  private initKey(key: string): void {
    if (!this.operationRegistry.get(key)) {
      this.operationRegistry.set(key, []);
    }
  }

  public existsKey(key: string): boolean {
    return this.operationRegistry.has(key);
  }

  public triggerAwaitingResolves<T = any>(key: string, value: T): void {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let promises: any[] = this.operationRegistry.get(key)!;

    // we reset promises for next iteration
    this.operationRegistry.delete(key);

    if (promises && promises.length) {
      // cut first element
      promises = promises.slice(1);

      promises.map((promise) => {
        const [resolve] = promise;
        // trigger waiting promises on next eventloop
        setImmediate(() => {
          resolve(value);
        });
      });
    }
  }

  public triggerAwaitingRejects<T = unknown>(key: string, error: T): void {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let promises: any[] = this.operationRegistry.get(key)!;

    // we reset promises for next iteration
    this.operationRegistry.delete(key);

    // cut first element
    promises = promises.slice(1);

    promises.map((promise) => {
      const [, reject] = promise;
      // trigger waiting promises on next eventloop
      setImmediate(() => {
        reject(error);
      });
    });
  }

  public isExecuting<T>(key: string): Promise<T> | undefined {
    // initialize registry for key, not existent
    this.initKey(key);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const keyRegistry = this.operationRegistry.get(key)!;

    if (keyRegistry.length === 0) {
      // first entry marks that a promise is fetching the key
      keyRegistry.push([null, null]);
    } else {
      // next entries will wait for response of the first promise
      const promise: Promise<T> = new Promise((resolve, reject) => {
        const startCacheAwait = now();

        keyRegistry.push([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (value: any) => {
            CacheStatsManager.miss(
              this.operation,
              getDeltaMilliseconds(startCacheAwait, now())
            );

            resolve(value);
          },
          // not considering errors for miss measure
          reject,
        ]);
      });

      return promise;
    }
  }
}
