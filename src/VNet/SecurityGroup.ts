import { BasicResourceArgs } from '../types';
import { CustomSecurityRuleArgs } from './types';
import { naming } from '../Common';
import * as network from '@pulumi/azure-native/network';
import * as pulumi from '@pulumi/pulumi';

interface Props extends BasicResourceArgs {
  securityRules?: pulumi.Input<CustomSecurityRuleArgs>[];
}

export default ({ name, group, securityRules = [] }: Props) => {
  const sName = naming.getNetworkSGName(name);

  return new network.NetworkSecurityGroup(sName, {
    networkSecurityGroupName: sName,
    ...group,
    securityRules: securityRules.map((s) => ({
      ...s,
      ...group,
      networkSecurityGroupName: sName,
    })),
  });
};
