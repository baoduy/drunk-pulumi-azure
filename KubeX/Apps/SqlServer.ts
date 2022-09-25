import { DefaultAksArgs } from '../types';
import { KeyVaultInfo } from '../../types';
import { randomPassword } from '../../Core/Random';
import { addCustomSecret } from '../../KeyVault/CustomHelper';
import { getPasswordName } from '../../Common/Naming';
import Deployment from '../Deployment';
import { createPVCForStorageClass, StorageClassNameTypes } from '../Storage';
import { envDomain } from '../../Common/AzureEnv';
import { interpolate } from '@pulumi/pulumi';

interface Props extends DefaultAksArgs {
  /**The database name that will create the connection string and store in the key vault*/
  databaseNames?: string[];
  vaultInfo?: KeyVaultInfo;
  storageClassName: StorageClassNameTypes;
}

export default async ({
  name,
  namespace,
  databaseNames,
  vaultInfo,
  storageClassName,
  provider,
}: Props) => {
  const password = randomPassword({ name });
  if (vaultInfo) {
    await addCustomSecret({
      name: getPasswordName(name, null),
      vaultInfo,
      value: password.result,
      contentType: name,
    });
  }

  //Create Storage Container and add Secret to Namespace
  const claim = createPVCForStorageClass({
    name,
    namespace,
    provider,
    storageClassName,
  });

  const sql = await Deployment({
    name,
    namespace,
    provider,

    configMap: { MSSQL_PID: 'Developer', ACCEPT_EULA: 'Y' },
    secrets: { SA_PASSWORD: password.result },

    podConfig: {
      port: 1433,
      image: 'mcr.microsoft.com/mssql/server:2019-latest',

      securityContext: { fsGroup: 10001 },
      podSecurityContext: {
        allowPrivilegeEscalation: true,
        readOnlyRootFilesystem: false,
        privileged: true,
      },

      resources: {
        requests: { cpu: '1m', memory: '1Gi' },
        limits: { cpu: '500m', memory: '2Gi' },
      },

      volumes: [
        {
          name: 'sqldbs',
          mountPath: '/var/opt/mssql',
          persistentVolumeClaim: claim.metadata.name,
        },
      ],
    },
    deploymentConfig: { replicas: 1 },
    serviceConfig: { usePodPort: true },
  });

  const rs = {
    sql,
    host: `sql.${envDomain}`,
    username: 'sa',
    password: password.result,
  };

  if (databaseNames) {
    await Promise.all(
      databaseNames.map(async (d) => {
        //Create DataBase in the Server
        // new MsSqlDatabaseResource(dbName, {
        //   databaseName: dbName,
        //   server: rs.host,
        //   userName: rs.username,
        //   password: rs.password,
        // });

        if (vaultInfo) {
          //Add Connection String to Key Vault
          await addCustomSecret({
            name: d,
            vaultInfo,
            value: interpolate`Data Source=${rs.host};Initial Catalog=${d};User Id=${rs.username};Password=${rs.password};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=True;Connection Timeout=120;`,
            contentType: name,
          });
        }
      })
    );
  }
  return rs;
};
