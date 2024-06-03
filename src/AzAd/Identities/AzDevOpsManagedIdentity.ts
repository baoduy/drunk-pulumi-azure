import { BasicResourceArgs } from "../../types";
import UserAssignedIdentity from "../UserAssignedIdentity";
import { defaultAzAdoName } from "./AzDevOpsIdentity";
import { defaultScope } from "../../Common/AzureEnv";

interface Props extends Omit<BasicResourceArgs, "name"> {
  name?: string;
  lock?: boolean;
}

export default ({ name = defaultAzAdoName, ...others }: Props) => {
  const additionRoles = [
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
  ];

  return UserAssignedIdentity({
    name,
    roles: additionRoles.map((role) => ({ name: role, scope: defaultScope })),
    lock: true,
    ...others,
  });
};
