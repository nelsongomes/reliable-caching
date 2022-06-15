import { DataOwner, KeyGenerator } from "../../../src";

const sharedCacheKey = KeyGenerator.keyFactory<{
  user: number;
  companyName: string;
}>({
  operation: "getCustomer",
  dataOwner: DataOwner.PublicData,
  service: "customer-api",
});

console.log(sharedCacheKey({ companyName: "name", user: 123 }));

// outputs:
// getCustomer#v1:service=customer-api:owner=public:companyName=name:user=123
