"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _openRPC;
Object.defineProperty(exports, "__esModule", { value: true });
const jsonld_1 = __importDefault(require("jsonld"));
const uuid_1 = require("uuid");
const dataset_1 = __importDefault(require("@rdfjs/dataset"));
const rpc_1 = __importDefault(require("./rpc"));
const util_1 = require("./util");
const iterator_1 = __importDefault(require("./iterator"));
class Styx {
    constructor(host) {
        _openRPC.set(this, () => new Promise((resolve, reject) => {
            console.log("opening websocket to", this.host);
            const socket = new WebSocket("ws://" + this.host, "rpc");
            socket.onerror = reject;
            socket.onopen = (event) => socket.readyState === WebSocket.OPEN ? resolve(socket) : reject(event);
        }));
        this.host = host;
    }
    async set(node, dataset) {
        let url;
        if (!node || node.termType === "DefaultGraph") {
            url = "http://" + this.host;
        }
        else if (node.termType === "NamedNode") {
            url = "http://" + this.host + "?" + node.value;
        }
        else {
            throw new Error("Invalid node origin");
        }
        const quads = Array.from(dataset).map(util_1.quadToJSON);
        const res = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(quads),
        });
        if (!res.ok) {
            console.error(await res.text());
            throw new Error(res.statusText);
        }
    }
    async setJsonLd(node, dataset) {
        let url;
        if (!node || !node["@id"]) {
            url = "http://" + this.host;
        }
        else {
            url = "http://" + this.host + "?" + node["@id"];
        }
        const res = await fetch(url, {
            method: "PUT",
            headers: { "Content-Type": "application/ld+json" },
            body: JSON.stringify(dataset),
        });
        if (!res.ok) {
            console.error(await res.text());
            throw new Error(res.statusText);
        }
    }
    async get(node) {
        let url;
        if (!node || node.termType === "DefaultGraph") {
            url = "http://" + this.host;
        }
        else if (node.termType === "NamedNode") {
            url = "http://" + this.host + "?" + node.value;
        }
        else {
            throw new Error("Invalid node origin");
        }
        const res = await fetch(url, {
            method: "GET",
            headers: { Accept: "application/json" },
        });
        if (!res.ok) {
            console.error(await res.text());
            throw new Error(res.statusText);
        }
        const json = await res.json();
        if (Array.isArray(json)) {
            const quads = [];
            for (const quad of json) {
                quads.push(util_1.quadFromJSON(quad));
            }
            return dataset_1.default.dataset(quads);
        }
        return null;
    }
    async getJsonLd(node) {
        let url;
        if (!node || !node["@id"]) {
            url = "http://" + this.host;
        }
        else {
            url = "http://" + this.host + "?" + node["@id"];
        }
        const res = await fetch(url, {
            method: "GET",
            headers: { Accept: "application/ld+json" },
        });
        if (!res.ok) {
            console.error(await res.text());
            throw new Error(res.statusText);
        }
        return res.json();
    }
    async delete(node) {
        let url;
        if (!node || node.termType === "DefaultGraph") {
            url = "http://" + this.host;
        }
        else if (node.termType === "NamedNode") {
            url = "http://" + this.host + "?" + node.value;
        }
        else {
            throw new Error("Invalid term type");
        }
        const res = await fetch(url, { method: "DELETE" });
        if (!res.ok) {
            console.error(await res.text());
            throw new Error(res.statusText);
        }
    }
    async deleteJsonLd(node) {
        let url;
        if (!node || !node["@id"]) {
            url = "http://" + this.host;
        }
        else if (node["@id"].slice(0, 2) !== "_:" &&
            node["@id"].slice(0, 2) !== "?:") {
            url = "http://" + this.host + "?" + node["@id"];
        }
        const res = await fetch(url, { method: "DELETE" });
        if (!res.ok) {
            console.error(await res.text());
            throw new Error(res.statusText);
        }
    }
    async query(query, domain, index) {
        const socket = await __classPrivateFieldGet(this, _openRPC).call(this);
        const rpc = new rpc_1.default(socket);
        const result = await rpc.call("query", [
            Array.from(query).map(util_1.quadToJSON),
            Array.isArray(domain) ? domain.map(util_1.toJSON) : null,
            Array.isArray(index) ? index.map(util_1.toJSON) : null,
        ]);
        const first = Array.isArray(result) ? result.map(util_1.fromJSON) : null;
        return new iterator_1.default(rpc, first, util_1.fromJSON);
    }
    async queryJsonLd(query, domain, index) {
        const socket = await __classPrivateFieldGet(this, _openRPC).call(this);
        const rpc = new rpc_1.default(socket);
        const result = await rpc.call("query", [
            (await parseJsonLdQuery(query)).map(util_1.quadToJSON),
            Array.isArray(domain) ? domain.map(util_1.fromId).map(util_1.toJSON) : null,
            Array.isArray(index) ? index.map(util_1.toTerm).map(util_1.toJSON) : null,
        ]);
        const first = Array.isArray(result) ? result.map(util_1.fromJSON).map(util_1.toId) : null;
        return new iterator_1.default(rpc, first, util_1.fromTerm);
    }
}
exports.default = Styx;
_openRPC = new WeakMap();
async function parseJsonLdQuery(input) {
    const base = `urn:uuid:${uuid_1.v4()}?`;
    const query = await jsonld_1.default.toRDF(input, {
        produceGeneralizedRdf: true,
        expandContext: { "?": base },
    });
    const quads = [];
    for (const quad of query) {
        quads.push(dataset_1.default.quad(util_1.variate(quad.subject, base), util_1.variate(quad.predicate, base), util_1.variate(quad.object, base), quad.graph ? util_1.variate(quad.graph, base) : dataset_1.default.defaultGraph()));
    }
    return quads;
}
;
window.jsonld = jsonld_1.default;
window.Styx = Styx;
//# sourceMappingURL=index.js.map