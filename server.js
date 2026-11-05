import { createServer } from "node:http";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url)));

export function handler(req, res) {
  if (req.url === "/") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("Hello from the AI Office sandbox");
    return;
  }
  if (req.url === "/version") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ version, revision: process.env.REVISION ?? null }));
    return;
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("Not found");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer(handler).listen(process.env.PORT ?? 3000);
}
