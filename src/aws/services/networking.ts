import {
  DescribeVpcsCommand,
  DescribeSubnetsCommand,
  DescribeSecurityGroupsCommand,
  DescribeInternetGatewaysCommand,
  DescribeNatGatewaysCommand,
  DescribeAddressesCommand,
  DescribeVpnGatewaysCommand,
  DescribeVpnConnectionsCommand,
  DescribeTransitGatewaysCommand,
  DescribeVpcEndpointsCommand,
  DescribeVpcPeeringConnectionsCommand,
  DescribeNetworkAclsCommand,
  DescribeRouteTablesCommand,
  DescribeNetworkInterfacesCommand,
  type Vpc,
  type Subnet,
  type SecurityGroup,
  type InternetGateway,
  type NatGateway,
  type Address,
  type VpnGateway,
  type VpnConnection,
  type TransitGateway,
  type VpcEndpoint,
  type VpcPeeringConnection,
  type NetworkAcl,
  type RouteTable,
  type NetworkInterface,
} from "@aws-sdk/client-ec2";
import {
  DescribeLoadBalancersCommand,
  DescribeTagsCommand as DescribeELBTagsCommand,
  type LoadBalancer as ELBLoadBalancer,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import type {
  VPC,
  Subnet as SubnetType,
  SecurityGroup as SecurityGroupType,
  LoadBalancer,
  InternetGateway as InternetGatewayType,
  NatGateway as NatGatewayType,
  ElasticIP,
  VpnGateway as VpnGatewayType,
  VpnConnection as VpnConnectionType,
  TransitGateway as TransitGatewayType,
  VpcEndpoint as VpcEndpointType,
  VpcPeeringConnection as VpcPeeringConnectionType,
  NetworkAcl as NetworkAclType,
  RouteTable as RouteTableType,
  NetworkInterface as NetworkInterfaceType,
} from "../aws-cli.types";
import { getLog } from "./utils";
import { getEC2Client, getELBv2Client } from "../sdk-clients";
import { executeWithRetry } from "../sdk-error-handler";

/**
 * Retrieves all Virtual Private Clouds (VPCs) in the specified region.
 * Includes VPC ID, name from tags, state, CIDR block, and all tags.
 *
 * @param region - AWS region to query for VPCs
 * @returns Promise resolving to array of VPC configurations
 *
 * @example
 * ```typescript
 * const vpcs = await describeVPCs('us-east-1');
 * console.log(vpcs);
 * // Output: [
 * //   {
 * //     id: 'vpc-123abc',
 * //     name: 'production-vpc',
 * //     state: 'available',
 * //     cidr: '10.0.0.0/16',
 * //     tags: { Name: 'production-vpc', Environment: 'prod' }
 * //   }
 * // ]
 * ```
 */
export async function describeVPCs(region: string): Promise<VPC[]> {
  const { log, verbose } = getLog();
  const client = getEC2Client(region);

  const vpcs: VPC[] = [];

  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeVpcsCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "VPC",
      3,
      1000,
    );

    for (const vpc of data.Vpcs || []) {
      const name = vpc.Tags?.find((tag) => tag.Key === "Name")?.Value || "N/A";

      const tags: Record<string, string> = {};
      if (vpc.Tags) {
        for (const tag of vpc.Tags) {
          if (tag.Key && tag.Value) {
            tags[tag.Key] = tag.Value;
          }
        }
      }

      vpcs.push({
        id: vpc.VpcId || "unknown",
        name,
        state: vpc.State || "unknown",
        cidr: vpc.CidrBlock || "N/A",
        tags,
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return vpcs;
}

/**
 * Retrieves all subnets in the specified region.
 * Includes subnet ID, name, VPC ID, CIDR block, availability zone, state, available IP count, and public IP mapping settings.
 *
 * @param region - AWS region to query for subnets
 * @returns Promise resolving to array of subnet configurations
 *
 * @example
 * ```typescript
 * const subnets = await describeSubnets('us-west-2');
 * console.log(subnets);
 * // Output: [
 * //   {
 * //     id: 'subnet-abc123',
 * //     name: 'public-subnet-1a',
 * //     vpcId: 'vpc-123abc',
 * //     cidr: '10.0.1.0/24',
 * //     availabilityZone: 'us-west-2a',
 * //     state: 'available',
 * //     availableIpAddressCount: 251,
 * //     mapPublicIpOnLaunch: true,
 * //     tags: { Name: 'public-subnet-1a', Type: 'public' }
 * //   }
 * // ]
 * ```
 */
export async function describeSubnets(region: string): Promise<SubnetType[]> {
  const { log, verbose } = getLog();
  const client = getEC2Client(region);

  const subnets: SubnetType[] = [];

  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeSubnetsCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "Subnet",
      3,
      1000,
    );

    for (const subnet of data.Subnets || []) {
      const name =
        subnet.Tags?.find((tag) => tag.Key === "Name")?.Value || "N/A";

      const tags: Record<string, string> = {};
      if (subnet.Tags) {
        for (const tag of subnet.Tags) {
          if (tag.Key && tag.Value) {
            tags[tag.Key] = tag.Value;
          }
        }
      }

      subnets.push({
        id: subnet.SubnetId || "unknown",
        name,
        vpcId: subnet.VpcId || "N/A",
        cidr: subnet.CidrBlock || "N/A",
        availabilityZone: subnet.AvailabilityZone || "N/A",
        state: subnet.State || "unknown",
        availableIpAddressCount: subnet.AvailableIpAddressCount || 0,
        mapPublicIpOnLaunch: subnet.MapPublicIpOnLaunch || false,
        tags,
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return subnets;
}

/**
 * Retrieves all security groups in the specified region.
 * Includes group ID, name, description, VPC ID, and count of ingress/egress rules.
 *
 * @param region - AWS region to query for security groups
 * @returns Promise resolving to array of security group configurations
 *
 * @example
 * ```typescript
 * const sgs = await describeSecurityGroups('eu-west-1');
 * console.log(sgs);
 * // Output: [
 * //   {
 * //     id: 'sg-0123456789abcdef',
 * //     name: 'web-server-sg',
 * //     description: 'Security group for web servers',
 * //     vpcId: 'vpc-123abc',
 * //     ingressRulesCount: 2,
 * //     egressRulesCount: 1,
 * //     tags: { Name: 'web-server-sg' }
 * //   }
 * // ]
 * ```
 */
export async function describeSecurityGroups(
  region: string,
): Promise<SecurityGroupType[]> {
  const { log, verbose } = getLog();
  const client = getEC2Client(region);

  const sgs: SecurityGroupType[] = [];

  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeSecurityGroupsCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "Security Group",
      3,
      1000,
    );

    for (const sg of data.SecurityGroups || []) {
      const tags: Record<string, string> = {};
      if (sg.Tags) {
        for (const tag of sg.Tags) {
          if (tag.Key && tag.Value) {
            tags[tag.Key] = tag.Value;
          }
        }
      }

      sgs.push({
        id: sg.GroupId || "unknown",
        name: sg.GroupName || "unknown",
        description: sg.Description || "N/A",
        vpcId: sg.VpcId || "N/A",
        ingressRulesCount: sg.IpPermissions?.length || 0,
        egressRulesCount: sg.IpPermissionsEgress?.length || 0,
        tags,
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return sgs;
}

/**
 * Retrieves all Elastic Load Balancers (Application, Network, Gateway) in the specified region.
 * Includes load balancer name, type, state, DNS name, ARN, scheme, availability zones, VPC ID, creation time, and tags.
 * Makes additional API calls to fetch tags for each load balancer.
 *
 * @param region - AWS region to query for load balancers
 * @returns Promise resolving to array of load balancer configurations
 *
 * @example
 * ```typescript
 * const lbs = await describeLoadBalancers('us-east-1');
 * console.log(lbs);
 * // Output: [
 * //   {
 * //     name: 'my-app-lb',
 * //     type: 'application',
 * //     state: 'active',
 * //     dnsName: 'my-app-lb-123456789.us-east-1.elb.amazonaws.com',
 * //     arn: 'arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-app-lb/abc123',
 * //     scheme: 'internet-facing',
 * //     availabilityZones: ['us-east-1a', 'us-east-1b'],
 * //     vpcId: 'vpc-123abc',
 * //     createdTime: '2024-01-15T10:30:00.000Z',
 * //     tags: { Name: 'my-app-lb', Environment: 'production' }
 * //   }
 * // ]
 * ```
 */
export async function describeLoadBalancers(
  region: string,
): Promise<LoadBalancer[]> {
  const { log, verbose } = getLog();
  const client = getELBv2Client(region);

  const lbs: LoadBalancer[] = [];

  let marker: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeLoadBalancersCommand({
          Marker: marker,
        });
        return await client.send(command);
      },
      "Load Balancer",
      3,
      1000,
    );

    for (const lb of data.LoadBalancers || []) {
      const azs = lb.AvailabilityZones?.map((az) => az.ZoneName || "") || [];

      let tags: Record<string, string> = {};
      if (lb.LoadBalancerArn) {
        try {
          const tagsData = await executeWithRetry(
            async () => {
              const command = new DescribeELBTagsCommand({
                ResourceArns: [lb.LoadBalancerArn!],
              });
              return await client.send(command);
            },
            "Load Balancer Tags",
            3,
            1000,
          );

          if (tagsData.TagDescriptions?.[0]?.Tags) {
            for (const tag of tagsData.TagDescriptions[0].Tags) {
              if (tag.Key && tag.Value) {
                tags[tag.Key] = tag.Value;
              }
            }
          }
        } catch {}
      }

      lbs.push({
        name: lb.LoadBalancerName || "unknown",
        type: lb.Type || "unknown",
        state: lb.State?.Code || "unknown",
        dnsName: lb.DNSName || "N/A",
        arn: lb.LoadBalancerArn || "unknown",
        scheme: lb.Scheme || "unknown",
        availabilityZones: azs,
        vpcId: lb.VpcId || "N/A",
        createdTime: lb.CreatedTime?.toISOString() || "N/A",
        tags,
      });
    }

    marker = data.NextMarker;
  } while (marker);

  return lbs;
}

/**
 * Retrieves all Internet Gateways in the specified region.
 * Includes gateway ID, name from tags, attached VPC ID, and attachment state.
 *
 * @param region - AWS region to query for Internet Gateways
 * @returns Promise resolving to array of Internet Gateway configurations
 *
 * @example
 * ```typescript
 * const igws = await describeInternetGateways('ap-southeast-1');
 * console.log(igws);
 * // Output: [
 * //   {
 * //     id: 'igw-abc123',
 * //     name: 'main-igw',
 * //     vpcId: 'vpc-123abc',
 * //     state: 'attached',
 * //     tags: { Name: 'main-igw' }
 * //   }
 * // ]
 * ```
 */
export async function describeInternetGateways(
  region: string,
): Promise<InternetGatewayType[]> {
  const { log, verbose } = getLog();
  const client = getEC2Client(region);

  const igws: InternetGatewayType[] = [];

  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeInternetGatewaysCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "Internet Gateway",
      3,
      1000,
    );

    for (const igw of data.InternetGateways || []) {
      const name = igw.Tags?.find((tag) => tag.Key === "Name")?.Value || "N/A";
      const vpcId = igw.Attachments?.[0]?.VpcId || "N/A";

      const tags: Record<string, string> = {};
      if (igw.Tags) {
        for (const tag of igw.Tags) {
          if (tag.Key && tag.Value) {
            tags[tag.Key] = tag.Value;
          }
        }
      }

      igws.push({
        id: igw.InternetGatewayId || "unknown",
        name,
        vpcId,
        state: igw.Attachments?.[0]?.State || "detached",
        tags,
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return igws;
}

/**
 * Retrieves all NAT Gateways in the specified region.
 * Includes NAT gateway ID, name from tags, VPC ID, subnet ID, state, public IP address, and tags.
 *
 * @param region - AWS region to query for NAT Gateways
 * @returns Promise resolving to array of NAT Gateway configurations
 *
 * @example
 * ```typescript
 * const natgws = await describeNatGateways('us-west-2');
 * console.log(natgws);
 * // Output: [
 * //   {
 * //     id: 'nat-0123456789abcdef',
 * //     name: 'public-nat-1a',
 * //     vpcId: 'vpc-123abc',
 * //     subnetId: 'subnet-abc123',
 * //     state: 'available',
 * //     publicIp: '203.0.113.42',
 * //     tags: { Name: 'public-nat-1a' }
 * //   }
 * // ]
 * ```
 */
export async function describeNatGateways(
  region: string,
): Promise<NatGatewayType[]> {
  const { log, verbose } = getLog();
  const client = getEC2Client(region);

  const natgws: NatGatewayType[] = [];

  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeNatGatewaysCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "NAT Gateway",
      3,
      1000,
    );

    for (const natgw of data.NatGateways || []) {
      const name =
        natgw.Tags?.find((tag) => tag.Key === "Name")?.Value || "N/A";
      const publicIp = natgw.NatGatewayAddresses?.[0]?.PublicIp || "N/A";

      const tags: Record<string, string> = {};
      if (natgw.Tags) {
        for (const tag of natgw.Tags) {
          if (tag.Key && tag.Value) {
            tags[tag.Key] = tag.Value;
          }
        }
      }

      natgws.push({
        id: natgw.NatGatewayId || "unknown",
        name,
        vpcId: natgw.VpcId || "N/A",
        subnetId: natgw.SubnetId || "N/A",
        state: natgw.State || "unknown",
        publicIp,
        tags,
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return natgws;
}

/**
 * Retrieves all Elastic IP addresses in the specified region.
 * Includes allocation ID, public IP, domain (vpc or standard), associated instance ID, network interface ID, association ID, and tags.
 *
 * @param region - AWS region to query for Elastic IPs
 * @returns Promise resolving to array of Elastic IP configurations
 *
 * @example
 * ```typescript
 * const eips = await describeElasticIPs('eu-central-1');
 * console.log(eips);
 * // Output: [
 * //   {
 * //     allocationId: 'eipalloc-abc123',
 * //     publicIp: '203.0.113.10',
 * //     domain: 'vpc',
 * //     instanceId: 'i-0123456789abcdef',
 * //     networkInterfaceId: 'eni-abc123',
 * //     associationId: 'eipassoc-xyz789',
 * //     tags: { Name: 'web-server-eip' }
 * //   }
 * // ]
 * ```
 */
export async function describeElasticIPs(region: string): Promise<ElasticIP[]> {
  const { log, verbose } = getLog();
  const client = getEC2Client(region);

  const eips: ElasticIP[] = [];

  const data = await executeWithRetry(
    async () => {
      const command = new DescribeAddressesCommand({});
      return await client.send(command);
    },
    "Elastic IP",
    3,
    1000,
  );

  for (const address of data.Addresses || []) {
    const tags: Record<string, string> = {};
    if (address.Tags) {
      for (const tag of address.Tags) {
        if (tag.Key && tag.Value) {
          tags[tag.Key] = tag.Value;
        }
      }
    }

    eips.push({
      allocationId: address.AllocationId || "N/A",
      publicIp: address.PublicIp || "N/A",
      domain: address.Domain || "N/A",
      instanceId: address.InstanceId || "N/A",
      networkInterfaceId: address.NetworkInterfaceId || "N/A",
      associationId: address.AssociationId || "N/A",
      tags,
    });
  }

  return eips;
}

/**
 * Retrieves all VPN Gateways (Virtual Private Gateways) in the specified region.
 * Includes gateway ID, name from tags, type, state, and attached VPC ID.
 *
 * @param region - AWS region to query for VPN Gateways
 * @returns Promise resolving to array of VPN Gateway configurations
 *
 * @example
 * ```typescript
 * const vpngws = await describeVpnGateways('us-east-1');
 * console.log(vpngws);
 * // Output: [
 * //   {
 * //     id: 'vgw-abc123',
 * //     name: 'corporate-vpn',
 * //     type: 'ipsec.1',
 * //     state: 'available',
 * //     vpcId: 'vpc-123abc'
 * //   }
 * // ]
 * ```
 */
export async function describeVpnGateways(
  region: string,
): Promise<VpnGatewayType[]> {
  const { log, verbose } = getLog();
  const client = getEC2Client(region);

  const vpngws: VpnGatewayType[] = [];

  const data = await executeWithRetry(
    async () => {
      const command = new DescribeVpnGatewaysCommand({});
      return await client.send(command);
    },
    "VPN Gateway",
    3,
    1000,
  );

  for (const vpngw of data.VpnGateways || []) {
    const name = vpngw.Tags?.find((tag) => tag.Key === "Name")?.Value || "N/A";
    const vpcId = vpngw.VpcAttachments?.[0]?.VpcId || "N/A";

    vpngws.push({
      id: vpngw.VpnGatewayId || "unknown",
      name,
      type: vpngw.Type || "unknown",
      state: vpngw.State || "unknown",
      vpcId,
    });
  }

  return vpngws;
}

/**
 * Retrieves all VPN Connections in the specified region.
 * Includes connection ID, name from tags, state, VPN gateway ID, customer gateway ID, type, and category.
 *
 * @param region - AWS region to query for VPN Connections
 * @returns Promise resolving to array of VPN Connection configurations
 *
 * @example
 * ```typescript
 * const vpnconns = await describeVpnConnections('ap-northeast-1');
 * console.log(vpnconns);
 * // Output: [
 * //   {
 * //     id: 'vpn-abc123',
 * //     name: 'office-to-aws',
 * //     state: 'available',
 * //     vpnGatewayId: 'vgw-xyz789',
 * //     customerGatewayId: 'cgw-123abc',
 * //     type: 'ipsec.1',
 * //     category: 'VPN'
 * //   }
 * // ]
 * ```
 */
export async function describeVpnConnections(
  region: string,
): Promise<VpnConnectionType[]> {
  const { log, verbose } = getLog();
  const client = getEC2Client(region);

  const vpnconns: VpnConnectionType[] = [];

  const data = await executeWithRetry(
    async () => {
      const command = new DescribeVpnConnectionsCommand({});
      return await client.send(command);
    },
    "VPN Connection",
    3,
    1000,
  );

  for (const vpnconn of data.VpnConnections || []) {
    const name =
      vpnconn.Tags?.find((tag) => tag.Key === "Name")?.Value || "N/A";

    vpnconns.push({
      id: vpnconn.VpnConnectionId || "unknown",
      name,
      state: vpnconn.State || "unknown",
      vpnGatewayId: vpnconn.VpnGatewayId || "N/A",
      customerGatewayId: vpnconn.CustomerGatewayId || "N/A",
      type: vpnconn.Type || "unknown",
      category: vpnconn.Category || "N/A",
    });
  }

  return vpnconns;
}

/**
 * Retrieves all Transit Gateways in the specified region.
 * Includes gateway ID, name from tags, state, owner ID, and description.
 *
 * @param region - AWS region to query for Transit Gateways
 * @returns Promise resolving to array of Transit Gateway configurations
 *
 * @example
 * ```typescript
 * const tgws = await describeTransitGateways('us-west-2');
 * console.log(tgws);
 * // Output: [
 * //   {
 * //     id: 'tgw-abc123',
 * //     name: 'central-tgw',
 * //     state: 'available',
 * //     ownerId: '123456789012',
 * //     description: 'Central transit gateway for multi-VPC connectivity'
 * //   }
 * // ]
 * ```
 */
export async function describeTransitGateways(
  region: string,
): Promise<TransitGatewayType[]> {
  const { log, verbose } = getLog();
  const client = getEC2Client(region);

  const tgws: TransitGatewayType[] = [];

  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeTransitGatewaysCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "Transit Gateway",
      3,
      1000,
    );

    for (const tgw of data.TransitGateways || []) {
      tgws.push({
        id: tgw.TransitGatewayId || "unknown",
        name: tgw.Tags?.find((tag) => tag.Key === "Name")?.Value || "N/A",
        state: tgw.State || "unknown",
        ownerId: tgw.OwnerId || "N/A",
        description: tgw.Description || "N/A",
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return tgws;
}

/**
 * Retrieves all VPC Endpoints in the specified region.
 * Includes endpoint ID, name from tags, VPC ID, service name, endpoint type (Interface or Gateway), and state.
 *
 * @param region - AWS region to query for VPC Endpoints
 * @returns Promise resolving to array of VPC Endpoint configurations
 *
 * @example
 * ```typescript
 * const endpoints = await describeVpcEndpoints('eu-west-1');
 * console.log(endpoints);
 * // Output: [
 * //   {
 * //     id: 'vpce-abc123',
 * //     name: 's3-gateway-endpoint',
 * //     vpcId: 'vpc-123abc',
 * //     serviceName: 'com.amazonaws.eu-west-1.s3',
 * //     type: 'Gateway',
 * //     state: 'available'
 * //   }
 * // ]
 * ```
 */
export async function describeVpcEndpoints(
  region: string,
): Promise<VpcEndpointType[]> {
  const { log, verbose } = getLog();
  const client = getEC2Client(region);

  const endpoints: VpcEndpointType[] = [];

  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeVpcEndpointsCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "VPC Endpoint",
      3,
      1000,
    );

    for (const endpoint of data.VpcEndpoints || []) {
      const name =
        endpoint.Tags?.find((tag) => tag.Key === "Name")?.Value || "N/A";

      endpoints.push({
        id: endpoint.VpcEndpointId || "unknown",
        name,
        vpcId: endpoint.VpcId || "N/A",
        serviceName: endpoint.ServiceName || "N/A",
        type: endpoint.VpcEndpointType || "unknown",
        state: endpoint.State || "unknown",
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return endpoints;
}

/**
 * Retrieves all VPC Peering Connections in the specified region.
 * Includes peering connection ID, name from tags, status code, requester VPC ID, and accepter VPC ID.
 *
 * @param region - AWS region to query for VPC Peering Connections
 * @returns Promise resolving to array of VPC Peering Connection configurations
 *
 * @example
 * ```typescript
 * const peerings = await describeVpcPeeringConnections('us-east-1');
 * console.log(peerings);
 * // Output: [
 * //   {
 * //     id: 'pcx-abc123',
 * //     name: 'prod-to-dev-peering',
 * //     status: 'active',
 * //     requesterVpcId: 'vpc-prod123',
 * //     accepterVpcId: 'vpc-dev456'
 * //   }
 * // ]
 * ```
 */
export async function describeVpcPeeringConnections(
  region: string,
): Promise<VpcPeeringConnectionType[]> {
  const { log, verbose } = getLog();
  const client = getEC2Client(region);

  const peerings: VpcPeeringConnectionType[] = [];

  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeVpcPeeringConnectionsCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "VPC Peering",
      3,
      1000,
    );

    for (const peering of data.VpcPeeringConnections || []) {
      const name =
        peering.Tags?.find((tag) => tag.Key === "Name")?.Value || "N/A";

      peerings.push({
        id: peering.VpcPeeringConnectionId || "unknown",
        name,
        status: peering.Status?.Code || "N/A",
        requesterVpcId: peering.RequesterVpcInfo?.VpcId || "N/A",
        accepterVpcId: peering.AccepterVpcInfo?.VpcId || "N/A",
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return peerings;
}

/**
 * Retrieves all Network Access Control Lists (NACLs) in the specified region.
 * Includes NACL ID, name from tags, VPC ID, and whether it's the default NACL for the VPC.
 *
 * @param region - AWS region to query for Network ACLs
 * @returns Promise resolving to array of Network ACL configurations
 *
 * @example
 * ```typescript
 * const nacls = await describeNetworkAcls('ap-southeast-2');
 * console.log(nacls);
 * // Output: [
 * //   {
 * //     id: 'acl-abc123',
 * //     name: 'public-nacl',
 * //     vpcId: 'vpc-123abc',
 * //     isDefault: false
 * //   }
 * // ]
 * ```
 */
export async function describeNetworkAcls(
  region: string,
): Promise<NetworkAclType[]> {
  const { log, verbose } = getLog();
  const client = getEC2Client(region);

  const nacls: NetworkAclType[] = [];

  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeNetworkAclsCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "Network ACL",
      3,
      1000,
    );

    for (const nacl of data.NetworkAcls || []) {
      const name = nacl.Tags?.find((tag) => tag.Key === "Name")?.Value || "N/A";

      nacls.push({
        id: nacl.NetworkAclId || "unknown",
        name,
        vpcId: nacl.VpcId || "N/A",
        isDefault: nacl.IsDefault || false,
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return nacls;
}

/**
 * Retrieves all Route Tables in the specified region.
 * Includes route table ID, name from tags, VPC ID, and whether it's the main route table for the VPC.
 *
 * @param region - AWS region to query for Route Tables
 * @returns Promise resolving to array of Route Table configurations
 *
 * @example
 * ```typescript
 * const rtbs = await describeRouteTables('us-west-1');
 * console.log(rtbs);
 * // Output: [
 * //   {
 * //     id: 'rtb-abc123',
 * //     name: 'private-route-table',
 * //     vpcId: 'vpc-123abc',
 * //     main: false
 * //   }
 * // ]
 * ```
 */
export async function describeRouteTables(
  region: string,
): Promise<RouteTableType[]> {
  const { log, verbose } = getLog();
  const client = getEC2Client(region);

  const rtbs: RouteTableType[] = [];

  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeRouteTablesCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "Route Table",
      3,
      1000,
    );

    for (const rtb of data.RouteTables || []) {
      const name = rtb.Tags?.find((tag) => tag.Key === "Name")?.Value || "N/A";

      rtbs.push({
        id: rtb.RouteTableId || "unknown",
        name,
        vpcId: rtb.VpcId || "N/A",
        main: rtb.Associations?.some((assoc) => assoc.Main) || false,
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return rtbs;
}

/**
 * Retrieves all Elastic Network Interfaces (ENIs) in the specified region.
 * Includes interface ID, name from tags, VPC ID, subnet ID, private IP address, public IP address (if associated), and status.
 *
 * @param region - AWS region to query for Network Interfaces
 * @returns Promise resolving to array of Network Interface configurations
 *
 * @example
 * ```typescript
 * const enis = await describeNetworkInterfaces('ca-central-1');
 * console.log(enis);
 * // Output: [
 * //   {
 * //     id: 'eni-abc123',
 * //     name: 'web-server-eni',
 * //     vpcId: 'vpc-123abc',
 * //     subnetId: 'subnet-xyz789',
 * //     privateIp: '10.0.1.50',
 * //     publicIp: '203.0.113.25',
 * //     status: 'in-use'
 * //   }
 * // ]
 * ```
 */
export async function describeNetworkInterfaces(
  region: string,
): Promise<NetworkInterfaceType[]> {
  const { log, verbose } = getLog();
  const client = getEC2Client(region);

  const enis: NetworkInterfaceType[] = [];

  let nextToken: string | undefined = undefined;

  do {
    const data = await executeWithRetry(
      async () => {
        const command = new DescribeNetworkInterfacesCommand({
          NextToken: nextToken,
        });
        return await client.send(command);
      },
      "Network Interface",
      3,
      1000,
    );

    for (const eni of data.NetworkInterfaces || []) {
      const name =
        eni.TagSet?.find((tag) => tag.Key === "Name")?.Value || "N/A";

      enis.push({
        id: eni.NetworkInterfaceId || "unknown",
        name,
        vpcId: eni.VpcId || "N/A",
        subnetId: eni.SubnetId || "N/A",
        privateIp: eni.PrivateIpAddress || "N/A",
        publicIp: eni.Association?.PublicIp || "N/A",
        status: eni.Status || "unknown",
      });
    }

    nextToken = data.NextToken;
  } while (nextToken);

  return enis;
}
