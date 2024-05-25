import { Input } from "@pulumi/pulumi";
import {
  ApplicationRuleArgs,
  FirewallPolicyRuleCollectionResults,
  NetworkRuleArgs,
} from "../types";
import { convertPolicyToGroup } from "../Helper";

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

  return convertPolicyToGroup({
    policy: { name: "default-firewall-policy", netRules, appRules },
    priority,
    action: "Deny",
  });
};
