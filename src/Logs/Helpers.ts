import * as native from '@pulumi/azure-native';
import { Input, interpolate } from '@pulumi/pulumi';
import {
  currentRegionName,
  naming,
  defaultSubScope,
  getResourceName,
} from '../Common';
import { getSecrets } from '../KeyVault';
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
    vaultInfo,
    names: { workspaceId, primarySharedKey, secondarySharedKey },
  });
};

const getLogWpInfo = ({
  name,
  group,
  vaultInfo,
}: ResourceWithVaultArgs): LogWorkspaceInfo => {
  const n = naming.getLogWpName(name);
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
    vaultInfo,
    names: { instrumentationKey: insightName },
  });

const getAppInsightInfo = ({
  name,
  group,
  vaultInfo,
}: ResourceWithVaultArgs): AppInsightInfo => {
  const n = naming.getAppInsightName(name);
  const id = interpolate`${defaultSubScope}/resourceGroups/${group.resourceGroupName}/providers/microsoft.insights/components/${n}`;
  const com = native.applicationinsights.getComponentOutput({
    resourceName: n,
    resourceGroupName: group.resourceGroupName,
  });

  return {
    name: n,
    group,
    id,
    connectionString: com.connectionString,
    instrumentationKey: com.instrumentationKey,
  };
};

export const getLogInfo = (
  groupName: string,
  vaultInfo: KeyVaultInfo | undefined = undefined
): LogInfo => {
  const rgName = naming.getResourceGroupName(groupName);
  const name = getResourceName(groupName, {
    cleanName: true,
    suffix: 'logs',
  });
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
