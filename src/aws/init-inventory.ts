import { $ } from "bun";
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
  describeEBSVolumes,
  describeElastiCacheClusters,
  describeSQSQueues,
  describeSNSTopics,
  describeAutoScalingGroups,
  describeCloudFormationStacks,
  describeEFSFileSystems,
  describeAPIGateways,
  describeStepFunctions,
  describeEventBridgeRules,
  describeCloudTrails,
  describeSSMParameters,
  describeBackupVaults,
  describeCognitoUserPools,
  describeWAFWebACLs,
  describeGuardDutyDetectors,
  describeKinesisStreams,
  describeAthenaWorkgroups,
  describeEMRClusters,
  getAllRegions,
  getAccountId,
} from "./aws-cli";
import ProgressBar from "progress";
import { color, getServiceColor } from "../lib/colors";
import { writeInventoryFile } from "../lib/spreadsheet";
import {
  checkEKSVersion,
  checkLambdaRuntime,
  checkRDSVersion,
  checkElastiCacheVersion,
  formatVersionStatus,
} from "../lib/version-checker";

/**
 * Inventory output mode types.
 * Determines which fields are included in the consolidated CSV output.
 *
 * @typedef {'basic' | 'detailed' | 'security' | 'cost'} InventoryMode
 */
export type InventoryMode = "basic" | "detailed" | "security" | "cost";

/**
 * Converts a tags object to JSON string format for CSV output.
 *
 * @param {Record<string, string>} [tags] - Tags object to convert
 * @returns {string} JSON string representation of tags or undefined
 *
 * @example
 * tagsToString({ Environment: 'prod', Owner: 'team-a' });
 * // Returns: '{"Environment":"prod","Owner":"team-a"}'
 */
function tagsToString(tags?: Record<string, string>): string | undefined {
  if (!tags || Object.keys(tags).length === 0) return undefined;
  return JSON.stringify(tags);
}

/**
 * Represents a consolidated resource entry in the inventory.
 * Contains all essential information about an AWS resource across any service.
 * Fields marked as optional are only populated in certain inventory modes.
 *
 * @interface ConsolidatedResource
 * @property {string} type - The AWS service type (e.g., 'EC2', 'S3', 'RDS', 'Lambda')
 * @property {string} name - The resource name or identifier
 * @property {string} region - The AWS region where the resource is located (or 'global' for global services)
 * @property {string} arn - The Amazon Resource Name (ARN) of the resource
 * @property {string} [state] - Resource state/status (detailed, security, cost modes)
 * @property {string} [tags] - Resource tags in JSON format (detailed mode)
 * @property {string} [createdDate] - Resource creation timestamp (detailed, cost modes)
 * @property {string} [publicAccess] - Public accessibility indicator (detailed, security modes)
 * @property {string} [size] - Resource size/capacity information (detailed, cost modes)
 * @property {string} [encrypted] - Encryption status (security mode)
 * @property {string} [vpcId] - VPC ID if applicable (security mode)
 * @property {string} [lastActivity] - Last activity/access timestamp (cost mode)
 * @property {string} [versionStatus] - Version support status for services with versioning (security mode)
 */
export interface ConsolidatedResource {
  type: string;
  name: string;
  region: string;
  arn: string;
  state?: string;
  tags?: string;
  createdDate?: string;
  publicAccess?: string;
  size?: string;
  encrypted?: string;
  vpcId?: string;
  lastActivity?: string;
  versionStatus?: string;
}

/**
 * Builds an ARN (Amazon Resource Name) for an EC2 instance.
 *
 * @param {string} region - AWS region code (e.g., 'us-east-1')
 * @param {string} accountId - AWS account ID (12-digit number)
 * @param {string} instanceId - EC2 instance ID (e.g., 'i-1234567890abcdef0')
 * @returns {string} Complete ARN for the EC2 instance
 *
 * @example
 * const arn = buildEC2Arn('us-east-1', '123456789012', 'i-1234567890abcdef0');
 * // Returns: 'arn:aws:ec2:us-east-1:123456789012:instance/i-1234567890abcdef0'
 */
function buildEC2Arn(
  region: string,
  accountId: string,
  instanceId: string,
): string {
  return `arn:aws:ec2:${region}:${accountId}:instance/${instanceId}`;
}

/**
 * Builds an ARN for an RDS database instance.
 *
 * @param {string} region - AWS region code
 * @param {string} accountId - AWS account ID
 * @param {string} dbInstanceId - RDS database instance identifier
 * @returns {string} Complete ARN for the RDS instance
 *
 * @example
 * const arn = buildRDSArn('us-west-2', '123456789012', 'mydb-instance');
 * // Returns: 'arn:aws:rds:us-west-2:123456789012:db:mydb-instance'
 */
function buildRDSArn(
  region: string,
  accountId: string,
  dbInstanceId: string,
): string {
  return `arn:aws:rds:${region}:${accountId}:db:${dbInstanceId}`;
}

/**
 * Builds an ARN for an S3 bucket.
 * Note: S3 ARNs do not include region or account ID as buckets are globally unique.
 *
 * @param {string} bucketName - S3 bucket name
 * @returns {string} Complete ARN for the S3 bucket
 *
 * @example
 * const arn = buildS3Arn('my-bucket-name');
 * // Returns: 'arn:aws:s3:::my-bucket-name'
 */
function buildS3Arn(bucketName: string): string {
  return `arn:aws:s3:::${bucketName}`;
}

/**
 * Builds an ARN for a VPC.
 *
 * @param {string} region - AWS region code
 * @param {string} accountId - AWS account ID
 * @param {string} vpcId - VPC ID (e.g., 'vpc-1234567890abcdef0')
 * @returns {string} Complete ARN for the VPC
 *
 * @example
 * const arn = buildVPCArn('eu-west-1', '123456789012', 'vpc-abc123');
 * // Returns: 'arn:aws:ec2:eu-west-1:123456789012:vpc/vpc-abc123'
 */
function buildVPCArn(region: string, accountId: string, vpcId: string): string {
  return `arn:aws:ec2:${region}:${accountId}:vpc/${vpcId}`;
}

/**
 * Builds an ARN for a subnet.
 *
 * @param {string} region - AWS region code
 * @param {string} accountId - AWS account ID
 * @param {string} subnetId - Subnet ID (e.g., 'subnet-1234567890abcdef0')
 * @returns {string} Complete ARN for the subnet
 */
function buildSubnetArn(
  region: string,
  accountId: string,
  subnetId: string,
): string {
  return `arn:aws:ec2:${region}:${accountId}:subnet/${subnetId}`;
}

/**
 * Builds an ARN for a security group.
 *
 * @param {string} region - AWS region code
 * @param {string} accountId - AWS account ID
 * @param {string} sgId - Security group ID (e.g., 'sg-1234567890abcdef0')
 * @returns {string} Complete ARN for the security group
 */
function buildSecurityGroupArn(
  region: string,
  accountId: string,
  sgId: string,
): string {
  return `arn:aws:ec2:${region}:${accountId}:security-group/${sgId}`;
}

/**
 * Builds an ARN for a Lambda function.
 *
 * @param {string} region - AWS region code
 * @param {string} accountId - AWS account ID
 * @param {string} functionName - Lambda function name
 * @returns {string} Complete ARN for the Lambda function
 */
function buildLambdaArn(
  region: string,
  accountId: string,
  functionName: string,
): string {
  return `arn:aws:lambda:${region}:${accountId}:function:${functionName}`;
}

/**
 * Builds an ARN for a DynamoDB table.
 *
 * @param {string} region - AWS region code
 * @param {string} accountId - AWS account ID
 * @param {string} tableName - DynamoDB table name
 * @returns {string} Complete ARN for the DynamoDB table
 */
function buildDynamoDBArn(
  region: string,
  accountId: string,
  tableName: string,
): string {
  return `arn:aws:dynamodb:${region}:${accountId}:table/${tableName}`;
}

/**
 * Generates CSV header based on the inventory mode.
 * Different modes include different fields in the output.
 *
 * @param {InventoryMode} mode - The inventory mode determining which fields to include
 * @returns {string} CSV header line
 *
 * @example
 * getCSVHeader('basic');
 * // Returns: "Type,Name,Region,ARN"
 *
 * @example
 * getCSVHeader('detailed');
 * // Returns: "Type,Name,Region,ARN,State,Tags,CreatedDate,PublicAccess,Size"
 */
function getCSVHeader(mode: InventoryMode): string {
  switch (mode) {
    case "basic":
      return "Type,Name,Region,ARN";
    case "detailed":
      return "Type,Name,Region,ARN,State,Tags,CreatedDate,PublicAccess,Size";
    case "security":
      return "Type,Name,Region,ARN,State,Encrypted,PublicAccess,VPC,VersionStatus";
    case "cost":
      return "Type,Name,Region,ARN,State,Size,CreatedDate,LastActivity";
  }
}

/**
 * Converts a resource object to CSV row based on the inventory mode.
 * Escapes values that contain commas and formats optional fields.
 *
 * @param {ConsolidatedResource} resource - The resource to convert
 * @param {InventoryMode} mode - The inventory mode determining which fields to include
 * @returns {string} CSV row line
 *
 * @example
 * const resource = { type: 'EC2', name: 'web-server', region: 'us-east-1', arn: 'arn:...' };
 * resourceToCSVRow(resource, 'basic');
 * // Returns: "EC2,web-server,us-east-1,arn:..."
 */
function resourceToCSVRow(
  resource: ConsolidatedResource,
  mode: InventoryMode,
): string {
  const escapeCSV = (value: string | undefined): string => {
    if (!value) return "N/A";
    return value.includes(",") || value.includes('"')
      ? `"${value.replace(/"/g, '""')}"`
      : value;
  };

  const baseFields = [
    resource.type,
    escapeCSV(resource.name),
    resource.region,
    resource.arn,
  ];

  switch (mode) {
    case "basic":
      return baseFields.join(",");
    case "detailed":
      return [
        ...baseFields,
        escapeCSV(resource.state),
        escapeCSV(resource.tags),
        escapeCSV(resource.createdDate),
        escapeCSV(resource.publicAccess),
        escapeCSV(resource.size),
      ].join(",");
    case "security":
      return [
        ...baseFields,
        escapeCSV(resource.state),
        escapeCSV(resource.encrypted),
        escapeCSV(resource.publicAccess),
        escapeCSV(resource.vpcId),
        escapeCSV(resource.versionStatus),
      ].join(",");
    case "cost":
      return [
        ...baseFields,
        escapeCSV(resource.state),
        escapeCSV(resource.size),
        escapeCSV(resource.createdDate),
        escapeCSV(resource.lastActivity),
      ].join(",");
  }
}

/**
 * Generates a comprehensive inventory of all AWS resources across all enabled regions.
 * Creates a single consolidated CSV file containing resource information based on the selected mode.
 *
 * @param {string} accountId - AWS account ID to inventory
 * @param {InventoryMode} mode - Inventory mode: 'basic', 'detailed', 'security', or 'cost'
 * @param {boolean} [silent=false] - If true, suppresses progress output
 * @param {string} [format='csv'] - Export format: 'csv', 'xlsx', or 'both'
 * @param {string[]} [limitRegions] - Optional array of regions to limit the scan to
 * @returns {Promise<void>}
 * @throws {Error} If unable to retrieve regions or resources
 *
 * @example
 * await generateInitInventory('123456789012', 'basic', false, 'csv');
 * @example
 * await generateInitInventory(
 *   '123456789012',
 *   'detailed',
 *   false,
 *   'csv',
 *   ['us-east-1', 'us-west-2']
 * );
 * // Creates: inventory-output/init-detailed-123456789012-20251115.csv
 */
export async function generateInitInventory(
  accountId: string,
  mode: InventoryMode = "basic",
  silent: boolean = false,
  format: string = "csv",
  limitRegions?: string[],
): Promise<void> {
  const log = !silent ? console.log : () => {};
  const allResources: ConsolidatedResource[] = [];

  log(
    color.boldInfo(
      "\n🚀 Starting comprehensive inventory across all regions...\n",
    ),
  );

  let regions = await getAllRegions();

  // Filter regions if limitRegions is provided
  if (limitRegions && limitRegions.length > 0) {
    regions = regions.filter((region) => limitRegions.includes(region));
    log(
      color.info(
        `Limiting scan to ${color.bold(regions.length.toString())} region(s): ${color.bold(regions.join(", "))}\n`,
      ),
    );
  } else {
    log(
      color.info(
        `Found ${color.bold(regions.length.toString())} enabled regions\n`,
      ),
    );
  }

  const globalServicesProcessed = {
    S3: false,
    CloudFront: false,
    Route53: false,
    IAM: false,
    ControlTower: false,
    SCP: false,
    ConfigRules: false,
  };

  let totalServices = 0;
  for (const region of regions) {
    totalServices += 52;
  }
  totalServices += 7;

  let progressBar: ProgressBar | null = null;
  if (!silent) {
    progressBar = new ProgressBar(
      color.info(`  Processing inventory `) +
        `[:bar] ${color.bold(":current")}/${color.dim(":total")} :service`,
      {
        complete: color.progressComplete + "█",
        incomplete: color.progressIncomplete + "░",
        width: 40,
        total: totalServices,
      },
    );
  }

  const updateProgress = (serviceName: string) => {
    if (progressBar) {
      const coloredService = getServiceColor(serviceName)(
        `${serviceName}`.padEnd(30),
      );
      progressBar.tick({ service: coloredService });
    }
  };

  for (const region of regions) {
    try {
      const ec2Instances = await describeEC2(region);
      for (const instance of ec2Instances) {
        allResources.push({
          type: "EC2",
          name: instance.name !== "N/A" ? instance.name : instance.id,
          region,
          arn: buildEC2Arn(region, accountId, instance.id),
          state: instance.state,
          tags: tagsToString(instance.tags),
          createdDate: instance.launchTime,
          publicAccess: instance.publicIp !== "N/A" ? "Public" : "Private",
          size: instance.type,
          encrypted: instance.encrypted ? "Yes" : "No",
          vpcId: instance.vpcId,
          lastActivity: undefined,
        });
      }
      updateProgress(`EC2 (${region})`);

      const rdsInstances = await describeRDS(region);
      for (const rds of rdsInstances) {
        const sizeInfo = rds.instanceClass
          ? `${rds.instanceClass} (${rds.storageSize}GB)`
          : undefined;

        // Check version status for security mode
        let versionStatus: string | undefined = undefined;
        if (mode === "security" && rds.engineVersion) {
          const versionCheck = checkRDSVersion(rds.engine, rds.engineVersion);
          versionStatus = formatVersionStatus(versionCheck);
        }

        allResources.push({
          type: "RDS",
          name: rds.name !== "N/A" ? rds.name : rds.id,
          region,
          arn: buildRDSArn(region, accountId, rds.id),
          state: rds.status,
          tags: tagsToString(rds.tags),
          createdDate: rds.createTime,
          publicAccess: rds.publiclyAccessible ? "Public" : "Private",
          size: sizeInfo,
          encrypted: rds.encrypted ? "Yes" : "No",
          vpcId: rds.vpcId,
          lastActivity: undefined,
          versionStatus,
        });
      }
      updateProgress(`RDS (${region})`);

      const vpcs = await describeVPCs(region);
      for (const vpc of vpcs) {
        allResources.push({
          type: "VPC",
          name: vpc.name !== "N/A" ? vpc.name : vpc.id,
          region,
          arn: buildVPCArn(region, accountId, vpc.id),
          state: vpc.state,
          tags: tagsToString(vpc.tags),
          createdDate: undefined,
          publicAccess: undefined,
          size: vpc.cidr,
          encrypted: undefined,
          vpcId: vpc.id,
          lastActivity: undefined,
        });
      }
      updateProgress(`VPC (${region})`);

      const subnets = await describeSubnets(region);
      for (const subnet of subnets) {
        const publicIpInfo = subnet.mapPublicIpOnLaunch
          ? "Auto-assign Public IP"
          : "Private only";
        allResources.push({
          type: "Subnet",
          name: subnet.name !== "N/A" ? subnet.name : subnet.id,
          region,
          arn: buildSubnetArn(region, accountId, subnet.id),
          state: subnet.state,
          tags: tagsToString(subnet.tags),
          createdDate: undefined,
          publicAccess: subnet.mapPublicIpOnLaunch ? "Auto-Public" : "Private",
          size: `${subnet.cidr} (${subnet.availableIpAddressCount} IPs available)`,
          encrypted: undefined,
          vpcId: subnet.vpcId,
          lastActivity: undefined,
        });
      }
      updateProgress(`Subnet (${region})`);

      const securityGroups = await describeSecurityGroups(region);
      for (const sg of securityGroups) {
        allResources.push({
          type: "SecurityGroup",
          name: sg.name !== "N/A" ? sg.name : sg.id,
          region,
          arn: buildSecurityGroupArn(region, accountId, sg.id),
          state: `${sg.ingressRulesCount} in / ${sg.egressRulesCount} out`,
          tags: tagsToString(sg.tags),
          createdDate: undefined,
          publicAccess: undefined,
          size: `${sg.ingressRulesCount! + sg.egressRulesCount!} total rules`,
          encrypted: undefined,
          vpcId: sg.vpcId !== "N/A" ? sg.vpcId : undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`SecurityGroup (${region})`);

      const loadBalancers = await describeLoadBalancers(region);
      for (const lb of loadBalancers) {
        const azInfo = lb.availabilityZones?.join(", ") || "N/A";
        allResources.push({
          type: "LoadBalancer",
          name: lb.name,
          region,
          arn:
            lb.arn ||
            `arn:aws:elasticloadbalancing:${region}:${accountId}:loadbalancer/${lb.name}`,
          state: `${lb.state} (${lb.scheme})`,
          tags: tagsToString(lb.tags),
          createdDate: lb.createdTime,
          publicAccess: lb.scheme === "internet-facing" ? "Public" : "Internal",
          size: `${lb.type} - ${lb.availabilityZones?.length || 0} AZs`,
          encrypted: undefined,
          vpcId: lb.vpcId,
          lastActivity: undefined,
        });
      }
      updateProgress(`LoadBalancer (${region})`);

      const lambdaFunctions = await describeLambdaFunctions(region);
      for (const func of lambdaFunctions) {
        const sizeInfo = func.memorySize
          ? `${func.memorySize}MB (${func.timeout}s timeout)`
          : undefined;

        // Check runtime version status for security mode
        let versionStatus: string | undefined = undefined;
        if (mode === "security" && func.runtime) {
          const versionCheck = checkLambdaRuntime(func.runtime);
          versionStatus = formatVersionStatus(versionCheck);
        }

        allResources.push({
          type: "Lambda",
          name: func.name,
          region,
          arn: buildLambdaArn(region, accountId, func.name),
          state: func.runtime,
          tags: tagsToString(func.tags),
          createdDate: func.lastModified,
          publicAccess: undefined,
          size: sizeInfo,
          encrypted: undefined,
          vpcId: func.vpcId,
          lastActivity: func.lastModified,
          versionStatus,
        });
      }
      updateProgress(`Lambda (${region})`);

      const dynamoDBTables = await describeDynamoDBTables(region);
      for (const table of dynamoDBTables) {
        const sizeInfo = table.sizeBytes
          ? `${(table.sizeBytes / 1024 / 1024).toFixed(2)}MB (${table.itemCount} items)`
          : table.itemCount
            ? `${table.itemCount} items`
            : undefined;

        allResources.push({
          type: "DynamoDB",
          name: table.name,
          region,
          arn: buildDynamoDBArn(region, accountId, table.name),
          state: table.status,
          tags: tagsToString(table.tags),
          createdDate: table.createdDate,
          publicAccess: undefined,
          size: sizeInfo,
          encrypted: table.encrypted ? "Yes" : "No",
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`DynamoDB (${region})`);

      const ecsClusters = await describeECSClusters(region);
      for (const cluster of ecsClusters) {
        const clusterArn = `arn:aws:ecs:${region}:${accountId}:cluster/${cluster.name}`;
        const capacityInfo = `${cluster.registeredContainerInstancesCount} instances, ${cluster.runningTasksCount} running / ${cluster.pendingTasksCount} pending tasks`;
        allResources.push({
          type: "ECS",
          name: cluster.name,
          region,
          arn: clusterArn,
          state: cluster.status,
          tags: tagsToString(cluster.tags),
          createdDate: undefined,
          publicAccess: undefined,
          size: `${cluster.activeServicesCount} services, ${cluster.runningTasksCount} tasks`,
          encrypted: undefined,
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`ECS (${region})`);

      const eksClusters = await describeEKSClusters(region);
      for (const cluster of eksClusters) {
        // Check Kubernetes version status for security mode
        let versionStatus: string | undefined = undefined;
        if (mode === "security" && cluster.version) {
          const versionCheck = checkEKSVersion(cluster.version);
          versionStatus = formatVersionStatus(versionCheck);
        }

        allResources.push({
          type: "EKS",
          name: cluster.name,
          region,
          arn:
            cluster.arn ||
            `arn:aws:eks:${region}:${accountId}:cluster/${cluster.name}`,
          state: `${cluster.status} (v${cluster.version})`,
          tags: tagsToString(cluster.tags),
          createdDate: cluster.createdAt,
          publicAccess: cluster.endpoint ? "Has Endpoint" : undefined,
          size: `Kubernetes ${cluster.version}`,
          encrypted: undefined,
          vpcId: undefined,
          lastActivity: undefined,
          versionStatus,
        });
      }
      updateProgress(`EKS (${region})`);

      const redshiftClusters = await describeRedshiftClusters(region);
      for (const cluster of redshiftClusters) {
        const clusterArn = `arn:aws:redshift:${region}:${accountId}:cluster:${cluster.clusterIdentifier}`;
        allResources.push({
          type: "Redshift",
          name: cluster.clusterIdentifier,
          region,
          arn: clusterArn,
        });
      }
      updateProgress(`Redshift (${region})`);

      const glueJobs = await describeGlueJobs(region);
      for (const job of glueJobs) {
        const jobArn = `arn:aws:glue:${region}:${accountId}:job/${job.name}`;
        allResources.push({
          type: "Glue",
          name: job.name,
          region,
          arn: jobArn,
        });
      }
      updateProgress(`Glue (${region})`);

      const openSearchDomains = await describeOpenSearchDomains(region);
      for (const domain of openSearchDomains) {
        allResources.push({
          type: "OpenSearch",
          name: domain.domainName,
          region,
          arn: domain.arn,
        });
      }
      updateProgress(`OpenSearch (${region})`);

      const kmsKeys = await describeKMSKeys(region);
      for (const key of kmsKeys) {
        allResources.push({
          type: "KMS",
          name: key.keyId,
          region,
          arn: key.keyArn,
        });
      }
      updateProgress(`KMS (${region})`);

      const cloudWatchAlarms = await describeCloudWatchAlarms(region);
      for (const alarm of cloudWatchAlarms) {
        const alarmArn = `arn:aws:cloudwatch:${region}:${accountId}:alarm:${alarm.alarmName}`;
        allResources.push({
          type: "CloudWatch",
          name: alarm.alarmName,
          region,
          arn: alarmArn,
        });
      }
      updateProgress(`CloudWatch (${region})`);

      const secretsManagerSecrets = await describeSecretsManagerSecrets(region);
      for (const secret of secretsManagerSecrets) {
        allResources.push({
          type: "SecretsManager",
          name: secret.name,
          region,
          arn: secret.secretArn,
        });
      }
      updateProgress(`SecretsManager (${region})`);

      const ecrRepositories = await describeECRRepositories(region);
      for (const repo of ecrRepositories) {
        allResources.push({
          type: "ECR",
          name: repo.repositoryName,
          region,
          arn: repo.repositoryArn,
        });
      }
      updateProgress(`ECR (${region})`);

      const internetGateways = await describeInternetGateways(region);
      for (const igw of internetGateways) {
        const igwArn = `arn:aws:ec2:${region}:${accountId}:internet-gateway/${igw.id}`;
        allResources.push({
          type: "InternetGateway",
          name: igw.name !== "N/A" ? igw.name : igw.id,
          region,
          arn: igwArn,
          state: igw.state,
          tags: tagsToString(igw.tags),
          createdDate: undefined,
          publicAccess: undefined,
          size: undefined,
          encrypted: undefined,
          vpcId: igw.vpcId !== "N/A" ? igw.vpcId : undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`InternetGateway (${region})`);

      const natGateways = await describeNatGateways(region);
      for (const natgw of natGateways) {
        const natgwArn = `arn:aws:ec2:${region}:${accountId}:natgateway/${natgw.id}`;
        allResources.push({
          type: "NatGateway",
          name: natgw.name !== "N/A" ? natgw.name : natgw.id,
          region,
          arn: natgwArn,
          state: natgw.state,
          tags: tagsToString(natgw.tags),
          createdDate: undefined,
          publicAccess:
            natgw.publicIp !== "N/A"
              ? `Public IP: ${natgw.publicIp}`
              : undefined,
          size: undefined,
          encrypted: undefined,
          vpcId: natgw.vpcId,
          lastActivity: undefined,
        });
      }
      updateProgress(`NatGateway (${region})`);

      const elasticIPs = await describeElasticIPs(region);
      for (const eip of elasticIPs) {
        const eipArn = `arn:aws:ec2:${region}:${accountId}:elastic-ip/${eip.allocationId}`;
        const attachmentInfo =
          eip.instanceId !== "N/A"
            ? `Instance: ${eip.instanceId}`
            : eip.networkInterfaceId !== "N/A"
              ? `ENI: ${eip.networkInterfaceId}`
              : "Unattached";
        allResources.push({
          type: "ElasticIP",
          name: eip.publicIp,
          region,
          arn: eipArn,
          state:
            eip.instanceId !== "N/A" || eip.networkInterfaceId !== "N/A"
              ? "Associated"
              : "Available",
          tags: tagsToString(eip.tags),
          createdDate: undefined,
          publicAccess: "Public",
          size: attachmentInfo,
          encrypted: undefined,
          vpcId: eip.domain === "vpc" ? "VPC" : undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`ElasticIP (${region})`);

      const vpnGateways = await describeVpnGateways(region);
      for (const vpngw of vpnGateways) {
        const vpngwArn = `arn:aws:ec2:${region}:${accountId}:vpn-gateway/${vpngw.id}`;
        allResources.push({
          type: "VpnGateway",
          name: vpngw.name !== "N/A" ? vpngw.name : vpngw.id,
          region,
          arn: vpngwArn,
          state: vpngw.state,
          tags: undefined,
          createdDate: undefined,
          publicAccess: undefined,
          size: vpngw.type,
          encrypted: undefined,
          vpcId: vpngw.vpcId,
          lastActivity: undefined,
        });
      }
      updateProgress(`VpnGateway (${region})`);

      const vpnConnections = await describeVpnConnections(region);
      for (const vpnconn of vpnConnections) {
        const vpnconnArn = `arn:aws:ec2:${region}:${accountId}:vpn-connection/${vpnconn.id}`;
        allResources.push({
          type: "VpnConnection",
          name: vpnconn.name !== "N/A" ? vpnconn.name : vpnconn.id,
          region,
          arn: vpnconnArn,
          state: vpnconn.state,
          tags: undefined,
          createdDate: undefined,
          publicAccess: undefined,
          size: `${vpnconn.type} (${vpnconn.category})`,
          encrypted: undefined,
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`VpnConnection (${region})`);

      const transitGateways = await describeTransitGateways(region);
      for (const tgw of transitGateways) {
        const tgwArn = `arn:aws:ec2:${region}:${accountId}:transit-gateway/${tgw.id}`;
        allResources.push({
          type: "TransitGateway",
          name: tgw.name !== "N/A" ? tgw.name : tgw.id,
          region,
          arn: tgwArn,
          state: tgw.state,
          tags: undefined,
          createdDate: undefined,
          publicAccess: undefined,
          size: undefined,
          encrypted: undefined,
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`TransitGateway (${region})`);

      const vpcEndpoints = await describeVpcEndpoints(region);
      for (const endpoint of vpcEndpoints) {
        const endpointArn = `arn:aws:ec2:${region}:${accountId}:vpc-endpoint/${endpoint.id}`;
        allResources.push({
          type: "VpcEndpoint",
          name: endpoint.name !== "N/A" ? endpoint.name : endpoint.id,
          region,
          arn: endpointArn,
          state: endpoint.state,
          tags: undefined,
          createdDate: undefined,
          publicAccess: undefined,
          size: `${endpoint.type}: ${endpoint.serviceName}`,
          encrypted: undefined,
          vpcId: endpoint.vpcId,
          lastActivity: undefined,
        });
      }
      updateProgress(`VpcEndpoint (${region})`);

      const vpcPeeringConnections = await describeVpcPeeringConnections(region);
      for (const peering of vpcPeeringConnections) {
        const peeringArn = `arn:aws:ec2:${region}:${accountId}:vpc-peering-connection/${peering.id}`;
        allResources.push({
          type: "VpcPeering",
          name: peering.name !== "N/A" ? peering.name : peering.id,
          region,
          arn: peeringArn,
          state: peering.status,
          tags: undefined,
          createdDate: undefined,
          publicAccess: undefined,
          size: `${peering.requesterVpcId} ↔ ${peering.accepterVpcId}`,
          encrypted: undefined,
          vpcId: peering.requesterVpcId,
          lastActivity: undefined,
        });
      }
      updateProgress(`VpcPeering (${region})`);

      const networkAcls = await describeNetworkAcls(region);
      for (const nacl of networkAcls) {
        const naclArn = `arn:aws:ec2:${region}:${accountId}:network-acl/${nacl.id}`;
        allResources.push({
          type: "NetworkAcl",
          name: nacl.name !== "N/A" ? nacl.name : nacl.id,
          region,
          arn: naclArn,
          state: nacl.isDefault ? "Default" : "Custom",
          tags: undefined,
          createdDate: undefined,
          publicAccess: undefined,
          size: undefined,
          encrypted: undefined,
          vpcId: nacl.vpcId,
          lastActivity: undefined,
        });
      }
      updateProgress(`NetworkAcl (${region})`);

      const routeTables = await describeRouteTables(region);
      for (const rtb of routeTables) {
        const rtbArn = `arn:aws:ec2:${region}:${accountId}:route-table/${rtb.id}`;
        allResources.push({
          type: "RouteTable",
          name: rtb.name !== "N/A" ? rtb.name : rtb.id,
          region,
          arn: rtbArn,
          state: rtb.main ? "Main" : "Custom",
          tags: undefined,
          createdDate: undefined,
          publicAccess: undefined,
          size: undefined,
          encrypted: undefined,
          vpcId: rtb.vpcId,
          lastActivity: undefined,
        });
      }
      updateProgress(`RouteTable (${region})`);

      const networkInterfaces = await describeNetworkInterfaces(region);
      for (const eni of networkInterfaces) {
        const eniArn = `arn:aws:ec2:${region}:${accountId}:network-interface/${eni.id}`;
        const ipInfo = `Private: ${eni.privateIp}${eni.publicIp && eni.publicIp !== "N/A" ? `, Public: ${eni.publicIp}` : ""}`;
        allResources.push({
          type: "NetworkInterface",
          name: eni.name !== "N/A" ? eni.name : eni.id,
          region,
          arn: eniArn,
          state: eni.status,
          tags: undefined,
          createdDate: undefined,
          publicAccess:
            eni.publicIp && eni.publicIp !== "N/A"
              ? "Has Public IP"
              : "Private only",
          size: ipInfo,
          encrypted: undefined,
          vpcId: eni.vpcId,
          lastActivity: undefined,
        });
      }
      updateProgress(`NetworkInterface (${region})`);

      const ebsVolumes = await describeEBSVolumes(region);
      for (const volume of ebsVolumes) {
        const volumeArn = `arn:aws:ec2:${region}:${accountId}:volume/${volume.volumeId}`;
        const attachmentStatus =
          volume.attachments && volume.attachments.length > 0
            ? "Attached"
            : "Available";
        allResources.push({
          type: "EBSVolume",
          name: volume.name !== "N/A" ? volume.name : volume.volumeId,
          region,
          arn: volumeArn,
          state: `${volume.state} (${attachmentStatus})`,
          tags: tagsToString(volume.tags),
          createdDate: volume.createTime,
          publicAccess: undefined,
          size: `${volume.size}GB ${volume.volumeType}`,
          encrypted: volume.encrypted ? "Yes" : "No",
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`EBSVolume (${region})`);

      const elastiCacheClusters = await describeElastiCacheClusters(region);
      for (const cluster of elastiCacheClusters) {
        const clusterArn = `arn:aws:elasticache:${region}:${accountId}:cluster:${cluster.cacheClusterId}`;

        // Check engine version status for security mode
        let versionStatus: string | undefined = undefined;
        if (mode === "security" && cluster.engineVersion) {
          const versionCheck = checkElastiCacheVersion(
            cluster.engine,
            cluster.engineVersion,
          );
          versionStatus = formatVersionStatus(versionCheck);
        }

        allResources.push({
          type: "ElastiCache",
          name: cluster.cacheClusterId,
          region,
          arn: clusterArn,
          state: cluster.cacheClusterStatus,
          tags: undefined,
          createdDate: cluster.cacheClusterCreateTime,
          publicAccess: undefined,
          size: `${cluster.cacheNodeType} (${cluster.numCacheNodes} nodes, ${cluster.engine})`,
          encrypted: undefined,
          vpcId: undefined,
          lastActivity: undefined,
          versionStatus,
        });
      }
      updateProgress(`ElastiCache (${region})`);

      const sqsQueues = await describeSQSQueues(region);
      for (const queue of sqsQueues) {
        allResources.push({
          type: "SQSQueue",
          name: queue.queueName,
          region,
          arn: queue.queueUrl,
          state: undefined,
          tags: undefined,
          createdDate: undefined,
          publicAccess: undefined,
          size: undefined,
          encrypted: undefined,
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`SQS (${region})`);

      const snsTopics = await describeSNSTopics(region);
      for (const topic of snsTopics) {
        allResources.push({
          type: "SNSTopic",
          name: topic.topicName,
          region,
          arn: topic.topicArn,
          state: undefined,
          tags: undefined,
          createdDate: undefined,
          publicAccess: undefined,
          size: undefined,
          encrypted: undefined,
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`SNS (${region})`);

      const autoScalingGroups = await describeAutoScalingGroups(region);
      for (const asg of autoScalingGroups) {
        const asgArn = `arn:aws:autoscaling:${region}:${accountId}:autoScalingGroup:*:autoScalingGroupName/${asg.autoScalingGroupName}`;
        allResources.push({
          type: "AutoScalingGroup",
          name: asg.autoScalingGroupName,
          region,
          arn: asgArn,
          state: `${asg.desiredCapacity}/${asg.maxSize} (desired/max)`,
          tags: tagsToString(asg.tags),
          createdDate: asg.createdTime,
          publicAccess: undefined,
          size: `Min:${asg.minSize} Desired:${asg.desiredCapacity} Max:${asg.maxSize}`,
          encrypted: undefined,
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`AutoScaling (${region})`);

      const cfnStacks = await describeCloudFormationStacks(region);
      for (const stack of cfnStacks) {
        allResources.push({
          type: "CloudFormationStack",
          name: stack.stackName,
          region,
          arn: stack.stackId,
          state: stack.stackStatus,
          tags: tagsToString(stack.tags),
          createdDate: stack.creationTime,
          publicAccess: undefined,
          size: undefined,
          encrypted: undefined,
          vpcId: undefined,
          lastActivity: stack.lastUpdatedTime,
        });
      }
      updateProgress(`CloudFormation (${region})`);

      const efsFileSystems = await describeEFSFileSystems(region);
      for (const fs of efsFileSystems) {
        const fsArn = `arn:aws:elasticfilesystem:${region}:${accountId}:file-system/${fs.fileSystemId}`;
        const sizeInfo = fs.sizeInBytes
          ? `${(fs.sizeInBytes / 1024 / 1024 / 1024).toFixed(2)}GB`
          : undefined;
        allResources.push({
          type: "EFS",
          name: fs.name !== "N/A" ? fs.name : fs.fileSystemId,
          region,
          arn: fsArn,
          state: fs.lifeCycleState,
          tags: tagsToString(fs.tags),
          createdDate: fs.creationTime,
          publicAccess: undefined,
          size: sizeInfo,
          encrypted: fs.encrypted ? "Yes" : "No",
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`EFS (${region})`);

      const apiGateways = await describeAPIGateways(region);
      for (const api of apiGateways) {
        const apiArn = `arn:aws:apigateway:${region}::/restapis/${api.id}`;
        allResources.push({
          type: "APIGateway",
          name: api.name,
          region,
          arn: apiArn,
          state: api.protocolType,
          tags: tagsToString(api.tags),
          createdDate: api.createdDate,
          publicAccess: "Public",
          size: undefined,
          encrypted: undefined,
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`APIGateway (${region})`);

      const stepFunctions = await describeStepFunctions(region);
      for (const sf of stepFunctions) {
        allResources.push({
          type: "StepFunction",
          name: sf.name,
          region,
          arn: sf.stateMachineArn,
          state: `${sf.type} (${sf.status})`,
          tags: undefined,
          createdDate: sf.creationDate,
          publicAccess: undefined,
          size: undefined,
          encrypted: undefined,
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`StepFunctions (${region})`);

      const eventBridgeRules = await describeEventBridgeRules(region);
      for (const rule of eventBridgeRules) {
        allResources.push({
          type: "EventBridgeRule",
          name: rule.name,
          region,
          arn: rule.arn,
          state: rule.state,
          tags: undefined,
          createdDate: undefined,
          publicAccess: undefined,
          size: undefined,
          encrypted: undefined,
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`EventBridge (${region})`);

      const cloudTrails = await describeCloudTrails(region);
      for (const trail of cloudTrails) {
        allResources.push({
          type: "CloudTrail",
          name: trail.name,
          region,
          arn: trail.trailARN,
          state: trail.isMultiRegionTrail ? "Multi-Region" : "Single-Region",
          tags: tagsToString(trail.tags),
          createdDate: undefined,
          publicAccess: undefined,
          size: undefined,
          encrypted: trail.logFileValidationEnabled
            ? "Log Validation On"
            : undefined,
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`CloudTrail (${region})`);

      const ssmParameters = await describeSSMParameters(region);
      for (const param of ssmParameters) {
        allResources.push({
          type: "SSMParameter",
          name: param.name,
          region,
          arn:
            param.arn ||
            `arn:aws:ssm:${region}:${accountId}:parameter${param.name}`,
          state: `v${param.version}`,
          tags: tagsToString(param.tags),
          createdDate: undefined,
          publicAccess: undefined,
          size: param.type,
          encrypted: param.type === "SecureString" ? "Yes" : "No",
          vpcId: undefined,
          lastActivity: param.lastModifiedDate,
        });
      }
      updateProgress(`SSM (${region})`);

      const backupVaults = await describeBackupVaults(region);
      for (const vault of backupVaults) {
        allResources.push({
          type: "BackupVault",
          name: vault.backupVaultName,
          region,
          arn: vault.backupVaultArn,
          state: vault.locked ? "Locked" : "Unlocked",
          tags: tagsToString(vault.tags),
          createdDate: vault.creationDate,
          publicAccess: undefined,
          size: `${vault.numberOfRecoveryPoints || 0} recovery points`,
          encrypted: vault.encryptionKeyArn ? "Yes" : "No",
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`Backup (${region})`);

      const cognitoUserPools = await describeCognitoUserPools(region);
      for (const pool of cognitoUserPools) {
        const poolArn = `arn:aws:cognito-idp:${region}:${accountId}:userpool/${pool.id}`;
        allResources.push({
          type: "CognitoUserPool",
          name: pool.name,
          region,
          arn: poolArn,
          state: pool.status,
          tags: tagsToString(pool.tags),
          createdDate: pool.creationDate,
          publicAccess: undefined,
          size: undefined,
          encrypted:
            pool.mfaConfiguration !== "OFF"
              ? `MFA: ${pool.mfaConfiguration}`
              : undefined,
          vpcId: undefined,
          lastActivity: pool.lastModifiedDate,
        });
      }
      updateProgress(`Cognito (${region})`);

      const wafWebACLs = await describeWAFWebACLs(region);
      for (const acl of wafWebACLs) {
        allResources.push({
          type: "WAFWebACL",
          name: acl.name,
          region,
          arn: acl.arn,
          state: acl.scope || "REGIONAL",
          tags: tagsToString(acl.tags),
          createdDate: undefined,
          publicAccess: undefined,
          size: acl.capacity ? `${acl.capacity} WCU` : undefined,
          encrypted: undefined,
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`WAF (${region})`);

      const guardDutyDetectors = await describeGuardDutyDetectors(region);
      for (const detector of guardDutyDetectors) {
        const detectorArn = `arn:aws:guardduty:${region}:${accountId}:detector/${detector.detectorId}`;
        allResources.push({
          type: "GuardDutyDetector",
          name: detector.detectorId,
          region,
          arn: detectorArn,
          state: detector.status,
          tags: tagsToString(detector.tags),
          createdDate: detector.createdAt,
          publicAccess: undefined,
          size: undefined,
          encrypted: undefined,
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`GuardDuty (${region})`);

      const kinesisStreams = await describeKinesisStreams(region);
      for (const stream of kinesisStreams) {
        allResources.push({
          type: "KinesisStream",
          name: stream.streamName,
          region,
          arn: stream.streamARN,
          state: stream.streamStatus,
          tags: tagsToString(stream.tags),
          createdDate: stream.streamCreationTimestamp,
          publicAccess: undefined,
          size: `${stream.shardCount} shards, ${stream.retentionPeriodHours}h retention`,
          encrypted: undefined,
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`Kinesis (${region})`);

      const athenaWorkgroups = await describeAthenaWorkgroups(region);
      for (const wg of athenaWorkgroups) {
        const wgArn = `arn:aws:athena:${region}:${accountId}:workgroup/${wg.name}`;
        allResources.push({
          type: "AthenaWorkgroup",
          name: wg.name,
          region,
          arn: wgArn,
          state: wg.state,
          tags: tagsToString(wg.tags),
          createdDate: wg.creationTime,
          publicAccess: undefined,
          size: undefined,
          encrypted: undefined,
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`Athena (${region})`);

      const emrClusters = await describeEMRClusters(region);
      for (const cluster of emrClusters) {
        const clusterArn = `arn:aws:elasticmapreduce:${region}:${accountId}:cluster/${cluster.id}`;
        allResources.push({
          type: "EMRCluster",
          name: cluster.name,
          region,
          arn: clusterArn,
          state: cluster.status,
          tags: tagsToString(cluster.tags),
          createdDate: cluster.creationDateTime,
          publicAccess: undefined,
          size: `${cluster.instanceCount} instances, ${cluster.releaseLabel || "N/A"}`,
          encrypted: undefined,
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress(`EMR (${region})`);
    } catch (error) {
      if (!silent) {
        console.error(
          color.error(`\nError processing region ${region}: ${error}`),
        );
      }
    }
  }

  if (!globalServicesProcessed.S3) {
    try {
      const s3Buckets = await describeS3();
      for (const bucket of s3Buckets) {
        allResources.push({
          type: "S3",
          name: bucket.name,
          region: bucket.region || "global",
          arn: buildS3Arn(bucket.name),
          state: bucket.versioningEnabled ? "Versioned" : "Unversioned",
          tags: tagsToString(bucket.tags),
          createdDate: bucket.creationDate,
          publicAccess: bucket.publicAccess ? "Public" : "Private",
          size: undefined,
          encrypted: bucket.encrypted ? "Yes" : "No",
          vpcId: undefined,
          lastActivity: undefined,
        });
      }
      updateProgress("S3 (global)");
      globalServicesProcessed.S3 = true;
    } catch (error) {
      if (!silent) {
        console.error(color.error(`\nError processing S3: ${error}`));
      }
    }
  }

  if (!globalServicesProcessed.CloudFront) {
    try {
      const cloudFrontDistributions = await describeCloudFrontDistributions();
      for (const dist of cloudFrontDistributions) {
        const distArn = `arn:aws:cloudfront::${accountId}:distribution/${dist.id}`;
        allResources.push({
          type: "CloudFront",
          name: dist.domainName,
          region: "global",
          arn: distArn,
        });
      }
      updateProgress("CloudFront (global)");
      globalServicesProcessed.CloudFront = true;
    } catch (error) {
      if (!silent) {
        console.error(color.error(`\nError processing CloudFront: ${error}`));
      }
    }
  }

  if (!globalServicesProcessed.Route53) {
    try {
      const route53HostedZones = await describeRoute53HostedZones();
      for (const zone of route53HostedZones) {
        allResources.push({
          type: "Route53",
          name: zone.name,
          region: "global",
          arn: zone.id,
        });
      }
      updateProgress("Route53 (global)");
      globalServicesProcessed.Route53 = true;
    } catch (error) {
      if (!silent) {
        console.error(color.error(`\nError processing Route53: ${error}`));
      }
    }
  }

  if (!globalServicesProcessed.IAM) {
    try {
      const iamUsers = await describeIAMUsers();
      for (const user of iamUsers) {
        allResources.push({
          type: "IAMUser",
          name: user.userName,
          region: "global",
          arn: user.arn,
        });
      }

      const iamRoles = await describeIAMRoles();
      for (const role of iamRoles) {
        allResources.push({
          type: "IAMRole",
          name: role.roleName,
          region: "global",
          arn: role.arn,
        });
      }
      updateProgress("IAM (global)");
      globalServicesProcessed.IAM = true;
    } catch (error) {
      if (!silent) {
        console.error(color.error(`\nError processing IAM: ${error}`));
      }
    }
  }

  if (!globalServicesProcessed.ControlTower) {
    try {
      const ctGuardrails = await describeControlTowerGuardrails("us-east-1");
      for (const guardrail of ctGuardrails) {
        allResources.push({
          type: "ControlTowerGuardrail",
          name: guardrail.guardrailName,
          region: "global",
          arn: guardrail.guardrailArn,
        });
      }
      updateProgress("ControlTower (global)");
      globalServicesProcessed.ControlTower = true;
    } catch (error) {
      if (!silent) {
        console.error(
          color.error(`\nError processing Control Tower: ${error}`),
        );
      }
    }
  }

  if (!globalServicesProcessed.SCP) {
    try {
      const scps = await describeServiceControlPolicies();
      for (const scp of scps) {
        allResources.push({
          type: "ServiceControlPolicy",
          name: scp.name,
          region: "global",
          arn: scp.arn,
        });
      }
      updateProgress("SCP (global)");
      globalServicesProcessed.SCP = true;
    } catch (error) {
      if (!silent) {
        console.error(color.error(`\nError processing SCP: ${error}`));
      }
    }
  }

  if (!globalServicesProcessed.ConfigRules) {
    try {
      const configRules = await describeConfigRules("us-east-1");
      for (const rule of configRules) {
        allResources.push({
          type: "ConfigRule",
          name: rule.configRuleName,
          region: "global",
          arn: rule.configRuleArn,
        });
      }
      updateProgress("ConfigRules (global)");
      globalServicesProcessed.ConfigRules = true;
    } catch (error) {
      if (!silent) {
        console.error(color.error(`\nError processing Config Rules: ${error}`));
      }
    }
  }

  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const outputDir = "inventory-output";
  await $`mkdir -p ${outputDir}`;

  const modePrefix = mode === "basic" ? "init" : `init-${mode}`;
  const basePath = `${outputDir}/${modePrefix}-${accountId}-${timestamp}`;

  const csvHeader = getCSVHeader(mode) + "\n";
  const csvRows = allResources
    .map((resource) => resourceToCSVRow(resource, mode))
    .join("\n");

  const csvData = csvHeader + csvRows;
  await writeInventoryFile(csvData, basePath, format, "Inventory");

  const modeDescription =
    mode === "basic"
      ? "basic"
      : mode === "detailed"
        ? "detailed"
        : mode === "security"
          ? "security-focused"
          : "cost-optimization";

  const extensions = format === "both" ? ".csv and .xlsx" : `.${format}`;

  log(
    "\n" +
      color.boldSuccess(
        `✅ Comprehensive ${modeDescription} inventory complete!`,
      ),
  );
  log(
    color.info(`   Total resources found: `) +
      color.bold(allResources.length.toString()),
  );
  log(color.info(`   Inventory mode: `) + color.bold(mode));
  log(color.info(`   Output format: `) + color.bold(format));
  log(
    color.info(`   Output file(s): `) + color.cyan(`${basePath}${extensions}`),
  );
}
