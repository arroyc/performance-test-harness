import http from 'k6/http';
import { Rate } from 'k6/metrics';
import { check } from "k6";

// stage configuration should be set at command line
let inputStages = JSON.parse(__ENV.INPUT_STAGES);

export let RateErrors = new Rate('Errors');
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
    },
    thresholds: {
        Errors: [{ threshold: 'rate<0.02', abortOnFail: true, delayAbortEval: '1m' }]
    }
}

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

    let contentOk = res.status >= 200 && res.status < 300;
    check(res, {
        "is status 200": contentOk
    });

    RateErrors.add(!contentOk);
};

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}