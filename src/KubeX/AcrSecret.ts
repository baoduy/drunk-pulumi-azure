import { K8sArgs } from './types';
import { getAcrCredentials } from '../ContainerRegistry/Helper';
import { organization } from '../Common/StackEnv';
import { core } from '@pulumi/kubernetes';
import { Input, output } from '@pulumi/pulumi';

interface AcrProps extends K8sArgs {
  name: string;
  acrName?: string;
  namespaces: string[];
}

interface DockerConfigProps extends Omit<AcrProps, 'acrName'> {
  url: string;
  username: string;
  password: Input<string>;
}

export const DockerConfigSecret = ({
  namespaces,
  name,
  url,
  username,
  password,
  ...others
}: DockerConfigProps) => {
  const base64JsonEncodedCredentials = output(password).apply((p) => {
    const base64Credentials = Buffer.from(username + ':' + p).toString(
      'base64'
    );

    const json = `{"auths":{"${url}":{"auth":"${base64Credentials}"}}}`;
    return Buffer.from(json).toString('base64');
  });

  return namespaces.map(
    (n) =>
      new core.v1.Secret(
        `${name}-${n}`,
        {
          metadata: {
            name,
            namespace: n,
          },
          type: 'kubernetes.io/dockerconfigjson',
          data: {
            '.dockerconfigjson': base64JsonEncodedCredentials,
          },
        },
        others
      )
  );
};

export const AcrSecret = async ({
  acrName = organization,
  ...others
}: AcrProps) => {
  const acrInfo = await getAcrCredentials(acrName);
  return DockerConfigSecret({ ...acrInfo, ...others });
};
