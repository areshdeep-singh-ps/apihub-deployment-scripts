const { IAMCredentialsClient } = require("@google-cloud/iam-credentials");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const axios = require("axios");
const fs = require("fs/promises");
const YAML = require("yaml");

const serviceAccount = "testsa@burner-micolatu1.iam.gserviceaccount.com";
//const serviceAccount = "677397881830@cloudbuild.gserviceaccount.com";
const client = new IAMCredentialsClient();

//Variables
const orgName = "burner-micolatu1";
const projectName = "burner-micolatu1";
const apigeeHostname = "http://burner-micolatu1-eval.apigee.net";

const proxyVer = "0.0.1";


//Function to generate access token to use with google apis
async function generateAccessToken() {
  const [token] = await client.generateAccessToken({
    name: `projects/-/serviceAccounts/${serviceAccount}`,
    scope: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  return token.accessToken;
}

//Function to download the API proxy zip from Apigee
async function listOrgApis() {
  const accessToken = await generateAccessToken();

  const response = await axios({
    method: "GET",
    url: `https://apigee.googleapis.com/v1/organizations/${orgName}/apis?includeRevisions=true`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data.proxies;
}

//Function to download the API proxy zip from Apigee
async function getProxyFile(proxyName, proxyRevision) {
  const accessToken = await generateAccessToken();

  const response = await axios({
    method: "GET",
    url: `https://apigee.googleapis.com/v1/organizations/${orgName}/apis/${proxyName}/revisions/${proxyRevision}?format=bundle`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    responseType: "arraybuffer",
  });

  const fileData = Buffer.from(response.data, "binary");
  await fs.writeFile(`./proxyBundles/${proxyName}.zip`, fileData);

  console.log(`${proxyName}.zip file Saved`);
}

//Function used to call the command to conver the apigee api bundle zip to a swagger json file
async function convertToAPIDefinition(proxyName) {
  try {
    const {} = await exec(
      `sudo apigee2openapi -d output  -l ./proxyBundles/${proxyName}.zip -n ${proxyName} -e ${apigeeHostname}`
    );
    console.log(`${proxyName} Converted to OpenAPI Definition`);
  } catch (e) {
    console.error(e);
  }
}

//function used to convert swagger json to yaml
async function jsonToYaml(proxyName) {
  const data = JSON.parse(
    await fs.readFile(`output/${proxyName}.json`, "utf8")
  );

  const doc = new YAML.Document();
  doc.contents = data;

  console.log(`${proxyName} API definition converted to YAML`);

  return doc;
}

//Function to upload the API to API Hub
async function uploadAPI(proxyName) {
  const accessToken = await generateAccessToken();

  const response = await axios({
    method: "POST",
    url: `https://apigeeregistry.googleapis.com/v1/projects/${projectName}/locations/global/apis?apiId=${proxyName.toLowerCase()}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    data: {
      name: `${proxyName}`,
      displayName: `${proxyName}`,
      labels: {
        "apihub-style": "apihub-openapi",
        "apihub-lifecycle": "concept",
      },
    },
  });

  console.log(`${proxyName} API Uploaded to API Hub`);
}

//Function to upload the API version
async function createAPIVersion(proxyName) {
  const accessToken = await generateAccessToken();

  const response = await axios({
    method: "POST",
    url: `https://apigeeregistry.googleapis.com/v1/projects/${projectName}/locations/global/apis/${proxyName.toLowerCase()}/versions?apiVersionId=${proxyVer}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    data: {
      name: `${proxyVer}`,
      displayName: `${proxyVer}`,
      state: "concept",
      annotations: {
        "apihub-end-of-life-type": "apihub-unknown",
      },
    },
  });

  console.log(`${proxyName} API Version Created`);
}

//Function to upload the API Specification
async function updateAPISpec(proxyName, yamlSpec) {
  const accessToken = await generateAccessToken();

  const base64data = Buffer.from(String(yamlSpec)).toString("base64");

  const response = await axios({
    method: "POST",
    url: `https://apigeeregistry.googleapis.com/v1/projects/burner-micolatu1/locations/global/apis/${proxyName.toLowerCase()}/versions/${proxyVer}/specs?apiSpecId=${proxyVer}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x.openapi",
    },
    data: {
      name: `${proxyVer}`,
      filename: `${proxyVer}.yaml`,
      contents: base64data,
      mimeType: "application/x.openapi",
    },
  });

  console.log(`${proxyName} API Specification Uploaded to API Hub`);
}

//function used to get and deploy the APIs from Apigee to APIhub
async function deployAPI() {
  
  const apiList = await listOrgApis();

  for (const api of apiList) {
    await getProxyFile(api.name, api.revision[0]);
    await convertToAPIDefinition(api.name);
    const yamlSpec = await jsonToYaml(api.name);
    await uploadAPI(api.name);
    await createAPIVersion(api.name);
    await updateAPISpec(api.name, yamlSpec);
  }
}

deployAPI();
