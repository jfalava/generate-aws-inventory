import {
  DescribeAlarmsCommand,
  type MetricAlarm,
} from "@aws-sdk/client-cloudwatch";
import {
  ListDistributionsCommand,
  type DistributionSummary,
} from "@aws-sdk/client-cloudfront";
import {
  ListHostedZonesCommand,
  type HostedZone,
} from "@aws-sdk/client-route-53";
import {
  DescribeStacksCommand,
  type Stack,
} from "@aws-sdk/client-cloudformation";
import { GetRestApisCommand, type RestApi } from "@aws-sdk/client-api-gateway";
import {
  ListStateMachinesCommand,
  type StateMachineListItem,
} from "@aws-sdk/client-sfn";
import { ListRulesCommand, type Rule } from "@aws-sdk/client-eventbridge";
import {
  ListTrailsCommand,
  DescribeTrailsCommand,
  type Trail,
  type TrailInfo,
} from "@aws-sdk/client-cloudtrail";
import {
  DescribeParametersCommand,
  type ParameterMetadata,
} from "@aws-sdk/client-ssm";
import { getLog } from "./utils";
import type {
  CloudWatchAlarm,
  CloudFrontDistribution,
  Route53HostedZone,
  CloudFormationStack,
  APIGateway,
  StepFunction,
  EventBridgeRule,
  CloudTrail,
  SSMParameter,
} from "../aws-cli.types";
import {
  getCloudWatchClient,
  getCloudFrontClient,
  getRoute53Client,
  getCloudFormationClient,
  getAPIGatewayClient,
  getStepFunctionsClient,
  getEventBridgeClient,
  getCloudTrailClient,
  getSSMClient,
} from "../sdk-clients";
import { executeWithRetry } from "../sdk-error-handler";

export async function describeCloudWatchAlarms(
  region: string,
): Promise<CloudWatchAlarm[]> {
  const { log, verbose } = getLog();
  const client = getCloudWatchClient(region);

  const alarms: CloudWatchAlarm[] = [];

  // Use pagination to get all alarms
  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeAlarmsCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "CloudWatch",
      3,
      1000,
    );

    for (const alarm of data.MetricAlarms || []) {
      alarms.push({
        alarmName: alarm.AlarmName || "unknown",
        alarmDescription: alarm.AlarmDescription || "N/A",
        stateValue: alarm.StateValue || "UNKNOWN",
        stateReason: alarm.StateReason || "N/A",
        metricName: alarm.MetricName || "N/A",
        namespace: alarm.Namespace || "N/A",
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return alarms;
}

export async function describeCloudFrontDistributions(): Promise<
  CloudFrontDistribution[]
> {
  const { log, verbose } = getLog();
  const client = getCloudFrontClient();

  const distributions: CloudFrontDistribution[] = [];

  // Use pagination to get all distributions
  let marker: string | undefined = undefined;
  let isTruncated = true;

  while (isTruncated) {
    const data = await executeWithRetry(
      async () => {
        const command = new ListDistributionsCommand({
          Marker: marker,
        });
        return await client.send(command);
      },
      "CloudFront",
      3,
      1000,
    );

    for (const item of data.DistributionList?.Items || []) {
      distributions.push({
        id: item.Id || "unknown",
        domainName: item.DomainName || "unknown",
        status: item.Status || "UNKNOWN",
        enabled: item.Enabled || false,
      });
    }

    isTruncated = data.DistributionList?.IsTruncated || false;
    marker = data.DistributionList?.NextMarker;
  }

  return distributions;
}

export async function describeRoute53HostedZones(): Promise<
  Route53HostedZone[]
> {
  const { log, verbose } = getLog();
  const client = getRoute53Client();

  const zones: Route53HostedZone[] = [];

  // Use pagination to get all hosted zones
  let marker: string | undefined = undefined;
  let isTruncated = true;

  while (isTruncated) {
    const data = await executeWithRetry(
      async () => {
        const command = new ListHostedZonesCommand({
          Marker: marker,
        });
        return await client.send(command);
      },
      "Route53",
      3,
      1000,
    );

    for (const zone of data.HostedZones || []) {
      zones.push({
        id: zone.Id || "unknown",
        name: zone.Name || "unknown",
        privateZone: zone.Config?.PrivateZone || false,
      });
    }

    isTruncated = data.IsTruncated || false;
    marker = data.NextMarker;
  }

  return zones;
}

export async function describeCloudFormationStacks(
  region: string,
): Promise<CloudFormationStack[]> {
  const { log, verbose } = getLog();
  const client = getCloudFormationClient(region);

  const stacks: CloudFormationStack[] = [];

  // Use pagination to get all stacks
  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeStacksCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "CloudFormation",
      3,
      1000,
    );

    for (const stack of data.Stacks || []) {
      const tags: Record<string, string> = {};
      if (stack.Tags) {
        for (const tag of stack.Tags) {
          if (tag.Key && tag.Value) {
            tags[tag.Key] = tag.Value;
          }
        }
      }

      stacks.push({
        stackName: stack.StackName || "unknown",
        stackId: stack.StackId || "unknown",
        stackStatus: stack.StackStatus || "UNKNOWN",
        creationTime: stack.CreationTime?.toISOString() || "N/A",
        lastUpdatedTime: stack.LastUpdatedTime?.toISOString() || "N/A",
        tags,
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return stacks;
}

export async function describeAPIGateways(
  region: string,
): Promise<APIGateway[]> {
  const { log, verbose } = getLog();
  const client = getAPIGatewayClient(region);

  const apis: APIGateway[] = [];

  // Use pagination to get all REST APIs
  let position: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new GetRestApisCommand({
          position: position,
        });
        return await client.send(command);
      },
      "API Gateway",
      3,
      1000,
    );

    for (const api of data.items || []) {
      const tags: Record<string, string> = api.tags || {};

      apis.push({
        id: api.id || "unknown",
        name: api.name || "unknown",
        protocolType: "REST",
        apiEndpoint: api.endpointConfiguration?.types?.[0] || "N/A",
        createdDate: api.createdDate?.toISOString() || "N/A",
        tags,
      });
    }

    position = data.position;
  } while (position);

  return apis;
}

/**
 * Retrieves all Step Functions state machines in a region.
 *
 * @param {string} region - AWS region code
 * @returns {Promise<StepFunction[]>} Array of Step Function objects
 */
export async function describeStepFunctions(
  region: string,
): Promise<StepFunction[]> {
  const { log, verbose } = getLog();
  const client = getStepFunctionsClient(region);

  const stateMachines: StepFunction[] = [];

  // Use pagination to get all state machines
  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new ListStateMachinesCommand({
          nextToken: nextToken,
        });
        return await client.send(command);
      },
      "Step Functions",
      3,
      1000,
    );

    for (const sm of data.stateMachines || []) {
      stateMachines.push({
        stateMachineArn: sm.stateMachineArn || "unknown",
        name: sm.name || "unknown",
        type: sm.type || "STANDARD",
        status: "ACTIVE", // Status is only available in DescribeStateMachine
        creationDate: sm.creationDate?.toISOString() || "N/A",
      });
    }

    nextToken = data.nextToken;
  } while (nextToken);

  return stateMachines;
}

/**
 * Retrieves all EventBridge rules in a region.
 *
 * @param {string} region - AWS region code
 * @returns {Promise<EventBridgeRule[]>} Array of EventBridge rule objects
 */
export async function describeEventBridgeRules(
  region: string,
): Promise<EventBridgeRule[]> {
  const { log, verbose } = getLog();
  const client = getEventBridgeClient(region);

  const rules: EventBridgeRule[] = [];

  // Use pagination to get all rules
  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new ListRulesCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "EventBridge",
      3,
      1000,
    );

    for (const rule of data.Rules || []) {
      rules.push({
        name: rule.Name || "unknown",
        arn: rule.Arn || "unknown",
        state: rule.State || "UNKNOWN",
        description: rule.Description || "N/A",
        eventPattern: rule.EventPattern || "N/A",
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return rules;
}

/**
 * Retrieves all CloudTrail trails in a region.
 *
 * @param {string} region - AWS region code
 * @returns {Promise<CloudTrail[]>} Array of CloudTrail objects
 */
export async function describeCloudTrails(
  region: string,
): Promise<CloudTrail[]> {
  const { log, verbose } = getLog();
  const client = getCloudTrailClient(region);

  const trails: CloudTrail[] = [];

  // Use pagination to get all trail ARNs
  let nextToken: string | undefined = undefined;
  const trailNames: string[] = [];

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new ListTrailsCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "CloudTrail List",
      3,
      1000,
    );

    // Extract trail names from the Trails array
    if (data.Trails) {
      for (const trail of data.Trails) {
        if (trail.Name) {
          trailNames.push(trail.Name);
        }
      }
    }

    nextToken = data.NextToken;
  } while (nextToken);

  // Now describe each trail (API allows multiple trail names)
  for (const trailName of trailNames) {
    try {
      const descData = await executeWithRetry(
        async () => {
          const command = new DescribeTrailsCommand({
            trailNameList: [trailName],
          });
          return await client.send(command);
        },
        "CloudTrail Describe",
        3,
        1000,
      );

      if (descData.trailList && descData.trailList.length > 0) {
        const trailInfo = descData.trailList[0];
        if (trailInfo) {
          trails.push({
            name: trailInfo.Name || "unknown",
            trailARN: trailInfo.TrailARN || "unknown",
            homeRegion: trailInfo.HomeRegion || "N/A",
            isMultiRegionTrail: trailInfo.IsMultiRegionTrail || false,
            isOrganizationTrail: trailInfo.IsOrganizationTrail || false,
            s3BucketName: trailInfo.S3BucketName || "N/A",
            logFileValidationEnabled:
              trailInfo.LogFileValidationEnabled || false,
          });
        }
      }
    } catch {}
  }

  return trails;
}

/**
 * Retrieves all Systems Manager parameters in a region.
 *
 * @param {string} region - AWS region code
 * @returns {Promise<SSMParameter[]>} Array of SSM parameter objects
 */
export async function describeSSMParameters(
  region: string,
): Promise<SSMParameter[]> {
  const { log, verbose } = getLog();
  const client = getSSMClient(region);

  const parameters: SSMParameter[] = [];

  // Use pagination to get all parameters
  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeParametersCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "SSM",
      3,
      1000,
    );

    for (const param of data.Parameters || []) {
      parameters.push({
        name: param.Name || "unknown",
        type: param.Type || "UNKNOWN",
        version: param.Version || 0,
        lastModifiedDate: param.LastModifiedDate?.toISOString() || "N/A",
        arn: param.ARN || "unknown",
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return parameters;
}
