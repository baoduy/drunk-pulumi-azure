import * as insights from '@pulumi/azure-native/operationalinsights';
import { BasicResourceWithVaultArgs } from '../types';
import { naming } from '../Common';
import { addCustomSecrets } from '../KeyVault/CustomHelper';

interface Props extends BasicResourceWithVaultArgs {
  sku?: insights.WorkspaceSkuNameEnum;
  dailyQuotaGb?: number;
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
}: Props) => {
  name = naming.getLogWpName(name);
  const workspaceIdKeyName = `${name}-Id`;
  const primaryKeyName = `${name}-primary`;
  const secondaryKeyName = `${name}-secondary`;

  const log = new insights.Workspace(
    name,
    {
      workspaceName: name,
      ...group,

      publicNetworkAccessForIngestion: 'Enabled',
      publicNetworkAccessForQuery: 'Enabled',
      features: {
        //clusterResourceId?: pulumi.Input<string>;
        //disableLocalAuth: true,
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
    { dependsOn, ignoreChanges },
  );

  if (vaultInfo) {
    log.customerId.apply(async (id) => {
      if (!id) return;

      const keys = await insights.getSharedKeys({
        workspaceName: name,
        resourceGroupName: group.resourceGroupName,
      });
      addCustomSecrets({
        contentType: 'Log Analytics',
        formattedName: true,
        vaultInfo,
        items: [
          { name: workspaceIdKeyName, value: id },
          {
            name: primaryKeyName,
            value: keys.primarySharedKey!,
          },
          {
            name: secondaryKeyName,
            value: keys.secondarySharedKey!,
          },
        ],
      });
    });
  }

  return log;
};
