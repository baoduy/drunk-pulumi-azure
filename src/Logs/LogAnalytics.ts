import * as insights from '@pulumi/azure-native/operationalinsights';
import { BasicResourceWithVaultArgs, NetworkPropsType } from '../types';
import { naming } from '../Common';
import { addCustomSecrets } from '../KeyVault';

interface Props extends BasicResourceWithVaultArgs {
  sku?: insights.WorkspaceSkuNameEnum;
  dailyQuotaGb?: number;
  /** Only `privateLink` is honoured: it flips both public-access values to 'Disabled'. */
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
}

export default ({
  name,
  group,
  sku = insights.WorkspaceSkuNameEnum.Free,
  dailyQuotaGb = 0.023,
  vaultInfo,
  dependsOn,
  ignoreChanges,
  importUri,
  network,
  disableLocalAuth,
}: Props) => {
  name = naming.getLogWpName(name);
  const workspaceIdKeyName = `${name}-Id`;
  const primaryKeyName = `${name}-primary`;
  const secondaryKeyName = `${name}-secondary`;
  const localAuthDisabled = disableLocalAuth ?? true;

  const log = new insights.Workspace(
    name,
    {
      workspaceName: name,
      ...group,

      publicNetworkAccessForIngestion: network?.privateLink
        ? 'Disabled'
        : 'Enabled',
      publicNetworkAccessForQuery: network?.privateLink
        ? 'Disabled'
        : 'Enabled',
      features: {
        //clusterResourceId?: pulumi.Input<string>;
        disableLocalAuth: localAuthDisabled,
        //enableDataExport: false,
        //enableLogAccessUsingOnlyResourcePermissions?: pulumi.Input<boolean>;
        immediatePurgeDataOn30Days: true,
      },
      workspaceCapping:
        sku === insights.WorkspaceSkuNameEnum.Free
          ? undefined
          : { dailyQuotaGb }, //Fee is 2.99 USD/GB - Carefully

      retentionInDays: sku === insights.WorkspaceSkuNameEnum.Free ? 7 : 30, //DO NOT changes this
      sku: { name: sku },
    },
    { dependsOn, ignoreChanges, import: importUri },
  );

  if (vaultInfo) {
    log.customerId.apply(async (id) => {
      if (!id) return;

      const items = [{ name: workspaceIdKeyName, value: id }];

      if (!localAuthDisabled) {
        const keys = await insights.getSharedKeys({
          workspaceName: name,
          resourceGroupName: group.resourceGroupName,
        });

        items.push(
          { name: primaryKeyName, value: keys.primarySharedKey! },
          { name: secondaryKeyName, value: keys.secondarySharedKey! },
        );
      }

      addCustomSecrets({
        contentType: 'Log Analytics',
        vaultInfo,
        items,
      });
    });
  }

  return log;
};
