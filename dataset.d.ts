declare module "@rdfjs/dataset" {
	import { DataFactory, DatasetCoreFactory } from "rdf-js"
	const Dataset: DatasetCoreFactory & DataFactory
	export default Dataset
}
