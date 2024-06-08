import * as keyvault from "@pulumi/azure-native/keyvault";
import { enums } from "@pulumi/azure-native/types";
import { Input } from "@pulumi/pulumi";
import { isPrd, tenantId } from "../Common/AzureEnv";
import { getKeyVaultName, getPrivateEndpointName } from "../Common/Naming";
import { createDiagnostic } from "../Logs/Helpers";
import {
  BasicMonitorArgs,
  KeyVaultInfo,
  PrivateLinkProps,
  ResourceGroupInfo,
} from "../types";
import PrivateEndpoint from "../VNet/PrivateEndpoint";
import { BasicResourceArgs } from "../types";

export interface KeyVaultProps extends BasicResourceArgs {
  softDeleteRetentionInDays: Input<number>;
  network?: {
    allowsAzureService?: boolean;
    ipAddresses?: Array<Input<string>>;
    subnetIds?: Array<Input<string>>;
  };
}

export const createVaultPrivateLink = ({
  name,
  vaultInfo,
  ...props
}: PrivateLinkProps & {
  name: string;
  vaultInfo: KeyVaultInfo;
}) =>
  PrivateEndpoint({
    name: getPrivateEndpointName(name),
    ...props,
    group: vaultInfo.group,
    resourceId: vaultInfo.id,
    privateDnsZoneName: "privatelink.vaultcore.azure.net",
    linkServiceGroupIds: ["keyVault"],
  });

export default ({
  name,
  group,
  network,
  softDeleteRetentionInDays = 7,
  ...others
}: KeyVaultProps) => {
  const vaultName = getKeyVaultName(name);

  const vault = new keyvault.Vault(
    vaultName,
    {
      vaultName,
      ...group,
      ...others,

      properties: {
        tenantId,
        sku: { name: "standard", family: "A" },
        createMode: "default",

        enableRbacAuthorization: true,
        accessPolicies: undefined,

        enablePurgeProtection: true,
        enableSoftDelete: true,
        softDeleteRetentionInDays, //This is not important as pulumi auto restore and update the sift deleted.

        enabledForDeployment: true,
        enabledForDiskEncryption: true,

        networkAcls: {
          bypass: "AzureServices",
          defaultAction: network?.allowsAzureService
            ? enums.keyvault.NetworkRuleAction.Allow
            : enums.keyvault.NetworkRuleAction.Deny,

          ipRules: network?.ipAddresses
            ? network.ipAddresses.map((i) => ({ value: i }))
            : [],

          virtualNetworkRules: network?.subnetIds
            ? network.subnetIds.map((s) => ({ id: s }))
            : undefined,
        },
      },
    },
    {
      ignoreChanges: [
        "softDeleteRetentionInDays",
        "enableSoftDelete",
        "enablePurgeProtection",
      ],
    },
  );

  //To Vault Info
  const toVaultInfo = () => ({
    name: vaultName,
    group,
    id: vault.id,
  });

  //Add Diagnostic
  const addDiagnostic = (logInfo: BasicMonitorArgs) =>
    createDiagnostic({
      name,
      targetResourceId: vault.id,
      ...logInfo,
      logsCategories: ["AuditEvent"],
    });

  // Create Private Link
  const createPrivateLink = (props: PrivateLinkProps) =>
    createVaultPrivateLink({ name, vaultInfo: toVaultInfo(), ...props });

  return {
    name: vaultName,
    vault,
    toVaultInfo,
    addDiagnostic,
    createPrivateLink,
  };
};
