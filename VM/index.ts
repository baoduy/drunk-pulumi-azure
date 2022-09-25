import { Input, Resource } from "@pulumi/pulumi";
import * as native from "@pulumi/azure-native";
import { BasicResourceArgs, KeyVaultInfo } from "../types";
import { getNICName, getVMName } from "../Common/Naming";
import { defaultTags } from "../Common/AzureEnv";
import Locker from "../Core/Locker";

interface Props extends BasicResourceArgs {
  subnetId: Input<string>;
  storageAccountType?: native.compute.StorageAccountTypes;
  vmSize?: Input<string>;

  login: { userName: Input<string>; password?: Input<string> };

  windows?: {
    offer: "WindowsServer";
    publisher: "MicrosoftWindowsServer";
    sku: "2019-Datacenter";
  };

  linux?: {
    offer: "UbuntuServer";
    publisher: "Canonical";
    sku: "18.04-LTS";
  };

  vaultInfo?: KeyVaultInfo;
  //licenseType?: 'None' | 'Windows_Client' | 'Windows_Server';
  /**The time zone ID: https://stackoverflow.com/questions/7908343/list-of-timezone-ids-for-use-with-findtimezonebyid-in-c*/
  timeZone?: Input<string>;
  osDiskSizeGB?: number;
  dataDiskSizeGB?: number;
  schedule?: {
    autoShutdownTime: Input<string>;
    //autoStartupTime?: Input<string>;
  };
  lock?: boolean;
  tags?: { [key: string]: Input<string> };
  dependsOn?: Input<Input<Resource>[]> | Input<Resource>;
}

export default async ({
  name,
  group,
  subnetId,
  vmSize = "Standard_B2s",
  timeZone = "Singapore Standard Time",
  //licenseType = 'None',
  storageAccountType = native.compute.StorageAccountTypes.Premium_LRS,
  osDiskSizeGB = 128,
  dataDiskSizeGB,
  schedule,
  login,
  windows,
  linux,

  vaultInfo,
  lock = true,
  tags = {},
  dependsOn,
  ...others
}: Props) => {
  const vmName = getVMName(name);
  const nicName = getNICName(name);

  const nic = new native.network.NetworkInterface(nicName, {
    networkInterfaceName: nicName,
    ...group,
    ipConfigurations: [
      { name: "ipconfig", subnet: { id: subnetId }, primary: true },
    ],
    nicType: native.network.NetworkInterfaceNicType.Standard,
  });

  const vm = new native.compute.VirtualMachine(
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
        linuxConfiguration: linux
          ? {
              //ssh: { publicKeys: [{ keyData: linux.sshPublicKey! }] },
              disablePasswordAuthentication: false,
              provisionVMAgent: true,
              patchSettings: {
                //assessmentMode: "AutomaticByPlatform",
                patchMode: "AutomaticByPlatform",
              },
            }
          : undefined,

        windowsConfiguration: windows
          ? {
              enableAutomaticUpdates: true,
              provisionVMAgent: true,
              timeZone,
              patchSettings: {
                enableHotpatching: false,
                //Need to be enabled at subscription level
                //assessmentMode: 'AutomaticByPlatform',
                patchMode: "AutomaticByPlatform",
              },
            }
          : undefined,
      },

      storageProfile: {
        imageReference: {
          ...(windows || linux),
          version: "latest",
        },
        osDisk: {
          name: `${name}osdisk`,
          diskSizeGB: osDiskSizeGB,
          caching: "ReadWrite",
          createOption: "FromImage",
          osType: windows ? "Windows" : "Linux",
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
                createOption: native.compute.DiskCreateOptionTypes.Empty,
                lun: 1,
              },
            ]
          : [],
      },

      diagnosticsProfile: { bootDiagnostics: { enabled: true } },
      // securityProfile: {
      //   //Need to be enabled at subscription level
      //   encryptionAtHost: false,
      //   //securityType: native.compute.SecurityTypes.TrustedLaunch,
      // },
      tags: { ...defaultTags, ...tags },
    },
    {
      dependsOn,
      ignoreChanges: [
        "storageProfile.osDisk.managedDisk.storageAccountType",
        "storageProfile.osDisk.managedDisk.id",
      ],
    }
  );

  if (lock) {
    Locker({ name: vmName, resourceId: vm.id, dependsOn: vm });
  }

  if (schedule) {
    new native.devtestlab.GlobalSchedule(
      `shutdown-computevm-${vmName}`,
      {
        name: `shutdown-computevm-${vmName}`,
        ...group,
        dailyRecurrence: { time: schedule.autoShutdownTime },
        timeZoneId: timeZone,
        status: "Enabled",
        targetResourceId: vm.id,
        taskType: "ComputeVmShutdownTask",
        notificationSettings: {
          status: "Disabled",
          emailRecipient: "",
          notificationLocale: "en",
          timeInMinutes: 30,
          webhookUrl: "",
        },
      },
      { dependsOn: vm }
    );

    // if (schedule.autoStartupTime) {
    //   new native.devtestlab.GlobalSchedule(`${vmName}-auto-startup`, {
    //     name: `${vmName}-auto-startup`,
    //     ...group,
    //     dailyRecurrence: { time: schedule.autoStartupTime },
    //     timeZoneId: timeZone,
    //     targetResourceId: vm.id,
    //     taskType: 'LabVmAutoStart',
    //   });
    // }
  }

  return vm;
};
