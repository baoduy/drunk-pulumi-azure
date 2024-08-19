import { BuilderProps, IBuilder } from './genericBuilder';
import { ResourceInfo, WithEncryptionInfo } from '../../types';
import * as logic from '@pulumi/azure-native/logic';

export type LogicAppBuilderArgs = BuilderProps;
export type LogicAppSku = logic.IntegrationAccountSkuName | string;

export interface ILogicAppSkuBuilder {
  withSku(props: LogicAppSku): ILogicAppBuilder;
}

export interface ILogicAppBuilder extends IBuilder<ResourceInfo> {}
