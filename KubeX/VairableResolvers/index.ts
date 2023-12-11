import { KeyVaultInfo } from '../../types';
import { getSecret } from '../../KeyVault/Helper';
import { Input, Output, output } from '@pulumi/pulumi';

interface Props {
  config: { [key: string]: string | Input<string> };
  vaultInfo: KeyVaultInfo;
}

/** Resolve the secrets from KeyVault*/
export const secretOutput = (
  vaultInfo: KeyVaultInfo,
  ...names: string[]
): Output<Array<string | undefined>> =>
  output(
    Promise.all(
      names.map(async (n) => {
        const rs = await getSecret({ name: n, vaultInfo });
        return rs?.value ?? n;
      })
    )
  );

const resolver = async ({ config, vaultInfo }: Props) => {
  const secrets: Record<string, Input<string>> = {};
  const configMap: Record<string, Input<string>> = {};
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
          notfound.push(k);
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

export default resolver;
