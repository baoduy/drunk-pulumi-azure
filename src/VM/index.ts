import { Input, Resource } from "@pulumi/pulumi";
import * as compute from "@pulumi/azure-native/compute";
import * as network from "@pulumi/azure-native/network";
import * as devtestlab from "@pulumi/azure-native/devtestlab";
import { BasicResourceArgs, KeyVaultInfo } from "../types";
import { getNICName, getVMName } from "../Common/Naming";
import Locker from "../Core/Locker";
import { getEncryptionKey } from "../KeyVault/Helper";

//https://az-vm-image.info/
// az vm image list --output table
// az vm image list --location EastAsia --publisher MicrosoftWindowsDesktop --offer windows-11 --output table --all
interface Props extends BasicResourceArgs {
  subnetId: Input<string>;
  storageAccountType?: compute.StorageAccountTypes;
  vmSize?: Input<string>;
  login: { userName: Input<string>; password?: Input<string> };
  osType?: "Windows" | "Linux";
  image: {
    offer: "WindowsServer" | "CentOS" | "Windows-10" | "windows-11" | string;
    publisher:
      | "MicrosoftWindowsServer"
      | "MicrosoftWindowsDesktop"
      | "Canonical"
      | string;
    sku: "2019-Datacenter" | "21h1-pro" | "win11-23h2-pro" | string;
  };

  enableEncryption?: boolean;
  vaultInfo: KeyVaultInfo;
  //licenseType?: 'None' | 'Windows_Client' | 'Windows_Server';
  osDiskSizeGB?: number;
  dataDiskSizeGB?: number;
  schedule?: {
    /** The time zone ID: https://stackoverflow.com/questions/7908343/list-of-timezone-ids-for-use-with-findtimezonebyid-in-c */
    timeZone?: "Singapore Standard Time" | Input<string>;
    /** The format is ISO 8601 Standard ex: T22:00:00.000Z */
    autoShutdownTime?: Input<string>;
    /** The format is ISO 8601 Standard ex: T09:00:28.000Z */
    autoStartTime?: Input<string>;
  };
  lock?: boolean;
  tags?: { [key: string]: Input<string> };
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export default ({
  name,
  group,
  subnetId,
  osType = "Windows",
  vmSize = "Standard_B2s",

  storageAccountType = compute.StorageAccountTypes.Premium_LRS,
  osDiskSizeGB = 128,
  dataDiskSizeGB,
  enableEncryption,
  vaultInfo,
  schedule = { timeZone: "Singapore Standard Time" },
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
      { name: "ipconfig", subnet: { id: subnetId }, primary: true },
    ],
    nicType: network.NetworkInterfaceNicType.Standard,
  });

  const encryptKey = enableEncryption
    ? getEncryptionKey(`${name}-storage-encryption`, vaultInfo)
    : undefined;

  const vm = new compute.VirtualMachine(
    vmName,
    {
      vmName,
      ...group,
      ...others,

      hardwareProfile: { vmSize },
      identity: { type: "SystemAssigned" },
      licenseType: "None",
      networkProfile: {
        networkInterfaces: [{ id: nic.id, primary: true }],
      },
      osProfile: {
        computerName: name,
        adminUsername: login.userName,
        adminPassword: login.password,

        allowExtensionOperations: true,
        //Need to be enabled at subscription level
        //requireGuestProvisionSignal: true,
        linuxConfiguration:
          osType === "Linux"
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
          osType === "Windows"
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
          version: "latest",
        },
        osDisk: {
          name: `${name}osdisk`,
          diskSizeGB: osDiskSizeGB,
          caching: "ReadWrite",
          createOption: "FromImage",
          osType,
          // encryptionSettings: enableEncryption
          //   ? {
          //       diskEncryptionKey: {},
          //       keyEncryptionKey: encryptKey?.apply(k=>({
          //           k.
          //       })),
          //       enabled: true,
          //     }
          //   : undefined,
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
        "storageProfile.osDisk.managedDisk.storageAccountType",
        "storageProfile.osDisk.managedDisk.id",
      ],
    },
  );

  if (lock) {
    Locker({ name: vmName, resource: vm });
  }

  //Auto shutdown
  if (schedule?.autoShutdownTime) {
    new devtestlab.GlobalSchedule(
      `${vmName}-auto-shutdown`,
      {
        name: `${vmName}-auto-shutdown`,
        ...group,
        dailyRecurrence: { time: schedule.autoShutdownTime },
        timeZoneId: schedule.timeZone,
        status: "Enabled",
        targetResourceId: vm.id,
        taskType: "LabVmsShutdown",
        notificationSettings: {
          status: "Disabled",
          emailRecipient: "",
          notificationLocale: "en",
          timeInMinutes: 30,
          webhookUrl: "",
        },
      },
      { dependsOn: vm },
    );
  }

  //Auto start
  if (schedule?.autoStartTime) {
    new devtestlab.GlobalSchedule(
      `${vmName}-auto-start`,
      {
        name: `${vmName}-auto-start`,
        ...group,
        dailyRecurrence: { time: schedule.autoStartTime },
        timeZoneId: schedule.timeZone,
        status: "Enabled",
        targetResourceId: vm.id,
        taskType: "LabVmAutoStart",
        notificationSettings: {
          status: "Disabled",
          emailRecipient: "",
          notificationLocale: "en",
          timeInMinutes: 30,
          webhookUrl: "",
        },
      },
      { dependsOn: vm },
    );
  }

  return vm;
};
