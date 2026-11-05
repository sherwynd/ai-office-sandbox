// Deploys the current commit to Vercel: `node scripts/deploy.mjs staging|production`.
// Staging and production are separate Vercel projects, so a staging deploy can never replace production.
// The commit is passed to the app as REVISION, which /version reports for the smoke check.
import { execFileSync } from "node:child_process";

const projects = {
  staging: process.env.VERCEL_STAGING_PROJECT || "ai-office-sandbox-staging",
  production: process.env.VERCEL_PRODUCTION_PROJECT || "ai-office-sandbox",
};
const project = projects[process.argv[2]];
if (!project) throw new Error("Usage: node scripts/deploy.mjs staging|production");
const revision = process.env.EXPECTED_REVISION || process.env.GITHUB_SHA;
if (!/^[a-f0-9]{40}$/.test(revision ?? "")) throw new Error("Set EXPECTED_REVISION to the full commit being deployed.");
if (!process.env.VERCEL_TOKEN) throw new Error("Set VERCEL_TOKEN in this GitHub environment.");

execFileSync("npx", ["--yes", "vercel@64.7.0", "deploy", "--prod", "--yes", "--project", project, "--create-if-missing",
  "--env", `REVISION=${revision}`, "--token", process.env.VERCEL_TOKEN], { stdio: "inherit" });
