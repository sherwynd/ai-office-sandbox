import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { handler } from "./server.js";

async function get(path) {
  const server = createServer(handler).listen(0);
  const { port } = server.address();
  try {
    const res = await fetch(`http://localhost:${port}${path}`);
    return {
      status: res.status,
      contentType: res.headers.get("content-type"),
      body: await res.text(),
    };
  } finally {
    server.close();
  }
}

test("GET / says hello", async () => {
  const { status, body } = await get("/");
  assert.equal(status, 200);
  assert.match(body, /Hello/);
});

test("GET /health returns ok", async () => {
  const { status, contentType, body } = await get("/health");
  assert.equal(status, 200);
  assert.equal(contentType, "text/plain");
  assert.equal(body, "ok");
});

test("unknown paths return 404", async () => {
  const { status, body } = await get("/nope");
  assert.equal(status, 404);
  assert.equal(body, "Not found");
});
