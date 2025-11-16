/**
 * Color utilities for CLI output using ANSI escape codes
 * Supports 24-bit true color (16 million colors)
 */

// Check if colors should be disabled (e.g., when piping output)
const isColorSupported = process.stdout.isTTY && !process.env.NO_COLOR;

/**
 * ANSI color codes for 24-bit true color
 */
const colors = {
  // Reset
  reset: "\x1b[0m",

  // Text colors (foreground)
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Bright colors
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m",

  // Styles
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",
};

/**
 * RGB color function for 24-bit true color
 */
export function rgb(r: number, g: number, b: number): string {
  if (!isColorSupported) return "";
  return `\x1b[38;2;${r};${g};${b}m`;
}

/**
 * Wrap text with a color
 */
function colorize(text: string, colorCode: string): string {
  if (!isColorSupported) return text;
  return `${colorCode}${text}${colors.reset}`;
}

/**
 * Color utility functions
 */
export const color = {
  // Status colors
  success: (text: string) => colorize(text, colors.brightGreen),
  error: (text: string) => colorize(text, colors.brightRed),
  warning: (text: string) => colorize(text, colors.brightYellow),
  info: (text: string) => colorize(text, colors.brightCyan),

  // Semantic colors
  primary: (text: string) => colorize(text, colors.brightBlue),
  secondary: (text: string) => colorize(text, colors.cyan),
  muted: (text: string) => colorize(text, colors.gray),

  // Basic colors
  red: (text: string) => colorize(text, colors.red),
  green: (text: string) => colorize(text, colors.green),
  yellow: (text: string) => colorize(text, colors.yellow),
  blue: (text: string) => colorize(text, colors.blue),
  magenta: (text: string) => colorize(text, colors.magenta),
  cyan: (text: string) => colorize(text, colors.cyan),
  white: (text: string) => colorize(text, colors.white),
  gray: (text: string) => colorize(text, colors.gray),

  // Styles
  bold: (text: string) => colorize(text, colors.bold),
  dim: (text: string) => colorize(text, colors.dim),
  italic: (text: string) => colorize(text, colors.italic),
  underline: (text: string) => colorize(text, colors.underline),

  // Combined styles
  boldSuccess: (text: string) =>
    colorize(text, colors.bold + colors.brightGreen),
  boldError: (text: string) => colorize(text, colors.bold + colors.brightRed),
  boldWarning: (text: string) =>
    colorize(text, colors.bold + colors.brightYellow),
  boldInfo: (text: string) => colorize(text, colors.bold + colors.brightCyan),

  // Service category colors (for progress bar)
  compute: (text: string) => colorize(text, colors.brightBlue), // EC2, Lambda, ECS, EKS
  storage: (text: string) => colorize(text, colors.brightGreen), // S3, EBS
  database: (text: string) => colorize(text, colors.brightMagenta), // RDS, DynamoDB
  network: (text: string) => colorize(text, colors.brightCyan), // VPC, Subnet, SecurityGroup
  security: (text: string) => colorize(text, colors.yellow), // IAM, KMS, Secrets

  // Progress bar colors
  progressComplete: rgb(0, 200, 0), // Green
  progressIncomplete: rgb(60, 60, 60), // Dark gray
};

/**
 * Check if colors are enabled
 */
export function isColorsEnabled(): boolean {
  return isColorSupported;
}

/**
 * Get service category color
 */
export function getServiceColor(serviceName: string): (text: string) => string {
  const computeServices = ["EC2", "Lambda", "ECS", "EKS"];
  const storageServices = ["S3", "ECR"];
  const databaseServices = ["RDS", "DynamoDB", "Redshift", "OpenSearch"];
  const networkServices = [
    "VPC",
    "Subnet",
    "SecurityGroup",
    "LoadBalancer",
    "InternetGateway",
    "NatGateway",
    "ElasticIP",
    "VpnGateway",
    "VpnConnection",
    "TransitGateway",
    "VpcEndpoint",
    "VpcPeering",
    "NetworkAcl",
    "RouteTable",
    "NetworkInterface",
  ];
  const securityServices = ["IAMUser", "IAMRole", "KMS", "SecretsManager"];

  if (computeServices.includes(serviceName)) return color.compute;
  if (storageServices.includes(serviceName)) return color.storage;
  if (databaseServices.includes(serviceName)) return color.database;
  if (networkServices.includes(serviceName)) return color.network;
  if (securityServices.includes(serviceName)) return color.security;

  return color.secondary; // Default color
}
