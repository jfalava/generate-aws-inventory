import { $ } from "bun";
import { getLog } from "./utils";
import type {
  RDSInstance,
  DynamoDBTable,
  RedshiftCluster,
  OpenSearchDomain,
  ElastiCacheCluster,
} from "../aws-cli.types";

export async function describeRDS(region: string): Promise<RDSInstance[]> {
  const { log, verbose } = getLog();
  const result =
    await $`aws rds describe-db-instances --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const rdss: RDSInstance[] = [];

  for (const db of data.DBInstances || []) {
    const tags: Record<string, string> = {};
    if (db.TagList) {
      for (const tag of db.TagList) {
        tags[tag.Key] = tag.Value;
      }
    }

    rdss.push({
      id: db.DBInstanceIdentifier,
      name: db.DBName || "N/A",
      engine: db.Engine,
      status: db.DBInstanceStatus,
      instanceClass: db.DBInstanceClass,
      storageSize: db.AllocatedStorage,
      vpcId: db.DBSubnetGroup?.VpcId,
      publiclyAccessible: db.PubliclyAccessible,
      encrypted: db.StorageEncrypted,
      createTime: db.InstanceCreateTime,
      tags,
    });
  }

  return rdss;
}

export async function describeDynamoDBTables(
  region: string,
): Promise<DynamoDBTable[]> {
  const { log, verbose } = getLog();
  const result =
    await $`aws dynamodb list-tables --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const tables: DynamoDBTable[] = [];

  for (const tableName of data.TableNames || []) {
    // Get table description for more details
    const descResult =
      await $`aws dynamodb describe-table --table-name ${tableName} --region ${region} --output json`.text();
    const descData = JSON.parse(descResult);
    const table = descData.Table;

    const tags: Record<string, string> = {};
    try {
      const tagsResult =
        await $`aws dynamodb list-tags-of-resource --resource-arn ${table.TableArn} --region ${region} --output json`.text();
      const tagsData = JSON.parse(tagsResult);
      if (tagsData.Tags) {
        for (const tag of tagsData.Tags) {
          tags[tag.Key] = tag.Value;
        }
      }
    } catch {}

    tables.push({
      name: table.TableName,
      status: table.TableStatus,
      itemCount: table.ItemCount || 0,
      createdDate: table.CreationDateTime,
      sizeBytes: table.TableSizeBytes,
      encrypted: table.SSEDescription?.Status === "ENABLED",
      tags,
    });
  }

  return tables;
}

export async function describeRedshiftClusters(
  region: string,
): Promise<RedshiftCluster[]> {
  const { log, verbose } = getLog();
  const result =
    await $`aws redshift describe-clusters --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const clusters: RedshiftCluster[] = [];

  for (const cluster of data.Clusters || []) {
    clusters.push({
      clusterIdentifier: cluster.ClusterIdentifier,
      nodeType: cluster.NodeType,
      clusterStatus: cluster.ClusterStatus,
      masterUsername: cluster.MasterUsername,
      dbName: cluster.DBName,
      endpoint: cluster.Endpoint?.Address || "N/A",
      port: cluster.Endpoint?.Port || 0,
    });
  }

  return clusters;
}

export async function describeOpenSearchDomains(
  region: string,
): Promise<OpenSearchDomain[]> {
  const { log, verbose } = getLog();
  const result =
    await $`aws opensearch list-domain-names --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const domains: OpenSearchDomain[] = [];

  for (const domain of data.DomainNames || []) {
    const descResult =
      await $`aws opensearch describe-domain --domain-name ${domain.DomainName} --region ${region} --output json`.text();
    const descData = JSON.parse(descResult);
    const config = descData.DomainStatus;
    domains.push({
      domainName: config.DomainName,
      arn: config.ARN,
      created: config.Created,
      deleted: config.Deleted,
      endpoint: config.Endpoint || "N/A",
      multiAzWithStandbyEnabled: config.MultiAZWithStandbyEnabled,
      upgradeProcessing: config.UpgradeProcessing,
    });
  }

  return domains;
}

/**
 * Retrieves all ElastiCache clusters in a region.
 *
 * @param {string} region - AWS region code
 * @returns {Promise<ElastiCacheCluster[]>} Array of ElastiCache cluster objects
 */
export async function describeElastiCacheClusters(
  region: string,
): Promise<ElastiCacheCluster[]> {
  const { log, verbose } = getLog();
  const result =
    await $`aws elasticache describe-cache-clusters --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const clusters: ElastiCacheCluster[] = [];

  for (const cluster of data.CacheClusters || []) {
    clusters.push({
      cacheClusterId: cluster.CacheClusterId,
      cacheNodeType: cluster.CacheNodeType,
      engine: cluster.Engine,
      cacheClusterStatus: cluster.CacheClusterStatus,
      numCacheNodes: cluster.NumCacheNodes,
      preferredAvailabilityZone: cluster.PreferredAvailabilityZone,
      cacheClusterCreateTime: cluster.CacheClusterCreateTime,
    });
  }

  return clusters;
}
