import { KeyVaultInfo } from "../../types";
import Identity from "../Identity";
import { getIdentity } from "../Helper";
import { getGraphPermissions } from "../GraphDefinition";
import { output } from "@pulumi/pulumi";

export const defaultAzAdoName = "azure-devops";

interface Props {
  name?: string;
  enableOwner?: boolean;
  vaultInfo?: KeyVaultInfo;
  allowAccessPolicy?: boolean;
}

/** Get Global  ADO Identity */
export const getAdoIdentity = () => output(getIdentity(defaultAzAdoName, true));

/** Create Global ADO Identity */
export default ({
  name = defaultAzAdoName,
  enableOwner,
  vaultInfo,
  allowAccessPolicy,
  ...others
}: Props) => {
  const graphAccess = getGraphPermissions({ name: "User.Read", type: "Scope" });

  const principalRoles = enableOwner
    ? [{ roleName: "Owner" }]
    : [
        { roleName: "Contributor" },
        { roleName: "Network Contributor" },
        { roleName: "Storage Account Contributor" },
        { roleName: "Storage Blob Data Contributor" },
        { roleName: "Storage File Data SMB Share Contributor" },
        { roleName: "Storage Queue Data Contributor" },
        { roleName: "Storage Table Data Contributor" },
        { roleName: "Log Analytics Contributor" },
        { roleName: "Key Vault Administrator" },
        { roleName: "Key Vault Certificates Officer" },
        { roleName: "Key Vault Contributor" },
        { roleName: "Key Vault Crypto Officer" },
        { roleName: "Key Vault Crypto Service Encryption User" },
        { roleName: "Key Vault Crypto User" },
        { roleName: "Key Vault Secrets Officer" },
        { roleName: "Key Vault Secrets User" },
        { roleName: "User Access Administrator" },
        { roleName: "AcrPush" },
        { roleName: "AcrPull" },
        { roleName: "Data Factory Contributor" },
      ];

  const ado = Identity({
    name,
    appType: "web",
    createClientSecret: true,
    createPrincipal: true,
    requiredResourceAccesses: [graphAccess],
    principalRoles,
    vaultInfo,
    ...others,
  });

  //Grant key vault permission to ADO
  // if (allowAccessPolicy && vaultInfo) {
  //   grantVaultAccessPolicy({
  //     vaultInfo,
  //     name: 'azure-devops-vault-permission',
  //     permission: 'ReadWrite',
  //     objectId: ado.objectId,
  //   });
  // }

  console.log(
    `Add this principal ${name} to [User administrator, Application administrator, Cloud application administrator and Global Reader] of Azure AD to allow to Add/Update and Delete Groups, Users`,
  );

  return ado;
};
