import monitor from '@pulumi/azure-native/monitor';
import { Input } from '@pulumi/pulumi';

export const createDiagnostic = (
  name: string,
  {
    logs,
    metrics,
    resourceUri,
    storageAccountId,
    workspaceId,
  }: {
    resourceUri: Input<string>;
    storageAccountId?: Input<string>;
    workspaceId?: Input<string>;
    logs?: Array<{ categoryGroup: string; dayRetention: number }>;
    metrics?: Array<{ category: string; dayRetention: number }>;
  }
) =>
  new monitor.DiagnosticSetting(name, {
    logAnalyticsDestinationType: 'Dedicated',
    logs: logs?.map((l) => ({
      categoryGroup: l.categoryGroup,
      enabled: true,
      retentionPolicy: {
        days: l.dayRetention,
        enabled: false,
      },
    })),
    metrics: metrics?.map((m) => ({
      category: m.category,
      enabled: true,
      retentionPolicy: {
        days: m.dayRetention,
        enabled: true,
      },
    })),
    resourceUri,
    storageAccountId,
    workspaceId,
  });
