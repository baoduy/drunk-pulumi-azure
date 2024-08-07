import * as native from '@pulumi/azure-native';
import { Input, interpolate } from '@pulumi/pulumi';
import {
  currentRegionName,
  naming,
  getResourceName,
  defaultSubScope,
} from '../Common';
import { getSecrets } from '../KeyVault/Helper';
import { getStorageInfo } from '../Storage/Helper';
import {
  DiagnosticProps,
  KeyVaultInfo,
  WithNamedType,
  ResourceWithVaultArgs,
  LogWorkspaceSecretsInfo,
  AppInsightSecretsInfo,
  AppInsightInfo,
  LogWorkspaceInfo,
  LogInfo,
} from '../types';

export const createDiagnostic = ({
  name,
  targetResourceId,
  logInfo,
  metricsCategories = ['AllMetrics'],
  logsCategories,
  dependsOn,
}: DiagnosticProps) => {
  //Ensure logWpId or logStorageId is provided
  if (!logInfo.logWp && !logInfo.logStorage) {
    console.error(
      `Diagnostic for "${name}" must have either a "logWp" or "storage".`,
    );
    return undefined;
  }
  //Ensure targetResourceId is valid
  if (!targetResourceId) {
    console.error(`Target resource of "${name}" must be provided .`);
    return undefined;
  }
  const wpId = logInfo.logWp?.id;
  const n = `${name}-diag`;
  return new native.insights.DiagnosticSetting(
    n,
    {
      name: n,
      resourceUri: targetResourceId,
      logAnalyticsDestinationType: 'AzureDiagnostics',

      workspaceId: wpId,
      storageAccountId: wpId ? undefined : logInfo.logStorage?.id,

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

interface ThreatProtectionProps extends WithNamedType {
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

const getLogWpSecrets = ({
  workspaceName,
  vaultInfo,
}: {
  workspaceName: string;
  vaultInfo: KeyVaultInfo;
}): LogWorkspaceSecretsInfo => {
  const workspaceId = `${workspaceName}-Id`;
  const primarySharedKey = `${workspaceName}-primary`;
  const secondarySharedKey = `${workspaceName}-secondary`;

  return getSecrets({
    nameFormatted: true,
    vaultInfo,
    names: { workspaceId, primarySharedKey, secondarySharedKey },
  });
};

const getLogWpInfo = ({
  name,
  group,
  vaultInfo,
}: ResourceWithVaultArgs): LogWorkspaceInfo => {
  const n = naming.getLogWpName(naming.cleanName(name));
  const id = interpolate`${defaultSubScope}/resourceGroups/${group.resourceGroupName}/providers/microsoft.operationalinsights/workspaces/${n}`;

  const secrets = vaultInfo
    ? getLogWpSecrets({ workspaceName: n, vaultInfo })
    : {};
  return { name: n, group, id, ...secrets };
};

const getAppInsightSecrets = ({
  insightName,
  vaultInfo,
}: {
  insightName: string;
  vaultInfo: KeyVaultInfo;
}): AppInsightSecretsInfo =>
  getSecrets({
    nameFormatted: true,
    vaultInfo,
    names: { instrumentationKey: insightName },
  });

const getAppInsightInfo = ({
  name,
  group,
  vaultInfo,
}: ResourceWithVaultArgs): AppInsightInfo => {
  const n = naming.getAppInsightName(naming.cleanName(name));
  const id = interpolate`${defaultSubScope}/resourceGroups/${group.resourceGroupName}/providers/microsoft.insights/components/${n}`;

  const secrets = vaultInfo
    ? getAppInsightSecrets({ insightName: n, vaultInfo })
    : {};
  return { name: n, group, id, ...secrets };
};

export const getLogInfo = (
  groupName: string,
  vaultInfo: KeyVaultInfo | undefined = undefined,
): LogInfo => {
  const rgName = naming.getResourceGroupName(groupName);
  const name = getResourceName(naming.cleanName(groupName), { suffix: 'logs' });
  const group = { resourceGroupName: rgName, location: currentRegionName };

  const logWp = getLogWpInfo({
    name,
    vaultInfo,
    group,
  });

  const logStorage = getStorageInfo({ name, group, vaultInfo });

  const appInsight = getAppInsightInfo({
    name,
    vaultInfo,
    group,
  });

  return { logWp, logStorage, appInsight };
};
