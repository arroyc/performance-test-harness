import http from 'k6/http';
import { check } from "k6";

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

let egEvent = createEvent();

export default function () {

    var aegSasKey = __ENV.AEG_SAS_KEY;
    var params = {
        headers: {
            'aeg-sas-key': aegSasKey,
            'Content-Type': __ENV.EVENT_SCHEMA_TYPE == 'EventGrid' ? 'application/json' : 'application/cloudevents+json; charset=utf-8',
        },
    };

    var url = `${__ENV.TOPIC_ENDPOINT}/`;
    let res = http.post(url,JSON.stringify(egEvent), params);

    check(res, {
        "is status success": r => (r.status >= 200 && r.status < 300)
    });
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
    });
}

function createEvent ()
{
    var event;
    if (__ENV.EVENT_SCHEMA_TYPE == 'EventGrid')
    {
        event = [{
            "topic": "",
            "subject": "abc",
            "eventType": "xyz",
            "eventTime": (new Date()).toISOString(),
            "id": uuidv4(),
            "data": JSON.parse(open(__ENV.PAYLOAD_FILE)),
            "dataVersion": "",
            "metadataVersion": "1"
        }];
        event[0].data.key = uuidv4();
    }
    else
    {
        event = {
            "specversion": "1.0",
            "type": "abc",
            "source": "xyz",
            "id": uuidv4(),
            "time": (new Date()).toISOString(),
            "subject": "ABC",
            "dataschema": "#",
            "data": JSON.parse(open(__ENV.PAYLOAD_FILE))
        };
        event.data.key = uuidv4();
    }
    return event;
}