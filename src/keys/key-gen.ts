import { SignManager } from "../sign/sign-manager";

export enum DataOwner {
  OrganizationOwned = "org",
  PublicData = "public",
  SharedData = "shared",
  UserOwned = "user",
  UserOrgOwned = "userOrg",
}

type ParameterTypes = {
  [key: string]:
    | string
    | number
    | boolean
    | Date
    | string[]
    | number[]
    | boolean[]
    | Date[];
};

export class KeyGenerator {
  /**
   * Method to generate a function that generates cache keys.
   * @param param0 cache function options
   * @returns function to generate cache keys
   */
  public static keyFactory<T extends ParameterTypes>({
    schemaVersion = 1,
    operation,
    service = "unknown",
    dataOwner = DataOwner.PublicData,
    signingKeyId,
  }: {
    schemaVersion?: number;
    operation: string;
    service?: string;
    dataOwner?: DataOwner;
    signingKeyId?: string;
  }): (values: T) => string {
    const constantString = `${
      signingKeyId ? `!!!${signingKeyId}:` : ""
    }${operation}#v${schemaVersion}:service=${service}:owner=${dataOwner}`;

    if (signingKeyId && !SignManager.keyExists(signingKeyId)) {
      throw new Error(`Key '${signingKeyId}' was not added for signing.`);
    }

    return (values: T): string => {
      const keyNames = Object.getOwnPropertyNames(values).sort();
      const uniqueKeys = keyNames.map((key) => {
        const value = ((values as unknown) as ParameterTypes)[key];

        return `${key}=${Array.isArray(value) ? value.join(",") : value}`;
      });

      return [constantString, ...uniqueKeys].join(":");
    };
  }
}
