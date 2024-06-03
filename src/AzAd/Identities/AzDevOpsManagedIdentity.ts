import { BasicResourceArgs } from "../../types";
import UserAssignedIdentity from "../UserAssignedIdentity";
import { defaultAzAdoName } from "./AzDevOpsIdentity";
import { defaultScope } from "../../Common/AzureEnv";

interface Props extends Omit<BasicResourceArgs, "name"> {
  name?: string;
  lock?: boolean;
}

export default ({ name = defaultAzAdoName, ...others }: Props) => {
  const roles = [
    { name: "Contributor", scope: defaultScope },
    { name: "Network Contributor", scope: defaultScope },
    { name: "Storage Account Contributor", scope: defaultScope },
    { name: "Storage Blob Data Contributor", scope: defaultScope },
    { name: "Storage File Data SMB Share Contributor", scope: defaultScope },
    { name: "Storage Queue Data Contributor", scope: defaultScope },
    { name: "Storage Table Data Contributor", scope: defaultScope },
    { name: "Log Analytics Contributor", scope: defaultScope },
    { name: "Key Vault Administrator", scope: defaultScope },
    { name: "Key Vault Certificates Officer", scope: defaultScope },
    { name: "Key Vault Contributor", scope: defaultScope },
    { name: "Key Vault Crypto Officer", scope: defaultScope },
    { name: "Key Vault Crypto Service Encryption User", scope: defaultScope },
    { name: "Key Vault Crypto User", scope: defaultScope },
    { name: "Key Vault Secrets Officer", scope: defaultScope },
    { name: "Key Vault Secrets User", scope: defaultScope },
    { name: "User Access Administrator", scope: defaultScope },
    { name: "AcrPush", scope: defaultScope },
    { name: "AcrPull", scope: defaultScope },
    { name: "Data Factory Contributor", scope: defaultScope },
  ];

  return UserAssignedIdentity({ name, roles, ...others });
};
