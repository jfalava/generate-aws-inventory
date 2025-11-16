import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { color } from "./colors";

/**
 * Check if an AWS profile exists in the AWS config or credentials files
 * Returns the profile name to use with AWS_PROFILE environment variable
 *
 * Search order:
 * 1. [profile <name>] in ~/.aws/config (SSO profiles)
 * 2. [<name>] in ~/.aws/credentials
 * 3. [<name>] in ~/.aws/config
 */
export async function findAwsProfile(
  profileName: string,
): Promise<string | null> {
  const awsDir = join(homedir(), ".aws");
  const configPath = join(awsDir, "config");
  const credentialsPath = join(awsDir, "credentials");

  // Try to read config file
  let configContent = "";
  try {
    configContent = await readFile(configPath, "utf-8");
  } catch (error) {
    // Config file doesn't exist or can't be read
  }

  // Try to read credentials file
  let credentialsContent = "";
  try {
    credentialsContent = await readFile(credentialsPath, "utf-8");
  } catch (error) {
    // Credentials file doesn't exist or can't be read
  }

  // Check for [profile <name>] in config (SSO profiles)
  const ssoProfileRegex = new RegExp(
    `^\\[profile\\s+${escapeRegex(profileName)}\\]`,
    "m",
  );
  if (ssoProfileRegex.test(configContent)) {
    return profileName;
  }

  // Check for [<name>] in credentials
  const credentialsProfileRegex = new RegExp(
    `^\\[${escapeRegex(profileName)}\\]`,
    "m",
  );
  if (credentialsProfileRegex.test(credentialsContent)) {
    return profileName;
  }

  // Check for [<name>] in config
  if (credentialsProfileRegex.test(configContent)) {
    return profileName;
  }

  return null;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validate that an AWS profile exists, or exit with error
 */
export async function validateAwsProfile(profileName: string): Promise<void> {
  const profile = await findAwsProfile(profileName);

  if (!profile) {
    console.error(
      color.boldError(`Error: AWS profile "${profileName}" not found.`),
    );
    console.error("");
    console.error(color.muted("Searched in:"));
    console.error(color.dim(`  - [profile ${profileName}] in ~/.aws/config`));
    console.error(color.dim(`  - [${profileName}] in ~/.aws/credentials`));
    console.error(color.dim(`  - [${profileName}] in ~/.aws/config`));
    console.error("");
    console.error(
      color.muted(
        "Please ensure the profile exists or use --use-letme to authenticate with letme.",
      ),
    );
    process.exit(1);
  }
}
