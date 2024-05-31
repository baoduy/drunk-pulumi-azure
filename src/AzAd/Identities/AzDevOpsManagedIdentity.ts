import { BasicResourceArgs } from "../../types";
import ManagedIdentity from "../ManagedIdentity";
import { defaultAzAdoName } from "./AzDevOpsIdentity";

interface Props extends Omit<BasicResourceArgs, "name"> {
  name?: string;
  lock?: boolean;
}

export default ({ name = defaultAzAdoName, ...others }: Props) => {
  const roles = [
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

  return ManagedIdentity({ name, permissions: roles, ...others });
};
