// Re-export utility functions
export { setLog, getAccountId, getAllRegions } from "./services/utils";

// Re-export compute services
export {
  describeEC2,
  describeLambdaFunctions,
  describeECSClusters,
  describeEKSClusters,
  describeAutoScalingGroups,
} from "./services/compute";

// Re-export storage services
export {
  describeS3,
  describeEBSVolumes,
  describeEFSFileSystems,
  describeBackupVaults,
} from "./services/storage";

// Re-export database services
export {
  describeRDS,
  describeDynamoDBTables,
  describeRedshiftClusters,
  describeOpenSearchDomains,
  describeElastiCacheClusters,
} from "./services/database";

// Re-export networking services
export {
  describeVPCs,
  describeSubnets,
  describeSecurityGroups,
  describeLoadBalancers,
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
} from "./services/networking";

// Re-export security services
export {
  describeIAMUsers,
  describeIAMRoles,
  describeKMSKeys,
  describeSecretsManagerSecrets,
  describeWAFWebACLs,
  describeGuardDutyDetectors,
  describeCognitoUserPools,
} from "./services/security";

// Re-export developer tools services
export {
  describeECRRepositories,
  describeGlueJobs,
} from "./services/developer-tools";

// Re-export management services
export {
  describeCloudWatchAlarms,
  describeCloudFrontDistributions,
  describeRoute53HostedZones,
  describeCloudFormationStacks,
  describeAPIGateways,
  describeStepFunctions,
  describeEventBridgeRules,
  describeCloudTrails,
  describeSSMParameters,
} from "./services/management";

// Re-export governance services
export {
  describeControlTowerGuardrails,
  describeServiceControlPolicies,
  describeConfigRules,
} from "./services/governance";

// Re-export application integration services
export {
  describeSQSQueues,
  describeSNSTopics,
} from "./services/application-integration";

// Re-export analytics services
export {
  describeKinesisStreams,
  describeAthenaWorkgroups,
  describeEMRClusters,
} from "./services/analytics";
