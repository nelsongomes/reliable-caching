import { DataOwner, KeyGenerator } from "../../../src";

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
});
