import * as compute from '@pulumi/azure/compute';

import { findVMScaleSet } from '../../Core/Helper';
import * as fs from 'fs';
import { BasicMonitorArgs, KeyVaultInfo, ResourceGroupInfo } from '../../types';
import { Input, all, Resource } from '@pulumi/pulumi';
import { replaceAll } from '../../Common/Helpers';
import { getLogWpSecrets } from '../../Logs/Helpers';
import { getAccountSAS, getStorageSecrets } from '../../Storage/Helper';

interface Props extends BasicMonitorArgs {
  group: ResourceGroupInfo;
  vaultInfo: KeyVaultInfo;
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export default async ({
  group,
  logWpId,
  logStorageId,
  vaultInfo,
  dependsOn,
}: Props) =>
  all([logWpId, logStorageId]).apply(async ([lId, sId]) => {
    const vmScaleSets = await findVMScaleSet(group.resourceGroupName);
    if (!vmScaleSets) return;

    const logWp =lId? await getLogWpSecrets(lId!, vaultInfo):undefined;
    const logStorage =sId? await getStorageSecrets({
      id: sId!,
      vaultInfo,
      globalResource: true,
    }):undefined;

    if (!logWp || !logStorage) return;

    const logSAS = await getAccountSAS(logStorage.info);

    const originalSetting = fs.readFileSync(__dirname + '/config.json', 'utf8');

    return vmScaleSets.map((vm) => {
      let settings = originalSetting;
      settings = replaceAll(
        settings,
        '__DIAGNOSTIC_STORAGE_ACCOUNT__',
        logStorage.info.name
      );
      settings = replaceAll(settings, '__VM_OR_VMSS_RESOURCE_ID__', vm.id);

      //LinuxDiagnostic
      const diag = new compute.VirtualMachineScaleSetExtension(
        `${vm.name}-LinuxDiagnostic`,
        {
          name: `LinuxDiagnostic`,
          virtualMachineScaleSetId: vm.id,
          //resourceGroupName: group.resourceGroupName,

          type: 'LinuxDiagnostic',
          typeHandlerVersion: '3.0',
          publisher: 'Microsoft.Azure.Diagnostics',

          autoUpgradeMinorVersion: true,
          //enableAutomaticUpgrade: true,

          protectedSettings: `{
          "storageAccountName": "${logStorage.info.name}",
          "storageAccountSasToken": "${logSAS.accountSasToken.substring(
            logSAS.accountSasToken.indexOf('?') + 1
          )}"
        }`,
          settings,
        },
        //Ignore changes on this field as API never returns it back
        { ignoreChanges: ['protectedSettings'], dependsOn }
      );

      const oms = new compute.VirtualMachineScaleSetExtension(
        `${vm.name}-OmsAgentForLinux`,
        {
          name: `OmsAgentForLinux`,
          virtualMachineScaleSetId: vm.id,
          //resourceGroupName: group.resourceGroupName,

          type: 'OmsAgentForLinux',
          typeHandlerVersion: '1.0',
          publisher: 'Microsoft.EnterpriseCloud.Monitoring',

          autoUpgradeMinorVersion: true,
          //enableAutomaticUpgrade: true,

          //DefaultWorkspace-63a31b41-eb5d-4160-9fc9-d30fc00286c9-SEA
          protectedSettings: `{"workspaceKey":"${logWp.primaryKey}"}`,
          settings: `{"workspaceId": "${logWp.wpId}"}`,
        },
        //Ignore changes on this field as API never returns it back
        { ignoreChanges: ['protectedSettings'], dependsOn }
      );

      return { diag, oms };
    });
  });
