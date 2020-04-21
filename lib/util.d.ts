import { NamedNode, BlankNode, Variable, Literal, DefaultGraph, Term, Quad } from "rdf-js";
export declare type N3Term = NamedNode | Literal | BlankNode | DefaultGraph;
export declare type JsonLdTerm = number | string | boolean | JsonLdId | JsonLdLiteral;
export declare type JsonLdId = {
    "@id": string;
};
export declare type JsonLdLiteral = {
    "@value": string;
    "@type"?: string;
    "@language"?: string;
};
export declare function isJsonLdId(node: BlankNode | Variable | JsonLdId): node is JsonLdId;
export declare function getJson(node: BlankNode | Variable | JsonLdId | string): variable | blankNode;
export declare function toTerm(term: JsonLdTerm): N3Term;
export declare function fromTerm(term: N3Term): JsonLdTerm;
export declare function fromId({ "@id": id }: JsonLdId): Variable | BlankNode;
export declare function toId(node: Variable | BlankNode): JsonLdId;
declare type quad = {
    subject: term;
    predicate: term;
    object: term;
    graph: term;
};
declare type term = namedNode | blankNode | literal | defaultGraph | variable;
declare type namedNode = {
    termType: "NamedNode";
    value: string;
};
declare type blankNode = {
    termType: "BlankNode";
    value: string;
};
declare type variable = {
    termType: "Variable";
    value: string;
};
declare type defaultGraph = {
    termType: "DefaultGraph";
};
declare type literal = {
    termType: "Literal";
    value: string;
    language: string;
    datatype: namedNode;
};
export declare function toJSON(term: Term): term;
export declare function fromJSON(term: term): Term;
export declare function quadToJSON(quad: Quad): quad;
export declare function quadFromJSON(quad: quad): Quad;
export declare function variate<T extends Term>(node: T, base: string): T | Variable;
export {};
