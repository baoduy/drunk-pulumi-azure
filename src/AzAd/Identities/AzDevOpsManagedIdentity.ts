import { BasicResourceArgs } from "../../types";
import UserAssignedIdentity from "../UserAssignedIdentity";
import { defaultAzAdoName } from "./AzDevOpsIdentity";
import { defaultScope } from "../../Common/AzureEnv";

interface Props extends Omit<BasicResourceArgs, "name"> {
  name?: string;
  lock?: boolean;
}

export default ({ name = defaultAzAdoName, ...others }: Props) => {
  const additionRoles = ["Owner"];

  return UserAssignedIdentity({
    name,
    roles: additionRoles.map((role) => ({ name: role, scope: defaultScope })),
    lock: true,
    ...others,
  });
};
