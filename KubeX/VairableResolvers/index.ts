import { KeyVaultInfo } from '../../types';
import { getSecret } from '../../KeyVault/Helper';
import { Input, Output } from '@pulumi/pulumi';

interface Props {
  config: { [key: string]: string | Output<string> };
  vaultInfo: KeyVaultInfo;
}

export default async ({
  config,
  vaultInfo,
}: Props): Promise<{
  configMap?: Input<{
    [key: string]: Input<string>;
  }>;
  secrets?: Input<{
    [key: string]: Input<string>;
  }>;
}> => {
  const secrets: any = {};
  const configMap: any = {};
  const notfound = new Array<string>();

  const rs = await Promise.all(
    Object.keys(config)
      .sort()
      .map(async (k) => {
        let value: Input<string> | undefined = config[k];
        let secret: boolean = false;

        if (
          typeof value === 'string' &&
          value.startsWith('$(') &&
          value.endsWith(')')
        ) {
          secret = true;
          const key = value.replace('$(', '').replace(')', '').trim();
          value = (await getSecret({ name: key, vaultInfo }))?.value;
        }

        if (value) return { key: k, value, secret };
        else {
          notfound.push(`${k}:${config[k]}`);
          return undefined;
        }
      })
  );

  if (notfound.length > 0) {
    throw new Error(
      `The variable "${notfound.join('\n')}" is invalid or not from: ${
        vaultInfo.name
      }`
    );
  }

  rs.forEach((v) => {
    if (!v) return;
    if (v.secret) secrets[v.key] = v.value;
    else configMap[v.key] = v.value;
  });

  return { configMap, secrets };
};
