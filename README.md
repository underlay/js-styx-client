# js-styx-client

> JavaScript Client for Styx

```javascript
import Styx from "styx-client"

const styx = new Styx("localhost:8086")
```

[Styx](https://github.com/underlay/styx) is an experimental RDF database, written in Go. It works like a key/value store, where the keys are RDF IRI terms and the values are RDF Datasets, and it also exposes a query interface for iterating over all the subgraphs (across all datasets) that match a given pattern.

For example, you can set two datasets like

```javascript
await styx.setJsonLd(
	{ "@id": "http://example.com/d1" },
	{
		"@context": { "@vocab": "http://schema.org/" },
		"@id": "http://people.com/john-doe",
		givenName: "John",
		children: { "@id": "http://people.com/jack-doe" },
	}
)

await styx.setJsonLd(
	{ "@id": "http://example.com/d2" },
	{
		"@context": { "@vocab": "http://schema.org/" },
		"@id": "http://people.com/john-doe",
		familyName: "Doe",
		children: { "@id": "http://people.com/jill-doe" },
	}
)
```

and then query over their union:

```javascript
const iter = await styx.queryJsonLd({
	"@context": { "@vocab": "http://schema.org/" },
	"@id": "http://people.com/john-doe",
	givenName: {},
	familyName: {},
	children: {},
})

console.log(Array.from(iter.keys()))
// [{ "@id" : "_:b0" }, { "@id": "_:b1" }, { "@id": "_:b2" }]

for await (const _ of iter) {
	console.log(Array.from(iter.values()))
	// [{ "@id": "http://people.com/jack-doe" }, "Doe", "John"]
	// [{ "@id":" http://people.com/jill-doe" }, "Doe", "John"]
}
```

The iterator `iter` here is very powerful. It yields all the matching subgraphs in a total order, and will let you seek directly to a given subgraph and start iterating from there. It also will let you seek the first subgraph after a partially assigned subgraph, or jump to the next subgraph that differs in a given variable!

## API

There are two prominent ways of representing RDF in JavaScript: [JSON-LD](https://json-ld.org/) and [RDFJS](http://rdf.js.org/).

Styx needs represent RDF datasets, but it also needs to pass around RDF terms individually (i.e. IRIs, literal values, blank nodes, ...), detached from any dataset.

JSON-LD isn't quite intended to be used in this way, but we can still do it without ambiguity as long as we use the fully expanded form of every value. This means using `{ "@id": "http://example.com" }` for IRIs, `{ "@id": "_:b0" }` for blank nodes (which must be explicitly labelled, i.e. `{ }` is not allowed), and strings, booleans, numbers, or `{ "@value": "...", "@type": "http://..." }` object values for literals.

RDFJS is a much more consistent (and much more verbose) JSON-based representation defined [here](http://rdf.js.org/data-model-spec/) and implemented [here](https://github.com/rdfjs-base/data-model).

| JSON-LD                                                  | RDFJS                                                                                                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `{ "@id": "http://example.com" }`                        | `{ termType: "NamedNode", value: "http://example.com" }`                                                                                                     |
| `{ "@id": "_:b0" }`                                      | `{ termType: "BlankNode", value: "b0" }`                                                                                                                     |
| `{ "@id": "?:v0" }`                                      | `{ termType: "Variable", value: "v0" }`                                                                                                                      |
| `"Hello world"`                                          | `{ termType: "Literal", value: "Hello World" }`                                                                                                              |
| `true`                                                   | `{ termType: "Literal", value: "true", datatype: { termType: "NamedNode", value: "http://www.w3.org/2001/XMLSchema#boolean" } }`                             |
| `-4`                                                     | `{ termType: "Literal", value: "-4", datatype: { termType: "NamedNode", value: "http://www.w3.org/2001/XMLSchema#integer" } }`                               |
| `3.14`                                                   | `{ termType: "Literal", value: "3.14", datatype: { termType: "NamedNode", value: "http://www.w3.org/2001/XMLSchema#double" } }`                              |
| `{ "@value": "foo", "@type": "http://example.com/bar" }` | `{ termType: "Literal", value: "foo", datatype: { termType: "NamedNode", value: "http://example.com/bar" } }`                                                |
| `{ "@value": "bar", "@language": "en" }`                 | `{ termType: "Literal", value: "bar", language: "en", datatype: { termType: "NamedNode", value: "http://www.w3.org/1999/02/22-rdf-syntax-ns#langString" } }` |

RDFJS is better suited for some use cases (such as interfacing with other RDF tools like [n3.js](https://github.com/rdfjs/N3.js), [graphy.js](https://github.com/blake-regalia/graphy.js), or [rdf-cytoscape](https://github.com/underlay/rdf-cytoscape)), and JSON-LD is better suited for other use cases (such as reading and writing by humans, or as a serialization target).

A `Styx` instance exposes **both a JSON-LD and an RDFJS interface**. For example, if you want to insert a dataset, you can either use:

```javascript
await styx.setJsonLd(
	{ "@id": "http://example.com/d1" },
	{
		"@context": {
			"@vocab": "http://schema.org/",
			xsd: "http://www.w3.org/2001/XMLSchema#",
		},
		"@type": "Person",
		name: "John Doe",
		birthDate: { "@value": "1995-01-01", "@type": "xsd:date" },
	}
)
```

... or you can use:

```javascript
import DataFactory from "@rdfjs/data-model"

await styx.set(DataFactory.namedNode("http://example.com/d1"), [
	DataFactory.quad(
		DataFactory.blankNode("b0"),
		DataFactory.namedNode("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"),
		DataFactory.namedNode("http://schema.org/Person")
	),
	DataFactory.quad(
		DataFactory.blankNode("b0"),
		DataFactory.namedNode("http://schema.org/name"),
		DataFactory.literal("John Doe")
	),
	DataFactory.quad(
		DataFactory.blankNode("b0"),
		DataFactory.namedNode("http://schema.org/birthDate"),
		DataFactory.literal(
			"1995-01-01",
			DataFactory.namedNode("http://www.w3.org/2001/XMLSchema#date")
		)
	),
])
```

or equivalently, without the `DataFactory` constructors:

```javascript
import DataFactory from "@rdfjs/data-model"

await styx.set({ termType: "NamedNode", value: "http://example.com/d1" }, [
	{
		subject: { termType: "BlankNode", value: "b0" },
		predicate: {
			termType: "NamedNode",
			value: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
		},
		object: { termType: "NamedNode", value: "http://schema.org/Person" },
		graph: { termType: "DefaultGraph" },
	},
	{
		subject: { termType: "BlankNode", value: "b0" },
		predicate: { termType: "NamedNode", value: "http://schema.org/name" },
		object: { termType: "Literal", value: "John Doe" },
		graph: { termType: "DefaultGraph" },
	},
	{
		subject: { termType: "BlankNode", value: "b0" },
		predicate: { termType: "NamedNode", value: "http://schema.org/birthDate" },
		object: {
			termType: "Literal",
			value: "1995-01-01",
			datatype: {
				termType: "NamedNode",
				value: "http://www.w3.org/2001/XMLSchema#date",
			},
		},
		graph: { termType: "DefaultGraph" },
	},
])
```

Note that the keys that datasets are inserted under are IRI RDF _terms_, so they're represented `{ "@id": "http://example.com/d1" }` or `{ termType: "NamedNode", value: "http://example.com/d1" }`, not as strings.
