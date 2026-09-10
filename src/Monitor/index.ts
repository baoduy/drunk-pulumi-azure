import * as azure_native from '@pulumi/azure-native';
import { Input } from '@pulumi/pulumi';
import { WithDependsOn } from '../types';

export const createDiagnostic = (
  name: string,
  {
    logs,
    metrics,
    resourceUri,
    storageAccountId,
    workspaceId,
    dependsOn,
  }: {
    resourceUri: Input<string>;
    storageAccountId?: Input<string>;
    workspaceId?: Input<string>;
    logs?: Array<{ categoryGroup: string }>;
    metrics?: Array<{ category: string }>;
  } & WithDependsOn
) => {
  return new azure_native.monitor.DiagnosticSetting(
    name,
    {
      logs: logs
        ? logs.map((l) => ({
            categoryGroup: l.categoryGroup,
            enabled: true,
          }))
        : [],
      metrics: metrics
        ? metrics.map((m) => ({
            category: m.category,
            enabled: true,
          }))
        : [],
      resourceUri,
      storageAccountId,
      workspaceId,
    },
    { dependsOn }
  );
};
