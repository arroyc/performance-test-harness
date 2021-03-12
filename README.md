# Performance Test Harness

## Introduction

This repository serves as a test harness or test bed for all the K6 tests. This repository is automatically cloned when the performance-pipeline-runner executes tests.

As a best practice, this repository is designed to house tests of a specific kind. For example, if the K6 test is designed to test Azure Event Hubs and related services, it is recommended to have the repository only house tests related to that specific system under test and can be called `eventhubs-performance-test-harness` and accordingly would need changes in the pipeline that executes the tests to refer to this specific harness.

For CNAE Perf and Scale VSA, we chose to house tests of different kinds into one repository as we had already organized the tests in that manner. But any fresh project utilizing this repository can follow the above mentioned best practice.

---

## Getting Started

The repository has two main folders:

- `scripts`
- `test`

Both these folders are cloned into the load generation system by the performance-pipeline-runner when a test is executed by its pipelines.

- It is recommended to organize the K6 tests under `test` folder as sub-folders as seen in the repository.

- It is recommended to write K6 tests in a manner that the tunable aspects of the test be provided as environment variables so that they can be provided dynamically while running a test, as part of Test Configuration.

---

## Customizations

The `scripts` folder in the test harness has three important scripts that can be used for customizing the test runs.

- `pre.sh`
- `post.sh`
- `executeTest.sh`

`pre.sh` is always run by each VM before the K6 test is executed.

`post.sh` is always run by each VM after the K6 test is executed.

`executeTest.sh` is a script that actually executes the K6 command. Since the K6 command has a lot of options, any customizations to the command itself can be performed in this script.

---

## CNAE specific customizations

`pre.sh` is customized for the CNAE load testing purposes, to parse an existing test configuration (provided while executing a test) and extracting environment variables and load input from it.

### Customizations for `pre.sh`

Here is a YAML test configuration specification that is meant for a K6 Event Hub Test

```yaml
test_env_vars:  
  EVENTHUB_NAMESPACE: my-eventhub-namespace
  EVENTHUB_NAME: my-eventhub-name
test_load: "[{\"target\":100,\"duration\":\"5m\"}]"
test_path: "../test/eventhub/eventhub_small_payload.js"
test_tags:  
  trigger: eventhub
  test_metadata: devops

```

The `pre.sh` script for CNAE is customized to parse this specific test configuration and set all the variables under `test_env_vars` as environment variables just before a test is executed. This way it provides the K6 test with the variables it needs and a developer can now use the K6 test in a generic way.

The `test_path` variable is always relative to the root folder. Since the `pre.sh` is running from the `scripts` folder, the `test_path` is relative to that folder.

### Customizations for `executeTest.sh`

In `executeTest.sh`, the `test_tags` from the Test Configuration is parsed and added as K6 tags. This script also takes in the `test_load` and adds it as an environment variable in the final K6 command.

The `executeTest.sh` script for CNAE is customized to parse the `test_load` and set it as `INPUT_STAGES` which tells K6 about the test load.

Similarly one can customize the `post.sh` to perform any cleanups. CNAE has not utilized the `post.sh` for any specific purposes.

This explains why it is recommended for the `performance-test-harness` to stick to one specific system under test. This is because we can contain the customizations in `pre.sh`/`post.sh`/`executeTest.sh` for a specific harness and the Test Configuration is completely customizable as well. CNAE chose to have the following as a test configuration specification:

```yaml
test_env_vars:  
  env_var_1:value_1
  env_var_2:value_2
test_load: "[{\"target\":100,\"duration\":\"5m\"}]"
test_path: "../test/{PATH_TO_TEST}"
test_tags:  
  test_tag_1: test_tag_value_1
  test_tag_2: test_tag_value_2

```

## Writing K6 Tests

To get started with K6 test concepts and to run it locally refer to [this link](https://k6.io/docs/getting-started/running-k6).

### Anatomy of a K6 Load Test

Here is a [HTTP Small Payload K6 Test](./test/http/http_small_payload.js) and here is an explanation of the different parts of the test

```javascript
import http from 'k6/http';
import { check } from "k6";
```

[`http`](https://k6.io/docs/using-k6/http-requests) and [`check`](https://k6.io/docs/using-k6/checks) are constructs in k6 to send HTTP requests and to check its response respectively.

```javascript
// stage configuration should be set at command line
let inputStages = JSON.parse(__ENV.INPUT_STAGES);
```

The INPUT_STAGES is an environment variable that defines the load and is passed into the VM running the K6 test through the pipeline.

---

The following snippet is quite important as it defines K6 and the open model of testing. This is called the [ramping-arrival-rate](https://k6.io/docs/using-k6/scenarios/executors/ramping-arrival-rate).

K6 will adjust the VU's to match the iteration rate i.e., RPS. So when we define 5000 requests for 5m, the number of VU's to achieve that is automatically calculated by K6.

The open model also means that K6 will not adjust the load based on the response from the system under test, and this is exactly what we need - a load generator that throws in heavy load at constant rate at the services.

This block of code is constant for all K6 tests. If the VM runs out of memory (rare event) then it makes sense to increase the `maxVUs` parameter below in the test to help K6 achieve the required number of iterations. This tuning is expected to be done by the developer.

``` javascript
export let options = {
    discardResponseBodies: true,
    scenarios: {
        contacts: {
        executor: 'ramping-arrival-rate',
        startRate: 1,
        timeUnit: '1s',
        preAllocatedVUs: 1000,
        maxVUs: 12000,
        stages: inputStages
        }
    }
}
```

---
The following block of code actually sends the HTTP request to the service under test and this block is executed repeatedly.

The environment variable `TARGET_ENDPOINT` is passed from the test kickoff pipeline as part of `TEST_INPUTS` pipeline variable.

```javascript
export default function () {
    const body = {
        key: uuidv4(),
        value: {
            objValue1: 1,
            objValue2: "two",
            objValue3: {
                complex: "object"
            }
        }
    };
    const headers = { 'Content-Type': 'application/json' };
    let params = {
        headers: headers,
        // App service front-end timeout is 230s
        timeout: 230000
    }

    let res = http.post(`${__ENV.TARGET_ENDPOINT}`, JSON.stringify(body), params);

    check(res, {
        "is status 200": r => r.status >= 200 && r.status <= 300
    });

    // Don't enable sleep for constant arrival executors as it interferes with maintaining constant RPS
    //sleep(1);
};
```

---
