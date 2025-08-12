import Storage, {
  ContainerProps,
  StorageNetworkType,
  StoragePolicyType,
} from '../Storage';
import CdnEndpoint from '../Cdn/CdnEndpoint';
import AFDBuilder from './AFDBuilder';
import { getDefaultResponseHeaders } from '../Cdn/CdnRules';
import { ResourceInfo, ResourceInfoWithInstance } from '../types';
import {
  Builder,
  IStaticWebStorageBuilder,
  IStorageBuilder,
  IStorageSharedBuilder,
  IStorageStarterBuilder,
  StorageBuilderArgs,
  StorageCdnType,
  StorageFeatureBuilderType,
  StorageResult,
} from './types';
import * as storage from '@pulumi/azure-native/storage';

/**
 * StorageBuilder class for creating and configuring Azure Storage Account resources.
 * This class implements the Builder pattern for Storage Account configuration including
 * containers, queues, file shares, CDN, network settings, and static web hosting.
 * @extends Builder<StorageResult>
 * @implements IStorageStarterBuilder
 * @implements IStorageBuilder
 * @implements IStaticWebStorageBuilder
 */
class StorageBuilder
  extends Builder<StorageResult>
  implements IStorageStarterBuilder, IStorageBuilder, IStaticWebStorageBuilder
{
  // Resource instances
  private _storageInstance:
    | ResourceInfoWithInstance<storage.StorageAccount>
    | undefined = undefined;

  // Configuration properties
  private _type: 'storage' | 'staticWeb' = 'storage';
  private _policies: StoragePolicyType | undefined = undefined;
  private _features: StorageFeatureBuilderType = {};
  private _containers: ContainerProps[] = [];
  private _queues: string[] = [];
  private _fileShares: string[] = [];
  private _cdnProps: StorageCdnType | undefined = undefined;
  private _network: StorageNetworkType | undefined = undefined;
  private _lock: boolean = false;
  private _afdArgs: StorageCdnType | undefined = undefined;

  /**
   * Creates an instance of StorageBuilder.
   * @param {StorageBuilderArgs} props - The arguments for building the Storage Account.
   */
  public constructor(props: StorageBuilderArgs) {
    super(props);
  }
  /**
   * Configures the storage account as a regular storage account with optional features.
   * @param {StorageFeatureBuilderType} props - Optional storage features configuration.
   * @returns {IStorageBuilder} The current StorageBuilder instance.
   */
  public asStorage(props: StorageFeatureBuilderType = {}): IStorageBuilder {
    this._type = 'storage';
    this._features = props;
    return this;
  }

  /**
   * Configures the storage account as a static web storage account.
   * @returns {IStaticWebStorageBuilder} The current StorageBuilder instance.
   */
  public asStaticWebStorage(): IStaticWebStorageBuilder {
    this._type = 'staticWeb';
    return this;
  }

  /**
   * Configures Azure Front Door (AFD) for the static web storage.
   * @param {StorageCdnType} props - The AFD configuration properties.
   * @returns {IStaticWebStorageBuilder} The current StorageBuilder instance.
   */
  public withAFD(props: StorageCdnType): IStaticWebStorageBuilder {
    this._afdArgs = props;
    return this;
  }

  /**
   * Conditionally configures Azure Front Door (AFD) for the static web storage.
   * @param {boolean} condition - Whether to apply the AFD configuration.
   * @param {StorageCdnType} props - The AFD configuration properties.
   * @returns {IStaticWebStorageBuilder} The current StorageBuilder instance.
   */
  public withAFDIf(
    condition: boolean,
    props: StorageCdnType
  ): IStaticWebStorageBuilder {
    if (condition) this.withAFD(props);
    return this;
  }

  public withCdn(props: StorageCdnType): IStaticWebStorageBuilder {
    this._cdnProps = props;
    return this;
  }

  public withCdnIf(
    condition: boolean,
    props: StorageCdnType
  ): IStaticWebStorageBuilder {
    if (condition) this.withCdn(props);
    return this;
  }

  public withContainer(props: ContainerProps): IStorageBuilder {
    this._containers.push(props);
    return this;
  }
  public withContainerIf(
    condition: boolean,
    props: ContainerProps
  ): IStorageBuilder {
    if (condition) this.withContainer(props);
    return this;
  }
  public withQueue(name: string): IStorageBuilder {
    this._queues.push(name);
    return this;
  }
  public withQueueIf(condition: boolean, name: string): IStorageBuilder {
    if (condition) this.withQueue(name);
    return this;
  }
  public withFileShare(name: string): IStorageBuilder {
    this._fileShares.push(name);
    return this;
  }

  public withFileShareIf(condition: boolean, name: string): IStorageBuilder {
    if (condition) this.withFileShare(name);
    return this;
  }

  public withPolicies(props: StoragePolicyType): IStorageBuilder {
    this._policies = props;
    return this;
  }

  public withPoliciesIf(
    condition: boolean,
    props: StoragePolicyType
  ): IStorageBuilder {
    if (condition) this.withPolicies(props);
    return this;
  }

  public withNetwork(props: StorageNetworkType): IStorageSharedBuilder {
    this._network = props;
    return this;
  }
  public withNetworkIf(
    condition: boolean,
    props: StorageNetworkType
  ): IStorageSharedBuilder {
    if (condition) this.withNetwork(props);
    return this;
  }
  public lock(lock: boolean = true): IStorageSharedBuilder {
    this._lock = lock;
    return this;
  }

  private buildStorage() {
    this._storageInstance = Storage({
      ...this.commonProps,
      network: this._network,
      containers: this._containers,
      queues: this._queues,
      fileShares: this._fileShares,
      policies: this._policies,
      features: {
        ...this._features,
        enableStaticWebsite: this._type === 'staticWeb',
      },
      lock: this._lock,
    });
  }

  private buildCDN() {
    if (!this._cdnProps || !this._storageInstance?.instance) return;

    const securityHeaders: Record<string, string> | undefined = this._cdnProps
      .securityResponse
      ? getDefaultResponseHeaders(this._cdnProps.securityResponse)
      : undefined;

    //Create Azure CDN if customDomain provided
    CdnEndpoint({
      ...this._cdnProps,
      name: this._storageInstance!.name,
      origin: this._storageInstance!.instance!.primaryEndpoints.apply((p) =>
        p.web.replace('https://', '').slice(0, -1)
      ),
      securityResponseHeaders: securityHeaders,
      dependsOn: this._storageInstance?.instance,
    });
  }

  private buildAFD() {
    if (!this._afdArgs || !this._storageInstance?.instance) return;
    AFDBuilder(this.commonProps)
      .withCustomDomainsIf(
        Boolean(this._afdArgs.domainNames),
        this._afdArgs.domainNames!
      )
      .withEndpoint({
        name: this._storageInstance.name,
        origin: this._storageInstance.instance.primaryEndpoints.web,
      })
      .withResponseHeadersIf(
        Boolean(this._afdArgs.securityResponse),
        getDefaultResponseHeaders(this._afdArgs.securityResponse!)
      )
      .build();
  }

  public build(): StorageResult {
    this.buildStorage();
    this.buildCDN();
    this.buildAFD();

    const endpoints = this._storageInstance?.instance.primaryEndpoints!;
    return { ...this._storageInstance!, endpoints };
  }
}

export default (props: StorageBuilderArgs) =>
  new StorageBuilder(props) as IStorageStarterBuilder;
