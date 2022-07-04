export interface ICacheStorage {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  evict(key: string): Promise<void>;
}
