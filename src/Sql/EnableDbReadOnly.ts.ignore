import { authorization } from '@pulumi/azure-native';
import * as mssql from '@pulumiverse/mssql';
import { Input, output } from '@pulumi/pulumi';
import {
  EnvRoleInfoType,
  ResourceInfo,
  WithDependsOn,
  LoginArgs,
} from '../types';
import * as process from 'node:process';

type Props = {
  sqlServer: ResourceInfo;
  login?: LoginArgs;
  group: Input<EnvRoleInfoType>;
} & WithDependsOn;

export default ({ sqlServer, login, group, dependsOn }: Props) => {
  const config = authorization.getClientConfigOutput();
  const providerMssql = new mssql.Provider(
    `${sqlServer.name}-provider-mssql`,
    {
      hostname: `${sqlServer.name}.database.windows.net`,
      port: 1433,
      azureAuth: {
        clientId: config.clientId,
        tenantId: config.tenantId,
        clientSecret: process.env.ARM_CLIENT_SECRET,
      },
      sqlAuth: login
        ? { username: login.adminLogin, password: login.password }
        : undefined,
    },
    { dependsOn },
  );

  const dbs = mssql.getDatabases({ provider: providerMssql });

  dbs.then((dbList) =>
    dbList.databases.map((db) => {
      new mssql.Script(
        `${sqlServer.name}-${db.name}-readonly`,
        {
          databaseId: db.id,
          readScript: output(group).apply(
            (g) =>
              `select COUNT(*) as existed from sys.database_principals where name ='${g.displayName}'`,
          ),
          deleteScript: output(group).apply(
            (g) => `DROP USER [${g.displayName}]`,
          ),
          updateScript: output(group).apply(
            (g) => `CREATE USER [${g.displayName}] FROM EXTERNAL PROVIDER;
            ALTER ROLE db_datareader ADD MEMBER [${g.displayName}];
            ALTER ROLE db_denydatawriter ADD MEMBER [${g.displayName}];
        `,
          ),
          state: {
            existed: '1',
          },
        },
        { dependsOn },
      );
    }),
  );
};
