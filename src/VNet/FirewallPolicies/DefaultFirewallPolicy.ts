import { Input } from "@pulumi/pulumi";
import {
  ApplicationRuleArgs,
  FirewallPolicyRuleCollectionResults,
  NetworkRuleArgs,
} from "../types";
import { FirewallPolicyGroup } from "../FirewallPolicy";

export default (
  priority: number = 6001,
): FirewallPolicyRuleCollectionResults => {
  const netRules = new Array<Input<NetworkRuleArgs>>();
  const appRules = new Array<Input<ApplicationRuleArgs>>();

  appRules.push({
    ruleType: "ApplicationRule",
    name: "default-deny-everything-else",
    description: "Default Deny Everything Else",
    protocols: [
      { protocolType: "Http", port: 80 },
      { protocolType: "Https", port: 443 },
      { protocolType: "Mssql", port: 1433 },
    ],
    sourceAddresses: ["*"],
    targetFqdns: ["*"],
  });

  return FirewallPolicyGroup({
    policy: { name: "default-firewall-policy", netRules, appRules },
    priority,
    action: "Deny",
  });
};
