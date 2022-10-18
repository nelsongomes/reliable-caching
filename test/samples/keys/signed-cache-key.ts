import { DataOwner, KeyGenerator, SignManager } from "../../../src";

SignManager.addKey("key1", "secret");

const signedCreateCustomerKey = KeyGenerator.keyFactory<{
  user: number;
  companyName: string;
}>({
  operation: "getCustomer",
  dataOwner: DataOwner.PublicData,
  signingKeyId: "key1", // this key is used to signed cached content and to validate it
});

console.log(signedCreateCustomerKey({ companyName: "name", user: 123 }));

// outputs:
// !!!key1:getCustomer#v1:service=unknown:owner=public:companyName=name:user=123
