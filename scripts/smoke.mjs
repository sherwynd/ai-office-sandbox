// Checks a deployed copy: `node scripts/smoke.mjs staging|production`.
// Passes when / answers and /version reports the expected commit; retries for two minutes while the deploy settles.
const name = { staging: "STAGING_URL", production: "PRODUCTION_URL" }[process.argv[2]];
if (!name) throw new Error("Usage: node scripts/smoke.mjs staging|production");
const base = process.env[name];
const expected = process.env.EXPECTED_REVISION;
if (!base || !expected) throw new Error(`Set ${name} and EXPECTED_REVISION.`);

let problem = "";
for (let attempt = 1; attempt <= 12; attempt++) {
  try {
    const home = await fetch(new URL("/", base));
    const version = await fetch(new URL("/version", base));
    const body = version.ok ? await version.json() : {};
    if (!home.ok) problem = `/ answered ${home.status}`;
    else if (body.revision !== expected) problem = `/version reports ${body.revision ?? "no revision"}, expected ${expected}`;
    else { console.log(`${base} serves ${expected}.`); process.exit(0); }
  } catch (err) {
    problem = err.message;
  }
  console.log(`Attempt ${attempt}: ${problem}`);
  await new Promise((r) => setTimeout(r, 10_000));
}
throw new Error(`Smoke check failed: ${problem}`);
