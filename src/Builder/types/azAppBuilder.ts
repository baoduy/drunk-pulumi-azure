import { BuilderProps, IBuilder } from './genericBuilder';
import { ResourceInfo } from '../../types';
import { Input } from '@pulumi/pulumi';

export type AzAppBuilderArgs = BuilderProps;

export type AzAppBuilderKinds = {
  kind: 'app' | 'FunctionApp';
  sku: { name: 'P1' | 'Y1' | string; tier: 'Dynamic' | 'Premium' | string };
};

export type AzFuncAppBuilderType = {
  name: string;
  storageConnectionString: Input<string>;
  appSettings?: Array<{ name: Input<string>; value: Input<string> }>;
};

export interface IAzAppPlanBuilder {
  withPlan(props: AzAppBuilderKinds): IAzAppBuilder;
}

export interface IAzAppBuilder extends IBuilder<ResourceInfo> {
  withFunc(props: AzFuncAppBuilderType): IAzAppBuilder;
}
