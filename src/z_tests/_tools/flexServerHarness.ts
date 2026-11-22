import MySqlBuilder from '../../Builder/MySqlBuilder';
import PostgreSqlBuilder from '../../Builder/PostgreSqlBuilder';
import { createdResources } from './Mocks';
import { waitForResource } from './waitForResource';

// Shared arrange/act steps for the legacy PostgreSQL and MySQL flexible-server
// acceptance tests (DRK-2570). Each helper builds one GeneralPurpose server
// named `name` through the public builder and returns its Server inputs.
const group = { resourceGroupName: 'RG' };
const vaultInfo = { id: '/vault/123', group, name: 'vault' };
const sku = { name: 'Standard_D2ds_v4', tier: 'GeneralPurpose' } as const;
const login = { adminLogin: 'adminUser', password: 'P@ssw0rd123' };

const serverInputs = (type: string, before: number, serverName: string) =>
  waitForResource(type, before, (i) => i.serverName === serverName);

/** A PostgreSQL 16 server `name`: its Server inputs. */
export const buildPostgreSqlServer = (name: string) => {
  const before = createdResources.length;
  const rs = PostgreSqlBuilder({ name, group, vaultInfo })
    .withSku({ sku, version: '16' })
    .withLogin(login)
    .build();
  return serverInputs('azure-native:dbforpostgresql:Server', before, rs.name);
};

/** A MySQL 8.0.21 server `name`: its Server inputs. */
export const buildMySqlServer = (name: string) => {
  const before = createdResources.length;
  const rs = MySqlBuilder({ name, group, vaultInfo })
    .withSku({ sku, version: '8.0.21' })
    .withLogin(login)
    .build();
  return serverInputs('azure-native:dbformysql:Server', before, rs.name);
};
