import { logHandle } from "../logging";

export enum ConcurrencyControl {
  None = "none",
  Local = "local",
  Distributed = "distributed",
}

export type ManagementOptions = {
  broadcast: boolean;
  concurrency: ConcurrencyControl;
  lockTimeoutMs: number;
  log: logHandle;
};

export interface IManagement {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getWrapperFunctions<P extends any[], R>(
    operation: string,
    ttlMilliseconds: number,
    fn: (...args: P) => Promise<Awaited<R>>
  ): {
    cacheRetrieval: (key: string, ...innerArgs: P) => Promise<Awaited<R>>;
    cacheEvict: (key: string) => Promise<void>;
  };

  close(): Promise<void>;
}
