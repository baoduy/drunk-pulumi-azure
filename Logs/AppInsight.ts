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
import { isPrd } from '../Common/AzureEnv';

interface Props extends BasicResourceArgs {
  dailyCapGb?: number;
  vaultInfo?: KeyVaultInfo;
}

export default async ({ group, name, dailyCapGb = 0.023, vaultInfo }: Props) => {
  name = getAppInsightName(name);

  const appInsight = new native.insights.Component(name, {
    resourceName: name,
    ...group,

    kind: 'web',
    disableIpMasking: true,
    applicationType: 'web',

    samplingPercentage: isPrd ? 100 : 50,
    retentionInDays: 30,

    immediatePurgeDataOn30Days: true,
    ingestionMode: native.insights.IngestionMode.ApplicationInsights,
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
