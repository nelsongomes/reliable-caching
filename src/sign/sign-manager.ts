import { createHmac } from "crypto";

const signKeys: Map<string, string> = new Map<string, string>();

export class SignManager {
  public static addKey(key: string, value: string): void {
    if (signKeys.has(key)) {
      throw new Error(`Key '${key}' already exists.`);
    }

    signKeys.set(key, value);
  }

  public static keyExists(key: string): boolean {
    return signKeys.has(key);
  }

  public static signContent(content: string, keyId: string): string {
    if (!signKeys.has(keyId)) {
      throw new Error(`Key '${keyId}' was not added for signing.`);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const hmac = createHmac("sha256", signKeys.get(keyId)!);

    hmac.update(content);

    return hmac.digest("hex");
  }

  public static verifySignedContent(
    content: string,
    keyId: string,
    signature: string
  ): boolean {
    return SignManager.signContent(content, keyId) === signature;
  }

  public static obtainKey(cacheKey: string): string {
    if (cacheKey.startsWith("!!!") && cacheKey.indexOf(":") > 3) {
      return cacheKey.substring(3, cacheKey.indexOf(":"));
    }

    throw new Error("Invalid cache key format.");
  }
}
