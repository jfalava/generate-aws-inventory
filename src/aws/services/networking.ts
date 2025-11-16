import { $ } from "bun";
import type {
  VPC,
  Subnet,
  SecurityGroup,
  LoadBalancer,
  InternetGateway,
  NatGateway,
  ElasticIP,
  VpnGateway,
  VpnConnection,
  TransitGateway,
  VpcEndpoint,
  VpcPeeringConnection,
  NetworkAcl,
  RouteTable,
  NetworkInterface,
} from "../aws-cli.types";

export async function describeVPCs(region: string): Promise<VPC[]> {
  const result =
    await $`aws ec2 describe-vpcs --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const vpcs: VPC[] = [];

  for (const vpc of data.Vpcs || []) {
    const name =
      vpc.Tags?.find((tag: any) => tag.Key === "Name")?.Value || "N/A";

    const tags: Record<string, string> = {};
    if (vpc.Tags) {
      for (const tag of vpc.Tags) {
        tags[tag.Key] = tag.Value;
      }
    }

    vpcs.push({
      id: vpc.VpcId,
      name,
      state: vpc.State,
      cidr: vpc.CidrBlock,
      tags,
    });
  }

  return vpcs;
}

export async function describeSubnets(region: string): Promise<Subnet[]> {
  const result =
    await $`aws ec2 describe-subnets --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const subnets: Subnet[] = [];

  for (const subnet of data.Subnets || []) {
    const name =
      subnet.Tags?.find((tag: any) => tag.Key === "Name")?.Value || "N/A";

    const tags: Record<string, string> = {};
    if (subnet.Tags) {
      for (const tag of subnet.Tags) {
        tags[tag.Key] = tag.Value;
      }
    }

    subnets.push({
      id: subnet.SubnetId,
      name,
      vpcId: subnet.VpcId,
      cidr: subnet.CidrBlock,
      availabilityZone: subnet.AvailabilityZone,
      state: subnet.State,
      availableIpAddressCount: subnet.AvailableIpAddressCount,
      mapPublicIpOnLaunch: subnet.MapPublicIpOnLaunch,
      tags,
    });
  }

  return subnets;
}

export async function describeSecurityGroups(
  region: string,
): Promise<SecurityGroup[]> {
  const result =
    await $`aws ec2 describe-security-groups --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const sgs: SecurityGroup[] = [];

  for (const sg of data.SecurityGroups || []) {
    const tags: Record<string, string> = {};
    if (sg.Tags) {
      for (const tag of sg.Tags) {
        tags[tag.Key] = tag.Value;
      }
    }

    sgs.push({
      id: sg.GroupId,
      name: sg.GroupName,
      description: sg.GroupDescription,
      vpcId: sg.VpcId || "N/A",
      ingressRulesCount: sg.IpPermissions?.length || 0,
      egressRulesCount: sg.IpPermissionsEgress?.length || 0,
      tags,
    });
  }

  return sgs;
}

export async function describeLoadBalancers(
  region: string,
): Promise<LoadBalancer[]> {
  const result =
    await $`aws elbv2 describe-load-balancers --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const lbs: LoadBalancer[] = [];

  for (const lb of data.LoadBalancers || []) {
    const azs = lb.AvailabilityZones?.map((az: any) => az.ZoneName) || [];

    let tags: Record<string, string> = {};
    try {
      const tagsResult =
        await $`aws elbv2 describe-tags --resource-arns ${lb.LoadBalancerArn} --region ${region} --output json`.text();
      const tagsData = JSON.parse(tagsResult);
      if (tagsData.TagDescriptions?.[0]?.Tags) {
        for (const tag of tagsData.TagDescriptions[0].Tags) {
          tags[tag.Key] = tag.Value;
        }
      }
    } catch {}

    lbs.push({
      name: lb.LoadBalancerName,
      type: lb.Type,
      state: lb.State.Code,
      dnsName: lb.DNSName,
      arn: lb.LoadBalancerArn,
      scheme: lb.Scheme,
      availabilityZones: azs,
      vpcId: lb.VpcId,
      createdTime: lb.CreatedTime,
      tags,
    });
  }

  return lbs;
}

export async function describeInternetGateways(
  region: string,
): Promise<InternetGateway[]> {
  const result =
    await $`aws ec2 describe-internet-gateways --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const igws: InternetGateway[] = [];

  for (const igw of data.InternetGateways || []) {
    const name =
      igw.Tags?.find((tag: any) => tag.Key === "Name")?.Value || "N/A";
    const vpcId = igw.Attachments?.[0]?.VpcId || "N/A";

    const tags: Record<string, string> = {};
    if (igw.Tags) {
      for (const tag of igw.Tags) {
        tags[tag.Key] = tag.Value;
      }
    }

    igws.push({
      id: igw.InternetGatewayId,
      name,
      vpcId,
      state: igw.Attachments?.[0]?.State || "detached",
      tags,
    });
  }

  return igws;
}

export async function describeNatGateways(
  region: string,
): Promise<NatGateway[]> {
  const result =
    await $`aws ec2 describe-nat-gateways --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const natgws: NatGateway[] = [];

  for (const natgw of data.NatGateways || []) {
    const name =
      natgw.Tags?.find((tag: any) => tag.Key === "Name")?.Value || "N/A";
    const publicIp = natgw.NatGatewayAddresses?.[0]?.PublicIp || "N/A";

    const tags: Record<string, string> = {};
    if (natgw.Tags) {
      for (const tag of natgw.Tags) {
        tags[tag.Key] = tag.Value;
      }
    }

    natgws.push({
      id: natgw.NatGatewayId,
      name,
      vpcId: natgw.VpcId,
      subnetId: natgw.SubnetId,
      state: natgw.State,
      publicIp,
      tags,
    });
  }

  return natgws;
}

export async function describeElasticIPs(region: string): Promise<ElasticIP[]> {
  const result =
    await $`aws ec2 describe-addresses --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const eips: ElasticIP[] = [];

  for (const address of data.Addresses || []) {
    const tags: Record<string, string> = {};
    if (address.Tags) {
      for (const tag of address.Tags) {
        tags[tag.Key] = tag.Value;
      }
    }

    eips.push({
      allocationId: address.AllocationId,
      publicIp: address.PublicIp,
      domain: address.Domain,
      instanceId: address.InstanceId || "N/A",
      networkInterfaceId: address.NetworkInterfaceId || "N/A",
      associationId: address.AssociationId || "N/A",
      tags,
    });
  }

  return eips;
}

export async function describeVpnGateways(
  region: string,
): Promise<VpnGateway[]> {
  const result =
    await $`aws ec2 describe-vpn-gateways --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const vpngws: VpnGateway[] = [];

  for (const vpngw of data.VpnGateways || []) {
    const name =
      vpngw.Tags?.find((tag: any) => tag.Key === "Name")?.Value || "N/A";
    const vpcId = vpngw.VpcAttachments?.[0]?.VpcId || "N/A";
    vpngws.push({
      id: vpngw.VpnGatewayId,
      name,
      type: vpngw.Type,
      state: vpngw.State,
      vpcId,
    });
  }

  return vpngws;
}

export async function describeVpnConnections(
  region: string,
): Promise<VpnConnection[]> {
  const result =
    await $`aws ec2 describe-vpn-connections --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const vpnconns: VpnConnection[] = [];

  for (const vpnconn of data.VpnConnections || []) {
    const name =
      vpnconn.Tags?.find((tag: any) => tag.Key === "Name")?.Value || "N/A";
    vpnconns.push({
      id: vpnconn.VpnConnectionId,
      name,
      state: vpnconn.State,
      vpnGatewayId: vpnconn.VpnGatewayId || "N/A",
      customerGatewayId: vpnconn.CustomerGatewayId,
      type: vpnconn.Type,
      category: vpnconn.Category,
    });
  }

  return vpnconns;
}

export async function describeTransitGateways(
  region: string,
): Promise<TransitGateway[]> {
  const result =
    await $`aws ec2 describe-transit-gateways --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const tgws: TransitGateway[] = [];

  for (const tgw of data.TransitGateways || []) {
    tgws.push({
      id: tgw.TransitGatewayId,
      name: tgw.Tags?.find((tag: any) => tag.Key === "Name")?.Value || "N/A",
      state: tgw.State,
      ownerId: tgw.OwnerId,
      description: tgw.Description || "N/A",
    });
  }

  return tgws;
}

export async function describeVpcEndpoints(
  region: string,
): Promise<VpcEndpoint[]> {
  const result =
    await $`aws ec2 describe-vpc-endpoints --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const endpoints: VpcEndpoint[] = [];

  for (const endpoint of data.VpcEndpoints || []) {
    const name =
      endpoint.Tags?.find((tag: any) => tag.Key === "Name")?.Value || "N/A";
    endpoints.push({
      id: endpoint.VpcEndpointId,
      name,
      vpcId: endpoint.VpcId,
      serviceName: endpoint.ServiceName,
      type: endpoint.VpcEndpointType,
      state: endpoint.State,
    });
  }

  return endpoints;
}

export async function describeVpcPeeringConnections(
  region: string,
): Promise<VpcPeeringConnection[]> {
  const result =
    await $`aws ec2 describe-vpc-peering-connections --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const peerings: VpcPeeringConnection[] = [];

  for (const peering of data.VpcPeeringConnections || []) {
    const name =
      peering.Tags?.find((tag: any) => tag.Key === "Name")?.Value || "N/A";
    peerings.push({
      id: peering.VpcPeeringConnectionId,
      name,
      status: peering.Status?.Code || "N/A",
      requesterVpcId: peering.RequesterVpcInfo?.VpcId || "N/A",
      accepterVpcId: peering.AccepterVpcInfo?.VpcId || "N/A",
    });
  }

  return peerings;
}

export async function describeNetworkAcls(
  region: string,
): Promise<NetworkAcl[]> {
  const result =
    await $`aws ec2 describe-network-acls --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const nacls: NetworkAcl[] = [];

  for (const nacl of data.NetworkAcls || []) {
    const name =
      nacl.Tags?.find((tag: any) => tag.Key === "Name")?.Value || "N/A";
    nacls.push({
      id: nacl.NetworkAclId,
      name,
      vpcId: nacl.VpcId,
      isDefault: nacl.IsDefault,
    });
  }

  return nacls;
}

export async function describeRouteTables(
  region: string,
): Promise<RouteTable[]> {
  const result =
    await $`aws ec2 describe-route-tables --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const rtbs: RouteTable[] = [];

  for (const rtb of data.RouteTables || []) {
    const name =
      rtb.Tags?.find((tag: any) => tag.Key === "Name")?.Value || "N/A";
    rtbs.push({
      id: rtb.RouteTableId,
      name,
      vpcId: rtb.VpcId,
      main: rtb.Associations?.some((assoc: any) => assoc.Main) || false,
    });
  }

  return rtbs;
}

export async function describeNetworkInterfaces(
  region: string,
): Promise<NetworkInterface[]> {
  const result =
    await $`aws ec2 describe-network-interfaces --region ${region} --output json`.text();
  const data = JSON.parse(result);

  const enis: NetworkInterface[] = [];

  for (const eni of data.NetworkInterfaces || []) {
    const name =
      eni.TagSet?.find((tag: any) => tag.Key === "Name")?.Value || "N/A";
    enis.push({
      id: eni.NetworkInterfaceId,
      name,
      vpcId: eni.VpcId,
      subnetId: eni.SubnetId,
      privateIp: eni.PrivateIpAddress || "N/A",
      publicIp: eni.Association?.PublicIp || "N/A",
      status: eni.Status,
    });
  }

  return enis;
}
