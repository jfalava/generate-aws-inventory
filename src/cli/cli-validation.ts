import { z } from "zod";
import type { ParsedArgs } from "./cli-params";
import { printHelp } from "./cli-params";

/**
 * List of valid AWS regions supported by the inventory tool.
 * Includes commercial, government, and international regions.
 *
 * @constant {string[]}
 */
const validRegions = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "af-south-1",
  "ap-east-1",
  "ap-south-1",
  "ap-south-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-northeast-3",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-southeast-3",
  "ap-southeast-4",
  "ca-central-1",
  "eu-central-1",
  "eu-central-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-south-1",
  "eu-south-2",
  "eu-north-1",
  "me-south-1",
  "me-central-1",
  "sa-east-1",
  "us-gov-east-1",
  "us-gov-west-1",
];

/**
 * List of valid AWS service names that can be inventoried.
 * Services are specified in lowercase for case-insensitive matching.
 * Includes special value "all" to inventory all available services.
 *
 * @constant {string[]}
 */
const serviceNames = [
  "all",
  "ec2",
  "rds",
  "s3",
  "vpc",
  "subnet",
  "securitygroup",
  "loadbalancer",
  "lambda",
  "dynamodb",
  "ecs",
  "eks",
  "cloudfront",
  "route53",
  "iamuser",
  "iamrole",
  "redshift",
  "glue",
  "opensearch",
  "kms",
  "cloudwatch",
  "secretsmanager",
  "ecr",
  "internetgateway",
  "natgateway",
  "elasticip",
  "vpngateway",
  "vpnconnection",
  "transitgateway",
  "vpcendpoint",
  "vpcpeering",
  "networkacl",
  "routetable",
  "networkinterface",
];

/**
 * Zod schema for validating parsed CLI arguments.
 * Defines validation rules for all command-line parameters including:
 * - Region validation against supported AWS regions (supports comma-separated lists)
 * - Service name validation against available services (case-insensitive)
 * - Output format validation (json, text, or markdown)
 *
 * @constant {z.ZodObject}
 */
const parsedArgsSchema = z.object({
  account: z.string().optional(),
  region: z.string().refine(
    (val: string) => {
      const regions = val.split(",").map((r: string) => r.trim());
      return regions.every((r: string) => validRegions.includes(r));
    },
    {
      message: `Invalid region(s). Must be comma-separated list of valid AWS regions (e.g., us-east-1,us-west-2)`,
    },
  ),
  json: z.string().optional(),
  csv: z.string().optional(),
  "setup-totp": z.boolean(),
  silent: z.boolean(),
  "use-local-profile": z.boolean(),
  "use-letme": z.boolean(),
  "stop-on-error": z.boolean(),
  help: z.boolean(),
  "help-examples": z.boolean(),
  services: z
    .string()
    .optional()
    .refine(
      (val: string | undefined) => {
        if (!val) return true;
        const services = val
          .split(",")
          .map((s: string) => s.trim().toLowerCase());
        return services.every((s: string) => serviceNames.includes(s));
      },
      {
        message: `Invalid service name(s). Valid services: ${serviceNames.join(
          ", ",
        )}`,
      },
    ),
  describe: z.string().optional(),
  "describe-harder": z.string().optional(),
  output: z.enum(["json", "text", "markdown"]),
  init: z.boolean(),
  "init-detailed": z.boolean(),
  "init-security": z.boolean(),
  "init-cost": z.boolean(),
  "export-format": z.string(),
  "limit-regions": z
    .string()
    .optional()
    .refine(
      (val: string | undefined) => {
        if (!val) return true;
        const regions = val.split(",").map((r: string) => r.trim());
        return regions.every((r: string) => validRegions.includes(r));
      },
      {
        message: `Invalid region(s) in --limit-regions. Must be comma-separated list of valid AWS regions (e.g., us-east-1,us-west-2)`,
      },
    ),
});

/**
 * Validates parsed command-line arguments against the defined schema.
 * Performs comprehensive validation including region format, service names,
 * and output format constraints. On validation failure, prints detailed
 * error messages and displays help information before terminating.
 *
 * @param {ParsedArgs} args - The parsed arguments object to validate
 * @returns {void}
 * @throws {Error} Terminates process via printHelp() on validation failure
 *
 * @example
 * // Valid arguments pass silently
 * validateParsedArgs({ region: 'us-east-1', services: 'EC2,RDS', ... });
 *
 * @example
 * // Invalid region triggers error and help display
 * validateParsedArgs({ region: 'invalid-region', ... });
 * // Output: Error messages + help text, then process exits
 *
 * @example
 * // Invalid service triggers error with valid service list
 * validateParsedArgs({ services: 'InvalidService', ... });
 * // Output: "Invalid service name(s). Valid services: all, ec2, rds, ..."
 */
export function validateParsedArgs(args: ParsedArgs): void {
  try {
    parsedArgsSchema.parse(args);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      console.error("Error: Invalid command-line arguments.\n");
      const zodError = error as z.ZodError;
      zodError.issues.forEach((err) => {
        const path = err.path.join(".");
        if (path) {
          console.error(`  --${path}: ${err.message}`);
        } else {
          console.error(`  ${err.message}`);
        }
      });
      console.log("");
    } else {
      console.error("Error: Unexpected validation error.");
    }
    printHelp();
  }
}
