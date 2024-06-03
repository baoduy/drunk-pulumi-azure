import * as native from "@pulumi/azure-native";
import { Input, interpolate, Output, output } from "@pulumi/pulumi";
import {
  currentRegionName,
  parseResourceInfoFromId,
  subscriptionId,
} from "../Common/AzureEnv";
import {
  getKeyName,
  getLogWpName,
  getResourceGroupName,
  getStorageName,
} from "../Common/Naming";
import { getSecret } from "../KeyVault/Helper";
import { getStorageSecrets, StorageConnectionInfo } from "../Storage/Helper";
import { DiagnosticProps, KeyVaultInfo, ResourceGroupInfo } from "../types";
import { getResourceName } from "../Common/ResourceEnv";

export const createDiagnostic = ({
  name,
  targetResourceId,
  logWpId,
  logStorageId,
  metricsCategories = ["AllMetrics"],
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
      logAnalyticsDestinationType: "AzureDiagnostics",

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

interface ThreatProtectionProps {
  name: string;
  targetResourceId: Input<string>;
}

export const createThreatProtection = ({
  name,
  targetResourceId,
}: ThreatProtectionProps) =>
  new native.security.AdvancedThreatProtection(name, {
    isEnabled: true,
    resourceId: targetResourceId,
    settingName: "current",
  });

export const getLogWpSecrets = async ({
  fullName,
  vaultInfo,
}: {
  fullName: string;
  vaultInfo: KeyVaultInfo;
}) => {
  const workspaceIdKeyName = `${fullName}-Id`;
  const primaryKeyName = getKeyName(fullName, "primary");
  const secondaryKeyName = getKeyName(fullName, "secondary");

  const [wpId, primaryKey, secondaryKey] = await Promise.all([
    getSecret({ name: workspaceIdKeyName, vaultInfo }).then((i) => i?.value),
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
  const info = parseResourceInfoFromId(logWpId);
  const secrets = info
    ? await getLogWpSecrets({ fullName: info.name, vaultInfo })
    : undefined;

  return secrets ? { info, secrets } : undefined;
};

export type LogWpInfo = {
  name: string;
  id: Output<string>;
  group: ResourceGroupInfo;
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
  const name = getLogWpName(logWpName);
  const id = interpolate`/subscriptions/${subscriptionId}/resourcegroups/${group.resourceGroupName}/providers/microsoft.operationalinsights/workspaces/${name}`;

  const secrets = vaultInfo
    ? output(getLogWpSecrets({ fullName: name, vaultInfo }))
    : undefined;

  return { name, group, id, secrets };
};

export type LogStorageInfo = {
  name: string;
  id: Output<string>;
  group: ResourceGroupInfo;
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
  const name = getStorageName(storageName);
  const id = interpolate`/subscriptions/${subscriptionId}/resourcegroups/${group.resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${name}`;

  const secrets = vaultInfo
    ? output(getStorageSecrets({ name, vaultInfo }))
    : undefined;

  return { name, group, id, secrets };
};

export type LogInfoResults = {
  logWp: LogWpInfo;
  logStorage: LogStorageInfo;
};

export const getLogInfo = (
  groupName: string,
  vaultInfo: KeyVaultInfo | undefined = undefined,
): LogInfoResults => {
  const rgName = getResourceGroupName(groupName);
  const name = getResourceName(groupName, { suffix: "logs" });

  const logWp = getLogWpInfo({
    logWpName: name,
    vaultInfo,
    group: { resourceGroupName: rgName, location: currentRegionName },
  });

  const logStorage = getLogStorageInfo({
    storageName: name,
    vaultInfo,
    group: { resourceGroupName: rgName, location: currentRegionName },
  });

  return { logWp, logStorage };
};
