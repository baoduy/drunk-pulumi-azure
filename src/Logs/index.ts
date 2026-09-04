import { BasicEncryptResourceArgs, KeyVaultInfo } from '../types';
import * as insights from '@pulumi/azure-native/operationalinsights';
import LogWp from './LogAnalytics';
import Storage from '../Storage';
import { getResourceName } from '../Common';
import { ManagementRules } from '../Storage/ManagementRules';
import AppInsight from './AppInsight';

type WorkspaceType = {
  sku?: insights.WorkspaceSkuNameEnum;
  dailyQuotaGb?: number;
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
  /**
   * Overrides `allowSharedKeyAccess` on the log-archive storage account.
   * Set to `false` to force Entra-only data-plane auth (flips
   * `defaultToOAuthAuthentication` to `true` on the Storage builder).
   * Omit to keep the documented default (see call site comment below).
   */
  storage?: { allowSharedKeyAccess?: boolean };
}

export default ({
  group,
  name,
  deleteAfterDays,
  workspace,
  vaultInfo,
  storage,
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
    // Default kept `true`: whether every diagnostic-setting log-archive writer can
    // authenticate to the destination storage account via managed identity/Entra ID
    // instead of the account key is resource-dependent, not guaranteed platform-wide
    // (see https://learn.microsoft.com/azure/storage/common/shared-key-authorization-prevent
    // and https://learn.microsoft.com/azure/azure-monitor/essentials/create-diagnostic-settings —
    // "the selection of the authentication method depends on the specific resource ...
    // and the capabilities of that resource"). Flipping this default risks silently
    // breaking diagnostic settings for callers whose log source can't yet use
    // managed identity, so it stays caller-controlled instead.
    features: { allowSharedKeyAccess: storage?.allowSharedKeyAccess ?? true },
  });

  return {
    logWp,
    logStorage,
    appInsight,
  };
};
