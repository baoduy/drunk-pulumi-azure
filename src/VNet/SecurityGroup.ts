import { BasicResourceArgs, CustomSecurityRuleArgs } from "../types";
import { getNetworkSecurityGroupName } from "../Common/Naming";
import * as network from "@pulumi/azure-native/network";
import * as pulumi from "@pulumi/pulumi";

interface Props extends BasicResourceArgs {
  securityRules?: pulumi.Input<CustomSecurityRuleArgs>[];
}

export default ({ name, group, securityRules = [] }: Props) => {
  const sName = getNetworkSecurityGroupName(name);

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
