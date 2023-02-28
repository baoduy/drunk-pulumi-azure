import * as azure from '@pulumi/azure';
import * as native from '@pulumi/azure-native';
import { Input, interpolate } from '@pulumi/pulumi';

import { getResourceInfoFromId, subscriptionId } from '../Common/AzureEnv';
import { logGroupInfo } from '../Common/GlobalEnv';
import { getKeyName, getLogWpName, getStorageName } from '../Common/Naming';
import { getSecret } from '../KeyVault/Helper';
import { getStorageSecrets } from '../Storage/Helper';
import { DiagnosticProps, KeyVaultInfo } from '../types';

export const createDiagnostic = ({
  name,
  targetResourceId,
  logWpId,
  logStorageId,
  metricsCategories = ['AllMetrics'],
  logsCategories,
  dependsOn,
}: DiagnosticProps) => {
  //Ensure logWpId or logStorageId is provided
  if (!logWpId && !logStorageId) {
    console.error(
      `Diagnostic for "${name}" must have either a "logWpId" or "logStorageId".`
    );
    return undefined;
  }

  //Ensure targetResourceId is valid
  if (!targetResourceId) {
    console.error(`Target resource of "${name}" must beprovided .`);
    return undefined;
  }

  const n = `${name}-diag`;
  return new native.insights.DiagnosticSetting(
    n,
    {
      name: n,
      resourceUri: targetResourceId,
      logAnalyticsDestinationType: 'AzureDiagnostics',

      workspaceId: logWpId,
      storageAccountId: logWpId ? undefined : logStorageId,

      //Metric
      metrics: metricsCategories
        ? metricsCategories.map((c) => ({
            category: c,
            retentionPolicy: { enabled: false, days: 7 },
            enabled: true,
          }))
        : undefined,
      //Logs
      logs: logsCategories
        ? logsCategories.map((c) => ({
            category: c,
            retentionPolicy: { enabled: false, days: 7 },
            enabled: true,
          }))
        : undefined,
    },
    { dependsOn }
  );
};

interface ThreatProtectionProps {
  name: string;
  targetResourceId: Input<string>;
}

export const createThreatProtection = ({
  name,
  targetResourceId,
}: ThreatProtectionProps) => {
  return new azure.securitycenter.AdvancedThreatProtection(name, {
    enabled: true,
    targetResourceId,
  });
};

export const getLogWpSecrets = async ({
  fullName,
  //group,
  vaultInfo,
}: {
  fullName: string;
  //group: ResourceGroupInfo;
  vaultInfo: KeyVaultInfo;
}) => {
  const workspaceIdKeyName = `${fullName}-Id`;
  const primaryKeyName = getKeyName(fullName, 'primary');
  const secondaryKeyName = getKeyName(fullName, 'secondary');

  const [wpId, primaryKey, secondaryKey] = await Promise.all([
    getSecret({ name: workspaceIdKeyName, vaultInfo }),
    getSecret({ name: primaryKeyName, nameFormatted: true, vaultInfo }),
    getSecret({ name: secondaryKeyName, nameFormatted: true, vaultInfo }),
  ]);

  return { wpId, primaryKey, secondaryKey };
};

export const getLogWpSecretsById = async ({
  logWpId,
  vaultInfo,
}: {
  logWpId: string;
  vaultInfo: KeyVaultInfo;
}) => {
  const info = getResourceInfoFromId(logWpId);
  const secrets = info
    ? await getLogWpSecrets({ fullName: info.name, vaultInfo })
    : undefined;

  return secrets ? { info, secrets } : undefined;
};

export const getLogWpInfo = async ({
  logWpName,
  vaultInfo,
}: {
  logWpName: string;
  vaultInfo?: KeyVaultInfo;
}) => {
  const name = getLogWpName(logWpName);
  const group = logGroupInfo;
  const id = interpolate`/subscriptions/${subscriptionId}/resourcegroups/${group.resourceGroupName}/providers/microsoft.operationalinsights/workspaces/${name}`;

  const secrets = vaultInfo
    ? await getLogWpSecrets({ fullName: name, vaultInfo })
    : undefined;

  return { name, group, id, secrets };
};

export const getLogStorageInfo = async ({
  storageName,
  vaultInfo,
}: {
  storageName: string;
  vaultInfo?: KeyVaultInfo;
}) => {
  const name = getStorageName(storageName);
  const group = logGroupInfo;
  const id = interpolate`/subscriptions/${subscriptionId}/resourcegroups/${group.resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${name}`;

  const secrets = vaultInfo
    ? await getStorageSecrets({ fullName: name, vaultInfo })
    : undefined;

  return { name, group, id, secrets };
};
