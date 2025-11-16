/**
 * Configuration object for an AWS account with optional region specification.
 * Used for parsing account configuration from JSON files.
 */
export interface AccountConfig {
  name: string;
  region?: string;
}

/**
 * Parses a JSON configuration file containing AWS account information.
 * The JSON file must contain an 'accounts' array with account objects.
 *
 * @param filePath - Absolute or relative path to the JSON configuration file
 * @returns Promise that resolves to an array of account configurations
 * @throws Error if the file cannot be read or parsed
 * @throws Error if the JSON doesn't contain an 'accounts' array
 *
 * @example
 * ```typescript
 * // Example JSON file content:
 * // {
 * //   "accounts": [
 * //     { "name": "production", "region": "us-east-1" },
 * //     { "name": "staging", "region": "eu-west-1" }
 * //   ]
 * // }
 *
 * const accounts = await parseJsonToAccounts('./config/accounts.json');
 * console.log(accounts);
 * // Output: [
 * //   { name: 'production', region: 'us-east-1' },
 * //   { name: 'staging', region: 'eu-west-1' }
 * // ]
 * ```
 */
export async function parseJsonToAccounts(
  filePath: string,
): Promise<AccountConfig[]> {
  try {
    const file = Bun.file(filePath);
    const content = await file.text();
    const config = JSON.parse(content);

    if (!Array.isArray(config.accounts)) {
      throw new Error("Config file must contain an 'accounts' array");
    }

    return config.accounts;
  } catch (error) {
    throw new Error(`Failed to read config file: ${error}`);
  }
}
