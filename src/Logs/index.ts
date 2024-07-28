import {
  BasicEncryptResourceArgs,
  BasicMonitorArgs,
  KeyVaultInfo,
  ResourceArgs,
} from '../types';
import * as operationalinsights from '@pulumi/azure-native/operationalinsights';
import LogWp from './LogAnalytics';
import Storage from '../Storage';
import { getResourceName } from '../Common';
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

interface Props extends BasicEncryptResourceArgs {
  workspace?: WorkspaceType;
  storage?: {
    /** The management rule applied to Storage level (all containers)*/
    storageRules?: Array<DefaultManagementRules>;
  };
  vaultInfo?: KeyVaultInfo;
}

export default ({
  group,
  name,
  workspace,
  storage,
  vaultInfo,
  ...others
}: Props) => {
  name = getResourceName(name, { suffix: 'logs' });

  const createWp: WorkspaceType | undefined = workspace
    ? { ...defaultLogWorkspace, ...workspace }
    : undefined;

  const logWp = createWp
    ? LogWp({
        ...others,
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
          ...others,
          group,
          name,
          dailyCapGb: createWp.dailyQuotaGb,
          immediatePurgeDataOn30Days: true,
          workspaceResourceId: logWp.log.id,
          ingestionMode: 'LogAnalytics',
          vaultInfo,
        })
      : undefined;

  const logStorage = storage
    ? Storage({
        ...others,
        group,
        name,
        vaultInfo,
        policies: {
          defaultManagementRules: storage.storageRules ?? defaultStorageRules,
        },
        features: { allowSharedKeyAccess: true },
      })
    : undefined;

  return {
    logWp,
    logStorage,
    appInsight,
    info: (): BasicMonitorArgs => ({
      logWpId: logWp?.log.id,
      logStorageId: logStorage?.id,
    }),
    toLogStorageInfo: (): BasicMonitorArgs => ({
      logStorageId: logStorage?.id,
    }),
    toLogWpInfo: (): BasicMonitorArgs => ({
      logWpId: logWp?.log.id,
    }),
  };
};
