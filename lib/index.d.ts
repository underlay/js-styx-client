import { JsonLd } from "jsonld/jsonld-spec";
import { Variable, Quad, DatasetCore, Term, BlankNode } from "rdf-js";
import { N3Term, JsonLdId, JsonLdTerm } from "./util";
import I from "js-query-rpc";
export default class Styx {
    #private;
    host: string;
    constructor(host: string);
    set(node: Term, dataset: DatasetCore | Quad[]): Promise<void>;
    setJsonLd(node: JsonLdId, dataset: JsonLd): Promise<void>;
    get(node: Term): Promise<DatasetCore>;
    getJsonLd(node: JsonLdId): Promise<JsonLd>;
    delete(node: Term): Promise<void>;
    deleteJsonLd(node: JsonLdId): Promise<void>;
    query(query: DatasetCore | Quad[], domain?: (Variable | BlankNode)[], index?: N3Term[]): Promise<I<BlankNode | Variable, Term>>;
    queryJsonLd(query: object, domain?: JsonLdId[], index?: JsonLdTerm[]): Promise<I<JsonLdId, JsonLdTerm>>;
}
