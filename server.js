import { createServer } from "node:http";

export function handler(req, res) {
  if (req.url === "/") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("Hello from the AI Office sandbox");
    return;
  }
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("Not found");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer(handler).listen(process.env.PORT ?? 3000);
}
