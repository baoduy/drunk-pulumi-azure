import { replaceAll } from '../Common/Helpers';

export const getTlsName = (domain: string, enableCertIssuer: boolean) =>
  enableCertIssuer
    ? `tls-${replaceAll(domain, '.', '-')}-lets`
    : `tls-${replaceAll(domain, '.', '-')}-imported`;
