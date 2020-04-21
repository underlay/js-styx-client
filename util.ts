import DataFactory from "@rdfjs/dataset"

import {
	NamedNode,
	BlankNode,
	Variable,
	Literal,
	DefaultGraph,
	Term,
	Quad,
	Quad_Subject,
	Quad_Predicate,
	Quad_Object,
	Quad_Graph,
} from "rdf-js"

const boolean = DataFactory.namedNode(
	"http://www.w3.org/2001/XMLSchema#boolean"
)
const string = DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#string")
const integer = DataFactory.namedNode(
	"http://www.w3.org/2001/XMLSchema#integer"
)
const double = DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#double")

export type N3Term = NamedNode | Literal | BlankNode | DefaultGraph
export type JsonLdTerm = number | string | boolean | JsonLdId | JsonLdLiteral

export type JsonLdId = { "@id": string }
export type JsonLdLiteral = {
	"@value": string
	"@type"?: string
	"@language"?: string
}

export function isJsonLdId(
	node: BlankNode | Variable | JsonLdId
): node is JsonLdId {
	return node.hasOwnProperty("@id")
}

export function getJson(
	node: BlankNode | Variable | JsonLdId | string
): variable | blankNode {
	if (typeof node === "string") {
		return idToJson(node)
	} else if (isJsonLdId(node)) {
		return idToJson(node["@id"])
	}

	const { termType, value } = node
	return { termType, value }
}

export function toTerm(term: JsonLdTerm): N3Term {
	if (typeof term === "string") {
		return DataFactory.literal(term, string)
	} else if (typeof term === "boolean") {
		return DataFactory.literal(term ? "true" : "false", boolean)
	} else if (typeof term === "number") {
		const value = term.toString(10)
		const datatype = value.indexOf(".") === -1 ? integer : double
		return DataFactory.literal(value, datatype)
	} else if (typeof term === "object") {
		if (isObjectLiteral(term)) {
			if (typeof term["@language"] === "string") {
				return DataFactory.literal(term["@value"], term["@language"])
			} else {
				const datatype = DataFactory.namedNode(term["@language"])
				return DataFactory.literal(term["@value"], datatype)
			}
		} else {
			if (term["@id"].slice(0, 2) === "_:") {
				return DataFactory.blankNode(term["@id"])
			} else {
				return DataFactory.namedNode(term["@id"])
			}
		}
	}
}

function idToJson(id: string): blankNode | variable {
	if (id.slice(0, 2) === "_:") {
		return { termType: "BlankNode", value: id }
	} else if (id[0] === "?") {
		return { termType: "Variable", value: id }
	} else {
		return null
	}
}

export function fromTerm(term: N3Term): JsonLdTerm {
	if (term.termType === "NamedNode") {
		return { "@id": term.value }
	} else if (term.termType === "BlankNode") {
		return { "@id": "_:" + term.value }
	} else if (term.termType === "Literal") {
		if (
			term.datatype === undefined ||
			term.datatype === null ||
			string.equals(term.datatype)
		) {
			return term.value
		} else if (integer.equals(term.datatype)) {
			return parseInt(term.value)
		} else if (double.equals(term.datatype)) {
			return parseFloat(term.value)
		} else if (
			boolean.equals(term.datatype) &&
			(term.value === "true" || term.value === "false")
		) {
			return term.value === "true"
		} else {
			return {
				"@value": term.value,
				"@type": term.datatype.value,
			}
		}
	} else {
		console.error("Invalid term", term)
	}
}

function isObjectLiteral(
	term: JsonLdId | JsonLdLiteral
): term is JsonLdLiteral {
	return term.hasOwnProperty("@value")
}

export function fromId({ "@id": id }: JsonLdId): Variable | BlankNode {
	if (id.slice(0, 2) === "_:") {
		return DataFactory.blankNode(id.slice(2))
	} else if (id.slice(0, 2) === "?:") {
		return DataFactory.variable(id.slice(2))
	}
}

export function toId(node: Variable | BlankNode): JsonLdId {
	if (node.termType === "BlankNode") {
		return { "@id": "_:" + node.value }
	} else if (node.termType === "Variable") {
		return { "@id": "?:" + node.value }
	}
}

type quad = { subject: term; predicate: term; object: term; graph: term }
type term = namedNode | blankNode | literal | defaultGraph | variable
type namedNode = { termType: "NamedNode"; value: string }
type blankNode = { termType: "BlankNode"; value: string }
type variable = { termType: "Variable"; value: string }
type defaultGraph = { termType: "DefaultGraph" }
type literal = {
	termType: "Literal"
	value: string
	language: string
	datatype: namedNode
}

export function toJSON(term: Term): term {
	if (term.termType === "Literal") {
		return {
			termType: term.termType,
			value: term.value,
			language: term.language,
			datatype: {
				termType: term.datatype.termType,
				value: term.datatype.value,
			},
		}
	} else if (term.termType === "DefaultGraph") {
		return { termType: term.termType }
	} else {
		return { termType: term.termType, value: term.value }
	}
}

export function fromJSON(term: term): Term {
	if (term.termType === "NamedNode") {
		return DataFactory.namedNode(term.value)
	} else if (term.termType === "BlankNode") {
		return DataFactory.blankNode(term.value)
	} else if (term.termType === "Literal") {
		if (term.language !== "") {
			return DataFactory.literal(term.value, term.language)
		} else if (term.datatype === null || term.datatype === undefined) {
			return DataFactory.literal(term.value)
		} else {
			return DataFactory.literal(
				term.value,
				DataFactory.namedNode(term.datatype.value)
			)
		}
	} else if (term.termType === "DefaultGraph") {
		return DataFactory.defaultGraph()
	} else if (term.termType === "Variable") {
		return DataFactory.variable(term.value)
	}
}

export function quadToJSON(quad: Quad): quad {
	return {
		subject: toJSON(quad.subject),
		predicate: toJSON(quad.predicate),
		object: toJSON(quad.object),
		graph: toJSON(quad.graph),
	}
}

export function quadFromJSON(quad: quad): Quad {
	return DataFactory.quad(
		fromJSON(quad.subject) as Quad_Subject,
		fromJSON(quad.predicate) as Quad_Predicate,
		fromJSON(quad.object) as Quad_Object,
		fromJSON(quad.graph) as Quad_Graph
	)
}

export function variate<T extends Term>(node: T, base: string): T | Variable {
	if (!node || isDefaultGraph(node)) {
		return DataFactory.defaultGraph() as T
	} else if (isNamedNode(node)) {
		if (node.value.length > base.length && node.value.indexOf(base) === 0) {
			return DataFactory.variable(node.value.slice(base.length))
		} else {
			return DataFactory.namedNode(node.value) as T
		}
	} else if (isBlankNode(node)) {
		return DataFactory.blankNode(node.value.slice(2)) as T
	} else if (isLiteral(node)) {
		if (
			node.datatype === undefined ||
			node.datatype === null ||
			string.equals(node.datatype)
		) {
			return DataFactory.literal(node.value) as T
		} else if (node.language !== "") {
			return DataFactory.literal(node.value, node.language) as T
		} else {
			return DataFactory.literal(node.value, node.datatype) as T
		}
	}
}

const isNamedNode = (node: Term): node is NamedNode =>
	node.termType === "NamedNode"
const isBlankNode = (node: Term): node is BlankNode =>
	node.termType === "BlankNode"
const isLiteral = (node: Term): node is Literal => node.termType === "Literal"
const isDefaultGraph = (node: Term): node is DefaultGraph =>
	node.termType === "DefaultGraph"
const isVariable = (node: Term): node is Variable =>
	node.termType === "Variable"
