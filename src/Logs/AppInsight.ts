import * as native from '@pulumi/azure-native';
import { BasicResourceWithVaultArgs, WithDependsOn } from '../types';
import { naming } from '../Common';
import { addCustomSecret } from '../KeyVault';
import { Input } from '@pulumi/pulumi';

interface Props extends BasicResourceWithVaultArgs, WithDependsOn {
  dailyCapGb?: number;
  immediatePurgeDataOn30Days?: boolean;
  ingestionMode?: native.applicationinsights.IngestionMode;
  workspaceResourceId?: Input<string>;
}

export default ({
  group,
  name,
  dailyCapGb = 0.023,
  immediatePurgeDataOn30Days = true,
  ingestionMode = native.applicationinsights.IngestionMode.ApplicationInsights,
  workspaceResourceId,
  vaultInfo,
  dependsOn,
}: Props) => {
  name = naming.getAppInsightName(name);

  const appInsight = new native.applicationinsights.Component(
    name,
    {
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

      disableLocalAuth: false,
      workspaceResourceId,
    },
    { dependsOn },
  );

  new native.applicationinsights.ComponentCurrentBillingFeature(
    `${name}-CurrentBillingFeature`,
    {
      currentBillingFeatures: ['Basic'], // ['Basic', 'Application Insights Enterprise'],
      dataVolumeCap: {
        cap: dailyCapGb,
        stopSendNotificationWhenHitCap: true,
      },
      resourceGroupName: group.resourceGroupName,
      resourceName: appInsight.name,
    },
  );

  if (vaultInfo) {
    addCustomSecret({
      name,
      value: appInsight.instrumentationKey,
      vaultInfo,
      contentType: 'AppInsight',
      dependsOn: appInsight,
    });
  }

  return appInsight;
};

// export const getAppInsightKey = async ({
//   resourceInfo,
//   vaultInfo,
// }: {
//   resourceInfo: ResourceInfo;
//   vaultInfo: KeyVaultInfo;
// }): Promise<string> => {
//   const key = await getSecret({
//     name: resourceInfo.name,
//     vaultInfo,
//   });
//   return key?.value ?? '';
// };
