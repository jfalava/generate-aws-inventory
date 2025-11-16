import { $ } from "bun";
import { getLog } from "./utils";
import type { GlueJob, ECRRepository } from "../aws-cli.types";

export async function describeGlueJobs(region: string): Promise<GlueJob[]> {
  const { log, verbose } = getLog();

  const result =
    await $`aws glue list-jobs --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const jobs: GlueJob[] = [];

  for (const jobName of data.JobNames || []) {
    const descResult =
      await $`aws glue get-job --job-name ${jobName} --region ${region} --output json`.text();
    const descData = JSON.parse(descResult);
    const job = descData.Job;
    jobs.push({
      name: job.Name,
      description: job.Description || "N/A",
      role: job.Role,
      createdOn: job.CreatedOn,
      lastModifiedOn: job.LastModifiedOn,
      executionProperty: job.ExecutionProperty,
    });
  }

  return jobs;
}

export async function describeECRRepositories(
  region: string,
): Promise<ECRRepository[]> {
  const { log, verbose } = getLog();

  const result =
    await $`aws ecr describe-repositories --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const repos: ECRRepository[] = [];

  for (const repo of data.repositories || []) {
    repos.push({
      repositoryName: repo.repositoryName,
      repositoryArn: repo.repositoryArn,
      registryId: repo.registryId,
      createdAt: repo.createdAt,
    });
  }

  return repos;
}
