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

    it("Should return undefined if cache key is not found", async () => {
      expect(
        SignManager.obtainKey(
          "getCustomer#v1:service=unknown:owner=public:companyName=name:user=123"
        )
      ).toBeUndefined();
    });

    it("Should sign an URL parameter, order independent", async () => {
      const testKey = "orderIndepKey";
      SignManager.addKey(testKey, "secret1");

      expect(
        SignManager.signUrlParams(
          {
            getCustomer: 123,
            companyId: "abc",
          },
          testKey
        )
      ).toBe("rck=orderIndepKey&rks=726f21f558c8f03facab2729d98d8da93ecb8c3c");

      expect(
        SignManager.signUrlParams(
          {
            companyId: "abc",
            getCustomer: 123,
          },
          testKey
        )
      ).toBe("rck=orderIndepKey&rks=726f21f558c8f03facab2729d98d8da93ecb8c3c");
    });

    it("Different signing keys produce different output", async () => {
      SignManager.addKey("keyA", "keyA");
      SignManager.addKey("keyB", "keyB");

      expect(
        SignManager.signUrlParams(
          {
            getCustomer: 123,
            companyId: "abc",
          },
          "keyA"
        )
      ).not.toBe(
        SignManager.signUrlParams(
          {
            getCustomer: 123,
            companyId: "abc",
          },
          "keyB"
        )
      );
    });

    it("verifySignedUrlParams should return true if signature matches", async () => {
      const testKey = "contentMatchinKey";
      SignManager.addKey(testKey, "secret1");

      const signature = SignManager.signUrlParams(
        {
          companyId: "abcd",
          getCustomer: 123,
        },
        testKey
      );

      expect(
        SignManager.verifySignedUrlParams(
          {
            companyId: "abcd",
            getCustomer: 123,
          },
          testKey,
          signature.substring(signature.indexOf("&rks=") + 5)
        )
      ).toBe(true);
    });

    it("verifySignedUrlParams should return false if content tampered, signature tampered or key tampered", async () => {
      const testKey = "tamperedContent";
      SignManager.addKey(testKey, "secret1");

      const signature = SignManager.signUrlParams(
        {
          companyId: "abc",
          getCustomer: 123,
        },
        testKey
      );

      expect(
        SignManager.verifySignedUrlParams(
          {
            companyId: "abcd", // content tampered
            getCustomer: 123,
          },
          testKey,
          signature.substring(signature.indexOf("&rks=") + 5)
        )
      ).toBe(false);

      expect(
        SignManager.verifySignedUrlParams(
          {
            companyId: "abc",
            getCustomer: 123,
          },
          testKey,
          signature.substring(signature.indexOf("&rks=") + 5) + "a" // signature tampered
        )
      ).toBe(false);

      expect(
        SignManager.verifySignedUrlParams(
          {
            companyId: "abc",
            getCustomer: 123,
          },
          "testKey", // key tampered
          signature.substring(signature.indexOf("&rks=") + 5)
        )
      ).toBe(false);
    });

    it("verifySignedUrlParams should return false key or signature are missing", async () => {
      const testKey = "missingContentKey";
      SignManager.addKey(testKey, "secret1");

      const signature = SignManager.signUrlParams(
        {
          companyId: "abc",
          getCustomer: 123,
        },
        testKey
      );

      expect(
        SignManager.verifySignedUrlParams(
          {
            companyId: "abcd",
            getCustomer: 123,
          },
          null, // key missing
          signature.substring(signature.indexOf("&rks="))
        )
      ).toBe(false);

      expect(
        SignManager.verifySignedUrlParams(
          {
            companyId: "abcd",
            getCustomer: 123,
          },
          testKey,
          null // signature missing
        )
      ).toBe(false);
    });
  });
});
