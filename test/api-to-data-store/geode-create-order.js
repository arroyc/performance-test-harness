import http from 'k6/http';
import { check } from 'k6';
import { fail } from 'k6';

/** 
 * This is a K6 test script that calls multiple API's in a specific order to emulate a real world API call:
 * GetProducts API: Gets all products in the database.
 * GetProductById API: For each product in the database, it gets the first warehouse Id.
 * PlaceOrder API: Compiles a list of products/warehouses/units into an order and places the order.
 */

// stage configuration should be set at command line
let inputStages = JSON.parse(__ENV.INPUT_STAGES);
let get_all_products_api_url = __ENV.GET_ALL_PRODUCTS_API_URL;
let get_product_api_url = __ENV.GET_PRODUCT_API_URL;
let place_order_api_url = __ENV.GET_PLACE_ORDER_API_URL;

export let options = {
    discardResponseBodies: false,
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

// Run GetAllProducts as part of the setup stage when the VU is 0
// Access the variables here via the "data" construct in the VU iterator.
export function setup() {
    // First get all the products
    var params = {
        headers: {
            'Content-Type': 'application/json'
        },
    };

    let products = http.get(get_all_products_api_url, params);

    // check the products status first and log it as a check
    check(products, {
        "GetAllProducts status is 200": r => r.status >= 200 && r.status < 300
    });

    return JSON.parse(products.body);
}

// VU iterator uses "products" from setup phase
export default function (products) {
    let product_id = products[0];
    let items_arr = [];
    var params = {
        headers: {
            'Content-Type': 'application/json'
        },
    };

    // Pick the first product
    let req_url = get_product_api_url + "/" + product_id; // request URL
    let each_product = http.get(req_url, params);

    // check each product GET status and log it as another check
    check(each_product, {
        "GetProductById status is 200": r => r.status >= 200 && r.status < 300
    });

    let each_product_json_body = JSON.parse(each_product.body);
    if (each_product_json_body.warehouses[0] == undefined) {
        fail('No warehouses exist for this product ' + product_id);
        return;
    } 
    let first_warehouse_id = each_product_json_body.warehouses[0].warehouseId;

    if (first_warehouse_id == undefined) {
        fail('Warehouse id is undefined for this product ' + product_id);
        return;
    } 
    let order = {
        productId: product_id,
        warehouseId: first_warehouse_id,
        units: 2,
        unitPrice: 9.99
    };
    items_arr.push(order);
    const order_body = {
        items: items_arr,
        subtotal: 74.98,
        tax: 7.49,
        totalPrice: 82.47
    };

    // Place order with all the items in product with a specific warehouse
    let place_order = http.post(place_order_api_url, JSON.stringify(order_body), params);
    check(place_order, {
        "PlaceOrder status is 200": r => r.status >= 200 && r.status < 300
    });
};
