import { $ } from "bun";
import { getLog } from "./utils";
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

  const result =
    await $`aws kinesis list-streams --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const streams: KinesisStream[] = [];

  for (const streamName of data.StreamNames || []) {
    try {
      const descResult =
        await $`aws kinesis describe-stream --stream-name ${streamName} --region ${region} --output json`.text();
      const descData = JSON.parse(descResult);
      const streamDesc = descData.StreamDescription;

      // Get tags
      const tags: Record<string, string> = {};
      try {
        const tagsResult =
          await $`aws kinesis list-tags-for-stream --stream-name ${streamName} --region ${region} --output json`.text();
        const tagsData = JSON.parse(tagsResult);
        if (tagsData.Tags) {
          for (const tag of tagsData.Tags) {
            tags[tag.Key] = tag.Value;
          }
        }
      } catch {}

      streams.push({
        streamName: streamDesc.StreamName,
        streamARN: streamDesc.StreamARN,
        streamStatus: streamDesc.StreamStatus,
        retentionPeriodHours: streamDesc.RetentionPeriodHours,
        streamCreationTimestamp: streamDesc.StreamCreationTimestamp,
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

  const result =
    await $`aws athena list-work-groups --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const workgroups: AthenaWorkgroup[] = [];

  for (const wg of data.WorkGroups || []) {
    try {
      const descResult =
        await $`aws athena get-work-group --work-group ${wg.Name} --region ${region} --output json`.text();
      const descData = JSON.parse(descResult);
      const workgroup = descData.WorkGroup;

      const tags: Record<string, string> = {};
      try {
        const tagsResult =
          await $`aws athena list-tags-for-resource --resource-arn arn:aws:athena:${region}:*:workgroup/${wg.Name} --region ${region} --output json`.text();
        const tagsData = JSON.parse(tagsResult);
        if (tagsData.Tags) {
          for (const tag of tagsData.Tags) {
            tags[tag.Key] = tag.Value;
          }
        }
      } catch {}

      workgroups.push({
        name: workgroup.Name,
        state: workgroup.State,
        description: workgroup.Description,
        creationTime: workgroup.CreationTime,
        tags,
      });
    } catch {}
  }

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

  const result =
    await $`aws emr list-clusters --active --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const clusters: EMRCluster[] = [];

  for (const cluster of data.Clusters || []) {
    try {
      const descResult =
        await $`aws emr describe-cluster --cluster-id ${cluster.Id} --region ${region} --output json`.text();
      const descData = JSON.parse(descResult);
      const clusterDetails = descData.Cluster;

      const tags: Record<string, string> = {};
      if (clusterDetails.Tags) {
        for (const tag of clusterDetails.Tags) {
          tags[tag.Key] = tag.Value;
        }
      }

      clusters.push({
        id: cluster.Id,
        name: cluster.Name,
        status: cluster.Status?.State || "UNKNOWN",
        creationDateTime: clusterDetails.Status?.Timeline?.CreationDateTime,
        releaseLabel: clusterDetails.ReleaseLabel,
        instanceCount:
          clusterDetails.InstanceCollectionType === "INSTANCE_FLEET"
            ? clusterDetails.InstanceFleets?.length || 0
            : clusterDetails.InstanceGroups?.length || 0,
        tags,
      });
    } catch {}
  }

  return clusters;
}
