import { Command } from "commander";
import { color } from "../lib/colors";

/**
 * Parsed command-line arguments interface.
 * Represents all possible CLI parameters with their respective types.
 *
 * @interface ParsedArgs
 * @property {string} [account] - AWS account name or profile identifier
 * @property {string} region - AWS region(s) to inventory (comma-separated list supported)
 * @property {string} [json] - Path to JSON configuration file
 * @property {string} [csv] - Path to CSV configuration file
 * @property {boolean} setup-totp - Flag to setup TOTP secret for MFA
 * @property {boolean} silent - Flag to disable logging output
 * @property {boolean} use-local-profile - Flag to use local AWS profile
 * @property {boolean} use-letme - Flag to use letme tool for credentials
 * @property {boolean} stop-on-error - Flag to halt processing on first error
 * @property {boolean} help - Flag to display help message
 * @property {boolean} help-examples - Flag to display examples and file formats
 * @property {string} [services] - Comma-separated list of AWS services to inventory
 * @property {string} [describe] - Path to inventory output for detailed descriptions
 * @property {string} [describe-harder] - Path to CSV file for comprehensive descriptions
 * @property {string} output - Output format for descriptions (json, text, markdown)
 * @property {boolean} init - Flag to create comprehensive inventory across all regions
 * @property {boolean} init-detailed - Flag to create detailed inventory with State, Tags, CreatedDate, PublicAccess, Size
 * @property {boolean} init-security - Flag to create security-focused inventory with Encrypted, PublicAccess, VPC info
 * @property {boolean} init-cost - Flag to create cost-optimization inventory with Size, CreatedDate, LastActivity
 */
export interface ParsedArgs {
  account?: string;
  region: string;
  json?: string;
  csv?: string;
  "setup-totp": boolean;
  silent: boolean;
  "use-local-profile": boolean;
  "use-letme": boolean;
  "stop-on-error": boolean;
  help: boolean;
  "help-examples": boolean;
  services?: string;
  describe?: string;
  "describe-harder"?: string;
  output: string;
  init: boolean;
  "init-detailed": boolean;
  "init-security": boolean;
  "init-cost": boolean;
}

/**
 * Determines the appropriate command prefix based on the execution context.
 * Returns different command strings depending on whether the tool is running
 * as a compiled binary or from source via Bun.
 *
 * @returns {string} The command prefix to use in help text and examples
 *
 * @example
 * // When running as compiled binary on Windows
 * getCommandPrefix(); // Returns: "generate-aws-inventory.exe"
 *
 * @example
 * // When running as compiled binary on Linux/macOS
 * getCommandPrefix(); // Returns: "./generate-aws-inventory"
 *
 * @example
 * // When running from source via Bun
 * getCommandPrefix(); // Returns: "bun run app.ts"
 */
export function getCommandPrefix(): string {
  const execPath = process.execPath || "";
  if (execPath.includes("generate-aws-inventory")) {
    if (process.platform === "win32") {
      return "generate-aws-inventory.exe";
    } else {
      return "./generate-aws-inventory";
    }
  }

  return "bun run app.ts";
}

/**
 * Parses command-line arguments and returns a structured ParsedArgs object.
 * Uses the Commander.js library to define and parse CLI options with proper
 * validation and error handling.
 *
 * @param {string[]} args - Array of command-line arguments to parse
 * @returns {ParsedArgs} Structured object containing all parsed CLI parameters
 * @throws {Error} Terminates process with exit code 1 on invalid arguments
 *
 * @example
 * // Parse arguments for account-based inventory
 * parseCliArgs(['--account', 'my-profile', '--region', 'us-east-1']);
 * // Returns: { account: 'my-profile', region: 'us-east-1', ... }
 *
 * @example
 * // Parse arguments with service filtering
 * parseCliArgs(['--profile', 'prod', '--service', 'EC2,RDS']);
 * // Returns: { account: 'prod', services: 'EC2,RDS', ... }
 *
 * @example
 * // Parse arguments for detailed descriptions
 * parseCliArgs(['--describe', 'inventory-output/']);
 * // Returns: { describe: 'inventory-output/', ... }
 */
export function parseCliArgs(args: string[]): ParsedArgs {
  const program = new Command();

  program
    .name(getCommandPrefix())
    .description("AWS Inventory Generator")
    .version("0.2")
    .helpOption(false)
    .helpCommand(false)
    .option(
      "-a, --account <ACCOUNT_NAME>",
      "Specify AWS account/profile name. Without --use-letme, uses AWS profile from ~/.aws/config or ~/.aws/credentials.",
    )
    .option(
      "--profile <ACCOUNT_NAME>",
      "Alias for --account. Specify AWS account/profile name.",
    )
    .option(
      "-r, --region <REGION>",
      "AWS region(s) to inventory. Supports comma-separated list (e.g., us-east-1,us-west-2).",
      "us-east-1",
    )
    .option(
      "-j, --json <FILE>",
      "Path to a JSON config file containing accounts array (requires --use-letme).",
    )
    .option(
      "-c, --csv <FILE>",
      "Path to a CSV config file containing accounts and regions (requires --use-letme).",
    )
    .option("--setup-totp", "Setup TOTP secret for MFA authentication.", false)
    .option(
      "-s, --silent",
      "Disable logging output (logging is enabled by default).",
      false,
    )
    .option(
      "--use-local-profile",
      "Use local AWS profile (default behavior).",
      true,
    )
    .option(
      "-l, --use-letme",
      "Use letme tool for credential management with MFA (requires TOTP setup).",
      false,
    )
    .option(
      "--stop-on-error",
      "Stop processing on the first error instead of continuing.",
      false,
    )
    .option(
      "--services <SERVICES>",
      "Comma-separated list of services to inventory (e.g., EC2,RDS,S3,all). If not specified, all services are described and an inventory is generated.",
    )
    .option(
      "--service <SERVICES>",
      "Alias for --services. Comma-separated list of services to inventory.",
    )
    .option(
      "--describe <PATH>",
      "Path to inventory output folder, parent directory, or CSV file to generate detailed descriptions. Supports folders (processes all CSVs), parent directories (recursive), or single CSV files.",
    )
    .option(
      "--describe-harder <CSV_FILE>",
      "Path to a CSV file to generate comprehensive detailed descriptions with all available information in structured markdown tables.",
    )
    .option(
      "--output <FORMAT>",
      "Output format for detailed descriptions (json, text, markdown).",
      "markdown",
    )
    .option(
      "--init",
      "Create a comprehensive inventory across all available AWS regions. Generates a single consolidated CSV with all resources (Type, Name, Region, ARN). Quick first look at account resources.",
      false,
    )
    .option(
      "--init-detailed",
      "Create detailed inventory across all regions with extended information: State, Tags, CreatedDate, PublicAccess, Size. Provides comprehensive resource overview.",
      false,
    )
    .option(
      "--init-security",
      "Create security-focused inventory across all regions: State, Encrypted, PublicAccess, VPC. Ideal for security auditing and compliance.",
      false,
    )
    .option(
      "--init-cost",
      "Create cost-optimization inventory across all regions: State, Size, CreatedDate, LastActivity. Helps identify unused or oversized resources.",
      false,
    )
    .option("-h, --help", "Show this help message.", false)
    .option("-e, --help-examples", "Show examples and file formats.", false)
    .allowUnknownOption(false)
    .exitOverride();

  try {
    program.parse(args, { from: "user" });
    const options = program.opts();

    return {
      account: options.account || options.profile,
      region: options.region,
      json: options.json,
      csv: options.csv,
      "setup-totp": options.setupTotp,
      silent: options.silent,
      "use-local-profile": options.useLocalProfile,
      "use-letme": options.useLetme,
      "stop-on-error": options.stopOnError,
      help: options.help || false,
      "help-examples": options.helpExamples,
      services: options.services || options.service,
      describe: options.describe,
      "describe-harder": options.describeHarder,
      output: options.output,
      init: options.init,
      "init-detailed": options.initDetailed,
      "init-security": options.initSecurity,
      "init-cost": options.initCost,
    };
  } catch (error) {
    const cmdPrefix = getCommandPrefix();
    console.error(`${color.boldError("Error:")} Invalid parameter or argument`);
    if (error instanceof Error) {
      console.error(`  ${color.muted(error.message)}`);
    }
    console.log(`
${color.bold("AWS Inventory Generator")}

${color.cyan("USAGE:")}
  ${color.green(cmdPrefix)} ${color.dim("[OPTIONS]")}

${color.cyan("OPTIONS:")}
  ${color.yellow("-a, --account, --profile")} ${color.dim("<ACCOUNT_NAME>")}  ${color.muted("Specify AWS account/profile name. Without --use-letme, uses AWS profile from ~/.aws/config or ~/.aws/credentials.")}
  ${color.yellow("-r, --region")} ${color.dim("<REGION>")}              ${color.muted("AWS region(s) to inventory. Supports comma-separated list (e.g., us-east-1,us-west-2). Default: us-east-1.")}
  ${color.yellow("-j, --json")} ${color.dim("<FILE>")}                  ${color.muted("Path to a JSON config file containing accounts array (requires --use-letme).")}
  ${color.yellow("-c, --csv")} ${color.dim("<FILE>")}                   ${color.muted("Path to a CSV config file containing accounts and regions (requires --use-letme).")}
  ${color.yellow("--setup-totp")}                       ${color.muted("Setup TOTP secret for MFA authentication.")}
  ${color.yellow("-s, --silent")}                       ${color.muted("Disable logging output (logging is enabled by default).")}
  ${color.yellow("-l, --use-letme")}                    ${color.muted("Use letme tool for credential management with MFA (requires TOTP setup).")}
  ${color.yellow("--stop-on-error")}                    ${color.muted("Stop processing on the first error instead of continuing.")}
  ${color.yellow("--services, --service")} ${color.dim("<SERVICES>")}       ${color.muted("Comma-separated list of services to inventory (e.g., EC2,RDS,S3,all). If not specified, all services are described and an inventory is generated.")}
  ${color.yellow("--describe")} ${color.dim("<PATH>")}                  ${color.muted("Path to inventory output folder, parent directory, or CSV file to generate detailed descriptions. Supports folders (processes all CSVs), parent directories (recursive), or single CSV files.")}
  ${color.yellow("--describe-harder")} ${color.dim("<CSV_FILE>")}       ${color.muted("Path to a CSV file to generate comprehensive detailed descriptions with all available information in structured markdown tables.")}
  ${color.yellow("--output")} ${color.dim("<FORMAT>")}                  ${color.muted("Output format for detailed descriptions (json, text, markdown). Default: markdown.")}
  ${color.yellow("--init")}                             ${color.muted("Create a comprehensive inventory across all available AWS regions (Type, Name, Region, ARN). Quick first look.")}
  ${color.yellow("--init-detailed")}                    ${color.muted("Detailed inventory with State, Tags, CreatedDate, PublicAccess, Size. Comprehensive overview.")}
  ${color.yellow("--init-security")}                    ${color.muted("Security-focused inventory with Encrypted, PublicAccess, VPC. For security auditing.")}
  ${color.yellow("--init-cost")}                        ${color.muted("Cost-optimization inventory with Size, CreatedDate, LastActivity. Identify unused resources.")}
 `);
    process.exit(1);
  }
}

/**
 * Displays the help message with usage instructions and available options.
 * Prints a formatted help text to the console and exits the process with code 0.
 *
 * @returns {void}
 *
 * @example
 * // Display help when user passes --help
 * printHelp();
 * // Output: Formatted help text with all options and usage instructions
 */
export function printHelp(): void {
  const cmdPrefix = getCommandPrefix();
  console.log(`
${color.bold("AWS Inventory Generator")}

${color.cyan("USAGE:")}
  ${color.green(cmdPrefix)} ${color.dim("[OPTIONS]")}

${color.cyan("OPTIONS:")}
  ${color.yellow("-a, --account, --profile")} ${color.dim("<ACCOUNT_NAME>")}  ${color.muted("Specify AWS account/profile name. Without --use-letme, uses AWS profile from ~/.aws/config or ~/.aws/credentials.")}
  ${color.yellow("-r, --region")} ${color.dim("<REGION>")}              ${color.muted("AWS region(s) to inventory. Supports comma-separated list (e.g., us-east-1,us-west-2). Default: us-east-1.")}
  ${color.yellow("-j, --json")} ${color.dim("<FILE>")}                  ${color.muted("Path to a JSON config file containing accounts array (requires --use-letme).")}
  ${color.yellow("-c, --csv")} ${color.dim("<FILE>")}                   ${color.muted("Path to a CSV config file containing accounts and regions (requires --use-letme).")}
  ${color.yellow("--setup-totp")}                       ${color.muted("Setup TOTP secret for MFA authentication.")}
  ${color.yellow("-s, --silent")}                       ${color.muted("Disable logging output (logging is enabled by default).")}
  ${color.yellow("-l, --use-letme")}                    ${color.muted("Use letme tool for credential management with MFA (requires TOTP setup).")}
  ${color.yellow("--stop-on-error")}                    ${color.muted("Stop processing on the first error instead of continuing.")}
  ${color.yellow("--services, --service")} ${color.dim("<SERVICES>")}       ${color.muted("Comma-separated list of services to inventory (e.g., EC2,RDS,S3,all). If not specified, all services are described and an inventory is generated.")}
  ${color.yellow("--describe")} ${color.dim("<PATH>")}                  ${color.muted("Path to inventory output folder, parent directory, or CSV file to generate detailed descriptions. Supports folders (processes all CSVs), parent directories (recursive), or single CSV files.")}
  ${color.yellow("--describe-harder")} ${color.dim("<CSV_FILE>")}       ${color.muted("Path to a CSV file to generate comprehensive detailed descriptions with all available information in structured markdown tables.")}
  ${color.yellow("--output")} ${color.dim("<FORMAT>")}                  ${color.muted("Output format for detailed descriptions (json, text, markdown). Default: markdown.")}
  ${color.yellow("--init")}                             ${color.muted("Create a comprehensive inventory across all available AWS regions (Type, Name, Region, ARN). Quick first look.")}
  ${color.yellow("--init-detailed")}                    ${color.muted("Detailed inventory with State, Tags, CreatedDate, PublicAccess, Size. Comprehensive overview.")}
  ${color.yellow("--init-security")}                    ${color.muted("Security-focused inventory with Encrypted, PublicAccess, VPC. For security auditing.")}
  ${color.yellow("--init-cost")}                        ${color.muted("Cost-optimization inventory with Size, CreatedDate, LastActivity. Identify unused resources.")}
  ${color.yellow("-h, --help")}                         ${color.muted("Show this help message.")}
  ${color.yellow("-e, --help-examples")}                ${color.muted("Show examples and file formats.")}
`);
  process.exit(0);
}

/**
 * Displays detailed examples and file format documentation.
 * Shows practical usage examples with various CLI option combinations,
 * and provides templates for JSON and CSV configuration files.
 * Prints to console and exits the process with code 0.
 *
 * @returns {void}
 *
 * @example
 * // Display examples when user passes --help-examples
 * printHelpExamples();
 * // Output: Comprehensive examples and file format documentation
 */
export function printHelpExamples(): void {
  const cmdPrefix = getCommandPrefix();
  console.log(`

${color.cyan("EXAMPLES:")}
  ${color.muted("Setup TOTP:")}
    ${color.green(cmdPrefix)} ${color.yellow("--setup-totp")}

  ${color.muted("Inventory using default AWS credentials:")}
    ${color.green(cmdPrefix)} ${color.yellow("--region")} us-east-1

  ${color.muted("Inventory using AWS profile (SSO or named profile):")}
    ${color.green(cmdPrefix)} ${color.yellow("--profile")} my-sso-profile ${color.yellow("--region")} us-east-1

  ${color.muted("Inventory using letme (requires --setup-totp first):")}
    ${color.green(cmdPrefix)} ${color.yellow("--use-letme --account")} myaccount ${color.yellow("--region")} us-east-1

  ${color.muted("Inventory single account across multiple regions:")}
    ${color.green(cmdPrefix)} ${color.yellow("--account")} myaccount ${color.yellow("--region")} us-east-1,us-west-2,eu-west-1

  ${color.muted("Inventory from JSON file with letme:")}
    ${color.green(cmdPrefix)} ${color.yellow("--use-letme --json")} accounts.json

  ${color.muted("Inventory from CSV file with letme:")}
    ${color.green(cmdPrefix)} ${color.yellow("--use-letme --csv")} accounts.csv

  ${color.muted("Inventory specific services:")}
    ${color.green(cmdPrefix)} ${color.yellow("--profile")} myaccount ${color.yellow("--service")} EC2,RDS,S3

  ${color.muted("Inventory all services explicitly:")}
    ${color.green(cmdPrefix)} ${color.yellow("--account")} myaccount ${color.yellow("--services")} all

  ${color.muted("Use silent mode (no logs):")}
    ${color.green(cmdPrefix)} ${color.yellow("--account")} myaccount ${color.yellow("--silent")}

  ${color.muted("Generate detailed descriptions from single inventory folder:")}
    ${color.green(cmdPrefix)} ${color.yellow("--describe")} inventory-output/myaccount-us-east-1-20251003

  ${color.muted("Generate detailed descriptions from all inventories (recursive):")}
    ${color.green(cmdPrefix)} ${color.yellow("--describe")} inventory-output

  ${color.muted("Generate detailed descriptions from a specific CSV file:")}
    ${color.green(cmdPrefix)} ${color.yellow("--describe")} inventory-output/myaccount-us-east-1-20251003/EC2-us-east-1-20251003-myaccount.csv

  ${color.muted("Generate comprehensive detailed descriptions with structured tables:")}
    ${color.green(cmdPrefix)} ${color.yellow("--describe-harder")} inventory-output/myaccount-us-east-1-20251003/EC2-us-east-1-20251003-myaccount.csv

  ${color.muted("Create comprehensive inventory across all regions (with current profile):")}
    ${color.green(cmdPrefix)} ${color.yellow("--init")}

  ${color.muted("Create comprehensive inventory across all regions (with letme):")}
    ${color.green(cmdPrefix)} ${color.yellow("--use-letme --account")} myaccount ${color.yellow("--init")}

  ${color.muted("Create comprehensive inventory across all regions (with AWS profile):")}
    ${color.green(cmdPrefix)} ${color.yellow("--profile")} my-sso-profile ${color.yellow("--init")}

  ${color.muted("Create detailed inventory with extended information:")}
    ${color.green(cmdPrefix)} ${color.yellow("--init-detailed")}

  ${color.muted("Create security-focused inventory for auditing:")}
    ${color.green(cmdPrefix)} ${color.yellow("--profile")} prod-account ${color.yellow("--init-security")}

  ${color.muted("Create cost-optimization inventory to find unused resources:")}
    ${color.green(cmdPrefix)} ${color.yellow("--use-letme --account")} myaccount ${color.yellow("--init-cost")}

${color.cyan("FILE FORMATS:")}
  ${color.muted("JSON config file:")}
    ${color.dim("{")}
      ${color.dim('"accounts": [')}
        ${color.dim("{")}
          ${color.dim('"name": "account1",')}
          ${color.dim('"region": "us-east-1"')}
        ${color.dim("},")}
        ${color.dim("{")}
          ${color.dim('"name": "account2",')}
          ${color.dim('"region": "eu-west-1"')}
        ${color.dim("}")}
      ${color.dim("]")}
    ${color.dim("}")}

  ${color.muted("CSV config file:")}
    ${color.dim("account,region")}
    ${color.dim("account1,us-east-1")}
    ${color.dim("account2,eu-west-1")}
`);
  process.exit(0);
}
