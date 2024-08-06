import { BasicEncryptResourceArgs, KeyVaultInfo } from '../types';
import * as insights from '@pulumi/azure-native/operationalinsights';
import LogWp from './LogAnalytics';
import Storage from '../Storage';
import { getResourceName } from '../Common';
import { DefaultManagementRules } from '../Storage/ManagementRules';
import AppInsight from './AppInsight';

type WorkspaceType = {
  sku?: insights.WorkspaceSkuNameEnum;
  dailyQuotaGb?: number;
};

const defaultLogWorkspace: WorkspaceType = {
  sku: insights.WorkspaceSkuNameEnum.PerGB2018,
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
  vaultInfo?: KeyVaultInfo;
}

export default ({ group, name, workspace, vaultInfo, ...others }: Props) => {
  name = getResourceName(name, { suffix: 'logs' });
  const dailyQuotaGb =
    workspace?.dailyQuotaGb ?? defaultLogWorkspace.dailyQuotaGb;

  const logWp = LogWp({
    ...others,
    group,
    name,
    sku: workspace?.sku ?? defaultLogWorkspace.sku,
    dailyQuotaGb,
    vaultInfo,
  });

  const appInsight = AppInsight({
    ...others,
    group,
    name,
    dailyCapGb: dailyQuotaGb,
    immediatePurgeDataOn30Days: true,
    workspaceResourceId: logWp.id,
    ingestionMode: 'LogAnalytics',
    vaultInfo,
  });

  const logStorage = Storage({
    ...others,
    group,
    name,
    vaultInfo,
    policies: {
      defaultManagementRules: defaultStorageRules,
    },
    features: { allowSharedKeyAccess: true },
  });

  return {
    logWp,
    logStorage,
    appInsight,
  };
};
