import { $ } from "bun";
import type {
  IAMUser,
  IAMRole,
  KMSKey,
  SecretsManagerSecret,
  WAFWebACL,
  GuardDutyDetector,
  CognitoUserPool,
} from "../aws-cli.types";
import { getLog } from "./utils";

export async function describeIAMUsers(): Promise<IAMUser[]> {
  const { log, verbose } = getLog();

  const result = await $`aws iam list-users --output json`.text();
  const data = JSON.parse(result);

  const users: IAMUser[] = [];

  for (const user of data.Users || []) {
    users.push({
      userName: user.UserName,
      userId: user.UserId,
      arn: user.Arn,
      createDate: user.CreateDate,
    });
  }

  return users;
}

export async function describeIAMRoles(): Promise<IAMRole[]> {
  const { log, verbose } = getLog();

  const result = await $`aws iam list-roles --output json`.text();
  const data = JSON.parse(result);

  const roles: IAMRole[] = [];

  for (const role of data.Roles || []) {
    roles.push({
      roleName: role.RoleName,
      roleId: role.RoleId,
      arn: role.Arn,
      createDate: role.CreateDate,
    });
  }

  return roles;
}

export async function describeKMSKeys(region: string): Promise<KMSKey[]> {
  const { log, verbose } = getLog();

  const result =
    await $`aws kms list-keys --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const keys: KMSKey[] = [];

  for (const key of data.Keys || []) {
    const descResult =
      await $`aws kms describe-key --key-id ${key.KeyId} --region ${region} --output json`.text();
    const descData = JSON.parse(descResult);
    const keyMetadata = descData.KeyMetadata;
    keys.push({
      keyId: keyMetadata.KeyId,
      keyArn: keyMetadata.Arn,
      description: keyMetadata.Description || "N/A",
      keyUsage: keyMetadata.KeyUsage,
      keyState: keyMetadata.KeyState,
      creationDate: keyMetadata.CreationDate,
    });
  }

  return keys;
}

export async function describeSecretsManagerSecrets(
  region: string,
): Promise<SecretsManagerSecret[]> {
  const { log, verbose } = getLog();

  const result =
    await $`aws secretsmanager list-secrets --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const secrets: SecretsManagerSecret[] = [];

  for (const secret of data.SecretList || []) {
    secrets.push({
      name: secret.Name,
      description: secret.Description || "N/A",
      secretArn: secret.ARN,
      createdDate: secret.CreatedDate,
      lastChangedDate: secret.LastChangedDate,
    });
  }

  return secrets;
}

export async function describeCognitoUserPools(
  region: string,
): Promise<CognitoUserPool[]> {
  const { log, verbose } = getLog();

  const result =
    await $`aws cognito-idp list-user-pools --max-results 60 --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const pools: CognitoUserPool[] = [];

  for (const pool of data.UserPools || []) {
    // Get detailed info for each pool
    try {
      const descResult =
        await $`aws cognito-idp describe-user-pool --user-pool-id ${pool.Id} --region ${region} --output json`.text();
      const descData = JSON.parse(descResult);
      const poolDetails = descData.UserPool;

      // Get tags
      const tags: Record<string, string> = {};
      try {
        const poolArn = poolDetails.Arn;
        const tagsResult =
          await $`aws cognito-idp list-tags-for-resource --resource-arn ${poolArn} --region ${region} --output json`.text();
        const tagsData = JSON.parse(tagsResult);
        if (tagsData.Tags) {
          for (const [key, value] of Object.entries(tagsData.Tags)) {
            tags[key] = value as string;
          }
        }
      } catch {}

      pools.push({
        id: pool.Id,
        name: pool.Name,
        status: poolDetails.Status,
        creationDate: pool.CreationDate,
        lastModifiedDate: pool.LastModifiedDate,
        mfaConfiguration: poolDetails.MfaConfiguration,
        tags,
      });
    } catch {}
  }

  return pools;
}

/**
 * Describes WAF Web ACLs (v2)
 * @param region The AWS region to query
 * @returns Array of WAF Web ACLs
 * @example
 * const acls = await describeWAFWebACLs("us-east-1");
 */
export async function describeWAFWebACLs(region: string): Promise<WAFWebACL[]> {
  const { log, verbose } = getLog();

  const result =
    await $`aws wafv2 list-web-acls --scope REGIONAL --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const acls: WAFWebACL[] = [];

  for (const acl of data.WebACLs || []) {
    // Get tags
    const tags: Record<string, string> = {};
    try {
      const tagsResult =
        await $`aws wafv2 list-tags-for-resource --resource-arn ${acl.ARN} --region ${region} --output json`.text();
      const tagsData = JSON.parse(tagsResult);
      if (tagsData.TagInfoForResource?.TagList) {
        for (const tag of tagsData.TagInfoForResource.TagList) {
          tags[tag.Key] = tag.Value;
        }
      }
    } catch {}

    acls.push({
      name: acl.Name,
      id: acl.Id,
      arn: acl.ARN,
      description: acl.Description,
      scope: "REGIONAL",
      capacity: acl.Capacity,
      tags,
    });
  }

  return acls;
}

/**
 * Describes GuardDuty Detectors
 * @param region The AWS region to query
 * @returns Array of GuardDuty Detectors
 * @example
 * const detectors = await describeGuardDutyDetectors("us-east-1");
 */
export async function describeGuardDutyDetectors(
  region: string,
): Promise<GuardDutyDetector[]> {
  const { log, verbose } = getLog();

  const result =
    await $`aws guardduty list-detectors --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const detectors: GuardDutyDetector[] = [];

  for (const detectorId of data.DetectorIds || []) {
    try {
      const descResult =
        await $`aws guardduty get-detector --detector-id ${detectorId} --region ${region} --output json`.text();
      const descData = JSON.parse(descResult);

      const tags: Record<string, string> = {};
      if (descData.Tags) {
        for (const [key, value] of Object.entries(descData.Tags)) {
          tags[key] = value as string;
        }
      }

      detectors.push({
        detectorId,
        status: descData.Status,
        serviceRole: descData.ServiceRole,
        createdAt: descData.CreatedAt,
        tags,
      });
    } catch {}
  }

  return detectors;
}
