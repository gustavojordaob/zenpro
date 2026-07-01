const { Client } = require("firebase-tools/lib/apiv2");
const { firebaseStorageOrigin } = require("firebase-tools/lib/api");

const PROJECT_ID = "zenpro-capinhas";
const LOCATION = "nam5";

async function main() {
  const client = new Client({
    urlPrefix: firebaseStorageOrigin(),
    apiVersion: "v1alpha",
  });

  const response = await client.post(
    `/projects/${PROJECT_ID}/defaultBucket`,
    { location: LOCATION },
  );

  console.log(JSON.stringify(response.body, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  if (error.original) {
    console.error(JSON.stringify(error.original, null, 2));
  }
  process.exit(1);
});
