"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dataset_1 = __importDefault(require("@rdfjs/dataset"));
const boolean = dataset_1.default.namedNode("http://www.w3.org/2001/XMLSchema#boolean");
const string = dataset_1.default.namedNode("http://www.w3.org/2001/XMLSchema#string");
const integer = dataset_1.default.namedNode("http://www.w3.org/2001/XMLSchema#integer");
const double = dataset_1.default.namedNode("http://www.w3.org/2001/XMLSchema#double");
function isJsonLdId(node) {
    return node.hasOwnProperty("@id");
}
exports.isJsonLdId = isJsonLdId;
function getJson(node) {
    if (typeof node === "string") {
        return idToJson(node);
    }
    else if (isJsonLdId(node)) {
        return idToJson(node["@id"]);
    }
    const { termType, value } = node;
    return { termType, value };
}
exports.getJson = getJson;
function toTerm(term) {
    if (typeof term === "string") {
        return dataset_1.default.literal(term, string);
    }
    else if (typeof term === "boolean") {
        return dataset_1.default.literal(term ? "true" : "false", boolean);
    }
    else if (typeof term === "number") {
        const value = term.toString(10);
        const datatype = value.indexOf(".") === -1 ? integer : double;
        return dataset_1.default.literal(value, datatype);
    }
    else if (typeof term === "object") {
        if (isObjectLiteral(term)) {
            if (typeof term["@language"] === "string") {
                return dataset_1.default.literal(term["@value"], term["@language"]);
            }
            else {
                const datatype = dataset_1.default.namedNode(term["@language"]);
                return dataset_1.default.literal(term["@value"], datatype);
            }
        }
        else {
            if (term["@id"].slice(0, 2) === "_:") {
                return dataset_1.default.blankNode(term["@id"]);
            }
            else {
                return dataset_1.default.namedNode(term["@id"]);
            }
        }
    }
}
exports.toTerm = toTerm;
function idToJson(id) {
    if (id.slice(0, 2) === "_:") {
        return { termType: "BlankNode", value: id };
    }
    else if (id[0] === "?") {
        return { termType: "Variable", value: id };
    }
    else {
        return null;
    }
}
function fromTerm(term) {
    if (term.termType === "NamedNode") {
        return { "@id": term.value };
    }
    else if (term.termType === "BlankNode") {
        return { "@id": "_:" + term.value };
    }
    else if (term.termType === "Literal") {
        if (term.datatype === undefined ||
            term.datatype === null ||
            string.equals(term.datatype)) {
            return term.value;
        }
        else if (integer.equals(term.datatype)) {
            return parseInt(term.value);
        }
        else if (double.equals(term.datatype)) {
            return parseFloat(term.value);
        }
        else if (boolean.equals(term.datatype) &&
            (term.value === "true" || term.value === "false")) {
            return term.value === "true";
        }
        else {
            return {
                "@value": term.value,
                "@type": term.datatype.value,
            };
        }
    }
    else {
        console.error("Invalid term", term);
    }
}
exports.fromTerm = fromTerm;
function isObjectLiteral(term) {
    return term.hasOwnProperty("@value");
}
function fromId({ "@id": id }) {
    if (id.slice(0, 2) === "_:") {
        return dataset_1.default.blankNode(id.slice(2));
    }
    else if (id.slice(0, 2) === "?:") {
        return dataset_1.default.variable(id.slice(2));
    }
}
exports.fromId = fromId;
function toId(node) {
    if (node.termType === "BlankNode") {
        return { "@id": "_:" + node.value };
    }
    else if (node.termType === "Variable") {
        return { "@id": "?:" + node.value };
    }
}
exports.toId = toId;
function toJSON(term) {
    if (term.termType === "Literal") {
        return {
            termType: term.termType,
            value: term.value,
            language: term.language,
            datatype: {
                termType: term.datatype.termType,
                value: term.datatype.value,
            },
        };
    }
    else if (term.termType === "DefaultGraph") {
        return { termType: term.termType };
    }
    else {
        return { termType: term.termType, value: term.value };
    }
}
exports.toJSON = toJSON;
function fromJSON(term) {
    if (term.termType === "NamedNode") {
        return dataset_1.default.namedNode(term.value);
    }
    else if (term.termType === "BlankNode") {
        return dataset_1.default.blankNode(term.value);
    }
    else if (term.termType === "Literal") {
        if (term.language !== "") {
            return dataset_1.default.literal(term.value, term.language);
        }
        else if (term.datatype === null || term.datatype === undefined) {
            return dataset_1.default.literal(term.value);
        }
        else {
            return dataset_1.default.literal(term.value, dataset_1.default.namedNode(term.datatype.value));
        }
    }
    else if (term.termType === "DefaultGraph") {
        return dataset_1.default.defaultGraph();
    }
    else if (term.termType === "Variable") {
        return dataset_1.default.variable(term.value);
    }
}
exports.fromJSON = fromJSON;
function quadToJSON(quad) {
    return {
        subject: toJSON(quad.subject),
        predicate: toJSON(quad.predicate),
        object: toJSON(quad.object),
        graph: toJSON(quad.graph),
    };
}
exports.quadToJSON = quadToJSON;
function quadFromJSON(quad) {
    return dataset_1.default.quad(fromJSON(quad.subject), fromJSON(quad.predicate), fromJSON(quad.object), fromJSON(quad.graph));
}
exports.quadFromJSON = quadFromJSON;
function variate(node, base) {
    if (!node || isDefaultGraph(node)) {
        return dataset_1.default.defaultGraph();
    }
    else if (isNamedNode(node)) {
        if (node.value.length > base.length && node.value.indexOf(base) === 0) {
            return dataset_1.default.variable(node.value.slice(base.length));
        }
        else {
            return dataset_1.default.namedNode(node.value);
        }
    }
    else if (isBlankNode(node)) {
        return dataset_1.default.blankNode(node.value.slice(2));
    }
    else if (isLiteral(node)) {
        if (node.datatype === undefined ||
            node.datatype === null ||
            string.equals(node.datatype)) {
            return dataset_1.default.literal(node.value);
        }
        else if (node.language !== "") {
            return dataset_1.default.literal(node.value, node.language);
        }
        else {
            return dataset_1.default.literal(node.value, node.datatype);
        }
    }
}
exports.variate = variate;
const isNamedNode = (node) => node.termType === "NamedNode";
const isBlankNode = (node) => node.termType === "BlankNode";
const isLiteral = (node) => node.termType === "Literal";
const isDefaultGraph = (node) => node.termType === "DefaultGraph";
const isVariable = (node) => node.termType === "Variable";
//# sourceMappingURL=util.js.map