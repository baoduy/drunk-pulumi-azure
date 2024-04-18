import { BasicResourceArgs } from "../types";
import * as managedidentity from "@pulumi/azure-native/managedidentity";
import { getIdentityName } from "../Common/Naming";

interface Props extends BasicResourceArgs {}

export default ({ name, group }: Props) => {
  name = getIdentityName(name);
  return new managedidentity.UserAssignedIdentity(name, {
    resourceName: name,
    ...group,
  });
};
