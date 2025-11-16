import { EC2Client } from "@aws-sdk/client-ec2";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { S3Client } from "@aws-sdk/client-s3";
import { RDSClient } from "@aws-sdk/client-rds";
import { IAMClient } from "@aws-sdk/client-iam";
import { ECSClient } from "@aws-sdk/client-ecs";
import { EKSClient } from "@aws-sdk/client-eks";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { Route53Client } from "@aws-sdk/client-route-53";
import { RedshiftClient } from "@aws-sdk/client-redshift";
import { GlueClient } from "@aws-sdk/client-glue";
import { OpenSearchClient } from "@aws-sdk/client-opensearch";
import { KMSClient } from "@aws-sdk/client-kms";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { ECRClient } from "@aws-sdk/client-ecr";
import { ElasticLoadBalancingV2Client } from "@aws-sdk/client-elastic-load-balancing-v2";
import { ElastiCacheClient } from "@aws-sdk/client-elasticache";
import { EFSClient } from "@aws-sdk/client-efs";
import { BackupClient } from "@aws-sdk/client-backup";
import { AutoScalingClient } from "@aws-sdk/client-auto-scaling";
import { WAFV2Client } from "@aws-sdk/client-wafv2";
import { GuardDutyClient } from "@aws-sdk/client-guardduty";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { CloudFormationClient } from "@aws-sdk/client-cloudformation";
import { APIGatewayClient } from "@aws-sdk/client-api-gateway";
import { SFNClient } from "@aws-sdk/client-sfn";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { CloudTrailClient } from "@aws-sdk/client-cloudtrail";
import { SSMClient } from "@aws-sdk/client-ssm";
import { OrganizationsClient } from "@aws-sdk/client-organizations";
import { ConfigServiceClient } from "@aws-sdk/client-config-service";
import { SQSClient } from "@aws-sdk/client-sqs";
import { SNSClient } from "@aws-sdk/client-sns";
import { KinesisClient } from "@aws-sdk/client-kinesis";
import { AthenaClient } from "@aws-sdk/client-athena";
import { EMRClient } from "@aws-sdk/client-emr";
import { ControlTowerClient } from "@aws-sdk/client-controltower";
import { getCredentialsProvider } from "./credentials";

/**
 * AWS SDK Client Factory
 *
 * Creates and configures AWS SDK clients with proper credentials and retry logic.
 * Clients are cached per region for reuse.
 */

// Client cache to avoid recreating clients
const clientCache = new Map<string, any>();

/**
 * Get cache key for a client
 */
function getCacheKey(service: string, region?: string): string {
  return region ? `${service}-${region}` : service;
}

/**
 * Base configuration for all clients
 */
function getBaseConfig(region?: string) {
  return {
    credentials: getCredentialsProvider(),
    region: region || process.env.AWS_REGION || "us-east-1",
    maxAttempts: 3, // Retry up to 3 times (configurable later)
  };
}

// EC2 Client
export function getEC2Client(region: string): EC2Client {
  const key = getCacheKey("ec2", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new EC2Client(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// Lambda Client
export function getLambdaClient(region: string): LambdaClient {
  const key = getCacheKey("lambda", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new LambdaClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// S3 Client (global service, but can specify region)
export function getS3Client(region?: string): S3Client {
  const key = getCacheKey("s3", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new S3Client(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// RDS Client
export function getRDSClient(region: string): RDSClient {
  const key = getCacheKey("rds", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new RDSClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// IAM Client (global service)
export function getIAMClient(): IAMClient {
  const key = getCacheKey("iam");
  if (!clientCache.has(key)) {
    clientCache.set(
      key,
      new IAMClient(getBaseConfig("us-east-1")), // IAM is global, always use us-east-1
    );
  }
  return clientCache.get(key);
}

// ECS Client
export function getECSClient(region: string): ECSClient {
  const key = getCacheKey("ecs", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new ECSClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// EKS Client
export function getEKSClient(region: string): EKSClient {
  const key = getCacheKey("eks", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new EKSClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// DynamoDB Client
export function getDynamoDBClient(region: string): DynamoDBClient {
  const key = getCacheKey("dynamodb", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new DynamoDBClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// CloudFront Client (global service)
export function getCloudFrontClient(): CloudFrontClient {
  const key = getCacheKey("cloudfront");
  if (!clientCache.has(key)) {
    clientCache.set(
      key,
      new CloudFrontClient(getBaseConfig("us-east-1")), // CloudFront is global
    );
  }
  return clientCache.get(key);
}

// Route53 Client (global service)
export function getRoute53Client(): Route53Client {
  const key = getCacheKey("route53");
  if (!clientCache.has(key)) {
    clientCache.set(
      key,
      new Route53Client(getBaseConfig("us-east-1")), // Route53 is global
    );
  }
  return clientCache.get(key);
}

// Redshift Client
export function getRedshiftClient(region: string): RedshiftClient {
  const key = getCacheKey("redshift", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new RedshiftClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// Glue Client
export function getGlueClient(region: string): GlueClient {
  const key = getCacheKey("glue", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new GlueClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// OpenSearch Client
export function getOpenSearchClient(region: string): OpenSearchClient {
  const key = getCacheKey("opensearch", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new OpenSearchClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// KMS Client
export function getKMSClient(region: string): KMSClient {
  const key = getCacheKey("kms", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new KMSClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// CloudWatch Client
export function getCloudWatchClient(region: string): CloudWatchClient {
  const key = getCacheKey("cloudwatch", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new CloudWatchClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// Secrets Manager Client
export function getSecretsManagerClient(region: string): SecretsManagerClient {
  const key = getCacheKey("secretsmanager", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new SecretsManagerClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// ECR Client
export function getECRClient(region: string): ECRClient {
  const key = getCacheKey("ecr", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new ECRClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// Elastic Load Balancing V2 Client
export function getELBv2Client(region: string): ElasticLoadBalancingV2Client {
  const key = getCacheKey("elbv2", region);
  if (!clientCache.has(key)) {
    clientCache.set(
      key,
      new ElasticLoadBalancingV2Client(getBaseConfig(region)),
    );
  }
  return clientCache.get(key);
}

// ElastiCache Client
export function getElastiCacheClient(region: string): ElastiCacheClient {
  const key = getCacheKey("elasticache", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new ElastiCacheClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// EFS Client
export function getEFSClient(region: string): EFSClient {
  const key = getCacheKey("efs", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new EFSClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// Backup Client
export function getBackupClient(region: string): BackupClient {
  const key = getCacheKey("backup", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new BackupClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// Auto Scaling Client
export function getAutoScalingClient(region: string): AutoScalingClient {
  const key = getCacheKey("autoscaling", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new AutoScalingClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// WAF V2 Client (regional and global)
export function getWAFv2Client(region: string): WAFV2Client {
  const key = getCacheKey("wafv2", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new WAFV2Client(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// GuardDuty Client
export function getGuardDutyClient(region: string): GuardDutyClient {
  const key = getCacheKey("guardduty", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new GuardDutyClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// Cognito Identity Provider Client
export function getCognitoClient(
  region: string,
): CognitoIdentityProviderClient {
  const key = getCacheKey("cognito", region);
  if (!clientCache.has(key)) {
    clientCache.set(
      key,
      new CognitoIdentityProviderClient(getBaseConfig(region)),
    );
  }
  return clientCache.get(key);
}

// CloudFormation Client
export function getCloudFormationClient(region: string): CloudFormationClient {
  const key = getCacheKey("cloudformation", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new CloudFormationClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// API Gateway Client
export function getAPIGatewayClient(region: string): APIGatewayClient {
  const key = getCacheKey("apigateway", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new APIGatewayClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// Step Functions Client
export function getStepFunctionsClient(region: string): SFNClient {
  const key = getCacheKey("sfn", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new SFNClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// EventBridge Client
export function getEventBridgeClient(region: string): EventBridgeClient {
  const key = getCacheKey("eventbridge", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new EventBridgeClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// CloudTrail Client
export function getCloudTrailClient(region: string): CloudTrailClient {
  const key = getCacheKey("cloudtrail", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new CloudTrailClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// SSM Client
export function getSSMClient(region: string): SSMClient {
  const key = getCacheKey("ssm", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new SSMClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// Organizations Client (global service)
export function getOrganizationsClient(): OrganizationsClient {
  const key = getCacheKey("organizations");
  if (!clientCache.has(key)) {
    clientCache.set(
      key,
      new OrganizationsClient(getBaseConfig("us-east-1")), // Organizations is global
    );
  }
  return clientCache.get(key);
}

// Config Service Client
export function getConfigClient(region: string): ConfigServiceClient {
  const key = getCacheKey("config", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new ConfigServiceClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// SQS Client
export function getSQSClient(region: string): SQSClient {
  const key = getCacheKey("sqs", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new SQSClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// SNS Client
export function getSNSClient(region: string): SNSClient {
  const key = getCacheKey("sns", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new SNSClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// Kinesis Client
export function getKinesisClient(region: string): KinesisClient {
  const key = getCacheKey("kinesis", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new KinesisClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// Athena Client
export function getAthenaClient(region: string): AthenaClient {
  const key = getCacheKey("athena", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new AthenaClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// EMR Client
export function getEMRClient(region: string): EMRClient {
  const key = getCacheKey("emr", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new EMRClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

// Control Tower Client (regional service)
export function getControlTowerClient(region: string): ControlTowerClient {
  const key = getCacheKey("controltower", region);
  if (!clientCache.has(key)) {
    clientCache.set(key, new ControlTowerClient(getBaseConfig(region)));
  }
  return clientCache.get(key);
}

/**
 * Clear all cached clients (useful for testing or credential refresh)
 */
export function clearClientCache(): void {
  clientCache.clear();
}
