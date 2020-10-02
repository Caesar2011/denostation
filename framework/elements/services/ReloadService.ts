export class ReloadService {
  constructor(backendUrl: string) {
    const webSocket = new WebSocket(backendUrl);
    webSocket.onmessage = function(this: WebSocket, ev: MessageEvent): void {
      console.log("WEBSOCKET", ev);
      if (ev && ev.data === "Update") {
        window.location.reload();
      }
    }
  }
}
