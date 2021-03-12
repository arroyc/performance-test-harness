import http from 'k6/http';
import { check } from 'k6';

// stage configuration should be set at command line
let inputStages = JSON.parse(__ENV.INPUT_STAGES);

export let options = {
    discardResponseBodies: true,
    scenarios: {
        contacts: {
        executor: 'ramping-arrival-rate',
        startRate: 1,
        timeUnit: '1s',
        preAllocatedVUs: 1000,
        maxVUs: 10000,
        stages: inputStages
        }
    }
}

let ehSasToken = __ENV.EVENTHUB_ACCESS_TOKEN;
let ehNamespace = __ENV.EVENTHUB_NAMESPACE;
let ehName = __ENV.EVENTHUB_NAME;
let payloadFilePath = __ENV.PAYLOAD_FILE_PATH;

let payloadFile = open(payloadFilePath);

export default function () {
    // Get contents of file as body
    const f = http.file(payloadFile, "application/atom+xml");
    const body = f.data;
    var params = {
        headers: {
            'Content-Type': 'application/atom+xml;type=entry;charset=utf-8',
            'Authorization': `SharedAccessSignature ${ehSasToken}`,
            'Host': `${ehNamespace}.servicebus.windows.net`
        },
    };

    var uri = `https://${ehNamespace}.servicebus.windows.net/${ehName}/messages`
    var url = `${uri}?api-version=2014-01`
    let res = http.post(url, body, params);

    check(res, {
        "is status 200": r => r.status >= 200 && r.status < 300
    });

};
