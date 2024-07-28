import * as native from '@pulumi/azure-native';
import { findVMScaleSet } from '../../Core/Helper';
import * as fs from 'fs';
import { BasicMonitorArgs, KeyVaultInfo, ResourceGroupInfo } from '../../types';
import { all, Input, Resource } from '@pulumi/pulumi';
import { replaceAll } from '../../Common';
import { getLogWpSecretsById } from '../../Logs/Helpers';
import { getAccountSAS, getStorageSecretsById } from '../../Storage/Helper';

interface Props extends BasicMonitorArgs {
  group: ResourceGroupInfo;
  vaultInfo: KeyVaultInfo;
}

export default ({
  group,
  logWpId,
  logStorageId,
  vaultInfo,
  dependsOn,
}: Props) =>
  all([logWpId, logStorageId]).apply(async ([lId, sId]) => {
    const vmScaleSets = await findVMScaleSet(group.resourceGroupName);
    if (!vmScaleSets) return;

    const logWp = lId
      ? await getLogWpSecretsById({ logWpId: lId, vaultInfo })
      : undefined;
    const logStorage = sId
      ? await getStorageSecretsById({
          storageId: sId,
          vaultInfo,
          //globalResource: true,
        })
      : undefined;

    if (!logWp || !logStorage) return;

    const logSAS = await getAccountSAS(logStorage.info!);

    const originalSetting = fs.readFileSync(__dirname + '/config.json', 'utf8');

    return vmScaleSets.map((vm) => {
      let settings = originalSetting;
      settings = replaceAll(
        settings,
        '__DIAGNOSTIC_STORAGE_ACCOUNT__',
        logStorage.info!.name,
      );
      settings = replaceAll(settings, '__VM_OR_VMSS_RESOURCE_ID__', vm.id);

      //LinuxDiagnostic
      const diag = new native.compute.VirtualMachineScaleSetExtension(
        `${vm.name}-LinuxDiagnostic`,
        {
          resourceGroupName: vm.resourceGroupName,
          vmScaleSetName: vm.name,
          name: `LinuxDiagnostic`,
          type: 'LinuxDiagnostic',
          typeHandlerVersion: '3.0',
          publisher: 'Microsoft.Azure.Diagnostics',

          autoUpgradeMinorVersion: true,

          protectedSettings: `{
          "storageAccountName": "${logStorage.info!.name}",
          "storageAccountSasToken": "${logSAS.accountSasToken.substring(
            logSAS.accountSasToken.indexOf('?') + 1,
          )}"
        }`,
          settings,
        },
        //Ignore changes on this field as API never returns it back
        { ignoreChanges: ['protectedSettings'], dependsOn },
      );

      const oms = new native.compute.VirtualMachineScaleSetExtension(
        `${vm.name}-OmsAgentForLinux`,
        {
          name: `OmsAgentForLinux`,
          resourceGroupName: vm.resourceGroupName,
          vmScaleSetName: vm.name,

          type: 'OmsAgentForLinux',
          typeHandlerVersion: '1.0',
          publisher: 'Microsoft.EnterpriseCloud.Monitoring',

          autoUpgradeMinorVersion: true,
          //enableAutomaticUpgrade: true,

          //DefaultWorkspace-63a31b41-eb5d-4160-9fc9-d30fc00286c9-SEA
          protectedSettings: `{"workspaceKey":"${logWp.secrets.primaryKey!}"}`,
          settings: `{"workspaceId": "${logWp.info!.id}"}`,
        },
        //Ignore changes on this field as API never returns it back
        { ignoreChanges: ['protectedSettings'], dependsOn },
      );

      return { diag, oms };
    });
  });
