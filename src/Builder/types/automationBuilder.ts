import { BuilderProps } from './genericBuilder';
import { ResourceInfo, WithEncryptionInfo } from '../../types';
import { IBuilder } from './genericBuilder';
import { SkuNameEnum } from '@pulumi/azure-native/automation';

/**
 * Arguments for the Automation Builder.
 */
export type AutomationBuilderArgs = BuilderProps & WithEncryptionInfo;

/**
 * Type for specifying the SKU of the Automation resource.
 */
export type AutomationSkuBuilder = SkuNameEnum | string;

/**
 * Interface for building the SKU of an Automation resource.
 */
export interface IAutomationSkuBuilder {
  /**
   * Method to set the SKU for the Automation resource.
   * @param props - The SKU name or a custom SKU string.
   * @returns An instance of IAutomationBuilder.
   */
  withSku(props: AutomationSkuBuilder): IAutomationBuilder;
}

/**
 * Interface for building an Automation resource.
 */
export interface IAutomationBuilder extends IBuilder<ResourceInfo> {}
