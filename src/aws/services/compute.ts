import { DescribeInstancesCommand, type Instance } from "@aws-sdk/client-ec2";
import {
  ListFunctionsCommand,
  type FunctionConfiguration,
} from "@aws-sdk/client-lambda";
import {
  ListClustersCommand as ListECSClustersCommand,
  DescribeClustersCommand as DescribeECSClustersCommand,
  type Cluster as ECSClusterType,
} from "@aws-sdk/client-ecs";
import {
  ListClustersCommand as ListEKSClustersCommand,
  DescribeClusterCommand as DescribeEKSClusterCommand,
  type Cluster as EKSClusterType,
} from "@aws-sdk/client-eks";
import {
  DescribeAutoScalingGroupsCommand,
  type AutoScalingGroup as AWSAutoScalingGroup,
} from "@aws-sdk/client-auto-scaling";
import { getLog } from "./utils";
import {
  getEC2Client,
  getLambdaClient,
  getECSClient,
  getEKSClient,
  getAutoScalingClient,
} from "../sdk-clients";
import { executeWithRetry } from "../sdk-error-handler";
import type {
  EC2Instance,
  LambdaFunction,
  ECSCluster,
  EKSCluster,
  AutoScalingGroup,
} from "../aws-cli.types";

export async function describeEC2(region: string): Promise<EC2Instance[]> {
  const { log, verbose } = getLog();
  const client = getEC2Client(region);

  const instances: EC2Instance[] = [];

  // Use pagination to get all instances
  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeInstancesCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "EC2",
      3,
      1000,
    );

    for (const reservation of data.Reservations || []) {
      for (const instance of reservation.Instances || []) {
        const name =
          instance.Tags?.find((tag) => tag.Key === "Name")?.Value || "N/A";
        const state = instance.State?.Name || "unknown";
        const type = instance.InstanceType || "unknown";
        const id = instance.InstanceId || "unknown";
        const privateIp = instance.PrivateIpAddress || "N/A";
        const publicIp = instance.PublicIpAddress || "N/A";
        const vpcId = instance.VpcId || "N/A";
        const launchTime = instance.LaunchTime?.toISOString() || "N/A";

        const tags: Record<string, string> = {};
        if (instance.Tags) {
          for (const tag of instance.Tags) {
            if (tag.Key && tag.Value) {
              tags[tag.Key] = tag.Value;
            }
          }
        }

        // Note: Encrypted status not directly available from BlockDeviceMappings in SDK
        // Would need separate DescribeVolumes call to get encryption status
        const encrypted = false;

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

    nextToken = data.NextToken;
  } while (nextToken);

  return instances;
}

export async function describeLambdaFunctions(
  region: string,
): Promise<LambdaFunction[]> {
  const { log, verbose } = getLog();
  const client = getLambdaClient(region);

  const functions: LambdaFunction[] = [];

  // Use pagination to get all functions
  let marker: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new ListFunctionsCommand({
          Marker: marker,
        });
        return await client.send(command);
      },
      "Lambda",
      3,
      1000,
    );

    for (const func of data.Functions || []) {
      // Note: Tags are not included in ListFunctionsCommand response
      // Would need separate ListTagsCommand call to get tags
      const tags: Record<string, string> = {};

      functions.push({
        name: func.FunctionName || "unknown",
        runtime: func.Runtime || "unknown",
        handler: func.Handler || "unknown",
        lastModified: func.LastModified || "N/A",
        memorySize: func.MemorySize || 0,
        timeout: func.Timeout || 0,
        vpcId: func.VpcConfig?.VpcId,
        tags,
      });
    }

    marker = data.NextMarker;
  } while (marker);

  return functions;
}

export async function describeECSClusters(
  region: string,
): Promise<ECSCluster[]> {
  const { log, verbose } = getLog();
  const client = getECSClient(region);

  const clusters: ECSCluster[] = [];

  // First, list all cluster ARNs
  let nextToken: string | undefined = undefined;
  const clusterArns: string[] = [];

  do {
    const listData = await executeWithRetry(
      async () => {
        const command = new ListECSClustersCommand({
          nextToken,
        });
        return await client.send(command);
      },
      "ECS List",
      3,
      1000,
    );

    if (listData.clusterArns) {
      clusterArns.push(...listData.clusterArns);
    }

    nextToken = listData.nextToken;
  } while (nextToken);

  // Now describe each cluster (ECS API allows up to 100 clusters per call)
  const batchSize = 100;
  for (let i = 0; i < clusterArns.length; i += batchSize) {
    const batch = clusterArns.slice(i, i + batchSize);

    const descData = await executeWithRetry(
      async () => {
        const command = new DescribeECSClustersCommand({
          clusters: batch,
          include: ["TAGS"],
        });
        return await client.send(command);
      },
      "ECS Describe",
      3,
      1000,
    );

    for (const cluster of descData.clusters || []) {
      const tags: Record<string, string> = {};
      if (cluster.tags) {
        for (const tag of cluster.tags) {
          if (tag.key && tag.value) {
            tags[tag.key] = tag.value;
          }
        }
      }

      clusters.push({
        name: cluster.clusterName || "unknown",
        status: cluster.status || "UNKNOWN",
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
  const client = getEKSClient(region);

  const clusters: EKSCluster[] = [];

  // First, list all cluster names
  let nextToken: string | undefined = undefined;
  const clusterNames: string[] = [];

  do {
    const listData = await executeWithRetry(
      async () => {
        const command = new ListEKSClustersCommand({
          nextToken,
        });
        return await client.send(command);
      },
      "EKS List",
      3,
      1000,
    );

    if (listData.clusters) {
      clusterNames.push(...listData.clusters);
    }

    nextToken = listData.nextToken;
  } while (nextToken);

  // Now describe each cluster individually
  for (const clusterName of clusterNames) {
    const descData = await executeWithRetry(
      async () => {
        const command = new DescribeEKSClusterCommand({
          name: clusterName,
        });
        return await client.send(command);
      },
      "EKS Describe",
      3,
      1000,
    );

    const cluster = descData.cluster;
    if (cluster) {
      const tags: Record<string, string> = {};
      if (cluster.tags) {
        for (const [key, value] of Object.entries(cluster.tags)) {
          tags[key] = value as string;
        }
      }

      clusters.push({
        name: cluster.name || "unknown",
        status: cluster.status || "UNKNOWN",
        version: cluster.version || "unknown",
        arn: cluster.arn || "unknown",
        createdAt: cluster.createdAt?.toISOString() || "N/A",
        endpoint: cluster.endpoint || "N/A",
        tags,
      });
    }
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
  const client = getAutoScalingClient(region);

  const asgs: AutoScalingGroup[] = [];

  // Use pagination to get all ASGs
  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeAutoScalingGroupsCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "Auto Scaling",
      3,
      1000,
    );

    for (const asg of data.AutoScalingGroups || []) {
      const tags: Record<string, string> = {};
      if (asg.Tags) {
        for (const tag of asg.Tags) {
          if (tag.Key && tag.Value) {
            tags[tag.Key] = tag.Value;
          }
        }
      }

      asgs.push({
        autoScalingGroupName: asg.AutoScalingGroupName || "unknown",
        minSize: asg.MinSize || 0,
        maxSize: asg.MaxSize || 0,
        desiredCapacity: asg.DesiredCapacity || 0,
        availabilityZones: asg.AvailabilityZones || [],
        healthCheckType: asg.HealthCheckType || "UNKNOWN",
        createdTime: asg.CreatedTime?.toISOString() || "N/A",
        tags,
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return asgs;
}
