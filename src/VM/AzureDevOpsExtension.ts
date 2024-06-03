import { Input } from "@pulumi/pulumi";
import Extension, { VmExtensionProps } from "./Extension";

export interface AdoVMExtensionProps
  extends Omit<VmExtensionProps, "extension"> {
  settings: {
    VSTSAccountUrl: Input<string>;
    TeamProject: Input<string>;
    DeploymentGroup: Input<string>;
    AgentName: Input<string>;
    Tags?: Input<string>;
  };
  protectedSettings: {
    PATToken: Input<string>;
  };
}

export default ({
  settings,
  protectedSettings,
  ...others
}: AdoVMExtensionProps) =>
  Extension({
    ...others,
    extension: {
      publisher: "Microsoft.VisualStudio.Services",
      type: "TeamServicesAgentLinux",
      typeHandlerVersion: "1.0",
      protectedSettings,
      settings,
    },
  });
