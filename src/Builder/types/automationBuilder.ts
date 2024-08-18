import { BuilderProps } from './genericBuilder';
import { ResourceInfo, WithEncryptionInfo } from '../../types';
import { IBuilder } from './genericBuilder';
import { SkuNameEnum } from '@pulumi/azure-native/automation';

export type AutomationBuilderArgs = BuilderProps & WithEncryptionInfo;
export type AutomationSkuBuilder = SkuNameEnum | string;

export interface IAutomationSkuBuilder {
  withSku(props: AutomationSkuBuilder): IAutomationBuilder;
}
export interface IAutomationBuilder extends IBuilder<ResourceInfo> {}
