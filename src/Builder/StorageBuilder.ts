import Storage, {
  ContainerProps,
  StorageNetworkType,
  StoragePolicyType,
  StorageResults,
} from '../Storage';
import CdnEndpoint from '../Cdn/CdnEndpoint';
import { getDefaultResponseHeaders } from '../Cdn/CdnRules';
import { ResourceInfo } from '../types';
import {
  Builder,
  BuilderProps,
  IStaticWebStorageBuilder,
  IStorageBuilder,
  IStorageSharedBuilder,
  IStorageStarterBuilder,
  StorageCdnType,
  StorageFeatureBuilderType,
} from './types';

class StorageBuilder
  extends Builder<ResourceInfo>
  implements IStorageStarterBuilder, IStorageBuilder, IStaticWebStorageBuilder
{
  //Instance
  private _storageInstance: StorageResults | undefined = undefined;

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

  public constructor(props: BuilderProps) {
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
  public withCdn(props: StorageCdnType): IStaticWebStorageBuilder {
    this._cdnProps = props;
    return this;
  }
  public withContainer(props: ContainerProps): IStorageBuilder {
    this._containers.push(props);
    return this;
  }
  public withQueue(name: string): IStorageBuilder {
    this._queues.push(name);
    return this;
  }
  public withFileShare(name: string): IStorageBuilder {
    this._fileShares.push(name);
    return this;
  }
  public withPolicies(props: StoragePolicyType): IStorageBuilder {
    this._policies = props;
    return this;
  }
  public withNetwork(props: StorageNetworkType): IStorageSharedBuilder {
    this._network = props;
    return this;
  }
  public lock(): IStorageSharedBuilder {
    this._lock = true;
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
        p.web.replace('https://', '').slice(0, -1),
      ),
      securityResponseHeaders: securityHeaders,
      dependsOn: this._storageInstance?.instance,
    });
  }

  public build(): ResourceInfo {
    this.buildStorage();
    this.buildCDN();
    return this._storageInstance!;
  }
}

export default (props: BuilderProps) =>
  new StorageBuilder(props) as IStorageStarterBuilder;
