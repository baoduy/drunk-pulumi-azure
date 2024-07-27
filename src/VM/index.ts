import { Input } from '@pulumi/pulumi';
import * as compute from '@pulumi/azure-native/compute';
import * as network from '@pulumi/azure-native/network';
import { getNICName, getVMName } from '../Common';
import Locker from '../Core/Locker';
import { randomPassword } from '../Core/Random';
import { addCustomSecret } from '../KeyVault/CustomHelper';
import { addEncryptKey } from '../KeyVault/Helper';
import { BasicEncryptResourceArgs, LoginArgs } from '../types';
import GlobalSchedule from './GlobalSchedule';
import Extension, { VmExtensionProps } from './Extension';

export type VmScheduleType = {
  /** The time zone ID: https://stackoverflow.com/questions/7908343/list-of-timezone-ids-for-use-with-findtimezonebyid-in-c */
  timeZone?: 'Singapore Standard Time' | Input<string>;
  /** The format is ISO 8601 Standard ex: 2200 */
  autoShutdownTime?: Input<string>;
  /** The format is ISO 8601 Standard ex: 0900 */
  //autoStartTime?: Input<string>;
};

//https://az-vm-image.info/
// az vm image list --output table
// az vm image list --location EastAsia --publisher MicrosoftWindowsDesktop --offer windows-11 --output table --all
interface Props extends BasicEncryptResourceArgs {
  subnetId: Input<string>;
  storageAccountType?: compute.StorageAccountTypes;
  vmSize?: Input<string>;
  login: LoginArgs;
  osType?: 'Windows' | 'Linux';
  image: {
    offer: 'WindowsServer' | 'CentOS' | 'Windows-10' | 'windows-11' | string;
    publisher:
      | 'MicrosoftWindowsServer'
      | 'MicrosoftWindowsDesktop'
      | 'Canonical'
      | string;
    sku: '2019-Datacenter' | '21h1-pro' | 'win11-23h2-pro' | string;
  };
  osDiskSizeGB?: number;
  dataDiskSizeGB?: number;
  schedule?: VmScheduleType;
  extensions?: Array<Omit<VmExtensionProps, 'dependsOn' | 'vmName' | 'group'>>;
  //This need a lock
  lock?: boolean;
  tags?: { [key: string]: Input<string> };
}

export default ({
  name,
  group,
  subnetId,
  osType = 'Windows',
  vmSize = 'Standard_B2s',
  extensions,
  storageAccountType = compute.StorageAccountTypes.Premium_LRS,
  osDiskSizeGB = 128,
  dataDiskSizeGB,
  enableEncryption,
  vaultInfo,
  envRoles,
  schedule = { timeZone: 'Singapore Standard Time' },
  login,
  image,
  lock = true,
  tags = {},
  dependsOn,
  ...others
}: Props) => {
  const vmName = getVMName(name);
  const nicName = getNICName(name);

  const nic = new network.NetworkInterface(nicName, {
    networkInterfaceName: nicName,
    ...group,
    ipConfigurations: [
      { name: 'ipconfig', subnet: { id: subnetId }, primary: true },
    ],
    nicType: network.NetworkInterfaceNicType.Standard,
  });

  //All VM will using the same Key
  const keyEncryption = enableEncryption
    ? addEncryptKey({ name: vmName, vaultInfo: vaultInfo! })
    : undefined;
  const diskEncryption = enableEncryption
    ? addCustomSecret({
        name: `${vmName}-disk-secret`,
        vaultInfo: vaultInfo!,
        formattedName: true,
        value: randomPassword({ name: vmName, policy: false, length: 50 })
          .result,
      })
    : undefined;

  const vm = new compute.VirtualMachine(
    vmName,
    {
      vmName,
      ...group,
      ...others,

      hardwareProfile: { vmSize },
      identity: { type: 'SystemAssigned' },
      licenseType: 'None',
      networkProfile: {
        networkInterfaces: [{ id: nic.id, primary: true }],
      },
      osProfile: {
        computerName: name,
        adminUsername: login.adminLogin,
        adminPassword: login.password,

        allowExtensionOperations: true,
        //Need to be enabled at subscription level
        //requireGuestProvisionSignal: true,
        linuxConfiguration:
          osType === 'Linux'
            ? {
                //ssh: { publicKeys: [{ keyData: linux.sshPublicKey! }] },
                disablePasswordAuthentication: false,
                provisionVMAgent: true,
                patchSettings: {
                  assessmentMode:
                    compute.LinuxPatchAssessmentMode.AutomaticByPlatform,
                  automaticByPlatformSettings: {
                    bypassPlatformSafetyChecksOnUserSchedule: true,
                    rebootSetting:
                      compute.LinuxVMGuestPatchAutomaticByPlatformRebootSetting
                        .Never,
                  },
                  patchMode: compute.LinuxVMGuestPatchMode.AutomaticByPlatform,
                },
              }
            : undefined,

        windowsConfiguration:
          osType === 'Windows'
            ? {
                enableAutomaticUpdates: true,
                provisionVMAgent: true,
                timeZone: schedule?.timeZone,
                patchSettings: {
                  enableHotpatching: false,
                  assessmentMode:
                    compute.WindowsPatchAssessmentMode.ImageDefault,
                  patchMode: compute.WindowsVMGuestPatchMode.AutomaticByOS,
                },
              }
            : undefined,
      },
      storageProfile: {
        imageReference: {
          ...image,
          version: 'latest',
        },
        osDisk: {
          name: `${name}osdisk`,
          diskSizeGB: osDiskSizeGB,
          caching: 'ReadWrite',
          createOption: 'FromImage',
          osType,
          encryptionSettings:
            enableEncryption && vaultInfo
              ? {
                  diskEncryptionKey: diskEncryption
                    ? {
                        secretUrl: diskEncryption.id,
                        sourceVault: {
                          id: vaultInfo.id,
                        },
                      }
                    : undefined,
                  keyEncryptionKey: keyEncryption
                    ? {
                        keyUrl: keyEncryption.url,
                        sourceVault: {
                          id: vaultInfo.id,
                        },
                      }
                    : undefined,
                  enabled: enableEncryption,
                }
              : undefined,
          managedDisk: {
            //Changes storage account type need to be done manually through portal.
            storageAccountType,
          },
        },

        dataDisks: dataDiskSizeGB
          ? [
              {
                name: `${name}datadisk`,
                diskSizeGB: dataDiskSizeGB,
                createOption: compute.DiskCreateOptionTypes.Empty,
                lun: 1,
              },
            ]
          : [],
      },
      diagnosticsProfile: { bootDiagnostics: { enabled: true } },
      // securityProfile: {
      //
      //     uefiSettings: {
      //         secureBootEnabled: true,
      //     },
      // },
      tags,
    },
    {
      dependsOn,
      ignoreChanges: [
        // 'storageProfile.osDisk.managedDisk.storageAccountType',
        // 'storageProfile.osDisk.managedDisk.id',
        // 'osDisk.osType',
      ],
    },
  );

  if (extensions) {
    extensions.forEach((ex) =>
      Extension({
        ...ex,
        group,
        vmName,
        dependsOn: vm,
      }),
    );
  }
  if (lock) {
    Locker({ name: vmName, resource: vm });
  }

  //Add Identity to readonly to be able to read key from vault
  if (envRoles) {
    envRoles.addMember(
      'readOnly',
      vm.identity.apply((i) => i!.principalId),
    );
  }

  //Auto shutdown
  if (schedule?.autoShutdownTime) {
    GlobalSchedule({
      name: `shutdown-computevm-${vmName}`,
      group,
      time: schedule.autoShutdownTime,
      timeZone: schedule.timeZone,
      targetResourceId: vm.id,
      task: 'ComputeVmShutdownTask', //LabVmsShutdownTask,LabVmsStartupTask,LabVmReclamationTask,ComputeVmShutdownTask
      dependsOn: vm,
    });
  }

  //Auto start
  // if (schedule?.autoStartTime) {
  //   GlobalSchedule({
  //     name: `${vmName}-auto-start`,
  //     group,
  //     time: schedule.autoStartTime,
  //     timeZone: schedule.timeZone,
  //     targetResourceId: vm.id,
  //     task: "LabVmAutoStart", //LabVmsShutdownTask,LabVmsStartupTask,LabVmReclamationTask,ComputeVmShutdownTask
  //     dependsOn: vm,
  //   });
  // }

  return vm;
};
