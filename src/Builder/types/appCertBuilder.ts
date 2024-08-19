import { BuilderProps, IBuilder } from './genericBuilder';
import * as cert from '@pulumi/azure-native/certificateregistration';
import { ResourceInfo } from '../../types';

/**
 * Arguments for the App Certificate Builder.
 */
export type AppCertBuilderArgs = BuilderProps;

/**
 * Properties for building an App Certificate Domain.
 */
export type AppCertDomainBuilderType = {
  domain: string;
  type: cert.CertificateProductType;
  keySize: 2048 | 3072 | 4096;
};

/**
 * Interface for building an App Certificate Domain.
 */
export interface IAppCertDomainBuilder {
  /**
   * Method to set properties for the App Certificate Domain.
   * @param props - Properties for the App Certificate Domain.
   * @returns An instance of IAppCertBuilder.
   */
  for(props: AppCertDomainBuilderType): IAppCertBuilder;
}

/**
 * Interface for building an App Certificate.
 */
export interface IAppCertBuilder extends IBuilder<ResourceInfo> {}
