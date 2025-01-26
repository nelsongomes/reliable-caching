export * from "./redis";
export * from "./lru-in-memory";

export const SIGNATURE_SEPARATOR = ":";

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
