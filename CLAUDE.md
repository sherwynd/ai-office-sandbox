# ai-office-sandbox

A tiny Node.js (ESM, no dependencies) HTTP server used to test AI Office workers.

- Run: `npm start` · Test: `npm test` (Node's built-in test runner)
- Routes live in `handler` in `server.js`; add a test in `server.test.js` for every route.
- Deployed by `.github/workflows/ai-staging.yml` (staging) and `ai-production.yml` (production) through
  `scripts/deploy.mjs`; `/version` also reports the deployed commit as `revision`. There is no database.

## Lessons

- Restrict what a text box accepts at input time with a pure, unit-tested filter, and never let a focus outline stack on top of an error border (#7)
