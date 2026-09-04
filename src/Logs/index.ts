import {
  BasicEncryptResourceArgs,
  KeyVaultInfo,
  NetworkPropsType,
} from '../types';
import * as insights from '@pulumi/azure-native/operationalinsights';
import LogWp from './LogAnalytics';
import Storage from '../Storage';
import { getResourceName } from '../Common';
import { ManagementRules } from '../Storage/ManagementRules';
import AppInsight from './AppInsight';

type WorkspaceType = {
  sku?: insights.WorkspaceSkuNameEnum;
  dailyQuotaGb?: number;
  network?: Pick<NetworkPropsType, 'privateLink'>;
  /**
   * Disable shared-key (local auth) ingestion. Defaults to true.
   * When true (the default), the workspace's primary/secondary shared keys are
   * NOT written to Key Vault — only the workspace id secret is. Consumers that
   * ship container-app logs via `AppContainerBuilder` (which reads
   * `logWp.primarySharedKey`) must pass `disableLocalAuth: false` to get a
   * usable shared key.
   */
  disableLocalAuth?: boolean;
};

const defaultLogWorkspace: WorkspaceType = {
  sku: insights.WorkspaceSkuNameEnum.PerGB2018,
  dailyQuotaGb: 0.1,
};

const getStorageAutoDeleteRules = (
  days: number = 90,
): Array<ManagementRules> => [
  {
    name: 'auto-delete-all-containers',
    actions: {
      baseBlob: { delete: { daysAfterModificationGreaterThan: days } },
    },
    filters: { blobTypes: ['blockBlob'] },
  },
];

interface Props extends BasicEncryptResourceArgs {
  workspace?: WorkspaceType;
  deleteAfterDays: number;
  vaultInfo?: KeyVaultInfo;
}

export default ({
  group,
  name,
  deleteAfterDays,
  workspace,
  vaultInfo,
  ...others
}: Props) => {
  name = getResourceName(name, { suffix: 'logs' });
  const dailyQuotaGb =
    workspace?.dailyQuotaGb ?? defaultLogWorkspace.dailyQuotaGb;

  const logWp = LogWp({
    ...others,
    group,
    name,
    sku: workspace?.sku ?? defaultLogWorkspace.sku,
    dailyQuotaGb,
    network: workspace?.network,
    disableLocalAuth: workspace?.disableLocalAuth,
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
      defaultManagementRules: getStorageAutoDeleteRules(deleteAfterDays),
    },
    features: { allowSharedKeyAccess: true },
  });

  return {
    logWp,
    logStorage,
    appInsight,
  };
};
