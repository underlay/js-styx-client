import { Variable, Term, BlankNode } from "rdf-js"

import RPC from "./rpc"
import { JsonLdId, JsonLdTerm, getJson } from "./util"

export default class I<
	T extends JsonLdId | Variable | BlankNode,
	R extends JsonLdTerm | Term
> implements AsyncIterableIterator<Map<T, R>> {
	#rpc: RPC
	#domain: T[]
	#index: Map<T, R>
	#getValue: (_: any) => R
	constructor(rpc: RPC, domain: T[], getValue: (value: any) => R) {
		this.#rpc = rpc
		this.#domain = domain
		this.#index = new Map()
		this.#getValue = getValue
	}

	[Symbol.asyncIterator] = () => this

	close() {
		this.#rpc.close()
	}

	keys(): IterableIterator<T> {
		if (this.#domain === null) return [].values()
		return this.#domain.values()
	}

	values(): IterableIterator<R> {
		if (this.#domain === null) return [].values()
		return this.#index.values()
	}

	entries(): IterableIterator<[T, R]> {
		if (this.#domain === null) return [].values()
		return this.#index.entries()
	}

	async next(node?: T): Promise<IteratorResult<Map<T, R>, null>> {
		if (this.#domain === null) return { done: true, value: null }
		const params = node === undefined ? [] : [getJson(node)]
		const next = await this.#rpc.call("next", params)
		if (next === null) {
			this.#index = new Map()
			return { done: true, value: null }
		} else if (Array.isArray(next)) {
			const delta = new Map(
				this.#domain
					.slice(-next.length)
					.map((d, i) => [d, this.#getValue(next[i])])
			)

			for (const [key, val] of delta) {
				this.#index.set(key, val)
			}

			return { done: false, value: delta }
		}
	}

	async seek(index?: (JsonLdTerm | Term)[]) {
		if (this.#domain === null) return
		const params = Array.isArray(index) ? [index.map(getJson)] : []
		await this.#rpc.call("seek", params)
	}
}
