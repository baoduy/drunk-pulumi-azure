import * as authorization from '@pulumi/azure-native/authorization';
import * as pulumi from '@pulumi/pulumi';

import { DefaultResourceArgs } from '../types';
import { DiagnosticSetting } from '@pulumi/azure-native/aadiam/diagnosticSetting';
import Locker from './Locker';
import { createDiagnostic } from '../Logs/Helpers';
import { defaultTags } from '../Common/AzureEnv';

const tryFindName = (props: any, isResourceGroup: boolean) => {
  //If resource group then just return the resourceGroupName or name.
  if (isResourceGroup) return props.resourceGroupName || props.name;

  let name = props.resourceName || props.name;

  if (!name) {
    const keys = Object.keys(props);
    //Try to find the name that is not a resourceGroupName
    let key = keys.find((k) => k.endsWith('Name') && k !== 'resourceGroupName');

    if (key) {
      //console.log('Found the Name is: ', key);
      name = props[key];
    }
  }

  if (!name)
    throw new Error('Name is not able to find in: ' + JSON.stringify(props));

  return name;
};

type ClassOf<T> = new (
  name: string,
  props: any,
  opts?: pulumi.CustomResourceOptions
) => T & {
  id: pulumi.Output<string>;
  urn: pulumi.Output<string>;
};

/** Create Resource with Locker */
export default async function <
  TClass extends ClassOf<pulumi.CustomResource>,
  TProps extends Omit<DefaultResourceArgs, 'name' | 'group'>
>(
  Class: TClass,
  { lock, monitoring, dependsOn, ignoreChanges, importUri, ...props }: TProps
) {
  const isResourceGroup = Class.name.endsWith('ResourceGroup');
  //console.log('Creating Resource: ', Class.name);

  const name = tryFindName(props, isResourceGroup);

  const resource = new Class(
    name,
    { name, ...props, tags: defaultTags },
    { dependsOn, import: importUri, ignoreChanges, deleteBeforeReplace: true }
  );

  //Lock Azure Resource from Delete
  let locker: authorization.ManagementLockByScope | undefined = undefined;
  if (lock) {
    locker = Locker({ name, resourceId: resource.id, dependsOn: resource });
  }

  //Azure DiagnosticSetting
  let diagnostic: DiagnosticSetting | undefined = undefined;
  if (monitoring) {
    diagnostic = await createDiagnostic({
      name,
      targetResourceId: resource.id,
      ...monitoring,
      dependsOn: resource,
    });
  }

  return { resource, locker, diagnostic };
}
