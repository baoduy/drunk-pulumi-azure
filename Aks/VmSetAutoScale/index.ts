import * as insights from '@pulumi/azure-native/insights';
import { input as inputs, enums } from '@pulumi/azure-native/types';
import { AzureResourceItem, findVMScaleSet } from '../../Core/Helper';
import { BasicMonitorArgs, ResourceGroupInfo } from '../../types';
import { Input, Resource } from '@pulumi/pulumi';

interface Props extends BasicMonitorArgs {
  group: ResourceGroupInfo;
  getCapacity?: typeof defaultGetCapacity;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

const defaultGetCapacity = (
  vmScaleSet: AzureResourceItem
): {
  nightCapacity?: 0 | 1 | number;
  default: number;
  minimum: number;
  maximum: number;
} => {
  const mode = vmScaleSet.tags ? vmScaleSet.tags['mode'] : 'System';
  if (mode === 'System')
    return { nightCapacity: 1, default: 1, minimum: 1, maximum: 3 };
  return { nightCapacity: 0, default: 0, minimum: 1, maximum: 3 };
};

export default async ({
  group,
  getCapacity = defaultGetCapacity,
  dependsOn,
}: Props) => {
  const vmScaleSets = await findVMScaleSet(group.resourceGroupName);
  if (!vmScaleSets) return;

  return vmScaleSets.map((vm) => {
    const cap = getCapacity(vm);
    const profiles = new Array<inputs.insights.AutoscaleProfileArgs>();
    const timeZone =
      vm.location === 'southeastasia'
        ? 'Singapore Standard Time'
        : 'Singapore Standard Time';

    if (cap.nightCapacity) {
      profiles.push({
        name: 'Scale down at night',
        capacity: {
          default: cap.nightCapacity.toString(),
          minimum: cap.nightCapacity.toString(),
          maximum: cap.nightCapacity > 0 ? cap.nightCapacity.toString() : '1',
        },
        rules: [],
        recurrence: {
          frequency: 'Week',
          schedule: {
            timeZone,
            days: [
              'Monday',
              'Tuesday',
              'Wednesday',
              'Thursday',
              'Friday',
              'Saturday',
              'Sunday',
            ],
            hours: [19],
            minutes: [0],
          },
        },
      });
    }

    profiles.push({
      name: 'auto scale by CPU',
      capacity: {
        default: cap.default.toString(),
        minimum: cap.minimum.toString(),
        maximum: cap.maximum.toString(),
      },

      rules: [
        {
          //Scale Up
          metricTrigger: {
            metricName: 'Percentage CPU',
            metricNamespace: 'microsoft.compute/virtualmachinescalesets',
            metricResourceUri: vm.id,
            timeGrain: 'PT1M',
            statistic: 'Average',
            timeWindow: 'PT15M',
            timeAggregation: 'Average',
            operator: 'GreaterThanOrEqual',
            threshold: 75,
            dimensions: [],
            dividePerInstance: false,
          },
          scaleAction: {
            direction: 'Increase',
            type: 'ChangeCount',
            value: '1',
            cooldown: 'PT30M',
          },
        },
        {
          //Scale down
          metricTrigger: {
            metricName: 'Percentage CPU',
            metricNamespace: 'microsoft.compute/virtualmachinescalesets',
            metricResourceUri: vm.id,
            timeGrain: 'PT1M',
            statistic: 'Average',
            timeWindow: 'PT15M',
            timeAggregation: 'Average',
            operator: 'LessThanOrEqual',
            threshold: 50,
            dimensions: [],
            dividePerInstance: false,
          },
          scaleAction: {
            direction: 'Decrease',
            type: 'ChangeCount',
            value: '1',
            cooldown: 'PT30M',
          },
        },
      ],
      recurrence: {
        frequency: 'Week',
        schedule: {
          timeZone,
          days: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            //'Saturday',
            //'Sunday',
          ],
          hours: [8],
          minutes: [0],
        },
      },
    });

    //LinuxDiagnostic
    const autoScale = new insights.AutoscaleSetting(
      `${vm.name}-AutoScale`,
      {
        name: `${vm.name}-AutoScale`,
        autoscaleSettingName: `${vm.name}-AutoScale`,

        resourceGroupName: vm.resourceGroupName,
        targetResourceUri: vm.id,

        enabled: true,
        profiles,
      },
      { dependsOn }
    );

    return autoScale;
  });
};
