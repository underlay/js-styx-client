import { Defined } from "jsonrpc-lite";
export default class RPC {
    #private;
    constructor(socket: WebSocket);
    close(): void;
    call(method: string, params: Defined[]): Promise<Defined>;
}
