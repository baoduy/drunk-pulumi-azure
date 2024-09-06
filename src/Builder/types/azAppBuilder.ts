import { BuilderProps, IBuilder } from './genericBuilder';
import {
  NetworkPropsType,
  ResourceInfo,
  WithEnvRoles,
  WithLogInfo,
} from '../../types';
import { Input } from '@pulumi/pulumi';
import { enums } from '@pulumi/azure-native/types';

export type AzAppBuilderArgs = BuilderProps & WithEnvRoles & WithLogInfo;

export type AzAppBuilderKinds = {
  kind: 'app' | 'FunctionApp';
  sku: { name: 'P1' | 'Y1' | string; tier: 'Dynamic' | 'Premium' | string };
};

export type AzFuncAppBuilderType = {
  name: string;
  netFrameworkVersion?: 'v8.0' | 'v6.0' | string;
  nodeVersion?: string;

  appSettings?: Array<{ name: Input<string>; value: Input<string> }>;
  connectionStrings?: Array<{
    connectionString: Input<string>;
    name: Input<string>;
    type?: Input<enums.web.ConnectionStringType>;
  }>;
  network?: NetworkPropsType;
};

export interface IAzAppPlanBuilder {
  withPlan(props: AzAppBuilderKinds): IAzAppBuilder;
}

export interface IAzAppBuilder extends IBuilder<ResourceInfo> {
  withFunc(props: AzFuncAppBuilderType): IAzAppBuilder;
}
