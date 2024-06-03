import { KeyVaultInfo } from "../../types";
import Identity from "../Identity";
import { getGraphPermissions } from "../GraphDefinition";
import { getIdentityInfoOutput } from "../Helper";
import { defaultScope } from "../../Common/AzureEnv";

export const defaultAzAdoName = "azure-devops";

interface Props {
  name?: string;
  vaultInfo: KeyVaultInfo;
  additionRoles?: string[];
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
  additionRoles = [
    "Network Contributor",
    "Storage Account Contributor",
    "Storage Blob Data Contributor",
    "Storage File Data SMB Share Contributor",
    "Storage Queue Data Contributor",
    "Storage Table Data Contributor",
    "Log Analytics Contributor",
    "AcrPush",
    "AcrPull",
    "Data Factory Contributor",
  ],
  ...others
}: Props) => {
  const graphAccess = getGraphPermissions({ name: "User.Read", type: "Scope" });

  const ado = Identity({
    name,
    appType: "web",
    createClientSecret: true,
    createPrincipal: true,
    requiredResourceAccesses: [graphAccess],
    roles: additionRoles.map((role) => ({ name: role, scope: defaultScope })),
    vaultInfo,
    ...others,
  });

  console.log(
    `Add this principal ${name} to [User administrator, Application administrator, Cloud application administrator and Global Reader] of Azure AD to allow to Add/Update and Delete Groups, Users`,
  );

  return ado;
};
