const signKeys: Map<string, string> = new Map<string, string>();

export class SignManager {
  public static addKey(key: string, value: string): void {
    signKeys.set(key, value);
  }

  public static keyExists(key: string): boolean {
    return signKeys.has(key);
  }
}
