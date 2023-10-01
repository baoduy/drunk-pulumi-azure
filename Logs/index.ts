import { BasicMonitorArgs, KeyVaultInfo, ResourceGroupInfo } from '../types';
import * as operationalinsights from '@pulumi/azure-native/operationalinsights';
import LogWp from './LogAnalytics';
import Storage from '../Storage';
import { getResourceName } from '../Common/ResourceEnv';
import { DefaultManagementRules } from '../Storage/ManagementRules';
import AppInsight from './AppInsight';

type WorkspaceType = {
  createAppInsight?: boolean;
  sku?: operationalinsights.WorkspaceSkuNameEnum;
  dailyQuotaGb?: number;
};

const defaultLogWorkspace: WorkspaceType = {
  createAppInsight: false,
  sku: operationalinsights.WorkspaceSkuNameEnum.PerGB2018,
  dailyQuotaGb: 0.1,
};

const defaultStorageRules: Array<DefaultManagementRules> = [
  {
    actions: { baseBlob: { delete: { daysAfterModificationGreaterThan: 30 } } },
    filters: { blobTypes: ['blockBlob'] },
  },
];

interface Props {
  name: string;
  group: ResourceGroupInfo;

  workspace?: WorkspaceType;

  storage?: {
    /** The management rule applied to Storage level (all containers)*/
    storageRules?: Array<DefaultManagementRules>;
  };
  vaultInfo?: KeyVaultInfo;
}

export default ({ group, name, workspace, storage, vaultInfo }: Props) => {
  name = getResourceName(name, { suffix: 'logs' });

  const createWp: WorkspaceType | undefined = workspace
    ? { ...defaultLogWorkspace, ...workspace }
    : undefined;

  const logWp = createWp
    ? LogWp({
        group,
        name,
        sku: createWp.sku,
        dailyQuotaGb: createWp.dailyQuotaGb,
        vaultInfo,
      })
    : undefined;

  const appInsight =
    logWp && createWp?.createAppInsight
      ? AppInsight({
          group,
          name,
          dailyCapGb: createWp.dailyQuotaGb,
          immediatePurgeDataOn30Days: true,
          workspaceResourceId: logWp.log.id,
          ingestionMode: 'ApplicationInsights',
          vaultInfo,
        })
      : undefined;

  const logStorage = storage
    ? Storage({
        group,
        name,
        vaultInfo,
        defaultManagementRules: storage.storageRules ?? defaultStorageRules,
        featureFlags: { allowSharedKeyAccess: true },
      })
    : undefined;

  return {
    logWp,
    logStorage,
    appInsight,
    toLogInfo: (): BasicMonitorArgs => ({
      logWpId: logWp?.log.id,
      logStorageId: logStorage?.storage.id,
    }),
    toLogStorageInfo: (): BasicMonitorArgs => ({
      logStorageId: logStorage?.storage.id,
    }),
    toLogWpInfo: (): BasicMonitorArgs => ({
      logWpId: logWp?.log.id,
    }),
  };
};
