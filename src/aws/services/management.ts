import { $ } from "bun";
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

export async function describeCloudWatchAlarms(
  region: string,
): Promise<CloudWatchAlarm[]> {
  const { log, verbose } = getLog();

  const result =
    await $`aws cloudwatch describe-alarms --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const alarms: CloudWatchAlarm[] = [];

  for (const alarm of data.MetricAlarms || []) {
    alarms.push({
      alarmName: alarm.AlarmName,
      alarmDescription: alarm.AlarmDescription || "N/A",
      stateValue: alarm.StateValue,
      stateReason: alarm.StateReason,
      metricName: alarm.MetricName,
      namespace: alarm.Namespace,
    });
  }

  return alarms;
}

export async function describeCloudFrontDistributions(): Promise<
  CloudFrontDistribution[]
> {
  const { log, verbose } = getLog();

  const result =
    await $`aws cloudfront list-distributions --output json`.text();
  if (!result.trim()) {
    return [];
  }
  const data = JSON.parse(result);

  const distributions: CloudFrontDistribution[] = [];

  for (const item of data.DistributionList?.Items || []) {
    distributions.push({
      id: item.Id,
      domainName: item.DomainName,
      status: item.Status,
      enabled: item.Enabled,
    });
  }

  return distributions;
}

export async function describeRoute53HostedZones(): Promise<
  Route53HostedZone[]
> {
  const { log, verbose } = getLog();

  const result = await $`aws route53 list-hosted-zones --output json`.text();
  const data = JSON.parse(result);

  const zones: Route53HostedZone[] = [];

  for (const zone of data.HostedZones || []) {
    zones.push({
      id: zone.Id,
      name: zone.Name,
      privateZone: zone.Config?.PrivateZone || false,
    });
  }

  return zones;
}

export async function describeCloudFormationStacks(
  region: string,
): Promise<CloudFormationStack[]> {
  const { log, verbose } = getLog();

  const result =
    await $`aws cloudformation describe-stacks --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const stacks: CloudFormationStack[] = [];

  for (const stack of data.Stacks || []) {
    const tags: Record<string, string> = {};
    if (stack.Tags) {
      for (const tag of stack.Tags) {
        tags[tag.Key] = tag.Value;
      }
    }

    stacks.push({
      stackName: stack.StackName,
      stackId: stack.StackId,
      stackStatus: stack.StackStatus,
      creationTime: stack.CreationTime,
      lastUpdatedTime: stack.LastUpdatedTime,
      tags,
    });
  }

  return stacks;
}

export async function describeAPIGateways(
  region: string,
): Promise<APIGateway[]> {
  const { log, verbose } = getLog();

  const result =
    await $`aws apigateway get-rest-apis --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const apis: APIGateway[] = [];

  for (const api of data.items || []) {
    const tags: Record<string, string> = api.tags || {};

    apis.push({
      id: api.id,
      name: api.name,
      protocolType: "REST",
      apiEndpoint: api.endpoint,
      createdDate: api.createdDate,
      tags,
    });
  }

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

  const result =
    await $`aws stepfunctions list-state-machines --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const stateMachines: StepFunction[] = [];

  for (const sm of data.stateMachines || []) {
    stateMachines.push({
      stateMachineArn: sm.stateMachineArn,
      name: sm.name,
      type: sm.type,
      status: sm.status || "ACTIVE",
      creationDate: sm.creationDate,
    });
  }

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

  const result =
    await $`aws events list-rules --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const rules: EventBridgeRule[] = [];

  for (const rule of data.Rules || []) {
    rules.push({
      name: rule.Name,
      arn: rule.Arn,
      state: rule.State,
      description: rule.Description,
      eventPattern: rule.EventPattern,
    });
  }

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

  const result =
    await $`aws cloudtrail list-trails --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const trails: CloudTrail[] = [];

  for (const trail of data.Trails || []) {
    try {
      const descResult =
        await $`aws cloudtrail describe-trails --trail-name-list ${trail.Name} --region ${region} --output json`.text();
      const descData = JSON.parse(descResult);

      if (descData.trailList?.length > 0) {
        const trailInfo = descData.trailList[0];
        trails.push({
          name: trailInfo.Name,
          trailARN: trailInfo.TrailARN,
          homeRegion: trailInfo.HomeRegion,
          isMultiRegionTrail: trailInfo.IsMultiRegionTrail,
          isOrganizationTrail: trailInfo.IsOrganizationTrail,
          s3BucketName: trailInfo.S3BucketName,
          logFileValidationEnabled: trailInfo.LogFileValidationEnabled,
        });
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

  const result =
    await $`aws ssm describe-parameters --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const parameters: SSMParameter[] = [];

  for (const param of data.Parameters || []) {
    parameters.push({
      name: param.Name,
      type: param.Type,
      version: param.Version,
      lastModifiedDate: param.LastModifiedDate,
      arn: param.ARN,
    });
  }

  return parameters;
}
