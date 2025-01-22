import { SignManager } from "../../../src";

// declare signing keys
// keep secret keys in a secure location
// also note that when you rotate keys, you should keep the old keys around until content signed with them expires
SignManager.addKey("myPrivateKey", "mySecret");

async function main() {
  const stringifiedContent = JSON.stringify({
    companyId: "abc",
    getCustomer: 123,
  });

  // sign content
  const signature = SignManager.signContent(stringifiedContent, "myPrivateKey");

  // now store the signature and the content into your cache

  // once you retrieve the content from the cache, you can verify the signature
  const isVerified = SignManager.verifySignedContent(
    stringifiedContent,
    "myPrivateKey",
    signature
  );

  if (isVerified) {
    console.log("Content is verified.");
  } else {
    console.log("Content is not verified. Treat it as a cache miss.");
  }
}

main();
