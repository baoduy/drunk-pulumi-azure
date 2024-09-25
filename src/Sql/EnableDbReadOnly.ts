import * as mssql from '@pulumiverse/mssql';
import { Input, output } from '@pulumi/pulumi';
import { EnvRoleInfoType, ResourceInfo, WithDependsOn } from '../types';

type Props = {
  sqlServer: ResourceInfo;
  entraGroup: Input<EnvRoleInfoType>;
} & WithDependsOn;

export default ({ sqlServer, entraGroup, dependsOn }: Props) => {
  const providerMssql = new mssql.Provider(
    `${sqlServer.name}-provider-mssql`,
    {
      hostname: `${sqlServer.name}.database.windows.net`,
      port: 1433,
      azureAuth: {},
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
          readScript: output(entraGroup).apply(
            (g) =>
              `select COUNT(*) as existed from sys.database_principals where name ='${g.displayName}'`,
          ),
          deleteScript: output(entraGroup).apply(
            (g) => `DROP USER [${g.displayName}]`,
          ),
          updateScript: output(entraGroup).apply(
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
