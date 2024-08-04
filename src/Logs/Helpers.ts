import * as native from '@pulumi/azure-native';
import { Input, interpolate, Output, output } from '@pulumi/pulumi';
import {
  currentRegionName,
  rsInfo,
  naming,
  getResourceName,
  defaultSubScope,
} from '../Common';
import { getSecret } from '../KeyVault/Helper';
import { getStorageSecrets, StorageConnectionInfo } from '../Storage/Helper';
import {
  DiagnosticProps,
  KeyVaultInfo,
  NamedType,
  ResourceGroupInfo,
  ResourceInfo,
  ResourceWithVaultArgs,
} from '../types';
import { getAppInsightKey } from './AppInsight';

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
      `Diagnostic for "${name}" must have either a "logWpId" or "logStorageId".`,
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
    { dependsOn },
  );
};

interface ThreatProtectionProps extends NamedType {
  targetResourceId: Input<string>;
}

export const createThreatProtection = ({
  name,
  targetResourceId,
}: ThreatProtectionProps) =>
  new native.security.AdvancedThreatProtection(name, {
    isEnabled: true,
    resourceId: targetResourceId,
    settingName: 'current',
  });

//========================Log WP===========================

export const getLogWpSecrets = async ({
  fullName,
  vaultInfo,
}: {
  fullName: string;
  vaultInfo: KeyVaultInfo;
}) => {
  const workspaceIdKeyName = `${fullName}-Id`;
  const primaryKeyName = naming.getKeyName(fullName, 'primary');
  const secondaryKeyName = naming.getKeyName(fullName, 'secondary');

  const [wpId, primaryKey, secondaryKey] = await Promise.all([
    getSecret({
      name: workspaceIdKeyName,
      nameFormatted: true,
      vaultInfo,
    }).then((i) => i?.value),
    getSecret({ name: primaryKeyName, nameFormatted: true, vaultInfo }).then(
      (i) => i?.value,
    ),
    getSecret({ name: secondaryKeyName, nameFormatted: true, vaultInfo }).then(
      (i) => i?.value,
    ),
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
  const info = rsInfo.getResourceInfoFromId(logWpId);
  const secrets = info
    ? await getLogWpSecrets({ fullName: info.name, vaultInfo })
    : undefined;

  return secrets ? { info, secrets } : undefined;
};

export type LogWpInfo = ResourceInfo & {
  secrets?: Output<{
    wpId: string | undefined;
    secondaryKey: string | undefined;
    primaryKey: string | undefined;
  }>;
};

export const getLogWpInfo = ({
  logWpName,
  vaultInfo,
  group,
}: {
  logWpName: string;
  group: ResourceGroupInfo;
  vaultInfo?: KeyVaultInfo;
}): LogWpInfo => {
  const n = naming.getLogWpName(logWpName);
  const id = interpolate`${defaultSubScope}/resourcegroups/${group.resourceGroupName}/providers/microsoft.operationalinsights/workspaces/${n}`;

  const secrets = vaultInfo
    ? output(getLogWpSecrets({ fullName: n, vaultInfo }))
    : undefined;

  return { name: n, group, id, secrets };
};

//========================Log Storage===========================
export type LogStorageInfo = ResourceInfo & {
  secrets?: Output<StorageConnectionInfo>;
};

export const getLogStorageInfo = ({
  storageName,
  group,
  vaultInfo,
}: {
  storageName: string;
  group: ResourceGroupInfo;
  vaultInfo?: KeyVaultInfo;
}): LogStorageInfo => {
  const n = naming.getStorageName(storageName);
  const id = interpolate`${defaultSubScope}/resourcegroups/${group.resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${n}`;

  const secrets = vaultInfo
    ? output(getStorageSecrets({ name: n, nameFormatted: true, vaultInfo }))
    : undefined;

  return { name: n, group, id, secrets };
};

//========================App Insight===========================
export type AppInsightInfo = ResourceInfo & {
  instrumentationKey?: Output<string>;
};

export const getAppInsightInfo = ({
  name,
  group,
  vaultInfo,
}: ResourceWithVaultArgs): AppInsightInfo => {
  const n = naming.getAppInsightName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${group.resourceGroupName}/providers/microsoft.insights/components/${n}`;

  const instrumentationKey = vaultInfo
    ? output(
        getAppInsightKey({
          resourceInfo: { name: n, group, id },
          vaultInfo,
        }),
      )
    : undefined;

  return { name: n, group, id, instrumentationKey };
};

export type LogInfoResults = {
  logWp: LogWpInfo;
  logStorage: LogStorageInfo;
  appInsight: AppInsightInfo;
};

export const getLogInfo = (
  groupName: string,
  vaultInfo: KeyVaultInfo | undefined = undefined,
): LogInfoResults => {
  const rgName = naming.getResourceGroupName(groupName);
  const name = getResourceName(groupName, { suffix: 'logs' });
  const group = { resourceGroupName: rgName, location: currentRegionName };

  const logWp = getLogWpInfo({
    logWpName: name,
    vaultInfo,
    group,
  });

  const logStorage = getLogStorageInfo({
    storageName: name,
    vaultInfo,
    group,
  });

  const appInsight = getAppInsightInfo({
    name,
    vaultInfo,
    group,
  });

  return { logWp, logStorage, appInsight };
};
