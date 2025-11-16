import {
  ListStreamsCommand,
  DescribeStreamCommand,
  ListTagsForStreamCommand,
} from "@aws-sdk/client-kinesis";
import {
  ListWorkGroupsCommand,
  GetWorkGroupCommand,
  ListTagsForResourceCommand as ListAthenaTagsCommand,
} from "@aws-sdk/client-athena";
import {
  ListClustersCommand as ListEMRClustersCommand,
  DescribeClusterCommand as DescribeEMRClusterCommand,
} from "@aws-sdk/client-emr";
import { getLog } from "./utils";
import {
  getKinesisClient,
  getAthenaClient,
  getEMRClient,
} from "../sdk-clients";
import { executeWithRetry } from "../sdk-error-handler";
import type {
  KinesisStream,
  AthenaWorkgroup,
  EMRCluster,
} from "../aws-cli.types";

/**
 * Describes Kinesis Streams
 * @param region The AWS region to query
 * @returns Array of Kinesis Streams
 * @example
 * const streams = await describeKinesisStreams("us-east-1");
 */
export async function describeKinesisStreams(
  region: string,
): Promise<KinesisStream[]> {
  const { log, verbose } = getLog();
  const client = getKinesisClient(region);

  const streams: KinesisStream[] = [];

  // Use pagination to get all streams
  let nextToken: string | undefined = undefined;
  const streamNames: string[] = [];

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new ListStreamsCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "Kinesis List",
      3,
      1000,
    );

    if (data.StreamNames) {
      streamNames.push(...data.StreamNames);
    }

    nextToken = data.NextToken;
    // Note: HasMoreStreams is deprecated, use NextToken instead
  } while (nextToken);

  // Now describe each stream
  for (const streamName of streamNames) {
    try {
      const descData = await executeWithRetry(
        async () => {
          const command = new DescribeStreamCommand({
            StreamName: streamName,
          });
          return await client.send(command);
        },
        "Kinesis Describe",
        3,
        1000,
      );

      const streamDesc = descData.StreamDescription;
      if (!streamDesc) continue;

      // Get tags
      const tags: Record<string, string> = {};
      try {
        const tagsData = await executeWithRetry(
          async () => {
            const command = new ListTagsForStreamCommand({
              StreamName: streamName,
            });
            return await client.send(command);
          },
          "Kinesis Tags",
          2,
          500,
        );

        if (tagsData.Tags) {
          for (const tag of tagsData.Tags) {
            if (tag.Key && tag.Value) {
              tags[tag.Key] = tag.Value;
            }
          }
        }
      } catch {}

      streams.push({
        streamName: streamDesc.StreamName || "unknown",
        streamARN: streamDesc.StreamARN || "unknown",
        streamStatus: streamDesc.StreamStatus || "UNKNOWN",
        retentionPeriodHours: streamDesc.RetentionPeriodHours || 24,
        streamCreationTimestamp:
          streamDesc.StreamCreationTimestamp?.toISOString() || "N/A",
        shardCount: streamDesc.Shards?.length || 0,
        tags,
      });
    } catch {}
  }

  return streams;
}

/**
 * Describes Athena Workgroups
 * @param region The AWS region to query
 * @returns Array of Athena Workgroups
 * @example
 * const workgroups = await describeAthenaWorkgroups("us-east-1");
 */
export async function describeAthenaWorkgroups(
  region: string,
): Promise<AthenaWorkgroup[]> {
  const { log, verbose } = getLog();
  const client = getAthenaClient(region);

  const workgroups: AthenaWorkgroup[] = [];

  // Use pagination to get all workgroups
  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new ListWorkGroupsCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "Athena List",
      3,
      1000,
    );

    for (const wg of data.WorkGroups || []) {
      if (!wg.Name) continue;

      try {
        const descData = await executeWithRetry(
          async () => {
            const command = new GetWorkGroupCommand({
              WorkGroup: wg.Name,
            });
            return await client.send(command);
          },
          "Athena Describe",
          3,
          1000,
        );

        const workgroup = descData.WorkGroup;
        if (!workgroup) continue;

        const tags: Record<string, string> = {};
        // Tags for Athena workgroups require the ARN, which we can construct
        // or skip if not critical

        workgroups.push({
          name: workgroup.Name || "unknown",
          state: workgroup.State || "UNKNOWN",
          description: workgroup.Description,
          creationTime: workgroup.CreationTime?.toISOString() || "N/A",
          tags,
        });
      } catch {}
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return workgroups;
}

/**
 * Describes EMR Clusters
 * @param region The AWS region to query
 * @returns Array of EMR Clusters
 * @example
 * const clusters = await describeEMRClusters("us-east-1");
 */
export async function describeEMRClusters(
  region: string,
): Promise<EMRCluster[]> {
  const { log, verbose } = getLog();
  const client = getEMRClient(region);

  const clusters: EMRCluster[] = [];

  // List active clusters
  let marker: string | undefined = undefined;
  const clusterIds: string[] = [];

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new ListEMRClustersCommand({
          ClusterStates: [
            "STARTING",
            "BOOTSTRAPPING",
            "RUNNING",
            "WAITING",
            "TERMINATING",
          ],
          Marker: marker,
        });
        return await client.send(command);
      },
      "EMR List",
      3,
      1000,
    );

    for (const cluster of data.Clusters || []) {
      if (cluster.Id) {
        clusterIds.push(cluster.Id);
      }
    }

    marker = data.Marker;
  } while (marker);

  // Now describe each cluster
  for (const clusterId of clusterIds) {
    try {
      const descData = await executeWithRetry(
        async () => {
          const command = new DescribeEMRClusterCommand({
            ClusterId: clusterId,
          });
          return await client.send(command);
        },
        "EMR Describe",
        3,
        1000,
      );

      const clusterDetails = descData.Cluster;
      if (!clusterDetails) continue;

      const tags: Record<string, string> = {};
      if (clusterDetails.Tags) {
        for (const tag of clusterDetails.Tags) {
          if (tag.Key && tag.Value) {
            tags[tag.Key] = tag.Value;
          }
        }
      }

      clusters.push({
        id: clusterDetails.Id || "unknown",
        name: clusterDetails.Name || "unknown",
        status: clusterDetails.Status?.State || "UNKNOWN",
        creationDateTime:
          clusterDetails.Status?.Timeline?.CreationDateTime?.toISOString() ||
          "N/A",
        releaseLabel: clusterDetails.ReleaseLabel || "unknown",
        // Note: InstanceFleets/InstanceGroups not available in DescribeClusterCommand response
        // Would need separate ListInstanceFleets/ListInstanceGroups calls
        instanceCount: 0,
        tags,
      });
    } catch {}
  }

  return clusters;
}
