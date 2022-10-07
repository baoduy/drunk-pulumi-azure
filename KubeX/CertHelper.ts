import * as forge from 'node-forge';
import * as os from 'os';
import { replaceAll } from '../Common/Helpers';

const getChilkatTool = () => {
  const v = process.version.split('.')[0].replace('v', '');
  const node = v ? `node${v}` : 'node14';
  const platform = os.platform();
  const arch = os.arch();

  let name = '';

  if (platform == 'win32') {
    if (arch == 'ia32') name = 'win-ia32';
    else name = 'win64';
  } else if (platform == 'linux') {
    if (arch == 'arm') name = 'arm';
    else if (arch == 'x86') name = 'linux32';
    else name = 'linux64';
  } else if (platform == 'darwin') {
    if (arch == 'arm64') name = 'mac-m1';
    else name = 'macosx';
  }

  return require(`@chilkat/ck-${node}-${name}`);
};

interface Props {
  pfxBase64: string;
  password: string | undefined;
  includeAll?: boolean;
}

export function convertPfxToPem({ pfxBase64, password, includeAll }: Props) {
  const pfx = getChilkatTool().Pfx();

  const success = pfx.LoadPfxEncoded(pfxBase64, 'Base64', password || '');
  if (success !== true) {
    console.log(pfx.LastErrorText);
    return undefined;
  }

  const keyCount: number = pfx.NumPrivateKeys;
  const certCount: number = pfx.NumCerts;

  const keys = new Array<string>();
  const clientCerts = new Array<string>();
  const serverCerts = new Array<string>();
  const caCerts = new Array<string>();

  const originalKeys = new Array<any>();
  const originalClientCerts = new Array<any>();
  const originalServerCerts = new Array<any>();
  const originalCaCerts = new Array<any>();

  //Keys
  for (let i = 0; i < keyCount; i++) {
    keys.push(pfx.GetPrivateKey(i).GetPkcs8Pem());
  }

  for (let i = 0; i < certCount; i++) {
    const c = pfx.GetCert(i);

    if (includeAll) {
      clientCerts.push(c.ExportCertPem());
      originalClientCerts.push(c);
      continue;
    }

    if (
      c.ForClientAuthentication &&
      !(c.SubjectCN.includes('CA') || c.SubjectCN.includes('Validation'))
    ) {
      clientCerts.push(c.ExportCertPem());
      originalClientCerts.push(c);
    }
    if (c.ForServerAuthentication) {
      //console.log(c);
      serverCerts.push(c.ExportCertPem());
      originalServerCerts.push(c);
    }

    if (
      (!c.ForClientAuthentication && !c.ForServerAuthentication) ||
      c.SubjectCN.includes('CA') ||
      c.SubjectCN.includes('Validation')
    ) {
      caCerts.push(c.ExportCertPem());
      originalCaCerts.push(c);
    }
  }

  return {
    key: keys.join(''),
    cert: clientCerts.join(''),
    ca: caCerts.join(''),
    server: serverCerts.join(''),
    clientCerts,
    serverCerts,
    keys,
    caCerts,
    originalCaCerts,
    originalClientCerts,
    originalKeys,
    originalServerCerts,
  };
}

export const DecodeBase64Cert = (pfxBase64: string) =>
  forge.util.decode64(pfxBase64);

export const getTlsName = (domain: string, enableCertIssuer: boolean) =>
  enableCertIssuer
    ? `tls-${replaceAll(domain, '.', '-')}-lets`
    : `tls-${replaceAll(domain, '.', '-')}-imported`;
