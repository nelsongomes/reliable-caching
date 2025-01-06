/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { SignManager } from "../../../src";

describe("SignManager", () => {
  describe("addKey", () => {
    it("Should add key with success", async () => {
      expect(() => SignManager.addKey("newKey", "secret1")).not.toThrow();
    });

    it("Should throw because key was already added", async () => {
      SignManager.addKey("duplicate", "secret1");
      expect(() => SignManager.addKey("duplicate", "secret1")).toThrow(
        "Key 'duplicate' already exists."
      );
    });
  });

  describe("signContent", () => {
    it("Should generate content for a signature key", async () => {
      SignManager.addKey("key1", "secret1");

      expect(SignManager.signContent("content", "key1")).toBe(
        "9c8cc7658b73dffbe87cab814247fca473b93e6d1f0dec2742428027c4efff64"
      );
    });

    it("Should throw if key doesn't exist", async () => {
      expect(() => SignManager.signContent("content", "nonexistent")).toThrow(
        "Key 'nonexistent' was not added for signing."
      );
    });
  });

  describe("verifySignedContent", () => {
    it("Should generate content for a signature key", async () => {
      SignManager.addKey("signKey", "secret1");

      const signature = SignManager.signContent("content", "signKey");

      expect(
        SignManager.verifySignedContent("content", "signKey", signature)
      ).toBe(true);
      expect(
        SignManager.verifySignedContent("content", "signKey", "somethingelse")
      ).toBe(false);
    });
  });

  describe("obtainKey", () => {
    it("Should check if cache key contains a signing key", async () => {
      expect(
        SignManager.obtainKey(
          "!!!key1:getCustomer#v1:service=unknown:owner=public:companyName=name:user=123"
        )
      ).toBe("key1");
    });

    it("Should throw if a key is not found", async () => {
      expect(() =>
        SignManager.obtainKey(
          "getCustomer#v1:service=unknown:owner=public:companyName=name:user=123"
        )
      ).toThrow("Invalid cache key format.");
    });
  });
});
