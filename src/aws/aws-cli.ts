/**
 * AWS CLI integration module - Central barrel export for all AWS service inventory functions.
 *
 * This module provides a unified interface to AWS SDK-based service inventory operations,
 * organized by AWS service categories including compute, storage, database, networking,
 * security, developer tools, management, governance, application integration, and analytics.
 *
 * All exported functions interact with AWS services using the AWS SDK v3 and include
 * automatic retry logic with credential refresh capabilities.
 *
 * @module aws-cli
 */

export { setLog, getAccountId, getAllRegions } from "./services/utils";

export {
  describeEC2,
  describeLambdaFunctions,
  describeECSClusters,
  describeEKSClusters,
  describeAutoScalingGroups,
} from "./services/compute";

export {
  describeS3,
  describeEBSVolumes,
  describeEFSFileSystems,
  describeBackupVaults,
} from "./services/storage";

export {
  describeRDS,
  describeDynamoDBTables,
  describeRedshiftClusters,
  describeOpenSearchDomains,
  describeElastiCacheClusters,
} from "./services/database";

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

export {
  describeIAMUsers,
  describeIAMRoles,
  describeKMSKeys,
  describeSecretsManagerSecrets,
  describeWAFWebACLs,
  describeGuardDutyDetectors,
  describeCognitoUserPools,
} from "./services/security";

export {
  describeECRRepositories,
  describeGlueJobs,
} from "./services/developer-tools";

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

export {
  describeControlTowerGuardrails,
  describeServiceControlPolicies,
  describeConfigRules,
} from "./services/governance";

export {
  describeSQSQueues,
  describeSNSTopics,
} from "./services/application-integration";

export {
  describeKinesisStreams,
  describeAthenaWorkgroups,
  describeEMRClusters,
} from "./services/analytics";
