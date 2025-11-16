import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { EC2Client, DescribeRegionsCommand } from "@aws-sdk/client-ec2";
import { getCredentialsProvider } from "../credentials";

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
  const client = new STSClient({
    credentials: getCredentialsProvider(),
  });

  const command = new GetCallerIdentityCommand({});
  const response = await client.send(command);

  if (!response.Account) {
    throw new Error("Unable to retrieve AWS account ID");
  }

  return response.Account;
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
  const client = new EC2Client({
    credentials: getCredentialsProvider(),
    region: "us-east-1", // Region doesn't matter for describe-regions
  });

  const command = new DescribeRegionsCommand({});
  const response = await client.send(command);

  return (response.Regions || [])
    .map((region) => region.RegionName || "")
    .filter(Boolean);
}
