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
    logs?: Array<{ categoryGroup: string; dayRetention?: number }>;
    metrics?: Array<{ category: string; dayRetention?: number }>;
  } & WithDependsOn
) => {
  // return new azure_native.monitor.DiagnosticSetting(
  //   name,
  //   {
  //     logs: logs
  //       ? logs.map((l) => ({
  //           categoryGroup: l.categoryGroup,
  //           enabled: true,
  //           retentionPolicy: {
  //             days: l.dayRetention || 7,
  //             enabled: Boolean(l.dayRetention),
  //           },
  //         }))
  //       : [],
  //     metrics: metrics
  //       ? metrics.map((m) => ({
  //           category: m.category,
  //           enabled: true,
  //           retentionPolicy: {
  //             days: m.dayRetention || 7,
  //             enabled: Boolean(m.dayRetention),
  //           },
  //         }))
  //       : [],
  //     resourceUri,
  //     storageAccountId,
  //     workspaceId,
  //   },
  //   { dependsOn }
  // );
};
