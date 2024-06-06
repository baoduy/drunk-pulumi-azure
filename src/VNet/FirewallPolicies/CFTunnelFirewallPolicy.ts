import { Input } from "@pulumi/pulumi";
import { currentRegionCode } from "../../Common/AzureEnv";
import {
  ApplicationRuleArgs,
  FirewallPolicyRuleCollectionResults,
  NetworkRuleArgs,
} from "../types";
import { FirewallPolicyGroup } from "../FirewallPolicy";

interface Props {
  name?: string;
  priority: number;
  subnetSpaces: Array<Input<string>>;
}

export default ({
  name = "cf-tunnel",
  priority,
  subnetSpaces,
}: Props): FirewallPolicyRuleCollectionResults => {
  const netRules = new Array<Input<NetworkRuleArgs>>();

  netRules.push({
    ruleType: "NetworkRule",
    name: `${name}-net-allows-cloudflare`,
    description: "Allows CF Tunnel to access to Cloudflare.",
    ipProtocols: ["TCP", "UDP"],
    sourceAddresses: subnetSpaces,
    destinationFqdns: [
      "*.argotunnel.com",
      "*.cftunnel.com",
      "*.cloudflareaccess.com",
      "*.cloudflareresearch.com",
    ],
    destinationPorts: ["7844"],
  });

  return FirewallPolicyGroup({
    policy: { name: `${name}-firewall-policy`, netRules },
    priority,
    action: "Allow",
  });
};
