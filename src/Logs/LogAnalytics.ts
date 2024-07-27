import * as operationalinsights from '@pulumi/azure-native/operationalinsights';
import { ResourceWithVaultArgs } from '../types';
import { getKeyName, getLogWpName } from '../Common';
import { addCustomSecret, addCustomSecrets } from '../KeyVault/CustomHelper';

interface Props extends ResourceWithVaultArgs {
  sku?: operationalinsights.WorkspaceSkuNameEnum;
  dailyQuotaGb?: number;
}

export default ({
  name,
  group,
  sku = operationalinsights.WorkspaceSkuNameEnum.Free,
  dailyQuotaGb = 0.023,
  vaultInfo,
}: Props) => {
  name = getLogWpName(name);
  const workspaceIdKeyName = `${name}-Id`;
  const primaryKeyName = getKeyName(name, 'primary');
  const secondaryKeyName = getKeyName(name, 'secondary');

  const log = new operationalinsights.Workspace(name, {
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
      sku === operationalinsights.WorkspaceSkuNameEnum.Free
        ? undefined
        : { dailyQuotaGb }, //Fee is 2.99 USD/GB - Carefully

    retentionInDays:
      sku === operationalinsights.WorkspaceSkuNameEnum.Free ? 7 : 30, //DO NOT changes this
    sku: { name: sku },
  });

  if (vaultInfo) {
    log.customerId.apply(async (id) => {
      if (!id) return;

      const keys = await operationalinsights.getSharedKeys({
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

  return { log, vaultNames: { primaryKeyName, secondaryKeyName } };
};
