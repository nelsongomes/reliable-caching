export * from "./lru-in-memory";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StorageWrapper<T = any> = {
  value: T;
};

// eslint-disable-next-line @typescript-eslint/ban-types
export function deepFreeze(obj: Object): Object {
  for (const key of Object.keys(obj)) {
    const parameter = (obj as never)[key];

    if (typeof parameter === "object") {
      deepFreeze(parameter);
    }
  }

  Object.freeze(obj);

  return obj;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function jsonParse<T = any>(jsonString: string): T {
  return JSON.parse(jsonString);
}
