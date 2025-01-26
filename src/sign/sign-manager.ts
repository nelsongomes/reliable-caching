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

  public static signContent(
    content: string,
    keyId: string,
    short = false
  ): string {
    const key = signKeys.get(keyId);
    if (!key) {
      throw new Error(`Key '${keyId}' was not added for signing.`);
    }

    const hmac = createHmac(
      short === true
        ? // shorter hash for URL usage
          "rmd160"
        : "sha256",
      key
    );

    return hmac.update(content).digest("hex");
  }

  public static verifySignedContent(
    content: string,
    keyId: string,
    signature: string,
    short = false
  ): boolean {
    return SignManager.signContent(content, keyId, short) === signature;
  }

  /** This function determines if a cache key contains a signing key.
   * @param cacheKey
   */
  public static obtainKey(cacheKey: string): string | undefined {
    if (cacheKey.startsWith("!!!") && cacheKey.indexOf(":") > 3) {
      return cacheKey.substring(3, cacheKey.indexOf(":"));
    }
  }

  public static signUrlParamsObj(
    urlParams: {
      [key: string]:
        | string
        | number
        | boolean
        | string[]
        | number[]
        | boolean[];
    },
    keyId: string
  ): { rck: string; rcs: string } {
    const signature = SignManager.signContent(
      SignManager.sortSearchParams(urlParams),
      keyId,
      true
    );

    return { rck: keyId, rcs: signature };
  }

  public static signUrlParams(
    urlParams: {
      [key: string]:
        | string
        | number
        | boolean
        | string[]
        | number[]
        | boolean[];
    },
    keyId: string
  ): string {
    const { rck, rcs } = SignManager.signUrlParamsObj(urlParams, keyId);

    return `rck=${encodeURIComponent(rck)}&rks=${encodeURIComponent(rcs)}`;
  }

  private static sortSearchParams(urlParams: {
    [key: string]: string | number | boolean | string[] | number[] | boolean[];
  }): string {
    const urlInfo = new URL("https://www.npmjs.com/package/reliable-caching");

    for (const key in urlParams) {
      urlInfo.searchParams.append(key, urlParams[key].toString());
    }

    // make sure the keys are sorted for signature consistency
    urlInfo.searchParams.sort();

    return urlInfo.searchParams.toString();
  }

  public static verifySignedUrlParams(
    urlParams: {
      [key: string]:
        | string
        | number
        | boolean
        | string[]
        | number[]
        | boolean[];
    },
    rck: string | null,
    rks: string | null
  ): boolean {
    if (!rck || !rks) {
      return false;
    }

    try {
      return SignManager.verifySignedContent(
        SignManager.sortSearchParams(urlParams),
        rck,
        rks,
        true
      );
    } catch (e) {
      return false;
    }
  }
}
