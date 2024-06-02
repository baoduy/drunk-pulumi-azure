import { KeyVaultInfo } from "../../types";
import Identity from "../Identity";
import { getGraphPermissions } from "../GraphDefinition";
import { getIdentityInfoOutput } from "../Helper";

export const defaultAzAdoName = "azure-devops";

interface Props {
  name?: string;
  vaultInfo: KeyVaultInfo;
  allowAccessPolicy?: boolean;
}

/** Get Global  ADO Identity */
export const getAdoIdentityInfo = (vaultInfo: KeyVaultInfo) =>
  getIdentityInfoOutput({
    name: defaultAzAdoName,
    vaultInfo,
    includePrincipal: true,
  });

/** Create Global ADO Identity */
export default ({
  name = defaultAzAdoName,
  vaultInfo,
  allowAccessPolicy,
  ...others
}: Props) => {
  const graphAccess = getGraphPermissions({ name: "User.Read", type: "Scope" });

  const principalRoles = [
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

  console.log(
    `Add this principal ${name} to [User administrator, Application administrator, Cloud application administrator and Global Reader] of Azure AD to allow to Add/Update and Delete Groups, Users`,
  );

  return ado;
};
