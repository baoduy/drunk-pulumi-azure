import * as authorization from '@pulumi/azure-native/authorization';
import * as pulumi from '@pulumi/pulumi';
import { Input, Resource } from '@pulumi/pulumi';

interface Props {
  name: string;
  resource: Input<Resource>;
  level?: authorization.LockLevel;
  protect?: boolean;
}

/** Lock Delete from Resource group level.*/
export default ({
  name,
  resourceId,
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
    { dependsOn: resource, protect }
  );
};
