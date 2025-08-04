import {
  ResourceInfo,
  WithDiskEncryption,
  WithEncryption,
  WithLogInfo,
} from '../../types';
import { VmScheduleType } from '../../VirtualMachine';
import {
  BuilderProps,
  IBuilder,
  IIgnoreChanges,
  ILoginBuilder,
} from './genericBuilder';
import { Input } from '@pulumi/pulumi';

/**
 * Arguments required for building a VM resource.
 */
export type VmBuilderArgs = BuilderProps & WithEncryption;

/**
 * Arguments for defining the OS properties of a Windows VM.
 */
export type VmOsBuilderWindowsProps = {
  /**
   * The offer of the Windows image.
   */
  offer: 'WindowsServer' | 'CentOS' | 'Windows-10' | 'windows-11' | string;
  /**
   * The publisher of the Windows image.
   */
  publisher: 'MicrosoftWindowsServer' | 'MicrosoftWindowsDesktop' | string;
  /**
   * The SKU of the Windows image.
   */
  sku: '2019-Datacenter' | '21h1-pro' | 'win11-23h2-pro' | string;
};

/**
 * Arguments for defining the OS properties of a Linux VM.
 */
export type VmOsBuilderLinuxProps = {
  /**
   * The offer of the Linux image.
   */
  offer: 'CentOS' | '0001-com-ubuntu-server-jammy' | string;
  /**
   * The publisher of the Linux image.
   */
  publisher: 'Canonical' | string;
  /**
   * The SKU of the Linux image.
   */
  sku: '22_04-lts' | string;
};

/**
 * Types of VM sizes available.
 */
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

/**
 * Type for defining the encryption properties of a VM.
 */
export type VmEncryptionType = Required<WithDiskEncryption>;

/**
 * Interface for building the OS properties of a VM.
 */
export interface IVmOsBuilder {
  /**
   * Sets the OS properties for a Windows VM.
   * @param props - The Windows OS properties.
   * @returns An instance of IVmSizeBuilder.
   */
  withWindowsImage(props: VmOsBuilderWindowsProps): IVmSizeBuilder;

  /**
   * Sets the OS properties for a Linux VM.
   * @param props - The Linux OS properties.
   * @returns An instance of IVmSizeBuilder.
   */
  withLinuxImage(props: VmOsBuilderLinuxProps): IVmSizeBuilder;
}

/**
 * Interface for building the size properties of a VM.
 */
export interface IVmSizeBuilder {
  /**
   * Sets the size properties for the VM.
   * @param props - The size properties.
   * @returns An instance of IVmLoginBuilder.
   */
  withSize(props: VmSizeTypes): IVmLoginBuilder;
}

/**
 * Interface for building the login credentials of a VM.
 */
export interface IVmLoginBuilder extends ILoginBuilder<IVmVnetBuilder> {}

/**
 * Interface for building the VNet properties of a VM.
 */
export interface IVmVnetBuilder {
  /**
   * Sets the subnet ID for the VM.
   * @param props - The subnet ID.
   * @returns An instance of IVmBuilder.
   */
  withSubnetId(props: Input<string>): IVmBuilder;
}

/**
 * Interface for building a VM.
 */
export interface IVmBuilder
  extends IBuilder<ResourceInfo>,
    IIgnoreChanges<IVmBuilder> {
  /**
   * Enables encryption for the VM.
   * @param props - The encryption properties.
   * @returns An instance of IVmBuilder.
   */
  enableEncryption(props: VmEncryptionType): IVmBuilder;

  /**
   * Sets the tags for the VM.
   * @param props - The tags.
   * @returns An instance of IVmBuilder.
   */
  withTags(props: Record<string, Input<string>>): IVmBuilder;

  /**
   * Sets the schedule for the VM.
   * @param props - The schedule properties.
   * @returns An instance of IVmBuilder.
   */
  withSchedule(props: VmScheduleType): IVmBuilder;

  /**
   * Sets the size of the OS disk for the VM.
   * @param props - The size of the OS disk in GB.
   * @returns An instance of IVmBuilder.
   */
  withOSDiskSize(props: number): IVmBuilder;

  /**
   * Sets the size of the data disk for the VM.
   * @param props - The size of the data disk in GB.
   * @returns An instance of IVmBuilder.
   */
  withDataDiskSize(props: number): IVmBuilder;
}
