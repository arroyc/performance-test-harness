# Sample Test Configuration to run Baseline Event Grid Tests

```yaml
test_env_vars:  
  TOPIC_ENDPOINT : https://<app_hostname>/api/functionauth_post_rawrequest?code=<app_auth_code>
  EVENT_SCHEMA_TYPE: EventGrid
  PAYLOAD_FILE: ../smallpayload.json
test_load: "[{\"target\":100,\"duration\":\"1m\"}]"
test_path: "../test/eventgrid/eventgrid.js"
test_tags:  
  trigger: eventgrid
  test_metadata: eventgrid_test_windows_consumption
```

The above test configuration specifies the following environment variables

- `TOPIC_ENDPOINT`: The System Under Test URL for Event Grid Topic used by K6
- `EVENT_SCHEMA_TYPE` : Refers to the schema of the Event, EventGrid or CloudEvents schema
- `PAYLOAD_FILE`: The path to the payload file relative to the path of the `test` folder.
- `test_load` : Automatically converted into `INPUT_STAGES` environment variable by the `executeTest.sh` script

Additionally the below variables are used by K6

- `test_path` : Path of the actual K6 test relative to the root folder
- `test_tags` : Any metadata that needs to be passed as K6 tags to the test runner

Important Note: The K6 test for Event Grid accepts an enviroment variable called `AEG_SAS_KEY` and this is a secret that must be injected into the System under test Keyvault. Refer to the documentation of the `performance-pipeline-runner` for instructions to do this.

---

## System under test configurations

In the new performance-pipeline-runner any system under test configurations has to be performed by the developer running the tests as a pre-requisite or post-execution step accordingly. Here are some of the system under test configurations that are performed as `setup` and `teardown` steps for Event Grid tests written by CNAE:

`setup.sh` configurations

```bash
test_config=$1

# endpoint: [Required] Endpoint where EventGrid should deliver events matching 
#   this event subscription. For AzureFunction endpoint type, this is the 
#   resource id of the azure function. For other endpoint types this 
#   should be the corresponding webhook URL.
# endpointType: [Required] One of 3 values that determines how to configure the 
#   event grid subscription, and therefore effects what value to populate the 
#   endpoint with. Allowed values are:
#       "AzureFunction": Event grid subscription is created linked directly 
#           to the AzureFunction
#       "HttpWebHook": EventGrid subscription is created using the web hook 
#           url provided as the endpoint value. The web hook should expect 
#           the schema to be the default EventGrid schema.
#       "CloudEventWebHook": EventGrid subscription is created using the web 
#           hook url provided as the endpoint value. The web hook should 
#           expect the schema to be the default CloudEvent schema v1.0.
# eventGridTopicId: [Required] The resource id of the event grid topic to 
#   add the event grid subscription to.
# functionAppName: [Optional] The name of the function app. If present along 
#   with the rg, will ensure the function app is started prior to creating 
#   the subscription.
# resourceGroup: [Optional] The name of the resource group that the function 
#   app lives in. If present along with the app, will ensure the function app 
#   is started prior to creating the subscription.
# maxEventsPerBatch: [Required] Maximum number of events in a batch. Must be a number 
#   between 1 and 5000.
# preferredBatchSizeInKilobytes: [Required] Preferred batch size in kilobytes. 
#   Must be a number between 1 and 1024.
# startupDelay: [Optional] If present along with functionAppName and 
#   resourceGroup, represents the amount of time to sleep after ensuring the 
#   application has started, before attempt to configure the event grid 
#   subscription

# Sample Event Grid Function Trigger Configuration:
# {
#     "endpoint": "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroup}/providers/Microsoft.Web/sites/{functionAppName}/functions/{functionName}",
#     "endpointType": "AzureFunction"
#     "eventGridTopicId": "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroup}/providers/Microsoft.EventGrid/topics/{eventGridTopicName}",
#     "maxEventsPerBatch": 50,
#     "preferredBatchSizeInKilobytes": 64,
#     "functionAppName": "{functionAppName}",
#     "resourceGroup": "{resourceGroupName}",
#     "startupDelay": "3m"
# }

# Sample HTTP Trigger Function Configuration using event grid schema:
# {
#     "endpoint": "https://{functionAppName}.azurewebsites.net/runtime/webhooks/EventGridExtensionConfig?functionName={functionName}&code={masterKey}",
#     "endpointType": "HttpWebHook"
#     "eventGridTopicId": "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroup}/providers/Microsoft.EventGrid/topics/{eventGridTopicName}",
#     "maxEventsPerBatch": 50,
#     "preferredBatchSizeInKilobytes": 64,
#     "functionAppName": "{functionAppName}",
#     "resourceGroup": "{resourceGroupName}",
#     "startupDelay": "3m"
# }

# Sample HTTP Trigger Function Configuration using cloud event schema v1:
# {
#     "endpoint": "https://{functionAppName}.azurewebsites.net/runtime/webhooks/EventGridExtensionConfig?functionName={functionName}&code={masterKey}",
#     "endpointType": "CloudEventWebHook"
#     "eventGridTopicId": "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroup}/providers/Microsoft.EventGrid/topics/{eventGridTopicName}",
#     "maxEventsPerBatch": 50,
#     "preferredBatchSizeInKilobytes": 64,
#     "functionAppName": "{functionAppName}",
#     "resourceGroup": "{resourceGroupName}",
#     "startupDelay": "3m"
# }

endpoint=$(echo $test_config | jq -r '.endpoint')
endpoint_type=$(echo $test_config | jq -r '.endpointType')
event_grid_topic_id=$(echo $test_config | jq -r '.eventGridTopicId')
max_events_per_batch=$(echo $test_config | jq -r '.maxEventsPerBatch')
preferred_batch_size_in_kilobytes=$(echo $test_config | jq -r '.preferredBatchSizeInKilobytes')

app_name=$(echo $test_config | jq -r '.functionAppName')
delay=$(echo $test_config | jq -r '.startupDelay')
resource_group=$(echo $test_config | jq -r '.resourceGroup')

last_exit=0

if [[ $app_name != 'null' && $resource_group != 'null' ]]; then
    echo "Ensuring $app_name is running..."
    az functionapp start -g "$resource_group" -n "$app_name" &> null

    if [[ -n "$delay" ]]; then
        echo "Waiting $delay for app to start..."
        sleep $delay 
    fi
fi

attempt=1
keep_trying=1
while [[ $keep_trying != 0 ]];
do
    echo "Attempt #$attempt at creating the event grid subscription"

    case "$endpoint_type" in
        AzureFunction)
            echo "Creating Event Grid subscription for Event Grid trigger Function $endpoint"
            az eventgrid event-subscription create --name "test-event-sub" \
                --source-resource-id $event_grid_topic_id \
                --max-events-per-batch $max_events_per_batch \
                --preferred-batch-size-in-kilobytes $preferred_batch_size_in_kilobytes \
                --endpoint $endpoint --endpoint-type azurefunction &> null
            ;;
        HttpWebHook)
            echo "Creating Event Grid subscription for HTTP trigger Function $endpoint"

            az eventgrid event-subscription create --name "test-event-sub" \
                --max-events-per-batch $max_events_per_batch \
                --preferred-batch-size-in-kilobytes $preferred_batch_size_in_kilobytes \
                --source-resource-id $event_grid_topic_id --endpoint $endpoint &> null
            ;;
        CloudEventWebHook)
            echo "Creating Cloud Event subscription for HTTP trigger Function $endpoint"

            az eventgrid event-subscription create --name "test-event-sub"  \
                --max-events-per-batch $max_events_per_batch \
                --preferred-batch-size-in-kilobytes $preferred_batch_size_in_kilobytes \
                --source-resource-id $event_grid_topic_id --endpoint $endpoint \
                --event-delivery-schema cloudeventschemav1_0 &> null
            ;;
        *)
            echo -e "\e[31m $endpoint_type not recognized as a valid endpoint type"
            exit 1
    esac

    last_exit=$?
    if [[ $last_exit -ne 0 ]]; then
        if [[ $attempt -le 10 ]]; then
            echo "Attempt number $attempt failed. Waiting 30s, then trying again."
            let "attempt += 1"
            sleep 30s
        else
            echo -e "\e[31m Failed to create event grid subscription. Error code: $last_exit"
            exit $last_exit
        fi
    else
        echo "Created Event Grid subscription for $endpoint"
        keep_trying=0
    fi
done
```

`teardown.sh` configurations

```bash
test_config=$1

# eventGridTopicId: [Optional] The resource id of the event grid topic to remove the subscription from.
# functionAppName: [Optional] The name of the function app. If present along with the rg, will ensure the function app is started prior to creating the subscription.
# resourceGroup: [Optional] The name of the resource group that the function app lives in. If present along with the app, will ensure the function app is started prior to creating the subscription.

# Sample Configuration:
# {
#     "eventGridTopicId": "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroup}/providers/Microsoft.EventGrid/topics/{eventGridTopicName}",
#     "functionAppName": "{functionAppName}",
#     "resourceGroup": "{resourceGroupName}"
# }

event_grid_topic_id=$(echo $test_config | jq -r '.eventGridTopicId')
resource_group=$(echo $test_config | jq -r '.resourceGroup')
app_name=$(echo $test_config | jq -r '.functionAppName')

if [[ $event_grid_topic_id != 'null' ]]; then
    echo "Deleting event grid subscription"
    az eventgrid event-subscription delete --name test-event-sub \
        --source-resource-id $event_grid_topic_id &> null
    
    last_exit=$?

    if [[ $last_exit -ne 0 ]]; then
        echo -e "\e[31m Failed to delete event grid subscription. Error code: $last_exit"
        exit $last_exit
    fi
fi

if [[ $app_name != 'null' && $resource_group != 'null' ]]; then
    echo "Stopping $app_name to clear server count for subsequent runs..."
    az functionapp stop -g "$resource_group" -n "$app_name" &> null
fi
```

The above scripts make sure the Event Grid subscribers are started just before a test is run and stopped post the test to analyze a specific load test freshly.

---
