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

class StorageBuilder
  extends Builder<StorageResult>
  implements IStorageStarterBuilder, IStorageBuilder, IStaticWebStorageBuilder
{
  //Instance
  private _storageInstance:
    | ResourceInfoWithInstance<storage.StorageAccount>
    | undefined = undefined;

  //Props
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

  public constructor(props: StorageBuilderArgs) {
    super(props);
  }
  public asStorage(props: StorageFeatureBuilderType = {}): IStorageBuilder {
    this._type = 'storage';
    this._features = props;
    return this;
  }
  public asStaticWebStorage(): IStaticWebStorageBuilder {
    this._type = 'staticWeb';
    return this;
  }

  public withAFD(props: StorageCdnType): IStaticWebStorageBuilder {
    this._afdArgs = props;
    return this;
  }

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
