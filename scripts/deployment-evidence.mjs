// Shared by the hub and the production workflow. No database credentials or third-party packages are needed.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

/** @param {Array<{conclusion?: string | null, steps?: Array<{name: string, number?: number, conclusion?: string | null}>}>} jobs */
export function hasStagingMigrationEvidence(jobs) {
  return jobs.some((job) => {
    if (job.conclusion !== "success") return false;
    const migration = job.steps?.find((s) => s.name === "Migrate staging database" && s.conclusion === "success");
    const deploy = job.steps?.find((s) => s.name === "Deploy staging" && s.conclusion === "success");
    const verify = job.steps?.find((s) => s.name === "Verify staging" && s.conclusion === "success");
    return Boolean(migration?.number && deploy?.number && verify?.number && migration.number < deploy.number && deploy.number < verify.number);
  });
}

/**
 * Verify the exact merged release and fresh staging migration/deployment evidence, without mutating anything.
 * @param {{event: any, repository: string, productionBranch: string, stagingBranch: string, stagingWorkflow: string, stagingEnvironment: string, stagingUrl: string}} input
 * @param {(path: string) => Promise<any>} api
 */
export async function verifyApprovedRelease(input, api) {
  const pr = input.event?.pull_request;
  const sha = pr?.head?.sha;
  if (!pr?.merged || !/^[a-f0-9]{40}$/.test(sha ?? "") || pr.head.ref !== `ai/release-${sha}` ||
      pr.head.repo?.full_name !== input.repository || pr.base?.ref !== input.productionBranch) {
    throw new Error("This is not a merged, approved AI Office release for this repository and production branch.");
  }
  return verifyStagingRevision({ ...input, sha }, api);
}

/**
 * @param {{sha: string, repository: string, stagingBranch: string, stagingWorkflow: string, stagingEnvironment: string, stagingUrl: string}} input
 * @param {(path: string) => Promise<any>} api
 */
export async function verifyStagingRevision(input, api) {
  const sha = input.sha;
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error("The staging revision must be a full commit SHA.");
  if (!/^[\w.-]+\/[\w.-]+$/.test(input.repository) || !input.stagingUrl || !input.stagingEnvironment || !input.stagingBranch || !/^[\w-]+\.ya?ml$/.test(input.stagingWorkflow)) {
    throw new Error("Configure the staging workflow, environment, branch and destination before releasing.");
  }
  const destination = new URL(input.stagingUrl);
  if (destination.protocol !== "https:" || destination.username || destination.password) throw new Error("Invalid staging destination.");
  const root = `/repos/${input.repository}`;
  const query = new URLSearchParams({ head_sha: sha, branch: input.stagingBranch, event: "push", per_page: "100" });
  const runs = await api(`${root}/actions/workflows/${input.stagingWorkflow}/runs?${query}`);
  const run = runs.workflow_runs?.filter((r) => r.head_sha === sha)
    .sort((a, b) => b.run_number - a.run_number || (b.run_attempt ?? 1) - (a.run_attempt ?? 1))[0];
  if (!run || run.status !== "completed" || run.conclusion !== "success") throw new Error("The approved revision has no current successful staging run.");
  const { jobs } = await api(`${root}/actions/runs/${run.id}/jobs?per_page=100`);
  if (!Array.isArray(jobs) || !hasStagingMigrationEvidence(jobs)) throw new Error("Staging migration, deployment and smoke-test evidence is incomplete.");
  const deployments = await api(`${root}/deployments?${new URLSearchParams({ sha, environment: input.stagingEnvironment, per_page: "100" })}`);
  const deployed = deployments.find((d) => d.sha === sha && d.environment === input.stagingEnvironment &&
    (!run.created_at || new Date(d.created_at) >= new Date(run.created_at)));
  if (!deployed) throw new Error("The approved revision has no matching staging deployment.");
  const statuses = await api(`${root}/deployments/${deployed.id}/statuses?per_page=100`);
  const latest = statuses[0];
  if (latest?.state !== "success" || !latest.environment_url || new URL(latest.environment_url).toString() !== destination.toString()) {
    throw new Error("The staging destination is no longer confirmed successful for this release.");
  }
  return sha;
}

async function main() {
  const env = process.env;
  if (!env.GITHUB_EVENT_PATH || !env.GITHUB_TOKEN || !env.GITHUB_REPOSITORY) throw new Error("GitHub event, repository and read token are required.");
  const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, "utf8"));
  const api = async (path) => {
    const response = await fetch(`${env.GITHUB_API_URL || "https://api.github.com"}${path}`, {
      headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`GitHub could not verify staging evidence (HTTP ${response.status}).`);
    return response.json();
  };
  const sha = await verifyApprovedRelease({
    event, repository: env.GITHUB_REPOSITORY,
    productionBranch: env.PRODUCTION_BRANCH || event.repository?.default_branch,
    stagingBranch: env.STAGING_BRANCH || "staging", stagingWorkflow: env.STAGING_WORKFLOW || "ai-staging.yml",
    stagingEnvironment: env.STAGING_ENVIRONMENT || "staging", stagingUrl: env.STAGING_URL || "",
  }, api);
  console.log(`Staging migration, deployment and checks passed for ${sha}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
