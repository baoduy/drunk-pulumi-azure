import { BuilderProps, IBuilder } from './genericBuilder';
import * as cert from '@pulumi/azure-native/certificateregistration';
import { ResourceInfo } from '../../types';

export type AppCertBuilderArgs = BuilderProps;
export type AppCertDomainBuilderType = {
  domain: string;
  type: cert.CertificateProductType;
  keySize: 2048 | 3072 | 4096;
};

export interface IAppCertDomainBuilder {
  for(props: AppCertDomainBuilderType): IAppCertBuilder;
}

export interface IAppCertBuilder extends IBuilder<ResourceInfo> {}
