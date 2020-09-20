// deno run --allow-read=. --allow-net=0.0.0.0 ./framework/bin/serve.ts

const PORT = 3000;

import { serve } from "https://deno.land/std@0.69.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.69.0/http/file_server.ts";
const server = serve({ port: PORT });
console.log(`http://localhost:${PORT}`);

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

for await (const req of server) {
  const path = `${Deno.cwd()}${req.url}`;
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
