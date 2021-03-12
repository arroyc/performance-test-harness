# Sample Test Configuration to run Baseline HTTP Tests

```yaml
test_env_vars:  
  TARGET_ENDPOINT : https://<app_hostname>/api/functionauth_post_rawrequest?code=<app_auth_code>
test_load: "[{\"target\":100,\"duration\":\"1m\"}]"
test_path: "../test/http/http_small_payload.js"
test_tags:  
  trigger: http
  test_metadata: http_test_windows_consumption
```

The above test configuration specifies the following environment variables

- `TARGET_ENDPOINT`: The System Under Test URL used by the K6 test
- `test_load` : Automatically converted into `INPUT_STAGES` environment variable by the `executeTest.sh` script

Additionally the below variables are used by K6

- `test_path` : Path of the actual K6 test relative to the root folder
- `test_tags` : Any metadata that needs to be passed as K6 tags to the test runner

---

## System under test configurations

In the new performance-pipeline-runner any system under test configurations has to be performed by the developer running the tests as a pre-requisite or post-execution step accordingly. Here are some of the system under test configurations that are performed as `setup` and `teardown` steps for HTTP baseline tests written by CNAE:

`setup.sh` configurations

```bash
test_config=$1

resource_group=$(echo $test_config | jq -r '.rg')
app_name=$(echo $test_config | jq -r '.app')
delay=$(echo $test_config | jq -r '.startupDelay')

echo "Ensuring $app_name is running..."
az functionapp start -g "$resource_group" -n "$app_name" >/dev/null

echo "Waiting $delay for app to start..."
sleep $delay 
```

`teardown.sh` configurations

```bash
test_config=$1

resource_group=$(echo $test_config | jq -r '.rg')
app_name=$(echo $test_config | jq -r '.app')

echo "Stopping $app_name to clear server count for subsequent runs..."
az functionapp stop -g "$resource_group" -n "$app_name" >/dev/null
```

The above scripts start and stop any required function apps to wax and wane the server counts for fresh load tests. This helps to freshly evaluate the system after the scale out has come back to normal at zero load.

---
