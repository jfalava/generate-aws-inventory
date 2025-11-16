import {
  DescribeDBInstancesCommand,
  type DBInstance,
} from "@aws-sdk/client-rds";
import {
  ListTablesCommand,
  DescribeTableCommand,
  ListTagsOfResourceCommand,
} from "@aws-sdk/client-dynamodb";
import {
  DescribeClustersCommand as DescribeRedshiftClustersCommand,
  type Cluster as RedshiftClusterType,
} from "@aws-sdk/client-redshift";
import {
  ListDomainNamesCommand,
  DescribeDomainCommand,
  type DomainStatus,
} from "@aws-sdk/client-opensearch";
import {
  DescribeCacheClustersCommand,
  type CacheCluster,
} from "@aws-sdk/client-elasticache";
import { getLog } from "./utils";
import {
  getRDSClient,
  getDynamoDBClient,
  getRedshiftClient,
  getOpenSearchClient,
  getElastiCacheClient,
} from "../sdk-clients";
import { executeWithRetry } from "../sdk-error-handler";
import type {
  RDSInstance,
  DynamoDBTable,
  RedshiftCluster,
  OpenSearchDomain,
  ElastiCacheCluster,
} from "../aws-cli.types";

export async function describeRDS(region: string): Promise<RDSInstance[]> {
  const { log, verbose } = getLog();
  const client = getRDSClient(region);

  const rdss: RDSInstance[] = [];

  // Use pagination to get all DB instances
  let marker: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeDBInstancesCommand({
          Marker: marker,
        });
        return await client.send(command);
      },
      "RDS",
      3,
      1000,
    );

    for (const db of data.DBInstances || []) {
      const tags: Record<string, string> = {};
      if (db.TagList) {
        for (const tag of db.TagList) {
          if (tag.Key && tag.Value) {
            tags[tag.Key] = tag.Value;
          }
        }
      }

      rdss.push({
        id: db.DBInstanceIdentifier || "unknown",
        name: db.DBName || "N/A",
        engine: db.Engine || "unknown",
        engineVersion: db.EngineVersion,
        status: db.DBInstanceStatus || "unknown",
        instanceClass: db.DBInstanceClass || "unknown",
        storageSize: db.AllocatedStorage || 0,
        vpcId: db.DBSubnetGroup?.VpcId,
        publiclyAccessible: db.PubliclyAccessible || false,
        encrypted: db.StorageEncrypted || false,
        createTime: db.InstanceCreateTime?.toISOString() || "N/A",
        tags,
      });
    }

    marker = data.Marker;
  } while (marker);

  return rdss;
}

export async function describeDynamoDBTables(
  region: string,
): Promise<DynamoDBTable[]> {
  const { log, verbose } = getLog();
  const client = getDynamoDBClient(region);

  const tables: DynamoDBTable[] = [];

  // Use pagination to get all tables
  let exclusiveStartTableName: string | undefined = undefined;
  const tableNames: string[] = [];

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new ListTablesCommand({
          ExclusiveStartTableName: exclusiveStartTableName,
        });
        return await client.send(command);
      },
      "DynamoDB List",
      3,
      1000,
    );

    if (data.TableNames) {
      tableNames.push(...data.TableNames);
    }

    exclusiveStartTableName = data.LastEvaluatedTableName;
  } while (exclusiveStartTableName);

  // Now describe each table
  for (const tableName of tableNames) {
    const descData = await executeWithRetry(
      async () => {
        const command = new DescribeTableCommand({
          TableName: tableName,
        });
        return await client.send(command);
      },
      "DynamoDB Describe",
      3,
      1000,
    );

    const table = descData.Table;
    if (!table) continue;

    const tags: Record<string, string> = {};
    if (table.TableArn) {
      try {
        const tagsData = await executeWithRetry(
          async () => {
            const command = new ListTagsOfResourceCommand({
              ResourceArn: table.TableArn,
            });
            return await client.send(command);
          },
          "DynamoDB Tags",
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
    }

    tables.push({
      name: table.TableName || "unknown",
      status: table.TableStatus || "UNKNOWN",
      itemCount: table.ItemCount || 0,
      createdDate: table.CreationDateTime?.toISOString() || "N/A",
      sizeBytes: table.TableSizeBytes || 0,
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
  const client = getRedshiftClient(region);

  const clusters: RedshiftCluster[] = [];

  // Use pagination to get all clusters
  let marker: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeRedshiftClustersCommand({
          Marker: marker,
        });
        return await client.send(command);
      },
      "Redshift",
      3,
      1000,
    );

    for (const cluster of data.Clusters || []) {
      clusters.push({
        clusterIdentifier: cluster.ClusterIdentifier || "unknown",
        nodeType: cluster.NodeType || "unknown",
        clusterStatus: cluster.ClusterStatus || "unknown",
        masterUsername: cluster.MasterUsername || "unknown",
        dbName: cluster.DBName || "N/A",
        endpoint: cluster.Endpoint?.Address || "N/A",
        port: cluster.Endpoint?.Port || 0,
      });
    }

    marker = data.Marker;
  } while (marker);

  return clusters;
}

export async function describeOpenSearchDomains(
  region: string,
): Promise<OpenSearchDomain[]> {
  const { log, verbose } = getLog();
  const client = getOpenSearchClient(region);

  const domains: OpenSearchDomain[] = [];

  // First, list all domain names
  const listData = await executeWithRetry(
    async () => {
      const command = new ListDomainNamesCommand({});
      return await client.send(command);
    },
    "OpenSearch List",
    3,
    1000,
  );

  // Now describe each domain
  for (const domain of listData.DomainNames || []) {
    if (!domain.DomainName) continue;

    const descData = await executeWithRetry(
      async () => {
        const command = new DescribeDomainCommand({
          DomainName: domain.DomainName,
        });
        return await client.send(command);
      },
      "OpenSearch Describe",
      3,
      1000,
    );

    const config = descData.DomainStatus;
    if (config) {
      domains.push({
        domainName: config.DomainName || "unknown",
        arn: config.ARN || "unknown",
        created: config.Created || false,
        deleted: config.Deleted || false,
        endpoint: config.Endpoint || "N/A",
        // Note: MultiAZWithStandbyEnabled not available in current SDK type
        multiAzWithStandbyEnabled: false,
        upgradeProcessing: config.UpgradeProcessing || false,
      });
    }
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
  const client = getElastiCacheClient(region);

  const clusters: ElastiCacheCluster[] = [];

  // Use pagination to get all clusters
  let marker: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeCacheClustersCommand({
          Marker: marker,
        });
        return await client.send(command);
      },
      "ElastiCache",
      3,
      1000,
    );

    for (const cluster of data.CacheClusters || []) {
      clusters.push({
        cacheClusterId: cluster.CacheClusterId || "unknown",
        cacheNodeType: cluster.CacheNodeType || "unknown",
        engine: cluster.Engine || "unknown",
        engineVersion: cluster.EngineVersion,
        cacheClusterStatus: cluster.CacheClusterStatus || "unknown",
        numCacheNodes: cluster.NumCacheNodes || 0,
        preferredAvailabilityZone: cluster.PreferredAvailabilityZone || "N/A",
        cacheClusterCreateTime:
          cluster.CacheClusterCreateTime?.toISOString() || "N/A",
      });
    }

    marker = data.Marker;
  } while (marker);

  return clusters;
}
