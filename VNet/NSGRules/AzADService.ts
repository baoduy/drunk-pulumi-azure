import { Input, Output, Resource } from '@pulumi/pulumi';
import * as network from '@pulumi/azure-native/network';
import { ResourceGroupInfo } from '../../types';

interface Props {
  startPriority?: number;
  securityGroupName: Output<string>;
  group: ResourceGroupInfo;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export default ({
  group,
  securityGroupName,
  startPriority = 300,
  dependsOn,
}: Props) => {
  const rs = new Array<network.SecurityRule>();
  //Allows RD
  rs.push(
    new network.SecurityRule(
      'AllowRD',
      {
        name: 'AllowRD',
        networkSecurityGroupName: securityGroupName,
        ...group,
        sourceAddressPrefix: 'CorpNetSaw',
        sourcePortRange: '*',
        destinationAddressPrefix: '*',
        destinationPortRange: '3389',
        protocol: 'Tcp',
        access: 'Allow',
        direction: 'Inbound',
        priority: startPriority++,
      },
      { dependsOn }
    ),
    new network.SecurityRule(
      'AllowPSRemove',
      {
        name: 'AllowPSRemove',
        networkSecurityGroupName: securityGroupName,
        ...group,
        sourceAddressPrefix: 'AzureActiveDirectoryDomainServices',
        sourcePortRange: '*',
        destinationAddressPrefix: '*',
        destinationPortRange: '5986',
        protocol: 'Tcp',
        access: 'Allow',
        direction: 'Inbound',
        priority: startPriority++,
      },
      { dependsOn }
    ),
    new network.SecurityRule(
      'AllowPort636',
      {
        name: 'AllowPort636',
        networkSecurityGroupName: securityGroupName,
        ...group,
        sourceAddressPrefix: '*',
        sourcePortRange: '*',
        destinationAddressPrefix: '*',
        destinationPortRange: '636',
        protocol: 'Tcp',
        access: 'Allow',
        direction: 'Inbound',
        priority: startPriority++,
      },
      { dependsOn }
    )
  );
};
