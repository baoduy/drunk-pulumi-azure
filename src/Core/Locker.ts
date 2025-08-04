import * as authorization from '@pulumi/azure-native/authorization';
import { CustomResource } from '@pulumi/pulumi';
import { ResourceInfoWithInstance } from '../types';

interface Props {
  name: string;
  resource: CustomResource;
  level?: authorization.LockLevel;
}

/** Lock Delete from Resource group level.*/
export const Locker = ({
  name,
  resource,
  level = authorization.LockLevel.CanNotDelete,
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
    { dependsOn: resource, retainOnDelete: true }
  );
};

export function LockerDeco() {
  return function actualDecorator(
    originalMethod: any,
    context: ClassMethodDecoratorContext
  ) {
    //const methodName = String(context.name);

    function replacementMethod(this: any, ...args: any[]) {
      const result = originalMethod.call(
        this,
        ...args
      ) as ResourceInfoWithInstance<CustomResource>;

      if ('lock' in args && args.lock && result.instance) {
        Locker({
          name: result.name,
          level: 'CanNotDelete',
          resource: result.instance,
        });
      }
      return result;
    }

    return replacementMethod;
  };
}
