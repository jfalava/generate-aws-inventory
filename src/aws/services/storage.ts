import { $ } from "bun";
import type {
  S3Bucket,
  EBSVolume,
  EFSFileSystem,
  BackupVault,
} from "../aws-cli.types";
import { getLog } from "./utils";

export async function describeS3(): Promise<S3Bucket[]> {
  const { verbose } = getLog();

  const result = await $`aws s3api list-buckets --output json`.text();
  const data = JSON.parse(result);

  const buckets: S3Bucket[] = [];

  for (const bucket of data.Buckets || []) {
    let region: string | undefined;
    let publicAccess: boolean | undefined;
    let encrypted: boolean | undefined;
    let versioningEnabled: boolean | undefined;
    const tags: Record<string, string> = {};

    try {
      const locationResult =
        await $`aws s3api get-bucket-location --bucket ${bucket.Name} --output json`.text();
      const locationData = JSON.parse(locationResult);
      region = locationData.LocationConstraint || "us-east-1";
    } catch {}

    try {
      const publicAccessResult =
        await $`aws s3api get-public-access-block --bucket ${bucket.Name} --output json`.text();
      const publicAccessData = JSON.parse(publicAccessResult);
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

    try {
      await $`aws s3api get-bucket-encryption --bucket ${bucket.Name} --output json`.text();
      encrypted = true;
    } catch {
      encrypted = false;
    }

    try {
      const versioningResult =
        await $`aws s3api get-bucket-versioning --bucket ${bucket.Name} --output json`.text();
      const versioningData = JSON.parse(versioningResult);
      versioningEnabled = versioningData.Status === "Enabled";
    } catch {
      versioningEnabled = false;
    }

    try {
      const tagsResult =
        await $`aws s3api get-bucket-tagging --bucket ${bucket.Name} --output json`.text();
      const tagsData = JSON.parse(tagsResult);
      if (tagsData.TagSet) {
        for (const tag of tagsData.TagSet) {
          tags[tag.Key] = tag.Value;
        }
      }
    } catch {}

    buckets.push({
      name: bucket.Name,
      creationDate: bucket.CreationDate,
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

  const result =
    await $`aws ec2 describe-volumes --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const volumes: EBSVolume[] = [];

  for (const volume of data.Volumes || []) {
    const name =
      volume.Tags?.find((tag: any) => tag.Key === "Name")?.Value || "N/A";

    const tags: Record<string, string> = {};
    if (volume.Tags) {
      for (const tag of volume.Tags) {
        tags[tag.Key] = tag.Value;
      }
    }

    volumes.push({
      volumeId: volume.VolumeId,
      name,
      size: volume.Size,
      volumeType: volume.VolumeType,
      state: volume.State,
      encrypted: volume.Encrypted || false,
      availabilityZone: volume.AvailabilityZone,
      createTime: volume.CreateTime,
      attachments: volume.Attachments,
      tags,
    });
  }

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

  const result =
    await $`aws efs describe-file-systems --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const fileSystems: EFSFileSystem[] = [];

  for (const fs of data.FileSystems || []) {
    const name = fs.Name || fs.FileSystemId;

    const tags: Record<string, string> = {};
    if (fs.Tags) {
      for (const tag of fs.Tags) {
        tags[tag.Key] = tag.Value;
      }
    }

    fileSystems.push({
      fileSystemId: fs.FileSystemId,
      name,
      lifeCycleState: fs.LifeCycleState,
      sizeInBytes: fs.SizeInBytes?.Value,
      creationTime: fs.CreationTime,
      encrypted: fs.Encrypted || false,
      performanceMode: fs.PerformanceMode,
      tags,
    });
  }

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

  const result =
    await $`aws backup list-backup-vaults --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const vaults: BackupVault[] = [];

  for (const vault of data.BackupVaultList || []) {
    vaults.push({
      backupVaultName: vault.BackupVaultName,
      backupVaultArn: vault.BackupVaultArn,
      creationDate: vault.CreationDate,
      encryptionKeyArn: vault.EncryptionKeyArn,
      numberOfRecoveryPoints: vault.NumberOfRecoveryPoints,
      locked: vault.Locked,
    });
  }

  return vaults;
}
