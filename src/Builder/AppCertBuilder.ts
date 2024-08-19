import {
  AppCertBuilderArgs,
  AppCertDomainBuilderType,
  Builder,
  IAppCertBuilder,
  IAppCertDomainBuilder,
} from './types';
import { ResourceInfo } from '../types';
import { naming } from '../Common';
import * as cert from '@pulumi/azure-native/certificateregistration';

class AppCertBuilder
  extends Builder<ResourceInfo>
  implements IAppCertBuilder, IAppCertDomainBuilder
{
  private readonly _instanceName: string;
  private _appCertInstance: cert.AppServiceCertificateOrder | undefined =
    undefined;

  private _options: AppCertDomainBuilderType | undefined = undefined;

  constructor(private args: AppCertBuilderArgs) {
    super(args);
    this._instanceName = naming.getCertOrderName(args.name);
  }

  public for(props: AppCertDomainBuilderType): IAppCertBuilder {
    this._options = props;
    return this;
  }

  private buildAppCert() {
    const { group, vaultInfo, dependsOn } = this.args;

    this._appCertInstance = new cert.AppServiceCertificateOrder(
      this._instanceName,
      {
        ...group,
        certificateOrderName: this._instanceName,
        location: 'global',
        productType: this._options!.type,
        autoRenew: true,
        distinguishedName: `CN=*.${this._options!.domain}`,
        keySize: this._options!.keySize,
        validityInYears: 1,
      },
      { dependsOn },
    );

    if (vaultInfo) {
      new cert.AppServiceCertificateOrderCertificate(
        this._instanceName,
        {
          ...group,
          certificateOrderName: this._instanceName,
          location: 'global',
          keyVaultSecretName: this._instanceName,
          keyVaultId: vaultInfo.id,
        },
        { dependsOn: this._appCertInstance },
      );
    }
  }

  public build(): ResourceInfo {
    this.buildAppCert();
    return {
      name: this._instanceName,
      group: this.args.group,
      id: this._appCertInstance!.id,
    };
  }
}

export default (props: AppCertBuilderArgs) =>
  new AppCertBuilder(props) as IAppCertDomainBuilder;
