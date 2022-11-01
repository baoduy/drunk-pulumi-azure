import * as pulumi from '@pulumi/pulumi';
import { BasicResourceArgs } from '../types';
import { getNetworkSecurityGroupName } from '../Common/Naming';
import * as network from '@pulumi/azure-native/network';

interface Props extends BasicResourceArgs {
  securityRules?: pulumi.Input<pulumi.Input<network.SecurityRuleArgs>[]>;
}

export default ({ name, group, securityRules }: Props) => {
  const sName = getNetworkSecurityGroupName(name);

  return new network.NetworkSecurityGroup(sName, {
    networkSecurityGroupName: sName,
    ...group,
    securityRules,
  });
};
