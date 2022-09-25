import * as authorization from '@pulumi/azure-native/authorization';
import * as pulumi from '@pulumi/pulumi';
import { Input, Resource } from '@pulumi/pulumi';

interface Props {
  name: string;
  resourceId: pulumi.Output<string>;
  level?: authorization.LockLevel;
  protect?: boolean;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

/** Lock Delete from Resource group level.*/
export default ({
  name,
  resourceId,
  level = authorization.LockLevel.CanNotDelete,
  protect = true,
  dependsOn,
}: Props) => {
  const n = `${name}-${level}`;

  return new authorization.ManagementLockByScope(
    name,
    {
      lockName: n,
      level,
      scope: resourceId,
      notes: `Lock ${name} from ${level}`,
    },
    { dependsOn, protect }
  );
};
