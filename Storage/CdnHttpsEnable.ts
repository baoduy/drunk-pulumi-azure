import * as pulumi from '@pulumi/pulumi';
//import isEqual from 'lodash.isequal';
import axios from 'axios';

import {
  BaseOptions,
  BaseResource,
  DefaultInputs,
  DefaultOutputs,
  BaseProvider,
  InternalCredentials,
} from '../CustomProviders/Base';

interface CdnManagedHttpsParameters {
  certificateSource: 'Cdn';
  certificateSourceParameters: {
    certificateType: 'Dedicated';
    '@odata.type': '#Microsoft.Azure.Cdn.Models.CdnCertificateSourceParameters';
  };
  protocolType: 'ServerNameIndication' | 'IPBased';
  minimumTlsVersion: 'TLS12';
}

interface UserManagedHttpsParameters {
  certificateSource: 'AzureKeyVault';
  certificateSourceParameters: {
    '@odata.type': '#Microsoft.Azure.Cdn.Models.KeyVaultCertificateSourceParameters';
    subscriptionId: string;
    deleteRule: 'NoAction';
    updateRule: 'NoAction';

    resourceGroupName: string;
    secretName: string;
    secretVersion: string;
    vaultName: string;
  };
  protocolType: 'ServerNameIndication' | 'IPBased';
  minimumTlsVersion: 'TLS12';
}

export interface CdnHttpsEnableInputs extends DefaultInputs {
  customDomainId: string;
  vaultSecretInfo?: {
    resourceGroupName: string;
    secretName: string;
    secretVersion: string;
    vaultName: string;
  };
}

export interface CdnHttpsEnableOutputs
  extends CdnHttpsEnableInputs,
    DefaultOutputs {}

class CdnHttpsEnableProvider
  implements BaseProvider<CdnHttpsEnableInputs, CdnHttpsEnableOutputs>
{
  constructor(private name: string) {}

  // async diff(
  //   id: string,
  //   previousOutput: CdnHttpsEnableOutputs,
  //   news: CdnHttpsEnableInputs
  // ): Promise<pulumi.dynamic.DiffResult> {
  //   const credentials = new InternalCredentials();
  //   const tokenRequest = await credentials.getCredentials();
  //   const token = await tokenRequest.getToken();
  //
  //   const url = `https://management.azure.com/${id}/enableCustomHttps?api-version=2019-12-31`;
  //   const rs = await axios
  //     .get(url, {
  //       headers: { Authorization: "Bearer " + token.accessToken },
  //     })
  //     .then((rs) => rs.data);
  //
  //   console.log(rs);
  //
  //   return {
  //     deleteBeforeReplace: false,
  //     replaces: [],
  //     changes: false,
  //   };
  // }

  async create(
    props: CdnHttpsEnableInputs
  ): Promise<pulumi.dynamic.CreateResult> {
    //DONOT update this to Tools/Axios.
    const credentials = new InternalCredentials();
    const tokenRequest = await credentials.getCredentials();
    const token = await tokenRequest.getToken();

    const url = `https://management.azure.com/${props.customDomainId}/enableCustomHttps?api-version=2019-12-31`;

    let data: CdnManagedHttpsParameters | UserManagedHttpsParameters;

    if (props.vaultSecretInfo) {
      data = {
        certificateSource: 'AzureKeyVault',
        certificateSourceParameters: {
          '@odata.type':
            '#Microsoft.Azure.Cdn.Models.KeyVaultCertificateSourceParameters',
          deleteRule: 'NoAction',
          updateRule: 'NoAction',
          subscriptionId: credentials.subscriptionID,
          ...props.vaultSecretInfo,
        },
        protocolType: 'ServerNameIndication',
        minimumTlsVersion: 'TLS12',
      } as UserManagedHttpsParameters;
    } else {
      data = {
        certificateSource: 'Cdn',
        certificateSourceParameters: {
          certificateType: 'Dedicated',
          '@odata.type':
            '#Microsoft.Azure.Cdn.Models.CdnCertificateSourceParameters',
        },
        protocolType: 'ServerNameIndication',
        minimumTlsVersion: 'TLS12',
      } as CdnManagedHttpsParameters;
    }

    await axios
      .post(url, data, {
        headers: { Authorization: 'Bearer ' + token.accessToken },
      })
      .catch((error) => {
        console.log(error.response.data);
        //If already enabled then ignore
        if (![409, 405].includes(error.response.status)) throw error;
      });

    return {
      id: props.customDomainId,
      outs: props,
    };
  }

  // async update(
  //   id: string,
  //   olds: CdnHttpsEnableOutputs,
  //   news: CdnHttpsEnableInputs
  // ): Promise<pulumi.dynamic.UpdateResult> {
  //   return await this.create(news);
  // }
}

export default class CdnHttpsEnableResource extends BaseResource<
  CdnHttpsEnableInputs,
  CdnHttpsEnableOutputs
> {
  public readonly name: string;

  constructor(
    name: string,
    props: BaseOptions<CdnHttpsEnableInputs>,
    opts?: pulumi.CustomResourceOptions
  ) {
    super(
      new CdnHttpsEnableProvider(name),
      `azure-native:custom:CdnHttpsEnableProvider:${name}`,
      props,
      opts
    );
    this.name = name;
  }
}
