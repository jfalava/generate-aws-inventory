export interface AccountConfig {
  name: string;
  region?: string;
}

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
