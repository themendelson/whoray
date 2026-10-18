declare module "cloudflare:sockets" {
  interface Socket {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
    opened: Promise<unknown>;
  }
  export function connect(address: { hostname: string; port: number }): Socket;
}
