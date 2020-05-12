import jsonld from "jsonld"
import { JsonLd } from "jsonld/jsonld-spec"
import { Variable, Quad, DatasetCore, Term, BlankNode } from "rdf-js"
import { v4 as uuid } from "uuid"
import DataFactory from "@rdfjs/dataset"

import RPC from "./rpc"
import {
	N3Term,
	JsonLdId,
	JsonLdTerm,
	toTerm,
	fromTerm,
	fromId,
	toJSON,
	quadToJSON,
	fromJSON,
	variate,
	toId,
	quadFromJSON,
} from "./util"

// import I from "./iterator"
import I from "js-query-rpc"

export default class Styx {
	public host: string
	constructor(host: string) {
		this.host = host
	}

	async set(node: Term, dataset: DatasetCore | Quad[]): Promise<void> {
		let url
		if (!node || node.termType === "DefaultGraph") {
			url = "http://" + this.host
		} else if (node.termType === "NamedNode") {
			url = "http://" + this.host + "?" + node.value
		} else {
			throw new Error("Invalid node origin")
		}

		const quads = Array.from(dataset).map(quadToJSON)
		const res = await fetch(url, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(quads),
		})

		if (!res.ok) {
			console.error(await res.text())
			throw new Error(res.statusText)
		}
	}

	async setJsonLd(node: JsonLdId, dataset: JsonLd): Promise<void> {
		let url
		if (!node || !node["@id"]) {
			url = "http://" + this.host
		} else {
			url = "http://" + this.host + "?" + node["@id"]
		}

		const res = await fetch(url, {
			method: "PUT",
			headers: { "Content-Type": "application/ld+json" },
			body: JSON.stringify(dataset),
		})

		if (!res.ok) {
			console.error(await res.text())
			throw new Error(res.statusText)
		}
	}

	async get(node: Term): Promise<DatasetCore> {
		let url
		if (!node || node.termType === "DefaultGraph") {
			url = "http://" + this.host
		} else if (node.termType === "NamedNode") {
			url = "http://" + this.host + "?" + node.value
		} else {
			throw new Error("Invalid node origin")
		}

		const res = await fetch(url, {
			method: "GET",
			headers: { Accept: "application/json" },
		})

		if (!res.ok) {
			console.error(await res.text())
			throw new Error(res.statusText)
		}

		const json = await res.json()
		if (Array.isArray(json)) {
			const quads: Quad[] = []
			for (const quad of json) {
				quads.push(quadFromJSON(quad))
			}
			return DataFactory.dataset(quads)
		}

		return null
	}

	async getJsonLd(node: JsonLdId): Promise<JsonLd> {
		let url
		if (!node || !node["@id"]) {
			url = "http://" + this.host
		} else {
			url = "http://" + this.host + "?" + node["@id"]
		}

		const res = await fetch(url, {
			method: "GET",
			headers: { Accept: "application/ld+json" },
		})

		if (!res.ok) {
			console.error(await res.text())
			throw new Error(res.statusText)
		}

		return res.json()
	}

	async delete(node: Term) {
		let url: string
		if (!node || node.termType === "DefaultGraph") {
			url = "http://" + this.host
		} else if (node.termType === "NamedNode") {
			url = "http://" + this.host + "?" + node.value
		} else {
			throw new Error("Invalid term type")
		}

		const res = await fetch(url, { method: "DELETE" })
		if (!res.ok) {
			console.error(await res.text())
			throw new Error(res.statusText)
		}
	}

	async deleteJsonLd(node: JsonLdId): Promise<void> {
		let url: string
		if (!node || !node["@id"]) {
			url = "http://" + this.host
		} else if (
			node["@id"].slice(0, 2) !== "_:" &&
			node["@id"].slice(0, 2) !== "?:"
		) {
			url = "http://" + this.host + "?" + node["@id"]
		}

		const res = await fetch(url, { method: "DELETE" })
		if (!res.ok) {
			console.error(await res.text())
			throw new Error(res.statusText)
		}
	}

	async query(
		query: DatasetCore | Quad[],
		domain?: (Variable | BlankNode)[],
		index?: N3Term[]
	): Promise<I<BlankNode | Variable, Term>> {
		const socket = await this.#openRPC()
		const rpc = new RPC(socket)
		const result = await rpc.call("query", [
			Array.from(query).map(quadToJSON),
			Array.isArray(domain) ? domain.map(toJSON) : null,
			Array.isArray(index) ? index.map(toJSON) : null,
		])

		const first = Array.isArray(result) ? result.map(fromJSON) : null
		return new I(rpc, first as (Variable | BlankNode)[], fromJSON)
	}

	async queryJsonLd(
		query: object,
		domain?: JsonLdId[],
		index?: JsonLdTerm[]
	): Promise<I<JsonLdId, JsonLdTerm>> {
		const socket = await this.#openRPC()
		const rpc = new RPC(socket)
		const result = await rpc.call("query", [
			(await parseJsonLdQuery(query)).map(quadToJSON),
			Array.isArray(domain) ? domain.map(fromId).map(toJSON) : null,
			Array.isArray(index) ? index.map(toTerm).map(toJSON) : null,
		])

		const first = Array.isArray(result) ? result.map(fromJSON).map(toId) : null
		return new I(rpc, first, fromTerm)
	}

	#openRPC = (): Promise<WebSocket> =>
		new Promise((resolve, reject) => {
			console.log("opening websocket to", this.host)
			const socket = new WebSocket("ws://" + this.host, "rpc")
			socket.onerror = reject
			socket.onopen = (event) =>
				socket.readyState === WebSocket.OPEN ? resolve(socket) : reject(event)
		})
}

async function parseJsonLdQuery(input: JsonLd): Promise<Quad[]> {
	const base = `urn:uuid:${uuid()}?`

	const query = await jsonld.toRDF(input, {
		produceGeneralizedRdf: true,
		expandContext: { "?": base },
	})

	const quads: Quad[] = []
	for (const quad of query as Quad[]) {
		quads.push(
			DataFactory.quad(
				variate(quad.subject, base),
				variate(quad.predicate, base),
				variate(quad.object, base),
				quad.graph ? variate(quad.graph, base) : DataFactory.defaultGraph()
			)
		)
	}

	return quads
}

;(window as any).jsonld = jsonld
;(window as any).Styx = Styx
