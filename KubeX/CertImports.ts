import * as k8s from '@pulumi/kubernetes';
import { Input } from '@pulumi/pulumi';
import { getKubeDomainCert } from './Helpers';
import { convertPfxToPem, getTlsName } from './CertHelper';
import fs from 'fs';
import { KeyVaultInfo } from '../types';
import { getSecret } from '../KeyVault/Helper';
import { K8sArgs } from './types';

interface FromCertOrderProps extends K8sArgs {
  namespaces: Input<string>[];
  /** The cert name or domain name */
  certName: string;
}

/** Import Cert to K8s from Azure Cert Order*/
export const certImportFromCertOrder = async ({
  namespaces,
  certName,
  ...others
}: FromCertOrderProps) => {
  const cert = await getKubeDomainCert(certName);
  if (!cert) return;

  const name = getTlsName(certName, false);
  namespaces.map(
    (n, i) =>
      new k8s.core.v1.Secret(
        `${name}-${i}`,
        {
          metadata: {
            name,
            namespace: n,
          },
          type: 'kubernetes.io/tls',
          stringData: {
            'tls.crt': cert.cert + cert.ca,
            'tls.key': cert.key,
          },
        },
        others
      )
  );
};

const getCertFromFolder = (folder: string) => {
  const cert = fs.readFileSync(`./${folder}/cert.crt`, { encoding: 'utf8' });
  const ca = fs.readFileSync(`./${folder}/ca.crt`, { encoding: 'utf8' });
  const key = fs.readFileSync(`./${folder}/private.key`, { encoding: 'utf8' });

  return { cert, ca, key };
};

export const certImportFromFolder = ({
  certName,
  namespaces,
  certFolder,
  ...others
}: FromCertOrderProps & { certFolder: string }) => {
  const cert = getCertFromFolder(certFolder);
  if (!cert) return;

  const name = getTlsName(certName, false);
  namespaces.map(
    (n, i) =>
      new k8s.core.v1.Secret(
        `${name}-${i}`,
        {
          metadata: {
            name,
            namespace: n,
          },
          type: 'kubernetes.io/tls',
          stringData: {
            'tls.crt': cert.cert + cert.ca,
            'tls.key': cert.key,
          },
        },
        others
      )
  );

  return name;
};

interface ImportCertFromVaultProps extends K8sArgs {
  certNames: string[];
  namespace: Input<string>;
  vaultInfo: KeyVaultInfo;
}

export const certImportFromVault = async ({
  certNames,
  namespace,
  vaultInfo,
  ...others
}: ImportCertFromVaultProps) => {
  await Promise.all(
    certNames.map(async (c, i) => {
      const cert = await getSecret({
        name: c,
        nameFormatted: false,
        vaultInfo,
      });

      const pems = cert?.value
        ? convertPfxToPem({
            pfxBase64: cert.value,
            password: '',
            includeAll: false,
          })
        : undefined;

      if (pems) {
        new k8s.core.v1.Secret(
          `${c}-${i}`,
          {
            metadata: {
              name: c,
              namespace,
            },
            type: 'kubernetes.io/tls',
            stringData: {
              'tls.crt': pems.cert + pems.ca,
              'tls.key': pems.key,
            },
          },
          others
        );
      }
    })
  );
};
