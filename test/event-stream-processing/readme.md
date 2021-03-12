# Sample Test Configuration to run Event Stream Processing Tests

```yaml
test_env_vars:  
  EVENTHUB_NAMESPACE: my-eventhub-namespace
  EVENTHUB_NAME: my-eventhub-name
  PAYLOAD_FILE_PATH : ./sample-payload.xml
test_load: "[{\"target\":100,\"duration\":\"5m\"}]"
test_path: "../test/eventhub/eventhub_small_payload.js"
test_tags:  
  trigger: esp
  test_metadata: esp_windows_consumption
```

The above test configuration specifies the following environment variables

- `EVENTHUB_NAMESPACE`: The Event Hub namespace
- `EVENTHUB_NAME` : The Event Hub name
- `PAYLOAD_FILE_PATH`: The path to the payload file relative to the path of the `test` folder. If the payload file is in the same folder as the test, the path will be `./sample-payload.xml`. If it is outside the test folder, it will be `../sample-payload.xml`
- `test_load` : Automatically converted into `INPUT_STAGES` environment variable by the `executeTest.sh` script

Additionally the below variables are used by K6

- `test_path` : Path of the actual K6 test relative to the root folder
- `test_tags` : Any metadata that needs to be passed as K6 tags to the test runner

Important Note: The K6 test for Event Hub accepts an enviroment variable called `EVENTHUB_ACCESS_TOKEN` and this is a secret that must be injected into the System under test Keyvault. Refer to the documentation of the `performance-pipeline-runner` for instructions to do this. Alternatively the below bash script can be used to generate the SAS token and can be added to a pipeline of your choice to execute before the Event Hub tests are run.

---

## System under test configurations

In the new performance-pipeline-runner any system under test configurations has to be performed by the developer running the tests as a pre-requisite or post-execution step accordingly. Here are some of the system under test configurations that are performed as `setup` and `teardown` steps for Event Hub baseline tests written by CNAE:

`setup.sh` configurations

```bash
test_config=$1

resource_group=$(echo $test_config | jq -r '.rg')
app_name=$(echo $test_config | jq -r '.app')
# Variables required for generating SAS token
eventhub_namespace=$(echo $test_config | jq -r '.ehNamespace')
eventhub_name=$(echo $test_config | jq -r '.ehName')
shared_access_key=$(echo $test_config | jq -r '.sharedAccessKey')

# Function to get SAS token with 24hrs expiry
get_sas_token() {
    local EVENTHUB_URI="https://$eventhub_namespace.servicebus.windows.net/$eventhub_name"
    local SHARED_ACCESS_KEY_NAME="RootManageSharedAccessKey"
    local SHARED_ACCESS_KEY="$shared_access_key"
    local EXPIRY=${EXPIRY:=$((60 * 60 * 24))} # Token expiry is 1 day
    local ENCODED_URI=$(echo -n $EVENTHUB_URI | jq -s -R -r @uri)
    local TTL=$(($(date +%s) + $EXPIRY))
    local UTF8_SIGNATURE=$(printf "%s\n%s" $ENCODED_URI $TTL | iconv -t utf8)
    local HASH=$(echo -n "$UTF8_SIGNATURE" | openssl sha256 -hmac $SHARED_ACCESS_KEY -binary | base64)
    local ENCODED_HASH=$(echo -n $HASH | jq -s -R -r @uri)
    echo "sr=$ENCODED_URI&sig=$ENCODED_HASH&se=$TTL&skn=$SHARED_ACCESS_KEY_NAME"
}

sas_token=$(get_sas_token)

# Store variable export command in file
echo "export EVENTHUB_ACCESS_TOKEN='$sas_token'" >> ./sending-infrastructure/scripts/setupscriptsvars.env

echo "Ensuring $app_name is running..."
az functionapp start -g "$resource_group" -n "$app_name" >/dev/null

echo "Waiting 1m for app to start..."
sleep 1m
```

---
