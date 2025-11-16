import { $ } from "bun";
import type {
  ControlTowerGuardrail,
  ServiceControlPolicy,
  ConfigRule,
} from "../aws-cli.types";
import { getLog } from "./utils";

export async function describeControlTowerGuardrails(
  region: string,
): Promise<ControlTowerGuardrail[]> {
  const { log, verbose } = getLog();

  // List all landing zones first (requires at least one landing zone)
  const landingZonesResult =
    await $`aws controltower list-landing-zones --region ${region} --output json`.quiet();
  const landingZonesData = JSON.parse(landingZonesResult.stdout.toString());

  if (
    !landingZonesData.landingZones ||
    landingZonesData.landingZones.length === 0
  ) {
    log("No Control Tower landing zones found");
    return [];
  }

  // Get the first landing zone ARN
  const landingZoneArn = landingZonesData.landingZones[0].arn;

  // List enabled controls (guardrails)
  const result =
    await $`aws controltower list-enabled-controls --region ${region} --output json`.quiet();
  const data = JSON.parse(result.stdout.toString());

  const guardrails: ControlTowerGuardrail[] = [];

  for (const control of data.enabledControls || []) {
    // Extract guardrail name from ARN
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

  return guardrails;
}

export async function describeServiceControlPolicies(): Promise<
  ServiceControlPolicy[]
> {
  const { log, verbose } = getLog();

  const result =
    await $`aws organizations list-policies --filter SERVICE_CONTROL_POLICY --output json`.quiet();
  const data = JSON.parse(result.stdout.toString());

  const policies: ServiceControlPolicy[] = [];

  for (const policy of data.Policies || []) {
    policies.push({
      id: policy.Id,
      arn: policy.Arn,
      name: policy.Name,
      description: policy.Description || "",
      type: policy.Type,
      awsManaged: policy.AwsManaged || false,
    });
  }

  return policies;
}

export async function describeConfigRules(
  region: string,
): Promise<ConfigRule[]> {
  const { log, verbose } = getLog();

  // Get config rules
  const rulesResult =
    await $`aws configservice describe-config-rules --region ${region} --output json`.quiet();
  const rulesData = JSON.parse(rulesResult.stdout.toString());

  // Get compliance status
  const complianceResult =
    await $`aws configservice describe-compliance-by-config-rule --region ${region} --output json`.quiet();
  const complianceData = JSON.parse(complianceResult.stdout.toString());

  // Create a map of compliance status by rule name
  const complianceMap = new Map<string, string>();
  for (const compliance of complianceData.ComplianceByConfigRules || []) {
    complianceMap.set(
      compliance.ConfigRuleName,
      compliance.Compliance?.ComplianceType || "UNKNOWN",
    );
  }

  const rules: ConfigRule[] = [];

  for (const rule of rulesData.ConfigRules || []) {
    const isAwsManaged = rule.Source?.Owner === "AWS";

    rules.push({
      configRuleName: rule.ConfigRuleName,
      configRuleArn: rule.ConfigRuleArn || "",
      configRuleId: rule.ConfigRuleId || "",
      description: rule.Description || "",
      complianceStatus:
        complianceMap.get(rule.ConfigRuleName) || "NOT_EVALUATED",
      source: isAwsManaged ? "AWS Managed" : "Custom",
    });
  }

  return rules;
}
