"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _iterator, _socket, _id;
Object.defineProperty(exports, "__esModule", { value: true });
const jsonrpc_lite_1 = __importDefault(require("jsonrpc-lite"));
const dom_1 = require("event-iterator/lib/dom");
class RPC {
    constructor(socket) {
        _iterator.set(this, void 0);
        _socket.set(this, void 0);
        _id.set(this, void 0);
        __classPrivateFieldSet(this, _socket, socket);
        __classPrivateFieldSet(this, _id, 0);
        const iterable = dom_1.subscribe.call(socket, "message");
        __classPrivateFieldSet(this, _iterator, iterable[Symbol.asyncIterator]());
    }
    close() {
        __classPrivateFieldGet(this, _socket).close(1000);
    }
    async call(method, params) {
        var _a;
        const request = jsonrpc_lite_1.default.request((__classPrivateFieldSet(this, _id, (_a = +__classPrivateFieldGet(this, _id)) + 1), _a), method, params);
        const message = JSON.stringify(request);
        __classPrivateFieldGet(this, _socket).send(message);
        const response = await __classPrivateFieldGet(this, _iterator).next();
        if (response.done) {
            console.error(response.value);
            throw new Error("Iterator ended unexpectedly");
        }
        const result = jsonrpc_lite_1.default.parse(response.value.data);
        if (Array.isArray(result)) {
            console.error(result);
            throw new Error("Unexpected batch result");
        }
        if (result.type === "notification" /* notification */) {
            console.log(result.payload);
        }
        else if (result.type === "invalid" /* invalid */) {
            console.error(result.payload);
            throw new Error("Invalid RPC message");
        }
        else if (result.type === "error" /* error */) {
            console.error(result.payload);
            throw new Error("Recieved RPC error");
        }
        else if (result.type === "request" /* request */) {
            console.error(result.payload);
            throw new Error("Unexpected request");
        }
        else if (result.type === "success" /* success */) {
            return result.payload.result;
        }
    }
}
exports.default = RPC;
_iterator = new WeakMap(), _socket = new WeakMap(), _id = new WeakMap();
//# sourceMappingURL=rpc.js.map