import * as operationalinsights from '@pulumi/azure-native/operationalinsights';

import { defaultTags, isPrd } from '../Common/AzureEnv';

import { KeyVaultInfo, ResourceGroupInfo } from '../types';
import { addLegacySecret } from '../KeyVault/LegacyHelper';
import { getKeyName, getLogWpName } from '../Common/Naming';
import { addCustomSecret } from '../KeyVault/CustomHelper';

interface Props {
  name: string;
  group: ResourceGroupInfo;
  sku?: operationalinsights.WorkspaceSkuNameEnum;
  dailyQuotaGb?: number;
  vaultInfo?: KeyVaultInfo;
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

    workspaceCapping:
      sku === operationalinsights.WorkspaceSkuNameEnum.Free
        ? undefined
        : { dailyQuotaGb }, //Fee is 2.99 USD/GB - Carefully

    retentionInDays:
      sku === operationalinsights.WorkspaceSkuNameEnum.Free ? 7 : 30, //DO NOT changes this
    sku: { name: sku },
    tags: defaultTags,
  });

  if (vaultInfo) {
    log.customerId.apply(async (id) => {
      if (!id) return;

      const keys = await operationalinsights.getSharedKeys({
        workspaceName: name,
        resourceGroupName: group.resourceGroupName,
      });

      await addCustomSecret({
        name: workspaceIdKeyName,
        value: id,
        contentType: 'Log Analytics',
        vaultInfo,
      });

      await addCustomSecret({
        name: primaryKeyName,
        formattedName: true,
        value: keys.primarySharedKey!,
        contentType: 'Log Analytics',
        vaultInfo,
      });

      await addCustomSecret({
        name: secondaryKeyName,
        formattedName: true,
        value: keys.secondarySharedKey!,
        contentType: 'Log Analytics',
        vaultInfo,
      });
    });
  }

  return { log, vaultNames: { primaryKeyName, secondaryKeyName } };
};
