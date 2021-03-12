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
    var params = {
        headers: {
            'Content-Type': 'application/atom+xml;type=entry;charset=utf-8',
            'Authorization': `SharedAccessSignature ${ehSasToken}`,
            'Host': `${ehNamespace}.servicebus.windows.net`
        },
    };

    var uri = `https://${ehNamespace}.servicebus.windows.net/${ehName}/messages`
    var url = `${uri}?api-version=2014-01`
    let res = http.post(url, JSON.stringify(body), params);

    check(res, {
        "is status 200": r => r.status >= 200 && r.status <= 300
    });

};

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
