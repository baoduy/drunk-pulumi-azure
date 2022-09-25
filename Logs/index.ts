import { BasicMonitorArgs, KeyVaultInfo, ResourceGroupInfo } from '../types';
import * as operationalinsights from '@pulumi/azure-native/operationalinsights';
import LogWp from './LogAnalytics';
import Storage from '../Storage';
import { getResourceName } from '../Common/ResourceEnv';

interface Props {
  name: string;
  group: ResourceGroupInfo;
  createLogWp?: boolean;
  logWpSku?: operationalinsights.WorkspaceSkuNameEnum;
  dailyQuotaGb?: number;
  vaultInfo?: KeyVaultInfo;
}

export default ({
  group,
  name,
  createLogWp = true,
  logWpSku = operationalinsights.WorkspaceSkuNameEnum.Free,
  dailyQuotaGb,
  vaultInfo,
}: Props) => {
  name = getResourceName(name, { suffix: 'logs' });

  const logWp = createLogWp
    ? LogWp({ group, name, sku: logWpSku, dailyQuotaGb, vaultInfo })
    : undefined;

  const logStorage = Storage({
    group,
    name,
    vaultInfo,
    featureFlags: { allowSharedKeyAccess: true },
  });

  return {
    logWp,
    logStorage,
    toLogInfo: (): BasicMonitorArgs => ({
      logWpId: logWp?.log.id,
      logStorageId: logStorage.storage.id,
    }),
    toLogStorageInfo: (): BasicMonitorArgs => ({
      logStorageId: logStorage.storage.id,
    }),
    toLogWpInfo: (): BasicMonitorArgs => ({
      logWpId: logWp?.log.id,
    }),
  };
};
