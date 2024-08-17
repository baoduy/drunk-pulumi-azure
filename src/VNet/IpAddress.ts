import * as network from '@pulumi/azure-native/network';
import { Input, Output } from '@pulumi/pulumi';
import { BasicResourceArgs, ResourceInfo } from '../types';
import { isPrd, rsInfo, naming, organization } from '../Common';
import { Locker } from '../Core/Locker';

interface Props extends BasicResourceArgs {
  version?: network.IPVersion;
  publicIPPrefix?: network.PublicIPPrefix;
  enableDdos?: boolean;
  ddosCustomPolicyId?: Input<string>;
  allocationMethod?: network.IPAllocationMethod;
  tier?: network.PublicIPAddressSkuTier | string;
  enableZone?: boolean;
  lock?: boolean;
}

export const create = ({
  name,
  group,
  version = network.IPVersion.IPv4,
  publicIPPrefix,
  enableDdos,
  ddosCustomPolicyId,
  enableZone = isPrd,
  allocationMethod = network.IPAllocationMethod.Static,
  tier = network.PublicIPAddressSkuTier.Regional,
  lock = isPrd,
  dependsOn,
}: Props) => {
  name = naming.getIpAddressName(name);
  const ipAddress = new network.PublicIPAddress(
    name,
    {
      publicIpAddressName: name,
      ...group,
      dnsSettings: { domainNameLabel: `${name}-${organization}` },
      publicIPAddressVersion: version,
      publicIPAllocationMethod: allocationMethod,
      publicIPPrefix: publicIPPrefix ? { id: publicIPPrefix.id } : undefined,
      ddosSettings:
        enableDdos && ddosCustomPolicyId
          ? {
              protectionMode: enableDdos ? 'Enabled' : 'Disabled',
              ddosProtectionPlan: { id: ddosCustomPolicyId },
            }
          : undefined,
      sku: { name: 'Standard', tier },
      zones: enableZone ? ['1', '2', '3'] : undefined,
    },
    { dependsOn: publicIPPrefix ?? dependsOn },
  );

  if (lock) {
    Locker({ name, resource: ipAddress });
  }

  return ipAddress;
};

export const getPublicIPAddress = async (info: ResourceInfo) => {
  const ip = await network.getPublicIPAddress({
    publicIpAddressName: info.name,
    ...info.group,
  });

  return ip.ipAddress!;
};

export const getPublicIPAddressOutput = (info: ResourceInfo) => {
  const ip = network.getPublicIPAddressOutput({
    publicIpAddressName: info.name,
    ...info.group,
  });

  return ip.ipAddress!.apply((i) => i!);
};

export const getIPInfoWithAddress = (
  name: string,
  groupName: string,
): ResourceInfo & { publicIPAddress: Output<string> } => {
  const ipInfo = rsInfo.getIpAddressInfo({ name, groupName });
  const publicIPAddress = getPublicIPAddressOutput(ipInfo);

  return {
    ...ipInfo,
    publicIPAddress,
  };
};
