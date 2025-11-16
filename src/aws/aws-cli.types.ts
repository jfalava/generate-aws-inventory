export interface EC2Instance {
  id: string;
  name: string;
  state: string;
  type: string;
  privateIp: string;
  publicIp: string;
  vpcId?: string;
  tags?: Record<string, string>;
  launchTime?: string;
  encrypted?: boolean;
}

export interface RDSInstance {
  id: string;
  name: string;
  engine: string;
  status: string;
  instanceClass?: string;
  storageSize?: number;
  vpcId?: string;
  publiclyAccessible?: boolean;
  encrypted?: boolean;
  createTime?: string;
  tags?: Record<string, string>;
}

export interface S3Bucket {
  name: string;
  creationDate: string;
  region?: string;
  publicAccess?: boolean;
  encrypted?: boolean;
  versioningEnabled?: boolean;
  tags?: Record<string, string>;
}

export interface VPC {
  id: string;
  name: string;
  state: string;
  cidr: string;
  tags?: Record<string, string>;
}

export interface Subnet {
  id: string;
  name: string;
  vpcId: string;
  cidr: string;
  availabilityZone: string;
  state?: string;
  availableIpAddressCount?: number;
  mapPublicIpOnLaunch?: boolean;
  tags?: Record<string, string>;
}

export interface SecurityGroup {
  id: string;
  name: string;
  description: string;
  vpcId: string;
  ingressRulesCount?: number;
  egressRulesCount?: number;
  tags?: Record<string, string>;
}

export interface LoadBalancer {
  name: string;
  type: string;
  state: string;
  dnsName: string;
  arn?: string;
  scheme?: string;
  availabilityZones?: string[];
  vpcId?: string;
  createdTime?: string;
  tags?: Record<string, string>;
}

export interface LambdaFunction {
  name: string;
  runtime: string;
  handler: string;
  lastModified: string;
  memorySize?: number;
  timeout?: number;
  vpcId?: string;
  tags?: Record<string, string>;
}

export interface DynamoDBTable {
  name: string;
  status: string;
  itemCount: number;
  createdDate?: string;
  sizeBytes?: number;
  encrypted?: boolean;
  tags?: Record<string, string>;
}

export interface ECSCluster {
  name: string;
  status: string;
  registeredContainerInstancesCount: number;
  runningTasksCount: number;
  pendingTasksCount?: number;
  activeServicesCount?: number;
  tags?: Record<string, string>;
}

export interface EKSCluster {
  name: string;
  status: string;
  version: string;
  arn?: string;
  createdAt?: string;
  endpoint?: string;
  tags?: Record<string, string>;
}

export interface CloudFrontDistribution {
  id: string;
  domainName: string;
  status: string;
  enabled: boolean;
}

export interface Route53HostedZone {
  id: string;
  name: string;
  privateZone: boolean;
}

export interface IAMUser {
  userName: string;
  userId: string;
  arn: string;
  createDate: string;
}

export interface IAMRole {
  roleName: string;
  roleId: string;
  arn: string;
  createDate: string;
}

export interface RedshiftCluster {
  clusterIdentifier: string;
  nodeType: string;
  clusterStatus: string;
  masterUsername: string;
  dbName: string;
  endpoint: string;
  port: number;
}

export interface GlueJob {
  name: string;
  description: string;
  role: string;
  createdOn: string;
  lastModifiedOn: string;
  executionProperty: any;
}

export interface OpenSearchDomain {
  domainName: string;
  arn: string;
  created: boolean;
  deleted: boolean;
  endpoint: string;
  multiAzWithStandbyEnabled: boolean;
  upgradeProcessing: boolean;
}

export interface KMSKey {
  keyId: string;
  keyArn: string;
  description: string;
  keyUsage: string;
  keyState: string;
  creationDate: string;
}

export interface CloudWatchAlarm {
  alarmName: string;
  alarmDescription: string;
  stateValue: string;
  stateReason: string;
  metricName: string;
  namespace: string;
}

export interface SecretsManagerSecret {
  name: string;
  description: string;
  secretArn: string;
  createdDate: string;
  lastChangedDate: string;
}

export interface ECRRepository {
  repositoryName: string;
  repositoryArn: string;
  registryId: string;
  createdAt: string;
}

export interface InternetGateway {
  id: string;
  name: string;
  vpcId: string;
  state: string;
  tags?: Record<string, string>;
}

export interface NatGateway {
  id: string;
  name: string;
  vpcId: string;
  subnetId: string;
  state: string;
  publicIp: string;
  tags?: Record<string, string>;
}

export interface ElasticIP {
  allocationId: string;
  publicIp: string;
  domain: string;
  instanceId: string;
  networkInterfaceId: string;
  associationId: string;
  tags?: Record<string, string>;
}

export interface VpnGateway {
  id: string;
  name: string;
  type: string;
  state: string;
  vpcId: string;
  tags?: Record<string, string>;
}

export interface VpnConnection {
  id: string;
  name: string;
  state: string;
  vpnGatewayId: string;
  customerGatewayId: string;
  type: string;
  category: string;
  tags?: Record<string, string>;
}

export interface TransitGateway {
  id: string;
  name: string;
  state: string;
  ownerId: string;
  description: string;
  tags?: Record<string, string>;
}

export interface VpcEndpoint {
  id: string;
  name: string;
  vpcId: string;
  serviceName: string;
  type: string;
  state: string;
  tags?: Record<string, string>;
}

export interface VpcPeeringConnection {
  id: string;
  name: string;
  status: string;
  requesterVpcId: string;
  accepterVpcId: string;
  tags?: Record<string, string>;
}

export interface NetworkAcl {
  id: string;
  name: string;
  vpcId: string;
  isDefault: boolean;
  tags?: Record<string, string>;
}

export interface RouteTable {
  id: string;
  name: string;
  vpcId: string;
  main: boolean;
  tags?: Record<string, string>;
}

export interface NetworkInterface {
  id: string;
  name: string;
  vpcId: string;
  subnetId: string;
  privateIp: string;
  publicIp: string;
  status: string;
  tags?: Record<string, string>;
}

export interface ControlTowerGuardrail {
  guardrailArn: string;
  guardrailName: string;
  guardrailState: string;
  behavior: string; // DETECTIVE or PREVENTIVE
  organizationalUnitArn: string;
}

export interface ServiceControlPolicy {
  id: string;
  arn: string;
  name: string;
  description: string;
  type: string; // SERVICE_CONTROL_POLICY
  awsManaged: boolean;
}

export interface ConfigRule {
  configRuleName: string;
  configRuleArn: string;
  configRuleId: string;
  description: string;
  complianceStatus: string;
  source: string; // AWS managed or custom
}

export interface EBSVolume {
  volumeId: string;
  name: string;
  size: number;
  volumeType: string;
  state: string;
  encrypted: boolean;
  availabilityZone: string;
  createTime?: string;
  attachments?: any[];
  tags?: Record<string, string>;
}

export interface ElastiCacheCluster {
  cacheClusterId: string;
  cacheNodeType: string;
  engine: string;
  cacheClusterStatus: string;
  numCacheNodes: number;
  preferredAvailabilityZone?: string;
  cacheClusterCreateTime?: string;
  tags?: Record<string, string>;
}

export interface SQSQueue {
  queueUrl: string;
  queueName: string;
  attributes?: Record<string, string>;
  tags?: Record<string, string>;
}

export interface SNSTopic {
  topicArn: string;
  topicName: string;
  subscriptionsConfirmed?: number;
  tags?: Record<string, string>;
}

export interface AutoScalingGroup {
  autoScalingGroupName: string;
  minSize: number;
  maxSize: number;
  desiredCapacity: number;
  availabilityZones: string[];
  healthCheckType: string;
  createdTime?: string;
  tags?: Record<string, string>;
}

export interface CloudFormationStack {
  stackName: string;
  stackId: string;
  stackStatus: string;
  creationTime?: string;
  lastUpdatedTime?: string;
  tags?: Record<string, string>;
}

export interface EFSFileSystem {
  fileSystemId: string;
  name: string;
  lifeCycleState: string;
  sizeInBytes?: number;
  creationTime?: string;
  encrypted: boolean;
  performanceMode: string;
  tags?: Record<string, string>;
}

export interface APIGateway {
  id: string;
  name: string;
  protocolType: string;
  apiEndpoint?: string;
  createdDate?: string;
  tags?: Record<string, string>;
}

export interface StepFunction {
  stateMachineArn: string;
  name: string;
  type: string;
  status: string;
  creationDate?: string;
  tags?: Record<string, string>;
}

export interface EventBridgeRule {
  name: string;
  arn: string;
  state: string;
  description?: string;
  eventPattern?: string;
  tags?: Record<string, string>;
}

export interface CloudTrail {
  name: string;
  trailARN: string;
  homeRegion?: string;
  isMultiRegionTrail?: boolean;
  isOrganizationTrail?: boolean;
  s3BucketName?: string;
  logFileValidationEnabled?: boolean;
  tags?: Record<string, string>;
}

export interface SSMParameter {
  name: string;
  type: string;
  value?: string;
  version?: number;
  lastModifiedDate?: string;
  arn?: string;
  tags?: Record<string, string>;
}

export interface BackupVault {
  backupVaultName: string;
  backupVaultArn: string;
  creationDate?: string;
  encryptionKeyArn?: string;
  numberOfRecoveryPoints?: number;
  locked?: boolean;
  tags?: Record<string, string>;
}

export interface CognitoUserPool {
  id: string;
  name: string;
  status?: string;
  creationDate?: string;
  lastModifiedDate?: string;
  mfaConfiguration?: string;
  tags?: Record<string, string>;
}

export interface WAFWebACL {
  name: string;
  id: string;
  arn: string;
  description?: string;
  scope?: string;
  capacity?: number;
  tags?: Record<string, string>;
}

export interface GuardDutyDetector {
  detectorId: string;
  status: string;
  serviceRole?: string;
  createdAt?: string;
  tags?: Record<string, string>;
}

export interface KinesisStream {
  streamName: string;
  streamARN: string;
  streamStatus: string;
  retentionPeriodHours?: number;
  streamCreationTimestamp?: string;
  shardCount?: number;
  tags?: Record<string, string>;
}

export interface AthenaWorkgroup {
  name: string;
  state: string;
  description?: string;
  creationTime?: string;
  tags?: Record<string, string>;
}

export interface EMRCluster {
  id: string;
  name: string;
  status: string;
  creationDateTime?: string;
  releaseLabel?: string;
  instanceCount?: number;
  tags?: Record<string, string>;
}
