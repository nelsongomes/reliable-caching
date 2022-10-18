import { DataOwner, KeyGenerator, SignManager } from "../../../src";

describe("KeyGenerator.keyFactory", () => {
  it("Create a generic key generator function, parameters order indifferent", async () => {
    const createCustomerKey = KeyGenerator.keyFactory<{
      user: number;
      companyName: string;
    }>({
      operation: "getCustomer",
      dataOwner: DataOwner.PublicData,
    });

    expect(createCustomerKey({ companyName: "name", user: 123 })).toBe(
      "getCustomer#v1:service=unknown:owner=public:companyName=name:user=123"
    );
    expect(createCustomerKey({ user: 123, companyName: "name" })).toBe(
      "getCustomer#v1:service=unknown:owner=public:companyName=name:user=123"
    );
  });

  it("Create a generic key generator function, with an array", async () => {
    const createCustomerKey = KeyGenerator.keyFactory<{
      users: string[];
    }>({
      operation: "getCustomer",
      dataOwner: DataOwner.PublicData,
    });

    expect(createCustomerKey({ users: ["a", "b"] })).toBe(
      "getCustomer#v1:service=unknown:owner=public:users=a,b"
    );
  });

  it("Create a generic key generator function, with signing key", async () => {
    SignManager.addKey("key", "secret");
    const createCustomerKey = KeyGenerator.keyFactory<{
      user: number;
      companyName: string;
    }>({
      operation: "getCustomer",
      dataOwner: DataOwner.PublicData,
      signingKeyId: "key",
    });

    expect(createCustomerKey({ user: 123, companyName: "name" })).toBe(
      "!!!key:getCustomer#v1:service=unknown:owner=public:companyName=name:user=123"
    );
  });

  it("Should throw an error during function creation if signing key is non existent", async () => {
    expect(() =>
      KeyGenerator.keyFactory<{
        user: number;
        companyName: string;
      }>({
        operation: "getCustomer",
        dataOwner: DataOwner.PublicData,
        signingKeyId: "nonexistentkey",
      })
    ).toThrow("Key 'nonexistentkey' was not added for signing.");
  });
});
