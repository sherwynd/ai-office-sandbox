import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { handler } from "./server.js";

async function get(path) {
  const server = createServer(handler).listen(0);
  const { port } = server.address();
  try {
    const res = await fetch(`http://localhost:${port}${path}`);
    return { status: res.status, type: res.headers.get("content-type"), body: await res.text() };
  } finally {
    server.close();
  }
}

test("GET / says hello", async () => {
  const { status, body } = await get("/");
  assert.equal(status, 200);
  assert.match(body, /Hello/);
});

test("GET /version returns the package.json version and deployed revision as JSON", async () => {
  const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url)));
  const { status, type, body } = await get("/version");
  assert.equal(status, 200);
  assert.equal(type, "application/json");
  assert.deepEqual(JSON.parse(body), { version, revision: process.env.REVISION ?? null });
});

test("GET /tip serves the calculator page (AC-1)", async () => {
  const { status, type, body } = await get("/tip");
  assert.equal(status, 200);
  assert.match(type, /^text\/html/);
  for (const text of ['id="bill"', 'value="10"', 'value="15"', 'value="20"', 'id="custom"', 'id="people"']) {
    assert.ok(body.includes(text), text);
  }
});

test("GET /tip.js serves the shared calculation", async () => {
  const { status, type, body } = await get("/tip.js");
  assert.equal(status, 200);
  assert.match(type, /^text\/javascript/);
  assert.match(body, /export function calculateTip/);
});

test("vercel.json uploads the files server.js reads at load", () => {
  const config = JSON.parse(readFileSync(new URL("./vercel.json", import.meta.url)));
  const include = config.functions["api/index.js"].includeFiles;
  for (const file of ["package.json", "tip.html", "tip.js"]) assert.ok(include.includes(file), file);
});

test("unknown paths return 404", async () => {
  assert.equal((await get("/nope")).status, 404);
});
