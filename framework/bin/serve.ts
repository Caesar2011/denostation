// deno run --allow-read=. --allow-net=0.0.0.0 ./framework/bin/serve.ts

import { serve } from "https://deno.land/std@0.72.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.72.0/http/file_server.ts";
import {resolve} from "../utils/path.ts";
import {
  acceptWebSocket,
  WebSocket,
} from "https://deno.land/std@0.72.0/ws/mod.ts";

async function fileExists(path: string) {
  try {
    const stats = await Deno.lstat(path);
    return stats && stats.isFile;
  } catch(e) {
    if (e && e instanceof Deno.errors.NotFound) {
      return false;
    } else {
      throw e;
    }
  }
}

export async function stationServe(port: number, outFolder: string, pushChangeCallback?: (cb: () => void) => void) {
  const server = serve({ port: port });
  console.log(`http://localhost:${port}`);

  if (pushChangeCallback) {
    const port = 8080;
    const sockets: WebSocket[] = [];
    console.log(`websocket server is running on :${port}`);
    (async () => {
      for await (const req of serve(`:${port}`)) {
        const {conn, r: bufReader, w: bufWriter, headers} = req;
        sockets.push(await acceptWebSocket({
          conn,
          bufReader,
          bufWriter,
          headers,
        }));
      }
    })().catch(err => {console.error(err); Deno.exit(1)});
    pushChangeCallback(() => sockets.filter(sock => {
      if (sock.isClosed) return false;
      sock.send("Update");
      return true;
    }));
  }

  for await (const req of server) {
    let uri = req.url.substr(1);
    const path = resolve(Deno.cwd(), outFolder, uri);
    if (await fileExists(path)) {
      const content = await serveFile(req, path);
      req.respond(content);
    } else if (await fileExists(`${path}/index.html`)) {
      const content = await serveFile(req, `${path}/index.html`);
      req.respond(content);
    } else {
      req.respond({status: 404});
    }
  }
}

