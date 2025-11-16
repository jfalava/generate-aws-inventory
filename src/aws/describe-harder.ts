import { $ } from "bun";
import { stat } from "node:fs/promises";
import { getTOTPSecret, generateTOTPToken } from "../lib/totp";
import { getVersion } from "../lib/version";
import { getAccountId } from "./aws-cli";

/**
 * Comprehensive detailed describe for AWS resources
 * Generates markdown with detailed tables showing ALL available information
 */

interface ServiceFormatter {
  name: string;
  csvPattern: RegExp;
  idField: number;
  describeCommand: (id: string, region: string) => any;
  formatter: (resource: any, id: string) => string;
  regionRequired: boolean;
}

async function obtainAWSCredentials(
  accountName: string,
  mfaToken: string,
  log: (msg: string) => void,
): Promise<void> {
  log(`\nObtaining credentials for account: ${accountName}`);

  try {
    const result =
      await $`letme obtain ${accountName} --inline-mfa ${mfaToken}`.quiet();

    if (result.exitCode === 0) {
      process.env.AWS_PROFILE = accountName;
      log("Credentials obtained successfully");
      return;
    } else {
      console.error(
        `letme failed with exit code ${result.exitCode}: ${result.stderr}`,
      );
      process.exit(1);
    }
  } catch (error) {
    console.error(`letme failed: ${error}`);
    process.exit(1);
  }
}

/**
 * Helper to format arrays as markdown lists
 */
function formatArray(arr: any[], formatter?: (item: any) => string): string {
  if (!arr || arr.length === 0) return "None";
  return arr
    .map((item) => `- ${formatter ? formatter(item) : item}`)
    .join("\n");
}

/**
 * Helper to format key-value pairs as a table
 */
function formatKeyValueTable(obj: Record<string, any>): string {
  const entries = Object.entries(obj).filter(
    ([_, v]) => v !== null && v !== undefined,
  );
  if (entries.length === 0) return "None";

  let table = "| Key | Value |\n|-----|-------|\n";
  for (const [key, value] of entries) {
    const formattedValue =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    table += `| ${key} | ${formattedValue} |\n`;
  }
  return table;
}

/**
 * Format EC2 instance with comprehensive details
 */
function formatEC2Instance(data: any, instanceId: string): string {
  const instance = data.Reservations?.[0]?.Instances?.[0];
  if (!instance) return `## Instance ${instanceId}\n\nNo data found.\n\n`;

  let md = `## Instance: ${instanceId}\n\n`;

  // Basic information
  md += `### Basic Information\n\n`;
  md += `| Property | Value |\n|----------|-------|\n`;
  md += `| Instance ID | ${instance.InstanceId || "N/A"} |\n`;
  md += `| Instance Type | ${instance.InstanceType || "N/A"} |\n`;
  md += `| State | ${instance.State?.Name || "N/A"} |\n`;
  md += `| Availability Zone | ${instance.Placement?.AvailabilityZone || "N/A"} |\n`;
  md += `| Private IP | ${instance.PrivateIpAddress || "N/A"} |\n`;
  md += `| Public IP | ${instance.PublicIpAddress || "None"} |\n`;
  md += `| VPC ID | ${instance.VpcId || "N/A"} |\n`;
  md += `| Subnet ID | ${instance.SubnetId || "N/A"} |\n`;
  md += `| Launch Time | ${instance.LaunchTime || "N/A"} |\n`;
  md += `| Platform | ${instance.Platform || "Linux/Unix"} |\n`;
  md += `| Architecture | ${instance.Architecture || "N/A"} |\n`;
  md += `| Virtualization Type | ${instance.VirtualizationType || "N/A"} |\n`;
  md += `| Root Device Type | ${instance.RootDeviceType || "N/A"} |\n`;
  md += `| Root Device Name | ${instance.RootDeviceName || "N/A"} |\n\n`;

  // Security Groups
  md += `### Security Groups\n\n`;
  if (instance.SecurityGroups && instance.SecurityGroups.length > 0) {
    md += `| Group ID | Group Name |\n|----------|------------|\n`;
    for (const sg of instance.SecurityGroups) {
      md += `| ${sg.GroupId} | ${sg.GroupName} |\n`;
    }
  } else {
    md += `No security groups attached.\n`;
  }
  md += `\n`;

  // Block Devices / Volumes
  md += `### Block Devices (Volumes)\n\n`;
  if (instance.BlockDeviceMappings && instance.BlockDeviceMappings.length > 0) {
    md += `| Device Name | Volume ID | Status | Delete on Termination | Size (from mapping) |\n`;
    md += `|-------------|-----------|--------|----------------------|---------------------|\n`;
    for (const bdm of instance.BlockDeviceMappings) {
      const deleteOnTerm = bdm.Ebs?.DeleteOnTermination ? "Yes" : "No";
      const volumeSize = bdm.Ebs?.VolumeSize || "N/A";
      md += `| ${bdm.DeviceName} | ${bdm.Ebs?.VolumeId || "N/A"} | ${bdm.Ebs?.Status || "N/A"} | ${deleteOnTerm} | ${volumeSize} |\n`;
    }
  } else {
    md += `No block devices attached.\n`;
  }
  md += `\n`;

  // Network Interfaces
  md += `### Network Interfaces\n\n`;
  if (instance.NetworkInterfaces && instance.NetworkInterfaces.length > 0) {
    for (const ni of instance.NetworkInterfaces) {
      md += `#### Network Interface: ${ni.NetworkInterfaceId}\n\n`;
      md += `| Property | Value |\n|----------|-------|\n`;
      md += `| Interface ID | ${ni.NetworkInterfaceId} |\n`;
      md += `| Subnet ID | ${ni.SubnetId} |\n`;
      md += `| VPC ID | ${ni.VpcId} |\n`;
      md += `| Private IP | ${ni.PrivateIpAddress} |\n`;
      md += `| Public IP | ${ni.Association?.PublicIp || "None"} |\n`;
      md += `| MAC Address | ${ni.MacAddress} |\n`;
      md += `| Source/Dest Check | ${ni.SourceDestCheck} |\n`;
      md += `| Status | ${ni.Status} |\n\n`;

      if (ni.Groups && ni.Groups.length > 0) {
        md += `**Security Groups:**\n`;
        for (const sg of ni.Groups) {
          md += `- ${sg.GroupId} (${sg.GroupName})\n`;
        }
        md += `\n`;
      }
    }
  } else {
    md += `No network interfaces.\n\n`;
  }

  // IAM Instance Profile
  md += `### IAM Instance Profile\n\n`;
  if (instance.IamInstanceProfile) {
    md += `- **ARN:** ${instance.IamInstanceProfile.Arn}\n`;
    md += `- **ID:** ${instance.IamInstanceProfile.Id}\n`;
  } else {
    md += `No IAM instance profile attached.\n`;
  }
  md += `\n`;

  // Tags
  md += `### Tags\n\n`;
  if (instance.Tags && instance.Tags.length > 0) {
    md += `| Key | Value |\n|-----|-------|\n`;
    for (const tag of instance.Tags) {
      md += `| ${tag.Key} | ${tag.Value} |\n`;
    }
  } else {
    md += `No tags.\n`;
  }
  md += `\n`;

  // Monitoring
  md += `### Monitoring\n\n`;
  md += `- **State:** ${instance.Monitoring?.State || "N/A"}\n\n`;

  return md;
}

/**
 * Format RDS instance with comprehensive details
 */
function formatRDSInstance(data: any, instanceId: string): string {
  const db = data.DBInstances?.[0];
  if (!db) return `## RDS Instance ${instanceId}\n\nNo data found.\n\n`;

  let md = `## RDS Instance: ${instanceId}\n\n`;

  md += `### Basic Information\n\n`;
  md += `| Property | Value |\n|----------|-------|\n`;
  md += `| DB Instance Identifier | ${db.DBInstanceIdentifier || "N/A"} |\n`;
  md += `| DB Instance Class | ${db.DBInstanceClass || "N/A"} |\n`;
  md += `| Engine | ${db.Engine || "N/A"} |\n`;
  md += `| Engine Version | ${db.EngineVersion || "N/A"} |\n`;
  md += `| Status | ${db.DBInstanceStatus || "N/A"} |\n`;
  md += `| Master Username | ${db.MasterUsername || "N/A"} |\n`;
  md += `| Endpoint | ${db.Endpoint?.Address || "N/A"}:${db.Endpoint?.Port || "N/A"} |\n`;
  md += `| Allocated Storage | ${db.AllocatedStorage} GB |\n`;
  md += `| Storage Type | ${db.StorageType || "N/A"} |\n`;
  md += `| IOPS | ${db.Iops || "N/A"} |\n`;
  md += `| Availability Zone | ${db.AvailabilityZone || "N/A"} |\n`;
  md += `| Multi-AZ | ${db.MultiAZ ? "Yes" : "No"} |\n`;
  md += `| Publicly Accessible | ${db.PubliclyAccessible ? "Yes" : "No"} |\n`;
  md += `| VPC ID | ${db.DBSubnetGroup?.VpcId || "N/A"} |\n`;
  md += `| Created Time | ${db.InstanceCreateTime || "N/A"} |\n\n`;

  // DB Subnet Group
  md += `### DB Subnet Group\n\n`;
  if (db.DBSubnetGroup) {
    md += `- **Name:** ${db.DBSubnetGroup.DBSubnetGroupName}\n`;
    md += `- **Description:** ${db.DBSubnetGroup.DBSubnetGroupDescription}\n`;
    md += `- **VPC ID:** ${db.DBSubnetGroup.VpcId}\n`;
    md += `- **Subnets:**\n`;
    if (db.DBSubnetGroup.Subnets) {
      for (const subnet of db.DBSubnetGroup.Subnets) {
        md += `  - ${subnet.SubnetIdentifier} (${subnet.SubnetAvailabilityZone?.Name})\n`;
      }
    }
  } else {
    md += `No DB subnet group.\n`;
  }
  md += `\n`;

  // Security Groups
  md += `### Security Groups\n\n`;
  if (db.VpcSecurityGroups && db.VpcSecurityGroups.length > 0) {
    md += `| Group ID | Status |\n|----------|--------|\n`;
    for (const sg of db.VpcSecurityGroups) {
      md += `| ${sg.VpcSecurityGroupId} | ${sg.Status} |\n`;
    }
  } else {
    md += `No VPC security groups.\n`;
  }
  md += `\n`;

  // Parameter Groups
  md += `### Parameter Groups\n\n`;
  if (db.DBParameterGroups && db.DBParameterGroups.length > 0) {
    for (const pg of db.DBParameterGroups) {
      md += `- **${pg.DBParameterGroupName}** (Status: ${pg.ParameterApplyStatus})\n`;
    }
  } else {
    md += `No parameter groups.\n`;
  }
  md += `\n`;

  // Option Groups
  md += `### Option Group\n\n`;
  if (db.OptionGroupMemberships && db.OptionGroupMemberships.length > 0) {
    for (const og of db.OptionGroupMemberships) {
      md += `- **${og.OptionGroupName}** (Status: ${og.Status})\n`;
    }
  } else {
    md += `No option groups.\n`;
  }
  md += `\n`;

  // Backup Information
  md += `### Backup & Maintenance\n\n`;
  md += `| Property | Value |\n|----------|-------|\n`;
  md += `| Backup Retention Period | ${db.BackupRetentionPeriod} days |\n`;
  md += `| Preferred Backup Window | ${db.PreferredBackupWindow || "N/A"} |\n`;
  md += `| Preferred Maintenance Window | ${db.PreferredMaintenanceWindow || "N/A"} |\n`;
  md += `| Latest Restorable Time | ${db.LatestRestorableTime || "N/A"} |\n`;
  md += `| Auto Minor Version Upgrade | ${db.AutoMinorVersionUpgrade ? "Yes" : "No"} |\n\n`;

  // Encryption
  md += `### Encryption\n\n`;
  md += `- **Storage Encrypted:** ${db.StorageEncrypted ? "Yes" : "No"}\n`;
  if (db.KmsKeyId) {
    md += `- **KMS Key ID:** ${db.KmsKeyId}\n`;
  }
  md += `\n`;

  // Tags
  md += `### Tags\n\n`;
  if (db.TagList && db.TagList.length > 0) {
    md += `| Key | Value |\n|-----|-------|\n`;
    for (const tag of db.TagList) {
      md += `| ${tag.Key} | ${tag.Value} |\n`;
    }
  } else {
    md += `No tags.\n`;
  }
  md += `\n`;

  return md;
}

/**
 * Format Route Table with all routes
 */
function formatRouteTable(data: any, routeTableId: string): string {
  const rt = data.RouteTables?.[0];
  if (!rt) return `## Route Table ${routeTableId}\n\nNo data found.\n\n`;

  let md = `## Route Table: ${routeTableId}\n\n`;

  md += `### Basic Information\n\n`;
  md += `| Property | Value |\n|----------|-------|\n`;
  md += `| Route Table ID | ${rt.RouteTableId} |\n`;
  md += `| VPC ID | ${rt.VpcId} |\n`;
  md += `| Owner ID | ${rt.OwnerId} |\n\n`;

  // Routes
  md += `### Routes\n\n`;
  if (rt.Routes && rt.Routes.length > 0) {
    md += `| Destination CIDR | Target | Status | Origin |\n`;
    md += `|-----------------|--------|--------|--------|\n`;
    for (const route of rt.Routes) {
      const destination =
        route.DestinationCidrBlock ||
        route.DestinationIpv6CidrBlock ||
        route.DestinationPrefixListId ||
        "N/A";
      const target =
        route.GatewayId ||
        route.NatGatewayId ||
        route.NetworkInterfaceId ||
        route.VpcPeeringConnectionId ||
        route.TransitGatewayId ||
        route.LocalGatewayId ||
        route.CarrierGatewayId ||
        "local";
      md += `| ${destination} | ${target} | ${route.State || "N/A"} | ${route.Origin || "N/A"} |\n`;
    }
  } else {
    md += `No routes.\n`;
  }
  md += `\n`;

  // Associations
  md += `### Associations\n\n`;
  if (rt.Associations && rt.Associations.length > 0) {
    md += `| Association ID | Subnet ID | Main | State |\n`;
    md += `|----------------|-----------|------|-------|\n`;
    for (const assoc of rt.Associations) {
      md += `| ${assoc.RouteTableAssociationId} | ${assoc.SubnetId || "Main route table"} | ${assoc.Main ? "Yes" : "No"} | ${assoc.AssociationState?.State || "N/A"} |\n`;
    }
  } else {
    md += `No associations.\n`;
  }
  md += `\n`;

  // Tags
  md += `### Tags\n\n`;
  if (rt.Tags && rt.Tags.length > 0) {
    md += `| Key | Value |\n|-----|-------|\n`;
    for (const tag of rt.Tags) {
      md += `| ${tag.Key} | ${tag.Value} |\n`;
    }
  } else {
    md += `No tags.\n`;
  }
  md += `\n`;

  return md;
}

/**
 * Format Security Group with all rules
 */
function formatSecurityGroup(data: any, sgId: string): string {
  const sg = data.SecurityGroups?.[0];
  if (!sg) return `## Security Group ${sgId}\n\nNo data found.\n\n`;

  let md = `## Security Group: ${sgId}\n\n`;

  md += `### Basic Information\n\n`;
  md += `| Property | Value |\n|----------|-------|\n`;
  md += `| Group ID | ${sg.GroupId} |\n`;
  md += `| Group Name | ${sg.GroupName} |\n`;
  md += `| Description | ${sg.Description} |\n`;
  md += `| VPC ID | ${sg.VpcId || "EC2-Classic"} |\n`;
  md += `| Owner ID | ${sg.OwnerId} |\n\n`;

  // Inbound Rules
  md += `### Inbound Rules\n\n`;
  if (sg.IpPermissions && sg.IpPermissions.length > 0) {
    md += `| Protocol | Port Range | Source | Description |\n`;
    md += `|----------|------------|--------|-------------|\n`;
    for (const rule of sg.IpPermissions) {
      const protocol = rule.IpProtocol === "-1" ? "All" : rule.IpProtocol;
      const portRange =
        rule.FromPort && rule.ToPort
          ? rule.FromPort === rule.ToPort
            ? `${rule.FromPort}`
            : `${rule.FromPort}-${rule.ToPort}`
          : "All";

      // Process IPv4 ranges
      if (rule.IpRanges) {
        for (const ipRange of rule.IpRanges) {
          md += `| ${protocol} | ${portRange} | ${ipRange.CidrIp} | ${ipRange.Description || "-"} |\n`;
        }
      }

      // Process IPv6 ranges
      if (rule.Ipv6Ranges) {
        for (const ipv6Range of rule.Ipv6Ranges) {
          md += `| ${protocol} | ${portRange} | ${ipv6Range.CidrIpv6} | ${ipv6Range.Description || "-"} |\n`;
        }
      }

      // Process referenced security groups
      if (rule.UserIdGroupPairs) {
        for (const pair of rule.UserIdGroupPairs) {
          const source =
            pair.GroupId +
            (pair.UserId && pair.UserId !== sg.OwnerId
              ? ` (${pair.UserId})`
              : "");
          md += `| ${protocol} | ${portRange} | ${source} | ${pair.Description || "-"} |\n`;
        }
      }

      // If none of the above, show 'Any'
      if (
        (!rule.IpRanges || rule.IpRanges.length === 0) &&
        (!rule.Ipv6Ranges || rule.Ipv6Ranges.length === 0) &&
        (!rule.UserIdGroupPairs || rule.UserIdGroupPairs.length === 0)
      ) {
        md += `| ${protocol} | ${portRange} | Any | - |\n`;
      }
    }
  } else {
    md += `No inbound rules.\n`;
  }
  md += `\n`;

  // Outbound Rules
  md += `### Outbound Rules\n\n`;
  if (sg.IpPermissionsEgress && sg.IpPermissionsEgress.length > 0) {
    md += `| Protocol | Port Range | Destination | Description |\n`;
    md += `|----------|------------|-------------|-------------|\n`;
    for (const rule of sg.IpPermissionsEgress) {
      const protocol = rule.IpProtocol === "-1" ? "All" : rule.IpProtocol;
      const portRange =
        rule.FromPort && rule.ToPort
          ? rule.FromPort === rule.ToPort
            ? `${rule.FromPort}`
            : `${rule.FromPort}-${rule.ToPort}`
          : "All";

      // Process IPv4 ranges
      if (rule.IpRanges) {
        for (const ipRange of rule.IpRanges) {
          md += `| ${protocol} | ${portRange} | ${ipRange.CidrIp} | ${ipRange.Description || "-"} |\n`;
        }
      }

      // Process IPv6 ranges
      if (rule.Ipv6Ranges) {
        for (const ipv6Range of rule.Ipv6Ranges) {
          md += `| ${protocol} | ${portRange} | ${ipv6Range.CidrIpv6} | ${ipv6Range.Description || "-"} |\n`;
        }
      }

      // Process referenced security groups
      if (rule.UserIdGroupPairs) {
        for (const pair of rule.UserIdGroupPairs) {
          const dest =
            pair.GroupId +
            (pair.UserId && pair.UserId !== sg.OwnerId
              ? ` (${pair.UserId})`
              : "");
          md += `| ${protocol} | ${portRange} | ${dest} | ${pair.Description || "-"} |\n`;
        }
      }

      if (
        (!rule.IpRanges || rule.IpRanges.length === 0) &&
        (!rule.Ipv6Ranges || rule.Ipv6Ranges.length === 0) &&
        (!rule.UserIdGroupPairs || rule.UserIdGroupPairs.length === 0)
      ) {
        md += `| ${protocol} | ${portRange} | Any | - |\n`;
      }
    }
  } else {
    md += `No outbound rules.\n`;
  }
  md += `\n`;

  // Tags
  md += `### Tags\n\n`;
  if (sg.Tags && sg.Tags.length > 0) {
    md += `| Key | Value |\n|-----|-------|\n`;
    for (const tag of sg.Tags) {
      md += `| ${tag.Key} | ${tag.Value} |\n`;
    }
  } else {
    md += `No tags.\n`;
  }
  md += `\n`;

  return md;
}

/**
 * Format Load Balancer with comprehensive details
 */
function formatLoadBalancer(data: any, lbName: string): string {
  const lb = data.LoadBalancers?.[0];
  if (!lb) return `## Load Balancer ${lbName}\n\nNo data found.\n\n`;

  let md = `## Load Balancer: ${lbName}\n\n`;

  md += `### Basic Information\n\n`;
  md += `| Property | Value |\n|----------|-------|\n`;
  md += `| Name | ${lb.LoadBalancerName || "N/A"} |\n`;
  md += `| ARN | ${lb.LoadBalancerArn || "N/A"} |\n`;
  md += `| DNS Name | ${lb.DNSName || "N/A"} |\n`;
  md += `| Type | ${lb.Type || "Classic"} |\n`;
  md += `| Scheme | ${lb.Scheme || "N/A"} |\n`;
  md += `| State | ${lb.State?.Code || "N/A"} |\n`;
  md += `| VPC ID | ${lb.VpcId || "N/A"} |\n`;
  md += `| IP Address Type | ${lb.IpAddressType || "N/A"} |\n`;
  md += `| Created Time | ${lb.CreatedTime || "N/A"} |\n\n`;

  // Availability Zones / Subnets
  md += `### Availability Zones & Subnets\n\n`;
  if (lb.AvailabilityZones && lb.AvailabilityZones.length > 0) {
    md += `| AZ | Subnet ID | Zone Name | Outpost ID |\n`;
    md += `|----|-----------|-----------|------------|\n`;
    for (const az of lb.AvailabilityZones) {
      md += `| ${az.ZoneName || "N/A"} | ${az.SubnetId || "N/A"} | ${az.ZoneName || "N/A"} | ${az.OutpostId || "-"} |\n`;
    }
  } else {
    md += `No availability zones configured.\n`;
  }
  md += `\n`;

  // Security Groups
  md += `### Security Groups\n\n`;
  if (lb.SecurityGroups && lb.SecurityGroups.length > 0) {
    for (const sg of lb.SecurityGroups) {
      md += `- ${sg}\n`;
    }
  } else {
    md += `No security groups attached.\n`;
  }
  md += `\n`;

  // Tags
  md += `### Tags\n\n`;
  if (lb.Tags && lb.Tags.length > 0) {
    md += `| Key | Value |\n|-----|-------|\n`;
    for (const tag of lb.Tags) {
      md += `| ${tag.Key} | ${tag.Value} |\n`;
    }
  } else {
    md += `No tags.\n`;
  }
  md += `\n`;

  md += `### Additional Configuration\n\n`;
  md += `For detailed listener, target group, and rule information, use:\n`;
  md += `\`\`\`bash\n`;
  md += `aws elbv2 describe-listeners --load-balancer-arn ${lb.LoadBalancerArn}\n`;
  md += `aws elbv2 describe-target-groups --load-balancer-arn ${lb.LoadBalancerArn}\n`;
  md += `\`\`\`\n\n`;

  return md;
}

/**
 * Format Lambda function with comprehensive details
 */
function formatLambdaFunction(data: any, functionName: string): string {
  const fn = data.Configuration;
  if (!fn) return `## Lambda Function ${functionName}\n\nNo data found.\n\n`;

  let md = `## Lambda Function: ${functionName}\n\n`;

  md += `### Basic Information\n\n`;
  md += `| Property | Value |\n|----------|-------|\n`;
  md += `| Function Name | ${fn.FunctionName || "N/A"} |\n`;
  md += `| Function ARN | ${fn.FunctionArn || "N/A"} |\n`;
  md += `| Runtime | ${fn.Runtime || "N/A"} |\n`;
  md += `| Handler | ${fn.Handler || "N/A"} |\n`;
  md += `| Memory | ${fn.MemorySize || "N/A"} MB |\n`;
  md += `| Timeout | ${fn.Timeout || "N/A"} seconds |\n`;
  md += `| Code Size | ${fn.CodeSize ? (fn.CodeSize / 1024 / 1024).toFixed(2) : "N/A"} MB |\n`;
  md += `| Last Modified | ${fn.LastModified || "N/A"} |\n`;
  md += `| State | ${fn.State || "N/A"} |\n`;
  md += `| Role | ${fn.Role || "N/A"} |\n\n`;

  // Environment Variables
  md += `### Environment Variables\n\n`;
  if (fn.Environment && fn.Environment.Variables) {
    const vars = Object.entries(fn.Environment.Variables);
    if (vars.length > 0) {
      md += `| Key | Value |\n|-----|-------|\n`;
      for (const [key, value] of vars) {
        md += `| ${key} | ${value} |\n`;
      }
    } else {
      md += `No environment variables.\n`;
    }
  } else {
    md += `No environment variables.\n`;
  }
  md += `\n`;

  // VPC Configuration
  md += `### VPC Configuration\n\n`;
  if (fn.VpcConfig && fn.VpcConfig.VpcId) {
    md += `| Property | Value |\n|----------|-------|\n`;
    md += `| VPC ID | ${fn.VpcConfig.VpcId} |\n`;
    md += `| Subnets | ${fn.VpcConfig.SubnetIds?.join(", ") || "N/A"} |\n`;
    md += `| Security Groups | ${fn.VpcConfig.SecurityGroupIds?.join(", ") || "N/A"} |\n`;
  } else {
    md += `No VPC configuration (runs in AWS Lambda service VPC).\n`;
  }
  md += `\n`;

  // Layers
  md += `### Layers\n\n`;
  if (fn.Layers && fn.Layers.length > 0) {
    md += `| Layer ARN | Size (bytes) |\n|-----------|-------------|\n`;
    for (const layer of fn.Layers) {
      md += `| ${layer.Arn} | ${layer.CodeSize || "N/A"} |\n`;
    }
  } else {
    md += `No layers attached.\n`;
  }
  md += `\n`;

  // Dead Letter Config
  md += `### Dead Letter Queue\n\n`;
  if (fn.DeadLetterConfig && fn.DeadLetterConfig.TargetArn) {
    md += `- **Target ARN:** ${fn.DeadLetterConfig.TargetArn}\n`;
  } else {
    md += `No dead letter queue configured.\n`;
  }
  md += `\n`;

  // Concurrency
  md += `### Concurrency\n\n`;
  md += `- **Reserved Concurrent Executions:** ${fn.ReservedConcurrentExecutions || "Unreserved"}\n\n`;

  // Tags
  md += `### Tags\n\n`;
  if (fn.Tags && Object.keys(fn.Tags).length > 0) {
    md += `| Key | Value |\n|-----|-------|\n`;
    for (const [key, value] of Object.entries(fn.Tags)) {
      md += `| ${key} | ${value} |\n`;
    }
  } else {
    md += `No tags.\n`;
  }
  md += `\n`;

  return md;
}

/**
 * Format VPC with comprehensive details
 */
function formatVPC(data: any, vpcId: string): string {
  const vpc = data.Vpcs?.[0];
  if (!vpc) return `## VPC ${vpcId}\n\nNo data found.\n\n`;

  let md = `## VPC: ${vpcId}\n\n`;

  md += `### Basic Information\n\n`;
  md += `| Property | Value |\n|----------|-------|\n`;
  md += `| VPC ID | ${vpc.VpcId} |\n`;
  md += `| State | ${vpc.State || "N/A"} |\n`;
  md += `| CIDR Block | ${vpc.CidrBlock || "N/A"} |\n`;
  md += `| DHCP Options ID | ${vpc.DhcpOptionsId || "N/A"} |\n`;
  md += `| Instance Tenancy | ${vpc.InstanceTenancy || "N/A"} |\n`;
  md += `| Is Default | ${vpc.IsDefault ? "Yes" : "No"} |\n`;
  md += `| Owner ID | ${vpc.OwnerId || "N/A"} |\n\n`;

  // Additional CIDR Blocks
  md += `### IPv4 CIDR Blocks\n\n`;
  if (vpc.CidrBlockAssociationSet && vpc.CidrBlockAssociationSet.length > 0) {
    md += `| CIDR Block | Association ID | State |\n`;
    md += `|------------|----------------|-------|\n`;
    for (const cidr of vpc.CidrBlockAssociationSet) {
      md += `| ${cidr.CidrBlock} | ${cidr.AssociationId} | ${cidr.CidrBlockState?.State || "N/A"} |\n`;
    }
  } else {
    md += `Only primary CIDR block.\n`;
  }
  md += `\n`;

  // IPv6 CIDR Blocks
  md += `### IPv6 CIDR Blocks\n\n`;
  if (
    vpc.Ipv6CidrBlockAssociationSet &&
    vpc.Ipv6CidrBlockAssociationSet.length > 0
  ) {
    md += `| IPv6 CIDR Block | Association ID | State |\n`;
    md += `|-----------------|----------------|-------|\n`;
    for (const cidr of vpc.Ipv6CidrBlockAssociationSet) {
      md += `| ${cidr.Ipv6CidrBlock} | ${cidr.AssociationId} | ${cidr.Ipv6CidrBlockState?.State || "N/A"} |\n`;
    }
  } else {
    md += `No IPv6 CIDR blocks.\n`;
  }
  md += `\n`;

  // DNS Settings
  md += `### DNS Settings\n\n`;
  md += `- **DNS Resolution:** ${vpc.EnableDnsSupport !== false ? "Enabled" : "Disabled"}\n`;
  md += `- **DNS Hostnames:** ${vpc.EnableDnsHostnames ? "Enabled" : "Disabled"}\n\n`;

  // Tags
  md += `### Tags\n\n`;
  if (vpc.Tags && vpc.Tags.length > 0) {
    md += `| Key | Value |\n|-----|-------|\n`;
    for (const tag of vpc.Tags) {
      md += `| ${tag.Key} | ${tag.Value} |\n`;
    }
  } else {
    md += `No tags.\n`;
  }
  md += `\n`;

  return md;
}

/**
 * Format Subnet with comprehensive details
 */
function formatSubnet(data: any, subnetId: string): string {
  const subnet = data.Subnets?.[0];
  if (!subnet) return `## Subnet ${subnetId}\n\nNo data found.\n\n`;

  let md = `## Subnet: ${subnetId}\n\n`;

  md += `### Basic Information\n\n`;
  md += `| Property | Value |\n|----------|-------|\n`;
  md += `| Subnet ID | ${subnet.SubnetId} |\n`;
  md += `| State | ${subnet.State || "N/A"} |\n`;
  md += `| VPC ID | ${subnet.VpcId || "N/A"} |\n`;
  md += `| CIDR Block | ${subnet.CidrBlock || "N/A"} |\n`;
  md += `| Available IPs | ${subnet.AvailableIpAddressCount || "N/A"} |\n`;
  md += `| Availability Zone | ${subnet.AvailabilityZone || "N/A"} |\n`;
  md += `| Availability Zone ID | ${subnet.AvailabilityZoneId || "N/A"} |\n`;
  md += `| Default for AZ | ${subnet.DefaultForAz ? "Yes" : "No"} |\n`;
  md += `| Owner ID | ${subnet.OwnerId || "N/A"} |\n\n`;

  // IPv6 CIDR Block
  if (
    subnet.Ipv6CidrBlockAssociationSet &&
    subnet.Ipv6CidrBlockAssociationSet.length > 0
  ) {
    md += `### IPv6 CIDR Blocks\n\n`;
    md += `| IPv6 CIDR Block | Association ID | State |\n`;
    md += `|-----------------|----------------|-------|\n`;
    for (const cidr of subnet.Ipv6CidrBlockAssociationSet) {
      md += `| ${cidr.Ipv6CidrBlock} | ${cidr.AssociationId} | ${cidr.Ipv6CidrBlockState?.State || "N/A"} |\n`;
    }
    md += `\n`;
  }

  // Auto-assign Settings
  md += `### Auto-Assign Settings\n\n`;
  md += `- **Auto-assign Public IPv4:** ${subnet.MapPublicIpOnLaunch ? "Enabled" : "Disabled"}\n`;
  md += `- **Auto-assign IPv6:** ${subnet.AssignIpv6AddressOnCreation ? "Enabled" : "Disabled"}\n`;
  md += `- **Customer-Owned IPv4 Pool:** ${subnet.CustomerOwnedIpv4Pool || "None"}\n\n`;

  // Outpost
  if (subnet.OutpostArn) {
    md += `### Outpost\n\n`;
    md += `- **Outpost ARN:** ${subnet.OutpostArn}\n\n`;
  }

  // Tags
  md += `### Tags\n\n`;
  if (subnet.Tags && subnet.Tags.length > 0) {
    md += `| Key | Value |\n|-----|-------|\n`;
    for (const tag of subnet.Tags) {
      md += `| ${tag.Key} | ${tag.Value} |\n`;
    }
  } else {
    md += `No tags.\n`;
  }
  md += `\n`;

  return md;
}

/**
 * Format Network ACL with comprehensive details
 */
function formatNetworkAcl(data: any, naclId: string): string {
  const nacl = data.NetworkAcls?.[0];
  if (!nacl) return `## Network ACL ${naclId}\n\nNo data found.\n\n`;

  let md = `## Network ACL: ${naclId}\n\n`;

  md += `### Basic Information\n\n`;
  md += `| Property | Value |\n|----------|-------|\n`;
  md += `| Network ACL ID | ${nacl.NetworkAclId} |\n`;
  md += `| VPC ID | ${nacl.VpcId || "N/A"} |\n`;
  md += `| Is Default | ${nacl.IsDefault ? "Yes" : "No"} |\n`;
  md += `| Owner ID | ${nacl.OwnerId || "N/A"} |\n\n`;

  // Inbound Rules
  md += `### Inbound Rules\n\n`;
  const inboundEntries = nacl.Entries?.filter((e: any) => !e.Egress) || [];
  if (inboundEntries.length > 0) {
    md += `| Rule # | Protocol | Port Range | Source | Action |\n`;
    md += `|--------|----------|------------|--------|--------|\n`;
    // Sort by rule number
    inboundEntries.sort((a: any, b: any) => a.RuleNumber - b.RuleNumber);
    for (const entry of inboundEntries) {
      const protocol =
        entry.Protocol === "-1"
          ? "All"
          : entry.Protocol === "6"
            ? "TCP"
            : entry.Protocol === "17"
              ? "UDP"
              : entry.Protocol === "1"
                ? "ICMP"
                : entry.Protocol;
      const portRange = entry.PortRange
        ? `${entry.PortRange.From}${entry.PortRange.From !== entry.PortRange.To ? `-${entry.PortRange.To}` : ""}`
        : "All";
      const source = entry.CidrBlock || entry.Ipv6CidrBlock || "N/A";
      md += `| ${entry.RuleNumber} | ${protocol} | ${portRange} | ${source} | ${entry.RuleAction} |\n`;
    }
  } else {
    md += `No inbound rules.\n`;
  }
  md += `\n`;

  // Outbound Rules
  md += `### Outbound Rules\n\n`;
  const outboundEntries = nacl.Entries?.filter((e: any) => e.Egress) || [];
  if (outboundEntries.length > 0) {
    md += `| Rule # | Protocol | Port Range | Destination | Action |\n`;
    md += `|--------|----------|------------|-------------|--------|\n`;
    // Sort by rule number
    outboundEntries.sort((a: any, b: any) => a.RuleNumber - b.RuleNumber);
    for (const entry of outboundEntries) {
      const protocol =
        entry.Protocol === "-1"
          ? "All"
          : entry.Protocol === "6"
            ? "TCP"
            : entry.Protocol === "17"
              ? "UDP"
              : entry.Protocol === "1"
                ? "ICMP"
                : entry.Protocol;
      const portRange = entry.PortRange
        ? `${entry.PortRange.From}${entry.PortRange.From !== entry.PortRange.To ? `-${entry.PortRange.To}` : ""}`
        : "All";
      const destination = entry.CidrBlock || entry.Ipv6CidrBlock || "N/A";
      md += `| ${entry.RuleNumber} | ${protocol} | ${portRange} | ${destination} | ${entry.RuleAction} |\n`;
    }
  } else {
    md += `No outbound rules.\n`;
  }
  md += `\n`;

  // Associations
  md += `### Subnet Associations\n\n`;
  if (nacl.Associations && nacl.Associations.length > 0) {
    md += `| Association ID | Subnet ID |\n`;
    md += `|----------------|----------|\n`;
    for (const assoc of nacl.Associations) {
      md += `| ${assoc.NetworkAclAssociationId} | ${assoc.SubnetId} |\n`;
    }
  } else {
    md += `No subnet associations.\n`;
  }
  md += `\n`;

  // Tags
  md += `### Tags\n\n`;
  if (nacl.Tags && nacl.Tags.length > 0) {
    md += `| Key | Value |\n|-----|-------|\n`;
    for (const tag of nacl.Tags) {
      md += `| ${tag.Key} | ${tag.Value} |\n`;
    }
  } else {
    md += `No tags.\n`;
  }
  md += `\n`;

  return md;
}

/**
 * Generic formatter for resources without custom formatting
 */
function formatGeneric(data: any, id: string, serviceName: string): string {
  let md = `## ${serviceName}: ${id}\n\n`;
  md += `### Raw JSON Data\n\n`;
  md += `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n\n`;
  return md;
}

// Service configurations with enhanced formatters
const serviceFormatters: ServiceFormatter[] = [
  {
    name: "EC2",
    csvPattern: /^EC2-([^-]+(?:-[^-]+)*)-(\d{8})-(.+)\.csv$/,
    idField: 0,
    describeCommand: (id: string, region: string) =>
      $`aws ec2 describe-instances --instance-ids ${id} --region ${region} --output json`,
    formatter: formatEC2Instance,
    regionRequired: true,
  },
  {
    name: "RDS",
    csvPattern: /^RDS-([^-]+(?:-[^-]+)*)-(\d{8})-(.+)\.csv$/,
    idField: 0,
    describeCommand: (id: string, region: string) =>
      $`aws rds describe-db-instances --db-instance-identifier ${id} --region ${region} --output json`,
    formatter: formatRDSInstance,
    regionRequired: true,
  },
  {
    name: "RouteTable",
    csvPattern: /^RouteTable-([^-]+(?:-[^-]+)*)-(\d{8})-(.+)\.csv$/,
    idField: 0,
    describeCommand: (id: string, region: string) =>
      $`aws ec2 describe-route-tables --route-table-ids ${id} --region ${region} --output json`,
    formatter: formatRouteTable,
    regionRequired: true,
  },
  {
    name: "SecurityGroup",
    csvPattern: /^SecurityGroup-([^-]+(?:-[^-]+)*)-(\d{8})-(.+)\.csv$/,
    idField: 0,
    describeCommand: (id: string, region: string) =>
      $`aws ec2 describe-security-groups --group-ids ${id} --region ${region} --output json`,
    formatter: formatSecurityGroup,
    regionRequired: true,
  },
  {
    name: "LoadBalancer",
    csvPattern: /^LoadBalancer-([^-]+(?:-[^-]+)*)-(\d{8})-(.+)\.csv$/,
    idField: 0, // Name
    describeCommand: (id: string, region: string) =>
      $`aws elbv2 describe-load-balancers --names ${id} --region ${region} --output json`,
    formatter: formatLoadBalancer,
    regionRequired: true,
  },
  {
    name: "Lambda",
    csvPattern: /^Lambda-([^-]+(?:-[^-]+)*)-(\d{8})-(.+)\.csv$/,
    idField: 0, // Name
    describeCommand: (id: string, region: string) =>
      $`aws lambda get-function --function-name ${id} --region ${region} --output json`,
    formatter: formatLambdaFunction,
    regionRequired: true,
  },
  {
    name: "VPC",
    csvPattern: /^VPC-([^-]+(?:-[^-]+)*)-(\d{8})-(.+)\.csv$/,
    idField: 0,
    describeCommand: (id: string, region: string) =>
      $`aws ec2 describe-vpcs --vpc-ids ${id} --region ${region} --output json`,
    formatter: formatVPC,
    regionRequired: true,
  },
  {
    name: "Subnet",
    csvPattern: /^Subnet-([^-]+(?:-[^-]+)*)-(\d{8})-(.+)\.csv$/,
    idField: 0,
    describeCommand: (id: string, region: string) =>
      $`aws ec2 describe-subnets --subnet-ids ${id} --region ${region} --output json`,
    formatter: formatSubnet,
    regionRequired: true,
  },
  {
    name: "NetworkAcl",
    csvPattern: /^NetworkAcl-([^-]+(?:-[^-]+)*)-(\d{8})-(.+)\.csv$/,
    idField: 0,
    describeCommand: (id: string, region: string) =>
      $`aws ec2 describe-network-acls --network-acl-ids ${id} --region ${region} --output json`,
    formatter: formatNetworkAcl,
    regionRequired: true,
  },
  // Add more services as needed with custom formatters
];

/**
 * Main function to generate comprehensive detailed descriptions
 */
export async function generateComprehensiveDescriptions(
  csvFilePath: string,
  verbose: boolean,
) {
  const log = verbose ? console.log : () => {};

  // Check if file exists
  try {
    const fileStat = await stat(csvFilePath);
    if (!fileStat.isFile() || !csvFilePath.endsWith(".csv")) {
      throw new Error(`${csvFilePath} is not a CSV file`);
    }
  } catch (error) {
    throw new Error(`Failed to access file ${csvFilePath}: ${error}`);
  }

  const fileName = csvFilePath.split("/").pop() || "";

  // Find matching service configuration
  let matchedConfig: ServiceFormatter | null = null;
  let region = "unknown";
  let timestamp = "";
  let account = "unknown";

  for (const config of serviceFormatters) {
    const match = fileName.match(config.csvPattern);
    if (match) {
      matchedConfig = config;
      region = config.regionRequired ? match[1]! : "global";
      timestamp = config.regionRequired ? match[2]! : match[1]!;
      account = config.regionRequired ? match[3]! : match[2]!;
      break;
    }
  }

  if (!matchedConfig) {
    throw new Error(
      `Unable to parse filename: ${fileName}. File does not match any supported service pattern for --describe-harder.`,
    );
  }

  log(`Processing CSV file: ${fileName}`);
  log(`Service: ${matchedConfig.name}, Region: ${region}, Account: ${account}`);

  // Check if this is a local profile account
  const isLocalProfile = account === "local" || /^\d{12}$/.test(account);

  if (!isLocalProfile) {
    // Authenticate with TOTP for letme
    if (process.env.AWS_PROFILE !== account) {
      const secret = await getTOTPSecret();
      const mfaToken = generateTOTPToken(secret);
      log(`Generated MFA token for ${account}: ${mfaToken}`);
      await obtainAWSCredentials(account, mfaToken, log);
    }
  } else {
    delete process.env.AWS_PROFILE;
  }

  // Prepare output
  const outputDir = csvFilePath.substring(0, csvFilePath.lastIndexOf("/"));
  const outputFile = `${outputDir}/comprehensive-${matchedConfig.name}.md`;

  let markdownOutput = `# Comprehensive Description: ${matchedConfig.name}\n\n`;

  // Add metadata
  const version = await getVersion();
  const now = new Date();
  const formattedDate =
    now.toISOString().replace("T", " ").substring(0, 19) + " UTC";

  let accountId = "N/A";
  try {
    accountId = await getAccountId();
  } catch (error) {
    // Ignore
  }

  markdownOutput += `- **Generated by AWS Inventory Generator v${version}**\n`;
  markdownOutput += `- **Account ID:** ${accountId}\n`;
  if (!isLocalProfile) {
    markdownOutput += `- **Account Name (letme):** ${account}\n`;
  }
  markdownOutput += `- **Region:** ${region}\n`;
  markdownOutput += `- **Service:** ${matchedConfig.name}\n`;
  markdownOutput += `- **Generated on:** ${formattedDate}\n`;
  markdownOutput += `- **Mode:** Comprehensive (--describe-harder)\n\n`;
  markdownOutput += `---\n\n`;

  // Read CSV and process each resource
  const csvContent = await Bun.file(csvFilePath).text();
  const lines = csvContent.split("\n").slice(1); // Skip header

  let processedCount = 0;
  for (const line of lines) {
    if (!line.trim()) continue;
    const columns = line.split(",");
    const id = columns[matchedConfig.idField]?.trim();
    if (!id) continue;

    log(`Describing ${matchedConfig.name} ${id}`);
    try {
      const result = await matchedConfig.describeCommand(id, region).quiet();
      const jsonData = JSON.parse(result.stdout.toString());

      // Format using custom formatter
      const formatted = matchedConfig.formatter(jsonData, id);
      markdownOutput += formatted;
      markdownOutput += `---\n\n`;

      processedCount++;
    } catch (error: any) {
      console.error(`Failed to describe ${id}: ${error}`);
      if (error.exitCode) console.error(`Exit code: ${error.exitCode}`);
      if (error.stderr) console.error(`Stderr: ${error.stderr}`);

      markdownOutput += `## ${matchedConfig.name}: ${id}\n\n`;
      markdownOutput += `**Error:** Failed to retrieve details.\n\n`;
      markdownOutput += `---\n\n`;
    }
  }

  // Write output
  await Bun.write(outputFile, markdownOutput);
  log(`\nComprehensive descriptions written to: ${outputFile}`);
  log(`Processed ${processedCount} resources.`);
}
