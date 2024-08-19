import { BuilderProps, IBuilder } from './genericBuilder';
import { ResourceInfo, WithEncryptionInfo } from '../../types';
import * as logic from '@pulumi/azure-native/logic';

/**
 * Arguments for the Logic App Builder.
 */
export type LogicAppBuilderArgs = BuilderProps;

/**
 * Type for specifying the SKU of a Logic App.
 */
export type LogicAppSku = logic.IntegrationAccountSkuName | string;

/**
 * Interface for building the SKU of a Logic App.
 */
export interface ILogicAppSkuBuilder {
  /**
   * Method to set the SKU for the Logic App.
   * @param props - The SKU name or a custom SKU string.
   * @returns An instance of ILogicAppBuilder.
   */
  withSku(props: LogicAppSku): ILogicAppBuilder;
}

/**
 * Interface for building a Logic App.
 */
export interface ILogicAppBuilder extends IBuilder<ResourceInfo> {}
