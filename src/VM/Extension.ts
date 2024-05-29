import { BasicResourceArgs } from "../types";
import * as compute from "@pulumi/azure-native/compute";
import { Input } from "@pulumi/pulumi";

export interface VmExtensionProps extends BasicResourceArgs {
  vmName: Input<string>;
  enableAutomaticUpgrade?: boolean;
  extension: {
    publisher: Input<string>;
    type: Input<string>;
    typeHandlerVersion: Input<string>;
    settings?: Record<string, Input<string>>;
    protectedSettings?: Record<string, Input<string>>;
  };
}

export default ({
  name,
  group,
  vmName,
  extension,
  enableAutomaticUpgrade,
  dependsOn,
}: VmExtensionProps) =>
  new compute.VirtualMachineExtension(
    name,
    {
      vmExtensionName: name,
      vmName,
      ...group,
      ...extension,
      autoUpgradeMinorVersion: true,
      enableAutomaticUpgrade,
      suppressFailures: true,
    },
    { dependsOn },
  );
