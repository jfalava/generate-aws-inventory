import { z } from "zod";

/**
 * Zod schema for validating individual account configuration entries.
 * Ensures account name is non-empty and region is optional.
 */
const accountSchema = z.object({
  name: z.string().min(1, "Account name cannot be empty"),
  region: z.string().optional(),
});

/**
 * Zod schema for validating the complete CSV configuration structure.
 * Validates that the parsed CSV contains an array of account objects.
 */
const csvConfigSchema = z.object({
  accounts: z.array(accountSchema),
});

/**
 * Type representing a single AWS account configuration entry.
 * Inferred from the accountSchema for type safety.
 */
export type AccountConfig = z.infer<typeof accountSchema>;

/**
 * Type representing the complete CSV configuration structure.
 * Inferred from the csvConfigSchema for type safety.
 */
export type CsvConfig = z.infer<typeof csvConfigSchema>;

/**
 * Parses CSV content into an array of AWS account configurations.
 * Validates the CSV format and ensures it has the correct headers and structure.
 *
 * @param csvContent - Raw CSV string content to parse
 * @returns Array of validated account configurations with name and optional region
 * @throws Error if CSV has fewer than 2 lines (header + at least one data row)
 * @throws Error if CSV header doesn't contain exactly 'account,region'
 * @throws Error if any data row has fewer than 2 columns
 * @throws Error if any account name is empty
 *
 * @example
 * ```typescript
 * const csvContent = `account,region
 * production,us-east-1
 * staging,eu-west-1
 * development,ap-southeast-1`;
 *
 * const accounts = parseCsvToAccounts(csvContent);
 * console.log(accounts);
 * // Output: [
 * //   { name: 'production', region: 'us-east-1' },
 * //   { name: 'staging', region: 'eu-west-1' },
 * //   { name: 'development', region: 'ap-southeast-1' }
 * // ]
 * ```
 */
export function parseCsvToAccounts(csvContent: string): AccountConfig[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) {
    throw new Error(
      "CSV must have at least a header and one data row. Expected format:\naccount,region\n<account_name>,<region>",
    );
  }

  const headerParts = lines[0]!.split(",");
  if (headerParts.length < 2) {
    throw new Error(
      "CSV header must have at least 2 columns: account,region. Expected format:\naccount,region\n<account_name>,<region>",
    );
  }
  const accountHeader = headerParts[0]!.trim().toLowerCase();
  const regionHeader = headerParts[1]!.trim().toLowerCase();
  if (accountHeader !== "account" || regionHeader !== "region") {
    throw new Error(
      "CSV header must be 'account,region'. Expected format:\naccount,region\n<account_name>,<region>",
    );
  }

  const accounts: AccountConfig[] = [];
  for (let i = 1; i < lines.length; i++) {
    const rowParts = lines[i]!.split(",");
    if (rowParts.length < 2) {
      throw new Error(
        `Invalid CSV row ${i + 1}: expected at least 2 columns, got ${
          rowParts.length
        }. Expected format:\naccount,region\n<account_name>,<region>`,
      );
    }

    const name = rowParts[0]!.trim();
    const regionStr = rowParts[1]!.trim();
    if (!name) {
      throw new Error(
        `Invalid CSV row ${
          i + 1
        }: account name cannot be empty. Expected format:\naccount,region\n<account_name>,<region>`,
      );
    }
    const region = regionStr || undefined;
    accounts.push({
      name,
      region,
    });
  }

  return accounts;
}
