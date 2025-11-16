import { $ } from "bun";

let log = console.log;
let verbose = false;

export function setLog(logger: (msg: string) => void, isVerbose: boolean) {
  log = logger;
  verbose = isVerbose;
}

export function getLog() {
  return { log, verbose };
}

/**
 * Retrieves the current AWS account ID using STS GetCallerIdentity.
 *
 * @returns {Promise<string>} The AWS account ID
 * @throws {Error} If unable to retrieve account ID
 *
 * @example
 * const accountId = await getAccountId();
 * console.log(`Account ID: ${accountId}`);
 */
export async function getAccountId(): Promise<string> {
  const result =
    await $`aws sts get-caller-identity --query Account --output text`.text();
  return result.trim();
}

/**
 * Retrieves all available AWS regions for the current account.
 * Uses EC2 describe-regions API to get the complete list of enabled regions.
 *
 * @returns {Promise<string[]>} Array of AWS region names (e.g., ['us-east-1', 'us-west-2', ...])
 * @throws {Error} If unable to retrieve regions
 *
 * @example
 * const regions = await getAllRegions();
 * console.log(`Found ${regions.length} regions: ${regions.join(', ')}`);
 */
export async function getAllRegions(): Promise<string[]> {
  const result = await $`aws ec2 describe-regions --output json`.text();
  const data = JSON.parse(result);

  return (data.Regions || []).map((region: any) => region.RegionName);
}
