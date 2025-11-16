import { z } from "zod";

const accountSchema = z.object({
  name: z.string().min(1, "Account name cannot be empty"),
  region: z.string().optional(),
});

const csvConfigSchema = z.object({
  accounts: z.array(accountSchema),
});

export type AccountConfig = z.infer<typeof accountSchema>;
export type CsvConfig = z.infer<typeof csvConfigSchema>;

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
