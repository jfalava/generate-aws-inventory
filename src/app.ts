#!/usr/bin/env bun

import { $ } from "bun";
import type {
  EC2Instance,
  RDSInstance,
  S3Bucket,
  VPC,
  Subnet,
  SecurityGroup,
  LoadBalancer,
  LambdaFunction,
  DynamoDBTable,
  ECSCluster,
  EKSCluster,
  CloudFrontDistribution,
  Route53HostedZone,
  IAMUser,
  IAMRole,
  RedshiftCluster,
  GlueJob,
  OpenSearchDomain,
  KMSKey,
  CloudWatchAlarm,
  SecretsManagerSecret,
  ECRRepository,
  InternetGateway,
  NatGateway,
  ElasticIP,
  VpnGateway,
  VpnConnection,
  TransitGateway,
  VpcEndpoint,
  VpcPeeringConnection,
  NetworkAcl,
  RouteTable,
  NetworkInterface,
  ControlTowerGuardrail,
  ServiceControlPolicy,
  ConfigRule,
} from "./aws/aws-cli.types";

import {
  describeEC2,
  describeRDS,
  describeS3,
  describeVPCs,
  describeSubnets,
  describeSecurityGroups,
  describeLoadBalancers,
  describeLambdaFunctions,
  describeDynamoDBTables,
  describeECSClusters,
  describeEKSClusters,
  describeCloudFrontDistributions,
  describeRoute53HostedZones,
  describeIAMUsers,
  describeIAMRoles,
  describeRedshiftClusters,
  describeGlueJobs,
  describeOpenSearchDomains,
  describeKMSKeys,
  describeCloudWatchAlarms,
  describeSecretsManagerSecrets,
  describeECRRepositories,
  describeInternetGateways,
  describeNatGateways,
  describeElasticIPs,
  describeVpnGateways,
  describeVpnConnections,
  describeTransitGateways,
  describeVpcEndpoints,
  describeVpcPeeringConnections,
  describeNetworkAcls,
  describeRouteTables,
  describeNetworkInterfaces,
  describeControlTowerGuardrails,
  describeServiceControlPolicies,
  describeConfigRules,
  getAccountId,
  setLog,
} from "./aws/aws-cli";
import { getTOTPSecret, generateTOTPToken, setupTOTP } from "./lib/totp";
import { generateDetailedDescriptions } from "./aws/detailed-describe";
import { generateComprehensiveDescriptions } from "./aws/describe-harder";
import {
  generateInitInventory,
  type InventoryMode,
} from "./aws/init-inventory";
import { checkAwsCliOrExit } from "./lib/aws-cli-check";
import {
  parseCliArgs,
  printHelp,
  printHelpExamples,
  getCommandPrefix,
  type ParsedArgs,
} from "./cli/cli-params";
import { validateParsedArgs } from "./cli/cli-validation";
import { parseCsvToAccounts } from "./parsers/csv-parser";
import { parseJsonToAccounts, type AccountConfig } from "./parsers/json-parser";
import { validateAwsProfile } from "./lib/aws-profile";
import ProgressBar from "progress";
import { color, getServiceColor } from "./lib/colors";

const values: ParsedArgs = parseCliArgs(Bun.argv.slice(2));
validateParsedArgs(values);

const log = !values.silent ? console.log : () => {};

setLog(log, !values.silent);

if (values["help-examples"]) {
  printHelpExamples();
}

if (
  values.help ||
  (values["use-letme"] &&
    !values.account &&
    !values.json &&
    !values.csv &&
    !values["setup-totp"] &&
    !values.describe)
) {
  printHelp();
}

async function obtainAWSCredentials(
  accountName: string,
  mfaToken: string,
  log: (msg: string) => void,
): Promise<void> {
  log(`\nObtaining credentials for account: ${accountName}`);

  try {
    const result =
      await $`letme obtain ${accountName} --inline-mfa ${mfaToken}`.quiet();

    if (result.exitCode === 0) {
      // Set the AWS profile to use the obtained credentials
      process.env.AWS_PROFILE = accountName;
      log("Credentials obtained successfully");
      return;
    } else {
      throw new Error(
        `letme failed with exit code ${result.exitCode}: ${result.stderr}`,
      );
    }
  } catch (error) {
    throw new Error(`letme failed: ${error}`);
  }
}

async function main() {
  try {
    const log = !values.silent ? console.log : () => {};

    setLog(log, !values.silent);

    // Check if AWS CLI is installed before proceeding with any AWS operations
    await checkAwsCliOrExit();

    if (values["setup-totp"]) {
      await setupTOTP(log);
      return;
    }

    if (values.describe) {
      await generateDetailedDescriptions(
        values.describe,
        !values.silent,
        values.output,
      );
      return;
    }

    if (values["describe-harder"]) {
      await generateComprehensiveDescriptions(
        values["describe-harder"],
        !values.silent,
      );
      return;
    }

    if (
      values.init ||
      values["init-detailed"] ||
      values["init-security"] ||
      values["init-cost"]
    ) {
      let accountId: string;
      let refreshCredentials: (() => Promise<void>) | undefined;
      let mode: InventoryMode = "basic";

      if (values["init-detailed"]) mode = "detailed";
      else if (values["init-security"]) mode = "security";
      else if (values["init-cost"]) mode = "cost";

      if (values["use-letme"]) {
        if (!values.account) {
          console.error(
            color.boldError(
              "Error: --account is required when using init modes with --use-letme",
            ),
          );
          const cmdPrefix = getCommandPrefix();
          console.log("\nUsage:");
          console.log(
            `  ${cmdPrefix} --use-letme --account ACCOUNT_NAME --init`,
          );
          console.log(
            `  ${cmdPrefix} --use-letme --account ACCOUNT_NAME --init-detailed`,
          );
          console.log(
            `  ${cmdPrefix} --use-letme --account ACCOUNT_NAME --init-security`,
          );
          console.log(
            `  ${cmdPrefix} --use-letme --account ACCOUNT_NAME --init-cost`,
          );
          process.exit(1);
        }

        const secret = await getTOTPSecret();
        const mfaToken = generateTOTPToken(secret);
        log(
          color.info(
            `Generated MFA token for ${color.bold(values.account)}: ${color.yellow(mfaToken)}`,
          ),
        );
        await obtainAWSCredentials(values.account, mfaToken, log);

        refreshCredentials = async () => {
          const mfaToken = generateTOTPToken(secret);
          log(`\nGenerated new MFA token for ${values.account}: ${mfaToken}`);
          await obtainAWSCredentials(values.account!, mfaToken, log);
        };

        accountId = await getAccountId();
      } else if (values.account) {
        await validateAwsProfile(values.account);
        log(color.info("Using AWS profile: ") + color.bold(values.account));
        process.env.AWS_PROFILE = values.account;

        refreshCredentials = undefined;
        accountId = await getAccountId();
      } else {
        log(color.info("Using default AWS credentials"));
        refreshCredentials = undefined;

        try {
          accountId = await getAccountId();
          log(color.success("Using AWS account ID: ") + color.bold(accountId));
        } catch (error) {
          console.error(
            color.boldError(
              `Error: Could not fetch AWS account ID. Error: ${error}`,
            ),
          );
          process.exit(1);
        }
      }

      await generateInitInventory(accountId, mode, values.silent);
      return;
    }

    let secret: string = "";
    let accounts: AccountConfig[];
    if (!values["use-letme"]) {
      // Not using letme - use AWS profiles or default credentials

      if (values.json) {
        console.error(
          color.boldError("Error: --json is only supported with --use-letme"),
        );
        console.error(
          color.muted(
            "Use --use-letme to authenticate with letme for multiple accounts.",
          ),
        );
        process.exit(1);
      }
      if (values.csv) {
        console.error(
          color.boldError("Error: --csv is only supported with --use-letme"),
        );
        console.error(
          color.muted(
            "Use --use-letme to authenticate with letme for multiple accounts.",
          ),
        );
        process.exit(1);
      }

      if (values.account) {
        // Validate that the profile exists
        await validateAwsProfile(values.account);

        log(color.info("Using AWS profile: ") + color.bold(values.account));
        accounts = [
          {
            name: values.account,
            // Don't set region here - let it be determined by regionsFromCli
          },
        ];
      } else {
        // No account specified, use default AWS credentials
        // Try to fetch the actual AWS account ID
        let accountName = "local";
        try {
          log(color.info("Fetching AWS account ID..."));
          accountName = await getAccountId();
          log(
            color.success("Using AWS account ID: ") + color.bold(accountName),
          );
        } catch (error) {
          console.warn(
            color.warning(
              `Warning: Could not fetch AWS account ID, using "local" as account name. Error: ${error}`,
            ),
          );
        }

        accounts = [
          {
            name: accountName,
            // Don't set region here - let it be determined by regionsFromCli
          },
        ];
      }
    } else {
      // Using letme - need to get TOTP secret
      secret = await getTOTPSecret();

      if (!values.account && !values.json && !values.csv) {
        console.error(
          color.boldError(
            "Error: Either --account, --json, or --csv is required when using --use-letme",
          ),
        );
        const cmdPrefix = getCommandPrefix();
        console.log("\nUsage:");
        console.log("  Setup TOTP:");
        console.log(`    ${cmdPrefix} --setup-totp`);
        console.log("\n  Generate inventory (single account with letme):");
        console.log(
          `    ${cmdPrefix} --use-letme --account ACCOUNT_NAME --region us-east-1`,
        );
        console.log("\n  Generate inventory (from JSON file with letme):");
        console.log(`    ${cmdPrefix} --use-letme --json accounts.json`);
        console.log("\n  Generate inventory (from CSV file with letme):");
        console.log(`    ${cmdPrefix} --use-letme --csv accounts.csv`);
        process.exit(1);
      }
      if (values.json) {
        accounts = await parseJsonToAccounts(values.json!);
      } else if (values.csv) {
        try {
          const csvFile = Bun.file(values.csv!);
          const csvContent = await csvFile.text();
          accounts = parseCsvToAccounts(csvContent);
        } catch (error) {
          throw new Error(`Failed to read CSV config file: ${error}`);
        }
      } else {
        accounts = [
          {
            name: values.account!,
            // Don't set region here - let it be determined by regionsFromCli
          },
        ];
      }
    }

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    const selectedServices = values.services
      ? new Set(values.services.split(",").map((s) => s.trim().toLowerCase()))
      : null;

    if (!values.services) {
      console.warn(
        color.warning(
          'Warning: No "--services" parameter specified, generating a complete inventory.',
        ),
      );
    }

    // Parse regions into array
    const regionsFromCli = values.region
      .split(",")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    const shouldRun = (service: string): boolean =>
      !selectedServices ||
      selectedServices.has("all") ||
      selectedServices.has(service.toLowerCase());

    let hadErrors = false;
    let refreshCredentials: (() => Promise<void>) | undefined;

    // Process each account
    for (const account of accounts) {
      try {
        // Determine which regions to process for this account
        const regionsToProcess = account.region
          ? [account.region]
          : regionsFromCli.length > 0
            ? regionsFromCli
            : ["us-east-1"];

        // Determine authentication method based on account name and whether letme is used
        const isAccountId = /^\d{12}$/.test(account.name);
        const isLocalDefault = account.name === "local";
        const isLetmeAccount =
          values["use-letme"] && !isAccountId && !isLocalDefault;
        const isNamedProfile =
          !values["use-letme"] && !isAccountId && !isLocalDefault;

        if (isLetmeAccount) {
          // This is a letme-managed account
          refreshCredentials = async () => {
            const mfaToken = generateTOTPToken(secret);
            log(`\nGenerated new MFA token for ${account.name}: ${mfaToken}`);
            await obtainAWSCredentials(account.name, mfaToken, log);
          };

          const mfaToken = generateTOTPToken(secret);
          log(
            color.info(
              `Generated MFA token for ${color.bold(account.name)}: ${color.yellow(mfaToken)}`,
            ),
          );
          await obtainAWSCredentials(account.name, mfaToken, log);
        } else if (isNamedProfile) {
          // This is a named AWS profile (e.g., SSO profile)
          refreshCredentials = undefined;
          process.env.AWS_PROFILE = account.name;
          log(color.info(`Set AWS_PROFILE to: ${color.bold(account.name)}`));
        } else {
          // This is either "local" or an account ID - use default AWS credentials
          refreshCredentials = undefined;
          delete process.env.AWS_PROFILE;
        }

        // Process each region for this account
        for (const region of regionsToProcess) {
          log(
            color.boldInfo(
              `\n📍 Processing region: ${color.cyan(region)} for account: ${color.yellow(account.name)}`,
            ),
          );

          const outputDir = `inventory-output/${account.name}-${region}-${timestamp}`;
          await $`mkdir -p ${outputDir}`;

          // Create message buffer for this region to avoid breaking progress bar
          const messageBuffer: string[] = [];
          const bufferLog = (msg: string) => {
            messageBuffer.push(msg);
          };

          // Temporarily replace log function to buffer messages during inventory
          // This prevents breaking the progress bar
          setLog(bufferLog, true);

          // Define all services to inventory
          const allServices = [
            "EC2",
            "RDS",
            "S3",
            "VPC",
            "Subnet",
            "SecurityGroup",
            "LoadBalancer",
            "Lambda",
            "DynamoDB",
            "ECS",
            "EKS",
            "CloudFront",
            "Route53",
            "IAMUser",
            "IAMRole",
            "Redshift",
            "Glue",
            "OpenSearch",
            "KMS",
            "CloudWatch",
            "SecretsManager",
            "ECR",
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

          // Count services that will be processed
          const servicesToProcess = allServices.filter(shouldRun);
          const totalServices = servicesToProcess.length;

          // Create progress bar if not silent
          let progressBar: ProgressBar | null = null;
          if (!values.silent && totalServices > 0) {
            progressBar = new ProgressBar(
              color.info(`  Inventorying services `) +
                `[:bar] ${color.bold(":current")}/${color.dim(":total")} :service`,
              {
                complete: color.progressComplete + "█",
                incomplete: color.progressIncomplete + "░",
                width: 30,
                total: totalServices,
              },
            );
          }

          // Helper function to update progress
          const updateProgress = (serviceName: string) => {
            if (progressBar) {
              const coloredService = getServiceColor(serviceName)(serviceName);
              progressBar.tick({ service: coloredService.padEnd(20) });
            }
          };

          let ec2Instances: EC2Instance[] = [];
          if (shouldRun("EC2")) {
            try {
              ec2Instances = await describeEC2(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe EC2 for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("EC2");
          }
          let rdsInstances: RDSInstance[] = [];
          if (shouldRun("RDS")) {
            try {
              rdsInstances = await describeRDS(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe RDS for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("RDS");
          }
          let s3Buckets: S3Bucket[] = [];
          if (shouldRun("S3")) {
            try {
              s3Buckets = await describeS3();
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe S3 for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("S3");
          }

          let subnets: Subnet[] = [];
          if (shouldRun("Subnet")) {
            try {
              subnets = await describeSubnets(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe subnets for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("Subnet");
          }

          let securityGroups: SecurityGroup[] = [];
          if (shouldRun("SecurityGroup")) {
            try {
              securityGroups = await describeSecurityGroups(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe security groups for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("SecurityGroup");
          }

          let loadBalancers: LoadBalancer[] = [];
          if (shouldRun("LoadBalancer")) {
            try {
              loadBalancers = await describeLoadBalancers(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe load balancers for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("LoadBalancer");
          }

          let lambdaFunctions: LambdaFunction[] = [];
          if (shouldRun("Lambda")) {
            try {
              lambdaFunctions = await describeLambdaFunctions(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe Lambda functions for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("Lambda");
          }

          let dynamoDBTables: DynamoDBTable[] = [];
          if (shouldRun("DynamoDB")) {
            try {
              dynamoDBTables = await describeDynamoDBTables(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe DynamoDB tables for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("DynamoDB");
          }

          let ecsClusters: ECSCluster[] = [];
          if (shouldRun("ECS")) {
            try {
              ecsClusters = await describeECSClusters(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe ECS clusters for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("ECS");
          }

          let eksClusters: EKSCluster[] = [];
          if (shouldRun("EKS")) {
            try {
              eksClusters = await describeEKSClusters(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe EKS clusters for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("EKS");
          }

          let cloudFrontDistributions: CloudFrontDistribution[] = [];
          if (shouldRun("CloudFront")) {
            try {
              cloudFrontDistributions = await describeCloudFrontDistributions();
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe CloudFront distributions for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("CloudFront");
          }

          let route53HostedZones: Route53HostedZone[] = [];
          if (shouldRun("Route53")) {
            try {
              route53HostedZones = await describeRoute53HostedZones();
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe Route53 hosted zones for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("Route53");
          }

          let iamUsers: IAMUser[] = [];
          if (shouldRun("IAMUser")) {
            try {
              iamUsers = await describeIAMUsers();
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe IAM users for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("IAMUser");
          }

          let iamRoles: IAMRole[] = [];
          if (shouldRun("IAMRole")) {
            try {
              iamRoles = await describeIAMRoles();
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe IAM roles for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("IAMRole");
          }

          let redshiftClusters: RedshiftCluster[] = [];
          if (shouldRun("Redshift")) {
            try {
              redshiftClusters = await describeRedshiftClusters(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe Redshift clusters for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("Redshift");
          }

          let glueJobs: GlueJob[] = [];
          if (shouldRun("Glue")) {
            try {
              glueJobs = await describeGlueJobs(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe Glue jobs for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("Glue");
          }

          let openSearchDomains: OpenSearchDomain[] = [];
          if (shouldRun("OpenSearch")) {
            try {
              openSearchDomains = await describeOpenSearchDomains(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe OpenSearch domains for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("OpenSearch");
          }

          let kmsKeys: KMSKey[] = [];
          if (shouldRun("KMS")) {
            try {
              kmsKeys = await describeKMSKeys(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe KMS keys for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("KMS");
          }

          let cloudWatchAlarms: CloudWatchAlarm[] = [];
          if (shouldRun("CloudWatch")) {
            try {
              cloudWatchAlarms = await describeCloudWatchAlarms(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe CloudWatch alarms for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("CloudWatch");
          }

          let secretsManagerSecrets: SecretsManagerSecret[] = [];
          if (shouldRun("SecretsManager")) {
            try {
              secretsManagerSecrets =
                await describeSecretsManagerSecrets(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe Secrets Manager secrets for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("SecretsManager");
          }

          let ecrRepositories: ECRRepository[] = [];
          if (shouldRun("ECR")) {
            try {
              ecrRepositories = await describeECRRepositories(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe ECR repositories for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("ECR");
          }

          let internetGateways: InternetGateway[] = [];
          if (shouldRun("InternetGateway")) {
            try {
              internetGateways = await describeInternetGateways(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe internet gateways for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("InternetGateway");
          }

          let natGateways: NatGateway[] = [];
          if (shouldRun("NatGateway")) {
            try {
              natGateways = await describeNatGateways(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe NAT gateways for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("NatGateway");
          }

          let elasticIPs: ElasticIP[] = [];
          if (shouldRun("ElasticIP")) {
            try {
              elasticIPs = await describeElasticIPs(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe elastic IPs for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("ElasticIP");
          }

          let vpnGateways: VpnGateway[] = [];
          if (shouldRun("VpnGateway")) {
            try {
              vpnGateways = await describeVpnGateways(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe VPN gateways for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("VpnGateway");
          }

          let vpnConnections: VpnConnection[] = [];
          if (shouldRun("VpnConnection")) {
            try {
              vpnConnections = await describeVpnConnections(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe VPN connections for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("VpnConnection");
          }

          let transitGateways: TransitGateway[] = [];
          if (shouldRun("TransitGateway")) {
            try {
              transitGateways = await describeTransitGateways(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe transit gateways for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("TransitGateway");
          }

          let vpcEndpoints: VpcEndpoint[] = [];
          if (shouldRun("VpcEndpoint")) {
            try {
              vpcEndpoints = await describeVpcEndpoints(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe VPC endpoints for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("VpcEndpoint");
          }

          let vpcPeeringConnections: VpcPeeringConnection[] = [];
          if (shouldRun("VpcPeering")) {
            try {
              vpcPeeringConnections =
                await describeVpcPeeringConnections(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe VPC peering connections for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("VpcPeering");
          }

          let networkAcls: NetworkAcl[] = [];
          if (shouldRun("NetworkAcl")) {
            try {
              networkAcls = await describeNetworkAcls(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe network ACLs for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("NetworkAcl");
          }

          let routeTables: RouteTable[] = [];
          if (shouldRun("RouteTable")) {
            try {
              routeTables = await describeRouteTables(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe route tables for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("RouteTable");
          }

          let networkInterfaces: NetworkInterface[] = [];
          if (shouldRun("NetworkInterface")) {
            try {
              networkInterfaces = await describeNetworkInterfaces(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe network interfaces for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("NetworkInterface");
          }

          if (ec2Instances.length > 0) {
            const csv =
              "ID,Name,State,Type,PrivateIP,PublicIP\n" +
              ec2Instances
                .map(
                  (inst) =>
                    `${inst.id},${inst.name},${inst.state},${inst.type},${inst.privateIp},${inst.publicIp}`,
                )
                .join("\n");
            const filename = `${outputDir}/EC2-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (rdsInstances.length > 0) {
            const csv =
              "ID,Name,Engine,Status\n" +
              rdsInstances
                .map(
                  (rds) => `${rds.id},${rds.name},${rds.engine},${rds.status}`,
                )
                .join("\n");
            const filename = `${outputDir}/RDS-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (s3Buckets.length > 0) {
            const csv =
              "Name,CreationDate\n" +
              s3Buckets
                .map((bucket) => `${bucket.name},${bucket.creationDate}`)
                .join("\n");
            const filename = `${outputDir}/S3-global-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          let vpcs: VPC[] = [];
          if (shouldRun("VPC")) {
            try {
              vpcs = await describeVPCs(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe VPCs for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("VPC");
          }
          if (vpcs.length > 0) {
            const csv =
              "ID,Name,State,CIDR\n" +
              vpcs
                .map((vpc) => `${vpc.id},${vpc.name},${vpc.state},${vpc.cidr}`)
                .join("\n");
            const filename = `${outputDir}/VPC-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (subnets.length > 0) {
            const csv =
              "ID,Name,VPCID,CIDR,AvailabilityZone\n" +
              subnets
                .map(
                  (subnet) =>
                    `${subnet.id},${subnet.name},${subnet.vpcId},${subnet.cidr},${subnet.availabilityZone}`,
                )
                .join("\n");
            const filename = `${outputDir}/Subnet-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (securityGroups.length > 0) {
            const csv =
              "ID,Name,Description,VPCID\n" +
              securityGroups
                .map(
                  (sg) => `${sg.id},${sg.name},${sg.description},${sg.vpcId}`,
                )
                .join("\n");
            const filename = `${outputDir}/SecurityGroup-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (loadBalancers.length > 0) {
            const csv =
              "Name,Type,State,DNSName\n" +
              loadBalancers
                .map((lb) => `${lb.name},${lb.type},${lb.state},${lb.dnsName}`)
                .join("\n");
            const filename = `${outputDir}/LoadBalancer-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (lambdaFunctions.length > 0) {
            const csv =
              "Name,Runtime,Handler,LastModified\n" +
              lambdaFunctions
                .map(
                  (func) =>
                    `${func.name},${func.runtime},${func.handler},${func.lastModified}`,
                )
                .join("\n");
            const filename = `${outputDir}/Lambda-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (dynamoDBTables.length > 0) {
            const csv =
              "Name,Status,ItemCount\n" +
              dynamoDBTables
                .map(
                  (table) => `${table.name},${table.status},${table.itemCount}`,
                )
                .join("\n");
            const filename = `${outputDir}/DynamoDB-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (ecsClusters.length > 0) {
            const csv =
              "Name,Status,RegisteredContainerInstancesCount,RunningTasksCount\n" +
              ecsClusters
                .map(
                  (cluster) =>
                    `${cluster.name},${cluster.status},${cluster.registeredContainerInstancesCount},${cluster.runningTasksCount}`,
                )
                .join("\n");
            const filename = `${outputDir}/ECS-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (eksClusters.length > 0) {
            const csv =
              "Name,Status,Version\n" +
              eksClusters
                .map(
                  (cluster) =>
                    `${cluster.name},${cluster.status},${cluster.version}`,
                )
                .join("\n");
            const filename = `${outputDir}/EKS-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (cloudFrontDistributions.length > 0) {
            const csv =
              "ID,DomainName,Status,Enabled\n" +
              cloudFrontDistributions
                .map(
                  (dist) =>
                    `${dist.id},${dist.domainName},${dist.status},${dist.enabled}`,
                )
                .join("\n");
            const filename = `${outputDir}/CloudFront-global-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (route53HostedZones.length > 0) {
            const csv =
              "ID,Name,PrivateZone\n" +
              route53HostedZones
                .map((zone) => `${zone.id},${zone.name},${zone.privateZone}`)
                .join("\n");
            const filename = `${outputDir}/Route53-global-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (iamUsers.length > 0) {
            const csv =
              "UserName,UserID,ARN,CreateDate\n" +
              iamUsers
                .map(
                  (user) =>
                    `${user.userName},${user.userId},${user.arn},${user.createDate}`,
                )
                .join("\n");
            const filename = `${outputDir}/IAMUser-global-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (iamRoles.length > 0) {
            const csv =
              "RoleName,RoleID,ARN,CreateDate\n" +
              iamRoles
                .map(
                  (role) =>
                    `${role.roleName},${role.roleId},${role.arn},${role.createDate}`,
                )
                .join("\n");
            const filename = `${outputDir}/IAMRole-global-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (redshiftClusters.length > 0) {
            const csv =
              "ClusterIdentifier,NodeType,ClusterStatus,MasterUsername,DBName,Endpoint,Port\n" +
              redshiftClusters
                .map(
                  (cluster) =>
                    `${cluster.clusterIdentifier},${cluster.nodeType},${cluster.clusterStatus},${cluster.masterUsername},${cluster.dbName},${cluster.endpoint},${cluster.port}`,
                )
                .join("\n");
            const filename = `${outputDir}/Redshift-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (glueJobs.length > 0) {
            const csv =
              "Name,Description,Role,CreatedOn,LastModifiedOn\n" +
              glueJobs
                .map(
                  (job) =>
                    `${job.name},${job.description},${job.role},${job.createdOn},${job.lastModifiedOn}`,
                )
                .join("\n");
            const filename = `${outputDir}/Glue-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (openSearchDomains.length > 0) {
            const csv =
              "DomainName,ARN,Created,Deleted,Endpoint,MultiAZWithStandbyEnabled,UpgradeProcessing\n" +
              openSearchDomains
                .map(
                  (domain) =>
                    `${domain.domainName},${domain.arn},${domain.created},${domain.deleted},${domain.endpoint},${domain.multiAzWithStandbyEnabled},${domain.upgradeProcessing}`,
                )
                .join("\n");
            const filename = `${outputDir}/OpenSearch-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (kmsKeys.length > 0) {
            const csv =
              "KeyID,KeyARN,Description,KeyUsage,KeyState,CreationDate\n" +
              kmsKeys
                .map(
                  (key) =>
                    `${key.keyId},${key.keyArn},${key.description},${key.keyUsage},${key.keyState},${key.creationDate}`,
                )
                .join("\n");
            const filename = `${outputDir}/KMS-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (cloudWatchAlarms.length > 0) {
            const csv =
              "AlarmName,AlarmDescription,StateValue,StateReason,MetricName,Namespace\n" +
              cloudWatchAlarms
                .map(
                  (alarm) =>
                    `${alarm.alarmName},${alarm.alarmDescription},${alarm.stateValue},${alarm.stateReason},${alarm.metricName},${alarm.namespace}`,
                )
                .join("\n");
            const filename = `${outputDir}/CloudWatch-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (secretsManagerSecrets.length > 0) {
            const csv =
              "Name,Description,SecretARN,CreatedDate,LastChangedDate\n" +
              secretsManagerSecrets
                .map(
                  (secret) =>
                    `${secret.name},${secret.description},${secret.secretArn},${secret.createdDate},${secret.lastChangedDate}`,
                )
                .join("\n");
            const filename = `${outputDir}/SecretsManager-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (ecrRepositories.length > 0) {
            const csv =
              "RepositoryName,RepositoryARN,RegistryID,CreatedAt\n" +
              ecrRepositories
                .map(
                  (repo) =>
                    `${repo.repositoryName},${repo.repositoryArn},${repo.registryId},${repo.createdAt}`,
                )
                .join("\n");
            const filename = `${outputDir}/ECR-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (internetGateways.length > 0) {
            const csv =
              "ID,Name,VPCID,State\n" +
              internetGateways
                .map((igw) => `${igw.id},${igw.name},${igw.vpcId},${igw.state}`)
                .join("\n");
            const filename = `${outputDir}/InternetGateway-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (natGateways.length > 0) {
            const csv =
              "ID,Name,VPCID,SubnetID,State,PublicIP\n" +
              natGateways
                .map(
                  (natgw) =>
                    `${natgw.id},${natgw.name},${natgw.vpcId},${natgw.subnetId},${natgw.state},${natgw.publicIp}`,
                )
                .join("\n");
            const filename = `${outputDir}/NatGateway-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (elasticIPs.length > 0) {
            const csv =
              "AllocationID,PublicIP,Domain,InstanceID,NetworkInterfaceID,AssociationID\n" +
              elasticIPs
                .map(
                  (eip) =>
                    `${eip.allocationId},${eip.publicIp},${eip.domain},${eip.instanceId},${eip.networkInterfaceId},${eip.associationId}`,
                )
                .join("\n");
            const filename = `${outputDir}/ElasticIP-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (vpnGateways.length > 0) {
            const csv =
              "ID,Name,Type,State,VPCID\n" +
              vpnGateways
                .map(
                  (vpngw) =>
                    `${vpngw.id},${vpngw.name},${vpngw.type},${vpngw.state},${vpngw.vpcId}`,
                )
                .join("\n");
            const filename = `${outputDir}/VpnGateway-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (vpnConnections.length > 0) {
            const csv =
              "ID,Name,State,VPNGatewayID,CustomerGatewayID,Type,Category\n" +
              vpnConnections
                .map(
                  (vpnconn) =>
                    `${vpnconn.id},${vpnconn.name},${vpnconn.state},${vpnconn.vpnGatewayId},${vpnconn.customerGatewayId},${vpnconn.type},${vpnconn.category}`,
                )
                .join("\n");
            const filename = `${outputDir}/VpnConnection-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (transitGateways.length > 0) {
            const csv =
              "ID,Name,State,OwnerID,Description\n" +
              transitGateways
                .map(
                  (tgw) =>
                    `${tgw.id},${tgw.name},${tgw.state},${tgw.ownerId},${tgw.description}`,
                )
                .join("\n");
            const filename = `${outputDir}/TransitGateway-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (vpcEndpoints.length > 0) {
            const csv =
              "ID,Name,VPCID,ServiceName,Type,State\n" +
              vpcEndpoints
                .map(
                  (endpoint) =>
                    `${endpoint.id},${endpoint.name},${endpoint.vpcId},${endpoint.serviceName},${endpoint.type},${endpoint.state}`,
                )
                .join("\n");
            const filename = `${outputDir}/VpcEndpoint-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (vpcPeeringConnections.length > 0) {
            const csv =
              "ID,Name,Status,RequesterVPCID,AccepterVPCID\n" +
              vpcPeeringConnections
                .map(
                  (peering) =>
                    `${peering.id},${peering.name},${peering.status},${peering.requesterVpcId},${peering.accepterVpcId}`,
                )
                .join("\n");
            const filename = `${outputDir}/VpcPeering-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (networkAcls.length > 0) {
            const csv =
              "ID,Name,VPCID,IsDefault\n" +
              networkAcls
                .map(
                  (nacl) =>
                    `${nacl.id},${nacl.name},${nacl.vpcId},${nacl.isDefault}`,
                )
                .join("\n");
            const filename = `${outputDir}/NetworkAcl-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (routeTables.length > 0) {
            const csv =
              "ID,Name,VPCID,Main\n" +
              routeTables
                .map((rtb) => `${rtb.id},${rtb.name},${rtb.vpcId},${rtb.main}`)
                .join("\n");
            const filename = `${outputDir}/RouteTable-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          if (networkInterfaces.length > 0) {
            const csv =
              "ID,Name,VPCID,SubnetID,PrivateIP,PublicIP,Status\n" +
              networkInterfaces
                .map(
                  (eni) =>
                    `${eni.id},${eni.name},${eni.vpcId},${eni.subnetId},${eni.privateIp},${eni.publicIp},${eni.status}`,
                )
                .join("\n");
            const filename = `${outputDir}/NetworkInterface-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          // Control Tower Guardrails (regional API, but manages global guardrails)
          let controlTowerGuardrails: ControlTowerGuardrail[] = [];
          if (shouldRun("ControlTower")) {
            try {
              controlTowerGuardrails =
                await describeControlTowerGuardrails(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe Control Tower guardrails for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("ControlTower");
          }

          if (controlTowerGuardrails.length > 0) {
            const csv =
              "GuardrailARN,GuardrailName,State,Behavior,OrganizationalUnitARN\n" +
              controlTowerGuardrails
                .map(
                  (guardrail) =>
                    `${guardrail.guardrailArn},${guardrail.guardrailName},${guardrail.guardrailState},${guardrail.behavior},${guardrail.organizationalUnitArn}`,
                )
                .join("\n");
            const filename = `${outputDir}/ControlTower-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          // Service Control Policies (global, only run once per account)
          // Use the first region to avoid duplicates
          if (region === regionsToProcess[0]) {
            let servicePolicies: ServiceControlPolicy[] = [];
            if (shouldRun("SCP")) {
              try {
                servicePolicies = await describeServiceControlPolicies();
              } catch (error) {
                if (!values.silent)
                  console.error(
                    color.error(
                      `Failed to describe Service Control Policies for ${account.name}: ${error}`,
                    ),
                  );
                hadErrors = true;
              }
              updateProgress("SCP");
            }

            if (servicePolicies.length > 0) {
              const csv =
                "PolicyID,ARN,Name,Description,Type,AWSManaged\n" +
                servicePolicies
                  .map(
                    (policy) =>
                      `${policy.id},${policy.arn},${policy.name},"${policy.description}",${policy.type},${policy.awsManaged}`,
                  )
                  .join("\n");
              const filename = `${outputDir}/SCP-global-${timestamp}-${account.name}.csv`;
              await Bun.write(filename, csv);
              bufferLog(`Wrote ${filename}`);
            }
          }

          // AWS Config Rules (regional)
          let configRules: ConfigRule[] = [];
          if (shouldRun("ConfigRules")) {
            try {
              configRules = await describeConfigRules(region);
            } catch (error) {
              if (!values.silent)
                console.error(
                  color.error(
                    `Failed to describe Config rules for ${account.name}: ${error}`,
                  ),
                );
              hadErrors = true;
            }
            updateProgress("ConfigRules");
          }

          if (configRules.length > 0) {
            const csv =
              "RuleName,ARN,RuleID,Description,ComplianceStatus,Source\n" +
              configRules
                .map(
                  (rule) =>
                    `${rule.configRuleName},${rule.configRuleArn},${rule.configRuleId},"${rule.description}",${rule.complianceStatus},${rule.source}`,
                )
                .join("\n");
            const filename = `${outputDir}/ConfigRules-${region}-${timestamp}-${account.name}.csv`;
            await Bun.write(filename, csv);
            bufferLog(`Wrote ${filename}`);
          }

          // Restore original log function
          setLog(log, !values.silent);

          // Display all buffered messages in a Notes section
          if (messageBuffer.length > 0) {
            log("\n" + color.bold("📝 Notes:"));
            for (const message of messageBuffer) {
              log(`  ${message}`);
            }
          }

          log("\n" + "=".repeat(60) + "\n");
        } // End of region loop
      } catch (error) {
        if (values["stop-on-error"]) {
          console.error(color.boldError(`Error: ${error}`));
          process.exit(1);
        } else {
          console.error(
            color.error(`Error processing account ${account.name}: ${error}`),
          );
        }
      }
    }

    if (values.silent) {
      console.log(`\nInventory generated:`);
      for (const account of accounts) {
        const regionsToProcess = account.region
          ? [account.region]
          : regionsFromCli.length > 0
            ? regionsFromCli
            : ["us-east-1"];
        for (const region of regionsToProcess) {
          console.log(
            `  - inventory-output/${account.name}-${region}-${timestamp}`,
          );
        }
      }
      if (hadErrors) {
        console.warn(
          color.warning(
            "Note: Inventory of some services was incomplete due to errors.",
          ),
        );
      }
    }

    log(color.boldSuccess("\n✅ All done!"));
  } catch (error) {
    console.error(color.boldError(`Error: ${error}`));
    process.exit(1);
  }
}

main();
