import * as authorization from "@pulumi/azure-native/authorization";
import { CustomResource } from "@pulumi/pulumi";

interface Props {
  name: string;
  resource: CustomResource;
  level?: authorization.LockLevel;
  protect?: boolean;
}

/** Lock Delete from Resource group level.*/
export default ({
  name,
  resource,
  level = authorization.LockLevel.CanNotDelete,
  protect = true,
}: Props) => {
  const n = `${name}-${level}`;

  return new authorization.ManagementLockByScope(
    name,
    {
      lockName: n,
      level,
      scope: resource.id,
      notes: `Lock ${name} from ${level}`,
    },
    { dependsOn: resource, protect },
  );
};
