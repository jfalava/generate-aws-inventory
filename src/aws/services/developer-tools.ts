import { ListJobsCommand, GetJobCommand, type Job } from "@aws-sdk/client-glue";
import {
  DescribeRepositoriesCommand,
  type Repository,
} from "@aws-sdk/client-ecr";
import { getLog } from "./utils";
import { getGlueClient, getECRClient } from "../sdk-clients";
import { executeWithRetry } from "../sdk-error-handler";
import type { GlueJob, ECRRepository } from "../aws-cli.types";

/**
 * Retrieves all AWS Glue ETL jobs in the specified region.
 * Uses pagination to fetch all jobs and then describes each job individually to get detailed information.
 *
 * @param region - AWS region to query for Glue jobs
 * @returns Promise resolving to array of Glue job configurations with details like name, description, role, and timestamps
 *
 * @example
 * ```typescript
 * const jobs = await describeGlueJobs('us-east-1');
 * console.log(jobs);
 * // Output: [
 * //   {
 * //     name: 'etl-transform-job',
 * //     description: 'Transforms raw data',
 * //     role: 'arn:aws:iam::123456789012:role/GlueRole',
 * //     createdOn: '2024-01-15T10:30:00.000Z',
 * //     lastModifiedOn: '2024-03-20T14:45:00.000Z'
 * //   }
 * // ]
 * ```
 */
export async function describeGlueJobs(region: string): Promise<GlueJob[]> {
  const { log, verbose } = getLog();
  const client = getGlueClient(region);

  const jobs: GlueJob[] = [];

  let nextToken: string | undefined = undefined;
  const jobNames: string[] = [];

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new ListJobsCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "Glue List",
      3,
      1000,
    );

    if (data.JobNames) {
      jobNames.push(...data.JobNames);
    }

    nextToken = data.NextToken;
  } while (nextToken);

  for (const jobName of jobNames) {
    const descData = await executeWithRetry(
      async () => {
        const command = new GetJobCommand({
          JobName: jobName,
        });
        return await client.send(command);
      },
      "Glue Describe",
      3,
      1000,
    );

    const job = descData.Job;
    if (job) {
      jobs.push({
        name: job.Name || "unknown",
        description: job.Description || "N/A",
        role: job.Role || "unknown",
        createdOn: job.CreatedOn?.toISOString() || "N/A",
        lastModifiedOn: job.LastModifiedOn?.toISOString() || "N/A",
        executionProperty: job.ExecutionProperty,
      });
    }
  }

  return jobs;
}

/**
 * Retrieves all Amazon Elastic Container Registry (ECR) repositories in the specified region.
 * Uses pagination to fetch all repositories with their metadata including name, ARN, registry ID, and creation timestamp.
 *
 * @param region - AWS region to query for ECR repositories
 * @returns Promise resolving to array of ECR repository configurations
 *
 * @example
 * ```typescript
 * const repos = await describeECRRepositories('us-west-2');
 * console.log(repos);
 * // Output: [
 * //   {
 * //     repositoryName: 'my-app-backend',
 * //     repositoryArn: 'arn:aws:ecr:us-west-2:123456789012:repository/my-app-backend',
 * //     registryId: '123456789012',
 * //     createdAt: '2024-02-10T08:15:00.000Z'
 * //   }
 * // ]
 * ```
 */
export async function describeECRRepositories(
  region: string,
): Promise<ECRRepository[]> {
  const { log, verbose } = getLog();
  const client = getECRClient(region);

  const repos: ECRRepository[] = [];

  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeRepositoriesCommand({
          nextToken,
        });
        return await client.send(command);
      },
      "ECR",
      3,
      1000,
    );

    for (const repo of data.repositories || []) {
      repos.push({
        repositoryName: repo.repositoryName || "unknown",
        repositoryArn: repo.repositoryArn || "unknown",
        registryId: repo.registryId || "unknown",
        createdAt: repo.createdAt?.toISOString() || "N/A",
      });
    }

    nextToken = data.nextToken;
  } while (nextToken);

  return repos;
}
