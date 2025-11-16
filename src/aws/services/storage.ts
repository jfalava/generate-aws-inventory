import {
  ListBucketsCommand,
  GetBucketLocationCommand,
  GetPublicAccessBlockCommand,
  GetBucketEncryptionCommand,
  GetBucketVersioningCommand,
  GetBucketTaggingCommand,
} from "@aws-sdk/client-s3";
import { DescribeVolumesCommand } from "@aws-sdk/client-ec2";
import {
  DescribeFileSystemsCommand,
  type FileSystemDescription,
} from "@aws-sdk/client-efs";
import {
  ListBackupVaultsCommand,
  type BackupVaultListMember,
} from "@aws-sdk/client-backup";
import type {
  S3Bucket,
  EBSVolume,
  EFSFileSystem,
  BackupVault,
} from "../aws-cli.types";
import { getLog } from "./utils";
import {
  getS3Client,
  getEC2Client,
  getEFSClient,
  getBackupClient,
} from "../sdk-clients";
import { executeWithRetry } from "../sdk-error-handler";

export async function describeS3(): Promise<S3Bucket[]> {
  const { verbose } = getLog();

  // S3 is global, so we can use any region for listing buckets
  const client = getS3Client("us-east-1");

  const data = await executeWithRetry(
    async () => {
      const command = new ListBucketsCommand({});
      return await client.send(command);
    },
    "S3 List",
    3,
    1000,
  );

  const buckets: S3Bucket[] = [];

  // Process each bucket to get additional details
  for (const bucket of data.Buckets || []) {
    if (!bucket.Name) continue;

    let region: string | undefined;
    let publicAccess: boolean | undefined;
    let encrypted: boolean | undefined;
    let versioningEnabled: boolean | undefined;
    const tags: Record<string, string> = {};

    // Get bucket region
    try {
      const locationData = await executeWithRetry(
        async () => {
          const command = new GetBucketLocationCommand({ Bucket: bucket.Name });
          return await client.send(command);
        },
        "S3 GetBucketLocation",
        2,
        500,
      );
      region = locationData.LocationConstraint || "us-east-1";
    } catch {}

    // Get public access block configuration
    try {
      const publicAccessData = await executeWithRetry(
        async () => {
          const command = new GetPublicAccessBlockCommand({
            Bucket: bucket.Name,
          });
          return await client.send(command);
        },
        "S3 GetPublicAccessBlock",
        2,
        500,
      );
      const block = publicAccessData.PublicAccessBlockConfiguration;
      publicAccess = !(
        block?.BlockPublicAcls &&
        block?.BlockPublicPolicy &&
        block?.IgnorePublicAcls &&
        block?.RestrictPublicBuckets
      );
    } catch {
      publicAccess = true;
    }

    // Check for encryption
    try {
      await executeWithRetry(
        async () => {
          const command = new GetBucketEncryptionCommand({
            Bucket: bucket.Name,
          });
          return await client.send(command);
        },
        "S3 GetBucketEncryption",
        2,
        500,
      );
      encrypted = true;
    } catch {
      encrypted = false;
    }

    // Get versioning status
    try {
      const versioningData = await executeWithRetry(
        async () => {
          const command = new GetBucketVersioningCommand({
            Bucket: bucket.Name,
          });
          return await client.send(command);
        },
        "S3 GetBucketVersioning",
        2,
        500,
      );
      versioningEnabled = versioningData.Status === "Enabled";
    } catch {
      versioningEnabled = false;
    }

    // Get bucket tags
    try {
      const tagsData = await executeWithRetry(
        async () => {
          const command = new GetBucketTaggingCommand({ Bucket: bucket.Name });
          return await client.send(command);
        },
        "S3 GetBucketTagging",
        2,
        500,
      );
      if (tagsData.TagSet) {
        for (const tag of tagsData.TagSet) {
          if (tag.Key && tag.Value) {
            tags[tag.Key] = tag.Value;
          }
        }
      }
    } catch {}

    buckets.push({
      name: bucket.Name,
      creationDate: bucket.CreationDate?.toISOString() || "N/A",
      region,
      publicAccess,
      encrypted,
      versioningEnabled,
      tags,
    });
  }

  return buckets;
}

/**
 * Retrieves all EBS volumes in a region.
 *
 * @param {string} region - AWS region code
 * @returns {Promise<import("../aws-cli.types").EBSVolume[]>} Array of EBS volume objects
 * @throws {Error} If unable to retrieve volumes
 */
export async function describeEBSVolumes(region: string): Promise<EBSVolume[]> {
  const { verbose } = getLog();
  const client = getEC2Client(region);

  const volumes: EBSVolume[] = [];

  // Use pagination to get all volumes
  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeVolumesCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "EBS",
      3,
      1000,
    );

    for (const volume of data.Volumes || []) {
      const name =
        volume.Tags?.find((tag) => tag.Key === "Name")?.Value || "N/A";

      const tags: Record<string, string> = {};
      if (volume.Tags) {
        for (const tag of volume.Tags) {
          if (tag.Key && tag.Value) {
            tags[tag.Key] = tag.Value;
          }
        }
      }

      volumes.push({
        volumeId: volume.VolumeId || "unknown",
        name,
        size: volume.Size || 0,
        volumeType: volume.VolumeType || "unknown",
        state: volume.State || "unknown",
        encrypted: volume.Encrypted || false,
        availabilityZone: volume.AvailabilityZone || "unknown",
        createTime: volume.CreateTime?.toISOString() || "N/A",
        attachments: volume.Attachments || [],
        tags,
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return volumes;
}

/**
 * Retrieves all EFS file systems in a region.
 *
 * @param {string} region - AWS region code
 * @returns {Promise<import("../aws-cli.types").EFSFileSystem[]>} Array of EFS file system objects
 * @throws {Error} If unable to retrieve file systems
 */
export async function describeEFSFileSystems(
  region: string,
): Promise<EFSFileSystem[]> {
  const { verbose } = getLog();
  const client = getEFSClient(region);

  const fileSystems: EFSFileSystem[] = [];

  // Use pagination to get all file systems
  let marker: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeFileSystemsCommand({
          Marker: marker,
        });
        return await client.send(command);
      },
      "EFS",
      3,
      1000,
    );

    for (const fs of data.FileSystems || []) {
      const name = fs.Name || fs.FileSystemId || "unknown";

      const tags: Record<string, string> = {};
      if (fs.Tags) {
        for (const tag of fs.Tags) {
          if (tag.Key && tag.Value) {
            tags[tag.Key] = tag.Value;
          }
        }
      }

      fileSystems.push({
        fileSystemId: fs.FileSystemId || "unknown",
        name,
        lifeCycleState: fs.LifeCycleState || "unknown",
        sizeInBytes: fs.SizeInBytes?.Value,
        creationTime: fs.CreationTime?.toISOString() || "N/A",
        encrypted: fs.Encrypted || false,
        performanceMode: fs.PerformanceMode || "unknown",
        tags,
      });
    }

    marker = data.NextMarker;
  } while (marker);

  return fileSystems;
}

/**
 * Retrieves all AWS Backup vaults in a region.
 *
 * @param {string} region - AWS region code
 * @returns {Promise<import("../aws-cli.types").BackupVault[]>} Array of Backup vault objects
 * @throws {Error} If unable to retrieve vaults
 */
export async function describeBackupVaults(
  region: string,
): Promise<BackupVault[]> {
  const { verbose } = getLog();
  const client = getBackupClient(region);

  const vaults: BackupVault[] = [];

  // Use pagination to get all vaults
  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new ListBackupVaultsCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "Backup",
      3,
      1000,
    );

    for (const vault of data.BackupVaultList || []) {
      vaults.push({
        backupVaultName: vault.BackupVaultName || "unknown",
        backupVaultArn: vault.BackupVaultArn || "unknown",
        creationDate: vault.CreationDate?.toISOString() || "N/A",
        encryptionKeyArn: vault.EncryptionKeyArn,
        numberOfRecoveryPoints: vault.NumberOfRecoveryPoints || 0,
        locked: vault.Locked || false,
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return vaults;
}
