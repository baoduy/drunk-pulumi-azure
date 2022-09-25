import { getCertificateForDomain } from '../WebApp/Helpers';
import { envDomain } from '../Common/AzureEnv';
import { convertPfxToPem } from '../KubeX/CertHelper';

export const getKubeDomainCert = async () => {
  //Get cert from CertOrder.
  const cert = await getCertificateForDomain(envDomain);
  //Convert to K8s cert
  return cert
    ? convertPfxToPem({
        pfxBase64: cert.base64CertData,
        password: '',
        includeAll: false,
      })
    : undefined;
};
