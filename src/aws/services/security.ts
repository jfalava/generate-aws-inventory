import {
  ListUsersCommand,
  ListRolesCommand,
  type User,
  type Role,
} from "@aws-sdk/client-iam";
import {
  ListKeysCommand,
  DescribeKeyCommand,
  type KeyListEntry,
} from "@aws-sdk/client-kms";
import {
  ListSecretsCommand,
  type SecretListEntry,
} from "@aws-sdk/client-secrets-manager";
import {
  ListWebACLsCommand,
  ListTagsForResourceCommand as ListWAFTagsCommand,
  Scope,
  type WebACLSummary,
} from "@aws-sdk/client-wafv2";
import {
  ListDetectorsCommand,
  GetDetectorCommand,
} from "@aws-sdk/client-guardduty";
import {
  ListUserPoolsCommand,
  DescribeUserPoolCommand,
  ListTagsForResourceCommand as ListCognitoTagsCommand,
  type UserPoolDescriptionType,
} from "@aws-sdk/client-cognito-identity-provider";
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
import {
  getIAMClient,
  getKMSClient,
  getSecretsManagerClient,
  getWAFv2Client,
  getGuardDutyClient,
  getCognitoClient,
} from "../sdk-clients";
import { executeWithRetry } from "../sdk-error-handler";

export async function describeIAMUsers(): Promise<IAMUser[]> {
  const { log, verbose } = getLog();
  const client = getIAMClient();

  const users: IAMUser[] = [];

  // Use pagination to get all users
  let marker: string | undefined = undefined;
  let isTruncated = true;

  while (isTruncated) {
    const data = await executeWithRetry(
      async () => {
        const command = new ListUsersCommand({
          Marker: marker,
        });
        return await client.send(command);
      },
      "IAM Users",
      3,
      1000,
    );

    for (const user of data.Users || []) {
      users.push({
        userName: user.UserName || "unknown",
        userId: user.UserId || "unknown",
        arn: user.Arn || "unknown",
        createDate: user.CreateDate?.toISOString() || "N/A",
      });
    }

    isTruncated = data.IsTruncated || false;
    marker = data.Marker;
  }

  return users;
}

export async function describeIAMRoles(): Promise<IAMRole[]> {
  const { log, verbose } = getLog();
  const client = getIAMClient();

  const roles: IAMRole[] = [];

  // Use pagination to get all roles
  let marker: string | undefined = undefined;
  let isTruncated = true;

  while (isTruncated) {
    const data = await executeWithRetry(
      async () => {
        const command = new ListRolesCommand({
          Marker: marker,
        });
        return await client.send(command);
      },
      "IAM Roles",
      3,
      1000,
    );

    for (const role of data.Roles || []) {
      roles.push({
        roleName: role.RoleName || "unknown",
        roleId: role.RoleId || "unknown",
        arn: role.Arn || "unknown",
        createDate: role.CreateDate?.toISOString() || "N/A",
      });
    }

    isTruncated = data.IsTruncated || false;
    marker = data.Marker;
  }

  return roles;
}

export async function describeKMSKeys(region: string): Promise<KMSKey[]> {
  const { log, verbose } = getLog();
  const client = getKMSClient(region);

  const keys: KMSKey[] = [];

  // Use pagination to get all keys
  let marker: string | undefined = undefined;
  let truncated = true;

  while (truncated) {
    const listData = await executeWithRetry(
      async () => {
        const command = new ListKeysCommand({
          Marker: marker,
        });
        return await client.send(command);
      },
      "KMS List",
      3,
      1000,
    );

    for (const key of listData.Keys || []) {
      // Get detailed info for each key
      const descData = await executeWithRetry(
        async () => {
          const command = new DescribeKeyCommand({
            KeyId: key.KeyId,
          });
          return await client.send(command);
        },
        "KMS Describe",
        3,
        1000,
      );

      const keyMetadata = descData.KeyMetadata;
      if (keyMetadata) {
        keys.push({
          keyId: keyMetadata.KeyId || "unknown",
          keyArn: keyMetadata.Arn || "unknown",
          description: keyMetadata.Description || "N/A",
          keyUsage: keyMetadata.KeyUsage || "N/A",
          keyState: keyMetadata.KeyState || "N/A",
          creationDate: keyMetadata.CreationDate?.toISOString() || "N/A",
        });
      }
    }

    truncated = listData.Truncated || false;
    marker = listData.NextMarker;
  }

  return keys;
}

export async function describeSecretsManagerSecrets(
  region: string,
): Promise<SecretsManagerSecret[]> {
  const { log, verbose } = getLog();
  const client = getSecretsManagerClient(region);

  const secrets: SecretsManagerSecret[] = [];

  // Use pagination to get all secrets
  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new ListSecretsCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "Secrets Manager",
      3,
      1000,
    );

    for (const secret of data.SecretList || []) {
      secrets.push({
        name: secret.Name || "unknown",
        description: secret.Description || "N/A",
        secretArn: secret.ARN || "unknown",
        createdDate: secret.CreatedDate?.toISOString() || "N/A",
        lastChangedDate: secret.LastChangedDate?.toISOString() || "N/A",
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return secrets;
}

export async function describeCognitoUserPools(
  region: string,
): Promise<CognitoUserPool[]> {
  const { log, verbose } = getLog();
  const client = getCognitoClient(region);

  const pools: CognitoUserPool[] = [];

  // Use pagination to get all user pools
  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new ListUserPoolsCommand({
          MaxResults: 60,
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "Cognito List",
      3,
      1000,
    );

    for (const pool of data.UserPools || []) {
      // Get detailed info for each pool
      try {
        const descData = await executeWithRetry(
          async () => {
            const command = new DescribeUserPoolCommand({
              UserPoolId: pool.Id,
            });
            return await client.send(command);
          },
          "Cognito Describe",
          3,
          1000,
        );

        const poolDetails = descData.UserPool;

        // Get tags
        const tags: Record<string, string> = {};
        if (poolDetails?.Arn) {
          try {
            const tagsData = await executeWithRetry(
              async () => {
                const command = new ListCognitoTagsCommand({
                  ResourceArn: poolDetails.Arn,
                });
                return await client.send(command);
              },
              "Cognito Tags",
              3,
              1000,
            );

            if (tagsData.Tags) {
              for (const [key, value] of Object.entries(tagsData.Tags)) {
                tags[key] = value as string;
              }
            }
          } catch {}
        }

        if (poolDetails) {
          pools.push({
            id: pool.Id || "unknown",
            name: pool.Name || "unknown",
            status: poolDetails.Status || "UNKNOWN",
            creationDate: pool.CreationDate?.toISOString() || "N/A",
            lastModifiedDate: pool.LastModifiedDate?.toISOString() || "N/A",
            mfaConfiguration: poolDetails.MfaConfiguration || "OFF",
            tags,
          });
        }
      } catch {}
    }

    nextToken = data.NextToken;
  } while (nextToken);

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
  const client = getWAFv2Client(region);

  const acls: WAFWebACL[] = [];

  // Use pagination to get all web ACLs
  let nextMarker: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new ListWebACLsCommand({
          Scope: Scope.REGIONAL,
          NextMarker: nextMarker,
        });
        return await client.send(command);
      },
      "WAF List",
      3,
      1000,
    );

    for (const acl of data.WebACLs || []) {
      // Get tags
      const tags: Record<string, string> = {};
      if (acl.ARN) {
        try {
          const tagsData = await executeWithRetry(
            async () => {
              const command = new ListWAFTagsCommand({
                ResourceARN: acl.ARN,
              });
              return await client.send(command);
            },
            "WAF Tags",
            3,
            1000,
          );

          if (tagsData.TagInfoForResource?.TagList) {
            for (const tag of tagsData.TagInfoForResource.TagList) {
              if (tag.Key && tag.Value) {
                tags[tag.Key] = tag.Value;
              }
            }
          }
        } catch {}
      }

      acls.push({
        name: acl.Name || "unknown",
        id: acl.Id || "unknown",
        arn: acl.ARN || "unknown",
        description: acl.Description || "N/A",
        scope: "REGIONAL",
        capacity: 0, // Capacity is only available in GetWebACL, not in ListWebACLs
        tags,
      });
    }

    nextMarker = data.NextMarker;
  } while (nextMarker);

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
  const client = getGuardDutyClient(region);

  const detectors: GuardDutyDetector[] = [];

  // Use pagination to get all detector IDs
  let nextToken: string | undefined = undefined;
  const detectorIds: string[] = [];

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new ListDetectorsCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "GuardDuty List",
      3,
      1000,
    );

    if (data.DetectorIds) {
      detectorIds.push(...data.DetectorIds);
    }

    nextToken = data.NextToken;
  } while (nextToken);

  // Get details for each detector
  for (const detectorId of detectorIds) {
    try {
      const descData = await executeWithRetry(
        async () => {
          const command = new GetDetectorCommand({
            DetectorId: detectorId,
          });
          return await client.send(command);
        },
        "GuardDuty Get",
        3,
        1000,
      );

      const tags: Record<string, string> = {};
      if (descData.Tags) {
        for (const [key, value] of Object.entries(descData.Tags)) {
          tags[key] = value as string;
        }
      }

      detectors.push({
        detectorId,
        status: descData.Status || "UNKNOWN",
        serviceRole: descData.ServiceRole || "N/A",
        createdAt: descData.CreatedAt || "N/A",
        tags,
      });
    } catch {}
  }

  return detectors;
}
