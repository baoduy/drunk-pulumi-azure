import Storage, {
  ContainerProps,
  StoragePolicyType,
  StorageResults,
} from "Storage";
import { DefaultManagementRules } from "Storage/ManagementRules";
import { getDefaultResponseHeaders } from "../Storage/CdnRules";
import { ResourceInfo } from "../types";
import {
  Builder,
  BuilderProps,
  IStaticWebStorageBuilder,
  IStorageBuilder,
  IStorageSharedBuilder,
  IStorageStarterBuilder,
  StorageFeatureBuilderType,
  StorageNetworkBuilderType,
} from "./types";

class StorageBuilder
  extends Builder<ResourceInfo>
  implements IStorageStarterBuilder, IStorageBuilder, IStaticWebStorageBuilder
{
  private _type: "storage" | "staticWeb" = "storage";
  private _securityHeaders: Record<string, string> | undefined = undefined;
  private _cors: string[] | undefined = undefined;
  private _domain: string | undefined = undefined;
  private _policies: StoragePolicyType | undefined = undefined;
  private _features: StorageFeatureBuilderType = {};
  private _containers: ContainerProps[] = [];
  private _queues: string[] = [];
  private _fileShares: string[] = [];
  private _managementRules: DefaultManagementRules[] = [];
  private _network: StorageNetworkBuilderType | undefined = undefined;
  private _lock: boolean = false;

  private _storageInstance: StorageResults | undefined = undefined;

  public constructor(props: BuilderProps) {
    super(props);
  }
  public asStorage(): IStorageBuilder {
    this._type = "storage";
    return this;
  }
  public asStaticWebStorage(): IStaticWebStorageBuilder {
    this._type = "staticWeb";
    return this;
  }
  public withSecurityHeaders(
    props: Record<string, string>,
  ): IStaticWebStorageBuilder {
    this._securityHeaders = props;
    return this;
  }
  public withCors(origins: string[]): IStaticWebStorageBuilder {
    this._cors = origins;
    return this;
  }
  public withCustomDomain(domain: string): IStaticWebStorageBuilder {
    this._domain = domain;
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
  public withRule(props: DefaultManagementRules): IStorageBuilder {
    this._managementRules.push(props);
    return this;
  }
  public withFeature(props: StorageFeatureBuilderType): IStorageBuilder {
    this._features = props;
    return this;
  }
  public withNetwork(props: StorageNetworkBuilderType): IStorageSharedBuilder {
    this._network = props;
    return this;
  }
  public lock(): IStorageSharedBuilder {
    this._lock = true;
    return this;
  }

  public build(): ResourceInfo {
    if (!this._securityHeaders && this._domain)
      this._securityHeaders = getDefaultResponseHeaders(this._domain);

    this._storageInstance = Storage({
      ...this.commonProps,
      customDomain: this._domain,
      network: this._network,
      containers: this._containers,
      queues: this._queues,
      fileShares: this._fileShares,
      allowsCors: this._cors,
      defaultManagementRules: this._managementRules,
      policies: this._policies,
      featureFlags: {
        ...this._features,
        enableStaticWebsite: this._type === "staticWeb",
      },
      lock: this._lock,
    });

    return this._storageInstance;
  }
}

export default (props: BuilderProps) =>
  new StorageBuilder(props) as IStorageStarterBuilder;
