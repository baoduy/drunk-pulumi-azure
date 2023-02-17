import { K8sArgs } from '../../types';
import * as k8s from '@pulumi/kubernetes';
import { Input } from '@pulumi/pulumi';

const secretKeys = [
  'accountKey',
  'masterKey',
  'username',
  'password',
  'connectionString',
  'redisPassword',
];
export interface DaprStorage {
  inMemory?: boolean;
  azureBlobStorage?: {
    accountName: Input<string>;
    accountKey: Input<string>;
    containerName: Input<string>;
  };
  azureTableStorage?: {
    accountName: Input<string>;
    accountKey: Input<string>;
    tableName: Input<string>;
  };
  azureCosmosDb?: {
    url: Input<string>;
    masterKey: Input<string>;
    database: Input<string>;
    collection: Input<string>;
  };
  mongoDb?: {
    host: Input<string>;
    username: Input<string>;
    password: Input<string>;
    databaseName: Input<string>;
    collectionName: Input<string>;
    params?: Input<string>;
    actorStateStore?: boolean;
  };
  mySql?: {
    connectionString: Input<string>;
    schemaName: Input<string>;
    tableName: Input<string>;
    pemContents?: Input<string>;
    actorStateStore?: boolean;
  };
  postgreSql?: {
    connectionString: Input<string>;
  };
  redis?: {
    redisHost: Input<string>;
    redisPassword: Input<string>;
    enableTLS?: boolean;
  };

  rethinkDb?: {
    address: Input<string>;
    database: Input<string>;
    table?: Input<string>;
    username: Input<string>;
    password: Input<string>;
    archive?: boolean;
  };
  sqlServer?: {
    connectionString: Input<string>;
    tableName: Input<string>;
    schema?: Input<string>;
  };
}

interface Props extends K8sArgs {
  name: string;
  namespace: Input<string>;
  storage: DaprStorage;
}

const getStateName = (storage: DaprStorage) => {
  if (storage.azureBlobStorage) return 'state.azure.blobstorage';
  if (storage.azureTableStorage) return 'state.azure.tablestorage';
  if (storage.azureCosmosDb) return 'state.azure.cosmosdb';
  if (storage.mongoDb) return 'state.mongodb';
  if (storage.mySql) return 'state.mysql';
  if (storage.postgreSql) return 'state.postgresql';
  if (storage.redis) return 'state.redis';
  if (storage.rethinkDb) return 'state.rethinkdb';
  if (storage.sqlServer) return 'state.sqlserver';
  //Default
  return 'state.in-memory';
};

const getSpecMetadata = (storage: DaprStorage, secretName: string) => {
  const secrets: { [key: string]: Input<string> } = {};

  const metadata = new Array<{
    name: Input<string>;
    value?: Input<string | boolean>;
    secretKeyRef?: { name: Input<string>; key: Input<string> };
  }>();

  const firstStore = Object.values(storage).filter((v) => Boolean(v))[0];

  if (firstStore && typeof firstStore !== 'boolean') {
    Object.keys(firstStore).forEach((k) => {
      const v = firstStore[k];

      if (secretKeys.includes(k)) {
        secrets[k] = v;

        metadata.push({
          name: k,
          secretKeyRef: { name: secretName, key: k },
        });
      } else metadata.push({ name: k, value: v });
    });
  }

  return { secrets, metadata };
};

export default ({ name, namespace, storage, ...others }: Props) => {
  const { secrets, metadata } = getSpecMetadata(storage, name);

  const spec: any = {
    version: 'v1',
    type: getStateName(storage),
    metadata,
  };

  new k8s.core.v1.Secret(
    name,
    {
      metadata: { name, namespace },
      stringData: secrets,
    },
    others
  );

  return new k8s.apiextensions.CustomResource(
    name,
    {
      apiVersion: 'dapr.io/v1alpha1',
      kind: 'Component',
      metadata: { name, namespace },
      spec,
    },
    others
  );
};
