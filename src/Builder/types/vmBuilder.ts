import { ResourceInfo } from '../../types';
import { VmScheduleType } from '../../VM';
import { IBuilder, ILoginBuilder } from './genericBuilder';
import { Input } from '@pulumi/pulumi';

export type VmOsBuilderWindowsProps = {
  offer: 'WindowsServer' | 'CentOS' | 'Windows-10' | 'windows-11' | string;
  publisher: 'MicrosoftWindowsServer' | 'MicrosoftWindowsDesktop' | string;
  sku: '2019-Datacenter' | '21h1-pro' | 'win11-23h2-pro' | string;
};
export type VmOsBuilderLinuxProps = {
  offer: 'CentOS' | '0001-com-ubuntu-server-jammy' | string;
  publisher: 'Canonical' | string;
  sku: '22_04-lts' | string;
};
export type VmSizeTypes =
  | 'Standard_D2a_v4'
  | 'Standard_D4a_v4'
  | 'Standard_D8a_v4'
  | 'Standard_D16a_v4'
  | 'Standard_D32a_v4'
  | 'Standard_D48a_v4'
  | 'Standard_D64a_v4'
  | 'Standard_D96a_v4'
  | 'Standard_D2as_v4'
  | 'Standard_D4as_v4'
  | 'Standard_D8as_v4'
  | 'Standard_D16as_v4'
  | 'Standard_D32as_v4'
  | 'Standard_D48as_v4'
  | 'Standard_D64as_v4'
  | 'Standard_D96as_v4'
  | 'Standard_E2_v4'
  | 'Standard_E4_v4'
  | 'Standard_E8_v4'
  | 'Standard_E16_v4'
  | 'Standard_E20_v4'
  | 'Standard_E32_v4'
  | 'Standard_E48_v4'
  | 'Standard_E64_v4'
  | 'Standard_E8-4ads_v5'
  | 'Standard_E16-4ads_v5'
  | 'Standard_E32-8ads_v5'
  | 'Standard_E64-16ads_v5'
  | 'Standard_E96-24ads_v5'
  | string;

export interface IVmOsBuilder {
  withWindowsImage(props: VmOsBuilderWindowsProps): IVmSizeBuilder;
  withLinuxImage(props: VmOsBuilderLinuxProps): IVmSizeBuilder;
}

export interface IVmSizeBuilder {
  withSize(props: VmSizeTypes): IVmLoginBuilder;
}
export interface IVmLoginBuilder extends ILoginBuilder<IVmVnetBuilder> {}
export interface IVmVnetBuilder {
  withSubnetId(props: Input<string>): IVmBuilder;
}
export interface IVmBuilder extends IBuilder<ResourceInfo> {
  withTags(props: Record<string, Input<string>>): IVmBuilder;
  withSchedule(props: VmScheduleType): IVmBuilder;
}
