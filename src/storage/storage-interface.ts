/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ICacheStorage {
  get<T = any>(key: string): Promise<T | undefined>;
  set<T = any>(key: string, ttlMilliseconds: number, value: T): Promise<void>;
  evict(key: string): Promise<void>;
}
