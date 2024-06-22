/* eslint  @typescript-eslint/no-explicit-any: "off" */

import * as authorization from "@pulumi/azure-native/authorization";
import * as pulumi from "@pulumi/pulumi";
import { DefaultResourceArgs } from "../types";
import { DiagnosticSetting } from "@pulumi/azure-native/aadiam/diagnosticSetting";
import Locker from "./Locker";
import { createDiagnostic } from "../Logs/Helpers";

const tryFindName = (props: unknown, isResourceGroup: boolean): string => {
  const rs = props as {
    resourceGroupName?: string;
    name?: string;
    resourceName?: string;
    [key: string]: string | undefined;
  };
  //If resource group then just return the resourceGroupName or name.
  let name: string | undefined = rs.resourceGroupName || rs.name;
  if (isResourceGroup && name) return name;

  name = rs.resourceName || rs.name;
  if (name) return name;

  const keys = Object.keys(rs);
  //Try to find the name that is not a resourceGroupName
  const key = keys.find((k) => k.endsWith("Name") && k !== "resourceGroupName");

  if (key) {
    name = rs[key] as string;
  }

  if (!name)
    throw new Error("Name is not able to find in: " + JSON.stringify(props));

  return name;
};

type ClassOf = new (
  name: string,
  props: any,
  opts?: pulumi.CustomResourceOptions,
) => pulumi.CustomResource & {
  id: pulumi.Output<string>;
  urn: pulumi.Output<string>;
};

export type DefaultCreatorProps = Omit<
  DefaultResourceArgs,
  "name" | "group"
> & { lock?: boolean };

/** Create Resource with Locker */
export default function <
  TClass extends ClassOf,
  TProps extends DefaultCreatorProps,
>(
  Class: TClass,
  { lock, monitoring, dependsOn, ignoreChanges, importUri, ...props }: TProps,
) {
  const isResourceGroup = Class.name.endsWith("ResourceGroup");
  const name = tryFindName(props, isResourceGroup);

  const resource = new Class(
    name,
    { name, ...props },
    { dependsOn, import: importUri, ignoreChanges, deleteBeforeReplace: true },
  );

  //Lock Azure Resource from Delete
  let locker: authorization.ManagementLockByScope | undefined = undefined;
  if (lock) {
    locker = Locker({ name, resource });
  }

  //Azure DiagnosticSetting
  let diagnostic: DiagnosticSetting | undefined = undefined;
  if (monitoring) {
    diagnostic = createDiagnostic({
      name,
      targetResourceId: resource.id,
      ...monitoring,
      dependsOn: resource,
    });
  }

  return { resource, locker, diagnostic };
}
