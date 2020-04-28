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
var _rpc, _domain, _index, _getValue;
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
class I {
    constructor(rpc, domain, getValue) {
        _rpc.set(this, void 0);
        _domain.set(this, void 0);
        _index.set(this, void 0);
        _getValue.set(this, void 0);
        this[Symbol.asyncIterator] = () => this;
        __classPrivateFieldSet(this, _rpc, rpc);
        __classPrivateFieldSet(this, _domain, domain);
        __classPrivateFieldSet(this, _index, new Map());
        __classPrivateFieldSet(this, _getValue, getValue);
    }
    close() {
        __classPrivateFieldGet(this, _rpc).close();
    }
    keys() {
        if (__classPrivateFieldGet(this, _domain) === null)
            return [].values();
        return __classPrivateFieldGet(this, _domain).values();
    }
    values() {
        if (__classPrivateFieldGet(this, _domain) === null)
            return [].values();
        return __classPrivateFieldGet(this, _index).values();
    }
    entries() {
        if (__classPrivateFieldGet(this, _domain) === null)
            return [].values();
        return __classPrivateFieldGet(this, _index).entries();
    }
    async next(node) {
        if (__classPrivateFieldGet(this, _domain) === null)
            return { done: true, value: null };
        const params = node === undefined ? [] : [util_1.getJson(node)];
        const next = await __classPrivateFieldGet(this, _rpc).call("next", params);
        if (next === null) {
            __classPrivateFieldSet(this, _index, new Map());
            return { done: true, value: null };
        }
        else if (Array.isArray(next)) {
            const delta = new Map(__classPrivateFieldGet(this, _domain).slice(-next.length)
                .map((d, i) => [d, __classPrivateFieldGet(this, _getValue).call(this, next[i])]));
            for (const [key, val] of delta) {
                __classPrivateFieldGet(this, _index).set(key, val);
            }
            return { done: false, value: delta };
        }
    }
    async seek(index) {
        if (__classPrivateFieldGet(this, _domain) === null)
            return;
        const params = Array.isArray(index) ? [index.map(util_1.getJson)] : [];
        await __classPrivateFieldGet(this, _rpc).call("seek", params);
    }
    async prov() {
        if (__classPrivateFieldGet(this, _domain) === null)
            return;
        const prov = await __classPrivateFieldGet(this, _rpc).call("prov", []);
        return Array.isArray(prov)
            ? prov.map((quad) => Array.isArray(quad)
                ? quad.map((value) => __classPrivateFieldGet(this, _getValue).call(this, value))
                : null)
            : null;
    }
}
exports.default = I;
_rpc = new WeakMap(), _domain = new WeakMap(), _index = new WeakMap(), _getValue = new WeakMap();
//# sourceMappingURL=iterator.js.map