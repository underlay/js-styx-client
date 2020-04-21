import jsonrpc, { RpcStatusType, Defined } from "jsonrpc-lite"
import EventIterator, { subscribe } from "event-iterator/lib/dom"

export default class RPC {
	#iterator: AsyncIterator<MessageEvent>
	#socket: WebSocket
	#id: number

	constructor(socket: WebSocket) {
		this.#socket = socket
		this.#id = 0
		const iterable: EventIterator<MessageEvent> = subscribe.call(
			socket,
			"message"
		)
		this.#iterator = iterable[Symbol.asyncIterator]()
	}

	close() {
		this.#socket.close(1000)
	}

	async call(method: string, params: Defined[]): Promise<Defined> {
		const request = jsonrpc.request(this.#id++, method, params)
		const message = JSON.stringify(request)
		this.#socket.send(message)
		const response = await this.#iterator.next()
		if (response.done) {
			console.error(response.value)
			throw new Error("Iterator ended unexpectedly")
		}

		const result = jsonrpc.parse(response.value.data)
		if (Array.isArray(result)) {
			console.error(result)
			throw new Error("Unexpected batch result")
		}

		if (result.type === RpcStatusType.notification) {
			console.log(result.payload)
		} else if (result.type === RpcStatusType.invalid) {
			console.error(result.payload)
			throw new Error("Invalid RPC message")
		} else if (result.type === RpcStatusType.error) {
			console.error(result.payload)
			throw new Error("Recieved RPC error")
		} else if (result.type === RpcStatusType.request) {
			console.error(result.payload)
			throw new Error("Unexpected request")
		} else if (result.type === RpcStatusType.success) {
			return result.payload.result
		}
	}
}
