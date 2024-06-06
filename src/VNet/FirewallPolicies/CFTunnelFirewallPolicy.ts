import { Input } from "@pulumi/pulumi";
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
  const appRules = new Array<Input<ApplicationRuleArgs>>();

  netRules.push({
    ruleType: "NetworkRule",
    name: `${name}-net-allows-cloudflare`,
    description: "Allows CF Tunnel to access to Cloudflare.",
    ipProtocols: ["TCP", "UDP"],
    sourceAddresses: subnetSpaces,
    destinationAddresses: [
      "198.41.192.167",
      "198.41.192.67",
      "198.41.192.57",
      "198.41.192.107",
      "198.41.192.27",
      "198.41.192.7",
      "198.41.192.227",
      "198.41.192.47",
      "198.41.192.37",
      "198.41.192.77",
      "198.41.200.13",
      "198.41.200.193",
      "198.41.200.33",
      "198.41.200.233",
      "198.41.200.53",
      "198.41.200.63",
      "198.41.200.113",
      "198.41.200.73",
      "198.41.200.43",
      "198.41.200.23",
    ],
    destinationPorts: ["7844"],
  });

  appRules.push({
    ruleType: "ApplicationRule",
    name: `${name}-app-allow-cloudflare`,
    description: "Allows CF Tunnel to access to Cloudflare.",
    sourceAddresses: subnetSpaces,
    targetFqdns: [
      "*.argotunnel.com",
      "*.cftunnel.com",
      "*.cloudflareaccess.com",
      "*.cloudflareresearch.com",
    ],
    protocols: [
      { protocolType: "Https", port: 443 },
      { protocolType: "Https", port: 7844 },
    ],
  });

  return FirewallPolicyGroup({
    policy: { name: `${name}-firewall-policy`, netRules, appRules },
    priority,
    action: "Allow",
  });
};
