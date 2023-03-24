import { getCertificateForDomain } from '../Web/Helpers';
import { convertPfxToPem } from '../KubeX/CertHelper';

export const getKubeDomainCert = async (domain: string) => {
  //Get cert from CertOrder.
  const cert = await getCertificateForDomain(domain);
  //Convert to K8s cert
  return cert
    ? convertPfxToPem({
        pfxBase64: cert.base64CertData,
        password: '',
        includeAll: false,
      })
    : undefined;
};
