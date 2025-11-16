/**
 * Converts AWS CLI JSON output to markdown format
 * Uses JSON as intermediate for reliable parsing and conversion
 * @param content - The raw JSON output from AWS CLI
 * @param format - Must be 'json' for reliable parsing
 * @returns Markdown formatted string
 */
export function convertToMarkdown(content: string, format: "json"): string {
  if (format !== "json") {
    throw new Error(
      "Markdown conversion requires JSON format for reliable parsing",
    );
  }

  try {
    const jsonData = JSON.parse(content);
    return jsonToMarkdown(jsonData);
  } catch (error) {
    console.error(`Error converting to markdown: ${error}`);
    return `# Error Converting to Markdown\n\n\`\`\`\n${content}\n\`\`\`\``;
  }
}

/**
 * Converts AWS JSON response to markdown format
 */
function jsonToMarkdown(data: any): string {
  // Handle different AWS response structures
  if (data.Reservations && Array.isArray(data.Reservations)) {
    // EC2 instances response
    return formatEC2Instances(data.Reservations);
  } else if (data.DBInstances && Array.isArray(data.DBInstances)) {
    // RDS instances response
    return formatRDSInstances(data.DBInstances);
  } else if (data.Buckets && Array.isArray(data.Buckets)) {
    // S3 buckets response
    return formatS3Buckets(data.Buckets);
  } else if (data.Vpcs && Array.isArray(data.Vpcs)) {
    // VPC response
    return formatVPCs(data.Vpcs);
  } else if (data.Subnets && Array.isArray(data.Subnets)) {
    // Subnets response
    return formatSubnets(data.Subnets);
  } else if (data.SecurityGroups && Array.isArray(data.SecurityGroups)) {
    // Security Groups response
    return formatSecurityGroups(data.SecurityGroups);
  } else if (data.LoadBalancers && Array.isArray(data.LoadBalancers)) {
    // Load Balancers response
    return formatLoadBalancers(data.LoadBalancers);
  } else if (data.Functions && Array.isArray(data.Functions)) {
    // Lambda functions response
    return formatLambdaFunctions(data.Functions);
  } else if (data.Table && data.Table.TableName) {
    // DynamoDB table response
    return formatDynamoDBTable(data.Table);
  } else if (data.clusters && Array.isArray(data.clusters)) {
    // ECS clusters response
    return formatECSClusters(data.clusters);
  } else if (
    data.clusters &&
    data.clusters.items &&
    Array.isArray(data.clusters.items)
  ) {
    // EKS clusters response
    return formatEKSClusters(data.clusters.items);
  } else if (
    data.DistributionList &&
    Array.isArray(data.DistributionList.Items)
  ) {
    // CloudFront distributions response
    return formatCloudFrontDistributions(data.DistributionList.Items);
  } else if (data.HostedZones && Array.isArray(data.HostedZones)) {
    // Route53 hosted zones response
    return formatRoute53HostedZones(data.HostedZones);
  } else if (data.Users && Array.isArray(data.Users)) {
    // IAM users response
    return formatIAMUsers(data.Users);
  } else if (data.Roles && Array.isArray(data.Roles)) {
    // IAM roles response
    return formatIAMRoles(data.Roles);
  } else if (data.Clusters && Array.isArray(data.Clusters)) {
    // Redshift clusters response
    return formatRedshiftClusters(data.Clusters);
  } else if (data.JobList && Array.isArray(data.JobList)) {
    // Glue jobs response
    return formatGlueJobs(data.JobList);
  } else if (data.DomainStatusList && Array.isArray(data.DomainStatusList)) {
    // OpenSearch domains response
    return formatOpenSearchDomains(data.DomainStatusList);
  } else if (data.KeyList && Array.isArray(data.KeyList)) {
    // KMS keys response
    return formatKMSKeys(data.KeyList);
  } else if (data.MetricAlarms && Array.isArray(data.MetricAlarms)) {
    // CloudWatch alarms response
    return formatCloudWatchAlarms(data.MetricAlarms);
  } else if (data.SecretList && Array.isArray(data.SecretList)) {
    // Secrets Manager secrets response
    return formatSecretsManagerSecrets(data.SecretList);
  } else if (data.repositories && Array.isArray(data.repositories)) {
    // ECR repositories response
    return formatECRRepositories(data.repositories);
  } else if (data.InternetGateways && Array.isArray(data.InternetGateways)) {
    // Internet Gateways response
    return formatInternetGateways(data.InternetGateways);
  } else if (data.NatGateways && Array.isArray(data.NatGateways)) {
    // NAT Gateways response
    return formatNatGateways(data.NatGateways);
  } else if (data.Addresses && Array.isArray(data.Addresses)) {
    // Elastic IPs response
    return formatElasticIPs(data.Addresses);
  } else if (data.VpnGateways && Array.isArray(data.VpnGateways)) {
    // VPN Gateways response
    return formatVpnGateways(data.VpnGateways);
  } else if (data.VpnConnections && Array.isArray(data.VpnConnections)) {
    // VPN Connections response
    return formatVpnConnections(data.VpnConnections);
  } else if (data.TransitGateways && Array.isArray(data.TransitGateways)) {
    // Transit Gateways response
    return formatTransitGateways(data.TransitGateways);
  } else if (data.VpcEndpoints && Array.isArray(data.VpcEndpoints)) {
    // VPC Endpoints response
    return formatVpcEndpoints(data.VpcEndpoints);
  } else if (
    data.VpcPeeringConnections &&
    Array.isArray(data.VpcPeeringConnections)
  ) {
    // VPC Peering Connections response
    return formatVpcPeeringConnections(data.VpcPeeringConnections);
  } else if (data.NetworkAcls && Array.isArray(data.NetworkAcls)) {
    // Network ACLs response
    return formatNetworkAcls(data.NetworkAcls);
  } else if (data.RouteTables && Array.isArray(data.RouteTables)) {
    // Route Tables response
    return formatRouteTables(data.RouteTables);
  } else if (data.NetworkInterfaces && Array.isArray(data.NetworkInterfaces)) {
    // Network Interfaces response
    return formatNetworkInterfaces(data.NetworkInterfaces);
  } else {
    // Generic JSON to markdown conversion
    return `# AWS Resource Details\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\``;
  }
}

// Helper functions for formatting different AWS resources

function formatEC2Instances(reservations: any[]): string {
  const instances = reservations.flatMap((res: any) => res.Instances || []);
  const headers = [
    "Instance ID",
    "State",
    "Type",
    "Private IP",
    "Public IP",
    "Launch Time",
  ];
  const rows = instances.map((instance: any) => [
    instance.InstanceId || "",
    instance.State?.Name || "",
    instance.InstanceType || "",
    instance.PrivateIpAddress || "",
    instance.PublicIpAddress || "",
    instance.LaunchTime || "",
  ]);

  return createMarkdownTable("EC2 Instances", headers, rows);
}

function formatRDSInstances(dbInstances: any[]): string {
  const headers = ["DB Instance ID", "Engine", "Status", "Endpoint", "Port"];
  const rows = dbInstances.map((db: any) => [
    db.DBInstanceIdentifier || "",
    db.Engine || "",
    db.DBInstanceStatus || "",
    db.Endpoint?.Address || "",
    db.Endpoint?.Port?.toString() || "",
  ]);

  return createMarkdownTable("RDS Instances", headers, rows);
}

function formatS3Buckets(buckets: any[]): string {
  const headers = ["Bucket Name", "Creation Date"];
  const rows = buckets.map((bucket: any) => [
    bucket.Name || "",
    bucket.CreationDate || "",
  ]);

  return createMarkdownTable("S3 Buckets", headers, rows);
}

function formatVPCs(vpcs: any[]): string {
  const headers = ["VPC ID", "State", "CIDR Block", "Is Default"];
  const rows = vpcs.map((vpc: any) => [
    vpc.VpcId || "",
    vpc.State || "",
    vpc.CidrBlock || "",
    vpc.IsDefault?.toString() || "",
  ]);

  return createMarkdownTable("VPCs", headers, rows);
}

function formatSubnets(subnets: any[]): string {
  const headers = ["Subnet ID", "VPC ID", "CIDR Block", "AZ", "State"];
  const rows = subnets.map((subnet: any) => [
    subnet.SubnetId || "",
    subnet.VpcId || "",
    subnet.CidrBlock || "",
    subnet.AvailabilityZone || "",
    subnet.State || "",
  ]);

  return createMarkdownTable("Subnets", headers, rows);
}

function formatSecurityGroups(securityGroups: any[]): string {
  const headers = ["Group ID", "Group Name", "Description", "VPC ID"];
  const rows = securityGroups.map((sg: any) => [
    sg.GroupId || "",
    sg.GroupName || "",
    sg.Description || "",
    sg.VpcId || "",
  ]);

  return createMarkdownTable("Security Groups", headers, rows);
}

function formatLoadBalancers(loadBalancers: any[]): string {
  const headers = ["Name", "Type", "State", "DNS Name", "Scheme"];
  const rows = loadBalancers.map((lb: any) => [
    lb.LoadBalancerName || "",
    lb.Type || "",
    lb.State?.Code || "",
    lb.DNSName || "",
    lb.Scheme || "",
  ]);

  return createMarkdownTable("Load Balancers", headers, rows);
}

function formatLambdaFunctions(functions: any[]): string {
  const headers = ["Function Name", "Runtime", "Handler", "Last Modified"];
  const rows = functions.map((func: any) => [
    func.FunctionName || "",
    func.Runtime || "",
    func.Handler || "",
    func.LastModified || "",
  ]);

  return createMarkdownTable("Lambda Functions", headers, rows);
}

function formatDynamoDBTable(table: any): string {
  const headers = ["Table Name", "Status", "Item Count", "Size (bytes)"];
  const rows = [
    [
      table.TableName || "",
      table.TableStatus || "",
      table.ItemCount?.toString() || "",
      table.TableSizeBytes?.toString() || "",
    ],
  ];

  return createMarkdownTable("DynamoDB Table", headers, rows);
}

function formatECSClusters(clusters: any[]): string {
  const headers = ["Cluster Name", "Status", "Running Tasks", "Pending Tasks"];
  const rows = clusters.map((cluster: any) => [
    cluster.clusterName || "",
    cluster.status || "",
    cluster.runningTasksCount?.toString() || "",
    cluster.pendingTasksCount?.toString() || "",
  ]);

  return createMarkdownTable("ECS Clusters", headers, rows);
}

function formatEKSClusters(clusters: any[]): string {
  const headers = ["Cluster Name", "Status", "Version", "Created Date"];
  const rows = clusters.map((cluster: any) => [
    cluster.name || "",
    cluster.status || "",
    cluster.version || "",
    cluster.createdAt || "",
  ]);

  return createMarkdownTable("EKS Clusters", headers, rows);
}

function formatCloudFrontDistributions(distributions: any[]): string {
  const headers = ["ID", "Domain Name", "Status", "Enabled"];
  const rows = distributions.map((dist: any) => [
    dist.Id || "",
    dist.DomainName || "",
    dist.Status || "",
    dist.Enabled?.toString() || "",
  ]);

  return createMarkdownTable("CloudFront Distributions", headers, rows);
}

function formatRoute53HostedZones(hostedZones: any[]): string {
  const headers = ["Zone ID", "Name", "Private Zone", "Record Count"];
  const rows = hostedZones.map((zone: any) => [
    zone.Id || "",
    zone.Name || "",
    zone.Config?.PrivateZone?.toString() || "",
    zone.ResourceRecordSetCount?.toString() || "",
  ]);

  return createMarkdownTable("Route53 Hosted Zones", headers, rows);
}

function formatIAMUsers(users: any[]): string {
  const headers = ["User Name", "User ID", "ARN", "Create Date"];
  const rows = users.map((user: any) => [
    user.UserName || "",
    user.UserId || "",
    user.Arn || "",
    user.CreateDate || "",
  ]);

  return createMarkdownTable("IAM Users", headers, rows);
}

function formatIAMRoles(roles: any[]): string {
  const headers = ["Role Name", "Role ID", "ARN", "Create Date"];
  const rows = roles.map((role: any) => [
    role.RoleName || "",
    role.RoleId || "",
    role.Arn || "",
    role.CreateDate || "",
  ]);

  return createMarkdownTable("IAM Roles", headers, rows);
}

function formatRedshiftClusters(clusters: any[]): string {
  const headers = ["Cluster ID", "Node Type", "Status", "Master Username"];
  const rows = clusters.map((cluster: any) => [
    cluster.ClusterIdentifier || "",
    cluster.NodeType || "",
    cluster.ClusterStatus || "",
    cluster.MasterUsername || "",
  ]);

  return createMarkdownTable("Redshift Clusters", headers, rows);
}

function formatGlueJobs(jobs: any[]): string {
  const headers = ["Job Name", "Description", "Role", "Created On"];
  const rows = jobs.map((job: any) => [
    job.Name || "",
    job.Description || "",
    job.Role || "",
    job.CreatedOn || "",
  ]);

  return createMarkdownTable("Glue Jobs", headers, rows);
}

function formatOpenSearchDomains(domains: any[]): string {
  const headers = ["Domain Name", "ARN", "Created", "Endpoint"];
  const rows = domains.map((domain: any) => [
    domain.DomainName || "",
    domain.ARN || "",
    domain.Created?.toString() || "",
    domain.Endpoint || "",
  ]);

  return createMarkdownTable("OpenSearch Domains", headers, rows);
}

function formatKMSKeys(keys: any[]): string {
  const headers = [
    "Key ID",
    "Key ARN",
    "Description",
    "Key Usage",
    "Key State",
  ];
  const rows = keys.map((key: any) => [
    key.KeyId || "",
    key.KeyArn || "",
    key.Description || "",
    key.KeyUsage || "",
    key.KeyState || "",
  ]);

  return createMarkdownTable("KMS Keys", headers, rows);
}

function formatCloudWatchAlarms(alarms: any[]): string {
  const headers = ["Alarm Name", "Description", "State", "Metric Name"];
  const rows = alarms.map((alarm: any) => [
    alarm.AlarmName || "",
    alarm.AlarmDescription || "",
    alarm.StateValue || "",
    alarm.MetricName || "",
  ]);

  return createMarkdownTable("CloudWatch Alarms", headers, rows);
}

function formatSecretsManagerSecrets(secrets: any[]): string {
  const headers = ["Name", "Description", "ARN", "Created Date"];
  const rows = secrets.map((secret: any) => [
    secret.Name || "",
    secret.Description || "",
    secret.ARN || "",
    secret.CreatedDate || "",
  ]);

  return createMarkdownTable("Secrets Manager Secrets", headers, rows);
}

function formatECRRepositories(repositories: any[]): string {
  const headers = ["Repository Name", "ARN", "Registry ID", "Created Date"];
  const rows = repositories.map((repo: any) => [
    repo.repositoryName || "",
    repo.repositoryArn || "",
    repo.registryId || "",
    repo.createdAt || "",
  ]);

  return createMarkdownTable("ECR Repositories", headers, rows);
}

function formatInternetGateways(gateways: any[]): string {
  const headers = ["Gateway ID", "VPC ID", "State"];
  const rows = gateways.map((gw: any) => [
    gw.InternetGatewayId || "",
    gw.Attachments?.[0]?.VpcId || "",
    gw.Attachments?.[0]?.State || "",
  ]);

  return createMarkdownTable("Internet Gateways", headers, rows);
}

function formatNatGateways(gateways: any[]): string {
  const headers = ["Gateway ID", "VPC ID", "Subnet ID", "State", "Public IP"];
  const rows = gateways.map((gw: any) => [
    gw.NatGatewayId || "",
    gw.VpcId || "",
    gw.SubnetId || "",
    gw.State || "",
    gw.NatGatewayAddresses?.[0]?.PublicIp || "",
  ]);

  return createMarkdownTable("NAT Gateways", headers, rows);
}

function formatElasticIPs(addresses: any[]): string {
  const headers = ["Allocation ID", "Public IP", "Domain", "Instance ID"];
  const rows = addresses.map((addr: any) => [
    addr.AllocationId || "",
    addr.PublicIp || "",
    addr.Domain || "",
    addr.InstanceId || "",
  ]);

  return createMarkdownTable("Elastic IPs", headers, rows);
}

function formatVpnGateways(gateways: any[]): string {
  const headers = ["Gateway ID", "Type", "State", "VPC ID"];
  const rows = gateways.map((gw: any) => [
    gw.VpnGatewayId || "",
    gw.Type || "",
    gw.State || "",
    gw.VpcAttachments?.[0]?.VpcId || "",
  ]);

  return createMarkdownTable("VPN Gateways", headers, rows);
}

function formatVpnConnections(connections: any[]): string {
  const headers = [
    "Connection ID",
    "State",
    "Customer Gateway ID",
    "VPN Gateway ID",
  ];
  const rows = connections.map((conn: any) => [
    conn.VpnConnectionId || "",
    conn.State || "",
    conn.CustomerGatewayId || "",
    conn.VpnGatewayId || "",
  ]);

  return createMarkdownTable("VPN Connections", headers, rows);
}

function formatTransitGateways(gateways: any[]): string {
  const headers = ["Gateway ID", "Description", "State", "Owner ID"];
  const rows = gateways.map((gw: any) => [
    gw.TransitGatewayId || "",
    gw.Description || "",
    gw.State || "",
    gw.OwnerId || "",
  ]);

  return createMarkdownTable("Transit Gateways", headers, rows);
}

function formatVpcEndpoints(endpoints: any[]): string {
  const headers = ["Endpoint ID", "VPC ID", "Service Name", "Type", "State"];
  const rows = endpoints.map((ep: any) => [
    ep.VpcEndpointId || "",
    ep.VpcId || "",
    ep.ServiceName || "",
    ep.VpcEndpointType || "",
    ep.State || "",
  ]);

  return createMarkdownTable("VPC Endpoints", headers, rows);
}

function formatVpcPeeringConnections(connections: any[]): string {
  const headers = ["Connection ID", "Status", "Requester VPC", "Accepter VPC"];
  const rows = connections.map((conn: any) => [
    conn.VpcPeeringConnectionId || "",
    conn.Status?.Code || "",
    conn.RequesterVpcInfo?.VpcId || "",
    conn.AccepterVpcInfo?.VpcId || "",
  ]);

  return createMarkdownTable("VPC Peering Connections", headers, rows);
}

function formatNetworkAcls(acls: any[]): string {
  const headers = ["ACL ID", "VPC ID", "Is Default"];
  const rows = acls.map((acl: any) => [
    acl.NetworkAclId || "",
    acl.VpcId || "",
    acl.IsDefault?.toString() || "",
  ]);

  return createMarkdownTable("Network ACLs", headers, rows);
}

function formatRouteTables(tables: any[]): string {
  const headers = ["Table ID", "VPC ID", "Main"];
  const rows = tables.map((table: any) => [
    table.RouteTableId || "",
    table.VpcId || "",
    table.Main?.toString() || "",
  ]);

  return createMarkdownTable("Route Tables", headers, rows);
}

function formatNetworkInterfaces(interfaces: any[]): string {
  const headers = [
    "Interface ID",
    "VPC ID",
    "Subnet ID",
    "Private IP",
    "Status",
  ];
  const rows = interfaces.map((ni: any) => [
    ni.NetworkInterfaceId || "",
    ni.VpcId || "",
    ni.SubnetId || "",
    ni.PrivateIpAddress || "",
    ni.Status || "",
  ]);

  return createMarkdownTable("Network Interfaces", headers, rows);
}

function createMarkdownTable(
  title: string,
  headers: string[],
  rows: string[][],
): string {
  const tableRows = rows.map((row) => `| ${row.join(" | ")} |`);
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;

  return `# ${title}\n\n| ${headers.join(" | ")} |\n${separator}\n${tableRows.join("\n")}\n`;
}
