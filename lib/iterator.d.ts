import { Variable, Term, BlankNode } from "rdf-js";
import RPC from "./rpc";
import { JsonLdId, JsonLdTerm } from "./util";
export default class I<T extends JsonLdId | Variable | BlankNode, R extends JsonLdTerm | Term> implements AsyncIterableIterator<Map<T, R>> {
    #private;
    constructor(rpc: RPC, domain: T[], getValue: (value: any) => R);
    [Symbol.asyncIterator]: () => this;
    close(): void;
    keys(): IterableIterator<T>;
    values(): IterableIterator<R>;
    entries(): IterableIterator<[T, R]>;
    next(node?: T): Promise<IteratorResult<Map<T, R>, null>>;
    seek(index?: (JsonLdTerm | Term)[]): Promise<void>;
}
