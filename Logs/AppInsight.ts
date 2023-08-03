import * as native from '@pulumi/azure-native';

import {
  AppInsightInfo,
  BasicResourceArgs,
  KeyVaultInfo,
  ResourceInfo,
} from '../types';
import { getSecret } from '../KeyVault/Helper';
import { getAppInsightName } from '../Common/Naming';
import { addCustomSecret } from '../KeyVault/CustomHelper';
import { Input } from '@pulumi/pulumi';

interface Props extends BasicResourceArgs {
  dailyCapGb?: number;
  vaultInfo?: KeyVaultInfo;
  immediatePurgeDataOn30Days?: boolean;
  ingestionMode?: native.insights.IngestionMode;
  workspaceResourceId?: Input<string>;
}

export default ({
  group,
  name,
  dailyCapGb = 0.023,
  immediatePurgeDataOn30Days = true,
  ingestionMode = native.insights.IngestionMode.ApplicationInsights,
  workspaceResourceId,
  vaultInfo,
}: Props) => {
  name = getAppInsightName(name);

  const appInsight = new native.insights.Component(name, {
    resourceName: name,
    ...group,

    kind: 'web',
    disableIpMasking: true,
    applicationType: 'web',
    flowType: 'Bluefield',

    //samplingPercentage: isPrd ? 100 : 50,
    retentionInDays: 30,

    immediatePurgeDataOn30Days,
    ingestionMode,

    disableLocalAuth: true,
    workspaceResourceId,
  });

  new native.insights.ComponentCurrentBillingFeature(
    `${name}-CurrentBillingFeature`,
    {
      currentBillingFeatures: ['Basic'], // ['Basic', 'Application Insights Enterprise'],
      dataVolumeCap: {
        cap: dailyCapGb,
        stopSendNotificationWhenHitCap: true,
      },
      resourceGroupName: group.resourceGroupName,
      resourceName: appInsight.name,
    }
  );

  if (vaultInfo) {
    addCustomSecret({
      name,
      value: appInsight.instrumentationKey,
      vaultInfo,
      contentType: 'AppInsight',
    });
  }

  return appInsight;
};

export const getAppInsightKey = async ({
  resourceInfo,
  vaultInfo,
}: {
  resourceInfo: ResourceInfo;
  vaultInfo: KeyVaultInfo;
}): Promise<AppInsightInfo> => {
  const key = await getSecret({ name: resourceInfo.resourceName, vaultInfo });
  return { ...resourceInfo, instrumentationKey: key?.value || '' };
};
