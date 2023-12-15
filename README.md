
## Build Instructions

So far the script can:

- Read API from Apigee
- Downloads each API proxy bundle as a ZIP and stores in ./ProxyBundles
- Converts each proxy ZIP into OpenAPI json format
- Converts each OpenAPI json to yaml
- Uploads the proxy to API HUB
- Adds a version to each proxy
- Adds the OpenAPI Spec to each Proxy

When re-running the script and for any errors: 
- you should manually delete the proxies from API Hub to restart/start from fresh.
- you should manually delete the files ./output
- you should manually delete the zip files in the ./proxyBundles
- In windows - you may have to remove the "sudo" command from the "convertToAPIDefinition()" cmd line


## Quickstart

Authenticate with the following commands

- gcloud auth application-default login --impersonate-service-account testsa@burner-micolatu1.iam.gserviceaccount.com
- gcloud config set auth/impersonate_service_account testsa@burner-micolatu1.iam.gserviceaccount.com

Run Script with

- node multipleProxyDiscovery.js



## Tests

## License

## Disclaimer

## Contributing

Contributions are welcome! Please see [CONTRIBUTING](CONTRIBUTING.md) for notes
on how to contribute to this project.
