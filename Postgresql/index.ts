import { BasicResourceArgs, KeyVaultInfo } from '../types';
import { getPostgresqlName } from '../Common/Naming';
import * as pulumi from '@pulumi/pulumi';
import * as azure from '@pulumi/azure-native';
import { isPrd, tenantId } from '../Common/AzureEnv';
import { randomPassword } from '../Core/Random';
import * as inputs from '@pulumi/azure-native/types/input';
import { addCustomSecret } from '../KeyVault/CustomHelper';

export interface PostgresProps extends BasicResourceArgs {
  // auth: {
  //   adminLogin?: pulumi.Input<string>;
  //   password?: pulumi.Input<string>;
  // };
  sku?: pulumi.Input<inputs.dbforpostgresql.SkuArgs>;
  vaultInfo?: KeyVaultInfo;
  version?: azure.dbforpostgresql.ServerVersion;
  storageSizeGB?: number;
  databases?: Array<string>;
  network?: {
    allowsPublicAccess?: boolean;
    firewallRules?: Array<{
      startIpAddress: string;
      endIpAddress: string;
    }>;
  };
}

export default ({
  name,
  group,
  //auth,
  version = azure.dbforpostgresql.ServerVersion.ServerVersion_14,
  storageSizeGB = 128,
  /**
  [Standard_B1ms, Standard_B1s, Standard_B2ms, Standard_B2s, Standard_B4ms, Standard_B8ms, Standard_D16s_v3, Standard_D2s_v3, Standard_D32s_v3, Standard_D4s_v3, Standard_D64s_v3, Standard_D8s_v3, Standard_E16s_v3, Standard_E2s_v3, Standard_E32s_v3, Standard_E4s_v3, Standard_E64s_v3, Standard_E8s_v3, Standard_M128ms, Standard_M128s, Standard_M64ms, Standard_M64s, Standard_E48s_v3, Standard_D2ds_v4, Standard_D4ds_v4, Standard_D8ds_v4, Standard_D16ds_v4, Standard_D32ds_v4, Standard_D48ds_v4, Standard_D64ds_v4, Standard_E2ds_v4, Standard_E4ds_v4, Standard_E8ds_v4, Standard_E16ds_v4, Standard_E32ds_v4, Standard_E48ds_v4, Standard_E64ds_v4, Standard_D48s_v3, Standard_E20ds_v4, Standard_M8ms, Standard_M16ms, Standard_M32ts, Standard_M32ls, Standard_M32ms, Standard_M64ls, Standard_M64, Standard_M64m, Standard_M128, Standard_M128m, Standard_B12ms, Standard_B16ms, Standard_B20ms, Standard_D2ads_v5, Standard_D4ads_v5, Standard_D8ads_v5, Standard_D16ads_v5, Standard_D32ads_v5, Standard_D48ads_v5, Standard_D64ads_v5, Standard_D96ads_v5, Standard_E2ads_v5, Standard_E4ads_v5, Standard_E8ads_v5, Standard_E16ads_v5, Standard_E20ads_v5, Standard_E32ads_v5, Standard_E48ads_v5, Standard_E64ads_v5, Standard_E96ads_v5, Standard_D2_v5, Standard_D4_v5, Standard_D8_v5, Standard_D16_v5, Standard_D32_v5, Standard_D48_v5, Standard_D64_v5, Standard_D96_v5, Standard_D2ds_v5, Standard_D4ds_v5, Standard_D8ds_v5, Standard_D16ds_v5, Standard_D32ds_v5, Standard_D48ds_v5, Standard_D64ds_v5, Standard_D96ds_v5, Standard_E2ds_v5, Standard_E4ds_v5, Standard_E8ds_v5, Standard_E16ds_v5, Standard_E20ds_v5, Standard_E32ds_v5, Standard_E48ds_v5, Standard_E64ds_v5, Standard_E96ds_v5, Standard_E104ids_v5, Standard_E2bds_v5, Standard_E4bds_v5, Standard_E8bds_v5, Standard_E16bds_v5, Standard_E32bds_v5, Standard_E48bds_v5, Standard_E64bds_v5, Standard_E112iads_v5, Standard_M32dms_v2, Standard_M64ds_v2, Standard_M64dms_v2, Standard_M128ds_v2, Standard_M128dms_v2, Standard_M192ids_v2, Standard_M192idms_v2]
   */
  sku = {
    name: 'Standard_B1ms',
    tier: 'Burstable',
  },
  network,
  databases,
  vaultInfo,
  dependsOn,
}: PostgresProps) => {
  name = getPostgresqlName(name);

  const username = 'postgresadmin';
  const password = randomPassword({
    name,
    length: 25,
    options: { special: false },
  }).result;

  const postgres = new azure.dbforpostgresql.Server(
    name,
    {
      serverName: name,
      ...group,
      version,
      storage: { storageSizeGB },
      authConfig: {
        passwordAuth: 'Enabled',
        activeDirectoryAuth: 'Enabled',
        tenantId,
      },
      administratorLogin: username,
      administratorLoginPassword: password,
      dataEncryption: { type: 'SystemManaged' },
      //maintenanceWindow: { dayOfWeek: 6 },
      sku,
      network: {},
      backup: {
        geoRedundantBackup: isPrd ? 'Enabled' : 'Disabled',
        backupRetentionDays: 7,
      },
      highAvailability: { mode: isPrd ? 'ZoneRedundant' : 'Disabled' },
      availabilityZone: isPrd ? 3 : 1,
    },
    { dependsOn, protect: true, ignoreChanges: ['administratorLogin'] }
  );


  if (network) {
    if (network.firewallRules) {
      network.firewallRules.map(
        (f, i) =>
          new azure.dbforpostgresql.FirewallRule(`${name}-firewall-${i}`, {
            firewallRuleName: `${name}-firewall-${i}`,
            serverName: postgres.name,
            ...group,
            ...f,
          })
      );
    }

    if (network.allowsPublicAccess)
      new azure.dbforpostgresql.FirewallRule(`${name}-firewall-allowpublic`, {
        firewallRuleName: `${name}-firewall-allowpublic`,
        serverName: postgres.name,
        ...group,
        startIpAddress: '0.0.0.0',
        endIpAddress: '255.255.255.255',
      });
  }

  if (vaultInfo) {
    addCustomSecret({
      name: `${name}-login`,
      value: username,
      vaultInfo,
      contentType: name,
    });
    addCustomSecret({
      name: `${name}-pass`,
      value: password,
      vaultInfo,
      contentType: name,
    });
  }

  if (databases) {
    databases.map(
      (d) =>
        new azure.dbforpostgresql.Database(
          `${name}-${d}`,
          {
            serverName: postgres.name,
            databaseName: d,
            ...group,
          },
          { dependsOn: postgres, protect: true }
        )
    );
  }

  return postgres;
};
