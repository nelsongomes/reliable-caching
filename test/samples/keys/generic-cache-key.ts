import { DataOwner, KeyGenerator } from "../../../src";

const createCustomerKey = KeyGenerator.keyFactory<{
  user: number;
  companyName: string;
}>({
  operation: "getCustomer",
  dataOwner: DataOwner.PublicData,
});

console.log(createCustomerKey({ companyName: "name", user: 123 }));
