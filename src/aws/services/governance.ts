import {
  ListPoliciesCommand,
  type Policy,
} from "@aws-sdk/client-organizations";
import {
  DescribeConfigRulesCommand,
  DescribeComplianceByConfigRuleCommand,
} from "@aws-sdk/client-config-service";
import {
  ListLandingZonesCommand,
  ListEnabledControlsCommand,
  GetEnabledControlCommand,
} from "@aws-sdk/client-controltower";
import type {
  ControlTowerGuardrail,
  ServiceControlPolicy,
  ConfigRule,
} from "../aws-cli.types";
import { getLog } from "./utils";
import {
  getOrganizationsClient,
  getConfigClient,
  getControlTowerClient,
} from "../sdk-clients";
import { executeWithRetry } from "../sdk-error-handler";

/**
 * Retrieves all AWS Control Tower guardrails (controls) enabled in the organization.
 * First checks if Control Tower is configured by verifying landing zones exist, then retrieves all enabled controls.
 *
 * @param region - AWS region to query for Control Tower configuration
 * @returns Promise resolving to array of guardrail configurations, or empty array if Control Tower is not configured
 *
 * @example
 * ```typescript
 * const guardrails = await describeControlTowerGuardrails('us-east-1');
 * console.log(guardrails);
 * // Output: [
 * //   {
 * //     guardrailArn: 'arn:aws:controltower:us-east-1:123456789012:control/ABC123',
 * //     guardrailName: 'DisallowPublicReadAccess',
 * //     guardrailState: 'ENABLED',
 * //     behavior: 'PREVENTIVE',
 * //     organizationalUnitArn: 'arn:aws:organizations::123456789012:ou/o-abc/ou-xyz'
 * //   }
 * // ]
 * ```
 */
export async function describeControlTowerGuardrails(
  region: string,
): Promise<ControlTowerGuardrail[]> {
  const { log, verbose } = getLog();

  try {
    const ctClient = getControlTowerClient(region);

    const landingZonesData = await executeWithRetry(
      async () => {
        const command = new ListLandingZonesCommand({});
        return await ctClient.send(command);
      },
      "Control Tower List Landing Zones",
      3,
      1000,
    );

    if (
      !landingZonesData.landingZones ||
      landingZonesData.landingZones.length === 0
    ) {
      if (verbose) {
        log("No Control Tower landing zones found");
      }
      return [];
    }

    const guardrails: ControlTowerGuardrail[] = [];
    let nextToken: string | undefined = undefined;

    do {
      const data = await executeWithRetry(
        async () => {
          const command = new ListEnabledControlsCommand({
            nextToken: nextToken,
          });
          return await ctClient.send(command);
        },
        "Control Tower List Enabled Controls",
        3,
        1000,
      );

      for (const control of data.enabledControls || []) {
        const guardrailName =
          control.controlIdentifier?.split("/").pop() || "Unknown";

        guardrails.push({
          guardrailArn: control.arn || "",
          guardrailName: guardrailName,
          guardrailState: control.statusSummary?.status || "UNKNOWN",
          behavior: control.controlIdentifier?.includes("detective")
            ? "DETECTIVE"
            : "PREVENTIVE",
          organizationalUnitArn: control.targetIdentifier || "",
        });
      }

      nextToken = data.nextToken;
    } while (nextToken);

    return guardrails;
  } catch (error) {
    if (verbose) {
      log(`Control Tower not available or not configured: ${error}`);
    }
    return [];
  }
}

/**
 * Retrieves all Service Control Policies (SCPs) from AWS Organizations.
 * SCPs are organization policies that manage permissions across AWS accounts in an organization.
 * Uses pagination to fetch all policies.
 *
 * @returns Promise resolving to array of SCP configurations with ID, ARN, name, description, type, and management status
 *
 * @example
 * ```typescript
 * const scps = await describeServiceControlPolicies();
 * console.log(scps);
 * // Output: [
 * //   {
 * //     id: 'p-abc12345',
 * //     arn: 'arn:aws:organizations::123456789012:policy/o-abc/service_control_policy/p-abc12345',
 * //     name: 'DenyS3PublicAccess',
 * //     description: 'Prevents public S3 bucket access',
 * //     type: 'SERVICE_CONTROL_POLICY',
 * //     awsManaged: false
 * //   }
 * // ]
 * ```
 */
export async function describeServiceControlPolicies(): Promise<
  ServiceControlPolicy[]
> {
  const { log, verbose } = getLog();
  const client = getOrganizationsClient();

  const policies: ServiceControlPolicy[] = [];

  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new ListPoliciesCommand({
          Filter: "SERVICE_CONTROL_POLICY",
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "Organizations SCP",
      3,
      1000,
    );

    for (const policy of data.Policies || []) {
      policies.push({
        id: policy.Id || "unknown",
        arn: policy.Arn || "unknown",
        name: policy.Name || "unknown",
        description: policy.Description || "",
        type: policy.Type || "UNKNOWN",
        awsManaged: policy.AwsManaged || false,
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return policies;
}

/**
 * Retrieves all AWS Config rules in the specified region along with their compliance status.
 * Config rules evaluate resource configurations against desired compliance standards.
 *
 * @param region - AWS region to query for Config rules
 * @returns Promise resolving to array of Config rule configurations with name, ARN, description, compliance status, and source type
 *
 * @example
 * ```typescript
 * const rules = await describeConfigRules('us-east-1');
 * console.log(rules);
 * // Output: [
 * //   {
 * //     configRuleName: 'required-tags',
 * //     configRuleArn: 'arn:aws:config:us-east-1:123456789012:config-rule/config-rule-abc123',
 * //     configRuleId: 'config-rule-abc123',
 * //     description: 'Checks for required tags on resources',
 * //     complianceStatus: 'COMPLIANT',
 * //     source: 'Custom'
 * //   }
 * // ]
 * ```
 */
export async function describeConfigRules(
  region: string,
): Promise<ConfigRule[]> {
  const { log, verbose } = getLog();
  const client = getConfigClient(region);

  const rulesData = await executeWithRetry(
    async () => {
      const command = new DescribeConfigRulesCommand({});
      return await client.send(command);
    },
    "Config Rules",
    3,
    1000,
  );

  const complianceData = await executeWithRetry(
    async () => {
      const command = new DescribeComplianceByConfigRuleCommand({});
      return await client.send(command);
    },
    "Config Compliance",
    3,
    1000,
  );

  const complianceMap = new Map<string, string>();
  for (const compliance of complianceData.ComplianceByConfigRules || []) {
    if (compliance.ConfigRuleName && compliance.Compliance?.ComplianceType) {
      complianceMap.set(
        compliance.ConfigRuleName,
        compliance.Compliance.ComplianceType,
      );
    }
  }

  const rules: ConfigRule[] = [];

  for (const rule of rulesData.ConfigRules || []) {
    const isAwsManaged = rule.Source?.Owner === "AWS";

    rules.push({
      configRuleName: rule.ConfigRuleName || "unknown",
      configRuleArn: rule.ConfigRuleArn || "",
      configRuleId: rule.ConfigRuleId || "",
      description: rule.Description || "",
      complianceStatus:
        complianceMap.get(rule.ConfigRuleName || "") || "NOT_EVALUATED",
      source: isAwsManaged ? "AWS Managed" : "Custom",
    });
  }

  return rules;
}
