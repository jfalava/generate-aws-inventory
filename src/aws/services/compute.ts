import { $ } from "bun";
import { getLog } from "./utils";
import type {
  EC2Instance,
  LambdaFunction,
  ECSCluster,
  EKSCluster,
  AutoScalingGroup,
} from "../aws-cli.types";

export async function describeEC2(region: string): Promise<EC2Instance[]> {
  const { log, verbose } = getLog();
  const result =
    await $`aws ec2 describe-instances --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const instances: EC2Instance[] = [];

  for (const reservation of data.Reservations || []) {
    for (const instance of reservation.Instances) {
      const name =
        instance.Tags?.find((tag: any) => tag.Key === "Name")?.Value || "N/A";
      const state = instance.State.Name;
      const type = instance.InstanceType;
      const id = instance.InstanceId;
      const privateIp = instance.PrivateIpAddress || "N/A";
      const publicIp = instance.PublicIpAddress || "N/A";
      const vpcId = instance.VpcId;
      const launchTime = instance.LaunchTime;

      const tags: Record<string, string> = {};
      if (instance.Tags) {
        for (const tag of instance.Tags) {
          tags[tag.Key] = tag.Value;
        }
      }

      const encrypted =
        instance.BlockDeviceMappings?.some(
          (bdm: any) => bdm.Ebs?.Encrypted === true,
        ) || false;

      instances.push({
        id,
        name,
        state,
        type,
        privateIp,
        publicIp,
        vpcId,
        tags,
        launchTime,
        encrypted,
      });
    }
  }

  return instances;
}

export async function describeLambdaFunctions(
  region: string,
): Promise<LambdaFunction[]> {
  const { log, verbose } = getLog();
  const result =
    await $`aws lambda list-functions --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const functions: LambdaFunction[] = [];

  for (const func of data.Functions || []) {
    const tags: Record<string, string> = {};
    if (func.Tags) {
      for (const [key, value] of Object.entries(func.Tags)) {
        tags[key] = value as string;
      }
    }

    functions.push({
      name: func.FunctionName,
      runtime: func.Runtime,
      handler: func.Handler,
      lastModified: func.LastModified,
      memorySize: func.MemorySize,
      timeout: func.Timeout,
      vpcId: func.VpcConfig?.VpcId,
      tags,
    });
  }

  return functions;
}

export async function describeECSClusters(
  region: string,
): Promise<ECSCluster[]> {
  const { log, verbose } = getLog();
  const result =
    await $`aws ecs list-clusters --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const clusters: ECSCluster[] = [];

  for (const clusterArn of data.clusterArns || []) {
    const descResult =
      await $`aws ecs describe-clusters --clusters ${clusterArn} --region ${region} --output json`.text();
    const descData = JSON.parse(descResult);
    for (const cluster of descData.clusters || []) {
      const tags: Record<string, string> = {};
      if (cluster.tags) {
        for (const tag of cluster.tags) {
          tags[tag.key] = tag.value;
        }
      }

      clusters.push({
        name: cluster.clusterName,
        status: cluster.status,
        registeredContainerInstancesCount:
          cluster.registeredContainerInstancesCount || 0,
        runningTasksCount: cluster.runningTasksCount || 0,
        pendingTasksCount: cluster.pendingTasksCount || 0,
        activeServicesCount: cluster.activeServicesCount || 0,
        tags,
      });
    }
  }

  return clusters;
}

export async function describeEKSClusters(
  region: string,
): Promise<EKSCluster[]> {
  const { log, verbose } = getLog();
  const result =
    await $`aws eks list-clusters --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const clusters: EKSCluster[] = [];

  for (const clusterName of data.clusters || []) {
    const descResult =
      await $`aws eks describe-cluster --name ${clusterName} --region ${region} --output json`.text();
    const descData = JSON.parse(descResult);
    const cluster = descData.cluster;

    const tags: Record<string, string> = {};
    if (cluster.tags) {
      for (const [key, value] of Object.entries(cluster.tags)) {
        tags[key] = value as string;
      }
    }

    clusters.push({
      name: cluster.name,
      status: cluster.status,
      version: cluster.version,
      arn: cluster.arn,
      createdAt: cluster.createdAt,
      endpoint: cluster.endpoint,
      tags,
    });
  }

  return clusters;
}

/**
 * Retrieves all Auto Scaling Groups in a region.
 *
 * @param {string} region - AWS region code
 * @returns {Promise<AutoScalingGroup[]>} Array of Auto Scaling Group objects
 * @throws {Error} If unable to retrieve ASGs
 */
export async function describeAutoScalingGroups(
  region: string,
): Promise<AutoScalingGroup[]> {
  const { log, verbose } = getLog();
  const result =
    await $`aws autoscaling describe-auto-scaling-groups --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const asgs: AutoScalingGroup[] = [];

  for (const asg of data.AutoScalingGroups || []) {
    const tags: Record<string, string> = {};
    if (asg.Tags) {
      for (const tag of asg.Tags) {
        tags[tag.Key] = tag.Value;
      }
    }

    asgs.push({
      autoScalingGroupName: asg.AutoScalingGroupName,
      minSize: asg.MinSize,
      maxSize: asg.MaxSize,
      desiredCapacity: asg.DesiredCapacity,
      availabilityZones: asg.AvailabilityZones,
      healthCheckType: asg.HealthCheckType,
      createdTime: asg.CreatedTime,
      tags,
    });
  }

  return asgs;
}
