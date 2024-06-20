import { IBuilder, ILoginBuilder } from "./genericBuilder";
import { Input } from "@pulumi/pulumi";
import { VirtualMachine } from "@pulumi/azure-native/compute";

//export type VmBuilderResults = {};

export type VmOsBuilderWindowsProps = {
  offer: "WindowsServer" | "CentOS" | "Windows-10" | "windows-11" | string;
  publisher: "MicrosoftWindowsServer" | "MicrosoftWindowsDesktop" | string;
  sku: "2019-Datacenter" | "21h1-pro" | "win11-23h2-pro" | string;
};
export type VmOsBuilderLinuxProps = {
  offer: "CentOS" | "0001-com-ubuntu-server-jammy" | string;
  publisher: "Canonical" | string;
  sku: "22_04-lts" | string;
};
export type VmSizeTypes = "Standard_D2as_v4";

export interface IVmOsBuilder {
  withWindowsImage: (props: VmOsBuilderWindowsProps) => IVmSizeBuilder;
  withLinuxImage: (props: VmOsBuilderLinuxProps) => IVmSizeBuilder;
}

export interface IVmSizeBuilder {
  withSize: (props: VmSizeTypes) => IVmLoginBuilder;
}
export interface IVmLoginBuilder extends ILoginBuilder<IVmVnetBuilder> {}
export interface IVmVnetBuilder {
  withSubnetId: (props: Input<string>) => IVmBuilder;
}
export interface IVmBuilder extends IBuilder<VirtualMachine> {
  withTags: (props: Record<string, Input<string>>) => IVmBuilder;
}
