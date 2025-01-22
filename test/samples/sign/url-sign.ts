import { SignManager } from "../../../src";

// declare signing keys
// keep secret keys in a secure location
// also note that when you rotate keys, you should keep the old keys around until content signed with them expires
SignManager.addKey("myPrivateKey", "mySecret");

async function main() {
  const cacheKeyParams = {
    // these are the parameters that will be used to generate the cache key upon request
    productId: 123,
  };

  // sign content
  const signatureInfo = SignManager.signUrlParams(
    cacheKeyParams,
    "myPrivateKey"
  );

  // append below info to your URL
  console.log(`Url signing info: ${signatureInfo}`);
  // rck=myPrivateKey&rks=dc44d1be11ff0db72ad71a644e586d1d3935bba4
  // rck is the key id
  // rks is the signature

  // now when you get URL parameters, you can verify the signature to make sure the content is not tampered or random
  const isVerified = SignManager.verifySignedUrlParams(
    cacheKeyParams,
    "myPrivateKey", // rck
    "dc44d1be11ff0db72ad71a644e586d1d3935bba4" // rks
  );

  if (isVerified) {
    console.log("Content is verified.");
  } else {
    console.log("Content is not verified. Treat it as 404 bad request.");
  }
}

main();
