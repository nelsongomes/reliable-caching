import { DataOwner, KeyGenerator } from "../../../src";

// in case we change cache schema, we just need to change schemaVersion
const versionedCreateCustomerKey = KeyGenerator.keyFactory<{
  user: number;
  companyName: string;
}>({
  operation: "getCustomer",
  dataOwner: DataOwner.PublicData,
  schemaVersion: 2, // we changed the default schemaVersion from 1 to 2
});

console.log(versionedCreateCustomerKey({ companyName: "name", user: 123 }));

// outputs:
// getCustomer#v2:service=unknown:owner=public:companyName=name:user=123
