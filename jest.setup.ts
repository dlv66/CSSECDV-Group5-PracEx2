import "@testing-library/jest-dom";
import {
    Request as CrossFetchRequest,
    Response as CrossFetchResponse,
} from "cross-fetch";

// Polyfill global Request for API route tests
if (typeof global.Request === "undefined") {
    // @ts-expect-error: Assigning CrossFetchRequest to global.Request for test polyfill
    global.Request = CrossFetchRequest;
}

if (typeof global.Response === "undefined") {
    // @ts-expect-error: Assigning CrossFetchResponse to global.Response for test polyfill
    global.Response = CrossFetchResponse;
}
