import { createAxios } from '../Tools/Axios';
import { getSecret } from '../KeyVault/Helper';
import { getCertOrderName } from '../Common/Naming';
import * as global from '../Common/GlobalEnv';

interface AzResult {
  value: Array<{
    id: string;
    name: string;
    properties: { keyVaultId: string; keyVaultSecretName: string };
  }>;
}

/**Get current certificate from Cert order by domain name*/
export const getCertificateForDomain = async (domain: string) => {
  const orderName = getCertOrderName(domain);
  const axios = createAxios();

  const url = `/resourceGroups/${global.groupInfo.resourceGroupName}/providers/Microsoft.CertificateRegistration/certificateOrders/${orderName}/certificates?api-version=2015-08-01`;
  const rs = await axios
    .get<AzResult>(url)
    .then((rs) => rs.data)
    .catch((err) => {
      console.error('getCertOrderInfo: Error ', err);
      return undefined;
    });

  const info = rs?.value ? rs.value[0] : undefined;
  if (!info) return undefined;

  const cert = await getSecret({
    name: info.properties.keyVaultSecretName,
    vaultInfo: global.keyVaultInfo,
  });

  if (!cert) return undefined;

  return {
    name: cert.name,
    base64CertData: cert.value!,
    thumbprint: cert.properties.tags!['Thumbprint'],
  };
};
